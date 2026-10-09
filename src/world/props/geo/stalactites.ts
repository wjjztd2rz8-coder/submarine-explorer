/**
 * `feature: "stalactite-cluster"` (Great Blue Hole): a drowned karst alcove, a
 * curved limestone wall with a scalloped overhanging ceiling whose underside
 * carries clusters of fluted stalactites, fallen blocks blending the foot of
 * the wall into the seabed, and a few Caribbean sponges high on the face. The
 * stalactites formed in air-filled caves during glacial sea-level lows and now
 * sit at roughly 40–50 m depth. dims = [width, ledge projection, height].
 */

import * as THREE from 'three';
import { geoDetail } from './detail.js';
import { geoMaterial as baseGeoMaterial, LIFE_TINT, vertexGlow } from './materials.js';
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
const TIP = new THREE.Color(0xd2c6a6);
const AMBER = new THREE.Color(0xb59a6a);
const OCHRE = new THREE.Color(0xc79a52);
const GREY_BROWN = new THREE.Color(0x6a604f);
const DRAPE = new THREE.Color(0x8c8470);
const BED_WARM = new THREE.Color(0xb39a68);
const BED_COOL = new THREE.Color(0x7d8179);
/** Cool teal-grey of the water-filled depths: the apron and lower wall grade toward it. */
const DEEP_TEAL = new THREE.Color(0x5f817f);

const EDGE_START = 0.55;

/** Sunlit pale limestone: the shared rock albedo (kept dark for vents and tuff) is lifted. */
const LIMESTONE_LIFT = 2.7;
const geoMaterial: typeof baseGeoMaterial = (kind, d, o) => {
  const m = baseGeoMaterial(kind, d, o);
  m.color.multiplyScalar(LIMESTONE_LIFT);
  // Scattered light keeps the shelf pale tan like the hole's walls, not a dark silhouette.
  vertexGlow(m, 0.1, 0xc4d2c6, 0.35);
  return m;
};

/**
 * A solution notch beneath a low limestone roof. The rear returns into the
 * rising terrain instead of forming a tall exposed crest. Shelf projection
 * and pendant lengths retain the original gallery footprint.
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
  [0.7, -0.04],
  [0.7, 0.45],
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

/**
 * One pendant standing on y = 0 (the shelf end, wide) up to a thin tip at y = h.
 * Unlike a smooth cone: a concave taper with a needle tip, drip rings that
 * swell and pinch the radius, uneven flutes, and a slight lateral bend that
 * stays inside the foot's footprint. Indexed and smooth-shaded.
 */
function pendant(o: {
  h: number;
  r0: number;
  seed: number;
  /** Body thickness multiplier; the foot keeps the original footprint. */
  girth?: number;
  segs: number;
  rings: number;
}): THREE.BufferGeometry {
  const rnd = mulberry32(o.seed ^ 0x5a17);
  const g = new THREE.CylinderGeometry(
    o.r0 * 0.07,
    o.r0,
    o.h,
    Math.max(6, Math.round(o.segs)),
    Math.max(6, Math.round(o.rings)),
  );
  g.translate(0, o.h / 2, 0);
  const p = g.getAttribute('position');
  const concave = 1.05 + rnd() * 0.9;
  const bendDir = rnd() * 6.28;
  const bend = Math.min(o.r0 * 1.3, o.h * 0.1) * (0.4 + rnd() * 0.8);
  const ringFreq = 5 + rnd() * 6;
  const ringPhase = rnd() * 6.28;
  const flutes = 7 + Math.floor(rnd() * 6);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const t = y / o.h;
    const ang = Math.atan2(z, x);
    const n = fbm3(Math.cos(ang) * 1.6 + 3, t * 5, Math.sin(ang) * 1.6 + 3, o.seed, 3);
    // Concave taper (thick throat, needle tip) with a flared foot into the shelf.
    let f = Math.pow(1 - t * 0.94, concave);
    f *= 1 + 0.7 * (1 - smooth(0, 0.18, t));
    // Drip rings: radius swells and pinches along the length, more toward the tip.
    f *= 1 + 0.13 * Math.sin(t * ringFreq * 6.28 + ringPhase + n * 3) * (0.4 + 0.6 * t);
    f *= 1 + (n - 0.5) * 0.85;
    f *= 1 + 0.16 * Math.sin(ang * flutes + n * 7 + t * 3);
    // The foot keeps the original gallery's footprint: it grows out of the shelf.
    const n0 = fbm3(
      Math.cos(ang) * 1.4 + 3,
      y * (0.5 / Math.max(1, o.h / 12)) * 4,
      Math.sin(ang) * 1.4 + 3,
      o.seed,
      3,
    );
    const foot = (1 + (n0 - 0.5) * 0.6) * (1 + 0.16 * Math.sin(ang * 11 + n0 * 6)) * 1.7;
    f = Math.min(f * (o.girth ?? 1), foot * 0.94);
    f = foot + (f - foot) * smooth(0, 0.12, t);
    const bx = Math.cos(bendDir) * bend * t * t;
    const bz = Math.sin(bendDir) * bend * t * t;
    // The cylinder's own taper is part of its radius; divide it out, then apply ours.
    const base = 1 - (1 - 0.07) * t;
    p.setXYZ(i, (x / base) * f + bx, y, (z / base) * f + bz);
  }
  g.computeVertexNormals();
  return g;
}

export function buildStalactiteCluster(input: GeoBuildInput): BuiltProp {
  const { dims, seed, tier } = input;
  const east = input.def.id === 'karst-grotto-east';
  const gnd = input.groundHeight() ?? ((): number => 0);
  const d = geoDetail(tier);
  const [W, D, H] = dims;
  const rnd = mulberry32(seed);
  const vr = mulberry32(seed ^ 0x7e11);
  // A continuous, thicker lip frames the east mouth; retain the west alcove's scallops.
  const mouthProfile = east
    ? PROFILE.map(([y, z]): [number, number] =>
        y === 0.63 ? [0.65, -1.02] : y === 0.66 ? [0.69, -0.5] : [y, z],
      )
    : PROFILE;
  const rawProfile = mouthProfile.map(([y, z]): [number, number] => [y * H, z * D]);
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
  const shelf = (x: number): number => {
    const scallop = smooth(0.32, 0.62, fbm3(x * 0.075 + 4, 1, seed + 61, seed + 8, 3));
    return east ? 0.88 + 0.3 * scallop : 0.42 + 0.95 * scallop;
  };

  // Opening light multiplies the banded vertex glow, preserving the strata and
  // underside shading without a new light or transparent fog plane.
  const surfaceMaterial: typeof geoMaterial = (kind, detail, opts) => {
    const m = geoMaterial(kind, detail, opts);
    if (!east) return m;
    m.emissive.set(0xa4ced8).multiplyScalar(0.16);
    const inherited = m.onBeforeCompile;
    m.onBeforeCompile = (shader, renderer) => {
      inherited.call(m, shader, renderer);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying float vGrottoDepth;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGrottoDepth = position.z;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vGrottoDepth;')
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>\nfloat openingLight = 1.0 - smoothstep(${(-D * 0.95).toFixed(3)}, ${(-D * 0.12).toFixed(3)}, vGrottoDepth);\ntotalEmissiveRadiance *= 0.28 + 0.72 * openingLight;`,
        );
    };
    m.customProgramCacheKey = () => `blue-hole-east-opening-${D}`;
    return m;
  };

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
    if (ny > 0.6) {
      // Shelf tops and ledges: silted, mottled grey-tan with darker pockets, never a flat pale slab.
      const m = fbm3(x * 0.09, z * 0.09, 5, seed ^ 0x3c, 4);
      out.multiplyScalar(0.86).lerp(BED_WARM, smooth(0.35, 0.7, m) * 0.4);
      out.multiplyScalar(0.8 + 0.45 * smooth(0.25, 0.75, m));
    }
    out.lerp(AMBER, smooth(0.6, 0.9, fbm3(x * 0.5, y * 0.5, z * 0.5, seed ^ 0x5, 3)) * 0.35);
    // Horizontal solution notches and a darker, stained shelf underside.
    out.multiplyScalar(1 - 0.18 * smooth(0.7, 1, Math.sin(y * 0.9 + n * 4)));
    if (y > H * 0.48 && y < H * 0.64 && ny < -0.3) out.multiplyScalar(0.78);
    // Strata: uneven warm and grey beds with a dark joint between, so the face is not one flat tone.
    const bed = y / (2.6 * scale) + 1.3 * fbm3(x * 0.05, 1, z * 0.05, seed ^ 0x77, 2);
    const bh = fbm3(Math.floor(bed) * 3.1, 7, 1, seed ^ 0x13, 2);
    out.lerp(BED_WARM, smooth(0.45, 0.75, bh) * 0.45).lerp(BED_COOL, smooth(0.45, 0.2, bh) * 0.4);
    out.multiplyScalar(0.72 + 0.28 * smooth(0, 0.12, bed - Math.floor(bed)));
    out.lerp(DRAPE, (1 - smooth(joinY, joinY + 0.12 * H, y)) * 0.4);
    // Documentary-still contrast: ochre beds high on the face, grey-brown lower down, dark
    // joints and a shadowed foot and underside, so the wall reads as stacked limestone.
    const hf = clamp(y / (0.62 * H));
    out.lerp(OCHRE, 0.34 * smooth(0.25, 0.9, hf) * (0.5 + bh));
    out.lerp(GREY_BROWN, 0.5 * (1 - smooth(0.05, 0.75, hf)));
    out.lerp(DEEP_TEAL, 0.22 * (1 - smooth(0.1, 0.8, hf)));
    out.multiplyScalar(0.62 + 0.5 * smooth(0, 0.14, bed - Math.floor(bed)));
    out.multiplyScalar(0.62 + 0.38 * smooth(0, 0.22, hf));
    if (ny < -0.35) out.multiplyScalar(0.7);
  });
  wall.computeBoundingBox();
  const full = new THREE.Group();
  full.name = 'stalactite-cluster';
  const wallMesh = new THREE.Mesh(
    wall,
    surfaceMaterial('rock', d, { roughness: 0.9, side: THREE.DoubleSide }),
  );
  wallMesh.name = 'grotto-overhang';
  full.add(wallMesh);

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
        .lerp(WALL_DARK, 0.3)
        .lerp(DRAPE, smooth(0.05, 0.9, u) * 0.45);
      // Sediment tone drifts between warm sand, grey silt and darker fallen debris; no flat cream.
      const t = fbm3(x * 0.07, z * 0.07, 3, seed ^ 0x91, 3);
      out.lerp(BED_WARM, smooth(0.5, 0.8, t) * 0.55).lerp(BED_COOL, smooth(0.5, 0.2, t) * 0.3);
      out.multiplyScalar(0.6 + 0.95 * n);
      // Streaks of fallen debris running down the slope, and a shadowed contact with the wall.
      const streak = fbm3(x * 0.45, z * 0.09, 6, seed ^ 0x63, 3);
      out.multiplyScalar(0.78 + 0.45 * smooth(0.3, 0.7, streak));
      out.lerp(OCHRE, 0.1 * smooth(0.45, 0.8, t));
      // Away from the wall the apron sinks toward the cool blue-green of the deep water.
      out.lerp(DEEP_TEAL, (0.3 + 0.35 * smooth(0.2, 0.9, u)) * (0.7 + 0.5 * (1 - t)));
      out.multiplyScalar(0.5 + 0.5 * smooth(0, 0.4, u));
    },
  );
  apron.computeBoundingBox();
  full.add(new THREE.Mesh(apron, surfaceMaterial('rock', d, { roughness: 0.92 })));
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
  const colliders: THREE.Box3[] = wallColliders(profile, W, D, H, 12, gnd, {
    disp,
    edgeStart: EDGE_START,
    plan,
    liftAt,
    sinkAt,
  });
  colliders.push(...talusColliders(talus, W));
  const parts: THREE.BufferGeometry[] = [];
  const longest: { x: number; z: number; y: number; len: number; r: number }[] = [];
  const clusters = Math.max(4, Math.round((east ? 10 : 8) * Math.sqrt(d.growth)));
  for (let k = 0; k < clusters; k++) {
    const cx = east
      ? ((k + 0.25 + rnd() * 0.5) / clusters - 0.5) * W * 0.62
      : (rnd() - 0.5) * W * 0.5;
    // Alternate lip silhouettes and recessed clusters, leaving water between them.
    const cf = east ? (k % 3 === 0 ? 0.84 : k % 3 === 1 ? 0.57 : 0.32) : 0.25 + rnd() * 0.65;
    const members = 2 + Math.floor(rnd() * 4);
    for (let i = 0; i < members; i++) {
      const x = cx + (rnd() - 0.5) * 3.2;
      const f = Math.min(0.97, Math.max(0.15, cf + (rnd() - 0.5) * 0.18));
      // Where the underside really is at this x: the profile's own point, displaced like the mesh.
      const z0 = -f * D;
      const sc = shelf(x);
      if (sc * f < 0.12) continue; // no shelf here: nothing to hang from
      const yBase = undersideY(f) * H;
      const { edge } = wallEnvelope(x, W, EDGE_START);
      const z = east
        ? (z0 + disp(x, yBase, z0) * (1 - edge * 0.6)) * (1 - edge * 0.55) + plan(x)
        : z0 + disp(x, yBase, z0) + plan(x);
      const yTop = yBase * scaleAt(x) + liftAt(x) + 0.5 - (east ? sinkAt(x) : 0);
      const main = i === 0;
      const generatedLength =
        (1.4 + rnd() * rnd() * 0.36 * H) *
        (main ? 1.35 : 0.55 + rnd() * 0.5) *
        (0.6 + 0.4 * scaleAt(x));
      const len = east
        ? Math.min(H * (main ? 0.27 + rnd() * 0.17 : 0.065 + rnd() * 0.13), yTop - gnd(x, z) - 0.7)
        : generatedLength;
      if (east && len < 0.5) continue;
      // Thick, uneven columns: some stout, some slender, so no two read alike.
      // Variation draws use their own stream, so the placement of the original gallery is unchanged.
      const lean = main ? 0 : 0.05 + vr() * 0.14;
      const leanDir = vr() * 6.28;
      const r = len * 0.12 + 0.22;
      const girth = 1 + vr() * 1.4;
      parts.push(
        place(
          pendant({
            h: len,
            r0: r,
            girth,
            seed: seed + (k * 7 + i) * 3,
            segs: 10 * d.meshDensity + 4,
            rings: 8 + 6 * d.meshDensity,
          }),
          {
            x,
            y: yTop,
            z,
            rx: Math.PI + lean * Math.cos(leanDir),
            ry: rnd() * 6.28,
            rz: (rnd() - 0.5) * 0.1 + lean * Math.sin(leanDir),
          },
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
    const gallery = new THREE.Mesh(
      stal,
      surfaceMaterial('flow', d, { roughness: 0.75, bumpScale: 1.2 }),
    );
    gallery.name = 'stalactite-gallery';
    full.add(gallery);
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
