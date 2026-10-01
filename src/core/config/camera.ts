/**
 * Chase / first-person / orbit camera rig.
 * Split out of `core/Config.ts` (F0-CORE); import from `core/Config.js`.
 */

export interface CameraConfig {
  /** Chase offset in the sub's local frame (x right, y up, z back). */
  chaseOffset: { x: number; y: number; z: number };
  /** Bank-follow smoothing half-life in seconds. Pointer motion stays direct. */
  rotationHalfLife: number;
  fovDeg: number;
  near: number;
  far: number;
  /** Eye offset used in first-person mode. */
  firstPersonOffset: { x: number; y: number; z: number };
  /**
   * Metres the chase camera aims above the boat's forward axis, placing the
   * hull in the lower third while leaving the site ahead in view.
   */
  chaseLookRise: number;
  /** Time to bring the free-look aim from chase framing onto the hull. */
  freeLookAimSeconds: number;

  // --- A3: rig -------------------------------------------------------------
  /**
   * Distance ahead of the boat the camera aims, per mode. Longer look-ahead in
   * first person reads as "looking where you are going" rather than at the bow.
   */
  chaseLookAhead: number;
  firstPersonLookAhead: number;
  /**
   * Extra look-ahead metres per m/s of speed. Pulls the aim point forward when
   * you are moving fast, which is what makes speed legible in fog.
   */
  lookAheadPerSpeed: number;
  /** Metres the camera is kept above the seabed; it never clips through. */
  terrainClearance: number;
  /** Metres below sea level reserved for an underwater camera. */
  surfaceClearance: number;
  /** Fraction of the boat's visual roll the chase camera copies. */
  bankFollow: number;
  /** Photo-mode free orbit: radius and starting elevation (radians). */
  orbitRadius: number;
  orbitElevation: number;
}

export const DEFAULT_CAMERA: CameraConfig = {
  chaseOffset: { x: 0, y: 38, z: 90 },
  rotationHalfLife: 0.12,
  fovDeg: 62,
  near: 0.5,
  far: 60000,
  firstPersonOffset: { x: 0, y: 4, z: -12 },
  chaseLookRise: 15,
  freeLookAimSeconds: 0.2,

  chaseLookAhead: 80,
  firstPersonLookAhead: 300,
  lookAheadPerSpeed: 12,
  terrainClearance: 6,
  surfaceClearance: 2,
  bankFollow: 0.55,
  orbitRadius: 90,
  orbitElevation: 0.35,
};
