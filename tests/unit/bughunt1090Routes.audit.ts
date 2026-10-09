// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync, writeFileSync } from 'node:fs';
import { afterAll, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { makeConfig } from '../../src/core/Config.js';
import { EventBus } from '../../src/core/EventBus.js';
import { composedFreeDiveSpawn, composedMissionSpawn } from '../../src/game/DeepOpeningSpawn.js';
import { chooseFreeDiveHull, spawnSettings } from '../../src/game/Spawn.js';
import { parseMission } from '../../src/game/Mission.js';
import { parsePois, placePois } from '../../src/game/Pois.js';
import { Scanner } from '../../src/game/Scanner.js';
import { Props } from '../../src/world/Props.js';
import { Terrain } from '../../src/world/Terrain.js';
import type { TileMeta } from '../../src/util/types.js';

const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const measurements: unknown[] = [];
afterAll(() => {
  writeFileSync('.cache/1090-routes.json', JSON.stringify(measurements, null, 2) + '\n');
});

// Geometric reachability, independent of the debug POI teleport. Every route
// starts at the production opening and checks ascent, transit and descent at
// <=2 m intervals. This does not claim browser/input or travel-time acceptance.
for (const site of json('data/landmarks/index.json').landmarks as string[]) {
  it(`${site}: every authored scan has a clear route from the free and mission openings on Low`, async () => {
    const config = makeConfig();
    const meta = json(`data/tiles/${site}/meta.json`) as TileMeta;
    const bytes = readFileSync(`data/tiles/${site}/heightmap.bin`);
    const terrain = new Terrain(
      { meta, heights: new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows) },
      config.terrain,
      'low',
    );
    const props = new Props(meta, terrain, config.props, 'low');
    try {
      const content = json(`data/landmarks/${site}/props.json`);
      content.props = content.props.filter((p: { model: string }) =>
        p.model.startsWith('procedural:'),
      );
      await props.placeAll(content, site);
      const settings = spawnSettings(config);
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
      const freeHull = chooseFreeDiveHull(
        config.submarine.hullClasses,
        meta.min_m,
        config.submarine.freeDiveHullMarginM,
      )!;
      const radius = settings.hullRadius + 4;
      const clear = (p: Vector3): boolean =>
        p.y <= -settings.hullRadius &&
        p.y >= terrain.sampleHeight(p.x, p.z) + settings.hullRadius + settings.seabedClearance &&
        !props.collide(p.clone(), radius, new Vector3());
      const segment = (a: Vector3, b: Vector3): boolean => {
        const count = Math.ceil(a.distanceTo(b) / 2);
        for (let i = 0; i <= count; i++)
          if (!clear(a.clone().lerp(b, i / Math.max(count, 1)))) return false;
        return true;
      };
      for (const mode of ['free', 'mission'] as const) {
        const safeDepth =
          mode === 'free'
            ? freeHull.hull.ratedDepth
            : config.submarine.hullClasses[mission.hull_class!].ratedDepth;
        const pose =
          mode === 'free'
            ? composedFreeDiveSpawn(site, meta, terrain, props, settings, safeDepth, config.camera)!
            : composedMissionSpawn(
                site,
                primaries,
                meta,
                terrain,
                props,
                settings,
                safeDepth,
                config.camera,
              )!;
        expect(pose).not.toBeNull();
        const start = new Vector3(pose.x, pose.y, pose.z);
        for (const poi of pois) {
          const scanRadius = poi.radius * config.sensorPresets.extended.scanRadiusMultiplier;
          let route: Vector3[] | null = null;
          let scanPitch = 0;
          for (const fraction of [0.65, 0.4, 0.8]) {
            for (let bearing = 0; bearing < 360; bearing += 22.5) {
              const angle = (bearing * Math.PI) / 180;
              const station = poi.position
                .clone()
                .add(
                  new Vector3(Math.sin(angle), 0, -Math.cos(angle)).multiplyScalar(
                    scanRadius * fraction,
                  ),
                );
              station.y = Math.max(
                poi.position.y + 20,
                terrain.sampleHeight(station.x, station.z) + 26,
                safeDepth + settings.hullRadius,
              );
              const delta = poi.position.clone().sub(station);
              const pitch = Math.atan2(delta.y, Math.hypot(delta.x, delta.z));
              if (
                !clear(station) ||
                delta.length() > scanRadius ||
                Math.abs(pitch) > config.submarine.maxPitch
              )
                continue;
              let floor = Math.max(start.y, station.y);
              const count = Math.ceil(start.distanceTo(station) / 2);
              for (let i = 0; i <= count; i++) {
                const p = start.clone().lerp(station, i / Math.max(count, 1));
                floor = Math.max(floor, terrain.sampleHeight(p.x, p.z) + 26);
              }
              for (const rise of [20, 60, 120]) {
                const cruise = Math.min(-settings.hullRadius, floor + rise);
                const a = start.clone().setY(cruise);
                const b = station.clone().setY(cruise);
                if (segment(start, a) && segment(a, b) && segment(b, station)) {
                  route = [start, a, b, station];
                  scanPitch = pitch;
                  break;
                }
              }
              if (route) break;
            }
            if (route) break;
          }
          measurements.push({
            site,
            mode,
            poi: poi.id,
            primary: primaries.some((p) => p.id === poi.id),
            route: route?.map((p) => p.toArray()) ?? null,
            scanPitch,
          });
          expect.soft(route, `${mode} route to ${poi.id}`).not.toBeNull();
          if (!route) continue;
          const station = route[3];
          const scanner = new Scanner(config.scan, new EventBus());
          scanner.setTargets([{ ...poi, radius: scanRadius }]);
          const forward = poi.position.clone().sub(station).normalize();
          for (let i = 0; i < Math.ceil((poi.scanSeconds + 1) * 60); i++)
            scanner.update(1 / 60, station, forward, true);
          expect(scanner.view.lastCompleteId).toBe(poi.id);
        }
      }
    } finally {
      terrain.dispose();
    }
  }, 30_000);
}
