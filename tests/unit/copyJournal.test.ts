// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGuide } from '../../src/game/Guide.js';
import {
  buildJournalSite,
  isEntryUnlocked,
  journalEntryTag,
  parseJournalCatalogue,
} from '../../src/game/JournalData.js';
import { parseMission } from '../../src/game/Mission.js';
import { parsePois } from '../../src/game/Pois.js';
import { parseSecrets } from '../../src/game/Secrets.js';
import { parseSpecies } from '../../src/game/Species.js';
import { parseLifeDoc } from '../../src/world/life/tables.js';

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

describe('740 Journal content-tone audit across all thirteen sites', () => {
  const catalogue = parseJournalCatalogue(read('data/landmarks.json'));
  const life = parseLifeDoc(read('data/life/life.json'));
  const caveats =
    /\b(?:illustrative|reconstructed|recreations?|game additions?|authored interpretations)\b/i;

  it('covers the complete shipped catalogue', () => {
    expect(index.landmarks).toHaveLength(13);
    expect(new Set(index.landmarks).size).toBe(13);
  });

  for (const id of index.landmarks) {
    it(`${id}: factual copy, intact sources and one provenance label per addition`, () => {
      const root = `data/landmarks/${id}`;
      const guide = parseGuide(read(`${root}/guide.json`), id)!;
      const pois = parsePois(read(`${root}/pois.json`));
      const secrets = parseSecrets(read(`data/secrets/${id}.json`));
      const species = parseSpecies(read(`${root}/species.json`), id);
      const site = buildJournalSite({
        id,
        catalogue: catalogue.get(id),
        guide,
        pois,
        species,
        life,
        secrets: secrets.secrets,
      });
      expect(site.entries.filter((e) => e.kind === 'secret')).toHaveLength(3);
      expect(site.entries.some((e) => e.kind === 'life')).toBe(true);
      expect(site.entries.filter((e) => e.kind === 'species').length).toBeGreaterThan(0);
      expect([site.summary, ...site.facts].join('\n')).not.toMatch(caveats);
      for (const entry of site.entries) {
        const tag = journalEntryTag(entry);
        if (entry.kind === 'life' || entry.kind === 'secret') expect(tag).toBe('Game addition');
        else if (entry.recreation) expect(tag).toBe('Recreation');
        else expect(tag).toBeNull();
        if (entry.guide) {
          expect(
            [
              entry.title,
              ...entry.guide.paragraphs,
              ...entry.guide.facts.flatMap((f) => [f.label, f.value]),
            ].join('\n'),
            entry.key,
          ).not.toMatch(caveats);
          expect(entry.guide.paragraphs.length, entry.key).toBeGreaterThan(0);
          // Fictional finds have no claimed survey citation; authored site/POI science does.
          if (entry.kind !== 'secret')
            expect(entry.guide.sources.length, entry.key).toBeGreaterThan(0);
        }
        if (entry.life) {
          expect(entry.life.info.text, entry.key).not.toMatch(caveats);
          expect(entry.life.info.sourceUrl, entry.key).toMatch(/^https?:\/\//);
        }
      }
      for (const poi of pois) {
        const entries = site.entries.filter((e) => e.poiIds.includes(poi.id));
        expect(entries, poi.id).toHaveLength(1);
        expect(entries[0]!.guide!.id, poi.id).toBe(poi.guide_entry);
        if (poi.reconstruction) expect(journalEntryTag(entries[0]!)).toBe('Recreation');
      }
    });
  }

  it('distinguishes the Blake habitat from the larger mapped study area', () => {
    const info = catalogue.get('blake-plateau-corals')!;
    expect(info.summary).toContain('6.4 million acres');
    expect(info.summary).not.toContain('area of Florida');
    expect(
      info.links.some((s) => s.url === 'https://oceanexplorer.noaa.gov/news/million-mounds-news/'),
    ).toBe(true);
  });

  it('keeps Challenger pool rankings survey-specific and Hunga time-specific', () => {
    expect(catalogue.get('challenger-deep')!.summary).not.toMatch(/eastern pool deepest/i);
    const hunga = catalogue.get('hunga-tonga-caldera')!;
    expect(hunga.summary).toContain('before the January 2022 eruption');
    expect(hunga.facts.join('\n')).toContain('4.5 km to 4.8 km');
  });
});
