import { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  ACTIVE_FACE_MODEL_VERSION,
  DrivePhotoFile,
  EventPhoto,
  FaceEmbedding,
  FaceStatus,
  IndexingJob,
  IndexingJobStatus,
  ProcessingStatus,
  WeddingEvent,
} from '../types/wedsnap';
import { ExtractedFace } from './faceEngine';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { deleteStorageObjects } from './storageService';

function makeSafeId(prefix: string): string {
  const rand = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  return `${prefix}_${rand}`;
}

export async function revalidatePublicEventCache(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) return;
    await fetch('/api/public/events/revalidate', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });
  } catch {
    // Non-blocking cache invalidation
  }
}

export function slugifyEventTitle(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

export async function upsertUserProfile(user: User): Promise<void> {
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  try {
    const existing = await getDoc(ref);
    if (existing.exists()) {
      await updateDoc(ref, {
        displayName: (user.displayName || 'Wedding Organizer').slice(0, 120),
        photoURL: (user.photoURL || '').slice(0, 512),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        uid: user.uid,
        email: (user.email || 'unknown@example.com').slice(0, 254),
        displayName: (user.displayName || 'Wedding Organizer').slice(0, 120),
        photoURL: (user.photoURL || '').slice(0, 512),
        role: 'organizer',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function listOwnerEvents(ownerUid: string): Promise<WeddingEvent[]> {
  const path = 'events';
  try {
    const q = query(
      collection(db, 'events'),
      where('ownerUid', '==', ownerUid),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as WeddingEvent);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function listPublishedEvents(): Promise<WeddingEvent[]> {
  const path = 'events';
  try {
    const q = query(collection(db, 'events'), where('isPublished', '==', true));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => d.data() as WeddingEvent)
      .filter((evt) => evt.discoverableInDirectory === true)
      .sort((a, b) => {
        const toMs = (ts: unknown): number => {
          if (
            ts &&
            typeof ts === 'object' &&
            'toMillis' in ts &&
            typeof (ts as { toMillis: () => number }).toMillis === 'function'
          ) {
            return (ts as { toMillis: () => number }).toMillis();
          }
          return 0;
        };
        return toMs(b.createdAt) - toMs(a.createdAt);
      });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getEventById(eventId: string): Promise<WeddingEvent | null> {
  const path = `events/${eventId}`;
  try {
    const snap = await getDoc(doc(db, 'events', eventId));
    return snap.exists() ? (snap.data() as WeddingEvent) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function getEventBySlug(slug: string): Promise<WeddingEvent | null> {
  const normalized = slug.trim().toLowerCase();
  const path = 'events';
  try {
    const q = query(
      collection(db, 'events'),
      where('slug', '==', normalized),
      where('isPublished', '==', true)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].data() as WeddingEvent;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function createWeddingEvent(input: {
  ownerUid: string;
  title: string;
  coupleNames: string;
  eventDate: string;
  welcomeMessage: string;
  coverPhotoUrl: string;
  slug: string;
  similarityThreshold: number;
  isPublished: boolean;
  discoverableInDirectory?: boolean;
  retentionDays?: number;
}): Promise<WeddingEvent> {
  const cleanSlug = slugifyEventTitle(input.slug || input.title);
  if (cleanSlug.length < 3) {
    throw new Error(
      'Event link slug must be at least 3 characters (letters, numbers, hyphens).'
    );
  }

  const existingSlugQ = query(collection(db, 'events'), where('slug', '==', cleanSlug));
  let finalSlug = cleanSlug;
  try {
    const dupSnap = await getDocs(existingSlugQ);
    if (!dupSnap.empty) {
      finalSlug = `${cleanSlug.slice(0, 56)}-${crypto.randomUUID().slice(0, 4)}`;
    }
  } catch {
    // Non-owner read on unpublished slugs may be denied by rules; add uniqueness suffix if needed
  }

  const id = makeSafeId('evt');
  const path = `events/${id}`;
  const discoverable = Boolean(input.discoverableInDirectory);
  const visibility = !input.isPublished ? 'private' : discoverable ? 'directory' : 'unlisted';

  const docData: WeddingEvent = {
    id,
    ownerUid: input.ownerUid,
    slug: finalSlug,
    title: input.title.trim().slice(0, 140),
    coupleNames: input.coupleNames.trim().slice(0, 140),
    eventDate: input.eventDate.trim().slice(0, 32),
    welcomeMessage: input.welcomeMessage.trim().slice(0, 800),
    coverPhotoUrl: input.coverPhotoUrl.trim().slice(0, 512),
    similarityThreshold: Number(Math.min(0.75, Math.max(0.3, input.similarityThreshold)).toFixed(2)),
    totalPhotos: 0,
    processedPhotos: 0,
    totalFaces: 0,
    isPublished: input.isPublished,
    discoverableInDirectory: discoverable,
    visibility,
    retentionDays: Math.max(0, Math.min(3650, Math.round(input.retentionDays ?? 180))),
    modelVersion: ACTIVE_FACE_MODEL_VERSION,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'events', id), docData);
    void revalidatePublicEventCache();
    return docData;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateWeddingEvent(
  eventId: string,
  patch: Partial<{
    title: string;
    coupleNames: string;
    eventDate: string;
    welcomeMessage: string;
    coverPhotoUrl: string;
    driveFolderId: string;
    driveFolderName: string;
    similarityThreshold: number;
    totalPhotos: number;
    processedPhotos: number;
    totalFaces: number;
    isPublished: boolean;
    discoverableInDirectory: boolean;
    visibility: 'private' | 'unlisted' | 'directory';
    retentionDays: number;
    modelVersion: string;
    indexedAt: unknown;
  }>
): Promise<void> {
  const path = `events/${eventId}`;
  try {
    await updateDoc(doc(db, 'events', eventId), {
      ...patch,
      updatedAt: serverTimestamp(),
    });
    void revalidatePublicEventCache();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function listEventPhotos(
  eventId: string,
  onlyPublished = false
): Promise<EventPhoto[]> {
  const path = `events/${eventId}/photos`;
  try {
    const colRef = collection(db, 'events', eventId, 'photos');
    const q = onlyPublished ? query(colRef, where('isPublished', '==', true)) : query(colRef);
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as EventPhoto);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function listEventFaces(
  eventId: string,
  onlyPublished = false
): Promise<FaceEmbedding[]> {
  const path = `events/${eventId}/faces`;
  try {
    const colRef = collection(db, 'events', eventId, 'faces');
    const q = onlyPublished ? query(colRef, where('isPublished', '==', true)) : query(colRef);
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as FaceEmbedding);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function createEventPhotoRecord(input: {
  photoId: string;
  eventId: string;
  ownerUid: string;
  isPublished: boolean;
  drivePhoto: DrivePhotoFile;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
  storageUrl?: string;
  storagePath?: string;
  thumbnailPath?: string;
}): Promise<EventPhoto> {
  const path = `events/${input.eventId}/photos/${input.photoId}`;
  const data: EventPhoto = {
    id: input.photoId,
    eventId: input.eventId,
    ownerUid: input.ownerUid,
    isPublished: input.isPublished,
    driveFileId: input.drivePhoto.id.slice(0, 256),
    sourceFileId: input.drivePhoto.id.slice(0, 256),
    fileName: input.drivePhoto.name.slice(0, 260),
    mimeType: input.drivePhoto.mimeType.slice(0, 100),
    fileSize: Math.max(0, Math.round(input.drivePhoto.size)),
    driveModifiedTime: (input.drivePhoto.modifiedTime || '').slice(0, 64),
    faceStatus: 'pending' as FaceStatus,
    processingStatus: 'pending' as ProcessingStatus,
    faceCount: 0,
    modelVersion: ACTIVE_FACE_MODEL_VERSION,
    ...(typeof input.width === 'number' && input.width > 0
      ? { width: Math.round(input.width) }
      : {}),
    ...(typeof input.height === 'number' && input.height > 0
      ? { height: Math.round(input.height) }
      : {}),
    ...(input.thumbnailUrl ? { thumbnailUrl: input.thumbnailUrl.slice(0, 1024) } : {}),
    ...(input.storageUrl ? { storageUrl: input.storageUrl.slice(0, 1024) } : {}),
    ...(input.storagePath ? { storagePath: input.storagePath.slice(0, 512) } : {}),
    ...(input.thumbnailPath ? { thumbnailPath: input.thumbnailPath.slice(0, 512) } : {}),
    syncedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'events', input.eventId, 'photos', input.photoId), data);
    return data;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function listIndexingJobs(
  eventId: string,
  ownerUid: string
): Promise<IndexingJob[]> {
  const path = `events/${eventId}/indexingJobs`;
  try {
    const q = query(
      collection(db, 'events', eventId, 'indexingJobs'),
      where('ownerUid', '==', ownerUid)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as IndexingJob);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function enqueueIndexingJobs(
  eventId: string,
  ownerUid: string,
  photos: EventPhoto[]
): Promise<IndexingJob[]> {
  if (photos.length === 0) return [];
  const path = `events/${eventId}/indexingJobs`;
  try {
    const existing = await listIndexingJobs(eventId, ownerUid);
    const activePhotoIds = new Set(
      existing
        .filter((j) => j.status === 'pending' || j.status === 'processing')
        .map((j) => j.photoId)
    );

    const created: IndexingJob[] = [];
    for (const p of photos) {
      if (activePhotoIds.has(p.id)) continue;
      const jobId = makeSafeId('job');
      const jobData: IndexingJob = {
        id: jobId,
        eventId,
        photoId: p.id,
        ownerUid,
        sourceFileId: p.sourceFileId || p.driveFileId,
        fileName: p.fileName.slice(0, 260),
        status: 'pending',
        attempts: 0,
        maxAttempts: 3,
        modelVersion: ACTIVE_FACE_MODEL_VERSION,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'events', eventId, 'indexingJobs', jobId), jobData);
      created.push(jobData);
      activePhotoIds.add(p.id);
    }
    return created;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateIndexingJobStatus(
  eventId: string,
  jobId: string,
  patch: {
    status: IndexingJobStatus;
    attempts?: number;
    lastError?: string;
    started?: boolean;
    completed?: boolean;
  }
): Promise<void> {
  const path = `events/${eventId}/indexingJobs/${jobId}`;
  try {
    await updateDoc(doc(db, 'events', eventId, 'indexingJobs', jobId), {
      status: patch.status,
      ...(typeof patch.attempts === 'number' ? { attempts: patch.attempts } : {}),
      ...(patch.lastError ? { lastError: patch.lastError.slice(0, 500) } : {}),
      ...(patch.started ? { startedAt: serverTimestamp() } : {}),
      ...(patch.completed ? { completedAt: serverTimestamp() } : {}),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function savePhotoFaceResults(input: {
  eventId: string;
  ownerUid: string;
  isPublished: boolean;
  photoId: string;
  faces: ExtractedFace[];
  failed?: boolean;
}): Promise<void> {
  const { eventId, ownerUid, isPublished, photoId, faces, failed } = input;
  const facesPath = `events/${eventId}/faces`;

  try {
    // Delete any old faces for this photo (supports safe re-indexing)
    const existingFacesQ = query(
      collection(db, 'events', eventId, 'faces'),
      where('photoId', '==', photoId)
    );
    const existingFacesSnap = await getDocs(existingFacesQ);
    if (!existingFacesSnap.empty) {
      const delBatch = writeBatch(db);
      existingFacesSnap.docs.forEach((d) => delBatch.delete(d.ref));
      await delBatch.commit();
    }

    // Write newly detected face embeddings in batches
    if (!failed && faces.length > 0) {
      const batch = writeBatch(db);
      for (const f of faces) {
        const faceId = makeSafeId('fac');
        const faceRef = doc(db, 'events', eventId, 'faces', faceId);
        batch.set(faceRef, {
          id: faceId,
          eventId,
          photoId,
          ownerUid,
          isPublished,
          embedding: f.embedding,
          boxX: f.boxX,
          boxY: f.boxY,
          boxWidth: f.boxWidth,
          boxHeight: f.boxHeight,
          detectionScore: f.detectionScore,
          modelVersion: ACTIVE_FACE_MODEL_VERSION,
          createdAt: serverTimestamp(),
        });
      }
      await batch.commit();
    }

    const nextStatus: FaceStatus = failed
      ? 'failed'
      : faces.length > 0
        ? 'processed'
        : 'no_faces';

    await updateDoc(doc(db, 'events', eventId, 'photos', photoId), {
      faceStatus: nextStatus,
      processingStatus: nextStatus,
      faceCount: failed ? 0 : faces.length,
      modelVersion: ACTIVE_FACE_MODEL_VERSION,
      indexedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, facesPath);
  }
}

export async function syncPublishStateToChildren(
  eventId: string,
  ownerUid: string,
  isPublished: boolean
): Promise<void> {
  const path = `events/${eventId}`;
  try {
    await updateWeddingEvent(eventId, { isPublished });

    const [photosSnap, facesSnap] = await Promise.all([
      getDocs(query(collection(db, 'events', eventId, 'photos'), where('ownerUid', '==', ownerUid))),
      getDocs(query(collection(db, 'events', eventId, 'faces'), where('ownerUid', '==', ownerUid))),
    ]);

    const allRefs = [...photosSnap.docs.map((d) => d.ref), ...facesSnap.docs.map((d) => d.ref)];
    for (let i = 0; i < allRefs.length; i += 400) {
      const batch = writeBatch(db);
      allRefs.slice(i, i + 400).forEach((ref) => batch.update(ref, { isPublished }));
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function recomputeEventStats(eventId: string, ownerUid: string): Promise<void> {
  const path = `events/${eventId}`;
  try {
    const photosSnap = await getDocs(
      query(collection(db, 'events', eventId, 'photos'), where('ownerUid', '==', ownerUid))
    );
    let totalPhotos = 0;
    let processedPhotos = 0;
    let totalFaces = 0;

    photosSnap.docs.forEach((d) => {
      const p = d.data() as EventPhoto;
      totalPhotos += 1;
      if (p.faceStatus === 'processed' || p.faceStatus === 'no_faces') {
        processedPhotos += 1;
      }
      totalFaces += p.faceCount || 0;
    });

    await updateWeddingEvent(eventId, {
      totalPhotos,
      processedPhotos,
      totalFaces,
      modelVersion: ACTIVE_FACE_MODEL_VERSION,
      indexedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteWeddingEventCascade(
  eventId: string,
  ownerUid: string,
  idToken: string
): Promise<void> {
  const path = `events/${eventId}`;
  try {
    const [facesSnap, photosSnap, jobsSnap, analyticsSnap] = await Promise.all([
      getDocs(query(collection(db, 'events', eventId, 'faces'), where('ownerUid', '==', ownerUid))),
      getDocs(query(collection(db, 'events', eventId, 'photos'), where('ownerUid', '==', ownerUid))),
      getDocs(
        query(collection(db, 'events', eventId, 'indexingJobs'), where('ownerUid', '==', ownerUid))
      ),
      getDocs(
        query(collection(db, 'events', eventId, 'analytics'), where('ownerUid', '==', ownerUid))
      ),
    ]);

    const storagePaths: Array<string | undefined> = [];
    photosSnap.docs.forEach((d) => {
      const p = d.data() as EventPhoto;
      storagePaths.push(p.storagePath, p.thumbnailPath);
    });
    await deleteStorageObjects(storagePaths);

    const allRefs = [
      ...facesSnap.docs.map((d) => d.ref),
      ...photosSnap.docs.map((d) => d.ref),
      ...jobsSnap.docs.map((d) => d.ref),
      ...analyticsSnap.docs.map((d) => d.ref),
    ];
    for (let i = 0; i < allRefs.length; i += 400) {
      const batch = writeBatch(db);
      allRefs.slice(i, i + 400).forEach((ref) => batch.delete(ref));
      await batch.commit();
    }

    // Purge cached image files on the server while Firestore doc still exists for owner verification
    const purgeRes = await fetch(`/api/media/events/${encodeURIComponent(eventId)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });
    if (!purgeRes.ok && purgeRes.status !== 404) {
      throw new Error('Failed to remove cached event photographs before deleting event.');
    }

    await deleteDoc(doc(db, 'events', eventId));
    void revalidatePublicEventCache();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export { makeSafeId };
