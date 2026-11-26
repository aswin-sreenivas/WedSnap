import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from './firebase';

export interface ProcessedPhotoAssets {
  width: number;
  height: number;
  thumbnailBlob: Blob;
  displayBlob: Blob;
}

export interface UploadedStorageRefs {
  thumbnailUrl: string;
  storageUrl: string;
  thumbnailPath: string;
  storagePath: string;
}

async function renderResizedBlob(
  img: HTMLImageElement,
  maxDimension: number,
  quality: number
): Promise<Blob> {
  const scale = Math.min(1, maxDimension / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
  const width = Math.max(1, Math.round((img.naturalWidth || 1) * scale));
  const height = Math.max(1, Math.round((img.naturalHeight || 1) * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable for thumbnail generation.');
  }
  ctx.drawImage(img, 0, 0, width, height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error('Failed to encode resized JPEG.'));
        else resolve(blob);
      },
      'image/jpeg',
      quality
    );
  });
}

export async function generatePhotoAssetsFromBlob(sourceBlob: Blob): Promise<ProcessedPhotoAssets> {
  const objectUrl = URL.createObjectURL(sourceBlob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Unable to decode photograph for thumbnailing.'));
      el.src = objectUrl;
    });

    const [thumbnailBlob, displayBlob] = await Promise.all([
      renderResizedBlob(img, 600, 0.8),
      renderResizedBlob(img, 1600, 0.86),
    ]);

    return {
      width: img.naturalWidth || 0,
      height: img.naturalHeight || 0,
      thumbnailBlob,
      displayBlob,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Uploads optimized display copy & thumbnail directly to Firebase Storage so Vercel
 * serverless functions avoid carrying large image payloads or persisting files to disk.
 * Returns null gracefully if Firebase Storage is not enabled on the project yet.
 */
export async function tryUploadPhotoToFirebaseStorage(
  eventId: string,
  photoId: string,
  assets: ProcessedPhotoAssets
): Promise<UploadedStorageRefs | null> {
  try {
    const thumbnailPath = `events/${eventId}/thumbs/${photoId}.jpg`;
    const storagePath = `events/${eventId}/photos/${photoId}.jpg`;

    const thumbRef = ref(storage, thumbnailPath);
    const displayRef = ref(storage, storagePath);

    await Promise.all([
      uploadBytes(thumbRef, assets.thumbnailBlob, {
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=86400',
      }),
      uploadBytes(displayRef, assets.displayBlob, {
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=86400',
      }),
    ]);

    const [thumbnailUrl, storageUrl] = await Promise.all([
      getDownloadURL(thumbRef),
      getDownloadURL(displayRef),
    ]);

    return {
      thumbnailUrl,
      storageUrl,
      thumbnailPath,
      storagePath,
    };
  } catch (err) {
    console.warn('Firebase Storage unavailable or blocked; falling back to API media cache:', err);
    return null;
  }
}

export async function deleteStorageObjects(paths: Array<string | undefined>): Promise<void> {
  const valid = paths.filter((p): p is string => Boolean(p && p.trim()));
  await Promise.all(
    valid.map((p) => deleteObject(ref(storage, p)).catch(() => {}))
  );
}
