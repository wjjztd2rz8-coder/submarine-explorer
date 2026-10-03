/**
 * Per-browser discovery persistence (plan/PHASE-B-CONTRACTS.md §3).
 *
 * localStorage key `subexplorer.discoveries.v1`, JSON:
 *
 *     { version: 1,
 *       discovered: { "<landmark>/<poiId>": { at: ISOString, count: n } },
 *       stats: { scans: n, firstAt?: ISOString } }
 *
 * `migrate()` upgrades anything older or malformed into that shape, so a stale
 * or hand-edited save can never brick the game. Storage is injectable for
 * tests and every access is guarded: with no localStorage (privacy mode,
 * quota, Node) the store still works, it just does not persist.
 */

export const DISCOVERY_STORAGE_KEY = 'subexplorer.discoveries.v1';
export const DISCOVERY_VERSION = 1;

export interface DiscoveryRecord {
  /** ISO time of the FIRST successful scan. */
  at: string;
  /** Number of completed scans, including the first. */
  count: number;
}

export interface DiscoveryStats {
  /** Completed scans across all POIs. */
  scans: number;
  /** ISO time of the first discovery ever made in this browser. */
  firstAt?: string;
}

export interface DiscoveryData {
  version: 1;
  discovered: Record<string, DiscoveryRecord>;
  stats: DiscoveryStats;
}

/** The subset of `Storage` the store uses. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function discoveryKey(landmarkId: string, poiId: string): string {
  return `${landmarkId}/${poiId}`;
}

export function emptyDiscoveryData(): DiscoveryData {
  return { version: 1, discovered: {}, stats: { scans: 0 } };
}

function isoOr(v: unknown, fallback: string): string {
  return typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : fallback;
}

function sanitizeRecord(v: unknown, fallbackAt: string): DiscoveryRecord | null {
  if (v === true) return { at: fallbackAt, count: 1 };
  if (typeof v === 'string') return { at: isoOr(v, fallbackAt), count: 1 };
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  const count =
    typeof o.count === 'number' && Number.isFinite(o.count) && o.count >= 1
      ? Math.floor(o.count)
      : 1;
  return { at: isoOr(o.at ?? o.first ?? o.time, fallbackAt), count };
}

/**
 * Upgrade any previous shape into the current one. Understood inputs:
 * - current v1 (sanitised field by field);
 * - "v0": a bare array of `"<landmark>/<poi>"` keys, or `{ discovered: [...] }`
 *   / `{ discoveries: [...] }` with such keys, or a key -> ISO/true map
 *   (first-discovery time unknown, so `fallbackAt` is used);
 * - anything else (garbage, a newer version we cannot read) -> empty.
 * A newer version is not overwritten by accident: see {@link DiscoveryStore}.
 */
export function migrate(raw: unknown, fallbackAt = new Date().toISOString()): DiscoveryData {
  const out = emptyDiscoveryData();
  const addKeys = (keys: unknown[]): void => {
    for (const k of keys) {
      if (typeof k === 'string' && k.includes('/'))
        out.discovered[k] = { at: fallbackAt, count: 1 };
    }
  };
  const addMap = (map: Record<string, unknown>): void => {
    for (const [k, v] of Object.entries(map)) {
      if (!k.includes('/')) continue;
      const rec = sanitizeRecord(v, fallbackAt);
      if (rec) out.discovered[k] = rec;
    }
  };

  if (Array.isArray(raw)) {
    addKeys(raw);
  } else if (typeof raw === 'object' && raw !== null) {
    const o = raw as Record<string, unknown>;
    if (typeof o.version === 'number' && o.version > DISCOVERY_VERSION) return out;
    const d = o.discovered ?? o.discoveries;
    if (Array.isArray(d)) addKeys(d);
    else if (typeof d === 'object' && d !== null) addMap(d as Record<string, unknown>);
    else if (o.version === undefined || o.version === 0) addMap(o);
    const s = o.stats;
    if (typeof s === 'object' && s !== null) {
      const so = s as Record<string, unknown>;
      if (typeof so.scans === 'number' && Number.isFinite(so.scans) && so.scans >= 0)
        out.stats.scans = Math.floor(so.scans);
      if (typeof so.firstAt === 'string') out.stats.firstAt = isoOr(so.firstAt, fallbackAt);
    }
  }
  // Keep stats consistent with the records they summarise.
  const records = Object.values(out.discovered);
  const minScans = records.reduce((n, r) => n + r.count, 0);
  if (out.stats.scans < minScans) out.stats.scans = minScans;
  if (!out.stats.firstAt && records.length) {
    out.stats.firstAt = records.map((r) => r.at).sort()[0];
  }
  return out;
}

export interface RecordResult {
  firstTime: boolean;
  record: DiscoveryRecord;
}

function defaultStorage(): StorageLike | null {
  try {
    return (globalThis as { localStorage?: StorageLike }).localStorage ?? null;
  } catch {
    return null; // accessing localStorage throws in some privacy modes
  }
}

export class DiscoveryStore {
  private data: DiscoveryData;
  private readonly storage: StorageLike | null;
  private readonly now: () => Date;
  /** Set when the saved blob is from a newer build: we read nothing and never overwrite it. */
  readonly readOnly: boolean = false;

  /**
   * @param storage `undefined` = `globalThis.localStorage` if present;
   *   `null` = in-memory only.
   */
  constructor(storage?: StorageLike | null, now: () => Date = () => new Date()) {
    this.storage = storage === undefined ? defaultStorage() : storage;
    this.now = now;
    let raw: unknown = null;
    try {
      const text = this.storage?.getItem(DISCOVERY_STORAGE_KEY) ?? null;
      raw = text ? (JSON.parse(text) as unknown) : null;
    } catch {
      raw = null; // unreadable storage or corrupt JSON: start empty
    }
    if (
      typeof raw === 'object' &&
      raw !== null &&
      typeof (raw as { version?: unknown }).version === 'number' &&
      ((raw as { version: number }).version ?? 0) > DISCOVERY_VERSION
    ) {
      this.readOnly = true;
    }
    this.data = migrate(raw, this.now().toISOString());
  }

  /** Mark a POI as scanned. Returns whether this was its first discovery. */
  record(landmarkId: string, poiId: string): RecordResult {
    const key = discoveryKey(landmarkId, poiId);
    const existing = this.data.discovered[key];
    const at = this.now().toISOString();
    let record: DiscoveryRecord;
    if (existing) {
      existing.count += 1;
      record = existing;
    } else {
      record = { at, count: 1 };
      this.data.discovered[key] = record;
      if (!this.data.stats.firstAt) this.data.stats.firstAt = at;
    }
    this.data.stats.scans += 1;
    this.save();
    return { firstTime: !existing, record: { ...record } };
  }

  isDiscovered(landmarkId: string, poiId: string): boolean {
    return discoveryKey(landmarkId, poiId) in this.data.discovered;
  }

  get(landmarkId: string, poiId: string): DiscoveryRecord | null {
    const r = this.data.discovered[discoveryKey(landmarkId, poiId)];
    return r ? { ...r } : null;
  }

  /** POI ids discovered at one landmark, in first-discovery order. */
  discoveredFor(landmarkId: string): string[] {
    const prefix = `${landmarkId}/`;
    return Object.entries(this.data.discovered)
      .filter(([k]) => k.startsWith(prefix))
      .sort((a, b) => a[1].at.localeCompare(b[1].at))
      .map(([k]) => k.slice(prefix.length));
  }

  /** Every discovery key (`<landmark>/<poi>`). */
  keys(): string[] {
    return Object.keys(this.data.discovered);
  }

  get stats(): DiscoveryStats {
    return { ...this.data.stats };
  }

  /** A deep copy of the persisted document (for debugging / e2e). */
  snapshot(): DiscoveryData {
    return JSON.parse(JSON.stringify(this.data)) as DiscoveryData;
  }

  /** Forget everything, including the saved copy. */
  reset(): void {
    this.data = emptyDiscoveryData();
    if (this.readOnly) return;
    try {
      this.storage?.removeItem(DISCOVERY_STORAGE_KEY);
    } catch {
      // not fatal
    }
  }

  private save(): void {
    if (!this.storage || this.readOnly) return;
    try {
      this.storage.setItem(DISCOVERY_STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // Quota / privacy mode: progress lives for this session only.
    }
  }
}
