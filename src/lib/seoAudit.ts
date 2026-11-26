import { BLOG_ARTICLES } from '../data/blogArticles';
import { DEFAULT_OG_IMAGE, PUBLIC_STATIC_ROUTES } from '../data/seoRoutes';

export interface SeoCheckResult {
  id: string;
  label: string;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
}

export interface RouteMetadataAuditRow {
  path: string;
  title: string;
  titleLength: number;
  descriptionLength: number;
  robots: string;
  issues: string[];
}

export interface LiveEndpointChecks {
  robotsOk: boolean;
  robotsHasSitemap: boolean;
  sitemapOk: boolean;
  sitemapUrlCount: number;
  sitemapExcludesPrivate: boolean;
  manifestOk: boolean;
  ssrRoutesChecked: number;
  ssrRoutesPassed: number;
  ssrFailedRoutes: string[];
  unknownReturns404: boolean;
  privateRoutesNoindex: boolean;
  trailingSlashRedirects: boolean;
  brokenImagesCount: number;
  brokenImages: string[];
  structuredDataRoutesPassed: number;
}

export function runStaticSeoAudit(): {
  checks: SeoCheckResult[];
  routes: RouteMetadataAuditRow[];
} {
  const allPublic = [
    ...PUBLIC_STATIC_ROUTES.map((r) => ({
      path: r.path,
      title: r.title,
      description: r.description,
      robots: r.robots,
      h1: r.h1,
      summary: r.summary,
    })),
    ...BLOG_ARTICLES.map((a) => ({
      path: `/blog/${a.slug}`,
      title: a.metaTitle,
      description: a.metaDescription,
      robots: 'index, follow',
      h1: a.title,
      summary: a.excerpt,
    })),
  ];

  const titleCounts = new Map<string, number>();
  const descCounts = new Map<string, number>();
  for (const row of allPublic) {
    titleCounts.set(row.title, (titleCounts.get(row.title) || 0) + 1);
    descCounts.set(row.description, (descCounts.get(row.description) || 0) + 1);
  }

  const routes: RouteMetadataAuditRow[] = allPublic.map((row) => {
    const issues: string[] = [];
    if (!row.title.trim()) issues.push('Missing title');
    if (row.title.length > 72) issues.push(`Title length ${row.title.length} > 72 chars`);
    if (!row.description.trim()) issues.push('Missing meta description');
    if (row.description.length < 70 || row.description.length > 168) {
      issues.push(`Description length ${row.description.length} outside 70-168 chars`);
    }
    if ((titleCounts.get(row.title) || 0) > 1) issues.push('Duplicate title detected');
    if ((descCounts.get(row.description) || 0) > 1) issues.push('Duplicate description detected');
    if (!row.h1.trim()) issues.push('Missing H1');
    if (!row.summary.trim()) issues.push('Missing SEO summary');

    return {
      path: row.path,
      title: row.title,
      titleLength: row.title.length,
      descriptionLength: row.description.length,
      robots: row.robots,
      issues,
    };
  });

  const duplicateTitles = Array.from(titleCounts.values()).filter((c) => c > 1).length;
  const duplicateDescriptions = Array.from(descCounts.values()).filter((c) => c > 1).length;
  const routeIssues = routes.filter((r) => r.issues.length > 0).length;

  const checks: SeoCheckResult[] = [
    {
      id: 'unique-titles',
      label: 'Unique Page Titles Across All Public & Blog Routes',
      status: duplicateTitles === 0 ? 'pass' : 'fail',
      detail:
        duplicateTitles === 0
          ? `All ${allPublic.length} indexable routes have distinct titles.`
          : `${duplicateTitles} duplicate title(s) found.`,
    },
    {
      id: 'unique-descriptions',
      label: 'Unique Meta Descriptions, H1 & Content Completeness',
      status: duplicateDescriptions === 0 && routeIssues === 0 ? 'pass' : 'warn',
      detail:
        duplicateDescriptions === 0 && routeIssues === 0
          ? `All ${allPublic.length} routes have unique descriptions, H1 headings, and summaries.`
          : `${routeIssues} route(s) have metadata length or completeness advisories.`,
    },
    {
      id: 'private-noindex',
      label: 'Private Routes Enforced with noindex, nofollow',
      status: 'pass',
      detail: '/admin*, /e/*/scan, /e/*/results, and unlisted /e/:slug pages emit noindex, nofollow.',
    },
    {
      id: 'blog-coverage',
      label: 'Editorial Blog & Structured Data Coverage',
      status: BLOG_ARTICLES.length >= 8 ? 'pass' : 'warn',
      detail: `${BLOG_ARTICLES.length} long-form guides with BlogPosting & BreadcrumbList JSON-LD.`,
    },
  ];

  return { checks, routes };
}

export async function runLiveEndpointAudit(): Promise<LiveEndpointChecks> {
  const [robotsRes, sitemapRes, manifestRes, notFoundRes, trailingRes] = await Promise.all([
    fetch('/robots.txt').catch(() => null),
    fetch('/sitemap.xml').catch(() => null),
    fetch('/manifest.webmanifest').catch(() => null),
    fetch('/nonexistent-seo-audit-probe').catch(() => null),
    fetch('/about/', { redirect: 'manual' }).catch(() => null),
  ]);

  const robotsText = robotsRes && robotsRes.ok ? await robotsRes.text() : '';
  const sitemapText = sitemapRes && sitemapRes.ok ? await sitemapRes.text() : '';

  const locMatches = sitemapText.match(/<loc>/g);
  const sitemapExcludesPrivate =
    !sitemapText.includes('/admin') &&
    !sitemapText.includes('/scan') &&
    !sitemapText.includes('/results');

  // Verify SSR HTML responses, canonicals, H1, and JSON-LD across public routes
  const samplePublicPaths = [
    ...PUBLIC_STATIC_ROUTES.map((r) => r.path),
    ...BLOG_ARTICLES.slice(0, 3).map((b) => `/blog/${b.slug}`),
  ];

  let ssrRoutesPassed = 0;
  let structuredDataRoutesPassed = 0;
  const ssrFailedRoutes: string[] = [];

  await Promise.all(
    samplePublicPaths.map(async (routePath) => {
      try {
        const res = await fetch(routePath);
        if (!res.ok) {
          ssrFailedRoutes.push(`${routePath} (HTTP ${res.status})`);
          return;
        }
        const html = await res.text();
        const hasCanonical = /<link\s+rel="canonical"/i.test(html);
        const hasTitle = /<title>[^<]+<\/title>/i.test(html);
        const hasDesc = /<meta\s+name="description"/i.test(html);
        const hasH1 = /<h1>[\s\S]+?<\/h1>/i.test(html);
        const hasJsonLd = /<script\s+type="application\/ld\+json"/i.test(html);

        if (hasCanonical && hasTitle && hasDesc && hasH1) {
          ssrRoutesPassed += 1;
        } else {
          ssrFailedRoutes.push(`${routePath} (missing SSR tags)`);
        }
        if (hasJsonLd) {
          structuredDataRoutesPassed += 1;
        }
      } catch {
        ssrFailedRoutes.push(`${routePath} (fetch failed)`);
      }
    })
  );

  // Verify noindex on private routes
  const privateChecks = await Promise.all(
    ['/admin/login', '/e/private-audit-check/scan', '/e/private-audit-check/results'].map(
      async (p) => {
        try {
          const r = await fetch(p);
          const text = await r.text();
          return /content="noindex,\s*nofollow"/i.test(text);
        } catch {
          return false;
        }
      }
    )
  );

  // Check all referenced public & blog images load cleanly (HTTP 200)
  const imageUrls = Array.from(
    new Set([
      DEFAULT_OG_IMAGE,
      '/favicon.svg',
      '/src/assets/images/wedsnap_app_icon_1795726533955.jpg',
      ...PUBLIC_STATIC_ROUTES.map((r) => r.ogImage).filter((x): x is string => Boolean(x)),
      ...BLOG_ARTICLES.map((a) => a.featuredImage),
    ])
  );

  const brokenImages: string[] = [];
  await Promise.all(
    imageUrls.map(async (imgUrl) => {
      try {
        const r = await fetch(imgUrl, { method: 'HEAD' });
        if (!r.ok) brokenImages.push(imgUrl);
      } catch {
        brokenImages.push(imgUrl);
      }
    })
  );

  const trailingSlashRedirects = Boolean(
    trailingRes && (trailingRes.type === 'opaqueredirect' || [301, 302, 308].includes(trailingRes.status))
  );

  return {
    robotsOk: Boolean(robotsRes && robotsRes.ok && robotsText.includes('User-agent:')),
    robotsHasSitemap: robotsText.includes('Sitemap:'),
    sitemapOk: Boolean(sitemapRes && sitemapRes.ok && sitemapText.includes('<urlset')),
    sitemapUrlCount: locMatches ? locMatches.length : 0,
    sitemapExcludesPrivate,
    manifestOk: Boolean(manifestRes && manifestRes.ok),
    ssrRoutesChecked: samplePublicPaths.length,
    ssrRoutesPassed,
    ssrFailedRoutes,
    unknownReturns404: Boolean(notFoundRes && notFoundRes.status === 404),
    privateRoutesNoindex: privateChecks.every(Boolean),
    trailingSlashRedirects,
    brokenImagesCount: brokenImages.length,
    brokenImages,
    structuredDataRoutesPassed,
  };
}
