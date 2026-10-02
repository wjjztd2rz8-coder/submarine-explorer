/**
 * Scarps: a wall of rock extruded from a side profile, standing on a graded
 * talus apron of rubble. One builder, three presets that differ in plan shape,
 * profile, bedding and weathering:
 *
 *   tuff    Hunga Tonga caldera wall: an arcuate, jointed wall of banded
 *           pyroclastic tuff with dipping strata and block-and-ash rubble
 *   canyon  Monterey Canyon wall: an S-bend in plan, thin-bedded mudstone with
 *           an undercut base and receding terraces, rubble on the outer bend
 *           and a clear sandy passage on the inner one
 *   hadal   Challenger Deep wall: a crescentic slump scarp of dark silt, with
 *           back-tilted slump benches and big displaced blocks
 *
 * dims = [width, depth (toe to crest), height]. The face looks toward local -Z;
 * the rock lies behind it (+Z). The profile is (y, z) as fractions of height and
 * depth, from the join with the apron up over the crest and down the back;
 * z < 0 is toward the viewer. The apron (`talus.ts`) is built from the final
 * ground height, so its lobed rim is sunk into the seabed, and every rock sits
 * on its surface.
 */

import * as THREE from 'three';
import { geoDetail } from './detail.js';
import { geoMaterial } from './materials.js';
import { shimmerPlume } from './plume.js';
import type { GeoTexKind } from './textures.js';
import {
  boxCH,
  fbm3,
  impostorFromBoxes,
  lump,
  mulberry32,
  paint,
  projectUVs,
  smooth,
  type BuiltProp,
} from './shared.js';
import { buildTalusMesh, placeRocks, rockMatrix, type RockSpot, type TalusShape } from './talus.js';
import type { GeoBuildInput } from './types.js';

export type ScarpPresetId = 'tuff' | 'canyon' | 'hadal';

/** Metres of surface per texture tile on the walls (world-scale mapping). */
const TILE_M = 5;

interface Preset {
  tex: GeoTexKind;
  /** (y / H, z / D) control points from the apron join up and over the crest. */
  profile: [number, number][];
  /** Wall foot height (fraction of H) where the apron meets the face. */
  join: number;
  /** Mean apron reach (fraction of D). */
  reach: number;
  /** Plan curvature: z shift of the wall ends (fraction of D, negative = toward the viewer). */
  arc: number;
  /** S-bend amplitude in plan (fraction of D) and its phase. */
  sbend: number;
  sPhase: number;
  /** Apron reach along x: 1 everywhere, or ramped to leave a clear passage on one side. */
  passage: number;
  /** Strata bands over the height, and bedding dip (m of rise per m along the wall). */
  bands: number;
  dip: number;
  /** Strata ledge amplitude, gully amplitude (m per 30 m of height). */
  ledge: number;
  gully: number;
  gullyFreq: number;
  /** Cooling-joint block width (m) with ± step (m per 30 m of height); 0 = none. */
  joints: number;
  jointStep: number;
  /** Slump-bench height variation along the wall (fraction of H). */
  benchVar: number;
  base: THREE.Color;
  band: THREE.Color;
  crest: THREE.Color;
  drape: THREE.Color;
  boulder: THREE.Color;
  /** Rocks at full growth, mean radius scale (m per 30 m of height), slump-block fraction. */
  boulders: number;
  rockSize: number;
  blocks: number;
  rough: number;
  /** Where the ends start to pinch (fraction of the half width). */
  edgeStart: number;
  /** Metres per texture tile along the wall and up the face (anisotropic: bedding runs along x). */
  tile: [number, number];
}

const REAR: [number, number][] = [
  [1.02, 0.5],
  [0.7, 0.95],
  [0.3, 1.35],
  [-0.12, 1.8],
];

const PRESETS: Record<ScarpPresetId, Preset> = {
  tuff: {
    tex: 'strata',
    profile: [
      [0.14, -0.2],
      [0.26, -0.12],
      [0.3, -0.17],
      [0.42, -0.08],
      [0.47, -0.14],
      [0.62, -0.04],
      [0.68, -0.09],
      [0.86, 0],
      [0.93, -0.05],
      [1, 0.02],
      ...REAR,
    ],
    join: 0.14,
    reach: 0.6,
    arc: -0.42,
    sbend: 0.05,
    sPhase: 0.6,
    passage: 0,
    bands: 15,
    dip: 0.1,
    ledge: 0.7,
    gully: 1.5,
    gullyFreq: 0.14,
    joints: 7,
    jointStep: 1.4,
    benchVar: 0.03,
    base: new THREE.Color(0x8d7d63), // tan tuff
    band: new THREE.Color(0x56554a), // darker ash bands, greenish
    crest: new THREE.Color(0xa89679),
    drape: new THREE.Color(0x7a6f5c),
    boulder: new THREE.Color(0x7f7461),
    boulders: 220,
    rockSize: 0.75,
    blocks: 0.05,
    rough: 0.95,
    edgeStart: 0.3,
    tile: [11, 6],
  },
  canyon: {
    tex: 'strata',
    profile: [
      [0.13, -0.14],
      [0.22, -0.1],
      [0.3, -0.02],
      [0.36, 0.13],
      [0.42, 0.11],
      [0.46, -0.1],
      [0.58, -0.13],
      [0.61, -0.02],
      [0.75, 0],
      [0.77, 0.1],
      [0.93, 0.12],
      [1, 0.17],
      ...REAR,
    ],
    join: 0.13,
    reach: 0.72,
    arc: -0.06,
    sbend: 0.24,
    sPhase: 0.4,
    passage: 1,
    bands: 18,
    dip: -0.07,
    ledge: 1.1,
    gully: 1.4,
    gullyFreq: 0.19,
    joints: 0,
    jointStep: 0,
    benchVar: 0.025,
    base: new THREE.Color(0x6d6b57), // olive-grey mudstone
    band: new THREE.Color(0x4a4a3f),
    crest: new THREE.Color(0x8a866f),
    drape: new THREE.Color(0x857d6b), // pale silt
    boulder: new THREE.Color(0x66624f),
    boulders: 160,
    rockSize: 0.7,
    blocks: 0.04,
    rough: 0.97,
    edgeStart: 0.3,
    tile: [12, 5],
  },
  hadal: {
    tex: 'rock',
    profile: [
      [0.16, -0.22],
      [0.3, -0.18],
      [0.36, -0.3],
      [0.46, -0.12],
      [0.62, -0.08],
      [0.7, -0.14],
      [0.74, -0.04],
      [1, 0.06],
      ...REAR,
    ],
    join: 0.16,
    reach: 0.52,
    arc: -0.3,
    sbend: 0.08,
    sPhase: 2.1,
    passage: 0,
    bands: 5,
    dip: 0.06,
    ledge: 0.55,
    gully: 3,
    gullyFreq: 0.1,
    joints: 0,
    jointStep: 0,
    benchVar: 0.07,
    base: new THREE.Color(0x5d5850), // dark silty grey-brown
    band: new THREE.Color(0x45433e),
    crest: new THREE.Color(0x7d766a),
    drape: new THREE.Color(0x8a8272), // pale hadal silt
    boulder: new THREE.Color(0x58544c),
    boulders: 190,
    rockSize: 0.85,
    blocks: 0.08,
    rough: 0.98,
    edgeStart: 0.3,
    tile: [7, 7],
  },
};

/** Resample a polyline (absolute metres) into `n + 1` points of equal arc length. */
function resample(pts: [number, number][], n: number): [number, number][] {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1]! + Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]));
  }
  const total = cum[cum.length - 1]!;
  const out: [number, number][] = [];
  let seg = 1;
  for (let j = 0; j <= n; j++) {
    const s = (j / n) * total;
    while (seg < pts.length - 1 && cum[seg]! < s) seg++;
    const t = (s - cum[seg - 1]!) / Math.max(1e-6, cum[seg]! - cum[seg - 1]!);
    out.push([
      pts[seg - 1]![0] + (pts[seg]![0] - pts[seg - 1]![0]) * t,
      pts[seg - 1]![1] + (pts[seg]![1] - pts[seg - 1]![1]) * t,
    ]);
  }
  return out;
}

/**
 * How far along toward its end a wall is at x (1 = the end): the two ends sit at slightly
 * different distances and wander a little, so the outline is not a symmetric slab.
 */
export function endRatio(x: number, width: number): number {
  const half = (width / 2) * (x < 0 ? 0.88 : 1);
  return (Math.abs(x) / half) * (1 + 0.16 * (fbm3(x * 0.07, 9, Math.round(width), 5, 2) - 0.5));
}

/** Height multiplier of a wall at `edge` (0 mid-wall, 1 at the end): a long fading taper. */
export function pinchScale(edge: number): number {
  return 1 - 0.88 * Math.pow(edge, 1.5);
}

/**
 * How the wall ends pinch: `edge` (0 mid-wall, 1 at the ends) and the ragged
 * `skyline` multiplier on positive heights. Shared by the mesh and colliders.
 */
export function wallEnvelope(
  x: number,
  width: number,
  edgeStart: number,
): { edge: number; skyline: number } {
  const edge = smooth(edgeStart, 1, endRatio(x, width));
  // A ragged skyline: the crest varies along the wall and slopes away at both ends.
  const skyline =
    edgeStart < 0.6 ? 0.72 + 0.5 * fbm3(x * 0.06, 1, width, Math.round(width * 31), 4) : 1;
  return { edge, skyline };
}

/** Metres the very ends of a wall sink below the ground so they run out under the seabed. */
export function endSink(x: number, width: number, height: number): number {
  return 0.2 * height * smooth(0.9, 1, endRatio(x, width));
}

/** Optional extras for `extrudeProfile`. */
export interface ExtrudeOpts {
  /** Plan offset: extra z of the whole section at x (curvature of the wall in plan). */
  plan?: (x: number) => number;
  /** Extra downward y at x (burying the ends). */
  sink?: (x: number) => number;
  /** Metres per texture tile: writes `uv` as (x, arc length along the profile). A pair is (along, up). */
  uvTile?: number | [number, number];
}

/**
 * Extrude a (y, z) profile along x. `disp(x, y, z0)` returns extra z offset in
 * metres. The ends pinch down so the wall does not stop abruptly. Returns an
 * indexed, smooth-shaded geometry.
 */
export function extrudeProfile(
  profile: [number, number][],
  width: number,
  nx: number,
  ny: number,
  disp: (x: number, y: number, z: number) => number,
  height: number,
  lift?: (x: number, y: number, z: number) => number,
  edgeStart = 0.4,
  opts: ExtrudeOpts = {},
): THREE.BufferGeometry {
  const pts = resample(profile, ny);
  const pos = new Float32Array((nx + 1) * (ny + 1) * 3);
  const uv = opts.uvTile ? new Float32Array((nx + 1) * (ny + 1) * 2) : null;
  const [tu, tv] = Array.isArray(opts.uvTile) ? opts.uvTile : [opts.uvTile ?? 1, opts.uvTile ?? 1];
  let arc = 0;
  const arcs = [0];
  for (let j = 1; j <= ny; j++) {
    arc += Math.hypot(pts[j]![0] - pts[j - 1]![0], pts[j]![1] - pts[j - 1]![1]);
    arcs.push(arc);
  }
  const idx: number[] = [];
  for (let i = 0; i <= nx; i++) {
    const x = (i / nx - 0.5) * width;
    const { edge, skyline } = wallEnvelope(x, width, edgeStart);
    const plan = opts.plan ? opts.plan(x) : 0;
    const sink = opts.sink ? opts.sink(x) : 0;
    for (let j = 0; j <= ny; j++) {
      const [y0, z0] = pts[j]!;
      const y = y0 > 0 ? y0 * pinchScale(edge) * skyline : y0;
      const z = (z0 + disp(x, y0, z0) * (1 - edge * 0.6)) * (1 - edge * 0.55) + plan;
      const n = i * (ny + 1) + j;
      pos[n * 3] = x;
      pos[n * 3 + 1] = y + (lift ? lift(x, y0, z0) : 0) - sink;
      pos[n * 3 + 2] = z;
      if (uv) {
        uv[n * 2] = (x + plan * 0.35) / tu;
        uv[n * 2 + 1] = arcs[j]! / tv;
      }
    }
  }
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      const a = i * (ny + 1) + j;
      const b = a + 1;
      const c = (i + 1) * (ny + 1) + j;
      const d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  }
  // Cap both ends so the extrusion is a closed solid (no hollow seen through a pinched end).
  const rings = ny + 1;
  const total = (nx + 1) * rings;
  const capPos: number[] = [];
  const capIdx: number[] = [];
  for (const i of [0, nx]) {
    const base = total + capPos.length / 3;
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (let j = 0; j < rings; j++) {
      const n = (i * rings + j) * 3;
      capPos.push(pos[n]!, pos[n + 1]!, pos[n + 2]!);
      cx += pos[n + 1]! / rings;
      cy += pos[n + 2]! / rings;
      cz += pos[n]! / rings;
    }
    capPos.push(cz, cx, cy);
    const sign = i === 0 ? -1 : 1;
    for (let j = 0; j < ny; j++) {
      const a = base + j;
      const b = base + j + 1;
      const c = base + rings;
      // Orient the fan outward along +/-x from the first ring segment.
      const ay = capPos[(a - total) * 3 + 1]! - capPos[(c - total) * 3 + 1]!;
      const az = capPos[(a - total) * 3 + 2]! - capPos[(c - total) * 3 + 2]!;
      const by = capPos[(b - total) * 3 + 1]! - capPos[(c - total) * 3 + 1]!;
      const bz = capPos[(b - total) * 3 + 2]! - capPos[(c - total) * 3 + 2]!;
      const nxDir = ay * bz - az * by; // x component of (a - c) x (b - c)
      if (nxDir * sign >= 0) capIdx.push(a, b, c);
      else capIdx.push(b, a, c);
    }
  }
  const allPos = new Float32Array(pos.length + capPos.length);
  allPos.set(pos);
  allPos.set(capPos, pos.length);
  let allUv: Float32Array | null = null;
  if (uv) {
    allUv = new Float32Array((allPos.length / 3) * 2);
    allUv.set(uv);
    for (let k = 0; k < capPos.length / 3; k++) {
      allUv[(total + k) * 2] = capPos[k * 3 + 2]! / tu;
      allUv[(total + k) * 2 + 1] = capPos[k * 3 + 1]! / tv;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(allPos, 3));
  if (allUv) g.setAttribute('uv', new THREE.BufferAttribute(allUv, 2));
  g.setIndex([...idx, ...capIdx]);
  g.computeVertexNormals();
  // The profile runs up the front and down the back, so the winding is outward all round.
  void height;
  return g;
}

/** Plan-view offset of a wall at x: a concave arc plus an S-bend and a little wander. */
function planOffset(P: Preset, x: number, W: number, D: number, seed: number): number {
  const u = x / (W / 2);
  const wander = (fbm3(x * 0.025, 3, seed + 3, seed, 2) - 0.5) * 0.1;
  return D * (P.arc * u * u + P.sbend * Math.sin(u * Math.PI * 0.9 + P.sPhase) + wander);
}

/** Staggered vertical joints: blocks `w` metres wide, each pushed a little in or out. */
function jointOffset(
  x: number,
  w: number,
  step: number,
  seed: number,
): { off: number; crack: number } {
  const k = x / w + 0.37 * fbm3(x * 0.05, 7, seed, seed + 2, 2);
  const i = Math.floor(k);
  const f = k - i;
  const h = (n: number): number => (fbm3(n * 3.7, 11, seed + 5, seed + 9, 2) - 0.5) * 2;
  const m = smooth(0.92, 1, f);
  return { off: (h(i) * (1 - m) + h(i + 1) * m) * step, crack: smooth(0.88, 0.97, f) * (1 - m) };
}

export function buildScarp(id: ScarpPresetId, input: GeoBuildInput): BuiltProp {
  const { dims, seed, tier } = input;
  const d = geoDetail(tier);
  const P = PRESETS[id];
  const [W, D, H] = dims;
  const rnd = mulberry32(seed);
  const rawProfile = P.profile.map(([y, z]): [number, number] => [y * H, z * D]);
  const joinY = P.join * H;
  const footZ = rawProfile[0]![1];
  // The wall's buried base: straight down from the foot so the apron hides the join.
  const profile: [number, number][] = [[joinY - 0.09 * H, footZ + 0.025 * D], ...rawProfile];
  const scale = Math.max(0.6, H / 30);
  const gnd = input.groundHeight() ?? ((): number => 0);
  const plan = (x: number): number => planOffset(P, x, W, D, seed);
  const footAt = (x: number): number => {
    const { edge } = wallEnvelope(x, W, P.edgeStart);
    return footZ * (1 - edge * 0.55) + plan(x);
  };
  const scaleAt = (x: number): number => {
    const { edge, skyline } = wallEnvelope(x, W, P.edgeStart);
    return pinchScale(edge) * skyline;
  };
  const sinkAt = (x: number): number => endSink(x, W, H);
  const liftAt = (x: number): number => gnd(x, footAt(x));

  // --- displacement: gullies, dipping strata ledges, joints; zero at the apron join.
  const disp = (x: number, y: number, z: number): number => {
    const env = smooth(joinY, joinY + 0.15 * H, y);
    // Ridged noise: sharp-edged vertical rills cut into the face rather than soft swells.
    const rill = 1 - Math.abs(2 * fbm3(x * P.gullyFreq, y * 0.03, seed + 1, seed, 4) - 1);
    const gully = (Math.pow(rill, 3) - 0.3) * -2.4 * P.gully * scale * 1.6;
    const s = ((y + P.dip * x) / H) * P.bands + (fbm3(x * 0.03, 5, seed, seed + 7, 2) - 0.5) * 1.2;
    const saw = s - Math.floor(s);
    const ledge = -Math.pow(saw, 2.2) * P.ledge * scale * 2.4; // strata protrude, then step back
    const fine = (fbm3(x * 0.3, y * 0.3, z * 0.3, seed + 4, 2) - 0.5) * 0.9 * scale;
    const bulge = (fbm3(x * 0.045, y * 0.05, seed + 8, seed + 6, 3) - 0.5) * 0.5 * H * 0.35;
    const joint = P.joints > 0 ? jointOffset(x, P.joints, P.jointStep * scale, seed).off : 0;
    return (gully + ledge + bulge + joint) * env + fine * smooth(joinY - 0.05 * H, joinY, y);
  };
  // Slump benches rise and fall along the wall; no change at the join or the crest.
  const lift = (x: number, y: number): number => {
    const w = smooth(joinY, joinY + 0.2 * H, y) * (1 - smooth(0.85 * H, H, y));
    return (
      liftAt(x) + (fbm3(x * 0.04, y * 0.04, seed + 13, seed + 21, 3) - 0.5) * 2 * P.benchVar * H * w
    );
  };

  // --- the wall
  const nx = Math.round(Math.max(30, W * 1.1) * d.meshDensity);
  const ny = Math.round(Math.max(40, H * 2.4) * d.meshDensity);
  const wall = extrudeProfile(
    profile,
    W,
    Math.min(nx, 220),
    Math.min(ny, 150),
    disp,
    H,
    lift,
    P.edgeStart,
    {
      plan,
      sink: sinkAt,
      uvTile: P.tile,
    },
  );
  paint(wall, (x, yAbs, z, ny_, out) => {
    const y = yAbs - liftAt(x);
    // Dipping, wandering beds across the face; resistant beds are lighter and protrude.
    const s = ((y + P.dip * x) / H) * P.bands + (fbm3(x * 0.03, 5, seed, seed + 7, 2) - 0.5) * 1.2;
    const saw = s - Math.floor(s);
    const tone = fbm3(x * 0.25, y * 0.2, z * 0.25, seed ^ 0x3c, 4);
    // Each bed has its own tone (resistant beds pale, weak beds dark); the lip of a bed catches
    // light and the undercut beneath it is in shadow.
    const bed = fbm3(Math.floor(s) * 3.1 + 0.5, 2.5, seed + 77, seed + 3, 1);
    out.copy(P.band).lerp(P.base, 0.25 + 0.85 * bed);
    out.multiplyScalar(
      (0.82 + 0.4 * tone) * (1 + 0.14 * smooth(0.8, 1, saw) - 0.28 * (1 - smooth(0, 0.14, saw))),
    );
    out.lerp(P.crest, smooth(0.75, 1, y / H) * 0.6);
    if (P.joints > 0) {
      const { crack } = jointOffset(x, P.joints, P.jointStep, seed);
      out.multiplyScalar(1 - 0.35 * crack);
    }
    // Sediment drape on gentle slopes; exposed rock on steep faces.
    out.lerp(P.drape, smooth(0.45, 0.85, ny_) * 0.7 * (0.6 + 0.4 * tone));
    // The foot is buried in rubble and silt.
    out.lerp(P.drape, (1 - smooth(joinY, joinY + 0.12 * H, y)) * 0.7);
  });
  wall.computeBoundingBox();

  // --- the apron: reach lobes along the wall, tapering at the ends
  const reachFrac = (x: number): number => {
    const u = x / (W / 2);
    const lobes = 0.45 + 1.1 * fbm3(x * 0.07, 2, seed + 31, seed + 5, 4);
    const taper = 1 - smooth(0.5, 1, endRatio(x, W));
    const gap = P.passage > 0 ? 0.22 + 0.78 * smooth(-0.35, 0.5, u) : 1;
    return P.reach * D * lobes * taper * gap;
  };
  const talus: TalusShape = {
    gnd,
    foot: footAt,
    reach: reachFrac,
    top: (x) => Math.max(0.3, joinY * scaleAt(x) - sinkAt(x)),
    seed,
  };
  const full = new THREE.Group();
  full.name = `scarp-${id}`;
  const wallMat = geoMaterial(P.tex, d, { roughness: P.rough, side: THREE.DoubleSide });
  full.add(new THREE.Mesh(wall, wallMat));
  const tone = new THREE.Color();
  const apron = buildTalusMesh(
    talus,
    W,
    Math.min(220, Math.round(Math.max(24, W * 1.1) * d.meshDensity)),
    Math.round(Math.max(14, (P.reach * D * 1.55) / 0.9) * d.meshDensity),
    TILE_M,
    (x, y, z, u, out) => {
      const n = fbm3(x * 0.2, z * 0.2, y * 0.1, seed ^ 0x51, 4);
      tone.copy(P.boulder).lerp(P.base, 0.4);
      out.copy(tone).lerp(P.drape, smooth(0.05, 0.95, u) * 0.85 * (0.7 + 0.5 * n));
      out.multiplyScalar(0.78 + 0.5 * n);
      // Contact shading hugging the foot of the wall.
      out.multiplyScalar(0.82 + 0.18 * smooth(0, 0.25, u));
    },
  );
  apron.computeBoundingBox();
  full.add(new THREE.Mesh(apron, geoMaterial('rock', d, { roughness: P.rough })));

  // --- rocks seated on the final apron surface (instanced)
  const rocks: RockSpot[] = [];
  if (d.rubble) {
    const count = Math.round(P.boulders * d.growth);
    rocks.push(
      ...placeRocks(talus, W, count, seed, {
        size: P.rockSize * scale,
        blocks: P.blocks,
        span: 0.46,
      }),
    );
    const tmpl = [0, 1, 2].map((k) => {
      // Angular blocks: strong noise, faceted shading, dark undersides (contact occlusion).
      const g = lump(d.sphereDetail, seed + k * 5, 0.36, 2.2);
      paint(g, (_x, y, _z, _n, out) => out.setScalar(0.5 + 0.5 * smooth(-1, 0.5, y)));
      projectUVs(g, 1.2);
      return g;
    });
    const bm = geoMaterial('rock', d, { roughness: 0.96 });
    bm.flatShading = true;
    const meshes = tmpl.map((g, k) => {
      const m = new THREE.InstancedMesh(g, bm, Math.max(1, Math.ceil((rocks.length - k) / 3)));
      m.count = 0;
      m.frustumCulled = false; // the prop's own LOD sphere culls it
      m.name = `boulders-${k}`;
      return m;
    });
    const mat = new THREE.Matrix4();
    const c = new THREE.Color();
    rocks.forEach((spot, i) => {
      const m = meshes[i % 3]!;
      rockMatrix(spot, rnd() * 6.28, 0.55 + rnd() * 0.3, mat);
      // Rubble matches the apron it sits in; only a little darker and more varied.
      c.copy(P.boulder)
        .lerp(P.base, 0.3)
        .lerp(P.drape, rnd() * 0.3 + 0.35 * spot.u)
        .multiplyScalar(0.85 + rnd() * 0.3);
      m.setMatrixAt(m.count, mat);
      m.setColorAt(m.count, c);
      m.count++;
    });
    for (const m of meshes) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      if (m.count) full.add(m);
    }
  }

  // A faint seep of clear fluid on the caldera wall (Hunga Tonga is volcanically active).
  if (id === 'tuff') {
    for (let i = 0; i < 3; i++) {
      const x = (rnd() - 0.5) * W * 0.6;
      const sh = shimmerPlume(4, 0.6, Math.round(34 * d.plume), seed + 40 + i);
      if (sh) {
        sh.position.set(
          x,
          liftAt(x) + joinY * scaleAt(x) + H * (0.03 + rnd() * 0.15),
          footAt(x) + 0.2,
        );
        full.add(sh);
      }
    }
  }

  const bounds = wall.boundingBox!.clone().union(apron.boundingBox!);
  const colliders = wallColliders(profile, W, D, H, 9, gnd, {
    disp,
    edgeStart: P.edgeStart,
    plan,
    liftAt: (x, y) => (y === undefined ? liftAt(x) : lift(x, y)),
    sinkAt,
  });
  colliders.push(...talusColliders(talus, W));
  return {
    full,
    impostor: impostorFromBoxes(colliders, bounds, P.base.getHex()),
    bounds,
    colliders,
  };
}

/** Coarse stepped boxes under the thick part of the apron (the sub should not slide through rubble). */
export function talusColliders(t: TalusShape, W: number): THREE.Box3[] {
  const out: THREE.Box3[] = [];
  const seg = Math.min(16, Math.max(4, Math.ceil(W / 6)));
  const segW = W / seg;
  for (let k = 0; k < seg; k++) {
    const x0 = (k / seg - 0.5) * W;
    const xs = [x0, x0 + segW / 2, x0 + segW];
    const reach = Math.min(...xs.map((x) => t.reach(x)));
    const top = Math.min(...xs.map((x) => t.top(x)));
    if (reach < 3 || top < 1.2) continue;
    const foot = xs.reduce((a, x) => a + t.foot(x), 0) / xs.length;
    const g = Math.max(...xs.map((x) => t.gnd(x, foot - reach * 0.3)));
    // Two stacked steps following the concave apron (conservative: under the visible surface).
    for (const [u0, u1] of [
      [0, 0.28],
      [0.28, 0.55],
    ] as const) {
      const hgt = top * Math.pow(1 - u1, 1.8) * 0.8;
      if (hgt < 0.6) continue;
      const zf = foot + 0.5 - u0 * reach;
      const zb = foot - u1 * reach;
      out.push(
        boxCH(
          x0 + segW / 2,
          g - 0.5 + (hgt + 0.5) / 2,
          (zf + zb) / 2,
          segW / 2 + 0.2,
          (hgt + 0.5) / 2,
          (zf - zb) / 2,
        ),
      );
    }
  }
  return out;
}

/**
 * Terrain-following lift for an extruded wall: the apron follows the ground
 * under it, the upper wall follows the ground under its foot (so it stays
 * upright). `gnd` is the local ground height (0 when the prop is not snapped).
 */
export function wallLift(
  gnd: (x: number, z: number) => number,
  H: number,
): (x: number, y: number, z: number) => number {
  return (x, y, z) => {
    const t = smooth(0, 0.35 * H, y);
    return gnd(x, z) * (1 - t) + gnd(x, 0) * t;
  };
}

/** Deformation of the rendered wall that its colliders must follow. */
export interface WallShape {
  /** Extra z offset at (x, profile y, profile z); the same callback given to `extrudeProfile`. */
  disp: (x: number, y: number, z: number) => number;
  /** Pinch start passed to `extrudeProfile` (default 0.4). */
  edgeStart?: number;
  /** Plan offset given to `extrudeProfile`. */
  plan?: (x: number) => number;
  /** Ground lift of the whole wall at x (replaces `wallLift`). */
  liftAt?: (x: number, y?: number) => number;
  /** Downward end sink given to `extrudeProfile`. */
  sinkAt?: (x: number) => number;
}

/** All z values where the closed profile polyline crosses height `y` (front and back faces). */
function crossings(profile: [number, number][], y: number): number[] {
  const out: number[] = [];
  for (let i = 1; i < profile.length; i++) {
    const [y0, z0] = profile[i - 1]!;
    const [y1, z1] = profile[i]!;
    if ((y >= y0 && y <= y1) || (y <= y0 && y >= y1)) {
      out.push(z0 + (z1 - z0) * ((y - y0) / (y1 - y0 || 1)));
    }
  }
  return out;
}

/**
 * Stepped wall colliders built from the same deformed profile as the mesh.
 * The wall is cut into overlapping x segments (no gaps between boxes); each
 * segment's slice heights are scaled by the lowest end-pinch / skyline height
 * inside it, so a box never stands over empty water above a tapered end.
 * Front and back extents average the displaced profile across the segment and
 * each slice is lifted by the terrain under it. The traversable undercut of an
 * overhanging ledge stays open: a slice only spans the profile's own extent.
 */
export function wallColliders(
  profile: [number, number][],
  W: number,
  _D: number,
  H: number,
  slices: number,
  gnd: (x: number, z: number) => number,
  shape?: WallShape,
): THREE.Box3[] {
  const out: THREE.Box3[] = [];
  const edgeStart = shape?.edgeStart ?? 0.4;
  const seg = Math.min(22, Math.max(3, Math.ceil(W / 4.5)));
  const lift = wallLift(gnd, H);
  const segW = W / seg;
  const SAMPLES = 5;
  // Solid below the wall's own base so the bottom slices never come up empty.
  const topY = profile.reduce((m, p) => Math.max(m, p[0]), -Infinity);
  const solid: [number, number][] =
    profile[0]![0] > -0.12 * H ? [[-0.12 * H, profile[0]![1]], ...profile] : profile;
  for (let k = 0; k < seg; k++) {
    const x0 = (k / seg - 0.5) * W;
    const xc = x0 + segW / 2;
    const xs: number[] = [];
    let hScale = Infinity;
    let sink = Infinity;
    for (let n = 0; n < SAMPLES; n++) {
      const x = x0 + (n / (SAMPLES - 1)) * segW;
      xs.push(x);
      const { edge, skyline } = wallEnvelope(x, W, edgeStart);
      hScale = Math.min(hScale, pinchScale(edge) * skyline);
      sink = Math.min(sink, shape?.sinkAt ? shape.sinkAt(x) : 0);
    }
    // The boxes overlap their neighbours a little: the height limit must hold there too.
    for (const x of [x0 - segW * 0.1, x0 + segW * 1.1]) {
      const xe = Math.max(-W / 2, Math.min(W / 2, x));
      const { edge, skyline } = wallEnvelope(xe, W, edgeStart);
      hScale = Math.min(hScale, pinchScale(edge) * skyline);
    }
    // The highest the rendered wall actually reaches in this segment (crest, after pinch and sink).
    let crest = -Infinity;
    for (let n = 0; n <= 8; n++) {
      const x = x0 - segW * 0.08 + (n / 8) * segW * 1.16;
      const xe = Math.max(-W / 2, Math.min(W / 2, x));
      const { edge, skyline } = wallEnvelope(xe, W, edgeStart);
      crest = Math.max(
        crest,
        topY * pinchScale(edge) * skyline - (shape?.sinkAt ? shape.sinkAt(xe) : 0),
      );
    }
    // Overlap neighbours slightly so sample gaps never open; the outer ends stay flush.
    const half = segW / 2 + (k > 0 && k < seg - 1 ? segW * 0.08 : 0);
    const left = k === 0 ? segW / 2 : half;
    const right = k === seg - 1 ? segW / 2 : half;
    const hx = (left + right) / 2;
    const cx = xc + (right - left) / 2;
    const up = (y: number): number => (y > 0 ? Math.max(0, y * hScale - sink) : y);
    for (let s = 0; s < slices; s++) {
      const y0 = -0.1 * H + (s / slices) * 1.1 * H;
      const y1 = -0.1 * H + ((s + 1) / slices) * 1.1 * H;
      const zs = [...crossings(solid, y0), ...crossings(solid, y1)];
      for (const [py, pz] of solid) if (py >= y0 && py <= y1) zs.push(pz);
      if (!zs.length) continue;
      let front = 0;
      let back = 0;
      for (const x of xs) {
        const { edge } = wallEnvelope(x, W, edgeStart);
        let lo = Infinity;
        let hi = -Infinity;
        for (const z0 of zs) {
          const z =
            (z0 + (shape ? shape.disp(x, (y0 + y1) / 2, z0) : 0) * (1 - edge * 0.6)) *
              (1 - edge * 0.55) +
            (shape?.plan ? shape.plan(x) : 0);
          lo = Math.min(lo, z);
          hi = Math.max(hi, z);
        }
        front += lo / xs.length;
        back += hi / xs.length;
      }
      const zBack = Math.max(back, front + 1);
      const ya = up(y0);
      const yb = up(y1);
      if (yb - ya < 0.05) continue;
      // Lift each slice's bottom and top separately so neighbouring slices share a boundary.
      let dyA = 0;
      let dyB = 0;
      for (const x of xs) {
        const at = (y: number): number =>
          shape?.liftAt ? shape.liftAt(x, Math.max(0, y)) : lift(x, y, (front + zBack) / 2);
        dyA += at(y0) / xs.length;
        dyB += at(y1) / xs.length;
      }
      const lo = ya + dyA;
      const hi = Math.min(yb + dyB, crest + dyB + 0.3);
      if (hi - lo < 0.05) continue;
      out.push(
        boxCH(cx, (lo + hi) / 2, (front + zBack) / 2, hx, (hi - lo) / 2, (zBack - front) / 2),
      );
    }
  }
  return out;
}

/** z of the profile at height y (first crossing). */
export function interp(profile: [number, number][], y: number): number {
  for (let i = 1; i < profile.length; i++) {
    const [y0, z0] = profile[i - 1]!;
    const [y1, z1] = profile[i]!;
    if ((y >= y0 && y <= y1) || (y <= y0 && y >= y1)) {
      const t = (y - y0) / (y1 - y0 || 1);
      return z0 + (z1 - z0) * t;
    }
  }
  return profile[profile.length - 1]![1];
}
