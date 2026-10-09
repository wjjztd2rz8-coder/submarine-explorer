/** Environment-independent guidance tuning, shared by the game and Node-based tests. */
export const FIRST_MINUTE_GUIDANCE = {
  lifetimeMs: 12_000,
  fadeMs: 250,
  axisMin: 0.2,
  moveDistanceM: 0.5,
  turnRadians: Math.PI / 90,
  hullHintAfterS: 20,
  hullHintDescentM: 10,
} as const;
