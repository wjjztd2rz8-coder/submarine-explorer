/**
 * Player settings persistence (C5, plan/PHASE-C-CONTRACTS.md §4, docs/settings.md).
 *
 * localStorage key `subexplorer.settings.v1`, JSON:
 *
 *     { version: 1, graphicsTier, postFx, detailStrength, simSpeedDefault,
 *       reduceMotion, captions, sonarPalette, bindings? }
 *
 * `bindings` is only a pointer to the key the action map already persists to
 * (`subexplorer.bindings.v1`, owned by `Input`); discoveries likewise stay in
 * `subexplorer.discoveries.v1` (owned by `DiscoveryStore`). {@link SAVE_KEYS}
 * lists all three so a "reset" screen can find them.
 *
 * Every read and write is guarded: a hostile or missing storage (privacy
 * mode, quota, a throwing getter, corrupt JSON, a newer version) never throws
 * and never bricks the game; the settings simply fall back to the defaults,
 * which come from Config (`graphicsTier`, `terrain.detailStrength`,
 * `settings.defaults`).
 */

import type { GameConfig, GraphicsTier, SonarPaletteName } from './Config.js';

export const SETTINGS_STORAGE_KEY = 'subexplorer.settings.v1';
export const SETTINGS_VERSION = 1;

/** Every localStorage key the game writes. Settings wraps the other two by pointer only. */
export const SAVE_KEYS = {
  settings: SETTINGS_STORAGE_KEY,
  bindings: 'subexplorer.bindings.v1',
  discoveries: 'subexplorer.discoveries.v1',
} as const;

export interface SettingsValues {
  graphicsTier: GraphicsTier;
  postFx: boolean;
  /** Procedural terrain detail on top of the survey data; 0 = survey only. */
  detailStrength: number;
  /** 0 = auto (free dive 1x, missions at their own default), else 1 / 2 / 3. */
  simSpeedDefault: number;
  reduceMotion: boolean;
  captions: boolean;
  sonarPalette: SonarPaletteName;
}

export type SettingKey = keyof SettingsValues;

export interface SettingsData extends SettingsValues {
  version: 1;
  /** Pointer to the bindings key (the action map persists itself there). */
  bindings?: string;
}

/** The subset of `Storage` used. */
export interface SettingsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** What {@link defaultSettings} reads from Config. */
export type SettingsConfigSource = Pick<
  GameConfig,
  'graphicsTier' | 'settings' | 'sonarPalettes'
> & {
  terrain: Pick<GameConfig['terrain'], 'detailStrength'>;
};

const TIERS: readonly GraphicsTier[] = ['low', 'medium', 'high'];

export const SETTING_KEYS: readonly SettingKey[] = [
  'graphicsTier',
  'postFx',
  'detailStrength',
  'simSpeedDefault',
  'reduceMotion',
  'captions',
  'sonarPalette',
];

export function defaultSettings(config: SettingsConfigSource): SettingsData {
  const d = config.settings.defaults;
  return {
    version: 1,
    graphicsTier: config.graphicsTier,
    postFx: d.postFx,
    detailStrength: config.terrain.detailStrength,
    simSpeedDefault: d.simSpeedDefault,
    reduceMotion: d.reduceMotion,
    captions: d.captions,
    sonarPalette: d.sonarPalette,
    bindings: SAVE_KEYS.bindings,
  };
}

/** One field, validated; anything off falls back to the default for that field. */
function sanitizeField<K extends SettingKey>(
  key: K,
  v: unknown,
  fallback: SettingsValues[K],
  config: SettingsConfigSource,
): SettingsValues[K] {
  const s = config.settings;
  switch (key) {
    case 'graphicsTier':
      return (TIERS.includes(v as GraphicsTier) ? v : fallback) as SettingsValues[K];
    case 'postFx':
    case 'reduceMotion':
    case 'captions':
      return (typeof v === 'boolean' ? v : fallback) as SettingsValues[K];
    case 'detailStrength': {
      if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
      return Math.min(s.detailStrengthMax, Math.max(0, v)) as SettingsValues[K];
    }
    case 'simSpeedDefault':
      return (
        typeof v === 'number' && s.simSpeedOptions.includes(v) ? v : fallback
      ) as SettingsValues[K];
    case 'sonarPalette':
      return (
        typeof v === 'string' && Object.hasOwn(config.sonarPalettes, v) ? v : fallback
      ) as SettingsValues[K];
    default:
      return fallback;
  }
}

/**
 * Upgrade any stored shape into the current one. Understood inputs:
 * - v1: sanitised field by field (a bad field falls back alone);
 * - "v0": the same fields with no `version` (hand-edited / pre-release);
 * - anything else (garbage, a non-object, a newer version) -> defaults.
 * A newer version is never overwritten by accident: see {@link Save}.
 */
export function migrate(raw: unknown, config: SettingsConfigSource): SettingsData {
  const out = defaultSettings(config);
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return out;
  const o = raw as Record<string, unknown>;
  const version = o.version;
  if (version !== undefined && version !== 1) return out;
  for (const key of SETTING_KEYS) {
    if (key in o) {
      // One generic assignment per key keeps the per-field types intact.
      (out as unknown as Record<string, unknown>)[key] = sanitizeField(
        key,
        o[key],
        out[key],
        config,
      );
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
  /** Defaults to `window.localStorage` when it exists; `null` = do not persist. */
  storage?: SettingsStorage | null;
}

export type SettingsListener = (settings: SettingsData, changed: SettingKey[]) => void;

export class Save {
  private data: SettingsData;
  private readonly storage: SettingsStorage | null;
  private readonly config: SettingsConfigSource;
  private readonly listeners = new Set<SettingsListener>();
  /** True when the stored copy is a newer version we must not overwrite. */
  private readOnly = false;
  /** Whether the last edit was verified in storage and can survive a reload. */
  private reloadSafe_ = true;

  constructor(options: SaveOptions) {
    // main.ts applies the saved detail to the live terrain config at boot;
    // keep the original defaults so Reset settings still restores that value.
    this.config = { ...options.config, terrain: { ...options.config.terrain } };
    this.storage = options.storage !== undefined ? options.storage : safeStorage();
    this.data = defaultSettings(this.config);
    this.load();
  }

  /** Re-read the stored copy (defaults when absent or unreadable). Never throws. */
  load(): SettingsData {
    let raw: unknown = null;
    try {
      const text = this.storage?.getItem(SETTINGS_STORAGE_KEY) ?? null;
      if (typeof text === 'string' && text) raw = JSON.parse(text);
    } catch {
      raw = null; // throwing getter or corrupt JSON
    }
    const v = (raw as { version?: unknown } | null)?.version;
    this.readOnly = typeof v === 'number' && v > SETTINGS_VERSION;
    this.reloadSafe_ = !this.readOnly;
    if (this.readOnly) {
      console.warn(
        `[save] ${SETTINGS_STORAGE_KEY} is version ${v}; using defaults and not overwriting it`,
      );
    }
    this.data = migrate(raw, this.config);
    return this.get();
  }

  /** A copy of the current settings. */
  get(): SettingsData {
    return { ...this.data };
  }

  get reloadSafe(): boolean {
    return this.reloadSafe_;
  }

  get protectedVersion(): boolean {
    return this.readOnly;
  }

  /** The defaults this save falls back to. */
  defaults(): SettingsData {
    return defaultSettings(this.config);
  }

  /**
   * Merge `partial` (each field validated), persist, and notify listeners
   * with the keys whose value actually changed. Never throws.
   */
  save(partial: Partial<SettingsValues>): SettingsData {
    const next = migrate({ ...this.data, ...partial, version: 1 }, this.config);
    const changed = SETTING_KEYS.filter((k) => next[k] !== this.data[k]);
    this.data = next;
    this.persist();
    if (changed.length) this.emit(changed);
    return this.get();
  }

  /** Back to the defaults; the stored copy is removed. Notifies changed keys. */
  reset(): SettingsData {
    const next = defaultSettings(this.config);
    const changed = SETTING_KEYS.filter((k) => next[k] !== this.data[k]);
    this.data = next;
    if (!this.readOnly) {
      this.reloadSafe_ = false;
      try {
        this.storage?.removeItem(SETTINGS_STORAGE_KEY);
        this.reloadSafe_ = this.storage?.getItem(SETTINGS_STORAGE_KEY) === null;
      } catch {
        // not fatal
      }
    }
    if (changed.length) this.emit(changed);
    return this.get();
  }

  /** Subscribe to changes; returns an unsubscribe function. */
  onChange(listener: SettingsListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(changed: SettingKey[]): void {
    const snapshot = this.get();
    for (const l of [...this.listeners]) {
      try {
        l(snapshot, changed);
      } catch (err) {
        console.error('[save] settings listener threw', err);
      }
    }
  }

  private persist(): void {
    this.reloadSafe_ = false;
    if (!this.storage || this.readOnly) return;
    try {
      const text = JSON.stringify(this.data);
      this.storage.setItem(SETTINGS_STORAGE_KEY, text);
      this.reloadSafe_ = this.storage.getItem(SETTINGS_STORAGE_KEY) === text;
    } catch {
      // Quota / privacy mode: settings live for this session only.
    }
  }
}
