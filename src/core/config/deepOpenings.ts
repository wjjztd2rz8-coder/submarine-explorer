import type { WaterConfig } from './atmosphere.js';

/** Authored exposure at depth, not sunlight. Keep the upper water column unchanged. */
export const DEEP_OPENINGS = {
  'challenger-deep': {
    fogDensity: 0.015,
    // Baked lower-rise shade; preserve the near lander floor and upper wall.
    slopeShadow: {
      startY: -10926,
      fullY: -10920,
      fadeY: -10885,
      endY: -10815,
      strength: 0.12,
    },
    ambientColor: 0x879399,
    ambientIntensity: 18,
    vignette: 0.32,
    hemisphere: { sky: 0xa8bbc8, ground: 0x50473e, intensity: 3 },
    lamps: { intensity: 2, distance: 1, fillIntensity: 3, fillDistance: 1.5 },
  },
  endurance: {
    fogDensity: 0.01,
    snowDensity: 0.12,
    // Fine suspended sediment, rather than broad, brightly lit fog discs.
    wreckAtmosphere: {
      hazeParticles: 1500,
      hazeSizeM: 0.08,
      hazeOpacity: 0.075,
      motesPerHull: 100,
      moteSizeM: 0.04,
      moteOpacity: 0.12,
      maxSizePx: 2,
      maxBrightness: 0.75,
    },
    ambientColor: 0x879399,
    ambientIntensity: 20,
    vignette: 0.34,
    hemisphere: { sky: 0xa8bbc8, ground: 0x50473e, intensity: 2 },
    // Close timber and pale sand clip at 2x lamps; 0.7x keeps the wood grain at 15 m and the hull legible at 40 m.
    lamps: { intensity: 0.7, distance: 1, fillIntensity: 1.5, fillDistance: 1.5 },
  },
} as const;

export function deepOpeningFor(site: string) {
  return DEEP_OPENINGS[site as keyof typeof DEEP_OPENINGS];
}

/** A local copy avoids changing another site's palette or the global config. */
export function deepSiteWater(site: string, water: WaterConfig): WaterConfig {
  const tuning = deepOpeningFor(site);
  if (!tuning) return water;
  return {
    ...water,
    bands: water.bands.map((band) =>
      band.depth <= -1000
        ? {
            ...band,
            fogDensity: tuning.fogDensity,
            snowDensity: 'snowDensity' in tuning ? tuning.snowDensity : band.snowDensity,
            ambientColor: tuning.ambientColor,
            ambientIntensity: tuning.ambientIntensity,
            grade: { ...band.grade, vignette: tuning.vignette },
          }
        : band,
    ),
  };
}
