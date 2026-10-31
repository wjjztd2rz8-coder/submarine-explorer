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
import { MONTEREY_FIDELITY } from '../../../core/config/terrain.js';
import { MONTEREY_RUBBLE, MONTEREY_STRATA } from '../../../core/config/monterey.js';
import type { GraphicsTier } from '../../../core/Config.js';
import { canyonRockDetail } from './materials.js';
import { geoDetail } from './detail.js';
import { branchingColony } from './coral.js';
import { geoMaterial, LIFE_TINT, vertexGlow } from './materials.js';
import { shimmerPlume } from './plume.js';
import type { GeoTexKind } from './textures.js';
import {
  boxCH,
  fbm3,
  impostorFromBoxes,
  instanced,
  type InstanceSpec,
  lump,
  mulberry32,
  paint,
  projectUVs,
  smooth,
  type BuiltProp,
} from './shared.js';
import {
  buildTalusMesh,
  placeRocks,
  rockMatrix,
  type RockSpot,
  isSupported,
  talusNormal,
  type TalusShape,
  TALUS_LIP_RISE,
  talusSurface,
  talusMeshSampler,
} from './talus.js';
import type { GeoBuildInput } from './types.js';

export type ScarpPresetId = 'tuff' | 'canyon' | 'hadal';

/** Metres of surface per texture tile on the walls (world-scale mapping). */
const TILE_M = 5;

interface Preset {
  /** Unequal resistant beds add undercuts, slumps, per-bed albedo and dust. */
  bedding: 'regular' | 'eroded';
  /** Dense wall/scar detail above Low; independent of bedding and decoration. */
  fidelity?: typeof MONTEREY_FIDELITY;
  /** Fractured, stretched rockfall with this scatter/runout policy. */
  rockfall?: typeof MONTEREY_RUBBLE;
  /** Vertex-colour light lift: [strength, tint, floor]. */
  glow?: { wall: [number, number, number]; rubble: [number, number, number] };
  decoration?: 'wall-life' | 'seeps';
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
  /** Bed-by-bed tone contrast, thin lamination and grain strength (1 = the original look). */
  bedContrast: number;
}

const REAR: [number, number][] = [
  [1.02, 0.5],
  [0.7, 0.95],
  [0.3, 1.35],
  [-0.12, 1.8],
];

const PRESETS: Record<ScarpPresetId, Preset> = {
  tuff: {
    bedding: 'regular',
    glow: { wall: [0.19, 0xb4b09a, 0.25], rubble: [0.35, 0xb4b09a, 0.45] },
    decoration: 'seeps',
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
    reach: 0.9,
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
    drape: new THREE.Color(0xa89878),
    boulder: new THREE.Color(0x7f7461),
    boulders: 220,
    rockSize: 0.75,
    blocks: 0.05,
    rough: 0.95,
    edgeStart: 0.3,
    tile: [11, 6],
    bedContrast: 1,
  },
  canyon: {
    bedding: 'eroded',
    fidelity: MONTEREY_FIDELITY,
    rockfall: MONTEREY_RUBBLE,
    glow: { wall: [0.18, 0x8fc0c6, 0.4], rubble: [0.16, 0x8fc0c6, 0.35] },
    decoration: 'wall-life',
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
      [0.83, 0.11],
      [0.85, 0.19],
      [0.91, 0.2],
      [0.93, 0.27],
      [0.97, 0.28],
      [1, 0.31],
      ...REAR,
    ],
    join: 0.13,
    reach: 0.38,
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
    base: new THREE.Color(0x8f8c72), // olive-grey mudstone
    band: new THREE.Color(0x6a6a58),
    crest: new THREE.Color(0xb0ab8f),
    drape: new THREE.Color(0xa39a84), // pale silt
    boulder: new THREE.Color(0x8a846b),
    boulders: 160,
    rockSize: 0.7,
    blocks: 0.04,
    rough: 0.97,
    edgeStart: 0.3,
    tile: [12, 5],
    bedContrast: 2.8,
  },
  hadal: {
    bedding: 'regular',
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
    bedContrast: 1,
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
  /**
   * Terrain height at (x, z). Toward the wall ends every point comes down to it, so a shelf runs
   * into the ground instead of hanging over a lower slope; mid-wall it is unconstrained.
   */
  ground?: (x: number, z: number) => number;
  /** Extra y at (x, profile point): vertical variation of the section, such as a stepped roof lip. */
  rise?: (x: number, y: number, z: number) => number;
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
      let py = y + (lift ? lift(x, y0, z0) : 0) - sink + (opts.rise ? opts.rise(x, y0, z0) : 0);
      if (opts.ground) py = Math.min(py, opts.ground(x, z) + 0.15 + 4 * height * (1 - edge) ** 2);
      pos[n * 3 + 1] = py;
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

/** One slump scar: centre (x, y), half-extents and scoop depth (all metres). */
interface Scar {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  depth: number;
}

/** Scar footprint 0..1: a bowl with a short, steep headwall above and a long floor below. */
function scarBowl(c: Scar, x: number, y: number): number {
  const dy = y - c.cy;
  const r = Math.hypot((x - c.cx) / c.rx, dy / (dy > 0 ? c.ry * 0.5 : c.ry * 1.3));
  return smooth(1, 0.55, r);
}

/** Extra z (into the rock, +) from all scars; the headwall is sharper than the floor. */
function scarDisp(scars: Scar[], x: number, y: number): number {
  let d = 0;
  for (const c of scars) {
    const b = scarBowl(c, x, y);
    if (b > 0) d = Math.max(d, c.depth * Math.pow(b, y > c.cy ? 0.6 : 1.4));
  }
  return d;
}

/** Headwall emphasis 0..1: just inside the scar rim on its upper half. */
function scarHead(scars: Scar[], x: number, y: number): number {
  let h = 0;
  for (const c of scars) {
    if (y > c.cy)
      h = Math.max(
        h,
        smooth(0.2, 0.6, scarBowl(c, x, y)) * (1 - smooth(0.9, 1, scarBowl(c, x, y))),
      );
  }
  return h;
}

export function buildScarp(id: ScarpPresetId, input: GeoBuildInput): BuiltProp {
  const { dims, seed, tier } = input;
  const d = geoDetail(tier);
  const P = PRESETS[id];
  const fidelity = tier !== 'low' ? (P.fidelity ?? null) : null;
  const erodedBeds = P.bedding === 'eroded';
  const [W, D, H] = dims;
  const limits = fidelity?.wallSegments[tier as GraphicsTier] ?? [220, 150];
  const nx = Math.min(
    limits[0]!,
    Math.round(Math.max(30, W * (fidelity ? 2.2 : 1.1)) * d.meshDensity),
  );
  const ny = Math.min(
    limits[1]!,
    Math.round(Math.max(40, H * (fidelity ? 4.8 : 2.4)) * d.meshDensity),
  );
  // Do not put sub-vertex gullies into large banks: those octaves become random facets.
  const gullyOctaves = fidelity
    ? Math.max(1, Math.min(4, 1 + Math.floor(Math.log2(1 / (((3 * W) / nx) * P.gullyFreq)))))
    : 4;
  const rnd = mulberry32(seed);
  const rawProfile = P.profile.map(([y, z]): [number, number] => [y * H, z * D]);
  const joinY = P.join * H;
  const footZ = rawProfile[0]![1];
  // The wall's buried base: straight down from the foot so the apron hides the join.
  const profile: [number, number][] = [[joinY - 0.09 * H, footZ + 0.025 * D], ...rawProfile];
  const scale = Math.max(0.6, H / 30);
  const ground = input.groundHeight();
  const gnd = ground ?? ((): number => 0);
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

  // Unequal bed intervals preserve bedding without a repeated corrugated profile.
  // Use a separate seed stream so rubble and wall-life counts/choices stay stable.
  const bedRnd = mulberry32(seed ^ 0xbed);
  const beds = [0];
  for (let i = 0; i < P.bands; i++) {
    const [min, max] = MONTEREY_STRATA.thickness;
    beds.push(beds[i]! + min + (max - min) * Math.pow(bedRnd(), MONTEREY_STRATA.thicknessSkew));
  }
  // Per-bed hardness (thick, resistant beds protrude and overhang) and albedo.
  const bedHard: number[] = [];
  const bedColour: THREE.Color[] = [];
  if (erodedBeds) {
    for (let i = 0; i < P.bands; i++) {
      const thick = (beds[i + 1]! - beds[i]!) / MONTEREY_STRATA.thickness[1];
      bedHard.push(Math.min(1, 0.55 * thick + 0.6 * Math.pow(bedRnd(), 1.6)));
      const pal = MONTEREY_STRATA.bedPalette;
      const c = new THREE.Color(pal[Math.floor(bedRnd() * pal.length) % pal.length]);
      c.multiplyScalar(MONTEREY_STRATA.bedTone[0] + MONTEREY_STRATA.bedTone[1] * bedRnd());
      bedColour.push(c);
    }
  }
  const totalBeds = beds[P.bands]!;
  const bedPhase = (x: number, y: number): number => {
    if (!erodedBeds)
      return ((y + P.dip * x) / H) * P.bands + (fbm3(x * 0.03, 5, seed, seed + 7, 2) - 0.5) * 1.2;
    const [fx, fy] = MONTEREY_STRATA.wanderFrequency;
    const height = ((y + P.dip * x) / H) * totalBeds;
    let k = 0;
    while (k < P.bands - 1 && height > beds[k + 1]!) k++;
    return (
      k +
      (height - beds[k]!) / (beds[k + 1]! - beds[k]!) +
      (fbm3(x * fx, y * fy, seed + 7, seed + 17, 2) - 0.5) * MONTEREY_STRATA.wanderBeds
    );
  };
  const slumpAt = (x: number, y: number): number => {
    const [fx, fy] = MONTEREY_STRATA.slumpFrequency;
    return smooth(0.53, 0.73, fbm3(x * fx, y * fy, seed + 28, seed + 51, 2));
  };
  // Monterey slump scars: a few scooped amphitheatres with a steep headwall above a gentler,
  // silt-floored bowl, so the wall outline is eroded rather than stacked. Own seed stream.
  const scars: Scar[] = [];
  if (fidelity) {
    const sr = mulberry32(seed ^ 0x5ca2);
    const count = 5;
    for (let i = 0; i < count; i++) {
      scars.push({
        cx: ((i + 0.2 + 0.6 * sr()) / count - 0.5) * W * 0.78,
        cy: (0.4 + 0.45 * sr()) * H,
        rx: W * (0.05 + 0.05 * sr()),
        ry: H * (0.16 + 0.1 * sr()),
        depth: H * (0.14 + 0.1 * sr()),
      });
    }
  }
  const scarAt = (x: number, y: number): number => {
    let v = 0;
    for (const c of scars) v = Math.max(v, scarBowl(c, x, y));
    return v;
  };

  // Rills: ridged noise whose coordinates are warped by slower noise, so channels wander, fork
  // and fade along the face instead of running as evenly spaced vertical stripes.
  const rillAt = (x: number, y: number): number => {
    if (!fidelity)
      return 1 - Math.abs(2 * fbm3(x * P.gullyFreq, y * 0.03, seed + 1, seed, gullyOctaves) - 1);
    const wx =
      (fbm3(x * 0.05, y * 0.06, seed + 21, seed + 5, 2) - 0.5) * 2 * MONTEREY_STRATA.rillWarp;
    const base = fbm3(
      (x + wx) * P.gullyFreq,
      y * MONTEREY_STRATA.rillStretch,
      seed + 1,
      seed,
      gullyOctaves,
    );
    return (
      (1 - Math.abs(2 * base - 1)) * (0.45 + 0.7 * fbm3(x * 0.04, y * 0.07, seed + 61, seed + 3, 2))
    );
  };

  // --- displacement: gullies, dipping strata ledges, joints; zero at the apron join.
  const disp = (x: number, y: number, z: number): number => {
    const env = smooth(joinY, joinY + 0.15 * H, y);
    // Ridged noise: sharp-edged vertical rills cut into the face rather than soft swells.
    const rill = rillAt(x, y);
    const gully = (Math.pow(rill, 3) - 0.3) * -2.4 * P.gully * scale * 1.6;
    const s = bedPhase(x, y);
    const saw = s - Math.floor(s);
    // Round the sub-metre return of each resistant bed rather than sampling a discontinuity.
    const lip = fidelity ? 1 - smooth(0.88, 1, saw) : 1;
    const [minLedge, maxLedge] = MONTEREY_STRATA.ledgeStrength;
    const strength = erodedBeds
      ? minLedge +
        (maxLedge - minLedge) *
          bedHard[Math.min(P.bands - 1, Math.max(0, Math.floor(s)))]! *
          (0.35 + 1.1 * fbm3(Math.floor(s) * 3.1, x * 0.03, seed + 81, seed + 9, 2))
      : 1;
    const slump = erodedBeds ? slumpAt(x, y) : 0;
    // Ledge depth varies along each bed (pinching out, then jutting) and vanishes in scars.
    const reach = fidelity
      ? 0.35 + 1.5 * fbm3(x * 0.055, Math.floor(s) * 1.9, seed + 91, seed + 13, 2)
      : 1;
    const scar = scars.length ? scarAt(x, y) : 0;
    const ledge =
      -Math.pow(saw, 2.2) *
      lip *
      P.ledge *
      scale *
      2.4 *
      strength *
      reach *
      (1 - slump) *
      (1 - scar);
    const fine =
      (fbm3(x * 0.3, y * 0.3, z * 0.3, seed + 4, 2) - 0.5) * (fidelity ? 0.3 : 0.9 * scale);
    const bulge = (fbm3(x * 0.045, y * 0.05, seed + 8, seed + 6, 3) - 0.5) * 0.5 * H * 0.35;
    const joint = P.joints > 0 ? jointOffset(x, P.joints, P.jointStep * scale, seed).off : 0;
    return (
      (gully +
        ledge +
        bulge +
        joint +
        slump * H * MONTEREY_STRATA.slumpDepthH +
        scarDisp(scars, x, y)) *
        env +
      fine * smooth(joinY - 0.05 * H, joinY, y)
    );
  };
  // Slump benches rise and fall along the wall; no change at the join or the crest.
  const lift = (x: number, y: number): number => {
    const w = smooth(joinY, joinY + 0.2 * H, y) * (1 - smooth(0.85 * H, H, y));
    return (
      liftAt(x) + (fbm3(x * 0.04, y * 0.04, seed + 13, seed + 21, 3) - 0.5) * 2 * P.benchVar * H * w
    );
  };

  // --- the wall
  const wall = extrudeProfile(profile, W, nx, ny, disp, H, lift, P.edgeStart, {
    plan,
    sink: sinkAt,
    uvTile: P.tile,
  });
  paint(wall, (x, yAbs, z, ny_, out) => {
    const y = yAbs - liftAt(x);
    // Dipping, wandering beds across the face; resistant beds are lighter and protrude.
    const s = bedPhase(x, y);
    const saw = s - Math.floor(s);
    const tone = fbm3(x * 0.25, y * 0.2, z * 0.25, seed ^ 0x3c, 4);
    // Each bed has its own tone (resistant beds pale, weak beds dark); the lip of a bed catches
    // light and the undercut beneath it is in shadow.
    const bed = fbm3(Math.floor(s) * 3.1 + 0.5, 2.5, seed + 77, seed + 3, 1);
    const bc = fidelity ? 1.5 : P.bedContrast;
    out.copy(P.band).lerp(P.base, Math.min(1.1, 0.25 + 0.85 * ((bed - 0.5) * bc + 0.5)));
    if (erodedBeds) {
      // Each bed keeps its own muted albedo; resistant beds are paler than weak ones.
      const k = Math.min(P.bands - 1, Math.max(0, Math.floor(s)));
      out.copy(bedColour[k]!).multiplyScalar(0.8 + 0.4 * bedHard[k]!);
      out.lerp(P.base, MONTEREY_STRATA.bedBlend);
      // Slow drift along and up the wall so one bed changes tone instead of striping evenly.
      const [dx, dy] = MONTEREY_STRATA.toneDriftFrequency;
      const drift = fbm3(x * dx, y * dy, seed + 41, seed + 63, 2);
      out.multiplyScalar(1 + MONTEREY_STRATA.toneDrift * (drift - 0.5));
      if (fidelity) out.lerp(P.drape, MONTEREY_STRATA.faintBedAmount * smooth(0.55, 0.8, drift));
    }
    out.multiplyScalar(
      (0.82 + 0.4 * tone) * (1 + 0.14 * smooth(0.8, 1, saw) - 0.28 * (1 - smooth(0, 0.14, saw))),
    );
    if (bc > 1) {
      // Thin laminae inside each bed, a sharp shadow line under every ledge, and fine grain.
      // Eroded beds warp the laminae in x and y and mix each with local noise, so no tone
      // runs unbroken along the wall (a long uniform stripe aliases into moire).
      const warp = erodedBeds ? MONTEREY_STRATA.laminaWarp : 0.8;
      const s4 = s * 4.3 + (fbm3(x * 0.08, y * 0.12, seed + 12, seed, 2) - 0.5) * 2 * warp;
      const laminaTone = fbm3(Math.floor(s4) * 2.3 + 0.5, 1.5, seed + 31, seed + 8, 1);
      const lam = erodedBeds
        ? laminaTone +
          MONTEREY_STRATA.laminaBreak *
            (fbm3(x * 0.2, y * 0.35, z * 0.2, seed + 37, 2) - laminaTone)
        : laminaTone;
      const lipLit = 1 + 0.2 * smooth(0.86, 0.98, saw) * (1 - smooth(0.98, 1, saw));
      const rill = rillAt(x, y);
      const gullyShade = 1 - 0.3 * smooth(0.55, 0.9, rill); // erosion gullies read as dark runnels
      const grain = 0.88 + 0.24 * fbm3(x * 1.7, y * 2.2, z * 1.7, seed + 66, 2);
      // Laminae fade in and out along the wall rather than ruling every bed the same way.
      const lamFade = erodedBeds
        ? smooth(0.4, 0.75, fbm3(x * 0.035, y * 0.05, seed + 55, seed + 19, 2))
        : 1;
      // The shadow line under a ledge fades where the laminae do, so joints are not ruled evenly.
      const lipShare = erodedBeds
        ? MONTEREY_STRATA.lipFloor + (1 - MONTEREY_STRATA.lipFloor) * lamFade
        : 1;
      const lipDark =
        1 - (erodedBeds ? MONTEREY_STRATA.lipShadow : 0.34) * (1 - smooth(0, 0.07, saw)) * lipShare;
      out.multiplyScalar(
        (1 + (0.84 + 0.32 * lam - 1) * lamFade) * lipDark * lipLit * gullyShade * grain,
      );
      // Alternate pale resistant beds with ochre-brown weak ones so bedding survives the teal haze.
      if (!erodedBeds) out.lerp(P.drape, 0.22 * smooth(0.5, 0.75, bed));
    }
    out.lerp(P.crest, smooth(0.75, 1, y / H) * 0.6);
    if (P.joints > 0) {
      const { crack } = jointOffset(x, P.joints, P.jointStep, seed);
      out.multiplyScalar(1 - 0.35 * crack);
    }
    // Sediment drape on gentle slopes; exposed rock on steep faces.
    out.lerp(P.drape, smooth(0.45, 0.85, ny_) * 0.7 * (0.6 + 0.4 * tone));
    if (erodedBeds) {
      // Dust catches on interrupted shelves and drapes the occasional slump scar.
      const dust = Math.max(slumpAt(x, y), smooth(0.05, 0.6, ny_) * tone);
      out.lerp(P.drape, dust * MONTEREY_STRATA.dustAmount);
      if (scars.length) {
        // Pale silt on the scar floor, a darker raw headwall above it.
        const sc = scarAt(x, y);
        out.lerp(P.drape, sc * 0.35);
        out.multiplyScalar(1 - 0.3 * scarHead(scars, x, y));
      }
    }
    // The foot is buried in rubble and silt.
    // Silt banks up the lower wall in a ragged line, so the face grades into the apron.
    const foot = erodedBeds ? MONTEREY_STRATA.footBlendH : 0.12;
    const ragged = erodedBeds ? 0.6 + 0.8 * fbm3(x * 0.09, 4, seed + 71, seed + 2, 3) : 1;
    out.lerp(
      P.drape,
      (1 - smooth(joinY, joinY + foot * ragged * H, y)) * (erodedBeds ? 0.85 : 0.7),
    );
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
    top: (x) =>
      Math.max(
        0.3,
        joinY * scaleAt(x) * (erodedBeds ? MONTEREY_STRATA.talusTopScale : 1) - sinkAt(x),
      ),
    seed,
  };
  const full = new THREE.Group();
  full.name = `scarp-${id}`;
  const wallMat = geoMaterial(P.tex, d, { roughness: P.rough, side: THREE.DoubleSide });
  // A faint self-lit lift stands in for scattered light beyond the headlight beams.
  const glow = (mat: THREE.MeshStandardMaterial, surface: 'wall' | 'rubble'): void => {
    if (P.glow) vertexGlow(mat, ...P.glow[surface]);
  };
  glow(wallMat, 'wall');
  if (fidelity) canyonRockDetail(wallMat, fidelity.normalStrength);
  full.add(new THREE.Mesh(wall, wallMat));
  const tone = new THREE.Color();
  const apronCols = Math.min(220, Math.round(Math.max(24, W * 1.1) * d.meshDensity));
  const apronRows = Math.round(Math.max(14, (P.reach * D * 1.55) / 0.9) * d.meshDensity);
  const apron = buildTalusMesh(talus, W, apronCols, apronRows, TILE_M, (x, y, z, u, out) => {
    const n = fbm3(x * 0.2, z * 0.2, y * 0.1, seed ^ 0x51, 4);
    tone.copy(P.boulder).lerp(P.base, 0.4);
    // Monterey: the apron is already silty against the wall, so wall silt and apron match.
    const nearWall = erodedBeds ? MONTEREY_STRATA.apronSiltAtWall * (1 - smooth(0, 0.5, u)) : 0;
    out
      .copy(tone)
      .lerp(P.drape, Math.max(smooth(0.05, 0.95, u) * 0.85 * (0.7 + 0.5 * n), nearWall));
    out.multiplyScalar(0.78 + 0.5 * n);
    // Monterey: dark rubble-flecked patches break up the smooth silt slope.
    if (erodedBeds)
      out.multiplyScalar(1 - 0.5 * smooth(0.5, 0.75, fbm3(x * 0.3, z * 0.3, 5, seed ^ 0x77, 3)));
    // Contact shading hugging the foot of the wall.
    out.multiplyScalar(0.82 + 0.18 * smooth(0, 0.25, u));
  });
  apron.computeBoundingBox();
  const apronMat = geoMaterial('rock', d, { roughness: P.rough });
  glow(apronMat, 'rubble');
  full.add(new THREE.Mesh(apron, apronMat));

  // --- rocks seated on the final apron surface (instanced)
  const rocks: RockSpot[] = [];
  if (d.rubble) {
    const count = Math.round(P.boulders * d.growth);
    rocks.push(
      ...placeRocks(talus, W, count, seed, {
        size: P.rockSize * scale,
        blocks: P.blocks,
        span: 0.46,
        scatter: P.rockfall,
      }),
    );
    // Monterey: blocks that dropped out of each scar, resting on the apron below it. They replace
    // the same number of ordinary rocks, so instance counts stay unchanged.
    if (scars.length && P.rockfall) {
      const fallen: RockSpot[] = [];
      const fr = mulberry32(seed ^ 0xfa11);
      for (const c of scars) {
        for (let k = 0; k < 3; k++) {
          for (let tries = 0; tries < 8; tries++) {
            const x = c.cx + (fr() - 0.5) * c.rx * P.rockfall.scarSpread;
            const reach = talus.reach(x);
            if (reach < 2) continue;
            const u = THREE.MathUtils.lerp(...P.rockfall.scarRunout, fr());
            const z = talus.foot(x) - u * reach;
            const spot: RockSpot = {
              x,
              y: talusSurface(talus, x, z),
              z,
              n: talusNormal(talus, x, z),
              r:
                scale *
                THREE.MathUtils.lerp(...P.rockfall.scarRadius, fr() ** P.rockfall.radiusSkew),
              u,
            };
            if (isSupported(talus, spot)) {
              fallen.push(spot);
              break;
            }
          }
        }
      }
      rocks.length = Math.max(0, rocks.length - fallen.length);
      rocks.push(...fallen);
    }
    const tmpl = [0, 1, 2].map((k) => {
      if (P.rockfall) return fracturedBoulder(d.sphereDetail, seed + k * 5, k);
      // Angular blocks: strong noise, faceted shading, dark undersides (contact occlusion).
      const g = lump(d.sphereDetail, seed + k * 5, 0.36, 2.2);
      paint(g, (_x, y, _z, _n, out) => out.setScalar(0.5 + 0.5 * smooth(-1, 0.5, y)));
      projectUVs(g, 1.2);
      return g;
    });
    const bm = geoMaterial('rock', d, { roughness: 0.96 });
    bm.flatShading = true;
    glow(bm, 'rubble');
    const meshes = tmpl.map((g, k) => {
      const m = new THREE.InstancedMesh(g, bm, Math.max(1, Math.ceil((rocks.length - k) / 3)));
      m.count = 0;
      m.frustumCulled = false; // the prop's own LOD sphere culls it
      m.name = `boulders-${k}`;
      return m;
    });
    const mat = new THREE.Matrix4();
    const stretchM = new THREE.Matrix4();
    const c = new THREE.Color();
    rocks.forEach((spot, i) => {
      const m = meshes[i % 3]!;
      rockMatrix(spot, rnd() * 6.28, 0.55 + rnd() * 0.3, mat);
      // Break the uniform footprint: stretch each block along its own (spun) x axis.
      if (P.rockfall) {
        const stretch = 0.7 + rnd() * 0.75;
        mat.multiply(stretchM.makeScale(stretch, 0.8 + rnd() * 0.5, 1 / Math.sqrt(stretch)));
      }
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

  // Monterey: sponges and cold-water coral fans cling to the lit face of the wall.
  if (P.decoration === 'wall-life') {
    const apronHeight = fidelity ? talusMeshSampler(apron, apronCols, apronRows) : null;
    addWallLife(
      full,
      wall,
      [nx, ny],
      d.growth,
      d.branchDepth,
      joinY,
      H,
      seed,
      rnd,
      (x, z) =>
        Math.max(talusSurface(talus, x, z) + TALUS_LIP_RISE, apronHeight?.(x, z) ?? -Infinity),
      fidelity ? Math.max(1, Math.ceil(wall.getAttribute('position').count / 24000)) : 1,
    );
  }

  // A faint seep of clear fluid on the caldera wall (Hunga Tonga is volcanically active).
  if (P.decoration === 'seeps') {
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

  // Audit capped reconstructions: their dense buried faces consume the frame budget.
  // Keep vertices, normals and bounds for anchors and seated colonies. Smaller walls
  // retain their original topology and avoid this terrain-sampling cost.
  if (fidelity && ground && nx === limits[0] && ny === limits[1]) {
    const pos = wall.getAttribute('position');
    const buried = Array.from(
      { length: pos.count },
      (_, i) => pos.getY(i) < ground(pos.getX(i), pos.getZ(i)) - 1,
    );
    const index = wall.getIndex()!;
    const visible: number[] = [];
    for (let i = 0; i < index.count; i += 3) {
      const a = index.getX(i),
        b = index.getX(i + 1),
        c = index.getX(i + 2);
      if (buried[a] && buried[b] && buried[c]) continue;
      visible.push(a, b, c);
    }
    wall.setIndex(visible);
  }

  const bounds = wall.boundingBox!.clone().union(apron.boundingBox!);
  const colliders = wallColliders(profile, W, D, H, 9, gnd, {
    disp,
    edgeStart: P.edgeStart,
    plan,
    liftAt: (x, y) => (y === undefined ? liftAt(x) : lift(x, y)),
    sinkAt,
  });
  const wallBoxCount = colliders.length;
  colliders.push(...talusColliders(talus, W));
  const impostor = impostorFromBoxes(colliders, bounds, P.base.getHex());
  // The slice heights use the segment's lowest taper and average ground lift.
  // At those heights the rock can belong to a different profile interval.
  // Clip the already deformed mesh sections instead of reconstructing its shape;
  // widen only depth, retaining the tapered tops and open undercuts. Capture the
  // distant stand-in first so collision coverage cannot reshape visible rock.
  const pos = wall.getAttribute('position');
  const sections = Array.from({ length: nx + 1 }, (_, i) =>
    Array.from({ length: ny + 1 }, (_, j): [number, number] => {
      const n = i * (ny + 1) + j;
      return [pos.getY(n), pos.getZ(n)];
    }),
  );
  for (const box of colliders.slice(0, wallBoxCount)) {
    for (let i = 0; i <= nx; i++) {
      const x = pos.getX(i * (ny + 1));
      if (x < box.min.x || x > box.max.x) continue;
      const section = sections[i]!;
      const zs = [...crossings(section, box.min.y), ...crossings(section, box.max.y)];
      for (const [y, z] of section) if (y >= box.min.y && y <= box.max.y) zs.push(z);
      for (const z of zs) {
        box.min.z = Math.min(box.min.z, z);
        box.max.z = Math.max(box.max.z, z);
      }
    }
  }
  return {
    full,
    impostor,
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
  /** Vertical deformation at the raw profile point, also given to `extrudeProfile`. */
  rise?: (x: number, y: number, z: number) => number;
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
      // Grow the original proxy to include raised or cut roof faces. Applying
      // rise as a lift would move the bottom too and leave gaps between slices;
      // applying it before the crest cap would discard raised roof tops.
      let riseMin = 0;
      let riseMax = 0;
      if (shape?.rise) {
        const points: [number, number][] = solid.filter(([y]) => y >= y0 && y <= y1);
        for (const y of [y0, (y0 + y1) / 2, y1])
          for (const z of crossings(solid, y)) points.push([y, z]);
        for (const x of xs)
          for (const [y, z] of points) {
            const rise = shape.rise(x, y, z);
            riseMin = Math.min(riseMin, rise);
            riseMax = Math.max(riseMax, rise);
          }
      }
      const lo = ya + dyA + riseMin;
      const hi = Math.min(yb + dyB, crest + dyB + 0.3) + riseMax;
      if (hi - lo < 0.05) continue;
      out.push(
        boxCH(cx, (lo + hi) / 2, (front + zBack) / 2, hx, (hi - lo) / 2, (zBack - front) / 2),
      );
    }
  }
  return out;
}

export type SpongeKind = 0 | 1 | 2;

/** Size and colour limits for wall sponges (metres, HSL), kept in one place for tests. */
export const SPONGE_LIMITS = { maxScale: 2.4, maxSat: 0.3, maxLight: 0.46 } as const;

const SPONGE_SHAPES = [
  { width: [0.9, 0.9], height: (sx: number, r: number) => sx * (0.8 + r * 0.5), tilt: 1 },
  { width: [0.9, 0.9], height: (_sx: number, r: number) => 1.1 + r * 1.3, tilt: 1 },
  { width: [1.2, 1.2], height: (_sx: number, r: number) => 0.5 + r * 0.5, tilt: 0.6 },
] as const;

/** One wall sponge: kind 0 vase, 1 tall tube, 2 encrusting dome. Small, dull and varied. */
export function wallSpongeSpec(
  kind: SpongeKind,
  x: number,
  y: number,
  z: number,
  tilt: number,
  rnd: () => number,
): InstanceSpec {
  const shape = SPONGE_SHAPES[kind];
  const sx = shape.width[0] + rnd() * shape.width[1];
  const sy = shape.height(sx, rnd());
  return {
    t: { x, y, z, ry: rnd() * 6.28, rx: tilt * shape.tilt, sx, sy, sz: sx },
    color: new THREE.Color().setHSL(0.04 + rnd() * 0.1, 0.14 + rnd() * 0.16, 0.26 + rnd() * 0.2),
  };
}

/** Bubblegum, red and orange gorgonians with the odd pale one, so a wall of fans is not one flat white. */
const FAN_PALETTE = [0xe98a86, 0xe8863c, 0xd0524a, 0xf0c8a8, 0xd96f9a, 0xf0e8d8].map(
  (c) => new THREE.Color(c),
);
function fanColour(pick: number, shade: number): THREE.Color {
  const base =
    FAN_PALETTE[Math.min(FAN_PALETTE.length - 1, Math.floor(pick * FAN_PALETTE.length))]!;
  return base.clone().multiplyScalar(0.75 + 0.35 * shade);
}

/** Find the frontmost rendered triangle at (x, y), using the extrusion's x columns. */
function wallFaceSampler(
  wall: THREE.BufferGeometry,
  columns: number,
  rows: number,
): (x: number, y: number) => number | undefined {
  const pos = wall.getAttribute('position');
  const bounds = wall.boundingBox!;
  const ray = new THREE.Ray(new THREE.Vector3(), new THREE.Vector3(0, 0, 1));
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const hit = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const edge = new THREE.Vector3();
  const index = wall.getIndex()!;
  return (x, y) => {
    const column = Math.floor(((x - bounds.min.x) / (bounds.max.x - bounds.min.x)) * columns);
    if (column < 0 || column >= columns) return undefined;
    ray.origin.set(x, y, bounds.min.z - 1);
    let front = Infinity;
    let nz = 0;
    // Only this column can cross a +Z ray. Avoid scanning the whole wall per colony.
    for (let t = column * rows * 6; t < (column + 1) * rows * 6; t += 3) {
      const ia = index.getX(t);
      const ib = index.getX(t + 1);
      const ic = index.getX(t + 2);
      if (
        y < Math.min(pos.getY(ia), pos.getY(ib), pos.getY(ic)) ||
        y > Math.max(pos.getY(ia), pos.getY(ib), pos.getY(ic))
      )
        continue;
      a.fromBufferAttribute(pos, ia);
      b.fromBufferAttribute(pos, ib);
      c.fromBufferAttribute(pos, ic);
      // Test both sides first: a folded terrace may hide an otherwise front-facing triangle.
      if (ray.intersectTriangle(a, b, c, false, hit) && hit.z < front) {
        front = hit.z;
        normal.subVectors(b, a).cross(edge.subVectors(c, a)).normalize();
        nz = normal.z;
      }
    }
    return nz < -0.25 ? front : undefined;
  };
}

/**
 * One angular boulder template: a noisy lump cut by a few random planes (fractured faces of
 * different sizes, so the outline is irregular rather than a regular polygon), roughened with
 * fine noise and painted with pale-to-dark bedding bands plus a dark underside.
 */
function fracturedBoulder(detail: number, seed: number, variant: number): THREE.BufferGeometry {
  const g = lump(Math.max(2, detail), seed, 0.3, 1.5);
  const rnd = mulberry32(seed ^ 0xb01d);
  const planes: { n: THREE.Vector3; d: number }[] = [];
  const cuts = 3 + variant;
  for (let i = 0; i < cuts; i++) {
    const n = new THREE.Vector3(rnd() * 2 - 1, (rnd() * 2 - 1) * 0.6, rnd() * 2 - 1).normalize();
    planes.push({ n, d: 0.62 + rnd() * 0.28 });
  }
  const p = g.getAttribute('position');
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    for (const pl of planes) {
      const over = v.dot(pl.n) - pl.d;
      if (over > 0) v.addScaledVector(pl.n, -over);
    }
    const r = 1 + (fbm3(v.x * 5 + 3, v.y * 5, v.z * 5, seed + 77, 2) - 0.5) * 0.14;
    p.setXYZ(i, v.x * r, v.y * r, v.z * r);
  }
  g.computeVertexNormals();
  paint(g, (x, y, z, _n, out) => {
    const band = Math.sin(y * 9 + fbm3(x * 1.5, y, z * 1.5, seed + 9, 2) * 5);
    const patch = fbm3(x * 2.5 + 1, y * 2.5, z * 2.5, seed + 31, 3);
    out.setScalar((0.5 + 0.5 * smooth(-1, 0.5, y)) * (0.84 + 0.1 * band + 0.3 * (patch - 0.5)));
  });
  projectUVs(g, 1.2);
  return g;
}

/** Displace a geometry's vertices by position-keyed noise (seam-safe) so low-poly shapes lose their regular outline. */
function roughen(g: THREE.BufferGeometry, amp: number, seed: number): THREE.BufferGeometry {
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const f = 1 + (fbm3(x * 9 + 5, y * 9 + 5, z * 9 + 5, seed, 2) - 0.5) * 2 * amp;
    p.setXYZ(i, x * f, y * (0.9 + 0.1 * f), z * f);
  }
  g.computeVertexNormals();
  return g;
}

/** Sponges and fans seated on exposed rendered triangles of the lit wall face. */
function addWallLife(
  full: THREE.Group,
  wall: THREE.BufferGeometry,
  segments: [number, number],
  growth: number,
  branchDepth: number,
  joinY: number,
  H: number,
  seed: number,
  rnd: () => number,
  surface: (x: number, z: number) => number,
  candidateStride = 1,
): void {
  const pos = wall.getAttribute('position');
  const nor = wall.getAttribute('normal');
  const n = pos.count;
  const faceAt = wallFaceSampler(wall, ...segments);
  const sponges: InstanceSpec[][] = [[], [], []];
  const spongeCount = (): number => sponges[0]!.length + sponges[1]!.length + sponges[2]!.length;
  const fans: InstanceSpec[][] = [[], []];
  const wantSponge = Math.round(90 * Math.min(growth, 1.2));
  const wantFans = Math.round(70 * Math.min(growth, 1.2));
  const seats: THREE.Vector3[] = [];
  for (let i = 0; i < n; i += candidateStride) {
    const y = pos.getY(i);
    const nz = nor.getZ(i);
    // Lit face only: facing the viewer, between the apron and the upper terraces.
    if (nz > -0.25 || y < joinY + 0.04 * H || y > 0.72 * H) continue;
    if (fbm3(pos.getX(i) * 0.12, y * 0.1, seed + 55, seed + 2, 3) < 0.42) continue; // patchy
    const out = 0.12;
    const x = pos.getX(i) + nor.getX(i) * out;
    const yy = y + nor.getY(i) * out;
    // Smoothed vertex normals can point across a terrace edge, putting the
    // offset seat inside rock or over empty water. Seat on the actual first
    // triangle facing the light, rather than trusting that normal's z offset.
    const face = faceAt(x, yy);
    if (face === undefined) continue;
    const z = face - out;
    // A wall vertex can be below the rising seabed or rubble apron. Check the
    // final outward-offset seat and resample buried candidates without lifting
    // colonies off the wall or reducing their requested counts.
    if (yy <= surface(x, z) + out) continue;
    seats.push(new THREE.Vector3(x, yy, z));
  }
  // Sample exposed seats directly: a finite retry budget could silently drop
  // colonies on steep terrain where most of the wall is buried.
  while (
    seats.length &&
    (spongeCount() < wantSponge || fans[0]!.length + fans[1]!.length < wantFans)
  ) {
    const { x, y: yy, z } = seats[Math.floor(rnd() * seats.length)]!;
    const tilt = -(0.9 + rnd() * 0.5); // lean out of the face
    if (
      spongeCount() < wantSponge &&
      (fans[0]!.length + fans[1]!.length >= wantFans || rnd() < 0.5)
    ) {
      const kind = Math.min(2, Math.floor(rnd() * 3)) as SpongeKind;
      sponges[kind].push(wallSpongeSpec(kind, x, yy, z, tilt, rnd));
    } else if (fans[0]!.length + fans[1]!.length < wantFans) {
      const s = 1.8 + rnd() * rnd() * 2.6;
      fans[rnd() < 0.5 ? 0 : 1]!.push({
        t: { x, y: yy, z, ry: rnd() * 6.28, rx: tilt, sx: s, sy: s, sz: s },
        color: fanColour(rnd(), rnd()),
      });
    }
  }
  const spongeGeo: THREE.BufferGeometry[] = [
    // Vase: a small open cup.
    roughen(
      new THREE.CylinderGeometry(0.14, 0.08, 0.5, 11, 2, true).translate(0, 0.25, 0),
      0.22,
      3,
    ),
    // Tube: a tall, narrow chimney.
    roughen(new THREE.CylinderGeometry(0.07, 0.06, 1, 9, 3, true).translate(0, 0.5, 0), 0.25, 4),
    // Encrusting: a low closed dome hugging the rock.
    roughen(new THREE.SphereGeometry(0.3, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0.3, 5),
  ];
  const sm = new THREE.MeshStandardMaterial({
    color: LIFE_TINT,
    roughness: 0.85,
    side: THREE.DoubleSide,
  });
  vertexGlow(sm, 0.12, 0x8fc0c6, 0.35);
  sponges.forEach((items, k) => {
    if (items.length) full.add(instanced(spongeGeo[k]!, sm, items, `wall-sponges-${k}`));
  });
  const cm = new THREE.MeshStandardMaterial({
    color: LIFE_TINT,
    vertexColors: true,
    roughness: 0.75,
    side: THREE.DoubleSide,
  });
  vertexGlow(cm, 0.2, 0x8fc0c6, 0.35);
  fans.forEach((items, k) => {
    if (items.length) {
      full.add(
        instanced(
          branchingColony(Math.min(branchDepth, 3), seed + 300 + k * 41),
          cm,
          items,
          `wall-corals-${k}`,
        ),
      );
    }
  });
}
