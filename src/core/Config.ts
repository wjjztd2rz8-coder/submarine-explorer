/**
 * Central tuning constants. Everything a designer might want to twiddle lives
 * here rather than scattered through the modules. Values are SI (metres,
 * seconds, radians unless a name says Deg).
 *
 * F0-CORE: each domain's types and defaults now live in `core/config/*.ts`
 * (submarine, terrain, atmosphere, camera, audio, discovery, props, mission,
 * presets, gameplay, ui, quality) and the `GameConfig` contract in
 * `core/config/types.ts`. This file assembles `DEFAULT_CONFIG`, owns
 * `makeConfig` and re-exports every domain, so `import … from
 * '../core/Config.js'` keeps working. A package that owns a domain edits only
 * that domain's file.
 */

import { DEFAULT_AUDIO } from './config/audio.js';
import { DEFAULT_CAMERA } from './config/camera.js';
import { DEFAULT_LANDMARKS, DEFAULT_SCAN } from './config/discovery.js';
import {
  DEFAULT_CURRENTS,
  DEFAULT_DESCENT_PROFILES,
  DEFAULT_LIGHT_PRESETS,
  DEFAULT_POWER,
  DEFAULT_ROV,
  DEFAULT_SENSOR_PRESETS,
  DEFAULT_SPEED_PROFILES,
} from './config/gameplay.js';
import { DEFAULT_MISSION } from './config/mission.js';
import { DEFAULT_PRESETS } from './config/presets.js';
import { DEFAULT_PROPS } from './config/props.js';
import { DEFAULT_QUALITY, GRAPHICS_TIERS, type GraphicsTier } from './config/quality.js';
import { DEFAULT_SUBMARINE } from './config/submarine.js';
import { DEFAULT_TERRAIN } from './config/terrain.js';
import { DEFAULT_WATER } from './config/atmosphere.js';
import {
  DEFAULT_GLOBE,
  DEFAULT_SETTINGS,
  DEFAULT_SONAR_PALETTES,
  DEFAULT_SONAR_ZOOM,
} from './config/ui.js';
import type { GameConfig } from './config/types.js';

export * from './config/atmosphere.js';
export * from './config/audio.js';
export * from './config/beebeChimney.js';
export * from './config/camera.js';
export * from './config/discovery.js';
export * from './config/deepOpenings.js';
export * from './config/gameplay.js';
export * from './config/mission.js';
export * from './config/monterey.js';
export * from './config/presets.js';
export * from './config/props.js';
export * from './config/quality.js';
export * from './config/submarine.js';
export * from './config/terrain.js';
export * from './config/ui.js';
export type * from './config/types.js';

export const DEFAULT_CONFIG: GameConfig = {
  defaultTileId: 'titanic',
  graphicsTier: 'medium',
  physicsHz: 60,
  submarine: DEFAULT_SUBMARINE,
  terrain: DEFAULT_TERRAIN,
  water: DEFAULT_WATER,
  camera: DEFAULT_CAMERA,
  audio: DEFAULT_AUDIO,
  landmarks: DEFAULT_LANDMARKS,
  scan: DEFAULT_SCAN,
  props: DEFAULT_PROPS,
  mission: DEFAULT_MISSION,
  settings: DEFAULT_SETTINGS,
  speedProfiles: DEFAULT_SPEED_PROFILES,
  descentProfiles: DEFAULT_DESCENT_PROFILES,
  lightPresets: DEFAULT_LIGHT_PRESETS,
  sensorPresets: DEFAULT_SENSOR_PRESETS,
  power: DEFAULT_POWER,
  currents: DEFAULT_CURRENTS,
  rov: DEFAULT_ROV,
  sonarZoom: DEFAULT_SONAR_ZOOM,
  sonarPalettes: DEFAULT_SONAR_PALETTES,
  globe: DEFAULT_GLOBE,
  presets: DEFAULT_PRESETS,
  quality: DEFAULT_QUALITY,
};

/** The tier used when nothing else decides: no URL tier, no detection. */
export const FALLBACK_GRAPHICS_TIER: GraphicsTier = 'medium';

/** True for a concrete tier name (`auto` is a setting, not a tier). */
export function isGraphicsTier(value: unknown): value is GraphicsTier {
  return GRAPHICS_TIERS.includes(value as GraphicsTier);
}

/** Parse a `?tier=` value, falling back to the given tier if unrecognised. */
export function resolveGraphicsTier(
  value: string | null | undefined,
  fallback: GraphicsTier = FALLBACK_GRAPHICS_TIER,
): GraphicsTier {
  return isGraphicsTier(value) ? value : fallback;
}

/** Shallow-merge an override into the defaults (one level per section). */
export function makeConfig(overrides: Partial<GameConfig> = {}): GameConfig {
  return {
    ...DEFAULT_CONFIG,
    ...overrides,
    submarine: { ...DEFAULT_CONFIG.submarine, ...overrides.submarine },
    terrain: { ...DEFAULT_CONFIG.terrain, ...overrides.terrain },
    water: { ...DEFAULT_CONFIG.water, ...overrides.water },
    camera: { ...DEFAULT_CONFIG.camera, ...overrides.camera },
    audio: { ...DEFAULT_CONFIG.audio, ...overrides.audio },
    landmarks: { ...DEFAULT_CONFIG.landmarks, ...overrides.landmarks },
    scan: { ...DEFAULT_CONFIG.scan, ...overrides.scan },
    props: { ...DEFAULT_CONFIG.props, ...overrides.props },
    mission: { ...DEFAULT_CONFIG.mission, ...overrides.mission },
    settings: {
      ...DEFAULT_CONFIG.settings,
      ...overrides.settings,
      gameplayPresets: {
        ...DEFAULT_CONFIG.settings.gameplayPresets,
        ...overrides.settings?.gameplayPresets,
      },
      gameplayOptions: {
        ...DEFAULT_CONFIG.settings.gameplayOptions,
        ...overrides.settings?.gameplayOptions,
      },
    },
    speedProfiles: { ...DEFAULT_CONFIG.speedProfiles, ...overrides.speedProfiles },
    descentProfiles: { ...DEFAULT_CONFIG.descentProfiles, ...overrides.descentProfiles },
    lightPresets: { ...DEFAULT_CONFIG.lightPresets, ...overrides.lightPresets },
    sensorPresets: { ...DEFAULT_CONFIG.sensorPresets, ...overrides.sensorPresets },
    power: { ...DEFAULT_CONFIG.power, ...overrides.power },
    currents: { ...DEFAULT_CONFIG.currents, ...overrides.currents },
    rov: { ...DEFAULT_CONFIG.rov, ...overrides.rov },
    sonarPalettes: { ...DEFAULT_CONFIG.sonarPalettes, ...overrides.sonarPalettes },
    sonarZoom: { ...DEFAULT_CONFIG.sonarZoom, ...overrides.sonarZoom },
    globe: { ...DEFAULT_CONFIG.globe, ...overrides.globe },
    presets: { ...DEFAULT_CONFIG.presets, ...overrides.presets },
    quality: { ...DEFAULT_CONFIG.quality, ...overrides.quality },
  };
}
