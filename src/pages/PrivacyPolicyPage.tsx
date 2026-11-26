import React from 'react';
import { Link } from 'react-router-dom';
import { PublicFooter } from '../components/PublicFooter';
import { SeoHead } from '../components/SeoHead';
import { TopNav } from '../components/TopNav';
import { PUBLIC_STATIC_ROUTES } from '../data/seoRoutes';

const seo = PUBLIC_STATIC_ROUTES.find((r) => r.path === '/privacy-policy')!;

export function PrivacyPolicyPage() {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: seo.title,
      description: seo.description,
      url: `${origin}/privacy-policy`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Privacy Policy',
          item: `${origin}/privacy-policy`,
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1C1917] flex flex-col">
      <SeoHead
        title={seo.title}
        description={seo.description}
        path="/privacy-policy"
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
          <span className="text-[#1C1917] font-medium">Privacy Policy</span>
        </nav>

        <header className="space-y-3 border-b border-[#E7E2D8] pb-6">
          <p className="text-xs font-medium tracking-widest uppercase text-[#9A742D]">
            Last updated: November 26, 2026
          </p>
          <h1 className="text-4xl font-semibold text-[#1C1917]">{seo.h1}</h1>
          <p className="text-sm text-[#57534E] leading-relaxed">
            This policy explains accurately how WedSnap processes facial data, wedding photographs, and Google Drive permissions.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-[#1C1917]">
            1. Ephemeral Guest Face Scanning
          </h2>
          <p className="text-sm text-[#57534E] leading-relaxed">
            Before activating your device camera or uploading a selfie on a wedding event page, WedSnap asks for your explicit consent. Your selfie frame is processed in your browser memory to compute a temporary 128-dimensional mathematical vector solely to match your appearance against that wedding’s indexed photo vectors. WedSnap does not store your selfie image, camera stream, or search vector in any database, and clears them immediately once matching completes.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-[#1C1917]">
            2. Event Photographs &amp; Indexed Face Embeddings
          </h2>
          <p className="text-sm text-[#57534E] leading-relaxed">
            Event organizers connect a chosen Google Drive folder using read-only OAuth permission (`drive.readonly`). During synchronization, WedSnap caches the synced JPG, PNG, or WebP files on the application server so invited guests can preview and download matched photos, and stores numerical face embeddings inside Firestore linked to the event.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-[#1C1917]">
            3. Google Drive OAuth &amp; Organizer Account Data
          </h2>
          <p className="text-sm text-[#57534E] leading-relaxed">
            Google Drive OAuth access tokens are held strictly in browser memory during the organizer’s active session and are never persisted to `localStorage`, `sessionStorage`, or public endpoints. Organizer profile information (`uid`, display name, email) is stored securely in an owner-restricted Firestore collection.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-[#1C1917]">
            4. Discoverability &amp; Deletion Controls
          </h2>
          <p className="text-sm text-[#57534E] leading-relaxed">
            Wedding galleries remain hidden from search engines (`noindex`) unless an organizer explicitly enables both publishing and public directory discoverability. Organizers can unpublish or permanently delete an event at any time from the Admin Dashboard, which deletes associated photo records, face embeddings, and cached image files.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-[#1C1917]">
            5. Analytics &amp; Consent
          </h2>
          <p className="text-sm text-[#57534E] leading-relaxed">
            If Google Analytics 4 is configured for a deployment, WedSnap requests consent before loading analytics scripts and tracks only aggregate counts (such as page views or downloads). No biometric vectors, facial images, personal names, or private tokens are ever sent to analytics.
          </p>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
