import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  TileLoadError,
  TileLoader,
  decodeHeightmap,
  decodeHeightmap16,
  hasHeightmap16,
  validateMeta,
  type FetchLike,
} from '../../src/world/TileLoader.js';
import type { Tile } from '../../src/util/types.js';
import { encodeHeightmap, makeFakeFetch, makeSyntheticTile } from './helpers.js';
import { EventBus } from '../../src/core/EventBus.js';
import type { BootContext } from '../../src/app/context.js';

// Keep the real runtime error/cancellation boundary without constructing dive systems.
vi.mock('../../src/app/boot.js', () => ({ showFatal: vi.fn() }));
vi.mock('../../src/app/homeStartup.js', () => ({}));
vi.mock('../../src/app/systems.js', () => ({ createSystems: vi.fn(() => []) }));
import { startRuntime } from '../../src/app/startup.js';
import { showFatal } from '../../src/app/boot.js';
import { createSystems } from '../../src/app/systems.js';

function pending<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function diveContext(loader: TileLoader, tileId: string): BootContext {
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('document', {
    body: { append() {} },
    createElement: () => ({ append() {}, setAttribute() {}, remove() {} }),
  });
  return {
    app: { state: 'dive' },
    params: new URLSearchParams({ tile: tileId }),
    loader,
    tileId,
    bus: new EventBus(),
  } as BootContext;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

/** Quantise like tools/tile_writer.py quantize16 and serialise as LE uint16. */
function quantize16(tile: Tile): { buffer: ArrayBuffer; min: number; scale: number } {
  const min = tile.meta.min_m;
  const scale = (tile.meta.max_m - min) / 65535 || 1;
  const buffer = new ArrayBuffer(tile.heights.length * 2);
  const view = new DataView(buffer);
  tile.heights.forEach((v, i) => view.setUint16(i * 2, Math.round((v - min) / scale), true));
  return { buffer, min, scale };
}

/** makeFakeFetch plus an optional heightmap16.bin route; records requested URLs. */
function fetchWith16(tile: Tile, bin16: ArrayBuffer | null, seen: string[]): FetchLike {
  const base = makeFakeFetch(tile);
  return async (input: string) => {
    seen.push(input);
    if (bin16 && input === `/data/tiles/${tile.meta.id}/heightmap16.bin`) {
      return { ok: true, status: 200, json: async () => ({}), arrayBuffer: async () => bin16 };
    }
    return base(input);
  };
}

describe('TileLoader', () => {
  it('uses an explicit root unchanged', async () => {
    const urls: string[] = [];
    const loader = new TileLoader('https://tiles.example/custom', async (url) => {
      urls.push(url);
      return {
        ok: false,
        status: 404,
        json: async () => ({}),
        arrayBuffer: async () => new ArrayBuffer(0),
      };
    });
    await loader.loadIndex();
    expect(urls).toEqual(['https://tiles.example/custom/index.json']);
  });

  it('loads a synthetic tile end to end', async () => {
    const tile = makeSyntheticTile({ id: 'fixture', cols: 5, rows: 4 });
    const loader = new TileLoader('/data/tiles', makeFakeFetch(tile));

    const loaded = await loader.load('fixture');
    expect(loaded.meta.id).toBe('fixture');
    expect(loaded.meta.cols).toBe(5);
    expect(loaded.heights.length).toBe(20);
    expect(Array.from(loaded.heights)).toEqual(Array.from(tile.heights));
  });

  it('passes the dive lifetime signal to metadata and heightmap fetches', async () => {
    const tile = makeSyntheticTile({ id: 'fixture' });
    const controller = new AbortController();
    const original = makeFakeFetch(tile);
    const fetch = vi.fn<FetchLike>((url, options) => {
      expect(options?.signal).toBe(controller.signal);
      return original(url);
    });
    await new TileLoader('/data/tiles', fetch).load('fixture', controller.signal);
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      '/data/tiles/fixture/meta.json',
      '/data/tiles/fixture/heightmap.bin',
    ]);
  });

  it.each(['metadata request', 'metadata JSON', 'canonical request', 'canonical body'])(
    'reports a rejected %s at the runtime boundary and can load another tile',
    async (stage) => {
      const failed = makeSyntheticTile({ id: 'unavailable', cols: 2, rows: 3 });
      const recovered = makeSyntheticTile({
        id: 'independent',
        cols: 4,
        rows: 2,
        height: (c, r) => -100 - r * 4 - c,
      });
      const entered = pending<void>();
      const held = pending<never>();
      const error = stage === 'metadata JSON' ? new SyntaxError('invalid JSON') : new Error(stage);
      const target = stage.startsWith('metadata') ? 'meta.json' : 'heightmap.bin';
      const recoverySignal = new AbortController().signal;
      let failedSignal: AbortSignal | undefined;
      const fetch = vi.fn<FetchLike>(async (url, options) => {
        if (url.includes('/independent/')) {
          expect(options?.signal).toBe(recoverySignal);
          return makeFakeFetch(recovered)(url);
        }
        failedSignal ??= options?.signal;
        expect(options?.signal).toBe(failedSignal);
        const response = await makeFakeFetch(failed)(url);
        if (!url.endsWith(`/${target}`)) return response;
        const rejectLater = () => {
          entered.resolve();
          return held.promise;
        };
        if (stage.endsWith('request')) return rejectLater();
        return stage === 'metadata JSON'
          ? { ...response, json: rejectLater }
          : { ...response, arrayBuffer: rejectLater };
      });
      const loader = new TileLoader('/data/tiles', fetch);
      const ctx = diveContext(loader, failed.meta.id);
      const tileError = vi.fn();
      ctx.bus.on('tile:error', tileError);
      const starting = startRuntime(ctx);
      await entered.promise;
      expect(tileError).not.toHaveBeenCalled();
      held.reject(error);
      const dispose = await starting;
      expect(tileError).toHaveBeenCalledExactlyOnceWith({
        id: failed.meta.id,
        error: error.message,
      });
      expect(showFatal).toHaveBeenCalledOnce();
      expect(vi.mocked(showFatal).mock.calls[0][0]).toContain(error.message);
      expect(createSystems).not.toHaveBeenCalled();
      expect(window.__game).toBeUndefined();
      expect(failedSignal).toBeInstanceOf(AbortSignal);
      expect(failedSignal!.aborted).toBe(true);

      const loaded = await loader.load(recovered.meta.id, recoverySignal);
      expect(loaded.meta).toEqual(recovered.meta);
      expect(loaded.heights).toEqual(recovered.heights);
      expect(fetch.mock.calls.map(([url]) => url)).toEqual([
        '/data/tiles/unavailable/meta.json',
        ...(target === 'heightmap.bin' ? ['/data/tiles/unavailable/heightmap.bin'] : []),
        '/data/tiles/independent/meta.json',
        '/data/tiles/independent/heightmap.bin',
      ]);
      dispose();
    },
  );

  it('preserves row-major order with row 0 = north', async () => {
    // Encode a recognisable pattern: value == index.
    const tile = makeSyntheticTile({ cols: 4, rows: 3, height: (c, r) => r * 4 + c });
    const loader = new TileLoader('/data/tiles', makeFakeFetch(tile));
    const loaded = await loader.load(tile.meta.id);
    expect(Array.from(loaded.heights)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it('reads the tile index', async () => {
    const tile = makeSyntheticTile({ id: 'idx' });
    const loader = new TileLoader('/data/tiles', makeFakeFetch(tile));
    const index = await loader.loadIndex();
    expect(index.map((t) => t.id)).toEqual(['idx']);
  });

  it('returns an empty index when index.json is missing', async () => {
    const loader = new TileLoader('/data/tiles', async () => ({
      ok: false,
      status: 404,
      json: async () => ({}),
      arrayBuffer: async () => new ArrayBuffer(0),
    }));
    expect(await loader.loadIndex()).toEqual([]);
  });

  it('throws a TileLoadError for a missing tile', async () => {
    const tile = makeSyntheticTile({ id: 'present' });
    const loader = new TileLoader('/data/tiles', makeFakeFetch(tile));
    await expect(loader.load('absent')).rejects.toBeInstanceOf(TileLoadError);
  });

  it('decodes little-endian float32 regardless of buffer offset', () => {
    const tile = makeSyntheticTile({ cols: 3, rows: 2 });
    const buffer = encodeHeightmap(tile.heights);
    const decoded = decodeHeightmap(buffer, tile.meta);
    expect(Array.from(decoded)).toEqual(Array.from(tile.heights));
  });

  it('rejects a heightmap whose size disagrees with meta.json', () => {
    const tile = makeSyntheticTile({ cols: 3, rows: 2 });
    expect(() => decodeHeightmap(new ArrayBuffer(4), tile.meta)).toThrow(TileLoadError);
  });

  it('rejects malformed metadata', () => {
    expect(() => validateMeta(null, 'x')).toThrow(TileLoadError);
    expect(() => validateMeta({ id: 'x' }, 'x')).toThrow(/cols/);
    const { meta } = makeSyntheticTile();
    expect(() => validateMeta({ ...meta, cols: 1 }, 'x')).toThrow(/grid size/);
    expect(() => validateMeta({ ...meta, cellsize_m_x: 0 }, 'x')).toThrow(/cellsize_m_x/);
    expect(validateMeta(meta, 'x')).toBe(meta);
  });

  describe('optional 16-bit variant', () => {
    const tile = makeSyntheticTile({ id: 'q16', cols: 7, rows: 5 });
    const { buffer, min, scale } = quantize16(tile);
    const quantTile: Tile = {
      ...tile,
      meta: { ...tile.meta, quant_min_m: min, quant_scale: scale },
    };

    it('decodes uint16 back to metres within half a quantisation step', () => {
      const decoded = decodeHeightmap16(buffer, quantTile.meta);
      expect(decoded.length).toBe(35);
      decoded.forEach((v, i) => {
        expect(Math.abs(v - (tile.heights[i] as number))).toBeLessThanOrEqual(scale / 2 + 1e-3);
      });
    });

    it('rejects a wrong-sized buffer or missing quant keys', () => {
      expect(() => decodeHeightmap16(new ArrayBuffer(6), quantTile.meta)).toThrow(/uint16/);
      expect(() => decodeHeightmap16(buffer, tile.meta)).toThrow(TileLoadError);
      expect(hasHeightmap16(tile.meta)).toBe(false);
      expect(hasHeightmap16(quantTile.meta)).toBe(true);
    });

    it('keeps float32 as the default path even when a 16-bit file exists', async () => {
      const seen: string[] = [];
      const loaded = await new TileLoader('/data/tiles', fetchWith16(quantTile, buffer, seen)).load(
        'q16',
      );
      expect(seen).not.toContain('/data/tiles/q16/heightmap16.bin');
      expect(Array.from(loaded.heights)).toEqual(Array.from(tile.heights));
    });

    it('uses heightmap16.bin when prefer16 is set and meta advertises it', async () => {
      const seen: string[] = [];
      const signal = new AbortController().signal;
      const base = fetchWith16(quantTile, buffer, seen);
      const fetch: FetchLike = (url, options) => {
        expect(options?.signal).toBe(signal);
        return base(url, options);
      };
      const loader = new TileLoader('/data/tiles', fetch, {
        prefer16: true,
      });
      const loaded = await loader.load('q16', signal);
      expect(seen).toContain('/data/tiles/q16/heightmap16.bin');
      expect(seen).not.toContain('/data/tiles/q16/heightmap.bin');
      expect(loaded.heights[34]).toBeCloseTo(tile.heights[34] as number, 1);
    });

    it.each(['non-ok response', 'rejected request', 'rejected body', 'wrong-sized payload'])(
      'returns canonical metadata/heights after an optional %s',
      async (failure) => {
        const signal = new AbortController().signal;
        const entered = pending<void>();
        const response = pending<Awaited<ReturnType<FetchLike>>>();
        const bodyEntered = pending<void>();
        const body = pending<ArrayBuffer>();
        const readOptionalBody = vi.fn(() => {
          bodyEntered.resolve();
          return body.promise;
        });
        const fetch = vi.fn<FetchLike>((url, options) => {
          expect(options?.signal).toBe(signal);
          if (!url.endsWith('/heightmap16.bin')) return makeFakeFetch(quantTile)(url);
          entered.resolve();
          return response.promise;
        });
        const loading = new TileLoader('/data/tiles', fetch, { prefer16: true }).load(
          'q16',
          signal,
        );
        await entered.promise;
        expect(fetch.mock.calls.map(([url]) => url)).not.toContain('/data/tiles/q16/heightmap.bin');
        if (failure === 'rejected request') response.reject(new Error('optional request failed'));
        else {
          response.resolve({
            ok: failure !== 'non-ok response',
            status: failure === 'non-ok response' ? 503 : 200,
            json: async () => null,
            arrayBuffer: readOptionalBody,
          });
          if (failure !== 'non-ok response') {
            await bodyEntered.promise;
            if (failure === 'rejected body') body.reject(new Error('optional body failed'));
            else body.resolve(new ArrayBuffer(buffer.byteLength - 2));
          }
        }
        const loaded = await loading;
        expect(loaded.meta).toEqual(quantTile.meta);
        expect(loaded.heights).toEqual(tile.heights);
        expect(fetch.mock.calls.map(([url]) => url)).toEqual([
          '/data/tiles/q16/meta.json',
          '/data/tiles/q16/heightmap16.bin',
          '/data/tiles/q16/heightmap.bin',
        ]);
        expect(readOptionalBody).toHaveBeenCalledTimes(
          failure === 'non-ok response' || failure === 'rejected request' ? 0 : 1,
        );
      },
    );

    it.each(['request', 'body'])(
      'cancels optional %s IO at page teardown and keeps the next tile independent',
      async (stage) => {
        const entered = pending<void>();
        const held = pending<never>();
        const recovered = makeSyntheticTile({ id: 'independent', cols: 2, rows: 2 });
        const recoverySignal = new AbortController().signal;
        const readCanonicalBody = vi.fn();
        let cancelledSignal: AbortSignal | undefined;
        const fetch = vi.fn<FetchLike>(async (url, options) => {
          if (url.includes('/independent/')) {
            expect(options?.signal).toBe(recoverySignal);
            return makeFakeFetch(recovered)(url);
          }
          const signal = options?.signal;
          expect(signal).toBeInstanceOf(AbortSignal);
          cancelledSignal ??= signal;
          expect(signal).toBe(cancelledSignal);
          // Like native fetch, an already-aborted signal rejects before returning a body.
          signal!.throwIfAborted();
          if (url.endsWith('/heightmap16.bin')) {
            const waitForAbort = () => {
              signal!.addEventListener('abort', () => held.reject(signal!.reason), { once: true });
              entered.resolve();
              return held.promise;
            };
            if (stage === 'request') return waitForAbort();
            return { ok: true, status: 200, json: async () => null, arrayBuffer: waitForAbort };
          }
          const response = await makeFakeFetch(quantTile)(url);
          return url.endsWith('/heightmap.bin')
            ? { ...response, arrayBuffer: readCanonicalBody }
            : response;
        });
        const loader = new TileLoader('/data/tiles', fetch, { prefer16: true });
        const ctx = diveContext(loader, 'q16');
        const tileError = vi.fn();
        ctx.bus.on('tile:error', tileError);
        const starting = startRuntime(ctx);
        await entered.promise;
        window.dispatchEvent(new Event('pagehide'));
        const dispose = await starting;
        expect(cancelledSignal!.aborted).toBe(true);
        expect(tileError).not.toHaveBeenCalled();
        expect(showFatal).not.toHaveBeenCalled();
        expect(createSystems).not.toHaveBeenCalled();
        expect(window.__game).toBeUndefined();
        expect(readCanonicalBody).not.toHaveBeenCalled();
        for (const [, options] of fetch.mock.calls) {
          expect(options?.signal).toBe(cancelledSignal);
        }
        expect(fetch.mock.calls.slice(0, 2).map(([url]) => url)).toEqual([
          '/data/tiles/q16/meta.json',
          '/data/tiles/q16/heightmap16.bin',
        ]);
        const loaded = await loader.load(recovered.meta.id, recoverySignal);
        expect(loaded.meta).toEqual(recovered.meta);
        expect(loaded.heights).toEqual(recovered.heights);
        dispose();
      },
    );

    it('falls back to float32 when heightmap16.bin is missing or meta lacks quant keys', async () => {
      const seenMissing: string[] = [];
      const signal = new AbortController().signal;
      const missingFetch = vi.fn<FetchLike>(fetchWith16(quantTile, null, seenMissing));
      const a = await new TileLoader('/data/tiles', missingFetch, {
        prefer16: true,
      }).load('q16', signal);
      expect(seenMissing).toContain('/data/tiles/q16/heightmap.bin');
      expect(Array.from(a.heights)).toEqual(Array.from(tile.heights));
      for (const [, options] of missingFetch.mock.calls) expect(options?.signal).toBe(signal);

      const seenPlain: string[] = [];
      await new TileLoader('/data/tiles', fetchWith16(tile, buffer, seenPlain), {
        prefer16: true,
      }).load('q16');
      expect(seenPlain).not.toContain('/data/tiles/q16/heightmap16.bin');
    });
  });
});
