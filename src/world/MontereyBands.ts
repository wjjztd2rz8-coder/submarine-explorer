/** Mudstone beds baked into the Monterey bank vertices, so the survey slopes match the prop walls. */
import { lostCityBedTint } from './LostCityBands.js';
import { fbm3, smooth } from './props/geo/shared.js';

export const MONTEREY_BANK_STRATA = { periodM: 7.5, amount: 0.5 };

/** Bed tone plus a darker, patchy face on steep banks; level silt keeps its colour. */
export function montereySlopeTint(
  x: number,
  y: number,
  z: number,
  normalY: number,
): readonly [number, number, number] {
  const slope = smooth(0.002, 0.06, 1 - normalY);
  const bed = lostCityBedTint(
    x,
    y,
    z,
    MONTEREY_BANK_STRATA.periodM,
    MONTEREY_BANK_STRATA.amount * slope,
  );
  const patch = 0.9 + 0.2 * fbm3(x * 0.05, 31, z * 0.05, 641, 3);
  const dark = (1 - 0.4 * slope) * (1 + (patch - 1) * slope);
  return [bed[0] * dark, bed[1] * dark, bed[2] * dark];
}
