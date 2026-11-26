import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Check,
  Copy,
  Cpu,
  ExternalLink,
  FolderSync,
  HardDrive,
  Plus,
  QrCode,
  Trash2,
} from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout';
import { ConfirmModal } from '../components/ConfirmModal';
import { SeoHead } from '../components/SeoHead';
import { useAuth } from '../context/AuthContext';
import {
  deleteWeddingEventCascade,
  listOwnerEvents,
  syncPublishStateToChildren,
  updateWeddingEvent,
} from '../lib/eventsService';
import { WeddingEvent } from '../types/wedsnap';

export function AdminDashboardPage() {
  const { user, getIdToken } = useAuth();
  const [events, setEvents] = useState<WeddingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [eventToDelete, setEventToDelete] = useState<WeddingEvent | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadEvents = async () => {
    if (!user) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const list = await listOwnerEvents(user.uid);
      setEvents(list);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load wedding events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEvents();
  }, [user?.uid]);

  const totalPhotos = events.reduce((acc, e) => acc + (e.totalPhotos || 0), 0);
  const processedPhotos = events.reduce((acc, e) => acc + (e.processedPhotos || 0), 0);
  const totalFaces = events.reduce((acc, e) => acc + (e.totalFaces || 0), 0);

  const handleCopyLink = async (evt: WeddingEvent) => {
    const url = `${window.location.origin}/e/${evt.slug}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(evt.id);
    setTimeout(() => setCopiedId((prev) => (prev === evt.id ? null : prev)), 2000);
  };

  const handleTogglePublish = async (evt: WeddingEvent) => {
    if (!user) return;
    setTogglingId(evt.id);
    try {
      const next = !evt.isPublished;
      await syncPublishStateToChildren(evt.id, user.uid, next);
      setEvents((prev) => prev.map((item) => (item.id === evt.id ? { ...item, isPublished: next } : item)));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update event visibility.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleToggleDirectory = async (evt: WeddingEvent) => {
    setTogglingId(evt.id);
    try {
      const next = !evt.discoverableInDirectory;
      await updateWeddingEvent(evt.id, { discoverableInDirectory: next });
      setEvents((prev) =>
        prev.map((item) => (item.id === evt.id ? { ...item, discoverableInDirectory: next } : item))
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update directory listing.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!eventToDelete || !user) return;
    setDeleting(true);
    try {
      const idToken = await getIdToken();
      await deleteWeddingEventCascade(eventToDelete.id, user.uid, idToken);
      setEvents((prev) => prev.filter((e) => e.id !== eventToDelete.id));
      setEventToDelete(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to delete wedding event.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout
      breadcrumbs={[{ label: 'Organizer Studio' }, { label: 'All Events' }]}
      actions={
        <Link
          to="/admin/events/new"
          className="px-4 py-2 text-xs font-medium bg-[#1C1917] text-white rounded-lg hover:bg-[#9A742D] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Wedding Event</span>
        </Link>
      }
    >
      <SeoHead
        title="Organizer Studio | WedSnap"
        description="Manage wedding events, Google Drive sync, and AI face indexing."
        path="/admin"
        robots="noindex, nofollow"
      />
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-semibold text-[#1C1917] mb-1">Wedding Events</h1>
          <p className="text-sm text-[#57534E]">
            Create wedding galleries, synchronize Google Drive folders, and monitor AI face indexing.
          </p>
        </div>

        {/* Aggregate Tabular Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#E7E2D8] rounded-xl p-5">
            <p className="text-xs text-[#78716C] mb-1">Active Events</p>
            <p className="font-mono text-2xl font-medium text-[#1C1917] tabular-nums">
              {events.length}
            </p>
          </div>
          <div className="bg-white border border-[#E7E2D8] rounded-xl p-5">
            <p className="text-xs text-[#78716C] mb-1">Photos Synced</p>
            <p className="font-mono text-2xl font-medium text-[#1C1917] tabular-nums">
              {totalPhotos}
            </p>
          </div>
          <div className="bg-white border border-[#E7E2D8] rounded-xl p-5">
            <p className="text-xs text-[#78716C] mb-1">Photos Indexed</p>
            <p className="font-mono text-2xl font-medium text-[#1C1917] tabular-nums">
              {processedPhotos}
            </p>
          </div>
          <div className="bg-white border border-[#E7E2D8] rounded-xl p-5">
            <p className="text-xs text-[#78716C] mb-1">Faces Indexed</p>
            <p className="font-mono text-2xl font-medium text-[#1C1917] tabular-nums">
              {totalFaces}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B]">
            {errorMsg}
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-44 rounded-2xl border border-[#E7E2D8] bg-white animate-pulse"
              />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white border border-[#E7E2D8] rounded-2xl p-12 text-center">
            <h2 className="text-2xl font-semibold text-[#1C1917] mb-2">
              Create your first wedding event
            </h2>
            <p className="text-sm text-[#57534E] max-w-md mx-auto mb-6">
              Set up a wedding gallery, connect a Google Drive folder of wedding photos, and share a personalized QR code with your guests.
            </p>
            <Link
              to="/admin/events/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1C1917] text-white text-sm font-medium rounded-lg hover:bg-[#9A742D] transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Create Wedding Event</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {events.map((evt) => {
              const progressPct =
                evt.totalPhotos > 0
                  ? Math.round((evt.processedPhotos / evt.totalPhotos) * 100)
                  : 0;

              return (
                <div
                  key={evt.id}
                  className="bg-white border border-[#E7E2D8] rounded-2xl overflow-hidden grid md:grid-cols-12"
                >
                  <div className="md:col-span-3 bg-[#F3F0EA] min-h-[160px]">
                    <img
                      src={evt.coverPhotoUrl}
                      alt={evt.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="md:col-span-9 p-6 flex flex-col justify-between gap-5">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div>
                        <p className="text-xs text-[#78716C] mb-1">
                          {evt.eventDate} · {evt.coupleNames} ·{' '}
                          <span className={evt.isPublished ? 'text-[#15803D] font-medium' : 'text-[#B45309] font-medium'}>
                            {evt.isPublished ? 'Published to Guests' : 'Draft (Hidden)'}
                          </span>
                          {' · '}
                          <span className="text-[#57534E]">
                            {evt.discoverableInDirectory ? 'Public Directory (Indexable)' : 'Unlisted (Noindex)'}
                          </span>
                        </p>
                        <h2 className="text-2xl font-semibold text-[#1C1917]">{evt.title}</h2>
                        <p className="text-xs text-[#57534E] mt-1">
                          Drive Folder:{' '}
                          <span className="font-medium text-[#1C1917]">
                            {evt.driveFolderName || 'Not connected yet'}
                          </span>
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => void handleToggleDirectory(evt)}
                          disabled={togglingId === evt.id}
                          className="px-3 py-1.5 text-xs font-medium border border-[#D6D3CD] rounded-lg hover:bg-[#F3F0EA] transition-colors whitespace-nowrap"
                          title="Toggle whether this wedding appears in the public directory & Google sitemap"
                        >
                          {evt.discoverableInDirectory ? 'Make Unlisted' : 'List in Directory'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleTogglePublish(evt)}
                          disabled={togglingId === evt.id}
                          className="px-3 py-1.5 text-xs font-medium border border-[#D6D3CD] rounded-lg hover:bg-[#F3F0EA] transition-colors whitespace-nowrap"
                        >
                          {togglingId === evt.id
                            ? 'Updating...'
                            : evt.isPublished
                              ? 'Unpublish'
                              : 'Publish'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEventToDelete(evt)}
                          className="p-2 text-[#78716C] hover:text-[#B91C1C] hover:bg-[#FEF2F2] rounded-lg transition-colors"
                          title="Delete event and face data"
                          aria-label={`Delete ${evt.title}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Face Indexing Progress */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-[#57534E]">
                        <span>
                          Face indexing progress:{' '}
                          <span className="font-mono tabular-nums text-[#1C1917] font-medium">
                            {evt.processedPhotos}/{evt.totalPhotos}
                          </span>{' '}
                          photos ·{' '}
                          <span className="font-mono tabular-nums text-[#1C1917] font-medium">
                            {evt.totalFaces}
                          </span>{' '}
                          faces
                        </span>
                        <span className="font-mono tabular-nums text-[#1C1917] font-medium">
                          {progressPct}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-[#F3F0EA] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#9A742D] transition-all duration-300"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Workflow Links & Share */}
                    <div className="pt-4 border-t border-[#E7E2D8] flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/admin/events/${evt.id}/drive`}
                          className="px-3 py-1.5 text-xs font-medium border border-[#D6D3CD] rounded-lg hover:bg-[#F3F0EA] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <HardDrive className="w-3.5 h-3.5 text-[#9A742D]" />
                          <span>Drive Folder</span>
                        </Link>
                        <Link
                          to={`/admin/events/${evt.id}/sync`}
                          className="px-3 py-1.5 text-xs font-medium border border-[#D6D3CD] rounded-lg hover:bg-[#F3F0EA] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <FolderSync className="w-3.5 h-3.5 text-[#9A742D]" />
                          <span>Sync Photos</span>
                        </Link>
                        <Link
                          to={`/admin/events/${evt.id}/processing`}
                          className="px-3 py-1.5 text-xs font-medium bg-[#1C1917] text-white rounded-lg hover:bg-[#9A742D] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <Cpu className="w-3.5 h-3.5" />
                          <span>Index Faces &amp; QR</span>
                        </Link>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleCopyLink(evt)}
                          className="px-3 py-1.5 text-xs font-medium text-[#57534E] hover:text-[#1C1917] border border-[#E7E2D8] rounded-lg hover:bg-[#F3F0EA] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
                        >
                          {copiedId === evt.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#15803D]" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Guest Link</span>
                            </>
                          )}
                        </button>
                        <Link
                          to={`/admin/events/${evt.id}/processing#qr-share`}
                          className="p-2 text-[#57534E] hover:text-[#1C1917] border border-[#E7E2D8] rounded-lg hover:bg-[#F3F0EA]"
                          title="View QR Code"
                          aria-label="View QR Code"
                        >
                          <QrCode className="w-4 h-4" />
                        </Link>
                        {evt.isPublished && (
                          <Link
                            to={`/e/${evt.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 text-[#57534E] hover:text-[#1C1917] border border-[#E7E2D8] rounded-lg hover:bg-[#F3F0EA]"
                            title="Open guest page"
                            aria-label="Open guest page"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmModal
        open={Boolean(eventToDelete)}
        title="Delete wedding event?"
        description={`This permanently removes "${eventToDelete?.title || ''}", all synced photo metadata, cached gallery files, and indexed face embeddings. This cannot be undone.`}
        confirmLabel="Delete Event & Face Data"
        destructive
        loading={deleting}
        onCancel={() => setEventToDelete(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
    </AdminLayout>
  );
}
