import { PerspectiveCamera, Vector3 } from 'three';
import type { PlacedPoi } from './Pois.js';

export const PHOTO_STORAGE_KEY = 'subexplorer.photos.v1';
export const PHOTO_LIMIT = 24;

export interface Photo {
  id: string;
  image: string;
  siteId: string;
  siteName: string;
  poiId: string | null;
  poiName: string | null;
  at: string;
  depthM: number;
}

export interface PhotoStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type PhotoSaveResult = { saved: true; dropped: number } | { saved: false; error: string };

function safeStorage(): PhotoStorage | null {
  try {
    return (globalThis as { localStorage?: PhotoStorage }).localStorage ?? null;
  } catch {
    return null;
  }
}

function isPhoto(value: unknown): value is Photo {
  if (!value || typeof value !== 'object') return false;
  const p = value as Partial<Photo>;
  return (
    typeof p.id === 'string' &&
    typeof p.image === 'string' &&
    p.image.startsWith('data:image/jpeg;base64,') &&
    typeof p.siteId === 'string' &&
    typeof p.siteName === 'string' &&
    (p.poiId === null || typeof p.poiId === 'string') &&
    (p.poiName === null || typeof p.poiName === 'string') &&
    typeof p.at === 'string' &&
    !Number.isNaN(Date.parse(p.at)) &&
    typeof p.depthM === 'number' &&
    Number.isFinite(p.depthM) &&
    p.depthM >= 0
  );
}

/** A separate journal collection: scans and discoveries are never read or written here. */
export class PhotoStore {
  private photos_: Photo[] = [];
  private readonly storage: PhotoStorage | null;
  private readOnly = false;

  constructor(storage: PhotoStorage | null = safeStorage()) {
    this.storage = storage;
    try {
      const raw = storage?.getItem(PHOTO_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { version?: number; photos?: unknown };
      if (typeof parsed.version === 'number' && parsed.version > 1) {
        this.readOnly = true;
        return;
      }
      if (parsed.version !== 1 || !Array.isArray(parsed.photos)) return;
      this.photos_ = parsed.photos.filter(isPhoto).slice(0, PHOTO_LIMIT);
    } catch {
      // Broken or inaccessible storage leaves an empty, usable gallery.
    }
  }

  get photos(): readonly Photo[] {
    return this.photos_;
  }

  save(photo: Photo): PhotoSaveResult {
    if (!isPhoto(photo)) return { saved: false, error: 'This photo could not be saved.' };
    if (this.readOnly)
      return { saved: false, error: 'Photos use a newer save format in this browser.' };
    if (!this.storage) return { saved: false, error: 'Photo storage is unavailable.' };
    const next = [photo, ...this.photos_];
    let dropped = Math.max(0, next.length - PHOTO_LIMIT);
    next.length = Math.min(next.length, PHOTO_LIMIT);
    while (next.length) {
      try {
        this.storage.setItem(PHOTO_STORAGE_KEY, JSON.stringify({ version: 1, photos: next }));
        this.photos_ = next;
        return { saved: true, dropped };
      } catch {
        if (next.length === 1) break;
        next.pop();
        dropped++;
      }
    }
    return { saved: false, error: 'Photo storage is full. Delete photos and try again.' };
  }

  delete(id: string): boolean {
    if (this.readOnly || !this.storage) return false;
    const next = this.photos_.filter((photo) => photo.id !== id);
    if (next.length === this.photos_.length) return false;
    try {
      this.storage.setItem(PHOTO_STORAGE_KEY, JSON.stringify({ version: 1, photos: next }));
      this.photos_ = next;
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * The POI a photograph is "of": among POIs within `maxDistanceM` of the camera
 * that project inside the central 85% of the frame, the one nearest the frame
 * centre; failing that, the POI nearest the orbit `target` within
 * `nearTargetM`. Null when neither applies.
 */
export function poiInPhoto(
  camera: PerspectiveCamera,
  pois: readonly PlacedPoi[],
  target: Vector3 | null = null,
  maxDistanceM = 500,
  nearTargetM = 150,
): PlacedPoi | null {
  camera.updateMatrixWorld();
  const forward = camera.getWorldDirection(new Vector3());
  const toward = new Vector3();
  const p = new Vector3();
  let best: PlacedPoi | null = null;
  let bestScore = Infinity;
  for (const poi of pois) {
    toward.copy(poi.position).sub(camera.position);
    if (toward.length() > maxDistanceM || toward.dot(forward) <= 0) continue;
    p.copy(poi.position).project(camera);
    if (Math.abs(p.x) > 0.85 || Math.abs(p.y) > 0.85 || p.z < -1 || p.z > 1) continue;
    const score = p.x * p.x + p.y * p.y;
    if (score < bestScore) {
      best = poi;
      bestScore = score;
    }
  }
  if (best || !target) return best;
  let nearest = nearTargetM;
  for (const poi of pois) {
    const d = poi.position.distanceTo(target);
    if (d <= nearest) {
      best = poi;
      nearest = d;
    }
  }
  return best;
}
