/**
 * Site-scoped terrain features the survey grid cannot resolve. Pure TS, no DOM.
 *
 * The Great Blue Hole is ~320 m across, about five GMRT cells, and the grid shows
 * only a flat 4 m reef platform there. `blueHoleHeight` is an analytic carve of
 * the sinkhole (near-circular, steep walls, a ledge at ~40 m where the real
 * stalactites hang, a floor near 125 m) applied on top of the measured surface.
 * It is a reconstruction (tagged in the Journal and the prop note), not survey data.
 * Monterey also gets a local reconstructed opening bend between its mudstone
 * banks; the surveyed tile and science contacts remain unchanged.
 */

import { latLonToWorld } from '../util/geo.js';
import type { TileMeta } from '../util/types.js';

/** Reported position of the Great Blue Hole (Wikipedia: 17 18 56 N, 87 32 08 W). */
export const BLUE_HOLE_LAT = 17.3156;
export const BLUE_HOLE_LON = -87.5356;
/** Lip radius of the hole in metres (diameter ~320 m). */
export const BLUE_HOLE_RADIUS_M = 160;

/** (radius from the hole centre, absolute height) knots of the wall profile; linear between. */
const PROFILE: readonly (readonly [number, number])[] = [
  [215, 0],
  [184, -9],
  [170, -18],
  [160, -30],
  [153, -38],
  [134, -41],
  [126, -52],
  [119, -72],
  [112, -78],
  [108, -98],
  [92, -118],
  [60, -123],
  [0, -125],
];

const smoothstep = (t: number): number => t * t * (3 - 2 * t);

function profileAt(r: number, profile = PROFILE): number {
  if (r >= profile[0]![0]) return 0;
  for (let i = 1; i < profile.length; i++) {
    const [r1, h1] = profile[i]!;
    if (r >= r1) {
      const [r0, h0] = profile[i - 1]!;
      return h1 + (h0 - h1) * smoothstep((r - r1) / (r0 - r1));
    }
  }
  return profile[profile.length - 1]![1];
}

// Broad limestone beds separated by short, steep risers. Radial treads are
// 4–7 m wide, so even the locally refined Low mesh resolves their silhouettes.
// The original 40 m gallery seat is retained; angular masks also protect its roof.
const TERRACE_PROFILE: readonly (readonly [number, number])[] = [
  [215, 0],
  [184, -9],
  [177, -10],
  [173, -18],
  [166, -19],
  [160, -30],
  [153, -38],
  [134, -41],
  [129, -43],
  [125, -62],
  [121, -63],
  [117, -74],
  [112, -78],
  [108, -98],
  [102, -100],
  [97, -113],
  [92, -118],
  [60, -123],
  [0, -125],
];

/** Wall alcoves: bearing (rad), angular half-width, absolute height (m), height half-range, depth (m). */
const NOTCHES: readonly { a: number; w: number; h: number; hw: number; d: number }[] = [
  { a: 0.4, w: 0.16, h: -60, hw: 9, d: 13 },
  { a: 2.3, w: 0.13, h: -88, hw: 8, d: 12 },
  { a: 3.9, w: 0.18, h: -52, hw: 8, d: 14 },
  { a: 5.4, w: 0.12, h: -75, hw: 7, d: 10 },
];

/** Fixed floor blocks: (dx, dz, radius, height) in metres from the hole centre. */
const BLOCKS: readonly (readonly [number, number, number, number])[] = [
  [-34, 22, 5, 3.5],
  [18, -41, 6, 4],
  [41, 30, 4, 3],
  [-12, -30, 3.5, 2.5],
  [-52, -18, 5.5, 4],
  [8, 47, 4.5, 3],
  [26, 6, 3, 2],
  [-20, 55, 4, 3],
];

function boulderField(dx: number, dz: number): number {
  let h = 0;
  for (const [bx, bz, br, bh] of BLOCKS) {
    const d2 = ((dx - bx) * (dx - bx) + (dz - bz) * (dz - bz)) / (br * br);
    if (d2 < 1) h += bh * (1 - d2) * (1 - d2) * 1.4;
  }
  return h;
}

const clamp01 = (t: number): number => Math.max(0, Math.min(1, t));

/**
 * Replace the smooth bowl with broad beds, from the upper reef to the lower
 * wall. The beds wander slowly with bearing, without quantisation seams or
 * isolated rock skins. Returns a height delta; both gallery mouths and the
 * floor retain their original surface.
 */
export function blueHoleTerraces(a: number, r: number): number {
  let mouth = 1;
  for (const [bearing, width] of [
    [Math.PI, 0.3],
    [1.0, 0.25],
  ]) {
    const da = Math.abs(Math.atan2(Math.sin(a - bearing!), Math.cos(a - bearing!)));
    mouth *= smoothstep(clamp01((da - width!) / 0.15));
  }
  if (mouth <= 0) return 0;
  const zone = smoothstep(clamp01((r - 100) / 10)) * (1 - smoothstep(clamp01((r - 184) / 11)));
  if (zone <= 0) return 0;
  const drift = 0.8 * Math.sin(3 * a + 0.7) + 0.35 * Math.sin(7 * a + 2);
  const rr = r + drift;
  return mouth * zone * (profileAt(rr, TERRACE_PROFILE) - profileAt(r));
}

/** Relief is part of the single heightfield, so sand and exposed rock share
 * vertices, derivative normals, material and collision. Suppress displacement
 * around both gallery seats to retain their original mouth and pendant space.
 */
export function blueHoleWallRelief(a: number, r: number): number {
  const ends =
    smoothstep(Math.max(0, Math.min(1, (r - 96) / 12))) *
    (1 - smoothstep(Math.max(0, Math.min(1, (r - 177) / 13))));
  let mouth = 1;
  for (const [bearing, width] of [
    [Math.PI, 0.3],
    [1.0, 0.25],
  ]) {
    const da = Math.abs(Math.atan2(Math.sin(a - bearing!), Math.cos(a - bearing!)));
    mouth *= smoothstep(Math.max(0, Math.min(1, (da - width!) / 0.15)));
  }
  const flute = (0.5 + 0.5 * Math.sin(43 * a + 0.2 * Math.sin(r * 0.12))) ** 3;
  const bench = Math.exp(-(((r - 139 - 2 * Math.sin(9 * a)) / 3.5) ** 2));
  const lower = Math.exp(-(((r - 115 - 1.5 * Math.sin(7 * a)) / 2.8) ** 2));
  const broken = 0.6 + 0.4 * Math.sin(17 * a + r * 0.08) ** 2;
  // Fine rubble hummocks at the foot of each broken bench, without a second
  // surface or rock AABBs closing the navigable shaft.
  const rubble = Math.max(0, Math.sin(61 * a + r * 0.9)) ** 4 * (bench + lower);
  return ends * mouth * (1.4 * flute + 1.1 * (bench + lower) * broken + 0.7 * rubble);
}

/** Centre of the carve, recorded when the carve is built; the vertex tint reads it. */
let blueHoleCentre: { x: number; z: number } | null = null;

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * Baked linear albedo multipliers for the bowl: warm tan reef-top limestone
 * giving way to ochre and then grey-brown lower beds, per-bed tone changes with
 * a dark joint, and ambient occlusion at the foot of every riser and under each
 * lip. Replaces the fragment strata (one vertex attribute, no extra draw calls).
 */
export function blueHoleTint(
  x: number,
  y: number,
  z: number,
  normalY: number,
): readonly [number, number, number] {
  if (!blueHoleCentre) return [1, 1, 1];
  const dx = x - blueHoleCentre.x;
  const dz = z - blueHoleCentre.z;
  const r = Math.hypot(dx, dz);
  const depth = -y;
  const a = Math.atan2(dz, dx);
  // Colour by depth: warm tan, ochre, grey-brown, never below a readable floor.
  // Warm sunlit reef top, thin ochre, then a cool teal-blue ramp: the bottom reads cold, the rim warm.
  const ochre = smoothstep(clamp01((depth - 4) / 22));
  const cool = smoothstep(clamp01((depth - 14) / 70));
  let tr = lerp(lerp(1.16, 1.0, ochre), 0.5, cool);
  let tg = lerp(lerp(1.06, 0.86, ochre), 0.78, cool);
  let tb = lerp(lerp(0.82, 0.62, ochre), 0.88, cool);
  // Per-tread character: each level bed gets its own tone, warmth and silt cover, graded
  // across its width (pale outer lip, damp darker inner foot) so no tread is one flat value.
  let tread = 0;
  let treadU = 0.5;
  if (r > 90 && r < 215) {
    for (let i = 1; i < TERRACE_PROFILE.length; i++) {
      const [r1, h1] = TERRACE_PROFILE[i]!;
      const [r0, h0] = TERRACE_PROFILE[i - 1]!;
      if (r >= r1 && r < r0 && r0 - r1 > 3 && (h0 - h1) / (r0 - r1) < 0.8) {
        const th = 0.5 + 0.5 * Math.sin(i * 12.9898 + 1.7) * Math.cos(i * 4.131);
        tread = 1;
        treadU = (r - r1) / (r0 - r1);
        const warmth = th - 0.5;
        const tone = 0.9 + 0.24 * th + 0.1 * (treadU - 0.5);
        tr *= tone * (1 + 0.16 * warmth);
        tg *= tone;
        tb *= tone * (1 - 0.2 * warmth);
        break;
      }
    }
  }
  // Wall mask: the silt floor and the open reef stay soft, the rock gets the beds.
  const slope = smoothstep(clamp01((1 - normalY - 0.01) / 0.18));
  const wallR = smoothstep(clamp01((r - 92) / 8)) * (1 - smoothstep(clamp01((r - 205) / 10)));
  const rock = Math.max(slope, 0.55 * wallR);
  // Beds: uneven tone per bed, a thin dark joint between them.
  const wob = 1.6 * Math.sin(3 * a + depth * 0.02) + 0.7 * Math.sin(8 * a + 1.3);
  const bandT = depth / 3.4 + wob;
  const bi = Math.floor(bandT);
  const bh = 0.5 + 0.5 * Math.sin(bi * 12.9898 + 4.1) * Math.cos(bi * 7.233);
  const joint = smoothstep(clamp01((bandT - bi) / 0.12));
  const bed = (0.8 + 0.4 * bh) * (0.7 + 0.3 * joint);
  const k = rock * 0.85;
  tr *= lerp(1, bed * lerp(1.06, 0.92, bh), k);
  tg *= lerp(1, bed, k);
  tb *= lerp(1, bed * lerp(0.9, 1.06, bh), k);
  // Ambient occlusion: the tread just inside each riser foot, and the riser's lower face.
  let ao = 1;
  if (r < 186 && r > 90) {
    for (let i = 1; i < TERRACE_PROFILE.length; i++) {
      const [r1, h1] = TERRACE_PROFILE[i]!;
      const [r0, h0] = TERRACE_PROFILE[i - 1]!;
      if (r0 - r1 < 1 || (h0 - h1) / (r0 - r1) < 1.2) continue;
      if (r < r1) ao *= 1 - 0.34 * Math.exp(-(r1 - r) / 6.5);
      else if (r < r0) ao *= 1 - 0.2 * (1 - (r - r1) / (r0 - r1));
    }
  }
  // Broad mottling of the treads: warm sand patches against grey silt and darker rubble
  // beds, so a level shelf is never one flat cream tone.
  const mott =
    0.5 +
    0.25 * Math.sin(x * 0.11 + 1.3 * Math.sin(z * 0.07)) +
    0.25 * Math.sin(z * 0.085 + 0.9 * Math.sin(x * 0.13 + 2));
  const fine = 0.5 + 0.5 * Math.sin(x * 0.53 + z * 0.37 + 2 * Math.sin(x * 0.21 - z * 0.29));
  // Level silt and sand keep only part of the wall's chroma: pale sand, not saturated ochre.
  const mean = (tr + tg + tb) / 3;
  const keep = (0.3 + 0.7 * rock) * (1 - 0.15 * tread);
  tr = mean + (tr - mean) * keep;
  tg = mean + (tg - mean) * keep;
  tb = mean + (tb - mean) * keep;
  // Sediment patches on the shelf: three overlapping low-frequency fields pick between tan sand,
  // grey-brown silt and an olive algae film; a fourth marks darker rubble beds; scour streaks
  // (long ripples elongated across the current) modulate brightness. All baked, no new draw calls.
  // Patches also reach the bowl's treads (less on the steep risers, which keep their beds).
  const pf = 1 - 0.45 * rock;
  const f1 = 0.5 + 0.5 * Math.sin(x * 0.09 + 2 * Math.sin(z * 0.061 + 1) + z * 0.04);
  const f2 = 0.5 + 0.5 * Math.sin(z * 0.1 - 1.7 * Math.sin(x * 0.07 + 0.4) + 2.1);
  const f3 = 0.5 + 0.5 * Math.sin((x + z) * 0.12 + 2.4 * Math.sin((x - z) * 0.08));
  const olive = smoothstep(clamp01((f1 - 0.45) / 0.25)) * pf;
  const grey2 = smoothstep(clamp01((f2 - 0.45) / 0.25)) * pf;
  const rubble = smoothstep(clamp01((f3 - 0.5) / 0.25)) * pf * (0.6 + 0.4 * fine);
  const scour = 0.5 + 0.5 * Math.sin(x * 0.22 + 0.9 * Math.sin(z * 0.045) + z * 0.05);
  const ripple = pf * (0.5 + 0.5 * Math.sin(x * 1.3 + 5 * Math.sin(z * 0.09 + x * 0.04))) ** 2;
  let sr = 1 + pf * 0.3 * (mott - 0.5);
  let sg = 1 + pf * 0.1 * (mott - 0.5);
  let sb = 1 - pf * 0.4 * (mott - 0.5);
  // Olive film: pull red and blue down, keep green.
  sr = lerp(sr, sr * 0.68, olive);
  sg = lerp(sg, sg * 0.97, olive);
  sb = lerp(sb, sb * 0.52, olive);
  // Grey-brown silt: neutral and slightly cool.
  sr = lerp(sr, sr * 0.8, grey2 * 0.8);
  sg = lerp(sg, sg * 0.82, grey2 * 0.8);
  sb = lerp(sb, sb * 0.92, grey2 * 0.8);
  // Dark rubble beds, never below a readable floor.
  const dark = 1 - 0.55 * rubble;
  const bright = 1 + pf * (0.14 * (fine - 0.5) + 0.2 * (scour - 0.5) + 0.12 * (ripple - 0.3));
  const m = ao * dark * bright * (0.8 + 0.2 * smoothstep(clamp01(normalY)));
  // Crisp rim: a thin pale lip at the first riser, with a dark cut at its foot.
  // Kept soft and wide: the riser is a gradient, not a drawn line.
  const rim =
    1 +
    0.1 * Math.exp(-(((r - 179) / 4.5) ** 2)) * (1 - rock) -
    0.2 * Math.exp(-(((r - 171) / 5.5) ** 2));
  return [tr * m * sr * rim, tg * m * sg * rim, tb * m * sb * rim];
}

export interface TerrainCarve {
  /** Height after the carve, given the measured height at (x, z). Never raises the seabed. */
  apply(x: number, z: number, height: number): number;
  /** Centre of the carve in world metres. */
  readonly centre: { x: number; z: number };
}

/** The carve for a tile, or null when it has none. */
export function terrainCarveFor(meta: TileMeta): TerrainCarve | null {
  if (meta.id === 'monterey-canyon') {
    // A reconstructed S-bend beside the opening ledge. Its 180 m-wide floor
    // has shoulders smoothed out by the survey grid; retain the original wall seats.
    const wall = latLonToWorld(meta, 36.7872, -122.0133);
    const centre = { x: wall.x + 170, z: wall.z };
    return {
      centre,
      apply(x, z, height) {
        const along = z - centre.z;
        const axis = centre.x + 20 * Math.sin(along / 220);
        const across = Math.abs(x - axis);
        if (Math.abs(along) >= 620 || across >= 90) return height;
        const end = 1 - smoothstep(Math.max(0, (Math.abs(along) - 450) / 170));
        const bank = 1 - smoothstep(Math.max(0, (across - 30) / 60));
        // This local bend turns north before continuing west: its sandy floor
        // drops 20 m per 100 m forward, with steep shoulders into the banks.
        const floor = -860 + along * 0.2 + across * across * 0.002;
        return height + (Math.min(height, floor) - height) * end * bank;
      },
    };
  }
  if (meta.id !== 'great-blue-hole') return null;
  const centre = latLonToWorld(meta, BLUE_HOLE_LAT, BLUE_HOLE_LON);
  blueHoleCentre = centre;
  return {
    centre,
    apply(x, z, height) {
      const dx = x - centre.x;
      const dz = z - centre.z;
      if (dx * dx + dz * dz > 230 * 230) return height;
      const a = Math.atan2(dz, dx);
      // A slightly irregular outline, not a drawn circle.
      const wob = 1 + 0.035 * Math.sin(3 * a + 0.8) + 0.025 * Math.sin(5 * a + 2.1);
      const r0 = Math.hypot(dx, dz) / wob;
      // Alcoves: a few scooped notches in the wall (the cave mouths and undercuts the hole is
      // known for), a height field cannot overhang so they are steep, deep re-entrants.
      let r = r0;
      for (const n of NOTCHES) {
        let da = Math.abs(a - n.a);
        if (da > Math.PI) da = 2 * Math.PI - da;
        const ang = Math.exp(-((da / n.w) ** 2));
        const hgt = Math.exp(-(((profileAt(r0) - n.h) / n.hw) ** 2));
        r -= n.d * ang * hgt;
      }
      // Ledge undulation, rubble hummocks and sediment ripples (a metre or two) break up the carve.
      const rim = smoothstep(Math.min(1, Math.max(0, (r - 100) / 30)));
      const ledge =
        rim *
        (1 - smoothstep(Math.min(1, Math.max(0, (r - 150) / 20)))) *
        (2.2 * Math.sin(7 * a + 1.3 + r * 0.05) + 1.3 * Math.sin(13 * a + r * 0.11));
      const floor = 1 - smoothstep(Math.min(1, Math.max(0, (r - 80) / 30)));
      const ripple =
        floor *
        (0.5 * Math.sin(dx * 0.35 + 0.8 * Math.sin(dz * 0.09)) +
          0.9 * Math.sin(dz * 0.13 + dx * 0.05) +
          1.4 * Math.sin(dx * 0.045) * Math.sin(dz * 0.06));
      // Limestone strata: concentric shelves and recesses on the wall read as horizontal bands.
      const wall =
        smoothstep(Math.min(1, Math.max(0, (r - 104) / 6))) *
        (1 - smoothstep(Math.min(1, Math.max(0, (r - 152) / 8))));
      const strata =
        wall *
        (1.6 * Math.sin(r * 0.62 + 1.4 * Math.sin(3 * a)) + 0.9 * Math.sin(r * 1.37 + 2 * a));
      // Fallen blocks and sediment mounds on the floor.
      const blocks = floor * boulderField(dx, dz);
      return Math.min(
        height,
        profileAt(r) +
          ledge +
          ripple +
          strata +
          blocks +
          blueHoleWallRelief(a, r) +
          blueHoleTerraces(a, r),
      );
    },
  };
}
