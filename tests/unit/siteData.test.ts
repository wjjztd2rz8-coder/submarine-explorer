// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { siteIds, propData, curiosityData } from '../content.js';
import { makeConfig } from '../../src/core/Config.js';
import { siteManifest } from '../../src/core/SiteManifest.js';
import { parseMission, type MissionDef } from '../../src/game/Mission.js';
import { parsePois, placePois, type PoiDef } from '../../src/game/Pois.js';
import { parseGuide } from '../../src/game/Guide.js';
import { parseSpecies } from '../../src/game/Species.js';
import { buildJournalSite } from '../../src/game/JournalData.js';
import { parseSecrets } from '../../src/game/Secrets.js';
import { SPECIES, SPECIES_BY_ID } from '../../src/world/life/catalogue.js';
import { parseLifeDoc } from '../../src/world/life/tables.js';
import { Terrain } from '../../src/world/Terrain.js';
import { decodeHeightmap } from '../../src/world/TileLoader.js';
import type { TileMeta } from '../../src/util/types.js';

const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const rawLife = json('data/life/life.json');
const life = parseLifeDoc(rawLife);
const config = makeConfig();

function unique(ids: string[], context: string): void {
  expect(
    ids.every((id) => typeof id === 'string' && id.trim().length > 0),
    context,
  ).toBe(true);
  expect(new Set(ids).size, context).toBe(ids.length);
}

describe('site data integrity', () => {
  it('indexes all 13 sites once and keeps catalogue species ids unique', () => {
    expect(siteIds).toHaveLength(13);
    unique(siteIds, 'site index');
    const catalogue = json('data/landmarks.json').landmarks.map((s: { id: string }) => s.id);
    // The map also lists places without playable terrain packs.
    unique(catalogue, 'map catalogue');
    for (const id of siteIds) expect(catalogue, id).toContain(id);
    unique(
      SPECIES.map((s) => s.id),
      'wildlife catalogue',
    );
    expect(Object.keys(rawLife.sites).sort()).toEqual([...siteIds].sort());
    for (const id of Object.keys(rawLife.species)) expect(SPECIES_BY_ID.has(id), id).toBe(true);
  });

  it.each(siteIds)(
    '%s: raw ids and Journal/species references resolve without dropped records',
    (id) => {
      const root = `data/landmarks/${id}`;
      const rawMission = json(`${root}/mission.json`);
      const rawPois = json(`${root}/pois.json`);
      const rawGuide = json(`${root}/guide.json`);
      const rawSpecies = json(`${root}/${rawMission.species_file ?? 'species.json'}`);
      const rawCuriosities = curiosityData(id);
      // Validate before parsers can silently discard duplicate or unresolved records.
      for (const [name, rows, key] of [
        ['objectives', rawMission.objectives, 'id'],
        ['POIs', rawPois.pois, 'id'],
        ['guide', rawGuide.entries, 'id'],
        ['OBIS species', rawSpecies.species, 'scientificName'],
        ['props', propData(id).props, 'id'],
        ['secrets', rawCuriosities.secrets, 'id'],
        ['samples', rawCuriosities.samples, 'id'],
      ] as const) {
        unique(
          rows.map((row: Record<string, string>) => row[key]),
          `${id}/${name}`,
        );
      }
      const warnings: string[] = [];
      const warn = (message: string) => warnings.push(message);
      const mission = parseMission(rawMission, id, warn)!;
      const pois = parsePois(rawPois, warn);
      const guide = parseGuide(rawGuide, id)!;
      const species = parseSpecies(rawSpecies, id, warn);
      const curiosities = parseSecrets(rawCuriosities);
      expect(mission.objectives).toHaveLength(rawMission.objectives.length);
      expect(pois).toHaveLength(rawPois.pois.length);
      expect(guide.entries).toHaveLength(rawGuide.entries.length);
      expect(species.species).toHaveLength(rawSpecies.species.length);
      expect(curiosities.secrets).toHaveLength(rawCuriosities.secrets.length);
      expect(curiosities.samples).toHaveLength(rawCuriosities.samples.length);
      expect(warnings).toEqual([]);
      for (const objective of mission.objectives)
        expect(
          pois.some((poi) => poi.id === objective.poi),
          objective.id,
        ).toBe(true);
      const journal = buildJournalSite({ id, pois, guide, species, life, ...curiosities });
      unique(
        journal.entries.map((entry) => entry.key),
        `${id}/Journal`,
      );
      for (const poi of pois) {
        expect(
          guide.entries.some((entry) => entry.id === poi.guide_entry),
          poi.id,
        ).toBe(true);
        expect(
          journal.entries.find((entry) => entry.id === poi.guide_entry)?.poiIds,
          poi.id,
        ).toContain(poi.id);
      }
      for (const record of species.species)
        expect(
          journal.entries.some(
            (entry) => entry.kind === 'species' && entry.id === record.scientificName,
          ),
          record.scientificName,
        ).toBe(true);
      const table = rawLife.sites[id];
      unique(
        table.spawns.map((row: { species: string }) => row.species),
        `${id}/spawn species`,
      );
      expect(life.sites[id]!.spawns).toHaveLength(table.spawns.length);
      const opening = siteManifest(id)?.life?.opening;
      const staged = opening?.strategy === 'groups' ? opening.groups : opening ? [opening] : [];
      for (const row of [...table.spawns, table.rare, ...staged]) {
        expect(SPECIES_BY_ID.has(row.species), row.species).toBe(true);
        expect(life.species[row.species], row.species).toBeDefined();
        expect(
          journal.entries.some((entry) => entry.kind === 'life' && entry.id === row.species),
          row.species,
        ).toBe(true);
      }
    },
  );

  for (const tier of ['low', 'medium', 'high'] as const) {
    it.each(siteIds)(
      `%s ${tier}: every objective lies inside terrain, above seabed and within hull limits`,
      (id) => {
        const mission = json(`data/landmarks/${id}/mission.json`) as MissionDef;
        const defs = json(`data/landmarks/${id}/pois.json`).pois as PoiDef[];
        const meta = json(`data/tiles/${mission.tile}/meta.json`) as TileMeta;
        const bytes = readFileSync(`data/tiles/${mission.tile}/heightmap.bin`);
        const heights = decodeHeightmap(
          bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
          meta,
        );
        const terrain = new Terrain({ meta, heights }, config.terrain, tier);
        try {
          const pois = placePois(defs, meta, terrain, config.scan, id);
          expect(pois).toHaveLength(defs.length);
          const hull = config.submarine.hullClasses[mission.hull_class!];
          expect(hull).toBeDefined();
          for (const objective of mission.objectives) {
            const poi = pois.find((p) => p.id === objective.poi)!;
            expect(poi, objective.id).toBeDefined();
            const p = poi.position;
            expect(Math.abs(p.x), objective.id).toBeLessThan(terrain.widthM / 2);
            expect(Math.abs(p.z), objective.id).toBeLessThan(terrain.depthM / 2);
            expect(p.y, objective.id).toBeLessThan(0);
            expect(p.y, objective.id).toBeGreaterThanOrEqual(hull!.ratedDepth);
            expect(p.y, objective.id).toBeGreaterThanOrEqual(terrain.sampleHeight(p.x, p.z));
            // Explicit depths must stand on their own; runtime clamping hides buried data.
            if (!poi.def.snap_to_seabed && poi.def.depth_m !== undefined)
              expect(-poi.def.depth_m, objective.id).toBeGreaterThanOrEqual(
                terrain.sampleHeight(p.x, p.z),
              );
          }
        } finally {
          terrain.dispose();
        }
      },
    );
  }
});
