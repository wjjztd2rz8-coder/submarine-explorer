/** Broad, irregular carbonate beds, baked into existing Lost City vertices. */
import { fbm3, smooth } from './props/geo/shared.js';

export const LOST_CITY_STRATA = { periodM: 12.8, amount: 0.4 };

/** Linear colour multipliers: pale resistant beds, cooler weathered beds, soft joints. */
export function lostCityBedTint(
  x: number,
  y: number,
  z: number,
  periodM: number,
  strength: number,
): readonly [number, number, number] {
  // Strong low-frequency warp: beds break into drifting patches, not contour-parallel stripes.
  const warp = (fbm3(x * 0.012, 3, z * 0.012, 600, 3) - 0.5) * 2.4;
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
  const bed = lostCityBedTint(x, y, z, LOST_CITY_STRATA.periodM, LOST_CITY_STRATA.amount * slope);
  // Sediment variation: dark organic-rich silt pockets and pale carbonate-flour drifts,
  // balanced about 1.0 so the slope keeps its overall brightness.
  const broad = fbm3(x * 0.045, 11, z * 0.045, 611, 3);
  const fine = fbm3(x * 0.3, 13, z * 0.3, 613, 2);
  // Boulder-field patches on a warped lattice, so the slope never repeats.
  const wx = x + (fbm3(x * 0.1, 19, z * 0.1, 619, 2) - 0.5) * 6;
  const wz = z + (fbm3(x * 0.1, 23, z * 0.1, 623, 2) - 0.5) * 6;
  const cobble = fbm3(wx * 0.22, 29, wz * 0.22, 629, 2);
  const silt =
    0.84 +
    0.3 * smooth(0.3, 0.7, broad) +
    0.1 * (fine - 0.5) +
    0.45 * (smooth(0.3, 0.7, cobble) - 0.5) * (0.6 + slope);
  const warm = 1 + 0.08 * (fbm3(x * 0.09, 17, z * 0.09, 617, 2) - 0.5);
  return [bed[0] * silt * warm, bed[1] * silt, (bed[2] * silt) / warm];
}
