/**
 * Routing + navigation maths: `?mission=` resolution, the surface-start
 * spawn pose, hull/sim-speed loadout, the frozen input, and the objectives
 * panel's bearing/range (checked against the Submarine's own heading).
 */

import { Vector3 } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { inputGateSystem } from '../../src/app/loop.js';
import type { FrameState } from '../../src/app/System.js';
import type { GameContext } from '../../src/app/context.js';
import { DEFAULT_CONFIG, makeConfig } from '../../src/core/Config.js';
import { EventBus } from '../../src/core/EventBus.js';
import { ProgressSave } from '../../src/core/Save.js';
import { Progress } from '../../src/game/Progress.js';
import type { FetchJson } from '../../src/game/ContentPath.js';
import {
  nextScanObjective,
  parseMission,
  type MissionDef,
  type ObjectiveStatus,
} from '../../src/game/Mission.js';
import {
  FROZEN_INPUT,
  MissionRouter,
  applyMissionLoadout,
  bearingTo,
  chooseTileId,
  missionSpawnPose,
  pickNavTarget,
  resolveMissionRoute,
} from '../../src/game/MissionRouter.js';
import { Submarine, type HeightField } from '../../src/sub/Submarine.js';
import { formatTurn } from '../../src/ui/ObjectivesPanel.js';
import type { DebriefStats } from '../../src/game/Objectives.js';
import { missionUrl, tileUrl } from '../../src/ui/MissionSelect.js';
import { latLonToWorld } from '../../src/util/geo.js';
import type { TileMeta } from '../../src/util/types.js';
import titanicMission from '../../data/landmarks/titanic/mission.json';

const quiet = (): void => {};
// Only `center` is used by latLonToWorld; these are the Titanic tile's values.
const META = {
  id: 'titanic',
  center: { lat: 41.7298051040622, lon: -49.950439453125 },
} as TileMeta;
const SEABED = -3800;
const flat = (y = SEABED): HeightField => ({
  sampleHeight: () => y,
  getNormal: (_x, _z, out = new Vector3()) => out.set(0, 1, 0),
});
const LIMITS = {
  hullRadius: DEFAULT_CONFIG.submarine.hullRadius,
  seabedClearance: DEFAULT_CONFIG.submarine.seabedClearance,
  spawnClearanceM: DEFAULT_CONFIG.mission.spawnClearanceM,
};

function titanic(): MissionDef {
  const d = parseMission(titanicMission, 'titanic', quiet);
  if (!d) throw new Error('titanic mission.json failed to parse');
  return d;
}

describe('resolveMissionRoute', () => {
  const fetchFn: FetchJson = async (url) =>
    url === '/data/landmarks/titanic/mission.json'
      ? { ok: true, text: async () => JSON.stringify(titanicMission) }
      : { ok: false, text: async () => '' };

  it('no ?mission= is a free dive (null)', async () => {
    expect(await resolveMissionRoute(new URLSearchParams('tile=titanic'), fetchFn)).toBeNull();
  });

  it('?mission= implies the tile and landmark; ?tile= does not win', async () => {
    const r = await resolveMissionRoute(
      new URLSearchParams('mission=titanic&tile=monterey-canyon'),
      fetchFn,
    );
    expect(r?.missionId).toBe('titanic');
    expect(r?.tileId).toBe('titanic');
    expect(r?.landmarkId).toBe('titanic');
    expect(r?.skipBriefing).toBe(false);
  });

  it('?landmark= still overrides the content folder; ?skipBriefing=1 is read', async () => {
    const r = await resolveMissionRoute(
      new URLSearchParams('mission=titanic&landmark=_test&skipBriefing=1'),
      fetchFn,
    );
    expect(r?.landmarkId).toBe('_test');
    expect(r?.skipBriefing).toBe(true);
  });

  it('a missing mission falls back to the free dive', async () => {
    const warn = console.warn;
    console.warn = quiet;
    try {
      expect(
        await resolveMissionRoute(new URLSearchParams('mission=atlantis'), fetchFn),
      ).toBeNull();
    } finally {
      console.warn = warn;
    }
  });
});

describe('chooseTileId', () => {
  const index = [{ id: 'axial-seamount-ashes' }, { id: 'lost-city' }, { id: 'titanic' }];

  it('an explicit ?tile= / mission tile wins', () => {
    expect(chooseTileId('lost-city', index, 'titanic')).toBe('lost-city');
  });

  it('a bare URL prefers Config.defaultTileId over the alphabetically first tile', () => {
    expect(DEFAULT_CONFIG.defaultTileId).toBe('titanic');
    expect(chooseTileId(null, index, DEFAULT_CONFIG.defaultTileId)).toBe('titanic');
  });

  it('falls back to index[0], then to the default id', () => {
    expect(chooseTileId(null, [{ id: 'lost-city' }], 'titanic')).toBe('lost-city');
    expect(chooseTileId(null, [], 'titanic')).toBe('titanic');
  });

  it('QA-B #13: an unknown ?tile= falls back to the default with a warning', () => {
    const warnings: string[] = [];
    const warn = (m: string): void => void warnings.push(m);
    expect(chooseTileId('does-not-exist', index, 'titanic', warn)).toBe('titanic');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('does-not-exist');
    expect(chooseTileId('nope', [{ id: 'lost-city' }], 'titanic', warn)).toBe('lost-city');
    // A known id is silent; an empty (unloaded) index cannot be checked, so it passes through.
    expect(chooseTileId('lost-city', index, 'titanic', warn)).toBe('lost-city');
    expect(chooseTileId('anything', [], 'titanic', warn)).toBe('anything');
    expect(warnings).toHaveLength(2);
  });
});

describe('missionSpawnPose', () => {
  it('surface start: depth 5 -> y = -max(5, hullRadius)', () => {
    const d = titanic();
    const p = missionSpawnPose(d.spawn, META, flat(), LIMITS);
    expect(p.y).toBe(-Math.max(5, LIMITS.hullRadius));
    const w = latLonToWorld(META, d.spawn.lat, d.spawn.lon);
    expect(p.x).toBeCloseTo(w.x, 6);
    expect(p.z).toBeCloseTo(w.z, 6);
  });

  it('heading -> yaw uses the physics convention (+yaw = east), wrapped to (-pi, pi]', () => {
    const spawn = { lat: META.center.lat, lon: META.center.lon, depth_m: 5, heading_deg: 90 };
    expect(missionSpawnPose(spawn, META, flat(), LIMITS).yaw).toBeCloseTo(Math.PI / 2, 9);
    const p = missionSpawnPose({ ...spawn, heading_deg: 150 }, META, flat(), LIMITS);
    expect(p.yaw).toBeCloseTo((150 * Math.PI) / 180, 9);
    // The boat spawned with that yaw really faces 150 deg on the HUD.
    const sub = new Submarine(DEFAULT_CONFIG.submarine, flat());
    sub.reset(p.x, p.y, p.z, p.yaw);
    expect(sub.getState().headingDeg).toBeCloseTo(150, 6);
    const west = missionSpawnPose({ ...spawn, heading_deg: 270 }, META, flat(), LIMITS);
    expect(west.yaw).toBeCloseTo(-Math.PI / 2, 9);
  });

  it('deep spawns are clamped above the seabed', () => {
    const spawn = { lat: META.center.lat, lon: META.center.lon, depth_m: 5000, heading_deg: 0 };
    const p = missionSpawnPose(spawn, META, flat(), LIMITS);
    expect(p.y).toBe(SEABED + LIMITS.hullRadius + LIMITS.seabedClearance + LIMITS.spawnClearanceM);
  });
});

describe('optional near-site content', () => {
  it('parses a valid override without changing the surface spawn', () => {
    const raw = {
      ...titanicMission,
      start: {
        near_site: {
          lat: META.center.lat,
          lon: META.center.lon,
          depth_m: 3800,
          heading_deg: 450,
        },
      },
    };
    const def = parseMission(raw, 'titanic', quiet)!;
    expect(def.start?.near_site?.heading_deg).toBe(90);
    expect(def.spawn).toEqual(titanic().spawn);
  });

  it('warns and computes a pose when the optional override is invalid', () => {
    const warnings: string[] = [];
    const raw = {
      ...titanicMission,
      start: {
        near_site: {
          lat: 100,
          lon: 0,
          depth_m: -20,
          heading_deg: 0,
        },
      },
    };
    const def = parseMission(raw, 'titanic', (m) => warnings.push(m))!;
    expect(def.start).toBeUndefined();
    expect(warnings).toHaveLength(1);
  });
});

describe('applyMissionLoadout', () => {
  it('fits the hull class and the mission sim speed', () => {
    const config = makeConfig();
    const sub = new Submarine(config.submarine, flat());
    const d = { ...titanic(), hull_class: 'A' };
    applyMissionLoadout(sub, d, config, META, flat());
    expect(sub.getCrushDepth()).toBe(config.submarine.hullClasses.A?.crushDepth);
    expect(sub.simSpeed).toBe(config.mission.defaultSimSpeed);
    expect(config.submarine.simSpeeds).toContain(config.mission.defaultSimSpeed);
  });

  it('an unknown hull class keeps the default hull', () => {
    const config = makeConfig();
    const sub = new Submarine(config.submarine, flat());
    const warn = console.warn;
    console.warn = quiet;
    try {
      applyMissionLoadout(sub, { ...titanic(), hull_class: 'Z' }, config, META, flat());
    } finally {
      console.warn = warn;
    }
    expect(sub.getCrushDepth()).toBe(config.submarine.crushDepth);
  });
});

describe('FROZEN_INPUT', () => {
  it('holds the boat still (no thrust, no ballast, no edges)', () => {
    const sub = new Submarine(DEFAULT_CONFIG.submarine, flat());
    sub.reset(0, -500, 0, 1);
    for (let i = 0; i < 120; i++) sub.step(FROZEN_INPUT, 1 / 60);
    expect(sub.velocity.length()).toBeLessThan(0.2); // only the trimmed-out buoyancy drift
    expect(sub.yaw).toBe(1);
    expect(Object.values(FROZEN_INPUT).every((v) => v === 0 || v === false)).toBe(true);
  });
});

describe('bearing and range', () => {
  const at = (x: number, z: number): { x: number; y: number; z: number } => ({ x, y: -100, z });

  it('0 = north (-Z), 90 = east (+X), 180 = south, 270 = west', () => {
    const o = at(0, 0);
    expect(bearingTo(o, at(0, -100)).bearingDeg).toBeCloseTo(0, 9);
    expect(bearingTo(o, at(100, 0)).bearingDeg).toBeCloseTo(90, 9);
    expect(bearingTo(o, at(0, 100)).bearingDeg).toBeCloseTo(180, 9);
    expect(bearingTo(o, at(-100, 0)).bearingDeg).toBeCloseTo(270, 9);
    expect(bearingTo(o, at(300, -400)).rangeM).toBeCloseTo(500, 9);
  });

  it('QA-B #11: RNG is the 3D slant range (the scan panel metric)', () => {
    const b = bearingTo({ x: 0, y: -3700, z: 0 }, { x: 300, y: -3800, z: -400 });
    expect(b.horizontalM).toBeCloseTo(500, 9);
    expect(b.rangeM).toBeCloseTo(Math.hypot(500, 100), 9);
  });

  it('agrees with the HUD heading: steering to the bearing closes the range', () => {
    const sub = new Submarine(DEFAULT_CONFIG.submarine, flat());
    const target = at(1200, 900); // south-east
    const { bearingDeg, rangeM } = bearingTo(at(0, 0), target);
    sub.reset(0, -100, 0, (bearingDeg * Math.PI) / 180);
    expect(sub.getState().headingDeg).toBeCloseTo(bearingDeg, 6);
    const drive = { ...FROZEN_INPUT, throttle: 1 };
    for (let i = 0; i < 600; i++) sub.step(drive, 1 / 60);
    const after = bearingTo(sub.position, target);
    expect(after.rangeM).toBeLessThan(rangeM - 20);
    expect(after.bearingDeg).toBeCloseTo(bearingDeg, 0);
  });

  it('titanic: the spawn is ~2 km from the bow and the briefed heading points at it', () => {
    const d = titanic();
    const spawn = latLonToWorld(META, d.spawn.lat, d.spawn.lon);
    const bow = latLonToWorld(META, 41.7325, -49.94694);
    const b = bearingTo({ ...spawn, y: 0 }, { ...bow, y: 0 });
    expect(b.rangeM).toBeGreaterThan(1800);
    expect(b.rangeM).toBeLessThan(2200);
    expect(Math.abs(b.bearingDeg - d.spawn.heading_deg)).toBeLessThan(15);
  });

  it('pickNavTarget: nearest open primary, then secondaries, skipping unresolved', () => {
    const obj = (
      id: string,
      poiId: string,
      primary: boolean,
      extra: Partial<ObjectiveStatus> = {},
    ): ObjectiveStatus => ({
      id,
      title: id,
      hint: '',
      poiId,
      primary,
      complete: false,
      resolved: true,
      ...extra,
    });
    const pois = [
      { id: 'far', name: 'Far', position: new Vector3(0, -3800, -2000) },
      { id: 'near', name: 'Near', position: new Vector3(500, -3790, 0) },
      { id: 'sec', name: 'Sec', position: new Vector3(10, -3790, 0) },
    ];
    const from = at(0, 0);
    const objectives = [obj('a', 'far', true), obj('b', 'near', true), obj('c', 'sec', false)];
    let t = pickNavTarget(objectives, pois, from);
    expect(t?.name).toBe('Near');
    expect(t?.bearingDeg).toBeCloseTo(90, 6);
    expect(t?.depthM).toBe(3790);
    objectives[1]!.complete = true;
    expect(pickNavTarget(objectives, pois, from)?.name).toBe('Far');
    objectives[0]!.complete = true;
    t = pickNavTarget(objectives, pois, from);
    expect(t?.name).toBe('Sec');
    expect(t?.objective.primary).toBe(false);
    objectives[2]!.resolved = false;
    expect(pickNavTarget(objectives, pois, from)).toBeNull();
    expect(pickNavTarget([obj('x', 'unknown', true)], pois, from)).toBeNull();
  });

  it('panel formatting', () => {
    expect(formatTurn(4)).toBe('AHEAD');
    expect(formatTurn(35.2)).toBe('35° STBD');
    expect(formatTurn(-120)).toBe('120° PORT');
  });
});

describe('mission select URLs', () => {
  it('a mission link drops free-dive params but keeps the graphics tier', () => {
    const u = new URL(missionUrl('http://h/?tile=monterey-canyon&tier=high&poi=x', 'titanic'));
    expect([...u.searchParams]).toEqual([
      ['mission', 'titanic'],
      ['tier', 'high'],
    ]);
  });

  it('a dive-site link drops ?mission= (which would otherwise win)', () => {
    const u = new URL(tileUrl('http://h/?mission=titanic&skipBriefing=1&tier=low', 'lost-city'));
    expect(u.searchParams.get('mission')).toBeNull();
    expect(u.searchParams.get('skipBriefing')).toBeNull();
    expect(u.searchParams.get('tile')).toBe('lost-city');
    expect(u.searchParams.get('tier')).toBe('low');
  });
});

/** Same minimal EventTarget DOM as debriefReopen; no layout or rendering. */
class Element extends EventTarget {
  children: Element[] = [];
  hidden = false;
  className = '';
  textContent = '';
  scrollTop = 0;
  dataset: Record<string, string> = {};
  attributes: Record<string, string> = {};
  classList = {
    contains: (name: string) => this.className.split(' ').includes(name),
    toggle: (name: string, on = !this.classList.contains(name)) => {
      const classes = new Set(this.className.split(' ').filter(Boolean));
      if (on) classes.add(name);
      else classes.delete(name);
      this.className = [...classes].join(' ');
      return on;
    },
    add: (name: string) => {
      this.classList.toggle(name, true);
    },
  };
  get childElementCount() {
    return this.children.length;
  }
  setAttribute(name: string, value: string) {
    this.attributes[name] = value;
  }
  append(...children: Element[]) {
    this.children.push(...children);
  }
  appendChild(child: Element) {
    this.append(child);
  }
  replaceChildren(...children: Element[]) {
    this.children = children;
  }
  contains(child: Element): boolean {
    return child === this || this.children.some((e) => e.contains(child));
  }
  blur() {}
  remove() {}
}

function descendants(root: HTMLElement): Element[] {
  const walk = (e: Element): Element[] => [e, ...e.children.flatMap(walk)];
  return walk(root as unknown as Element);
}

function control(root: HTMLElement, className: string): Element {
  const found = descendants(root).find((e) => e.classList.contains(className));
  if (!found) throw new Error(`Missing control ${className}`);
  return found;
}

const POSITION = { x: 0, y: -10, z: 0 };
const BOUNDARIES = ['primary pending', 'primary open', 'all pending', 'all open'] as const;
type Boundary = (typeof BOUNDARIES)[number];

// Feed the router the same clock boundary as play.mission: a pause and the
// first resumed interval both contribute zero, even though frame dt is nonzero.
function frame(
  router: MissionRouter,
  options: {
    frozen?: boolean;
    resumeFrame?: boolean;
    emergencyBlow?: boolean;
  } = {},
): void {
  const f = {
    dt: 0.25,
    realSteps: 8,
    sampled: FROZEN_INPUT,
    frozen: options.frozen ?? router.frozen,
    resumeFrame: options.resumeFrame ?? false,
  } as FrameState;
  inputGateSystem.frame!['gate.input']!(f, {} as GameContext);
  router.update(f.clockDt, f.dt, POSITION, 0, {
    emergencyBlow: options.emergencyBlow ?? router.emergencyAscent,
    depth: 10,
  });
}

function advance(router: MissionRouter, seconds: number): void {
  for (let i = 0; i < seconds * 4; i++) frame(router);
}

function pauseAndResume(router: MissionRouter): void {
  const elapsed = router.mission.elapsedS;
  for (let i = 0; i < 16; i++) frame(router, { frozen: true });
  frame(router, { frozen: false, resumeFrame: true });
  expect(router.mission.elapsedS).toBe(elapsed);
}

describe('MissionRouter completion timing', () => {
  let router: MissionRouter;
  let bus: EventBus;
  let options: ConstructorParameters<typeof MissionRouter>[0];
  const events = () => router.mission.emitted.map((e) => e.name);
  const scan = (poiId: 'primary' | 'optional') =>
    bus.emit('scan:complete', { poiId, landmarkId: 'reef', firstTime: true });
  const click = (element: Element) => element.dispatchEvent(new Event('click'));
  const title = () => control(router.panel.root, 'obj-banner-title').textContent;

  beforeEach(async () => {
    const body = new Element();
    vi.stubGlobal('HTMLElement', Element);
    vi.stubGlobal('window', new EventTarget());
    vi.stubGlobal('document', {
      body,
      activeElement: body,
      documentElement: new Element(),
      createElement: () => new Element(),
    });
    bus = new EventBus();
    const def: MissionDef = {
      version: 1,
      id: 'reef',
      tile: 'reef',
      landmark: 'reef',
      title: 'Reef',
      spawn: { lat: 0, lon: 0, depth_m: 5, heading_deg: 0 },
      briefing: { summary: '', facts: [], hazards: [] },
      completion: 'all_primary',
      objectives: [
        { id: 'primary', poi: 'primary', type: 'scan', hint: '', title: 'Primary', primary: true },
        {
          id: 'optional',
          poi: 'optional',
          type: 'scan',
          hint: '',
          title: 'Optional',
          primary: false,
        },
      ],
    };
    const stats: DebriefStats = {
      elapsedS: 0,
      distanceM: 0,
      maxDepthM: 10,
      discoveries: [],
      newEntries: [],
    };
    options = {
      bus,
      config: DEFAULT_CONFIG,
      meta: { id: 'reef' } as TileMeta,
      parent: body as unknown as HTMLElement,
      navigate: vi.fn(),
      route: { missionId: 'reef', tileId: 'reef', landmarkId: 'reef', skipBriefing: true, def },
      discovery: {
        ready: Promise.resolve(),
        pois: ['primary', 'optional'].map((id) => ({ id, name: id, position: POSITION })),
        guide: { isOpen: false, open() {} },
        stats: { snapshot: (extra) => ({ ...stats, ...extra }) },
      },
    };
    router = new MissionRouter(options);
    await Promise.resolve();
  });

  afterEach(() => {
    router?.dispose();
    vi.unstubAllGlobals();
  });

  function reach(boundary: Boundary): void {
    scan('primary');
    if (boundary.startsWith('all')) scan('optional');
    advance(router, boundary.endsWith('pending') ? 2.75 : 3);
    expect(router.panel.bannerOpen).toBe(boundary.endsWith('open'));
  }

  it('accepts optional-first and reversed primary scans without stale guidance or duplicate completion', async () => {
    router.dispose();
    options = {
      ...options,
      route: {
        ...options.route,
        def: {
          ...options.route.def,
          objectives: [
            ...options.route.def.objectives,
            { id: 'later', poi: 'later', type: 'scan', hint: '', title: 'Later', primary: true },
          ],
        },
      },
      discovery: {
        ...options.discovery,
        pois: [...options.discovery.pois, { id: 'later', name: 'later', position: POSITION }],
      },
    };
    router = new MissionRouter(options);
    await Promise.resolve();
    expect(nextScanObjective(router.mission.objectives)?.poiId).toBe('primary');
    for (const poiId of ['optional', 'later']) {
      bus.emit('scan:complete', { poiId, landmarkId: 'reef', firstTime: false });
      expect(nextScanObjective(router.mission.objectives)?.poiId).toBe('primary');
      expect(pickNavTarget(router.mission.objectives, options.discovery.pois, POSITION)?.name).toBe(
        'primary',
      );
    }
    expect(router.mission.counts()).toEqual({ completed: 2, total: 3 });
    advance(router, 3);
    expect(router.panel.bannerOpen).toBe(false);
    expect(events()).not.toContain('mission:primaryComplete');
    scan('primary');
    expect(nextScanObjective(router.mission.objectives)).toBeUndefined();
    expect(pickNavTarget(router.mission.objectives, options.discovery.pois, POSITION)).toBeNull();
    advance(router, 2.75);
    const completedEvents = [...router.mission.emitted];
    for (const poiId of ['later', 'optional', 'primary']) {
      bus.emit('scan:complete', { poiId, landmarkId: 'reef', firstTime: false });
    }
    expect(router.mission.emitted).toEqual(completedEvents);
    frame(router);
    expect(router.panel.bannerOpen).toBe(true);
    expect(title()).toBe('All objectives complete');
    expect(control(router.panel.root, 'obj-banner-detail').textContent).toBe(
      '3 of 3 objectives. Surface when you are ready.',
    );
    expect(events()).toEqual([
      'mission:started',
      'mission:objective',
      'mission:objective',
      'mission:objective',
      'mission:primaryComplete',
    ]);
    expect(router.endDive()).toBe(true);
    expect(router.debrief?.last?.title).toBe('All objectives complete');
    router.keepExploring();
    scan('primary');
    expect(router.endDive()).toBe(true);
    expect(events().filter((name) => name === 'mission:complete')).toHaveLength(1);
  });

  it('refreshes an open star preview after a bonus without restarting its dismissal timer', async () => {
    // A photo or animal scan while the banner is open must match the eventual debrief rating.
    for (const kind of ['photo', 'species'] as const) {
      router.dispose();
      const save = new ProgressSave(null);
      const progress = new Progress(save);
      router = new MissionRouter({
        ...options,
        stars: () => progress.previewStars(router.mission.objectives),
        rating: () => progress.finish('reef', router.mission.objectives),
      });
      await Promise.resolve();
      scan('primary');
      scan('optional');
      advance(router, DEFAULT_CONFIG.mission.completeDelayS);
      expect(control(router.panel.root, 'obj-banner-stars').textContent).toBe('★★☆');
      progress.award(kind, kind === 'photo' ? 'reef/primary' : 'ray');
      frame(router);
      expect(control(router.panel.root, 'obj-banner-stars').textContent).toBe('★★★');
      expect(control(router.panel.root, 'obj-banner-stars').attributes['aria-label']).toBe(
        '3 of 3 stars',
      );
      advance(router, DEFAULT_CONFIG.mission.completionBannerS - 0.25);
      expect(router.panel.bannerOpen).toBe(false);
      expect(router.endDive()).toBe(true);
      expect(control(router.debrief!.root, 'debrief-stars').textContent).toBe('★★★');
      expect(new Progress(save).rating('reef')).toBe(3);
      expect(save.get().awarded).toEqual([
        `${kind}:${kind === 'photo' ? 'reef/primary' : 'ray'}`,
        'primary:reef',
        'rating:reef/1',
        'rating:reef/2',
        'rating:reef/3',
      ]);
    }
  });

  it('Dive again after abort reloads a fresh run whose logged objectives must be scanned again', async () => {
    scan('primary');
    scan('optional');
    bus.emit('sub:emergencyBlow', { depth: 200, lockSeconds: 8, cause: 'power' });
    frame(router, { emergencyBlow: false });
    expect(router.debrief?.last?.title).toBe('Dive aborted');
    expect(events()).not.toContain('mission:complete');
    click(descendants(router.debrief!.root).find((e) => e.dataset.action === 'dive-again')!);
    expect(options.navigate).toHaveBeenCalledExactlyOnceWith(null);
    expect(events().at(-1)).toBe('mission:restart');
    expect(router.mission.state).toBe('briefing');
    expect(router.mission.counts()).toEqual({ completed: 0, total: 2 });
    expect(router.mission.elapsedS).toBe(0);
    expect(router.mission.durationS).toBeNull();
    expect(router.mission.endReason).toBeNull();

    // Dive again navigates; a new controller owns the next run, as on reload.
    const aborted = router.mission;
    router.dispose();
    router = new MissionRouter(options);
    await Promise.resolve();
    expect(nextScanObjective(router.mission.objectives)?.poiId).toBe('primary');
    advance(router, 3);
    expect(router.panel.bannerOpen).toBe(false);
    expect(router.mission.counts()).toEqual({ completed: 0, total: 2 });
    bus.emit('scan:complete', { poiId: 'primary', landmarkId: 'reef', firstTime: false });
    expect(nextScanObjective(router.mission.objectives)?.poiId).toBe('optional');
    expect(router.endDive()).toBe(true);
    expect(router.debrief?.last?.title).toBe('Primaries complete');
    // Optional targets must not dilute primary progress in the debrief.
    expect(router.debrief?.last?.objectives).toEqual({ completed: 1, total: 1 });
    router.keepExploring();
    bus.emit('scan:complete', { poiId: 'optional', landmarkId: 'reef', firstTime: false });
    advance(router, 3);
    expect(title()).toBe('All objectives complete');
    expect(router.endDive()).toBe(true);
    expect(events().filter((name) => name === 'mission:complete')).toHaveLength(1);
    expect(aborted.counts()).toEqual({ completed: 0, total: 2 });
  });

  it.each(['pending', 'open', 'dismissed'] as const)(
    'promotes a %s primary banner with the existing delay and full auto-dismiss lifetime',
    (phase) => {
      scan('primary');
      if (phase === 'pending') {
        advance(router, 1);
        pauseAndResume(router);
      } else {
        advance(router, 3);
        expect(title()).toBe('Primary objectives complete');
        advance(router, phase === 'open' ? 1 : 20);
        expect(router.panel.bannerOpen).toBe(phase === 'open');
      }
      scan('optional');
      expect(router.panel.bannerOpen).toBe(false);
      advance(router, phase === 'pending' ? 1.75 : 2.75);
      pauseAndResume(router);
      expect(router.panel.bannerOpen).toBe(false);
      frame(router);
      expect(router.panel.bannerOpen).toBe(true);
      expect(title()).toBe('All objectives complete');
      expect(control(router.panel.root, 'obj-banner-detail').textContent).toBe(
        '2 of 2 objectives. Surface when you are ready.',
      );
      advance(router, 19.75);
      pauseAndResume(router);
      expect(router.panel.bannerOpen).toBe(true);
      frame(router);
      expect(router.panel.bannerOpen).toBe(false);
      expect(router.mission.diving).toBe(true);
      expect(router.debriefOpen).toBe(false);
      expect(events()).toEqual([
        'mission:started',
        'mission:objective',
        'mission:primaryComplete',
        'mission:objective',
      ]);
      advance(router, 4);
      expect(router.panel.bannerOpen).toBe(false);
    },
  );

  it.each(BOUNDARIES)(
    'Surface cancels %s and Keep exploring permits another end, not another completion',
    (boundary) => {
      reach(boundary);
      const staleSurface = control(router.panel.root, 'is-surface');
      if (router.panel.bannerOpen) click(staleSurface);
      else expect(router.endDive()).toBe(true); // Pause-menu action while the banner is pending.
      expect(router.debriefOpen).toBe(true);
      expect(router.panel.root.hidden).toBe(true);
      const debrief = router.debrief;
      click(staleSurface);
      scan('optional'); // The debrief blocks scans; even a late event is ignored by Mission.
      advance(router, 24);
      expect(router.debrief).toBe(debrief);
      expect(router.panel.bannerOpen).toBe(false);
      expect(events().filter((e) => e === 'mission:ended')).toHaveLength(1);
      expect(events().filter((e) => e === 'mission:complete')).toHaveLength(1);
      click(descendants(router.debrief!.root).find((e) => e.dataset.action === 'keep-exploring')!);
      frame(router, { resumeFrame: true });
      advance(router, 24);
      expect(router.panel.bannerOpen).toBe(false);
      expect(router.mission.diving).toBe(true);
      expect(router.endDive()).toBe(true);
      expect(events().filter((e) => e === 'mission:complete')).toHaveLength(1);
      expect(events().filter((e) => e === 'mission:ended')).toHaveLength(2);
      expect(
        router.mission.emitted.filter((e) => e.name === 'mission:ended').map((e) => e.payload),
      ).toEqual([
        {
          missionId: 'reef',
          reason: boundary.startsWith('all') ? 'all' : 'surface',
          completed: boundary.startsWith('all') ? 2 : 1,
          total: 2,
          durationS: boundary.endsWith('pending') ? 2.75 : 3,
        },
        {
          missionId: 'reef',
          reason: boundary.startsWith('all') ? 'all' : 'surface',
          completed: boundary.startsWith('all') ? 2 : 1,
          total: 2,
          durationS: (boundary.endsWith('pending') ? 2.75 : 3) + 24,
        },
      ]);
    },
  );

  for (const cause of ['crush', 'power'] as const) {
    it(`${cause} ascent counts the first primary scan without scheduling completion actions`, () => {
      bus.emit('sub:emergencyBlow', { depth: 200, lockSeconds: 8, cause });
      scan('primary');
      expect(router.mission.primaryComplete).toBe(true);
      advance(router, 3);
      expect(router.panel.bannerOpen).toBe(false);
      expect(router.canEndDive).toBe(false);
      expect(router.emergencyAscent).toBe(true);
      expect(router.debriefOpen).toBe(false);
      frame(router, { emergencyBlow: false });
      expect(router.debrief?.last?.title).toBe('Dive aborted');
      // Optional targets must not dilute primary progress in the debrief.
      expect(router.debrief?.last?.objectives).toEqual({ completed: 1, total: 1 });
      expect(events()).toEqual([
        'mission:started',
        'mission:objective',
        'mission:primaryComplete',
        'mission:aborted',
        'mission:ended',
      ]);
      expect(router.mission.emitted.at(-1)?.payload).toMatchObject({
        reason: 'abort',
        completed: 1,
        total: 2,
      });
    });

    for (const finish of ['next update', 'after delay'] as const) {
      it.each(BOUNDARIES)(
        `${cause} ascent from %s finishes ${finish} without completion actions overriding abort`,
        (boundary) => {
          reach(boundary);
          const staleSurface = control(router.panel.root, 'is-surface');
          const staleKeep = control(router.panel.root, 'is-keep');
          bus.emit('sub:emergencyBlow', { depth: 200, lockSeconds: 8, cause });
          expect(router.panel.bannerOpen).toBe(false);
          expect(router.canEndDive).toBe(false);
          expect(router.alert).toContain('EMERGENCY ASCENT');
          click(staleSurface);
          click(staleKeep);
          expect(router.endDive()).toBe(false);
          // events precedes scan.discovery, which precedes play.mission. Ascent
          // locks vehicle controls, but the caller still permits the scan beam.
          scan('optional');
          if (finish === 'after delay') {
            advance(router, 3);
            expect(router.panel.bannerOpen).toBe(false);
            expect(router.debriefOpen).toBe(false);
            expect(router.mission.diving).toBe(true);
          }
          frame(router, { emergencyBlow: false });
          expect(router.emergencyAscent).toBe(false);
          expect(router.alert).toBeNull();
          expect(router.debriefOpen).toBe(true);
          expect(router.debrief?.last?.title).toBe('Dive aborted');
          // Optional scans must not inflate primary progress after an abort.
          expect(router.debrief?.last?.objectives).toEqual({ completed: 1, total: 1 });
          expect(router.panel.bannerOpen).toBe(false);
          expect(router.panel.root.hidden).toBe(true);
          expect(router.mission.canResume).toBe(false);
          expect(
            descendants(router.debrief!.root).some((e) => e.dataset.action === 'keep-exploring'),
          ).toBe(false);
          const expected = [
            'mission:started',
            'mission:objective',
            'mission:primaryComplete',
            'mission:objective',
            'mission:aborted',
            'mission:ended',
          ];
          expect(events()).toEqual(expected);
          expect(router.mission.emitted.find((e) => e.name === 'mission:aborted')?.payload).toEqual(
            {
              missionId: 'reef',
              reason: cause,
            },
          );
          const end = router.mission.emitted.at(-1)?.payload;
          expect(end).toEqual({
            missionId: 'reef',
            reason: 'abort',
            completed: 2,
            total: 2,
            durationS:
              (boundary.endsWith('pending') ? 2.75 : 3) + (finish === 'after delay' ? 3 : 0) + 0.25,
          });
          const debrief = router.debrief;
          click(staleSurface);
          click(staleKeep);
          router.keepExploring();
          expect(router.endDive()).toBe(false);
          scan('primary');
          scan('optional');
          advance(router, 24);
          expect(router.debrief).toBe(debrief);
          expect(router.debriefOpen).toBe(true);
          expect(router.panel.bannerOpen).toBe(false);
          expect(router.mission.diving).toBe(false);
          expect(events()).toEqual(expected);
        },
      );
    }
  }

  it('an abort after voluntary completion cannot resume through an old Keep exploring action or award completion again', () => {
    reach('primary open');
    click(control(router.panel.root, 'is-surface'));
    const oldKeep = descendants(router.debrief!.root).find(
      (e) => e.dataset.action === 'keep-exploring',
    )!;
    click(oldKeep);
    frame(router, { resumeFrame: true });
    scan('optional');
    advance(router, 3);
    expect(title()).toBe('All objectives complete');
    bus.emit('sub:emergencyBlow', { depth: 200, lockSeconds: 8, cause: 'power' });
    frame(router, { emergencyBlow: false });
    const summary = router.debrief?.last;
    click(oldKeep);
    expect(router.endDive()).toBe(false);
    advance(router, 24);
    expect(router.debriefOpen).toBe(true);
    expect(router.debrief?.last).toBe(summary);
    expect(router.mission.diving).toBe(false);
    expect(router.panel.bannerOpen).toBe(false);
    expect(events()).toEqual([
      'mission:started',
      'mission:objective',
      'mission:primaryComplete',
      'mission:complete',
      'mission:ended',
      'mission:objective',
      'mission:aborted',
      'mission:ended',
    ]);
  });
});
