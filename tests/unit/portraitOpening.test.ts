// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { Box2, InstancedMesh, Mesh, Vector2, Vector3 } from 'three';
import { expect, test, vi } from 'vitest';
import { makeConfig } from '../../src/core/Config.js';
import {
  chooseFreeDiveHull,
  missionApproachScanRadius,
  spawnSettings,
} from '../../src/game/Spawn.js';
import { composedFreeDiveSpawn, composedMissionSpawn } from '../../src/game/DeepOpeningSpawn.js';
import { defaultSettings } from '../../src/core/Save.js';
import { resolveEffective } from '../../src/game/EffectiveSettings.js';
import { parseMission } from '../../src/game/Mission.js';
import { parsePois, placePois } from '../../src/game/Pois.js';
import { requiredHull } from '../../src/game/Progress.js';
import { Scanner, resolveScanRadius } from '../../src/game/Scanner.js';
import { EventBus } from '../../src/core/EventBus.js';
import { FROZEN_INPUT } from '../../src/game/MissionRouter.js';
import { Submarine } from '../../src/sub/Submarine.js';
import { PropContact } from '../../src/world/props/Wiring.js';
import { scanAim } from '../e2e/helpers/scanAim.js';
import sites from '../../data/landmarks/index.json';
import { hullClearance, visitHullVertices } from './helpers/hullClearance.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import { SubMesh } from '../../src/sub/SubMesh.js';
import type { TileMeta } from '../../src/util/types.js';
import { Props } from '../../src/world/Props.js';
import { Terrain } from '../../src/world/Terrain.js';

const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const rect = (x: number, y: number, width: number, height: number) =>
  new Box2(new Vector2(x, y), new Vector2(x + width, y + height));

// Envelopes from external DOM dumps at 390×844, with the contact
// stack now below telemetry in that same right column. Browser specs retain
// their exact live-rectangle assertions; these are headless framing guards.
const obstacles = [
  rect(12, 12, 156, 314),
  rect(180, 72, 198, 116.2),
  rect(180, 200, 198, 160),
  rect(12, 640, 105.5, 44),
  rect(11.2, 728.8, 104, 104),
  rect(322.8, 692.8, 56, 140),
  rect(209.2, 676, 102.4, 156.8),
  rect(330, 12, 48, 48),
];

for (const { site, tier, route } of sites.landmarks.flatMap((site) =>
  (['low', 'medium', 'high'] as const).flatMap((tier) =>
    (['free-dive', 'mission'] as const).map((route) => ({ site, tier, route })),
  ),
)) {
  // Authored data can move either route into a slope, prop or portrait HUD lane.
  test(`${site} ${tier} ${route}: opening hull fits the portrait HUD lane, survives rotation/reset and reaches its first scan`, async () => {
    const config = makeConfig();
    const effective = resolveEffective(defaultSettings(config), 'arcade', null, config);
    const meta = json(`data/tiles/${site}/meta.json`) as TileMeta;
    const bytes = readFileSync(`data/tiles/${site}/heightmap.bin`);
    const heights = new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows);
    const terrain = new Terrain({ meta, heights }, config.terrain, tier);
    const props = new Props(meta, terrain, config.props, tier);
    const mission = parseMission(json(`data/landmarks/${site}/mission.json`), site)!;
    const hullClass =
      route === 'mission'
        ? requiredHull(mission.briefing.depth_m ?? Math.abs(meta.min_m)).id
        : chooseFreeDiveHull(
            config.submarine.hullClasses,
            meta.min_m,
            config.submarine.freeDiveHullMarginM,
          )!.classId;
    const sub = new SubMesh({ length: 26, hullClass, tier });
    const warnings = vi.spyOn(console, 'warn');
    try {
      const content = json(`data/landmarks/${site}/props.json`);
      // Browser coverage loads external GLBs; headless geometry uses procedural props.
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
      const args = [
        site,
        meta,
        terrain,
        props,
        spawnSettings(config),
        config.submarine.hullClasses[hullClass].ratedDepth,
        effective.camera,
      ] as const;
      const pose =
        route === 'mission'
          ? composedMissionSpawn(
              site,
              primaries,
              meta,
              terrain,
              props,
              spawnSettings(config),
              config.submarine.hullClasses[hullClass].ratedDepth,
              effective.camera,
            )
          : composedFreeDiveSpawn(...args, 'arcade');
      expect(pose).not.toBeNull();
      const position = new Vector3(pose!.x, pose!.y, pose!.z);
      sub.setPose(position, pose!.yaw, 0, 0);
      sub.group.updateMatrixWorld(true);
      expect(
        hullClearance(sub.vehicle.root, terrain),
        'visible hull above terrain',
      ).toBeGreaterThan(0);
      expect(
        props.collide(position.clone(), config.submarine.hullRadius, new Vector3()),
        'hull outside prop colliders',
      ).toBe(false);
      let hullPropContact = false;
      visitHullVertices(sub.vehicle.root, (point) => {
        if (!hullPropContact) hullPropContact = props.collide(point.clone(), 0.01, new Vector3());
      });
      expect(hullPropContact, 'complete visible hull outside prop colliders').toBe(false);
      expect(warnings).not.toHaveBeenCalled();
      const rig = new CameraRig(effective.camera, 390 / 844, terrain);
      rig.setChaseRadiusDefault(
        pose!.chaseRadius,
        pose!.chaseOffsetX,
        pose!.chaseOffsetY,
        pose!.portraitChaseOffset,
      );
      const bounds = () => {
        rig.snap(position, pose!.yaw, 0);
        rig.camera.updateMatrixWorld(true);
        const result = new Box2();
        sub.vehicle.root.traverseVisible((object) => {
          if (!(object instanceof Mesh)) return;
          let box;
          if (object instanceof InstancedMesh) {
            object.computeBoundingBox();
            box = object.boundingBox;
          } else {
            object.geometry.computeBoundingBox();
            box = object.geometry.boundingBox;
          }
          if (!box || box.isEmpty()) return;
          for (const x of [box.min.x, box.max.x])
            for (const y of [box.min.y, box.max.y])
              for (const z of [box.min.z, box.max.z]) {
                const point = new Vector3(x, y, z)
                  .applyMatrix4(object.matrixWorld)
                  .project(rig.camera);
                expect(point.z).toBeGreaterThan(-1);
                expect(point.z).toBeLessThan(1);
                result.expandByPoint(new Vector2((point.x + 1) * 195, (1 - point.y) * 422));
              }
        });
        return result;
      };
      const opening = bounds();
      expect(opening.isEmpty()).toBe(false);
      expect(rect(0, 0, 390, 844).containsBox(opening), JSON.stringify(opening)).toBe(true);
      for (const obstacle of obstacles)
        expect(opening.intersectsBox(obstacle), JSON.stringify({ opening, obstacle })).toBe(false);
      // A portrait offset can intentionally differ from landscape. Rotation must
      // match a fresh landscape rig, then restore the original portrait bounds.
      const landscape = new CameraRig(effective.camera, 844 / 390, terrain);
      landscape.setChaseRadiusDefault(
        pose!.chaseRadius,
        pose!.chaseOffsetX,
        pose!.chaseOffsetY,
        pose!.portraitChaseOffset,
      );
      landscape.snap(position, pose!.yaw, 0);
      rig.setAspect(844 / 390);
      rig.snap(position, pose!.yaw, 0);
      expect(rig.camera.fov).toBe(config.camera.fovDeg);
      expect(rig.camera.position).toEqual(landscape.camera.position);
      rig.setAspect(390 / 844);
      rig.resetView();
      expect(bounds()).toEqual(opening);

      // Exercise the real physics, prop push-out and scan gates from this pose.
      // A bounded pilot follows the opening's first contact without teleporting.
      const bus = new EventBus();
      const pilot = new Submarine(effective.submarine, terrain);
      pilot.setHullClass(hullClass);
      pilot.setSimSpeed(1);
      pilot.reset(pose!.x, pose!.y, pose!.z, pose!.yaw);
      const scanner = new Scanner(effective.scan, bus);
      for (const poi of pois) {
        const radius =
          route === 'mission' && primaries.includes(poi)
            ? missionApproachScanRadius(site, poi.radius)
            : poi.radius;
        poi.radius = resolveScanRadius(
          radius * effective.sensor.scanRadiusMultiplier,
          effective.scan,
        );
      }
      scanner.setTargets(pois);
      scanner.update(0, pilot.position, pilot.getForward(), false);
      const target =
        route === 'mission' ? primaries[0] : pois.find((poi) => poi.id === scanner.view.nearestId);
      expect(target, 'opening offers a first scan target').toBeDefined();
      scanner.setObjective(target!.id);
      const contact = new PropContact(props, bus, config.props, config.submarine.hullRadius);
      const clamp = (n: number) => Math.max(-1, Math.min(1, n));
      let ticks = 0;
      for (; ticks < 300 * 60 && !scanner.isScanned(site, target!.id); ticks++) {
        scanner.update(0, pilot.position, pilot.getForward(), scanner.view.phase === 'scanning');
        const ready = scanner.view.candidateId === target!.id;
        const aim = scanAim(pilot.position, target!.position, effective.submarine.maxPitch);
        const input = {
          ...FROZEN_INPUT,
          yaw: clamp(scanner.view.objectiveTurnDeg / 20),
          pitch: clamp((aim.pitch - pilot.pitch) / 0.2),
          ballast: clamp((target!.position.y + 16 - pilot.position.y) / 8 - pilot.velocity.y),
          throttle:
            !ready &&
            Math.abs(scanner.view.objectiveTurnDeg) < 15 &&
            scanner.view.objectiveDistance > scanner.view.objectiveRadius * 0.8
              ? 0.5
              : 0,
          scan: ready,
        };
        pilot.step(input, 1 / 60);
        contact.resolve(pilot, 1 / 60);
        scanner.update(1 / 60, pilot.position, pilot.getForward(), input.scan);
      }
      expect(ticks, `reach and scan ${target!.id}`).toBeLessThan(300 * 60);
      expect(scanner.view.lastCompleteId).toBe(target!.id);
      expect(pilot.hullBreached).toBe(false);
    } finally {
      warnings.mockRestore();
      sub.dispose();
      props.dispose();
      terrain.dispose();
    }
  });
}
