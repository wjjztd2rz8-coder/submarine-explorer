/** Monterey's authored opening: visibility aids and staged, factual wildlife. */
export const MONTEREY_OPENING = {
  hemisphere: { sky: 0xa8bbc8, ground: 0x493d32, intensity: 3 },
  lamps: { intensity: 2, distance: 1.2, fillIntensity: 3, fillDistance: 1.5 },
  habitatRadiusM: 160,
  schoolRunM: 10,
  schoolHoldS: 12,
  penSpacingM: 3.5,
  groups: [
    { species: 'pacific-hake', offset: [22, 10, 6], low: 8, count: 14 },
    { species: 'pacific-hake', offset: [32, 16, 26], low: 5, count: 12 },
    { species: 'sablefish', offset: [16, 0, -14], low: 3, count: 4 },
    { species: 'sea-pen', offset: [28, 0, -12], low: 5, count: 9 },
  ],
} as const;

/** Irregular mudstone beds, local slump scars and pale sediment on exposed shelves. */
export const MONTEREY_STRATA = {
  /** Bed thickness range (relative); drawn with a skew so thin beds dominate and a few are massive. */
  thickness: [0.3, 3.4],
  thicknessSkew: 2.2,
  /** Muted bed albedos: olive-grey, tan, cool grey, dark olive, pale buff. */
  bedPalette: [0x8f8c72, 0xa58f6c, 0x7d8284, 0x5f6250, 0xb0a585],
  wanderFrequency: [0.03, 0.035],
  wanderBeds: 1.8,
  ledgeStrength: [0.12, 1.55],
  slumpFrequency: [0.055, 0.075],
  slumpDepthH: 0.06,
  dustAmount: 0.3,
} as const;
