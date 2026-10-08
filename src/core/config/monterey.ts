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
    { species: 'sablefish', offset: [18, 0, 12], low: 3, count: 4 },
    { species: 'sea-pen', offset: [34, 0, 6], low: 5, count: 9 },
  ],
} as const;
