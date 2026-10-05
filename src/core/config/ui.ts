/**
 * Settings screen, sonar minimap and globe UI tunables (docs/settings.md, docs/globe.md).
 * Split out of `core/Config.ts` (F0-CORE); import from `core/Config.js`.
 */

import { publicUrl } from '../../util/publicUrl.js';
import type { GameplayOptions } from './gameplay.js';

/** Opening guidance leaves the view after movement or a short reading window. */
export const FIRST_MINUTE_GUIDANCE = {
  lifetimeMs: 12_000,
  fadeMs: 250,
  axisMin: 0.2,
  moveDistanceM: 0.5,
  turnRadians: Math.PI / 90,
} as const;

/** C1: globe mission select overlay (docs/globe.md). Distances in globe radii. */
export interface GlobeConfig {
  /** Equirectangular Earth texture (public/assets/globe, ATTRIBUTION.md). */
  textureUrl: string;
  /** Camera distance from the globe centre, in globe radii. */
  minDistance: number;
  maxDistance: number;
  startDistance: number;
  fovDeg: number;
  /** Drag sensitivity at `startDistance`; scales with altitude. */
  dragDegPerPx: number;
  /** Exponential decay rate (1/s) of the released-drag spin. */
  inertiaDamping: number;
  /** Cap on the released-drag spin (deg/s), so a flick cannot whirl the globe. */
  maxFlingDegPerS: number;
  /** A pointer held still this long (s) before release does not fling at all. */
  flingStaleS: number;
  autoRotateDegPerS: number;
  /** Seconds without interaction before auto-rotate starts. */
  idleBeforeAutoRotateS: number;
  /** Arrow-key orbit speed at `startDistance` (deg/s). */
  keyRotateDegPerS: number;
  /** Altitude factor per +/- key press (zoom in divides by it). */
  keyZoomFactor: number;
  /** Altitude factor per wheel pixel: factor = exp(deltaY * wheelZoomPerPx). */
  wheelZoomPerPx: number;
  maxLatDeg: number;
  /** Rate (1/s) of the eased turn toward a focused pin. */
  focusLerpPerS: number;
  /** Pins closer than this on screen (CSS px) are fanned out on a ring. */
  pinOverlapPx: number;
  /** Pins this close to the horizon (dot of normal and view, 0..1) fade out. */
  pinHorizonFade: number;
  /** Land albedo multiplier and saturation (ocean-forward styling). */
  landDim: number;
  landSaturation: number;
  /** Ocean brightness multiplier. */
  oceanGain: number;
  /** Graticule spacing (deg) and opacity; opacity 0 hides it. */
  graticuleDeg: number;
  graticuleOpacity: number;
  /** Hex colours: graticule/atmosphere accent (the HUD cyan). */
  accentColor: number;
  atmosphereStrength: number;
  /** Atmosphere shell radius (globe radii). */
  atmosphereScale: number;
  maxPixelRatio: number;
}

// --- C5: settings, save, accessibility (docs/settings.md) ---
/** Sonar minimap colour schemes (`Sonar.setPalette`). */
export type SonarPaletteName = 'default' | 'deuteranopia' | 'highContrast';

export interface SonarPalette {
  /** Shown in the settings screen. */
  label: string;
  /**
   * Colour stops `[at, r, g, b]`, `at` ascending in 0..1, channels 0..255.
   * Local deep = 0 and local shallow = 1; luminance rises with `at` so depth
   * ordering reads without hue (pinned by tests/unit/settingsPalette.test.ts).
   */
  stops: Array<[number, number, number, number]>;
  /** Landmark blip fill, and an optional outline (null = none). */
  blip: string;
  blipOutline: string | null;
  /** The sub's triangle fill and optional outline. */
  sub: string;
  subOutline: string | null;
  /** Breadcrumb trail stroke and the map frame. */
  trail: string;
  frame: string;
}

/** Long-axis map span in metres; `tile` fits the complete survey. */
export type SonarZoom = 250 | 500 | 1000 | 2000 | 'tile';

export interface SonarZoomConfig {
  levels: SonarZoom[];
  initial: SonarZoom;
  minReliefSpanM: Record<SonarZoom, number>;
  contourIntervalM: Record<SonarZoom, number>;
  rasterMarginPx: number;
  refreshShiftPx: number;
  hillshadeGain: number;
  maxContours: number;
}

export interface SettingsConfig {
  /**
   * Defaults for the settings that have no older home in Config. The graphics
   * tier and detail strength default to `graphicsTier` and
   * `terrain.detailStrength`, so those stay the single source of truth.
   */
  defaults: {
    postFx: boolean;
    /** 0 = auto (free dive at 1x, missions at `mission.defaultSimSpeed`). */
    simSpeedDefault: number;
    reduceMotion: boolean;
    captions: boolean;
    sonarPalette: SonarPaletteName;
  };
  /** Choices offered for the default sim speed; 0 is "auto". */
  simSpeedOptions: number[];
  /** Terrain detail slider range (0 = survey only, pure data). */
  detailStrengthMax: number;
  detailStrengthStep: number;
  /** Caption overlay: at most this many lines at once. */
  captionMaxLines: number;
  /** A caption stays up at least this long, even if its cue is shorter (readability). */
  captionMinDurationS: number;
  gameplayPresets: Record<'arcade' | 'realistic', GameplayOptions>;
  gameplayOptions: { [K in keyof GameplayOptions]: readonly GameplayOptions[K][] };
}

// C5: settings (docs/settings.md).
export const DEFAULT_SETTINGS: SettingsConfig = {
  defaults: {
    postFx: true,
    simSpeedDefault: 0,
    reduceMotion: false,
    captions: false,
    sonarPalette: 'default',
  },
  simSpeedOptions: [0, 1, 2, 3],
  detailStrengthMax: 1.5,
  detailStrengthStep: 0.05,
  captionMaxLines: 2,
  captionMinDurationS: 1.5,
  gameplayPresets: {
    arcade: {
      speedProfile: 'fast',
      lights: 'enhanced',
      sensors: 'extended',
      visualHints: true,
      sonarMarkers: true,
      startPosition: 'near-site',
      batteryOxygen: false,
      currents: 'off',
      descentProfile: 'fast',
      simSpeed: 1,
    },
    realistic: {
      speedProfile: 'research',
      lights: 'realistic',
      sensors: 'realistic',
      visualHints: false,
      sonarMarkers: true,
      startPosition: 'near-site',
      batteryOxygen: true,
      currents: 'realistic',
      descentProfile: 'research',
      simSpeed: 1,
    },
  },
  gameplayOptions: {
    speedProfile: ['research', 'standard', 'fast'],
    lights: ['realistic', 'enhanced'],
    sensors: ['realistic', 'extended'],
    visualHints: [false, true],
    sonarMarkers: [false, true],
    startPosition: ['near-site', 'surface'],
    batteryOxygen: [false, true],
    currents: ['off', 'gentle', 'realistic', 'exaggerated'],
    descentProfile: ['research', 'standard', 'fast'],
    simSpeed: [1, 2, 3],
  },
};

// --- D-SONAR: survey relief and map spans ---
export const DEFAULT_SONAR_ZOOM: SonarZoomConfig = {
  levels: [250, 500, 1000, 2000, 'tile'],
  initial: 1000,
  minReliefSpanM: { 250: 8, 500: 12, 1000: 20, 2000: 40, tile: 100 },
  contourIntervalM: { 250: 5, 500: 10, 1000: 25, 2000: 50, tile: 100 },
  rasterMarginPx: 24,
  refreshShiftPx: 12,
  hillshadeGain: 2.2,
  maxContours: 20,
};

export const DEFAULT_SONAR_PALETTES: Record<SonarPaletteName, SonarPalette> = {
  default: {
    label: 'Sonar relief',
    stops: [
      [0, 3, 26, 28],
      [0.25, 9, 57, 55],
      [0.5, 30, 94, 83],
      [0.75, 78, 142, 113],
      [1, 155, 198, 144],
    ],
    blip: '#ffd24a',
    blipOutline: null,
    sub: '#ffffff',
    subOutline: null,
    trail: 'rgba(180, 255, 210, 0.45)',
    frame: 'rgba(120, 255, 180, 0.6)',
  },
  deuteranopia: {
    // Cividis-like blue -> yellow ramp: readable with red-green colour
    // blindness because depth is carried by luminance and the blue/yellow axis.
    label: 'Colour-blind safe (blue to yellow)',
    stops: [
      [0, 0, 34, 78],
      [0.25, 53, 69, 108],
      [0.5, 102, 105, 112],
      [0.75, 168, 157, 116],
      [1, 254, 232, 56],
    ],
    blip: '#ffffff',
    blipOutline: '#000000',
    sub: '#000000',
    subOutline: '#ffffff',
    trail: 'rgba(255, 255, 255, 0.7)',
    frame: 'rgba(255, 255, 255, 0.8)',
  },
  highContrast: {
    // White symbols on a black-to-grey map.
    label: 'High contrast (white on black)',
    stops: [
      [0, 0, 0, 0],
      [1, 110, 110, 110],
    ],
    blip: '#ffffff',
    blipOutline: '#000000',
    sub: '#ffffff',
    subOutline: '#000000',
    trail: 'rgba(255, 255, 255, 0.9)',
    frame: '#ffffff',
  },
};

// C1: globe mission select (docs/globe.md).
export const DEFAULT_GLOBE: GlobeConfig = {
  textureUrl: publicUrl('/assets/globe/earth-bmng-topo-bathy-4096.jpg'),
  minDistance: 1.35,
  maxDistance: 4.5,
  startDistance: 3.5,
  fovDeg: 35,
  dragDegPerPx: 0.2,
  inertiaDamping: 3.5,
  maxFlingDegPerS: 240,
  flingStaleS: 0.1,
  autoRotateDegPerS: 3,
  idleBeforeAutoRotateS: 5,
  keyRotateDegPerS: 50,
  keyZoomFactor: 1.25,
  wheelZoomPerPx: 0.0015,
  maxLatDeg: 80,
  focusLerpPerS: 5,
  pinOverlapPx: 16,
  pinHorizonFade: 0.18,
  landDim: 0.22,
  landSaturation: 0.35,
  oceanGain: 1.15,
  graticuleDeg: 30,
  graticuleOpacity: 0.14,
  accentColor: 0x2ed9d9,
  atmosphereStrength: 0.8,
  atmosphereScale: 1.012,
  maxPixelRatio: 2,
};
