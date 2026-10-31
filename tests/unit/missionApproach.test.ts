// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { Vector3 } from 'three';
import { makeConfig } from '../../src/core/Config.js';
import { defaultSettings } from '../../src/core/Save.js';
import { resolveEffective } from '../../src/game/EffectiveSettings.js';
import { Scanner, resolveScanRadius } from '../../src/game/Scanner.js';
import { EventBus } from '../../src/core/EventBus.js';
import { Mission, nextScanObjective } from '../../src/game/Mission.js';
import { Submarine } from '../../src/sub/Submarine.js';
import { FROZEN_INPUT } from '../../src/game/MissionRouter.js';
import { siteManifest } from '../../src/core/SiteManifest.js';
import {
  MISSION_APPROACH_M,
  missionApproachScanRadius,
  spawnSettings,
} from '../../src/game/Spawn.js';
import { composedMissionSpawn } from '../../src/game/DeepOpeningSpawn.js';
import { parseMission } from '../../src/game/Mission.js';
import { parsePois, placePois } from '../../src/game/Pois.js';
import { scanAim } from '../e2e/helpers/scanAim.js';
import { Props } from '../../src/world/Props.js';
import { PropContact } from '../../src/world/props/Wiring.js';
import { Terrain } from '../../src/world/Terrain.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import { SubMesh } from '../../src/sub/SubMesh.js';
import { hullClearance } from './helpers/hullClearance.js';
import { requiredHull } from '../../src/game/Progress.js';
import { latLonToWorld } from '../../src/util/geo.js';
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
    'axial-seamount-ashes': 110,
    'hudson-canyon': 112,
    kamaehuakanaloa: 110,
    'beebe-vent-field': 155,
    'great-blue-hole': 150,
    bismarck: 110,
    'hunga-tonga-caldera': 120,
    'blake-plateau-corals': 160,
  });
});

for (const site of sites.landmarks) {
  const modes = ['arcade', 'realistic'] as const;
  for (const { tier, mode } of (['low', 'medium', 'high'] as const).flatMap((tier) =>
    modes.map((mode) => ({ tier, mode })),
  )) {
    const pilotCases =
      tier === 'low' && mode === 'arcade' && ['titanic', 'great-blue-hole'].includes(site)
        ? [false, true]
        : [false];
    it.each(
      pilotCases.map((pilotRoute) => ({
        pilotRoute,
        capability: pilotRoute
          ? 'pilots from the opening through two primary scans without teleporting'
          : 'first primary has a clear, hull-safe approach and visible navigation',
      })),
    )(`${site} ${tier} ${mode}: $capability`, async ({ pilotRoute }) => {
      const config = makeConfig();
      const saved = defaultSettings(config);
      const effective = resolveEffective({ ...saved, gameplayMode: mode }, mode, null, config);
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
      const mission = parseMission(json(`data/landmarks/${site}/mission.json`), site)!;
      const missionHull = requiredHull(mission.briefing.depth_m ?? Math.abs(meta.min_m)).id;
      const mesh = new SubMesh({ length: 26, hullClass: missionHull, tier });
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
        const ratedDepth = config.submarine.hullClasses[missionHull].ratedDepth;
        const settings = spawnSettings(config);
        const pose = composedMissionSpawn(
          site,
          primaries,
          meta,
          terrain,
          props,
          settings,
          ratedDepth,
          effective.camera,
        );
        expect(pose).not.toBeNull();
        for (const value of [pose!.x, pose!.y, pose!.z, pose!.yaw])
          expect(Number.isFinite(value), 'finite mission pose').toBe(true);
        const p = new Vector3(pose!.x, pose!.y, pose!.z);
        const nw = latLonToWorld(meta, meta.bbox.north, meta.bbox.west);
        const se = latLonToWorld(meta, meta.bbox.south, meta.bbox.east);
        expect(p.x).toBeGreaterThanOrEqual(nw.x);
        expect(p.x).toBeLessThanOrEqual(se.x);
        expect(p.z).toBeGreaterThanOrEqual(nw.z);
        expect(p.z).toBeLessThanOrEqual(se.z);
        const target = primaries[0];
        const range = p.distanceTo(target.position);
        expect(range).toBeCloseTo(MISSION_APPROACH_M[site], 2);
        expect(range).toBeGreaterThanOrEqual(110 - 0.01);
        expect(range).toBeLessThanOrEqual(300);
        // Per-site mission camera data must reach the pose the mission applies.
        const arm = siteManifest(site)?.opening?.mission;
        expect(pose!.chaseRadius).toBe(arm?.chaseRadius);
        expect(pose!.chaseOffsetX).toBe(arm?.chaseOffsetX);
        expect(pose!.chaseOffsetY).toBe(arm?.chaseOffsetY);
        // An authored opening depth is honoured exactly; without one the pose stays shallow-capped.
        if (arm?.openingDepthM !== undefined) expect(pose!.y).toBeCloseTo(-arm.openingDepthM, 6);
        expect(p.y).toBeGreaterThanOrEqual(ratedDepth + settings.hullRadius);
        expect(p.y).toBeLessThanOrEqual(-settings.hullRadius);
        expect(props.collide(p.clone(), settings.hullRadius + 4, new Vector3())).toBe(false);
        const direction = target.position.clone().sub(p).setY(0).normalize();
        const forward = new Vector3(Math.sin(pose!.yaw), 0, -Math.cos(pose!.yaw));
        const yawOffset = ((siteManifest(site)?.opening?.mission?.yawOffset ?? 0) * Math.PI) / 180;
        expect(forward.dot(direction)).toBeCloseTo(Math.cos(yawOffset), 3);
        // The side of the authored offset matters; a dot product accepts either sign.
        expect(direction.clone().cross(forward).y).toBeCloseTo(-Math.sin(yawOffset), 3);
        mesh.setPose(p, pose!.yaw, 0, 0);
        expect(hullClearance(mesh.group, terrain)).toBeGreaterThan(0);
        for (const sensors of Object.values(config.sensorPresets)) {
          const scanRadius =
            missionApproachScanRadius(site, target.radius) * sensors.scanRadiusMultiplier;
          expect(range).toBeGreaterThan(scanRadius);
          expect(range - scanRadius).toBeGreaterThanOrEqual(60 - 0.01);
          expect(range).toBeLessThan(sensors.sonarPoiRange);
        }
        // Every required contact must need an approach after the shipped mode's
        // equipment scaling and scan floor, not only the first objective.
        for (const primary of primaries) {
          const radius = resolveScanRadius(
            missionApproachScanRadius(site, primary.radius) * effective.sensor.scanRadiusMultiplier,
            effective.scan,
          );
          expect(p.distanceTo(primary.position), primary.id).toBeGreaterThan(radius);
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
          const rig = new CameraRig(effective.camera, aspect, terrain);
          rig.setPhoneLandscape(aspect === 844 / 390);
          rig.setChaseRadiusDefault(
            pose!.chaseRadius,
            pose!.chaseOffsetX,
            pose!.chaseOffsetY,
            pose!.portraitChaseOffset,
          );
          rig.snap(p, pose!.yaw, 0);
          rig.camera.updateMatrixWorld(true);
          expect(rig.camera.position.toArray().every(Number.isFinite)).toBe(true);
          expect(rig.camera.position.y).toBeLessThanOrEqual(-config.camera.surfaceClearance);
          for (let step = 1; step <= 64; step++) {
            const point = p.clone().lerp(rig.camera.position, step / 64);
            expect(
              point.y - terrain.sampleHeight(point.x, point.z),
              'authored camera arm above terrain',
            ).toBeGreaterThanOrEqual(config.camera.terrainClearance - 1e-6);
            expect(props.collide(point, 6, new Vector3()), 'authored camera arm prop keepout').toBe(
              false,
            );
          }
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
        if (pilotRoute) {
          // Retain a bounded two-leg capability through shipped terrain, physics and scan
          // gates. Only the opening is placed; neither leg teleports or awards scans.
          const bus = new EventBus();
          const run = new Mission({ def: mission, bus });
          const scanner = new Scanner(effective.scan, bus);
          for (const poi of pois) {
            poi.radius = resolveScanRadius(
              (primaries.includes(poi) ? missionApproachScanRadius(site, poi.radius) : poi.radius) *
                effective.sensor.scanRadiusMultiplier,
              effective.scan,
            );
          }
          scanner.setTargets(pois);
          run.resolve(pois.map((poi) => poi.id));
          run.start(site);
          const sub = new Submarine(effective.submarine, terrain);
          const contact = new PropContact(props, bus, config.props, settings.hullRadius);
          sub.setHullClass(missionHull);
          sub.setSimSpeed(1);
          if (site === 'great-blue-hole') {
            const target = primaries[1];
            scanner.setObjective(target.id);
            const aimAt = (p: { x: number; y: number; z: number }) => {
              const aim = scanAim(p, target.position, effective.submarine.maxPitch);
              sub.reset(p.x, p.y, p.z, aim.yaw);
              sub.pitch = aim.pitch;
              scanner.update(0, sub.position, sub.getForward(), false);
            };
            // Match the journey's observation pose inside the bowl. The actual
            // scanner and physics must accept it without widening any scan gate.
            const inside = { x: target.position.x, y: 0, z: target.position.z - 40 };
            inside.y = Math.max(
              target.position.y + 16,
              terrain.sampleHeight(inside.x, inside.z) +
                settings.hullRadius +
                settings.seabedClearance +
                16,
            );
            aimAt(inside);
            expect(scanner.view.candidateId).toBe(target.id);
            for (let frame = 0; frame < 2; frame++) {
              sub.step(FROZEN_INPUT, 1 / 60);
              contact.resolve(sub, 1 / 60);
              scanner.update(0, sub.position, sub.getForward(), false);
              expect(scanner.view.candidateId).toBe(target.id);
            }
          }
          sub.reset(pose!.x, pose!.y, pose!.z, pose!.yaw);
          const clamp = (n: number) => Math.max(-1, Math.min(1, n));
          try {
            for (const target of primaries.slice(0, 2)) {
              expect(nextScanObjective(run.objectives)?.poiId).toBe(target.id);
              scanner.setObjective(target.id);
              const start = sub.position.clone();
              let ticks = 0;
              for (; ticks < 300 * 60 && !scanner.isScanned(site, target.id); ticks++) {
                scanner.update(
                  0,
                  sub.position,
                  sub.getForward(),
                  scanner.view.phase === 'scanning',
                );
                const cue = scanner.view;
                const ready = cue.candidateId === target.id;
                // Turn/range and relative depth are the waypoint's public cues.
                // Keep clearance above a seabed contact and brake before the beam.
                const input = {
                  ...FROZEN_INPUT,
                  yaw: clamp(cue.objectiveTurnDeg / 20),
                  ballast: clamp((target.position.y + 16 - sub.position.y) / 8 - sub.velocity.y),
                  throttle:
                    !ready &&
                    Math.abs(cue.objectiveTurnDeg) < 15 &&
                    cue.objectiveDistance > cue.objectiveRadius * 0.8
                      ? 0.5
                      : 0,
                  scan: ready,
                };
                sub.step(input, 1 / 60);
                contact.resolve(sub, 1 / 60);
                scanner.update(1 / 60, sub.position, sub.getForward(), input.scan);
              }
              expect(ticks, `${site}: reach and scan ${target.id}`).toBeLessThan(300 * 60);
              expect(sub.position.distanceTo(start)).toBeGreaterThan(10);
              expect(sub.hullBreached).toBe(false);
              expect(scanner.view.lastCompleteId).toBe(target.id);
            }
            expect(scanner.view.completed).toBe(2);
            expect(
              run.objectives.filter((objective) => objective.primary && objective.complete),
            ).toHaveLength(2);
          } finally {
            run.dispose();
          }
        }
      } finally {
        mesh.dispose();
        props.dispose();
        terrain.dispose();
      }
    });
  }
}
