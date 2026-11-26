import crypto from 'crypto';
import {
  authenticateRequest,
  getAdminFirestore,
  verifyUserOwnsEvent,
} from '../../server/lib/firebaseServer';
import {
  applyCorsAndApiHeaders,
  checkRateLimit,
  getHeaderValue,
  isSafeId,
  readJsonBody,
} from '../../server/lib/security';
import { ApiRequest, ApiResponse, sendJson } from '../../server/lib/vercelTypes';

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

/**
 * Worker dispatch & job claim endpoint for external Cloud Run / Cloud Tasks / Cloud Functions runners.
 * Requires either a valid WORKER_SHARED_SECRET header OR an authenticated event owner Firebase token.
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
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
  } catch (err) {
    console.error('Worker job query error:', err);
    sendJson(res, 500, { error: 'Unable to query pending indexing jobs.' });
  }
}
