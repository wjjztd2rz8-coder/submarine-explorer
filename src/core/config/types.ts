/**
 * The `GameConfig` contract (F0-CORE): one field per tuning domain. Each
 * domain's own types and defaults live beside this file (`submarine.ts`,
 * `terrain.ts`, `atmosphere.ts`, …); `core/Config.ts` assembles the defaults
 * and stays the import path for everything (`makeConfig`, `DEFAULT_CONFIG`,
 * every type). Adding a domain: a new file here, a field below, its default
 * in `DEFAULT_CONFIG` and a line in `makeConfig`.
 */

import type { AudioConfig } from './audio.js';
import type { CameraConfig } from './camera.js';
import type { LandmarksConfig, ScanConfig } from './discovery.js';
import type {
  CurrentsConfig,
  DescentProfile,
  GameplayOptions,
  LightPreset,
  PowerConfig,
  RovConfig,
  SensorPreset,
  SpeedProfile,
} from './gameplay.js';
import type { MissionConfig } from './mission.js';
import type { PresetsConfig } from './presets.js';
import type { PropsConfig } from './props.js';
import type { GraphicsTierSetting, QualityConfig } from './quality.js';
import type { SubmarineConfig } from './submarine.js';
import type { TerrainConfig } from './terrain.js';
import type { WaterConfig } from './atmosphere.js';
import type {
  GlobeConfig,
  SettingsConfig,
  SonarPalette,
  SonarPaletteName,
  SonarZoomConfig,
} from './ui.js';

export interface GameConfig {
  defaultTileId: string;
  /**
   * Default graphics setting for new players: a fixed tier, or `auto`
   * (detected at boot by `core/Quality.ts`). `medium` keeps the pre-Phase-F
   * default; switching the default to `auto` is a Phase F follow-up once the
   * tiers are tuned. Override at runtime with `?tier=low|medium|high|ultra|auto`.
   */
  graphicsTier: GraphicsTierSetting;
  submarine: SubmarineConfig;
  terrain: TerrainConfig;
  water: WaterConfig;
  camera: CameraConfig;
  audio: AudioConfig;
  /** Free-dive landmark markers and labels. */
  landmarks: LandmarksConfig;
  /** B1: scan beam, discovery and debrief tunables. */
  scan: ScanConfig;
  /** B4: placed props (wrecks, rocks, chimneys). */
  props: PropsConfig;
  /** B3: mission flow. */
  mission: MissionConfig;
  /** C5: settings screen defaults and ranges (docs/settings.md). */
  settings: SettingsConfig;
  speedProfiles: Record<GameplayOptions['speedProfile'], SpeedProfile>;
  descentProfiles: Record<GameplayOptions['descentProfile'], DescentProfile>;
  lightPresets: Record<GameplayOptions['lights'], LightPreset>;
  sensorPresets: Record<GameplayOptions['sensors'], SensorPreset>;
  power: PowerConfig;
  currents: CurrentsConfig;
  rov: RovConfig;
  /** C5: sonar minimap palettes (`Sonar.setPalette`). */
  sonarPalettes: Record<SonarPaletteName, SonarPalette>;
  sonarZoom: SonarZoomConfig;
  /** C1: globe mission select. */
  globe: GlobeConfig;
  physicsHz: number;
  /** C3: environment presets by landmark type (docs/presets.md). */
  presets: PresetsConfig;
  /** F0-CORE: per-tier pixel-ratio caps and dynamic resolution. */
  quality: QualityConfig;
}
