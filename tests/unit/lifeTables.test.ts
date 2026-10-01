// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SPECIES, SPECIES_BY_ID } from '../../src/world/life/catalogue.js';
import {
  bandOverlap,
  buildEntries,
  cellChance,
  entryBand,
  inBand,
  isBedBound,
  isCellBound,
  parseLifeDoc,
  pickActiveSpecies,
} from '../../src/world/life/tables.js';
import { ARCHETYPES, LIFE_TIERS, type SiteTable } from '../../src/world/life/types.js';

const raw = JSON.parse(readFileSync('data/life/life.json', 'utf8')) as unknown;
const doc = parseLifeDoc(raw);
const sites = (
  JSON.parse(readFileSync('data/landmarks/index.json', 'utf8')) as { landmarks: string[] }
).landmarks;

describe('catalogue', () => {
  it('has 20 to 50 species with unique ids and every archetype in use', () => {
    expect(SPECIES.length).toBeGreaterThanOrEqual(20);
    expect(SPECIES.length).toBeLessThanOrEqual(50);
    expect(new Set(SPECIES.map((s) => s.id)).size).toBe(SPECIES.length);
    for (const a of ARCHETYPES) expect(SPECIES.some((s) => s.archetype === a)).toBe(true);
  });

  it('keeps every species inside sane numbers', () => {
    for (const s of SPECIES) {
      expect(s.size, s.id).toBeGreaterThan(0);
      expect(s.visScale, s.id).toBeGreaterThanOrEqual(1);
      expect(s.depth[0], s.id).toBeLessThan(s.depth[1]);
      expect(s.speed[0], s.id).toBeLessThanOrEqual(s.speed[1]);
      expect(s.maxCount, s.id).toBeGreaterThan(0);
      if (s.archetype === 'swarm') expect(s.altitude, s.id).toBeDefined();
    }
  });
});

describe('life.json', () => {
  it('has Journal text, a source link and facts for every catalogue species', () => {
    for (const s of SPECIES) {
      const e = doc.species[s.id];
      expect(e, `${s.id} has no Journal entry`).toBeDefined();
      expect(e!.text.length, s.id).toBeGreaterThan(60);
      expect(e!.sourceUrl, s.id).toMatch(/^https:\/\//);
      expect(Object.keys(e!.facts ?? {}).length, s.id).toBeGreaterThan(0);
      // Player text carries no repeated caveats (content-tone rule).
      expect(e!.text, s.id).not.toMatch(/illustrative|reconstructed|invented/i);
    }
  });

  it('has a table for every dive site, with a rare appearance and 1 to 2 stars', () => {
    expect(Object.keys(doc.sites).sort()).toEqual([...sites].sort());
    for (const id of sites) {
      const t = doc.sites[id]!;
      expect(t.spawns.length, id).toBeGreaterThanOrEqual(4);
      expect(t.rare, `${id} rare`).toBeDefined();
      const stars = t.spawns.filter((s) => s.star).length;
      expect(stars, `${id} stars`).toBeGreaterThanOrEqual(1);
      expect(stars, `${id} stars`).toBeLessThanOrEqual(2);
    }
  });

  it('only places a species where its depth band allows', () => {
    for (const [id, t] of Object.entries(doc.sites)) {
      for (const row of buildEntries(t)) {
        expect(entryBand(row), `${id}: ${row.def.id} band is empty`).not.toBeNull();
        const own = row.def.depth;
        expect(row.entry.depth[0], `${id}: ${row.def.id}`).toBeGreaterThanOrEqual(own[0] * 0.5);
        expect(row.entry.depth[1], `${id}: ${row.def.id}`).toBeLessThanOrEqual(own[1] * 1.25 + 5);
      }
      const rare = t.rare!;
      const def = SPECIES_BY_ID.get(rare.species)!;
      expect(bandOverlap(rare.depth, def.depth), `${id} rare band`).not.toBeNull();
    }
  });

  it('never puts shallow reef fish in deep water', () => {
    for (const sp of ['blackfin-chromis', 'rainbow-wrasse', 'blue-tang', 'french-grunt']) {
      expect(SPECIES_BY_ID.get(sp)!.depth[1]).toBeLessThanOrEqual(50);
    }
    const hunga = doc.sites['hunga-tonga-caldera']!;
    for (const e of hunga.spawns.filter((s) => s.species.includes('chromis'))) {
      expect(e.depth[1]).toBeLessThanOrEqual(40);
    }
  });
});

describe('parseLifeDoc', () => {
  it('survives garbage and drops bad rows', () => {
    expect(parseLifeDoc(null).sites).toEqual({});
    expect(parseLifeDoc('x').species).toEqual({});
    const d = parseLifeDoc({
      species: {
        'blue-shark': { text: 'A shark.', sourceUrl: 'https://x.org' },
        nope: { text: 'x' },
      },
      sites: {
        a: {
          spawns: [
            { species: 'blue-shark', weight: 1, depth: [0, 100], group: [1, 2] },
            { species: 'unknown', weight: 1, depth: [0, 100] },
            { species: 'blue-shark', weight: -1, depth: [0, 100] },
            { species: 'blue-shark', weight: 1, depth: 'deep' },
          ],
          rare: { species: 'sperm-whale', depth: [30, 900], chancePerMin: 0.1, pass: 'overhead' },
        },
      },
    });
    expect(Object.keys(d.species)).toEqual(['blue-shark']);
    expect(d.sites.a!.spawns).toHaveLength(1);
    expect(d.sites.a!.rare?.pass).toBe('overhead');
    expect(d.sites.a!.rare?.cooldownS).toBeGreaterThanOrEqual(30);
  });
});

describe('spawn selection', () => {
  const table: SiteTable = {
    spawns: [
      { species: 'blue-shark', weight: 0.6, depth: [5, 350], group: [1, 1] },
      { species: 'atolla', weight: 2, depth: [350, 4000], group: [1, 3] },
      { species: 'comb-jelly', weight: 1.5, depth: [8, 1200], group: [1, 3] },
      { species: 'cold-water-coral', weight: 3, depth: [500, 1000], group: [2, 5], star: true },
      { species: 'wreckfish', weight: 1, depth: [300, 1100], group: [1, 2] },
    ],
  };
  const rows = buildEntries(table);

  it('keeps only species whose band is within reach of the sub', () => {
    const ids = (d: number): string[] => pickActiveSpecies(rows, d, 50, 10).map((r) => r.def.id);
    expect(ids(20).sort()).toEqual(['blue-shark', 'comb-jelly']);
    expect(ids(800)).toContain('cold-water-coral');
    expect(ids(800)).not.toContain('blue-shark');
    expect(ids(3000)).toEqual(['atolla']);
  });

  it('caps species by the tier budget, charismatic and abundant first', () => {
    const picked = pickActiveSpecies(rows, 600, 50, 2).map((r) => r.def.id);
    expect(picked).toHaveLength(2);
    expect(picked[0]).toBe('cold-water-coral'); // the star
    expect(picked).toContain('atolla'); // then the most abundant
  });

  it('never drops a species that is already on screen', () => {
    const picked = pickActiveSpecies(rows, 600, 50, 2, new Set(['wreckfish'])).map((r) => r.def.id);
    expect(picked).toContain('wreckfish'); // kept although a star outranks it
    expect(picked).toContain('cold-water-coral'); // the star takes the remaining slot
    expect(picked).toHaveLength(2); // live animals count against the budget
  });

  it('classifies archetypes into spawn kinds', () => {
    expect(isCellBound(SPECIES_BY_ID.get('cold-water-coral')!)).toBe(true);
    expect(isCellBound(SPECIES_BY_ID.get('sun-star')!)).toBe(true);
    expect(isBedBound(SPECIES_BY_ID.get('beebe-shrimp')!)).toBe(true);
    expect(isBedBound(SPECIES_BY_ID.get('dumbo-octopus')!)).toBe(true);
    expect(isBedBound(SPECIES_BY_ID.get('vampire-squid')!)).toBe(false);
    expect(isBedBound(SPECIES_BY_ID.get('blue-shark')!)).toBe(false);
  });

  it('scales the per-cell chance with weight, density and cell size', () => {
    const c = (w: number, d = 1, cell = 30, r = 80): number => cellChance(w, d, cell, r);
    expect(c(0)).toBe(0);
    expect(c(2)).toBeCloseTo(2 * c(1), 6);
    expect(c(1, 1.5)).toBeGreaterThan(c(1, 1));
    expect(c(1000)).toBe(1);
    // The same number of patches per disc whatever the tier's radius and cell.
    const patches = (cell: number, r: number): number =>
      c(3, 1, cell, r) * ((Math.PI * r * r) / (cell * cell));
    expect(patches(36, 55)).toBeCloseTo(patches(26, 110), 6);
  });

  it('bands', () => {
    expect(bandOverlap([0, 10], [5, 20])).toEqual([5, 10]);
    expect(bandOverlap([0, 4], [5, 20])).toBeNull();
    expect(inBand(12, [5, 10], 3)).toBe(true);
    expect(inBand(15, [5, 10], 3)).toBe(false);
  });

  it('has tier budgets of at most 12 draw calls at high and 5 at low', () => {
    expect(LIFE_TIERS.low.maxSpecies + 1).toBeLessThanOrEqual(5);
    expect(LIFE_TIERS.high.maxSpecies + 1).toBeLessThanOrEqual(12);
    expect(LIFE_TIERS.ultra.maxSpecies + 1).toBeLessThanOrEqual(12);
    expect(LIFE_TIERS.low.maxAgents).toBeLessThan(LIFE_TIERS.medium.maxAgents);
    expect(LIFE_TIERS.medium.maxAgents).toBeLessThan(LIFE_TIERS.high.maxAgents);
  });
});
