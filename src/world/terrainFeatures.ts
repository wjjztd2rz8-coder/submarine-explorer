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

function profileAt(r: number): number {
  if (r >= PROFILE[0]![0]) return 0;
  for (let i = 1; i < PROFILE.length; i++) {
    const [r1, h1] = PROFILE[i]!;
    if (r >= r1) {
      const [r0, h0] = PROFILE[i - 1]!;
      return h1 + (h0 - h1) * smoothstep((r - r1) / (r0 - r1));
    }
  }
  return PROFILE[PROFILE.length - 1]![1];
}

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
 * Irregular benches on the sinkhole wall: the profile height is quantised into
 * treads and steep risers (period and phase wander with bearing, so no ring is
 * constant), with a small raised lip at each riser crest and a dip under it
 * that the slope shading reads as an undercut shadow. Returns a height delta.
 * Zone: heights -34..-100 m; the mouth mask in blueHoleWallRelief keeps both
 * gallery seats untouched.
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
  const h = profileAt(r);
  const zone = smoothstep(clamp01((h + 106) / 8)) * (1 - smoothstep(clamp01((h + 34) / 6)));
  if (zone <= 0) return 0;
  const q = 9 + 2.5 * Math.sin(5 * a + 0.7) + 1.5 * Math.sin(11 * a + 2.0);
  const off = 4 * Math.sin(3 * a + 1.1) + 2 * Math.sin(8 * a);
  const u = (h + off) / q;
  const f = u - Math.floor(u);
  const step = Math.floor(u) + smoothstep(clamp01((f - 0.58) / 0.27));
  const lip = Math.exp(-(((f - 0.9) / 0.07) ** 2));
  const under = Math.exp(-(((f - 0.66) / 0.07) ** 2));
  return mouth * zone * (step * q - off - h + 1.1 * lip - 1.3 * under);
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
