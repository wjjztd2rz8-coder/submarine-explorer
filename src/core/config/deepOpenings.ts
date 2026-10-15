import type { WaterConfig } from './atmosphere.js';

/** Authored exposure at depth, not sunlight. Keep the upper water column unchanged. */
export const DEEP_OPENINGS = {
  'challenger-deep': {
    hero: 'leggo-lander-marker',
    opening: {
      hero: 'leggo-lander-marker',
      bearing: 135,
      range: 30,
      altitude: 8,
      yawOffset: 8,
      chaseRadius: 84,
      chaseOffsetX: -48,
      chaseOffsetY: -17,
      portraitChaseOffset: { x: -48, y: -17 },
    },
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
    habitat: {
      species: 'hadal-amphipod',
      // Bring the bait-station group into the lander's approach, away from the hull.
      aheadM: 24,
      sideM: 5,
      low: 24,
      count: 45,
      spacingM: 1.0,
      onWreck: false,
    },
  },
  endurance: {
    hero: 'main-hull',
    opening: {
      hero: 'main-hull',
      bearing: 90,
      range: 6,
      altitude: 10,
      yawOffset: -10,
      // Camera straight behind the sub, which stays small and centred; the 44 m hull sits broadside ahead and fills over a third of the frame.
      chaseRadius: 54,
      chaseOffsetX: 0,
      chaseOffsetY: -34,
      portraitChaseOffset: { x: 0, y: -48, radius: 52 },
    },
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
    habitat: {
      species: 'anemone',
      aheadM: 19,
      sideM: 9,
      low: 5,
      count: 8,
      spacingM: 0.8,
      onWreck: true,
    },
    deckPatch: { x: 1.8, z: -13, rowSpacingM: 3, castHeightM: 20 },
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
