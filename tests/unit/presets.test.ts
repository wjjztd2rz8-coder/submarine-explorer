// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { Points, Scene, Vector3 } from 'three';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { EventBus } from '../../src/core/EventBus.js';
import { VentPreset } from '../../src/world/presets/VentPreset.js';
import type { PresetEnterContext, PresetParams } from '../../src/world/presets/types.js';
import {
  landmarkTypeFor,
  mergePresetParams,
  presetDefaults,
  presetForType,
  resetOverrideWarnings,
  selectPreset,
} from '../../src/world/presets/Presets.js';
import {
  bearingToVector,
  canyonCurrent,
  capVector,
  channelConfinement,
  currentCouplingDelta,
  trenchInterval,
  vectorToBearing,
  wrapToBox,
} from '../../src/world/presets/maths.js';

describe('preset selection', () => {
  it('maps landmark types per contracts §1', () => {
    const cases: Array<[string, string]> = [
      ['vent', 'vent'],
      ['seep', 'brine'],
      ['canyon', 'canyon'],
      ['reef', 'reef'],
      ['hole', 'reef'],
      ['trench', 'trench'],
      ['wreck', 'wreck'],
      ['seamount', 'seamount'],
      ['ridge', 'seamount'],
      ['other', 'default'],
    ];
    for (const [type, preset] of cases) expect(presetForType(type)).toBe(preset);
    expect(presetForType(null)).toBe('default');
  });

  it('finds the landmark type by id, then falls back to the tile id', () => {
    const doc = {
      landmarks: [
        { id: 'lost-city', type: 'vent' },
        { id: 'titanic', type: 'wreck' },
      ],
    };
    expect(landmarkTypeFor(doc, ['_test', 'titanic'])).toBe('wreck');
    expect(landmarkTypeFor(doc.landmarks, ['lost-city'])).toBe('vent');
    expect(landmarkTypeFor(null, ['x'])).toBeNull();
  });

  it('prefers ?preset= > mission environment > type > default', () => {
    const warn = vi.fn();
    const env = { preset: 'vent', overrides: { fluid: 'carbonate' } };
    expect(
      selectPreset({ forced: 'reef', environment: env, landmarkType: 'wreck' }, warn),
    ).toMatchObject({
      preset: 'reef',
      source: 'param',
      overrides: {},
    });
    expect(selectPreset({ environment: env, landmarkType: 'wreck' }, warn)).toMatchObject({
      preset: 'vent',
      source: 'mission',
      overrides: { fluid: 'carbonate' },
    });
    expect(selectPreset({ landmarkType: 'canyon' }, warn).preset).toBe('canyon');
    expect(selectPreset({}, warn)).toMatchObject({ preset: 'default', source: 'default' });
    expect(warn).not.toHaveBeenCalled();
    expect(selectPreset({ forced: 'lava', environment: { preset: 'nope' } }, warn).preset).toBe(
      'default',
    );
    expect(warn).toHaveBeenCalledTimes(2);
  });
});

describe('override merge', () => {
  it('merges known keys and warns once per unknown or mistyped key', () => {
    resetOverrideWarnings();
    const warn = vi.fn();
    const defaults = presetDefaults(DEFAULT_CONFIG.presets, 'canyon');
    const over = { currentDirDeg: 220, currentSpeedMps: 0.4, bogus: 1, slopeBias: 'high' };
    const out = mergePresetParams('canyon', defaults, over, warn);
    expect(out.currentDirDeg).toBe(220); // null default accepts a number
    expect(out.currentSpeedMps).toBe(0.4);
    expect(out.slopeBias).toBe(DEFAULT_CONFIG.presets.canyon.slopeBias);
    expect(out).not.toHaveProperty('bogus');
    expect(warn).toHaveBeenCalledTimes(2);
    mergePresetParams('canyon', defaults, over, warn);
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('rejects nonfinite, negative and unbounded numeric mission overrides', () => {
    const warn = vi.fn();
    const defaults = presetDefaults(DEFAULT_CONFIG.presets, 'canyon');
    const out = mergePresetParams(
      'canyon',
      defaults,
      { currentDirDeg: Infinity, currentSpeedMps: -1, plumeParticles: 1e12 },
      warn,
    );
    expect(out.currentDirDeg).toBeNull();
    expect(out.currentSpeedMps).toBe(defaults.currentSpeedMps);
    expect(out.plumeParticles).toBe(defaults.plumeParticles);
    expect(warn).toHaveBeenCalledTimes(3);
  });
});

describe('current maths', () => {
  it('converts compass bearings (0 = north = -Z, 90 = east = +X)', () => {
    const e = bearingToVector(90);
    expect(e.x).toBeCloseTo(1);
    expect(e.z).toBeCloseTo(0);
    expect(bearingToVector(0).z).toBeCloseTo(-1);
    expect(vectorToBearing(0, 1)).toBeCloseTo(180);
    expect(vectorToBearing(-1, 0)).toBeCloseTo(270);
  });

  const base = {
    baseSpeedMps: 0.4,
    slopeBias: 1,
    axisGain: 1,
    confinement: 0,
    altitudeM: 10,
    boundaryLayerM: 60,
    aloftFraction: 0.35,
  };

  it('follows the base bearing on flat ground and bends down-slope on steep ground', () => {
    const flat = canyonCurrent({ ...base, baseDirDeg: 90, normal: { x: 0, y: 1, z: 0 } });
    expect(flat.x).toBeCloseTo(0.4);
    expect(flat.z).toBeCloseTo(0);
    // Normal tilted toward +Z (south): the seabed falls away southward.
    const steep = canyonCurrent({ ...base, baseDirDeg: 90, normal: { x: 0, y: 0.94, z: 0.34 } });
    expect(vectorToBearing(steep.x, steep.z)).toBeCloseTo(180, 0);
    const auto = canyonCurrent({ ...base, baseDirDeg: null, normal: { x: 0.34, y: 0.94, z: 0 } });
    expect(vectorToBearing(auto.x, auto.z)).toBeCloseTo(90, 0);
    expect(canyonCurrent({ ...base, baseDirDeg: null, normal: { x: 0, y: 1, z: 0 } }).speed).toBe(
      0,
    );
  });

  it('is faster in a confined channel and weaker aloft', () => {
    const n = { x: 0, y: 1, z: 0 };
    const open = canyonCurrent({ ...base, baseDirDeg: 0, normal: n }).speed;
    const channel = canyonCurrent({ ...base, baseDirDeg: 0, normal: n, confinement: 1 }).speed;
    const aloft = canyonCurrent({ ...base, baseDirDeg: 0, normal: n, altitudeM: 500 }).speed;
    expect(channel).toBeCloseTo(open * 2);
    expect(aloft).toBeCloseTo(open * 0.35);
    expect(channelConfinement(-1000, [-900, -880, -850], 100)).toBe(1);
    expect(channelConfinement(-1000, [-1010, -1020], 100)).toBe(0);
  });

  it('caps the current and couples the sub toward it without overshoot', () => {
    const v = { x: 3, y: 4, z: 0 };
    expect(capVector(v, 0.8)).toBeCloseTo(0.8);
    expect(Math.hypot(v.x, v.y, v.z)).toBeCloseTo(0.8);
    const out = { x: 0, y: 0, z: 0 };
    const cur = { x: 0.5, y: 0, z: 0 };
    currentCouplingDelta({ x: 0, y: 0, z: 0 }, cur, 0.5, 1 / 60, out);
    expect(out.x).toBeGreaterThan(0);
    expect(out.x).toBeLessThan(0.5);
    currentCouplingDelta({ x: 2, y: 0, z: 0 }, cur, 0.5, 1 / 60, out);
    expect(out.x).toBe(0); // already faster downstream: left alone
    const up = currentCouplingDelta({ x: -1, y: 0, z: 0 }, cur, 0.5, 100, out);
    expect(up.x).toBeCloseTo(1.5); // converges on the current speed, never past it
    const normal = { x: 0.3, y: -0.2, z: 0.5 };
    currentCouplingDelta(normal, { x: 0, y: 0, z: 0 }, 0.5, 1, out);
    expect(out).toEqual({ x: 0, y: 0, z: 0 });
    currentCouplingDelta(normal, cur, 0.5, 0, out);
    expect(out).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('wraps particle coordinates into the box around the centre', () => {
    for (const p of [-1234.5, -50, 0, 49.9, 50, 777]) {
      const w = wrapToBox(p, 10, 100);
      expect(w).toBeGreaterThanOrEqual(-40);
      expect(w).toBeLessThan(60);
      expect(Math.abs(((w - p) / 100) % 1)).toBeCloseTo(0);
    }
  });

  it('shortens the trench ambience interval with depth', () => {
    expect(trenchInterval(6000, 14, 5, 10900)).toBeCloseTo(14);
    expect(trenchInterval(10900, 14, 5, 10900)).toBeCloseTo(5);
    expect(trenchInterval(12000, 14, 5, 10900)).toBeCloseTo(5);
  });
});

describe('vent plume variety', () => {
  it('is deterministic per vent and differs between vents', async () => {
    const { ventVariety } = await import('../../src/world/presets/VentPreset.js');
    const THREE = await import('three');
    const a = ventVariety(new THREE.Vector3(10, -4900, 20));
    expect(ventVariety(new THREE.Vector3(10, -4900, 20))).toEqual(a);
    const b = ventVariety(new THREE.Vector3(31, -4905, -8));
    expect(b.height).not.toBe(a.height);
    for (const v of [a, b]) {
      expect(v.height).toBeGreaterThan(0.65);
      expect(v.lean).toBeGreaterThan(0.4);
    }
  });
});

describe('vent haze draw budget', () => {
  function enter(params: PresetParams): { scene: Scene; preset: VentPreset } {
    const scene = new Scene();
    const preset = new VentPreset({ ambient: 0.12, headlightGain: 1.6, headlightFalloffM: 90 });
    const context: PresetEnterContext = {
      scene,
      terrain: {
        sampleHeight: () => -5000,
        getNormal: (_x, _z, out = new Vector3()) => out.set(0, 1, 0),
        widthM: 1000,
        depthM: 1000,
      },
      props: [],
      pois: [{ id: 'vent', kind: 'vent', position: new Vector3(0, -4990, 0) }],
      params,
      visuals: true,
      particleScale: 0.5,
      maxParticles: 20000,
      spawn: new Vector3(0, -4980, 0),
      toWorld: () => ({ x: 0, z: 0 }),
      bus: new EventBus(),
    };
    preset.enter(context);
    return { scene, preset };
  }

  it('keeps generic vent geometry at two draws with Config defaults or omitted params', () => {
    for (const params of [presetDefaults(DEFAULT_CONFIG.presets, 'vent'), {}]) {
      const { scene, preset } = enter(params);
      expect(preset.stats.draws).toBe(2);
      expect(scene.children.filter((object) => object instanceof Points)).toHaveLength(2);
      expect(scene.getObjectByName('ventHaze')).toBeUndefined();
      preset.exit();
      expect(scene.children).toHaveLength(0);
    }
  });

  it('accepts Beebe mission haze overrides and preserves its single batched haze draw', () => {
    resetOverrideWarnings();
    const mission = JSON.parse(
      readFileSync('data/landmarks/beebe-vent-field/mission.json', 'utf8'),
    ) as { environment: { overrides: Record<string, unknown> } };
    const warn = vi.fn();
    const params = mergePresetParams(
      'vent',
      presetDefaults(DEFAULT_CONFIG.presets, 'vent'),
      mission.environment.overrides,
      warn,
    );
    expect(warn).not.toHaveBeenCalled();
    const { scene, preset } = enter(params);
    expect(preset.stats.draws).toBe(3);
    expect(scene.children.filter((object) => object instanceof Points)).toHaveLength(3);
    const haze = scene.getObjectByName('ventHaze') as Points;
    expect(haze.geometry.getAttribute('position').count).toBe(3);
    expect(haze.material).toMatchObject({ uniforms: { uStrength: { value: 0.5 } } });
    preset.exit();
    expect(scene.children).toHaveLength(0);
  });

  it('keeps carbonate flow free of warm haze even if explicitly enabled', () => {
    const { scene, preset } = enter({
      ...presetDefaults(DEFAULT_CONFIG.presets, 'vent'),
      fluid: 'carbonate',
      smokeIntensity: 0,
      glowLights: 0,
      hazeGlow: 0.5,
    });
    expect(preset.stats.draws).toBe(1);
    expect(scene.children.filter((object) => object instanceof Points)).toHaveLength(1);
    expect(scene.getObjectByName('ventHaze')).toBeUndefined();
    preset.exit();
  });
});
