import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Camera, Lock, Sparkles } from 'lucide-react';
import { PublicFooter } from '../components/PublicFooter';
import { SeoHead } from '../components/SeoHead';
import { TopNav } from '../components/TopNav';
import { PUBLIC_STATIC_ROUTES } from '../data/seoRoutes';

const seo = PUBLIC_STATIC_ROUTES.find((r) => r.path === '/about')!;

export function AboutPage() {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      name: seo.title,
      description: seo.description,
      url: `${origin}/about`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'WedSnap',
      url: origin,
      logo: `${origin}/src/assets/images/wedsnap_app_icon_1795726533955.jpg`,
      description:
        'AI wedding photo finder platform connecting Google Drive wedding albums with privacy-first guest face search.',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: 'About', item: `${origin}/about` },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1C1917] flex flex-col">
      <SeoHead
        title={seo.title}
        description={seo.description}
        path="/about"
        robots={seo.robots}
        ogImage={seo.ogImage}
        jsonLd={jsonLd}
      />
      <TopNav />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 sm:py-16 space-y-16">
        <nav aria-label="Breadcrumb" className="text-xs text-[#78716C] flex items-center gap-2">
          <Link to="/" className="hover:text-[#1C1917]">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-[#1C1917] font-medium">About</span>
        </nav>

        <section className="grid lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center">
            <p className="text-xs font-medium tracking-widest uppercase text-[#9A742D] mb-3">
              About WedSnap
            </p>
            <h1 className="text-4xl sm:text-5xl font-semibold text-[#1C1917] leading-tight mb-5">
              {seo.h1}
            </h1>
            <p className="text-base text-[#57534E] leading-relaxed mb-4">
              Every wedding generates thousands of irreplaceable candid photographs—from quiet family blessings to late-night reception dances. Yet most guests only ever see a handful of highlights shared in group chats.
            </p>
            <p className="text-base text-[#57534E] leading-relaxed mb-7">
              WedSnap bridges that gap for couples and wedding photographers across India and worldwide. Studios keep their existing Google Drive delivery folders, while guests receive a simple QR link where one ephemeral face scan reveals every photograph they appear in.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/how-it-works"
                className="px-5 py-2.5 bg-[#1C1917] text-white text-sm font-medium rounded-lg hover:bg-[#9A742D] transition-colors inline-flex items-center gap-2 whitespace-nowrap"
              >
                <span>Explore How It Works</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/for-photographers"
                className="px-5 py-2.5 border border-[#D6D3CD] text-[#1C1917] text-sm font-medium rounded-lg hover:bg-[#F3F0EA] transition-colors whitespace-nowrap"
              >
                For Wedding Photographers
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="h-full min-h-[340px] rounded-2xl overflow-hidden border border-[#E7E2D8] bg-[#F3F0EA]">
              <img
                src="/src/assets/images/hero_wedding_couple_1795725465123.jpg"
                alt="Bride and groom walking down a sunlit garden pathway surrounded by olive trees and flowers"
                width={1200}
                height={675}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </section>

        <section className="border-t border-[#E7E2D8] pt-14 grid md:grid-cols-3 gap-8">
          <div className="bg-white border border-[#E7E2D8] rounded-2xl p-7">
            <Camera className="w-6 h-6 text-[#9A742D] mb-4" />
            <h2 className="text-2xl font-semibold text-[#1C1917] mb-2">
              Guest-First Simplicity
            </h2>
            <p className="text-sm text-[#57534E] leading-relaxed">
              No mobile app installs, no guest accounts, and no hunting through thousands of unlabelled camera filenames.
            </p>
          </div>
          <div className="bg-white border border-[#E7E2D8] rounded-2xl p-7">
            <Lock className="w-6 h-6 text-[#9A742D] mb-4" />
            <h2 className="text-2xl font-semibold text-[#1C1917] mb-2">
              Ephemeral Privacy
            </h2>
            <p className="text-sm text-[#57534E] leading-relaxed">
              Guest selfie scans are converted to temporary vectors in the browser, matched in memory, and immediately discarded.
            </p>
          </div>
          <div className="bg-white border border-[#E7E2D8] rounded-2xl p-7">
            <Sparkles className="w-6 h-6 text-[#9A742D] mb-4" />
            <h2 className="text-2xl font-semibold text-[#1C1917] mb-2">
              Zero Re-Uploading
            </h2>
            <p className="text-sm text-[#57534E] leading-relaxed">
              Read-only Google Drive integration keeps photographers in full control of their existing cloud folders and edits.
            </p>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
