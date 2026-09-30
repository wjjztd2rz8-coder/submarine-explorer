/**
 * `feature: "stalactite-cluster"` (Great Blue Hole): a drowned karst alcove, a
 * limestone wall with an overhanging ledge whose underside bristles with
 * fluted stalactites, and colourful Caribbean sponges on the face. The real
 * Blue Hole formed as a flooded cave system and holds stalactites in its
 * ledges at about 40 m. dims = [width, ledge projection, height].
 */

import * as THREE from 'three';
import { geoDetail } from './detail.js';
import { geoMaterial } from './materials.js';
import { extrudeProfile, interp, profileColliders } from './scarp.js';
import {
  boxCH,
  column,
  fbm3,
  impostorFromBoxes,
  instanced,
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

const WALL = new THREE.Color(0x9b9482);
const WALL_DARK = new THREE.Color(0x5b5648);
const TIP = new THREE.Color(0xe4d9be);
const AMBER = new THREE.Color(0xb59a6a);

/** (y, z) profile fractions: a wall, an overhanging ledge at 0.5-0.64 H, then the top. */
const PROFILE: [number, number][] = [
  [-0.12, -0.28],
  [0, -0.22],
  [0.08, -0.05],
  [0.5, 0],
  [0.52, -0.6],
  [0.57, -1.0],
  [0.62, -0.98],
  [0.64, -0.5],
  [0.66, -0.02],
  [0.9, 0],
  [1, 0.1],
  [1.02, 0.45],
];

/** Height of the ledge underside at horizontal projection `f` (0 = wall, 1 = lip), in fractions of H. */
const undersideY = (f: number): number =>
  f < 0.6 ? 0.5 + 0.0333 * f : 0.5 + 0.02 + ((f - 0.6) / 0.4) * 0.05;

export function buildStalactiteCluster(input: GeoBuildInput): BuiltProp {
  const { dims, seed, tier } = input;
  const d = geoDetail(tier);
  const [W, D, H] = dims;
  const rnd = mulberry32(seed);
  const profile = PROFILE.map(([y, z]): [number, number] => [y * H, z * D]);
  const disp = (x: number, y: number): number => {
    const env = smooth(-0.05 * H, 0.15 * H, y);
    const bulge = (fbm3(x * 0.2, y * 0.08, seed, seed + 2, 4) - 0.5) * 2 * 1.6 * env;
    const flute = Math.sin(x * 1.3 + fbm3(x * 0.3, y * 0.1, 3, seed, 2) * 5) * 0.18 * env;
    return bulge + flute;
  };
  const wall = extrudeProfile(
    profile,
    W,
    Math.min(150, Math.round(W * 2.4 * d.meshDensity)),
    Math.min(90, Math.round(H * 2.2 * d.meshDensity)),
    (x, y) => disp(x, y),
    H,
  );
  paint(wall, (x, y, z, ny, out) => {
    const n = fbm3(x * 0.25, y * 0.22, z * 0.25, seed ^ 0x21, 4);
    out.copy(WALL).lerp(WALL_DARK, smooth(0.5, 0.9, n) * 0.6);
    out.multiplyScalar(0.8 + 0.5 * n);
    if (ny > 0.6) out.multiplyScalar(0.85);
    out.lerp(AMBER, smooth(0.6, 0.9, fbm3(x * 0.5, y * 0.5, z * 0.5, seed ^ 0x5, 3)) * 0.35);
    if (y > H * 0.5 && y < H * 0.62 && ny < -0.3) out.multiplyScalar(0.8); // ledge underside, shaded
  });
  projectUVs(wall, 4);
  wall.computeBoundingBox();
  const full = new THREE.Group();
  full.name = 'stalactite-cluster';
  full.add(
    new THREE.Mesh(wall, geoMaterial('rock', d, { roughness: 0.9, side: THREE.DoubleSide })),
  );

  // Stalactites hang from the underside; a few are fused pillars reaching down to a stump.
  const count = Math.max(8, Math.round(30 * d.growth));
  const parts: THREE.BufferGeometry[] = [];
  const colliders: THREE.Box3[] = profileColliders(profile, W, D, H, 8);
  const longest: { x: number; z: number; y: number; len: number; r: number }[] = [];
  for (let i = 0; i < count; i++) {
    const f = 0.12 + rnd() * 0.85;
    const x = (rnd() - 0.5) * W * 0.86;
    const z = -f * D;
    const yTop = undersideY(f) * H + 0.35;
    const len = (1.2 + rnd() * rnd() * 0.36 * H) * (0.6 + 0.6 * (1 - Math.abs(x) / (W / 2)));
    const r = len * 0.14 + 0.16;
    parts.push(
      place(
        column({
          h: len,
          r0: r,
          topFrac: 0.07,
          seed: seed + i * 3,
          segs: 9 * d.meshDensity + 3,
          rings: 7,
          wobble: 0.28,
          ridges: 9,
          flare: 0.35,
        }),
        { x, y: yTop, z, rx: Math.PI, ry: rnd() * 6.28, rz: (rnd() - 0.5) * 0.12 },
      ),
    );
    longest.push({ x, z, y: yTop, len, r });
  }
  const stal = mergeAll(parts);
  // Cream at the tips, amber-stained toward the ceiling.
  paint(stal, (x, y, z, ny, out) => {
    const n = fbm3(x * 0.8, y * 0.4, z * 0.8, seed ^ 0x44, 3);
    const t = clamp((y - H * 0.4) / (H * 0.25));
    out
      .copy(TIP)
      .lerp(AMBER, t * 0.7)
      .multiplyScalar(0.8 + 0.4 * n);
    void ny;
  });
  projectUVs(stal, 2);
  full.add(new THREE.Mesh(stal, geoMaterial('flow', d, { roughness: 0.75, bumpScale: 1.2 })));
  longest.sort((a, b) => b.len - a.len);
  for (const s of longest.slice(0, 7)) {
    colliders.push(boxCH(s.x, s.y - s.len * 0.42, s.z, s.r * 0.7, s.len * 0.42, s.r * 0.7));
  }

  // Sponges on the face: tubes and vases pointing outward, in warm Caribbean colours.
  const sponge = new THREE.CylinderGeometry(0.16, 0.1, 0.7, 7, 1, true).translate(0, 0.35, 0);
  const sp: InstanceSpec[] = [];
  const ns = Math.round(90 * d.growth);
  for (let i = 0; i < ns; i++) {
    const x = (rnd() - 0.5) * W * 0.8;
    const y = H * (0.04 + rnd() * 0.44);
    const z = interp(profile, y) + disp(x, y) - 0.05;
    const s = 0.7 + rnd() * 1.6;
    const hue = [0.78, 0.07, 0.13, 0.95, 0.5][Math.floor(rnd() * 5)]!;
    sp.push({
      t: {
        x,
        y,
        z,
        rx: -Math.PI / 2 + (rnd() - 0.5) * 0.5,
        ry: rnd() * 6.28,
        sx: s,
        sy: s * (0.7 + rnd()),
        sz: s,
      },
      color: new THREE.Color().setHSL(hue, 0.55, 0.5 + rnd() * 0.15),
    });
  }
  if (sp.length) {
    full.add(
      instanced(
        sponge,
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, side: THREE.DoubleSide }),
        sp,
        'sponges',
      ),
    );
  }

  const bounds = wall.boundingBox!.clone();
  bounds.min.y = Math.min(bounds.min.y, -0.1 * H);
  return {
    full,
    impostor: impostorFromBoxes(colliders.slice(0, 8), bounds, 0x8f8878),
    bounds,
    colliders,
  };
}

const clamp = (v: number): number => Math.min(1, Math.max(0, v));
