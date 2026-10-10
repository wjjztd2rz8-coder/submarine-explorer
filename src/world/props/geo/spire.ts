/**
 * Smooth spire and flange primitives for the vent set pieces (Poseidon's
 * carbonate towers, black-smoker chimneys). A spire is a tapering column with
 * stepped terraces, fluting and a noisy wobble; a flange is a drooping, scalloped
 * shelf sector. Both are indexed and smooth-shaded: no cubes, no hard facets.
 */

import * as THREE from 'three';
import { fbm3, smooth } from './shared.js';

const TAU = Math.PI * 2;

function hash1(k: number): number {
  const v = Math.sin(k * 12.9898 + 78.233) * 43758.5453;
  return v - Math.floor(v);
}

export interface SpireOpts {
  h: number;
  r0: number;
  /** Top radius as a fraction of the base radius. */
  topFrac: number;
  seed: number;
  segs: number;
  rings: number;
  /** Terrace count up the column (0 = a plain taper). */
  tiers?: number;
  /** Terrace overhang as a fraction of the local radius. */
  ledge?: number;
  wobble?: number;
  /** Fine knobbly roughness (fraction of radius, higher frequency than the wobble). */
  rough?: number;
  /** Vertical flute count and depth (fraction of radius). */
  ridges?: number;
  ridgeAmp?: number;
  /** Foot flare, as a fraction of r0, decaying over the lowest ~12%. */
  flare?: number;
  /** Flared rim at the top, as a fraction of the local radius. */
  lip?: number;
  /** Orifice depth below the rim, as a fraction of the top radius (0 = flat cap). */
  crater?: number;
  /**
   * Irregular carbonate mode (0 = off): the cross-section turns elliptical and rotates
   * with height, ledges become partial shelves that hug one side, and the flutes meander
   * into sharp flowstone ridges. Colliders still follow the smooth `spireRadius`.
   */
  irregular?: number;
  /** Lost City trunk profile (needs `irregular`): jittered terraces, swells, deeper vent funnel. */
  trunk?: boolean;
  /** Sulfide crust strength (0 = off): irregular flanged crust bands and nodules (Beebe). */
  crust?: number;
}

/**
 * Crust band at an angle and local height (m): `lip` is 1 on a band's overhanging crest
 * and 0 in the undercut recess beneath it; `idx` identifies the band for colour variety.
 * Shared by the geometry (spire radius) and the vertex painter so colour follows relief.
 */
export function crustBand(
  ang: number,
  y: number,
  seed: number,
): { lip: number; saw: number; idx: number } {
  const phase =
    y / 0.85 +
    (fbm3(Math.cos(ang) * 1.1 + 4, y * 0.12, Math.sin(ang) * 1.1 + 4, seed + 41, 2) - 0.5) * 6;
  const idx = Math.floor(phase);
  const saw = phase - idx;
  const side = fbm3(Math.cos(ang) * 1.5 + 9, idx * 2.3, Math.sin(ang) * 1.5 + 9, seed + 53, 2);
  const strength = smooth(0.25, 0.65, side) * (0.35 + 0.65 * hash1(idx * 3.7 + seed));
  // A broad rounded crest (slow rise, gentle fall) rather than a sawtooth spike.
  return { lip: smooth(0, 0.3, saw) * Math.pow(1 - saw, 1.7) * strength, saw, idx };
}

/** Flow-ridge crest value in [0, 1] (1 on a crest) at an angle and local height. */
export function trunkCrest(
  ang: number,
  y: number,
  n: number,
  flutes: number,
  seed: number,
): number {
  const ph =
    ang * flutes + n * 6 + y * 0.11 + (fbm3(y * 0.08, 4, seed * 0.1, seed + 5, 2) - 0.5) * 7;
  return 1 - Math.abs(Math.sin(ph * 0.5));
}

/** Smooth, noise-free radius at height fraction t: the profile colliders and flanges follow. */
export function spireRadius(o: SpireOpts, t0: number): number {
  const t = Math.min(1, Math.max(0, t0));
  const taper = 1 - (1 - o.topFrac) * Math.pow(t, 0.8);
  const flare = 1 + (o.flare ?? 0) * Math.exp(-t * 9);
  let ledge = 1;
  if (o.tiers) {
    const u = t * o.tiers;
    const f = u - Math.floor(u);
    // A step out at the start of each terrace that recedes upward: reads as layered ledges.
    ledge = 1 + (o.ledge ?? 0.14) * smooth(0, 0.06, f) * Math.pow(1 - f, 1.7);
  }
  const lip = 1 + (o.lip ?? 0) * smooth(0.88, 1, t);
  return o.r0 * taper * flare * ledge * lip;
}

/** A tiered, fluted column standing on y = 0. */
export function tieredSpire(o: SpireOpts): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(
    o.r0,
    o.r0,
    o.h,
    Math.max(8, Math.round(o.segs)),
    Math.max(4, Math.round(o.rings)),
  );
  g.translate(0, o.h / 2, 0);
  const p = g.getAttribute('position');
  const wob = o.wobble ?? 0.12;
  const flutes = o.ridges ?? 7;
  const amp = o.ridgeAmp ?? 0.06;
  const plainProfile = { ...o, tiers: 0 };
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const t = y / o.h;
    const ang = Math.atan2(z, x);
    const n = fbm3(Math.cos(ang) * 1.3 + 3, y * 0.09, Math.sin(ang) * 1.3 + 3, o.seed, 3);
    let f = spireRadius(o, t) / o.r0;
    const irr = o.irregular ?? 0;
    if (irr) {
      const plain = spireRadius(plainProfile, t) / o.r0;
      if (o.trunk) {
        // Jittered terrace phase and per-terrace strength: shelves drift in height and
        // some nearly vanish, so the column never reads as evenly stacked plates.
        const uj =
          t * (o.tiers ?? 0) +
          (fbm3(y * 0.07, 9, o.seed * 0.1, o.seed + 13, 2) - 0.5) * 3.2 +
          (fbm3(Math.cos(ang) * 1.1 + 2, y * 0.04, Math.sin(ang) * 1.1 + 2, o.seed + 19, 2) - 0.5) *
            1.6;
        const fj = uj - Math.floor(uj);
        const strength = 0.15 + 1.1 * hash1(Math.floor(uj) + o.seed);
        const shelf =
          (o.ledge ?? 0.14) * smooth(0, 0.08, fj) * Math.pow(1 - fj, 2.2) * strength * 0.3;
        const m = fbm3(
          Math.cos(ang) * 1.6 + 7,
          Math.floor(uj) * 3.1,
          Math.sin(ang) * 1.6 + 7,
          o.seed + 31,
          2,
        );
        // Shelves are strong on one side and vanish on the other.
        f = plain * (1 + shelf * smooth(0.3, 0.7, m) * 1.5);
        // Slow swells and waists along the whole trunk.
        f *=
          1 +
          irr *
            (0.1 * Math.sin(t * TAU * 1.35 + o.seed * 0.7 + Math.cos(ang - o.seed) * 0.6) +
              0.07 * Math.sin(t * TAU * 3.3 + o.seed * 1.9 - Math.sin(ang) * 0.9));
      } else {
        const u = t * (o.tiers ?? 0);
        const m = fbm3(
          Math.cos(ang) * 1.6 + 7,
          Math.floor(u) * 3.1,
          Math.sin(ang) * 1.6 + 7,
          o.seed + 31,
          2,
        );
        // Shelves are strong on one side and vanish on the other.
        // A fully tapered tip has no shelf radius; avoid dividing zero by zero.
        f = plain === 0 ? 0 : plain * (1 + (f / plain - 1) * smooth(0.25, 0.7, m) * 1.7);
      }
      // Elliptical, twisting cross-section plus broad lumps: no lathe-like symmetry.
      f *= 1 + irr * 0.22 * Math.cos(2 * (ang - t * 2.4 - o.seed * 0.37));
      f *=
        1 +
        irr *
          0.5 *
          (fbm3(Math.cos(ang) * 2.4 + 1, y * 0.05, Math.sin(ang) * 2.4 + 1, o.seed + 77, 2) - 0.5);
    }
    f *= 1 + (n - 0.5) * 2 * wob;
    if (o.crust) {
      const b = crustBand(ang, y, o.seed);
      const nod = fbm3(Math.cos(ang) * 7 + 2, y * 1.7, Math.sin(ang) * 7 + 2, o.seed + 67, 2);
      // Overhanging crust flanges, pitted by knobbly sulfide nodules; fades near the rim.
      f *= 1 + o.crust * (0.38 * (b.lip - 0.1) + (nod - 0.5) * 0.2) * (1 - smooth(0.9, 1, t));
    }
    if (o.rough)
      f *=
        1 +
        (fbm3(Math.cos(ang) * 4 + 5, y * 0.6, Math.sin(ang) * 4 + 5, o.seed + 9, 2) - 0.5) *
          2 *
          o.rough;
    if (irr) {
      // Meandering flow ridges: sharp crests, broad troughs, phase drifting with height.
      const crest = trunkCrest(ang, y, n, flutes, o.seed);
      f *= 1 + amp * 2.2 * (crest * crest - 0.35);
    } else f *= 1 + amp * Math.sin(ang * flutes + n * 5 + t * 2.5);
    // The top cap's centre vertex sinks to make a crater: the vent orifice.
    // Irregular carbonate sinks deeper so the dark vent opening reads as a funnel.
    const sink =
      o.crater && t > 0.999 && Math.hypot(x, z) < 1e-6
        ? o.crater * o.r0 * o.topFrac * (o.trunk ? 2.4 : 1)
        : 0;
    p.setXYZ(i, x * f, y - sink, z * f);
  }
  g.deleteAttribute('uv');
  g.computeVertexNormals();
  return g;
}

/**
 * A drooping shelf sector around the local y axis: a thin lens from `r0` (hidden
 * inside the column) out to `r0 + w`, with a rounded, scalloped lip and a thick
 * underside. Place its origin on the spire axis.
 */
export function flange(o: {
  r0: number;
  w: number;
  arc: number;
  start: number;
  seed: number;
  segs: number;
}): THREE.BufferGeometry {
  const { r0, w } = o;
  const th = 0.42 + w * 0.14;
  // A thick, rounded lip: the outer edge is a blunt bullnose, not a knife edge.
  const profile = [
    new THREE.Vector2(r0 * 0.8, th * 0.5),
    new THREE.Vector2(r0 + w * 0.35, th * 0.6),
    new THREE.Vector2(r0 + w * 0.78, th * 0.4),
    new THREE.Vector2(r0 + w * 0.97, -th * 0.1),
    new THREE.Vector2(r0 + w * 0.97, -th * 0.7),
    new THREE.Vector2(r0 + w * 0.7, -th * 1.25),
    new THREE.Vector2(r0 + w * 0.3, -th * 1.1),
    new THREE.Vector2(r0 * 0.8, -th * 0.6),
  ];
  const g = new THREE.LatheGeometry(profile, Math.max(6, Math.round(o.segs)), o.start, o.arc);
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const rad = Math.hypot(x, z);
    const out = smooth(r0, r0 + w, rad);
    const ang = Math.atan2(z, x);
    // Scalloped rim, tapering at both ends of the arc, drooping toward the lip.
    const sc = fbm3(Math.cos(ang) * 2.2 + 9, 5, Math.sin(ang) * 2.2 + 9, o.seed, 2) - 0.5;
    // Both ends of the arc pinch out to nothing so the sector has no cut face.
    const u = ((((Math.atan2(x, z) - o.start) % TAU) + TAU) % TAU) / o.arc;
    const end = smooth(0, 0.22, u) * smooth(0, 0.22, 1 - u);
    const k = (1 + sc * 0.32 * out) * (1 - (1 - end) * out * 0.9);
    const yy = y - out * out * w * 0.12 - sc * out * 0.3;
    p.setXYZ(i, x * k, yy * (0.25 + 0.75 * end), z * k);
  }
  g.deleteAttribute('uv');
  g.computeVertexNormals();
  return g;
}
