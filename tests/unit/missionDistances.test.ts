// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync, readdirSync } from 'node:fs';
import { expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { parseMission } from '../../src/game/Mission.js';
import { parsePois, placePois } from '../../src/game/Pois.js';
import { composedMissionSpawn } from '../../src/game/DeepOpeningSpawn.js';
import { spawnSettings } from '../../src/game/Spawn.js';
import { Props } from '../../src/world/Props.js';
import { requiredHull } from '../../src/game/Progress.js';
import { missionStartPose } from '../../src/game/MissionRouter.js';
import { Terrain } from '../../src/world/Terrain.js';
import { decodeHeightmap } from '../../src/world/TileLoader.js';

const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
// Enumerate disk rather than the catalogue so an unindexed mission cannot escape the check.
const sites: string[] = readdirSync('data/landmarks').filter((site: string) => {
  try {
    readFileSync(`data/landmarks/${site}/mission.json`);
    return true;
  } catch {
    return false;
  }
});
it.each(sites)('%s: objectives stay near the default spawn and each other', async (site) => {
  const mission = parseMission(json(`data/landmarks/${site}/mission.json`), site)!;
  const meta = json(`data/tiles/${mission.tile}/meta.json`);
  const bytes = readFileSync(`data/tiles/${mission.tile}/heightmap.bin`);
  const heights = decodeHeightmap(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    meta,
  );
  const terrain = new Terrain({ meta, heights }, DEFAULT_CONFIG.terrain, 'high');
  const props = new Props(meta, terrain, DEFAULT_CONFIG.props, 'high');
  try {
    const content = json(`data/landmarks/${site}/props.json`);
    content.props = content.props.filter((p: { model: string }) =>
      p.model.startsWith('procedural:'),
    );
    await props.placeAll(content, site);
    const pois = placePois(
      parsePois(json(`data/landmarks/${site}/pois.json`)),
      meta,
      terrain,
      DEFAULT_CONFIG.scan,
      site,
    );
    const hull = requiredHull(mission.briefing.depth_m ?? Math.abs(meta.min_m));
    const primaries = mission.objectives
      .filter((o) => o.primary)
      .map((o) => pois.find((p) => p.id === o.poi)!);
    const spawn =
      composedMissionSpawn(
        site,
        primaries,
        meta,
        terrain,
        props,
        spawnSettings(DEFAULT_CONFIG),
        DEFAULT_CONFIG.submarine.hullClasses[hull.id].ratedDepth,
      ) ?? missionStartPose(mission, 'near-site', pois, meta, terrain, DEFAULT_CONFIG);
    expect(mission.objectives.filter((o) => o.primary).length).toBeGreaterThanOrEqual(2);
    const objectives = mission.objectives.map((o) => ({
      id: o.id,
      position: pois.find((p) => p.id === o.poi)!.position,
    }));
    const report = objectives.map((o) => ({
      objective: o.id,
      spawnM: Math.round(o.position.distanceTo({ x: spawn.x, y: spawn.y, z: spawn.z })),
      neighborM: Math.round(
        Math.min(
          ...objectives
            .filter((other) => other !== o)
            .map((other) => o.position.distanceTo(other.position)),
        ),
      ),
    }));
    console.table(report);
    for (const row of report) {
      expect(row.spawnM, `${site}/${row.objective}: spawn`).toBeLessThanOrEqual(1200);
      expect(row.neighborM, `${site}/${row.objective}: nearest objective`).toBeLessThanOrEqual(900);
    }
  } finally {
    props.dispose();
    terrain.dispose();
  }
});
