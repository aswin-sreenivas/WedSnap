import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Camera, FolderSync, Search, ShieldCheck } from 'lucide-react';
import { PublicFooter } from '../components/PublicFooter';
import { SeoHead } from '../components/SeoHead';
import { TopNav } from '../components/TopNav';
import { BLOG_ARTICLES } from '../data/blogArticles';
import { PUBLIC_STATIC_ROUTES } from '../data/seoRoutes';

interface PublicEventCard {
  id: string;
  slug: string;
  title: string;
  coupleNames: string;
  eventDate: string;
  coverPhotoUrl: string;
  totalPhotos: number;
}

function slugifyCode(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

const HERO_IMAGE = '/src/assets/images/hero_wedding_couple_1795725465123.jpg';
const TOAST_IMAGE = '/src/assets/images/wedding_moment_toast_1795725465678.jpg';
const DANCE_IMAGE = '/src/assets/images/wedding_moment_dance_1795725466072.jpg';

const homeSeo = PUBLIC_STATIC_ROUTES.find((r) => r.path === '/')!;

export function HomePage() {
  const navigate = useNavigate();
  const [slugInput, setSlugInput] = useState('');
  const [slugError, setSlugError] = useState('');
  const [publishedEvents, setPublishedEvents] = useState<PublicEventCard[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/public/events')
      .then((res) => (res.ok ? res.json() : { events: [] }))
      .then((data) => {
        if (active) {
          setPublishedEvents(Array.isArray(data.events) ? data.events : []);
        }
      })
      .catch(() => {
        if (active) setPublishedEvents([]);
      })
      .finally(() => {
        if (active) setLoadingEvents(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleEventLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = slugifyCode(slugInput);
    if (cleaned.length < 3) {
      setSlugError('Enter an event code of at least 3 characters.');
      return;
    }
    setSlugError('');
    navigate(`/e/${cleaned}`);
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'WedSnap',
      url: origin,
      logo: `${origin}/src/assets/images/wedsnap_app_icon_1795726533955.jpg`,
      description: homeSeo.description,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'WedSnap – AI Wedding Photo Finder',
      url: origin,
      description: homeSeo.description,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'WedSnap – AI Wedding Photo Finder',
      applicationCategory: 'PhotographyApplication',
      operatingSystem: 'Web',
      url: origin,
      description: homeSeo.description,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1C1917] flex flex-col">
      <SeoHead
        title={homeSeo.title}
        description={homeSeo.description}
        path="/"
        robots={homeSeo.robots}
        ogImage={homeSeo.ogImage}
        jsonLd={jsonLd}
      />
      <TopNav />

      <main className="flex-1">
        {/* Split Editorial Hero */}
        <section className="max-w-7xl mx-auto px-6 pt-10 pb-14 lg:pt-14 lg:pb-20">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center py-2">
              <p className="text-xs font-medium tracking-widest uppercase text-[#9A742D] mb-4">
                AI Wedding Photo Discovery
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-[#1C1917] leading-[1.08] mb-5">
                {homeSeo.h1}
              </h1>
              <p className="text-base sm:text-lg text-[#57534E] leading-relaxed max-w-xl mb-8">
                {homeSeo.summary}
              </p>

              <form onSubmit={handleEventLookup} className="max-w-lg mb-4">
                <label htmlFor="event-code-input" className="sr-only">
                  Wedding event link code
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-[#78716C] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="event-code-input"
                      type="text"
                      value={slugInput}
                      onChange={(e) => {
                        setSlugInput(e.target.value);
                        if (slugError) setSlugError('');
                      }}
                      placeholder="Enter event code (e.g. elena-marco-2026)"
                      className="w-full h-12 pl-10 pr-4 bg-white border border-[#D6D3CD] rounded-xl text-sm text-[#1C1917] placeholder:text-[#78716C] focus:outline-none focus:border-[#9A742D] transition-colors"
                    />
                  </div>
                  <button
                    type="submit"
                    className="h-12 px-6 bg-[#1C1917] text-white text-sm font-medium rounded-xl hover:bg-[#9A742D] transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                  >
                    <span>Open Gallery</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                {slugError && <p className="text-xs text-[#B91C1C] mt-2">{slugError}</p>}
              </form>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#57534E]">
                <span>
                  Hosting a wedding?{' '}
                  <Link
                    to="/admin/login"
                    className="text-[#1C1917] font-medium underline underline-offset-4 hover:text-[#9A742D]"
                  >
                    Open Organizer Studio
                  </Link>
                </span>
                <span aria-hidden="true">·</span>
                <Link
                  to="/how-it-works"
                  className="text-[#1C1917] font-medium hover:text-[#9A742D] transition-colors"
                >
                  See how it works
                </Link>
                <span aria-hidden="true">·</span>
                <Link
                  to="/for-photographers"
                  className="text-[#1C1917] font-medium hover:text-[#9A742D] transition-colors"
                >
                  For Photographers
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="h-80 sm:h-[440px] lg:h-full min-h-[400px] rounded-2xl overflow-hidden border border-[#E7E2D8] bg-[#F3F0EA]">
                <img
                  src={HERO_IMAGE}
                  alt="Bride and groom walking down a sunlit garden pathway surrounded by wedding guests"
                  width={1200}
                  height={900}
                  fetchPriority="high"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Full-Width Key Capabilities Strip */}
          <div className="mt-12 pt-8 border-t border-[#E7E2D8] grid sm:grid-cols-3 gap-8">
            <div>
              <p className="font-mono text-xs text-[#9A742D] tabular-nums mb-1">01 · Google Drive Sync</p>
              <p className="text-sm font-medium text-[#1C1917] mb-1">Direct Folder Ingestion</p>
              <p className="text-sm text-[#57534E] leading-relaxed">
                Connect Google Drive once and synchronize JPG, PNG, and WebP galleries without duplicates.
              </p>
            </div>
            <div>
              <p className="font-mono text-xs text-[#9A742D] tabular-nums mb-1">02 · Multi-Face Indexing</p>
              <p className="text-sm font-medium text-[#1C1917] mb-1">128-D Embedding Precision</p>
              <p className="text-sm text-[#57534E] leading-relaxed">
                Detects every guest in crowded group toasts and candid dance floor moments with tunable thresholds.
              </p>
            </div>
            <div>
              <p className="font-mono text-xs text-[#9A742D] tabular-nums mb-1">03 · Ephemeral Privacy</p>
              <p className="text-sm font-medium text-[#1C1917] mb-1">Zero Selfie Retention</p>
              <p className="text-sm text-[#57534E] leading-relaxed">
                Guest face scans run ephemerally in browser memory and are discarded the moment matches appear.
              </p>
            </div>
          </div>
        </section>

        {/* Live Published Discoverable Wedding Events */}
        <section id="live-weddings" className="border-t border-[#E7E2D8] bg-white py-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
              <div>
                <p className="text-xs font-medium tracking-widest uppercase text-[#9A742D] mb-2">
                  Live Wedding Galleries
                </p>
                <h2 className="text-3xl sm:text-4xl font-semibold text-[#1C1917]">
                  Public celebration directory
                </h2>
              </div>
              <Link
                to="/admin/events/new"
                className="text-sm font-medium text-[#1C1917] hover:text-[#9A742D] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <span>Create a wedding event</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {loadingEvents ? (
              <div className="grid md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-[#E7E2D8] bg-[#FAF9F6] overflow-hidden animate-pulse"
                  >
                    <div className="aspect-[4/3] bg-[#EAE5DC]" />
                    <div className="p-5 space-y-2.5">
                      <div className="h-5 bg-[#EAE5DC] rounded w-2/3" />
                      <div className="h-4 bg-[#EAE5DC] rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : publishedEvents.length > 0 ? (
              <div className="grid md:grid-cols-3 gap-6">
                {publishedEvents.map((evt) => (
                  <Link
                    key={evt.id}
                    to={`/e/${evt.slug}`}
                    className="group rounded-2xl border border-[#E7E2D8] bg-[#FAF9F6] overflow-hidden hover:border-[#B8924A] transition-colors flex flex-col"
                  >
                    <div className="aspect-[4/3] overflow-hidden bg-[#F3F0EA]">
                      <img
                        src={evt.coverPhotoUrl}
                        alt={`${evt.title} wedding cover photo`}
                        width={800}
                        height={600}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                      />
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <p className="text-xs text-[#78716C] mb-1.5">
                          {evt.eventDate} · <span className="font-mono tabular-nums">{evt.totalPhotos}</span> photos
                        </p>
                        <h3 className="font-display text-2xl font-semibold text-[#1C1917] mb-1">
                          {evt.title}
                        </h3>
                        <p className="text-sm text-[#57534E]">{evt.coupleNames}</p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-[#E7E2D8] flex items-center justify-between text-xs font-medium text-[#1C1917] group-hover:text-[#9A742D]">
                        <span>Scan your face to find photos</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-[#E7E2D8] bg-[#FAF9F6] p-10 text-center">
                <p className="font-display text-2xl font-semibold text-[#1C1917] mb-2">
                  Private galleries stay invite-only by default
                </p>
                <p className="text-sm text-[#57534E] max-w-lg mx-auto mb-6">
                  Have an event code from your host? Enter it above to open your wedding gallery. Organizers can opt in to list public celebrations here.
                </p>
                <Link
                  to="/admin/login"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1C1917] text-white text-sm font-medium rounded-lg hover:bg-[#9A742D] transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Open Organizer Studio</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* How It Works & Privacy Section */}
        <section id="how-it-works" className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 space-y-8">
              <div>
                <p className="text-xs font-medium tracking-widest uppercase text-[#9A742D] mb-2">
                  Crafted for Wedding Guests
                </p>
                <h2 className="text-3xl sm:text-4xl font-semibold text-[#1C1917] mb-3">
                  From Google Drive to guest gallery in minutes
                </h2>
                <p className="text-sm sm:text-base text-[#57534E] leading-relaxed">
                  Built so non-technical wedding guests can find their memories on any phone without creating an account or downloading an app.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-[#E7E2D8] flex items-center justify-center shrink-0">
                    <FolderSync className="w-5 h-5 text-[#9A742D]" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[#1C1917] mb-1">
                      Sync directly from Google Drive
                    </h3>
                    <p className="text-sm text-[#57534E] leading-relaxed">
                      Select your photographer&apos;s Drive folder. Incremental sync skips duplicates and tracks newly uploaded reception albums automatically.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-[#E7E2D8] flex items-center justify-center shrink-0">
                    <Camera className="w-5 h-5 text-[#9A742D]" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[#1C1917] mb-1">
                      Guided camera scan or selfie upload
                    </h3>
                    <p className="text-sm text-[#57534E] leading-relaxed">
                      Guests scan their wedding table QR code, consent to matching, and capture a quick portrait with a circular positioning guide.
                    </p>
                  </div>
                </div>

                <div id="privacy" className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-[#E7E2D8] flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-[#9A742D]" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[#1C1917] mb-1">
                      Ephemeral biometric handling
                    </h3>
                    <p className="text-sm text-[#57534E] leading-relaxed">
                      Guest selfie scans are analyzed ephemerally in memory solely to locate matching photos and are immediately discarded afterward.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  to="/features"
                  className="px-4 py-2.5 text-xs font-medium bg-[#1C1917] text-white rounded-lg hover:bg-[#9A742D] transition-colors inline-flex items-center gap-1.5"
                >
                  <span>Explore All Features</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  to="/privacy-policy"
                  className="px-4 py-2.5 text-xs font-medium border border-[#D6D3CD] text-[#1C1917] rounded-lg hover:bg-[#F3F0EA] transition-colors"
                >
                  Read Privacy Policy
                </Link>
              </div>
            </div>

            <div className="lg:col-span-7 grid sm:grid-cols-2 gap-6">
              <div className="rounded-2xl overflow-hidden border border-[#E7E2D8] bg-[#F3F0EA] aspect-[4/3]">
                <img
                  src={TOAST_IMAGE}
                  alt="Wedding guests raising champagne flutes during a candlelit toast"
                  width={800}
                  height={600}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="rounded-2xl overflow-hidden border border-[#E7E2D8] bg-[#F3F0EA] aspect-[4/3] sm:mt-10">
                <img
                  src={DANCE_IMAGE}
                  alt="Bride and groom sharing their first dance surrounded by cheering guests"
                  width={800}
                  height={600}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Journal Highlights */}
        <section className="border-t border-[#E7E2D8] bg-white py-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
              <div>
                <p className="text-xs font-medium tracking-widest uppercase text-[#9A742D] mb-2">
                  The WedSnap Journal
                </p>
                <h2 className="text-3xl sm:text-4xl font-semibold text-[#1C1917]">
                  Wedding photo sharing guides
                </h2>
              </div>
              <Link
                to="/blog"
                className="text-sm font-medium text-[#1C1917] hover:text-[#9A742D] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <BookOpen className="w-4 h-4" />
                <span>Read all guides</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {BLOG_ARTICLES.slice(0, 3).map((article) => (
                <article
                  key={article.slug}
                  className="group rounded-2xl border border-[#E7E2D8] bg-[#FAF9F6] overflow-hidden hover:border-[#B8924A] transition-colors flex flex-col"
                >
                  <Link to={`/blog/${article.slug}`} className="aspect-[16/10] bg-[#F3F0EA] overflow-hidden">
                    <img
                      src={article.featuredImage}
                      alt={article.featuredImageAlt}
                      width={800}
                      height={500}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    />
                  </Link>
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <p className="text-xs text-[#78716C] mb-1.5">
                        {article.category} · {article.readingTime}
                      </p>
                      <h3 className="font-display text-xl font-semibold text-[#1C1917] leading-snug mb-2">
                        <Link to={`/blog/${article.slug}`} className="hover:text-[#9A742D] transition-colors">
                          {article.title}
                        </Link>
                      </h3>
                      <p className="text-xs text-[#57534E] leading-relaxed">{article.excerpt}</p>
                    </div>
                    <Link
                      to={`/blog/${article.slug}`}
                      className="mt-4 pt-3 border-t border-[#E7E2D8] text-xs font-medium text-[#1C1917] group-hover:text-[#9A742D] inline-flex items-center justify-between"
                    >
                      <span>Read guide</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
