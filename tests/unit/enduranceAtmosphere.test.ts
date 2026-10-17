import * as THREE from 'three';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, deepSiteWater, GRAPHICS_TIERS } from '../../src/core/Config.js';
import { siteManifest } from '../../src/core/SiteManifest.js';
import { EventBus } from '../../src/core/EventBus.js';
import { sampleAtmosphere } from '../../src/render/Atmosphere.js';
import { MarineSnow, snowParticleAppearance } from '../../src/render/MarineSnow.js';
import { WreckPreset, wreckParticleAppearance } from '../../src/world/presets/WreckPreset.js';
import { buildEnduranceRelief } from '../../src/world/presets/EnduranceRelief.js';
import type { PresetEnterContext, PresetFrameContext } from '../../src/world/presets/types.js';
import { biomeFor } from '../../src/world/TerrainBiome.js';
import { createTerrainMaterial } from '../../src/world/TerrainMaterial.js';

const config = DEFAULT_CONFIG;
const terrain = {
  sampleHeight: () => -3000,
  getNormal: (_x: number, _z: number, out = new THREE.Vector3()) => out.set(0, 1, 0),
  widthM: 1000,
  depthM: 1000,
};
const look = { ambient: 0.1, headlightGain: 1.6, headlightFalloffM: 90 };
function setup(
  tier: (typeof GRAPHICS_TIERS)[number],
  endurance = true,
  overrides: Partial<PresetEnterContext> = {},
) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.5, 60000);
  camera.position.set(0, -2970, 0);
  const water = deepSiteWater(endurance ? 'endurance' : 'titanic', config.water);
  const atmo = sampleAtmosphere(water, camera.position.y);
  scene.fog = new THREE.FogExp2(atmo.fogColor, atmo.fogDensity);
  const preset = new WreckPreset(look, water);
  const ctx: PresetEnterContext = {
    site: siteManifest(endurance ? 'endurance' : 'titanic'),
    scene,
    terrain,
    props: [
      {
        id: 'main-hull',
        model: 'procedural:hull-block',
        top: new THREE.Vector3(0, -2990, 0),
        centre: new THREE.Vector3(0, -2995, 0),
        radius: 25,
        height: 10,
      },
    ],
    pois: endurance
      ? [{ id: 'endurance-hull', kind: 'wreck', position: new THREE.Vector3(0, -2990, 0) }]
      : [],
    params: { ...config.presets.wreck },
    visuals: tier !== 'low',
    particleScale: config.presets.tierParticleScale[tier],
    maxParticles: config.presets.maxParticles,
    spawn: camera.position,
    toWorld: () => ({ x: 0, z: 0 }),
    bus: new EventBus(),
    ...overrides,
  };
  preset.enter(ctx);
  preset.update(1 / 60, {
    camera,
    atmo,
    terrain,
    subPosition: camera.position,
    elapsed: 1,
    viewportH: 900,
    headlightsOn: true,
    subVelocity: new THREE.Vector3(),
    baseCurrent: new THREE.Vector3(),
    canyonReferenceSpeedMps: 1,
    current: new THREE.Vector3(),
    causticsScale: 1,
    bus: new EventBus(),
  } satisfies PresetFrameContext);
  return { scene, camera, atmo, preset, ctx };
}

function appearance({ scene, atmo, preset }: ReturnType<typeof setup>) {
  const hash = (value: unknown) =>
    createHash('sha256')
      .update(JSON.stringify(value ?? null))
      .digest('hex');
  return {
    atmo,
    fog: scene.fog,
    stats: { ...preset.stats },
    objects: scene.children.map((object) => {
      const mesh = object as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
      const material = mesh.material;
      return {
        name: mesh.name,
        position: mesh.position.toArray(),
        scale: mesh.scale.toArray(),
        visible: mesh.visible,
        attributes: Object.fromEntries(
          Object.entries(mesh.geometry.attributes).map(([key, attr]) => [
            key,
            { count: attr.count, hash: hash(Array.from(attr.array)) },
          ]),
        ),
        index: hash(mesh.geometry.index?.array),
        material: {
          type: material.type,
          vertexShader: hash(material.vertexShader),
          fragmentShader: hash(material.fragmentShader),
          uniforms: material.uniforms,
          fog: material.fog,
          toneMapped: material.toneMapped,
          depthTest: material.depthTest,
          depthWrite: material.depthWrite,
          transparent: material.transparent,
          side: material.side,
        },
      };
    }),
  };
}

describe('wreck atmosphere, horizon and relief equivalence', () => {
  for (const tier of GRAPHICS_TIERS) {
    for (const endurance of [false, true]) {
      it(`${tier}, authored hull ${endurance}: preserves scene geometry, particles and fog`, () => {
        const state = setup(tier, endurance);
        expect(JSON.stringify(appearance(state))).toMatchSnapshot();
        state.preset.exit();
      });
    }
    it(`${tier}: preserves the explicit horizon fallback when the hull is absent`, () => {
      const state = setup(tier, true, {
        pois: [],
        params: { ...config.presets.wreck, titanicHorizon: true },
      });
      expect(JSON.stringify(appearance(state))).toMatchSnapshot();
      state.preset.exit();
    });
  }
});

describe('wreck site policy', () => {
  const wreck = siteManifest('endurance')!.wreck!;

  it.each(GRAPHICS_TIERS)('%s: follows a renamed hull and policy on an unknown site', (tier) => {
    const baseline = setup(tier);
    const moved = setup(tier, true, {
      site: { id: 'unknown-site', wreck: { ...wreck, hullPoi: 'another-hull' } },
      pois: [{ ...baseline.ctx.pois[0]!, id: 'another-hull' }],
    });
    expect(JSON.stringify(appearance(moved))).toBe(JSON.stringify(appearance(baseline)));
    baseline.preset.exit();
    moved.preset.exit();
  });

  it.each([undefined, { id: 'unknown-site' }, { id: 'endurance' }])(
    'retains generic defaults without wreck policy %j, even with the old hull id',
    (site) => {
      const state = setup('high', true, { site });
      const generic = setup('high', true, { site: undefined, pois: [] });
      expect(JSON.stringify(appearance(state))).toBe(JSON.stringify(appearance(generic)));
      expect(state.scene.getObjectByName('enduranceHorizon')).toBeUndefined();
      expect(state.scene.getObjectByName('enduranceRelief')).toBeUndefined();
      state.preset.exit();
      generic.preset.exit();
    },
  );

  it.each([
    { pois: [] },
    { pois: [{ id: 'unrelated', kind: 'wreck', position: new THREE.Vector3() }] },
  ])('retains generic defaults when the configured hull is absent: %j', ({ pois }) => {
    const state = setup('high', true, { pois });
    const generic = setup('high', true, { site: undefined, pois: [] });
    expect(JSON.stringify(appearance(state))).toBe(JSON.stringify(appearance(generic)));
    state.preset.exit();
    generic.preset.exit();
  });

  it.each(GRAPHICS_TIERS)(
    '%s: resolves frozen site and mission tuning without mutation',
    (tier) => {
      const params = Object.freeze({
        ...config.presets.wreck,
        hazeParticles: 7,
        hazeSizeM: 9,
        hazeOpacity: 1,
        motesPerHull: 8,
        moteSizeM: 3,
        moteOpacity: 1,
        maxSizePx: 99,
        maxBrightness: 99,
      });
      const site = Object.freeze({
        id: 'policy-fixture',
        wreck: Object.freeze({
          ...wreck,
          atmosphere: Object.freeze({ ...wreck.atmosphere }),
          horizon: Object.freeze({ ...wreck.horizon }),
        }),
      });
      const before = JSON.stringify({ site, params });
      const baseline = setup(tier);
      const overridden = setup(tier, true, { params, site });
      expect(JSON.stringify(appearance(overridden))).toBe(JSON.stringify(appearance(baseline)));
      expect(params.hazeParticles).toBe(7);
      expect(JSON.stringify({ site, params })).toBe(before);
      baseline.preset.exit();
      overridden.preset.exit();
    },
  );

  it('reads particle and horizon values from policy and anchors relief to the selected POI', () => {
    const position = new THREE.Vector3(90, -2980, -70);
    const state = setup('high', true, {
      site: {
        id: 'unknown-site',
        wreck: {
          ...wreck,
          hullPoi: 'selected',
          atmosphere: { ...wreck.atmosphere, hazeSizeM: 0.13, maxSizePx: 4 },
          horizon: { ...wreck.horizon, name: 'customHorizon', fogLift: 0, fogHaze: 0 },
        },
      },
      pois: [
        { id: 'endurance-hull', kind: 'wreck', position: new THREE.Vector3() },
        { id: 'selected', kind: 'wreck', position },
      ],
    });
    expect(state.scene.getObjectByName('enduranceHorizon')).toBeUndefined();
    expect(state.scene.getObjectByName('customHorizon')).toBeDefined();
    expect(state.atmo.fogColor).toEqual(
      sampleAtmosphere(deepSiteWater('endurance', config.water), -2970).fogColor,
    );
    const haze = state.scene.getObjectByName('wreckHaze') as THREE.Points<
      THREE.BufferGeometry,
      THREE.ShaderMaterial
    >;
    expect(haze.material.uniforms.uSize!.value).toBe(0.13);
    expect(haze.material.uniforms.uParticleMaxSizePx!.value).toBe(4);
    const relief = state.scene.getObjectByName('enduranceRelief') as THREE.Mesh;
    const expected = buildEnduranceRelief(terrain, position);
    for (const attribute of ['position', 'color', 'normal'])
      expect(relief.geometry.getAttribute(attribute).array).toEqual(
        expected.geometry.getAttribute(attribute).array,
      );
    expect(relief.geometry.index!.array).toEqual(expected.geometry.index!.array);
    expected.geometry.dispose();
    (expected.material as THREE.Material).dispose();
    state.preset.exit();
  });
});

describe('Endurance opening atmosphere', () => {
  for (const tier of GRAPHICS_TIERS) {
    it(`${tier}: keeps flecks bounded across distance, lamp strength and viewport`, () => {
      const { scene, camera, atmo, preset, ctx } = setup(tier);
      const tuning = siteManifest('endurance')!.wreck!.atmosphere;
      expect(atmo.snowDensity).toBe(0.12);
      const snow = new MarineSnow(config.water, config.water.tiers[tier]);
      expect(snow.points!.geometry.getAttribute('position').count).toBe(
        config.water.tiers[tier].snowCount,
      );
      for (const height of [844, 900, 1800]) {
        for (const distance of [1, 6, 12, 20, 50, 100]) {
          for (const lamp of [0, 1, 50]) {
            const a = wreckParticleAppearance(
              config.water,
              distance,
              256,
              tuning.hazeOpacity,
              lamp + atmo.ambientIntensity,
              tuning.maxSizePx,
              tuning.maxBrightness,
            );
            expect(a.sizePx).toBeLessThanOrEqual(2);
            expect(a.alpha).toBeLessThanOrEqual(0.075);
            expect(a.brightness).toBeLessThanOrEqual(0.75);
            const permanent = snowParticleAppearance(
              config.water,
              atmo,
              height,
              0.1,
              distance,
              distance,
              Math.min(1, lamp),
            );
            expect(permanent.sizePx).toBeLessThanOrEqual(3);
          }
        }
      }
      for (const [name, count, size, opacity] of [
        ['wreckHaze', 1500, 0.08, 0.075],
        ['wreckMotes', 100, 0.04, 0.12],
      ] as const) {
        const layer = scene.getObjectByName(name) as THREE.Points | undefined;
        if (tier === 'low') expect(layer).toBeUndefined();
        else {
          expect(layer!.geometry.getAttribute('position').count).toBe(
            Math.floor(count * ctx.particleScale),
          );
          const mat = layer!.material as THREE.ShaderMaterial;
          expect(mat.uniforms.uSize!.value).toBe(size);
          expect(mat.uniforms.uOpacity!.value).toBe(opacity);
          expect(mat.uniforms.uParticleMaxSizePx!.value).toBe(2);
          expect(mat.uniforms.uParticleMaxBrightness!.value).toBe(0.75);
          expect(mat.vertexShader).toContain('mix(uForegroundSizePx, uParticleMaxSizePx, fade)');
          expect(mat.vertexShader).toContain('min(light, uParticleMaxBrightness)');
        }
      }
      const dome = scene.getObjectByName('enduranceHorizon') as THREE.Mesh<
        THREE.SphereGeometry,
        THREE.MeshBasicMaterial
      >;
      expect(dome.visible).toBe(true);
      expect(dome.position.equals(camera.position)).toBe(true);
      const colors = dome.geometry.getAttribute('color');
      const positions = dome.geometry.getAttribute('position');
      for (let i = 0; i < positions.count; i++)
        if (positions.getY(i) <= 0.2) {
          expect(colors.getX(i)).toBeCloseTo(atmo.fogColor.r, 7);
          expect(colors.getY(i)).toBeCloseTo(atmo.fogColor.g, 7);
          expect(colors.getZ(i)).toBeCloseTo(atmo.fogColor.b, 7);
        }
      const material = createTerrainMaterial({
        config: config.terrain,
        tier,
        biome: biomeFor('endurance'),
        exaggeration: 1,
      });
      const shader = {
        ...THREE.ShaderLib.standard,
        uniforms: { ...THREE.ShaderLib.standard.uniforms },
      } as Parameters<THREE.MeshStandardMaterial['onBeforeCompile']>[0];
      material.material.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
      expect(shader.uniforms.uAbyssFadeM.value.toArray()).toEqual([110, 650]);
      expect(shader.fragmentShader).toContain('mix(gl_FragColor.rgb, fogColor, abyssFade)');
      camera.position.y = -5;
      preset.update(0, {
        camera,
        atmo,
        terrain,
        subPosition: camera.position,
        elapsed: 1,
        viewportH: 900,
        headlightsOn: true,
        subVelocity: new THREE.Vector3(),
        baseCurrent: new THREE.Vector3(),
        canyonReferenceSpeedMps: 1,
        current: new THREE.Vector3(),
        causticsScale: 1,
        bus: new EventBus(),
      } satisfies PresetFrameContext);
      expect(dome.visible).toBe(false);
      snow.dispose();
      preset.exit();
      material.material.dispose();
      for (const texture of material.textures) texture.dispose();
      expect(scene.children).toHaveLength(0);
    });
  }
  it('keeps generic wreck particle tuning and other sites water config', () => {
    const { scene, preset } = setup('high', false);
    expect(scene.getObjectByName('enduranceHorizon')).toBeUndefined();
    const haze = scene.getObjectByName('wreckHaze') as THREE.Points;
    expect(haze.geometry.getAttribute('position').count).toBe(config.presets.wreck.hazeParticles);
    expect((haze.material as THREE.ShaderMaterial).uniforms.uSize!.value).toBe(1.1);
    for (const site of ['titanic', 'lost-city', 'great-blue-hole', 'beebe-vent-field'])
      expect(deepSiteWater(site, config.water)).toBe(config.water);
    preset.exit();
  });
});
