import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Camera, Cpu, FolderSync, QrCode } from 'lucide-react';
import { PublicFooter } from '../components/PublicFooter';
import { SeoHead } from '../components/SeoHead';
import { TopNav } from '../components/TopNav';
import { PUBLIC_STATIC_ROUTES } from '../data/seoRoutes';

const seo = PUBLIC_STATIC_ROUTES.find((r) => r.path === '/how-it-works')!;

const FAQS = [
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

export function HowItWorksPage() {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: 'How to Find Your Wedding Photos with WedSnap',
      description: seo.description,
      step: [
        {
          '@type': 'HowToStep',
          position: 1,
          name: 'Connect Google Drive Wedding Folder',
          text: 'The couple or wedding photographer signs in with Google and selects the Google Drive folder containing ceremony and reception photos.',
        },
        {
          '@type': 'HowToStep',
          position: 2,
          name: 'Index Faces Across Every Photograph',
          text: 'WedSnap detects multiple faces per image and generates 128-dimensional face embeddings with tunable similarity thresholds.',
        },
        {
          '@type': 'HowToStep',
          position: 3,
          name: 'Guests Scan Their Face & Download Matches',
          text: 'Guests open the wedding QR code or link, grant consent, scan their face ephemerally, and download matching portraits.',
        },
      ],
      url: `${origin}/how-it-works`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQS.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.a,
        },
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: 'How It Works', item: `${origin}/how-it-works` },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1C1917] flex flex-col">
      <SeoHead
        title={seo.title}
        description={seo.description}
        path="/how-it-works"
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
          <span className="text-[#1C1917] font-medium">How It Works</span>
        </nav>

        <header className="max-w-3xl">
          <p className="text-xs font-medium tracking-widest uppercase text-[#9A742D] mb-3">
            Workflow Overview
          </p>
          <h1 className="text-4xl sm:text-5xl font-semibold text-[#1C1917] leading-tight mb-4">
            {seo.h1}
          </h1>
          <p className="text-base sm:text-lg text-[#57534E] leading-relaxed">
            Whether you are sharing 500 courtyard portraits or 6,000 photos from a multi-day celebration across Kochi, Mumbai, or Bengaluru, WedSnap automates discovery from start to finish.
          </p>
        </header>

        <section className="grid md:grid-cols-2 gap-6">
          <div className="bg-white border border-[#E7E2D8] rounded-2xl p-7 space-y-3">
            <div className="flex items-center gap-3 text-xs font-mono text-[#9A742D]">
              <span>01</span>
              <FolderSync className="w-4 h-4" />
              <span>Google Drive Sync</span>
            </div>
            <h2 className="text-2xl font-semibold text-[#1C1917]">
              Connect your Google Drive wedding folder
            </h2>
            <p className="text-sm text-[#57534E] leading-relaxed">
              Create your wedding event in the Organizer Studio, authorize read-only Google Drive access, and pick the folder containing your JPG, JPEG, PNG, or WebP wedding photos. Incremental sync tracks Drive file IDs to prevent duplicate downloads.
            </p>
          </div>

          <div className="bg-white border border-[#E7E2D8] rounded-2xl p-7 space-y-3">
            <div className="flex items-center gap-3 text-xs font-mono text-[#9A742D]">
              <span>02</span>
              <Cpu className="w-4 h-4" />
              <span>Multi-Face Indexing</span>
            </div>
            <h2 className="text-2xl font-semibold text-[#1C1917]">
              Detect and index every guest appearance
            </h2>
            <p className="text-sm text-[#57534E] leading-relaxed">
              WedSnap scans each synced photograph, detects multiple faces in crowded group scenes, and stores compact 128-dimensional mathematical face embeddings alongside per-event similarity sensitivity controls.
            </p>
          </div>

          <div className="bg-white border border-[#E7E2D8] rounded-2xl p-7 space-y-3">
            <div className="flex items-center gap-3 text-xs font-mono text-[#9A742D]">
              <span>03</span>
              <QrCode className="w-4 h-4" />
              <span>Event Link &amp; QR Sharing</span>
            </div>
            <h2 className="text-2xl font-semibold text-[#1C1917]">
              Print table QR codes or share your private link
            </h2>
            <p className="text-sm text-[#57534E] leading-relaxed">
              Download a crisp high-resolution PNG QR code for welcome easels and dinner menus, or copy your custom link. You decide whether an event stays private to link holders or appears in the public directory.
            </p>
          </div>

          <div className="bg-white border border-[#E7E2D8] rounded-2xl p-7 space-y-3">
            <div className="flex items-center gap-3 text-xs font-mono text-[#9A742D]">
              <span>04</span>
              <Camera className="w-4 h-4" />
              <span>Ephemeral Guest Scan</span>
            </div>
            <h2 className="text-2xl font-semibold text-[#1C1917]">
              Guests scan once and download full-resolution albums
            </h2>
            <p className="text-sm text-[#57534E] leading-relaxed">
              Guests confirm biometric consent, capture a quick selfie inside the circular guide or upload a photo, and immediately receive their matched portraits with single-click or batch ZIP downloads. Guest scans are discarded right after matching.
            </p>
          </div>
        </section>

        {/* Visible FAQ Section matching FAQPage JSON-LD */}
        <section className="space-y-6 border-t border-[#E7E2D8] pt-12">
          <div>
            <p className="text-xs font-medium tracking-widest uppercase text-[#9A742D] mb-2">
              Frequently Asked Questions
            </p>
            <h2 className="text-3xl font-semibold text-[#1C1917]">
              Common questions from couples, photographers, and guests
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {FAQS.map((faq) => (
              <div
                key={faq.q}
                className="bg-white border border-[#E7E2D8] rounded-2xl p-6 space-y-2"
              >
                <h3 className="font-sans text-base font-semibold text-[#1C1917]">{faq.q}</h3>
                <p className="text-sm text-[#57534E] leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-[#E7E2D8] rounded-3xl p-8 sm:p-10 grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-3">
            <h2 className="text-3xl font-semibold text-[#1C1917]">
              Ready to set up your wedding gallery?
            </h2>
            <p className="text-sm text-[#57534E] leading-relaxed">
              Sign in with Google to create your first event, or read our step-by-step guides in the WedSnap Journal.
            </p>
          </div>
          <div className="lg:col-span-5 flex flex-wrap lg:justify-end gap-3">
            <Link
              to="/admin/login"
              className="px-5 py-2.5 bg-[#1C1917] text-white text-sm font-medium rounded-lg hover:bg-[#9A742D] transition-colors inline-flex items-center gap-2 whitespace-nowrap"
            >
              <span>Host a Wedding</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/blog/how-to-create-a-qr-code-for-wedding-photo-sharing"
              className="px-5 py-2.5 border border-[#D6D3CD] text-[#1C1917] text-sm font-medium rounded-lg hover:bg-[#F3F0EA] transition-colors whitespace-nowrap"
            >
              Read QR Guide
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
