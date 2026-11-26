import { getCanonicalOrigin } from '../../server/lib/security';
import { generateSitemapXml } from '../../server/lib/ssrHtml';
import { ApiRequest, ApiResponse, sendText } from '../../server/lib/vercelTypes';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const origin = getCanonicalOrigin(req);
  const xml = await generateSitemapXml(origin);
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  sendText(res, 200, 'application/xml; charset=utf-8', xml);
}
