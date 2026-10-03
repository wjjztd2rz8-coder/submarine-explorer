/**
 * Procedural audio mix and cues (docs/audio.md).
 * Split out of `core/Config.ts` (F0-CORE); import from `core/Config.js`.
 */

export interface AudioConfig {
  /** Overall output gain, 0..1 (applied at the WebAudio master gain node). */
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  /** Final mix sample ceiling after compression, below digital full scale. */
  outputCeiling: number;
  mixCompression: {
    thresholdDb: number;
    kneeDb: number;
    ratio: number;
    attackS: number;
    releaseS: number;
  };
  scoreBands: Array<{ name: string; depth: number; notes: number[] }>;
  scoreGain: number;
  scoreFadeS: number;
  discoveryDecayS: number;
  tensionStartsAtRatio: number;
  spatialRangeM: number;
  wildlifeGapS: number;
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
  musicVolume: 0.5,
  sfxVolume: 0.8,
  outputCeiling: 0.95,
  mixCompression: { thresholdDb: -6, kneeDb: 6, ratio: 20, attackS: 0.003, releaseS: 0.15 },
  scoreBands: [
    { name: 'sunlit', depth: 0, notes: [130.81, 196, 261.63] },
    { name: 'twilight', depth: -200, notes: [98, 146.83, 220] },
    { name: 'midnight', depth: -1000, notes: [65.41, 98, 146.83] },
    { name: 'abyssal', depth: -4000, notes: [49, 73.42, 110] },
    { name: 'hadal', depth: -6000, notes: [36.71, 55, 82.41] },
  ],
  scoreGain: 0.055,
  scoreFadeS: 4,
  discoveryDecayS: 9,
  tensionStartsAtRatio: 0.8,
  spatialRangeM: 240,
  wildlifeGapS: 90,
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
