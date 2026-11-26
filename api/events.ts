import crypto from 'crypto';
import {
  authenticateRequest,
  fetchDiscoverablePublicEvents,
  getAdminFirestore,
  invalidateEventCaches,
  matchEventFacesServerSide,
  verifyUserOwnsEvent,
} from '../server/lib/firebaseServer';
import {
  applyCorsAndApiHeaders,
  checkRateLimit,
  getHeaderValue,
  getQueryStringParam,
  isSafeId,
  readJsonBody,
} from '../server/lib/security';
import { ApiRequest, ApiResponse, sendJson } from '../server/lib/vercelTypes';

function verifyWorkerSecret(req: ApiRequest): boolean {
  const configured = (process.env.WORKER_SHARED_SECRET || '').trim();
  const provided = getHeaderValue(req, 'x-worker-secret').trim();
  if (!configured || !provided || configured.length !== provided.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(configured, 'utf-8'), Buffer.from(provided, 'utf-8'));
  } catch {
    return false;
  }
}

function resolveEventsAction(req: ApiRequest): string {
  const explicit = getQueryStringParam(req, 'action').trim();
  if (explicit) return explicit;
  const reqPath = (req.url || '').split('?')[0];
  if (reqPath === '/api/public/events') return 'public-events';
  if (reqPath === '/api/public/events/revalidate') return 'public-revalidate';
  if (reqPath === '/api/jobs/process-pending') return 'jobs-process-pending';
  if (/^\/api\/events\/[^/]+\/match$/.test(reqPath)) return 'match';
  return '';
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const action = resolveEventsAction(req);

  if (action === 'public-events') {
    if (!applyCorsAndApiHeaders(req, res, 'GET, OPTIONS')) return;
    if (req.method !== 'GET') {
      sendJson(res, 405, { error: 'Method not allowed.' });
      return;
    }
    const events = await fetchDiscoverablePublicEvents();
    res.setHeader('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=60');
    sendJson(res, 200, { events });
    return;
  }

  if (action === 'public-revalidate') {
    if (!applyCorsAndApiHeaders(req, res, 'POST, OPTIONS')) return;
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed.' });
      return;
    }
    if (!checkRateLimit(req, res, 'revalidate', 60, 60 * 1000)) return;
    const caller = await authenticateRequest(req, res);
    if (!caller) return;

    invalidateEventCaches();
    sendJson(res, 200, { revalidated: true });
    return;
  }

  if (action === 'match') {
    if (!applyCorsAndApiHeaders(req, res, 'POST, OPTIONS')) return;
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed.' });
      return;
    }
    if (!checkRateLimit(req, res, 'guest-face-match', 60, 60 * 1000)) return;

    const reqPath = (req.url || '').split('?')[0];
    const pathSlugMatch = reqPath.match(/^\/api\/events\/([^/]+)\/match$/);
    const slug = (
      req.params?.slug ||
      getQueryStringParam(req, 'slug') ||
      (pathSlugMatch ? decodeURIComponent(pathSlugMatch[1]) : '')
    )
      .trim()
      .toLowerCase();

    if (!slug || !/^[a-z0-9-]{3,80}$/.test(slug)) {
      sendJson(res, 400, { error: 'Invalid event gallery identifier.' });
      return;
    }

    let body: Record<string, unknown>;
    try {
      body = await readJsonBody(req, 32 * 1024);
    } catch {
      sendJson(res, 400, { error: 'Invalid face match payload.' });
      return;
    }

    const rawEmbedding = body.embedding;
    if (
      !Array.isArray(rawEmbedding) ||
      rawEmbedding.length !== 128 ||
      !rawEmbedding.every((n) => typeof n === 'number' && Number.isFinite(n))
    ) {
      sendJson(res, 400, { error: 'Expected a valid 128-dimensional face embedding vector.' });
      return;
    }

    try {
      const result = await matchEventFacesServerSide(slug, rawEmbedding as number[]);
      rawEmbedding.fill(0);

      if (!result) {
        sendJson(res, 404, { error: 'Published wedding gallery not found.' });
        return;
      }

      res.setHeader('Cache-Control', 'no-store');
      sendJson(res, 200, result);
      return;
    } catch (err) {
      console.error('Server-side face match error:', err);
      sendJson(res, 500, { error: 'Unable to match faces right now.' });
      return;
    }
  }

  if (action === 'jobs-process-pending') {
    if (!applyCorsAndApiHeaders(req, res, 'POST, OPTIONS')) return;
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed.' });
      return;
    }
    if (!checkRateLimit(req, res, 'worker-jobs', 60, 60 * 1000)) return;

    const hasWorkerSecret = verifyWorkerSecret(req);
    let callerUid = '';
    let callerEmail: string | undefined;
    let idToken = '';

    if (!hasWorkerSecret) {
      const caller = await authenticateRequest(req, res);
      if (!caller) return;
      callerUid = caller.decoded.uid;
      callerEmail = caller.decoded.email;
      idToken = caller.idToken;
    }

    let body: Record<string, unknown>;
    try {
      body = await readJsonBody(req, 32 * 1024);
    } catch {
      sendJson(res, 400, { error: 'Invalid JSON payload.' });
      return;
    }

    const eventId = typeof body.eventId === 'string' ? body.eventId.trim() : '';
    if (!isSafeId(eventId)) {
      sendJson(res, 400, { error: 'Valid eventId is required.' });
      return;
    }

    if (!hasWorkerSecret) {
      const owns = await verifyUserOwnsEvent(eventId, idToken, callerUid, callerEmail);
      if (!owns) {
        sendJson(res, 403, { error: 'Forbidden: You do not own this wedding event.' });
        return;
      }
    }

    const db = getAdminFirestore();
    if (!db) {
      sendJson(res, 200, {
        mode: 'browser-queue',
        eventId,
        message:
          'Server-side background worker requires FIREBASE_SERVICE_ACCOUNT_JSON + external Cloud Run/Cloud Tasks runner. Browser indexing queue in Organizer Studio remains active.',
      });
      return;
    }

    try {
      const pendingSnap = await db
        .collection('events')
        .doc(eventId)
        .collection('indexingJobs')
        .where('status', '==', 'pending')
        .limit(25)
        .get();

      const jobs = pendingSnap.docs.map((d) => d.data());
      sendJson(res, 200, {
        mode: 'cloud-worker-ready',
        eventId,
        pendingCount: jobs.length,
        jobs,
      });
      return;
    } catch (err) {
      console.error('Worker job query error:', err);
      sendJson(res, 500, { error: 'Unable to query pending indexing jobs.' });
      return;
    }
  }

  sendJson(res, 404, { error: 'Events endpoint not found.' });
}
