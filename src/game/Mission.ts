/**
 * Mission flow core (B3, D-FLOW): the `mission.json` schema
 * (plan/PHASE-B-CONTRACTS.md §2.4), its validator/loader, the
 * `data/landmarks/index.json` manifest, and the {@link Mission} state machine
 * that turns `scan:complete` events into objective progress. Finishing the
 * primary objectives (`completion: "all_primary"`) no longer ends the dive:
 * the player keeps exploring until they choose to surface
 * (plan/PHASE-D-CONTRACTS.md §4).
 *
 * Pure TS: no DOM, no Three.js. The DOM overlays (Briefing, ObjectivesPanel,
 * the debrief) and the engine wiring live in MissionRouter.ts.
 *
 * Objectives count scans made *during this dive*, not the persisted discovery
 * store (the Journal): a player who already found the bow last week still has
 * to dive to it again for the mission to complete (docs/missions.md).
 */

import type { EventBus, GameEvents } from '../core/EventBus.js';
import { CONTENT_ROOT, contentUrl, fetchContentJson, isSafeLandmarkId } from './ContentPath.js';
import type { FetchJson } from './ContentPath.js';

// ------------------------------------------------------------------- schema

export interface MissionSpawn {
  lat: number;
  lon: number;
  /** Positive metres. 5 = a surface start. */
  depth_m: number;
  /** Compass heading, 0 = north, 90 = east. */
  heading_deg: number;
}

export interface MissionStart {
  near_site?: MissionSpawn;
}

export interface MissionBriefing {
  summary: string;
  /** Positive metres; the target depth shown on the card. */
  depth_m?: number;
  facts: string[];
  hazards: string[];
  memorial_note?: string;
}

export interface MissionObjectiveDef {
  id: string;
  type: 'scan';
  /** POI id in the landmark's pois.json. */
  poi: string;
  primary: boolean;
  title: string;
  /** What the target is and roughly where (D-CONTENT). Empty when the file has none. */
  hint: string;
}

export type CompletionRule = 'all_primary';

export interface MissionDef {
  version: number;
  /** The mission id: the content folder name used in `?mission=<id>`. */
  id: string;
  landmark: string;
  tile: string;
  title: string;
  hull_class?: string;
  spawn: MissionSpawn;
  /** Optional authored near-site pose; otherwise the first primary POI determines it. */
  start?: MissionStart;
  briefing: MissionBriefing;
  objectives: MissionObjectiveDef[];
  completion: CompletionRule;
}

export type Warn = (message: string) => void;
const defaultWarn: Warn = (m) => console.warn(`[mission] ${m}`);

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.filter(isStr) : []);

/**
 * Validate a parsed `mission.json`. Returns null when the document is unusable
 * (no valid spawn, no valid objective); drops individual malformed objectives
 * with a warning. `id` is the folder the file came from; `landmark` and `tile`
 * default to it.
 */
export function parseMission(
  doc: unknown,
  id: string,
  warn: Warn = defaultWarn,
): MissionDef | null {
  if (!isObj(doc)) {
    warn(`${id}: mission.json is not an object`);
    return null;
  }
  const version = isNum(doc.version) ? doc.version : 1;
  if (version > 1) warn(`${id}: mission.json version ${version} is newer than this build (1)`);

  const landmark = isStr(doc.landmark) && isSafeLandmarkId(doc.landmark) ? doc.landmark : id;
  const tile = isStr(doc.tile) && isSafeLandmarkId(doc.tile) ? doc.tile : landmark;

  const sp = doc.spawn;
  if (!isObj(sp) || !isNum(sp.lat) || !isNum(sp.lon)) {
    warn(`${id}: spawn needs numeric lat and lon`);
    return null;
  }
  if (Math.abs(sp.lat) > 90 || Math.abs(sp.lon) > 180) {
    warn(`${id}: spawn lat/lon out of range`);
    return null;
  }
  const spawn: MissionSpawn = {
    lat: sp.lat,
    lon: sp.lon,
    // Positive magnitude (contracts §1); a negative value is a sign slip, not a height.
    depth_m: isNum(sp.depth_m) ? Math.abs(sp.depth_m) : 5,
    heading_deg: isNum(sp.heading_deg) ? ((sp.heading_deg % 360) + 360) % 360 : 0,
  };

  const b = isObj(doc.briefing) ? doc.briefing : {};
  const briefing: MissionBriefing = {
    summary: isStr(b.summary) ? b.summary : '',
    facts: strList(b.facts),
    hazards: strList(b.hazards),
  };
  if (isNum(b.depth_m)) briefing.depth_m = Math.abs(b.depth_m);
  if (isStr(b.memorial_note)) briefing.memorial_note = b.memorial_note;

  const objectives: MissionObjectiveDef[] = [];
  const seen = new Set<string>();
  const rawObjectives = Array.isArray(doc.objectives) ? doc.objectives : [];
  rawObjectives.forEach((o, i) => {
    if (!isObj(o) || !isStr(o.id) || !isStr(o.poi)) {
      warn(`${id}: objectives[${i}] needs string id and poi; skipped`);
      return;
    }
    if (o.type !== undefined && o.type !== 'scan') {
      warn(`${id}: objective "${o.id}" has unsupported type "${String(o.type)}"; skipped`);
      return;
    }
    if (seen.has(o.id)) {
      warn(`${id}: duplicate objective id "${o.id}"; skipped`);
      return;
    }
    seen.add(o.id);
    objectives.push({
      id: o.id,
      type: 'scan',
      poi: o.poi,
      primary: o.primary !== false,
      title: isStr(o.title) ? o.title : o.id,
      hint: isStr(o.hint) ? o.hint.trim() : '',
    });
  });
  if (!objectives.length) {
    warn(`${id}: no valid objectives`);
    return null;
  }

  if (doc.completion !== undefined && doc.completion !== 'all_primary') {
    warn(`${id}: completion "${String(doc.completion)}" unsupported; using all_primary`);
  }

  const def: MissionDef = {
    version,
    id,
    landmark,
    tile,
    title: isStr(doc.title) ? doc.title : id,
    spawn,
    briefing,
    objectives,
    completion: 'all_primary',
  };
  if (isStr(doc.hull_class)) def.hull_class = doc.hull_class;
  if (isObj(doc.start)) {
    const near = doc.start.near_site;
    if (
      isObj(near) &&
      isNum(near.lat) &&
      Math.abs(near.lat) <= 90 &&
      isNum(near.lon) &&
      Math.abs(near.lon) <= 180 &&
      isNum(near.depth_m) &&
      near.depth_m > 0 &&
      isNum(near.heading_deg)
    ) {
      def.start = {
        near_site: {
          lat: near.lat,
          lon: near.lon,
          depth_m: near.depth_m,
          heading_deg: ((near.heading_deg % 360) + 360) % 360,
        },
      };
    } else if (near !== undefined) warn(`${id}: invalid start.near_site; computing a safe pose`);
  } else if (doc.start !== undefined) warn(`${id}: invalid start; computing a safe pose`);
  return def;
}

/** Fetch + validate `/data/landmarks/<id>/mission.json`. Null if missing or invalid. */
export async function loadMission(
  id: string,
  fetchFn?: FetchJson,
  warn: Warn = defaultWarn,
): Promise<MissionDef | null> {
  if (!isSafeLandmarkId(id)) {
    warn(`?mission=${id}: not a valid content id`);
    return null;
  }
  const doc = await fetchContentJson(contentUrl(id, 'mission.json'), fetchFn);
  if (doc === null) {
    warn(`${id}: no mission.json`);
    return null;
  }
  return parseMission(doc, id, warn);
}

/** URL of the manifest of content folders that carry a mission.json. */
export const MISSION_INDEX_URL = `${CONTENT_ROOT}/index.json`;

/** Parse `data/landmarks/index.json`: `{ version: 1, landmarks: ["titanic", ...] }`. */
export function parseMissionIndex(doc: unknown): string[] {
  const list = isObj(doc) && Array.isArray(doc.landmarks) ? doc.landmarks : [];
  const out: string[] = [];
  for (const v of list) {
    if (typeof v === 'string' && isSafeLandmarkId(v) && !out.includes(v)) out.push(v);
  }
  return out;
}

/** What the mission-select list shows for one mission. */
export interface MissionSummary {
  id: string;
  title: string;
  summary: string;
  depthM: number | null;
  tile: string;
}

/**
 * Load the manifest and every listed mission.json, in manifest order. Missing
 * or invalid missions are skipped. Never throws.
 */
export async function loadMissionSummaries(
  fetchFn?: FetchJson,
  warn: Warn = defaultWarn,
): Promise<MissionSummary[]> {
  const ids = parseMissionIndex(await fetchContentJson(MISSION_INDEX_URL, fetchFn));
  const defs = await Promise.all(ids.map((id) => loadMission(id, fetchFn, warn)));
  return defs
    .filter((d): d is MissionDef => d !== null)
    .map((d) => ({
      id: d.id,
      title: d.title,
      summary: d.briefing.summary,
      depthM: d.briefing.depth_m ?? null,
      tile: d.tile,
    }));
}

// ------------------------------------------------------------ state machine

/**
 * `briefing → diving → primaries-complete → debrief`, plus
 * `aborted → debrief` after an emergency ascent (plan/PHASE-D-CONTRACTS.md §4).
 * "Keep exploring" returns from `debrief` to the state the dive was in.
 */
export type MissionState = 'briefing' | 'diving' | 'primaries-complete' | 'debrief' | 'aborted';

/** Why a dive was aborted. Only crush depth for now (plan/DECISIONS.md failure model). */
export type AbortReason = 'crush';

/** Why the debrief opened: a voluntary surface, everything done, or an abort. */
export type EndReason = GameEvents['mission:ended']['reason'];

export interface ObjectiveStatus {
  id: string;
  title: string;
  /** What and roughly where; empty when the content has no hint. */
  hint: string;
  poiId: string;
  primary: boolean;
  complete: boolean;
  /** False when the POI is not in this landmark's pois.json (the objective is ignored). */
  resolved: boolean;
}

/** The bus subset Mission uses (EventBus satisfies it; tests pass a fake). */
export type MissionBus = Pick<EventBus, 'on' | 'emit'>;

export interface MissionOptions {
  def: MissionDef;
  bus: MissionBus;
  warn?: Warn;
}

type MissionEventName =
  | 'mission:started'
  | 'mission:objective'
  | 'mission:primaryComplete'
  | 'mission:complete'
  | 'mission:ended'
  | 'mission:restart'
  | 'mission:aborted';

/** A dive in progress: scans count and the clock runs. */
const DIVING: ReadonlySet<MissionState> = new Set(['diving', 'primaries-complete']);

/**
 * Tracks one mission run. Lifecycle:
 *
 *     briefing --start()--> diving --last primary scanned--> primaries-complete
 *     diving | primaries-complete --end()--> debrief --resume()--> (previous)
 *     diving | primaries-complete --abort('crush')--> aborted --end()--> debrief
 *
 * Nothing finishes the dive automatically. `mission:primaryComplete` fires
 * once per dive, on the scan that completes the last primary. `mission:complete`
 * fires once, on the first voluntary end after that; `mission:ended` fires on
 * every transition into the debrief. `update(dt)` must be fed real (unpaused)
 * seconds; it accumulates the dive duration.
 */
export class Mission {
  readonly def: MissionDef;
  readonly id: string;
  state: MissionState = 'briefing';
  readonly objectives: ObjectiveStatus[];
  /** Seconds spent diving (the briefing and the debrief do not count). */
  elapsedS = 0;
  /** Dive time at the most recent end of the dive; null while diving. */
  durationS: number | null = null;
  /** Why the most recent debrief opened; null until the dive ends. */
  endReason: EndReason | null = null;
  /** Every mission event this instance emitted, oldest first (for tests / `__game`). */
  readonly emitted: Array<{ name: MissionEventName; payload: unknown }> = [];

  /** The state "Keep exploring" returns to; null when the dive cannot resume. */
  private resumeState: MissionState | null = null;
  private completeEmitted = false;
  private readonly listeners: Array<(m: Mission) => void> = [];
  private readonly off: () => void;

  constructor(private readonly opts: MissionOptions) {
    this.def = opts.def;
    this.id = opts.def.id;
    this.objectives = opts.def.objectives.map((o) => ({
      id: o.id,
      title: o.title,
      hint: o.hint,
      poiId: o.poi,
      primary: o.primary,
      complete: false,
      resolved: true,
    }));
    this.off = opts.bus.on('scan:complete', (e) => this.onScan(e.poiId));
  }

  /**
   * Mark objectives whose POI is not in `poiIds` as unresolved: they are shown
   * dimmed and do not block completion. Warns about each one, since it is a
   * content bug (mission.json and pois.json disagree).
   */
  resolve(poiIds: Iterable<string>): void {
    const known = new Set(poiIds);
    const warn = this.opts.warn ?? defaultWarn;
    for (const o of this.objectives) {
      o.resolved = known.has(o.poiId);
      if (!o.resolved) warn(`${this.id}: objective "${o.id}" -> unknown POI "${o.poiId}"`);
    }
    if (!this.requiredPrimaries().length) {
      warn(`${this.id}: no primary objective resolves to a POI; the mission cannot complete`);
    }
  }

  /** Primary objectives that count toward completion. */
  requiredPrimaries(): ObjectiveStatus[] {
    return this.objectives.filter((o) => o.primary && o.resolved);
  }

  /** True when every resolvable primary objective is complete (and there is one). */
  get primaryComplete(): boolean {
    const p = this.requiredPrimaries();
    return p.length > 0 && p.every((o) => o.complete);
  }

  /** True when every resolvable objective, primary or not, is complete (and there is one). */
  get allComplete(): boolean {
    const r = this.objectives.filter((o) => o.resolved);
    return r.length > 0 && r.every((o) => o.complete);
  }

  /** True while the dive is on (scans count, the clock runs). */
  get diving(): boolean {
    return DIVING.has(this.state);
  }

  /** True when the debrief can return to the dive ("Keep exploring"). */
  get canResume(): boolean {
    return this.state === 'debrief' && this.resumeState !== null;
  }

  /** "X of Y objectives": completed and total resolvable objectives. */
  counts(): { completed: number; total: number } {
    const r = this.objectives.filter((o) => o.resolved);
    return { completed: r.filter((o) => o.complete).length, total: r.length };
  }

  /** Close the briefing and begin the dive. Idempotent. */
  start(tileId: string): void {
    if (this.state !== 'briefing') return;
    this.state = 'diving';
    this.emit('mission:started', { missionId: this.id, tileId });
    this.changed();
  }

  /** Called per frame with real seconds (0 while paused). */
  update(dt: number): void {
    if (!this.diving) return;
    this.elapsedS += Math.max(0, dt);
  }

  /**
   * The dive failed (crush depth: the emergency blow has brought the boat
   * back up). Stops the clock, ignores further scans and emits
   * `mission:aborted`. Only a dive in progress can abort; `end()` then opens
   * the debrief, which cannot resume.
   */
  abort(reason: AbortReason): void {
    if (!this.diving) return;
    this.state = 'aborted';
    this.durationS = this.elapsedS;
    this.resumeState = null;
    this.emit('mission:aborted', { missionId: this.id, reason });
    this.changed();
  }

  /**
   * End the dive and move to the debrief: the player surfaced, or an abort
   * finished. Emits `mission:complete` (once per dive, only when the primaries
   * are done and this is not an abort) and then `mission:ended`. Returns false
   * when there is no dive to end.
   */
  end(): boolean {
    const from = this.state;
    if (!DIVING.has(from) && from !== 'aborted') return false;
    const reason: EndReason = from === 'aborted' ? 'abort' : this.allComplete ? 'all' : 'surface';
    this.durationS = this.elapsedS;
    this.endReason = reason;
    this.resumeState = from === 'aborted' ? null : from;
    this.state = 'debrief';
    if (reason !== 'abort' && this.primaryComplete && !this.completeEmitted) {
      this.completeEmitted = true;
      this.emit('mission:complete', { missionId: this.id, durationS: this.elapsedS });
    }
    const { completed, total } = this.counts();
    this.emit('mission:ended', {
      missionId: this.id,
      reason,
      completed,
      total,
      durationS: this.elapsedS,
    });
    this.changed();
    return true;
  }

  /** "Keep exploring": back from the debrief to the dive it interrupted. */
  resume(): boolean {
    if (!this.canResume || !this.resumeState) return false;
    this.state = this.resumeState;
    this.resumeState = null;
    this.durationS = null;
    this.changed();
    return true;
  }

  /** "Dive again": announce the restart and reset to a fresh briefing. */
  restart(): void {
    this.emit('mission:restart', { missionId: this.id });
    this.state = 'briefing';
    this.elapsedS = 0;
    this.durationS = null;
    this.endReason = null;
    this.resumeState = null;
    this.completeEmitted = false;
    for (const o of this.objectives) o.complete = false;
    this.changed();
  }

  /** Subscribe to any state or objective change. Returns an unsubscribe. */
  onChange(fn: (m: Mission) => void): () => void {
    this.listeners.push(fn);
    return () => {
      const i = this.listeners.indexOf(fn);
      if (i >= 0) this.listeners.splice(i, 1);
    };
  }

  dispose(): void {
    this.off();
    this.listeners.length = 0;
  }

  private onScan(poiId: string): void {
    if (!this.diving) return;
    let any = false;
    for (const o of this.objectives) {
      if (o.poiId !== poiId || o.complete || !o.resolved) continue;
      o.complete = true;
      any = true;
      this.emit('mission:objective', { missionId: this.id, objectiveId: o.id, complete: true });
    }
    if (!any) return;
    if (this.state === 'diving' && this.primaryComplete) {
      this.state = 'primaries-complete';
      this.emit('mission:primaryComplete', { missionId: this.id, ...this.counts() });
    }
    this.changed();
  }

  private emit<K extends MissionEventName>(name: K, payload: GameEvents[K]): void {
    this.emitted.push({ name, payload });
    this.opts.bus.emit(name, payload);
  }

  private changed(): void {
    for (const fn of [...this.listeners]) fn(this);
  }
}
