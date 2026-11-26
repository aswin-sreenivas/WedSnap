import { authenticateRequest, invalidateEventCaches } from '../../../server/lib/firebaseServer';
import { applyCorsAndApiHeaders, checkRateLimit } from '../../../server/lib/security';
import { ApiRequest, ApiResponse, sendJson } from '../../../server/lib/vercelTypes';

export default async function handler(req: ApiRequest, res: ApiResponse) {
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
}
