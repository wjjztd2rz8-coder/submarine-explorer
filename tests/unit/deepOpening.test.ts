// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync, writeFileSync } from 'node:fs';
import { afterAll, describe, expect, it } from 'vitest';
import { Box2, InstancedMesh, Matrix4, Mesh, Raycaster, Vector2, Vector3 } from 'three';
import { DEEP_OPENINGS, deepSiteWater, makeConfig } from '../../src/core/Config.js';
import { spawnSettings } from '../../src/game/Spawn.js';
import { composedFreeDiveSpawn, composedMissionSpawn } from '../../src/game/DeepOpeningSpawn.js';
import { parsePois, placePois } from '../../src/game/Pois.js';
import { Scanner } from '../../src/game/Scanner.js';
import { EventBus } from '../../src/core/EventBus.js';
import { buildJournalSite, journalEntryTag } from '../../src/game/JournalData.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import { Submarine } from '../../src/sub/Submarine.js';
import type { InputState } from '../../src/core/Input.js';
import { SubMesh } from '../../src/sub/SubMesh.js';
import { sampleAtmosphere } from '../../src/render/Atmosphere.js';
import { Props } from '../../src/world/Props.js';
import { Terrain } from '../../src/world/Terrain.js';
import { populateDeepOpening } from '../../src/world/life/DeepOpening.js';
import { LifeSim } from '../../src/world/life/LifeSim.js';
import { parseLifeDoc } from '../../src/world/life/tables.js';
import { LIFE_TIERS } from '../../src/world/life/types.js';
import type { SubInfo } from '../../src/world/life/agent.js';
import type { TileMeta } from '../../src/util/types.js';
import { hullClearance } from './helpers/hullClearance.js';

const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const life = parseLifeDoc(json('data/life/life.json'));
const audit: unknown[] = [];
afterAll(() => {
  const env = (globalThis as { process?: { env?: Record<string, string> } }).process?.env;
  if (env?.F_VERIFY_1000_AUDIT === '1')
    writeFileSync('.cache/verify-1000-deep.json', JSON.stringify(audit, null, 2) + '\n');
});

describe('Challenger / Endurance opening', () => {
  for (const site of ['challenger-deep', 'endurance'] as const) {
    for (const tier of ['low', 'medium', 'high', 'ultra'] as const) {
      it(`${site} ${tier}: safe hull, visible target and staged wildlife through 60 s`, async () => {
        const config = makeConfig();
        const meta = json(`data/tiles/${site}/meta.json`) as TileMeta;
        const bytes = readFileSync(`data/tiles/${site}/heightmap.bin`);
        const terrain = new Terrain(
          {
            meta,
            heights: new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows),
          },
          config.terrain,
          tier,
        );
        const props = new Props(meta, terrain, config.props, tier);
        const sub = new SubMesh({
          length: 26,
          hullClass: site === 'challenger-deep' ? 'C' : 'B',
          tier,
        });
        try {
          await props.placeAll(json(`data/landmarks/${site}/props.json`), site);
          expect(props.stats.failed).toBe(0);
          const pose = composedFreeDiveSpawn(
            site,
            meta,
            terrain,
            props,
            spawnSettings(config),
            site === 'challenger-deep' ? -11000 : -6500,
          )!;
          expect(pose).not.toBeNull();
          const position = new Vector3(pose.x, pose.y, pose.z);
          const forward = new Vector3(Math.sin(pose.yaw), 0, -Math.cos(pose.yaw));
          const hero = props.placed.find((p) => p.def.id === DEEP_OPENINGS[site].hero)!;
          hero.root.updateMatrixWorld(true);
          const toHero = hero.root
            .localToWorld(hero.localBounds.getCenter(new Vector3()))
            .sub(position)
            .setY(0)
            .normalize();
          // Match the browser gate while retaining the independent phone-reticle clearance check.
          expect(forward.dot(toHero), 'opening faces its hero').toBeGreaterThan(0.98);
          expect(props.collide(position.clone(), config.submarine.hullRadius, new Vector3())).toBe(
            false,
          );
          expect(position.y - terrain.sampleHeight(position.x, position.z)).toBeGreaterThanOrEqual(
            config.submarine.hullRadius + config.submarine.seabedClearance,
          );
          const pilot: SubInfo = {
            ...pose,
            vx: 0,
            vy: 0,
            vz: 0,
            fx: forward.x,
            fy: 0,
            fz: forward.z,
            speed: 0,
            lightsOn: true,
            hullR: config.submarine.hullRadius,
          };
          const staged: number[] = [];
          const sim = new LifeSim({
            tier: LIFE_TIERS[tier],
            table: life.sites[site],
            env: { groundAt: (x, z) => terrain.sampleHeight(x, z) },
            seed: 42,
            populate: (s, p) => {
              populateDeepOpening(site, s, p, props);
              staged.push(...s.groups.map((g) => g.id));
            },
          });
          sim.update(1 / 60, pilot);
          const groups = sim.groups.filter((g) => staged.includes(g.id));
          expect(groups).toHaveLength(1);
          const group = groups[0]!;
          expect(group.members).toHaveLength(
            tier === 'low' ? DEEP_OPENINGS[site].habitat.low : DEEP_OPENINGS[site].habitat.count,
          );
          const targets = placePois(
            parsePois(json(`data/landmarks/${site}/pois.json`)),
            meta,
            terrain,
            config.scan,
            site,
          );
          const target = targets.find(
            (p) =>
              p.id === (site === 'challenger-deep' ? 'cd-leggo-amphipod-site' : 'endurance-hull'),
          )!;
          const missionPose = composedMissionSpawn(
            site,
            [target],
            meta,
            terrain,
            props,
            spawnSettings(config),
            site === 'challenger-deep' ? -11000 : -6500,
            config.camera,
          );
          expect(missionPose).toEqual(pose);
          const scanner = new Scanner(config.scan, new EventBus());
          scanner.setTargets([target]);
          scanner.update(1 / 60, position, forward, false);
          expect(scanner.view.candidateId).toBe(target.id);
          sub.setView('chase');
          sub.setPose(position, pose.yaw, 0, 0);
          const visualClearance = hullClearance(sub.group, terrain);
          expect(visualClearance, 'visible hull clears the terrain at the opening').toBeGreaterThan(
            0,
          );
          for (const [width, height] of [
            [1600, 900],
            [1280, 720],
            [390, 844],
          ]) {
            const rig = new CameraRig(config.camera, width / height, terrain);
            rig.setChaseRadiusDefault(
              pose.chaseRadius,
              pose.chaseOffsetX,
              pose.chaseOffsetY,
              pose.portraitChaseOffset,
            );
            rig.snap(position, pose.yaw, 0);
            rig.camera.updateMatrixWorld(true);
            props.group.updateMatrixWorld(true);
            const projected = target.position.clone().project(rig.camera);
            expect(Math.abs(projected.x), 'target horizontal fit').toBeLessThan(0.95);
            expect(Math.abs(projected.y), 'target vertical fit').toBeLessThan(0.95);
            const bounds = new Box2();
            const matrix = new Matrix4();
            const world = new Matrix4();
            const point = new Vector3();
            sub.group.updateMatrixWorld(true);
            sub.group.traverseVisible((o) => {
              if (!(o instanceof Mesh)) return;
              const vertices = o.geometry.getAttribute('position');
              const count = o instanceof InstancedMesh ? o.count : 1;
              for (let i = 0; i < count; i++) {
                if (o instanceof InstancedMesh) o.getMatrixAt(i, matrix);
                else matrix.identity();
                world.multiplyMatrices(o.matrixWorld, matrix);
                for (let j = 0; j < vertices.count; j++) {
                  point.fromBufferAttribute(vertices, j).applyMatrix4(world).project(rig.camera);
                  bounds.expandByPoint(
                    new Vector2(((point.x + 1) * width) / 2, ((1 - point.y) * height) / 2),
                  );
                }
              }
            });
            expect(bounds.min.x).toBeGreaterThan(0);
            expect(bounds.max.x).toBeLessThan(width);
            expect(bounds.min.y).toBeGreaterThan(0);
            expect(bounds.max.y).toBeLessThan(height);
            const pixel = new Vector2(
              ((projected.x + 1) * width) / 2,
              ((1 - projected.y) * height) / 2,
            );
            const margin = config.scan.reticleSizePx / 2 + 8;
            expect(
              bounds.intersectsBox(
                new Box2(pixel.clone().addScalar(-margin), pixel.clone().addScalar(margin)),
              ),
              'target reticle clear of the whole hull',
            ).toBe(false);
            const visible = group.members.filter((a) => {
              const p = new Vector3(a.x, a.y + (a.def.size * a.def.visScale) / 2, a.z);
              const ndc = p.clone().project(rig.camera);
              if (Math.abs(ndc.x) > 0.95 || Math.abs(ndc.y) > 0.95) return false;
              const delta = p.clone().sub(rig.camera.position);
              const ray = new Raycaster(
                rig.camera.position,
                delta.clone().normalize(),
                0,
                delta.length() - 0.5,
              );
              return ray.intersectObject(props.group, true).length === 0;
            });
            expect(visible.length, `${width}x${height} wildlife sightline`).toBeGreaterThan(0);
            console.log(
              JSON.stringify({
                site,
                tier,
                viewport: [width, height],
                position: position.toArray(),
                targetNdc: projected.toArray(),
                subBounds: [bounds.min.toArray(), bounds.max.toArray()],
                visible: visible.length,
                cameraRange: rig.camera.position.distanceTo(target.position),
              }),
            );
          }
          const vehicle = new Submarine(config.submarine, terrain);
          vehicle.setHullClass(site === 'challenger-deep' ? 'C' : 'B');
          vehicle.reset(pose.x, pose.y, pose.z, pose.yaw);
          const idle = {
            throttle: 0,
            yaw: 0,
            pitch: 0,
            ballast: 0,
            lookDx: 0,
            lookDy: 0,
            toggleCamera: false,
            toggleSonar: false,
            boost: false,
            toggleLights: false,
            ping: false,
            scan: false,
            cycleSimSpeed: false,
            togglePhotoMode: false,
          } satisfies InputState;
          let minimumClearance = Infinity;
          for (let i = 0; i < 3600; i++) {
            vehicle.step(idle, 1 / 60);
            Object.assign(pilot, {
              x: vehicle.position.x,
              y: vehicle.position.y,
              z: vehicle.position.z,
            });
            sim.update(1 / 60, pilot);
            scanner.update(1 / 60, vehicle.position, vehicle.getForward(), true);
            minimumClearance = Math.min(
              minimumClearance,
              vehicle.position.y - terrain.sampleHeight(vehicle.position.x, vehicle.position.z),
            );
          }
          expect(scanner.view.lastCompleteId).toBe(target.id);
          expect(minimumClearance).toBeGreaterThanOrEqual(
            config.submarine.hullRadius + config.submarine.seabedClearance - 1e-6,
          );
          expect(vehicle.hullBreached).toBe(false);
          expect(group.members.length, 'staged group survives the first minute').toBeGreaterThan(0);
          audit.push({
            site,
            tier,
            staged: group.members.length,
            minimumClearance,
            visualClearance,
          });
          console.log(
            `VERIFY-1000 ${site} ${tier}: staged=${group.members.length} minClearance=${minimumClearance.toFixed(2)}m`,
          );
          expect(sim.liveCount).toBeLessThanOrEqual(LIFE_TIERS[tier].maxAgents);
          expect(sim.stats().species).toBeLessThanOrEqual(LIFE_TIERS[tier].maxSpecies);
          for (const a of group.members) {
            expect(a.y).toBeGreaterThanOrEqual(terrain.sampleHeight(a.x, a.z));
            expect(-a.y).toBeGreaterThanOrEqual(a.def.depth[0]);
            expect(-a.y).toBeLessThanOrEqual(a.def.depth[1]);
            if (site === 'endurance')
              expect(a.y - terrain.sampleHeight(a.x, a.z)).toBeGreaterThan(5);
          }
          sim.clear();
          staged.length = 0;
          sim.update(1 / 60, pilot);
          expect(staged).toHaveLength(1);
          sim.clear();
          staged.length = 0;
          sim.update(1 / 60, { ...pilot, x: pilot.x + 500 });
          expect(staged).toHaveLength(0);
          const journal = buildJournalSite({
            id: site,
            guide: null,
            pois: [],
            species: null,
            life,
          });
          const entries = journal.entries.filter(
            (e) => e.id === DEEP_OPENINGS[site].habitat.species,
          );
          expect(entries).toHaveLength(1);
          expect(journalEntryTag(entries[0]!)).toBe('Game addition');
        } finally {
          sub.dispose();
          terrain.dispose();
        }
      }, 30000);
    }
  }
});

it('keeps the upper water column and other sites intact; abyss exposure survives the hadal multiplier', () => {
  const config = makeConfig();
  const snapshot = JSON.stringify(config.water);
  for (const site of ['challenger-deep', 'endurance']) {
    const water = deepSiteWater(site, config.water);
    expect(sampleAtmosphere(water, -5)).toEqual(sampleAtmosphere(config.water, -5));
    const abyss = sampleAtmosphere(water, -3000);
    expect(abyss.sunIntensity).toBe(0);
    const fog =
      abyss.fogDensity * (site === 'challenger-deep' ? config.presets.trench.fogScale : 1);
    expect(Math.exp(-fog * fog * 80 * 80)).toBeGreaterThan(0.12);
    expect(abyss.ambientIntensity * config.presets.trench.ambientScale).toBeGreaterThan(9);
  }
  for (const site of [
    'great-blue-hole',
    'beebe-vent-field',
    'monterey-canyon',
    'lost-city',
    'titanic',
  ])
    expect(deepSiteWater(site, config.water)).toBe(config.water);
  expect(JSON.stringify(config.water)).toBe(snapshot);
});
