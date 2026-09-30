/**
 * `feature: "carbonate-tower"` (Lost City, Poseidon): a pale carbonate edifice
 * of one tall fluted spire and a ring of lesser ones on a talus skirt, with
 * shelf-like flanges and faint clear-fluid shimmer at the tips. dims = [width,
 * depth, height of the tallest spire] (width and depth describe the whole
 * edifice, not the column).
 */

import * as THREE from 'three';
import { geoDetail } from './detail.js';
import { geoMaterial } from './materials.js';
import {
  boxCH,
  clamp01,
  column,
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
import type { GeoBuildInput } from './types.js';

const OLD = new THREE.Color(0x77725f); // weathered, inactive carbonate
const LIVE = new THREE.Color(0xc4bfb0); // fresh white carbonate and brucite
const STAIN = new THREE.Color(0x5c5445);

export function buildCarbonateTower(input: GeoBuildInput): BuiltProp {
  const { dims, seed, tier } = input;
  const d = geoDetail(tier);
  const [W, D, H] = dims;
  const rnd = mulberry32(seed);
  const skirtH = H * 0.16;
  const root = H * 0.5; // the foundation sinks into the seabed on the downhill side
  const skirt = (x: number, z: number): number => {
    const r = Math.hypot(x / (W / 2), z / (D / 2));
    const n = (fbm3(x * 0.12, 5, z * 0.12, seed, 4) - 0.5) * skirtH * 0.7;
    const top = skirtH * Math.pow(Math.max(0, 1 - Math.min(r, 1) ** 2), 1.3);
    return top + n * clamp01(1 - r) - smooth(0.78, 1.02, r) * root;
  };

  interface Spire {
    x: number;
    z: number;
    y: number;
    h: number;
    r0: number;
  }
  const spires: Spire[] = [];
  const mk = (x: number, z: number, h: number): void => {
    spires.push({ x, z, y: Math.max(skirt(x, z), 0) - 0.4, h, r0: h * 0.135 + 0.4 });
  };
  mk(0, 0, H);
  const n = 4 + Math.floor(rnd() * 2);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.283 + rnd() * 0.6;
    const r = (0.16 + rnd() * 0.28) * Math.min(W, D) * 0.5;
    mk(Math.cos(a) * r, Math.sin(a) * r, H * (0.3 + rnd() * 0.42));
  }

  const dens = d.meshDensity;
  const pieces: THREE.BufferGeometry[] = [
    heightMesh(W, D, Math.round(36 * dens), Math.round(36 * dens), skirt),
  ];
  for (const [i, s] of spires.entries()) {
    pieces.push(
      place(
        column({
          h: s.h,
          r0: s.r0,
          topFrac: 0.3,
          seed: seed + i * 11,
          segs: 16 * dens + 4,
          rings: (s.h / 1.2) * dens + 6,
          wobble: 0.22,
          ridges: 9,
          ridgeAmp: 0.13,
          lip: 0.12,
          flare: 0.6,
        }),
        { x: s.x, y: s.y, z: s.z },
      ),
    );
    // Shelf-like flanges on the outer face, and one leaning parasitic chimney.
    const nf = i === 0 ? 4 : 1 + Math.floor(rnd() * 2);
    for (let f = 0; f < nf; f++) {
      const t = 0.14 + rnd() * 0.5;
      const rAt = s.r0 * (1 - 0.7 * t);
      const rr = rAt * (2 + rnd() * 1.3);
      const flange = new THREE.CylinderGeometry(
        rr * 0.8,
        rr,
        0.5 + rr * 0.16,
        14,
        1,
        false,
        rnd() * 6.28,
        2 + rnd() * 2.2,
      );
      const p = flange.getAttribute('position');
      for (let k = 0; k < p.count; k++) {
        const nz = fbm3(p.getX(k) * 0.5, p.getY(k), p.getZ(k) * 0.5, seed + f + i * 3, 3);
        const y = p.getY(k) - Math.hypot(p.getX(k), p.getZ(k)) * 0.12 * (nz + 0.4);
        p.setXYZ(k, p.getX(k) * (0.85 + nz * 0.3), y, p.getZ(k) * (0.85 + nz * 0.3));
      }
      flange.deleteAttribute('uv');
      flange.computeVertexNormals();
      pieces.push(place(flange, { x: s.x, y: s.y + t * s.h, z: s.z }));
    }
    if (s.h > 10) {
      const a = rnd() * 6.283;
      const ph = s.h * 0.3;
      pieces.push(
        place(
          column({
            h: ph,
            r0: s.r0 * 0.36,
            topFrac: 0.35,
            seed: seed + i,
            segs: 10,
            rings: 8,
            wobble: 0.3,
            ridges: 5,
            flare: 0.5,
          }),
          {
            x: s.x + Math.cos(a) * s.r0 * 0.75,
            y: s.y + s.h * (0.2 + rnd() * 0.3),
            z: s.z + Math.sin(a) * s.r0 * 0.75,
            rz: -Math.cos(a) * 0.5,
            rx: Math.sin(a) * 0.5,
          },
        ),
      );
    }
  }
  const geom = mergeAll(pieces);
  paint(geom, (x, y, z, ny, out) => {
    const n1 = fbm3(x * 0.16, y * 0.1, z * 0.16, seed ^ 0x77, 4);
    const n2 = fbm3(x * 0.7, y * 0.35, z * 0.7, seed ^ 0x99, 3);
    // Fresh white on the upper parts and tips, weathered grey-tan low down and on the skirt.
    const up = smooth(0.15, 0.95, y / H + (n1 - 0.5) * 0.7);
    out.copy(OLD).lerp(LIVE, up * 0.9 + 0.1 * n2);
    out.lerp(STAIN, smooth(0.6, 0.85, n2) * 0.35 * (1 - up));
    out.multiplyScalar(0.85 + 0.3 * n2);
    if (ny > 0.8) out.multiplyScalar(0.92); // silt dusting on shelves
  });
  projectUVs(geom, 5);
  geom.computeBoundingBox();
  geom.computeBoundingSphere();
  const full = new THREE.Group();
  full.name = 'carbonate-tower';
  full.add(
    new THREE.Mesh(geom, geoMaterial('flow', d, { roughness: 0.88, side: THREE.DoubleSide })),
  );

  const bounds = geom.boundingBox!.clone();
  const colliders: THREE.Box3[] = [boxCH(0, skirtH * 0.3, 0, W * 0.3, skirtH * 0.3, D * 0.3)];
  for (const s of spires) {
    for (const [a, b, k] of [
      [0, 0.34, 0.95],
      [0.34, 0.68, 0.72],
      [0.68, 1, 0.5],
    ] as const) {
      const rr = s.r0 * (1 - 0.7 * ((a + b) / 2)) * k * 0.9;
      colliders.push(boxCH(s.x, s.y + ((a + b) / 2) * s.h, s.z, rr, ((b - a) / 2) * s.h, rr));
    }
  }
  return { full, impostor: impostorFromBoxes(colliders, bounds, 0xa39d8c), bounds, colliders };
}
