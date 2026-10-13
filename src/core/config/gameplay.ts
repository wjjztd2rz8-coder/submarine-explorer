/**
 * Gameplay option profiles (speed, descent, lights, sensors), power and currents.
 * Split out of `core/Config.ts` (F0-CORE); import from `core/Config.js`.
 */

import type { SubmarineConfig } from './submarine.js';

/** D-CURRENTS: controls for the attributed offline water field. */
export interface CurrentsConfig {
  /** Fraction of the full field used by the Gentle setting. */
  gentleScale: number;
  /** The HUD hides flows below this speed (m/s). */
  hudMinMps: number;
  /** Predictive interval for guarding current impulses against terrain. */
  terrainLookaheadS: number;
  /** Reserve this much clearance above the hull's physics floor. */
  terrainGuardM: number;
}

export interface GameplayOptions {
  speedProfile: 'research' | 'standard' | 'fast';
  lights: 'realistic' | 'enhanced';
  sensors: 'realistic' | 'extended';
  /** In-world waypoint marker, edge arrow and in-range cue ("Visual waypoints"). */
  visualHints: boolean;
  /** POI / objective / scanned icons on the sonar display (terrain relief always shows). */
  sonarMarkers: boolean;
  startPosition: 'near-site' | 'surface';
  batteryOxygen: boolean;
  currents: 'off' | 'gentle' | 'realistic' | 'exaggerated';
  descentProfile: 'research' | 'standard' | 'fast';
  simSpeed: 1 | 2 | 3;
}

export type SpeedProfile = Pick<
  SubmarineConfig,
  | 'thrustAccel'
  | 'boostMultiplier'
  | 'dragLinear'
  | 'dragQuadratic'
  | 'yawRate'
  | 'reverseAccel'
  | 'maxSpeed'
> & { cruiseSpeed: number; cameraLookAheadPerSpeed: number };
export type DescentProfile = Pick<
  SubmarineConfig,
  'ballastAccel' | 'maxVerticalSpeed' | 'ballastHalfLife'
>;
export interface LightPreset {
  intensity: number;
  distance: number;
  angleDeg: number;
  coneOpacity: number;
  fillIntensity: number;
  fillDistance: number;
}
export interface SensorPreset {
  scanRadiusMultiplier: number;
  hintRangeMultiplier: number;
  sonarPoiRange: number;
}

/** Supply rates are fractions of a full tank per simulated second. */
export interface PowerConfig {
  batteryIdleHours: number;
  batteryThrustHours: number;
  batteryLightsHours: number;
  batterySensorsHours: number;
  oxygenHours: number;
  boostCostMultiplier: number;
  lowThreshold: number;
  criticalThreshold: number;
}

export const DEFAULT_SPEED_PROFILES: Record<GameplayOptions['speedProfile'], SpeedProfile> = {
  research: {
    cruiseSpeed: 1,
    maxSpeed: 1.4,
    thrustAccel: 0.25,
    boostMultiplier: 1.8,
    dragLinear: 0.05,
    dragQuadratic: 0.2,
    yawRate: 0.55,
    reverseAccel: 0.14,
    cameraLookAheadPerSpeed: 12,
  },
  standard: {
    cruiseSpeed: 4,
    maxSpeed: 6.8,
    thrustAccel: 1.6,
    boostMultiplier: 2.8,
    dragLinear: 0.08,
    dragQuadratic: 0.08,
    yawRate: 0.4,
    reverseAccel: 0.75,
    cameraLookAheadPerSpeed: 8,
  },
  fast: {
    cruiseSpeed: 12,
    maxSpeed: 20.6,
    thrustAccel: 3,
    boostMultiplier: 2.7,
    dragLinear: 0.05,
    dragQuadratic: 0.0165,
    yawRate: 0.45,
    reverseAccel: 1.4,
    cameraLookAheadPerSpeed: 4,
  },
};

export const DEFAULT_DESCENT_PROFILES: Record<GameplayOptions['descentProfile'], DescentProfile> = {
  research: { ballastAccel: 0.18, maxVerticalSpeed: 0.5, ballastHalfLife: 0.7 },
  standard: { ballastAccel: 1.2, maxVerticalSpeed: 2.5, ballastHalfLife: 0.5 },
  fast: { ballastAccel: 3, maxVerticalSpeed: 8, ballastHalfLife: 0.35 },
};

export const DEFAULT_LIGHT_PRESETS: Record<GameplayOptions['lights'], LightPreset> = {
  realistic: {
    intensity: 500,
    distance: 2000,
    angleDeg: 32,
    coneOpacity: 0.008,
    fillIntensity: 12,
    fillDistance: 80,
  },
  enhanced: {
    intensity: 750,
    distance: 2500,
    angleDeg: 36,
    coneOpacity: 0.012,
    fillIntensity: 50,
    fillDistance: 220,
  },
};

export const DEFAULT_SENSOR_PRESETS: Record<GameplayOptions['sensors'], SensorPreset> = {
  realistic: { scanRadiusMultiplier: 1, hintRangeMultiplier: 1, sonarPoiRange: 500 },
  extended: { scanRadiusMultiplier: 2, hintRangeMultiplier: 2, sonarPoiRange: 2000 },
};

// --- D-POWER: normal research dives last roughly 6–10 simulated hours. ---
export const DEFAULT_POWER: PowerConfig = {
  batteryIdleHours: 18,
  batteryThrustHours: 12,
  batteryLightsHours: 22,
  batterySensorsHours: 24,
  oxygenHours: 10,
  boostCostMultiplier: 2.5,
  lowThreshold: 0.25,
  criticalThreshold: 0.1,
};

// --- D-CURRENTS: the full field is the archived HYCOM sample. ---
export const DEFAULT_CURRENTS: CurrentsConfig = {
  gentleScale: 0.35,
  hudMinMps: 0.001,
  terrainLookaheadS: 0.5,
  terrainGuardM: 1,
};
