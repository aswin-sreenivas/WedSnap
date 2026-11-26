import { authenticateRequest } from '../../../../server/lib/firebaseServer';
import { handleDeleteEventMedia } from '../../../../server/lib/mediaHandlers';
import { applyCorsAndApiHeaders, checkRateLimit, getQueryStringParam } from '../../../../server/lib/security';
import { ApiRequest, ApiResponse, sendJson } from '../../../../server/lib/vercelTypes';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (!applyCorsAndApiHeaders(req, res, 'DELETE, OPTIONS')) return;
  if (req.method !== 'DELETE') {
    sendJson(res, 405, { error: 'Method not allowed.' });
    return;
  }
  if (!checkRateLimit(req, res, 'delete-event-media', 60, 60 * 1000)) return;
  const caller = await authenticateRequest(req, res);
  if (!caller) return;

  const eventId = req.params?.eventId || getQueryStringParam(req, 'eventId');
  await handleDeleteEventMedia(req, res, eventId, {
    idToken: caller.idToken,
    uid: caller.decoded.uid,
    email: caller.decoded.email,
  });
}
