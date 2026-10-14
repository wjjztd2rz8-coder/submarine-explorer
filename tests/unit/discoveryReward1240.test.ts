// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';
import { Vector3 } from 'three';
import { makeConfig } from '../../src/core/Config.js';
import { EventBus } from '../../src/core/EventBus.js';
import { Discovery } from '../../src/game/Discovery.js';
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
    showComplete = vi.fn();
    clear = vi.fn();
    dispose = vi.fn();
  },
}));
vi.mock('../../src/ui/FieldGuide.js', () => ({
  FieldGuide: class {
    focus = vi.fn();
    refresh = vi.fn();
    setContent = vi.fn();
    dispose = vi.fn();
  },
}));
vi.mock('../../src/ui/Debrief.js', () => ({
  Debrief: class {
    dispose = vi.fn();
  },
}));

afterEach(() => vi.unstubAllGlobals());
const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));

function setup(site: string) {
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
    storage: null,
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
