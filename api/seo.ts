import { getCanonicalOrigin, getQueryStringParam } from '../server/lib/security';
import { generateRobotsTxt, generateSitemapXml } from '../server/lib/ssrHtml';
import { ApiRequest, ApiResponse, sendJson, sendText } from '../server/lib/vercelTypes';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method && req.method !== 'GET' && req.method !== 'HEAD') {
    sendJson(res, 405, { error: 'Method not allowed.' });
    return;
  }

  const origin = getCanonicalOrigin(req);
  const typeParam = getQueryStringParam(req, 'type').toLowerCase();
  const reqPath = (req.url || '').split('?')[0];

  if (typeParam === 'sitemap' || reqPath.endsWith('/sitemap.xml')) {
    const xml = await generateSitemapXml(origin);
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    sendText(res, 200, 'application/xml; charset=utf-8', xml);
    return;
  }

  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  sendText(res, 200, 'text/plain; charset=utf-8', generateRobotsTxt(origin));
}
