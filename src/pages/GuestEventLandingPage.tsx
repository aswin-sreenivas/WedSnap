import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Camera, ShieldCheck } from 'lucide-react';
import { SeoHead } from '../components/SeoHead';
import { trackAnalyticsEvent } from '../lib/analytics';
import { getEventBySlug } from '../lib/eventsService';
import { WeddingEvent } from '../types/wedsnap';

export function GuestEventLandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<WeddingEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [coverFailed, setCoverFailed] = useState(false);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    getEventBySlug(slug)
      .then((found) => {
        if (active) {
          setEvent(found);
          if (found) {
            trackAnalyticsEvent('event_page_view', {
              discoverable: Boolean(found.discoverableInDirectory),
            });
          }
        }
      })
      .catch(() => {
        if (active) setEvent(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  const isDiscoverable = Boolean(event?.isPublished && event?.discoverableInDirectory);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const path = slug ? `/e/${slug}` : '/e';

  const eventJsonLd =
    event && isDiscoverable
      ? [
          {
            '@context': 'https://schema.org',
            '@type': 'Event',
            name: event.title,
            startDate: event.eventDate,
            eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
            location: {
              '@type': 'VirtualLocation',
              url: `${origin}${path}`,
            },
            description:
              event.welcomeMessage ||
              `Wedding photo gallery for ${event.coupleNames} powered by WedSnap AI.`,
            image: event.coverPhotoUrl.startsWith('http')
              ? event.coverPhotoUrl
              : `${origin}${event.coverPhotoUrl}`,
            url: `${origin}${path}`,
            organizer: {
              '@type': 'Organization',
              name: event.coupleNames,
            },
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: origin },
              { '@type': 'ListItem', position: 2, name: event.title, item: `${origin}${path}` },
            ],
          },
        ]
      : undefined;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center px-6">
        <SeoHead
          title="Opening Wedding Gallery | WedSnap"
          description="Open this wedding photo gallery on WedSnap to find your wedding photographs."
          path={path}
          robots="noindex, nofollow"
        />
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-[#9A742D] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-[#57534E]">Opening wedding gallery...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center px-6">
        <SeoHead
          title="Wedding Gallery Not Found | WedSnap"
          description="The requested wedding photo gallery could not be found or is not yet published."
          path={path}
          robots="noindex, nofollow"
        />
        <div className="max-w-md w-full bg-white border border-[#E7E2D8] rounded-2xl p-8 text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-[#9A742D] mb-2">
            Gallery Not Found
          </p>
          <h1 className="text-3xl font-semibold text-[#1C1917] mb-3">
            We couldn&apos;t find this wedding
          </h1>
          <p className="text-sm text-[#57534E] leading-relaxed mb-6">
            Double-check the wedding link or QR code from your host, or ask the organizer if the gallery has been published yet.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1C1917] text-white text-sm font-medium rounded-lg hover:bg-[#9A742D] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to WedSnap</span>
          </Link>
        </div>
      </div>
    );
  }

  const pageTitle = isDiscoverable
    ? `${event.title} – Wedding Photo Gallery | WedSnap`
    : 'Wedding Photo Gallery | WedSnap';
  const pageDescription = isDiscoverable
    ? `Find your wedding photos from ${event.coupleNames} (${event.eventDate}). Scan your face once with ephemeral AI matching to download your portraits.`
    : 'Open this wedding photo gallery on WedSnap to scan your face and download your wedding portraits.';

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1C1917] flex flex-col">
      <SeoHead
        title={pageTitle}
        description={pageDescription}
        path={`/e/${event.slug}`}
        robots={isDiscoverable ? 'index, follow' : 'noindex, nofollow'}
        ogImage={isDiscoverable ? event.coverPhotoUrl : undefined}
        jsonLd={eventJsonLd}
      />

      <header className="border-b border-[#E7E2D8] bg-white/90 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="font-display text-2xl font-semibold tracking-tight text-[#1C1917] whitespace-nowrap shrink-0"
          >
            WedSnap
          </Link>
          <span className="text-xs text-[#78716C] truncate">
            {event.coupleNames} · {event.eventDate}
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-10 sm:py-14 flex flex-col justify-center">
        <div className="bg-white border border-[#E7E2D8] rounded-3xl overflow-hidden shadow-xs grid lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 bg-[#F3F0EA] min-h-[280px] sm:min-h-[380px] relative">
            {!coverFailed ? (
              <img
                src={event.coverPhotoUrl}
                alt={`${event.title} – ${event.coupleNames} wedding gallery`}
                width={960}
                height={720}
                fetchPriority="high"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={() => setCoverFailed(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-[#F3F0EA] to-[#EAE3D5]">
                <Camera className="w-10 h-10 text-[#9A742D] mb-3" />
                <p className="font-display text-2xl text-[#1C1917]">{event.coupleNames}</p>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 p-8 sm:p-10 flex flex-col justify-between">
            <div>
              <p className="text-xs font-medium tracking-widest uppercase text-[#9A742D] mb-3">
                {event.eventDate}
              </p>
              <h1 className="text-3xl sm:text-4xl font-semibold text-[#1C1917] leading-tight mb-2">
                {event.title}
              </h1>
              <p className="text-sm font-medium text-[#57534E] mb-6">{event.coupleNames}</p>
              <p className="text-sm text-[#57534E] leading-relaxed mb-8">
                {event.welcomeMessage ||
                  'Welcome! Scan your face once to instantly discover and download all wedding photographs you appear in.'}
              </p>
            </div>

            <div className="space-y-4">
              <div className="text-xs text-[#78716C] flex items-center gap-2">
                <span className="font-mono tabular-nums text-[#1C1917] font-medium">
                  {event.totalPhotos}
                </span>
                <span>photos synced</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums text-[#1C1917] font-medium">
                  {event.totalFaces}
                </span>
                <span>faces indexed</span>
              </div>

              <Link
                to={`/e/${event.slug}/scan`}
                className="w-full h-12 px-6 bg-[#1C1917] text-white text-sm font-medium rounded-xl hover:bg-[#9A742D] transition-colors inline-flex items-center justify-center gap-2.5 whitespace-nowrap"
              >
                <Camera className="w-4 h-4" />
                <span>Scan Your Face</span>
              </Link>

              <p className="text-[11px] text-[#78716C] flex items-start gap-2 leading-relaxed pt-1">
                <ShieldCheck className="w-4 h-4 text-[#9A742D] shrink-0 mt-0.5" />
                <span>
                  Your face scan is processed ephemerally to match photos and immediately discarded afterward.{' '}
                  <Link to="/privacy-policy" className="underline hover:text-[#1C1917]">
                    Privacy Policy
                  </Link>
                </span>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
