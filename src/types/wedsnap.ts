export type FaceStatus = 'pending' | 'processed' | 'no_faces' | 'failed';
export type ProcessingStatus = 'pending' | 'processing' | 'processed' | 'no_faces' | 'failed';
export type IndexingJobStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type EventVisibility = 'private' | 'unlisted' | 'directory';

export const ACTIVE_FACE_MODEL_VERSION = 'face-api-ssd-128d-v1';

export interface WeddingEvent {
  id: string;
  ownerUid: string;
  slug: string;
  title: string;
  coupleNames: string;
  eventDate: string;
  welcomeMessage: string;
  coverPhotoUrl: string;
  driveFolderId?: string;
  driveFolderName?: string;
  similarityThreshold: number;
  totalPhotos: number;
  processedPhotos: number;
  totalFaces: number;
  isPublished: boolean;
  discoverableInDirectory?: boolean;
  visibility?: EventVisibility;
  retentionDays?: number;
  modelVersion?: string;
  indexedAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface EventPhoto {
  id: string;
  eventId: string;
  ownerUid: string;
  isPublished: boolean;
  driveFileId: string;
  sourceFileId?: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  width?: number;
  height?: number;
  driveModifiedTime?: string;
  faceStatus: FaceStatus;
  processingStatus?: ProcessingStatus;
  faceCount: number;
  modelVersion?: string;
  thumbnailUrl?: string;
  storageUrl?: string;
  storagePath?: string;
  thumbnailPath?: string;
  indexedAt?: unknown;
  syncedAt?: unknown;
}

export interface FaceEmbedding {
  id: string;
  eventId: string;
  photoId: string;
  ownerUid: string;
  isPublished: boolean;
  embedding: number[];
  boxX: number;
  boxY: number;
  boxWidth: number;
  boxHeight: number;
  detectionScore: number;
  modelVersion?: string;
  createdAt?: unknown;
}

export interface IndexingJob {
  id: string;
  eventId: string;
  photoId: string;
  ownerUid: string;
  sourceFileId?: string;
  fileName?: string;
  status: IndexingJobStatus;
  attempts: number;
  maxAttempts: number;
  modelVersion: string;
  lastError?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  startedAt?: unknown;
  completedAt?: unknown;
}

export interface EventAnalytic {
  id: string;
  eventId: string;
  ownerUid: string;
  metricDate: string;
  scansCount: number;
  matchesFoundCount: number;
  downloadsCount: number;
  updatedAt?: unknown;
}

export interface MatchedPhotoResult {
  photo: EventPhoto;
  imageUrl: string;
  thumbnailUrl?: string;
  distance: number;
  confidence: number;
}

export interface DriveFolder {
  id: string;
  name: string;
  modifiedTime?: string;
  parents?: string[];
}

export interface DrivePhotoFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  modifiedTime: string;
}
