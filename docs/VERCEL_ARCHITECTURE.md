# WedSnap – Vercel Production Architecture & Operations Guide

## 1. Vercel Serverless & CDN Architecture
- **Frontend SPA (`dist/`)**: Built by Vite + React + TypeScript (`npm run build`), served from Vercel Edge CDN with immutable cache headers on `/assets/*`, `/models/*`, and `/src/assets/*`.
- **Server-Rendered Metadata (`/api/ssr.ts`)**: Handles `/`, public marketing routes, `/blog/*`, `/e/:slug`, private routes (`noindex, nofollow`), and HTTP `404` unknown routes using `server/generated/index.html` and `server/generated/ssr-manifest.json` emitted during Vite's `closeBundle` hook.
- **SEO Endpoints**: `/robots.txt` and `/sitemap.xml` rewrite to `/api/seo.ts` (`type=robots` / `type=sitemap`), computing canonical URLs from `APP_URL` / `VERCEL_PROJECT_PRODUCTION_URL`.
- **API Functions (7 total, Hobby-plan compatible)**: Consolidated domain routers (`api/ssr.ts`, `api/seo.ts`, `api/health.ts`, `api/contact.ts`, `api/events.ts`, `api/drive.ts`, `api/media.ts`) sharing `/server/lib/*` modules with local `server.ts` (`tsx server.ts`), routed via `vercel.json` `rewrites` so all existing API paths work unchanged.
- **Zero Filesystem Persistence**: Contact inquiries persist directly to Cloud Firestore (`/inquiries/{id}`); wedding photos and thumbnails use Google Drive + Firebase Storage (`storage.rules`) rather than local `/storage` files.

## 2. Cloud Firestore Data Model
- `/users/{userId}` – Organizer/photographer profile & role (`organizer | photographer | admin`)
- `/events/{eventId}` – Wedding metadata, visibility (`private | unlisted | directory`), threshold, `retentionDays`, `modelVersion`, `indexedAt`
- `/events/{eventId}/photos/{photoId}` – Drive source ID (`driveFileId` / `sourceFileId`), `width`, `height`, `thumbnailUrl`, `storageUrl`, `storagePath`, `thumbnailPath`, `processingStatus`, `faceCount`, `indexedAt`
- `/events/{eventId}/faces/{faceId}` (and `/faceEmbeddings/{faceId}`) – 128-d embeddings + normalized bounding boxes
- `/events/{eventId}/indexingJobs/{jobId}` – Idempotent indexing queue (`pending | processing | completed | failed`), `attempts`, `maxAttempts`, `lastError`, timestamps
- `/events/{eventId}/analytics/{recordId}` – Non-PII daily aggregate counts
- `/inquiries/{inquiryId}` – Persistent contact inquiries (admin-read only)
- `/appSettings/{settingId}` – Admin-only retention and active model settings

## 3. Additional Google Cloud Services Required for Full Background Automation
- **Cloud Firestore + Firebase Storage**: Requires upgrading from AI Studio Starter Tier to a billing-enabled Firebase/GCP project (`gen-lang-client-0308362197`) if activating Firebase Storage buckets or granting IAM roles for `FIREBASE_SERVICE_ACCOUNT_JSON`.
- **Background Worker (Cloud Run / Cloud Tasks / Cloud Functions)**: For weddings exceeding ~500 photos where browser-based indexing is inconvenient, deploy an external worker that calls `POST /api/jobs/process-pending` with `X-Worker-Secret: $WORKER_SHARED_SECRET`.
- **Large-Scale Vector Search (>50,000 faces/event)**: For ultra-large commercial galleries, sync embeddings from Firestore into a dedicated vector index (Vertex AI Vector Search or pgvector on Cloud SQL) rather than scanning every embedding document per request.

## 4. Backup & Retention Strategy
- Run `scripts/backup-firestore.sh` daily via Cloud Scheduler / GitHub Actions (`gcloud firestore export` to a versioned Cloud Storage bucket `BACKUP_BUCKET`).
- Deleting a wedding event executes `deleteWeddingEventCascade`, purging Firebase Storage thumbnails/display copies, `faces`, `photos`, `indexingJobs`, `analytics`, and server caches **without** modifying or deleting original photographs in the organizer's Google Drive (`drive.readonly`).
- Event-level `retentionDays` metadata governs scheduled archival/deletion policies.

## 5. Deployment Checklist
1. Configure Vercel Environment Variables (Production & Preview):
   - `APP_URL`, `VITE_FIREBASE_*`, `VITE_GA_MEASUREMENT_ID`
   - `FIREBASE_SERVICE_ACCOUNT_JSON`, `MEDIA_SIGNING_SECRET`, `WORKER_SHARED_SECRET`
   - Optional Studio OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
2. Deploy Firestore Rules & Indexes & Storage Rules:
   - `firebase deploy --only firestore:rules,firestore:indexes,storage`
3. Deploy Preview first (`vercel`), validate SSR/API/Auth/Drive/Scan, then promote to Production (`vercel --prod`).
