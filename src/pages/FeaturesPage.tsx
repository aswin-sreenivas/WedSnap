import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Camera,
  FolderArchive,
  FolderSync,
  QrCode,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { PublicFooter } from '../components/PublicFooter';
import { SeoHead } from '../components/SeoHead';
import { TopNav } from '../components/TopNav';
import { PUBLIC_STATIC_ROUTES } from '../data/seoRoutes';

const seo = PUBLIC_STATIC_ROUTES.find((r) => r.path === '/features')!;

const FEATURE_LIST = [
  {
    icon: FolderSync,
    title: 'Deduplicated Google Drive Sync',
    description:
      'Browse folders directly inside WedSnap with read-only OAuth permission. Incremental sync checks Drive file IDs so newly uploaded reception photos are added without re-downloading existing frames.',
  },
  {
    icon: Camera,
    title: 'Mobile Camera & Selfie Upload',
    description:
      'Guests can scan using their front-facing mobile or laptop camera inside a circular positioning guide, or upload a clear reference portrait from their photo library.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Configurable Match Sensitivity',
    description:
      'Tune the Euclidean face-distance threshold per event between strict and relaxed modes to balance recall across dim reception lighting and wide outdoor angles.',
  },
  {
    icon: FolderArchive,
    title: 'Single & ZIP Batch Downloads',
    description:
      'Guests preview matches in a distraction-free fullscreen lightbox with keyboard navigation and download individual photos or a single ZIP bundle without messaging compression.',
  },
  {
    icon: QrCode,
    title: 'Custom Slugs & Printable QR Codes',
    description:
      'Generate memorable wedding event URLs and download crisp PNG QR codes ready for reception menus, table tents, and digital WhatsApp invitations.',
  },
  {
    icon: ShieldCheck,
    title: 'Ephemeral Biometric Privacy',
    description:
      'Explicit consent is required before camera activation. Guest facial descriptors are computed in memory for matching and discarded immediately once results load.',
  },
];

export function FeaturesPage() {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'WedSnap – AI Wedding Photo Finder',
      applicationCategory: 'PhotographyApplication',
      operatingSystem: 'Web',
      url: `${origin}/features`,
      description: seo.description,
      featureList: FEATURE_LIST.map((f) => f.title),
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Features', item: `${origin}/features` },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1C1917] flex flex-col">
      <SeoHead
        title={seo.title}
        description={seo.description}
        path="/features"
        robots={seo.robots}
        ogImage={seo.ogImage}
        jsonLd={jsonLd}
      />
      <TopNav />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 sm:py-16 space-y-14">
        <nav aria-label="Breadcrumb" className="text-xs text-[#78716C] flex items-center gap-2">
          <Link to="/" className="hover:text-[#1C1917]">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-[#1C1917] font-medium">Features</span>
        </nav>

        <header className="grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-4">
            <p className="text-xs font-medium tracking-widest uppercase text-[#9A742D]">
              Platform Capabilities
            </p>
            <h1 className="text-4xl sm:text-5xl font-semibold text-[#1C1917] leading-tight">
              {seo.h1}
            </h1>
            <p className="text-base text-[#57534E] leading-relaxed">
              Every detail of WedSnap is engineered for real wedding workflows—from high-volume Google Drive folders to one-tap mobile guest downloads.
            </p>
            <div className="pt-2">
              <Link
                to="/admin/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1C1917] text-white text-sm font-medium rounded-lg hover:bg-[#9A742D] transition-colors whitespace-nowrap"
              >
                <span>Start Free in Organizer Studio</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="aspect-[16/9] rounded-2xl overflow-hidden border border-[#E7E2D8] bg-[#F3F0EA]">
              <img
                src="/src/assets/images/wedding_cover_classic_1795725466190.jpg"
                alt="Sunlit courtyard wedding reception table dressed with white roses and linen"
                width={1200}
                height={675}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </header>

        <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURE_LIST.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="bg-white border border-[#E7E2D8] rounded-2xl p-6 space-y-3"
              >
                <Icon className="w-6 h-6 text-[#9A742D]" />
                <h2 className="text-2xl font-semibold text-[#1C1917]">{item.title}</h2>
                <p className="text-sm text-[#57534E] leading-relaxed">{item.description}</p>
              </article>
            );
          })}
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
