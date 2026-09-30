/**
 * Mission flow timings (docs/missions.md).
 * Split out of `core/Config.ts` (F0-CORE); import from `core/Config.js`.
 */

/** B3: mission flow (docs/missions.md). */
export interface MissionConfig {
  /**
   * Sim-speed multiplier a mission starts at (must be one of
   * `submarine.simSpeeds`). The Titanic descent is 3.8 km at ~5.4 m/s
   * terminal ballast speed, so at 1x the descent alone is ~12 min.
   */
  defaultSimSpeed: number;
  /**
   * Seconds between the scan that completes the primaries and the "Primary
   * objectives complete" banner (D-FLOW), so the scan's NEW ENTRY card lands
   * first. Nothing ends the dive automatically any more.
   */
  completeDelayS: number;
  /** D-FLOW: real seconds the completion banner stays up before "Keep exploring" applies. */
  completionBannerS: number;
  /** Minimum spawn clearance above the seabed, on top of hull radius + seabedClearance (m). */
  spawnClearanceM: number;
  /** Objectives-panel nav line refresh rate (Hz). Text writes are skipped when unchanged. */
  navUpdateHz: number;

  // --- fix S (QA-B #3) -------------------------------------------------------
  /**
   * Free dive: if the tile centre's seabed is shallower than this (negative
   * metres), spawn over the nearest grid cell at least this deep instead.
   */
  minSpawnSeabedM: number;
  /** Free-dive spawn altitude above the seabed without `?depth=` (m). */
  freeDiveSpawnAltitudeM: number;
}

// B3: mission flow. See docs/missions.md for the timeline these produce.
export const DEFAULT_MISSION: MissionConfig = {
  defaultSimSpeed: 3, // keeps the Titanic descent under 4 min real time
  completeDelayS: 3, // let the scan's "NEW ENTRY" banner land before the completion banner
  completionBannerS: 20, // D-FLOW: then Keep exploring (the default) applies
  spawnClearanceM: 10,
  navUpdateHz: 5,
  minSpawnSeabedM: -60,
  freeDiveSpawnAltitudeM: 90,
};
