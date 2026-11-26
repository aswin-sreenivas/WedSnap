import fs from 'fs';
import path from 'path';
import { getAdminStorageBucket, verifyUserOwnsEvent } from './firebaseServer';
import {
  ALLOWED_MIME_TO_EXT,
  EXT_TO_MIME,
  getQueryStringParam,
  isSafeId,
  readJsonBody,
} from './security';
import { ApiRequest, ApiResponse, sendJson } from './vercelTypes';

const LOCAL_STORAGE_ROOT = path.resolve(process.cwd(), 'storage', 'events');

export function extractDriveToken(req: ApiRequest): string | null {
  const token = req.headers['x-drive-access-token'];
  if (typeof token !== 'string' || !token.trim()) return null;
  return token.trim();
}

export function resolveConfinedEventDir(eventId: string): string | null {
  if (!isSafeId(eventId)) return null;
  const resolved = path.resolve(LOCAL_STORAGE_ROOT, eventId);
  if (!resolved.startsWith(LOCAL_STORAGE_ROOT + path.sep)) return null;
  return resolved;
}

export function resolveConfinedPhotoPath(
  eventId: string,
  photoId: string,
  ext: string
): string | null {
  const eventDir = resolveConfinedEventDir(eventId);
  if (!eventDir || !isSafeId(photoId)) return null;
  const resolved = path.resolve(eventDir, `${photoId}${ext}`);
  if (!resolved.startsWith(eventDir + path.sep)) return null;
  return resolved;
}

export function findLocalCachedPhotoFile(
  eventId: string,
  photoId: string
): { filePath: string; mimeType: string } | null {
  if (process.env.VERCEL === '1') return null;
  const eventDir = resolveConfinedEventDir(eventId);
  if (!eventDir || !isSafeId(photoId) || !fs.existsSync(eventDir)) return null;

  for (const ext of ['.jpg', '.jpeg', '.png', '.webp']) {
    const candidate = resolveConfinedPhotoPath(eventId, photoId, ext);
    if (candidate && fs.existsSync(candidate)) {
      return {
        filePath: candidate,
        mimeType: EXT_TO_MIME[ext] || 'image/jpeg',
      };
    }
  }
  return null;
}

export async function handleListDriveFolders(req: ApiRequest, res: ApiResponse): Promise<void> {
  const driveToken = extractDriveToken(req);
  if (!driveToken) {
    sendJson(res, 400, {
      error: 'Google Drive permission token is missing. Please reconnect Google Drive.',
    });
    return;
  }

  const parentIdRaw = getQueryStringParam(req, 'parentId').trim();
  const searchRaw = getQueryStringParam(req, 'search').trim();

  if (parentIdRaw && parentIdRaw !== 'root' && !isSafeId(parentIdRaw)) {
    sendJson(res, 400, { error: 'Invalid folder identifier.' });
    return;
  }

  const queryParts = [
    "mimeType = 'application/vnd.google-apps.folder'",
    'trashed = false',
  ];
  if (parentIdRaw) queryParts.push(`'${parentIdRaw}' in parents`);
  if (searchRaw) {
    const sanitizedSearch = searchRaw.replace(/['\\]/g, '');
    queryParts.push(`name contains '${sanitizedSearch}'`);
  }

  const params = new URLSearchParams({
    q: queryParts.join(' and '),
    fields: 'files(id, name, modifiedTime, parents)',
    orderBy: 'modifiedTime desc',
    pageSize: '50',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
  });

  try {
    const driveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${driveToken}` },
      }
    );
    const payload = await driveRes.json();
    if (!driveRes.ok) {
      sendJson(res, driveRes.status, {
        error: payload?.error?.message || 'Unable to list Google Drive folders.',
      });
      return;
    }
    sendJson(res, 200, { folders: Array.isArray(payload.files) ? payload.files : [] });
  } catch (err) {
    console.error('Drive folder listing error:', err);
    sendJson(res, 502, { error: 'Failed to communicate with Google Drive API.' });
  }
}

export async function handleListDriveFolderPhotos(
  req: ApiRequest,
  res: ApiResponse,
  folderId: string
): Promise<void> {
  const driveToken = extractDriveToken(req);
  if (!driveToken) {
    sendJson(res, 400, {
      error: 'Google Drive permission token is missing. Please reconnect Google Drive.',
    });
    return;
  }

  if (!isSafeId(folderId)) {
    sendJson(res, 400, { error: 'Invalid Google Drive folder ID.' });
    return;
  }

  const q = `'${folderId}' in parents and trashed = false and (mimeType = 'image/jpeg' or mimeType = 'image/png' or mimeType = 'image/webp')`;
  const allFiles: Array<{
    id: string;
    name: string;
    mimeType: string;
    size: number;
    modifiedTime: string;
  }> = [];

  let pageToken: string | undefined;
  try {
    for (let page = 0; page < 10; page++) {
      const params = new URLSearchParams({
        q,
        fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime)',
        pageSize: '100',
        supportsAllDrives: 'true',
        includeItemsFromAllDrives: 'true',
      });
      if (pageToken) params.set('pageToken', pageToken);

      const driveRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${driveToken}` },
        }
      );
      const payload = await driveRes.json();
      if (!driveRes.ok) {
        sendJson(res, driveRes.status, {
          error: payload?.error?.message || 'Unable to list Drive photos.',
        });
        return;
      }

      const files = Array.isArray(payload.files) ? payload.files : [];
      for (const f of files) {
        if (f?.id && f?.name && ALLOWED_MIME_TO_EXT[f.mimeType]) {
          allFiles.push({
            id: String(f.id),
            name: String(f.name),
            mimeType: String(f.mimeType),
            size: Number.parseInt(String(f.size || '0'), 10) || 0,
            modifiedTime: String(f.modifiedTime || new Date().toISOString()),
          });
        }
      }

      if (!payload.nextPageToken) break;
      pageToken = payload.nextPageToken;
    }

    sendJson(res, 200, { photos: allFiles });
  } catch (err) {
    console.error('Drive photo list error:', err);
    sendJson(res, 502, { error: 'Failed to retrieve photographs from Google Drive.' });
  }
}

export async function handleCacheDrivePhoto(
  req: ApiRequest,
  res: ApiResponse,
  caller: { idToken: string; uid: string; email?: string }
): Promise<void> {
  const driveToken = extractDriveToken(req);
  if (!driveToken) {
    sendJson(res, 400, { error: 'Google Drive permission token is missing.' });
    return;
  }

  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { error: 'Invalid request body.' });
    return;
  }

  const { eventId, photoId, driveFileId, mimeType } = body;
  if (!isSafeId(eventId) || !isSafeId(photoId) || !isSafeId(driveFileId)) {
    sendJson(res, 400, { error: 'Invalid event, photo, or Drive file identifier.' });
    return;
  }

  const ownsEvent = await verifyUserOwnsEvent(eventId, caller.idToken, caller.uid, caller.email);
  if (!ownsEvent) {
    sendJson(res, 403, { error: 'Forbidden: You do not own this wedding event.' });
    return;
  }

  const cleanMime = String(mimeType || 'image/jpeg');
  const ext = ALLOWED_MIME_TO_EXT[cleanMime];
  if (!ext) {
    sendJson(res, 400, {
      error: 'Unsupported image format. Only JPG, PNG, and WebP are supported.',
    });
    return;
  }

  // Prefer managed Firebase Storage bucket on Vercel & cloud deployments
  const bucket = getAdminStorageBucket();
  if (bucket) {
    try {
      const storagePath = `events/${eventId}/photos/${photoId}${ext}`;
      const fileRef = bucket.file(storagePath);
      const [exists] = await fileRef.exists();
      if (exists) {
        sendJson(res, 200, {
          cached: true,
          storagePath,
          url: `/api/media/events/${eventId}/photos/${photoId}`,
        });
        return;
      }

      const driveRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
          driveFileId
        )}?alt=media&supportsAllDrives=true`,
        {
          headers: { Authorization: `Bearer ${driveToken}` },
        }
      );
      if (!driveRes.ok) {
        sendJson(res, driveRes.status, { error: 'Could not download photo from Google Drive.' });
        return;
      }
      const arrayBuffer = await driveRes.arrayBuffer();
      if (arrayBuffer.byteLength > 25 * 1024 * 1024) {
        sendJson(res, 413, { error: 'Photo exceeds 25 MB maximum file size.' });
        return;
      }

      await fileRef.save(Buffer.from(arrayBuffer), {
        contentType: cleanMime,
        metadata: { cacheControl: 'private, max-age=86400' },
      });
      sendJson(res, 200, {
        cached: true,
        storagePath,
        url: `/api/media/events/${eventId}/photos/${photoId}`,
      });
      return;
    } catch (err) {
      console.error('Firebase Storage Drive cache error:', err);
      sendJson(res, 502, { error: 'Failed to store Drive photo in Firebase Storage.' });
      return;
    }
  }

  if (process.env.VERCEL === '1') {
    sendJson(res, 503, {
      error:
        'Cloud object storage is required on Vercel. Upload directly to Firebase Storage from the browser or configure FIREBASE_SERVICE_ACCOUNT_JSON.',
    });
    return;
  }

  // Non-Vercel local dev cache fallback
  const existing = findLocalCachedPhotoFile(eventId, photoId);
  if (existing) {
    sendJson(res, 200, { cached: true, url: `/api/media/events/${eventId}/photos/${photoId}` });
    return;
  }

  const eventDir = resolveConfinedEventDir(eventId);
  const targetPath = resolveConfinedPhotoPath(eventId, photoId, ext);
  if (!eventDir || !targetPath) {
    sendJson(res, 400, { error: 'Invalid storage destination.' });
    return;
  }

  try {
    const driveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
        driveFileId
      )}?alt=media&supportsAllDrives=true`,
      {
        headers: { Authorization: `Bearer ${driveToken}` },
      }
    );
    if (!driveRes.ok) {
      sendJson(res, driveRes.status, { error: 'Could not download photo from Google Drive.' });
      return;
    }

    const arrayBuffer = await driveRes.arrayBuffer();
    if (arrayBuffer.byteLength > 25 * 1024 * 1024) {
      sendJson(res, 413, { error: 'Photo exceeds 25 MB maximum file size.' });
      return;
    }

    fs.mkdirSync(eventDir, { recursive: true });
    fs.writeFileSync(targetPath, Buffer.from(arrayBuffer));
    sendJson(res, 200, { cached: true, url: `/api/media/events/${eventId}/photos/${photoId}` });
  } catch (err) {
    console.error('Drive cache-photo error:', err);
    sendJson(res, 502, { error: 'Failed to cache photo from Google Drive.' });
  }
}

export async function handleDriveFileProxy(
  req: ApiRequest,
  res: ApiResponse,
  driveFileId: string
): Promise<void> {
  const driveToken = extractDriveToken(req);
  if (!driveToken) {
    sendJson(res, 400, { error: 'Google Drive permission token is missing.' });
    return;
  }
  if (!isSafeId(driveFileId)) {
    sendJson(res, 400, { error: 'Invalid Drive file ID.' });
    return;
  }

  try {
    const driveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
        driveFileId
      )}?alt=media&supportsAllDrives=true`,
      {
        headers: { Authorization: `Bearer ${driveToken}` },
      }
    );
    if (!driveRes.ok) {
      sendJson(res, driveRes.status, { error: 'Could not fetch file from Google Drive.' });
      return;
    }
    const contentType = driveRes.headers.get('content-type') || 'image/jpeg';
    const buf = Buffer.from(await driveRes.arrayBuffer());
    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, no-store');
    res.end(buf);
  } catch (err) {
    console.error('Drive file proxy error:', err);
    sendJson(res, 502, { error: 'Failed to proxy Google Drive image.' });
  }
}
