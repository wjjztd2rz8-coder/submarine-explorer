// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync, writeFileSync } from 'node:fs';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { Raycaster, Vector3 } from 'three';
import * as manifests from '../../src/core/SiteManifest.js';
import { makeConfig } from '../../src/core/Config.js';
import { defaultSettings } from '../../src/core/Save.js';
import { resolveEffective } from '../../src/game/EffectiveSettings.js';
import { composedFreeDiveSpawn, composedMissionSpawn } from '../../src/game/DeepOpeningSpawn.js';
import { missionApproachScanRadius, spawnSettings } from '../../src/game/Spawn.js';
import { parseMission } from '../../src/game/Mission.js';
import { parsePois, placePois } from '../../src/game/Pois.js';
import { resolveScanRadius, Scanner } from '../../src/game/Scanner.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import { Props } from '../../src/world/Props.js';
import { Terrain } from '../../src/world/Terrain.js';
import type { TileMeta } from '../../src/util/types.js';

const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const audit: unknown[] = [];
afterAll(() => {
  const env = (globalThis as { process?: { env?: Record<string, string> } }).process?.env;
  if (env?.OPENING_SAFETY_AUDIT)
    writeFileSync(env.OPENING_SAFETY_AUDIT, JSON.stringify(audit, null, 2) + '\n');
});

describe('closer mission opening safety', () => {
  for (const site of ['lost-city', 'bismarck']) {
    for (const tier of ['low', 'medium', 'high'] as const) {
      it(`${site} ${tier}: effective scan radius, camera clearance and unchanged free dive in both modes`, async () => {
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
        try {
          await props.placeAll(json(`data/landmarks/${site}/props.json`), site);
          expect(props.stats.failed).toBe(0);
          const mission = parseMission(json(`data/landmarks/${site}/mission.json`), site)!;
          const pois = placePois(
            parsePois(json(`data/landmarks/${site}/pois.json`)),
            meta,
            terrain,
            config.scan,
            site,
          );
          const primaries = mission.objectives
            .filter((o) => o.primary)
            .map((o) => pois.find((p) => p.id === o.poi)!);
          const safeDepth = config.submarine.hullClasses[mission.hull_class!].ratedDepth;
          const manifest = manifests.siteManifest(site)!;
          for (const mode of ['arcade', 'realistic'] as const) {
            const effective = resolveEffective(defaultSettings(config), mode, null, config);
            const pose = composedMissionSpawn(
              site,
              primaries,
              meta,
              terrain,
              props,
              spawnSettings(config),
              safeDepth,
              effective.camera,
            )!;
            expect(pose).not.toBeNull();
            const position = new Vector3(pose.x, pose.y, pose.z);
            const distance = position.distanceTo(primaries[0].position);
            const radius = resolveScanRadius(
              missionApproachScanRadius(site, primaries[0].radius) *
                effective.sensor.scanRadiusMultiplier,
              effective.scan,
            );
            expect(distance).toBeCloseTo(manifest.opening!.mission!.rangeM, 6);
            expect(distance).toBeGreaterThan(radius);
            const scanner = new Scanner(effective.scan, { emit: () => {} });
            scanner.setTargets([{ ...primaries[0], radius }]);
            scanner.setObjective(primaries[0].id);
            scanner.update(
              1,
              position,
              new Vector3(Math.sin(pose.yaw), 0, -Math.cos(pose.yaw)),
              true,
            );
            expect(scanner.view.objectiveRadius).toBe(radius);
            expect(scanner.view.objectiveInRange).toBe(false);
            expect(scanner.view.activeId).toBeNull();
            const hero = props.placed.find((p) => p.def.id === manifest.opening!.freeDive!.hero)!;
            const localDirection = hero.root
              .worldToLocal(position.clone())
              .sub(hero.root.worldToLocal(primaries[0].position.clone()));
            const bearing = (Math.atan2(localDirection.x, -localDirection.z) * 180) / Math.PI;
            if (manifest.opening!.mission!.bearing !== undefined)
              expect(bearing).toBeCloseTo(manifest.opening!.mission!.bearing!, 6);
            for (const [width, height] of [
              [1600, 900],
              [390, 844],
              [844, 390],
            ]) {
              const rig = new CameraRig(effective.camera, width / height, terrain);
              rig.setPhoneLandscape(width === 844);
              rig.setChaseRadiusDefault(pose.chaseRadius, pose.chaseOffsetX, pose.chaseOffsetY);
              rig.snap(position, pose.yaw, 0);
              rig.camera.updateMatrixWorld(true);
              const eye = rig.camera.position;
              let nearClearance = Infinity;
              let armClearance = Infinity;
              expect(eye.y - terrain.sampleHeight(eye.x, eye.z)).toBeGreaterThanOrEqual(
                config.camera.terrainClearance - 1e-8,
              );
              for (const x of [-1, 0, 1])
                for (const y of [-1, 0, 1]) {
                  const point = new Vector3(x, y, -1).unproject(rig.camera);
                  nearClearance = Math.min(
                    nearClearance,
                    point.y - terrain.sampleHeight(point.x, point.z),
                  );
                  expect(point.y - terrain.sampleHeight(point.x, point.z)).toBeGreaterThan(0);
                  expect(props.collide(point, config.camera.near, new Vector3())).toBe(false);
                }
              for (let step = 0; step <= 100; step++) {
                const point = position.clone().lerp(eye, step / 100);
                armClearance = Math.min(
                  armClearance,
                  point.y - terrain.sampleHeight(point.x, point.z),
                );
                expect(point.y - terrain.sampleHeight(point.x, point.z)).toBeGreaterThan(0);
                expect(props.collide(point, 1, new Vector3())).toBe(false);
              }
              terrain.group.updateMatrixWorld(true);
              props.group.updateMatrixWorld(true);
              const arm = eye.clone().sub(position);
              const ray = new Raycaster(position, arm.clone().normalize(), 0, arm.length());
              expect(ray.intersectObject(terrain.group, true)).toHaveLength(0);
              expect(ray.intersectObject(props.group, true)).toHaveLength(0);
              audit.push({
                site,
                tier,
                mode,
                viewport: [width, height],
                distance,
                radius,
                bearing,
                eyeClearance: eye.y - terrain.sampleHeight(eye.x, eye.z),
                nearClearance,
                armClearance,
              });
            }
            const free = () =>
              composedFreeDiveSpawn(
                site,
                meta,
                terrain,
                props,
                spawnSettings(config),
                safeDepth,
                effective.camera,
                mode,
              );
            const current = free();
            expect(current).not.toBeNull();
            // Restore the pre-scale mission fields; free-dive data is identical.
            const baseline = structuredClone(manifest);
            baseline.opening!.mission = {
              rangeM: site === 'lost-city' ? 220 : 110,
              ...(site === 'bismarck' ? { yawOffset: 8 } : { localAltitudeWeight: 1 }),
            };
            const lookup = manifests.siteManifest;
            const spy = vi
              .spyOn(manifests, 'siteManifest')
              .mockImplementation((id) => (id === site ? baseline : lookup(id)));
            try {
              expect(free()).toEqual(current);
            } finally {
              spy.mockRestore();
            }
          }
        } finally {
          terrain.dispose();
        }
      });
    }
  }
});
