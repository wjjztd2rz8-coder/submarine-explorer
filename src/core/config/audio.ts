/**
 * Procedural audio mix and cues (docs/audio.md).
 * Split out of `core/Config.ts` (F0-CORE); import from `core/Config.js`.
 */

export interface AudioConfig {
  /** Overall output gain, 0..1 (applied at the WebAudio master gain node). */
  masterVolume: number;
  /**
   * Shared depth low-pass filter (master -> depthFilter -> destination): the
   * whole mix gets muffled as the sub goes deeper, like sound through water
   * and hull.
   */
  depthLowpassSurfaceHz: number;
  /** Cutoff once depth reaches {@link lowpassFullAt} (heavily muffled). */
  depthLowpassAbyssHz: number;
  /** Depth (negative metres) at which the low-pass reaches its minimum cutoff. */
  lowpassFullAt: number;
  /** Speed of sound in seawater, m/s (real-world value, used for echo timing). */
  sonarSpeedOfSoundMps: number;
  /** Sonar ray-march: max range considered and step size, metres. */
  sonarMaxRangeM: number;
  sonarRayStepM: number;
  /** Depression of the forward sonar beam below horizontal, degrees. */
  sonarBeamDownDeg: number;
  /**
   * Ambient bed layers, shallowest first (band[0].depth should be 0). Each is
   * a sine drone + filtered noise, crossfaded by depth -- see
   * src/audio/DepthBands.ts and docs/audio.md.
   */
  ambientBands: Array<{ depth: number; droneHz: number; noiseMix: number }>;
  /** Thruster loop pitch at zero / full throttle, Hz. */
  thrusterMinHz: number;
  thrusterMaxHz: number;
  /**
   * Hull-creak repeat rate, driven by `sub:hullStress` (cause: "pressure").
   * Gap shrinks from `hullCreakMaxGapS` at stress 0 to `hullCreakMinGapS` at
   * stress 1, so creaks accelerate as the hull nears crush depth.
   */
  hullCreakMinGapS: number;
  hullCreakMaxGapS: number;
  /** Collision-thud loudness gained per m/s of impact speed (sub:collided). */
  collisionThudGainPerMps: number;
}

export const DEFAULT_AUDIO: AudioConfig = {
  masterVolume: 0.6,
  depthLowpassSurfaceHz: 18000,
  depthLowpassAbyssHz: 350,
  lowpassFullAt: -1000,
  sonarSpeedOfSoundMps: 1500,
  sonarMaxRangeM: 2000,
  sonarRayStepM: 10,
  sonarBeamDownDeg: 15,
  // Mirrors the depth-band feel described in docs/atmosphere.md / the master
  // plan (bright near-surface -> near-black by 1,000 m): lower drone pitch
  // and more noise the deeper the band.
  ambientBands: [
    { depth: 0, droneHz: 90, noiseMix: 0.15 },
    { depth: -20, droneHz: 70, noiseMix: 0.25 },
    { depth: -200, droneHz: 55, noiseMix: 0.4 },
    { depth: -1000, droneHz: 40, noiseMix: 0.6 },
  ],
  thrusterMinHz: 55,
  thrusterMaxHz: 140,
  hullCreakMinGapS: 0.5,
  hullCreakMaxGapS: 2.5,
  collisionThudGainPerMps: 0.05,
};
