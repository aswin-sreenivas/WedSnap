import { getCanonicalOrigin } from '../../server/lib/security';
import { generateRobotsTxt } from '../../server/lib/ssrHtml';
import { ApiRequest, ApiResponse, sendText } from '../../server/lib/vercelTypes';

export default function handler(req: ApiRequest, res: ApiResponse) {
  const origin = getCanonicalOrigin(req);
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  sendText(res, 200, 'text/plain; charset=utf-8', generateRobotsTxt(origin));
}
