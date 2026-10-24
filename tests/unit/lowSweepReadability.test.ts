import { resolveEffective } from '../../src/game/EffectiveSettings.js';
import { defaultSettings } from '../../src/core/Save.js';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { AmbientLight, HemisphereLight, Light, Raycaster, Scene, Vector3 } from 'three';
import { expect, test, vi } from 'vitest';
import { atmosphereSystem } from '../../src/app/systems/atmosphere.js';
import type { GameContext } from '../../src/app/context.js';
import type { FrameState } from '../../src/app/System.js';
import * as siteManifests from '../../src/core/SiteManifest.js';
import { makeConfig } from '../../src/core/Config.js';
import { siteLightWater } from '../../src/core/config/atmosphere.js';
import { deepSiteWater } from '../../src/core/config/deepOpenings.js';
import { EventBus } from '../../src/core/EventBus.js';
import { sampleAtmosphere } from '../../src/render/Atmosphere.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import type { TileMeta } from '../../src/util/types.js';
import { Props } from '../../src/world/Props.js';
import { Terrain } from '../../src/world/Terrain.js';
import bismarckPose from '../../tools/bismarck-poses.json';

// Numeric light checks need a texture handle, not a DOM canvas pattern.
vi.mock('../../src/render/caustics.js', async () => {
  const { Texture } = await import('three');
  return { makeCausticFrames: () => [new Texture()] };
});

const lowReadabilitySites = [
  'axial-seamount-ashes',
  'beebe-vent-field',
  'bismarck',
  'blake-plateau-corals',
  'hudson-canyon',
  'hunga-tonga-caldera',
  'kamaehuakanaloa',
  'lost-city',
];
const allTierFloorSites = [
  'axial-seamount-ashes',
  'bismarck',
  'blake-plateau-corals',
  'hudson-canyon',
  'hunga-tonga-caldera',
  'kamaehuakanaloa',
];

const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));

test('Low seabed lighting is isolated to the observed dark sites and leaves surface water intact', () => {
  const water = makeConfig().water;
  const before = JSON.stringify(water);
  for (const site of lowReadabilitySites) {
    const low = siteLightWater(site, 'low', water);
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
    if (!allTierFloorSites.includes(site))
      for (const tier of ['medium', 'high'] as const)
        expect(siteLightWater(site, tier, water)).toBe(water);
  }
  for (const site of ['titanic', 'monterey-canyon', 'great-blue-hole', 'unknown'])
    expect(siteLightWater(site, 'low', water)).toBe(water);
  for (const site of ['challenger-deep', 'endurance']) {
    const deep = deepSiteWater(site, water);
    expect(siteLightWater(site, 'low', deep)).toBe(deep);
  }
  expect(JSON.stringify(water)).toBe(before);
});

for (const site of lowReadabilitySites) {
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
      effective: resolveEffective(defaultSettings(config), 'arcade', null, config),
      terrain: { widthM: 1000, depthM: 1000 },
      rig,
      sub: { position: new Vector3(0, -720, 0) },
      expose: () => {},
    } as unknown as GameContext;
    const fill = siteManifests.siteManifest(site)!.atmosphere!.tiers!.low!.intensity;
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
        expect(ctx.atmosphere.ambient.intensity).toBe(fill);
        expect(frame.atmo.ambientIntensity).toBe(fill);
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

for (const tier of ['low', 'medium', 'high'] as const) {
  test(`${tier}: live ambient colour follows depth and lamp toggles without leaking between sites`, () => {
    const config = makeConfig();
    const effective = resolveEffective(defaultSettings(config), 'arcade', null, config);
    const sites = [
      'kamaehuakanaloa',
      'axial-seamount-ashes',
      'hudson-canyon',
      'great-blue-hole',
      'endurance',
      'monterey-canyon',
    ];
    const inputs = () =>
      JSON.stringify({
        config,
        effective,
        manifests: sites.map((site) => siteManifests.siteManifest(site)),
        bytes: sites.map((site) => readFileSync(`data/landmarks/${site}/site.json`, 'utf8')),
      });
    const before = inputs();
    const results = new Map<string, string>();
    for (const order of [sites, [...sites].reverse()]) {
      for (const site of order) {
        const rig = new CameraRig(config.camera, 390 / 844);
        const ctx = {
          config,
          effective,
          tier,
          rig,
          scene: new Scene(),
          bus: new EventBus(),
          meta: { id: site },
          terrain: { widthM: 1000, depthM: 1000 },
          sub: { position: new Vector3(0, -720, 0) },
          subMesh: { vehicle: { materials: { uniforms: { uHullLight: { value: 1 } } } } },
          renderer: { domElement: { height: 844 } },
          presets: { current: new Vector3() },
          expose: () => {},
        } as unknown as GameContext;
        const water = siteLightWater(site, tier, deepSiteWater(site, config.water));
        atmosphereSystem.init!(ctx);
        try {
          const lights: Light[] = [];
          ctx.scene.traverse((object) => {
            if (object instanceof Light) lights.push(object);
          });
          const hemisphere = site === 'endurance' || site === 'monterey-canyon' ? 1 : 0;
          expect(lights).toHaveLength((tier === 'low' ? 5 : 6) + hemisphere);
          const frames: string[] = [];
          for (const on of [true, false, true]) {
            ctx.headlights.setEnabled(on);
            for (const depth of [-20, -110, -200, -700, -1500]) {
              rig.camera.position.y = depth;
              const frame = {
                dt: 1 / 60,
                elapsed: frames.length / 60,
                forward: new Vector3(0, 0, -1),
              } as FrameState;
              atmosphereSystem.frame!['env.atmosphere']!(frame, ctx);
              atmosphereSystem.frame!['env.lighting']!(frame, ctx);
              const expected = sampleAtmosphere(water, depth);
              expect(frame.atmo).toEqual(expected);
              expect(ctx.atmosphere.ambient.color).toEqual(expected.ambientColor);
              expect(ctx.atmosphere.ambient.intensity).toBe(expected.ambientIntensity);
              expect(ctx.atmosphere.sunlight.intensity).toBe(expected.sunIntensity);
              expect(frame.fog).toEqual({ color: expected.fogColor, density: expected.fogDensity });
              expect(ctx.headlights.on).toBe(on);
              for (const lamp of ctx.headlights.lights) expect(lamp.visible).toBe(on);
              expect(ctx.scene.getObjectsByProperty('isLight', true)).toEqual(lights);
              // Atmosphere reuses its sample; retain each frame's values before the next update.
              frames.push(
                JSON.stringify({
                  sample: frame.atmo,
                  lights: lights.map((light) => [
                    light.type,
                    light.color.toArray(),
                    light.intensity,
                    light.visible,
                  ]),
                }),
              );
            }
          }
          const result = JSON.stringify(frames);
          if (results.has(site)) expect(result).toBe(results.get(site));
          else results.set(site, result);
          expect(inputs()).toBe(before);
        } finally {
          ctx.atmosphere.dispose();
          ctx.headlights.dispose();
          ctx.snow.dispose();
          ctx.water.dispose();
        }
      }
    }
  });
}

for (const site of ['beebe-vent-field', 'axial-seamount-ashes', 'unknown']) {
  for (const tier of ['low', 'medium', 'high'] as const) {
    test(`${site} ${tier}: composes lamps once from effective modes and preserves inputs`, () => {
      const config = makeConfig();
      const settings = defaultSettings(config);
      const before = JSON.stringify({
        config,
        settings,
        manifest: siteManifests.siteManifest(site),
      });
      const ctx = {
        config,
        tier,
        scene: new Scene(),
        bus: new EventBus(),
        meta: { id: site },
        effective: resolveEffective(settings, 'arcade', null, config),
        terrain: { widthM: 1000, depthM: 1000 },
        expose: () => {},
      } as unknown as GameContext;
      atmosphereSystem.init!(ctx);
      try {
        const children = ctx.headlights.group.children.length;
        for (const base of ['arcade', 'realistic'] as const) {
          const custom = { ...settings, gameplayBaseMode: base };
          for (const mode of ['arcade', 'realistic', 'custom'] as const) {
            for (const daily of [null, { modifier: 'low-light' }] as const) {
              const effective = resolveEffective(custom, mode, daily, config);
              const effectiveBefore = JSON.stringify(effective);
              const preset = effective.light;
              const spotGain = site === 'beebe-vent-field' ? 0.45 : 1;
              const fillGain = site === 'beebe-vent-field' ? 0.35 : 1;
              for (let repeat = 0; repeat < 3; repeat++) {
                const oldGeometry = ctx.headlights.beams[0]?.geometry;
                const disposed = oldGeometry ? vi.spyOn(oldGeometry, 'dispose') : undefined;
                ctx.headlights.setPreset(preset);
                expect(ctx.headlights.group.children).toHaveLength(children);
                if (oldGeometry) {
                  expect(disposed).toHaveBeenCalledTimes(1);
                  expect(ctx.headlights.beams[0]!.geometry).not.toBe(oldGeometry);
                  expect(ctx.headlights.beams[1]!.geometry).toBe(ctx.headlights.beams[0]!.geometry);
                  disposed!.mockRestore();
                }
                ctx.headlights.setEnabled(false);
                expect(ctx.headlights.fill.visible).toBe(false);
                ctx.headlights.setEnabled(true);
                ctx.headlights.update(new Vector3(0, -4200, 0), new Vector3(0, 0, -1));
                for (const light of ctx.headlights.lights) {
                  expect(light.intensity).toBe(preset.intensity * spotGain);
                  expect(light.distance).toBe(preset.distance);
                  expect(light.angle).toBe((preset.angleDeg * Math.PI) / 180);
                  expect(
                    [light.intensity, light.distance, light.angle].every(Number.isFinite),
                  ).toBe(true);
                  expect(light.visible).toBe(true);
                }
                expect(ctx.headlights.fill.intensity).toBe(preset.fillIntensity * fillGain);
                expect(ctx.headlights.fill.distance).toBe(preset.fillDistance);
                expect(ctx.headlights.fill.visible).toBe(preset.fillIntensity > 0);
                expect(Number.isFinite(ctx.headlights.fill.intensity)).toBe(true);
              }
              expect(JSON.stringify(effective)).toBe(effectiveBefore);
            }
          }
        }
        expect(
          JSON.stringify({ config, settings, manifest: siteManifests.siteManifest(site) }),
        ).toBe(before);
      } finally {
        ctx.atmosphere.dispose();
        ctx.headlights.dispose();
        ctx.snow.dispose();
        ctx.water.dispose();
      }
    });
  }
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

test('Per-site seabed light also lifts only the deep bands of the four all-tier sites on Medium and High', () => {
  const water = makeConfig().water;
  expect(siteLightWater('titanic', 'high', water)).toBe(water);
  for (const site of allTierFloorSites)
    for (const tier of ['medium', 'high'] as const) {
      const lit = siteLightWater(site, tier, water);
      for (const depth of [0, -5, -20])
        expect(sampleAtmosphere(lit, depth)).toEqual(sampleAtmosphere(water, depth));
      expect(sampleAtmosphere(lit, -700).ambientIntensity).toBeGreaterThan(
        sampleAtmosphere(water, -700).ambientIntensity,
      );
    }
});

// Capture numeric policy and system results independently of pixel rendering.
const atmosphereSites = [...json('data/landmarks/index.json').landmarks, 'unknown'] as string[];
for (const site of atmosphereSites) {
  for (const tier of ['low', 'medium', 'high'] as const) {
    test(`${site} ${tier}: preserves atmosphere bands, boundaries and light selection`, () => {
      const config = makeConfig();
      const before = JSON.stringify(config);
      const manifestBefore = JSON.stringify(siteManifests.siteManifest(site));
      const compose = (water: typeof config.water) =>
        siteLightWater(site, tier, deepSiteWater(site, water));
      const water = compose(config.water);
      const boundaryWater = {
        ...config.water,
        bands: [-199.999, -200, -200.001, -1000].map((depth, i) => ({
          ...config.water.bands[i]!,
          depth,
          ambientIntensity: i % 2 ? 2 : 9,
        })),
      };
      const boundaryBefore = JSON.stringify(boundaryWater);
      const boundary = compose(boundaryWater);
      const ctx = {
        config,
        tier,
        scene: new Scene(),
        bus: new EventBus(),
        meta: { id: site },
        effective: resolveEffective(defaultSettings(config), 'arcade', null, config),
        terrain: { widthM: 1000, depthM: 1000 },
        expose: () => {},
      } as unknown as GameContext;
      atmosphereSystem.init!(ctx);
      try {
        const samples = [
          0, -20, -199.999, -200, -200.001, -700, -999.999, -1000, -1000.001, -4200,
        ].map((depth) => {
          const sample = sampleAtmosphere(water, depth);
          expect(ctx.atmosphere.update(depth, new Vector3(), 0)).toEqual(sample);
          return [
            depth,
            sample.band,
            sample.ambientColor.toArray(),
            sample.ambientIntensity,
            sample.fogColor.toArray(),
            sample.fogDensity,
            sample.snowDensity,
            sample.vignette,
          ];
        });
        const lights: unknown[] = [];
        ctx.scene.traverse((object) => {
          if (!(object instanceof Light)) return;
          lights.push({
            name: object.name,
            type: object.type,
            color: object.color.toArray(),
            intensity: object.intensity,
            ground: object instanceof HemisphereLight ? object.groundColor.toArray() : undefined,
            distance: 'distance' in object ? object.distance : undefined,
            angle: 'angle' in object ? object.angle : undefined,
          });
        });
        expect(
          JSON.stringify({
            bands: water.bands,
            boundary: boundary.bands,
            samples,
            lights,
            tier: ctx.atmoTier,
          }),
        ).toMatchSnapshot();
        expect(JSON.stringify(config)).toBe(before);
        expect(JSON.stringify(siteManifests.siteManifest(site))).toBe(manifestBefore);
        expect(JSON.stringify(boundaryWater)).toBe(boundaryBefore);
      } finally {
        ctx.atmosphere.dispose();
        ctx.headlights.dispose();
        ctx.snow.dispose();
        ctx.water.dispose();
      }
    });
  }
}

for (const atmosphere of [
  undefined,
  {},
  { tiers: {} },
  { tiers: { high: { depthM: -200, color: 0, intensity: 1 } } },
]) {
  test('absent atmosphere or tier policy returns the original water', () => {
    const read = vi
      .spyOn(siteManifests, 'siteManifest')
      .mockReturnValue({ id: 'unknown', atmosphere });
    try {
      const water = makeConfig().water;
      expect(siteLightWater('unknown', 'low', water)).toBe(water);
    } finally {
      read.mockRestore();
    }
  });
}

test('deep lamps take precedence over manifest lamps and keep their independent hemisphere', () => {
  const policy = siteManifests.siteManifest('monterey-canyon')!.atmosphere!;
  const read = vi
    .spyOn(siteManifests, 'siteManifest')
    .mockReturnValue({ id: 'endurance', atmosphere: policy });
  const config = makeConfig();
  const ctx = {
    config,
    tier: 'low',
    scene: new Scene(),
    bus: new EventBus(),
    meta: { id: 'endurance' },
    effective: resolveEffective(defaultSettings(config), 'arcade', null, config),
    terrain: { widthM: 1000, depthM: 1000 },
    expose: () => {},
  } as unknown as GameContext;
  try {
    atmosphereSystem.init!(ctx);
    expect(ctx.headlights.lights[0]!.intensity).toBe(ctx.effective.light.intensity * 0.7);
    expect(ctx.headlights.lights[0]!.distance).toBe(ctx.effective.light.distance);
    expect(ctx.scene.getObjectByName('enduranceFill')).toBeInstanceOf(HemisphereLight);
    expect(ctx.scene.getObjectByName('montereyFill')).toBeInstanceOf(HemisphereLight);
  } finally {
    read.mockRestore();
    ctx.atmosphere?.dispose();
    ctx.headlights?.dispose();
    ctx.snow?.dispose();
    ctx.water?.dispose();
  }
});
