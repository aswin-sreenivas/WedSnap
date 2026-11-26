import { authenticateRequest } from '../../server/lib/firebaseServer';
import { handleUploadPhoto } from '../../server/lib/mediaHandlers';
import { applyCorsAndApiHeaders, checkRateLimit } from '../../server/lib/security';
import { ApiRequest, ApiResponse, sendJson } from '../../server/lib/vercelTypes';

export default async function handler(req: ApiRequest, res: ApiResponse) {
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
}
