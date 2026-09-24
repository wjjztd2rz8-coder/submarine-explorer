/** Offline HYCOM samples in tile-local metres. +X is east; +Z is south. */
import { publicUrl } from '../util/publicUrl.js';

export interface CurrentGrid {
  version: 1;
  site: string;
  tile: string;
  source: {
    name: string;
    url: string;
    sampled_at: string;
    fetched_at: string;
    license: string;
    depth_m: number;
  };
  bounds: { x_min: number; x_max: number; z_min: number; z_max: number };
  cols: number;
  rows: number;
  /** [north-to-south row][west-to-east column], east/north m/s; null is masked. */
  vectors: (readonly [number, number] | null)[][];
}

export interface CurrentVector {
  x: number;
  y: number;
  z: number;
}

export type CurrentStatus = 'loading' | 'ready' | 'missing';

export function validateCurrentGrid(raw: unknown, site: string, tile = site): CurrentGrid | null {
  if (!raw || typeof raw !== 'object') return null;
  const g = raw as Partial<CurrentGrid>;
  if (g.version !== 1 || g.site !== site || g.tile !== tile) return null;
  const s = g.source;
  if (
    !s ||
    !s.name ||
    !s.url ||
    !s.sampled_at ||
    !s.fetched_at ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(s.sampled_at) ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(s.fetched_at) ||
    !s.license ||
    !Number.isFinite(s.depth_m) ||
    s.depth_m < 0
  )
    return null;
  const b = g.bounds;
  if (
    !b ||
    !Number.isFinite(b.x_min) ||
    !Number.isFinite(b.x_max) ||
    !Number.isFinite(b.z_min) ||
    !Number.isFinite(b.z_max) ||
    !(b.x_min < b.x_max) ||
    !(b.z_min < b.z_max)
  )
    return null;
  if (
    !Number.isInteger(g.cols) ||
    !Number.isInteger(g.rows) ||
    (g.cols ?? 0) < 2 ||
    (g.rows ?? 0) < 2
  )
    return null;
  if (!Array.isArray(g.vectors) || g.vectors.length !== g.rows) return null;
  for (const row of g.vectors) {
    if (!Array.isArray(row) || row.length !== g.cols) return null;
    for (const value of row) {
      if (value === null) continue;
      if (
        !Array.isArray(value) ||
        value.length !== 2 ||
        !value.every((v) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 3)
      )
        return null;
    }
  }
  return g as CurrentGrid;
}

/** Bilinear interpolation; masked corners contribute zero rather than invented flow. */
export function sampleCurrentGrid(
  grid: CurrentGrid,
  x: number,
  z: number,
  out: CurrentVector,
): CurrentVector {
  out.x = out.y = out.z = 0;
  if (!Number.isFinite(x) || !Number.isFinite(z)) return out;
  const b = grid.bounds;
  const gx = Math.max(
    0,
    Math.min(grid.cols - 1, ((x - b.x_min) / (b.x_max - b.x_min)) * (grid.cols - 1)),
  );
  const gz = Math.max(
    0,
    Math.min(grid.rows - 1, ((z - b.z_min) / (b.z_max - b.z_min)) * (grid.rows - 1)),
  );
  const col = Math.min(grid.cols - 2, Math.floor(gx));
  const row = Math.min(grid.rows - 2, Math.floor(gz));
  const tx = gx - col;
  const tz = gz - row;
  const corners = [
    [row, col, (1 - tx) * (1 - tz)],
    [row, col + 1, tx * (1 - tz)],
    [row + 1, col, (1 - tx) * tz],
    [row + 1, col + 1, tx * tz],
  ] as const;
  for (const [r, c, weight] of corners) {
    const v = grid.vectors[r]![c];
    if (v) {
      out.x += v[0] * weight;
      out.z -= v[1] * weight;
    }
  }
  return out;
}

/** Keep an added current impulse inside the tile and away from rising terrain. */
export function guardCurrentDelta(
  delta: CurrentVector,
  position: CurrentVector,
  velocity: CurrentVector,
  terrain: { widthM: number; depthM: number; sampleHeight(x: number, z: number): number },
  floorFor: (ground: number) => number,
  lookaheadS: number,
  clearanceM: number,
): CurrentVector {
  if (delta.x === 0 && delta.y === 0 && delta.z === 0) return delta;
  const x = position.x + (velocity.x + delta.x) * lookaheadS;
  const z = position.z + (velocity.z + delta.z) * lookaheadS;
  if ((x > terrain.widthM / 2 && delta.x > 0) || (x < -terrain.widthM / 2 && delta.x < 0))
    delta.x = 0;
  if ((z > terrain.depthM / 2 && delta.z > 0) || (z < -terrain.depthM / 2 && delta.z < 0))
    delta.z = 0;
  const nextX = position.x + (velocity.x + delta.x) * lookaheadS;
  const nextZ = position.z + (velocity.z + delta.z) * lookaheadS;
  const floor = floorFor(terrain.sampleHeight(nextX, nextZ));
  if (position.y + (velocity.y + delta.y) * lookaheadS < floor + clearanceM) {
    // The ordinary physics step still resolves an existing collision; this
    // guard ensures the current cannot add velocity into the wall.
    delta.x = delta.y = delta.z = 0;
  }
  return delta;
}

/** A failed or malformed local JSON file is an explicit zero-current field. */
export class Currents {
  status: CurrentStatus = 'loading';
  grid: CurrentGrid | null = null;
  readonly ready: Promise<void>;

  constructor(
    readonly site: string,
    readonly tile: string,
    fetchJson: (url: string) => Promise<unknown>,
  ) {
    this.ready = fetchJson(publicUrl(`/data/currents/${site}.json`))
      .then((raw) => {
        this.grid = validateCurrentGrid(raw, site, tile);
        this.status = this.grid ? 'ready' : 'missing';
      })
      .catch(() => {
        this.status = 'missing';
      });
  }

  sample(x: number, z: number, out: CurrentVector): CurrentVector {
    if (this.grid) return sampleCurrentGrid(this.grid, x, z, out);
    out.x = out.y = out.z = 0;
    return out;
  }
}
