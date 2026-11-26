import { cert, getApp, getApps, initializeApp, App } from 'firebase-admin/app';
import { DecodedIdToken, getAuth } from 'firebase-admin/auth';
import { Firestore, FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import firebaseConfig from '../../firebase-applet-config.json';
import { DEFAULT_OG_IMAGE } from '../../src/data/seoRoutes';
import { isSafeId } from './security';
import type { ApiRequest, ApiResponse } from './vercelTypes';
import { sendJson } from './vercelTypes';

export const ADMIN_EMAIL = 'shadowstack.web@gmail.com';
export const FIRESTORE_DATABASE_ID =
  (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId ||
  'ai-studio-01a91cff-3af0-434e-90dc-93a0f4f9374e';

export interface AuthenticatedCaller {
  decoded: DecodedIdToken;
  idToken: string;
}

export interface DiscoverableEventSummary {
  id: string;
  slug: string;
  title: string;
  coupleNames: string;
  eventDate: string;
  welcomeMessage: string;
  coverPhotoUrl: string;
  totalPhotos: number;
  totalFaces: number;
  updatedAtIso: string;
}

let cachedHasServiceAccount = false;

function getOrInitAdminApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  const rawJson = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson) as {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      };
      if (parsed.client_email && parsed.private_key) {
        cachedHasServiceAccount = true;
        return initializeApp({
          credential: cert({
            projectId: parsed.project_id || firebaseConfig.projectId,
            clientEmail: parsed.client_email,
            privateKey: parsed.private_key.replace(/\\n/g, '\n'),
          }),
          projectId: parsed.project_id || firebaseConfig.projectId,
          storageBucket: firebaseConfig.storageBucket,
        });
      }
    } catch (err) {
      console.error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON format:', err);
    }
  }

  return initializeApp({
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
  });
}

const adminApp = getOrInitAdminApp();
export const adminAuth = getAuth(adminApp);
export const hasAdminServiceAccount = cachedHasServiceAccount;

export function getAdminFirestore(): Firestore | null {
  if (!hasAdminServiceAccount) return null;
  if (FIRESTORE_DATABASE_ID && FIRESTORE_DATABASE_ID !== '(default)') {
    return getFirestore(adminApp, FIRESTORE_DATABASE_ID);
  }
  return getFirestore(adminApp);
}

export function getAdminStorageBucket() {
  if (!hasAdminServiceAccount || !firebaseConfig.storageBucket) return null;
  return getStorage(adminApp).bucket(firebaseConfig.storageBucket);
}

export async function authenticateRequest(
  req: ApiRequest,
  res: ApiResponse
): Promise<AuthenticatedCaller | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendJson(res, 401, { error: 'Unauthorized: Missing sign-in token.' });
    return null;
  }

  const idToken = authHeader.slice('Bearer '.length).trim();
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    return { decoded, idToken };
  } catch (err) {
    console.error('Firebase ID token verification failed:', err);
    sendJson(res, 401, { error: 'Unauthorized: Invalid or expired session.' });
    return null;
  }
}

export async function verifyUserOwnsEvent(
  eventId: string,
  idToken: string,
  uid: string,
  email?: string
): Promise<boolean> {
  if (!isSafeId(eventId) || !idToken) return false;
  try {
    const db = getAdminFirestore();
    if (db) {
      const snap = await db.collection('events').doc(eventId).get();
      if (!snap.exists) return false;
      const data = snap.data() as { ownerUid?: string } | undefined;
      return data?.ownerUid === uid || email === ADMIN_EMAIL;
    }

    const docUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      firebaseConfig.projectId
    )}/databases/${encodeURIComponent(FIRESTORE_DATABASE_ID)}/documents/events/${encodeURIComponent(
      eventId
    )}`;
    const res = await fetch(docUrl, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) return false;
    const payload = (await res.json()) as {
      fields?: { ownerUid?: { stringValue?: string } };
    };
    const ownerUid = payload.fields?.ownerUid?.stringValue;
    return ownerUid === uid || email === ADMIN_EMAIL;
  } catch {
    return false;
  }
}

const publishedPhotoCache = new Map<string, { allowed: boolean; expiresAt: number }>();
let cachedPublicEvents: { expiresAt: number; items: DiscoverableEventSummary[] } | null = null;

export function invalidateEventCaches(eventId?: string) {
  cachedPublicEvents = null;
  if (eventId) {
    for (const key of publishedPhotoCache.keys()) {
      if (key.startsWith(`${eventId}:`)) {
        publishedPhotoCache.delete(key);
      }
    }
  } else {
    publishedPhotoCache.clear();
  }
}

export async function isEventPhotoPubliclyPublished(
  eventId: string,
  photoId: string
): Promise<boolean> {
  if (!isSafeId(eventId) || !isSafeId(photoId)) return false;
  const cacheKey = `${eventId}:${photoId}`;
  const now = Date.now();
  const cached = publishedPhotoCache.get(cacheKey);
  if (cached && now < cached.expiresAt) {
    return cached.allowed;
  }

  try {
    const db = getAdminFirestore();
    if (db) {
      const snap = await db.collection('events').doc(eventId).collection('photos').doc(photoId).get();
      const allowed = snap.exists && snap.data()?.isPublished === true;
      publishedPhotoCache.set(cacheKey, { allowed, expiresAt: now + 3000 });
      return allowed;
    }

    const photoUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      firebaseConfig.projectId
    )}/databases/${encodeURIComponent(FIRESTORE_DATABASE_ID)}/documents/events/${encodeURIComponent(
      eventId
    )}/photos/${encodeURIComponent(photoId)}`;
    const res = await fetch(photoUrl);
    if (!res.ok) {
      publishedPhotoCache.set(cacheKey, { allowed: false, expiresAt: now + 2000 });
      return false;
    }
    const payload = (await res.json()) as {
      fields?: { isPublished?: { booleanValue?: boolean } };
    };
    const allowed = payload.fields?.isPublished?.booleanValue === true;
    publishedPhotoCache.set(cacheKey, { allowed, expiresAt: now + 3000 });
    return allowed;
  } catch {
    return false;
  }
}

export async function fetchDiscoverablePublicEvents(): Promise<DiscoverableEventSummary[]> {
  const now = Date.now();
  if (cachedPublicEvents && now < cachedPublicEvents.expiresAt) {
    return cachedPublicEvents.items;
  }

  try {
    const db = getAdminFirestore();
    if (db) {
      const snap = await db
        .collection('events')
        .where('isPublished', '==', true)
        .limit(200)
        .get();
      const items: DiscoverableEventSummary[] = [];
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data.isPublished !== true || data.discoverableInDirectory !== true) return;
        const slug = typeof data.slug === 'string' ? data.slug : '';
        if (!slug) return;
        const updatedIso =
          data.updatedAt && typeof data.updatedAt.toDate === 'function'
            ? data.updatedAt.toDate().toISOString().slice(0, 10)
            : new Date().toISOString().slice(0, 10);
        items.push({
          id: String(data.id || d.id),
          slug,
          title: String(data.title || 'Wedding Gallery'),
          coupleNames: String(data.coupleNames || ''),
          eventDate: String(data.eventDate || ''),
          welcomeMessage: String(data.welcomeMessage || ''),
          coverPhotoUrl: String(data.coverPhotoUrl || DEFAULT_OG_IMAGE),
          totalPhotos: Number(data.totalPhotos || 0),
          totalFaces: Number(data.totalFaces || 0),
          updatedAtIso: updatedIso,
        });
      });
      cachedPublicEvents = { expiresAt: now + 5000, items };
      return items;
    }

    const endpoint = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      firebaseConfig.projectId
    )}/databases/${encodeURIComponent(FIRESTORE_DATABASE_ID)}/documents:runQuery`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'events' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'isPublished' },
              op: 'EQUAL',
              value: { booleanValue: true },
            },
          },
          limit: 200,
        },
      }),
    });

    if (!res.ok) return [];

    const rows = (await res.json()) as Array<{
      document?: {
        updateTime?: string;
        fields?: Record<
          string,
          { stringValue?: string; booleanValue?: boolean; integerValue?: string; timestampValue?: string }
        >;
      };
    }>;

    const items: DiscoverableEventSummary[] = [];
    for (const row of rows) {
      const fields = row.document?.fields;
      if (!fields) continue;
      if (fields.isPublished?.booleanValue !== true) continue;
      if (fields.discoverableInDirectory?.booleanValue !== true) continue;

      const slug = fields.slug?.stringValue || '';
      if (!slug) continue;

      items.push({
        id: fields.id?.stringValue || slug,
        slug,
        title: fields.title?.stringValue || 'Wedding Gallery',
        coupleNames: fields.coupleNames?.stringValue || '',
        eventDate: fields.eventDate?.stringValue || '',
        welcomeMessage: fields.welcomeMessage?.stringValue || '',
        coverPhotoUrl: fields.coverPhotoUrl?.stringValue || DEFAULT_OG_IMAGE,
        totalPhotos: Number.parseInt(fields.totalPhotos?.integerValue || '0', 10) || 0,
        totalFaces: Number.parseInt(fields.totalFaces?.integerValue || '0', 10) || 0,
        updatedAtIso:
          (fields.updatedAt?.timestampValue || row.document?.updateTime || new Date().toISOString()).slice(
            0,
            10
          ),
      });
    }

    cachedPublicEvents = { expiresAt: now + 5000, items };
    return items;
  } catch {
    return [];
  }
}

export async function saveContactInquiryToFirestore(input: {
  id: string;
  name: string;
  email: string;
  role: string;
  message: string;
}): Promise<void> {
  const db = getAdminFirestore();
  if (db) {
    await db.collection('inquiries').doc(input.id).set({
      id: input.id,
      name: input.name,
      email: input.email,
      role: input.role,
      message: input.message,
      createdAt: FieldValue.serverTimestamp(),
    });
    return;
  }

  // Persist directly to Cloud Firestore via atomic server-timestamp REST commit (no local disk storage)
  const commitUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    firebaseConfig.projectId
  )}/databases/${encodeURIComponent(FIRESTORE_DATABASE_ID)}/documents:commit`;

  const docPath = `projects/${firebaseConfig.projectId}/databases/${FIRESTORE_DATABASE_ID}/documents/inquiries/${input.id}`;
  const res = await fetch(commitUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      writes: [
        {
          update: {
            name: docPath,
            fields: {
              id: { stringValue: input.id },
              name: { stringValue: input.name },
              email: { stringValue: input.email },
              role: { stringValue: input.role },
              message: { stringValue: input.message },
            },
          },
          currentDocument: { exists: false },
          updateTransforms: [
            { fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Firestore inquiry commit failed (${res.status}): ${errText}`);
  }
}

interface FirestoreRestValue {
  stringValue?: string;
  booleanValue?: boolean;
  integerValue?: string;
  doubleValue?: number;
  arrayValue?: { values?: FirestoreRestValue[] };
}

function decodeRestNumber(val?: FirestoreRestValue): number {
  if (!val) return 0;
  if (typeof val.doubleValue === 'number') return val.doubleValue;
  if (typeof val.integerValue === 'string') return Number(val.integerValue) || 0;
  return 0;
}

function euclideanDistance128(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < 128; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

export async function matchEventFacesServerSide(
  slug: string,
  guestEmbedding: number[]
): Promise<{
  eventId: string;
  title: string;
  similarityThreshold: number;
  matches: Array<{
    photo: Record<string, unknown>;
    imageUrl: string;
    thumbnailUrl: string;
    distance: number;
    confidence: number;
  }>;
} | null> {
  const cleanSlug = slug.trim().toLowerCase();
  if (!cleanSlug || guestEmbedding.length !== 128) return null;

  const db = getAdminFirestore();
  if (db) {
    const evtSnap = await db
      .collection('events')
      .where('slug', '==', cleanSlug)
      .where('isPublished', '==', true)
      .limit(1)
      .get();
    if (evtSnap.empty) return null;
    const evt = evtSnap.docs[0].data();
    const eventId = String(evt.id || evtSnap.docs[0].id);
    const threshold = Number(evt.similarityThreshold || 0.52);

    const [photosSnap, facesSnap, altFacesSnap] = await Promise.all([
      db.collection('events').doc(eventId).collection('photos').where('isPublished', '==', true).get(),
      db.collection('events').doc(eventId).collection('faces').where('isPublished', '==', true).get(),
      db.collection('events').doc(eventId).collection('faceEmbeddings').where('isPublished', '==', true).get(),
    ]);

    const photoMap = new Map<string, Record<string, unknown>>();
    photosSnap.docs.forEach((d) => {
      const p = d.data();
      photoMap.set(String(p.id || d.id), p);
    });

    const bestByPhoto = new Map<string, number>();
    for (const faceDoc of [...facesSnap.docs, ...altFacesSnap.docs]) {
      const f = faceDoc.data();
      const photoId = String(f.photoId || '');
      const vec = Array.isArray(f.embedding) ? (f.embedding as number[]) : [];
      if (!photoId || vec.length !== 128 || !photoMap.has(photoId)) continue;
      const dist = euclideanDistance128(guestEmbedding, vec);
      if (dist <= threshold) {
        const prev = bestByPhoto.get(photoId);
        if (prev === undefined || dist < prev) {
          bestByPhoto.set(photoId, dist);
        }
      }
    }

    const matches = Array.from(bestByPhoto.entries())
      .map(([photoId, distance]) => {
        const p = photoMap.get(photoId)!;
        const fallbackUrl = `/api/media/events/${eventId}/photos/${photoId}`;
        const imageUrl = typeof p.storageUrl === 'string' && p.storageUrl ? p.storageUrl : fallbackUrl;
        const thumbnailUrl =
          typeof p.thumbnailUrl === 'string' && p.thumbnailUrl ? p.thumbnailUrl : imageUrl;
        const confidence = Math.max(
          50,
          Math.min(99, Math.round((1 - distance / (threshold + 0.35)) * 100))
        );
        return { photo: p, imageUrl, thumbnailUrl, distance, confidence };
      })
      .sort((a, b) => a.distance - b.distance);

    return {
      eventId,
      title: String(evt.title || 'Wedding Gallery'),
      similarityThreshold: threshold,
      matches,
    };
  }

  // Fallback via public Firestore REST queries (restricted strictly to isPublished == true)
  const baseDocEndpoint = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    firebaseConfig.projectId
  )}/databases/${encodeURIComponent(FIRESTORE_DATABASE_ID)}/documents`;

  const evtRes = await fetch(`${baseDocEndpoint}:runQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'events' }],
        where: {
          compositeFilter: {
            op: 'AND',
            filters: [
              { fieldFilter: { field: { fieldPath: 'slug' }, op: 'EQUAL', value: { stringValue: cleanSlug } } },
              { fieldFilter: { field: { fieldPath: 'isPublished' }, op: 'EQUAL', value: { booleanValue: true } } },
            ],
          },
        },
        limit: 1,
      },
    }),
  });
  if (!evtRes.ok) return null;
  const evtRows = (await evtRes.json()) as Array<{ document?: { fields?: Record<string, FirestoreRestValue> } }>;
  const evtFields = evtRows[0]?.document?.fields;
  if (!evtFields) return null;

  const eventId = evtFields.id?.stringValue || '';
  if (!isSafeId(eventId)) return null;
  const threshold = decodeRestNumber(evtFields.similarityThreshold) || 0.52;

  const querySubcollection = async (subName: string) => {
    const r = await fetch(`${baseDocEndpoint}/events/${encodeURIComponent(eventId)}:runQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: subName }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'isPublished' },
              op: 'EQUAL',
              value: { booleanValue: true },
            },
          },
          limit: 2000,
        },
      }),
    });
    if (!r.ok) return [];
    const json = (await r.json()) as Array<{ document?: { fields?: Record<string, FirestoreRestValue> } }>;
    return json.map((x) => x.document?.fields).filter(Boolean) as Array<Record<string, FirestoreRestValue>>;
  };

  const [photoRows, faceRows] = await Promise.all([
    querySubcollection('photos'),
    querySubcollection('faces'),
  ]);

  const photoMap = new Map<string, Record<string, unknown>>();
  for (const pf of photoRows) {
    const id = pf.id?.stringValue || '';
    if (!id) continue;
    photoMap.set(id, {
      id,
      eventId,
      ownerUid: pf.ownerUid?.stringValue || '',
      isPublished: true,
      driveFileId: pf.driveFileId?.stringValue || '',
      fileName: pf.fileName?.stringValue || `${id}.jpg`,
      mimeType: pf.mimeType?.stringValue || 'image/jpeg',
      fileSize: decodeRestNumber(pf.fileSize),
      faceStatus: pf.faceStatus?.stringValue || 'processed',
      faceCount: decodeRestNumber(pf.faceCount),
      thumbnailUrl: pf.thumbnailUrl?.stringValue || '',
      storageUrl: pf.storageUrl?.stringValue || '',
    });
  }

  const bestByPhoto = new Map<string, number>();
  for (const ff of faceRows) {
    const photoId = ff.photoId?.stringValue || '';
    const values = ff.embedding?.arrayValue?.values || [];
    if (!photoId || values.length !== 128 || !photoMap.has(photoId)) continue;
    const vec = values.map((v) => decodeRestNumber(v));
    const dist = euclideanDistance128(guestEmbedding, vec);
    if (dist <= threshold) {
      const prev = bestByPhoto.get(photoId);
      if (prev === undefined || dist < prev) {
        bestByPhoto.set(photoId, dist);
      }
    }
  }

  const matches = Array.from(bestByPhoto.entries())
    .map(([photoId, distance]) => {
      const p = photoMap.get(photoId)!;
      const fallbackUrl = `/api/media/events/${eventId}/photos/${photoId}`;
      const imageUrl = typeof p.storageUrl === 'string' && p.storageUrl ? p.storageUrl : fallbackUrl;
      const thumbnailUrl =
        typeof p.thumbnailUrl === 'string' && p.thumbnailUrl ? p.thumbnailUrl : imageUrl;
      const confidence = Math.max(
        50,
        Math.min(99, Math.round((1 - distance / (threshold + 0.35)) * 100))
      );
      return { photo: p, imageUrl, thumbnailUrl, distance, confidence };
    })
    .sort((a, b) => a.distance - b.distance);

  return {
    eventId,
    title: evtFields.title?.stringValue || 'Wedding Gallery',
    similarityThreshold: threshold,
    matches,
  };
}
