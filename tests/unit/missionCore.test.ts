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
    { id: 'p1', type: 'scan', poi: 'poi-a', primary: true, title: 'A', hint: '  North end.  ' },
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
    // D-FLOW: the content hint passes through, trimmed; absent is empty.
    expect(d.objectives.map((o) => o.hint)).toEqual(['North end.', '', '']);
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

describe('Mission state machine (D-FLOW)', () => {
  const NAMES = [
    'mission:started',
    'mission:objective',
    'mission:primaryComplete',
    'mission:complete',
    'mission:ended',
    'mission:restart',
  ] as const;
  function setup(): { m: Mission; bus: EventBus; log: string[] } {
    const bus = new EventBus();
    const log: string[] = [];
    for (const n of NAMES) bus.on(n, (p) => log.push(`${n} ${JSON.stringify(p)}`));
    const m = new Mission({ def: def(), bus, warn: quiet });
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
    expect(m.state).toBe('diving');
    expect(log).toEqual(['mission:started {"missionId":"site","tileId":"site-tile"}']);
  });

  it('the last primary emits one primaryComplete and the dive carries on', () => {
    const { m, bus, log } = setup();
    m.start('site-tile');
    m.update(10);
    scan(bus, 'poi-a');
    expect(m.state).toBe('diving');
    scan(bus, 'poi-a'); // repeat scan: no second event
    scan(bus, 'poi-b');
    expect(m.state).toBe('primaries-complete');
    expect(m.primaryComplete).toBe(true);
    expect(log.at(-1)).toBe('mission:primaryComplete {"missionId":"site","completed":2,"total":3}');
    // Nothing finishes on its own.
    m.update(600);
    expect(m.state).toBe('primaries-complete');
    expect(m.durationS).toBeNull();
    // Secondary scans still count after the primaries.
    scan(bus, 'poi-c');
    expect(m.allComplete).toBe(true);
    expect(m.state).toBe('primaries-complete');
    expect(m.emitted.map((e) => e.name)).toEqual([
      'mission:started',
      'mission:objective',
      'mission:objective',
      'mission:primaryComplete',
      'mission:objective',
    ]);
  });

  it('ending after the primaries emits complete then ended, once each; resume returns', () => {
    const { m, bus, log } = setup();
    m.start('t');
    scan(bus, 'poi-a');
    scan(bus, 'poi-b');
    m.update(13.1);
    log.length = 0;
    expect(m.end()).toBe(true);
    expect(m.state).toBe('debrief');
    expect(m.endReason).toBe('surface');
    expect(m.durationS).toBeCloseTo(13.1, 6);
    expect(log).toEqual([
      'mission:complete {"missionId":"site","durationS":13.1}',
      'mission:ended {"missionId":"site","reason":"surface","completed":2,"total":3,"durationS":13.1}',
    ]);
    // The debrief does not count as dive time; Keep exploring resumes the dive.
    m.update(50);
    expect(m.elapsedS).toBeCloseTo(13.1, 6);
    expect(m.canResume).toBe(true);
    expect(m.resume()).toBe(true);
    expect(m.state).toBe('primaries-complete');
    expect(m.durationS).toBeNull();
    scan(bus, 'poi-c');
    m.update(1);
    log.length = 0;
    m.end();
    // mission:complete fired once already; ended fires on every debrief.
    expect(log).toEqual([
      'mission:ended {"missionId":"site","reason":"all","completed":3,"total":3,"durationS":14.1}',
    ]);
    expect(m.end()).toBe(false); // already in the debrief
  });

  it('surfacing before the primaries ends without mission:complete', () => {
    const { m, bus, log } = setup();
    m.start('t');
    scan(bus, 'poi-c');
    log.length = 0;
    m.end();
    expect(m.state).toBe('debrief');
    expect(log).toEqual([
      'mission:ended {"missionId":"site","reason":"surface","completed":1,"total":3,"durationS":0}',
    ]);
    m.resume();
    expect(m.state).toBe('diving');
    scan(bus, 'poi-a');
    scan(bus, 'poi-b');
    log.length = 0;
    m.end();
    expect(log.map((l) => l.split(' ')[0])).toEqual(['mission:complete', 'mission:ended']);
  });

  it('cannot end or resume outside a dive', () => {
    const { m } = setup();
    expect(m.end()).toBe(false);
    expect(m.resume()).toBe(false);
    expect(m.state).toBe('briefing');
  });

  it('unresolved objectives neither count nor block', () => {
    const bus = new EventBus();
    const warnings: string[] = [];
    const m = new Mission({ def: def(), bus, warn: (w) => warnings.push(w) });
    m.resolve(['poi-a', 'poi-c']); // poi-b is missing from pois.json
    expect(warnings).toHaveLength(1);
    expect(m.requiredPrimaries().map((o) => o.id)).toEqual(['p1']);
    m.start('t');
    scan(bus, 'poi-b');
    expect(m.objectives[1]?.complete).toBe(false);
    scan(bus, 'poi-a');
    expect(m.state).toBe('primaries-complete');
    expect(m.counts()).toEqual({ completed: 1, total: 2 });
  });

  it('never completes with no resolvable primary', () => {
    const bus = new EventBus();
    const m = new Mission({ def: def(), bus, warn: quiet });
    m.resolve(['poi-c']);
    m.start('t');
    scan(bus, 'poi-c');
    m.update(1);
    expect(m.primaryComplete).toBe(false);
    expect(m.state).toBe('diving');
  });

  it('restart emits mission:restart and resets to a fresh dive; onChange fires', () => {
    const { m, bus, log } = setup();
    let changes = 0;
    const off = m.onChange(() => changes++);
    m.start('t');
    scan(bus, 'poi-a');
    scan(bus, 'poi-b');
    m.end();
    m.restart();
    expect(log.at(-1)).toBe('mission:restart {"missionId":"site"}');
    expect(m.state).toBe('briefing');
    expect(m.endReason).toBeNull();
    expect(m.objectives.every((o) => !o.complete)).toBe(true);
    expect(changes).toBe(5);
    // A fresh dive can complete (and emit mission:complete) again.
    m.start('t');
    scan(bus, 'poi-a');
    scan(bus, 'poi-b');
    m.end();
    expect(m.emitted.filter((e) => e.name === 'mission:complete')).toHaveLength(2);
    off();
    m.dispose();
    m.restart();
    m.start('t');
    scan(bus, 'poi-a'); // disposed: no longer listening
    expect(m.objectives[0]?.complete).toBe(false);
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
    const m = new Mission({ def: d as MissionDef, bus, warn: (w) => warnings.push(w) });
    m.resolve(pois.map((p) => p.id));
    expect(warnings).toEqual([]);
    expect(m.requiredPrimaries().map((o) => o.poiId)).toEqual(['titanic-bow', 'titanic-stern']);
    expect(m.objectives.filter((o) => !o.primary)).toHaveLength(2);
  });
});
