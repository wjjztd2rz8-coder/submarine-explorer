// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { makeConfig } from '../../src/core/Config.js';
import { parseMission } from '../../src/game/Mission.js';
import { parsePois, placePois } from '../../src/game/Pois.js';
import {
  composedFreeDiveSpawn,
  composedMissionSpawn,
  spawnSettings,
} from '../../src/game/Spawn.js';
import { Props } from '../../src/world/Props.js';
import { Terrain } from '../../src/world/Terrain.js';
import type { TileMeta } from '../../src/util/types.js';

const heroes = [
  { site: 'titanic', primary: ['find-bow', 'find-stern'], before: ['find-bow', 'find-stern'] },
  {
    site: 'lost-city',
    primary: ['find-poseidon', 'imax-tower'],
    before: ['find-poseidon', 'imax-tower'],
  },
  {
    site: 'great-blue-hole',
    primary: ['stalactites', 'outer-dropoff'],
    before: ['outer-dropoff', 'western-dropoff'],
  },
  { site: 'beebe-vent-field', primary: ['main-vents', 'shrimp'], before: ['main-vents', 'shrimp'] },
  {
    site: 'monterey-canyon',
    primary: ['canyon-wall', 'upper-channel'],
    before: ['canyon-head', 'upper-channel'],
  },
];
const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));

for (const { site, primary, before } of heroes) {
  for (const tier of ['low', 'medium', 'high'] as const) {
    it(`${site} ${tier}: default mission shares free dive's opening and first primary is within 120 m`, async () => {
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
        content.props = content.props.filter((p: { model: string }) =>
          p.model.startsWith('procedural:'),
        );
        await props.placeAll(content, site);
        expect(props.stats.failed).toBe(0);
        const mission = parseMission(json(`data/landmarks/${site}/mission.json`), site)!;
        const objectives = mission.objectives.filter((o) => o.primary);
        expect(objectives.map((o) => o.id)).toEqual(primary);
        const pois = placePois(
          parsePois(json(`data/landmarks/${site}/pois.json`)),
          meta,
          terrain,
          config.scan,
          site,
        );
        const primaries = pois.filter((p) => objectives.some((o) => o.poi === p.id));
        const safeDepth = config.submarine.hullClasses[mission.hull_class!].ratedDepth;
        const poseFor = (targets: typeof primaries) =>
          composedMissionSpawn(
            site,
            targets,
            meta,
            terrain,
            props,
            spawnSettings(config),
            safeDepth,
            config.camera,
          )!;
        const free = composedFreeDiveSpawn(
          site,
          meta,
          terrain,
          props,
          spawnSettings(config),
          safeDepth,
          config.camera,
        )!;
        expect(free).not.toBeNull();
        const pose = poseFor(primaries);
        // Includes the camera framing overrides as well as translation/yaw.
        expect(pose).toEqual(free);
        const first = pois.find((p) => p.id === objectives[0].poi)!;
        const range = Math.hypot(
          first.position.x - pose.x,
          first.position.y - pose.y,
          first.position.z - pose.z,
        );
        expect(range).toBeLessThanOrEqual(120);

        // Keep the old primary selection measurable for the progress note.
        const oldObjectives = before.map((id) => mission.objectives.find((o) => o.id === id)!);
        const oldPrimaries = pois.filter((p) => oldObjectives.some((o) => o.poi === p.id));
        const oldPose = poseFor(oldPrimaries);
        const oldFirst = pois.find((p) => p.id === oldObjectives[0].poi)!;
        const oldRange = Math.hypot(
          oldFirst.position.x - oldPose.x,
          oldFirst.position.y - oldPose.y,
          oldFirst.position.z - oldPose.z,
        );
        const oldDelta = Math.hypot(oldPose.x - free.x, oldPose.y - free.y, oldPose.z - free.z);
        console.log(
          `MISSION-HERO ${site} ${tier}: beforeFirst=${oldRange.toFixed(2)} beforeFreeDelta=${oldDelta.toFixed(2)} afterFirst=${range.toFixed(2)} afterFreeDelta=0.00`,
        );
      } finally {
        terrain.dispose();
      }
    });
  }
}
