/** Every pilot carries the complete kit; mission depth determines the fitted hull. */
export const PROGRESS_CONFIG = {
  hulls: [
    { id: 'A', depthM: 1000 },
    { id: 'B', depthM: 6500 },
    { id: 'C', depthM: 11000 },
  ],
  boostSeconds: 12.8,
  boostRecoveryPerSecond: 0.5,
} as const;

/** Former fully equipped values, shared by every save and mode. */
export const EQUIPMENT = {
  lightRange: 1.3,
  beamDegrees: 8,
  sonarRange: 1.45,
  scanDetail: 1.2,
  battery: 1.36,
  oxygen: 1.24,
  boostEfficiency: 1.6,
  thrust: 1.24,
  turn: 1.16,
  reverse: 1.2,
} as const;
