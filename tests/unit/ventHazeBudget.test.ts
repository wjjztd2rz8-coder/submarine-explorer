// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { makeConfig } from '../../src/core/Config.js';
import { EventBus } from '../../src/core/EventBus.js';
import {
  mergePresetParams,
  presetDefaults,
  resetOverrideWarnings,
  selectPreset,
} from '../../src/world/presets/Presets.js';
import { VentPreset } from '../../src/world/presets/VentPreset.js';
import type { PresetEnterContext, PresetParams } from '../../src/world/presets/types.js';

function parameters(site: string, forced?: string): PresetParams {
  // PresetSystem reads environment from the raw mission document.
  const mission = JSON.parse(readFileSync(`data/landmarks/${site}/mission.json`, 'utf8'));
  const warn = vi.fn();
  const choice = selectPreset({ forced, environment: mission.environment }, warn);
  expect(choice.preset).toBe('vent');
  const params = mergePresetParams(
    'vent',
    presetDefaults(makeConfig().presets, 'vent'),
    choice.overrides,
    warn,
  );
  expect(warn).not.toHaveBeenCalled();
  return params;
}

function enter(params: PresetParams, visuals = true): { scene: THREE.Scene; preset: VentPreset } {
  const scene = new THREE.Scene();
  const preset = new VentPreset({ ambient: 0.12, headlightGain: 1.6, headlightFalloffM: 90 });
  const context: PresetEnterContext = {
    scene,
    terrain: {
      sampleHeight: () => -4000,
      getNormal: (_x, _z, out = new THREE.Vector3()) => out.set(0, 1, 0),
      widthM: 1000,
      depthM: 1000,
    },
    props: [],
    pois: [
      { id: 'orifice-1', kind: 'vent', position: new THREE.Vector3(10, -3790, 20) },
      { id: 'orifice-2', kind: 'vent', position: new THREE.Vector3(31, -3795, -8) },
    ],
    params,
    visuals,
    particleScale: 0.5,
    maxParticles: 20000,
    spawn: new THREE.Vector3(),
    toWorld: () => ({ x: 0, z: 0 }),
    bus: new EventBus(),
  };
  preset.enter(context);
  return { scene, preset };
}

function points(scene: THREE.Scene): THREE.Points[] {
  return scene.children.filter((object): object is THREE.Points => object instanceof THREE.Points);
}

describe('vent haze draw budget and site overrides', () => {
  it('omitted haze controls also retain the two-draw budget', () => {
    const { scene, preset } = enter({});
    try {
      expect(points(scene).map((p) => p.name)).toEqual(['ventSmoke', 'ventShimmer']);
      expect(preset.stats.draws).toBe(2);
    } finally {
      preset.exit();
    }
  });

  it('forced Titanic vent keeps the exact two actual particle draws', () => {
    const { scene, preset } = enter(parameters('titanic', 'vent'));
    try {
      expect(points(scene).map((p) => p.name)).toEqual(['ventSmoke', 'ventShimmer']);
      expect(preset.stats.draws).toBe(2);
      expect(scene.getObjectByName('ventHaze')).toBeUndefined();
    } finally {
      preset.exit();
    }
  });

  it('Beebe explicitly retains one additive haze draw shared by all orifices', () => {
    const params = parameters('beebe-vent-field');
    expect(params.hazeGlow).toBe(0.5);
    expect(params.hazeGlowSizeM).toBe(7);
    const { scene, preset } = enter(params);
    try {
      expect(points(scene).map((p) => p.name)).toEqual(['ventSmoke', 'ventShimmer', 'ventHaze']);
      expect(preset.stats.draws).toBe(3);
      const haze = scene.getObjectByName('ventHaze') as THREE.Points<
        THREE.BufferGeometry,
        THREE.ShaderMaterial
      >;
      expect(haze.geometry.getAttribute('position').count).toBe(6);
      expect(haze.material.blending).toBe(THREE.AdditiveBlending);
      expect(haze.material.uniforms.uStrength!.value).toBe(0.5);
      expect(haze.material.uniforms.uSize!.value).toBe(7);
      const smoke = scene.getObjectByName('ventSmoke') as THREE.Points;
      const variety = smoke.geometry.getAttribute('aVar');
      expect(
        Array.from({ length: variety.count }, (_, i) => variety.getW(i)).some((v) => v < 0),
      ).toBe(true); // White-smoker wisps still share the smoke draw.
    } finally {
      preset.exit();
    }
    expect(points(scene)).toHaveLength(0);
    expect(preset.stats).toEqual({ draws: 0, particles: 0, lights: 0 });
  });

  it('an explicit zero haze strength removes only the optional haze draw', () => {
    const { scene, preset } = enter({ ...parameters('beebe-vent-field'), hazeGlow: 0 });
    try {
      expect(points(scene).map((p) => p.name)).toEqual(['ventSmoke', 'ventShimmer']);
      expect(preset.stats.draws).toBe(2);
    } finally {
      preset.exit();
    }
  });

  it('mission haze controls reach the material and reject invalid numeric overrides', () => {
    resetOverrideWarnings();
    const defaults = presetDefaults(makeConfig().presets, 'vent');
    const warn = vi.fn();
    const params = mergePresetParams('vent', defaults, { hazeGlow: 0.25, hazeGlowSizeM: 11 }, warn);
    expect(warn).not.toHaveBeenCalled();
    const { scene, preset } = enter(params);
    try {
      const haze = scene.getObjectByName('ventHaze') as THREE.Points<
        THREE.BufferGeometry,
        THREE.ShaderMaterial
      >;
      expect(haze.material.uniforms.uStrength!.value).toBe(0.25);
      expect(haze.material.uniforms.uSize!.value).toBe(11);
    } finally {
      preset.exit();
    }
    const invalid = mergePresetParams(
      'vent',
      defaults,
      { hazeGlow: -1, hazeGlowSizeM: Infinity },
      warn,
    );
    expect(invalid.hazeGlow).toBe(0);
    expect(invalid.hazeGlowSizeM).toBe(7);
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('carbonate fluid cannot inherit hot sulfide haze', () => {
    const { scene, preset } = enter({
      ...parameters('titanic', 'vent'),
      fluid: 'carbonate',
      hazeGlow: 0.5,
    });
    try {
      expect(points(scene).map((p) => p.name)).toEqual(['ventSmoke', 'ventShimmer']);
      expect(preset.stats.draws).toBe(2);
      expect(scene.getObjectByName('ventHaze')).toBeUndefined();
    } finally {
      preset.exit();
    }
  });

  it('Low still creates no visual objects or glow lights at Beebe', () => {
    const { scene, preset } = enter(parameters('beebe-vent-field'), false);
    try {
      expect(scene.children).toHaveLength(0);
      expect(preset.stats).toEqual({ draws: 0, particles: 0, lights: 0 });
    } finally {
      preset.exit();
    }
  });
});
