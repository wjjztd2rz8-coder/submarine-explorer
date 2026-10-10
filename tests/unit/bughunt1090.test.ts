// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync, writeFileSync } from 'node:fs';
import { afterAll, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { makeConfig } from '../../src/core/Config.js';
import type { InputState } from '../../src/core/Input.js';
import { EventBus } from '../../src/core/EventBus.js';
import { composedFreeDiveSpawn, composedMissionSpawn } from '../../src/game/DeepOpeningSpawn.js';
import { chooseFreeDiveHull, spawnSettings } from '../../src/game/Spawn.js';
import { parseMission } from '../../src/game/Mission.js';
import { parsePois, placePois } from '../../src/game/Pois.js';
import { Scanner } from '../../src/game/Scanner.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import { Submarine } from '../../src/sub/Submarine.js';
import { SubMesh } from '../../src/sub/SubMesh.js';
import { Props } from '../../src/world/Props.js';
import { Terrain } from '../../src/world/Terrain.js';
import type { TileMeta } from '../../src/util/types.js';
import { hullClearance } from './helpers/hullClearance.js';

const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const sites = json('data/landmarks/index.json').landmarks as string[];
const measurements: unknown[] = [];
afterAll(() => {
  if (measurements.length)
    writeFileSync('.cache/1090-geometry.json', JSON.stringify(measurements, null, 2) + '\n');
});

const idle: InputState = {
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
};

for (const site of sites) {
  for (const tier of ['low', 'medium'] as const) {
    it(`${site} ${tier}: free/mission hulls and desktop/portrait/landscape cameras clear the opening and 60 s idle`, async () => {
      const config = makeConfig();
      const meta = json(`data/tiles/${site}/meta.json`) as TileMeta;
      const bytes = readFileSync(`data/tiles/${site}/heightmap.bin`);
      const terrain = new Terrain(
        { meta, heights: new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows) },
        config.terrain,
        tier,
      );
      const props = new Props(meta, terrain, config.props, tier);
      try {
        const content = json(`data/landmarks/${site}/props.json`);
        // Node cannot fetch GLBs; report these exclusions explicitly in the audit.
        const omitted = content.props
          .filter((p: { model: string }) => !p.model.startsWith('procedural:'))
          .map((p: { id: string }) => p.id);
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
        const mission = parseMission(json(`data/landmarks/${site}/mission.json`), site)!;
        expect(mission).not.toBeNull();
        const primaries = pois.filter((p) =>
          mission.objectives.some((o) => o.primary && o.poi === p.id),
        );
        const freeHull = chooseFreeDiveHull(
          config.submarine.hullClasses,
          meta.min_m,
          config.submarine.freeDiveHullMarginM,
        )!;
        for (const mode of ['free', 'mission'] as const) {
          const hull = mode === 'free' ? freeHull.classId : mission.hull_class!;
          const safeDepth = config.submarine.hullClasses[hull].ratedDepth;
          const settings = spawnSettings(config);
          const pose =
            mode === 'free'
              ? composedFreeDiveSpawn(
                  site,
                  meta,
                  terrain,
                  props,
                  settings,
                  safeDepth,
                  config.camera,
                )
              : composedMissionSpawn(
                  site,
                  primaries,
                  meta,
                  terrain,
                  props,
                  settings,
                  safeDepth,
                  config.camera,
                );
          expect(pose, `${site} ${mode} authored opening`).not.toBeNull();
          if (!pose) continue;
          const sub = new Submarine(config.submarine, terrain);
          sub.setHullClass(hull);
          const preset = config.settings.gameplayPresets.arcade;
          sub.applyProfiles(
            config.speedProfiles[preset.speedProfile],
            config.descentProfiles[preset.descentProfile],
          );
          sub.reset(pose.x, pose.y, pose.z, pose.yaw);
          // Reset accepts the authored angle; the first physics tick wraps it
          // into (-PI, PI]. Normalize with a zero-duration tick before measuring.
          sub.step(idle, 0);
          const openingYaw = sub.yaw;
          const mesh = new SubMesh({ length: 26, hullClass: hull, tier });
          const rigs = [1280 / 800, 390 / 844, 844 / 390].map((aspect) => {
            const rig = new CameraRig(config.camera, aspect, terrain);
            rig.setChaseRadiusDefault(
              pose.chaseRadius,
              pose.chaseOffsetX,
              pose.chaseOffsetY,
              pose.portraitChaseOffset,
            );
            return rig;
          });
          let minHull = Infinity;
          let minEye = Infinity;
          let minArm = Infinity;
          let propHits = 0;
          let armPropHits = 0;
          let minSweep = Infinity;
          try {
            mesh.setPose(sub.position, sub.yaw, sub.pitch, sub.roll);
            const openingClearance = hullClearance(mesh.group, terrain);
            for (let tick = 0; tick <= 3600; tick++) {
              if (tick) sub.step(idle, 1 / 60);
              expect(sub.hullBreached).toBe(false);
              // Idle translates this unanimated hull only vertically. Prove
              // that premise, then translate the exact opening vertex minimum
              // instead of resampling identical XZ vertices 61 times.
              expect(sub.position.x).toBe(pose.x);
              expect(sub.position.z).toBe(pose.z);
              expect(sub.yaw).toBe(openingYaw);
              expect(sub.pitch).toBe(0);
              expect(sub.roll).toBe(0);
              minHull = Math.min(minHull, openingClearance + sub.position.y - pose.y);
              if (tick % 60) continue;
              if (props.collide(sub.position.clone(), config.submarine.hullRadius, new Vector3()))
                propHits++;
              for (const rig of rigs) {
                rig.snap(sub.position, sub.yaw, sub.pitch);
                const eye = rig.camera.position;
                minEye = Math.min(minEye, eye.y - terrain.sampleHeight(eye.x, eye.z));
                expect(eye.y).toBeLessThanOrEqual(-config.camera.surfaceClearance);
                for (let i = 1; i <= 48; i++) {
                  const p = sub.position.clone().lerp(eye, i / 48);
                  minArm = Math.min(minArm, p.y - terrain.sampleHeight(p.x, p.z));
                  if (props.collide(p, 1, new Vector3())) armPropHits++;
                }
              }
            }
            const scanner = new Scanner(config.scan, new EventBus());
            scanner.setTargets(
              pois.map((p) => ({
                ...p,
                radius: p.radius * config.sensorPresets[preset.sensors].scanRadiusMultiplier,
              })),
            );
            scanner.update(1 / 60, sub.position, sub.getForward(), false);
            if (['monterey-canyon', 'beebe-vent-field', 'titanic'].includes(site))
              for (const rig of rigs) {
                // Exercise a full boat turn and a downward free-look drag at
                // the real opening; endpoint-only checks miss intervening banks.
                for (let degree = 0; degree <= 360; degree += 2) {
                  rig.snap(sub.position, sub.yaw + (degree * Math.PI) / 180, 0);
                  for (let i = 0; i <= 48; i++) {
                    const p = sub.position.clone().lerp(rig.camera.position, i / 48);
                    minSweep = Math.min(minSweep, p.y - terrain.sampleHeight(p.x, p.z));
                  }
                }
                rig.snap(sub.position, sub.yaw, 0);
                rig.orbit(0.2, -0.8);
                rig.snap(sub.position, sub.yaw, 0);
                for (let i = 0; i <= 48; i++) {
                  const p = sub.position.clone().lerp(rig.camera.position, i / 48);
                  minSweep = Math.min(minSweep, p.y - terrain.sampleHeight(p.x, p.z));
                }
                rig.resetView();
              }
            measurements.push({
              site,
              tier,
              mode,
              hull,
              omitted,
              pose,
              minHull,
              minEye,
              minArm,
              propHits,
              armPropHits,
              minSweep: Number.isFinite(minSweep) ? minSweep : null,
              firstPrimaryDistance: sub.position.distanceTo(
                pois.find((p) => p.id === mission.objectives.find((o) => o.primary)!.poi)!.position,
              ),
              candidate: scanner.view.candidateId,
            });
            expect(minHull, 'visible hull above terrain').toBeGreaterThan(0);
            expect(minEye, 'eye above terrain').toBeGreaterThanOrEqual(
              config.camera.terrainClearance - 1e-5,
            );
            expect(minArm, 'whole chase arm above terrain').toBeGreaterThanOrEqual(
              config.camera.terrainClearance - 1e-5,
            );
            expect(propHits, 'idle submarine prop contacts').toBe(0);
            expect(armPropHits, 'opening camera arm prop contacts').toBe(0);
            expect(minSweep, 'turning/free-look chase arm above terrain').toBeGreaterThanOrEqual(
              config.camera.terrainClearance - 1e-5,
            );
          } finally {
            mesh.dispose();
          }
        }
      } finally {
        terrain.dispose();
      }
    }, 30_000);
  }
}

it('retracts a deep chase arm before a submerged ridge even when the desired eye is clear', () => {
  const config = makeConfig();
  const terrain = {
    sampleHeight: (_x: number, z: number) => -200 + 115 * Math.max(0, 1 - Math.abs(z - 45) / 15),
    getNormal: (_x: number, _z: number, out = new Vector3()) => out.set(0, 1, 0),
  };
  for (const aspect of [1280 / 800, 390 / 844, 844 / 390]) {
    const rig = new CameraRig(config.camera, aspect, terrain);
    const position = new Vector3(0, -120, 0);
    rig.snap(position, 0, 0);
    expect(rig.camera.position.z).toBeLessThan(45);
    for (let i = 0; i <= 100; i++) {
      const p = position.clone().lerp(rig.camera.position, i / 100);
      expect(p.y - terrain.sampleHeight(p.x, p.z)).toBeGreaterThanOrEqual(
        config.camera.terrainClearance - 1e-5,
      );
    }
  }
});
