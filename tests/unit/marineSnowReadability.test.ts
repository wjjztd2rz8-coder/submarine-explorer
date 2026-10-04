// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync, writeFileSync } from 'node:fs';
import { afterAll, describe, expect, it } from 'vitest';
import { AmbientLight, Color, FogExp2, MathUtils, Scene, ShaderMaterial, Vector3 } from 'three';
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
import { MarineSnow, snowParticleAppearance } from '../../src/render/MarineSnow.js';
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

/** The old shader's ceilings, for before/after comparisons with identical seeds. */
function legacy(config: WaterConfig): WaterConfig {
  return {
    ...config,
    snowMaxSizePx: 18,
    snowForegroundSizePx: 18,
    snowForegroundAlpha: 1,
    snowForegroundBrightness: 3.6,
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
  const old = legacy(config);
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
    const prev = snowParticleAppearance(old, atmo, scale, seed, depth, radial, lit, edge);
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

describe('460 marine snow readability at all shipped sites and tiers', () => {
  it('keeps the tested bounds connected to both GPU shaders and config uniforms', () => {
    const config = makeConfig();
    const snow = new MarineSnow(config.water, config.water.tiers.medium);
    try {
      const mat = snow.points!.material as ShaderMaterial;
      for (const [uniform, value] of Object.entries({
        uMaxSizePx: 6,
        uForegroundM: 6,
        uForegroundFadeEndM: 12,
        uForegroundSizePx: 2,
        uForegroundAlpha: 0.12,
        uForegroundBrightness: 0.65,
      }))
        expect(mat.uniforms[uniform]!.value).toBe(value);
      expect(mat.vertexShader).toContain('length(world - uCam)');
      expect(mat.vertexShader).toContain('mix(uForegroundSizePx, uMaxSizePx, vForegroundFade)');
      expect(mat.vertexShader).toContain('1.0, sizeCap)');
      expect(mat.fragmentShader).toContain('min(uBrightness + vLit * 2.6, brightnessCap)');
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
            if (opening === 'free' && pose.chaseRadius) rig.chaseRadius = pose.chaseRadius;
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
                      expect(a.sizePx).toBeLessThanOrEqual(6);
                      expect(a.alpha).toBeGreaterThanOrEqual(0);
                      if (seed > atmo.snowDensity) expect(a.alpha).toBe(0);
                      if (distance <= 6) {
                        expect(a.sizePx).toBeLessThanOrEqual(2);
                        expect(a.alpha).toBeLessThanOrEqual(0.12);
                        expect(a.brightness).toBeLessThanOrEqual(0.65);
                      }
                      const old = snowParticleAppearance(
                        legacy(config.water),
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
                        expect(a.alpha).toBe(old.alpha);
                        expect(a.brightness).toBe(old.brightness);
                      }
                    }
                  }
                }
            }
            const scale = mat.uniforms.uScale!.value as number;
            const seed = Math.min(1, atmo.snowDensity);
            const old20 = snowParticleAppearance(
              legacy(config.water),
              atmo,
              scale,
              seed,
              20,
              20,
              1,
            );
            const new20 = snowParticleAppearance(config.water, atmo, scale, seed, 20, 20, 1);
            const forward = new Vector3(Math.sin(pose.yaw), 0, -Math.cos(pose.yaw));
            const field = projectedField(snow, config.water, atmo, rig, position, forward, opening);
            expect(field.maxAfterPx).toBeLessThanOrEqual(6);
            expect(field.lowerThirdGlareAfter).toBeLessThanOrEqual(field.lowerThirdGlareBefore);
            const wreckLayers = [];
            for (const name of ['wreckHaze', 'wreckMotes']) {
              const points = scene.getObjectByName(name) as typeof snow.points;
              if (!points) continue;
              const material = points.material as ShaderMaterial;
              const u = material.uniforms;
              expect(u.uForegroundM!.value).toBe(6);
              expect(u.uForegroundSizePx!.value).toBe(2);
              expect(u.uForegroundAlpha!.value).toBe(0.12);
              expect(u.uForegroundBrightness!.value).toBe(0.65);
              expect(material.vertexShader).toContain('length(world - uCam)');
              expect(material.vertexShader).toContain('float foreground = wreckForeground(w)');
              expect(material.vertexShader).toContain('mix(uForegroundSizePx, 256.0, fade)');
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
                  );
                  if (distance <= 6) {
                    expect(bounded.sizePx).toBeLessThanOrEqual(2);
                    expect(bounded.alpha).toBeLessThanOrEqual(0.12);
                    expect(bounded.brightness).toBeLessThanOrEqual(0.65);
                  }
                  if (distance >= 12) {
                    expect(bounded.sizePx).toBe(rawSize);
                    expect(bounded.alpha).toBe(opacity);
                    expect(bounded.brightness).toBeCloseTo(brightness, 12);
                  }
                }
              wreckLayers.push({
                name,
                count: points.geometry.getAttribute('aSeed').count,
                maxSize20Px: Math.min(256, (sizeM * scale) / 20),
                centreAlphaBound: opacity,
                brightnessBound: brightness,
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
