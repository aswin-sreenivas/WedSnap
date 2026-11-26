import * as faceapi from '@vladmandic/face-api';
import { EventPhoto, FaceEmbedding, MatchedPhotoResult } from '../types/wedsnap';

let modelsLoadPromise: Promise<void> | null = null;

export interface ExtractedFace {
  embedding: number[];
  boxX: number;
  boxY: number;
  boxWidth: number;
  boxHeight: number;
  detectionScore: number;
}

export async function ensureFaceModelsLoaded(): Promise<void> {
  if (!modelsLoadPromise) {
    modelsLoadPromise = (async () => {
      const modelBase = '/models';
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(modelBase),
        faceapi.nets.faceLandmark68Net.loadFromUri(modelBase),
        faceapi.nets.faceRecognitionNet.loadFromUri(modelBase),
      ]);
    })().catch((err) => {
      modelsLoadPromise = null;
      throw err;
    });
  }
  return modelsLoadPromise;
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Unable to load photograph for face analysis.'));
    img.src = src;
  });
}

export async function detectAllFacesFromUrl(imageUrl: string): Promise<ExtractedFace[]> {
  await ensureFaceModelsLoaded();
  const img = await loadImageElement(imageUrl);

  const detections = await faceapi
    .detectAllFaces(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.45, maxResults: 50 }))
    .withFaceLandmarks()
    .withFaceDescriptors();

  return detections.map((det) => ({
    embedding: Array.from(det.descriptor),
    boxX: Math.round(det.detection.box.x),
    boxY: Math.round(det.detection.box.y),
    boxWidth: Math.round(det.detection.box.width),
    boxHeight: Math.round(det.detection.box.height),
    detectionScore: Number(det.detection.score.toFixed(4)),
  }));
}

export async function extractGuestSelfieEmbedding(
  input: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement | string
): Promise<{ embedding: number[]; detectedCount: number }> {
  await ensureFaceModelsLoaded();

  const element = typeof input === 'string' ? await loadImageElement(input) : input;

  const detections = await faceapi
    .detectAllFaces(element, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.45 }))
    .withFaceLandmarks()
    .withFaceDescriptors();

  if (detections.length === 0) {
    throw new Error(
      'No face was clearly detected. Please center your face inside the circular guide in even lighting and try again.'
    );
  }

  // Choose the largest / most prominent face when multiple people appear behind the guest
  const sorted = [...detections].sort((a, b) => {
    const areaA = a.detection.box.width * a.detection.box.height;
    const areaB = b.detection.box.width * b.detection.box.height;
    return areaB - areaA;
  });

  return {
    embedding: Array.from(sorted[0].descriptor),
    detectedCount: detections.length,
  };
}

export function euclideanDistance(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < len; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

export function distanceToConfidence(distance: number): number {
  // Typical same-person Euclidean distance in 128-d FaceNet space is 0.25 - 0.55
  const score = Math.round(Math.max(0, Math.min(99, (1 - distance / 1.05) * 100)));
  return score;
}

export function matchGuestEmbedding(
  guestEmbedding: number[],
  photos: EventPhoto[],
  faces: FaceEmbedding[],
  threshold: number
): MatchedPhotoResult[] {
  const photoMap = new Map<string, EventPhoto>();
  for (const photo of photos) {
    photoMap.set(photo.id, photo);
  }

  const bestDistanceByPhoto = new Map<string, number>();

  for (const face of faces) {
    if (!Array.isArray(face.embedding) || face.embedding.length !== 128) continue;
    const dist = euclideanDistance(guestEmbedding, face.embedding);
    if (dist <= threshold) {
      const prev = bestDistanceByPhoto.get(face.photoId);
      if (prev === undefined || dist < prev) {
        bestDistanceByPhoto.set(face.photoId, dist);
      }
    }
  }

  const results: MatchedPhotoResult[] = [];
  for (const [photoId, dist] of bestDistanceByPhoto.entries()) {
    const photo = photoMap.get(photoId);
    if (!photo) continue;
    const fallbackUrl = `/api/media/events/${photo.eventId}/photos/${photo.id}`;
    const imageUrl = photo.storageUrl || fallbackUrl;
    const thumbnailUrl = photo.thumbnailUrl || imageUrl;
    results.push({
      photo,
      imageUrl,
      thumbnailUrl,
      distance: dist,
      confidence: distanceToConfidence(dist),
    });
  }

  results.sort((a, b) => a.distance - b.distance);
  return results;
}
