/** Beebe's authored smoker silhouette and visible mineral mouths (metres unless noted). */
export const BEEBE_CHIMNEY = {
  ledge: 0.27,
  wobble: 0.3,
  rough: 0.12,
  ridges: 5,
  ridgeAmp: 0.12,
  lip: 0.48,
  crater: 0.95,
  irregular: 1.15,
  mainShelves: 6,
  sideShelves: 2,
  shelfStart: 0.19,
  mainShelfStep: 0.115,
  sideShelfStep: 0.24,
  shelfJitter: 0.2,
  shelfRadiusFraction: 0.88,
  shelfWidthMin: 0.38,
  shelfWidthVariation: 0.4,
  shelfArcMin: 1.7,
  shelfArcVariation: 1.3,
  mouthColor: 0x0b0908,
  collarColor: 0x91806b,
  collarEmissive: 0x17110d,
  mouthClearanceM: 0.01,
  topMouthRadiusFraction: 0.66,
  topMouthRecessFraction: 0.2,
  outletCount: 3,
  outletStartHeightFraction: 0.36,
  outletHeightStepFraction: 0.14,
  outletStartAngleRad: 0.4,
  outletAngleStepRad: 2.12,
  outletLengthM: 0.9,
  outletBaseRadiusM: 0.72,
  outletTipRadiusM: 0.53,
  outletMouthRadiusM: 0.48,
  outletEmbedM: 0.22,
  outletRayStartM: 12,
  outletMaxAxisRadiusFactor: 1.5,
} as const;

/** Fractured basalt for Beebe's existing instanced biome rocks. */
export const BEEBE_SCATTER_ROCK = {
  color: 0x2e2d2b,
  jitter: 0.32,
  clipPlanes: 6,
  clipMin: 0.55,
  clipVariation: 0.3,
  faceVariation: 0.22,
  stainAmount: 0.22,
  sedimentAmount: 0.06,
} as const;

/**
 * Per-chimney variation for the plain Beebe chimneys 2-3, which share the hero's crusted
 * flange profile but differ in height, lean, flange count and flute count so no two match.
 */
export const BEEBE_SIDE_CHIMNEYS: Record<
  string,
  {
    heightScale: number;
    widthScale: number;
    /** Lean from vertical (rad) and its compass direction (rad). */
    lean: number;
    leanDir: number;
    flanges: number;
    ridges: number;
    crust: number;
  }
> = {
  'beebe-chimney-2': {
    heightScale: 1.18,
    widthScale: 1.05,
    lean: 0.06,
    leanDir: 0.8,
    flanges: 4,
    ridges: 4,
    crust: 0.9,
  },
  'beebe-chimney-3': {
    heightScale: 0.9,
    widthScale: 1.25,
    lean: 0.09,
    leanDir: 3.6,
    flanges: 2,
    ridges: 6,
    crust: 1.1,
  },
};
