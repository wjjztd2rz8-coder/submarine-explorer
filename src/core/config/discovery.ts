/**
 * Free-dive landmarks and the B1 scan / discovery loop (docs/discovery.md).
 * Split out of `core/Config.ts` (F0-CORE); import from `core/Config.js`.
 */

/**
 * Free-dive landmark markers (src/world/Landmarks.ts). Deliberately quiet
 * (art-direction pillar 3, "found, not signposted"): a small depth-tested dot and
 * a fixed-pixel-size label that both fade out as you arrive. Hidden entirely
 * while a mission route is active -- the POI reticle and objectives do that job.
 */
export interface LandmarksConfig {
  /** Metres the marker sits above the landmark's depth / the seabed. */
  markerLiftM: number;
  /** Marker dot radius, metres. */
  markerRadiusM: number;
  markerColor: number;
  markerOpacity: number;
  /** The dot is invisible inside `[0]` m of the camera and fully shown beyond `[1]` m. */
  markerFadeM: [number, number];
  /** On-screen label height in CSS pixels, independent of distance. */
  labelHeightPx: number;
  /** Names longer than this are cut and end in an ellipsis. */
  labelMaxChars: number;
  labelColor: string;
  labelBackground: string;
  /** The label is invisible inside `[0]` m and fully shown beyond `[1]` m. */
  labelFadeM: [number, number];
}

// --- B1: scan & discovery (docs/discovery.md) ------------------------------
export interface ScanConfig {
  /** Seconds of continuous beam time to scan a POI that has no `scan_seconds`. */
  defaultSeconds: number;
  /** Scan radius (m) for a POI that has no `radius_m`. */
  defaultRadiusM: number;
  /**
   * Half-angle of the scan beam, degrees: the angle between `sub.getForward()`
   * and the sub->POI direction must be below this. Generous, because POIs sit
   * on the seabed below the boat and pitch is limited to 45 deg.
   */
  coneHalfAngleDeg: number;
  /** Inside this 3D distance (m) the facing test is waived: you are on top of it. */
  closeRangeM: number;
  /** Progress fraction (0..1) lost per second while a scan is interrupted. */
  decayPerSecond: number;
  /** Upper bound on `scan:progress` emissions per second. */
  progressEventHz: number;
  /** The overlay shows a contact hint from `radius_m * hintRangeFactor` away. */
  hintRangeFactor: number;
  /** Diameter (CSS px) and stroke (CSS px) of the scan progress ring. */
  ringSizePx: number;
  ringStrokePx: number;
  /** Size (CSS px) of the corner-bracket reticle drawn over the target. */
  reticleSizePx: number;
  /** How long the "NEW ENTRY" confirmation stays up, seconds. */
  completeBannerSeconds: number;
  /** `?poi=` debug spawn: horizontal distance from the POI (m), capped to 80% of its radius. */
  spawnDistanceM: number;
  /** `?poi=` debug spawn: compass bearing FROM the POI to the spawn point, degrees. */
  spawnBearingDeg: number;
  /** Extra metres above the sub's own seabed floor when the spawn is clamped. */
  spawnClearanceM: number;
  /** SessionStats ignores a per-frame move longer than this (a teleport/reset). */
  teleportThresholdM: number;
  /** `?debrief=1`: open the debrief this many ms after boot (e2e screenshot hook). */
  debugDebriefDelayMs: number;
}

export const DEFAULT_LANDMARKS: LandmarksConfig = {
  markerLiftM: 12,
  markerRadiusM: 2,
  markerColor: 0x2ed9d9, // HUD cyan: navigation, not treasure
  markerOpacity: 0.85,
  markerFadeM: [150, 300],
  labelHeightPx: 14,
  labelMaxChars: 28,
  labelColor: '#2ed9d9',
  labelBackground: 'rgba(6, 14, 18, 0.55)',
  labelFadeM: [250, 500],
};

// B1: scan & discovery. See docs/discovery.md.
export const DEFAULT_SCAN: ScanConfig = {
  defaultSeconds: 4, // the master plan's "hold the beam 3-5 s"
  defaultRadiusM: 150,
  coneHalfAngleDeg: 35,
  closeRangeM: 25,
  decayPerSecond: 0.35, // a full ring drains in ~3 s, so a brief wobble is forgiven
  progressEventHz: 10,
  hintRangeFactor: 3,
  ringSizePx: 76,
  ringStrokePx: 2,
  reticleSizePx: 44,
  completeBannerSeconds: 6,
  spawnDistanceM: 80,
  spawnBearingDeg: 180, // spawn south of the POI, looking north at it
  spawnClearanceM: 16, // ~28 m altitude: clear of the HUD's 20 m proximity warning
  teleportThresholdM: 250,
  debugDebriefDelayMs: 3000,
};
