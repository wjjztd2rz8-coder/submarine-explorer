// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync, writeFileSync } from 'node:fs';
import { afterAll, describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { makeConfig } from '../../src/core/Config.js';
import { EventBus } from '../../src/core/EventBus.js';
import { parseMission } from '../../src/game/Mission.js';
import { parsePois, placePois } from '../../src/game/Pois.js';
import { Scanner } from '../../src/game/Scanner.js';
import {
  chooseFreeDiveHull,
  composedFreeDiveSpawn,
  composedMissionSpawn,
  spawnSettings,
} from '../../src/game/Spawn.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import type { TileMeta } from '../../src/util/types.js';
import { Props } from '../../src/world/Props.js';
import { Terrain } from '../../src/world/Terrain.js';

const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const sites = [
  ['challenger-deep', 'leggo-lander-marker'],
  ['endurance', 'main-hull'],
  ['axial-seamount-ashes', 'mushroom-chimney'],
  ['hudson-canyon', 'coral-ledge-mound'],
  ['kamaehuakanaloa', 'hiolo-north-chimney-1'],
  ['bismarck', 'main-hull'],
  ['hunga-tonga-caldera', 'caldera-tuff-wall'],
  ['blake-plateau-corals', 'lophelia-mound'],
] as const;
const rows: unknown[] = [];
const env = (globalThis as { process?: { env?: Record<string, string> } }).process?.env;
afterAll(() => {
  if (env?.PHONE_PITCH_AUDIT === '1')
    writeFileSync('.cache/phone-pitch-measurements.json', JSON.stringify(rows, null, 2) + '\n');
});

describe('760 non-hero phone opening poses', () => {
  it('covers every catalogued site outside the five Director heroes', () => {
    const heroes = [
      'titanic',
      'lost-city',
      'monterey-canyon',
      'beebe-vent-field',
      'great-blue-hole',
    ];
    expect(sites.map(([site]) => site).sort()).toEqual(
      json('data/landmarks/index.json')
        .landmarks.filter((s: string) => !heroes.includes(s))
        .sort(),
    );
  });

  for (const [site, heroId] of sites) {
    for (const tier of ['low', 'medium'] as const) {
      it(`${site} ${tier}: free and mission poses keep the hero close, camera clear and first scan within 120 m`, async () => {
        const config = makeConfig();
        const meta = json(`data/tiles/${site}/meta.json`) as TileMeta;
        const bytes = readFileSync(`data/tiles/${site}/heightmap.bin`);
        const heights = new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows);
        const terrain = new Terrain({ meta, heights }, config.terrain, tier);
        const props = new Props(meta, terrain, config.props, tier);
        const content = json(`data/landmarks/${site}/props.json`);
        // As in marineSnowReadability: local procedural scenery needs no network/DOM loader.
        content.props = content.props.filter((p: { model: string }) =>
          p.model.startsWith('procedural:'),
        );
        const mission = parseMission(json(`data/landmarks/${site}/mission.json`), site)!;
        const pois = placePois(
          parsePois(json(`data/landmarks/${site}/pois.json`)),
          meta,
          terrain,
          config.scan,
          site,
        );
        const primaries = pois.filter((p) =>
          mission.objectives.some((o) => o.primary && o.poi === p.id),
        );
        const settings = spawnSettings(config);
        const hull = chooseFreeDiveHull(
          config.submarine.hullClasses,
          meta.min_m,
          config.submarine.freeDiveHullMarginM,
        )!;
        try {
          await props.load('props.json', site, async () => content);
          expect(props.stats.failed).toBe(0);
          const hero = props.placed.find((p) => p.def.id === heroId)!;
          expect(hero).toBeDefined();
          hero.root.updateMatrixWorld(true);
          const bounds = hero.localBounds.clone().applyMatrix4(hero.root.matrixWorld);
          const free = composedFreeDiveSpawn(
            site,
            meta,
            terrain,
            props,
            settings,
            hull.hull.ratedDepth,
            config.camera,
          );
          const missionPose = composedMissionSpawn(
            site,
            primaries,
            meta,
            terrain,
            props,
            settings,
            hull.hull.ratedDepth,
            config.camera,
          );
          expect(free).not.toBeNull();
          expect(missionPose).not.toBeNull();
          for (const [opening, pose] of [
            ['free', free!],
            ['mission', missionPose!],
          ] as const) {
            const position = new Vector3(pose.x, pose.y, pose.z);
            const nearest = [...primaries].sort(
              (a, b) => a.position.distanceTo(position) - b.position.distanceTo(position),
            )[0];
            const heroDistance = bounds.distanceToPoint(position);
            const scanDistance = nearest.position.distanceTo(position);
            const scanner = new Scanner(config.scan, new EventBus());
            scanner.setTargets(pois);
            scanner.update(
              0,
              position,
              new Vector3(Math.sin(pose.yaw), 0, -Math.cos(pose.yaw)),
              false,
            );
            const candidate = pois.find((p) => p.id === scanner.view.candidateId);
            const candidateDistance = candidate?.position.distanceTo(position) ?? Infinity;
            expect.soft(scanner.view.nearestId, `${opening}: first-frame scan hint`).not.toBeNull();
            expect
              .soft(scanner.view.nearestDistance, `${opening}: first scan hint distance`)
              .toBeLessThanOrEqual(120);
            // Check the nearest mission primary as well as the actual Scanner hint.
            // A target within 120 m can still need an approach into its authored scan radius.
            for (const aspect of [390 / 844, 844 / 390, 16 / 9]) {
              const rig = new CameraRig(config.camera, aspect, terrain);
              // Match propsSystem and missionSystem's opening camera overrides.
              if (pose.chaseOffsetY !== undefined)
                rig.setChaseRadiusDefault(pose.chaseRadius, pose.chaseOffsetX, pose.chaseOffsetY);
              else if (opening === 'free' && pose.chaseRadius) rig.chaseRadius = pose.chaseRadius;
              rig.snap(position, pose.yaw, 0);
              const cameraClearance =
                rig.camera.position.y -
                terrain.sampleHeight(rig.camera.position.x, rig.camera.position.z);
              if (aspect === 390 / 844)
                rows.push({
                  site,
                  tier,
                  opening,
                  heroDistance,
                  chaseRadius: rig.chaseRadius,
                  scanTarget: nearest.id,
                  scanDistance,
                  hintId: scanner.view.nearestId,
                  hintDistance: scanner.view.nearestDistance,
                  candidateId: candidate?.id,
                  candidateDistance,
                  cameraClearance,
                  subAltitude: pose.y - terrain.sampleHeight(pose.x, pose.z),
                  pose,
                });
              expect
                .soft(heroDistance, `${opening}: hero distance`)
                .toBeLessThanOrEqual(rig.chaseRadius);
              expect.soft(scanDistance, `${opening}: first scan distance`).toBeLessThanOrEqual(120);
              expect
                .soft(cameraClearance, `${opening}: camera terrain clearance`)
                .toBeGreaterThanOrEqual(config.camera.terrainClearance - 1e-6);
              expect
                .soft(rig.camera.position.y)
                .toBeLessThanOrEqual(-config.camera.surfaceClearance);
            }
            expect(props.collide(position.clone(), settings.hullRadius + 4, new Vector3())).toBe(
              false,
            );
            expect(pose.y).toBeGreaterThanOrEqual(hull.hull.ratedDepth + settings.hullRadius);
            expect(pose.y - terrain.sampleHeight(pose.x, pose.z)).toBeGreaterThanOrEqual(
              settings.hullRadius + settings.seabedClearance + settings.spawnClearanceM - 1e-6,
            );
          }
        } finally {
          terrain.dispose();
        }
      });
    }
  }
});
