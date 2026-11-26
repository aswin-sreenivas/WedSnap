import fs from 'fs';
import {
  findLocalCachedPhotoFile,
  resolveConfinedEventDir,
  resolveConfinedPhotoPath,
} from './driveHandlers';
import {
  getAdminStorageBucket,
  invalidateEventCaches,
  isEventPhotoPubliclyPublished,
  verifyUserOwnsEvent,
} from './firebaseServer';
import {
  ALLOWED_MIME_TO_EXT,
  EXT_TO_MIME,
  getQueryStringParam,
  isSafeId,
  readJsonBody,
  verifyEventMediaToken,
} from './security';
import { ApiRequest, ApiResponse, sendJson } from './vercelTypes';

export async function handleUploadPhoto(
  req: ApiRequest,
  res: ApiResponse,
  caller: { idToken: string; uid: string; email?: string }
): Promise<void> {
  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(req, 16 * 1024 * 1024);
  } catch (err) {
    const msg = err instanceof Error && err.message === 'PAYLOAD_TOO_LARGE'
      ? 'Payload exceeds 16 MB limit.'
      : 'Invalid JSON payload.';
    sendJson(res, 400, { error: msg });
    return;
  }

  const { eventId, photoId, mimeType, dataBase64 } = body;
  if (!isSafeId(eventId) || !isSafeId(photoId) || typeof dataBase64 !== 'string') {
    sendJson(res, 400, { error: 'Invalid upload payload.' });
    return;
  }

  const ownsEvent = await verifyUserOwnsEvent(eventId, caller.idToken, caller.uid, caller.email);
  if (!ownsEvent) {
    sendJson(res, 403, { error: 'Forbidden: You do not own this wedding event.' });
    return;
  }

  const cleanMime = String(mimeType || '');
  const ext = ALLOWED_MIME_TO_EXT[cleanMime];
  if (!ext) {
    sendJson(res, 400, {
      error: 'Unsupported image format. Only JPG, PNG, and WebP are supported.',
    });
    return;
  }

  const cleanedBase64 = dataBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
  const buffer = Buffer.from(cleanedBase64, 'base64');
  if (buffer.length === 0 || buffer.length > 15 * 1024 * 1024) {
    sendJson(res, 400, { error: 'Photo size must be between 1 byte and 15 MB.' });
    return;
  }

  const bucket = getAdminStorageBucket();
  if (bucket) {
    try {
      const storagePath = `events/${eventId}/photos/${photoId}${ext}`;
      await bucket.file(storagePath).save(buffer, {
        contentType: cleanMime,
        metadata: { cacheControl: 'private, max-age=86400' },
      });
      sendJson(res, 200, {
        cached: true,
        storagePath,
        url: `/api/media/events/${eventId}/photos/${photoId}`,
        fileSize: buffer.length,
      });
      return;
    } catch (err) {
      console.error('Firebase Storage upload error:', err);
      sendJson(res, 500, { error: 'Failed to store uploaded photo in Firebase Storage.' });
      return;
    }
  }

  if (process.env.VERCEL === '1') {
    sendJson(res, 503, {
      error:
        'Persistent filesystem uploads are disabled on Vercel. Configure Firebase Storage or FIREBASE_SERVICE_ACCOUNT_JSON.',
    });
    return;
  }

  const eventDir = resolveConfinedEventDir(eventId);
  const targetPath = resolveConfinedPhotoPath(eventId, photoId, ext);
  if (!eventDir || !targetPath) {
    sendJson(res, 400, { error: 'Invalid upload destination.' });
    return;
  }

  try {
    fs.mkdirSync(eventDir, { recursive: true });
    fs.writeFileSync(targetPath, buffer);
    sendJson(res, 200, {
      cached: true,
      url: `/api/media/events/${eventId}/photos/${photoId}`,
      fileSize: buffer.length,
    });
  } catch (err) {
    console.error('Direct photo upload error:', err);
    sendJson(res, 500, { error: 'Failed to store uploaded photo.' });
  }
}

export async function handleDeleteEventMedia(
  _req: ApiRequest,
  res: ApiResponse,
  eventId: string,
  caller: { idToken: string; uid: string; email?: string }
): Promise<void> {
  if (!isSafeId(eventId)) {
    sendJson(res, 400, { error: 'Invalid event ID.' });
    return;
  }

  const ownsEvent = await verifyUserOwnsEvent(eventId, caller.idToken, caller.uid, caller.email);
  if (!ownsEvent) {
    sendJson(res, 403, { error: 'Forbidden: You do not own this wedding event.' });
    return;
  }

  try {
    const bucket = getAdminStorageBucket();
    if (bucket) {
      await bucket.deleteFiles({ prefix: `events/${eventId}/` }).catch(() => {});
    }

    if (process.env.VERCEL !== '1') {
      const eventDir = resolveConfinedEventDir(eventId);
      if (eventDir && fs.existsSync(eventDir)) {
        fs.rmSync(eventDir, { recursive: true, force: true });
      }
    }

    invalidateEventCaches(eventId);
    sendJson(res, 200, { deleted: true });
  } catch (err) {
    console.error('Event media cleanup failed:', err);
    sendJson(res, 500, { error: 'Failed to remove event photo cache.' });
  }
}

export async function handleServeEventPhoto(
  req: ApiRequest,
  res: ApiResponse,
  eventId: string,
  photoId: string
): Promise<void> {
  if (!isSafeId(eventId) || !isSafeId(photoId)) {
    sendJson(res, 400, { error: 'Invalid media identifier.' });
    return;
  }

  const exp = getQueryStringParam(req, 'exp') || undefined;
  const sig = getQueryStringParam(req, 'sig') || undefined;
  const hasOwnerSig = verifyEventMediaToken(eventId, exp, sig);

  if (!hasOwnerSig) {
    const isPublic = await isEventPhotoPubliclyPublished(eventId, photoId);
    if (!isPublic) {
      sendJson(res, 403, {
        error: 'Forbidden: This photograph belongs to an unpublished or private event.',
      });
      return;
    }
  }

  const download = getQueryStringParam(req, 'download') === '1';
  const rawName = getQueryStringParam(req, 'name') || `${photoId}.jpg`;
  const safeDownloadName =
    rawName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'wedding-photo.jpg';

  const bucket = getAdminStorageBucket();
  if (bucket) {
    for (const ext of ['.jpg', '.jpeg', '.png', '.webp']) {
      const fileRef = bucket.file(`events/${eventId}/photos/${photoId}${ext}`);
      const [exists] = await fileRef.exists();
      if (exists) {
        const [buffer] = await fileRef.download();
        res.statusCode = 200;
        res.setHeader('Content-Type', EXT_TO_MIME[ext] || 'image/jpeg');
        res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
        res.setHeader('Cache-Control', hasOwnerSig ? 'private, max-age=300' : 'public, max-age=86400');
        if (download) {
          res.setHeader('Content-Disposition', `attachment; filename="${safeDownloadName}"`);
        }
        res.end(buffer);
        return;
      }
    }
  }

  const found = findLocalCachedPhotoFile(eventId, photoId);
  if (!found) {
    sendJson(res, 404, { error: 'Photograph not found in event storage.' });
    return;
  }

  res.setHeader('Content-Type', found.mimeType);
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Cache-Control', hasOwnerSig ? 'private, max-age=300' : 'public, max-age=86400');
  if (download) {
    res.setHeader('Content-Disposition', `attachment; filename="${safeDownloadName}"`);
  }

  if (typeof res.sendFile === 'function') {
    res.sendFile(found.filePath);
    return;
  }
  const bytes = fs.readFileSync(found.filePath);
  res.statusCode = 200;
  res.end(bytes);
}
