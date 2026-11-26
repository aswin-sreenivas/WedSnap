import { authenticateRequest, verifyUserOwnsEvent } from '../../../../server/lib/firebaseServer';
import {
  applyCorsAndApiHeaders,
  checkRateLimit,
  getQueryStringParam,
  isSafeId,
  signEventMediaToken,
} from '../../../../server/lib/security';
import { ApiRequest, ApiResponse, sendJson } from '../../../../server/lib/vercelTypes';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (!applyCorsAndApiHeaders(req, res, 'POST, OPTIONS')) return;
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed.' });
    return;
  }
  if (!checkRateLimit(req, res, 'media-session-token', 120, 60 * 1000)) return;
  const caller = await authenticateRequest(req, res);
  if (!caller) return;

  const eventId = req.params?.eventId || getQueryStringParam(req, 'eventId');
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
}
