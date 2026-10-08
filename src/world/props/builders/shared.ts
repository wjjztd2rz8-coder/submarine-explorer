/**
 * Shared helpers for the procedural prop builders: the built-prop shape,
 * seeded hashing / PRNG / value noise, and geometry utilities. Pure maths
 * plus three.js geometry, so everything here is testable headlessly.
 * Split out of `world/props/Procedural.ts` (F0-CORE).
 */

import * as THREE from 'three';
import type { ProceduralPropKind, PropsConfig } from '../../../core/Config.js';
import type { PropDef } from '../../PropLoader.js';

export interface BuiltProp {
  /** Full-detail object. */
  full: THREE.Object3D;
  /** Cheap stand-in shown between the LOD distance and the cull distance. */
  impostor: THREE.Object3D;
  /** Local-space bounds of `full` (before the prop's own scale). */
  bounds: THREE.Box3;
  /**
   * Optional compound collision boxes in the local, unscaled frame (hand-built
   * wrecks). When present and the entry's collision is `box`, each becomes its
   * own collider instead of one box around `bounds`.
   */
  colliders?: THREE.Box3[];
}

/** Signature for terrain-following debris: local (x, z) -> ground Y relative to the prop origin. */
export type LocalHeightFn = (x: number, z: number) => number;

// ------------------------------------------------------------------ seeding

/** FNV-1a 32-bit hash; stable seed from a prop id. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: tiny, fast, good-enough PRNG returning [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash-based 3D value noise in [0, 1], smooth, seeded. */
export function valueNoise3(x: number, y: number, z: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = x - xi;
  const yf = y - yi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const w = zf * zf * (3 - 2 * zf);
  const h = (i: number, j: number, k: number): number => {
    let n = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(k, 2147483647) ^ seed;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
  const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
  const x00 = lerp(h(xi, yi, zi), h(xi + 1, yi, zi), u);
  const x10 = lerp(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), u);
  const x01 = lerp(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), u);
  const x11 = lerp(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), u);
  return lerp(lerp(x00, x10, v), lerp(x01, x11, v), w);
}

// ---------------------------------------------------------------- geometry

/**
 * World-scale box-projected UVs: side faces run u along the horizontal axis and
 * v up the height, top faces use x/z. `repeatM` metres per texture repeat.
 */
export function projectUVs(geom: THREE.BufferGeometry, repeatM: number): void {
  const pos = geom.getAttribute('position');
  const nrm = geom.getAttribute('normal');
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const ax = Math.abs(nrm.getX(i));
    const ay = Math.abs(nrm.getY(i));
    const az = Math.abs(nrm.getZ(i));
    let u: number;
    let v: number;
    if (ay >= ax && ay >= az) {
      u = x;
      v = z;
    } else if (ax >= az) {
      u = z;
      v = y;
    } else {
      u = x;
      v = y;
    }
    uv[i * 2] = u / repeatM;
    uv[i * 2 + 1] = v / repeatM;
  }
  geom.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

/** Strip to the attributes every piece shares so they can be merged. */
export function normalise(geom: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = geom.index ? geom.toNonIndexed() : geom;
  for (const name of Object.keys(g.attributes)) {
    if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
  }
  g.clearGroups();
  return g;
}

// ---------------------------------------------------------------- registry

/** Everything a family builder may use to build one procedural prop. */
export interface ProceduralBuildInput {
  /** The validated props.json entry. */
  def: PropDef;
  /** `dimensions_m`, or the kind's default from `PropsConfig.defaultDimensionsM`. */
  dims: readonly [number, number, number];
  /** Stable seed from the prop id (`hashString`). */
  seed: number;
  cfg: PropsConfig;
  /** Graphics tier (`low` / `medium` / `high` / `ultra`); detail budgets key off it. */
  tier: string;
  /**
   * Terrain-following in the prop's local frame (local x, z -> ground Y), or
   * undefined when the prop does not snap. Computed on demand.
   */
  groundHeight(): LocalHeightFn | undefined;
  /** Optional supporting seabed finish; Beebe's apron shares its world-space shading. */
  seabedMaterial?: THREE.MeshStandardMaterial;
}

/** One `procedural:<kind>` builder. Must be deterministic from `seed`. */
export type ProceduralBuilder = (input: ProceduralBuildInput) => BuiltProp;

/** A family's builders by kind (see `builders/index.ts`). */
export type ProceduralBuilderMap = Partial<Record<ProceduralPropKind, ProceduralBuilder>>;
