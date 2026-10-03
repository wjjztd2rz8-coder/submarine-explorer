/**
 * Loads tiles produced by tools/fetch_tile.py.
 *
 * On-disk layout (see docs/tile-format.md):
 *   /data/tiles/<id>/meta.json       metadata
 *   /data/tiles/<id>/heightmap.bin   little-endian Float32, row-major, north row first
 *   /data/tiles/<id>/heightmap16.bin optional uint16 variant (opt-in, see TileLoaderOptions)
 *   /data/tiles/index.json           list of available tiles
 *
 * Those paths are served by Vite via the `public/data -> ../data` symlink.
 */

import type { Tile, TileIndex, TileIndexEntry, TileMeta } from '../util/types.js';
import { publicUrl } from '../util/publicUrl.js';

export const DEFAULT_TILE_ROOT = publicUrl('/data/tiles');

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

/** Reject invalid sampling geometry before an untrusted tile reaches meshing. */
export function validateMeta(raw: unknown, tileId: string): TileMeta {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new TileLoadError('meta.json is not an object', tileId);
  }
  const m = raw as Record<string, unknown>;
  for (const key of REQUIRED_META_KEYS) {
    if (m[key] === undefined) throw new TileLoadError(`meta.json is missing "${key}"`, tileId);
  }
  const { cols, rows } = m;
  if (
    typeof cols !== 'number' ||
    typeof rows !== 'number' ||
    !Number.isSafeInteger(cols) ||
    !Number.isSafeInteger(rows) ||
    cols < 2 ||
    rows < 2 ||
    !Number.isSafeInteger(cols * rows * 4)
  ) {
    throw new TileLoadError(`meta.json has a bad grid size ${cols}x${rows}`, tileId);
  }
  const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  for (const key of ['cellsize_m_x', 'cellsize_m_y']) {
    if (!finite(m[key]) || m[key] <= 0)
      throw new TileLoadError(`meta.json has invalid "${key}"`, tileId);
  }
  const bbox = m.bbox as Partial<TileMeta['bbox']> | null;
  const center = m.center as Partial<TileMeta['center']> | null;
  if (
    !bbox ||
    !finite(bbox.north) ||
    !finite(bbox.south) ||
    !finite(bbox.east) ||
    !finite(bbox.west) ||
    bbox.south < -90 ||
    bbox.north > 90 ||
    bbox.south >= bbox.north ||
    bbox.west < -180 ||
    bbox.east > 180 ||
    bbox.west >= bbox.east
  )
    throw new TileLoadError('meta.json has invalid bbox', tileId);
  if (
    !center ||
    !finite(center.lat) ||
    !finite(center.lon) ||
    center.lat < bbox.south ||
    center.lat > bbox.north ||
    center.lon < bbox.west ||
    center.lon > bbox.east
  )
    throw new TileLoadError('meta.json has invalid center', tileId);
  if (!finite(m.min_m) || !finite(m.max_m) || m.min_m > m.max_m)
    throw new TileLoadError('meta.json has invalid min_m/max_m', tileId);
  return raw as TileMeta;
}

function validateHeights(heights: Float32Array, tileId: string): Float32Array {
  for (let i = 0; i < heights.length; i++) {
    if (!Number.isFinite(heights[i]))
      throw new TileLoadError(`heightmap has nonfinite sample at index ${i}`, tileId);
  }
  return heights;
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
  if (isLittleEndian()) return validateHeights(new Float32Array(buffer), meta.id);

  const view = new DataView(buffer);
  const out = new Float32Array(meta.cols * meta.rows);
  for (let i = 0; i < out.length; i++) out[i] = view.getFloat32(i * 4, true);
  return validateHeights(out, meta.id);
}

/**
 * Decode the optional 16-bit quantised heightmap (`heightmap16.bin`):
 * little-endian uint16, same row order, metres = quant_min_m + q * quant_scale.
 */
export function decodeHeightmap16(buffer: ArrayBuffer, meta: TileMeta): Float32Array {
  const { quant_min_m: min, quant_scale: scale } = meta;
  if (
    typeof min !== 'number' ||
    !Number.isFinite(min) ||
    typeof scale !== 'number' ||
    !Number.isFinite(scale) ||
    !(scale > 0)
  ) {
    throw new TileLoadError('meta.json has no valid quant_min_m/quant_scale', meta.id);
  }
  const n = meta.cols * meta.rows;
  if (buffer.byteLength !== n * 2) {
    throw new TileLoadError(
      `heightmap16.bin is ${buffer.byteLength} bytes, expected ${n * 2} ` +
        `(${meta.cols}x${meta.rows} uint16)`,
      meta.id,
    );
  }
  const view = new DataView(buffer);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = min + view.getUint16(i * 2, true) * scale;
  return validateHeights(out, meta.id);
}

/** True if meta.json advertises a 16-bit variant. */
export function hasHeightmap16(meta: TileMeta): boolean {
  return typeof meta.quant_min_m === 'number' && typeof meta.quant_scale === 'number';
}

let littleEndian: boolean | null = null;
function isLittleEndian(): boolean {
  if (littleEndian === null) {
    const probe = new Uint16Array([0x0102]);
    littleEndian = new Uint8Array(probe.buffer)[0] === 0x02;
  }
  return littleEndian;
}

export interface TileLoaderOptions {
  /**
   * Fetch `heightmap16.bin` (half the bytes, <= quant_scale/2 error) when the
   * tile's meta.json advertises it, falling back to float32 on any failure.
   * Default false: float32 `heightmap.bin` is the canonical path.
   */
  prefer16?: boolean;
}

export class TileLoader {
  constructor(
    private readonly root: string = DEFAULT_TILE_ROOT,
    private readonly fetchFn: FetchLike = (input) =>
      fetch(input) as unknown as ReturnType<FetchLike>,
    private readonly options: TileLoaderOptions = {},
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

    if (this.options.prefer16 && hasHeightmap16(meta)) {
      try {
        const res16 = await this.fetchFn(`${base}/heightmap16.bin`);
        if (res16.ok) return { meta, heights: decodeHeightmap16(await res16.arrayBuffer(), meta) };
      } catch {
        // Fall through to the canonical float32 heightmap.
      }
    }

    const binRes = await this.fetchFn(`${base}/heightmap.bin`);
    if (!binRes.ok) {
      throw new TileLoadError(`could not fetch ${base}/heightmap.bin (${binRes.status})`, tileId);
    }
    const heights = decodeHeightmap(await binRes.arrayBuffer(), meta);

    return { meta, heights };
  }
}
