// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AmbientLight, Color, FogExp2, Scene, Vector3 } from 'three';
import { makeConfig } from '../../src/core/Config.js';
import { EventBus } from '../../src/core/EventBus.js';
import { parseMission } from '../../src/game/Mission.js';
import { parsePois, placePois } from '../../src/game/Pois.js';
import {
  chooseFreeDiveHull,
  composedFreeDiveSpawn,
  composedMissionSpawn,
  spawnSettings,
} from '../../src/game/Spawn.js';
import { sampleAtmosphere } from '../../src/render/Atmosphere.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import { latLonToWorld } from '../../src/util/geo.js';
import type { TileMeta } from '../../src/util/types.js';
import { Currents } from '../../src/world/Currents.js';
import { Props } from '../../src/world/Props.js';
import { Terrain } from '../../src/world/Terrain.js';
import { PresetSystem } from '../../src/world/presets/Presets.js';

// Intensity alone misses the near-black abyss tint. Bound both intensity and
// linear RGB luminance after fog; these are code-level floors, not pixel QA.
const heroes = [
  { site: 'titanic', hero: 'bow-hull', minAmbient: 24, minFill: 24, maxAltitude: 60, maxRange: 80 },
  {
    site: 'lost-city',
    hero: 'poseidon-tower',
    minAmbient: 12,
    minFill: 12,
    maxAltitude: 60,
    maxRange: 80,
  },
  {
    site: 'great-blue-hole',
    hero: 'karst-grotto',
    minAmbient: 0.5,
    minFill: 0,
    maxAltitude: 100,
    maxRange: 250,
  },
  {
    site: 'beebe-vent-field',
    hero: 'beebe-chimney-1',
    minAmbient: 6,
    minFill: 6,
    maxAltitude: 60,
    maxRange: 80,
  },
  {
    site: 'monterey-canyon',
    hero: 'canyon-wall-ledge',
    minAmbient: 16,
    minFill: 16,
    maxAltitude: 60,
    maxRange: 80,
  },
];

function luminance(color: Color): number {
  return 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
}

describe('F-GOLDEN-CHECK hero spawn and ambient readability', () => {
  for (const limits of heroes) {
    for (const tier of ['low', 'medium', 'high'] as const) {
      it(`${limits.site} ${tier}: Arcade openings have nearby terrain and ambient light without lamps`, async () => {
        const { site } = limits;
        const config = makeConfig();
        const meta = JSON.parse(readFileSync(`data/tiles/${site}/meta.json`, 'utf8')) as TileMeta;
        const bytes = readFileSync(`data/tiles/${site}/heightmap.bin`);
        const heights = new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows);
        const terrain = new Terrain({ meta, heights }, config.terrain, tier);
        const props = new Props(meta, terrain, config.props, tier);
        const content = JSON.parse(readFileSync(`data/landmarks/${site}/props.json`, 'utf8'));
        content.props = content.props.filter((p: { model: string }) =>
          p.model.startsWith('procedural:'),
        );
        const missionDoc = JSON.parse(readFileSync(`data/landmarks/${site}/mission.json`, 'utf8'));
        const mission = parseMission(missionDoc, site)!;
        const pois = placePois(
          parsePois(JSON.parse(readFileSync(`data/landmarks/${site}/pois.json`, 'utf8'))),
          meta,
          terrain,
          config.scan,
          site,
        );
        const primaries = pois.filter((p) =>
          mission.objectives.some((o) => o.primary && o.poi === p.id),
        );
        // Arcade fits the depth this tile needs, independent of research.
        const hull = chooseFreeDiveHull(
          config.submarine.hullClasses,
          meta.min_m,
          config.submarine.freeDiveHullMarginM,
        )!;
        const settings = spawnSettings(config);
        let presets: PresetSystem | undefined;
        try {
          await props.load('props.json', site, async () => content);
          expect(props.stats.failed).toBe(0);
          const hero = props.placed.find((p) => p.def.id === limits.hero)!;
          expect(hero).toBeDefined();
          const freePose = composedFreeDiveSpawn(
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
          expect(freePose).not.toBeNull();
          expect(missionPose).not.toBeNull();
          const missionPosition = new Vector3(missionPose!.x, missionPose!.y, missionPose!.z);
          expect(
            Math.min(...primaries.map((p) => p.position.distanceTo(missionPosition))),
          ).toBeLessThanOrEqual(300);
          const scene = new Scene();
          scene.fog = new FogExp2(0x000000);
          scene.background = new Color();
          const ambient = new AmbientLight();
          const position = new Vector3();
          const currents = new Currents(site, site, async () => null);
          await currents.ready;
          presets = new PresetSystem({
            scene,
            bus: new EventBus(),
            config,
            tier,
            params: new URLSearchParams(),
            tileId: site,
            landmarkId: site,
            missionId: site,
            terrain,
            props,
            discovery: { loaded: true, pois },
            sub: {
              position,
              velocity: new Vector3(),
              floorFor: (ground) => ground + settings.hullRadius + settings.seabedClearance,
            },
            currents,
            currentMode: 'off',
            atmosphere: { ambient, caustics: null },
            headlights: { on: false },
            toWorld: (lat, lon) => latLonToWorld(meta, lat, lon),
            fetchJson: async (url) => (url.endsWith('/mission.json') ? missionDoc : []),
          });
          await presets.ready;
          expect(presets.params.ambientFill ?? 0).toBeGreaterThanOrEqual(limits.minFill);
          for (const [opening, pose] of [
            ['free', freePose!],
            ['mission', missionPose!],
          ] as const) {
            position.set(pose.x, pose.y, pose.z);
            const altitude = pose.y - terrain.sampleHeight(pose.x, pose.z);
            const range = hero.localBounds
              .clone()
              .applyMatrix4(hero.root.matrixWorld)
              .distanceToPoint(position);
            // The preferred clearance is capped at the first scan's minimum depth over shallow floors.
            expect(altitude).toBeGreaterThanOrEqual(
              Math.min(
                settings.hullRadius + settings.seabedClearance + settings.spawnClearanceM,
                -Math.max(settings.hullRadius, primaries[0].minDepthM ?? 0) - (pose.y - altitude),
              ) - 1e-6,
            );
            if (opening === 'free')
              expect(altitude, opening).toBeLessThanOrEqual(limits.maxAltitude);
            else expect(altitude, opening).toBeLessThanOrEqual(300);
            // Only free dives pin the hero's beauty-frame distance; missions pin the transit instead.
            if (opening === 'free') {
              const centreRange = Math.hypot(
                position.x - hero.root.position.x,
                position.z - hero.root.position.z,
              );
              expect(centreRange).toBeGreaterThanOrEqual(12);
              expect(centreRange).toBeLessThanOrEqual(limits.maxRange);
              expect(range).toBeLessThanOrEqual(limits.maxRange);
            }
            expect(props.collide(position.clone(), settings.hullRadius, new Vector3())).toBe(false);
            expect(pose.y).toBeGreaterThanOrEqual(hull.hull.ratedDepth + settings.hullRadius);
            const rig = new CameraRig(config.camera, 16 / 9, terrain);
            // propsSystem applies the authored chase radius; missionSystem currently uses the default arm.
            if (opening === 'free' && pose.chaseRadius) rig.chaseRadius = pose.chaseRadius;
            rig.snap(position, pose.yaw, 0);
            if (site === 'lost-city' && opening === 'mission') {
              // Match the browser regression: preserve the global arm and keep
              // the whole tower axis in frame when choosing the terrace bearing.
              const localEye = rig.camera.position
                .clone()
                .sub(position)
                .applyAxisAngle(new Vector3(0, 1, 0), pose.yaw);
              expect(localEye.x).toBeCloseTo(config.camera.chaseOffset.x, 1);
              expect(localEye.y).toBeCloseTo(config.camera.chaseOffset.y, 1);
              expect(localEye.z).toBeCloseTo(config.camera.chaseOffset.z, 1);
              rig.camera.updateMatrixWorld(true);
              for (let height = 0; height <= 60; height += 5) {
                const point = hero.root.localToWorld(new Vector3(0, height, 0)).project(rig.camera);
                expect(Math.abs(point.x)).toBeLessThan(0.9);
                expect(Math.abs(point.y)).toBeLessThan(0.9);
                expect(point.z).toBeGreaterThan(-1);
                expect(point.z).toBeLessThan(1);
              }
            }
            // The scene samples the chase camera's depth, not the sub's depth.
            expect(sampleAtmosphere(config.water, pose.y).ambientIntensity).toBeGreaterThan(0);
            let firstAmbient: number | undefined;
            for (let frame = 0; frame < 2; frame++) {
              // Resample each frame, as Atmosphere.update does: fill must not accumulate.
              const atmo = sampleAtmosphere(config.water, rig.camera.position.y);
              ambient.intensity = atmo.ambientIntensity;
              ambient.color.copy(atmo.ambientColor);
              scene.fog.density = atmo.fogDensity;
              presets.update(1 / 60, 0, atmo, rig.camera, 720, frame / 60);
              expect(presets.entered).toBe(true);
              if (firstAmbient === undefined) firstAmbient = ambient.intensity;
              else expect(ambient.intensity).toBeCloseTo(firstAmbient, 8);
              expect(ambient.intensity).toBeCloseTo(atmo.ambientIntensity, 8);
              expect(ambient.color.equals(atmo.ambientColor)).toBe(true);
              expect(ambient.intensity).toBeGreaterThanOrEqual(limits.minAmbient);
              const transmission40 = Math.exp(-Math.pow(scene.fog.density * 40, 2));
              expect(transmission40).toBeGreaterThanOrEqual(0.95);
              const effective40 = ambient.intensity * luminance(ambient.color) * transmission40;
              expect(effective40).toBeGreaterThanOrEqual(0.1);
              // AmbientLight is global and has no distance/depth cutoff. Check
              // the actual seabed under and around the hull, with camera fog.
              for (let bearing = -1; bearing < 8; bearing++) {
                const angle = (bearing * Math.PI) / 4;
                const radius = bearing < 0 ? 0 : 40;
                const x = pose.x + radius * Math.cos(angle);
                const z = pose.z + radius * Math.sin(angle);
                const point = new Vector3(x, terrain.sampleHeight(x, z), z);
                const distance = rig.camera.position.distanceTo(point);
                const transmission = Math.exp(-Math.pow(scene.fog.density * distance, 2));
                const effective = ambient.intensity * luminance(ambient.color) * transmission;
                const floor = expect(effective, `${opening}: nearby floor at bearing ${bearing}`);
                if (site === 'lost-city') floor.toBeGreaterThan(2.5);
                else floor.toBeGreaterThanOrEqual(0.1);
              }
            }
          }
        } finally {
          presets?.dispose();
          terrain.dispose();
        }
      });
    }
  }
});
