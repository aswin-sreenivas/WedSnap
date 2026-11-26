import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout';
import { SeoHead } from '../components/SeoHead';
import { useAuth } from '../context/AuthContext';
import { trackAnalyticsEvent } from '../lib/analytics';
import { createWeddingEvent, slugifyEventTitle } from '../lib/eventsService';

const COVER_PRESETS = [
  {
    label: 'Garden Pathway',
    url: '/src/assets/images/hero_wedding_couple_1795725465123.jpg',
  },
  {
    label: 'Estate Courtyard Table',
    url: '/src/assets/images/wedding_cover_classic_1795725466190.jpg',
  },
  {
    label: 'Candlelit Toast',
    url: '/src/assets/images/wedding_moment_toast_1795725465678.jpg',
  },
  {
    label: 'First Dance',
    url: '/src/assets/images/wedding_moment_dance_1795725466072.jpg',
  },
];

export function CreateEventPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [coupleNames, setCoupleNames] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState(
    'Thank you for celebrating with us! Scan your face below to find and download every photograph you appear in from our wedding weekend.'
  );
  const [coverPhotoUrl, setCoverPhotoUrl] = useState(COVER_PRESETS[0].url);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.52);
  const [isPublished, setIsPublished] = useState(true);
  const [discoverableInDirectory, setDiscoverableInDirectory] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!slugTouched) {
      setSlug(slugifyEventTitle(val));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setErrorMsg('');

    if (title.trim().length < 2 || coupleNames.trim().length < 2 || eventDate.trim().length < 4) {
      setErrorMsg('Please fill in the wedding title, couple names, and event date.');
      return;
    }

    const cleanSlug = slugifyEventTitle(slug || title);
    if (cleanSlug.length < 3) {
      setErrorMsg('Event URL code must be at least 3 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await createWeddingEvent({
        ownerUid: user.uid,
        title,
        coupleNames,
        eventDate,
        welcomeMessage,
        coverPhotoUrl: coverPhotoUrl || COVER_PRESETS[0].url,
        slug: cleanSlug,
        similarityThreshold,
        isPublished,
        discoverableInDirectory,
      });
      trackAnalyticsEvent('event_created', { discoverable: discoverableInDirectory });
      navigate(`/admin/events/${created.id}/drive`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to create wedding event.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout
      breadcrumbs={[
        { label: 'Organizer Studio', to: '/admin' },
        { label: 'Create Wedding Event' },
      ]}
    >
      <SeoHead
        title="Create Wedding Event | WedSnap Studio"
        description="Create a new wedding photo gallery on WedSnap."
        path="/admin/events/new"
        robots="noindex, nofollow"
      />
      <div className="max-w-3xl space-y-8">
        <div>
          <h1 className="text-3xl font-semibold text-[#1C1917] mb-1">Create Wedding Event</h1>
          <p className="text-sm text-[#57534E]">
            Configure your wedding gallery details, guest welcome message, and AI matching sensitivity.
          </p>
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="bg-white border border-[#E7E2D8] rounded-2xl p-6 sm:p-8 space-y-6"
        >
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B]">
              {errorMsg}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="evt-title" className="block text-xs font-medium text-[#1C1917] mb-1.5">
                Wedding Event Title
              </label>
              <input
                id="evt-title"
                type="text"
                required
                maxLength={140}
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Elena & Marco's Wedding"
                className="w-full h-11 px-3.5 bg-[#FAF9F6] border border-[#D6D3CD] rounded-xl text-sm focus:outline-none focus:border-[#9A742D]"
              />
            </div>

            <div>
              <label htmlFor="evt-couple" className="block text-xs font-medium text-[#1C1917] mb-1.5">
                Couple Names
              </label>
              <input
                id="evt-couple"
                type="text"
                required
                maxLength={140}
                value={coupleNames}
                onChange={(e) => setCoupleNames(e.target.value)}
                placeholder="Elena Rossi & Marco Conti"
                className="w-full h-11 px-3.5 bg-[#FAF9F6] border border-[#D6D3CD] rounded-xl text-sm focus:outline-none focus:border-[#9A742D]"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="evt-date" className="block text-xs font-medium text-[#1C1917] mb-1.5">
                Event Date
              </label>
              <input
                id="evt-date"
                type="date"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full h-11 px-3.5 bg-[#FAF9F6] border border-[#D6D3CD] rounded-xl text-sm focus:outline-none focus:border-[#9A742D]"
              />
            </div>

            <div>
              <label htmlFor="evt-slug" className="block text-xs font-medium text-[#1C1917] mb-1.5">
                Unique Guest URL Slug
              </label>
              <div className="flex items-center h-11 bg-[#FAF9F6] border border-[#D6D3CD] rounded-xl overflow-hidden focus-within:border-[#9A742D]">
                <span className="px-3 text-xs text-[#78716C] border-r border-[#E7E2D8] bg-[#F3F0EA] h-full flex items-center">
                  /e/
                </span>
                <input
                  id="evt-slug"
                  type="text"
                  required
                  maxLength={64}
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(slugifyEventTitle(e.target.value));
                  }}
                  placeholder="elena-marco-2026"
                  className="flex-1 h-full px-3 bg-transparent text-sm font-mono focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="evt-welcome" className="block text-xs font-medium text-[#1C1917] mb-1.5">
              Guest Welcome Message
            </label>
            <textarea
              id="evt-welcome"
              rows={3}
              maxLength={800}
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              className="w-full p-3.5 bg-[#FAF9F6] border border-[#D6D3CD] rounded-xl text-sm focus:outline-none focus:border-[#9A742D]"
            />
          </div>

          {/* Cover Photo Selection */}
          <div className="space-y-3">
            <label className="block text-xs font-medium text-[#1C1917]">
              Cover Photograph
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {COVER_PRESETS.map((preset) => {
                const selected = coverPhotoUrl === preset.url;
                return (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() => setCoverPhotoUrl(preset.url)}
                    className={`rounded-xl overflow-hidden border text-left transition-all ${
                      selected
                        ? 'border-[#9A742D] ring-2 ring-[#9A742D]/30'
                        : 'border-[#E7E2D8] hover:border-[#B8924A]'
                    }`}
                  >
                    <div className="aspect-[4/3] bg-[#F3F0EA]">
                      <img
                        src={preset.url}
                        alt={preset.label}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="px-2.5 py-2 text-[11px] font-medium text-[#1C1917] truncate">
                      {preset.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Similarity Sensitivity */}
          <div className="space-y-2 pt-2 border-t border-[#E7E2D8]">
            <div className="flex items-center justify-between">
              <label htmlFor="evt-threshold" className="text-xs font-medium text-[#1C1917]">
                Face Match Sensitivity
              </label>
              <span className="font-mono text-xs text-[#9A742D] tabular-nums">
                Max distance: {similarityThreshold.toFixed(2)}
              </span>
            </div>
            <input
              id="evt-threshold"
              type="range"
              min={0.42}
              max={0.62}
              step={0.02}
              value={similarityThreshold}
              onChange={(e) => setSimilarityThreshold(Number.parseFloat(e.target.value))}
              className="w-full accent-[#9A742D]"
            />
            <div className="flex justify-between text-[11px] text-[#78716C]">
              <span>Strict (fewer false matches)</span>
              <span>Balanced (0.52 recommended)</span>
              <span>Relaxed (catches wide angles)</span>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4 rounded border-[#D6D3CD] accent-[#9A742D]"
              />
              <span className="text-sm text-[#1C1917]">
                Publish event link immediately so guests can access it after photos are indexed
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={discoverableInDirectory}
                onChange={(e) => setDiscoverableInDirectory(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-[#D6D3CD] accent-[#9A742D]"
              />
              <span className="text-sm text-[#57534E] leading-relaxed">
                <span className="text-[#1C1917] font-medium">
                  List in WedSnap&apos;s public celebration directory &amp; Google search
                </span>{' '}
                — keep unchecked for private invite-only weddings (noindex).
              </span>
            </label>
          </div>

          <div className="pt-4 border-t border-[#E7E2D8] flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="px-5 py-2.5 text-sm font-medium border border-[#D6D3CD] text-[#1C1917] rounded-xl hover:bg-[#F3F0EA] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 text-sm font-medium bg-[#1C1917] text-white rounded-xl hover:bg-[#9A742D] transition-colors disabled:opacity-60 inline-flex items-center gap-2 whitespace-nowrap"
            >
              <span>{submitting ? 'Creating...' : 'Create & Connect Google Drive'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
