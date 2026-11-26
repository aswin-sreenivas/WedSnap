import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import JSZip from 'jszip';
import {
  ArrowLeft,
  Camera,
  ChevronLeft,
  ChevronRight,
  Download,
  FolderArchive,
  ShieldCheck,
  X,
} from 'lucide-react';
import { SeoHead } from '../components/SeoHead';
import { trackAnalyticsEvent } from '../lib/analytics';
import { getEventBySlug, listEventFaces, listEventPhotos } from '../lib/eventsService';
import { matchGuestEmbedding } from '../lib/faceEngine';
import { MatchedPhotoResult, WeddingEvent } from '../types/wedsnap';

interface ScanLocationState {
  ephemeralEmbedding?: number[];
}

export function GuestResultsPage() {
  const { slug, photoId: routePhotoId } = useParams<{ slug: string; photoId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const [event, setEvent] = useState<WeddingEvent | null>(null);
  const [matches, setMatches] = useState<MatchedPhotoResult[]>([]);
  const [searching, setSearching] = useState(true);
  const [searchError, setSearchError] = useState('');
  const [zipping, setZipping] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!slug) return;
    const state = (location.state as ScanLocationState | null) || null;
    const guestVector = state?.ephemeralEmbedding;

    if (!guestVector || !Array.isArray(guestVector) || guestVector.length !== 128) {
      setSearching(false);
      setSearchError('No active face scan found. Please scan your face to search this gallery.');
      return;
    }

    // Immediately clear ephemeral vector from browser history state
    window.history.replaceState({}, '');

    let active = true;
    const runMatch = async () => {
      setSearching(true);
      setSearchError('');
      try {
        const evt = await getEventBySlug(slug);
        if (!evt) {
          if (active) setSearchError('This wedding event could not be found.');
          return;
        }
        if (active) setEvent(evt);

        // Prefer server-side face matching so raw event embeddings stay off guest browsers
        let found: MatchedPhotoResult[] | null = null;
        try {
          const matchRes = await fetch(`/api/events/${encodeURIComponent(slug)}/match`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embedding: guestVector }),
          });
          if (matchRes.ok) {
            const payload = (await matchRes.json()) as { matches?: MatchedPhotoResult[] };
            if (Array.isArray(payload.matches)) {
              found = payload.matches;
            }
          }
        } catch {
          // Fallback to Firestore client matching below if backend route is unavailable
        }

        if (found === null) {
          const [photos, faces] = await Promise.all([
            listEventPhotos(evt.id, true),
            listEventFaces(evt.id, true),
          ]);
          found = matchGuestEmbedding(guestVector, photos, faces, evt.similarityThreshold);
        }

        // Discard guest vector from JS array memory immediately after matching
        guestVector.fill(0);

        if (active) {
          setMatches(found);
          trackAnalyticsEvent('matching_results_found', { match_count: found.length });
          if (routePhotoId) {
            const idx = found.findIndex((m) => m.photo.id === routePhotoId);
            if (idx >= 0) setActiveIndex(idx);
          }
        }
      } catch (err) {
        if (active) {
          setSearchError(
            err instanceof Error ? err.message : 'Unable to complete photo matching right now.'
          );
        }
      } finally {
        if (active) setSearching(false);
      }
    };

    void runMatch();
    return () => {
      active = false;
    };
  }, [slug]);

  const handleCloseLightbox = useCallback(() => {
    setActiveIndex(null);
    if (routePhotoId && slug) {
      navigate(`/e/${slug}/results`, { replace: true });
    }
  }, [navigate, routePhotoId, slug]);

  useEffect(() => {
    if (activeIndex === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseLightbox();
      } else if (e.key === 'ArrowRight') {
        setActiveIndex((prev) => (prev === null ? null : (prev + 1) % matches.length));
      } else if (e.key === 'ArrowLeft') {
        setActiveIndex((prev) =>
          prev === null ? null : (prev - 1 + matches.length) % matches.length
        );
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, matches.length, handleCloseLightbox]);

  const handleDownloadSingle = (match: MatchedPhotoResult) => {
    const link = document.createElement('a');
    const sep = match.imageUrl.includes('?') ? '&' : '?';
    link.href = `${match.imageUrl}${sep}download=1&name=${encodeURIComponent(match.photo.fileName)}`;
    link.download = match.photo.fileName;
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    trackAnalyticsEvent('photo_downloaded', { type: 'single', count: 1 });
  };

  const handleDownloadAllZip = async () => {
    if (matches.length === 0 || !event) return;
    setZipping(true);
    try {
      const zip = new JSZip();
      for (let i = 0; i < matches.length; i++) {
        const m = matches[i];
        const res = await fetch(m.imageUrl);
        if (!res.ok) continue;
        const blob = await res.blob();
        const fileName = m.photo.fileName || `wedding-photo-${i + 1}.jpg`;
        zip.file(fileName, blob);
      }
      const archive = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(archive);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${event.slug}-my-photos.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      trackAnalyticsEvent('photo_downloaded', { type: 'zip', count: matches.length });
    } finally {
      setZipping(false);
    }
  };

  const activePhoto = activeIndex !== null ? matches[activeIndex] : null;

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1C1917] flex flex-col">
      <SeoHead
        title="Matched Wedding Photos | WedSnap"
        description="Private guest photo match results on WedSnap."
        path={`/e/${slug || ''}/results`}
        robots="noindex, nofollow"
      />
      <header className="border-b border-[#E7E2D8] bg-white sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Link
            to={`/e/${slug || ''}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#57534E] hover:text-[#1C1917] whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{event?.title || 'Wedding Gallery'}</span>
          </Link>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to={`/e/${slug || ''}/scan`}
              className="px-4 py-2 text-xs font-medium border border-[#D6D3CD] text-[#1C1917] rounded-lg hover:bg-[#F3F0EA] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Scan Again</span>
            </Link>
            {matches.length > 0 && (
              <button
                type="button"
                onClick={() => void handleDownloadAllZip()}
                disabled={zipping}
                className="px-4 py-2 text-xs font-medium bg-[#1C1917] text-white rounded-lg hover:bg-[#9A742D] transition-colors disabled:opacity-60 inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <FolderArchive className="w-3.5 h-3.5" />
                <span>{zipping ? 'Preparing ZIP...' : `Download All (${matches.length})`}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10">
        {searching ? (
          <div className="py-24 text-center max-w-md mx-auto">
            <div className="w-12 h-12 border-2 border-[#9A742D] border-t-transparent rounded-full animate-spin mx-auto mb-5" />
            <h1 className="text-3xl font-semibold text-[#1C1917] mb-2">
              Searching wedding photographs...
            </h1>
            <p className="text-sm text-[#57534E] leading-relaxed">
              Comparing your ephemeral face signature across every indexed moment from {event?.coupleNames || 'this celebration'}.
            </p>
          </div>
        ) : searchError ? (
          <div className="max-w-md mx-auto bg-white border border-[#E7E2D8] rounded-2xl p-8 text-center my-12">
            <h1 className="text-2xl font-semibold text-[#1C1917] mb-2">Scan required</h1>
            <p className="text-sm text-[#57534E] leading-relaxed mb-6">{searchError}</p>
            <Link
              to={`/e/${slug || ''}/scan`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1C1917] text-white text-sm font-medium rounded-lg hover:bg-[#9A742D] transition-colors"
            >
              <Camera className="w-4 h-4" />
              <span>Go to Face Scanner</span>
            </Link>
          </div>
        ) : matches.length === 0 ? (
          <div className="max-w-lg mx-auto bg-white border border-[#E7E2D8] rounded-2xl p-10 text-center my-10">
            <p className="text-xs font-medium uppercase tracking-widest text-[#9A742D] mb-2">
              No Matches Found Yet
            </p>
            <h1 className="text-3xl font-semibold text-[#1C1917] mb-3">
              We didn&apos;t spot you in the indexed photos yet
            </h1>
            <p className="text-sm text-[#57534E] leading-relaxed mb-6">
              Try scanning again in brighter lighting facing straight ahead, or upload a smiling photo from today. Your previous scan has already been discarded.
            </p>
            <Link
              to={`/e/${slug || ''}/scan`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1C1917] text-white text-sm font-medium rounded-lg hover:bg-[#9A742D] transition-colors"
            >
              <Camera className="w-4 h-4" />
              <span>Try Another Scan</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E7E2D8] pb-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-[#9A742D] mb-2">
                  Your Personal Collection
                </p>
                <h1 className="text-3xl sm:text-4xl font-semibold text-[#1C1917]">
                  Found in <span className="font-mono tabular-nums">{matches.length}</span>{' '}
                  {matches.length === 1 ? 'photograph' : 'photographs'}
                </h1>
              </div>
              <p className="text-xs text-[#57534E] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#9A742D] shrink-0" />
                <span>Your facial scan was discarded immediately after matching.</span>
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {matches.map((match, idx) => (
                <div
                  key={match.photo.id}
                  className="group bg-white border border-[#E7E2D8] rounded-2xl overflow-hidden flex flex-col hover:border-[#B8924A] transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setActiveIndex(idx)}
                    className="aspect-[4/3] w-full overflow-hidden bg-[#F3F0EA] text-left cursor-zoom-in"
                  >
                    <img
                      src={match.thumbnailUrl || match.imageUrl}
                      alt={match.photo.fileName}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    />
                  </button>
                  <div className="px-4 py-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#1C1917] truncate">
                        {match.photo.fileName}
                      </p>
                      <p className="text-xs text-[#78716C] font-mono tabular-nums">
                        {match.confidence}% match
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDownloadSingle(match)}
                      className="p-2 text-[#57534E] hover:text-[#1C1917] hover:bg-[#F3F0EA] rounded-lg transition-colors shrink-0"
                      title={`Download ${match.photo.fileName}`}
                      aria-label={`Download ${match.photo.fileName}`}
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Fullscreen Photo Preview Lightbox */}
      {activePhoto && activeIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-[#0C0A09]/95 flex flex-col justify-between p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Photo preview"
        >
          <div className="flex items-center justify-between gap-4 text-white">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{activePhoto.photo.fileName}</p>
              <p className="text-xs text-stone-400 font-mono tabular-nums">
                {activePhoto.confidence}% match · {activeIndex + 1} / {matches.length}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleDownloadSingle(activePhoto)}
                className="px-4 py-2 text-xs font-medium bg-white text-[#1C1917] rounded-lg hover:bg-[#E2C27D] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
              <button
                type="button"
                onClick={handleCloseLightbox}
                className="p-2 text-stone-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Close preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center relative my-4 min-h-0">
            {matches.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setActiveIndex((activeIndex - 1 + matches.length) % matches.length)
                }
                className="absolute left-1 sm:left-4 p-3 rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors"
                aria-label="Previous photograph"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            <img
              src={activePhoto.imageUrl}
              alt={activePhoto.photo.fileName}
              referrerPolicy="no-referrer"
              className="max-h-full max-w-full object-contain rounded-lg"
            />

            {matches.length > 1 && (
              <button
                type="button"
                onClick={() => setActiveIndex((activeIndex + 1) % matches.length)}
                className="absolute right-1 sm:right-4 p-3 rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors"
                aria-label="Next photograph"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
