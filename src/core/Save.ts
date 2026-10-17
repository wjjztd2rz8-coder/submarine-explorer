/** Versioned player settings and v1 display migration. Gameplay presets live in Config. */
import type {
  GameConfig,
  GameplayOptions,
  GraphicsTierSetting,
  SonarPaletteName,
} from './Config.js';
import { DEFAULT_AUDIO } from './config/audio.js';
import { LEGACY_REWARDS, LEGACY_PURCHASE_COSTS } from './LegacyProgress.js';
import {
  COSMETIC_CHOICES,
  HERO_SITES,
  totalStars,
  defaultCosmetics,
  sanitizeCosmetics,
  isDiscoveryAward,
  type CosmeticSelection,
} from '../game/Cosmetics.js';
import type { EventBus } from './EventBus.js';

export const SETTINGS_STORAGE_KEY = 'subexplorer.settings.v3';
export const SETTINGS_VERSION = 3;
const LEGACY_SETTINGS_KEYS = ['subexplorer.settings.v2', 'subexplorer.settings.v1'];
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
  reduceMotion: boolean;
  captions: boolean;
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  muted: boolean;
  sonarPalette: SonarPaletteName;
  uiScale: number;
  /** How nearing the hull's rated depth is shown (never screen shake). */
  hullWarningStyle: HullWarningStyle;
  gameplayMode: GameplayMode;
  gameplayBaseMode: Exclude<GameplayMode, 'custom'>;
  gameplay: GameplayOptions;
}
export type SettingKey = keyof SettingsValues;
export interface SettingsData extends SettingsValues {
  version: 3;
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
const TIERS: readonly GraphicsTierSetting[] = ['auto', 'low', 'medium', 'high'];
const DISPLAY_KEYS = [
  'graphicsTier',
  'postFx',
  'detailStrength',
  'reduceMotion',
  'captions',
  'masterVolume',
  'sfxVolume',
  'musicVolume',
  'muted',
  'sonarPalette',
] as const;
const GAMEPLAY_KEYS = ['visualHints', 'startPosition', 'batteryOxygen', 'currents'] as const;
const REMOVED_GAMEPLAY_KEYS = [
  'speedProfile',
  'descentProfile',
  'lights',
  'sensors',
  'sonarMarkers',
  'simSpeed',
];
export const SETTING_KEYS: readonly SettingKey[] = [
  ...DISPLAY_KEYS,
  'uiScale',
  'hullWarningStyle',
  'gameplayMode',
  'gameplayBaseMode',
  'gameplay',
];

export function defaultSettings(config: SettingsConfigSource): SettingsData {
  const d = config.settings.defaults;
  return {
    version: 3,
    graphicsTier: config.graphicsTier,
    postFx: d.postFx,
    detailStrength: config.terrain.detailStrength,
    reduceMotion: d.reduceMotion,
    captions: d.captions,
    masterVolume: config.audio?.masterVolume ?? DEFAULT_AUDIO.masterVolume,
    sfxVolume: config.audio?.sfxVolume ?? DEFAULT_AUDIO.sfxVolume,
    musicVolume: config.audio?.musicVolume ?? DEFAULT_AUDIO.musicVolume,
    muted: false,
    sonarPalette: d.sonarPalette,
    uiScale: 100,
    hullWarningStyle: 'both',
    gameplayMode: 'arcade',
    gameplayBaseMode: 'arcade',
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
      // The removed Ultra tier maps to High, the closest remaining tier.
      if (value === 'ultra') return 'high';
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
    case 'sonarPalette':
      return typeof value === 'string' && Object.hasOwn(config.sonarPalettes, value)
        ? value
        : fallback;
  }
}
function sanitizeGameplay(
  raw: unknown,
  config: SettingsConfigSource,
  baseMode: 'arcade' | 'realistic',
): GameplayOptions {
  const fallback = config.settings.gameplayPresets[baseMode];
  const source =
    raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const result = { ...source, ...fallback } as GameplayOptions;
  for (const key of REMOVED_GAMEPLAY_KEYS)
    delete (result as unknown as Record<string, unknown>)[key];
  for (const key of GAMEPLAY_KEYS) {
    const value =
      key === 'currents' && (source[key] === 'gentle' || source[key] === 'exaggerated')
        ? 'realistic'
        : source[key];
    const choices = config.settings.gameplayOptions[key] as readonly unknown[];
    if (choices.includes(value)) (result as unknown as Record<string, unknown>)[key] = value;
  }
  return result;
}
/** Preserve extensions while migrating known settings and retiring removed controls. */
export function migrate(raw: unknown, config: SettingsConfigSource): SettingsData {
  let out = defaultSettings(config);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  const value = raw as Record<string, unknown>;
  if (value.version !== undefined && ![0, 1, 2, 3].includes(value.version as number)) return out;
  out = { ...value, ...defaultSettings(config) };
  delete (out as unknown as Record<string, unknown>).simSpeedDefault;
  delete (out as unknown as Record<string, unknown>).controlTips;
  for (const key of DISPLAY_KEYS) {
    if (key in value)
      (out as unknown as Record<string, unknown>)[key] = sanitizeDisplay(
        key,
        value[key],
        out[key],
        config,
      );
  }
  out.gameplay = {
    ...sanitizeGameplay(value.gameplay, config, 'arcade'),
    ...config.settings.gameplayPresets.arcade,
  };
  if (value.version === 2 || value.version === 3) {
    const legacy = value.gameplay as Record<string, unknown> | null;
    out.gameplayBaseMode =
      value.gameplayBaseMode === 'realistic' ||
      (value.gameplayBaseMode === undefined && legacy?.speedProfile === 'research')
        ? 'realistic'
        : 'arcade';
    if (HULL_WARNING_STYLES.includes(value.hullWarningStyle as HullWarningStyle))
      out.hullWarningStyle = value.hullWarningStyle as HullWarningStyle;
    if (typeof value.uiScale === 'number' && Number.isFinite(value.uiScale))
      out.uiScale = Math.max(80, Math.min(150, Math.round(value.uiScale)));
    if (value.gameplayMode === 'arcade' || value.gameplayMode === 'realistic') {
      out.gameplayMode = value.gameplayMode;
      out.gameplayBaseMode = value.gameplayMode;
      out.gameplay = {
        ...sanitizeGameplay(value.gameplay, config, value.gameplayMode),
        ...config.settings.gameplayPresets[value.gameplayMode],
      };
    } else if (value.gameplayMode === 'custom') {
      out.gameplayMode = 'custom';
      out.gameplay = sanitizeGameplay(value.gameplay, config, out.gameplayBaseMode);
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
  private storageReadFailed = false;
  private reloadSafe_ = true;
  constructor(private readonly options: SaveOptions) {
    this.config = { ...options.config, terrain: { ...options.config.terrain } };
    this.storage = options.storage !== undefined ? options.storage : safeStorage();
    this.data = defaultSettings(this.config);
    this.load();
  }
  load(): SettingsData {
    this.storageReadFailed = false;
    const read = (key: string): string | null => {
      try {
        return this.storage?.getItem(key) ?? null;
      } catch {
        this.storageReadFailed = true;
        return null;
      }
    };
    let raw: unknown = null;
    let absent = true;
    try {
      const text = read(SETTINGS_STORAGE_KEY);
      absent = text === null;
      if (text) raw = JSON.parse(text);
    } catch {
      /* Storage or JSON is hostile; use defaults. */
    }
    const version = (raw as { version?: unknown } | null)?.version;
    this.readOnly = typeof version === 'number' && version > SETTINGS_VERSION;
    this.reloadSafe_ = !this.readOnly && !this.storageReadFailed;
    if (this.readOnly)
      console.warn(
        `[save] ${SETTINGS_STORAGE_KEY} is version ${version}; using defaults and not overwriting it`,
      );
    let recoveredLegacy = false;
    const isCandidate = (candidate: unknown): candidate is Record<string, unknown> => {
      if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return false;
      const v = (candidate as Record<string, unknown>).version;
      return (
        v === undefined ||
        [0, 1, 2, 3].includes(v as number) ||
        (typeof v === 'number' && v > SETTINGS_VERSION)
      );
    };
    if (!this.readOnly && !isCandidate(raw)) {
      for (const key of LEGACY_SETTINGS_KEYS) {
        try {
          const legacy = read(key);
          const candidate: unknown = legacy ? JSON.parse(legacy) : null;
          if (isCandidate(candidate)) {
            raw = candidate;
            recoveredLegacy = true;
            break;
          }
        } catch {
          // Try the next older key when a legacy blob is damaged.
        }
      }
      const legacyVersion = (raw as { version?: unknown } | null)?.version;
      if (typeof legacyVersion === 'number' && legacyVersion > SETTINGS_VERSION) {
        this.readOnly = true;
        this.reloadSafe_ = false;
      }
    }
    this.data = migrate(raw, this.config);
    if (this.storageReadFailed) this.reloadSafe_ = false;
    const migrated =
      version !== SETTINGS_VERSION || JSON.stringify(raw) !== JSON.stringify(this.data);
    if ((absent || recoveredLegacy || migrated) && !this.readOnly) this.persist();
    return this.get();
  }
  get(): SettingsData {
    return structuredClone(this.data);
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
      gameplayBaseMode: mode === 'custom' ? this.data.gameplayBaseMode : mode,
      gameplay:
        mode === 'custom'
          ? { ...this.data.gameplay }
          : { ...this.data.gameplay, ...this.config.settings.gameplayPresets[mode] },
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
        ? { ...this.data.gameplay, ...this.config.settings.gameplayPresets[partial.gameplayMode] }
        : { ...this.data.gameplay, ...partial.gameplay };
    return this.commit({
      ...this.data,
      ...partial,
      gameplayMode: mode,
      gameplayBaseMode:
        mode === 'custom' ? (partial.gameplayBaseMode ?? this.data.gameplayBaseMode) : mode,
      gameplay,
    });
  }
  reset(): SettingsData {
    // Persist defaults in v3. Removing the key would re-import old v1 choices
    // on the next launch while the legacy key is intentionally preserved.
    const defaults = defaultSettings(this.config);
    return this.commit({
      ...this.data,
      ...defaults,
      gameplay: { ...this.data.gameplay, ...defaults.gameplay },
    });
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
    // A failed read cannot prove the key absent; writes might still succeed
    // and erase intact preferences, including a protected future version.
    if (!this.storage || this.readOnly || this.storageReadFailed) return;
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
export const PROGRESS_VERSION = 2;
export interface LegacyEvidence {
  site: string;
  keys: string[];
  bonus: boolean;
}
export interface ProgressRecord {
  version: 2;
  cosmeticGrants: string[];
  legacyCredited: boolean;
  legacyPending?: (string | LegacyEvidence)[];
  points: number;
  lifetime: number;
  awarded: string[];
  upgrades: Record<string, number>;
  ratings: Record<string, number>;
  cosmetics: CosmeticSelection;
  /** Highest earned streak keeps cosmetic rewards after a missed day. */
  dailyBestStreak: number;
}
export function migrateProgress(raw: unknown): ProgressRecord {
  const out: ProgressRecord = {
    version: 2,
    cosmeticGrants: [],
    legacyCredited: false,
    points: 0,
    lifetime: 0,
    awarded: [],
    upgrades: {},
    ratings: {},
    cosmetics: defaultCosmetics(),
    dailyBestStreak: 0,
  };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  const o = raw as Record<string, unknown>;
  if (o.version !== undefined && o.version !== 0 && o.version !== 1 && o.version !== 2) return out;
  const integer = (v: unknown): number =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
  out.legacyCredited = o.legacyCredited === true;
  out.dailyBestStreak = Number.isSafeInteger(o.dailyBestStreak)
    ? Math.max(0, Number(o.dailyBestStreak))
    : 0;
  if (Array.isArray(o.legacyPending)) {
    out.legacyPending = [];
    const seen = new Set<string>();
    for (const entry of o.legacyPending) {
      const site = typeof entry === 'string' ? entry : entry?.site;
      if (typeof site !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(site) || seen.has(site))
        continue;
      seen.add(site);
      if (typeof entry === 'string') out.legacyPending.push(site);
      else if (Array.isArray(entry.keys) && typeof entry.bonus === 'boolean')
        out.legacyPending.push({
          site,
          keys: [
            ...new Set(
              entry.keys.filter(
                (key: unknown): key is string =>
                  typeof key === 'string' && key.startsWith(`${site}/`),
              ),
            ),
          ] as string[],
          bonus: entry.bonus,
        });
    }
  }
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
        if ((field === 'ratings' ? /^[A-Za-z0-9_-]{1,64}$/ : /^[a-z0-9-]+$/).test(key))
          Object.defineProperty(out[field], key, {
            value: Math.min(3, integer(value)),
            enumerable: true,
            writable: true,
            configurable: true,
          });
  }
  // Star reward tokens also prove best ratings if the summary map was damaged.
  for (const token of out.awarded) {
    const rating = /^rating:([A-Za-z0-9_-]{1,64})\/([1-3])$/.exec(token);
    if (!rating) continue;
    const site = rating[1];
    const best = Object.hasOwn(out.ratings, site) ? out.ratings[site] : 0;
    out.ratings = { ...out.ratings, [site]: Math.max(best, Number(rating[2])) };
  }
  // Stable reward tokens prove earned RP even when either balance is damaged.
  // Purchases explain the gap between spendable RP and lifetime research.
  const earned = out.awarded.reduce((sum, token) => {
    const colon = token.indexOf(':');
    const kind = token.slice(0, colon) as keyof typeof LEGACY_REWARDS;
    if (['poi', 'species', 'sample', 'secret'].includes(kind) && !isDiscoveryAward(token))
      return sum;
    return (
      sum +
      (colon > 0 && token.length > colon + 1 && Object.hasOwn(LEGACY_REWARDS, kind)
        ? LEGACY_REWARDS[kind]
        : 0)
    );
  }, 0);
  const spent = Object.entries(LEGACY_PURCHASE_COSTS).reduce((sum, [id, costs]) => {
    const level = Math.min(out.upgrades[id] ?? 0, costs.length);
    if (Object.hasOwn(out.upgrades, id)) out.upgrades[id] = level;
    return sum + costs.slice(0, level).reduce((cost, value) => cost + value, 0);
  }, 0);
  if (o.version !== 2) {
    out.lifetime = Math.max(out.lifetime, earned, out.points + spent);
    out.points = Math.max(out.points, earned - spent);
    const rawPoints = o.points ?? o.rp;
    if (typeof rawPoints !== 'number' || !Number.isFinite(rawPoints) || rawPoints < 0)
      out.points = Math.max(0, out.lifetime - spent);
  }
  if (Array.isArray(o.cosmeticGrants))
    out.cosmeticGrants = o.cosmeticGrants.filter(
      (grant): grant is string =>
        typeof grant === 'string' &&
        Object.entries(COSMETIC_CHOICES).some(([slot, choices]) =>
          choices.some((def) => grant === `${slot}:${def.id}`),
        ),
    );
  // Convert old RP (including spent purchases) and every previously earned cosmetic once.
  if (o.version !== 2) {
    const stars = totalStars(out);
    const oldPaintStars: Record<string, number> = { red: 3, blue: 6, green: 10, gold: 15 };
    for (const [slot, choices] of Object.entries(COSMETIC_CHOICES))
      for (const def of choices) {
        const rp =
          def.reward.kind === 'discoveries'
            ? def.reward.total * 10
            : def.reward.kind === 'secret'
              ? 150
              : Infinity;
        const oldEarned =
          (slot === 'paint' &&
            ((Object.hasOwn(oldPaintStars, def.id) && stars >= oldPaintStars[def.id]) ||
              (def.id === 'orange' &&
                HERO_SITES.some(
                  (site) => Object.hasOwn(out.ratings, site) && out.ratings[site] >= 3,
                )) ||
              (def.id === 'silver' && out.dailyBestStreak >= 3))) ||
          (slot === 'trim' && def.id === 'blue' && out.dailyBestStreak >= 3);
        if (out.lifetime >= rp || oldEarned) out.cosmeticGrants.push(`${slot}:${def.id}`);
      }
  }
  out.cosmeticGrants = [...new Set(out.cosmeticGrants)];
  out.cosmetics = sanitizeCosmetics(o.cosmetics, out);
  return out;
}
export class ProgressSave {
  readonly readOnly: boolean;
  readonly storage: SettingsStorage | null;
  private data: ProgressRecord;
  constructor(storage: SettingsStorage | null = safeStorage()) {
    let raw: unknown = null;
    let text: string | null = null;
    let readFailed = false;
    try {
      text = storage?.getItem(PROGRESS_STORAGE_KEY) ?? null;
    } catch {
      readFailed = true;
    }
    // Keep session rewards usable without risking an unreadable persisted save.
    this.storage = readFailed ? null : storage;
    try {
      raw = JSON.parse(text ?? 'null');
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
