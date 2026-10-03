// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGuide } from '../../src/game/Guide.js';
import { buildJournalSite, isEntryUnlocked } from '../../src/game/JournalData.js';
import { parseMission } from '../../src/game/Mission.js';
import { parsePois } from '../../src/game/Pois.js';

const read = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));
const index = read('data/landmarks/index.json') as { landmarks: string[] };

describe('shipped copy retains scan-to-Journal links', () => {
  for (const id of index.landmarks) {
    it(`${id}: each objective unlocks its authored entry and preserves provenance`, () => {
      const root = `data/landmarks/${id}`;
      const guide = parseGuide(read(`${root}/guide.json`), id)!;
      const pois = parsePois(read(`${root}/pois.json`));
      const mission = parseMission(read(`${root}/mission.json`), id)!;
      const site = buildJournalSite({ id, guide, pois, species: null });
      const keys = site.entries.map((entry) => entry.key);
      expect(new Set(keys).size).toBe(keys.length);

      for (const objective of mission.objectives) {
        const poi = pois.find((p) => p.id === objective.poi)!;
        expect(poi, objective.id).toBeDefined();
        const authored = guide.entries.find((entry) => entry.id === poi.guide_entry)!;
        expect(authored, poi.id).toBeDefined();
        const entry = site.entries.find((e) => e.key === `${id}/poi/${authored.id}`)!;
        expect(entry, authored.id).toBeDefined();
        expect(entry.guide).toEqual(authored);
        expect(entry.poiIds).toContain(poi.id);
        expect(isEntryUnlocked(site, entry, { isDiscovered: () => false })).toBe(false);
        expect(
          isEntryUnlocked(site, entry, {
            isDiscovered: (landmark, target) => landmark === id && target === poi.id,
          }),
        ).toBe(true);
        const recreated =
          authored.reconstruction ||
          pois.some((p) => entry.poiIds.includes(p.id) && p.reconstruction === true);
        expect(entry.recreation).toBe(recreated);
      }
    });
  }
});
