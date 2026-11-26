#!/usr/bin/env bash
set -euo pipefail

# Scheduled Cloud Firestore backup script for WedSnap
# Run daily via Cloud Scheduler / GitHub Actions / CI against a user-owned GCP project.

PROJECT_ID="${FIREBASE_PROJECT_ID:-gen-lang-client-0308362197}"
DATABASE_ID="${FIRESTORE_DATABASE_ID:-ai-studio-01a91cff-3af0-434e-90dc-93a0f4f9374e}"
BACKUP_BUCKET="${BACKUP_BUCKET:?Set BACKUP_BUCKET (e.g. gs://wedsnap-firestore-backups)}"
STAMP="$(date -u +%Y-%m-%dT%H%M%SZ)"
DEST="${BACKUP_BUCKET%/}/firestore/${STAMP}"

echo "Starting Firestore export for project=${PROJECT_ID} database=${DATABASE_ID} -> ${DEST}"

gcloud firestore export "${DEST}" \
  --project="${PROJECT_ID}" \
  --database="${DATABASE_ID}" \
  --collection-ids="users,events,photos,faces,faceEmbeddings,indexingJobs,analytics,inquiries,appSettings"

echo "Backup export triggered successfully: ${DEST}"
echo "To restore into a staging database:"
echo "  gcloud firestore import ${DEST} --project=${PROJECT_ID} --database=${DATABASE_ID}"
