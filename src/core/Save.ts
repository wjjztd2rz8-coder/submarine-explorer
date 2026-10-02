/** Versioned player settings and v1 display migration. Gameplay presets live in Config. */
import type {
  GameConfig,
  GameplayOptions,
  GraphicsTierSetting,
  SonarPaletteName,
} from './Config.js';
import { DEFAULT_AUDIO } from './config/audio.js';
import { PROGRESS_CONFIG, UPGRADES } from './config/progress.js';
import type { EventBus } from './EventBus.js';

export const SETTINGS_STORAGE_KEY = 'subexplorer.settings.v2';
export const SETTINGS_VERSION = 2;
const LEGACY_SETTINGS_KEY = 'subexplorer.settings.v1';
export const SAVE_KEYS = {
  settings: SETTINGS_STORAGE_KEY,
  bindings: 'subexplorer.bindings.v3',
  discoveries: 'subexplorer.discoveries.v1',
} as const;

export type GameplayMode = 'arcade' | 'realistic' | 'custom';
export type HullWarningStyle = 'vignette' | 'gauge' | 'both';
export const HULL_WARNING_STYLES: readonly HullWarningStyle[] = ['vignette', 'gauge', 'both'];
export interface SettingsValues {
  /** `auto` (the default for new players) or a fixed tier. Saved tiers are kept. */
  graphicsTier: GraphicsTierSetting;
  postFx: boolean;
  detailStrength: number;
  /** Legacy display preference; gameplay.simSpeed controls the dive. */
  simSpeedDefault: number;
  reduceMotion: boolean;
  captions: boolean;
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  muted: boolean;
  sonarPalette: SonarPaletteName;
  uiScale: number;
  controlTips: boolean;
  /** How nearing the hull's rated depth is shown (never screen shake). */
  hullWarningStyle: HullWarningStyle;
  gameplayMode: GameplayMode;
  gameplay: GameplayOptions;
}
export type SettingKey = keyof SettingsValues;
export interface SettingsData extends SettingsValues {
  version: 2;
  bindings?: string;
}
export interface SettingsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
export type SettingsConfigSource = Pick<
  GameConfig,
  'graphicsTier' | 'settings' | 'sonarPalettes'
> & {
  terrain: Pick<GameConfig['terrain'], 'detailStrength'>;
  audio?: Pick<GameConfig['audio'], 'masterVolume' | 'sfxVolume' | 'musicVolume'>;
};
const TIERS: readonly GraphicsTierSetting[] = ['auto', 'low', 'medium', 'high', 'ultra'];
const DISPLAY_KEYS = [
  'graphicsTier',
  'postFx',
  'detailStrength',
  'simSpeedDefault',
  'reduceMotion',
  'captions',
  'masterVolume',
  'sfxVolume',
  'musicVolume',
  'muted',
  'sonarPalette',
] as const;
const GAMEPLAY_KEYS = [
  'speedProfile',
  'lights',
  'sensors',
  'visualHints',
  'sonarMarkers',
  'startPosition',
  'batteryOxygen',
  'currents',
  'descentProfile',
  'simSpeed',
] as const;
export const SETTING_KEYS: readonly SettingKey[] = [
  ...DISPLAY_KEYS,
  'uiScale',
  'controlTips',
  'hullWarningStyle',
  'gameplayMode',
  'gameplay',
];

export function defaultSettings(config: SettingsConfigSource): SettingsData {
  const d = config.settings.defaults;
  return {
    version: 2,
    graphicsTier: config.graphicsTier,
    postFx: d.postFx,
    detailStrength: config.terrain.detailStrength,
    simSpeedDefault: d.simSpeedDefault,
    reduceMotion: d.reduceMotion,
    captions: d.captions,
    masterVolume: config.audio?.masterVolume ?? DEFAULT_AUDIO.masterVolume,
    sfxVolume: config.audio?.sfxVolume ?? DEFAULT_AUDIO.sfxVolume,
    musicVolume: config.audio?.musicVolume ?? DEFAULT_AUDIO.musicVolume,
    muted: false,
    sonarPalette: d.sonarPalette,
    uiScale: 100,
    controlTips: true,
    hullWarningStyle: 'both',
    gameplayMode: 'arcade',
    gameplay: { ...config.settings.gameplayPresets.arcade },
    bindings: SAVE_KEYS.bindings,
  };
}
function sanitizeDisplay(
  key: (typeof DISPLAY_KEYS)[number],
  value: unknown,
  fallback: unknown,
  config: SettingsConfigSource,
): unknown {
  switch (key) {
    case 'graphicsTier':
      return TIERS.includes(value as GraphicsTierSetting) ? value : fallback;
    case 'masterVolume':
    case 'sfxVolume':
    case 'musicVolume':
      return typeof value === 'number' && Number.isFinite(value)
        ? Math.min(1, Math.max(0, value))
        : fallback;
    case 'muted':
    case 'postFx':
    case 'reduceMotion':
    case 'captions':
      return typeof value === 'boolean' ? value : fallback;
    case 'detailStrength':
      return typeof value === 'number' && Number.isFinite(value)
        ? Math.min(config.settings.detailStrengthMax, Math.max(0, value))
        : fallback;
    case 'simSpeedDefault':
      return typeof value === 'number' && config.settings.simSpeedOptions.includes(value)
        ? value
        : fallback;
    case 'sonarPalette':
      return typeof value === 'string' && Object.hasOwn(config.sonarPalettes, value)
        ? value
        : fallback;
  }
}
function sanitizeGameplay(raw: unknown, config: SettingsConfigSource): GameplayOptions {
  const fallback = config.settings.gameplayPresets.arcade;
  const source =
    raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const result = { ...fallback };
  for (const key of GAMEPLAY_KEYS) {
    const value = source[key];
    const choices = config.settings.gameplayOptions[key] as readonly unknown[];
    if (choices.includes(value)) (result as unknown as Record<string, unknown>)[key] = value;
  }
  return result;
}
/** Sanitize v2, or translate a v1/v0 object into Arcade plus its display choices. */
export function migrate(raw: unknown, config: SettingsConfigSource): SettingsData {
  const out = defaultSettings(config);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  const value = raw as Record<string, unknown>;
  if (value.version !== undefined && value.version !== 1 && value.version !== 2) return out;
  for (const key of DISPLAY_KEYS) {
    if (key in value)
      (out as unknown as Record<string, unknown>)[key] = sanitizeDisplay(
        key,
        value[key],
        out[key],
        config,
      );
  }
  if (value.version === 2) {
    if (typeof value.controlTips === 'boolean') out.controlTips = value.controlTips;
    if (HULL_WARNING_STYLES.includes(value.hullWarningStyle as HullWarningStyle))
      out.hullWarningStyle = value.hullWarningStyle as HullWarningStyle;
    if (typeof value.uiScale === 'number' && Number.isFinite(value.uiScale))
      out.uiScale = Math.max(80, Math.min(150, Math.round(value.uiScale)));
    if (value.gameplayMode === 'arcade' || value.gameplayMode === 'realistic') {
      out.gameplayMode = value.gameplayMode;
      out.gameplay = { ...config.settings.gameplayPresets[value.gameplayMode] };
    } else if (value.gameplayMode === 'custom') {
      out.gameplayMode = 'custom';
      out.gameplay = sanitizeGameplay(value.gameplay, config);
    }
  }
  return out;
}
function safeStorage(): SettingsStorage | null {
  try {
    return (globalThis as { localStorage?: SettingsStorage }).localStorage ?? null;
  } catch {
    return null;
  }
}
export interface SaveOptions {
  config: SettingsConfigSource;
  storage?: SettingsStorage | null;
  bus?: Pick<EventBus, 'emit'>;
}
export type SettingsListener = (settings: SettingsData, changed: SettingKey[]) => void;

export class Save {
  private data: SettingsData;
  private readonly storage: SettingsStorage | null;
  private readonly config: SettingsConfigSource;
  private readonly listeners = new Set<SettingsListener>();
  private readOnly = false;
  private reloadSafe_ = true;
  constructor(private readonly options: SaveOptions) {
    this.config = { ...options.config, terrain: { ...options.config.terrain } };
    this.storage = options.storage !== undefined ? options.storage : safeStorage();
    this.data = defaultSettings(this.config);
    this.load();
  }
  load(): SettingsData {
    let raw: unknown = null;
    let absent = true;
    try {
      const text = this.storage?.getItem(SETTINGS_STORAGE_KEY) ?? null;
      absent = text === null;
      if (text) raw = JSON.parse(text);
    } catch {
      /* Storage or JSON is hostile; use defaults. */
    }
    const version = (raw as { version?: unknown } | null)?.version;
    this.readOnly = typeof version === 'number' && version > SETTINGS_VERSION;
    this.reloadSafe_ = !this.readOnly;
    if (this.readOnly)
      console.warn(
        `[save] ${SETTINGS_STORAGE_KEY} is version ${version}; using defaults and not overwriting it`,
      );
    if (absent) {
      try {
        const legacy = this.storage?.getItem(LEGACY_SETTINGS_KEY);
        if (legacy) raw = JSON.parse(legacy);
      } catch {
        raw = null;
      }
      const legacyVersion = (raw as { version?: unknown } | null)?.version;
      if (typeof legacyVersion === 'number' && legacyVersion > 1) {
        this.readOnly = true;
        this.reloadSafe_ = false;
      }
    }
    this.data = migrate(raw, this.config);
    if (absent && !this.readOnly) this.persist();
    return this.get();
  }
  get(): SettingsData {
    return { ...this.data, gameplay: { ...this.data.gameplay } };
  }
  get reloadSafe(): boolean {
    return this.reloadSafe_;
  }
  get protectedVersion(): boolean {
    return this.readOnly;
  }
  defaults(): SettingsData {
    return defaultSettings(this.config);
  }
  /** A preset replaces every option; Custom alone preserves current options. */
  setGameplayMode(mode: GameplayMode): SettingsData {
    return this.commit({
      ...this.data,
      gameplayMode: mode,
      gameplay:
        mode === 'custom'
          ? { ...this.data.gameplay }
          : { ...this.config.settings.gameplayPresets[mode] },
    });
  }
  /** Editing even an unchanged option explicitly enters Custom mode. */
  setGameplayOption<K extends keyof GameplayOptions>(
    key: K,
    value: GameplayOptions[K],
  ): SettingsData {
    return this.commit({
      ...this.data,
      gameplayMode: 'custom',
      gameplay: { ...this.data.gameplay, [key]: value },
    });
  }
  save(partial: Partial<SettingsValues>): SettingsData {
    const editingGameplay = partial.gameplay !== undefined;
    const mode = partial.gameplayMode ?? (editingGameplay ? 'custom' : this.data.gameplayMode);
    const gameplay =
      partial.gameplayMode && partial.gameplayMode !== 'custom'
        ? { ...this.config.settings.gameplayPresets[partial.gameplayMode] }
        : { ...this.data.gameplay, ...partial.gameplay };
    return this.commit({ ...this.data, ...partial, gameplayMode: mode, gameplay });
  }
  reset(): SettingsData {
    // Persist defaults in v2. Removing the key would re-import old v1 choices
    // on the next launch while the legacy key is intentionally preserved.
    return this.commit(defaultSettings(this.config));
  }
  onChange(listener: SettingsListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  private commit(next: SettingsData, persist = true): SettingsData {
    const clean = migrate(next, this.config);
    const changed = SETTING_KEYS.filter((key) =>
      key === 'gameplay'
        ? GAMEPLAY_KEYS.some((k) => clean.gameplay[k] !== this.data.gameplay[k])
        : clean[key] !== this.data[key],
    );
    this.data = clean;
    if (persist) this.persist();
    if (changed.length) {
      const snapshot = this.get();
      for (const key of changed)
        this.options.bus?.emit('settings:changed', { key, value: snapshot[key] });
      for (const listener of [...this.listeners]) {
        try {
          listener(snapshot, changed);
        } catch (error) {
          console.error('[save] settings listener threw', error);
        }
      }
    }
    return this.get();
  }
  private persist(): void {
    this.reloadSafe_ = false;
    if (!this.storage || this.readOnly) return;
    try {
      const text = JSON.stringify(this.data);
      this.storage.setItem(SETTINGS_STORAGE_KEY, text);
      this.reloadSafe_ = this.storage.getItem(SETTINGS_STORAGE_KEY) === text;
    } catch {
      /* Quota or privacy mode: session only. */
    }
  }
}

/** Research is separate from settings and discoveries, so their resets and migrations stay independent. */
export const PROGRESS_STORAGE_KEY = 'subexplorer.progress.v1';
export const PROGRESS_VERSION = 1;
export interface ProgressRecord {
  version: 1;
  legacyCredited: boolean;
  legacyPending?: string[];
  points: number;
  lifetime: number;
  awarded: string[];
  upgrades: Record<string, number>;
  ratings: Record<string, number>;
}
export function migrateProgress(raw: unknown): ProgressRecord {
  const out: ProgressRecord = {
    version: 1,
    legacyCredited: false,
    points: 0,
    lifetime: 0,
    awarded: [],
    upgrades: {},
    ratings: {},
  };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  const o = raw as Record<string, unknown>;
  if (o.version !== undefined && o.version !== 0 && o.version !== 1) return out;
  const integer = (v: unknown): number =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
  out.legacyCredited = o.legacyCredited === true;
  if (Array.isArray(o.legacyPending))
    out.legacyPending = [
      ...new Set(
        o.legacyPending.filter(
          (s): s is string => typeof s === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(s),
        ),
      ),
    ];
  out.points = integer(o.points ?? o.rp);
  out.lifetime = Math.max(out.points, integer(o.lifetime ?? o.rp));
  if (Array.isArray(o.awarded))
    out.awarded = [
      ...new Set(o.awarded.filter((k): k is string => typeof k === 'string' && k.length <= 300)),
    ];
  for (const field of ['upgrades', 'ratings'] as const) {
    const map = o[field];
    if (map && typeof map === 'object' && !Array.isArray(map))
      for (const [key, value] of Object.entries(map))
        if (/^[a-z0-9-]+$/.test(key)) out[field][key] = Math.min(3, integer(value));
  }
  // Stable reward tokens prove earned RP even when either balance is damaged.
  // Purchases explain the gap between spendable RP and lifetime research.
  const earned = out.awarded.reduce((sum, token) => {
    const colon = token.indexOf(':');
    const kind = token.slice(0, colon) as keyof typeof PROGRESS_CONFIG.rewards;
    return (
      sum +
      (colon > 0 && token.length > colon + 1 && Object.hasOwn(PROGRESS_CONFIG.rewards, kind)
        ? PROGRESS_CONFIG.rewards[kind]
        : 0)
    );
  }, 0);
  const spent = UPGRADES.reduce((sum, upgrade) => {
    const level = Math.min(out.upgrades[upgrade.id] ?? 0, upgrade.costs.length);
    if (Object.hasOwn(out.upgrades, upgrade.id)) out.upgrades[upgrade.id] = level;
    return sum + upgrade.costs.slice(0, level).reduce((cost, value) => cost + value, 0);
  }, 0);
  out.lifetime = Math.max(out.lifetime, earned, out.points + spent);
  out.points = Math.max(out.points, earned - spent);
  const rawPoints = o.points ?? o.rp;
  if (typeof rawPoints !== 'number' || !Number.isFinite(rawPoints) || rawPoints < 0)
    out.points = Math.max(0, out.lifetime - spent);
  return out;
}
export class ProgressSave {
  readonly readOnly: boolean;
  readonly storage: SettingsStorage | null;
  private data: ProgressRecord;
  constructor(storage: SettingsStorage | null = safeStorage()) {
    this.storage = storage;
    let raw: unknown = null;
    try {
      raw = JSON.parse(storage?.getItem(PROGRESS_STORAGE_KEY) ?? 'null');
    } catch {
      /* Session only. */
    }
    const version = (raw as { version?: unknown } | null)?.version;
    this.readOnly = typeof version === 'number' && version > PROGRESS_VERSION;
    this.data = migrateProgress(raw);
  }
  get(): ProgressRecord {
    return structuredClone(this.data);
  }
  save(data: ProgressRecord): void {
    this.data = migrateProgress(data);
    if (this.readOnly) return;
    try {
      this.storage?.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      /* Session only. */
    }
  }
}
