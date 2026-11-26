import fs from 'fs';
import path from 'path';
import { BLOG_ARTICLES } from '../../src/data/blogArticles';
import {
  DEFAULT_OG_IMAGE,
  PUBLIC_STATIC_ROUTES,
  resolveRouteSeo,
  SITE_NAME,
} from '../../src/data/seoRoutes';
import { fetchDiscoverablePublicEvents } from './firebaseServer';

const SSR_HOW_IT_WORKS_FAQS = [
  {
    q: 'Do wedding guests need to install an app or create an account?',
    a: 'No. Guests open the event URL or scan the wedding QR code directly in Chrome or Safari on their phone or laptop—no downloads, logins, or passwords required.',
  },
  {
    q: 'What happens to my selfie after I scan my face?',
    a: 'With your explicit consent, WedSnap converts your camera frame or uploaded selfie into a temporary 128-dimensional vector inside your browser memory solely to compare against indexed event photos, then discards it immediately once results are displayed.',
  },
  {
    q: 'Does WedSnap modify or delete photos in my Google Drive folder?',
    a: 'No. WedSnap requests read-only Google Drive access (drive.readonly) so your original high-resolution wedding albums remain untouched inside your Drive.',
  },
  {
    q: 'Can wedding galleries stay private from Google Search?',
    a: 'Yes. New wedding events are private and marked noindex by default. Galleries appear in the public directory or sitemap only when an organizer explicitly opts in.',
  },
  {
    q: 'What image formats are supported during Google Drive sync?',
    a: 'WedSnap synchronizes JPG, JPEG, PNG, and WebP wedding photographs and automatically skips previously synced Drive file IDs to prevent duplicate downloads.',
  },
];

export function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function escapeXml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function generateRobotsTxt(origin: string): string {
  return [
    'User-agent: *',
    'Allow: /',
    'Allow: /about',
    'Allow: /how-it-works',
    'Allow: /features',
    'Allow: /for-photographers',
    'Allow: /pricing',
    'Allow: /blog',
    'Allow: /privacy-policy',
    'Allow: /terms',
    'Allow: /contact',
    'Disallow: /admin',
    'Disallow: /admin/',
    'Disallow: /api/',
    'Disallow: /e/*/scan',
    'Disallow: /e/*/results',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
  ].join('\n');
}

export async function generateSitemapXml(origin: string): Promise<string> {
  const todayIso = new Date().toISOString().slice(0, 10);
  const discoverableEvents = await fetchDiscoverablePublicEvents();

  const urls: Array<{ loc: string; lastmod: string; changefreq: string; priority: string }> = [
    ...PUBLIC_STATIC_ROUTES.map((r) => ({
      loc: `${origin}${r.path}`,
      lastmod: todayIso,
      changefreq: r.changefreq || 'monthly',
      priority: r.priority || '0.7',
    })),
    ...BLOG_ARTICLES.map((a) => ({
      loc: `${origin}/blog/${a.slug}`,
      lastmod: a.updatedAt,
      changefreq: 'monthly',
      priority: '0.8',
    })),
    ...discoverableEvents.map((evt) => ({
      loc: `${origin}/e/${encodeURIComponent(evt.slug)}`,
      lastmod: evt.updatedAtIso || todayIso,
      changefreq: 'weekly',
      priority: '0.7',
    })),
  ];

  const xmlItems = urls
    .map(
      (u) =>
        `  <url>\n    <loc>${escapeXml(u.loc)}</loc>\n    <lastmod>${escapeXml(
          u.lastmod
        )}</lastmod>\n    <changefreq>${escapeXml(u.changefreq)}</changefreq>\n    <priority>${escapeXml(
          u.priority
        )}</priority>\n  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xmlItems}\n</urlset>\n`;
}

export async function buildRouteHtml(
  templateHtml: string,
  reqPath: string,
  origin: string,
  options?: { heroPreloadUrl?: string }
): Promise<{ html: string; statusCode: number }> {
  const rawPath = reqPath || '/';
  const cleanPath = rawPath.length > 1 ? rawPath.replace(/\/+$/, '') : rawPath;

  let seo = resolveRouteSeo(cleanPath);
  let statusCode = 200;
  const extraJsonLd: Array<Record<string, unknown>> = [];

  const isKnownStatic = PUBLIC_STATIC_ROUTES.some((r) => r.path === cleanPath);
  const isKnownBlog =
    cleanPath.startsWith('/blog/') &&
    BLOG_ARTICLES.some((a) => a.slug === cleanPath.slice('/blog/'.length));
  const isGuestRoute = /^\/e\/[^/]+(\/(scan|results(\/[^/]+)?)?)?$/.test(cleanPath);
  const isAdminRoute = cleanPath === '/admin' || cleanPath.startsWith('/admin/');

  if (!isKnownStatic && !isKnownBlog && !isGuestRoute && !isAdminRoute) {
    statusCode = 404;
  }

  if (isKnownBlog) {
    const article = BLOG_ARTICLES.find((a) => a.slug === cleanPath.slice('/blog/'.length))!;
    const absImage = article.featuredImage.startsWith('http')
      ? article.featuredImage
      : `${origin}${article.featuredImage}`;
    extraJsonLd.push(
      {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: article.title,
        description: article.metaDescription,
        image: absImage,
        datePublished: article.publishedAt,
        dateModified: article.updatedAt,
        author: { '@type': 'Person', name: article.authorName },
        publisher: {
          '@type': 'Organization',
          name: SITE_NAME,
          logo: {
            '@type': 'ImageObject',
            url: `${origin}/src/assets/images/wedsnap_app_icon_1795726533955.jpg`,
          },
        },
        mainEntityOfPage: `${origin}${cleanPath}`,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: `${origin}/blog` },
          { '@type': 'ListItem', position: 3, name: article.title, item: `${origin}${cleanPath}` },
        ],
      }
    );
  } else if (cleanPath === '/') {
    extraJsonLd.push(
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: SITE_NAME,
        url: origin,
        logo: `${origin}/src/assets/images/wedsnap_app_icon_1795726533955.jpg`,
        description: seo.description,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'WedSnap – AI Wedding Photo Finder',
        url: origin,
        description: seo.description,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'WedSnap – AI Wedding Photo Finder',
        applicationCategory: 'PhotographyApplication',
        operatingSystem: 'Web',
        url: origin,
        description: seo.description,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      }
    );
  } else if (cleanPath === '/how-it-works') {
    extraJsonLd.push(
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: SSR_HOW_IT_WORKS_FAQS.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
          { '@type': 'ListItem', position: 2, name: 'How It Works', item: `${origin}/how-it-works` },
        ],
      }
    );
  } else if (isKnownStatic) {
    extraJsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: seo.h1, item: `${origin}${cleanPath}` },
      ],
    });
  } else if (/^\/e\/[^/]+$/.test(cleanPath)) {
    const slug = cleanPath.slice('/e/'.length);
    const discoverable = await fetchDiscoverablePublicEvents();
    const matched = discoverable.find((e) => e.slug === slug);
    if (matched) {
      seo = {
        ...seo,
        title: `${matched.title} – Wedding Photo Gallery | WedSnap`,
        description: `Find your wedding photos from ${matched.coupleNames} (${matched.eventDate}). Scan your face once with ephemeral AI matching to download your portraits.`,
        robots: 'index, follow',
        h1: matched.title,
        summary:
          matched.welcomeMessage ||
          `Wedding photo gallery for ${matched.coupleNames}. Scan your face to find and download your photographs.`,
        ogImage: matched.coverPhotoUrl,
      };
      extraJsonLd.push(
        {
          '@context': 'https://schema.org',
          '@type': 'Event',
          name: matched.title,
          startDate: matched.eventDate,
          eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
          location: { '@type': 'VirtualLocation', url: `${origin}${cleanPath}` },
          url: `${origin}${cleanPath}`,
          organizer: { '@type': 'Organization', name: matched.coupleNames },
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
            { '@type': 'ListItem', position: 2, name: matched.title, item: `${origin}${cleanPath}` },
          ],
        }
      );
    }
  }

  const canonicalUrl = `${origin}${cleanPath}`;
  const ogImageRel = seo.ogImage || DEFAULT_OG_IMAGE;
  const absoluteOgImage = ogImageRel.startsWith('http')
    ? ogImageRel
    : `${origin}${ogImageRel.startsWith('/') ? ogImageRel : `/${ogImageRel}`}`;

  let html = templateHtml;

  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(seo.title)}</title>`);
  html = html.replace(
    /<meta\s+name="description"[^>]*>/i,
    `<meta name="description" content="${escapeHtml(seo.description)}" />`
  );
  html = html.replace(
    /<meta\s+name="robots"[^>]*>/i,
    `<meta name="robots" content="${escapeHtml(seo.robots)}" />`
  );
  html = html.replace(
    /<meta\s+property="og:title"[^>]*>/i,
    `<meta property="og:title" content="${escapeHtml(seo.title)}" />`
  );
  html = html.replace(
    /<meta\s+property="og:description"[^>]*>/i,
    `<meta property="og:description" content="${escapeHtml(seo.description)}" />`
  );
  html = html.replace(
    /<meta\s+property="og:type"[^>]*>/i,
    `<meta property="og:type" content="${escapeHtml(seo.ogType || 'website')}" />`
  );
  html = html.replace(
    /<meta\s+property="og:image"[^>]*>/i,
    `<meta property="og:image" content="${escapeHtml(absoluteOgImage)}" />`
  );
  html = html.replace(
    /<meta\s+name="twitter:title"[^>]*>/i,
    `<meta name="twitter:title" content="${escapeHtml(seo.title)}" />`
  );
  html = html.replace(
    /<meta\s+name="twitter:description"[^>]*>/i,
    `<meta name="twitter:description" content="${escapeHtml(seo.description)}" />`
  );
  html = html.replace(
    /<meta\s+name="twitter:image"[^>]*>/i,
    `<meta name="twitter:image" content="${escapeHtml(absoluteOgImage)}" />`
  );

  const headInjections = [
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`,
    `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`,
  ];

  const heroPreload =
    options?.heroPreloadUrl || '/src/assets/images/hero_wedding_couple_1795725465123.jpg';
  if (cleanPath === '/') {
    headInjections.push(
      `<link rel="preload" as="image" href="${escapeHtml(heroPreload)}" fetchpriority="high" />`
    );
  }

  for (const item of extraJsonLd) {
    const safeJson = JSON.stringify(item).replace(/</g, '\\u003c');
    headInjections.push(
      `<script type="application/ld+json" data-wedsnap-ld="true">${safeJson}</script>`
    );
  }

  html = html.replace('</head>', `    ${headInjections.join('\n    ')}\n  </head>`);

  const publicNavHtml =
    seo.robots === 'index, follow'
      ? `<nav aria-label="Public directory"><a href="/">Home</a> · <a href="/how-it-works">How It Works</a> · <a href="/features">Features</a> · <a href="/for-photographers">For Photographers</a> · <a href="/pricing">Pricing</a> · <a href="/blog">Journal</a> · <a href="/about">About</a> · <a href="/contact">Contact</a> · <a href="/privacy-policy">Privacy Policy</a> · <a href="/terms">Terms</a></nav>`
      : '';

  const semanticBody = `<main style="max-width:72rem;margin:0 auto;padding:3rem 1.5rem;font-family:system-ui,sans-serif;color:#1C1917;"><h1>${escapeHtml(
    seo.h1
  )}</h1><p>${escapeHtml(seo.summary)}</p>${publicNavHtml}</main>`;

  html = html.replace('<div id="root"></div>', `<div id="root">${semanticBody}</div>`);

  return { html, statusCode };
}

export function loadProductionSsrTemplate(): { templateHtml: string; heroPreloadUrl?: string } {
  const candidates = [
    path.resolve(process.cwd(), 'server/generated/index.html'),
    path.resolve(process.cwd(), 'dist/index.html'),
  ];
  let templateHtml = '';
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      templateHtml = fs.readFileSync(c, 'utf-8');
      break;
    }
  }

  let heroPreloadUrl: string | undefined;
  const manifestPath = path.resolve(process.cwd(), 'server/generated/ssr-manifest.json');
  if (fs.existsSync(manifestPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as {
        heroPreloadUrl?: string;
      };
      heroPreloadUrl = parsed.heroPreloadUrl;
    } catch {
      // Ignore malformed manifest
    }
  }

  return { templateHtml, heroPreloadUrl };
}
