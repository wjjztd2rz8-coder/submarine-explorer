/**
 * Smooth spire and flange primitives for the vent set pieces (Poseidon's
 * carbonate towers, black-smoker chimneys). A spire is a tapering column with
 * stepped terraces, fluting and a noisy wobble; a flange is a drooping, scalloped
 * shelf sector. Both are indexed and smooth-shaded: no cubes, no hard facets.
 */

import * as THREE from 'three';
import { fbm3, smooth } from './shared.js';

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
  /** Vertical flute count and depth (fraction of radius). */
  ridges?: number;
  ridgeAmp?: number;
  /** Foot flare, as a fraction of r0, decaying over the lowest ~12%. */
  flare?: number;
  /** Flared rim at the top, as a fraction of the local radius. */
  lip?: number;
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
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const t = y / o.h;
    const ang = Math.atan2(z, x);
    const n = fbm3(Math.cos(ang) * 1.3 + 3, y * 0.09, Math.sin(ang) * 1.3 + 3, o.seed, 3);
    let f = spireRadius(o, t) / o.r0;
    f *= 1 + (n - 0.5) * 2 * wob;
    f *= 1 + amp * Math.sin(ang * flutes + n * 5 + t * 2.5);
    p.setXYZ(i, x * f, y, z * f);
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
  const th = 0.35 + w * 0.12;
  const profile = [
    new THREE.Vector2(r0 * 0.8, th * 0.5),
    new THREE.Vector2(r0 + w * 0.35, th * 0.55),
    new THREE.Vector2(r0 + w * 0.8, th * 0.15),
    new THREE.Vector2(r0 + w, -th * 0.45),
    new THREE.Vector2(r0 + w * 0.9, -th * 1.3),
    new THREE.Vector2(r0 + w * 0.55, -th * 1.2),
    new THREE.Vector2(r0 + w * 0.15, -th * 0.9),
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
    const k = 1 + sc * 0.5 * out;
    p.setXYZ(i, x * k, y - out * out * w * 0.12 - sc * out * 0.5, z * k);
  }
  g.deleteAttribute('uv');
  g.computeVertexNormals();
  return g;
}
