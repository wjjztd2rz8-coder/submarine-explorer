/**
 * `?mission=<id>` routing and the in-game mission flow (B3, docs/missions.md).
 *
 * Boot (main.ts, before the tile loads):
 *   `resolveMissionRoute(params)` fetches `/data/landmarks/<id>/mission.json`;
 *   the route names the tile and the landmark content folder. Without
 *   `?mission=` (or with a missing/invalid mission) it returns null and the
 *   game is the free dive it always was.
 *
 * Spawn (main.ts, where the default spawn used to be):
 *   `applyMissionLoadout()` fits the hull class, sets the mission sim speed
 *   and returns the surface-start pose. `?poi=` (B1) and `?at=` (B4) still
 *   override the pose afterwards, because tests depend on them.
 *
 * Flow (`MissionRouter`, constructed once Discovery and Input exist; D-FLOW):
 *   briefing (game frozen) -> Begin dive / Enter -> `mission:started` ->
 *   objectives panel with bearing/range -> last primary scanned ->
 *   `mission:primaryComplete` -> after `completeDelayS`, the banner "Primary
 *   objectives complete" (Keep exploring / Surface and debrief). The dive only
 *   ends when the player surfaces (banner, or the pause menu) or aborts:
 *   `mission:complete` (once) + `mission:ended` -> debrief (Keep exploring,
 *   Dive again, Dive sites, Home, Journal). The debrief freezes the game.
 */

import type { DiveRating } from './Progress.js';
import type { GameConfig } from '../core/Config.js';
import type { EventBus } from '../core/EventBus.js';
import type { InputState } from '../core/Input.js';
import { Briefing, type BriefingContent } from '../ui/Briefing.js';
import { Debrief, formatDuration, type DebriefAction } from '../ui/Debrief.js';
import { ObjectivesPanel, type NavReadout } from '../ui/ObjectivesPanel.js';
import { headingFromForward, latLonToWorld, normalizeHeadingDeg } from '../util/geo.js';
import type { TileMeta } from '../util/types.js';
import { shellUrl } from '../util/navigation.js';
import { landmarkIdFor, type FetchJson } from './ContentPath.js';
import {
  loadMission,
  Mission,
  type MissionDef,
  type MissionSpawn,
  type ObjectiveStatus,
} from './Mission.js';
import type { DebriefStats } from './Objectives.js';
import type { SeabedSampler, SpawnPose } from './Pois.js';
import { nearSiteSpawnPose, spawnSettings } from './Spawn.js';

export type MissionStartPosition = 'near-site' | 'surface';

// -------------------------------------------------------------------- boot

export interface MissionRoute {
  missionId: string;
  def: MissionDef;
  /** Tile to load: `mission.tile`. */
  tileId: string;
  /** Content folder for POIs/guide/props: `mission.landmark` (or `?landmark=`). */
  landmarkId: string;
  /** `?skipBriefing=1`: start immediately (e2e). */
  skipBriefing: boolean;
}

/** Resolve `?mission=`; null means "free dive, exactly as before". Never throws. */
export async function resolveMissionRoute(
  params: URLSearchParams,
  fetchFn?: FetchJson,
): Promise<MissionRoute | null> {
  const id = params.get('mission');
  if (!id) return null;
  const def = await loadMission(id, fetchFn);
  if (!def) {
    console.warn(`[mission] ?mission=${id}: falling back to a free dive`);
    return null;
  }
  return {
    missionId: def.id,
    def,
    tileId: def.tile,
    landmarkId: landmarkIdFor(params, def.landmark),
    skipBriefing: params.get('skipBriefing') === '1',
  };
}

/**
 * Which tile to boot: the mission's / `?tile=` if the index lists it, else
 * `Config.defaultTileId` when the index has it, else the first indexed tile,
 * else the default id anyway (the loader then reports it missing). The index
 * is sorted alphabetically by the pipeline, so `index[0]` alone would boot
 * whatever tile happens to sort first.
 *
 * QA-B #13: an unknown `?tile=` falls back with a warning instead of fetching
 * a meta.json that does not exist (the dev server answers with index.html,
 * which surfaced as a fatal JSON parse error). With an empty index (it failed
 * to load) the request cannot be checked and is passed through.
 */
export function chooseTileId(
  requested: string | null,
  index: ReadonlyArray<{ id: string }>,
  defaultTileId: string,
  warn: (message: string) => void = (m) => console.warn(m),
): string {
  if (requested) {
    if (!index.length || index.some((t) => t.id === requested)) return requested;
    warn(`[main] ?tile=${requested}: not in data/tiles/index.json; loading the default tile`);
  }
  if (index.some((t) => t.id === defaultTileId)) return defaultTileId;
  return index[0]?.id ?? defaultTileId;
}

export interface SpawnLimits {
  hullRadius: number;
  seabedClearance: number;
  /** Extra metres above hullRadius + seabedClearance. */
  spawnClearanceM: number;
}

/**
 * World pose for `mission.spawn`. `depth_m` 5 is a surface start: Y is
 * `-max(depth_m, hullRadius)` so the hull never breaks the surface, then
 * clamped to stay clear of the seabed. Heading follows the physics
 * convention (`Submarine.getForward`: +yaw turns toward +X = east), so
 * yaw = heading_deg in radians.
 */
export function missionSpawnPose(
  spawn: MissionSpawn,
  meta: TileMeta,
  seabed: SeabedSampler,
  limits: SpawnLimits,
): SpawnPose {
  const { x, z } = latLonToWorld(meta, spawn.lat, spawn.lon);
  const floor =
    seabed.sampleHeight(x, z) + limits.hullRadius + limits.seabedClearance + limits.spawnClearanceM;
  const y = Math.max(floor, -Math.max(spawn.depth_m, limits.hullRadius));
  let yaw = (normalizeHeadingDeg(spawn.heading_deg) * Math.PI) / 180;
  if (yaw > Math.PI) yaw -= 2 * Math.PI; // same (-pi, pi] range the physics wraps to
  return { x, y, z, yaw };
}

/** The Submarine surface the mission needs (Submarine satisfies it). */
export interface MissionSub {
  setHullClass(classId: string): boolean;
  setSimSpeed(multiplier: number): number;
  readonly simSpeed: number;
}

/** Fit the mission's hull class and sim speed; return the spawn pose to apply. */
export function applyMissionLoadout(
  sub: MissionSub,
  def: MissionDef,
  config: GameConfig,
  meta: TileMeta,
  seabed: SeabedSampler,
): SpawnPose {
  if (def.hull_class && !sub.setHullClass(def.hull_class)) {
    console.warn(
      `[mission] ${def.id}: unknown hull_class "${def.hull_class}"; keeping the default`,
    );
  }
  sub.setSimSpeed(config.mission.defaultSimSpeed);
  return missionSpawnPose(def.spawn, meta, seabed, {
    hullRadius: config.submarine.hullRadius,
    seabedClearance: config.submarine.seabedClearance,
    spawnClearanceM: config.mission.spawnClearanceM,
  });
}

/** Resolve the selected start after POIs have loaded; surface is the safe fallback. */
export function missionStartPose(
  def: MissionDef,
  choice: MissionStartPosition,
  pois: ReadonlyArray<{ id: string; position: XYZ }>,
  meta: TileMeta,
  seabed: SeabedSampler,
  config: GameConfig,
): SpawnPose {
  const limits = spawnSettings(config);
  const surface = missionSpawnPose(def.spawn, meta, seabed, limits);
  if (choice === 'surface') return surface;
  const first = def.objectives.find(
    (objective) => objective.primary && pois.some((p) => p.id === objective.poi),
  );
  const target = pois.find((poi) => poi.id === first?.poi)?.position;
  if (!target) {
    console.warn(`[mission] ${def.id}: no resolved primary POI; using surface start`);
    return surface;
  }
  const crushDepth = def.hull_class
    ? (config.submarine.hullClasses[def.hull_class]?.crushDepth ?? config.submarine.crushDepth)
    : config.submarine.crushDepth;
  const near = nearSiteSpawnPose(target, meta, seabed, limits, crushDepth, def.start?.near_site);
  if (!near) {
    console.warn(`[mission] ${def.id}: no safe near-site pose; using surface start`);
    return surface;
  }
  return near;
}

/** Neutral input used while the briefing freezes the game. */
export const FROZEN_INPUT: Readonly<InputState> = Object.freeze({
  throttle: 0,
  yaw: 0,
  pitch: 0,
  ballast: 0,
  lookDx: 0,
  lookDy: 0,
  toggleCamera: false,
  toggleSonar: false,
  boost: false,
  toggleLights: false,
  ping: false,
  scan: false,
  cycleSimSpeed: false,
  togglePhotoMode: false,
  toggleGuide: false,
});

// --------------------------------------------------------------- navigation

interface XYZ {
  x: number;
  y: number;
  z: number;
}

export interface NavTarget {
  objective: ObjectiveStatus;
  name: string;
  /** Compass bearing sub -> target, 0 = north, 90 = east (same as the HUD heading). */
  bearingDeg: number;
  /** 3D slant range, metres (QA-B #11: the same metric as the scan panel). */
  rangeM: number;
  /** Horizontal range, metres. */
  horizontalM: number;
  /** Target depth, positive metres. */
  depthM: number;
}

/**
 * Compass bearing, horizontal range and 3D slant range from `from` to `to`
 * (+X east, +Z south). Every range shown on screen is the slant range
 * (`RNG`), which is what the scanner's `radius_m` test uses too.
 */
export function bearingTo(
  from: XYZ,
  to: XYZ,
): { bearingDeg: number; rangeM: number; horizontalM: number } {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const horizontalM = Math.hypot(dx, dz);
  return {
    bearingDeg: headingFromForward(dx, dz),
    rangeM: Math.hypot(horizontalM, to.y - from.y),
    horizontalM,
  };
}

/**
 * The objective to steer toward: the nearest incomplete primary; once every
 * primary is done, the nearest incomplete secondary. Null when nothing is left
 * or no POI positions are known yet.
 */
export function pickNavTarget(
  objectives: readonly ObjectiveStatus[],
  pois: ReadonlyArray<{ id: string; name: string; position: XYZ }>,
  from: XYZ,
): NavTarget | null {
  const open = objectives.filter((o) => o.resolved && !o.complete);
  const primaries = open.filter((o) => o.primary);
  const pool = primaries.length ? primaries : open;
  let best: NavTarget | null = null;
  for (const o of pool) {
    const poi = pois.find((p) => p.id === o.poiId);
    if (!poi) continue;
    const { bearingDeg, rangeM, horizontalM } = bearingTo(from, poi.position);
    if (!best || rangeM < best.rangeM) {
      best = {
        objective: o,
        name: poi.name,
        bearingDeg,
        rangeM,
        horizontalM,
        depthM: Math.max(0, -poi.position.y),
      };
    }
  }
  return best;
}

// --------------------------------------------------------------- controller

/** The parts of B1's Discovery the mission uses (Discovery satisfies it). */
export interface MissionDiscovery {
  readonly ready: Promise<void>;
  readonly pois: ReadonlyArray<{ id: string; name: string; position: XYZ }>;
  readonly stats: { snapshot(extra?: Partial<DebriefStats>): DebriefStats };
  readonly guide: { open(entryId?: string): void; readonly isOpen: boolean };
}

export interface MissionRouterOptions {
  route: MissionRoute;
  bus: EventBus;
  config: GameConfig;
  meta: TileMeta;
  discovery: MissionDiscovery;
  rating?: () => DiveRating;
  defaultStartPosition?: MissionStartPosition;
  applyStart?: (choice: MissionStartPosition) => void;
  /** Unused since D-FLOW (the HUD shows a non-1× sim speed); kept for callers. */
  simSpeed?: number;
  /** Primary key label for an input action, e.g. `input.primaryKeyLabel`. */
  keyLabel?: (action: string) => string;
  /** Navigate: a URL, or null to reload the current one. */
  navigate?: (url: string | null) => void;
  /** Debrief "Dive sites": open the site chooser (home). Default: navigate to the home page. */
  onDiveSites?: () => void;
  /** Debrief "Home". Default: navigate to the home page. */
  onHome?: () => void;
  parent?: HTMLElement;
}

/** The sub state the router watches for the crush-depth abort (SubmarineState satisfies it). */
export interface MissionHullState {
  emergencyBlow: boolean;
  depth: number;
}

/** Banner shown on the objectives panel while the emergency blow runs. */
export const HULL_FAILURE_ALERT = 'HULL FAILURE — EMERGENCY ASCENT';

/** Debrief heading and subtitle for how the dive ended. Pure, for tests. */
export function debriefText(
  reason: 'surface' | 'all' | 'abort',
  primaryComplete: boolean,
  counts: { completed: number; total: number },
  durationS: number,
  failedAtM = 0,
  abortCause: 'crush' | 'power' = 'crush',
): { title: string; subtitle: string } {
  const tally = `${counts.completed} of ${counts.total} objectives · ${formatDuration(durationS)}`;
  if (reason === 'abort') {
    if (abortCause === 'power')
      return {
        title: 'Dive aborted',
        subtitle: `Supplies exhausted · safe ascent completed · ${tally}`,
      };
    const rating = Math.round(Math.abs(failedAtM)).toLocaleString('en-US');
    return {
      title: 'Dive aborted',
      subtitle: `Hull failure at ${rating} m · emergency ascent completed · ${tally}`,
    };
  }
  if (reason === 'all')
    return { title: 'Mission complete', subtitle: `Every objective · ${tally}` };
  if (primaryComplete) {
    return { title: 'Mission complete', subtitle: `All primary objectives · ${tally}` };
  }
  // Partial dive: warm, not a failure. The tally cell carries the numbers.
  const line =
    counts.completed > 0
      ? `You found ${counts.completed} of ${counts.total} — the rest are still down there.`
      : 'Nothing logged this time — the site is still waiting.';
  return { title: 'Back at the surface', subtitle: `${line} · ${tally}` };
}

export class MissionRouter {
  readonly mission: Mission;
  readonly briefing: Briefing | null;
  readonly panel: ObjectivesPanel;
  debrief: Debrief | null = null;
  exploration: Debrief['exploration'] = null;

  private navClock = 0;
  private readonly disposers: Array<() => void> = [];
  /** Set by `sub:emergencyBlow` during a dive; cleared when the blow ends. */
  private blow: { depth: number; cause: 'crush' | 'power' } | null = null;
  /** Depth of the last hull failure, for the aborted debrief. */
  private failedAt = 0;
  private abortCause: 'crush' | 'power' = 'crush';
  /** Real seconds until the pending completion banner shows; null when none is pending. */
  private bannerDelay: number | null = null;
  /** Real seconds until an open banner applies its default (Keep exploring). */
  private bannerLeft = 0;
  private pendingBanner: 'primary' | 'all' | null = null;
  private allAnnounced = false;

  constructor(private readonly opts: MissionRouterOptions) {
    const { route, bus, meta } = opts;
    this.mission = new Mission({ def: route.def, bus });
    this.panel = new ObjectivesPanel(opts.parent);
    this.panel.setTitle(route.def.title);
    this.panel.setObjectives(this.mission.objectives);

    this.disposers.push(
      this.mission.onChange((m) => this.onMissionChange(m)),
      bus.on('mission:primaryComplete', () => this.queueBanner('primary')),
      bus.on('sub:emergencyBlow', ({ depth, cause }) => this.onEmergencyBlow(depth, cause)),
    );

    void opts.discovery.ready.then(() => {
      this.mission.resolve(opts.discovery.pois.map((p) => p.id));
      this.panel.setObjectives(this.mission.objectives);
      this.navClock = Infinity; // refresh the nav line on the next frame
    });

    const onKey = (e: KeyboardEvent): void => {
      // Capture phase, so this runs before Discovery's Escape handler: if the
      // Journal is open over the debrief, Escape closes only the Journal.
      if (e.code !== 'Escape' || !this.debrief?.isOpen || opts.discovery.guide.isOpen) return;
      // Escape is "Keep exploring". The aborted debrief is a decision point
      // (Dive again / Dive sites / Home), not a summary to dismiss.
      e.preventDefault();
      e.stopImmediatePropagation();
      this.keepExploring();
    };
    window.addEventListener('keydown', onKey, true);
    this.disposers.push(() => window.removeEventListener('keydown', onKey, true));

    if (route.skipBriefing) {
      this.briefing = null;
      this.mission.start(meta.id);
      void opts.discovery.ready.then(() =>
        opts.applyStart?.(opts.defaultStartPosition ?? 'near-site'),
      );
    } else {
      this.briefing = new Briefing({
        parent: opts.parent,
        onBegin: (choice) => this.begin(choice),
        ...(opts.onHome ? { onCancel: opts.onHome } : {}),
      });
      this.briefing.show(this.briefingContent());
      this.panel.setVisible(false);
    }
  }

  /** True while the mission debrief is open: main.ts withholds the scan beam. */
  get debriefOpen(): boolean {
    return this.debrief?.isOpen ?? false;
  }

  /**
   * True while the briefing or the debrief is up: main.ts runs no physics and
   * ignores input, so "Keep exploring" resumes the exact pose.
   */
  get frozen(): boolean {
    return (this.briefing?.isOpen ?? false) || this.debriefOpen;
  }

  /** True between `sub:emergencyBlow` and the end of the blow, during a dive. */
  get emergencyAscent(): boolean {
    return this.blow !== null;
  }

  /** True while "Surface and debrief" is available (a dive in progress, no blow). */
  get canEndDive(): boolean {
    return this.mission.diving && !this.blow;
  }

  /** Close the briefing and start the mission clock. */
  begin(choice: MissionStartPosition = this.opts.defaultStartPosition ?? 'near-site'): void {
    void this.opts.discovery.ready.then(() => {
      this.opts.applyStart?.(choice);
      this.briefing?.hide();
      this.panel.setVisible(true);
      this.mission.start(this.opts.meta.id);
    });
  }

  /** "Surface and debrief": end the dive voluntarily and open the debrief. */
  endDive(): boolean {
    if (!this.canEndDive) return false;
    this.clearBanner();
    if (!this.mission.end()) return false;
    this.showDebrief();
    return true;
  }

  /** "Keep exploring": close the banner, or the debrief, and carry on diving. */
  keepExploring(): void {
    this.clearBanner();
    if (!this.debrief?.isOpen || !this.mission.canResume) return;
    this.mission.resume();
    this.debrief.hide();
    this.panel.setVisible(true);
    this.navClock = Infinity;
  }

  /**
   * Once per rendered frame.
   * @param dt real (wall-clock) seconds of unfrozen play this frame, 0 while
   *   frozen: the mission clock (QA-B #10). Not physics dt, which the 8-step
   *   cap in Time.ts shortens at low frame rates.
   * @param realDt real frame delta, for the nav refresh clock
   * @param hull the sub's state; the end of an emergency blow aborts the dive
   */
  update(
    dt: number,
    realDt: number,
    position: XYZ,
    headingDeg: number,
    hull?: MissionHullState,
  ): void {
    this.mission.update(dt);
    if (this.blow && hull && !hull.emergencyBlow) this.onBlowComplete();
    this.updateBanner(dt);
    this.navClock += realDt;
    if (this.navClock < 1 / Math.max(1, this.opts.config.mission.navUpdateHz)) return;
    this.navClock = 0;
    const t = pickNavTarget(this.mission.objectives, this.opts.discovery.pois, position);
    let nav: NavReadout | null = null;
    if (t) {
      nav = {
        id: t.objective.id,
        name: t.name,
        primary: t.objective.primary,
        bearingDeg: t.bearingDeg,
        rangeM: t.rangeM,
        depthM: t.depthM,
        relativeDeg: ((t.bearingDeg - headingDeg + 540) % 360) - 180,
      };
    }
    this.panel.setNav(nav, this.mission.primaryComplete);
  }

  private onMissionChange(m: Mission): void {
    this.panel.setObjectives(m.objectives);
    this.navClock = Infinity;
    // Everything done after the primaries: suggest surfacing, never force it.
    if (m.state === 'primaries-complete' && m.allComplete && !this.allAnnounced) {
      this.allAnnounced = true;
      this.queueBanner('all');
    }
  }

  private queueBanner(kind: 'primary' | 'all'): void {
    if (kind === 'primary' && this.mission.allComplete) this.allAnnounced = true;
    if (kind === 'all' && this.pendingBanner === 'primary' && this.bannerDelay !== null) {
      this.pendingBanner = 'all';
      return;
    }
    this.pendingBanner = this.mission.allComplete ? 'all' : kind;
    this.bannerDelay = Math.max(0, this.opts.config.mission.completeDelayS);
    this.panel.hideBanner();
  }

  /** Banner clocks run on unfrozen real time: nothing moves under the pause menu. */
  private updateBanner(dt: number): void {
    if (this.bannerDelay !== null && this.pendingBanner) {
      this.bannerDelay -= dt;
      if (this.bannerDelay > 0 || !this.mission.diving) return;
      this.bannerDelay = null;
      this.showBanner(this.pendingBanner);
      this.pendingBanner = null;
      return;
    }
    if (!this.panel.bannerOpen) return;
    this.bannerLeft -= dt;
    if (this.bannerLeft <= 0) this.keepExploring();
  }

  private showBanner(kind: 'primary' | 'all'): void {
    const { completed, total } = this.mission.counts();
    const left = total - completed;
    const detail =
      kind === 'all'
        ? `${completed} of ${total} objectives. Surface when you are ready.`
        : `${completed} of ${total} objectives. ` +
          (left ? `${left} optional ${left === 1 ? 'target remains' : 'targets remain'}.` : '');
    this.bannerLeft = Math.max(1, this.opts.config.mission.completionBannerS);
    this.panel.showBanner({
      title: kind === 'all' ? 'All objectives complete' : 'Primary objectives complete',
      detail: detail.trim(),
      onKeepExploring: () => this.keepExploring(),
      onSurface: () => this.endDive(),
    });
  }

  private clearBanner(): void {
    this.bannerDelay = null;
    this.pendingBanner = null;
    this.panel.hideBanner();
  }

  /** Crush depth: amber banner now, the aborted debrief once the blow ends. */
  private onEmergencyBlow(depth: number, cause: 'crush' | 'power' = 'crush'): void {
    if (!this.mission.diving) return;
    this.blow = { depth, cause };
    this.clearBanner();
    this.panel.setAlert(
      cause === 'power' ? 'SUPPLIES EXHAUSTED — EMERGENCY ASCENT' : HULL_FAILURE_ALERT,
    );
  }

  private onBlowComplete(): void {
    const at = this.blow;
    this.blow = null;
    this.panel.setAlert(null);
    if (!at) return;
    this.mission.abort(at.cause);
    if (this.mission.state !== 'aborted') return;
    this.failedAt = at.cause === 'crush' ? at.depth : 0;
    this.abortCause = at.cause;
    this.mission.end();
    this.showDebrief();
  }

  private showDebrief(): void {
    const { discovery, route } = this.opts;
    const m = this.mission;
    const reason = m.endReason ?? 'surface';
    const counts = m.counts();
    const { title, subtitle } = debriefText(
      reason,
      m.primaryComplete,
      counts,
      m.durationS ?? m.elapsedS,
      this.failedAt,
      this.abortCause,
    );
    const stats = discovery.stats.snapshot({
      title,
      subtitle,
      landmarkName: route.def.title,
      objectives: counts,
    });
    if (!this.debrief) {
      this.debrief = new Debrief({ parent: this.opts.parent });
      this.debrief.root.classList.add('mission-debrief');
    }
    const aborted = reason === 'abort';
    this.debrief.root.classList.toggle('is-aborted', aborted);
    const actions: DebriefAction[] = [];
    if (m.canResume) {
      actions.push({
        id: 'keep-exploring',
        label: 'Keep exploring',
        primary: true,
        run: () => this.keepExploring(),
      });
    }
    actions.push(
      { id: 'dive-again', label: 'Dive again', primary: aborted, run: () => this.diveAgain() },
      { id: 'dive-sites', label: 'Dive sites', run: () => this.leave(this.opts.onDiveSites) },
      { id: 'home', label: 'Home', run: () => this.leave(this.opts.onHome) },
      { id: 'journal', label: 'Journal', run: () => discovery.guide.open() },
    );
    this.debrief.exploration = this.exploration;
    this.debrief.show(stats, actions, this.opts.rating?.());
    this.panel.setVisible(false);
  }

  /** "Dive again": a fresh dive of the same mission (reload: briefing unless the URL skips it). */
  private diveAgain(): void {
    this.mission.restart();
    this.navigate(null);
  }

  /** "Dive sites" / "Home": leave the debrief for the shell, without launching a dive. */
  private leave(action: (() => void) | undefined): void {
    this.debrief?.hide();
    if (action) action();
    else this.navigate(shellUrl(window.location.href));
  }

  private navigate(url: string | null): void {
    if (this.opts.navigate) this.opts.navigate(url);
    else if (url === null) window.location.reload();
    else window.location.href = url;
  }

  private briefingContent(): BriefingContent {
    const { route, config } = this.opts;
    const def = route.def;
    const k = (a: string, fallback: string): string => this.opts.keyLabel?.(a) || fallback;
    const hull = def.hull_class ? config.submarine.hullClasses[def.hull_class] : undefined;
    const content: BriefingContent = {
      siteId: def.landmark,
      kicker: `MISSION BRIEFING · ${def.landmark.toUpperCase()}`,
      title: def.title,
      summary: def.briefing.summary,
      meta: [],
      facts: def.briefing.facts,
      hazards: def.briefing.hazards,
      objectives: [...this.mission.objectives]
        .sort((a, b) => Number(b.primary) - Number(a.primary))
        .map((o) => ({ title: o.title, primary: o.primary })),
      controls: [
        [`${k('thrustForward', 'W')}/${k('thrustReverse', 'S')}`, 'thrust'],
        [`${k('yawPort', 'A')}/${k('yawStarboard', 'D')}`, 'yaw'],
        [k('ballastBlow', 'Space'), 'rise'],
        [k('ballastFlood', 'Ctrl'), 'dive'],
        [k('toggleLights', 'L'), 'headlights'],
        [k('scan', 'F'), 'scan (hold)'],
        [k('toggleJournal', 'J'), 'Journal'],
        [k('cycleSimSpeed', 'T'), 'sim speed'],
        [k('toggleSonar', 'M'), 'sonar map'],
      ],
    };
    if (def.briefing.depth_m !== undefined) {
      content.meta.push([
        'TARGET DEPTH',
        `${Math.round(def.briefing.depth_m).toLocaleString('en-US')} m`,
      ]);
    }
    if (hull) {
      const rating = Math.abs(hull.ratedDepth).toLocaleString('en-US');
      content.meta.push(['HULL', `${hull.name} (rated ${rating} m)`]);
    }
    content.startPosition = this.opts.defaultStartPosition ?? 'near-site';
    if (def.briefing.memorial_note) content.memorialNote = def.briefing.memorial_note;
    return content;
  }

  dispose(): void {
    for (const d of this.disposers) d();
    this.mission.dispose();
    this.briefing?.dispose();
    this.panel.dispose();
    this.debrief?.dispose();
  }
}
