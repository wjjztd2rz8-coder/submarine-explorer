// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';
import { Vector3 } from 'three';
import { makeConfig } from '../../src/core/Config.js';
import { EventBus } from '../../src/core/EventBus.js';
import { Discovery } from '../../src/game/Discovery.js';
import { entryIdForPoi } from '../../src/game/Guide.js';
import { buildJournalSite, isEntryUnlocked } from '../../src/game/JournalData.js';
import type { TileMeta } from '../../src/util/types.js';

// Replace DOM views only. Exercise real content loaders, scanner, recorder,
// objectives, discovery wiring, guide-entry mapping and Journal unlock logic.
vi.mock('../../src/ui/ScanOverlay.js', () => ({
  ScanOverlay: class {
    showComplete = vi.fn();
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
