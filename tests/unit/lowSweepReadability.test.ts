// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { AmbientLight, Raycaster, Scene, Vector3 } from 'three';
import { expect, test } from 'vitest';
import { atmosphereSystem } from '../../src/app/systems/atmosphere.js';
import type { GameContext } from '../../src/app/context.js';
import type { FrameState } from '../../src/app/System.js';
import { makeConfig } from '../../src/core/Config.js';
import { LOW_READABILITY_SITES, lowSiteWater } from '../../src/core/config/atmosphere.js';
import { deepSiteWater } from '../../src/core/config/deepOpenings.js';
import { EventBus } from '../../src/core/EventBus.js';
import { sampleAtmosphere } from '../../src/render/Atmosphere.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import type { TileMeta } from '../../src/util/types.js';
import { Props } from '../../src/world/Props.js';
import { Terrain } from '../../src/world/Terrain.js';
import bismarckPose from '../../tools/bismarck-poses.json';

const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));

test('Low seabed lighting is isolated to the six observed dark sites and leaves surface water intact', () => {
  const water = makeConfig().water;
  const before = JSON.stringify(water);
  for (const site of LOW_READABILITY_SITES) {
    const low = lowSiteWater(site, 'low', water);
    for (const depth of [0, -5, -20])
      expect(sampleAtmosphere(low, depth)).toEqual(sampleAtmosphere(water, depth));
    for (const depth of [-200, -700, -1500, -4200]) {
      const sample = sampleAtmosphere(low, depth);
      const base = sampleAtmosphere(water, depth);
      const c = sample.ambientColor;
      const illumination = sample.ambientIntensity * (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b);
      expect(illumination).toBeGreaterThan(0.8);
      expect(sample.fogColor).toEqual(base.fogColor);
      expect(sample.fogDensity).toBe(base.fogDensity);
      expect(sample.sunIntensity).toBe(base.sunIntensity);
    }
    for (const tier of ['medium', 'high', 'ultra'] as const)
      expect(lowSiteWater(site, tier, water)).toBe(water);
  }
  for (const site of [
    'titanic',
    'monterey-canyon',
    'great-blue-hole',
    'lost-city',
    'beebe-vent-field',
    'unknown',
  ])
    expect(lowSiteWater(site, 'low', water)).toBe(water);
  for (const site of ['challenger-deep', 'endurance']) {
    const deep = deepSiteWater(site, water);
    expect(lowSiteWater(site, 'low', deep)).toBe(deep);
  }
  expect(JSON.stringify(water)).toBe(before);
});

for (const site of LOW_READABILITY_SITES) {
  test(`${site}: atmosphere system applies Low fill each frame with lamps off and no new scene lights`, () => {
    const config = makeConfig();
    const scene = new Scene();
    const rig = new CameraRig(config.camera, 390 / 844);
    rig.camera.position.y = -700;
    const ctx = {
      config,
      tier: 'low',
      scene,
      bus: new EventBus(),
      meta: { id: site },
      settings: { gameplay: { lights: 'enhanced' } },
      terrain: { widthM: 1000, depthM: 1000 },
      rig,
      sub: { position: new Vector3(0, -720, 0) },
      expose: () => {},
    } as unknown as GameContext;
    atmosphereSystem.init!(ctx);
    try {
      ctx.headlights.setEnabled(false);
      const lights: string[] = [];
      scene.traverse((o) => {
        if ('isLight' in o) lights.push(o.type);
      });
      expect(lights.filter((type) => type === 'AmbientLight')).toHaveLength(1);
      expect(lights).not.toContain('HemisphereLight');
      for (let i = 0; i < 3; i++) {
        const frame = { dt: 1 / 60 } as FrameState;
        atmosphereSystem.frame!['env.atmosphere']!(frame, ctx);
        expect(ctx.atmosphere.ambient).toBeInstanceOf(AmbientLight);
        expect(ctx.atmosphere.ambient.intensity).toBe(3);
        expect(frame.atmo.ambientIntensity).toBe(3);
        expect(ctx.headlights.on).toBe(false);
      }
    } finally {
      ctx.atmosphere.dispose();
      ctx.headlights.dispose();
      ctx.snow.dispose();
      ctx.water.dispose();
    }
  });
}

test('Bismarck golden approach/detail aim at visible hull above the slope from clear cockpit seats', async () => {
  const config = makeConfig();
  const meta = json('data/tiles/bismarck/meta.json') as TileMeta;
  const bytes = readFileSync('data/tiles/bismarck/heightmap.bin');
  const terrain = new Terrain(
    { meta, heights: new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows) },
    config.terrain,
    'low',
  );
  const props = new Props(meta, terrain, config.props, 'low');
  try {
    await props.placeAll(json('data/landmarks/bismarck/props.json'), 'bismarck');
    const hero = props.placed.find((p) => p.def.id === 'main-hull')!;
    hero.root.updateMatrixWorld(true);
    terrain.group.updateMatrixWorld(true);
    const target = hero.root.localToWorld(new Vector3().fromArray(bismarckPose.target));
    expect(target.y - terrain.sampleHeight(target.x, target.z)).toBeGreaterThan(4);
    const direction = new Vector3().fromArray(bismarckPose.direction);
    for (const range of [40, bismarckPose.close.range]) {
      const position = target.clone().addScaledVector(direction, range);
      position.y = hero.root.position.y + bismarckPose.above;
      expect(position.y - terrain.sampleHeight(position.x, position.z)).toBeGreaterThan(15);
      expect(props.collide(position.clone(), config.submarine.hullRadius, new Vector3())).toBe(
        false,
      );
      const yaw = Math.atan2(target.x - position.x, -(target.z - position.z));
      const pitch = Math.atan2(target.y - position.y, range);
      const rig = new CameraRig(config.camera, 390 / 844, terrain);
      rig.setMode('first-person');
      rig.snap(position, yaw, pitch);
      const eye = rig.camera.position;
      rig.lookElevation =
        (Math.atan2(target.y - eye.y, Math.hypot(target.x - eye.x, target.z - eye.z)) - pitch) /
        0.55;
      rig.snap(position, yaw, pitch);
      expect(props.collide(rig.camera.position.clone(), 1, new Vector3())).toBe(false);
      rig.camera.updateMatrixWorld(true);
      const projected = target.clone().project(rig.camera);
      expect(Math.abs(projected.x)).toBeLessThan(0.1);
      expect(Math.abs(projected.y)).toBeLessThan(0.1);
      const ray = new Raycaster(
        rig.camera.position,
        target.clone().sub(rig.camera.position).normalize(),
      );
      const hull = ray.intersectObject(hero.root, true)[0];
      const floor = ray.intersectObject(terrain.group, true)[0];
      expect(hull).toBeDefined();
      expect(hull.distance).toBeLessThan(floor?.distance ?? Infinity);
    }
  } finally {
    terrain.dispose();
  }
});
