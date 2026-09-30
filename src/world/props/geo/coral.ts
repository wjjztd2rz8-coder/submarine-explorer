/**
 * `feature: "coral-mound"` (Blake Plateau, Hudson Canyon): a cold-water coral
 * mound. A rubble-and-sediment mound carries hundreds of instanced branching
 * colonies (Desmophyllum / Lophelia: ivory to peach), vase sponges and rubble.
 * dims = [length, width, height]. Counts and branching depth scale with tier.
 */

import * as THREE from 'three';
import { geoDetail, type GeoDetail } from './detail.js';
import { geoMaterial } from './materials.js';
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

const SEDIMENT = new THREE.Color(0x77705f);
const FRAMEWORK = new THREE.Color(0xb8b09b); // dead coral framework
const COVER = new THREE.Color(0xd8ccb2);
const IVORY = new THREE.Color(0xf0e8d8);
const PEACH = new THREE.Color(0xf0a678);

/** One branching colony (base at the origin, ~1 m tall), a few tapered tubes per level. */
function branchingColony(depth: number, seed: number): THREE.BufferGeometry {
  const rnd = mulberry32(seed);
  const parts: THREE.BufferGeometry[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  const grow = (
    base: THREE.Vector3,
    dir: THREE.Vector3,
    len: number,
    r: number,
    level: number,
  ): void => {
    const seg = new THREE.CylinderGeometry(r * 0.72, r, len, 4, 1, true);
    seg.translate(0, len / 2, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(up, dir);
    seg.applyMatrix4(new THREE.Matrix4().compose(base, q, new THREE.Vector3(1, 1, 1)));
    parts.push(seg);
    if (level >= depth) return;
    const tip = base.clone().addScaledVector(dir, len);
    const kids = level === 0 ? 4 : 2 + (rnd() < 0.4 ? 1 : 0);
    for (let k = 0; k < kids; k++) {
      const axis = new THREE.Vector3(rnd() - 0.5, 0, rnd() - 0.5).normalize();
      const q2 = new THREE.Quaternion().setFromAxisAngle(axis, 0.45 + rnd() * 0.5);
      const nd = dir.clone().applyQuaternion(q2);
      nd.y += 0.25;
      nd.normalize();
      grow(tip, nd, len * (0.62 + rnd() * 0.15), r * 0.72, level + 1);
    }
  };
  grow(new THREE.Vector3(0, 0, 0), up.clone(), 0.4, 0.075, 0);
  const g = mergeAll(parts);
  // Rounded polyp-tip look: vertex colour brightens toward the tips.
  paint(g, (_x, y, _z, _ny, out) => out.setScalar(0.8 + 0.3 * clamp01(y / 0.9)));
  return g;
}

export function buildCoralMound(input: GeoBuildInput): BuiltProp {
  const { dims, seed, tier } = input;
  const d: GeoDetail = geoDetail(tier);
  const [L, W, H] = dims;
  const rnd = mulberry32(seed);
  const mound = (x: number, z: number): number => {
    const r = Math.hypot(x / (L / 2), z / (W / 2));
    if (r >= 1) return -2;
    const ridge = 0.65 + 0.35 * fbm3(x * 0.09, 1, z * 0.09, seed + 3, 3) * 2;
    const base = H * Math.pow(1 - r * r, 0.9) * ridge;
    const n = (fbm3(x * 0.4, 9, z * 0.4, seed, 3) - 0.5) * H * 0.18;
    return Math.max(-2, base + n * clamp01(base / H) - smooth(0.85, 1, r) * 0.6);
  };
  const dens = d.meshDensity;
  const geom = heightMesh(L, W, Math.round(48 * dens), Math.round(48 * dens), mound);
  // Coral rubble knobs on the mound body.
  const knobs: THREE.BufferGeometry[] = [geom];
  const nk = Math.round(60 * d.growth);
  for (let i = 0; i < nk; i++) {
    const a = rnd() * 6.283;
    const rr = Math.sqrt(rnd()) * 0.8;
    const x = Math.cos(a) * rr * L * 0.5;
    const z = Math.sin(a) * rr * W * 0.5;
    const s = 0.4 + rnd() * 1.1;
    knobs.push(
      place(lump(1, seed + i, 0.35, 2), {
        x,
        y: mound(x, z) + s * 0.1,
        z,
        sx: s * 1.3,
        sy: s * 0.6,
        sz: s,
      }),
    );
  }
  const body = mergeAll(knobs);
  paint(body, (x, y, z, ny, out) => {
    const n = fbm3(x * 0.3, y * 0.3, z * 0.3, seed ^ 0x33, 4);
    out
      .copy(SEDIMENT)
      .lerp(FRAMEWORK, smooth(0.3, 0.75, n) * smooth(0.1, 0.5, ny + 0.2))
      .multiplyScalar(0.82 + 0.4 * n);
    // Live thickets tint the ground where colonies are dense.
    out.lerp(COVER, smooth(0.42, 0.62, fbm3(x * 0.16, 2, z * 0.16, seed + 9, 3)) * 0.55);
  });
  projectUVs(body, 2.5);
  body.computeBoundingBox();
  body.computeBoundingSphere();
  const full = new THREE.Group();
  full.name = 'coral-mound';
  full.add(new THREE.Mesh(body, geoMaterial('sediment', d, { roughness: 0.95, bumpScale: 1 })));

  // Live colonies: three templates, instanced.
  const total = Math.round(700 * Math.min(d.growth, 1.15));
  const templates = [0, 1, 2].map((k) => branchingColony(d.branchDepth, seed + 100 + k * 37));
  const cmat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.75,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  const groups: InstanceSpec[][] = [[], [], []];
  for (let i = 0; i < total; i++) {
    const a = rnd() * 6.283;
    const rr = Math.sqrt(rnd()) * 0.9;
    const x = Math.cos(a) * rr * L * 0.5;
    const z = Math.sin(a) * rr * W * 0.5;
    // Thickets cluster: keep colonies where a slow noise field is high, and prefer the slopes.
    const cluster = fbm3(x * 0.16, 2, z * 0.16, seed + 9, 3);
    if (cluster < 0.45 && rnd() < 0.92) continue;
    const y = mound(x, z);
    if (y < 0) continue;
    const s = 0.8 + rnd() * rnd() * 2.6;
    const c = new THREE.Color()
      .copy(IVORY)
      .lerp(PEACH, rnd() < 0.35 ? 0.4 + rnd() * 0.5 : rnd() * 0.15);
    groups[i % 3]!.push({
      t: {
        x,
        y: y - 0.05,
        z,
        ry: rnd() * 6.28,
        rx: (rnd() - 0.5) * 0.3,
        rz: (rnd() - 0.5) * 0.3,
        sx: s,
        sy: s * (0.8 + rnd() * 0.5),
        sz: s,
      },
      color: c,
    });
  }
  groups.forEach((g, k) => {
    if (g.length) full.add(instanced(templates[k]!, cmat, g, `colonies-${k}`));
  });

  // Vase sponges.
  const sponge = new THREE.CylinderGeometry(0.16, 0.09, 0.6, 7, 1, true).translate(0, 0.3, 0);
  const sp: InstanceSpec[] = [];
  const ns = Math.round(70 * d.growth);
  for (let i = 0; i < ns; i++) {
    const a = rnd() * 6.283;
    const rr = Math.sqrt(rnd()) * 0.9;
    const x = Math.cos(a) * rr * L * 0.5;
    const z = Math.sin(a) * rr * W * 0.5;
    const y = mound(x, z);
    if (y < 0) continue;
    const s = 0.6 + rnd() * 1.6;
    sp.push({
      t: { x, y: y - 0.05, z, sx: s, sy: s * (0.8 + rnd() * 0.8), sz: s },
      color: new THREE.Color().setHSL(0.09 + rnd() * 0.06, 0.35, 0.55 + rnd() * 0.2),
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

  const bounds = body.boundingBox!.clone();
  bounds.max.y += 1.5;
  const colliders: THREE.Box3[] = [
    boxCH(0, H * 0.32, 0, L * 0.3, H * 0.32, W * 0.3),
    boxCH(0, H * 0.7, 0, L * 0.14, H * 0.14, W * 0.14),
  ];
  return { full, impostor: impostorFromBoxes(colliders, bounds, 0x9b937f), bounds, colliders };
}
