/**
 * Deterministic placement of scatter instances for one square cell of the seabed.
 *
 * A cell is a pure function of (tile seed, cell index, biome, tier density,
 * ground): the same cell always yields the same instances, in the same order, so
 * the layer can be created and dropped as the camera moves and always look the
 * same. Nothing here touches Three's GPU objects, so it runs (and is tested)
 * under Node.
 *
 * Ground rules per kind (`ScatterSpec` in TerrainBiome.ts): slope limit,
 * preference for the soft bed or hard substrate (using the same slope thresholds
 * as the seabed shader), and clumping by noise blobs plus explicit clumps.
 */

import type { Biome, ScatterKind, ScatterSpec } from '../TerrainBiome.js';
import { valueNoise2 } from '../TerrainNoise.js';
import { SCATTER_TYPES } from './ScatterTypes.js';

/** What placement needs to know about the ground. Implemented by `Terrain`. */
export interface ScatterGround {
  sampleHeight(x: number, z: number): number;
  /** Writes an upward unit normal into `out` (x, y, z). */
  normalAt(x: number, z: number, out: [number, number, number]): void;
  contains(x: number, z: number): boolean;
}

/** One instance, in world space. `nx,ny,nz` is the ground normal to lean toward. */
export interface ScatterInstance {
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** Lean axis-angle: tilt about (tiltX, 0, tiltZ) by `tilt` radians. */
  tiltX: number;
  tiltZ: number;
  tilt: number;
  sx: number;
  sy: number;
  sz: number;
  r: number;
  g: number;
  b: number;
}

export interface CellOptions {
  cellSizeM: number;
  /** Multiplier on every spec's density (tier). */
  density: number;
  /** Rock thresholds as `1 - cos(slope)`, matching the shader's uRockLo/uRockHi. */
  rockLo: number;
  rockHi: number;
  seed: number;
  /** Skip a position (props, wrecks). */
  exclude?: (x: number, z: number) => boolean;
}

export type CellResult = Partial<Record<ScatterKind, ScatterInstance[]>>;

/** mulberry32. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cellSeed(cx: number, cz: number, seed: number, salt: number): number {
  let h =
    Math.imul(cx | 0, 374761393) ^
    Math.imul(cz | 0, 668265263) ^
    Math.imul(seed | 0, 1442695041) ^
    Math.imul(salt, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

const KIND_SALT: Record<ScatterKind, number> = {
  boulder: 1,
  dropstone: 2,
  pillow: 3,
  rubble: 4,
  sponge: 5,
  seapen: 6,
  whip: 7,
  mound: 8,
};

/** Generate every instance of every kind in cell (cx, cz). */
export function placeCell(
  cx: number,
  cz: number,
  ground: ScatterGround,
  biome: Biome,
  opts: CellOptions,
): CellResult {
  const out: CellResult = {};
  if (opts.density <= 0) return out;
  const x0 = cx * opts.cellSizeM;
  const z0 = cz * opts.cellSizeM;
  const areaK = (opts.cellSizeM * opts.cellSizeM) / 1000;
  const n: [number, number, number] = [0, 1, 0];

  for (const spec of biome.scatter) {
    const def = SCATTER_TYPES[spec.kind];
    const rnd = makeRng(cellSeed(cx, cz, opts.seed, KIND_SALT[spec.kind]));
    const meanClump = (def.clump[0] + def.clump[1]) / 2;
    // Expected clump seeds in this cell; the fractional part is a coin toss.
    const expected = (spec.density * opts.density * areaK) / meanClump;
    let seeds = Math.floor(expected);
    if (rnd() < expected - seeds) seeds++;
    if (seeds <= 0) continue;
    const list: ScatterInstance[] = [];
    // Patch noise is a world-space field so clumps do not stop at cell edges.
    const noiseSalt = opts.seed + KIND_SALT[spec.kind] * 977;
    // Rejection sampling may need extra tries for patchy kinds.
    const tries = seeds * (2 + Math.round(def.patchiness * 6));
    let placed = 0;
    for (let t = 0; t < tries && placed < seeds * 2; t++) {
      if (placed >= seeds && def.patchiness === 0) break;
      const x = x0 + rnd() * opts.cellSizeM;
      const z = z0 + rnd() * opts.cellSizeM;
      if (!accept(x, z, spec, def.patchiness, def.patchScaleM, noiseSalt, ground, opts, rnd, n))
        continue;
      placed++;
      const members = def.clump[0] + Math.floor(rnd() * (def.clump[1] - def.clump[0] + 1));
      for (let m = 0; m < members; m++) {
        let mx = x;
        let mz = z;
        if (m > 0) {
          const a = rnd() * Math.PI * 2;
          const d = Math.sqrt(rnd()) * def.clumpRadiusM;
          mx = x + Math.cos(a) * d;
          mz = z + Math.sin(a) * d;
          if (!ground.contains(mx, mz) || opts.exclude?.(mx, mz)) continue;
          ground.normalAt(mx, mz, n);
          if (slopeDeg(n) > spec.slopeMaxDeg) continue;
        }
        list.push(makeInstance(mx, mz, def, ground, n, rnd, biome, spec.sizeMul ?? 1));
      }
      if (placed >= seeds) break;
    }
    if (list.length) out[spec.kind] = list;
  }
  return out;
}

function slopeDeg(n: [number, number, number]): number {
  return (Math.acos(Math.min(1, Math.max(-1, n[1]))) * 180) / Math.PI;
}

function accept(
  x: number,
  z: number,
  spec: ScatterSpec,
  patchiness: number,
  patchScaleM: number,
  noiseSalt: number,
  ground: ScatterGround,
  opts: CellOptions,
  rnd: () => number,
  n: [number, number, number],
): boolean {
  if (!ground.contains(x, z) || opts.exclude?.(x, z)) return false;
  ground.normalAt(x, z, n);
  if (slopeDeg(n) > spec.slopeMaxDeg) return false;
  const rockT = smoothstep(opts.rockLo, opts.rockHi, 1 - n[1]);
  if (spec.on === 'flat' && rnd() > 1 - rockT) return false;
  if (spec.on === 'rock' && rnd() > 0.12 + 0.88 * rockT) return false;
  if (patchiness > 0) {
    const v = valueNoise2(x / patchScaleM, z / patchScaleM, noiseSalt);
    if (rnd() > 1 - patchiness + patchiness * smoothstep(0.42, 0.68, v)) return false;
  }
  return true;
}

function makeInstance(
  x: number,
  z: number,
  def: (typeof SCATTER_TYPES)[ScatterKind],
  ground: ScatterGround,
  n: [number, number, number],
  rnd: () => number,
  biome: Biome,
  sizeMul = 1,
): ScatterInstance {
  const size =
    sizeMul * def.size[0] * Math.pow(def.size[1] / def.size[0], rnd() * rnd() * 0.5 + rnd() * 0.5);
  const hMul = def.height[0] + (def.height[1] - def.height[0]) * rnd();
  const y = ground.sampleHeight(x, z) - def.embed * size * hMul;
  // Lean toward the ground normal by `align`, then wobble randomly.
  const wob = (rnd() * 2 - 1) * def.wobble;
  const wa = rnd() * Math.PI * 2;
  const ax = n[0] * def.align + Math.cos(wa) * wob;
  const az = n[2] * def.align + Math.sin(wa) * wob;
  const tilt = Math.hypot(ax, az);
  const col: [number, number, number] = [1, 1, 1];
  def.color(biome, rnd, col);
  return {
    x,
    y,
    z,
    yaw: rnd() * Math.PI * 2,
    tiltX: tilt > 1e-6 ? az / tilt : 0,
    tiltZ: tilt > 1e-6 ? -ax / tilt : 0,
    tilt,
    sx: size * (0.85 + 0.3 * rnd()),
    sy: size * hMul,
    sz: size * (0.85 + 0.3 * rnd()),
    r: col[0],
    g: col[1],
    b: col[2],
  };
}
