import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  PHOTO_LIMIT,
  PHOTO_STORAGE_KEY,
  PhotoStore,
  poiInPhoto,
  type Photo,
  type PhotoStorage,
} from '../../src/game/PhotoStore.js';
import type { PlacedPoi } from '../../src/game/Pois.js';
import { DISCOVERY_STORAGE_KEY } from '../../src/game/DiscoveryStore.js';

class MemoryStorage implements PhotoStorage {
  map = new Map<string, string>();
  /** Throw a quota error when a write is longer than this. */
  limit = Infinity;
  getItem(k: string): string | null {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    if (v.length > this.limit) {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    }
    this.map.set(k, v);
  }
}

function photo(n: number, extra: Partial<Photo> = {}): Photo {
  return {
    id: `p${n}`,
    image: `data:image/jpeg;base64,${'A'.repeat(100)}`,
    siteId: 'titanic',
    siteName: 'RMS Titanic',
    poiId: 'titanic-bow',
    poiName: 'Bow section',
    at: new Date(Date.UTC(2026, 8, 24, 10, n)).toISOString(),
    depthM: 3790,
    ...extra,
  };
}

function saved(storage: MemoryStorage): { version: number; photos: Photo[] } {
  return JSON.parse(storage.getItem(PHOTO_STORAGE_KEY)!) as { version: number; photos: Photo[] };
}

describe('PhotoStore', () => {
  it('saves newest first under its own versioned key and reloads', () => {
    const storage = new MemoryStorage();
    storage.map.set(DISCOVERY_STORAGE_KEY, '{"version":1,"discovered":{},"stats":{"scans":0}}');
    const store = new PhotoStore(storage);
    expect(store.save(photo(1))).toEqual({ saved: true, dropped: 0 });
    expect(store.save(photo(2, { poiId: null, poiName: null }))).toEqual({
      saved: true,
      dropped: 0,
    });
    expect(store.photos.map((p) => p.id)).toEqual(['p2', 'p1']);
    expect(saved(storage).version).toBe(1);
    expect(new PhotoStore(storage).photos.map((p) => p.id)).toEqual(['p2', 'p1']);
    // Discoveries are never touched.
    expect(storage.getItem(DISCOVERY_STORAGE_KEY)).toBe(
      '{"version":1,"discovered":{},"stats":{"scans":0}}',
    );
  });

  it(`keeps the ${PHOTO_LIMIT} most recent and reports the dropped oldest`, () => {
    const storage = new MemoryStorage();
    const store = new PhotoStore(storage);
    for (let i = 0; i < PHOTO_LIMIT; i++) expect(store.save(photo(i)).saved).toBe(true);
    expect(store.save(photo(PHOTO_LIMIT))).toEqual({ saved: true, dropped: 1 });
    expect(store.photos).toHaveLength(PHOTO_LIMIT);
    expect(store.photos[0]!.id).toBe(`p${PHOTO_LIMIT}`);
    expect(store.photos.some((p) => p.id === 'p0')).toBe(false);
    expect(saved(storage).photos).toHaveLength(PHOTO_LIMIT);
  });

  it('on a quota error drops the oldest photos until the new one fits', () => {
    const storage = new MemoryStorage();
    const store = new PhotoStore(storage);
    for (let i = 0; i < 5; i++) store.save(photo(i));
    const onePhoto = JSON.stringify({ version: 1, photos: [photo(9)] }).length;
    storage.limit = onePhoto * 3; // room for about three
    const result = store.save(photo(9));
    expect(result.saved).toBe(true);
    if (result.saved) expect(result.dropped).toBeGreaterThanOrEqual(3);
    expect(store.photos[0]!.id).toBe('p9');
    expect(saved(storage).photos.map((p) => p.id)).toEqual(store.photos.map((p) => p.id));
    expect(store.photos.map((p) => p.id)).not.toContain('p0');
  });

  it('fails clearly and keeps the collection when not even one photo fits', () => {
    const storage = new MemoryStorage();
    const store = new PhotoStore(storage);
    store.save(photo(1));
    storage.limit = 10;
    const result = store.save(photo(2));
    expect(result.saved).toBe(false);
    if (!result.saved) expect(result.error).toMatch(/full/i);
    expect(store.photos.map((p) => p.id)).toEqual(['p1']);
    expect(saved(storage).photos.map((p) => p.id)).toEqual(['p1']);
  });

  it('survives corrupt, malformed and partly invalid data', () => {
    for (const raw of ['{not json', 'null', '[]', '{"version":1,"photos":"x"}', '{"photos":[]}']) {
      const storage = new MemoryStorage();
      storage.map.set(PHOTO_STORAGE_KEY, raw);
      const store = new PhotoStore(storage);
      expect(store.photos).toEqual([]);
      expect(store.save(photo(1)).saved).toBe(true);
    }
    const storage = new MemoryStorage();
    storage.map.set(
      PHOTO_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        photos: [photo(1), { id: 'bad' }, photo(2, { image: 'javascript:alert(1)' }), photo(3)],
      }),
    );
    expect(new PhotoStore(storage).photos.map((p) => p.id)).toEqual(['p1', 'p3']);
  });

  it('treats a newer save format as read-only and missing storage as a clear failure', () => {
    const storage = new MemoryStorage();
    const future = JSON.stringify({ version: 2, photos: [] });
    storage.map.set(PHOTO_STORAGE_KEY, future);
    const store = new PhotoStore(storage);
    expect(store.save(photo(1)).saved).toBe(false);
    expect(storage.getItem(PHOTO_STORAGE_KEY)).toBe(future);
    const none = new PhotoStore(null);
    const result = none.save(photo(1));
    expect(result.saved).toBe(false);
    if (!result.saved) expect(result.error).toMatch(/unavailable/i);
    const throwing = new PhotoStore({
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('SecurityError');
      },
    });
    expect(throwing.photos).toEqual([]);
    expect(throwing.save(photo(1)).saved).toBe(false);
  });

  it('deletes one photo and persists the rest', () => {
    const storage = new MemoryStorage();
    const store = new PhotoStore(storage);
    store.save(photo(1));
    store.save(photo(2));
    expect(store.delete('p1')).toBe(true);
    expect(store.delete('missing')).toBe(false);
    expect(new PhotoStore(storage).photos.map((p) => p.id)).toEqual(['p2']);
  });
});

describe('poiInPhoto', () => {
  const poi = (id: string, x: number, y: number, z: number) =>
    ({ id, name: id, position: new Vector3(x, y, z) }) as unknown as PlacedPoi;
  const camera = new PerspectiveCamera(60, 16 / 9, 0.1, 5000);
  camera.position.set(0, 0, 50);
  camera.lookAt(0, 0, 0);

  it('picks the in-frame POI nearest the frame centre', () => {
    const pois = [poi('edge', 20, 0, 0), poi('centre', 2, 1, 0), poi('behind', 0, 0, 80)];
    expect(poiInPhoto(camera, pois)?.id).toBe('centre');
  });

  it('ignores POIs outside the frame or too far, then falls back to the orbit target', () => {
    const pois = [poi('off-frame', 400, 0, 0), poi('far', 0, 0, -900)];
    expect(poiInPhoto(camera, pois)).toBeNull();
    const near = [poi('beside-target', 0, 0, 55)]; // just behind the camera
    expect(poiInPhoto(camera, near, new Vector3(0, 0, 0), 500, 60)?.id).toBe('beside-target');
    expect(poiInPhoto(camera, near, new Vector3(0, 0, 0), 500, 10)).toBeNull();
  });
});
