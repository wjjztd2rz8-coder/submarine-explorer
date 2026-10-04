/**
 * Environment preset registry and selection (docs/presets.md, contracts §1-2).
 *
 * Selection: `?preset=<name>` (debug) > `mission.json` `environment.preset` >
 * the landmark `type` in data/landmarks.json (landmark id, then tile id) >
 * `default`. `environment.overrides` are merged over `Config.presets.<name>`;
 * unknown or mistyped keys are warned about once and ignored.
 *
 * `PresetSystem` owns the active preset: it enters it once props and POIs
 * have loaded, runs it after `Atmosphere.update` each frame, writes any
 * adjusted fog/ambient back to the scene, and couples the summed water
 * current to the sub's velocity (capped at `Config.presets.maxCurrentMps`).
 * On the low graphics tier nothing is drawn; currents and events remain
 * (`lowTierCurrents`).
 */

import { currentScale } from '../../core/config/modes.js';
import { DEFAULT_WATER } from '../../core/Config.js';
import * as THREE from 'three';
import type {
  EnvPresetName,
  GameConfig,
  GameplayOptions,
  GraphicsTier,
  PresetParamValue,
} from '../../core/Config.js';
import type { EventBus } from '../../core/EventBus.js';
import { contentUrl } from '../../game/ContentPath.js';
import type { AtmosphereSample } from '../../render/Atmosphere.js';
import { publicUrl } from '../../util/publicUrl.js';
import { Currents, guardCurrentDelta } from '../Currents.js';
import { BrinePreset } from './BrinePreset.js';
import { CanyonPreset } from './CanyonPreset.js';
import { DefaultPreset } from './DefaultPreset.js';
import { capVector, currentCouplingDelta, vectorToBearing } from './maths.js';
import { ReefPreset } from './ReefPreset.js';
import { SeamountPreset } from './SeamountPreset.js';
import type { ParticleLook } from './shared.js';
import { TrenchPreset } from './TrenchPreset.js';
import type {
  EnvPreset,
  PresetFrameContext,
  PresetParams,
  PresetPoi,
  PresetProp,
  PresetTerrain,
} from './types.js';
import { VentPreset } from './VentPreset.js';
import { WreckPreset } from './WreckPreset.js';

export const PRESET_NAMES: readonly EnvPresetName[] = [
  'vent',
  'brine',
  'canyon',
  'reef',
  'trench',
  'wreck',
  'seamount',
  'default',
];

export function isPresetName(v: unknown): v is EnvPresetName {
  return typeof v === 'string' && (PRESET_NAMES as readonly string[]).includes(v);
}

/** Landmark `type` -> preset (plan/PHASE-C-CONTRACTS.md §1). */
export function presetForType(type: string | null | undefined): EnvPresetName {
  switch (type) {
    case 'vent':
      return 'vent';
    case 'seep':
      return 'brine';
    case 'canyon':
      return 'canyon';
    case 'reef':
    case 'hole':
      return 'reef';
    case 'trench':
      return 'trench';
    case 'wreck':
      return 'wreck';
    case 'seamount':
    case 'ridge':
      return 'seamount';
    default:
      return 'default';
  }
}

/** The `type` of the first id found in a landmarks.json document (either shape). */
export function landmarkTypeFor(doc: unknown, ids: readonly string[]): string | null {
  const list = Array.isArray(doc)
    ? doc
    : doc && typeof doc === 'object' && Array.isArray((doc as { landmarks?: unknown }).landmarks)
      ? (doc as { landmarks: unknown[] }).landmarks
      : [];
  for (const id of ids) {
    for (const l of list) {
      if (l && typeof l === 'object' && (l as { id?: unknown }).id === id) {
        const t = (l as { type?: unknown }).type;
        return typeof t === 'string' ? t : null;
      }
    }
  }
  return null;
}

export type PresetSource = 'param' | 'mission' | 'type' | 'default';

export interface PresetSelection {
  preset: EnvPresetName;
  source: PresetSource;
  /** Raw overrides from mission.json (only when they belong to the chosen preset). */
  overrides: Record<string, unknown>;
}

export type Warn = (message: string) => void;
const defaultWarn: Warn = (m) => console.warn(`[presets] ${m}`);

/** Pick the preset for this dive. Never throws; bad inputs are warned and skipped. */
export function selectPreset(
  input: { forced?: string | null; environment?: unknown; landmarkType?: string | null },
  warn: Warn = defaultWarn,
): PresetSelection {
  const env =
    input.environment && typeof input.environment === 'object' && !Array.isArray(input.environment)
      ? (input.environment as { preset?: unknown; overrides?: unknown })
      : null;
  const envPreset = env?.preset;
  if (envPreset !== undefined && !isPresetName(envPreset)) {
    warn(`mission environment.preset "${String(envPreset)}" is not a preset; ignored`);
  }
  const rawOverrides =
    env?.overrides && typeof env.overrides === 'object' && !Array.isArray(env.overrides)
      ? (env.overrides as Record<string, unknown>)
      : {};

  let preset: EnvPresetName;
  let source: PresetSource;
  if (input.forced && isPresetName(input.forced)) {
    preset = input.forced;
    source = 'param';
  } else {
    if (input.forced) warn(`?preset=${input.forced} is not a preset; ignored`);
    if (isPresetName(envPreset)) {
      preset = envPreset;
      source = 'mission';
    } else if (input.landmarkType) {
      preset = presetForType(input.landmarkType);
      source = preset === 'default' ? 'default' : 'type';
    } else {
      preset = 'default';
      source = 'default';
    }
  }
  // Overrides are written for the mission's preset; a forced different preset ignores them.
  const applies = !isPresetName(envPreset) || envPreset === preset;
  return { preset, source, overrides: applies ? rawOverrides : {} };
}

const warnedKeys = new Set<string>();

/** Test hook: forget which unknown keys were already reported. */
export function resetOverrideWarnings(): void {
  warnedKeys.clear();
}

/**
 * `defaults` with `overrides` on top. A key is accepted when the default has
 * the same JS type, or the default is null and the override is a number
 * (e.g. canyon `currentDirDeg`). Anything else is warned once per
 * preset+key and ignored.
 */
export function mergePresetParams(
  preset: EnvPresetName,
  defaults: Readonly<Record<string, PresetParamValue>>,
  overrides: Readonly<Record<string, unknown>>,
  warn: Warn = defaultWarn,
): PresetParams {
  const out: PresetParams = { ...defaults };
  for (const [key, value] of Object.entries(overrides)) {
    const has = Object.prototype.hasOwnProperty.call(defaults, key);
    const def = has ? defaults[key] : undefined;
    const validNumber =
      typeof value !== 'number' ||
      (Number.isFinite(value) &&
        Math.abs(value) <= (key.toLowerCase().includes('color') ? 0xffffff : 1_000_000) &&
        (typeof def !== 'number' || def < 0 || value >= 0));
    const ok =
      has &&
      validNumber &&
      ((def === null && (typeof value === 'number' || value === null)) ||
        (def !== null &&
          typeof value === typeof def &&
          (typeof value !== 'number' || Number.isFinite(value))));
    if (ok) {
      out[key] = value as PresetParamValue;
      continue;
    }
    const tag = `${preset}.${key}`;
    if (warnedKeys.has(tag)) continue;
    warnedKeys.add(tag);
    warn(
      has
        ? `override "${key}" for preset "${preset}" has the wrong type (${typeof value}); ignored`
        : `unknown override "${key}" for preset "${preset}"; ignored`,
    );
  }
  return out;
}

/** Tunables for a preset from Config (`default` has none). */
export function presetDefaults(
  config: GameConfig['presets'],
  name: EnvPresetName,
): Record<string, PresetParamValue> {
  if (name === 'default') return {};
  return { ...(config[name] as unknown as Record<string, PresetParamValue>) };
}

export function createPreset(
  name: EnvPresetName,
  look: ParticleLook,
  water = DEFAULT_WATER,
): EnvPreset {
  switch (name) {
    case 'vent':
      return new VentPreset(look);
    case 'brine':
      return new BrinePreset(look);
    case 'canyon':
      return new CanyonPreset(look);
    case 'reef':
      return new ReefPreset(look);
    case 'trench':
      return new TrenchPreset();
    case 'wreck':
      return new WreckPreset(look, water);
    case 'seamount':
      return new SeamountPreset();
    default:
      return new DefaultPreset();
  }
}

// ------------------------------------------------------------------ system

/** Narrow views of the game objects the system reads. */
export interface PresetPropSource {
  loaded: boolean;
  placed: ReadonlyArray<{
    def: { id: string; model: string };
    root: THREE.Object3D;
    localBounds: THREE.Box3;
    sphere: THREE.Sphere;
  }>;
}
export interface PresetPoiSource {
  loaded: boolean;
  pois: ReadonlyArray<{ id: string; kind: string; position: THREE.Vector3 }>;
}

export interface PresetSystemOptions {
  scene: THREE.Scene;
  bus: EventBus;
  config: GameConfig;
  tier: GraphicsTier;
  params: URLSearchParams;
  tileId: string;
  landmarkId: string;
  /** Mission folder for `mission.json` (null in free dive: the landmark folder is tried). */
  missionId: string | null;
  terrain: PresetTerrain;
  sub: { position: THREE.Vector3; velocity: THREE.Vector3; floorFor(ground: number): number };
  currents: Currents;
  currentMode: GameplayOptions['currents'];
  props: PresetPropSource;
  discovery: PresetPoiSource;
  atmosphere: { ambient: THREE.AmbientLight; caustics: THREE.SpotLight | null };
  headlights: { on: boolean };
  toWorld(lat: number, lon: number): { x: number; z: number };
  fetchJson(url: string): Promise<unknown>;
}

/** Props reduced to top/centre/height in world space. */
export function toPresetProps(placed: PresetPropSource['placed']): PresetProp[] {
  return placed.map((p) => {
    p.root.updateMatrixWorld(true);
    // Set pieces name their real orifice height (their bounds also cover plume reach).
    let topY = p.localBounds.max.y;
    p.root.traverse((o) => {
      if (typeof o.userData.ventTop === 'number') topY = o.userData.ventTop as number;
    });
    const top = p.root.localToWorld(new THREE.Vector3(0, topY, 0));
    const base = p.root.localToWorld(new THREE.Vector3(0, p.localBounds.min.y, 0));
    return {
      id: p.def.id,
      model: p.def.model,
      top,
      centre: p.sphere.center.clone(),
      radius: p.sphere.radius,
      height: top.distanceTo(base),
    };
  });
}

/** Seconds after boot the preset enters even if props/POIs never report loaded. */
const ENTER_TIMEOUT_S = 10;

export class PresetSystem {
  /** Chosen preset; `default` until selection resolves. */
  active: EnvPresetName = 'default';
  source: PresetSource = 'default';
  params: PresetParams = {};
  preset: EnvPreset | null = null;
  entered = false;
  /** Event names this system emitted, in order (e2e reads it). */
  readonly emitted: string[] = [];
  /** Current applied to the sub last frame, after the cap (m/s). */
  readonly current = new THREE.Vector3();
  readonly ready: Promise<void>;

  private readonly visuals: boolean;
  private readonly look: ParticleLook;
  private readonly frame: PresetFrameContext;
  private readonly delta = new THREE.Vector3();
  private readonly spawn: THREE.Vector3;
  private waited = 0;
  private lastCurrent = { dir: 0, speed: 0, at: -Infinity };
  private currentMode: GameplayOptions['currents'];

  constructor(private readonly o: PresetSystemOptions) {
    const pc = o.config.presets;
    this.currentMode = o.currentMode;
    this.visuals = o.tier !== 'low' && pc.tierParticleScale[o.tier] > 0;
    this.look = {
      ambient: pc.particleAmbient,
      headlightGain: pc.particleHeadlightGain,
      headlightFalloffM: pc.particleHeadlightFalloffM,
    };
    this.spawn = o.sub.position.clone();
    this.frame = {
      camera: new THREE.PerspectiveCamera(),
      subPosition: o.sub.position,
      subVelocity: o.sub.velocity,
      atmo: null as unknown as AtmosphereSample,
      terrain: o.terrain,
      elapsed: 0,
      viewportH: 1,
      headlightsOn: true,
      baseCurrent: new THREE.Vector3(),
      canyonReferenceSpeedMps: pc.canyon.currentSpeedMps,
      current: new THREE.Vector3(),
      causticsScale: 1,
      bus: o.bus,
    };
    this.ready = this.resolve();
  }

  setCurrentMode(mode: GameplayOptions['currents']): void {
    if (mode === this.currentMode) return;
    this.currentMode = mode;
    this.lastCurrent.at = -Infinity;
    if (mode === 'off') {
      this.current.set(0, 0, 0);
      this.lastCurrent.speed = 0;
      this.emit('env:current', { dirDeg: 0, speedMps: 0 });
    }
  }

  private async resolve(): Promise<void> {
    const o = this.o;
    const folder = o.missionId ?? o.landmarkId;
    const [mission, landmarks] = await Promise.all([
      o.fetchJson(contentUrl(folder, 'mission.json')),
      o.fetchJson(publicUrl('/data/landmarks.json')),
    ]);
    const environment =
      mission && typeof mission === 'object'
        ? (mission as { environment?: unknown }).environment
        : undefined;
    const sel = selectPreset({
      forced: o.params.get('preset'),
      environment,
      landmarkType: landmarkTypeFor(landmarks, [o.landmarkId, o.tileId]),
    });
    this.active = sel.preset;
    this.source = sel.source;
    this.params = mergePresetParams(
      sel.preset,
      presetDefaults(o.config.presets, sel.preset),
      sel.overrides,
    );
    this.preset = createPreset(sel.preset, this.look, this.o.config.water);
    this.emit('env:preset', { preset: sel.preset, landmarkId: o.landmarkId });
    console.info(`[presets] ${sel.preset} (${sel.source}) for ${o.landmarkId}`);
  }

  private emit<K extends 'env:preset' | 'env:current'>(
    name: K,
    payload: K extends 'env:preset'
      ? { preset: EnvPresetName; landmarkId: string }
      : { dirDeg: number; speedMps: number },
  ): void {
    this.emitted.push(name);
    (this.o.bus.emit as (n: string, p: unknown) => void)(name, payload);
  }

  private tryEnter(dt: number): void {
    if (!this.preset || this.entered) return;
    this.waited += dt;
    const ready = this.o.props.loaded && this.o.discovery.loaded;
    if (!ready && this.waited < ENTER_TIMEOUT_S) return;
    const pc = this.o.config.presets;
    const pois: PresetPoi[] = this.o.discovery.pois.map((p) => ({
      id: p.id,
      kind: p.kind,
      position: p.position,
    }));
    this.preset.enter({
      scene: this.o.scene,
      terrain: this.o.terrain,
      props: toPresetProps(this.o.props.placed),
      pois,
      params: this.params,
      visuals: this.visuals,
      particleScale: this.visuals ? pc.tierParticleScale[this.o.tier] : 0,
      maxParticles: pc.maxParticles,
      spawn: this.spawn,
      toWorld: this.o.toWorld,
      bus: this.o.bus,
    });
    this.entered = true;
  }

  /**
   * Call right after `Atmosphere.update` (and before anything consumes its
   * sample). `simDt` is the physics time stepped this frame (0 while frozen).
   */
  update(
    frameDt: number,
    simDt: number,
    atmo: AtmosphereSample,
    camera: THREE.PerspectiveCamera,
    viewportH: number,
    elapsed: number,
  ): void {
    this.tryEnter(frameDt);
    const f = this.frame;
    f.camera = camera;
    f.atmo = atmo;
    f.elapsed = elapsed;
    f.viewportH = viewportH;
    f.headlightsOn = this.o.headlights.on;
    this.o.currents.sample(this.o.sub.position.x, this.o.sub.position.z, f.baseCurrent);
    if (this.currentMode === 'off' || this.o.currents.status !== 'ready')
      f.baseCurrent.set(0, 0, 0);
    // Canyon replaces the regional vector with a slope-bent version. Other
    // presets may add local effects such as a vent updraft to that base.
    if (this.active === 'canyon' && this.entered) f.current.set(0, 0, 0);
    else f.current.copy(f.baseCurrent);
    f.causticsScale = 1;
    if (this.preset && this.entered) {
      this.preset.update(frameDt, f);
      if (this.visuals) this.syncAtmosphere(atmo, f.causticsScale);
      else {
        // Low tier draws no particles, but an opt-in ambient fill must still reach the scene.
        this.o.atmosphere.ambient.intensity = atmo.ambientIntensity;
        this.o.atmosphere.ambient.color.copy(atmo.ambientColor);
      }
    }
    this.applyCurrent(simDt, elapsed);
  }

  /** Push the adjusted sample back into the scene objects Atmosphere already wrote. */
  private syncAtmosphere(atmo: AtmosphereSample, causticsScale: number): void {
    const { scene, atmosphere } = this.o;
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.density = atmo.fogDensity;
      scene.fog.color.copy(atmo.fogColor);
    }
    if (scene.background instanceof THREE.Color) scene.background.copy(atmo.fogColor);
    atmosphere.ambient.intensity = atmo.ambientIntensity;
    atmosphere.ambient.color.copy(atmo.ambientColor);
    if (atmosphere.caustics && causticsScale !== 1) atmosphere.caustics.intensity *= causticsScale;
  }

  private applyCurrent(simDt: number, elapsed: number): void {
    const pc = this.o.config.presets;
    const c = this.current.copy(this.frame.current);
    if (this.currentMode === 'off' || this.o.currents.status !== 'ready') c.set(0, 0, 0);
    else c.multiplyScalar(currentScale(this.currentMode, this.o.config.currents));
    if (!this.visuals && !pc.lowTierCurrents) c.set(0, 0, 0);
    capVector(
      c,
      pc.maxCurrentMps * Math.max(1, currentScale(this.currentMode, this.o.config.currents)),
    );
    if (simDt > 0) {
      currentCouplingDelta(this.o.sub.velocity, c, pc.currentCouplingPerS, simDt, this.delta);
      const guard = this.o.config.currents;
      guardCurrentDelta(
        this.delta,
        this.o.sub.position,
        this.o.sub.velocity,
        this.o.terrain,
        (ground) => this.o.sub.floorFor(ground),
        guard.terrainLookaheadS,
        guard.terrainGuardM,
      );
      this.o.sub.velocity.add(this.delta);
    }
    const speed = Math.hypot(c.x, c.z);
    const dir = speed > 1e-3 ? vectorToBearing(c.x, c.z) : this.lastCurrent.dir;
    const last = this.lastCurrent;
    const dDir = Math.abs(((dir - last.dir + 540) % 360) - 180);
    const changed =
      Math.abs(speed - last.speed) > pc.currentEventSpeedMps ||
      (speed > 0.01 && dDir > pc.currentEventDirDeg);
    if (changed && elapsed - last.at >= pc.currentEventMinIntervalS) {
      this.lastCurrent = { dir, speed, at: elapsed };
      this.emit('env:current', {
        dirDeg: Math.round(dir),
        speedMps: Math.round(speed * 100) / 100,
      });
    }
  }

  debugString(): string {
    const s = this.preset?.stats ?? { draws: 0, particles: 0, lights: 0 };
    const c = this.current;
    const extra = this.preset?.debug?.() ?? '';
    return (
      `preset=${this.active} (${this.source}) ${this.entered ? '' : 'pending '}` +
      `draws+${s.draws} particles=${s.particles} lights=${s.lights} ` +
      `current=${Math.hypot(c.x, c.z).toFixed(2)}m/s up=${c.y.toFixed(2)} ${extra}`.trim()
    );
  }

  dispose(): void {
    this.preset?.exit();
    this.entered = false;
  }
}
