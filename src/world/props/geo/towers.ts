/**
 * `feature: "carbonate-tower"` (Lost City, Poseidon): a pale carbonate edifice
 * of one tall, terraced, fluted spire and a ring of lesser ones on a talus
 * skirt, with drooping flanges and faint clear-fluid shimmer at the tips. dims
 * = [width, depth, height of the tallest spire] (width and depth describe the
 * whole edifice, not the column). `lone` builds a single small chimney of the
 * same family (the field's lesser carbonate chimneys).
 */

import * as THREE from 'three';
import { geoDetail } from './detail.js';
import { geoMaterial, vertexGlow } from './materials.js';
import { shimmerPlume } from './plume.js';
import {
  boxCH,
  clamp01,
  fbm3,
  heightMesh,
  impostorFromBoxes,
  mergeAll,
  mulberry32,
  paint,
  place,
  projectUVs,
  smooth,
  type BuiltProp,
} from './shared.js';
import { flange, spireRadius, tieredSpire, type SpireOpts } from './spire.js';
import type { GeoBuildInput } from './types.js';

const OLD = new THREE.Color(0x8e8c82); // weathered, inactive carbonate
const LIVE = new THREE.Color(0xe9e7de); // fresh white carbonate and brucite, faintly warm
const STAIN = new THREE.Color(0x6c685a);

export function buildCarbonateTower(input: GeoBuildInput, lone = false): BuiltProp {
  const { dims, seed, tier } = input;
  const gnd = input.groundHeight() ?? ((): number => 0);
  const d = geoDetail(tier);
  const [W, D, H] = dims;
  const rnd = mulberry32(seed);
  const skirtH = H * (lone ? 0.1 : 0.16);
  const root = H * 0.5; // the foundation sinks into the seabed on the downhill side
  const skirtShape = (x: number, z: number): number => {
    const r = Math.hypot(x / (W / 2), z / (D / 2));
    const n = (fbm3(x * 0.12, 5, z * 0.12, seed, 4) - 0.5) * skirtH * 0.7;
    const top = skirtH * Math.pow(Math.max(0, 1 - Math.min(r, 1) ** 2), 1.3);
    return top + n * clamp01(1 - r) - smooth(0.78, 1.02, r) * root;
  };
  /** The talus skirt lifted onto the terrain, so the edifice sits on the slope. */
  const skirt = (x: number, z: number): number => skirtShape(x, z) + gnd(x, z);

  interface Spire extends SpireOpts {
    x: number;
    z: number;
    y: number;
    lean: number;
    leanA: number;
  }
  const spires: Spire[] = [];
  const dens = d.meshDensity;
  const mk = (x: number, z: number, h: number, main: boolean): void => {
    const r0 = h * (main ? 0.26 : 0.17) + 0.5;
    spires.push({
      x,
      z,
      y: Math.max(skirtShape(x, z), 0) + gnd(x, z) - 0.6,
      h,
      r0,
      topFrac: main ? 0.3 : 0.28,
      seed: seed + spires.length * 11,
      segs: 26 * dens + 4,
      rings: (h / 0.9) * dens + 8,
      tiers: Math.max(2, Math.round(h / (main ? 6.5 : 5))),
      ledge: main ? 0.2 : 0.16,
      wobble: 0.1,
      ridges: main ? 9 : 6,
      ridgeAmp: 0.06,
      flare: main ? 0.7 : 0.5,
      lip: 0.1,
      lean: main ? 0 : (rnd() - 0.5) * 0.12,
      leanA: rnd() * 6.283,
    });
  };
  // H is the edifice's total local relief: the column rises from the top of its talus
  // skirt, so it is shortened by the skirt's height under it.
  mk(0, 0, H - (Math.max(skirtShape(0, 0), 0) - 0.6), true);
  const main = spires[0]!;
  const n = lone ? 0 : 4 + Math.floor(rnd() * 2);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.283 + rnd() * 0.5;
    const h = H * (0.3 + rnd() * 0.42);
    const sr0 = h * 0.17 + 0.5;
    const r = main.r0 * 0.9 + sr0 * 0.9 + 1 + rnd() * 0.1 * Math.min(W, D);
    mk(Math.cos(a) * r, Math.sin(a) * r, h, false);
  }

  const pieces: THREE.BufferGeometry[] = [
    heightMesh(W, D, Math.round(36 * dens), Math.round(36 * dens), skirt),
  ];
  const tips: { x: number; y: number; z: number }[] = [];
  for (const [i, s] of spires.entries()) {
    pieces.push(
      place(tieredSpire(s), {
        x: s.x,
        y: s.y,
        z: s.z,
        rx: Math.sin(s.leanA) * s.lean,
        rz: Math.cos(s.leanA) * s.lean,
      }),
    );
    tips.push({ x: s.x, y: s.y + s.h, z: s.z });
    // Drooping flanges on the column: wide shelves on the main tower, one or two elsewhere.
    const nf = lone ? 1 : i === 0 ? 6 : 1 + Math.floor(rnd() * 2);
    for (let f = 0; f < nf; f++) {
      const t = i === 0 ? 0.12 + (f / nf) * 0.6 + rnd() * 0.06 : 0.14 + rnd() * 0.5;
      const rAt = spireRadius(s, t);
      const w = rAt * (0.4 + rnd() * 0.5) + 0.6;
      pieces.push(
        place(
          flange({
            r0: rAt * 0.92,
            w,
            arc: 1.7 + rnd() * 2.4,
            start: rnd() * 6.28,
            seed: seed + f + i * 5,
            segs: Math.round(18 + 14 * dens),
          }),
          { x: s.x, y: s.y + t * s.h, z: s.z },
        ),
      );
    }
  }
  const geom = mergeAll(pieces);
  paint(geom, (x, y, z, ny, out) => {
    const n1 = fbm3(x * 0.16, y * 0.1, z * 0.16, seed ^ 0x77, 4);
    const n2 = fbm3(x * 0.7, y * 0.35, z * 0.7, seed ^ 0x99, 3);
    // Fresh white on the upper parts and tips, weathered grey-tan low down and on the skirt.
    const up = smooth(0.1, 0.8, (y - gnd(x, z)) / H + (n1 - 0.5) * 0.6);
    out.copy(OLD).lerp(LIVE, up * 0.92 + 0.1 * n2);
    out.lerp(STAIN, smooth(0.62, 0.88, n2) * 0.3 * (1 - up));
    out.multiplyScalar(0.88 + 0.24 * n2);
    if (ny > 0.8) out.multiplyScalar(0.9); // silt dusting on shelves
  });
  projectUVs(geom, 5);
  const material = geoMaterial('flow', d, { roughness: 0.82, side: THREE.DoubleSide });
  // Pale carbonate answers the warm headlights harder than dark rock, and a faint cool
  // emissive lift keeps the silhouette readable in the dark water beyond the beams.
  material.color.multiplyScalar(1.9);
  vertexGlow(material, 0.16, 0xa8c4d0);
  const full = new THREE.Group();
  full.name = 'carbonate-tower';
  full.add(new THREE.Mesh(geom, material));

  // Faint clear-fluid haze at the tips of the tallest spires.
  const hazeFor = [...spires.keys()]
    .sort((a, b) => spires[b]!.h - spires[a]!.h)
    .slice(0, lone ? 1 : 3);
  for (const k of hazeFor) {
    const tip = tips[k]!;
    const ph = lone ? 3 : Math.min(14, spires[k]!.h * 0.28 + 3);
    const haze = shimmerPlume(ph, spires[k]!.r0 * 0.2, Math.round(70 * d.plume), seed + 700 + k);
    if (!haze) continue;
    haze.position.set(tip.x, tip.y, tip.z);
    full.add(haze);
  }
  geom.computeBoundingBox();
  geom.computeBoundingSphere();
  const bounds = geom.boundingBox!.clone();
  for (const k of hazeFor) {
    const tip = tips[k]!;
    bounds.expandByPoint(
      new THREE.Vector3(tip.x, tip.y + Math.min(14, spires[k]!.h * 0.28 + 3) + 3, tip.z),
    );
  }

  const colliders: THREE.Box3[] = [
    boxCH(0, gnd(0, 0) + skirtH * 0.3, 0, W * 0.3, skirtH * 0.3, D * 0.3),
  ];
  for (const s of spires) {
    for (const [a, b] of [
      [0, 0.34],
      [0.34, 0.68],
      [0.68, 1],
    ] as const) {
      const rr = spireRadius(s, (a + b) / 2) * 0.85;
      colliders.push(boxCH(s.x, s.y + ((a + b) / 2) * s.h, s.z, rr, ((b - a) / 2) * s.h, rr));
    }
  }
  return { full, impostor: impostorFromBoxes(colliders, bounds, 0xa39d8c), bounds, colliders };
}

/** A lone carbonate chimney: the field's lesser towers (`material_hint: carbonate`). */
export function buildCarbonateChimney(input: GeoBuildInput): BuiltProp {
  const h = Math.max(1, input.dims[2]);
  const w = Math.max(6, h * 1.6);
  return buildCarbonateTower({ ...input, dims: [w, w, h] }, true);
}
