/**
 * `feature: "pillow-field"` (Kamaehuakanaloa, Hiolo North): a heap of basalt
 * pillow lava with a glassy, cracked crust, iron-oxide staining, orange
 * iron-bacteria mats and faint low-temperature shimmer. dims = [length, width,
 * height of the heap]. Pillows are lumpy ellipsoids merged into one mesh.
 */

import * as THREE from 'three';
import { geoDetail } from './detail.js';
import { geoMaterial } from './materials.js';
import { shimmerPlume } from './plume.js';
import {
  boxCH,
  clamp01,
  fbm3,
  heightMesh,
  impostorFromBoxes,
  instanced,
  lump,
  mergeAll,
  mulberry32,
  paint,
  place,
  projectUVs,
  smooth,
  type BuiltProp,
  type InstanceSpec,
} from './shared.js';
import type { GeoBuildInput } from './types.js';

const GLASS = new THREE.Color(0x2c2a2c);
const BROWN = new THREE.Color(0x4b3b32);
const OXIDE = new THREE.Color(0x9a5527);
const DUST = new THREE.Color(0x6b6259);
const FE_MAT = new THREE.Color(0xd08a45);

export function buildPillowField(input: GeoBuildInput): BuiltProp {
  const { dims, seed, tier } = input;
  const d = geoDetail(tier);
  const [L, W, H] = dims;
  const rnd = mulberry32(seed);
  const env = (x: number, z: number): number => {
    const r = Math.hypot(x / (L / 2), z / (W / 2));
    if (r >= 1) return -0.4;
    return Math.max(
      -0.4,
      H * 0.75 * Math.pow(1 - r * r, 0.8) * (0.7 + 0.5 * fbm3(x * 0.15, 1, z * 0.15, seed, 3)) -
        smooth(0.85, 1, r) * 0.5,
    );
  };
  const parts: THREE.BufferGeometry[] = [
    heightMesh(L, W, Math.round(30 * d.meshDensity), Math.round(30 * d.meshDensity), env),
  ];
  const n = Math.round(230 * d.meshDensity);
  for (let i = 0; i < n; i++) {
    const a = rnd() * 6.283;
    const rr = Math.sqrt(rnd()) * 0.92;
    const x = Math.cos(a) * rr * L * 0.5;
    const z = Math.sin(a) * rr * W * 0.5;
    const base = env(x, z);
    if (base < -0.2) continue;
    const s = (0.45 + rnd() * rnd() * 1.5) * (H > 4 ? 1.3 : 1);
    parts.push(
      place(lump(d.sphereDetail, seed + i, 0.16, 1.8), {
        x,
        y: base + s * 0.35 + rnd() * s * 0.5,
        z,
        rx: (rnd() - 0.5) * 0.5,
        ry: rnd() * 6.28,
        rz: (rnd() - 0.5) * 0.5,
        sx: s * (1 + rnd() * 0.7),
        sy: s * (0.55 + rnd() * 0.25),
        sz: s,
      }),
    );
  }
  const geom = mergeAll(parts);
  paint(geom, (x, y, z, ny, out) => {
    const n1 = fbm3(x * 0.5, y * 0.5, z * 0.5, seed ^ 0x81, 3);
    const n2 = fbm3(x * 0.15, y * 0.15, z * 0.15, seed ^ 0x82, 3);
    out
      .copy(GLASS)
      .lerp(BROWN, smooth(0.35, 0.8, n1))
      .multiplyScalar(0.9 + 0.5 * n1);
    out.lerp(OXIDE, smooth(0.55, 0.85, n2) * 0.7);
    out.lerp(DUST, smooth(0.55, 0.95, ny) * 0.5);
  });
  projectUVs(geom, 2.4);
  geom.computeBoundingBox();
  geom.computeBoundingSphere();
  const full = new THREE.Group();
  full.name = 'pillow-field';
  full.add(new THREE.Mesh(geom, geoMaterial('pillow', d, { roughness: 0.55, bumpScale: 1.6 })));

  // Orange iron-bacteria mats draped between the pillows.
  const mats: InstanceSpec[] = [];
  const nm = Math.round(38 * d.growth);
  for (let i = 0; i < nm; i++) {
    const a = rnd() * 6.283;
    const rr = Math.sqrt(rnd()) * 0.7;
    const x = Math.cos(a) * rr * L * 0.5;
    const z = Math.sin(a) * rr * W * 0.5;
    mats.push({
      t: {
        x,
        y: env(x, z) + 0.5 + rnd() * 0.35,
        z,
        ry: rnd() * 3,
        sx: 0.5 + rnd() * 1.2,
        sz: 0.5 + rnd() * 1,
      },
      color: new THREE.Color().copy(FE_MAT).multiplyScalar(0.7 + rnd() * 0.5),
    });
  }
  if (mats.length) {
    const disc = new THREE.CircleGeometry(1, 8).rotateX(-Math.PI / 2);
    full.add(
      instanced(
        disc,
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.85,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
        }),
        mats,
        'iron-mats',
      ),
    );
  }
  for (let i = 0; i < 3; i++) {
    const sh = shimmerPlume(3.4, 1, Math.round(44 * d.plume), seed + 70 + i);
    if (sh) {
      const a = rnd() * 6.283;
      const x = Math.cos(a) * L * 0.16;
      const z = Math.sin(a) * W * 0.16;
      sh.position.set(x, env(x, z) + 0.5, z);
      full.add(sh);
    }
  }

  const bounds = geom.boundingBox!.clone();
  const colliders: THREE.Box3[] = [
    boxCH(0, H * 0.32, 0, L * 0.32, H * 0.34, W * 0.32),
    boxCH(-L * 0.26, H * 0.18, W * 0.05, L * 0.12, H * 0.2, W * 0.16),
    boxCH(L * 0.26, H * 0.18, -W * 0.05, L * 0.12, H * 0.2, W * 0.16),
  ];
  void clamp01;
  return { full, impostor: impostorFromBoxes(colliders, bounds, 0x3a3230), bounds, colliders };
}
