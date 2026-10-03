/**
 * Site-scoped terrain features the survey grid cannot resolve. Pure TS, no DOM.
 *
 * The Great Blue Hole is ~320 m across, about five GMRT cells, and the grid shows
 * only a flat 4 m reef platform there. `blueHoleHeight` is an analytic carve of
 * the sinkhole (near-circular, steep walls, a ledge at ~40 m where the real
 * stalactites hang, a floor near 125 m) applied on top of the measured surface.
 * It is a reconstruction (tagged in the Journal and the prop note), not survey data.
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

export interface TerrainCarve {
  /** Height after the carve, given the measured height at (x, z). Never raises the seabed. */
  apply(x: number, z: number, height: number): number;
  /** Centre of the carve in world metres. */
  readonly centre: { x: number; z: number };
}

/** The carve for a tile, or null when it has none. */
export function terrainCarveFor(meta: TileMeta): TerrainCarve | null {
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
      const r = Math.hypot(dx, dz) / wob;
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
      return Math.min(height, profileAt(r) + ledge + ripple);
    },
  };
}
