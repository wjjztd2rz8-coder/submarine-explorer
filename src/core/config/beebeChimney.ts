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
  /** Divides rubble's vertex colour: its instance tint is brighter than boulders and pillows. */
  rubbleDarken: 1.3,
} as const;
