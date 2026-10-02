/**
 * Environment presets by landmark type (docs/presets.md).
 * Split out of `core/Config.ts` (F0-CORE); import from `core/Config.js`.
 */

import type { GraphicsTier } from './quality.js';

// --- C3: environment presets (docs/presets.md) ------------------------------
/** Environment preset names (plan/PHASE-C-CONTRACTS.md §1). */
export type EnvPresetName =
  'vent' | 'brine' | 'canyon' | 'reef' | 'trench' | 'wreck' | 'seamount' | 'default';

/** A preset tunable: what `mission.json` `environment.overrides` may set. */
export type PresetParamValue = number | string | boolean | null;

/** Vent field: chimney smoke, shimmer, warm glow, upwelling. */
export interface VentPresetConfig {
  /** `sulfide` (black smoker, dark grey smoke) or `carbonate` (Lost City: pale, faint). */
  fluid: string;
  /** 0..1 scales particle count per chimney and smoke opacity. */
  smokeIntensity: number;
  /** Particle budget at intensity 1 on the high tier (hard cap 20k). */
  smokeParticles: number;
  /** Max chimneys (props or vent POIs) that smoke. */
  maxSources: number;
  /** Plume rise speed at the orifice (m/s) and total rise before fading (m). */
  riseMps: number;
  riseHeightM: number;
  /** Plume spread radius at the top of the rise (m). */
  spreadM: number;
  /** Particle sprite size (m) at birth / end of life. */
  sizeStartM: number;
  sizeEndM: number;
  smokeColorSulfide: number;
  smokeColorCarbonate: number;
  smokeOpacitySulfide: number;
  smokeOpacityCarbonate: number;
  /** Warm glow point lights at the tallest chimneys (0..3). */
  glowLights: number;
  glowColor: number;
  /** Candela; decay 2, so ~glowIntensity/d^2 at d metres. */
  glowIntensity: number;
  glowDistanceM: number;
  /** Carbonate (Lost City) fluid is ~40-90 C, far cooler than a black smoker: glow x this. */
  glowCarbonateScale: number;
  /** Extra ambient light intensity added near the field (0 = none): keeps the seabed readable. */
  ambientFill: number;
  /** Shimmer (luminance wobble sprite over each orifice): amplitude and size (m). */
  shimmerStrength: number;
  shimmerSizeM: number;
  /** Upwelling above chimneys: speed at the orifice (m/s), radius and height of the column (m). */
  upwellMps: number;
  upwellRadiusM: number;
  upwellHeightM: number;
}

/** Brine pool: a mirror-like layer at a fixed depth with mist above it. */
export interface BrinePresetConfig {
  /** Positive depth of the brine surface (m); 0 = auto (seabed under the spawn + `autoLiftM`). */
  poolDepthM: number;
  /** Pool centre; null = the spawn position. */
  poolLat: number | null;
  poolLon: number | null;
  poolRadiusM: number;
  /** Auto pool: the lowest seabed within this radius of the spawn, filled `autoLiftM` deep. */
  autoSearchRadiusM: number;
  autoLiftM: number;
  poolColor: number;
  sheenColor: number;
  /** 0..1 opacity of the layer seen from above / below. */
  opacityAbove: number;
  opacityBelow: number;
  rippleScaleM: number;
  rippleSpeed: number;
  /** Mist: particle budget, layer thickness above the brine (m), opacity. */
  mistParticles: number;
  mistHeightM: number;
  mistOpacity: number;
  mistColor: number;
  /** Below the layer: fog density multiplier and ambient multiplier. */
  underFogScale: number;
  underAmbientScale: number;
}

/** Submarine canyon: down-canyon current and sediment plumes. */
export interface CanyonPresetConfig {
  /** Compass bearing the current flows TOWARD (deg); null = follow the terrain down-slope only. */
  currentDirDeg: number | null;
  currentSpeedMps: number;
  /** 0..1 how strongly the local down-slope bends the current. */
  slopeBias: number;
  /** Extra speed fraction in the canyon axis (confined channel): speed x (1 + axisGain x confinement). */
  axisGain: number;
  /** Ring radius (m) and relief (m) used to measure channel confinement. */
  confinementRadiusM: number;
  confinementReliefM: number;
  /** Current is full strength within this altitude above the seabed, fading to `aloftFraction` at 3x. */
  boundaryLayerM: number;
  aloftFraction: number;
  /** Sediment plumes: concurrent plumes, particles each, lifetime (s), spawn radius around the sub (m). */
  plumes: number;
  plumeParticles: number;
  plumeLifeS: number;
  plumeSpawnRadiusM: number;
  plumeSpreadM: number;
  plumeSizeM: number;
  plumeOpacity: number;
  plumeColor: number;
}

/** Shallow reef: light shafts, warmer brighter ambient, stronger caustics. */
export interface ReefPresetConfig {
  shafts: number;
  /** Shafts only draw while the camera is shallower than this (positive m). */
  shaftMaxDepthM: number;
  shaftLengthM: number;
  shaftWidthM: number;
  /** Shafts are scattered in a box of this edge around the camera (m). */
  shaftFieldM: number;
  shaftOpacity: number;
  shaftColor: number;
  ambientScale: number;
  /** 0..1 lerp of the ambient colour toward `warmColor`. */
  ambientWarmth: number;
  warmColor: number;
  causticsScale: number;
}

/** Hadal trench: darker than the abyss band, sparser snow, pressure ambience events. */
export interface TrenchPresetConfig {
  fogScale: number;
  /** 0..1 lerp of the fog colour toward black. */
  fogDarken: number;
  ambientScale: number;
  snowScale: number;
  vignetteAdd: number;
  /** `env:trench` interval (s) at the shallowest / deepest end of the trench. */
  creakMaxGapS: number;
  creakMinGapS: number;
  /** Depth (positive m) at which the interval reaches `creakMinGapS`. */
  creakFullDepthM: number;
}

/** Wreck site: seabed sediment haze, rust motes near hulls, a touch more vignette. */
export interface WreckPresetConfig {
  hazeParticles: number;
  /** Haze box edge around the camera (m) and band height above the seabed (m). */
  hazeBoxM: number;
  hazeBandM: number;
  hazeSizeM: number;
  hazeOpacity: number;
  hazeColor: number;
  hazeDriftMps: number;
  motesPerHull: number;
  maxHulls: number;
  moteSizeM: number;
  moteOpacity: number;
  moteColor: number;
  vignetteAdd: number;
  /** Extra ambient light intensity (0 = none) so the seabed near the wreck never reads black. */
  ambientFill: number;
}

/** Seamount: the default look, plus sparse vent glow when a `vent` POI exists. */
export interface SeamountPresetConfig {
  glowLights: number;
  glowColor: number;
  glowIntensity: number;
  glowDistanceM: number;
  /** Lights sit this far above the vent POI (m). */
  glowLiftM: number;
}

export interface PresetsConfig {
  /** Hard cap on the total current applied to the sub (m/s). */
  maxCurrentMps: number;
  /** Rate (1/s) at which the sub's velocity is pulled toward the current. */
  currentCouplingPerS: number;
  /** `env:current` is re-emitted when direction/speed change by more than this, at most every N s. */
  currentEventDirDeg: number;
  currentEventSpeedMps: number;
  currentEventMinIntervalS: number;
  /** Currents are physics, not rendering: keep them on the low tier (visuals are always off there). */
  lowTierCurrents: boolean;
  /** Particle budget multiplier per graphics tier (low is always 0: presets draw nothing). */
  tierParticleScale: Record<GraphicsTier, number>;
  /** Hard per-preset particle cap. */
  maxParticles: number;
  /** Particles are lit ~ ambient + headlightGain x exp(-distance to sub / headlightFalloffM). */
  particleAmbient: number;
  particleHeadlightGain: number;
  particleHeadlightFalloffM: number;
  vent: VentPresetConfig;
  brine: BrinePresetConfig;
  canyon: CanyonPresetConfig;
  reef: ReefPresetConfig;
  trench: TrenchPresetConfig;
  wreck: WreckPresetConfig;
  seamount: SeamountPresetConfig;
}

// C3: environment presets. See docs/presets.md for what each key does.
export const DEFAULT_PRESETS: PresetsConfig = {
  maxCurrentMps: 0.8,
  currentCouplingPerS: 0.5,
  currentEventDirDeg: 10,
  currentEventSpeedMps: 0.005,
  currentEventMinIntervalS: 1,
  lowTierCurrents: true,
  tierParticleScale: { low: 0, medium: 0.5, high: 1, ultra: 1 },
  maxParticles: 20000,
  particleAmbient: 0.12,
  particleHeadlightGain: 1.6,
  particleHeadlightFalloffM: 90,
  vent: {
    fluid: 'sulfide',
    smokeIntensity: 1,
    smokeParticles: 12000,
    maxSources: 12,
    riseMps: 1.2,
    riseHeightM: 70,
    spreadM: 14,
    sizeStartM: 1.6,
    sizeEndM: 4.6,
    smokeColorSulfide: 0x2b2a28,
    smokeColorCarbonate: 0xd6ddd8,
    smokeOpacitySulfide: 0.55,
    smokeOpacityCarbonate: 0.16,
    glowLights: 2,
    glowColor: 0xff9a4a,
    glowIntensity: 260,
    glowDistanceM: 60,
    glowCarbonateScale: 0.35,
    ambientFill: 0,
    shimmerStrength: 0.08,
    shimmerSizeM: 9,
    upwellMps: 0.35,
    upwellRadiusM: 18,
    upwellHeightM: 120,
  },
  brine: {
    poolDepthM: 0,
    poolLat: null,
    poolLon: null,
    poolRadiusM: 260,
    autoSearchRadiusM: 200,
    autoLiftM: 6,
    poolColor: 0x0b2630,
    sheenColor: 0x9fc6d2,
    opacityAbove: 0.78,
    opacityBelow: 0.55,
    rippleScaleM: 9,
    rippleSpeed: 0.25,
    mistParticles: 6000,
    mistHeightM: 5,
    mistOpacity: 0.22,
    mistColor: 0xa9c4c9,
    underFogScale: 2.5,
    underAmbientScale: 0.5,
  },
  canyon: {
    currentDirDeg: null,
    currentSpeedMps: 0.35,
    slopeBias: 0.7,
    axisGain: 0.8,
    confinementRadiusM: 400,
    confinementReliefM: 120,
    boundaryLayerM: 60,
    aloftFraction: 0.35,
    plumes: 6,
    plumeParticles: 900,
    plumeLifeS: 26,
    plumeSpawnRadiusM: 220,
    plumeSpreadM: 26,
    plumeSizeM: 3.2,
    plumeOpacity: 0.3,
    plumeColor: 0x8a7d68,
  },
  reef: {
    shafts: 14,
    shaftMaxDepthM: 60,
    shaftLengthM: 90,
    shaftWidthM: 9,
    shaftFieldM: 320,
    shaftOpacity: 0.07,
    shaftColor: 0xfff1cc,
    ambientScale: 1.25,
    ambientWarmth: 0.18,
    warmColor: 0xffe9b8,
    causticsScale: 1.5,
  },
  trench: {
    fogScale: 1.5,
    fogDarken: 0.45,
    ambientScale: 0.55,
    snowScale: 0.4,
    vignetteAdd: 0.1,
    creakMaxGapS: 14,
    creakMinGapS: 5,
    creakFullDepthM: 10900,
  },
  wreck: {
    hazeParticles: 9000,
    hazeBoxM: 220,
    hazeBandM: 30,
    hazeSizeM: 1.1,
    hazeOpacity: 0.22,
    hazeColor: 0x8c8170,
    hazeDriftMps: 0.06,
    motesPerHull: 700,
    maxHulls: 6,
    moteSizeM: 0.35,
    moteOpacity: 0.5,
    moteColor: 0x8a4a2c,
    vignetteAdd: 0.06,
    ambientFill: 0,
  },
  seamount: {
    glowLights: 2,
    glowColor: 0xff9a4a,
    glowIntensity: 160,
    glowDistanceM: 50,
    glowLiftM: 6,
  },
};
