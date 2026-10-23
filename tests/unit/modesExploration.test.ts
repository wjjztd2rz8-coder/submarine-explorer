// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { existsSync, readFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { Scene, Vector3 } from 'three';
import { makeConfig } from '../../src/core/Config.js';
import { EventBus } from '../../src/core/EventBus.js';
import { Save, ProgressSave, type GameplayMode } from '../../src/core/Save.js';
import { createExploreSystem } from '../../src/app/systems/explore.js';
import type { GameContext } from '../../src/app/context.js';
import { dailyDive } from '../../src/game/Daily.js';
import { DiscoveryStore, DISCOVERY_STORAGE_KEY } from '../../src/game/DiscoveryStore.js';
import { Progress } from '../../src/game/Progress.js';
import { Scanner } from '../../src/game/Scanner.js';
import * as Secrets from '../../src/game/Secrets.js';
import type { ExplorationSummary } from '../../src/ui/Debrief.js';
import type { Samples } from '../../src/game/Samples.js';
import { Input } from '../../src/core/Input.js';
import { Submarine } from '../../src/sub/Submarine.js';
import { resolveEffective } from '../../src/game/EffectiveSettings.js';
import { modesSystem } from '../../src/app/systems/modes.js';
import { createProgressSystem } from '../../src/app/systems/progress.js';
import { Discovery } from '../../src/game/Discovery.js';
import type { ScanTarget } from '../../src/game/Scanner.js';
import type { TileMeta } from '../../src/util/types.js';
import { parseMission, parseMissionIndex } from '../../src/game/Mission.js';
import { isEntryUnlocked, isSiteUnlocked, loadJournalSites } from '../../src/game/JournalData.js';
import type { FetchJson } from '../../src/game/ContentPath.js';
import * as SecretVisuals from '../../src/game/SecretsVisual.js';
import * as EventVisuals from '../../src/game/EventsVisual.js';

// A local module facade lets individual CPU cases replace visual constructors.
vi.mock('three', async (importOriginal) => ({
  ...(await importOriginal<typeof import('three')>()),
}));

// Replace DOM views only; keep Discovery's subscriptions and session reset real.
vi.mock('../../src/ui/ScanOverlay.js', () => ({
  ScanOverlay: class {
    showComplete = vi.fn();
    clear = vi.fn();
    dispose = vi.fn();
  },
}));
vi.mock('../../src/ui/FieldGuide.js', () => ({
  FieldGuide: class {
    setContent = vi.fn();
    focus = vi.fn();
    refresh = vi.fn();
    dispose = vi.fn();
  },
}));
vi.mock('../../src/ui/Debrief.js', () => ({
  Debrief: class {
    dispose = vi.fn();
  },
}));

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const readJson = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));
const sampleSites = parseMissionIndex(readJson('data/landmarks/index.json')).map((site) => {
  const path = `data/secrets/${site}.json`;
  const doc = Secrets.parseSecrets(existsSync(path) ? readJson(path) : null);
  return { site, doc };
});
const shippedSamples = sampleSites.flatMap(({ site, doc }) =>
  doc.samples.map((sample) => ({ site, sample })),
);
const localContentFetch: FetchJson = async (url) => {
  if (
    !/^\/data\/(?:landmarks(?:\.json|\/index\.json|\/[a-z0-9-]+\/[a-z]+\.json)|secrets\/[a-z0-9-]+\.json)$/.test(
      url,
    )
  )
    return { ok: false, text: async () => '' };
  try {
    const source = readFileSync(`.${url}`, 'utf8');
    return { ok: true, text: async () => source };
  } catch {
    return { ok: false, text: async () => '' };
  }
};

/** Keep Explore's real subscriptions and placement without constructing its visuals. */
function stubExplorationVisuals(): void {
  const resource = class {
    setAttribute() {}
    dispose() {}
  };
  const object = class extends THREE.Object3D {
    constructor(
      readonly geometry: unknown,
      readonly material: unknown,
    ) {
      super();
    }
  };
  vi.spyOn(THREE, 'BufferGeometry').mockImplementation(
    resource as unknown as typeof THREE.BufferGeometry,
  );
  vi.spyOn(THREE, 'DodecahedronGeometry').mockImplementation(
    resource as unknown as typeof THREE.DodecahedronGeometry,
  );
  vi.spyOn(THREE, 'PointsMaterial').mockImplementation(
    resource as unknown as typeof THREE.PointsMaterial,
  );
  vi.spyOn(THREE, 'MeshStandardMaterial').mockImplementation(
    resource as unknown as typeof THREE.MeshStandardMaterial,
  );
  vi.spyOn(THREE, 'Mesh').mockImplementation(object as unknown as typeof THREE.Mesh);
  vi.spyOn(THREE, 'Points').mockImplementation(object as unknown as typeof THREE.Points);
  vi.spyOn(EventVisuals, 'EventsVisual').mockImplementation(
    class {
      group = new THREE.Group();
      dispose() {}
    } as unknown as typeof EventVisuals.EventsVisual,
  );
  vi.spyOn(SecretVisuals, 'buildSecret').mockImplementation(
    () => new THREE.Object3D() as THREE.Mesh,
  );
  vi.spyOn(SecretVisuals, 'seatOnSeabed').mockImplementation(() => {});
  vi.spyOn(SecretVisuals, 'disposeExploreMesh').mockImplementation(() => {});
}

it.each(shippedSamples)(
  '$site/$sample.id: collecting an authored sample retains its Journal entry through reload',
  async ({ site, sample }) => {
    stubExplorationVisuals();
    vi.stubGlobal('fetch', localContentFetch);
    const doc = await Secrets.loadSecrets(site, localContentFetch);
    expect(doc).toEqual(sampleSites.find((row) => row.site === site)!.doc);
    const sites = await loadJournalSites([], localContentFetch);
    expect(sites.map((s) => s.id)).toEqual(sampleSites.map((row) => row.site));
    const journalKey = `${site}/sample/${sample.id}`;
    const runtimeId = `sample:${sample.id}`;
    const current = sites.find((s) => s.id === site)!;
    const entry = current.entries.find((e) => e.key === journalKey)!;
    expect(entry, journalKey).toMatchObject({
      siteId: site,
      id: runtimeId,
      kind: 'secret',
      title: sample.name,
      poiIds: [runtimeId],
      guide: { id: runtimeId, title: sample.name, paragraphs: ['Logged during a dive.'] },
    });
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: vi.fn((key: string, value: string) => {
        values.set(key, value);
      }),
      removeItem: vi.fn(),
    };
    const store = new DiscoveryStore(storage, () => new Date('2026-10-17T00:00:00Z'));
    const config = makeConfig();
    const bus = new EventBus();
    const scanner = new Scanner(config.scan, bus, store);
    const mission = parseMission(readJson(`data/landmarks/${site}/mission.json`), site)!;
    const meta = readJson(`data/tiles/${mission.tile}/meta.json`) as TileMeta;
    let exploration!: { ready: boolean; samples: Samples; summary(): ExplorationSummary };
    const ctx = {
      config,
      bus,
      progress: { award: vi.fn() },
      scene: new Scene(),
      tier: 'low',
      contentLandmark: site,
      meta,
      terrain: { sampleHeight: () => -100 },
      discovery: {
        ready: Promise.resolve(),
        store,
        scanner,
        debrief: {},
        onLifeScan: vi.fn(),
      },
      journal: { focus: vi.fn() },
      expose: (value: { explore: typeof exploration }) => {
        exploration = value.explore;
      },
    } as unknown as GameContext;
    const system = createExploreSystem();
    const collected = vi.fn();
    const complete = vi.fn();
    const errors = vi.spyOn(console, 'error');
    bus.on('discovery:sample', collected);
    bus.on('scan:complete', complete);
    try {
      system.init!(ctx);
      await vi.waitFor(() => expect(exploration.ready).toBe(true));
      const target = scanner.getSupplementalTargets().find((t) => t.id === runtimeId)!;
      expect(target).toMatchObject({ landmarkId: site, name: sample.name, def: sample });
      // Isolate scan admission from travel, terrain and other contacts' beam selection.
      scanner.setSupplementalTargets([target]);
      const position = target.position.clone().add(new Vector3(0, 0, 10));
      const forward = new Vector3(0, 0, -1);
      expect(sites.every((s) => !isSiteUnlocked(s, store))).toBe(true);
      scanner.update(target.scanSeconds / 2, position, forward, true);
      expect(scanner.view.progress).toBe(0.5);
      expect(store.keys()).toEqual([]);
      expect(collected).not.toHaveBeenCalled();
      expect(exploration.summary().samples).toEqual([]);
      scanner.update(target.scanSeconds / 2, position, forward, true);
      expect(complete).toHaveBeenCalledExactlyOnceWith({
        landmarkId: site,
        poiId: runtimeId,
        firstTime: true,
      });
      expect(collected).toHaveBeenCalledExactlyOnceWith({
        landmarkId: site,
        sampleId: sample.id,
        name: sample.name,
      });
      expect([...exploration.samples.collected]).toEqual([[runtimeId, sample.name]]);
      expect(exploration.summary().samples).toEqual([sample.name]);
      expect(ctx.discovery.debrief.exploration!().samples).toEqual([sample.name]);
      const archived = values.get(DISCOVERY_STORAGE_KEY)!;
      expect(JSON.parse(archived)).toEqual(store.snapshot());
      const reloadedSites = await loadJournalSites([], localContentFetch);
      const reloaded = new DiscoveryStore(storage);
      for (const [loaded, saved] of [
        [sites, store],
        [reloadedSites, reloaded],
      ] as const) {
        expect(saved.keys()).toEqual([`${site}/${runtimeId}`]);
        expect(saved.get(site, runtimeId)).toEqual({ at: '2026-10-17T00:00:00.000Z', count: 1 });
        const rebuilt = loaded.find((s) => s.id === site)!;
        expect(rebuilt.entries.find((e) => e.key === journalKey)).toEqual(entry);
        for (const s of loaded) {
          expect(isSiteUnlocked(s, saved), s.id).toBe(s.id === site);
          for (const e of s.entries)
            expect(isEntryUnlocked(s, e, saved), e.key).toBe(
              s.id === site && (e.kind === 'site' || e.key === journalKey),
            );
        }
      }
      expect(values.get(DISCOVERY_STORAGE_KEY)).toBe(archived);
      expect(storage.setItem).toHaveBeenCalledTimes(1);
      expect(storage.removeItem).not.toHaveBeenCalled();
      expect(errors).not.toHaveBeenCalled();
    } finally {
      system.dispose?.();
    }
  },
);

it.each([false, true])(
  'recollects samples on same-instance mission restarts (earlier optional load pending: %s)',
  async (restartWhileLoading) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-01T12:00:00Z'));
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    };
    const doc = Secrets.parseSecrets({
      version: 1,
      secrets: [{ id: 'arch', name: 'Arch', kind: 'alcove', lat: 0, lon: 0, text: 'A shelter.' }],
      samples: [{ id: 'sediment', name: 'Sediment', lat: 0, lon: 0.001 }],
    });
    let resolveContent!: (doc: Secrets.SecretsDoc) => void;
    const content = new Promise<Secrets.SecretsDoc>((resolve) => (resolveContent = resolve));
    vi.spyOn(Secrets, 'loadSecrets').mockReturnValue(content);
    vi.stubGlobal('fetch', async (url: string) =>
      url.endsWith('/pois.json')
        ? new Response(
            JSON.stringify({
              pois: [{ id: 'marker', name: 'Marker', lat: 0, lon: -0.001, primary: true }],
            }),
          )
        : new Response('', { status: 404 }),
    );
    const config = makeConfig();
    const meta = {
      center: { lat: 0, lon: 0 },
      bbox: { south: -1, north: 1, west: -1, east: 1 },
    } as TileMeta;
    const bus = new EventBus();
    const progress = new Progress(new ProgressSave(storage));
    const progressSystem = createProgressSystem();
    const ctx = { bus, progress, expose: vi.fn() } as unknown as GameContext;
    // Match production registration order: progress, Discovery, then explore.
    progressSystem.init!(ctx);
    const discovery = new Discovery({
      bus,
      config,
      storage,
      landmarkId: 'shallow',
      meta,
      seabed: { sampleHeight: () => -500 },
    });
    let exploration!: { ready: boolean; samples: Samples; summary(): ExplorationSummary };
    Object.assign(ctx, {
      config,
      discovery,
      scene: new Scene(),
      tier: 'low',
      contentLandmark: 'shallow',
      meta,
      terrain: { sampleHeight: () => -500 },
      missionRouter: { exploration: null },
      journal: { focus: vi.fn() },
      guidance: { offer: vi.fn() },
      expose: (value: { explore: typeof exploration }) => {
        exploration = value.explore;
      },
    });
    const system = createExploreSystem();
    const complete = vi.fn();
    const collected = vi.fn();
    const secretFound = vi.fn();
    const errors = vi.spyOn(console, 'error');
    bus.on('scan:complete', complete);
    bus.on('discovery:sample', collected);
    bus.on('discovery:secret', secretFound);
    const restart = () => bus.emit('mission:restart', { missionId: 'shallow' });
    const scanner = discovery.scanner;
    const forward = new Vector3(0, 0, -1);
    const scan = (target: ScanTarget, dt = target.scanSeconds + 0.01) =>
      scanner.update(dt, target.position, forward, true);
    try {
      system.init!(ctx);
      await discovery.ready;
      if (restartWhileLoading) {
        // Mission launch waits for Discovery, but optional exploration content is not a shell gate.
        expect(exploration.ready).toBe(false);
        restart();
      }
      resolveContent(doc);
      await Promise.all([content, discovery.ready]);
      expect(exploration.ready).toBe(true);
      const sample = scanner.getSupplementalTargets().find((t) => t.id === 'sample:sediment')!;
      const secret = scanner.getSupplementalTargets().find((t) => t.id === 'secret:arch')!;
      const marker = discovery.pois[0];
      const summary = discovery.debrief.exploration!;
      expect(ctx.missionRouter!.exploration).toBe(summary);
      expect(exploration.summary).toBe(summary);
      for (const target of [marker, secret, sample]) scan(target);
      expect(summary()).toEqual({
        found: 1,
        total: 1,
        secrets: ['Arch'],
        samples: ['Sediment'],
        events: [],
      });
      expect(collected).toHaveBeenCalledExactlyOnceWith({
        landmarkId: 'shallow',
        sampleId: 'sediment',
        name: 'Sediment',
      });
      expect(discovery.overlay.showComplete).toHaveBeenLastCalledWith('Sediment', true, {
        scan: 'F',
        guide: 'J',
      });
      expect(secretFound).toHaveBeenCalledTimes(1);
      expect(scanner.view.completed).toBe(3);
      scan(sample);
      expect(collected).toHaveBeenCalledTimes(1);
      expect(complete).toHaveBeenCalledTimes(3);
      const journal = discovery.store.snapshot();
      const awards = progress.snapshot().awarded;
      expect([...awards].sort()).toEqual([
        'poi:shallow/marker',
        'sample:shallow/sediment',
        'secret:shallow/arch',
      ]);
      const clearCount = vi.mocked(discovery.overlay.clear).mock.calls.length;
      restart();
      expect(discovery.overlay.clear).toHaveBeenCalledTimes(clearCount + 1);
      expect(exploration.samples.collected.size).toBe(0);
      expect(scanner.view).toMatchObject({
        phase: 'idle',
        progress: 0,
        activeId: null,
        completed: 0,
        lastCompleteId: null,
      });
      expect(scanner.scannedThisDive.size).toBe(0);
      expect(discovery.stats.snapshot()).toMatchObject({ discoveries: [], newEntries: [] });
      expect(summary()).toEqual({ found: 1, total: 1, secrets: [], samples: [], events: [] });
      expect(discovery.store.snapshot()).toEqual(journal);
      expect(progress.snapshot().awarded).toEqual(awards);

      // A still-held scan starts fresh on the next update; restart itself emits no completion.
      scan(sample, sample.scanSeconds / 2);
      expect(scanner.view).toMatchObject({ phase: 'scanning', activeId: sample.id, progress: 0.5 });
      expect(collected).toHaveBeenCalledTimes(1);
      expect(summary().samples).toEqual([]);
      restart();
      expect(scanner.view).toMatchObject({
        phase: 'idle',
        progress: 0,
        activeId: null,
        completed: 0,
      });
      expect(discovery.store.snapshot()).toEqual(journal);
      vi.setSystemTime(new Date('2026-10-02T12:00:00Z'));
      scan(sample, sample.scanSeconds / 2);
      expect(scanner.view.progress).toBe(0.5);
      expect(collected).toHaveBeenCalledTimes(1);
      scan(sample, sample.scanSeconds / 2 + 0.01);
      expect(complete).toHaveBeenLastCalledWith({
        poiId: sample.id,
        landmarkId: 'shallow',
        firstTime: false,
      });
      expect(collected).toHaveBeenCalledTimes(2);
      expect(discovery.overlay.showComplete).toHaveBeenLastCalledWith('Sediment', false, {
        scan: 'F',
        guide: 'J',
      });
      expect(summary()).toEqual({
        found: 1,
        total: 1,
        secrets: [],
        samples: ['Sediment'],
        events: [],
      });
      expect(discovery.stats.snapshot()).toMatchObject({
        discoveries: [{ poiId: sample.id, name: 'Sediment' }],
        newEntries: [],
      });
      scan(sample);
      scanner.update(0, sample.position, forward, false);
      scan(sample);
      expect(collected).toHaveBeenCalledTimes(2);
      expect(complete).toHaveBeenCalledTimes(4);
      expect(exploration.samples.collected.size).toBe(1);
      expect(scanner.view.completed).toBe(1);
      expect(
        vi
          .mocked(discovery.overlay.showComplete)
          .mock.calls.filter(([title]) => title === 'Sediment'),
      ).toHaveLength(2);
      const replay = discovery.store.snapshot();
      expect(replay.discovered['shallow/sample:sediment']).toEqual({
        ...journal.discovered['shallow/sample:sediment'],
        count: 2,
      });
      for (const id of ['marker', 'secret:arch']) {
        expect(scanner.isScanned('shallow', id)).toBe(false);
        expect(replay.discovered[`shallow/${id}`]).toEqual(journal.discovered[`shallow/${id}`]);
      }
      expect(replay.stats.scans).toBe(journal.stats.scans + 1);
      expect(new DiscoveryStore(storage).snapshot()).toEqual(replay);
      expect(progress.snapshot().awarded).toEqual(awards);
      expect(new Progress(new ProgressSave(storage)).snapshot().awarded).toEqual(awards);
      expect(secretFound).toHaveBeenCalledTimes(1);
      expect(Secrets.loadSecrets).toHaveBeenCalledTimes(1);
      expect(errors).not.toHaveBeenCalled();
    } finally {
      system.dispose?.();
      discovery.dispose();
      progressSystem.dispose?.();
    }
  },
);

it.each(['keyboard', 'touch', 'gamepad'] as const)(
  '%s held controls and scan progress survive live Arcade/Realistic switches without replayed edges',
  async (device) => {
    const config = makeConfig();
    const original = structuredClone(config);
    const save = new Save({ config, storage: null });
    const input = new Input({ storage: null });
    const buttons = Array.from({ length: 16 }, () => ({ value: 0, pressed: false }));
    vi.stubGlobal('navigator', {
      getGamepads: () =>
        device === 'gamepad' ? [{ connected: true, index: 0, axes: [0.5, -1, 0, 0], buttons }] : [],
    });
    if (device === 'keyboard') {
      for (const code of ['KeyW', 'KeyD', 'KeyC', 'KeyG', 'KeyQ']) input.injectKey(code, true);
    } else if (device === 'touch') {
      Object.assign(input.touchAxes, { throttle: 1, yaw: 1, ballast: -1 });
      input.touchHeld.add('scan');
      input.touchEdge('toggleCamera');
    } else {
      for (const i of [1, 3, 5]) buttons[i] = { value: 1, pressed: true };
    }
    const effective = resolveEffective(save.get(), 'arcade', null, config);
    const sub = new Submarine(effective.submarine, {
      sampleHeight: () => -5000,
      getNormal: (_x, _z, out = new Vector3()) => out.set(0, 1, 0),
    });
    sub.reset(0, -1000, 0);
    const scanner = new Scanner(effective.scan, new EventBus());
    const poi = {
      id: 'contact',
      name: 'Contact',
      landmarkId: 'fixture',
      position: new Vector3(0, -1000, -10),
      radius: 100,
      scanSeconds: 10,
    };
    scanner.setTargets([poi]);
    const ctx = {
      config,
      save,
      effective,
      daily: null,
      sub,
      discovery: { ready: Promise.resolve(), pois: [poi], scanner },
      rig: { setConfig: vi.fn() },
      power: { setConfig: vi.fn(), setEnabled: vi.fn() },
      headlights: { setPreset: vi.fn() },
      sonar: { setSensorRange: vi.fn() },
      presets: { setCurrentMode: vi.fn() },
      hud: { setCurrentMode: vi.fn() },
      expose: vi.fn(),
    } as unknown as GameContext;
    try {
      modesSystem.init!(ctx);
      modesSystem.start!(ctx);
      await ctx.discovery.ready;
      expect(input.sample().toggleCamera).toBe(true);
      input.endFrame();
      for (const [index, mode] of (
        ['realistic', 'arcade', 'realistic', 'arcade'] as const
      ).entries()) {
        const before = sub.position.clone();
        const hull = sub.getState().hullClass;
        save.setGameplayMode(mode);
        expect(sub.position.equals(before)).toBe(true);
        expect(sub.getState().hullClass).toBe(hull);
        expect(ctx.effective.speedName).toBe(mode === 'arcade' ? 'fast' : 'research');
        expect(poi.radius).toBe(100 * ctx.effective.sensor.scanRadiusMultiplier);
        const state = input.sample();
        expect(state).toMatchObject({
          throttle: 1,
          yaw: device === 'gamepad' ? 0.5 : 1,
          ballast: -1,
          scan: true,
          toggleCamera: false,
        });
        scanner.update(0.5, sub.position, new Vector3(0, 0, -1), state.scan);
        expect(scanner.view.activeId).toBe('contact');
        expect(scanner.view.progress).toBeCloseTo((index + 1) * 0.05);
        sub.step(state, 1 / 60);
        expect(sub.position.distanceTo(before)).toBeGreaterThan(0);
        expect(sub.velocity.length()).toBeLessThanOrEqual(ctx.effective.submarine.maxSpeed);
        input.endFrame();
      }
      expect(config).toEqual(original);
    } finally {
      modesSystem.dispose?.();
      input.dispose();
    }
  },
);

it.each([
  ['arcade', 'realistic', false],
  ['realistic', 'arcade', false],
  ['arcade', 'realistic', true],
  ['realistic', 'arcade', true],
] as const)(
  'retains secret/sample discoveries and rewards from %s to %s (Daily: %s)',
  async (from, to, daily) => {
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
    const doc = Secrets.parseSecrets({
      version: 1,
      secrets: [{ id: 'arch', name: 'Arch', kind: 'alcove', lat: 0, lon: 0, text: 'A shelter.' }],
      samples: [{ id: 'sediment', name: 'Sediment', lat: 0, lon: 0.001 }],
    });
    vi.spyOn(Secrets, 'loadSecrets').mockResolvedValue(doc);
    const save = new Save({ config: makeConfig(), storage });
    save.setGameplayMode(from);

    const run = async (mode: GameplayMode, switchTo?: GameplayMode) => {
      const config = makeConfig();
      const settings = new Save({ config, storage });
      expect(settings.get().gameplayMode).toBe(mode);
      const bus = new EventBus();
      const store = new DiscoveryStore(storage);
      const progress = new Progress(new ProgressSave(storage));
      const scanner = new Scanner(config.scan, bus, store);
      let exploration!: { samples: Samples; summary(): ExplorationSummary };
      const ctx = {
        config,
        bus,
        progress,
        save: settings,
        settings: settings.get(),
        scene: new Scene(),
        tier: 'low',
        contentLandmark: 'shallow',
        meta: { center: { lat: 0, lon: 0 } },
        terrain: { sampleHeight: () => -500 },
        daily: daily ? dailyDive('2026-10-01', ['shallow']) : null,
        discovery: {
          ready: Promise.resolve(),
          store,
          scanner,
          debrief: {},
          onLifeScan: vi.fn(),
          onSampleCollected: vi.fn(),
        },
        journal: { focus: vi.fn() },
        guidance: { offer: vi.fn() },
        expose: (value: { explore: typeof exploration }) => {
          exploration = value.explore;
        },
      } as unknown as GameContext;
      vi.stubGlobal('window', { __game: { progress } });
      const system = createExploreSystem();
      try {
        system.init?.(ctx);
        await vi.waitFor(() => expect(scanner.getSupplementalTargets()).toHaveLength(2));
        expect(exploration.samples.collected.size).toBe(0);
        for (const target of scanner.getSupplementalTargets()) {
          if (switchTo) settings.setGameplayMode(mode);
          scanner.update(target.scanSeconds / 2, target.position, new Vector3(0, 0, -1), true);
          if (switchTo) settings.setGameplayMode(switchTo);
          scanner.update(
            target.scanSeconds / 2 + 0.1,
            target.position,
            new Vector3(0, 0, -1),
            true,
          );
          expect(scanner.isScanned('shallow', target.id)).toBe(true);
        }
        expect(exploration.summary()).toMatchObject({
          found: 1,
          total: 1,
          secrets: ['Arch'],
          samples: ['Sediment'],
        });
        expect(progress.points).toBe(0);
      } finally {
        system.dispose?.();
      }
    };
    await run(from, to);
    await run(to);
    const restored = new DiscoveryStore(storage);
    expect(restored.keys().sort()).toEqual(['shallow/sample:sediment', 'shallow/secret:arch']);
    for (const entry of Object.values(restored.snapshot().discovered)) expect(entry.count).toBe(2);
    expect(new Progress(new ProgressSave(storage)).snapshot().awarded.sort()).toEqual([
      'sample:shallow/sediment',
      'secret:shallow/arch',
    ]);
  },
);
