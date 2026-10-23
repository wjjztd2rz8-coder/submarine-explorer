/**
 * Mission core: mission.json validation, the landmarks manifest, and the
 * Mission state machine driven by a fake bus and headless scans (no DOM).
 */

import { describe, expect, it } from 'vitest';
import { EventBus } from '../../src/core/EventBus.js';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { Vector3 } from 'three';
import { DiscoveryStore } from '../../src/game/DiscoveryStore.js';
import { Scanner } from '../../src/game/Scanner.js';
import {
  Mission,
  nextScanObjective,
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

it('reloads a mid-mission save with Journal discoveries intact and a scannable opening objective', () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
  const bus = new EventBus();
  const mission = new Mission({ def: def(), bus });
  const store = new DiscoveryStore(storage);
  const scanner = new Scanner(DEFAULT_CONFIG.scan, bus, store);
  const target = (id: string) => ({
    id,
    name: id,
    landmarkId: 'site',
    position: new Vector3(0, -100, -10),
    radius: 20,
    scanSeconds: 2,
  });
  const position = new Vector3(0, -100, 0);
  const forward = new Vector3(0, 0, -1);
  mission.start('site-tile');
  mission.update(30);
  scanner.setTargets([target('poi-a')]);
  scanner.update(2, position, forward, true);
  expect(mission.counts()).toEqual({ completed: 1, total: 3 });
  expect(store.isDiscovered('site', 'poi-a')).toBe(true);
  scanner.setTargets([target('poi-b')]);
  scanner.update(1, position, forward, true);
  expect(scanner.view.progress).toBe(0.5);
  expect(store.isDiscovered('site', 'poi-b')).toBe(false);
  const saved = new Map(values);
  const firstRecord = store.get('site', 'poi-a');
  mission.dispose();

  const reloadedBus = new EventBus();
  const reloaded = new Mission({ def: def(), bus: reloadedBus });
  const journal = new DiscoveryStore(storage);
  const beam = new Scanner(DEFAULT_CONFIG.scan, reloadedBus, journal);
  expect(reloaded.state).toBe('briefing');
  expect(reloaded.elapsedS).toBe(0);
  expect(reloaded.counts()).toEqual({ completed: 0, total: 3 });
  expect(nextScanObjective(reloaded.objectives)?.poiId).toBe('poi-a');
  expect(beam.view.progress).toBe(0);
  expect(beam.view.completed).toBe(0);
  expect(journal.keys()).toEqual(['site/poi-a']);
  expect(values).toEqual(saved);
  reloaded.start('site-tile');
  beam.setTargets([target('poi-a')]);
  beam.update(2, position, forward, true);
  expect(beam.view.lastCompleteFirstTime).toBe(false);
  expect(reloaded.counts()).toEqual({ completed: 1, total: 3 });
  expect(reloaded.state).toBe('diving');
  expect(nextScanObjective(reloaded.objectives)?.poiId).toBe('poi-b');
  expect(journal.get('site', 'poi-a')).toEqual({ ...firstRecord, count: 2 });
  expect(new DiscoveryStore(storage).keys()).toEqual(['site/poi-a']);
  reloaded.dispose();
});

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
  it('ships every site once in increasing briefing depth with titles from mission data', async () => {
    // Guard missing/duplicate picker rows and accidental return to the old catalog order.
    const docs = import.meta.glob('../../data/landmarks/*/mission.json', {
      eager: true,
      import: 'default',
    });
    const files: Record<string, unknown> = { '/data/landmarks/index.json': landmarkIndex };
    const ids = Object.keys(docs).map((path) => path.split('/').at(-2)!);
    for (const [path, doc] of Object.entries(docs)) files[path.replace('../..', '')] = doc;
    expect(landmarkIndex.landmarks).toHaveLength(13);
    expect(new Set(landmarkIndex.landmarks).size).toBe(13);
    expect([...landmarkIndex.landmarks].sort()).toEqual(ids.sort());

    const list = await loadMissionSummaries(fakeFetch(files), quiet);
    expect(list.map((m) => m.id)).toEqual(landmarkIndex.landmarks);
    const depths = list.map((m) => m.depthM);
    expect(depths.every((depth) => typeof depth === 'number' && depth > 0)).toBe(true);
    expect(depths).toEqual([...depths].sort((a, b) => a! - b!));
    for (const summary of list) {
      const doc = files[`/data/landmarks/${summary.id}/mission.json`] as typeof MINIMAL;
      expect(summary.title).toBe(doc.title);
      expect(summary.depthM).toBe(doc.briefing.depth_m);
    }
    expect(list[0].title).toBe('Great Blue Hole: Lighthouse Reef');
    expect(list.at(-1)?.id).toBe('challenger-deep');
  });

  it('keeps manifest order for equal depths even when requests complete in reverse', async () => {
    // The authored manifest position is the stable tie-break, independent of network timing.
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const completed: string[] = [];
    const fetchFiles = fakeFetch({
      '/data/landmarks/index.json': { version: 1, landmarks: ['z', 'a'] },
      '/data/landmarks/z/mission.json': { ...MINIMAL, title: 'Z' },
      '/data/landmarks/a/mission.json': { ...MINIMAL, title: 'A' },
    });
    const list = await loadMissionSummaries(async (url) => {
      if (url.endsWith('/z/mission.json')) await held;
      if (url.endsWith('/a/mission.json')) release();
      completed.push(url);
      return fetchFiles(url);
    }, quiet);
    expect(completed.slice(1)).toEqual([
      '/data/landmarks/a/mission.json',
      '/data/landmarks/z/mission.json',
    ]);
    expect(list.map((m) => [m.id, m.depthM, m.title])).toEqual([
      ['z', 3800, 'Z'],
      ['a', 3800, 'A'],
    ]);
  });

  it('parses data/landmarks/index.json', () => {
    expect(parseMissionIndex({ version: 1, landmarks: ['titanic', 'x', 'x', '../no', 3] })).toEqual(
      ['titanic', 'x'],
    );
    expect(parseMissionIndex(null)).toEqual([]);
    expect(parseMissionIndex(landmarkIndex)).toContain('titanic');
  });

  it.each([undefined, null, 'unknown'])(
    'keeps a site with depth %s in its authored position without inventing a depth',
    async (depth) => {
      const files = fakeFetch({
        '/data/landmarks/index.json': { version: 1, landmarks: ['deep', 'unknown', 'shallow'] },
        '/data/landmarks/deep/mission.json': MINIMAL,
        '/data/landmarks/unknown/mission.json': {
          ...MINIMAL,
          briefing: { ...MINIMAL.briefing, depth_m: depth },
        },
        '/data/landmarks/shallow/mission.json': {
          ...MINIMAL,
          briefing: { ...MINIMAL.briefing, depth_m: 125 },
        },
      });
      expect((await loadMissionSummaries(files, quiet)).map((m) => [m.id, m.depthM])).toEqual([
        ['deep', 3800],
        ['unknown', null],
        ['shallow', 125],
      ]);
    },
  );

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

  it('keeps usable neighbors through mixed failures and recovers on a fresh explicit load', async () => {
    const ids = ['site', 'failed', 'invalid', 'neighbor'];
    const files = {
      '/data/landmarks/index.json': { version: 1, landmarks: ids },
      '/data/landmarks/site/mission.json': MINIMAL,
      '/data/landmarks/failed/mission.json': {
        ...MINIMAL,
        title: 'Restored dive',
        tile: 'restored-tile',
        briefing: { ...MINIMAL.briefing, summary: 'Restored.', depth_m: 750 },
      },
      '/data/landmarks/invalid/mission.json': { ...MINIMAL, objectives: [] },
      '/data/landmarks/neighbor/mission.json': {
        ...MINIMAL,
        title: 'Neighbor dive',
        tile: 'neighbor-tile',
        briefing: { ...MINIMAL.briefing, summary: 'Nearby.', depth_m: 125 },
      },
    };
    const fetchFiles = fakeFetch(files);
    type Response = Awaited<ReturnType<FetchJson>>;
    const held = new Map(
      ids.map((id) => {
        let resolve!: (value: Response | PromiseLike<Response>) => void;
        let reject!: (reason: Error) => void;
        const promise = new Promise<Response>((yes, no) => {
          resolve = yes;
          reject = no;
        });
        return [
          `/data/landmarks/${id}/mission.json` as string,
          { promise, resolve, reject },
        ] as const;
      }),
    );
    const requested: string[] = [];
    const completed: string[] = [];
    let allStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      allStarted = resolve;
    });
    const batch = loadMissionSummaries(async (url) => {
      const request = held.get(url);
      if (!request) return fetchFiles(url);
      requested.push(url);
      if (requested.length === ids.length) allStarted();
      try {
        return await request.promise;
      } finally {
        completed.push(url);
      }
    }, quiet);
    await started;
    // A later usable document settles first; neither failure may discard its neighbors.
    for (const id of ['neighbor', 'invalid', 'failed', 'site']) {
      const url = `/data/landmarks/${id}/mission.json`;
      const request = held.get(url)!;
      if (id === 'failed') request.reject(new Error('mission request unavailable'));
      else request.resolve(await fetchFiles(url));
      await request.promise.catch(quiet);
    }
    const list = await batch;
    expect(completed).toEqual(
      ['neighbor', 'invalid', 'failed', 'site'].map((id) => `/data/landmarks/${id}/mission.json`),
    );
    const usable = [
      { id: 'site', title: 'Test dive', summary: 'Go.', depthM: 3800, tile: 'site-tile' },
      {
        id: 'neighbor',
        title: 'Neighbor dive',
        summary: 'Nearby.',
        depthM: 125,
        tile: 'neighbor-tile',
      },
    ];
    expect(list).toEqual(usable);

    const recovered = await loadMissionSummaries(fetchFiles, quiet);
    expect(recovered).toEqual([
      usable[0],
      {
        id: 'failed',
        title: 'Restored dive',
        summary: 'Restored.',
        depthM: 750,
        tile: 'restored-tile',
      },
      usable[1],
    ]);
    expect(list).toEqual(usable);
  });

  it('fulfills with an empty catalog when the index request rejects', async () => {
    let reject!: (reason: Error) => void;
    const held = new Promise<never>((_resolve, no) => {
      reject = no;
    });
    const requested: string[] = [];
    const batch = loadMissionSummaries((url) => {
      requested.push(url);
      return held;
    }, quiet);
    reject(new Error('index request unavailable'));
    await expect(batch).resolves.toEqual([]);
    expect(requested).toEqual(['/data/landmarks/index.json']);
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
