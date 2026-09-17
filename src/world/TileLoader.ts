/**
 * Loads tiles produced by tools/fetch_tile.py.
 *
 * On-disk layout (see docs/tile-format.md):
 *   /data/tiles/<id>/meta.json       metadata
 *   /data/tiles/<id>/heightmap.bin   little-endian Float32, row-major, north row first
 *   /data/tiles/index.json           list of available tiles
 *
 * Those paths are served by Vite via the `public/data -> ../data` symlink.
 */

import type { Tile, TileIndex, TileIndexEntry, TileMeta } from '../util/types.js';

export const DEFAULT_TILE_ROOT = '/data/tiles';

export class TileLoadError extends Error {
  constructor(
    message: string,
    readonly tileId: string,
  ) {
    super(message);
    this.name = 'TileLoadError';
  }
}

/** Minimal fetch surface, so tests can inject a fake without a DOM. */
export type FetchLike = (input: string) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  arrayBuffer(): Promise<ArrayBuffer>;
}>;

const REQUIRED_META_KEYS = ['id', 'cols', 'rows', 'bbox', 'center', 'cellsize_m_x', 'cellsize_m_y'];

/** Validate an untrusted JSON blob as a TileMeta. Throws on anything missing. */
export function validateMeta(raw: unknown, tileId: string): TileMeta {
  if (typeof raw !== 'object' || raw === null) {
    throw new TileLoadError('meta.json is not an object', tileId);
  }
  const m = raw as Record<string, unknown>;
  for (const key of REQUIRED_META_KEYS) {
    if (m[key] === undefined) throw new TileLoadError(`meta.json is missing "${key}"`, tileId);
  }
  const cols = Number(m.cols);
  const rows = Number(m.rows);
  if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 2 || rows < 2) {
    throw new TileLoadError(`meta.json has a bad grid size ${cols}x${rows}`, tileId);
  }
  return raw as TileMeta;
}

/**
 * Decode a heightmap buffer against its metadata.
 *
 * Exposed separately from {@link TileLoader.load} so tests can feed a synthetic
 * in-memory tile through exactly the same code path the network uses.
 */
export function decodeHeightmap(buffer: ArrayBuffer, meta: TileMeta): Float32Array {
  const expected = meta.cols * meta.rows * 4;
  if (buffer.byteLength !== expected) {
    throw new TileLoadError(
      `heightmap.bin is ${buffer.byteLength} bytes, expected ${expected} ` +
        `(${meta.cols}x${meta.rows} float32)`,
      meta.id,
    );
  }
  // The format is defined as LITTLE-endian. Every platform we target is
  // little-endian, so the fast path is a direct view; we verify that
  // assumption once and fall back to a byte-swapping read if it ever fails.
  if (isLittleEndian()) return new Float32Array(buffer);

  const view = new DataView(buffer);
  const out = new Float32Array(meta.cols * meta.rows);
  for (let i = 0; i < out.length; i++) out[i] = view.getFloat32(i * 4, true);
  return out;
}

let littleEndian: boolean | null = null;
function isLittleEndian(): boolean {
  if (littleEndian === null) {
    const probe = new Uint16Array([0x0102]);
    littleEndian = new Uint8Array(probe.buffer)[0] === 0x02;
  }
  return littleEndian;
}

export class TileLoader {
  constructor(
    private readonly root: string = DEFAULT_TILE_ROOT,
    private readonly fetchFn: FetchLike = (input) =>
      fetch(input) as unknown as ReturnType<FetchLike>,
  ) {}

  /** Load `index.json`. Returns an empty list if the pipeline has not run yet. */
  async loadIndex(): Promise<TileIndexEntry[]> {
    try {
      const res = await this.fetchFn(`${this.root}/index.json`);
      if (!res.ok) return [];
      const doc = (await res.json()) as TileIndex;
      return Array.isArray(doc?.tiles) ? doc.tiles : [];
    } catch {
      return [];
    }
  }

  /** Load one tile's metadata and heightmap. */
  async load(tileId: string): Promise<Tile> {
    const base = `${this.root}/${tileId}`;

    const metaRes = await this.fetchFn(`${base}/meta.json`);
    if (!metaRes.ok) {
      throw new TileLoadError(`could not fetch ${base}/meta.json (${metaRes.status})`, tileId);
    }
    const meta = validateMeta(await metaRes.json(), tileId);

    const binRes = await this.fetchFn(`${base}/heightmap.bin`);
    if (!binRes.ok) {
      throw new TileLoadError(`could not fetch ${base}/heightmap.bin (${binRes.status})`, tileId);
    }
    const heights = decodeHeightmap(await binRes.arrayBuffer(), meta);

    return { meta, heights };
  }
}
