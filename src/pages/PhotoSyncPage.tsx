import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, FolderSync, HardDrive, Image as ImageIcon, Upload } from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout';
import { SeoHead } from '../components/SeoHead';
import { useAuth } from '../context/AuthContext';
import {
  createEventPhotoRecord,
  enqueueIndexingJobs,
  getEventById,
  listEventPhotos,
  makeSafeId,
  recomputeEventStats,
} from '../lib/eventsService';
import {
  generatePhotoAssetsFromBlob,
  tryUploadPhotoToFirebaseStorage,
} from '../lib/storageService';
import { DrivePhotoFile, EventPhoto, WeddingEvent } from '../types/wedsnap';

export function PhotoSyncPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { user, driveAccessToken, getIdToken, signInWithGoogle, isSigningIn } = useAuth();
  const localFileInputRef = useRef<HTMLInputElement | null>(null);

  const [event, setEvent] = useState<WeddingEvent | null>(null);
  const [photos, setPhotos] = useState<EventPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [uploadingLocal, setUploadingLocal] = useState(false);
  const [syncSummary, setSyncSummary] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [mediaQuery, setMediaQuery] = useState('');

  const loadData = async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const [evt, existingPhotos] = await Promise.all([
        getEventById(eventId),
        listEventPhotos(eventId),
      ]);
      setEvent(evt);
      setPhotos(existingPhotos);
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
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load event photos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [eventId, user?.uid]);

  const handleSyncDriveFolder = async () => {
    if (!event || !user || !event.driveFolderId || !driveAccessToken) return;
    setSyncing(true);
    setErrorMsg('');
    setSyncSummary('Listing wedding photographs in Google Drive...');

    try {
      const idToken = await getIdToken();
      const listRes = await fetch(
        `/api/drive/folders/${encodeURIComponent(event.driveFolderId)}/photos`,
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
            'X-Drive-Access-Token': driveAccessToken,
          },
        }
      );
      const listData = await listRes.json();
      if (!listRes.ok) {
        throw new Error(listData.error || 'Failed to read Google Drive folder.');
      }

      const driveFiles: DrivePhotoFile[] = Array.isArray(listData.photos) ? listData.photos : [];
      const existingDriveIds = new Set(photos.map((p) => p.driveFileId));
      const newFiles = driveFiles.filter((f) => !existingDriveIds.has(f.id));
      const skippedCount = driveFiles.length - newFiles.length;

      if (newFiles.length === 0) {
        setSyncSummary(
          `Already up to date. Found ${driveFiles.length} image(s) in Drive (${skippedCount} already synced).`
        );
        return;
      }

      let syncedCount = 0;
      const newlyCreated: EventPhoto[] = [];
      for (let i = 0; i < newFiles.length; i++) {
        const drivePhoto = newFiles[i];
        setSyncSummary(
          `Syncing ${i + 1} of ${newFiles.length}: ${drivePhoto.name} (${skippedCount} duplicates skipped)`
        );
        const photoId = makeSafeId('pho');

        let width: number | undefined;
        let height: number | undefined;
        let thumbnailUrl: string | undefined;
        let storageUrl: string | undefined;
        let storagePath: string | undefined;
        let thumbnailPath: string | undefined;

        // Try direct browser thumbnailing + Firebase Storage upload first (zero Vercel filesystem persistence)
        try {
          const driveStreamRes = await fetch(`/api/drive/files/${encodeURIComponent(drivePhoto.id)}`, {
            headers: {
              Authorization: `Bearer ${idToken}`,
              'X-Drive-Access-Token': driveAccessToken,
            },
          });
          if (driveStreamRes.ok) {
            const rawBlob = await driveStreamRes.blob();
            const assets = await generatePhotoAssetsFromBlob(rawBlob);
            width = assets.width;
            height = assets.height;
            const uploaded = await tryUploadPhotoToFirebaseStorage(event.id, photoId, assets);
            if (uploaded) {
              thumbnailUrl = uploaded.thumbnailUrl;
              storageUrl = uploaded.storageUrl;
              storagePath = uploaded.storagePath;
              thumbnailPath = uploaded.thumbnailPath;
            }
          }
        } catch {
          // Fall back to server API caching below
        }

        if (!storageUrl) {
          const cacheRes = await fetch('/api/drive/cache-photo', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`,
              'X-Drive-Access-Token': driveAccessToken,
            },
            body: JSON.stringify({
              eventId: event.id,
              photoId,
              driveFileId: drivePhoto.id,
              mimeType: drivePhoto.mimeType,
            }),
          });

          if (!cacheRes.ok) {
            const errPayload = await cacheRes.json().catch(() => ({}));
            throw new Error(errPayload.error || `Failed to download ${drivePhoto.name}`);
          }
        }

        const record = await createEventPhotoRecord({
          photoId,
          eventId: event.id,
          ownerUid: user.uid,
          isPublished: event.isPublished,
          drivePhoto,
          width,
          height,
          thumbnailUrl,
          storageUrl,
          storagePath,
          thumbnailPath,
        });
        setPhotos((prev) => [record, ...prev]);
        newlyCreated.push(record);
        syncedCount += 1;
      }

      if (newlyCreated.length > 0) {
        await enqueueIndexingJobs(event.id, user.uid, newlyCreated).catch(() => {});
      }
      await recomputeEventStats(event.id, user.uid);
      setSyncSummary(
        `Sync complete: ${syncedCount} new photograph(s) added, ${skippedCount} existing skipped.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Google Drive synchronization failed.');
    } finally {
      setSyncing(false);
    }
  };

  const handleLocalUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0 || !event || !user) return;
    setUploadingLocal(true);
    setErrorMsg('');

    try {
      const idToken = await getIdToken();
      const files = Array.from(fileList);
      let uploaded = 0;
      const newlyCreated: EventPhoto[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) continue;
        setSyncSummary(`Uploading local photo ${i + 1} of ${files.length}: ${file.name}`);
        const photoId = makeSafeId('pho');

        let width: number | undefined;
        let height: number | undefined;
        let thumbnailUrl: string | undefined;
        let storageUrl: string | undefined;
        let storagePath: string | undefined;
        let thumbnailPath: string | undefined;

        try {
          const assets = await generatePhotoAssetsFromBlob(file);
          width = assets.width;
          height = assets.height;
          const uploadedRefs = await tryUploadPhotoToFirebaseStorage(event.id, photoId, assets);
          if (uploadedRefs) {
            thumbnailUrl = uploadedRefs.thumbnailUrl;
            storageUrl = uploadedRefs.storageUrl;
            storagePath = uploadedRefs.storagePath;
            thumbnailPath = uploadedRefs.thumbnailPath;
          }
        } catch {
          // Fall back to server API upload below
        }

        if (!storageUrl) {
          const dataBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(new Error(`Unable to read ${file.name}`));
            reader.readAsDataURL(file);
          });

          const upRes = await fetch('/api/media/upload-photo', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              eventId: event.id,
              photoId,
              mimeType: file.type,
              dataBase64,
            }),
          });
          const upPayload = await upRes.json();
          if (!upRes.ok) {
            throw new Error(upPayload.error || `Upload failed for ${file.name}`);
          }
        }

        const record = await createEventPhotoRecord({
          photoId,
          eventId: event.id,
          ownerUid: user.uid,
          isPublished: event.isPublished,
          drivePhoto: {
            id: `local_${photoId}`,
            name: file.name,
            mimeType: file.type,
            size: file.size,
            modifiedTime: new Date().toISOString(),
          },
          width,
          height,
          thumbnailUrl,
          storageUrl,
          storagePath,
          thumbnailPath,
        });
        setPhotos((prev) => [record, ...prev]);
        newlyCreated.push(record);
        uploaded += 1;
      }

      if (newlyCreated.length > 0) {
        await enqueueIndexingJobs(event.id, user.uid, newlyCreated).catch(() => {});
      }
      await recomputeEventStats(event.id, user.uid);
      setSyncSummary(`Uploaded ${uploaded} local photograph(s) for AI face indexing.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Local photo upload failed.');
    } finally {
      e.target.value = '';
      setUploadingLocal(false);
    }
  };

  return (
    <AdminLayout
      eventId={eventId}
      eventTitle={event?.title}
      breadcrumbs={[
        { label: 'Organizer Studio', to: '/admin' },
        { label: event?.title || 'Event' },
        { label: 'Photo Sync' },
      ]}
      actions={
        <Link
          to={`/admin/events/${eventId}/processing`}
          className="px-4 py-2 text-xs font-medium bg-[#1C1917] text-white rounded-lg hover:bg-[#9A742D] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <span>Next: Face Indexing</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      }
    >
      <SeoHead
        title="Photo Sync | WedSnap Studio"
        description="Sync wedding photos from Google Drive on WedSnap."
        path={`/admin/events/${eventId || ''}/sync`}
        robots="noindex, nofollow"
      />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-[#1C1917] mb-1">Photo Synchronization</h1>
          <p className="text-sm text-[#57534E]">
            Pull JPG, JPEG, PNG, and WebP photographs from Google Drive without downloading duplicates.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {/* Primary Google Drive Sync Card */}
          <div className="bg-white border border-[#E7E2D8] rounded-2xl p-6 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 text-xs font-medium text-[#9A742D] mb-2">
                <HardDrive className="w-4 h-4" />
                <span>Google Drive Source</span>
              </div>
              <h2 className="text-xl font-semibold text-[#1C1917] mb-1">
                {event?.driveFolderName || 'No Drive folder linked'}
              </h2>
              <p className="text-xs text-[#57534E] leading-relaxed">
                {event?.driveFolderId
                  ? 'Incremental sync compares Drive file IDs against Firestore so existing photos are skipped.'
                  : 'Link a Google Drive folder first to begin syncing photographs.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {!event?.driveFolderId ? (
                <Link
                  to={`/admin/events/${eventId}/drive`}
                  className="px-4 py-2 text-xs font-medium bg-[#1C1917] text-white rounded-lg hover:bg-[#9A742D] transition-colors whitespace-nowrap"
                >
                  Select Drive Folder
                </Link>
              ) : !driveAccessToken ? (
                <button
                  type="button"
                  disabled={isSigningIn}
                  onClick={() => void signInWithGoogle()}
                  className="px-4 py-2 text-xs font-medium bg-[#1C1917] text-white rounded-lg hover:bg-[#9A742D] transition-colors whitespace-nowrap"
                >
                  {isSigningIn ? 'Connecting...' : 'Reconnect Drive to Sync'}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={syncing || uploadingLocal}
                  onClick={() => void handleSyncDriveFolder()}
                  className="px-4 py-2 text-xs font-medium bg-[#1C1917] text-white rounded-lg hover:bg-[#9A742D] transition-colors disabled:opacity-60 inline-flex items-center gap-2 whitespace-nowrap"
                >
                  <FolderSync className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                  <span>{syncing ? 'Syncing Drive...' : 'Sync New Photos from Drive'}</span>
                </button>
              )}
              <Link
                to={`/admin/events/${eventId}/drive`}
                className="px-3.5 py-2 text-xs font-medium border border-[#D6D3CD] text-[#1C1917] rounded-lg hover:bg-[#F3F0EA] transition-colors whitespace-nowrap"
              >
                Change Folder
              </Link>
            </div>
          </div>

          {/* Optional Direct Local Upload */}
          <div className="bg-white border border-[#E7E2D8] rounded-2xl p-6 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 text-xs font-medium text-[#57534E] mb-2">
                <Upload className="w-4 h-4" />
                <span>Optional Direct Upload</span>
              </div>
              <h2 className="text-xl font-semibold text-[#1C1917] mb-1">
                Add photos from your device
              </h2>
              <p className="text-xs text-[#57534E] leading-relaxed">
                Upload individual JPG, PNG, or WebP wedding portraits directly alongside your Google Drive sync.
              </p>
            </div>

            <div>
              <input
                ref={localFileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => void handleLocalUpload(e)}
              />
              <button
                type="button"
                disabled={syncing || uploadingLocal}
                onClick={() => localFileInputRef.current?.click()}
                className="px-4 py-2 text-xs font-medium border border-[#D6D3CD] text-[#1C1917] rounded-lg hover:bg-[#F3F0EA] transition-colors disabled:opacity-60 inline-flex items-center gap-2 whitespace-nowrap"
              >
                <Upload className="w-4 h-4" />
                <span>{uploadingLocal ? 'Uploading...' : 'Select Local Images'}</span>
              </button>
            </div>
          </div>
        </div>

        {syncSummary && (
          <div className="p-4 rounded-xl bg-white border border-[#B8924A]/60 text-xs text-[#1C1917]">
            {syncSummary}
          </div>
        )}

        {errorMsg && (
          <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B]">
            {errorMsg}
          </div>
        )}

        {/* Synced Photos Grid */}
        <div className="bg-white border border-[#E7E2D8] rounded-2xl p-6">
          <div className="flex items-center justify-between gap-4 mb-5">
            <h2 className="text-xl font-semibold text-[#1C1917]">
              Synced Gallery (<span className="font-mono tabular-nums">{photos.length}</span>)
            </h2>
            {photos.length > 0 && (
              <Link
                to={`/admin/events/${eventId}/processing`}
                className="text-xs font-medium text-[#9A742D] hover:underline"
              >
                Proceed to Face Indexing &rarr;
              </Link>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-[4/3] rounded-xl bg-[#F3F0EA] animate-pulse" />
              ))}
            </div>
          ) : photos.length === 0 ? (
            <div className="py-12 text-center">
              <ImageIcon className="w-8 h-8 text-[#A8A29E] mx-auto mb-2" />
              <p className="text-sm font-medium text-[#1C1917] mb-1">No photos synced yet</p>
              <p className="text-xs text-[#57534E]">
                Run a Google Drive sync or upload local photos above to populate this event.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {photos.map((p) => (
                <div
                  key={p.id}
                  className="border border-[#E7E2D8] rounded-xl overflow-hidden bg-[#FAF9F6]"
                >
                  <div className="aspect-[4/3] bg-[#F3F0EA]">
                    <img
                      src={p.thumbnailUrl || p.storageUrl || `/api/media/events/${p.eventId}/photos/${p.id}${mediaQuery}`}
                      alt={p.fileName}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-medium text-[#1C1917] truncate">{p.fileName}</p>
                    <p className="text-[11px] text-[#78716C] font-mono tabular-nums">
                      {p.faceStatus} · {p.faceCount} face{p.faceCount === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
