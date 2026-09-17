/**
 * Shared test helpers: build a synthetic in-memory tile and a fake fetch, so the
 * unit tests exercise the real parsing/meshing code without touching the network
 * or the filesystem.
 */

import { METERS_PER_DEG_LAT, metersPerDegLon } from '../../src/util/geo.js';
import type { FetchLike } from '../../src/world/TileLoader.js';
import type { Tile, TileMeta } from '../../src/util/types.js';

export interface SyntheticTileOptions {
  id?: string;
  cols?: number;
  rows?: number;
  centerLat?: number;
  centerLon?: number;
  cellsizeDeg?: number;
  /** Height at (col, row) in metres. Defaults to a simple tilted plane. */
  height?: (col: number, row: number) => number;
}

export function makeSyntheticTile(options: SyntheticTileOptions = {}): Tile {
  const {
    id = 'test',
    cols = 8,
    rows = 6,
    centerLat = 41.73,
    centerLon = -49.95,
    cellsizeDeg = 0.001,
    height = (c, r) => -3000 - c * 10 - r * 20,
  } = options;

  const heights = new Float32Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) heights[r * cols + c] = height(c, r);
  }

  const halfLat = (rows * cellsizeDeg) / 2;
  const halfLon = (cols * cellsizeDeg) / 2;
  let min = Infinity;
  let max = -Infinity;
  for (const v of heights) {
    if (v < min) min = v;
    if (v > max) max = v;
  }

  const meta: TileMeta = {
    id,
    source: 'synthetic',
    source_url: 'test',
    fetched_at: '2026-01-01T00:00:00Z',
    bbox: {
      north: centerLat + halfLat,
      south: centerLat - halfLat,
      east: centerLon + halfLon,
      west: centerLon - halfLon,
    },
    cols,
    rows,
    cellsize_deg: cellsizeDeg,
    cellsize_m_x: cellsizeDeg * metersPerDegLon(centerLat),
    cellsize_m_y: cellsizeDeg * METERS_PER_DEG_LAT,
    min_m: min,
    max_m: max,
    nodata_count: 0,
    center: { lat: centerLat, lon: centerLon },
    attribution: 'synthetic test fixture',
  };

  return { meta, heights };
}

/** Serialise a tile exactly as the Python pipeline writes it (LE Float32). */
export function encodeHeightmap(heights: Float32Array): ArrayBuffer {
  const buf = new ArrayBuffer(heights.length * 4);
  const view = new DataView(buf);
  for (let i = 0; i < heights.length; i++) view.setFloat32(i * 4, heights[i] as number, true);
  return buf;
}

/** A FetchLike serving one synthetic tile plus an index. */
export function makeFakeFetch(tile: Tile, root = '/data/tiles'): FetchLike {
  const bin = encodeHeightmap(tile.heights);
  const routes: Record<string, () => { json: unknown; buffer: ArrayBuffer | null }> = {
    [`${root}/index.json`]: () => ({
      json: { tiles: [{ id: tile.meta.id, cols: tile.meta.cols, rows: tile.meta.rows }] },
      buffer: null,
    }),
    [`${root}/${tile.meta.id}/meta.json`]: () => ({ json: tile.meta, buffer: null }),
    [`${root}/${tile.meta.id}/heightmap.bin`]: () => ({ json: null, buffer: bin }),
  };

  return async (input: string) => {
    const route = routes[input];
    if (!route) {
      return {
        ok: false,
        status: 404,
        json: async () => ({}),
        arrayBuffer: async () => new ArrayBuffer(0),
      };
    }
    const { json, buffer } = route();
    return {
      ok: true,
      status: 200,
      json: async () => json,
      arrayBuffer: async () => buffer ?? new ArrayBuffer(0),
    };
  };
}
