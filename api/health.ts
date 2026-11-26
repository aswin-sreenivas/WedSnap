import { applyCorsAndApiHeaders } from '../server/lib/security';
import { ApiRequest, ApiResponse, sendJson } from '../server/lib/vercelTypes';

export default function handler(req: ApiRequest, res: ApiResponse) {
  if (!applyCorsAndApiHeaders(req, res, 'GET, OPTIONS')) return;
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed.' });
    return;
  }
  res.setHeader('Cache-Control', 'no-store');
  sendJson(res, 200, {
    status: 'ok',
    runtime: process.env.VERCEL === '1' ? 'vercel-serverless' : 'node',
    timestamp: new Date().toISOString(),
  });
}
