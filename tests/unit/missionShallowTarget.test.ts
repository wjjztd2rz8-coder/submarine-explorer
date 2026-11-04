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

it('caps an unauthored shallow opening at the first target scan depth', () => {
  const meta = JSON.parse(readFileSync('data/tiles/great-blue-hole/meta.json', 'utf8')) as TileMeta;
  const settings = spawnSettings(makeConfig());
  // Avoid site-authored openingDepthM: that could hide a broken scan-depth cap.
  const site = 'shallow-target-fixture';
  for (const minDepthM of [undefined, 10, 16]) {
    const target = { position: { x: 0, y: -29.2, z: 0 }, minDepthM };
    const pose = composedMissionSpawn(
      site,
      [target],
      meta,
      { sampleHeight: () => -29.2 },
      { placed: [], collide: () => false } as never,
      settings,
      -300,
    );
    expect(pose, `minimum scan depth ${minDepthM}`).not.toBeNull();
    expect(pose!.y).toBe(-Math.max(settings.hullRadius, minDepthM ?? 0));
    expect(pose!.y + 29.2).toBeGreaterThanOrEqual(settings.hullRadius + settings.seabedClearance);
    expect(Math.hypot(pose!.x, pose!.y - target.position.y, pose!.z)).toBeCloseTo(220, 6);
  }
});

it('keeps the minimum hull gap when the scan-depth cap leaves too little water', () => {
  const meta = JSON.parse(readFileSync('data/tiles/great-blue-hole/meta.json', 'utf8')) as TileMeta;
  const settings = spawnSettings(makeConfig());
  for (const floor of [-22, -21.9]) {
    const pose = composedMissionSpawn(
      'shallow-target-fixture',
      [{ position: { x: 0, y: floor, z: 0 }, minDepthM: 10 }],
      meta,
      { sampleHeight: () => floor },
      { placed: [], collide: () => false } as never,
      settings,
      -300,
    );
    if (floor === -22) {
      expect(pose).not.toBeNull();
      expect(pose!.y).toBe(-10);
      expect(pose!.y - floor).toBe(settings.hullRadius + settings.seabedClearance);
    } else {
      expect(pose).toBeNull();
    }
  }
});
