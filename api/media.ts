import { authenticateRequest, verifyUserOwnsEvent } from '../server/lib/firebaseServer';
import {
  handleDeleteEventMedia,
  handleServeEventPhoto,
  handleUploadPhoto,
} from '../server/lib/mediaHandlers';
import {
  applyCorsAndApiHeaders,
  checkRateLimit,
  getQueryStringParam,
  isSafeId,
  signEventMediaToken,
} from '../server/lib/security';
import { ApiRequest, ApiResponse, sendJson } from '../server/lib/vercelTypes';

function resolveMediaAction(req: ApiRequest): string {
  const explicit = getQueryStringParam(req, 'action').trim();
  if (explicit) return explicit;
  const reqPath = (req.url || '').split('?')[0];
  if (reqPath === '/api/media/upload-photo') return 'upload-photo';
  if (/^\/api\/media\/events\/[^/]+\/session-token$/.test(reqPath)) return 'session-token';
  if (/^\/api\/media\/events\/[^/]+\/photos\/[^/]+$/.test(reqPath)) return 'photo';
  if (/^\/api\/media\/events\/[^/]+$/.test(reqPath)) return 'delete-event';
  return '';
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const action = resolveMediaAction(req);
  const reqPath = (req.url || '').split('?')[0];

  if (action === 'upload-photo') {
    if (!applyCorsAndApiHeaders(req, res, 'POST, OPTIONS')) return;
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed.' });
      return;
    }
    if (!checkRateLimit(req, res, 'upload-photo', 120, 60 * 1000)) return;
    const caller = await authenticateRequest(req, res);
    if (!caller) return;

    await handleUploadPhoto(req, res, {
      idToken: caller.idToken,
      uid: caller.decoded.uid,
      email: caller.decoded.email,
    });
    return;
  }

  if (action === 'session-token') {
    if (!applyCorsAndApiHeaders(req, res, 'POST, OPTIONS')) return;
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed.' });
      return;
    }
    if (!checkRateLimit(req, res, 'media-session-token', 120, 60 * 1000)) return;
    const caller = await authenticateRequest(req, res);
    if (!caller) return;

    const match = reqPath.match(/^\/api\/media\/events\/([^/]+)\/session-token$/);
    const eventId =
      req.params?.eventId ||
      getQueryStringParam(req, 'eventId') ||
      (match ? decodeURIComponent(match[1]) : '');
    if (!isSafeId(eventId)) {
      sendJson(res, 400, { error: 'Invalid event ID.' });
      return;
    }

    const ownsEvent = await verifyUserOwnsEvent(
      eventId,
      caller.idToken,
      caller.decoded.uid,
      caller.decoded.email
    );
    if (!ownsEvent) {
      sendJson(res, 403, { error: 'Forbidden: You do not own this wedding event.' });
      return;
    }

    sendJson(res, 200, signEventMediaToken(eventId));
    return;
  }

  if (action === 'photo') {
    if (!applyCorsAndApiHeaders(req, res, 'GET, OPTIONS')) return;
    if (req.method !== 'GET') {
      sendJson(res, 405, { error: 'Method not allowed.' });
      return;
    }
    if (!checkRateLimit(req, res, 'serve-photo', 240, 60 * 1000)) return;

    const match = reqPath.match(/^\/api\/media\/events\/([^/]+)\/photos\/([^/]+)$/);
    const eventId =
      req.params?.eventId ||
      getQueryStringParam(req, 'eventId') ||
      (match ? decodeURIComponent(match[1]) : '');
    const photoId =
      req.params?.photoId ||
      getQueryStringParam(req, 'photoId') ||
      (match ? decodeURIComponent(match[2]) : '');
    await handleServeEventPhoto(req, res, eventId, photoId);
    return;
  }

  if (action === 'delete-event') {
    if (!applyCorsAndApiHeaders(req, res, 'DELETE, OPTIONS')) return;
    if (req.method !== 'DELETE') {
      sendJson(res, 405, { error: 'Method not allowed.' });
      return;
    }
    if (!checkRateLimit(req, res, 'delete-event-media', 60, 60 * 1000)) return;
    const caller = await authenticateRequest(req, res);
    if (!caller) return;

    const match = reqPath.match(/^\/api\/media\/events\/([^/]+)$/);
    const eventId =
      req.params?.eventId ||
      getQueryStringParam(req, 'eventId') ||
      (match ? decodeURIComponent(match[1]) : '');
    await handleDeleteEventMedia(req, res, eventId, {
      idToken: caller.idToken,
      uid: caller.decoded.uid,
      email: caller.decoded.email,
    });
    return;
  }

  sendJson(res, 404, { error: 'Media endpoint not found.' });
}
