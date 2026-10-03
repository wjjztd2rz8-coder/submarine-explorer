/**
 * Talus aprons for the wall set pieces. A graded rubble skirt hangs off the
 * foot of the wall: thick at the foot, concave, thinning to nothing along a
 * lobed outer edge that is sunk a little below the seabed so it feathers into
 * the terrain. Everything is a pure function of the local ground height, so the
 * boulders can be seated on the *final* surface (height and normal) instead of
 * on the idealised profile.
 */

import * as THREE from 'three';
import { fbm3, lump, mulberry32, place, smooth } from './shared.js';

export interface TalusShape {
  /** Local ground height under (x, z) (0 when the prop is not snapped). */
  gnd: (x: number, z: number) => number;
  /** z of the wall foot where the apron meets the wall face (local; the face looks toward -Z). */
  foot: (x: number) => number;
  /** Outward reach of the apron from the foot in metres (<= 0.01: no apron here). */
  reach: (x: number) => number;
  /** Apron height above the ground at the foot, metres. */
  top: (x: number) => number;
  seed: number;
}

/** Concavity of the apron profile: 1 = straight ramp, higher = more concave. */
const CONCAVE = 1.8;

/** Apron thickness above the ground at (x, z); 0 outside the apron. */
export function talusDepth(t: TalusShape, x: number, z: number): number {
  const reach = t.reach(x);
  if (reach <= 0.01) return 0;
  const top = t.top(x);
  const s = t.foot(x) - z;
  if (s <= 0) return top * (1 + Math.min(1.5, -s * 0.08));
  const u = s / reach;
  if (u >= 1) return 0;
  // Block-and-rubble relief: coarse hummocks plus fine clasts, fading out only at the rim.
  const hum = (fbm3(x * 0.33, z * 0.33, t.seed + 91, t.seed + 17, 3) - 0.5) * 2;
  const clast = (fbm3(x * 1.1, z * 1.1, t.seed + 5, t.seed + 63, 2) - 0.5) * 2;
  const d =
    top * Math.pow(1 - u, CONCAVE) +
    (hum * Math.min(top, 4) * 0.3 + clast * 0.28) * Math.sqrt(1 - u) * smooth(0, 0.08, u);
  return Math.max(0, d);
}

/** Final surface height (ground plus apron). */
export function talusSurface(t: TalusShape, x: number, z: number): number {
  return t.gnd(x, z) + talusDepth(t, x, z);
}

/** Unit surface normal by central differences of the final surface. */
export function talusNormal(
  t: TalusShape,
  x: number,
  z: number,
  out = new THREE.Vector3(),
): THREE.Vector3 {
  const e = 0.7;
  const dx = talusSurface(t, x + e, z) - talusSurface(t, x - e, z);
  const dz = talusSurface(t, x, z + e) - talusSurface(t, x, z - e);
  return out.set(-dx / (2 * e), 1, -dz / (2 * e)).normalize();
}

/**
 * The apron as a curvilinear grid: `nx` columns along the wall, `ns` rows from
 * just under the wall (s = -1.5) out to the rim. `colour` paints each vertex
 * from (x, y, z, u, out) with u = 0 at the foot and 1 at the rim.
 */
export function buildTalusMesh(
  t: TalusShape,
  width: number,
  nx: number,
  ns: number,
  uvRepeat: number,
  colour: (x: number, y: number, z: number, u: number, out: THREE.Color) => void,
): THREE.BufferGeometry {
  const cols = Math.max(2, nx);
  const rows = Math.max(3, ns);
  const pos = new Float32Array((cols + 1) * (rows + 1) * 3);
  const col = new Float32Array((cols + 1) * (rows + 1) * 3);
  const uv = new Float32Array((cols + 1) * (rows + 1) * 2);
  const c = new THREE.Color();
  for (let i = 0; i <= cols; i++) {
    const x = (i / cols - 0.5) * width;
    const rawReach = t.reach(x);
    const reach = Math.max(0.4, rawReach);
    // Where the apron has thinned to nothing (the wall ends) the strip sinks out of sight.
    const fade = smooth(0.4, 3, rawReach);
    const foot = t.foot(x);
    for (let j = 0; j <= rows; j++) {
      const s = -1.5 + (j / rows) * (reach + 1.5);
      const z = foot - s;
      const u = Math.max(0, s / reach);
      // Rest slightly proud of the seabed (hides triangulation mismatch) and sink the rim.
      const lip = 0.3 * (1 - smooth(0.78, 1, u)) - 0.7 * smooth(0.9, 1, u);
      const y = t.gnd(x, z) + (talusDepth(t, x, z) + (s > 0 ? lip : 0.3)) * fade - 0.8 * (1 - fade);
      const k = i * (rows + 1) + j;
      pos[k * 3] = x;
      pos[k * 3 + 1] = y;
      pos[k * 3 + 2] = z;
      uv[k * 2] = x / uvRepeat;
      uv[k * 2 + 1] = -s / uvRepeat;
      colour(x, y, z, u, c);
      col[k * 3] = c.r;
      col[k * 3 + 1] = c.g;
      col[k * 3 + 2] = c.b;
    }
  }
  const idx: number[] = [];
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const a = i * (rows + 1) + j;
      const b = a + 1;
      const cc = (i + 1) * (rows + 1) + j;
      const d = cc + 1;
      // Facing up (+Y) for z decreasing with j.
      idx.push(a, cc, b, b, cc, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export interface RockSpot {
  /** A point on the final surface. */
  x: number;
  y: number;
  z: number;
  /** Surface normal there. */
  n: THREE.Vector3;
  /** Mean radius in metres. */
  r: number;
  /** 0 at the foot of the wall, 1 at the apron rim. */
  u: number;
}

export interface RockOpts {
  /** Mean radius scale in metres. */
  size: number;
  /** Fraction of the rocks that are large slump blocks (several times `size`). */
  blocks?: number;
  /** Half-width of the usable span as a fraction of the wall width. */
  span?: number;
}

/**
 * Rock positions seated on the apron surface: smaller rubble near the foot,
 * larger blocks that have rolled out toward the rim, and a few slump blocks.
 * Every spot lies on `talusSurface`, never on the face above the foot and
 * never beyond the rim.
 */
export function placeRocks(
  t: TalusShape,
  width: number,
  count: number,
  seed: number,
  o: RockOpts,
): RockSpot[] {
  const rnd = mulberry32(seed ^ 0x7a1);
  const out: RockSpot[] = [];
  const span = o.span ?? 0.45;
  let guard = count * 8;
  while (out.length < count && guard-- > 0) {
    const x = (rnd() * 2 - 1) * width * span;
    const reach = t.reach(x);
    if (reach < 2) continue;
    const block = rnd() < (o.blocks ?? 0.04);
    const u = block ? rnd() * 0.45 : Math.pow(rnd(), 0.8) * 0.97;
    const z = t.foot(x) - u * reach;
    const y = talusSurface(t, x, z);
    const r = o.size * (block ? 2.6 + rnd() * 1.8 : (0.3 + rnd() * rnd() * 1.9) * (0.7 + 0.8 * u));
    const spot: RockSpot = { x, y, z, n: talusNormal(t, x, z), r, u };
    if (isSupported(t, spot)) out.push(spot);
  }
  return out;
}

/** How far the surface may fall away around a rock's rim before it would hover (fraction of its radius). */
export const RIM_DROP = 0.55;

/**
 * True when the surface around the rim of a rock at `spot` does not drop away from its seat by more
 * than `RIM_DROP * r`, so the body (mostly buried at the seat) is held up on every side.
 */
export function isSupported(t: TalusShape, spot: RockSpot): boolean {
  if (spot.n.y < 0.5) return false;
  const tangent = new THREE.Vector3(spot.n.z, 0, -spot.n.x);
  if (tangent.lengthSq() < 1e-6) tangent.set(1, 0, 0);
  tangent.normalize();
  const bitangent = new THREE.Vector3().crossVectors(spot.n, tangent).normalize();
  for (const dir of [tangent, bitangent]) {
    for (const sign of [-1, 1]) {
      const px = spot.x + dir.x * sign * spot.r * 0.8;
      const pz = spot.z + dir.z * sign * spot.r * 0.8;
      if (talusSurface(t, px, pz) < spot.y - RIM_DROP * spot.r) return false;
    }
  }
  return true;
}

/** Rock height above its seat point: most of the flattened body is buried in the apron. */
export const ROCK_RISE = 0.3;

/** Where the centre of a rock of vertical half-extent `r * squash` sits for `spot`. */
export function seatedCentre(spot: RockSpot, squash: number): THREE.Vector3 {
  // Lean the rock's up axis most of the way onto the slope; embed it along that axis.
  const up = new THREE.Vector3(0, 1, 0).lerp(spot.n, 0.75).normalize();
  return new THREE.Vector3(spot.x, spot.y, spot.z).addScaledVector(up, spot.r * squash * ROCK_RISE);
}

/** Matrix for a rock (flattened ellipsoid) resting on `spot`, with a free spin about its up axis. */
export function rockMatrix(
  spot: RockSpot,
  spin: number,
  squash: number,
  out = new THREE.Matrix4(),
): THREE.Matrix4 {
  const up = new THREE.Vector3(0, 1, 0).lerp(spot.n, 0.75).normalize();
  const q = new THREE.Quaternion()
    .setFromUnitVectors(new THREE.Vector3(0, 1, 0), up)
    .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spin));
  return out.compose(
    seatedCentre(spot, squash),
    q,
    new THREE.Vector3(spot.r, spot.r * squash, spot.r),
  );
}

export interface RubbleOpts {
  /** Half-extents of the area to scatter over (metres, local x / z). */
  halfX: number;
  halfZ: number;
  /** Number of blocks to try to place. */
  count: number;
  /** Median block radius in metres (a long tail of larger blocks sits above it). */
  size: number;
  /** Icosphere subdivision per block (0-2). */
  detail: number;
  seed: number;
}

/**
 * Loose carbonate rubble for an apron whose surface is an arbitrary function: lumpy, flattened
 * blocks, mostly small with a few large ones, each seated a third of the way into `surface` and
 * tilted onto its slope. `keep(x, z)` (0..1) thins the scatter, e.g. toward the rim or out of the
 * footprint of a column. Returns one geometry per block (the caller merges and paints them).
 */
export function scatterRubble(
  surface: (x: number, z: number) => number,
  keep: (x: number, z: number) => number,
  o: RubbleOpts,
): THREE.BufferGeometry[] {
  const rnd = mulberry32(o.seed ^ 0x5eed);
  const out: THREE.BufferGeometry[] = [];
  let guard = o.count * 6;
  while (out.length < o.count && guard-- > 0) {
    const x = (rnd() * 2 - 1) * o.halfX;
    const z = (rnd() * 2 - 1) * o.halfZ;
    if (rnd() > keep(x, z)) continue;
    const r = o.size * (0.45 + rnd() * rnd() * 2.4) * (rnd() < 0.06 ? 2.2 : 1);
    const y = surface(x, z);
    const e = Math.max(0.4, r * 0.7);
    const dx = surface(x + e, z) - surface(x - e, z);
    const dz = surface(x, z + e) - surface(x, z - e);
    const lean = new THREE.Vector3(-dx / (2 * e), 1, -dz / (2 * e)).normalize();
    const g = lump(o.detail, o.seed + out.length * 7, 0.32, 1.7);
    const squash = 0.45 + rnd() * 0.35;
    const q = new THREE.Quaternion()
      .setFromUnitVectors(new THREE.Vector3(0, 1, 0), lean.lerp(new THREE.Vector3(0, 1, 0), 0.4))
      .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6.283));
    const eu = new THREE.Euler().setFromQuaternion(q);
    out.push(
      place(g, {
        x,
        y: y + r * squash * 0.35,
        z,
        rx: eu.x,
        ry: eu.y,
        rz: eu.z,
        sx: r * (0.8 + rnd() * 0.5),
        sy: r * squash,
        sz: r * (0.8 + rnd() * 0.5),
      }),
    );
  }
  return out;
}
