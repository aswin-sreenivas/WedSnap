import { BLOG_ARTICLES } from './blogArticles';

export const SITE_NAME = 'WedSnap';
export const DEFAULT_OG_IMAGE = '/src/assets/images/wedsnap_og_banner_1795726533838.jpg';

export interface StaticRouteSeo {
  path: string;
  title: string;
  description: string;
  robots: 'index, follow' | 'noindex, nofollow';
  h1: string;
  summary: string;
  ogType?: 'website' | 'article';
  ogImage?: string;
  changefreq?: 'daily' | 'weekly' | 'monthly';
  priority?: string;
}

export const PUBLIC_STATIC_ROUTES: StaticRouteSeo[] = [
  {
    path: '/',
    title: 'WedSnap – AI Wedding Photo Finder | Find Your Wedding Photos',
    description:
      'Find your wedding photographs instantly with WedSnap AI. Scan your face, discover your wedding memories and download matching photos from one beautiful online gallery.',
    robots: 'index, follow',
    h1: "Find Every Wedding Photo You're In with AI",
    summary:
      'WedSnap helps wedding guests find their photographs using AI-powered facial recognition. Scan your face, discover matching wedding memories and download your photos effortlessly.',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    changefreq: 'weekly',
    priority: '1.0',
  },
  {
    path: '/about',
    title: 'About WedSnap – Privacy-First AI Wedding Photo Discovery',
    description:
      'Learn how WedSnap helps wedding photographers and couples across India and worldwide deliver searchable, privacy-first wedding photo galleries via Google Drive.',
    robots: 'index, follow',
    h1: 'Built to reunite every guest with their wedding memories',
    summary:
      'WedSnap pairs minimalist wedding gallery design with ephemeral browser face matching and Google Drive synchronization.',
    ogType: 'website',
    ogImage: '/src/assets/images/hero_wedding_couple_1795725465123.jpg',
    changefreq: 'monthly',
    priority: '0.8',
  },
  {
    path: '/how-it-works',
    title: 'How WedSnap Works – Scan Your Face & Find Wedding Photos',
    description:
      'See how WedSnap syncs wedding albums from Google Drive, indexes faces accurately, and lets guests find their wedding photos with an ephemeral camera scan.',
    robots: 'index, follow',
    h1: 'From Google Drive album to personal portraits in three steps',
    summary:
      'Connect Google Drive, run multi-face AI indexing, and share a wedding QR code for instant guest photo discovery.',
    ogType: 'website',
    ogImage: '/src/assets/images/wedding_moment_toast_1795725465678.jpg',
    changefreq: 'monthly',
    priority: '0.8',
  },
  {
    path: '/features',
    title: 'WedSnap Features – AI Face Search, Drive Sync & QR Galleries',
    description:
      'Explore WedSnap features: Google Drive folder sync, multi-face 128-D embeddings, ephemeral guest face scanning, ZIP batch downloads, and printable QR codes.',
    robots: 'index, follow',
    h1: 'Everything needed for effortless wedding photo sharing',
    summary:
      'Purpose-built tools for wedding studios, couples, and mobile-first guests.',
    ogType: 'website',
    ogImage: '/src/assets/images/wedding_cover_classic_1795725466190.jpg',
    changefreq: 'monthly',
    priority: '0.8',
  },
  {
    path: '/for-photographers',
    title: 'WedSnap for Wedding Photographers – Client Galleries & AI Search',
    description:
      'Deliver searchable wedding client galleries directly from Google Drive. Delight wedding guests in India and globally with QR face search and full-resolution downloads.',
    robots: 'index, follow',
    h1: 'Deliver smarter client galleries without re-uploading',
    summary:
      'Connect your studio Google Drive folders, tune face-match accuracy, and turn every wedding guest into a referral.',
    ogType: 'website',
    ogImage: '/src/assets/images/photographer_studio_workflow_1795726534406.jpg',
    changefreq: 'monthly',
    priority: '0.8',
  },
  {
    path: '/pricing',
    title: 'WedSnap Pricing – Plans for Couples & Wedding Photographers',
    description:
      'Transparent pricing for WedSnap AI wedding photo galleries. Start hosting your wedding event with Google Drive sync, AI face indexing, and guest QR sharing.',
    robots: 'index, follow',
    h1: 'Simple, transparent plans for every celebration',
    summary:
      'Flexible access for couples hosting a single celebration and studios delivering dozens of weddings each season.',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    changefreq: 'monthly',
    priority: '0.8',
  },
  {
    path: '/blog',
    title: 'WedSnap Journal – Wedding Photo Sharing & AI Photography Guides',
    description:
      'Guides on finding yourself in wedding photos, creating wedding photo sharing QR codes, Google Drive studio workflows, and AI wedding photography.',
    robots: 'index, follow',
    h1: 'The WedSnap Journal',
    summary:
      'Practical guides for couples, guests, and modern wedding photography studios.',
    ogType: 'website',
    ogImage: '/src/assets/images/wedding_moment_dance_1795725466072.jpg',
    changefreq: 'weekly',
    priority: '0.8',
  },
  {
    path: '/privacy-policy',
    title: 'Privacy Policy – Ephemeral Face Scanning & Data Protection | WedSnap',
    description:
      'Read how WedSnap handles guest face scans ephemerally in browser memory, manages Google Drive read-only access, and protects organizer and guest privacy.',
    robots: 'index, follow',
    h1: 'Privacy Policy',
    summary:
      'Accurate details on biometric consent, ephemeral guest face processing, Google Drive permissions, and data deletion controls.',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    changefreq: 'monthly',
    priority: '0.5',
  },
  {
    path: '/terms',
    title: 'Terms of Service | WedSnap – AI Wedding Photo Finder',
    description:
      'Terms of Service governing organizer accounts, Google Drive photo synchronization, guest face matching, and acceptable use on WedSnap.',
    robots: 'index, follow',
    h1: 'Terms of Service',
    summary:
      'Clear guidelines for wedding organizers, photographers, and gallery guests using WedSnap.',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    changefreq: 'monthly',
    priority: '0.5',
  },
  {
    path: '/contact',
    title: 'Contact WedSnap – Support & Studio Partnerships',
    description:
      'Get in touch with the WedSnap team for wedding gallery support, studio partnerships across India and worldwide, or privacy inquiries.',
    robots: 'index, follow',
    h1: 'Contact our team',
    summary:
      'Questions about setting up a wedding gallery, Google Drive sync, or photography studio partnerships? Reach out anytime.',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    changefreq: 'monthly',
    priority: '0.7',
  },
];

export function resolveRouteSeo(pathname: string): StaticRouteSeo {
  const cleanPath = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;

  const exact = PUBLIC_STATIC_ROUTES.find((r) => r.path === cleanPath);
  if (exact) return exact;

  if (cleanPath.startsWith('/blog/')) {
    const slug = cleanPath.slice('/blog/'.length);
    const article = BLOG_ARTICLES.find((a) => a.slug === slug);
    if (article) {
      return {
        path: cleanPath,
        title: article.metaTitle,
        description: article.metaDescription,
        robots: 'index, follow',
        h1: article.title,
        summary: article.excerpt,
        ogType: 'article',
        ogImage: article.featuredImage,
      };
    }
  }

  if (
    cleanPath.startsWith('/admin') ||
    /^\/e\/[^/]+\/(scan|results)/.test(cleanPath)
  ) {
    return {
      path: cleanPath,
      title: 'WedSnap Workspace',
      description: 'Private WedSnap gallery workspace.',
      robots: 'noindex, nofollow',
      h1: 'WedSnap Workspace',
      summary: 'Private application route.',
      ogType: 'website',
      ogImage: DEFAULT_OG_IMAGE,
    };
  }

  if (/^\/e\/[^/]+$/.test(cleanPath)) {
    return {
      path: cleanPath,
      title: 'Wedding Photo Gallery | WedSnap',
      description:
        'Open this wedding photo gallery on WedSnap to scan your face and download your wedding portraits.',
      robots: 'noindex, nofollow',
      h1: 'Wedding Photo Gallery',
      summary: 'Scan your face to discover your wedding photographs.',
      ogType: 'website',
      ogImage: DEFAULT_OG_IMAGE,
    };
  }

  return {
    path: cleanPath,
    title: 'Page Not Found | WedSnap',
    description: 'The requested WedSnap page could not be found.',
    robots: 'noindex, nofollow',
    h1: 'Page not found',
    summary: 'The requested page does not exist or has moved.',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
  };
}
