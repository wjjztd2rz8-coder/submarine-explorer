// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Matrix4, Mesh, InstancedMesh, Vector3 } from 'three';
import { makeConfig } from '../../src/core/Config.js';
import { EventBus } from '../../src/core/EventBus.js';
import { parseGuide } from '../../src/game/Guide.js';
import { buildJournalSite, isEntryUnlocked } from '../../src/game/JournalData.js';
import { parsePois, placePois } from '../../src/game/Pois.js';
import { Scanner } from '../../src/game/Scanner.js';
import { parseSecrets } from '../../src/game/Secrets.js';
import {
  composedFreeDiveSpawn,
  composedMissionSpawn,
  spawnSettings,
} from '../../src/game/Spawn.js';
import { parseMission } from '../../src/game/Mission.js';
import type { TileMeta } from '../../src/util/types.js';
import { Props } from '../../src/world/Props.js';
import { Terrain } from '../../src/world/Terrain.js';
import { parseLifeDoc } from '../../src/world/life/tables.js';
import { makeSyntheticTile } from './helpers.js';

const sites = ['titanic', 'lost-city', 'great-blue-hole', 'beebe-vent-field', 'monterey-canyon'];
const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));

describe('hero-site spawn, placement and scan integrity', () => {
  for (const site of sites) {
    it(`${site}: every POI and secret unlocks authored Journal text without repeated caveats`, () => {
      const root = `data/landmarks/${site}`;
      const pois = parsePois(read(`${root}/pois.json`));
      const guide = parseGuide(read(`${root}/guide.json`), site)!;
      const secrets = parseSecrets(read(`data/secrets/${site}.json`));
      const life = parseLifeDoc(read('data/life/life.json'));
      const journal = buildJournalSite({
        id: site,
        pois,
        guide,
        species: null,
        life,
        secrets: secrets.secrets,
      });
      for (const poi of pois) {
        // Require the authored link: the fallback entry would hide missing content.
        expect(
          guide.entries.some((e) => e.id === poi.guide_entry),
          poi.id,
        ).toBe(true);
        const entries = journal.entries.filter((e) => e.poiIds.includes(poi.id));
        expect(entries, poi.id).toHaveLength(1);
        expect(entries[0]!.guide!.paragraphs.length, poi.id).toBeGreaterThan(0);
        expect(
          isEntryUnlocked(journal, entries[0]!, {
            isDiscovered: (s, id) => s === site && id === poi.id,
          }),
        ).toBe(true);
        if (poi.reconstruction) expect(entries[0]!.recreation).toBe(true);
      }
      for (const secret of secrets.secrets) {
        const entry = journal.entries.find((e) => e.kind === 'secret' && e.id === secret.id)!;
        expect(entry.guide!.paragraphs).toEqual([secret.text]);
        expect(
          isEntryUnlocked(journal, entry, {
            isDiscovered: (s, id) => s === site && id === `secret:${secret.id}`,
          }),
        ).toBe(true);
      }
      const table = life.sites[site]!;
      const animals = new Set([
        ...table.spawns.map((s) => s.species),
        ...(table.rare ? [table.rare.species] : []),
      ]);
      for (const animal of animals) {
        const entry = journal.entries.find((e) => e.kind === 'life' && e.id === animal)!;
        expect(entry.life!.info.text.length, animal).toBeGreaterThan(0);
        expect(entry.life!.info.text, animal).not.toMatch(
          /\b(?:illustrative|reconstructed|recreations?)\b/i,
        );
        expect(
          isEntryUnlocked(journal, entry, {
            isDiscovered: (s, id) => s === site && id === `life:${animal}`,
          }),
        ).toBe(true);
      }
      const playerCopy = [
        ...guide.entries.flatMap((e) => [
          e.title,
          ...e.paragraphs,
          ...e.facts.flatMap((f) => [f.label, f.value]),
        ]),
        ...pois.map((p) => p.name),
        ...secrets.secrets.flatMap((s) => [s.name, s.text]),
        JSON.stringify(read(`${root}/mission.json`).objectives),
      ].join('\n');
      expect(playerCopy).not.toMatch(/\b(?:illustrative|reconstructed|recreations?)\b/i);
    });

    for (const tier of ['low', 'medium'] as const) {
      it(`${site} ${tier}: supported props and a scan within the opening minute`, async () => {
        const config = makeConfig();
        const meta = read(`data/tiles/${site}/meta.json`) as TileMeta;
        const bytes = readFileSync(`data/tiles/${site}/heightmap.bin`);
        const heights = new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows);
        const terrain = new Terrain({ meta, heights }, config.terrain, tier);
        const props = new Props(meta, terrain, config.props, tier);
        const doc = read(`data/landmarks/${site}/props.json`);
        const pois = placePois(
          parsePois(read(`data/landmarks/${site}/pois.json`)),
          meta,
          terrain,
          config.scan,
          site,
        );
        const mission = parseMission(read(`data/landmarks/${site}/mission.json`), site)!;
        const settings = spawnSettings(config);
        try {
          await props.placeAll(doc, site);
          expect(props.stats.failed).toBe(0);
          expect(props.stats.skipped).toBe(0);
          expect(props.placed).toHaveLength(doc.props.length);
          for (const prop of props.placed) {
            expect(prop.def.snapToSeabed, prop.def.id).toBe(true);
            // Check rendered solids against the actual seabed, including debris instances.
            // Foundation vertices may sit below it, but each set must have exposed geometry
            // and a point of contact (no entirely buried or entirely floating set).
            prop.full.updateWorldMatrix(true, true);
            let minClearance = Infinity;
            let maxClearance = -Infinity;
            prop.full.traverseVisible((object) => {
              if (!(object instanceof Mesh)) return;
              const materials = Array.isArray(object.material)
                ? object.material
                : [object.material];
              if (materials.every((m) => m.transparent && !m.depthWrite)) return;
              const vertices = object.geometry.getAttribute('position');
              const instance = new Matrix4();
              const count = object instanceof InstancedMesh ? object.count : 1;
              for (let j = 0; j < count; j++) {
                if (object instanceof InstancedMesh) object.getMatrixAt(j, instance);
                else instance.identity();
                const matrix = object.matrixWorld.clone().multiply(instance);
                for (let i = 0; i < vertices.count; i++) {
                  const v = new Vector3().fromBufferAttribute(vertices, i).applyMatrix4(matrix);
                  const clearance = v.y - terrain.sampleHeight(v.x, v.z);
                  minClearance = Math.min(minClearance, clearance);
                  maxClearance = Math.max(maxClearance, clearance);
                }
              }
            });
            expect(minClearance, `${prop.def.id} floats`).toBeLessThanOrEqual(0.5);
            expect(maxClearance, `${prop.def.id} is buried`).toBeGreaterThan(0.25);
            // Terrain-conforming carbonate aprons already encode height relative to the centre.
            // A second footprint snap sinks both the apron and its column on sloping ground.
            if (prop.def.materialHint === 'carbonate' && prop.def.dimensionsM?.[0] === 0) {
              const ground = terrain.sampleHeight(prop.root.position.x, prop.root.position.z);
              expect(prop.root.position.y, prop.def.id).toBeCloseTo(ground + prop.def.yOffsetM, 6);
            }
          }
          const free = composedFreeDiveSpawn(site, meta, terrain, props, settings, -11000)!;
          const primary = pois.filter((p) =>
            mission.objectives.some((o) => o.primary && o.poi === p.id),
          );
          const missionPose = composedMissionSpawn(
            site,
            primary,
            meta,
            terrain,
            props,
            settings,
            -11000,
          )!;
          expect(free).not.toBeNull();
          expect(missionPose).not.toBeNull();
          for (const opening of [free, missionPose]) {
            const start = new Vector3(opening.x, opening.y, opening.z);
            // Find a legal scan station reachable on a straight, sampled approach.
            // 4 m/s is a gentle first-minute approach, below the vehicle's cruising speed.
            let firstScanSeconds = Infinity;
            for (const poi of pois) {
              let accessible = false;
              for (const fraction of [0.65, 0.35, 0]) {
                for (let bearing = 0; bearing < 16; bearing++) {
                  const a = (bearing * Math.PI) / 8;
                  const end = poi.position
                    .clone()
                    .add(
                      new Vector3(
                        Math.sin(a) * poi.radius * fraction,
                        0,
                        Math.cos(a) * poi.radius * fraction,
                      ),
                    );
                  end.y = Math.max(
                    poi.position.y + settings.hullRadius + settings.seabedClearance,
                    terrain.sampleHeight(end.x, end.z) +
                      settings.hullRadius +
                      settings.seabedClearance +
                      settings.spawnClearanceM,
                  );
                  if (end.y > -settings.hullRadius || end.distanceTo(poi.position) > poi.radius)
                    continue;
                  if (props.collide(end.clone(), settings.hullRadius, new Vector3())) continue;
                  const scanner = new Scanner(config.scan, new EventBus());
                  scanner.setTargets(pois);
                  const direction = poi.position.clone().sub(end).normalize();
                  // The sub's pitch is limited: a vertical beam is not a legal reachability proof.
                  if (Math.abs(direction.y) > Math.sin(config.submarine.maxPitch) + 1e-6) continue;
                  let scanTime = 0;
                  for (
                    let second = 0;
                    second <= pois.reduce((sum, p) => sum + p.scanSeconds, 0);
                    second++
                  ) {
                    scanner.update(1, end, direction, true);
                    scanTime++;
                    if (scanner.isScanned(site, poi.id)) break;
                  }
                  if (!scanner.isScanned(site, poi.id)) continue;
                  accessible = true;
                  let clear = true;
                  const steps = Math.max(1, Math.ceil(start.distanceTo(end) / 4));
                  for (let step = 0; step <= steps; step++) {
                    const p = start.clone().lerp(end, step / steps);
                    if (
                      p.y <
                        terrain.sampleHeight(p.x, p.z) +
                          settings.hullRadius +
                          settings.seabedClearance ||
                      props.collide(p.clone(), settings.hullRadius, new Vector3())
                    ) {
                      clear = false;
                      break;
                    }
                  }
                  if (clear)
                    firstScanSeconds = Math.min(
                      firstScanSeconds,
                      start.distanceTo(end) / 4 + scanTime,
                    );
                }
              }
              // Distant optional POIs need a legal station, not a first-minute route.
              expect(accessible, poi.id).toBe(true);
            }
            expect(firstScanSeconds).toBeLessThanOrEqual(60);
          }
        } finally {
          terrain.dispose();
        }
      }, 15_000); // Real terrain and every rendered vertex can exceed the hosted CPU's 5s default.
    }
  }
});

// A steep synthetic slope isolates the classification/replacement bug from site data.
describe('carbonate chimney terrain placement', () => {
  for (const scale of [1, [1.5, 2, 0.75]]) {
    it(`keeps the apron and colliders seated after replacement, scale=${scale}`, async () => {
      const config = makeConfig();
      const { meta } = makeSyntheticTile({ cols: 40, rows: 40, cellsizeDeg: 0.001 });
      const terrain = {
        sampleHeight: (x: number) => -800 + x * 0.3,
        getNormal: (_x: number, _z: number, out = new Vector3()) => out.set(-0.3, 1, 0).normalize(),
      };
      const props = new Props(meta, terrain, config.props, 'low');
      await props.placeAll(
        {
          props: [
            {
              id: 'small-carbonate',
              model: 'procedural:chimney',
              lat: meta.center.lat,
              lon: meta.center.lon,
              snap_to_seabed: true,
              material_hint: 'carbonate',
              dimensions_m: [0, 0, 1],
              scale,
              y_offset_m: 0.5,
            },
          ],
        },
        'lost-city',
      );
      const prop = props.placed[0]!;
      expect(prop.root.position.y).toBeCloseTo(-799.5, 6);
      const oldGeometry = prop.full;
      prop.def.lon += 0.0001;
      prop.def.yOffsetM = 1;
      await props.replace(prop);
      expect(prop.full).not.toBe(oldGeometry);
      expect(prop.root.position.y).toBeCloseTo(terrain.sampleHeight(prop.root.position.x) + 1, 6);
      expect(prop.colliders.length).toBeGreaterThan(1);
      expect(props.collide(prop.colliders[0]!.center.clone(), 1, new Vector3())).toBe(true);
    });
  }
});
