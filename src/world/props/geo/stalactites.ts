/**
 * `feature: "stalactite-cluster"` (Great Blue Hole): a drowned karst alcove, a
 * curved limestone wall with a scalloped overhanging ceiling whose underside
 * carries clusters of fluted stalactites, fallen blocks blending the foot of
 * the wall into the seabed, and a few Caribbean sponges high on the face. The
 * real Blue Hole formed as a flooded cave system and holds stalactites in its
 * ledges at about 40 m. dims = [width, ledge projection, height].
 */

import * as THREE from 'three';
import { geoDetail } from './detail.js';
import { geoMaterial, LIFE_TINT } from './materials.js';
import {
  endRatio,
  pinchScale,
  endSink,
  extrudeProfile,
  interp,
  talusColliders,
  wallColliders,
  wallEnvelope,
} from './scarp.js';
import {
  boxCH,
  column,
  fbm3,
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
import { buildTalusMesh, placeRocks, rockMatrix, type TalusShape } from './talus.js';
import type { GeoBuildInput } from './types.js';

const WALL = new THREE.Color(0x9b9482);
const WALL_DARK = new THREE.Color(0x5b5648);
const TIP = new THREE.Color(0xe4d9be);
const AMBER = new THREE.Color(0xb59a6a);
const DRAPE = new THREE.Color(0xa59d88);

const EDGE_START = 0.55;

/**
 * (y, z) profile fractions from the apron join: a wall, a thick shelf whose
 * underside rises a little toward the lip (0.5-0.64 H), then the top. The
 * shelf's projection is scalloped along the wall (see `shelf`).
 */
const PROFILE: [number, number][] = [
  [0.1, -0.05],
  [0.3, -0.02],
  [0.48, 0],
  [0.5, -0.12],
  [0.51, -0.5],
  [0.535, -0.85],
  [0.57, -1.0],
  [0.63, -0.98],
  [0.66, -0.5],
  [0.68, -0.04],
  [0.9, 0],
  [1, 0.1],
  [1.02, 0.45],
  [0.7, 0.9],
  [0.3, 1.3],
  [-0.12, 1.75],
];

/** Underside of the shelf: (projection fraction of the lip, height fraction of H). */
const UNDERSIDE: [number, number][] = [
  [0.12, 0.5],
  [0.5, 0.51],
  [0.85, 0.535],
  [1, 0.57],
];

function undersideY(f: number): number {
  for (let i = 1; i < UNDERSIDE.length; i++) {
    const [f0, y0] = UNDERSIDE[i - 1]!;
    const [f1, y1] = UNDERSIDE[i]!;
    if (f <= f1) return y0 + (y1 - y0) * Math.max(0, (f - f0) / (f1 - f0));
  }
  return UNDERSIDE[UNDERSIDE.length - 1]![1];
}

export function buildStalactiteCluster(input: GeoBuildInput): BuiltProp {
  const { dims, seed, tier } = input;
  const gnd = input.groundHeight() ?? ((): number => 0);
  const d = geoDetail(tier);
  const [W, D, H] = dims;
  const rnd = mulberry32(seed);
  const rawProfile = PROFILE.map(([y, z]): [number, number] => [y * H, z * D]);
  const joinY = PROFILE[0]![0] * H;
  const footZ = rawProfile[0]![1];
  const profile: [number, number][] = [[joinY - 0.09 * H, footZ + 0.025 * D], ...rawProfile];
  const scale = Math.max(0.6, H / 30);

  // Plan: the alcove is a curved bay, ends swinging toward the viewer.
  const plan = (x: number): number => {
    const u = x / (W / 2);
    return D * (-0.5 * u * u + 0.08 * Math.sin(u * 2.4 + 0.7));
  };
  const footAt = (x: number): number => {
    const { edge } = wallEnvelope(x, W, EDGE_START);
    return footZ * (1 - edge * 0.55) + plan(x);
  };
  const scaleAt = (x: number): number => {
    const { edge, skyline } = wallEnvelope(x, W, EDGE_START);
    return pinchScale(edge) * skyline;
  };
  const sinkAt = (x: number): number => endSink(x, W, H);
  const liftAt = (x: number): number => gnd(x, footAt(x));

  /** How far the shelf projects at x (1 = the profile's lip): scalloped, in places hardly at all. */
  const shelf = (x: number): number =>
    0.42 + 0.95 * smooth(0.32, 0.62, fbm3(x * 0.075 + 4, 1, seed + 61, seed + 8, 3));

  const disp = (x: number, y: number, z: number): number => {
    const env = smooth(joinY, joinY + 0.15 * H, y);
    const rill = 1 - Math.abs(2 * fbm3(x * 0.4, y * 0.09, seed + 2, seed, 3) - 1);
    const bulge = (fbm3(x * 0.2, y * 0.08, seed, seed + 2, 4) - 0.5) * 2 * 1.8;
    const flute = (Math.pow(rill, 2.5) - 0.25) * -0.9;
    // The shelf window: scale the projection of everything between the underside and the top.
    const win = smooth(0.46 * H, 0.5 * H, y) * (1 - smooth(0.66 * H, 0.7 * H, y));
    return (bulge + flute) * env + z * (shelf(x) - 1) * win;
  };

  // --- the wall
  const wall = extrudeProfile(
    profile,
    W,
    Math.min(200, Math.round(W * 3 * d.meshDensity)),
    Math.min(140, Math.round(H * 3 * d.meshDensity)),
    disp,
    H,
    (x) => liftAt(x),
    EDGE_START,
    { plan, sink: sinkAt, uvTile: [6, 6] },
  );
  paint(wall, (x, yAbs, z, ny, out) => {
    const y = yAbs - liftAt(x);
    const n = fbm3(x * 0.25, y * 0.22, z * 0.25, seed ^ 0x21, 4);
    out.copy(WALL).lerp(WALL_DARK, smooth(0.5, 0.9, n) * 0.6);
    out.multiplyScalar(0.8 + 0.5 * n);
    if (ny > 0.6) out.multiplyScalar(0.85);
    out.lerp(AMBER, smooth(0.6, 0.9, fbm3(x * 0.5, y * 0.5, z * 0.5, seed ^ 0x5, 3)) * 0.35);
    // Horizontal solution notches and a darker, stained shelf underside.
    out.multiplyScalar(1 - 0.18 * smooth(0.7, 1, Math.sin(y * 0.9 + n * 4)));
    if (y > H * 0.48 && y < H * 0.64 && ny < -0.3) out.multiplyScalar(0.78);
    out.lerp(DRAPE, (1 - smooth(joinY, joinY + 0.12 * H, y)) * 0.7);
  });
  wall.computeBoundingBox();
  const full = new THREE.Group();
  full.name = 'stalactite-cluster';
  full.add(
    new THREE.Mesh(wall, geoMaterial('rock', d, { roughness: 0.9, side: THREE.DoubleSide })),
  );

  // --- fallen blocks and sediment blending the foot into the seabed
  const talus: TalusShape = {
    gnd,
    foot: footAt,
    reach: (x) => {
      const lobes = 0.5 + 1.0 * fbm3(x * 0.09, 2, seed + 31, seed + 5, 4);
      return 0.5 * D * lobes * (1 - smooth(0.5, 1, endRatio(x, W)));
    },
    top: (x) => Math.max(0.3, joinY * scaleAt(x) - sinkAt(x)),
    seed,
  };
  const apron = buildTalusMesh(
    talus,
    W,
    Math.min(160, Math.round(W * 1.2 * d.meshDensity)),
    Math.round(Math.max(12, (0.5 * D * 1.5) / 0.8) * d.meshDensity),
    5,
    (x, y, z, u, out) => {
      const n = fbm3(x * 0.2, z * 0.2, y * 0.1, seed ^ 0x52, 4);
      out
        .copy(WALL)
        .lerp(WALL_DARK, 0.25)
        .lerp(DRAPE, smooth(0.05, 0.9, u) * 0.85);
      out.multiplyScalar(0.78 + 0.5 * n);
      out.multiplyScalar(0.82 + 0.18 * smooth(0, 0.25, u));
    },
  );
  apron.computeBoundingBox();
  full.add(new THREE.Mesh(apron, geoMaterial('rock', d, { roughness: 0.92 })));
  if (d.rubble) {
    const spots = placeRocks(talus, W, Math.round(120 * d.growth), seed, {
      size: 0.7 * scale,
      blocks: 0.04,
      span: 0.44,
    });
    const g = lump(d.sphereDetail, seed + 9, 0.36, 2.2);
    paint(g, (_x, y, _z, _n, out) => out.setScalar(0.5 + 0.5 * smooth(-1, 0.5, y)));
    projectUVs(g, 1.2);
    const bm = geoMaterial('rock', d, { roughness: 0.94 });
    bm.flatShading = true;
    const rocks = new THREE.InstancedMesh(g, bm, Math.max(1, spots.length));
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    spots.forEach((spot, i) => {
      rockMatrix(spot, rnd() * 6.28, 0.55 + rnd() * 0.3, m);
      c.copy(WALL)
        .lerp(DRAPE, rnd() * 0.3 + 0.3 * spot.u)
        .multiplyScalar(0.8 + rnd() * 0.3);
      rocks.setMatrixAt(i, m);
      rocks.setColorAt(i, c);
    });
    rocks.count = spots.length;
    rocks.frustumCulled = false;
    rocks.name = 'fallen-blocks';
    if (spots.length) full.add(rocks);
  }

  // --- stalactites: clusters of fluted pendants hung from the underside of the shelf
  const colliders: THREE.Box3[] = wallColliders(profile, W, D, H, 8, gnd, {
    disp,
    edgeStart: EDGE_START,
    plan,
    liftAt,
    sinkAt,
  });
  colliders.push(...talusColliders(talus, W));
  const parts: THREE.BufferGeometry[] = [];
  const longest: { x: number; z: number; y: number; len: number; r: number }[] = [];
  const clusters = Math.max(4, Math.round(8 * Math.sqrt(d.growth)));
  for (let k = 0; k < clusters; k++) {
    const cx = (rnd() - 0.5) * W * 0.5;
    const cf = 0.25 + rnd() * 0.65; // projection fraction of the cluster centre
    const members = 2 + Math.floor(rnd() * 4);
    for (let i = 0; i < members; i++) {
      const x = cx + (rnd() - 0.5) * 3.2;
      const f = Math.min(0.97, Math.max(0.15, cf + (rnd() - 0.5) * 0.18));
      // Where the underside really is at this x: the profile's own point, displaced like the mesh.
      const z0 = -f * D;
      const sc = shelf(x);
      if (sc * f < 0.12) continue; // no shelf here: nothing to hang from
      const yBase = undersideY(f) * H;
      const z = z0 + disp(x, yBase, z0) + plan(x);
      const yTop = yBase * scaleAt(x) + liftAt(x) + 0.5;
      const main = i === 0;
      const len =
        (1.4 + rnd() * rnd() * 0.36 * H) *
        (main ? 1.35 : 0.55 + rnd() * 0.5) *
        (0.6 + 0.4 * scaleAt(x));
      const r = len * 0.12 + 0.22;
      parts.push(
        place(
          column({
            h: len,
            r0: r,
            topFrac: 0.05,
            seed: seed + (k * 7 + i) * 3,
            segs: 10 * d.meshDensity + 4,
            rings: 8,
            wobble: 0.3,
            ridges: 11,
            ridgeAmp: 0.16,
            flare: 0.7,
          }),
          { x, y: yTop, z, rx: Math.PI, ry: rnd() * 6.28, rz: (rnd() - 0.5) * 0.1 },
        ),
      );
      longest.push({ x, z, y: yTop, len, r });
    }
  }
  if (parts.length) {
    const stal = mergeAll(parts);
    // Cream at the tips, amber-stained toward the ceiling where each flares into the shelf.
    paint(stal, (x, y, z, ny, out) => {
      const n = fbm3(x * 0.8, y * 0.4, z * 0.8, seed ^ 0x44, 3);
      const t = clamp((y - H * 0.3) / (H * 0.3));
      out
        .copy(TIP)
        .lerp(AMBER, t * 0.7)
        .lerp(WALL_DARK, smooth(0.62, 0.85, t) * 0.35)
        .multiplyScalar(0.8 + 0.4 * n);
      void ny;
    });
    projectUVs(stal, 2);
    full.add(new THREE.Mesh(stal, geoMaterial('flow', d, { roughness: 0.75, bumpScale: 1.2 })));
  }
  longest.sort((a, b) => b.len - a.len);
  for (const s of longest.slice(0, 7)) {
    colliders.push(boxCH(s.x, s.y - s.len * 0.42, s.z, s.r * 0.7, s.len * 0.42, s.r * 0.7));
  }

  // --- a few sponges high on the face, above the sediment line (none on the floor)
  const sponge = new THREE.CylinderGeometry(0.16, 0.1, 0.7, 7, 1, true).translate(0, 0.35, 0);
  const sp: InstanceSpec[] = [];
  const ns = Math.round(34 * d.growth);
  for (let i = 0; i < ns; i++) {
    const x = (rnd() - 0.5) * W * 0.7;
    const y = H * (0.28 + rnd() * 0.2);
    const { edge } = wallEnvelope(x, W, EDGE_START);
    const z =
      (interp(profile, y) + disp(x, y, interp(profile, y)) * (1 - edge * 0.6)) * (1 - edge * 0.55) +
      plan(x) -
      0.05;
    const s = 0.7 + rnd() * 1.4;
    const hue = [0.78, 0.07, 0.13, 0.95, 0.5][Math.floor(rnd() * 5)]!;
    sp.push({
      t: {
        x,
        y: y * scaleAt(x) + liftAt(x),
        z,
        rx: -Math.PI / 2 + (rnd() - 0.5) * 0.5,
        ry: rnd() * 6.28,
        sx: s,
        sy: s * (0.7 + rnd()),
        sz: s,
      },
      color: new THREE.Color().setHSL(hue, 0.5, 0.45 + rnd() * 0.15),
    });
  }
  if (sp.length) {
    full.add(
      instanced(
        sponge,
        new THREE.MeshStandardMaterial({
          color: LIFE_TINT,
          roughness: 0.8,
          side: THREE.DoubleSide,
        }),
        sp,
        'sponges',
      ),
    );
  }

  const bounds = wall.boundingBox!.clone().union(apron.boundingBox!);
  bounds.min.y = Math.min(bounds.min.y, -0.1 * H);
  return {
    full,
    impostor: impostorFromBoxes(colliders, bounds, 0x8f8878),
    bounds,
    colliders,
  };
}

const clamp = (v: number): number => Math.min(1, Math.max(0, v));
