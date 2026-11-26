import React from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { PublicFooter } from '../components/PublicFooter';
import { SeoHead } from '../components/SeoHead';
import { TopNav } from '../components/TopNav';
import { PUBLIC_STATIC_ROUTES } from '../data/seoRoutes';

const seo = PUBLIC_STATIC_ROUTES.find((r) => r.path === '/pricing')!;

export function PricingPage() {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'WedSnap',
      applicationCategory: 'PhotographyApplication',
      operatingSystem: 'Web',
      url: `${origin}/pricing`,
      description: seo.description,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        description: 'Free community access during open preview with Google Drive sync and AI face indexing.',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Pricing', item: `${origin}/pricing` },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1C1917] flex flex-col">
      <SeoHead
        title={seo.title}
        description={seo.description}
        path="/pricing"
        robots={seo.robots}
        ogImage={seo.ogImage}
        jsonLd={jsonLd}
      />
      <TopNav />

      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-12 sm:py-16 space-y-12">
        <nav aria-label="Breadcrumb" className="text-xs text-[#78716C] flex items-center gap-2">
          <Link to="/" className="hover:text-[#1C1917]">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-[#1C1917] font-medium">Pricing</span>
        </nav>

        <header className="max-w-2xl">
          <p className="text-xs font-medium tracking-widest uppercase text-[#9A742D] mb-3">
            Transparent Access
          </p>
          <h1 className="text-4xl sm:text-5xl font-semibold text-[#1C1917] leading-tight mb-4">
            {seo.h1}
          </h1>
          <p className="text-base text-[#57534E] leading-relaxed">
            WedSnap is currently available in open preview for couples and wedding photographers. Connect your own Google Drive storage with zero per-guest download fees.
          </p>
        </header>

        <section className="grid md:grid-cols-2 gap-6 items-stretch">
          <div className="bg-white border border-[#E7E2D8] rounded-2xl p-8 flex flex-col justify-between">
            <div>
              <p className="text-xs font-medium text-[#9A742D] mb-2">For Couples &amp; Hosts</p>
              <h2 className="text-3xl font-semibold text-[#1C1917] mb-1">Open Preview</h2>
              <p className="font-mono text-2xl font-medium text-[#1C1917] tabular-nums mb-4">
                $0 <span className="text-xs font-sans font-normal text-[#78716C]">during preview</span>
              </p>
              <p className="text-sm text-[#57534E] mb-6">
                Everything needed to launch a private or public wedding photo finder for your guests.
              </p>
              <ul className="space-y-2.5 text-sm text-[#1C1917] mb-8">
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-[#9A742D] shrink-0" />
                  <span>Google Drive folder connection &amp; deduplicated sync</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-[#9A742D] shrink-0" />
                  <span>Multi-face AI detection &amp; 128-D indexing</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-[#9A742D] shrink-0" />
                  <span>Ephemeral guest camera scan &amp; ZIP downloads</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-[#9A742D] shrink-0" />
                  <span>Printable PNG QR code &amp; custom wedding slug</span>
                </li>
              </ul>
            </div>
            <Link
              to="/admin/login"
              className="w-full py-3 text-center text-sm font-medium bg-[#1C1917] text-white rounded-xl hover:bg-[#9A742D] transition-colors"
            >
              Get Started Free
            </Link>
          </div>

          <div className="bg-white border border-[#E7E2D8] rounded-2xl p-8 flex flex-col justify-between">
            <div>
              <p className="text-xs font-medium text-[#57534E] mb-2">For High-Volume Studios</p>
              <h2 className="text-3xl font-semibold text-[#1C1917] mb-1">Studio Partnership</h2>
              <p className="font-mono text-2xl font-medium text-[#1C1917] mb-4">
                Custom <span className="text-xs font-sans font-normal text-[#78716C]">per season</span>
              </p>
              <p className="text-sm text-[#57534E] mb-6">
                Dedicated onboarding for wedding photography studios managing 25+ multi-day events per year.
              </p>
              <ul className="space-y-2.5 text-sm text-[#1C1917] mb-8">
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-[#9A742D] shrink-0" />
                  <span>Multi-event organizer dashboard &amp; onboarding support</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-[#9A742D] shrink-0" />
                  <span>Custom domain &amp; Google Search Console readiness review</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-[#9A742D] shrink-0" />
                  <span>Priority technical support for peak wedding seasons</span>
                </li>
              </ul>
            </div>
            <Link
              to="/contact"
              className="w-full py-3 text-center text-sm font-medium border border-[#D6D3CD] text-[#1C1917] rounded-xl hover:bg-[#F3F0EA] transition-colors"
            >
              Contact Studio Team
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
