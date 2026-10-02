// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync, readdirSync } from 'node:fs';
import { expect, it } from 'vitest';
import { Vector3 } from 'three';
import { makeConfig } from '../../src/core/Config.js';
import { parseMission } from '../../src/game/Mission.js';
import { parsePois, placePois } from '../../src/game/Pois.js';
import { composedMissionSpawn, spawnSettings } from '../../src/game/Spawn.js';
import { Terrain } from '../../src/world/Terrain.js';
import { Props } from '../../src/world/Props.js';
import type { TileMeta } from '../../src/util/types.js';

const sites: string[] = readdirSync('data/landmarks').filter(
  (site: string) => !site.startsWith('_') && !site.endsWith('.json'),
);
for (const site of sites) {
  it(`Arcade ${site}: starts within 300 m of a primary before and after props load`, async () => {
    const config = makeConfig();
    const meta = JSON.parse(readFileSync(`data/tiles/${site}/meta.json`, 'utf8')) as TileMeta;
    const bytes = readFileSync(`data/tiles/${site}/heightmap.bin`);
    const terrain = new Terrain(
      { meta, heights: new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows) },
      config.terrain,
      'low',
    );
    const props = new Props(meta, terrain, config.props, 'low');
    const mission = parseMission(
      JSON.parse(readFileSync(`data/landmarks/${site}/mission.json`, 'utf8')),
      site,
    )!;
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
    const safeDepth = config.submarine.hullClasses[mission.hull_class!].ratedDepth;
    const check = () => {
      const pose = composedMissionSpawn(
        site,
        primaries,
        meta,
        terrain,
        props,
        spawnSettings(config),
        safeDepth,
        config.camera,
      );
      expect(pose).not.toBeNull();
      const nearest = Math.min(
        ...primaries.map(({ position: p }) => Math.hypot(p.x - pose!.x, p.z - pose!.z)),
      );
      expect(nearest).toBeLessThanOrEqual(300 + 1e-8);
      const spatialRange = Math.min(
        ...primaries.map(({ position: p }) =>
          Math.hypot(p.x - pose!.x, p.y - pose!.y, p.z - pose!.z),
        ),
      );
      expect(spatialRange).toBeLessThanOrEqual(300 + 1e-8);
      expect(pose!.y).toBeGreaterThanOrEqual(safeDepth + config.submarine.hullRadius);
      expect(pose!.y).toBeGreaterThanOrEqual(
        terrain.sampleHeight(pose!.x, pose!.z) +
          config.submarine.hullRadius +
          config.submarine.seabedClearance,
      );
      expect(
        props.collide(
          new Vector3(pose!.x, pose!.y, pose!.z),
          config.submarine.hullRadius,
          new Vector3(),
        ),
      ).toBe(false);
    };
    try {
      check();
      const content = JSON.parse(readFileSync(`data/landmarks/${site}/props.json`, 'utf8'));
      content.props = content.props.filter((p: { model: string }) =>
        p.model.startsWith('procedural:'),
      );
      await props.placeAll(content, site);
      check();
    } finally {
      terrain.dispose();
    }
  });
}
