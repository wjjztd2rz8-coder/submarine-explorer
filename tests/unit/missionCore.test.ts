/**
 * B3 mission core: mission.json validation, the landmarks manifest, and the
 * Mission state machine driven by a fake bus (no DOM, no Three.js).
 */

import { describe, expect, it } from 'vitest';
import { EventBus } from '../../src/core/EventBus.js';
import {
  Mission,
  loadMission,
  loadMissionSummaries,
  parseMission,
  parseMissionIndex,
  type MissionDef,
} from '../../src/game/Mission.js';
import { parsePois } from '../../src/game/Pois.js';
import type { FetchJson } from '../../src/game/ContentPath.js';
import landmarkIndex from '../../data/landmarks/index.json';
import titanicMission from '../../data/landmarks/titanic/mission.json';
import titanicPois from '../../data/landmarks/titanic/pois.json';

const quiet = (): void => {};

const MINIMAL = {
  version: 1,
  landmark: 'site',
  tile: 'site-tile',
  title: 'Test dive',
  hull_class: 'B',
  spawn: { lat: 41.74, lon: -49.97, depth_m: 5, heading_deg: 150 },
  briefing: { summary: 'Go.', depth_m: 3800, facts: ['a'], hazards: ['b'], memorial_note: 'quiet' },
  objectives: [
    { id: 'p1', type: 'scan', poi: 'poi-a', primary: true, title: 'A' },
    { id: 'p2', type: 'scan', poi: 'poi-b', primary: true, title: 'B' },
    { id: 's1', type: 'scan', poi: 'poi-c', primary: false, title: 'C' },
  ],
  completion: 'all_primary',
};

function def(overrides: Record<string, unknown> = {}): MissionDef {
  const d = parseMission({ ...MINIMAL, ...overrides }, 'site', quiet);
  if (!d) throw new Error('fixture failed to parse');
  return d;
}

function fakeFetch(files: Record<string, unknown>): FetchJson {
  return async (url) => {
    const hit = files[url];
    if (hit === undefined) return { ok: false, text: async () => '<!doctype html>' };
    return { ok: true, text: async () => JSON.stringify(hit) };
  };
}

describe('parseMission', () => {
  it('accepts the contracts §2.4 shape', () => {
    const d = def();
    expect(d.id).toBe('site');
    expect(d.landmark).toBe('site');
    expect(d.tile).toBe('site-tile');
    expect(d.hull_class).toBe('B');
    expect(d.spawn).toEqual({ lat: 41.74, lon: -49.97, depth_m: 5, heading_deg: 150 });
    expect(d.briefing.memorial_note).toBe('quiet');
    expect(d.objectives.map((o) => o.id)).toEqual(['p1', 'p2', 's1']);
    expect(d.completion).toBe('all_primary');
  });

  it('defaults landmark and tile to the folder id, depth to a surface start', () => {
    const d = parseMission(
      { spawn: { lat: 1, lon: 2 }, objectives: [{ id: 'o', poi: 'p' }] },
      'folder',
      quiet,
    );
    expect(d?.landmark).toBe('folder');
    expect(d?.tile).toBe('folder');
    expect(d?.spawn.depth_m).toBe(5);
    expect(d?.spawn.heading_deg).toBe(0);
    expect(d?.objectives[0]?.primary).toBe(true); // primary unless stated otherwise
    expect(d?.title).toBe('folder');
  });

  it('rejects documents without a usable spawn or objective', () => {
    expect(parseMission(null, 'x', quiet)).toBeNull();
    expect(parseMission({ ...MINIMAL, spawn: { lat: 'n' } }, 'x', quiet)).toBeNull();
    expect(parseMission({ ...MINIMAL, spawn: { lat: 95, lon: 0 } }, 'x', quiet)).toBeNull();
    expect(parseMission({ ...MINIMAL, objectives: [] }, 'x', quiet)).toBeNull();
  });

  it('drops malformed / duplicate / unsupported objectives, keeps the rest', () => {
    const warnings: string[] = [];
    const d = parseMission(
      {
        ...MINIMAL,
        objectives: [
          { id: 'ok', poi: 'a' },
          { id: 'ok', poi: 'b' },
          { id: 'nopoi' },
          { id: 'fly', type: 'reach', poi: 'c' },
          'junk',
        ],
      },
      'x',
      (m) => warnings.push(m),
    );
    expect(d?.objectives.map((o) => o.id)).toEqual(['ok']);
    expect(warnings).toHaveLength(4);
  });

  it('normalises heading and a negative depth slip', () => {
    const d = def({ spawn: { lat: 0, lon: 0, depth_m: -300, heading_deg: -90 } });
    expect(d.spawn.depth_m).toBe(300);
    expect(d.spawn.heading_deg).toBe(270);
  });

  it('ignores unsafe tile/landmark ids', () => {
    const d = def({ tile: '../etc', landmark: 'a b' });
    expect(d.landmark).toBe('site');
    expect(d.tile).toBe('site');
  });
});

describe('manifest + loaders', () => {
  it('parses data/landmarks/index.json', () => {
    expect(parseMissionIndex({ version: 1, landmarks: ['titanic', 'x', 'x', '../no', 3] })).toEqual(
      ['titanic', 'x'],
    );
    expect(parseMissionIndex(null)).toEqual([]);
    expect(parseMissionIndex(landmarkIndex)).toContain('titanic');
  });

  it('loadMission: missing file and bad ids are null, never a throw', async () => {
    const f = fakeFetch({ '/data/landmarks/site/mission.json': MINIMAL });
    expect((await loadMission('site', f, quiet))?.title).toBe('Test dive');
    expect(await loadMission('nope', f, quiet)).toBeNull();
    expect(await loadMission('../../etc', f, quiet)).toBeNull();
  });

  it('loadMissionSummaries follows the manifest order and skips broken entries', async () => {
    const f = fakeFetch({
      '/data/landmarks/index.json': { version: 1, landmarks: ['site', 'gone', 'other'] },
      '/data/landmarks/site/mission.json': MINIMAL,
      '/data/landmarks/other/mission.json': { ...MINIMAL, title: 'Other', tile: 'other' },
    });
    const list = await loadMissionSummaries(f, quiet);
    expect(list.map((m) => m.id)).toEqual(['site', 'other']);
    expect(list[0]).toEqual({
      id: 'site',
      title: 'Test dive',
      summary: 'Go.',
      depthM: 3800,
      tile: 'site-tile',
    });
  });
});

describe('Mission state machine', () => {
  function setup(delay = 3): { m: Mission; bus: EventBus; log: string[] } {
    const bus = new EventBus();
    const log: string[] = [];
    for (const n of [
      'mission:started',
      'mission:objective',
      'mission:complete',
      'mission:restart',
    ] as const) {
      bus.on(n, (p) => log.push(`${n} ${JSON.stringify(p)}`));
    }
    const m = new Mission({ def: def(), bus, completeDelayS: delay, warn: quiet });
    m.resolve(['poi-a', 'poi-b', 'poi-c']);
    return { m, bus, log };
  }
  const scan = (bus: EventBus, poiId: string): void =>
    bus.emit('scan:complete', { poiId, landmarkId: 'site', firstTime: true });

  it('starts in the briefing and ignores scans until started', () => {
    const { m, bus, log } = setup();
    expect(m.state).toBe('briefing');
    scan(bus, 'poi-a');
    expect(m.objectives[0]?.complete).toBe(false);
    m.start('site-tile');
    m.start('site-tile'); // idempotent
    expect(m.state).toBe('running');
    expect(log).toEqual(['mission:started {"missionId":"site","tileId":"site-tile"}']);
  });

  it('completes all_primary after the delay, secondaries optional', () => {
    const { m, bus, log } = setup(3);
    m.start('site-tile');
    m.update(10);
    scan(bus, 'poi-c'); // secondary
    scan(bus, 'poi-a');
    expect(m.state).toBe('running');
    scan(bus, 'poi-a'); // repeat scan: no second event
    scan(bus, 'poi-b');
    expect(m.state).toBe('completing');
    expect(m.primaryComplete).toBe(true);
    m.update(2.9);
    expect(m.state).toBe('completing');
    m.update(0.2);
    expect(m.state).toBe('complete');
    expect(m.durationS).toBeCloseTo(13.1, 6);
    expect(log.filter((l) => l.startsWith('mission:objective'))).toEqual([
      'mission:objective {"missionId":"site","objectiveId":"s1","complete":true}',
      'mission:objective {"missionId":"site","objectiveId":"p1","complete":true}',
      'mission:objective {"missionId":"site","objectiveId":"p2","complete":true}',
    ]);
    expect(log.at(-1)).toMatch(/^mission:complete \{"missionId":"site","durationS":13\.1/);
    expect(m.emitted.map((e) => e.name)).toEqual([
      'mission:started',
      'mission:objective',
      'mission:objective',
      'mission:objective',
      'mission:complete',
    ]);
    // Scans after completion change nothing.
    m.update(100);
    expect(m.durationS).toBeCloseTo(13.1, 6);
  });

  it('a zero delay completes on the next update, not inside the scan handler', () => {
    const { m, bus } = setup(0);
    m.start('t');
    scan(bus, 'poi-a');
    scan(bus, 'poi-b');
    expect(m.state).toBe('completing');
    m.update(0);
    expect(m.state).toBe('complete');
  });

  it('unresolved objectives neither count nor block', () => {
    const bus = new EventBus();
    const warnings: string[] = [];
    const m = new Mission({ def: def(), bus, completeDelayS: 0, warn: (w) => warnings.push(w) });
    m.resolve(['poi-a', 'poi-c']); // poi-b is missing from pois.json
    expect(warnings).toHaveLength(1);
    expect(m.requiredPrimaries().map((o) => o.id)).toEqual(['p1']);
    m.start('t');
    scan(bus, 'poi-b');
    expect(m.objectives[1]?.complete).toBe(false);
    scan(bus, 'poi-a');
    m.update(0);
    expect(m.state).toBe('complete');
  });

  it('never completes with no resolvable primary', () => {
    const bus = new EventBus();
    const m = new Mission({ def: def(), bus, completeDelayS: 0, warn: quiet });
    m.resolve(['poi-c']);
    m.start('t');
    scan(bus, 'poi-c');
    m.update(1);
    expect(m.primaryComplete).toBe(false);
    expect(m.state).toBe('running');
  });

  it('restart emits mission:restart and resets progress; onChange fires', () => {
    const { m, bus, log } = setup(0);
    let changes = 0;
    const off = m.onChange(() => changes++);
    m.start('t');
    scan(bus, 'poi-a');
    m.restart();
    expect(log.at(-1)).toBe('mission:restart {"missionId":"site"}');
    expect(m.state).toBe('briefing');
    expect(m.objectives.every((o) => !o.complete)).toBe(true);
    expect(changes).toBe(3);
    off();
    m.dispose();
    m.start('t');
    scan(bus, 'poi-a'); // disposed: no longer listening
    expect(m.objectives[0]?.complete).toBe(false);
    expect(changes).toBe(3);
  });

  it('the briefing time is not dive time', () => {
    const { m } = setup();
    m.update(50);
    expect(m.elapsedS).toBe(0);
    m.start('t');
    m.update(1.5);
    expect(m.elapsedS).toBe(1.5);
  });
});

describe('Titanic content (B2) against the mission loader', () => {
  it('parses, and every objective resolves to a POI in pois.json', () => {
    const warnings: string[] = [];
    const d = parseMission(titanicMission, 'titanic', (w) => warnings.push(w));
    expect(warnings).toEqual([]);
    expect(d?.tile).toBe('titanic');
    expect(d?.spawn.depth_m).toBe(5);
    const pois = parsePois(titanicPois, quiet);
    const bus = new EventBus();
    const m = new Mission({
      def: d as MissionDef,
      bus,
      completeDelayS: 3,
      warn: (w) => warnings.push(w),
    });
    m.resolve(pois.map((p) => p.id));
    expect(warnings).toEqual([]);
    expect(m.requiredPrimaries().map((o) => o.poiId)).toEqual(['titanic-bow', 'titanic-stern']);
    expect(m.objectives.filter((o) => !o.primary)).toHaveLength(2);
  });
});
