import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { Check, Copy, Cpu, Download, ExternalLink, RefreshCw } from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout';
import { SeoHead } from '../components/SeoHead';
import { useAuth } from '../context/AuthContext';
import { trackAnalyticsEvent } from '../lib/analytics';
import {
  enqueueIndexingJobs,
  getEventById,
  listEventPhotos,
  listIndexingJobs,
  recomputeEventStats,
  savePhotoFaceResults,
  updateIndexingJobStatus,
  updateWeddingEvent,
} from '../lib/eventsService';
import { detectAllFacesFromUrl, ensureFaceModelsLoaded } from '../lib/faceEngine';
import { EventPhoto, IndexingJob, WeddingEvent } from '../types/wedsnap';

export function FaceProcessingPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { user, getIdToken } = useAuth();
  const qrWrapperRef = useRef<HTMLDivElement | null>(null);

  const [event, setEvent] = useState<WeddingEvent | null>(null);
  const [photos, setPhotos] = useState<EventPhoto[]>([]);
  const [jobs, setJobs] = useState<IndexingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [threshold, setThreshold] = useState(0.52);
  const [savingThreshold, setSavingThreshold] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [mediaQuery, setMediaQuery] = useState('');

  const loadData = async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const [evt, photoList, jobList] = await Promise.all([
        getEventById(eventId),
        listEventPhotos(eventId),
        user ? listIndexingJobs(eventId, user.uid).catch(() => []) : Promise.resolve([]),
      ]);
      setEvent(evt);
      if (evt) setThreshold(evt.similarityThreshold);
      setPhotos(photoList);
      setJobs(jobList);
      if (user) {
        const idToken = await getIdToken().catch(() => '');
        if (idToken) {
          const tokRes = await fetch(`/api/media/events/${encodeURIComponent(eventId)}/session-token`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${idToken}` },
          });
          if (tokRes.ok) {
            const tok = await tokRes.json();
            if (tok.exp && tok.sig) {
              setMediaQuery(`?exp=${encodeURIComponent(tok.exp)}&sig=${encodeURIComponent(tok.sig)}`);
            }
          }
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load face indexing data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [eventId, user?.uid]);

  const runIndexing = async (includeProcessed = false) => {
    if (!event || !user) return;
    const queue = includeProcessed
      ? photos
      : photos.filter((p) => p.faceStatus === 'pending' || p.faceStatus === 'failed');

    if (queue.length === 0) {
      setProgressText('All synced photographs are already indexed.');
      return;
    }

    setProcessing(true);
    setErrorMsg('');
    try {
      setProgressText('Preparing face indexing job queue & loading AI models...');
      await ensureFaceModelsLoaded();

      // Idempotently ensure queued job records exist for queued photos
      await enqueueIndexingJobs(event.id, user.uid, queue).catch(() => {});
      const latestJobs = await listIndexingJobs(event.id, user.uid).catch(() => jobs);
      const jobByPhoto = new Map<string, IndexingJob>();
      latestJobs.forEach((j) => jobByPhoto.set(j.photoId, j));

      for (let i = 0; i < queue.length; i++) {
        const photo = queue[i];
        const activeJob = jobByPhoto.get(photo.id);
        const attemptNum = (activeJob?.attempts || 0) + 1;

        if (activeJob) {
          await updateIndexingJobStatus(event.id, activeJob.id, {
            status: 'processing',
            attempts: attemptNum,
            started: true,
          }).catch(() => {});
        }

        setProgressText(`Analyzing photo ${i + 1} of ${queue.length}: ${photo.fileName}`);
        try {
          const sourceUrl =
            photo.storageUrl || `/api/media/events/${photo.eventId}/photos/${photo.id}${mediaQuery}`;
          const detected = await detectAllFacesFromUrl(sourceUrl);
          await savePhotoFaceResults({
            eventId: event.id,
            ownerUid: user.uid,
            isPublished: event.isPublished,
            photoId: photo.id,
            faces: detected,
          });
          if (activeJob) {
            await updateIndexingJobStatus(event.id, activeJob.id, {
              status: 'completed',
              attempts: attemptNum,
              completed: true,
            }).catch(() => {});
          }
          setPhotos((prev) =>
            prev.map((p) =>
              p.id === photo.id
                ? {
                    ...p,
                    faceStatus: detected.length > 0 ? 'processed' : 'no_faces',
                    faceCount: detected.length,
                  }
                : p
            )
          );
        } catch (photoErr) {
          console.error('Face indexing failed for photo:', photo.fileName, photoErr);
          const errMsg = photoErr instanceof Error ? photoErr.message : 'Face detection failed';
          await savePhotoFaceResults({
            eventId: event.id,
            ownerUid: user.uid,
            isPublished: event.isPublished,
            photoId: photo.id,
            faces: [],
            failed: true,
          });
          if (activeJob) {
            await updateIndexingJobStatus(event.id, activeJob.id, {
              status: 'failed',
              attempts: attemptNum,
              lastError: errMsg,
            }).catch(() => {});
          }
          setPhotos((prev) =>
            prev.map((p) =>
              p.id === photo.id ? { ...p, faceStatus: 'failed', faceCount: 0 } : p
            )
          );
        }
      }

      const refreshedJobs = await listIndexingJobs(event.id, user.uid).catch(() => []);
      setJobs(refreshedJobs);
      await recomputeEventStats(event.id, user.uid);
      const updated = await getEventById(event.id);
      if (updated) setEvent(updated);
      setProgressText(`Completed face indexing for ${queue.length} photograph(s).`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Face indexing encountered an error.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveThreshold = async () => {
    if (!event) return;
    setSavingThreshold(true);
    try {
      await updateWeddingEvent(event.id, { similarityThreshold: threshold });
      setEvent({ ...event, similarityThreshold: threshold });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save sensitivity threshold.');
    } finally {
      setSavingThreshold(false);
    }
  };

  const guestUrl = event ? `${window.location.origin}/e/${event.slug}` : '';

  const handleCopyGuestUrl = async () => {
    if (!guestUrl) return;
    await navigator.clipboard.writeText(guestUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownloadQr = () => {
    const canvas = qrWrapperRef.current?.querySelector('canvas');
    if (!canvas || !event) return;
    const pngUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = `${event.slug}-wedsnap-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    trackAnalyticsEvent('qr_code_downloaded');
  };

  const pendingCount = photos.filter((p) => p.faceStatus === 'pending').length;
  const failedCount = photos.filter((p) => p.faceStatus === 'failed').length;
  const actionableCount = pendingCount + failedCount;
  const processedCount = photos.filter(
    (p) => p.faceStatus === 'processed' || p.faceStatus === 'no_faces'
  ).length;
  const totalFaces = photos.reduce((acc, p) => acc + (p.faceCount || 0), 0);

  return (
    <AdminLayout
      eventId={eventId}
      eventTitle={event?.title}
      breadcrumbs={[
        { label: 'Organizer Studio', to: '/admin' },
        { label: event?.title || 'Event', to: `/admin/events/${eventId}/sync` },
        { label: 'Face Indexing & QR' },
      ]}
    >
      <SeoHead
        title="Face Indexing & QR Share | WedSnap Studio"
        description="Index wedding photo faces and download guest QR codes."
        path={`/admin/events/${eventId || ''}/processing`}
        robots="noindex, nofollow"
      />
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-[#1C1917] mb-1">
              Face Processing &amp; Guest Sharing
            </h1>
            <p className="text-sm text-[#57534E]">
              Extract 128-d facial embeddings for every wedding photo and share your guest QR code.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={processing || photos.length === 0}
              onClick={() => void runIndexing(true)}
              className="px-3.5 py-2 text-xs font-medium border border-[#D6D3CD] text-[#1C1917] rounded-lg hover:bg-[#F3F0EA] transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Re-index All</span>
            </button>
            <button
              type="button"
              disabled={processing || actionableCount === 0}
              onClick={() => void runIndexing(false)}
              className="px-4 py-2 text-xs font-medium bg-[#1C1917] text-white rounded-lg hover:bg-[#9A742D] transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Cpu className={`w-3.5 h-3.5 ${processing ? 'animate-pulse' : ''}`} />
              <span>
                {processing
                  ? 'Indexing...'
                  : failedCount > 0 && pendingCount === 0
                    ? `Retry Failed (${failedCount})`
                    : `Index Pending (${actionableCount})`}
              </span>
            </button>
          </div>
        </div>

        {/* Processing Metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-[#E7E2D8] rounded-xl p-5">
            <p className="text-xs text-[#78716C] mb-1">Processed Photos</p>
            <p className="font-mono text-2xl font-medium text-[#1C1917] tabular-nums">
              {processedCount} / {photos.length}
            </p>
          </div>
          <div className="bg-white border border-[#E7E2D8] rounded-xl p-5">
            <p className="text-xs text-[#78716C] mb-1">Pending / Failed Queue</p>
            <p className="font-mono text-2xl font-medium text-[#1C1917] tabular-nums">
              {pendingCount}
              {failedCount > 0 ? ` (${failedCount} failed)` : ''}
            </p>
          </div>
          <div className="bg-white border border-[#E7E2D8] rounded-xl p-5">
            <p className="text-xs text-[#78716C] mb-1">Faces Indexed</p>
            <p className="font-mono text-2xl font-medium text-[#1C1917] tabular-nums">
              {totalFaces}
            </p>
          </div>
        </div>

        {progressText && (
          <div className="p-4 rounded-xl bg-white border border-[#B8924A]/60 text-xs text-[#1C1917]">
            {progressText}
          </div>
        )}

        {errorMsg && (
          <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B]">
            {errorMsg}
          </div>
        )}

        {/* Guest Share URL + Printable QR Code + Threshold Tuner */}
        {event && (
          <div id="qr-share" className="grid lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-white border border-[#E7E2D8] rounded-2xl p-6 space-y-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-[#9A742D] mb-1">
                  Guest Access
                </p>
                <h2 className="text-2xl font-semibold text-[#1C1917] mb-1">
                  Shareable Wedding Link
                </h2>
                <p className="text-xs text-[#57534E]">
                  Guests open this link or scan the QR code on reception table cards to find their portraits.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  readOnly
                  value={guestUrl}
                  aria-label="Guest wedding URL"
                  className="flex-1 h-10 px-3 bg-[#FAF9F6] border border-[#D6D3CD] rounded-lg text-xs font-mono text-[#1C1917]"
                />
                <button
                  type="button"
                  onClick={() => void handleCopyGuestUrl()}
                  className="h-10 px-4 text-xs font-medium bg-[#1C1917] text-white rounded-lg hover:bg-[#9A742D] transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                </button>
                <Link
                  to={`/e/${event.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="h-10 px-4 text-xs font-medium border border-[#D6D3CD] text-[#1C1917] rounded-lg hover:bg-[#F3F0EA] transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open</span>
                </Link>
              </div>

              {/* Matching Threshold Setting */}
              <div className="pt-5 border-t border-[#E7E2D8] space-y-2.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="thresh-slider" className="text-xs font-medium text-[#1C1917]">
                    Similarity Matching Threshold
                  </label>
                  <span className="font-mono text-xs text-[#9A742D] tabular-nums">
                    {threshold.toFixed(2)}
                  </span>
                </div>
                <input
                  id="thresh-slider"
                  type="range"
                  min={0.42}
                  max={0.62}
                  step={0.02}
                  value={threshold}
                  onChange={(e) => setThreshold(Number.parseFloat(e.target.value))}
                  className="w-full accent-[#9A742D]"
                />
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[11px] text-[#78716C]">
                    Lower = stricter match · Higher = more permissive
                  </span>
                  <button
                    type="button"
                    disabled={savingThreshold}
                    onClick={() => void handleSaveThreshold()}
                    className="px-3 py-1.5 text-xs font-medium border border-[#D6D3CD] rounded-lg hover:bg-[#F3F0EA] whitespace-nowrap"
                  >
                    {savingThreshold ? 'Saving...' : 'Save Threshold'}
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 bg-white border border-[#E7E2D8] rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-4">
              <div
                ref={qrWrapperRef}
                className="p-4 bg-[#FAF9F6] border border-[#E7E2D8] rounded-2xl"
              >
                <QRCodeCanvas value={guestUrl} size={176} level="H" includeMargin />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#1C1917]">{event.title}</p>
                <p className="text-xs text-[#57534E]">Scan to find your wedding photos</p>
              </div>
              <button
                type="button"
                onClick={handleDownloadQr}
                className="px-4 py-2 text-xs font-medium border border-[#D6D3CD] text-[#1C1917] rounded-lg hover:bg-[#F3F0EA] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download QR Code (PNG)</span>
              </button>
            </div>
          </div>
        )}

        {/* Per-Photo Indexing Table */}
        <div className="bg-white border border-[#E7E2D8] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E7E2D8] flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#1C1917]">Photo Processing Status</h2>
            <Link
              to={`/admin/events/${eventId}/sync`}
              className="text-xs font-medium text-[#9A742D] hover:underline"
            >
              Sync more photos
            </Link>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-[#57534E]">Loading photos...</div>
          ) : photos.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm text-[#57534E] mb-4">
                No photographs synced yet for this event.
              </p>
              <Link
                to={`/admin/events/${eventId}/sync`}
                className="inline-flex px-4 py-2 text-xs font-medium bg-[#1C1917] text-white rounded-lg"
              >
                Go to Photo Sync
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E7E2D8] text-[#78716C] bg-[#FAF9F6]">
                    <th className="py-3 px-5 font-medium">Photograph</th>
                    <th className="py-3 px-4 font-medium">Format</th>
                    <th className="py-3 px-4 font-medium text-right">Faces Detected</th>
                    <th className="py-3 px-5 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E2D8]">
                  {photos.map((photo) => (
                    <tr key={photo.id} className="hover:bg-[#FAF9F6]">
                      <td className="py-2.5 px-5 flex items-center gap-3">
                        <img
                          src={photo.thumbnailUrl || photo.storageUrl || `/api/media/events/${photo.eventId}/photos/${photo.id}${mediaQuery}`}
                          alt={photo.fileName}
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-lg object-cover border border-[#E7E2D8] shrink-0"
                        />
                        <span className="font-medium text-[#1C1917] truncate max-w-xs">
                          {photo.fileName}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-[#57534E] font-mono">{photo.mimeType}</td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[#1C1917]">
                        {photo.faceCount}
                      </td>
                      <td className="py-2.5 px-5 text-right font-medium">
                        {photo.faceStatus === 'processed' && (
                          <span className="text-[#15803D]">Indexed</span>
                        )}
                        {photo.faceStatus === 'no_faces' && (
                          <span className="text-[#78716C]">No faces</span>
                        )}
                        {photo.faceStatus === 'pending' && (
                          <span className="text-[#B45309]">Pending</span>
                        )}
                        {photo.faceStatus === 'failed' && (
                          <span className="text-[#B91C1C]">Failed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
