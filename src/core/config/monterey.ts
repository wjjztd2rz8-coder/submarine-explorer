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

/** Patchy rockfall and rolled blocks across the apron, rather than a row at its foot. */
export const MONTEREY_RUBBLE = {
  patchWavelengthM: 18,
  patchFloor: 0.18,
  blockRunout: [0.22, 1.55],
  fragmentRunout: [0.08, 1.75],
  blockRadius: [1.2, 3.2],
  fragmentRadius: [0.3, 2.2],
  separationRadii: 0.6,
  placementAttempts: 32,
  radiusSkew: 1.8,
  scarRunout: [0.12, 1.5],
  scarSpread: 3.2,
  scarRadius: [0.6, 2.8],
} as const;
