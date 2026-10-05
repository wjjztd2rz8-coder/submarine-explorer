/** Broad, irregular carbonate beds, baked into existing Lost City vertices. */
import { fbm3, smooth } from './props/geo/shared.js';

export const LOST_CITY_STRATA = { periodM: 12.8, amount: 0.85 };

/** Linear colour multipliers: pale resistant beds, cooler weathered beds, soft joints. */
export function lostCityBedTint(
  x: number,
  y: number,
  z: number,
  periodM: number,
  strength: number,
): readonly [number, number, number] {
  const warp = (fbm3(x * 0.018, 3, z * 0.018, 600, 2) - 0.5) * 0.65;
  const bed = y / periodM + warp;
  const phase = bed - Math.floor(bed);
  const resistant = 0.5 + 0.5 * Math.cos(phase * Math.PI * 2);
  const age = fbm3(Math.floor(bed) * 2.7, 5, 1, 603, 1);
  const joint = 1 - 0.12 * (1 - smooth(0, 0.16, phase));
  const tone = (0.8 + 0.4 * resistant + 0.08 * age) * joint;
  return [
    1 + (tone * (0.96 + 0.04 * resistant) - 1) * strength,
    1 + (tone - 1) * strength,
    1 + (tone * (1.04 - 0.04 * resistant) - 1) * strength,
  ];
}

export function lostCitySlopeTint(
  x: number,
  y: number,
  z: number,
  normalY: number,
): readonly [number, number, number] {
  // The previous fragment strata began at ~28 degrees, hiding gentle massif slopes.
  // Fade in from 4 to 17 degrees; leave level silt unbanded. Broad beds survive LOD.
  const slope = smooth(0.002, 0.045, 1 - normalY);
  return lostCityBedTint(x, y, z, LOST_CITY_STRATA.periodM, LOST_CITY_STRATA.amount * slope);
}
