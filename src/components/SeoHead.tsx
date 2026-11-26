import { useEffect } from 'react';
import { DEFAULT_OG_IMAGE, SITE_NAME } from '../data/seoRoutes';
import { trackAnalyticsEvent } from '../lib/analytics';

export interface SeoHeadProps {
  title: string;
  description: string;
  path: string;
  robots?: 'index, follow' | 'noindex, nofollow';
  ogType?: 'website' | 'article';
  ogImage?: string;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
}

function upsertMeta(attrName: 'name' | 'property', attrValue: string, content: string) {
  const selector = `meta[${attrName}="${attrValue}"]`;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export function SeoHead({
  title,
  description,
  path,
  robots = 'index, follow',
  ogType = 'website',
  ogImage = DEFAULT_OG_IMAGE,
  jsonLd,
}: SeoHeadProps) {
  useEffect(() => {
    const origin = window.location.origin;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const canonicalUrl = `${origin}${cleanPath}`;
    const absoluteImage = ogImage.startsWith('http')
      ? ogImage
      : `${origin}${ogImage.startsWith('/') ? ogImage : `/${ogImage}`}`;

    document.title = title;
    upsertCanonical(canonicalUrl);

    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', robots);

    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:type', ogType);
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', canonicalUrl);
    upsertMeta('property', 'og:image', absoluteImage);

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', absoluteImage);

    // Replace route-scoped JSON-LD cleanly to avoid duplicate schema entities
    const existingScripts = document.head.querySelectorAll('script[data-wedsnap-ld="true"]');
    existingScripts.forEach((s) => s.remove());

    if (jsonLd) {
      const items = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      for (const item of items) {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.setAttribute('data-wedsnap-ld', 'true');
        script.textContent = JSON.stringify(item);
        document.head.appendChild(script);
      }
    }

    if (robots === 'index, follow') {
      trackAnalyticsEvent('page_view', { page_path: cleanPath, page_title: title });
    }
  }, [title, description, path, robots, ogType, ogImage, jsonLd]);

  return null;
}
