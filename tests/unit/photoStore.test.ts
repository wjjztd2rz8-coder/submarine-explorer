import { PHOTO_FRAMES } from '../../src/game/Cosmetics.js';
import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { canvasThumbnail } from '../../src/ui/PhotoMode.js';
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
  it.each(['YQ==', 'YWI=', 'YWJj', 'YQ', 'YWI'])(
    'retains decodable legacy base64 %s with or without padding',
    (payload) => {
      const storage = new MemoryStorage();
      const old = photo(1, { image: `data:image/jpeg;base64,${payload}` });
      storage.map.set(PHOTO_STORAGE_KEY, JSON.stringify({ version: 1, photos: [old] }));
      expect(new PhotoStore(storage).photos).toEqual([old]);
    },
  );

  it.each(['', 'not!base64', 'A', 'YQ=', 'YQ===', 'Y=Q='])(
    'drops a damaged image payload %j while retaining and round-tripping old photos',
    (payload) => {
      const storage = new MemoryStorage();
      const damaged = photo(2, { image: `data:image/jpeg;base64,${payload}` });
      storage.map.set(
        PHOTO_STORAGE_KEY,
        JSON.stringify({ version: 1, photos: [damaged, photo(1)] }),
      );
      const store = new PhotoStore(storage);
      expect(store.photos).toEqual([photo(1)]);
      expect(() => atob(store.photos[0]!.image.split(',')[1]!)).not.toThrow();
      expect(store.save(damaged).saved).toBe(false);
      expect(store.save(photo(3))).toEqual({ saved: true, dropped: 0 });
      expect(new PhotoStore(storage).photos).toEqual([photo(3), photo(1)]);
    },
  );

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

  it.each(['QuotaExceededError', 'NS_ERROR_DOM_QUOTA_REACHED'])(
    'evicts exactly the oldest photos at byte boundaries after %s, including the count limit',
    (name) => {
      for (const retained of [1, 5, PHOTO_LIMIT - 1, PHOTO_LIMIT]) {
        const storage = new MemoryStorage();
        const old = Array.from({ length: PHOTO_LIMIT }, (_, i) => photo(PHOTO_LIMIT - i));
        storage.map.set(PHOTO_STORAGE_KEY, JSON.stringify({ version: 1, photos: old }));
        const discoveries = '{"version":1,"discovered":{},"stats":{"scans":0}}';
        storage.map.set(DISCOVERY_STORAGE_KEY, discoveries);
        const store = new PhotoStore(storage);
        const capture = photo(99, { image: `data:image/jpeg;base64,${'A'.repeat(200)}` });
        const expected = [capture, ...old.slice(0, retained - 1)];
        const fits = JSON.stringify({ version: 1, photos: expected }).length;
        const write = vi.spyOn(storage, 'setItem').mockImplementation((key, value) => {
          if (value.length > fits) throw new DOMException('Full', name);
          storage.map.set(key, value);
        });
        expect(store.save(capture)).toEqual({ saved: true, dropped: PHOTO_LIMIT + 1 - retained });
        expect(store.photos).toEqual(expected);
        expect(new PhotoStore(storage).photos).toEqual(expected);
        expect(storage.getItem(DISCOVERY_STORAGE_KEY)).toBe(discoveries);
        write.mockRestore();
      }
    },
  );

  it('leaves a full collection byte-for-byte intact when an oversized capture cannot fit, then recovers', () => {
    const storage = new MemoryStorage();
    const old = Array.from({ length: PHOTO_LIMIT }, (_, i) => photo(PHOTO_LIMIT - i));
    const original = JSON.stringify({ version: 1, photos: old });
    storage.map.set(PHOTO_STORAGE_KEY, original);
    storage.limit = JSON.stringify({ version: 1, photos: [photo(99), ...old.slice(0, -1)] }).length;
    const store = new PhotoStore(storage);
    const oversized = photo(99, {
      image: `data:image/jpeg;base64,${'A'.repeat(original.length * 4)}`,
    });
    expect(store.save(oversized)).toMatchObject({
      saved: false,
      error: expect.stringMatching(/full/i),
    });
    expect(store.photos).toEqual(old);
    expect(storage.getItem(PHOTO_STORAGE_KEY)).toBe(original);
    expect(new PhotoStore(storage).photos).toEqual(old);
    expect(store.delete(old.at(-1)!.id)).toBe(true);
    expect(store.save(photo(99))).toEqual({ saved: true, dropped: 0 });
    expect(new PhotoStore(storage).photos).toEqual([photo(99), ...old.slice(0, -1)]);
  });

  it('loads only valid photos before applying the count limit to an overfull legacy collection', () => {
    const storage = new MemoryStorage();
    const old = Array.from({ length: PHOTO_LIMIT + 3 }, (_, i) => photo(30 - i));
    const original = JSON.stringify({
      version: 1,
      photos: [null, { id: 'damaged' }, photo(99, { depthM: -1 }), ...old],
    });
    storage.map.set(PHOTO_STORAGE_KEY, original);
    const store = new PhotoStore(storage);
    expect(store.photos).toEqual(old.slice(0, PHOTO_LIMIT));
    expect(storage.getItem(PHOTO_STORAGE_KEY)).toBe(original);
    expect(store.save(photo(100))).toEqual({ saved: true, dropped: 1 });
    expect(new PhotoStore(storage).photos).toEqual([photo(100), ...old.slice(0, PHOTO_LIMIT - 1)]);
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

  it('does not report a save or deletion when storage silently drops the write', () => {
    const storage = new MemoryStorage();
    const store = new PhotoStore(storage);
    store.save(photo(1));
    const write = vi.spyOn(storage, 'setItem').mockImplementation(() => {});
    expect(store.save(photo(2)).saved).toBe(false);
    expect(store.photos.map((p) => p.id)).toEqual(['p1']);
    expect(store.delete('p1')).toBe(false);
    expect(store.photos).toEqual(new PhotoStore(storage).photos);
    write.mockRestore();
    expect(store.save(photo(2))).toEqual({ saved: true, dropped: 0 });
    expect(store.delete('p1')).toBe(true);
    expect(new PhotoStore(storage).photos.map((p) => p.id)).toEqual(['p2']);
  });

  it('does not evict existing photos after a transient non-quota write error', () => {
    const storage = new MemoryStorage();
    const store = new PhotoStore(storage);
    store.save(photo(1));
    store.save(photo(2));
    const write = vi.spyOn(storage, 'setItem');
    write.mockImplementationOnce(() => {
      throw new DOMException('Storage temporarily denied', 'SecurityError');
    });
    expect(store.save(photo(3)).saved).toBe(false);
    expect(write).toHaveBeenCalledTimes(1);
    expect(store.photos.map((p) => p.id)).toEqual(['p2', 'p1']);
    expect(new PhotoStore(storage).photos).toEqual(store.photos);
    expect(store.save(photo(3))).toEqual({ saved: true, dropped: 0 });
    expect(new PhotoStore(storage).photos.map((p) => p.id)).toEqual(['p3', 'p2', 'p1']);
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

it('bakes only the selected cosmetic frame into a new capture and keeps stock captures unchanged', () => {
  const context = { drawImage: vi.fn(), strokeRect: vi.fn(), strokeStyle: '', lineWidth: 0 };
  const encoded = 'data:image/jpeg;base64,framed';
  const output = { width: 0, height: 0, getContext: () => context, toDataURL: () => encoded };
  vi.stubGlobal('document', { createElement: () => output });
  try {
    const source = { width: 1280, height: 720 } as HTMLCanvasElement;
    expect(canvasThumbnail(source)).toBe(encoded);
    expect(context.strokeRect).not.toHaveBeenCalled();
    expect(canvasThumbnail(source, undefined, undefined, 'gold')).toBe(encoded);
    expect(context.drawImage).toHaveBeenLastCalledWith(source, 0, 0, 1280, 720, 0, 0, 640, 360);
    expect(context.strokeStyle).toBe('#d4b46b');
    expect(context.strokeRect).toHaveBeenCalledExactlyOnceWith(4, 4, 632, 352);
  } finally {
    vi.unstubAllGlobals();
  }
});

it.each([
  { width: 8192, height: 1, expected: [640, 1] },
  { width: 1, height: 8192, expected: [1, 8192] },
  { width: 390, height: 844, expected: [390, 844] },
  { width: 844, height: 390, expected: [640, 296] },
])(
  'preserves extreme capture aspect ratios for the Journal: $width × $height',
  ({ width, height, expected }) => {
    const context = { drawImage: vi.fn() };
    const output = {
      width: 0,
      height: 0,
      getContext: () => context,
      toDataURL: vi.fn(() => 'data:image/jpeg;base64,YQ=='),
    };
    vi.stubGlobal('document', { createElement: () => output });
    try {
      const source = { width, height } as HTMLCanvasElement;
      expect(canvasThumbnail(source)).toBe('data:image/jpeg;base64,YQ==');
      expect([output.width, output.height]).toEqual(expected);
      expect(context.drawImage).toHaveBeenCalledExactlyOnceWith(
        source,
        0,
        0,
        width,
        height,
        0,
        0,
        ...expected,
      );
      expect(output.toDataURL).toHaveBeenCalledExactlyOnceWith('image/jpeg', 0.76);
    } finally {
      vi.unstubAllGlobals();
    }
  },
);

it.each(['context', 'encoder', 'empty canvas'])(
  'reports a missing capture when the %s is unavailable',
  (missing) => {
    const drawImage = vi.fn();
    const output = {
      width: 0,
      height: 0,
      getContext: () => (missing === 'context' ? null : { drawImage }),
      toDataURL: () => (missing === 'encoder' ? 'data:,' : 'data:image/jpeg;base64,YQ=='),
    };
    vi.stubGlobal('document', { createElement: () => output });
    try {
      expect(
        canvasThumbnail({
          width: missing === 'empty canvas' ? 0 : 1280,
          height: 720,
        } as HTMLCanvasElement),
      ).toBeNull();
      if (missing !== 'encoder') expect(drawImage).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  },
);

it('crops a portrait frame to a 4:3 band around the subject and keeps it in the frame', () => {
  const context = { drawImage: vi.fn() };
  const output = {
    width: 0,
    height: 0,
    getContext: () => context,
    toDataURL: () => 'data:image/jpeg;base64,band',
  };
  vi.stubGlobal('document', { createElement: () => output });
  try {
    const source = { width: 400, height: 800 } as HTMLCanvasElement;
    canvasThumbnail(source, undefined, undefined, 'stock', 0.5);
    expect(context.drawImage).toHaveBeenLastCalledWith(source, 0, 250, 400, 300, 0, 0, 400, 300);
    canvasThumbnail(source, undefined, undefined, 'stock', 0.05);
    expect(context.drawImage).toHaveBeenLastCalledWith(source, 0, 0, 400, 300, 0, 0, 400, 300);
    canvasThumbnail(source, undefined, undefined, 'stock', 0.99);
    expect(context.drawImage).toHaveBeenLastCalledWith(source, 0, 500, 400, 300, 0, 0, 400, 300);
    // A landscape frame is already wider than 4:3 allows: it is never cropped.
    const wide = { width: 1280, height: 720 } as HTMLCanvasElement;
    canvasThumbnail(wide, undefined, undefined, 'stock', 0.5);
    expect(context.drawImage).toHaveBeenLastCalledWith(wide, 0, 0, 1280, 720, 0, 0, 640, 360);
  } finally {
    vi.unstubAllGlobals();
  }
});

it.each(PHOTO_FRAMES)('captures the selected $id photo frame', (frame) => {
  const context = { drawImage: vi.fn(), strokeRect: vi.fn(), strokeStyle: '', lineWidth: 0 };
  const output = {
    width: 0,
    height: 0,
    getContext: () => context,
    toDataURL: () => 'data:image/jpeg;base64,capture',
  };
  vi.stubGlobal('document', { createElement: () => output });
  try {
    canvasThumbnail(
      { width: 1280, height: 720 } as HTMLCanvasElement,
      undefined,
      undefined,
      frame.id,
    );
    if (frame.color) {
      expect(context.strokeStyle).toBe(frame.color);
      expect(context.strokeRect).toHaveBeenCalledExactlyOnceWith(4, 4, 632, 352);
    } else expect(context.strokeRect).not.toHaveBeenCalled();
  } finally {
    vi.unstubAllGlobals();
  }
});
