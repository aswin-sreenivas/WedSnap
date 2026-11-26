import { handleServeEventPhoto } from '../../../../../server/lib/mediaHandlers';
import { applyCorsAndApiHeaders, checkRateLimit, getQueryStringParam } from '../../../../../server/lib/security';
import { ApiRequest, ApiResponse, sendJson } from '../../../../../server/lib/vercelTypes';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (!applyCorsAndApiHeaders(req, res, 'GET, OPTIONS')) return;
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed.' });
    return;
  }
  if (!checkRateLimit(req, res, 'serve-photo', 240, 60 * 1000)) return;

  const eventId = req.params?.eventId || getQueryStringParam(req, 'eventId');
  const photoId = req.params?.photoId || getQueryStringParam(req, 'photoId');
  await handleServeEventPhoto(req, res, eventId, photoId);
}
