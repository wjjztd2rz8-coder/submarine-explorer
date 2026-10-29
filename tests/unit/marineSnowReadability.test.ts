import { lcg32 } from '../../src/util/rng.js';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync, writeFileSync } from 'node:fs';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { createHash } from 'node:crypto';
import { afterAll, describe, expect, it, vi } from 'vitest';
import {
  AmbientLight,
  BufferAttribute,
  Color,
  DataTexture,
  PointsMaterial,
  FogExp2,
  MathUtils,
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
  Vector3,
} from 'three';
import { GRAPHICS_TIERS, makeConfig } from '../../src/core/Config.js';
import type { WaterConfig } from '../../src/core/Config.js';
import { EventBus } from '../../src/core/EventBus.js';
import { parseMission } from '../../src/game/Mission.js';
import { parsePois, placePois } from '../../src/game/Pois.js';
import {
  chooseFreeDiveHull,
  composedFreeDiveSpawn,
  composedMissionSpawn,
  spawnSettings,
} from '../../src/game/Spawn.js';
import { atmosphereTier, sampleAtmosphere } from '../../src/render/Atmosphere.js';
import type { AtmosphereSample } from '../../src/render/Atmosphere.js';
import {
  MarineSnow,
  snowParticleAppearance,
  type SnowFieldConfig,
} from '../../src/render/MarineSnow.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import { latLonToWorld } from '../../src/util/geo.js';
import type { TileMeta } from '../../src/util/types.js';
import { Currents } from '../../src/world/Currents.js';
import { Props } from '../../src/world/Props.js';
import { Terrain } from '../../src/world/Terrain.js';
import { PresetSystem } from '../../src/world/presets/Presets.js';
import { wreckParticleAppearance } from '../../src/world/presets/WreckPreset.js';

const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const sites: string[] = json('data/landmarks/index.json').landmarks;
const rows: unknown[] = [];
const env = (globalThis as { process?: { env?: Record<string, string> } }).process?.env;
afterAll(() => {
  if (env?.SNOW_AUDIT === '1')
    writeFileSync('.cache/snow-audit-measurements.json', JSON.stringify(rows, null, 2) + '\n');
});

/** Reference centre bounds retain the foreground guard. The old
 * alpha has no distance fade; reconstruct it rather than inheriting the new one.
 */
function before570Appearance(
  config: WaterConfig,
  atmosphere: AtmosphereSample,
  scale: number,
  seed: number,
  viewDepthM: number,
  cameraDistanceM: number,
  lit: number,
  edge = 1,
) {
  const old = {
    ...config,
    snowSizeM: 0.14,
    snowMaxSizePx: 6,
    snowOpacity: 1,
    snowLampGain: 2.6,
  };
  const appearance = snowParticleAppearance(
    old,
    atmosphere,
    scale,
    seed,
    viewDepthM,
    cameraDistanceM,
    lit,
    edge,
  );
  const fog = Math.exp(-(atmosphere.fogDensity ** 2) * viewDepthM ** 2);
  const alpha =
    edge * (seed <= atmosphere.snowDensity ? 1 : 0) * (0.55 + 0.45 * fog) * (0.5 + 0.5 * lit);
  const foreground = MathUtils.smoothstep(
    cameraDistanceM,
    config.snowForegroundM,
    config.snowForegroundFadeEndM,
  );
  return {
    ...appearance,
    alpha: Math.min(alpha, MathUtils.lerp(config.snowForegroundAlpha, 1, foreground)),
  };
}

/** First-frame projected input proxy. Ignores depth-buffer occlusion and post effects;
 * sum(size² × centreAlpha × linearBrightness) is a relative glare-area proxy.
 * Replays the authored GPU wrap/drift, actual camera and default Arcade lamp rig.
 */
function projectedField(
  snow: MarineSnow,
  config: WaterConfig,
  atmo: AtmosphereSample,
  rig: CameraRig,
  lampPosition: Vector3,
  lampForward: Vector3,
  opening: string,
) {
  const camera = rig.camera;
  camera.updateMatrixWorld(true);
  const positions = snow.points!.geometry.getAttribute('position');
  const seeds = snow.points!.geometry.getAttribute('aSeed');
  const scale = 720 / (2 * Math.tan((camera.fov * Math.PI) / 360));
  const light = makeConfig().lightPresets.enhanced;
  const lampCos = Math.cos((light.angleDeg * Math.PI) / 180);
  const world = new Vector3(),
    view = new Vector3(),
    ndc = new Vector3(),
    toLamp = new Vector3();
  let visible = 0,
    lowerThird = 0,
    before = 0,
    after = 0,
    maxBeforePx = 0,
    maxAfterPx = 0;
  for (let i = 0; i < seeds.count; i++) {
    const seed = seeds.getX(i);
    if (seed > atmo.snowDensity) continue;
    world.set(
      positions.getX(i) + Math.sin(seed * 31.4) * 1.5,
      positions.getY(i),
      positions.getZ(i) + Math.cos(seed * 17.7) * 1.5,
    );
    for (const axis of ['x', 'y', 'z'] as const) {
      world[axis] =
        camera.position[axis] +
        MathUtils.euclideanModulo(
          world[axis] - camera.position[axis] + config.snowBoxM / 2,
          config.snowBoxM,
        ) -
        config.snowBoxM / 2;
    }
    view.copy(world).applyMatrix4(camera.matrixWorldInverse);
    const depth = -view.z;
    if (depth < camera.near || depth > camera.far) continue;
    ndc.copy(view).applyMatrix4(camera.projectionMatrix);
    if (Math.abs(ndc.x) > 1 || Math.abs(ndc.y) > 1) continue;
    const radial = world.distanceTo(camera.position);
    const edgeDistance = Math.max(
      Math.abs(world.x - camera.position.x),
      Math.abs(world.y - camera.position.y),
      Math.abs(world.z - camera.position.z),
    );
    const edge = 1 - MathUtils.smoothstep(edgeDistance / (config.snowBoxM / 2), 0.7, 1);
    toLamp.copy(world).sub(lampPosition);
    const lampDist = toLamp.length();
    const aim = toLamp.dot(lampForward) / Math.max(lampDist, 0.001);
    const lit =
      MathUtils.smoothstep(aim, lampCos - 0.06, MathUtils.lerp(lampCos, 1, 0.45)) *
      (1 - MathUtils.smoothstep(lampDist, 0, Math.min(light.distance, 600)));
    const prev = before570Appearance(config, atmo, scale, seed, depth, radial, lit, edge);
    const next = snowParticleAppearance(config, atmo, scale, seed, depth, radial, lit, edge);
    visible++;
    maxBeforePx = Math.max(maxBeforePx, prev.sizePx);
    maxAfterPx = Math.max(maxAfterPx, next.sizePx);
    if (ndc.y < -1 / 3) {
      lowerThird++;
      before += prev.sizePx ** 2 * prev.alpha * prev.brightness;
      after += next.sizePx ** 2 * next.alpha * next.brightness;
    }
  }
  return {
    opening,
    visible,
    lowerThird,
    maxBeforePx,
    maxAfterPx,
    lowerThirdGlareBefore: before,
    lowerThirdGlareAfter: after,
  };
}

describe('570 permanent marine snow distance and brightness', () => {
  it('fades lens flecks and distant points radially while preserving smaller middle-distance cues', () => {
    const config = makeConfig().water;
    const atmo = sampleAtmosphere(config, -3800);
    // Titanic's ambient fill saturates the permanent snow's brightness floor.
    atmo.ambientIntensity = 30;
    atmo.snowDensity = 1;
    const appearance = (distance: number, depth = distance, lit = 1) =>
      snowParticleAppearance(config, atmo, 900, 1, depth, distance, lit);
    expect(appearance(0).alpha).toBe(0);
    expect(appearance(1).alpha).toBeLessThan(0.005);
    expect(appearance(6).alpha).toBeLessThanOrEqual(0.12);
    const middle = appearance(20);
    expect(middle.alpha).toBeGreaterThan(0.1);
    expect(middle.alpha).toBeLessThanOrEqual(0.24);
    // Ambient plus lamp flare would reach 1.8; the cap keeps flakes from washing the frame.
    expect(middle.brightness).toBeCloseTo(config.snowMaxBrightness);
    // Fine dust attenuates with depth; the largest flakes hit the pixel cap.
    const fine = (distance: number) =>
      snowParticleAppearance(config, atmo, 900, 0.3, distance, distance, 1);
    expect(fine(40).sizePx).toBeLessThan(fine(20).sizePx);
    expect(appearance(60).alpha).toBeLessThan(middle.alpha);
    expect(appearance(80).alpha).toBe(0);
    expect(appearance(80, 40).alpha).toBe(0);
    expect(appearance(120).alpha).toBe(0);
    expect(appearance(20, 20, 0).alpha).toBeGreaterThan(0.05);
    expect(appearance(20, 20, 0).brightness).toBeLessThan(middle.brightness);
  });

  it('retains GPU drift/current motion without rewriting or replacing the Low particle pool', () => {
    const config = makeConfig().water;
    const snow = new MarineSnow(config, config.tiers.low);
    try {
      const geometry = snow.points!.geometry;
      const positions = geometry.getAttribute('position') as BufferAttribute;
      const original = Array.from(positions.array);
      const version = positions.version;
      const atmo = sampleAtmosphere(config, -3800);
      snow.update(new PerspectiveCamera(), atmo, 10, 900, { x: 0.2, z: -0.1 });
      const mat = snow.points!.material as ShaderMaterial;
      expect(mat.uniforms.uTime!.value).toBe(10);
      expect(mat.uniforms.uDrift!.value).toBeGreaterThan(0);
      expect(mat.uniforms.uFlow!.value.toArray()).toEqual([2, -1]);
      expect(snow.points!.geometry).toBe(geometry);
      expect(positions.version).toBe(version);
      expect(Array.from(positions.array)).toEqual(original);
    } finally {
      snow.dispose();
    }
  });
});

describe('460/570 marine snow readability at all shipped sites and tiers', () => {
  it('keeps the tested bounds connected to both GPU shaders and config uniforms', () => {
    const config = makeConfig();
    const snow = new MarineSnow(config.water, config.water.tiers.medium);
    try {
      const mat = snow.points!.material as ShaderMaterial;
      for (const [uniform, value] of Object.entries({
        uMaxSizePx: 3,
        uOpacity: 0.24,
        uLampGain: 0.8,
        uFadeStartM: 40,
        uFadeEndM: 80,
        uForegroundM: 6,
        uForegroundFadeEndM: 12,
        uForegroundSizePx: 2,
        uForegroundAlpha: 0.12,
        uForegroundBrightness: 0.65,
        uMaxBrightness: 1.4,
      }))
        expect(mat.uniforms[uniform]!.value).toBe(value);
      expect(mat.vertexShader).toContain('length(world - uCam)');
      expect(mat.vertexShader).toContain('mix(uForegroundSizePx, uMaxSizePx, vForegroundFade)');
      expect(mat.vertexShader).toContain('1.0, sizeCap)');
      expect(mat.vertexShader).toContain('uOpacity * distanceFade * edge * step(aSeed, uDensity)');
      expect(mat.vertexShader).toContain('smoothstep(0.0, uForegroundFadeEndM, cameraDistance)');
      expect(mat.vertexShader).toContain(
        '1.0 - smoothstep(uFadeStartM, uFadeEndM, cameraDistance)',
      );
      expect(mat.fragmentShader).toContain('min(uBrightness + vLit * uLampGain, brightnessCap)');
      expect(mat.fragmentShader).toContain('min(vAlpha * (0.5 + 0.5 * vLit), alphaCap) * soft');
    } finally {
      snow.dispose();
    }
  });

  for (const site of sites)
    for (const tier of GRAPHICS_TIERS) {
      it(`${site} ${tier}: free-dive and mission first frames bound near sprites without changing atmosphere`, async () => {
        const config = makeConfig();
        const meta = json(`data/tiles/${site}/meta.json`) as TileMeta;
        const bytes = readFileSync(`data/tiles/${site}/heightmap.bin`);
        const heights = new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows);
        const terrain = new Terrain({ meta, heights }, config.terrain, tier);
        const props = new Props(meta, terrain, config.props, tier);
        const content = json(`data/landmarks/${site}/props.json`);
        content.props = content.props.filter((p: { model: string }) =>
          p.model.startsWith('procedural:'),
        );
        const missionDoc = json(`data/landmarks/${site}/mission.json`);
        const mission = parseMission(missionDoc, site)!;
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
        const settings = spawnSettings(config);
        const hull = chooseFreeDiveHull(
          config.submarine.hullClasses,
          meta.min_m,
          config.submarine.freeDiveHullMarginM,
        )!;
        const snow = new MarineSnow(config.water, atmosphereTier(config.water, tier));
        let presets: PresetSystem | undefined;
        try {
          await props.load('props.json', site, async () => content);
          expect(props.stats.failed).toBe(0);
          const free = composedFreeDiveSpawn(
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
          expect(free).not.toBeNull();
          expect(missionPose).not.toBeNull();
          const scene = new Scene();
          scene.fog = new FogExp2(0x000000);
          scene.background = new Color();
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
            atmosphere: { ambient: new AmbientLight(), caustics: null },
            headlights: { on: true },
            toWorld: (lat, lon) => latLonToWorld(meta, lat, lon),
            fetchJson: async (url) => (url.endsWith('/mission.json') ? missionDoc : []),
          });
          await presets.ready;
          for (const [opening, pose] of [
            ['free', free!],
            ['mission', missionPose!],
          ] as const) {
            position.set(pose.x, pose.y, pose.z);
            const rig = new CameraRig(config.camera, 16 / 9, terrain);
            if (opening === 'free' && pose.chaseOffsetY !== undefined)
              rig.setChaseRadiusDefault(pose.chaseRadius, pose.chaseOffsetX, pose.chaseOffsetY);
            else if (opening === 'free' && pose.chaseRadius) rig.chaseRadius = pose.chaseRadius;
            rig.snap(position, pose.yaw, 0);
            const atmo = sampleAtmosphere(config.water, rig.camera.position.y);
            presets.update(0, 0, atmo, rig.camera, 720, 0);
            expect(presets.entered).toBe(true);
            const before = {
              fog: atmo.fogDensity,
              ambient: atmo.ambientIntensity,
              color: atmo.ambientColor.clone(),
              drift: atmo.snowDriftMps,
              density: atmo.snowDensity,
            };
            snow.update(rig.camera, atmo, 0, 720);
            const mat = snow.points!.material as ShaderMaterial;
            expect(mat.uniforms.uDensity!.value).toBe(atmo.snowDensity);
            expect(mat.uniforms.uDrift!.value).toBe(before.drift);
            expect(atmo.fogDensity).toBe(before.fog);
            expect(atmo.ambientIntensity).toBe(before.ambient);
            expect(atmo.ambientColor.equals(before.color)).toBe(true);
            // Include the maximum admitted seed: density gates large flakes too.
            for (const seed of [0, 0.1, 0.3, 0.8, 1, Math.min(1, atmo.snowDensity)]) {
              for (const height of [720, 1440, 2160])
                for (const lit of [0, 0.5, 1]) {
                  const scale = height / (2 * Math.tan((rig.camera.fov * Math.PI) / 360));
                  for (const distance of [0.1, 1, 3, 6, 9, 12, 20, 80]) {
                    // Axial and off-axis points at the same radial distance.
                    for (const depth of [distance, distance * 0.5]) {
                      const a = snowParticleAppearance(
                        config.water,
                        atmo,
                        scale,
                        seed,
                        depth,
                        distance,
                        lit,
                      );
                      expect(a.sizePx).toBeLessThanOrEqual(3);
                      expect(a.alpha).toBeGreaterThanOrEqual(0);
                      if (seed > atmo.snowDensity) expect(a.alpha).toBe(0);
                      if (distance <= 6) {
                        expect(a.sizePx).toBeLessThanOrEqual(2);
                        expect(a.alpha).toBeLessThanOrEqual(0.12);
                        expect(a.brightness).toBeLessThanOrEqual(0.65);
                      }
                      const old = before570Appearance(
                        config.water,
                        atmo,
                        scale,
                        seed,
                        depth,
                        distance,
                        lit,
                      );
                      expect(a.sizePx).toBeLessThanOrEqual(old.sizePx);
                      expect(a.alpha).toBeLessThanOrEqual(old.alpha);
                      if (distance >= 12) {
                        expect(a.alpha).toBeLessThanOrEqual(old.alpha);
                        expect(a.brightness).toBeLessThanOrEqual(old.brightness);
                      }
                    }
                  }
                }
            }
            const scale = mat.uniforms.uScale!.value as number;
            const seed = Math.min(1, atmo.snowDensity);
            const old20 = before570Appearance(config.water, atmo, scale, seed, 20, 20, 1);
            const new20 = snowParticleAppearance(config.water, atmo, scale, seed, 20, 20, 1);
            const forward = new Vector3(Math.sin(pose.yaw), 0, -Math.cos(pose.yaw));
            const field = projectedField(snow, config.water, atmo, rig, position, forward, opening);
            expect(field.maxAfterPx).toBeLessThanOrEqual(3);
            expect(field.lowerThirdGlareAfter).toBeLessThanOrEqual(field.lowerThirdGlareBefore);
            const wreckLayers = [];
            for (const name of ['wreckHaze', 'wreckMotes']) {
              const points = scene.getObjectByName(name) as typeof snow.points;
              if (!points) continue;
              const material = points.material as ShaderMaterial;
              const u = material.uniforms;
              if (site === 'titanic') {
                const haze = name === 'wreckHaze';
                expect(u.uSize!.value).toBe(haze ? 0.25 : 0.15);
                expect(u.uOpacity!.value).toBe(haze ? 0.05 : 0.16);
                const scale = config.presets.tierParticleScale[tier];
                const count = points.geometry.getAttribute('aSeed').count;
                if (haze) expect(count).toBe(Math.floor(1800 * scale));
                else expect(count).toBeLessThanOrEqual(Math.floor(180 * 6 * scale));
              }
              expect(u.uForegroundM!.value).toBe(6);
              expect(u.uForegroundSizePx!.value).toBe(2);
              expect(u.uForegroundAlpha!.value).toBe(0.12);
              expect(u.uForegroundBrightness!.value).toBe(0.65);
              expect(material.vertexShader).toContain('length(world - uCam)');
              expect(material.vertexShader).toContain('float foreground = wreckForeground(w)');
              expect(material.vertexShader).toContain(
                'mix(uForegroundSizePx, uParticleMaxSizePx, fade)',
              );
              const maxSizePx = site === 'endurance' ? 2 : 256;
              const maxBrightness = site === 'endurance' ? 0.75 : 1_000_000;
              expect(u.uParticleMaxSizePx!.value).toBe(maxSizePx);
              expect(u.uParticleMaxBrightness!.value).toBe(maxBrightness);
              expect(material.vertexShader).toContain('wreckBrightness(w, foreground)');
              expect(material.vertexShader).toContain('mix(uForegroundAlpha, 1.0, foreground)');
              const brightness = u.uAmbient!.value + u.uHeadGain!.value;
              const opacity = u.uOpacity!.value as number;
              const sizeM = u.uSize!.value * (name === 'wreckHaze' ? 1.4 : 1.5);
              for (const height of [720, 1440, 2160])
                for (const distance of [0.1, 1, 3, 6, 9, 12, 20]) {
                  const rawSize = MathUtils.clamp(
                    (sizeM * scale * height) / 720 / Math.max(1, distance),
                    1,
                    256,
                  );
                  const bounded = wreckParticleAppearance(
                    config.water,
                    distance,
                    rawSize,
                    opacity,
                    brightness,
                    maxSizePx,
                    maxBrightness,
                  );
                  if (distance <= 6) {
                    expect(bounded.sizePx).toBeLessThanOrEqual(2);
                    expect(bounded.alpha).toBeLessThanOrEqual(0.12);
                    expect(bounded.brightness).toBeLessThanOrEqual(0.65);
                  }
                  if (distance >= 12) {
                    expect(bounded.sizePx).toBe(Math.min(rawSize, maxSizePx));
                    expect(bounded.alpha).toBe(opacity);
                    expect(bounded.brightness).toBeCloseTo(Math.min(brightness, maxBrightness), 12);
                  }
                }
              wreckLayers.push({
                name,
                count: points.geometry.getAttribute('aSeed').count,
                maxSize20Px: Math.min(maxSizePx, (sizeM * scale) / 20),
                centreAlphaBound: opacity,
                brightnessBound: Math.min(brightness, maxBrightness),
              });
            }
            if (['titanic', 'endurance', 'bismarck'].includes(site)) {
              expect(Boolean(scene.getObjectByName('wreckHaze'))).toBe(tier !== 'low');
            }
            rows.push({
              site,
              tier,
              depth: -rig.camera.position.y,
              density: atmo.snowDensity,
              budget: snow.points!.geometry.getAttribute('aSeed').count,
              brightness: mat.uniforms.uBrightness!.value,
              old20,
              new20,
              ...field,
              wreckLayers,
            });
          }
        } finally {
          snow.dispose();
          presets?.dispose();

          terrain.dispose();
        }
      });
    }
});

describe('snow random sources', () => {
  it.each([
    [
      0x2f6e2b1,
      [
        3834903644, 1937468427, 3553808878, 2114351221, 788416336, 3868357231, 2018376962,
        543529081,
      ],
    ],
    [
      0x51ed27,
      [
        233080922, 1344781297, 2111734940, 1020122955, 1560134702, 972701109, 3915854736,
        1044902319,
      ],
    ],
  ] as const)('keeps the original LCG sequence for snow seed %s', (seed, expected) => {
    const random = lcg32(seed);
    expect(Array.from({ length: 8 }, () => random() * 4294967296)).toEqual(expected);
  });
});

const DIVE_PARTICLE_BASELINES = [
  [
    'low',
    '05ca2ffa8c66aebe1278a6cfaebed6b72860c037df13fcccdb31f7ef7a88c9aa',
    '567dfc70ac29aaee3c9018b9457de17b97b3b7fc9812f8773282161b2dcf40a9',
  ],
  [
    'medium',
    'd1b57d7e2343bf506a9ed47c7bcb5c33e7cfbb7cd8619ced18dfd47637e6e609',
    '013034279fa38387d5cd73af4221aa64958dc3fec3b3449d6549997eb6ad995e',
  ],
  [
    'high',
    '53506cfb50c6d9c637a1bc7697536c97c422ea3708475e2ac35b55d66270a09d',
    '9f4cf6576d318d0b889bb971eefef3f1f7616cc318704432e919a130c1c26cac',
  ],
] as const;

describe('MarineSnow shared field ownership and deterministic buffers', () => {
  it.each(DIVE_PARTICLE_BASELINES)(
    'preserves the original %s dive position/seed draw order',
    (tier, positionHash, seedHash) => {
      const config = makeConfig().water;
      const before = JSON.stringify(config);
      const snow = new MarineSnow(config, config.tiers[tier]);
      const digest = (name: string) =>
        createHash('sha256')
          .update(JSON.stringify(Array.from(snow.points!.geometry.getAttribute(name).array)))
          .digest('hex');
      try {
        expect(digest('position')).toBe(positionHash);
        expect(digest('aSeed')).toBe(seedHash);
        snow.update(new PerspectiveCamera(), sampleAtmosphere(config, -1200), 4, 720, {
          x: 0.2,
          z: -0.1,
        });
        expect(digest('position')).toBe(positionHash);
        expect(digest('aSeed')).toBe(seedHash);
        expect(JSON.stringify(config)).toBe(before);
      } finally {
        snow.dispose();
      }
    },
  );

  it('places a bounded sprite field at absolute time without reallocating or owning its map', () => {
    const sprite = new DataTexture();
    const options: SnowFieldConfig = {
      box: new Vector3(170, 80, 170),
      seed: 0x51ed27,
      sprite: { map: sprite, size: 0.55, opacity: 0.7, fog: true, depthWrite: false },
      drift: {
        lateralM: 1.2,
        xRate: 0.11,
        zRate: 0.09,
        phaseStep: 0.37,
        sinkMps: 0.45,
        sinkBase: 0.7,
        sinkSpread: 0.6,
        sinkCycle: 7,
      },
    };
    const snow = new MarineSnow(options, { snowCount: 200 });
    const points = snow.points!;
    const geometry = points.geometry;
    const positions = geometry.getAttribute('position') as BufferAttribute;
    const buffer = positions.array;
    const material = points.material as PointsMaterial;
    const before = JSON.stringify(options);
    const releaseMap = vi.spyOn(sprite, 'dispose');
    const releaseGeometry = vi.spyOn(geometry, 'dispose');
    const releaseMaterial = vi.spyOn(material, 'dispose');
    const scene = new Scene();
    scene.add(points);
    try {
      snow.place(new Vector3(0, 8.8, 0), 0);
      const hash = createHash('sha256')
        .update(JSON.stringify(Array.from(buffer)))
        .digest('hex');
      expect(hash).toBe('20720c8c668764a68afff879e3f0b39327a78c01c1ca91c847ad4a34d643905d');
      snow.place(new Vector3(0, 8.8, 0), 400);
      const later = Array.from(buffer);
      snow.place(new Vector3(0, 8.8, 0), 2);
      expect(Array.from(buffer)).not.toEqual(later);
      snow.place(new Vector3(0, 8.8, 0), 400);
      expect(Array.from(buffer)).toEqual(later);
      expect(points.geometry).toBe(geometry);
      expect(positions.array).toBe(buffer);
      expect(points.material).toBe(material);
      expect(material.map).toBe(sprite);
      expect(points.frustumCulled).toBe(false);
      expect(geometry.boundingSphere!.radius).toBe(Infinity);
      expect(geometry.getAttribute('aSeed')).toBeUndefined();
      // The centre follows the seabed anchor, independent of camera or hover.
      snow.place(new Vector3(10, 408.8, -5), 400);
      const elevated = Array.from(buffer);
      for (let i = 0; i < later.length; i += 3) {
        expect(elevated[i] - later[i]).toBeCloseTo(10, 4);
        expect(elevated[i + 1] - later[i + 1]).toBeCloseTo(400, 3);
        expect(elevated[i + 2] - later[i + 2]).toBeCloseTo(-5, 4);
      }
      snow.dispose();
      snow.dispose();
      const version = positions.version;
      snow.place(new Vector3(), 0);
      expect(positions.version).toBe(version);
      expect(points.parent).toBeNull();
      expect(releaseGeometry).toHaveBeenCalledTimes(1);
      expect(releaseMaterial).toHaveBeenCalledTimes(1);
      expect(releaseMap).not.toHaveBeenCalled();
      expect(JSON.stringify(options)).toBe(before);
    } finally {
      snow.dispose();
      sprite.dispose();
    }
  });

  it.each([0, 8])(
    'disposes a dive field with %s particles once and ignores later updates',
    (count) => {
      const config = makeConfig().water;
      const snow = new MarineSnow(config, { snowCount: count });
      const geometry = snow.points?.geometry;
      const material = snow.points?.material as ShaderMaterial | undefined;
      const releaseGeometry = geometry ? vi.spyOn(geometry, 'dispose') : undefined;
      const releaseMaterial = material ? vi.spyOn(material, 'dispose') : undefined;
      snow.update(new PerspectiveCamera(), sampleAtmosphere(config, -1200), 4, 720);
      snow.dispose();
      snow.dispose();
      snow.update(new PerspectiveCamera(), sampleAtmosphere(config, -1200), 4, 720);
      if (count === 0) expect(snow.points).toBeNull();
      else {
        expect(material!.uniforms.uTime.value).toBe(4);
        expect(releaseGeometry).toHaveBeenCalledTimes(1);
        expect(releaseMaterial).toHaveBeenCalledTimes(1);
      }
    },
  );
});
