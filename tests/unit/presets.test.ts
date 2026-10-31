import { siteIds } from '../content.js';
import {
  clamp,
  clamp01,
  lerp,
  smoothstep,
  smoothstep01,
  smoothstepUnit,
} from '../../src/util/math.js';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { Color, FogExp2, Mesh, PerspectiveCamera, PointLight, Points, Scene, Vector3 } from 'three';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { allSiteManifests, siteManifest } from '../../src/core/SiteManifest.js';
import { EventBus } from '../../src/core/EventBus.js';
import { Atmosphere, sampleAtmosphere } from '../../src/render/Atmosphere.js';
import { ReefPreset } from '../../src/world/presets/ReefPreset.js';
import type { TitanicHorizon } from '../../src/world/presets/TitanicHorizon.js';
import { Currents } from '../../src/world/Currents.js';
import { VentPreset, ventVariety } from '../../src/world/presets/VentPreset.js';
import type {
  PresetEnterContext,
  PresetFrameContext,
  PresetParams,
} from '../../src/world/presets/types.js';
import {
  landmarkTypeFor,
  mergePresetParams,
  presetDefaults,
  presetForType,
  PresetSystem,
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
  it('retains the generic two-draw budget while Beebe explicitly opts into warm haze', () => {
    const defaults = presetDefaults(DEFAULT_CONFIG.presets, 'vent');
    const mission = JSON.parse(
      readFileSync('data/landmarks/beebe-vent-field/mission.json', 'utf8'),
    );
    const warn = vi.fn();
    const beebe = mergePresetParams('vent', defaults, mission.environment.overrides, warn);
    expect(warn).not.toHaveBeenCalled();
    expect(beebe.hazeGlow).toBe(0.5);
    for (const { params, visuals, draws, haze } of [
      { params: defaults, visuals: true, draws: 2, haze: false },
      { params: beebe, visuals: true, draws: 3, haze: true },
      { params: { ...beebe, fluid: 'carbonate' }, visuals: true, draws: 2, haze: false },
      { params: beebe, visuals: false, draws: 0, haze: false },
    ]) {
      const scene = new Scene();
      const preset = new VentPreset({ ambient: 0.1, headlightGain: 1, headlightFalloffM: 60 });
      try {
        preset.enter({
          scene,
          terrain: {
            sampleHeight: () => -5000,
            getNormal: (_x, _z, out = new Vector3()) => out.set(0, 1, 0),
            widthM: 1000,
            depthM: 1000,
          },
          props: [],
          pois: [{ id: 'vent', kind: 'vent', position: new Vector3(0, -4900, 0) }],
          params: params as PresetParams,
          visuals,
          particleScale: 0.5,
          maxParticles: 1000,
          spawn: new Vector3(0, -4900, 0),
          toWorld: () => ({ x: 0, z: 0 }),
          bus: new EventBus(),
        });
        expect(preset.stats.draws).toBe(draws);
        expect(scene.getObjectByName('ventHaze') !== undefined).toBe(haze);
      } finally {
        preset.exit();
      }
      expect(scene.getObjectByName('ventSmoke')).toBeUndefined();
      expect(scene.getObjectByName('ventShimmer')).toBeUndefined();
      expect(scene.getObjectByName('ventHaze')).toBeUndefined();
    }
  });
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

function glowLights(scene: Scene): PointLight[] {
  return scene.children.filter(
    (object): object is PointLight =>
      object instanceof PointLight && object.name.startsWith('presetGlow'),
  );
}

describe('vent haze and glow budgets', () => {
  function enter(params: PresetParams, overrides: Partial<PresetEnterContext> = {}) {
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
      ...overrides,
    };
    preset.enter(context);
    return { scene, preset, context };
  }

  it('keeps zero offsets distinct from omitted defaults through mission override resolution', () => {
    const defaults = presetDefaults(DEFAULT_CONFIG.presets, 'vent');
    expect(defaults).toMatchObject({ glowDropM: 4, glowStandoffM: 0 });
    for (const [overrides, drop, standoff] of [
      [{}, 4, 0],
      [{ glowDropM: 0 }, 0, 0],
      [{ glowStandoffM: 6 }, 4, 6],
      [{ glowDropM: 12, glowStandoffM: 0 }, 12, 0],
      [{ glowDropM: 0, glowStandoffM: 6 }, 0, 6],
      [{ glowDropM: 12, glowStandoffM: 6 }, 12, 6],
      [{ glowDropM: 1_000_000, glowStandoffM: 1_000_000 }, 1_000_000, 1_000_000],
    ] as const) {
      const warn = vi.fn();
      const resolved = mergePresetParams('vent', defaults, overrides, warn);
      expect(warn).not.toHaveBeenCalled();
      // Also exercise the consumer's own omitted-parameter fallback.
      for (const params of [resolved, overrides]) {
        const { scene, preset, context } = enter(params);
        try {
          const top = context.pois[0]!.position;
          const lights = glowLights(scene);
          expect(lights).toHaveLength(1);
          const delta = lights[0]!.position.clone().sub(top);
          expect(delta.y).toBeCloseTo(-drop);
          expect(Math.hypot(delta.x, delta.z)).toBeCloseTo(standoff);
          expect(delta.toArray().every(Number.isFinite)).toBe(true);
        } finally {
          preset.exit();
        }
      }
    }
  });

  it.each([NaN, Infinity, -Infinity, -1, 1_000_001, null, '6'])(
    'keeps defaults when new offset overrides are outside the accepted domain (%s)',
    (invalid) => {
      resetOverrideWarnings();
      const warn = vi.fn();
      const params = mergePresetParams(
        'vent',
        presetDefaults(DEFAULT_CONFIG.presets, 'vent'),
        { glowDropM: invalid, glowStandoffM: invalid },
        warn,
      );
      expect(params).toMatchObject({ glowDropM: 4, glowStandoffM: 0 });
      expect(warn).toHaveBeenCalledTimes(2);
    },
  );

  it('offsets the tallest selected chimney orifices along the supported seeded lean', () => {
    for (const { firstTop, maxSources, selected } of [
      { firstTop: new Vector3(0, -4990, 0), maxSources: 2, selected: [1, 3] },
      { firstTop: new Vector3(31, -4905, -8), maxSources: 4, selected: [1, 3, 2] },
    ]) {
      const props = [10, 40, 20, 30].map((height, i) => ({
        id: `chimney-${i}`,
        model: 'procedural:chimney',
        top: Object.freeze(
          i === 1 ? firstTop.clone() : new Vector3(i * 13, -5000 + height, -i * 7),
        ),
        centre: Object.freeze(new Vector3()),
        radius: 2,
        height,
      }));
      const before = props.map((p) => p.top.toArray());
      const { scene, preset } = enter(
        Object.freeze({ glowDropM: 12, glowStandoffM: 6, glowLights: 8, maxSources }),
        { props: Object.freeze(props) },
      );
      try {
        const lights = glowLights(scene);
        expect(lights).toHaveLength(selected.length); // Both source count and the three-light cap apply.
        const angle = 0.35 + (ventVariety(firstTop).lean % 1) * 0.5;
        for (const [i, source] of selected.entries()) {
          const top = props[source]!.top;
          const delta = lights[i]!.position.clone().sub(top);
          expect(delta.x).toBeCloseTo(6 * Math.cos(angle));
          expect(delta.y).toBe(-12);
          expect(delta.z).toBeCloseTo(6 * Math.sin(angle));
          expect(Math.hypot(delta.x, delta.z)).toBeCloseTo(6);
        }
        expect(props.map((p) => p.top.toArray())).toEqual(before);
        expect(preset.stats.lights).toBe(selected.length);
      } finally {
        preset.exit();
      }
    }
  });

  it('preserves carbonate lights at two metres above the orifice despite sulfide offsets', () => {
    const { scene, preset, context } = enter({
      fluid: 'carbonate',
      glowDropM: 12,
      glowStandoffM: 6,
    });
    try {
      const lights = glowLights(scene);
      expect(lights).toHaveLength(1);
      expect(lights[0]!.position.toArray()).toEqual(
        context.pois[0]!.position.clone()
          .add(new Vector3(0, 2, 0))
          .toArray(),
      );
      expect(lights[0]!.intensity).toBe(260 * 0.35);
    } finally {
      preset.exit();
    }
  });

  it('disposes each glow once and recreates without stale lights or compounded offsets', () => {
    const params = Object.freeze({ glowDropM: 12, glowStandoffM: 6, glowLights: 3 });
    const { scene, preset, context } = enter(params);
    const top = context.pois[0]!.position.clone();
    const first = glowLights(scene)[0]!;
    const expected = first.position.clone();
    const dispose = vi.spyOn(first, 'dispose');
    preset.exit();
    preset.exit();
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(first.parent).toBeNull();
    expect(scene.children).toHaveLength(0);
    first.position.set(100, 200, 300);
    for (const next of [
      context,
      { ...context, visuals: false },
      context,
      { ...context, pois: [] },
      context,
      { ...context, params: { ...params, glowLights: 0 } },
      { ...context, scene: new Scene() },
    ]) {
      preset.enter(next);
      const lights = glowLights(next.scene);
      const count = next.visuals && next.pois.length && next.params.glowLights !== 0 ? 1 : 0;
      expect(lights).toHaveLength(count);
      expect(preset.stats.lights).toBe(count);
      if (count) {
        expect(lights[0]).not.toBe(first);
        expect(lights[0]!.position).toEqual(expected);
      }
      const disposals = lights.map((light) => vi.spyOn(light, 'dispose'));
      preset.exit();
      expect(disposals.every((spy) => spy.mock.calls.length === 1)).toBe(true);
      expect(next.scene.children).toHaveLength(0);
      expect(scene.children).toHaveLength(0);
      expect(preset.stats).toEqual({ draws: 0, particles: 0, lights: 0 });
    }
    expect(context.pois[0]!.position).toEqual(top);
    expect(params).toEqual({ glowDropM: 12, glowStandoffM: 6, glowLights: 3 });
  });

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
    // Flank glow: lights sit beside the stacks, below their tops, so the crust ledges catch them.
    const lights = scene.children.filter((o) => o.name.startsWith('presetGlow'));
    expect(lights.length).toBeGreaterThan(0);
    expect(lights.length).toBeLessThanOrEqual(3);
    expect(preset.stats.lights).toBe(lights.length);
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

describe('optional reef backdrop', () => {
  it.each(['low', 'medium', 'high'] as const)(
    '%s: propagates site depth/fog policy and releases it across scene re-entry',
    (tier) => {
      const config = DEFAULT_CONFIG;
      const manifests = allSiteManifests();
      const before = JSON.stringify({ config, manifests });
      const blake = siteManifest('blake-plateau-corals')!;
      const control = siteManifest('great-blue-hole')!;
      const horizon = blake.horizon!;
      const midpoint = (horizon.fadeStartM + horizon.fadeEndM) / 2;
      const results: string[] = [];
      for (const sites of [
        [blake, control],
        [control, blake],
      ]) {
        const states = sites.map((site) => {
          const scene = new Scene();
          const mission = JSON.parse(
            readFileSync(`data/landmarks/${site.id}/mission.json`, 'utf8'),
          );
          const preset = new ReefPreset({ ambient: 0.1, headlightGain: 1, headlightFalloffM: 60 });
          const ctx: PresetEnterContext = {
            site,
            scene,
            params: mergePresetParams(
              'reef',
              presetDefaults(config.presets, 'reef'),
              mission.environment.overrides ?? {},
            ),
            visuals: tier !== 'low',
            particleScale: config.presets.tierParticleScale[tier],
            maxParticles: config.presets.maxParticles,
            props: [],
            pois: [],
            terrain: {
              sampleHeight: () => -1000,
              getNormal: (_x, _z, out = new Vector3()) => out.set(0, 1, 0),
              widthM: 1000,
              depthM: 1000,
            },
            spawn: new Vector3(0, -800, 0),
            toWorld: () => ({ x: 0, z: 0 }),
            bus: new EventBus(),
          };
          return { site, preset, ctx };
        });
        const observed: Record<string, unknown> = {};
        try {
          for (const state of states) {
            const { site, preset, ctx } = state;
            // Reuse the preset after exit, including entry into a different scene.
            for (const scene of [ctx.scene, new Scene()]) {
              preset.enter({ ...ctx, scene });
              const dome = scene.getObjectByName('titanicHorizon') as
                TitanicHorizon['dome'] | undefined;
              expect(!!dome).toBe(site === blake);
              expect(dome?.visible).toBe(site === blake ? false : undefined);
              const draws = tier === 'low' ? 1 : 2;
              expect(preset.stats).toEqual({ draws, particles: 0, lights: 0 });
              expect(scene.children).toHaveLength(draws);
              const camera = new PerspectiveCamera(60, 16 / 9, 0.1, 5000);
              for (const depth of [
                5,
                horizon.fadeStartM,
                midpoint,
                horizon.fadeEndM,
                800,
                midpoint,
                5,
              ]) {
                camera.position.set(depth / 2, -depth, -depth / 3);
                camera.rotation.set(0.4, 1.2, 0.2);
                camera.far = depth + 3000;
                const atmo = sampleAtmosphere(config.water, camera.position.y);
                const fog = atmo.fogColor.clone();
                const density = atmo.fogDensity;
                scene.fog = new FogExp2(fog, density);
                scene.background = fog.clone();
                const frame: PresetFrameContext = {
                  camera,
                  atmo,
                  terrain: ctx.terrain,
                  subPosition: ctx.spawn,
                  subVelocity: new Vector3(),
                  elapsed: 1,
                  viewportH: 900,
                  headlightsOn: true,
                  baseCurrent: new Vector3(),
                  current: new Vector3(),
                  canyonReferenceSpeedMps: 1,
                  causticsScale: 1,
                  bus: ctx.bus,
                };
                preset.update(1 / 60, frame);
                // Authored midpoint gives half the full lift; samples reset each frame.
                const fade = depth <= horizon.fadeStartM ? 0 : depth >= horizon.fadeEndM ? 1 : 0.5;
                const expected = fog.multiplyScalar(
                  site === blake ? 1 + horizon.fogLift * fade : 1,
                );
                expect(atmo.fogColor).toEqual(expected);
                expect(atmo.fogDensity).toBe(density);
                expect(scene.fog.color).toEqual(expected);
                expect(scene.background).toEqual(expected);
                if (dome) {
                  expect(dome.visible).toBe(fade > 0);
                  if (fade > 0) {
                    expect(dome.position).toEqual(camera.position);
                    expect(dome.scale.toArray()).toEqual(Array(3).fill(camera.far * 0.9));
                    expect(dome.rotation.toArray()).toEqual([0, 0, 0, 'XYZ']);
                    const colors = dome.geometry.getAttribute('color');
                    const positions = dome.geometry.getAttribute('position');
                    for (let i = 0; i < positions.count; i++) {
                      if (positions.getY(i) <= 0.2)
                        expect([colors.getX(i), colors.getY(i), colors.getZ(i)]).toEqual(
                          expected.toArray().map(Math.fround),
                        );
                      if (positions.getY(i) === 1 && fade === 1)
                        expect([colors.getX(i), colors.getY(i), colors.getZ(i)]).toEqual(
                          new Color(horizon.upperColor).toArray().map(Math.fround),
                        );
                    }
                  }
                }
                for (const object of scene.children) {
                  expect(object).toBeInstanceOf(Mesh);
                  for (const attribute of Object.values((object as Mesh).geometry.attributes))
                    expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);
                }
              }
              observed[site.id] = {
                stats: { ...preset.stats },
                names: scene.children.map((o) => o.name),
              };
              const disposals = scene.children.flatMap((object) => {
                const mesh = object as Mesh;
                return [
                  vi.spyOn(mesh.geometry, 'dispose'),
                  vi.spyOn(mesh.material as import('three').Material, 'dispose'),
                ];
              });
              const objects = [...scene.children];
              preset.exit();
              preset.exit();
              expect(disposals.every((spy) => spy.mock.calls.length === 1)).toBe(true);
              expect(objects.every((object) => object.parent === null)).toBe(true);
              expect(scene.children).toHaveLength(0);
              expect(preset.stats).toEqual({ draws: 0, particles: 0, lights: 0 });
            }
          }
          results.push(JSON.stringify([observed[blake.id], observed[control.id]]));
        } finally {
          for (const { preset } of states) preset.exit();
        }
      }
      expect(results[0]).toBe(results[1]);
      expect(JSON.stringify({ config, manifests })).toBe(before);
    },
  );
});

describe('shared scalar maths', () => {
  it('retains clamp boundaries, non-finite inputs and min/max ordering', () => {
    expect([-Infinity, -1, 0, 0.5, 1, 2, Infinity].map(clamp01)).toEqual([0, 0, 0, 0.5, 1, 1, 1]);
    expect(clamp(NaN)).toBeNaN();
    expect(clamp(-0)).toBe(0);
    expect(clamp(-3, -2, 4)).toBe(-2);
    expect(clamp(6, -2, 4)).toBe(4);
    expect(clamp(3, 5, 2)).toBe(2);
  });

  it('interpolates and extrapolates without clamping the lerp factor', () => {
    expect([-1, 0, 0.25, 1, 2].map((t) => lerp(2, 10, t))).toEqual([-6, 2, 4, 10, 18]);
    expect(lerp(10, 2, 0.25)).toBe(8);
    expect(lerp(2, 10, NaN)).toBeNaN();
  });

  it('keeps raw, clamped one-input and edge-based cubics distinct', () => {
    expect([-1, 0, 0.25, 0.5, 1, 2].map(smoothstep01)).toEqual([0, 0, 0.15625, 0.5, 1, 1]);
    expect(smoothstepUnit(-1)).toBe(5);
    expect(smoothstepUnit(2)).toBe(-4);
    expect(smoothstep(10, 20, 12.5)).toBe(0.15625);
    expect(smoothstep(20, 10, 12.5)).toBe(0.84375);
    expect(smoothstep(4, 4, 3)).toBe(0);
    expect(smoothstep(4, 4, 5)).toBe(1);
    expect(smoothstep(4, 4, 4)).toBeNaN();
    expect(smoothstep01(NaN)).toBeNaN();
  });
});

// Guard the complete mission -> preset -> reusable atmosphere sample path, including
// Low's particle-free update and a missing mission/type for an unknown site.
describe('per-site preset atmosphere', () => {
  // Vent glow lights as authored in each mission's overrides (defaults elsewhere).
  const authoredGlow: Record<
    string,
    { drop: number; standoff: number; distance: number; intensity: number }
  > = {
    default: { drop: 4, standoff: 0, distance: 60, intensity: 260 },
    'beebe-vent-field': { drop: 12, standoff: 6, distance: 60, intensity: 3000 },
    'axial-seamount-ashes': { drop: 0.5, standoff: 1.5, distance: 28, intensity: 700 },
  };
  const sites = (
    JSON.parse(readFileSync('data/tiles/index.json', 'utf8')).tiles as { id: string }[]
  )
    .map((tile) => tile.id)
    .filter((id) => id !== 'demo-synthetic');
  const landmarks = JSON.parse(readFileSync('data/landmarks.json', 'utf8'));

  it('covers every shipped site with a neutral vent default', () => {
    expect(sites.length).toBeGreaterThan(0);
    expect([...sites].sort()).toEqual([...siteIds].sort());
    expect(DEFAULT_CONFIG.presets.vent.hullLight).toBe(1);
  });

  for (const tier of ['low', 'medium', 'high'] as const) {
    it.each([...sites, 'unknown-site'])(
      `%s ${tier}: applies authored hull light and hull-gated wreck policy`,
      async (site) => {
        const config = DEFAULT_CONFIG;
        const scene = new Scene();
        const atmosphere = new Atmosphere(scene, config.water, {
          ...config.water.tiers[tier],
          causticsSize: 0,
        });
        const currents = new Currents(site, site, async () => null);
        await currents.ready;
        const position = new Vector3(0, -800, 0);
        const camera = new PerspectiveCamera();
        if (site === 'blake-plateau-corals') camera.position.copy(position);
        const mission =
          site === 'unknown-site'
            ? null
            : JSON.parse(readFileSync(`data/landmarks/${site}/mission.json`, 'utf8'));
        const ventPois =
          mission?.environment?.preset === 'vent'
            ? Array.from({ length: 4 }, (_, i) => ({
                id: `orifice-${i}`,
                kind: 'vent',
                position: Object.freeze(new Vector3(13 * i, -990 + i, -7 * i)),
              }))
            : [];
        const sourceBefore = JSON.stringify({ mission, ventPois, presets: config.presets });
        const system = new PresetSystem({
          scene,
          bus: new EventBus(),
          config,
          tier,
          params: new URLSearchParams(),
          tileId: site,
          landmarkId: site,
          missionId: null,
          terrain: {
            sampleHeight: () => -1000,
            getNormal: (_x, _z, out = new Vector3()) => out.set(0, 1, 0),
            widthM: 1000,
            depthM: 1000,
          },
          props: { loaded: true, placed: [] },
          // The same POI id everywhere must not enable another site's policy.
          discovery: {
            loaded: true,
            pois: [
              { id: 'endurance-hull', kind: 'wreck', position: new Vector3(0, -990, 0) },
              ...ventPois,
            ],
          },
          sub: { position, velocity: new Vector3(), floorFor: (ground) => ground + 10 },
          currents,
          currentMode: 'off',
          atmosphere,
          headlights: { on: false },
          toWorld: () => ({ x: 0, z: 0 }),
          fetchJson: async (url) => (url.endsWith('/mission.json') ? mission : landmarks),
        });
        try {
          await system.ready;
          const expected = site === 'beebe-vent-field' ? 0.9 : 1;
          for (let frame = 0; frame < 3; frame++) {
            const sample = atmosphere.update(position.y, position, 1 / 60);
            const fog = sample.fogColor.clone();
            expect(sample.hullLight).toBe(1);
            system.update(1 / 60, 0, sample, camera, 844, frame / 60);
            if (site === 'blake-plateau-corals') {
              expect(scene.getObjectByName('titanicHorizon')?.visible).toBe(true);
              expect(system.preset!.stats).toEqual({
                draws: tier === 'low' ? 1 : 2,
                particles: 0,
                lights: 0,
              });
              expect(sample.fogColor).toEqual(
                fog.multiplyScalar(1 + siteManifest(site)!.horizon!.fogLift),
              );
              expect(scene.fog!.color).toEqual(sample.fogColor);
              expect(scene.background).toEqual(sample.fogColor);
            }
            expect(Number.isFinite(sample.hullLight)).toBe(true);
            expect(sample.hullLight).toBe(expected);
            expect(scene.getObjectByName('enduranceHorizon') !== undefined).toBe(
              site === 'endurance',
            );
            expect(scene.getObjectByName('enduranceRelief') !== undefined).toBe(
              site === 'endurance' && tier !== 'low',
            );
            if (ventPois.length) {
              const lights = glowLights(scene);
              const count =
                tier === 'low' || site === 'lost-city' ? 0 : site === 'beebe-vent-field' ? 3 : 2;
              expect(lights).toHaveLength(count);
              expect(system.preset!.stats.lights).toBe(count);
              expect(new Set(lights.map((light) => light.name)).size).toBe(count);
              const glow = authoredGlow[site] ?? authoredGlow.default!;
              expect(system.params).toMatchObject({
                glowDropM: glow.drop,
                glowStandoffM: glow.standoff,
              });
              for (const [i, light] of lights.entries()) {
                const delta = light.position.clone().sub(ventPois[i]!.position);
                expect(delta.toArray().every(Number.isFinite)).toBe(true);
                expect(delta.y).toBe(-glow.drop);
                expect(Math.hypot(delta.x, delta.z)).toBeCloseTo(glow.standoff);
                expect(light.distance).toBe(glow.distance);
                expect(light.decay).toBe(2);
                expect(light.castShadow).toBe(false);
                const elapsed = frame / 60;
                const base = glow.intensity;
                expect(light.intensity).toBeCloseTo(
                  base *
                    (1 +
                      0.07 * Math.sin(elapsed * 1.3 + i * 2.1) +
                      0.04 * Math.sin(elapsed * 3.7 + i)),
                );
              }
            }
          }
          system.dispose();
          expect(glowLights(scene)).toHaveLength(0);
          expect(JSON.stringify({ mission, ventPois, presets: config.presets })).toBe(sourceBefore);
          expect(atmosphere.update(-100, position, 0).hullLight).toBe(1);
        } finally {
          system.dispose();
          atmosphere.dispose();
        }
      },
    );
  }

  it.each([undefined, NaN, Infinity, '0.2', -1])(
    'rejects an invalid hull override (%s)',
    (hullLight) => {
      resetOverrideWarnings();
      const params = mergePresetParams(
        'vent',
        presetDefaults(DEFAULT_CONFIG.presets, 'vent'),
        { hullLight },
        vi.fn(),
      );
      expect(params.hullLight).toBe(1);
    },
  );
});
