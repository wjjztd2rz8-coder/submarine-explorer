// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { Vector3 } from 'three';
import { makeConfig } from '../../src/core/Config.js';
import { siteManifest } from '../../src/core/SiteManifest.js';
import {
  MISSION_APPROACH_M,
  missionApproachScanRadius,
  spawnSettings,
} from '../../src/game/Spawn.js';
import { composedMissionSpawn } from '../../src/game/DeepOpeningSpawn.js';
import { parseMission } from '../../src/game/Mission.js';
import { parsePois, placePois } from '../../src/game/Pois.js';
import { Props } from '../../src/world/Props.js';
import { Terrain } from '../../src/world/Terrain.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import { SubMesh } from '../../src/sub/SubMesh.js';
import { hullClearance } from './helpers/hullClearance.js';
import type { TileMeta } from '../../src/util/types.js';
import sites from '../../data/landmarks/index.json';

const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
it('every authored site retains its mission approach distance', () => {
  // Enumerate content independently: deleting a tuning row must not delete its
  // three geometry cases or silently substitute the generic spawn distance.
  expect(Object.keys(MISSION_APPROACH_M).sort()).toEqual([...sites.landmarks].sort());
  expect(MISSION_APPROACH_M).toEqual({
    titanic: 140,
    'challenger-deep': 140,
    'lost-city': 220,
    'monterey-canyon': 240,
    endurance: 110,
    'axial-seamount-ashes': 180,
    'hudson-canyon': 160,
    kamaehuakanaloa: 200,
    'beebe-vent-field': 220,
    'great-blue-hole': 150,
    bismarck: 110,
    'hunga-tonga-caldera': 160,
    'blake-plateau-corals': 160,
  });
});

for (const site of sites.landmarks) {
  for (const tier of ['low', 'medium', 'high'] as const) {
    it(`${site} ${tier}: first primary has a clear, hull-safe approach and visible navigation`, async () => {
      const config = makeConfig();
      const meta = json(`data/tiles/${site}/meta.json`) as TileMeta;
      const bytes = readFileSync(`data/tiles/${site}/heightmap.bin`);
      const terrain = new Terrain(
        { meta, heights: new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows) },
        config.terrain,
        tier,
      );
      const props = new Props(meta, terrain, config.props, tier);
      const mission = parseMission(json(`data/landmarks/${site}/mission.json`), site)!;
      const mesh = new SubMesh({ length: 26, hullClass: mission.hull_class!, tier });
      try {
        const content = json(`data/landmarks/${site}/props.json`);
        content.props = content.props.filter((p: { model: string }) =>
          p.model.startsWith('procedural:'),
        );
        await props.placeAll(content, site);
        expect(props.stats.failed).toBe(0);
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
        const ratedDepth = config.submarine.hullClasses[mission.hull_class!].ratedDepth;
        const settings = spawnSettings(config);
        const pose = composedMissionSpawn(
          site,
          primaries,
          meta,
          terrain,
          props,
          settings,
          ratedDepth,
          config.camera,
        );
        expect(pose).not.toBeNull();
        const p = new Vector3(pose!.x, pose!.y, pose!.z);
        const target = primaries[0];
        const range = p.distanceTo(target.position);
        expect(range).toBeCloseTo(MISSION_APPROACH_M[site], 2);
        expect(range).toBeGreaterThanOrEqual(110);
        expect(range).toBeLessThanOrEqual(300);
        expect(p.y).toBeGreaterThanOrEqual(ratedDepth + settings.hullRadius);
        expect(p.y).toBeLessThan(-settings.hullRadius);
        expect(props.collide(p.clone(), settings.hullRadius + 4, new Vector3())).toBe(false);
        const direction = target.position.clone().sub(p).setY(0).normalize();
        expect(
          new Vector3(Math.sin(pose!.yaw), 0, -Math.cos(pose!.yaw)).dot(direction),
        ).toBeCloseTo(
          Math.cos(((siteManifest(site)?.opening?.mission?.yawOffset ?? 0) * Math.PI) / 180),
          3,
        );
        mesh.setPose(p, pose!.yaw, 0, 0);
        expect(hullClearance(mesh.group, terrain)).toBeGreaterThan(0);
        for (const sensors of Object.values(config.sensorPresets)) {
          const scanRadius =
            missionApproachScanRadius(site, target.radius) * sensors.scanRadiusMultiplier;
          expect(range).toBeGreaterThan(scanRadius);
          expect(range - scanRadius).toBeGreaterThanOrEqual(60 - 0.01);
          expect(range).toBeLessThan(sensors.sonarPoiRange);
        }
        const radius = missionApproachScanRadius(site, target.radius);
        for (let distance = 0; distance < range - radius; distance += 5) {
          const point = p.clone().lerp(target.position.clone().setY(p.y), distance / range);
          expect(point.y - terrain.sampleHeight(point.x, point.z)).toBeGreaterThanOrEqual(
            settings.hullRadius + settings.seabedClearance,
          );
          expect(props.collide(point, settings.hullRadius + 4, new Vector3())).toBe(false);
        }
        for (const aspect of [1280 / 720, 390 / 844, 844 / 390]) {
          const rig = new CameraRig(config.camera, aspect, terrain);
          rig.snap(p, pose!.yaw, 0);
          rig.camera.updateMatrixWorld(true);
          expect(
            rig.camera.position.y -
              terrain.sampleHeight(rig.camera.position.x, rig.camera.position.z),
          ).toBeGreaterThanOrEqual(config.camera.terrainClearance - 1e-6);
          const contact = target.position.clone().project(rig.camera);
          expect(Math.abs(contact.x)).toBeLessThan(1);
          expect(Math.abs(contact.y)).toBeLessThan(1);
          expect(contact.z).toBeGreaterThan(-1);
          expect(contact.z).toBeLessThan(1);
        }
      } finally {
        mesh.dispose();
        terrain.dispose();
      }
    });
  }
}
