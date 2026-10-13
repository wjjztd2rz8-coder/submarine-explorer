/**
 * Baked vertex-colour relief for the Challenger Deep trench slopes. The real GMRT surface is
 * smooth, so the wall is shaped only by colour: a lighter, warmer upslope gradient, faint
 * horizontal sediment terraces and darker slope shoulders. On the flat floor the multiplier varies about 1 by
 * under 15% (warm/cool sediment patches and faint current drift lines) and brightens gently up the
 * wall. A soft shadow across the lower rise separates the far slope from the lander's floor.
 */

import { smoothstep as smooth } from '../util/math.js';

import { DEEP_OPENINGS } from '../core/config/deepOpenings.js';

/** Depth (m, negative) of the lander floor; the gradient starts a few metres above it. */
const FLOOR_Y = -10935;
const WALL_RISE_M = 260;
const SHOULDER_SHADOW = DEEP_OPENINGS['challenger-deep'].slopeShadow;

export function challengerSlopeTint(
  x: number,
  y: number,
  z: number,
  normalY: number,
): readonly [number, number, number] {
  const up = smooth(FLOOR_Y + 4, FLOOR_Y + WALL_RISE_M, y);
  const slope = 1 - smooth(0.9, 0.995, normalY);
  // Sediment terraces: slow sine bands in depth, bent by a plan-view wobble so they are not ruled lines.
  const wobble = Math.sin(x * 0.013 + z * 0.009) * 3 + Math.sin(x * 0.041 - z * 0.033) * 1.2;
  const terrace = Math.sin(((y + wobble) / 7.5) * Math.PI * 2);
  const band = 1 + 0.1 * terrace * Math.max(slope, up * 0.6);
  // Lighter and slightly warmer with height; steep faces a touch darker in their recesses.
  // Floor sediment tone: broad warm/cool patches plus thin bottom-current drift lines (a lighter crest, darker lee).
  const patch = Math.sin(x * 0.021 + Math.sin(z * 0.017) * 1.6) * Math.sin(z * 0.026 - x * 0.011);
  const drift = Math.sin((x * 0.62 + z * 0.78) * 0.9 + Math.sin(x * 0.05 - z * 0.04) * 2.4);
  const floorW = 1 - up;
  const tone = 1 + floorW * (0.09 * patch + 0.035 * drift * (0.5 + 0.5 * patch));
  // The measured floor rises gently north of the lander. Shade that lower shoulder,
  // easing back to the existing lit wall above it; no new contour or geometry.
  const shoulder =
    smooth(SHOULDER_SHADOW.startY, SHOULDER_SHADOW.fullY, y) *
    (1 - smooth(SHOULDER_SHADOW.fadeY, SHOULDER_SHADOW.endY, y));
  const g =
    (1 + 0.5 * up) *
    band *
    (1 - 0.1 * slope * (1 - up)) *
    tone *
    (1 - SHOULDER_SHADOW.strength * shoulder);
  const warm = 1 + 0.02 * up + floorW * 0.015 * patch;
  return [g * warm * 0.9, g * 0.98, g * (1.02 - 0.04 * up - floorW * 0.015 * patch)];
}
