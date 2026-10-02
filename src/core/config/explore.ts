/** Curiosity stays local: nothing becomes a distant waypoint. */
export const EXPLORE_CONFIG = {
  contactRangeM: 110,
  secretScanRangeM: 45,
  sampleRangeM: 22,
  secretSeconds: 3,
  sampleSeconds: 2.5,
  propCullM: 220,
  eventCooldownS: 100,
  eventWaitS: [70, 160] as const,
  eventDurationS: 9,
  eventWitnessM: 100,
  eventFloorClearanceM: 6,
  shallowDepthM: 180,
  eventParticleCount: { low: 100, medium: 180, high: 280, ultra: 360 },
} as const;
