import { handleListDriveFolderPhotos } from '../../../../server/lib/driveHandlers';
import { authenticateRequest } from '../../../../server/lib/firebaseServer';
import { applyCorsAndApiHeaders, checkRateLimit, getQueryStringParam } from '../../../../server/lib/security';
import { ApiRequest, ApiResponse, sendJson } from '../../../../server/lib/vercelTypes';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (!applyCorsAndApiHeaders(req, res, 'GET, OPTIONS')) return;
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed.' });
    return;
  }
  if (!checkRateLimit(req, res, 'drive-folder-photos', 120, 60 * 1000)) return;
  const caller = await authenticateRequest(req, res);
  if (!caller) return;

  const folderId = req.params?.folderId || getQueryStringParam(req, 'folderId');
  await handleListDriveFolderPhotos(req, res, folderId);
}
