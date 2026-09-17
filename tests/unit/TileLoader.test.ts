import { describe, expect, it } from 'vitest';
import {
  TileLoadError,
  TileLoader,
  decodeHeightmap,
  validateMeta,
} from '../../src/world/TileLoader.js';
import { encodeHeightmap, makeFakeFetch, makeSyntheticTile } from './helpers.js';

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
});
