/** Irregular mudstone beds, local slump scars and pale sediment on exposed shelves. */
export const MONTEREY_STRATA = {
  /** Bed thickness range (relative); drawn with a skew so thin beds dominate and a few are massive. */
  thickness: [0.7, 3.4],
  thicknessSkew: 2.2,
  /** Muted bed albedos: olive-grey, tan, cool grey, dark olive, pale buff. */
  bedPalette: [0x8f8c72, 0xa58f6c, 0x7d8284, 0x5f6250, 0xb0a585],
  wanderFrequency: [0.03, 0.035],
  wanderBeds: 1.8,
  ledgeStrength: [0.12, 1.55],
  slumpFrequency: [0.055, 0.075],
  slumpDepthH: 0.06,
  dustAmount: 0.3,
  /** Low-frequency tone drift of each bed (x, y frequency, relative swing) and how often a bed fades toward silt. */
  toneDriftFrequency: [0.018, 0.022],
  toneDrift: 0.9,
  faintBedAmount: 0.45,
  /** Lamina wobble (in laminae) and the share of each lamina's tone replaced by local noise, to break long stripes. */
  /** Per-bed albedo multiplier: floor and swing. */
  bedTone: [0.86, 0.26],
  laminaWarp: 1.6,
  laminaBreak: 0.65,
  /** Share of the ledge shadow line kept where laminae fade out. */
  lipFloor: 0.45,
  /** Height of the silt-banked wall foot (fraction of wall height) and apron silt touching the wall. */
  footBlendH: 0.45,
  /** Extra apron thickness at the wall foot, so talus climbs the face as a slope. */
  talusTopScale: 1.8,
  apronSiltAtWall: 0.85,
} as const;

/** Patchy rockfall and rolled blocks across the apron, rather than a row at its foot. */
export const MONTEREY_RUBBLE = {
  patchWavelengthM: 18,
  patchFloor: 0.18,
  blockRunout: [0.22, 1.55],
  fragmentRunout: [0.08, 1.75],
  blockRadius: [1.0, 2.4],
  fragmentRadius: [0.3, 1.8],
  /** Share of the non-block rocks that are pebbles and cobbles, and their radius range. */
  pebbleShare: 0.5,
  pebbleRadius: [0.24, 0.5],
  separationRadii: 0.6,
  placementAttempts: 32,
  radiusSkew: 2.6,
  scarRunout: [0.12, 1.5],
  scarSpread: 3.2,
  scarRadius: [0.6, 1.8],
} as const;
