/**
 * `feature: "dropstones"` (polar sites): a scatter of pale, rounded boulders that ice-rafted
 * into the mud. Unlike the dark rock kits they carry a scattered-light lift, so the cluster
 * reads as a lit foreground mass against the dark seabed. dims = [length, width, tallest stone].
 */

import * as THREE from 'three';
import { geoDetail } from './detail.js';
import { geoMaterial, vertexGlow } from './materials.js';
import {
  boxCH,
  fbm3,
  impostorFromBoxes,
  lump,
  mergeAll,
  mulberry32,
  paint,
  place,
  projectUVs,
  type BuiltProp,
} from './shared.js';
import type { GeoBuildInput } from './types.js';

const PALE = new THREE.Color(0xa5a295);
const WARM = new THREE.Color(0x84816f);

export function buildDropstones(input: GeoBuildInput): BuiltProp {
  const { dims, seed, tier } = input;
  const gnd = input.groundHeight() ?? ((): number => 0);
  const d = geoDetail(tier);
  const [L, W, H] = dims;
  const rnd = mulberry32(seed);
  const tmpl = [0, 1, 2, 3].map((k) => lump(d.sphereDetail, seed + k * 23, 0.14, 1.5));
  const parts: THREE.BufferGeometry[] = [];
  const colliders: THREE.Box3[] = [];
  const n = Math.round(10 * d.growth) + 4;
  for (let i = 0; i < n; i++) {
    const a = rnd() * 6.283;
    // The first stone is the big one at the centre; the rest cluster around it.
    const rr = i === 0 ? 0 : 0.25 + Math.sqrt(rnd()) * 0.7;
    const x = Math.cos(a) * rr * L * 0.5;
    const z = Math.sin(a) * rr * W * 0.5;
    const s = i === 0 ? H : H * (0.2 + rnd() * rnd() * 0.55);
    const y = gnd(x, z) + s * 0.3;
    parts.push(
      place(tmpl[i % tmpl.length]!.clone(), {
        x,
        y,
        z,
        ry: rnd() * 6.28,
        sx: s * (0.9 + rnd() * 0.5),
        sy: s * 0.7,
        sz: s * (0.8 + rnd() * 0.4),
      }),
    );
    if (s > H * 0.4) colliders.push(boxCH(x, y, z, s * 0.7, s * 0.5, s * 0.7));
  }
  const geom = mergeAll(parts);
  for (const t of tmpl) t.dispose();
  paint(geom, (x, y, z, ny, out) => {
    const n1 = fbm3(x * 0.6, y * 0.6, z * 0.6, seed ^ 0x51, 3);
    out
      .copy(WARM)
      .lerp(PALE, n1)
      .multiplyScalar(0.85 + 0.3 * ny);
  });
  projectUVs(geom, 2.4);
  geom.computeBoundingBox();
  geom.computeBoundingSphere();
  const mat = geoMaterial('rock', d, { roughness: 0.9, bumpScale: 1.2 });
  vertexGlow(mat, 0.6, 0xc8d0cc, 0.3);
  const full = new THREE.Group();
  full.name = 'dropstones';
  full.add(new THREE.Mesh(geom, mat));
  const bounds = geom.boundingBox!.clone();
  return { full, impostor: impostorFromBoxes(colliders, bounds, 0xa9a698), bounds, colliders };
}
