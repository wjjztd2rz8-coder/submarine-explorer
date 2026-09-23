import { describe, expect, it } from 'vitest';
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
  it('loads a synthetic tile end to end', async () => {
    const tile = makeSyntheticTile({ id: 'fixture', cols: 5, rows: 4 });
    const loader = new TileLoader('/data/tiles', makeFakeFetch(tile));

    const loaded = await loader.load('fixture');
    expect(loaded.meta.id).toBe('fixture');
    expect(loaded.meta.cols).toBe(5);
    expect(loaded.heights.length).toBe(20);
    expect(Array.from(loaded.heights)).toEqual(Array.from(tile.heights));
  });

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
      const loader = new TileLoader('/data/tiles', fetchWith16(quantTile, buffer, seen), {
        prefer16: true,
      });
      const loaded = await loader.load('q16');
      expect(seen).toContain('/data/tiles/q16/heightmap16.bin');
      expect(seen).not.toContain('/data/tiles/q16/heightmap.bin');
      expect(loaded.heights[34]).toBeCloseTo(tile.heights[34] as number, 1);
    });

    it('falls back to float32 when heightmap16.bin is missing or meta lacks quant keys', async () => {
      const seenMissing: string[] = [];
      const a = await new TileLoader('/data/tiles', fetchWith16(quantTile, null, seenMissing), {
        prefer16: true,
      }).load('q16');
      expect(seenMissing).toContain('/data/tiles/q16/heightmap.bin');
      expect(Array.from(a.heights)).toEqual(Array.from(tile.heights));

      const seenPlain: string[] = [];
      await new TileLoader('/data/tiles', fetchWith16(tile, buffer, seenPlain), {
        prefer16: true,
      }).load('q16');
      expect(seenPlain).not.toContain('/data/tiles/q16/heightmap16.bin');
    });
  });
});
