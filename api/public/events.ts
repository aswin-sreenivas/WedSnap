import { fetchDiscoverablePublicEvents } from '../../server/lib/firebaseServer';
import { applyCorsAndApiHeaders } from '../../server/lib/security';
import { ApiRequest, ApiResponse, sendJson } from '../../server/lib/vercelTypes';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (!applyCorsAndApiHeaders(req, res, 'GET, OPTIONS')) return;
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed.' });
    return;
  }
  const events = await fetchDiscoverablePublicEvents();
  res.setHeader('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=60');
  sendJson(res, 200, { events });
}
