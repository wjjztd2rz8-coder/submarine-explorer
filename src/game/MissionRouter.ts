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
 * Flow (`MissionRouter`, constructed once Discovery and Input exist):
 *   briefing (game frozen) -> Begin dive / Enter -> `mission:started` ->
 *   objectives panel with bearing/range -> last primary scanned ->
 *   `completeDelayS` -> `mission:complete` -> debrief (Dive again / Dive sites).
 */

import type { GameConfig } from '../core/Config.js';
import type { EventBus } from '../core/EventBus.js';
import type { InputState } from '../core/Input.js';
import { Briefing, type BriefingContent } from '../ui/Briefing.js';
import { Debrief, formatDuration } from '../ui/Debrief.js';
import { ObjectivesPanel, type NavReadout } from '../ui/ObjectivesPanel.js';
import { headingFromForward, latLonToWorld, normalizeHeadingDeg } from '../util/geo.js';
import type { TileMeta } from '../util/types.js';
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
  /** Initial sim speed for the panel (the sub's, after the loadout). */
  simSpeed: number;
  /** Primary key label for an input action, e.g. `input.primaryKeyLabel`. */
  keyLabel?: (action: string) => string;
  /** Navigate: a URL, or null to reload the current one. */
  navigate?: (url: string | null) => void;
  parent?: HTMLElement;
}

/** The sub state the router watches for the crush-depth abort (SubmarineState satisfies it). */
export interface MissionHullState {
  emergencyBlow: boolean;
  depth: number;
}

/** Banner shown on the objectives panel while the emergency blow runs. */
export const HULL_FAILURE_ALERT = 'HULL FAILURE — EMERGENCY ASCENT';

export class MissionRouter {
  readonly mission: Mission;
  readonly briefing: Briefing | null;
  readonly panel: ObjectivesPanel;
  debrief: Debrief | null = null;

  private navClock = 0;
  private readonly disposers: Array<() => void> = [];
  /** Set by `sub:emergencyBlow` during a running mission; cleared when the blow ends. */
  private blow: { depth: number } | null = null;
  private debriefVariant: 'complete' | 'aborted' | null = null;

  constructor(private readonly opts: MissionRouterOptions) {
    const { route, bus, config, meta } = opts;
    this.mission = new Mission({
      def: route.def,
      bus,
      completeDelayS: config.mission.completeDelayS,
    });
    this.panel = new ObjectivesPanel(opts.parent);
    this.panel.setTitle(route.def.title);
    this.panel.setSimSpeed(opts.simSpeed);
    this.panel.setObjectives(this.mission.objectives);

    this.disposers.push(
      this.mission.onChange((m) => this.onMissionChange(m)),
      bus.on('sub:simSpeed', ({ multiplier }) => this.panel.setSimSpeed(multiplier)),
      bus.on('sub:emergencyBlow', ({ depth }) => this.onEmergencyBlow(depth)),
    );

    void opts.discovery.ready.then(() => {
      this.mission.resolve(opts.discovery.pois.map((p) => p.id));
      this.panel.setObjectives(this.mission.objectives);
      this.navClock = Infinity; // refresh the nav line on the next frame
    });

    const onKey = (e: KeyboardEvent): void => {
      // Capture phase, so this runs before Discovery's Escape handler: if the
      // field guide is open over the debrief, Escape closes only the guide.
      if (e.code !== 'Escape' || !this.debrief?.isOpen || opts.discovery.guide.isOpen) return;
      // The aborted debrief is a decision point (Dive again / Dive sites), not
      // a summary to dismiss: the mission is over and the game stays frozen.
      if (this.debriefVariant === 'aborted') return;
      this.debrief.hide();
    };
    window.addEventListener('keydown', onKey, true);
    this.disposers.push(() => window.removeEventListener('keydown', onKey, true));

    if (route.skipBriefing) {
      this.briefing = null;
      this.mission.start(meta.id);
    } else {
      this.briefing = new Briefing({ parent: opts.parent, onBegin: () => this.begin() });
      this.briefing.show(this.briefingContent());
      this.panel.setVisible(false);
    }
  }

  /** True while the mission debrief is open: main.ts withholds the scan beam. */
  get debriefOpen(): boolean {
    return this.debrief?.isOpen ?? false;
  }

  /**
   * True while the briefing is up, or the "Dive aborted" debrief is: main.ts
   * runs no physics and ignores input.
   */
  get frozen(): boolean {
    if (this.briefing?.isOpen) return true;
    return this.debriefVariant === 'aborted' && (this.debrief?.isOpen ?? false);
  }

  /** True between `sub:emergencyBlow` and the end of the blow, in a running mission. */
  get emergencyAscent(): boolean {
    return this.blow !== null;
  }

  /** Close the briefing and start the mission clock. */
  begin(): void {
    this.briefing?.hide();
    this.panel.setVisible(true);
    this.mission.start(this.opts.meta.id);
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
    this.navClock += realDt;
    if (this.navClock < 1 / Math.max(1, this.opts.config.mission.navUpdateHz)) return;
    this.navClock = 0;
    const t = pickNavTarget(this.mission.objectives, this.opts.discovery.pois, position);
    let nav: NavReadout | null = null;
    if (t) {
      nav = {
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
    if (m.state === 'complete') this.showDebrief('complete');
  }

  /** Crush depth: amber banner now, the aborted debrief once the blow ends. */
  private onEmergencyBlow(depth: number): void {
    const s = this.mission.state;
    if (s !== 'running' && s !== 'completing') return;
    this.blow = { depth };
    this.panel.setAlert(HULL_FAILURE_ALERT);
  }

  private onBlowComplete(): void {
    const at = this.blow;
    this.blow = null;
    this.panel.setAlert(null);
    if (!at) return;
    this.mission.abort('crush');
    if (this.mission.state === 'aborted') this.showDebrief('aborted', at.depth);
  }

  private showDebrief(variant: 'complete' | 'aborted', failedAt = 0): void {
    const { discovery, route } = this.opts;
    const m = this.mission;
    const done = m.objectives.filter((o) => o.complete).length;
    const time = formatDuration(m.durationS ?? m.elapsedS);
    const rating = Math.round(Math.abs(failedAt)).toLocaleString('en-US');
    const subtitle =
      variant === 'aborted'
        ? `Hull failure at ${rating} m · emergency ascent completed · ` +
          `${done} of ${m.objectives.length} objectives · ${time}`
        : `All primary objectives scanned · ${done} of ${m.objectives.length} objectives · ${time}`;
    const stats = discovery.stats.snapshot({
      title: variant === 'aborted' ? 'Dive aborted' : 'Mission complete',
      subtitle,
      landmarkName: route.def.title,
    });
    this.debriefVariant = variant;
    if (!this.debrief) {
      this.debrief = new Debrief({
        parent: this.opts.parent,
        onDiveAgain: () => {
          m.restart();
          this.navigate(null);
        },
        onFieldGuide: () => discovery.guide.open(),
      });
      this.debrief.root.classList.add('mission-debrief');
    }
    this.debrief.root.classList.toggle('is-aborted', variant === 'aborted');
    this.debrief.show(stats);
    const actions = this.debrief.root.querySelector('.debrief-actions');
    const sites = document.createElement('button');
    sites.type = 'button';
    sites.className = 'debrief-btn mission-debrief-sites';
    sites.textContent = 'Dive sites';
    sites.addEventListener('click', () => this.navigate('/'));
    actions?.append(sites);
    // The aborted variant is a two-way choice: Dive again / Dive sites.
    if (variant === 'aborted') {
      for (const b of actions?.querySelectorAll('.debrief-btn') ?? []) {
        if (b.textContent === 'Field guide') b.remove();
      }
    }
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
        [`${k('pitchUp', 'R')}/${k('pitchDown', 'F')}`, 'pitch'],
        [k('ballastBlow', 'Space'), 'blow ballast (rise)'],
        [k('ballastFlood', 'Shift'), 'flood ballast (dive)'],
        [k('toggleLights', 'L'), 'headlights'],
        [k('scan', 'G'), 'scan (hold)'],
        [k('toggleGuide', 'J'), 'field guide'],
        [k('ping', 'Q'), 'sonar ping'],
        [k('cycleSimSpeed', 'T'), `sim speed (starts ${config.mission.defaultSimSpeed}×)`],
        [k('toggleSonar', 'M'), 'sonar map'],
        [k('toggleCamera', 'C'), 'camera'],
      ],
    };
    if (def.briefing.depth_m !== undefined) {
      content.meta.push([
        'TARGET DEPTH',
        `${Math.round(def.briefing.depth_m).toLocaleString('en-US')} m`,
      ]);
    }
    if (hull) {
      const rating = Math.abs(hull.crushDepth).toLocaleString('en-US');
      content.meta.push(['HULL', `${hull.name} (rated ${rating} m)`]);
    }
    const start = def.spawn.depth_m <= 10 ? 'surface' : `${Math.round(def.spawn.depth_m)} m`;
    content.meta.push(['START', `${start} · heading ${Math.round(def.spawn.heading_deg)}°`]);
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
