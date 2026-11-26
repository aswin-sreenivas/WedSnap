import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { PublicFooter } from '../components/PublicFooter';
import { SeoHead } from '../components/SeoHead';
import { TopNav } from '../components/TopNav';
import { PUBLIC_STATIC_ROUTES } from '../data/seoRoutes';

const seo = PUBLIC_STATIC_ROUTES.find((r) => r.path === '/for-photographers')!;

export function ForPhotographersPage() {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: seo.title,
      description: seo.description,
      url: `${origin}/for-photographers`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'For Photographers',
          item: `${origin}/for-photographers`,
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1C1917] flex flex-col">
      <SeoHead
        title={seo.title}
        description={seo.description}
        path="/for-photographers"
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
          <span className="text-[#1C1917] font-medium">For Photographers</span>
        </nav>

        <section className="grid lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center space-y-5">
            <p className="text-xs font-medium tracking-widest uppercase text-[#9A742D]">
              Built for Wedding Studios
            </p>
            <h1 className="text-4xl sm:text-5xl font-semibold text-[#1C1917] leading-tight">
              {seo.h1}
            </h1>
            <p className="text-base text-[#57534E] leading-relaxed">
              Your studio already stores edited wedding deliverables in Google Drive. WedSnap turns any Drive folder into an AI-searchable guest gallery—saving studio hours while turning every wedding guest across India and destination venues into an ambassador for your brand.
            </p>
            <ul className="space-y-2.5 text-sm text-[#1C1917]">
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#9A742D] shrink-0" />
                <span>Manage multiple wedding events from one Organizer Studio</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#9A742D] shrink-0" />
                <span>Incremental sync adds new reception photos without duplicates</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#9A742D] shrink-0" />
                <span>Private unlisted links by default, or opt-in public showcase</span>
              </li>
            </ul>
            <div className="pt-2 flex flex-wrap gap-3">
              <Link
                to="/admin/login"
                className="px-5 py-2.5 bg-[#1C1917] text-white text-sm font-medium rounded-lg hover:bg-[#9A742D] transition-colors inline-flex items-center gap-2 whitespace-nowrap"
              >
                <span>Open Studio Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/blog/why-wedding-photographers-should-use-ai-face-search"
                className="px-5 py-2.5 border border-[#D6D3CD] text-[#1C1917] text-sm font-medium rounded-lg hover:bg-[#F3F0EA] transition-colors whitespace-nowrap"
              >
                Read Studio Case Guide
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="h-full min-h-[340px] rounded-2xl overflow-hidden border border-[#E7E2D8] bg-[#F3F0EA]">
              <img
                src="/src/assets/images/photographer_studio_workflow_1795726534406.jpg"
                alt="Wedding photographer reviewing edited portraits on a laptop inside a sunlit studio"
                width={1200}
                height={675}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </section>

        <section className="border-t border-[#E7E2D8] pt-12 grid md:grid-cols-3 gap-6">
          <div className="bg-white border border-[#E7E2D8] rounded-2xl p-6">
            <p className="font-mono text-xs text-[#9A742D] mb-2">01 · Regional Scale</p>
            <h2 className="text-xl font-semibold text-[#1C1917] mb-2">
              Made for multi-day celebrations
            </h2>
            <p className="text-sm text-[#57534E] leading-relaxed">
              Ideal for high-guest-count celebrations across Kerala, Bengaluru, Chennai, Hyderabad, Mumbai, Delhi, and destination weddings where 500+ attendees want their own photos fast.
            </p>
          </div>
          <div className="bg-white border border-[#E7E2D8] rounded-2xl p-6">
            <p className="font-mono text-xs text-[#9A742D] mb-2">02 · Zero Friction</p>
            <h2 className="text-xl font-semibold text-[#1C1917] mb-2">
              Works on any guest smartphone
            </h2>
            <p className="text-sm text-[#57534E] leading-relaxed">
              Guests scan the QR code in mobile Safari or Chrome without installing apps or creating passwords, keeping guest support requests off your inbox.
            </p>
          </div>
          <div className="bg-white border border-[#E7E2D8] rounded-2xl p-6">
            <p className="font-mono text-xs text-[#9A742D] mb-2">03 · Full Control</p>
            <h2 className="text-xl font-semibold text-[#1C1917] mb-2">
              Instant event &amp; face deletion
            </h2>
            <p className="text-sm text-[#57534E] leading-relaxed">
              Archive or delete an event at any time to purge indexed face embeddings and cached files while leaving your original Google Drive files untouched.
            </p>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
