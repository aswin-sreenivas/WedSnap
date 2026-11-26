import React from 'react';
import { Link } from 'react-router-dom';
import { PublicFooter } from '../components/PublicFooter';
import { SeoHead } from '../components/SeoHead';
import { TopNav } from '../components/TopNav';
import { PUBLIC_STATIC_ROUTES } from '../data/seoRoutes';

const seo = PUBLIC_STATIC_ROUTES.find((r) => r.path === '/terms')!;

export function TermsPage() {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: seo.title,
      description: seo.description,
      url: `${origin}/terms`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Terms of Service', item: `${origin}/terms` },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1C1917] flex flex-col">
      <SeoHead
        title={seo.title}
        description={seo.description}
        path="/terms"
        robots={seo.robots}
        ogImage={seo.ogImage}
        jsonLd={jsonLd}
      />
      <TopNav />

      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-12 sm:py-16 space-y-8">
        <nav aria-label="Breadcrumb" className="text-xs text-[#78716C] flex items-center gap-2">
          <Link to="/" className="hover:text-[#1C1917]">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-[#1C1917] font-medium">Terms of Service</span>
        </nav>

        <header className="space-y-3 border-b border-[#E7E2D8] pb-6">
          <p className="text-xs font-medium tracking-widest uppercase text-[#9A742D]">
            Last updated: November 26, 2026
          </p>
          <h1 className="text-4xl font-semibold text-[#1C1917]">{seo.h1}</h1>
          <p className="text-sm text-[#57534E] leading-relaxed">
            By accessing WedSnap as an organizer, photographer, or wedding guest, you agree to the terms below.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-[#1C1917]">1. Organizer Responsibilities</h2>
          <p className="text-sm text-[#57534E] leading-relaxed">
            Organizers and photographers confirm that they hold the rights or couple authorization to synchronize photographs from their connected Google Drive folder, index guest faces for event discovery, and share the event link or QR code with attendees.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-[#1C1917]">2. Acceptable Guest Use</h2>
          <p className="text-sm text-[#57534E] leading-relaxed">
            Guests may use the face scanner solely to locate and download wedding photographs in which they appear for personal, non-commercial memories. Automated scraping, attempting to impersonate another attendee, or bypassing event access controls is prohibited.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-[#1C1917]">3. Service Availability</h2>
          <p className="text-sm text-[#57534E] leading-relaxed">
            WedSnap relies on browser WebGL/canvas capabilities for AI face matching and your connected Google Drive account as the primary photo archive. Organizers should always keep original master photographs backed up in Google Drive or studio storage.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-[#1C1917]">4. Contact</h2>
          <p className="text-sm text-[#57534E] leading-relaxed">
            Questions regarding these terms or event removal requests can be submitted via our{' '}
            <Link to="/contact" className="text-[#9A742D] underline underline-offset-2">
              Contact page
            </Link>
            .
          </p>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
