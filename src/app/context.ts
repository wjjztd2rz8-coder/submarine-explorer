/**
 * The shared game context (F0-CORE).
 *
 * `BootContext` is what `app/boot.ts` produces before any system runs: URL
 * params, config, event bus, saved settings, the resolved quality tier, the
 * loaded tile, renderer and scene. `GameContext` adds the objects each system
 * publishes during its `init`, in `app/systems.ts` order. A system may read
 * another's field at init time only if that system comes earlier in the list;
 * callbacks and frame hooks may read any field.
 *
 * `expose()` adds debug handles to `window.__game` (assigned by `main.ts` after
 * every system has initialised, as before F0).
 */

import type { Progress } from '../game/Progress.js';
import type { Upgrades } from '../ui/Upgrades.js';
import type * as THREE from 'three';
import type { AudioSystem } from '../audio/AudioSystem.js';
import type { AtmosphereTier, GameConfig, GraphicsTier } from '../core/Config.js';
import type { EventBus } from '../core/EventBus.js';
import type { Input } from '../core/Input.js';
import type { QualityResolution } from '../core/Quality.js';
import type { Save, SettingsData } from '../core/Save.js';
import type { Discovery } from '../game/Discovery.js';
import type { MissionSummary } from '../game/Mission.js';
import type { MissionRoute, MissionRouter, MissionStartPosition } from '../game/MissionRouter.js';
import type { PhotoStore } from '../game/PhotoStore.js';
import type { Power } from '../game/Power.js';
import type { applyFreeDiveHull } from '../game/Spawn.js';
import type { Atmosphere } from '../render/Atmosphere.js';
import type { Headlights } from '../render/Headlights.js';
import type { MarineSnow } from '../render/MarineSnow.js';
import type { Rov } from '../rov/Rov.js';
import type { RovVisual } from '../rov/RovVisual.js';
import type { UnderwaterPass } from '../shaders/underwater.js';
import type { CameraRig } from '../sub/CameraRig.js';
import type { SubMesh } from '../sub/SubMesh.js';
import type { Submarine } from '../sub/Submarine.js';
import type { ControlsCard } from '../ui/ControlsCard.js';
import type { Captions } from '../ui/Captions.js';
import type { Globe } from '../ui/Globe.js';
import type { Home } from '../ui/Home.js';
import type { HUD } from '../ui/HUD.js';
import type { Journal } from '../ui/Journal.js';
import type { MissionSelect } from '../ui/MissionSelect.js';
import type { PauseMenu } from '../ui/PauseMenu.js';
import type { PhotoMode } from '../ui/PhotoMode.js';
import type { RovHUD } from '../ui/RovHUD.js';
import type { SettingsScreen } from '../ui/Settings.js';
import type { Sonar } from '../ui/Sonar.js';
import type { Waypoints } from '../ui/Waypoints.js';
import type { Tile, TileIndexEntry, TileMeta } from '../util/types.js';
import type { Currents } from '../world/Currents.js';
import type { Landmarks } from '../world/Landmarks.js';
import type { PresetSystem } from '../world/presets/Presets.js';
import type { Life } from '../world/life/Life.js';
import type { Props } from '../world/Props.js';
import type { PlacementDebug } from '../world/props/PlacementDebug.js';
import type { PropContact } from '../world/props/Wiring.js';
import type { TileLoader } from '../world/TileLoader.js';
import type { Water } from '../world/Water.js';
import type { Terrain } from '../world/Terrain.js';

export type AppState = 'home' | 'dive' | 'pause';

export interface BootContext {
  params: URLSearchParams;
  config: GameConfig;
  bus: EventBus;
  /** Shell state: which screen is up. `setAppState` (shell system) changes it. */
  app: {
    state: AppState;
    /** Mission id of the last dive (Continue on the home screen). */
    lastSite: string | null;
  };
  /** The page URL without dive params, keeping `?tier=` (shell links). */
  shellBaseHref(): string;
  loader: TileLoader;
  index: TileIndexEntry[];
  /** `?mission=` route, or null for a free dive. */
  route: MissionRoute | null;
  tileId: string;
  save: Save;
  progress: Progress;
  /** Saved settings as they were at boot. */
  settings: SettingsData;
  /** `config.scan.hintRangeFactor` before the sensor preset was applied. */
  baseHintRangeFactor: number;
  /** The graphics tier this dive runs at, and how it was chosen. */
  tier: GraphicsTier;
  quality: QualityResolution;
  /** Current post-processing switch (settings can change it live). */
  postFx: boolean;
  /** `?debugTerrain=1`. */
  debugTerrain: boolean;
  /** `?depth=` in metres, or null. */
  spawnDepth: number | null;
  tile: Tile;
  meta: TileMeta;
  canvas: HTMLCanvasElement;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  /** Debug handles for `window.__game`; add with `expose()`. */
  exposed: Record<string, unknown>;
  /** Copy the given properties (getters included) onto `window.__game`. */
  expose(fields: object): void;
}

export interface GameContext extends BootContext {
  upgrades: Upgrades;
  // world (terrain, atmosphere, landmarks)
  terrain: Terrain;
  atmoTier: AtmosphereTier;
  atmosphere: Atmosphere;
  headlights: Headlights;
  snow: MarineSnow;
  water: Water;
  landmarks: Landmarks;
  // submarine
  sub: Submarine;
  subMesh: SubMesh;
  /** Hull fitted for a free dive; null on a mission. */
  freeDiveHull: ReturnType<typeof applyFreeDiveHull> | null;
  /** Content folder for POIs, guide and props: the mission's, else `?landmark=` / the tile. */
  contentLandmark: string;
  rig: CameraRig;
  hud: HUD;
  sonar: Sonar;
  discovery: Discovery;
  power: Power;
  waypoints: Waypoints;
  /** Authored mission objective hints for the waypoint label. */
  scanObjectiveHints: Map<string, string>;
  /** POI scan radii before the sensor preset multiplier. */
  baseScanRadii: Map<string, number>;
  props: Props;
  propsDebug: PlacementDebug | null;
  propContact: PropContact;
  currents: Currents;
  presets: PresetSystem;
  /** Marine life; null until `data/life/life.json` has loaded (or with `?life=0`). */
  life: Life | null;
  // shell
  missionSelect: MissionSelect;
  home: Home;
  homeSites: MissionSelect;
  pause: PauseMenu;
  pauseSites: MissionSelect;
  /** Mission summaries once loaded (empty until then). */
  missionSummaries: MissionSummary[];
  setAppState(state: AppState): void;
  globe: Globe;
  homeGlobe: Globe;
  input: Input;
  /** Control tips show until this `performance.now()` time. */
  cameraTips: { until: number };
  keyboard: { lock(): Promise<void>; unlock(): void };
  pointerLook: { updateHint(): void };
  settingsScreen: SettingsScreen;
  /** F3-ONBOARD: device layout card; also supplies the compact control tips. */
  controlsCard: ControlsCard;
  missionRouter: MissionRouter | null;
  applyMissionStart(choice: MissionStartPosition): void;
  journal: Journal;
  photos: PhotoStore;
  photoMode: PhotoMode;
  /** Leave photo mode (no-op when it is not active). */
  exitPhotoMode(): void;
  audio: AudioSystem;
  captions: Captions;
  post: UnderwaterPass;
  /** Re-apply the window size (and the current pixel ratio) to renderer, camera and post. */
  resize(): void;
  /** Draw calls and triangles of the last frame, post pass included. */
  renderStats: { calls: number; triangles: number };
  rov: Rov;
  rovVisual: RovVisual;
  rovHud: RovHUD;
}

/** Add `expose` bookkeeping to a boot context. */
export function makeExposer(): Pick<BootContext, 'exposed' | 'expose'> {
  const exposed: Record<string, unknown> = {};
  return {
    exposed,
    expose(fields: object): void {
      Object.defineProperties(exposed, Object.getOwnPropertyDescriptors(fields));
    },
  };
}
