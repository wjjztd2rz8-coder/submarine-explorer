/**
 * B3 routing + navigation maths: `?mission=` resolution, the surface-start
 * spawn pose, hull/sim-speed loadout, the frozen input, and the objectives
 * panel's bearing/range (checked against the Submarine's own heading).
 */

import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, makeConfig } from '../../src/core/Config.js';
import type { FetchJson } from '../../src/game/ContentPath.js';
import { parseMission, type MissionDef, type ObjectiveStatus } from '../../src/game/Mission.js';
import {
  FROZEN_INPUT,
  applyMissionLoadout,
  bearingTo,
  chooseTileId,
  missionSpawnPose,
  pickNavTarget,
  resolveMissionRoute,
} from '../../src/game/MissionRouter.js';
import { Submarine, type HeightField } from '../../src/sub/Submarine.js';
import { formatRange, formatTurn } from '../../src/ui/ObjectivesPanel.js';
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
    expect(formatRange(640.4)).toBe('640 m');
    expect(formatRange(2140)).toBe('2.14 km');
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
