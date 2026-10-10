/**
 * Baked vertex-colour relief for the Challenger Deep trench slopes. The real GMRT surface is
 * smooth, so the wall is shaped only by colour: a lighter, warmer upslope gradient, faint
 * horizontal sediment terraces and darker slope shoulders. Multipliers sit around 1 on the flat
 * floor (so the lander's seabed is unchanged) and brighten gently up the wall; never below 0.8.
 */

/** Depth (m, negative) of the lander floor; the gradient starts a few metres above it. */
const FLOOR_Y = -10935;
const WALL_RISE_M = 260;

const smooth = (a: number, b: number, v: number): number => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

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
  const g = (1 + 0.5 * up) * band * (1 - 0.1 * slope * (1 - up));
  return [g * (1 + 0.06 * up), g, g * (1 - 0.1 * up)];
}
