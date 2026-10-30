// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { makeConfig } from '../../src/core/Config.js';
import { composedMissionSpawn, spawnSettings } from '../../src/game/Spawn.js';
import type { TileMeta } from '../../src/util/types.js';

it('a shallow first target still opens underwater, whatever the seabed detail does to its depth', () => {
  const meta = JSON.parse(readFileSync('data/tiles/great-blue-hole/meta.json', 'utf8')) as TileMeta;
  const settings = spawnSettings(makeConfig());
  const props = { placed: [], collide: () => false } as never;
  const seabed = { sampleHeight: () => -120 };
  // Target depth within a clearance of the surface: any sub-metre change in it flipped the opening.
  for (const depth of [-29.2, -29.6, -31]) {
    const pose = composedMissionSpawn(
      'great-blue-hole',
      [{ position: { x: 0, y: depth, z: 0 } }],
      meta,
      seabed,
      props,
      settings,
      -300,
    );
    expect(pose, `target at ${depth} m`).not.toBeNull();
    expect(pose!.y).toBeLessThanOrEqual(-settings.hullRadius);
  }
});
