// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { makeConfig } from '../../src/core/Config.js';
import { EventBus } from '../../src/core/EventBus.js';
import { sampleAtmosphere } from '../../src/render/Atmosphere.js';
import { mergePresetParams, presetDefaults } from '../../src/world/presets/Presets.js';
import { TitanicHorizon } from '../../src/world/presets/TitanicHorizon.js';
import { WreckPreset } from '../../src/world/presets/WreckPreset.js';
import type { PresetEnterContext, PresetFrameContext } from '../../src/world/presets/types.js';

const config = makeConfig();
const look = { ambient: 0.1, headlightGain: 1, headlightFalloffM: 60 };
const mission = JSON.parse(readFileSync('data/landmarks/titanic/mission.json', 'utf8'));
const params = mergePresetParams(
  'wreck',
  presetDefaults(config.presets, 'wreck'),
  mission.environment.overrides,
);

function setup(enabled: boolean, visuals: boolean, depth = -3800) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 5000);
  camera.position.set(50, depth, -80);
  const atmo = sampleAtmosphere(config.water, depth);
  scene.fog = new THREE.FogExp2(atmo.fogColor, atmo.fogDensity);
  scene.background = atmo.fogColor.clone();
  const preset = new WreckPreset(look);
  preset.enter({
    scene,
    params: { ...params, titanicHorizon: enabled, hazeParticles: 0, motesPerHull: 0 },
    visuals,
    props: [],
    pois: [],
    particleScale: 1,
    maxParticles: 1000,
    terrain: {
      sampleHeight: () => -3850,
      getNormal: (_x, _z, out = new THREE.Vector3()) => out.set(0, 1, 0),
      widthM: 1000,
      depthM: 1000,
    },
    spawn: camera.position,
    toWorld: () => ({ x: 0, z: 0 }),
    bus: new EventBus(),
  } satisfies PresetEnterContext);
  const frame = { camera, atmo } as PresetFrameContext;
  preset.update(1 / 60, frame);
  return { scene, camera, atmo, preset, frame };
}

describe('Titanic far-field horizon', () => {
  it('is explicitly enabled only by Titanic; defaults and other golden sites stay off', () => {
    expect(config.presets.wreck.titanicHorizon).toBe(false);
    expect(params.titanicHorizon).toBe(true);
    for (const site of [
      'lost-city',
      'great-blue-hole',
      'beebe-vent-field',
      'monterey-canyon',
      'bismarck',
      'endurance',
    ]) {
      const doc = JSON.parse(readFileSync(`data/landmarks/${site}/mission.json`, 'utf8'));
      expect(doc.environment.overrides?.titanicHorizon).toBeUndefined();
    }
    const baseline = setup(false, true);
    expect(baseline.scene.getObjectByName('titanicHorizon')).toBeUndefined();
    expect(baseline.atmo.fogColor.equals(sampleAtmosphere(config.water, -3800).fogColor)).toBe(
      true,
    );
    baseline.preset.exit();
  });

  for (const visuals of [false, true]) {
    it(`keeps exposure and fog density unchanged (${visuals ? 'particle tiers' : 'Low'})`, () => {
      const before = setup(false, visuals);
      const after = setup(true, visuals);
      const { fogColor: _beforeFog, ...beforeExposure } = before.atmo;
      const { fogColor: _afterFog, ...afterExposure } = after.atmo;
      expect(afterExposure).toEqual(beforeExposure);
      expect(after.scene.fog!.color.equals(after.atmo.fogColor)).toBe(true);
      expect(after.scene.background).toEqual(after.atmo.fogColor);
      // Quantify the distance-weighted RGB change: near hull colour is stable,
      // while the fully fogged horizon receives the lift. This is not pixel QA.
      const delta = after.atmo.fogColor.clone().sub(before.atmo.fogColor);
      const luminance = (c: THREE.Color) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
      const beforeFloorHue = before.atmo.fogColor
        .clone()
        .multiplyScalar(1 / luminance(before.atmo.fogColor));
      const afterFloorHue = after.atmo.fogColor
        .clone()
        .multiplyScalar(1 / luminance(after.atmo.fogColor));
      expect(afterFloorHue.r).toBeCloseTo(beforeFloorHue.r, 12);
      expect(afterFloorHue.g).toBeCloseTo(beforeFloorHue.g, 12);
      expect(afterFloorHue.b).toBeCloseTo(beforeFloorHue.b, 12);
      const farDelta = Math.max(delta.r, delta.g, delta.b);
      expect(farDelta).toBeGreaterThan(0);
      expect(farDelta).toBeLessThan(0.004);
      const nearFog = 1 - Math.exp(-Math.pow(after.atmo.fogDensity * 40, 2));
      expect(farDelta * nearFog).toBeLessThan(0.00001);
      expect(after.preset.stats).toEqual({ draws: 1, particles: 0, lights: 0 });
      before.preset.exit();
      after.preset.exit();
    });
  }

  it('renders a dim upward gradient behind geometry, follows translation and preserves world up', () => {
    const { scene, camera, preset, frame, atmo } = setup(true, true);
    const dome = scene.getObjectByName('titanicHorizon') as TitanicHorizon['dome'];
    expect(dome.position.equals(camera.position)).toBe(true);
    expect(dome.material.fog || dome.material.depthWrite || dome.material.depthTest).toBe(false);
    expect(dome.renderOrder).toBeLessThan(0);
    const positions = dome.geometry.getAttribute('position');
    const colors = dome.geometry.getAttribute('color');
    const luminance = (c: THREE.Color) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
    let brightest = 0;
    for (let i = 0; i < positions.count; i++) {
      const color = new THREE.Color().fromBufferAttribute(colors, i);
      if (positions.getY(i) <= 0) {
        expect(color.r).toBeCloseTo(atmo.fogColor.r, 7);
        expect(color.g).toBeCloseTo(atmo.fogColor.g, 7);
        expect(color.b).toBeCloseTo(atmo.fogColor.b, 7);
      }
      brightest = Math.max(brightest, luminance(color));
    }
    expect(brightest).toBeGreaterThan(luminance(atmo.fogColor));
    expect(brightest).toBeLessThan(0.025);
    camera.position.x += 100;
    camera.rotation.set(0.6, 1.2, 0.2);
    frame.atmo = sampleAtmosphere(config.water, camera.position.y);
    preset.update(1 / 60, frame);
    expect(dome.position.equals(camera.position)).toBe(true);
    expect(dome.rotation.toArray()).toEqual([0, 0, 0, 'XYZ']);
    const geometryDispose = vi.spyOn(dome.geometry, 'dispose');
    const materialDispose = vi.spyOn(dome.material, 'dispose');
    preset.exit();
    expect(scene.getObjectByName('titanicHorizon')).toBeUndefined();
    expect(geometryDispose).toHaveBeenCalledOnce();
    expect(materialDispose).toHaveBeenCalledOnce();
    expect(preset.stats.draws).toBe(0);
  });

  it('preserves surface starts and hides the dome on ascent', () => {
    const { scene, camera, preset, frame, atmo } = setup(true, false, -5);
    const dome = scene.getObjectByName('titanicHorizon')!;
    expect(dome.visible).toBe(false);
    expect(atmo.fogColor.equals(sampleAtmosphere(config.water, -5).fogColor)).toBe(true);
    camera.position.y = -3800;
    frame.atmo = sampleAtmosphere(config.water, camera.position.y);
    preset.update(1 / 60, frame);
    expect(dome.visible).toBe(true);
    camera.position.y = -600;
    frame.atmo = sampleAtmosphere(config.water, camera.position.y);
    preset.update(1 / 60, frame);
    expect(dome.visible).toBe(false);
    expect(frame.atmo.fogColor.equals(sampleAtmosphere(config.water, -600).fogColor)).toBe(true);
    preset.exit();
  });
});
