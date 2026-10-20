// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';
import { Vector3 } from 'three';
import { makeConfig } from '../../src/core/Config.js';
import { EventBus } from '../../src/core/EventBus.js';
import { ProgressSave } from '../../src/core/Save.js';
import { createProgressSystem } from '../../src/app/systems/progress.js';
import type { GameContext } from '../../src/app/context.js';
import { Discovery } from '../../src/game/Discovery.js';
import { DiscoveryStore, type StorageLike } from '../../src/game/DiscoveryStore.js';
import { Progress } from '../../src/game/Progress.js';
import { entryIdForPoi } from '../../src/game/Guide.js';
import { buildJournalSite, isEntryUnlocked } from '../../src/game/JournalData.js';
import { Mission, parseMission } from '../../src/game/Mission.js';
import { parseSecrets, placeSecrets } from '../../src/game/Secrets.js';
import { placeSamples } from '../../src/game/Samples.js';
import type { ScanTarget } from '../../src/game/Scanner.js';
import titanicMission from '../../data/landmarks/titanic/mission.json';
import titanicSecrets from '../../data/secrets/titanic.json';
import type { TileMeta } from '../../src/util/types.js';

// Replace DOM views only. Exercise real content loaders, scanner, recorder,
// objectives, discovery wiring, guide-entry mapping and Journal unlock logic.
vi.mock('../../src/ui/ScanOverlay.js', () => ({
  ScanOverlay: class {
    setSuppressed = vi.fn();
    update = vi.fn();
    showComplete = vi.fn();
    clear = vi.fn();
    dispose = vi.fn();
  },
}));
vi.mock('../../src/ui/FieldGuide.js', () => ({
  FieldGuide: class {
    setFooter = vi.fn();
    focus = vi.fn();
    refresh = vi.fn();
    setContent = vi.fn();
    dispose = vi.fn();
  },
}));
vi.mock('../../src/ui/Debrief.js', () => ({
  Debrief: class {
    isOpen = false;
    show = vi.fn(() => {
      this.isOpen = true;
    });
    hide = vi.fn(() => {
      this.isOpen = false;
    });
    dispose = vi.fn();
  },
}));

afterEach(() => vi.unstubAllGlobals());
const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));

function setup(site: string, storage: StorageLike | null = null) {
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('fetch', async (url: string) => new Response(readFileSync(`.${url}`, 'utf8')));
  const meta = json(`data/tiles/${site}/meta.json`) as TileMeta;
  const bus = new EventBus();
  const discovery = new Discovery({
    bus,
    config: makeConfig(),
    meta,
    seabed: { sampleHeight: () => meta.min_m },
    landmarkId: site,
    storage,
    keyLabel: (action) => (action === 'scan' ? 'G' : 'J'),
  });
  return { bus, discovery, meta };
}

for (const site of [
  'challenger-deep',
  'endurance',
  'titanic',
  'lost-city',
  'great-blue-hole',
  'beebe-vent-field',
  'monterey-canyon',
]) {
  it(`${site}: reward uses the POI name while the linked authored Journal entry unlocks`, async () => {
    const { discovery } = setup(site);
    try {
      await discovery.ready;
      expect(discovery.pois.length).toBeGreaterThan(0);
      const journal = buildJournalSite({
        id: site,
        guide: discovery.guideDoc,
        pois: discovery.pois.map((poi) => poi.def),
        species: null,
      });
      for (const poi of discovery.pois) {
        const entryId = entryIdForPoi(poi, discovery.entries);
        const entry = journal.entries.find(
          (entry) => entry.kind === 'poi' && entry.id === entryId,
        )!;
        expect(entry, poi.id).toBeDefined();
        expect(entry.poiIds).toContain(poi.id);
        // Scan each real target in isolation so neighboring targets do not steal it.
        discovery.scanner.setTargets([poi]);
        discovery.scanner.update(
          poi.scanSeconds + 0.01,
          poi.position.clone().add(new Vector3(0, 0, 1)),
          new Vector3(0, 0, -1),
          true,
        );
        expect(discovery.scanner.view.lastCompleteId).toBe(poi.id);
        expect(discovery.overlay.showComplete).toHaveBeenLastCalledWith(poi.name, true, {
          scan: 'G',
          guide: 'J',
        });
        expect(discovery.guide.focus).toHaveBeenLastCalledWith(entryId);
        expect(isEntryUnlocked(journal, entry, discovery.store)).toBe(true);
        expect(entry.title).toBe(discovery.entries.find((entry) => entry.id === entryId)!.title);
      }
      // A returning player's reward follows the same title/id mapping.
      const poi = discovery.pois[0]!;
      discovery.resetDive();
      discovery.scanner.setTargets([poi]);
      discovery.scanner.update(
        poi.scanSeconds + 0.01,
        poi.position.clone().add(new Vector3(0, 0, 1)),
        new Vector3(0, 0, -1),
        true,
      );
      expect(discovery.overlay.showComplete).toHaveBeenLastCalledWith(poi.name, false, {
        scan: 'G',
        guide: 'J',
      });
      expect(discovery.guide.focus).toHaveBeenLastCalledWith(entryIdForPoi(poi, discovery.entries));
    } finally {
      discovery.dispose();
    }
  });
}

it.each([5, 6])(
  'counts %s distinct discoveries this dive, including wildlife, with the stern last',
  async (count) => {
    const { bus, discovery } = setup('titanic');
    const observed: Array<{ scanner: number; debrief: number }> = [];
    bus.on('scan:complete', () => {
      observed.push({
        scanner: discovery.scanner.view.completed,
        debrief: discovery.stats.snapshot().discoveries.length,
      });
    });
    const mission = new Mission({ def: parseMission(titanicMission, 'titanic')!, bus });
    try {
      await discovery.ready;
      mission.start('titanic');
      const poi = (id: string) => discovery.pois.find((p) => p.id === `titanic-${id}`)!;
      const wildlife = (id: string, name: string): ScanTarget => ({
        id: `life:${id}`,
        name,
        landmarkId: 'titanic',
        position: new Vector3(0, -3800, 0),
        radius: 10,
        scanSeconds: 1,
      });
      const coral = wildlife('golden-coral', 'Golden coral');
      const targets = [
        poi('bow'),
        poi('debris-field'),
        coral,
        ...(count === 6 ? [wildlife('armed-brittle-star', 'Armed brittle star')] : []),
        poi('memorial'),
        poi('stern'),
      ];
      for (const target of targets) {
        const animal = target.id.startsWith('life:');
        discovery.scanner.setTargets(animal ? [] : [target]);
        discovery.scanner.setExtraTargets(animal ? [target] : []);
        discovery.scanner.update(
          target.scanSeconds + 0.01,
          target.position,
          new Vector3(0, 0, -1),
          true,
        );
        if (animal) discovery.onLifeScan(target.name, true, `life/${target.id.slice(5)}`);
        expect(discovery.overlay.showComplete).toHaveBeenLastCalledWith(target.name, true, {
          scan: 'G',
          guide: 'J',
        });
        // Continuing to hold or releasing/repressing cannot count a discovery twice.
        discovery.scanner.update(0, target.position, new Vector3(0, 0, -1), false);
        discovery.scanner.update(
          target.scanSeconds + 0.01,
          target.position,
          new Vector3(0, 0, -1),
          true,
        );
      }
      expect(observed).toEqual(
        Array.from({ length: count }, (_, i) => ({ scanner: i + 1, debrief: i + 1 })),
      );
      const stats = discovery.stats.snapshot();
      expect(stats.discoveries.map((d) => d.name)).toEqual(targets.map((t) => t.name));
      expect(stats.discoveries.at(-1)?.name).toBe('Stern section');
      // Mission banners count objectives, not all discoveries or lifetime Journal entries.
      expect(mission.counts()).toEqual({ completed: 3, total: 4 });
      expect(mission.primaryComplete).toBe(true);
      expect(mission.allComplete).toBe(false);

      bus.emit('mission:restart', { missionId: 'titanic' });
      expect(discovery.scanner.view.completed).toBe(0);
      expect(discovery.stats.snapshot().discoveries).toEqual([]);
      discovery.scanner.setTargets([]);
      discovery.scanner.setExtraTargets([coral]);
      discovery.scanner.update(
        coral.scanSeconds + 0.01,
        coral.position,
        new Vector3(0, 0, -1),
        true,
      );
      discovery.onLifeScan(coral.name, false, 'life/golden-coral');
      expect(discovery.scanner.view.completed).toBe(1);
      expect(discovery.scanner.view.lastCompleteFirstTime).toBe(false);
      expect(discovery.stats.snapshot().discoveries).toEqual([
        { poiId: coral.id, name: coral.name },
      ]);
      expect(discovery.stats.snapshot().newEntries).toEqual([]);
    } finally {
      mission.dispose();
      discovery.dispose();
    }
  },
);

it('counts scanned secrets and samples and records the revealed discovery name', async () => {
  const { discovery, meta } = setup('titanic');
  try {
    await discovery.ready;
    const secret = placeSecrets(parseSecrets(titanicSecrets), 'titanic', meta, () => -3800)[0]!;
    const sample = placeSamples(titanicSecrets.samples, 'titanic', meta, () => -3800)[0]!;
    discovery.scanner.setTargets([]);
    for (const target of [sample, secret]) {
      discovery.scanner.setSupplementalTargets([target]);
      discovery.scanner.update(
        target.scanSeconds + 0.01,
        target.position,
        new Vector3(0, 0, -1),
        true,
      );
    }
    discovery.onLifeScan(secret.def.name, true, `secret/${secret.def.id}`);
    expect(secret.name).toBe('Unidentified contact');
    expect(discovery.scanner.view.completed).toBe(2);
    expect(discovery.stats.snapshot().discoveries).toEqual([
      { poiId: sample.id, name: sample.name },
      { poiId: secret.id, name: secret.def.name },
    ]);
    expect(discovery.overlay.showComplete).toHaveBeenLastCalledWith(secret.def.name, true, {
      scan: 'G',
      guide: 'J',
    });
  } finally {
    discovery.dispose();
  }
});

it.each([false, true])(
  'keeps partial scans out of debrief and retains Journal/reward identity on return dives (quota failure: %s)',
  async (quotaFailure) => {
    const values = new Map<string, string>();
    let failWrites = false;
    const storage: StorageLike = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        if (failWrites) throw new DOMException('Storage full', 'QuotaExceededError');
        values.set(key, value);
      },
      removeItem: (key) => {
        values.delete(key);
      },
    };
    // An unsuccessful write must retain the prior save, not replace it with an empty dive.
    new DiscoveryStore(storage).record('previous-site', 'old-find');
    new Progress(new ProgressSave(storage)).award('poi', 'previous-site/old-find');
    const savedBefore = new Map(values);
    failWrites = quotaFailure;
    const { bus, discovery } = setup('titanic', storage);
    const progress = new Progress(new ProgressSave(storage));
    const rewards = createProgressSystem();
    rewards.init!({
      bus,
      progress,
      effective: { boostSeconds: 0 },
      expose: vi.fn(),
    } as unknown as GameContext);
    const mission = new Mission({ def: parseMission(titanicMission, 'titanic')!, bus });
    try {
      await discovery.ready;
      mission.resolve(discovery.pois.map((p) => p.id));
      const journal = buildJournalSite({
        id: 'titanic',
        guide: discovery.guideDoc,
        pois: discovery.pois.map((p) => p.def),
        species: null,
      });
      const first = discovery.pois[0]!;
      const entryId = entryIdForPoi(first, discovery.entries);
      const entry = journal.entries.find((e) => e.kind === 'poi' && e.id === entryId)!;
      const forward = new Vector3(0, 0, -1);
      const scan = (target: ScanTarget, seconds = target.scanSeconds + 0.01) => {
        discovery.scanner.setTargets([target]);
        discovery.update(seconds, 0, target.position, forward, { scan: true }, undefined, 0);
      };

      mission.start('titanic');
      scan(first, first.scanSeconds / 2);
      expect(discovery.scanner.view.progress).toBeCloseTo(0.5);
      expect(mission.end()).toBe(true);
      const empty = discovery.showDebrief({ objectives: mission.counts() });
      expect(empty.discoveries).toEqual([]);
      expect(empty.newEntries).toEqual([]);
      expect(empty.objectives).toEqual({ completed: 0, total: 4 });
      expect(isEntryUnlocked(journal, entry, discovery.store)).toBe(false);
      expect(progress.finish('titanic', mission.objectives)).toEqual({
        stars: 0,
        best: 0,
        points: 0,
      });
      expect(progress.snapshot().awarded).toEqual(['poi:previous-site/old-find']);
      // Held Scan cannot finish while a debrief or the Journal over it freezes play.
      for (let frame = 0; frame < 3; frame++)
        discovery.update(0, 1, first.position, forward, { scan: true }, undefined, 0, true);
      expect(discovery.scanner.view.completed).toBe(0);
      expect(discovery.store.isDiscovered('titanic', first.id)).toBe(false);
      discovery.debrief.hide();
      expect(mission.resume()).toBe(true);
      scan(first, first.scanSeconds / 2 + 0.01);
      expect(isEntryUnlocked(journal, entry, discovery.store)).toBe(true);
      expect(discovery.stats.snapshot().newEntries).toContainEqual({
        id: entryId,
        title: entry.title,
      });
      // The already shown zero-discovery summary is an isolated snapshot.
      expect(empty.discoveries).toEqual([]);

      for (const target of discovery.pois) scan(target);
      expect(mission.end()).toBe(true);
      expect(progress.finish('titanic', mission.objectives)).toEqual({
        stars: 2,
        best: 2,
        points: 0,
      });
      const earned = progress.snapshot().awarded;
      expect(discovery.stats.snapshot().discoveries).toHaveLength(discovery.pois.length);
      expect(progress.selectCosmetic('paint', 'red')).toBe(true);

      mission.restart();
      mission.start('titanic');
      expect(discovery.stats.snapshot().discoveries).toEqual([]);
      expect(discovery.stats.snapshot().newEntries).toEqual([]);
      expect(mission.counts()).toEqual({ completed: 0, total: 4 });
      expect(isEntryUnlocked(journal, entry, discovery.store)).toBe(true);
      for (const target of discovery.pois) scan(target);
      expect(discovery.scanner.view.lastCompleteFirstTime).toBe(false);
      expect(discovery.stats.snapshot().newEntries).toEqual([]);
      expect(discovery.stats.snapshot().discoveries).toHaveLength(discovery.pois.length);
      expect(mission.end()).toBe(true);
      expect(progress.finish('titanic', mission.objectives).best).toBe(2);
      expect(progress.snapshot().awarded).toEqual(earned);
      expect(discovery.store.get('titanic', first.id)?.count).toBe(2);

      if (quotaFailure) {
        expect(values).toEqual(savedBefore);
        expect(new DiscoveryStore(storage).isDiscovered('titanic', first.id)).toBe(false);
        expect(new Progress(new ProgressSave(storage)).rating('titanic')).toBe(0);
        // Once writes recover, the next save includes the retained session finds and rewards.
        failWrites = false;
        discovery.resetDive();
        scan(first);
        progress.finish('titanic', mission.objectives);
      }
      expect(new DiscoveryStore(storage).snapshot()).toEqual(discovery.store.snapshot());
      expect(new Progress(new ProgressSave(storage)).snapshot()).toEqual(progress.snapshot());
    } finally {
      mission.dispose();
      rewards.dispose!();
      discovery.dispose();
    }
  },
);

it('late POIs and guide cannot repopulate a disposed discovery or apply a stale probe spawn', async () => {
  const { discovery: first, meta } = setup('titanic');
  await first.ready;
  first.dispose();
  let finish!: () => void;
  const pending = new Promise<void>((resolve) => {
    finish = resolve;
  });
  vi.stubGlobal('fetch', async (url: string) => {
    await pending;
    return new Response(readFileSync(`.${url}`, 'utf8'));
  });
  const teleport = vi.fn();
  const sampleHeight = vi.fn(() => -3800);
  const discovery = new Discovery({
    bus: new EventBus(),
    config: makeConfig(),
    meta,
    landmarkId: 'titanic',
    seabed: { sampleHeight },
    storage: null,
    teleport,
    params: new URLSearchParams('poi=titanic-bow'),
  });
  discovery.dispose();
  finish();
  await discovery.ready;
  await Promise.resolve();
  expect(discovery.loaded).toBe(false);
  expect(discovery.pois).toHaveLength(0);
  expect(discovery.scanner.getTargets()).toHaveLength(0);
  expect(sampleHeight).not.toHaveBeenCalled();
  expect(discovery.guide.setContent).not.toHaveBeenCalled();
  expect(teleport).not.toHaveBeenCalled();
  discovery.dispose();
  expect(discovery.guide.dispose).toHaveBeenCalledOnce();
});
