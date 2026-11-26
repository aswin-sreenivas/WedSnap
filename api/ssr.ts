import { getCanonicalOrigin, getQueryStringParam } from '../server/lib/security';
import { buildRouteHtml, loadProductionSsrTemplate } from '../server/lib/ssrHtml';
import { ApiRequest, ApiResponse, sendText } from '../server/lib/vercelTypes';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const origin = getCanonicalOrigin(req);
  const paramPath = getQueryStringParam(req, 'path');
  const rawUrl = paramPath || (req.url || '/').split('?')[0] || '/';
  const reqPath = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;

  const { templateHtml, heroPreloadUrl } = loadProductionSsrTemplate();
  if (!templateHtml) {
    sendText(
      res,
      500,
      'text/plain; charset=utf-8',
      'SSR template missing. Ensure npm run build completed before deployment.'
    );
    return;
  }

  const { html, statusCode } = await buildRouteHtml(templateHtml, reqPath, origin, {
    heroPreloadUrl,
  });

  const isPublicIndexable = statusCode === 200 && !reqPath.startsWith('/admin') && !reqPath.includes('/scan') && !reqPath.includes('/results');
  res.setHeader(
    'Cache-Control',
    isPublicIndexable ? 'public, s-maxage=60, stale-while-revalidate=300' : 'no-store'
  );
  sendText(res, statusCode, 'text/html; charset=utf-8', html);
}
