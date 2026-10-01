import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, GRAPHICS_TIERS, resolveGraphicsTier } from '../../src/core/Config.js';
import {
  DynamicResolution,
  detectTier,
  readDeviceCaps,
  resolveQuality,
  type DeviceCaps,
} from '../../src/core/Quality.js';
import { dynamicResolutionEnabled } from '../../src/app/systems/quality.js';

const desktop: DeviceCaps = {
  renderer: 'ANGLE (Apple, Apple M2, OpenGL 4.1)',
  vendor: 'Google Inc. (Apple)',
  maxTextureSize: 16384,
  cores: 8,
  memoryGb: 8,
  mobileUa: false,
  touchPrimary: false,
  screenW: 1920,
  screenH: 1080,
  devicePixelRatio: 2,
};
const caps = (over: Partial<DeviceCaps>): DeviceCaps => ({ ...desktop, ...over });

describe('detectTier', () => {
  it('keeps software renderers on low', () => {
    expect(detectTier(caps({ renderer: 'ANGLE (Google, SwiftShader Device)' })).tier).toBe('low');
    expect(detectTier(caps({ renderer: 'llvmpipe (LLVM 15.0.7, 256 bits)' })).tier).toBe('low');
  });

  it('drops tiny GPUs and small machines to low', () => {
    expect(detectTier(caps({ maxTextureSize: 2048 })).tier).toBe('low');
    expect(detectTier(caps({ cores: 2 })).tier).toBe('low');
    expect(detectTier(caps({ memoryGb: 2 })).tier).toBe('low');
  });

  it('puts phones on low unless they have a flagship GPU and memory', () => {
    const phone = { mobileUa: true, touchPrimary: true, screenW: 390, screenH: 844 };
    expect(detectTier(caps({ ...phone, renderer: 'Mali-G52', memoryGb: 4 })).tier).toBe('low');
    expect(
      detectTier(caps({ ...phone, renderer: 'Adreno (TM) 740', memoryGb: 8, cores: 8 })).tier,
    ).toBe('medium');
    expect(
      detectTier(caps({ ...phone, renderer: 'Apple GPU', memoryGb: null, cores: 6 })).tier,
    ).toBe('low');
  });

  it('treats a coarse-pointer, no-hover device as handheld without a mobile UA', () => {
    const tablet = caps({ touchPrimary: true, screenW: 1024, screenH: 1366, cores: 8 });
    expect(detectTier(tablet)).toEqual({ tier: 'medium', reason: 'tablet' });
    expect(detectTier({ ...tablet, cores: 4 }).tier).toBe('low');
  });

  it('gives discrete desktop GPUs high and old Intel low', () => {
    expect(detectTier(caps({ renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3070)' })).tier).toBe(
      'high',
    );
    expect(detectTier(caps({ renderer: 'AMD Radeon RX 6800 XT' })).tier).toBe('high');
    expect(detectTier(caps({ renderer: 'Intel(R) HD Graphics 620' })).tier).toBe('low');
    expect(detectTier(desktop).tier).toBe('medium');
    expect(detectTier(caps({ renderer: '', vendor: '' })).tier).toBe('medium');
  });

  it('never picks ultra', () => {
    for (const renderer of ['NVIDIA GeForce RTX 4090', 'Apple M3 Max', '']) {
      expect(detectTier(caps({ renderer })).tier).not.toBe('ultra');
    }
  });
});

describe('resolveQuality', () => {
  const sw = caps({ renderer: 'SwiftShader' });

  it('keeps the pre-v2 default: a fixed medium setting ignores detection', () => {
    expect(DEFAULT_CONFIG.graphicsTier).toBe('medium');
    const q = resolveQuality(null, DEFAULT_CONFIG.graphicsTier, sw);
    expect(q).toMatchObject({ tier: 'medium', source: 'setting' });
    expect(q.detected.tier).toBe('low');
  });

  it('lets ?tier= beat the setting, and ?tier=auto force detection', () => {
    expect(resolveQuality('high', 'low', sw)).toMatchObject({ tier: 'high', source: 'url' });
    expect(resolveQuality('ultra', 'auto', sw)).toMatchObject({ tier: 'ultra', source: 'url' });
    expect(resolveQuality('auto', 'high', sw)).toMatchObject({ tier: 'low', source: 'auto' });
    // Both URL overrides make a saved-tier change unappliable by reloading.
    expect(resolveQuality('auto', 'high', sw).urlForced).toBe(true);
    expect(resolveQuality('high', 'low', sw).urlForced).toBe(true);
    expect(resolveQuality(null, 'high', sw).urlForced).toBe(false);
    expect(resolveQuality(null, 'auto', sw).urlForced).toBe(false);
    expect(resolveQuality('bogus', 'high', sw)).toMatchObject({ tier: 'high', source: 'setting' });
  });

  it('detects when the setting is auto', () => {
    expect(resolveQuality(null, 'auto', sw)).toMatchObject({
      tier: 'low',
      source: 'auto',
      reason: 'software renderer',
    });
  });

  it('keeps resolveGraphicsTier for the four tiers', () => {
    for (const tier of GRAPHICS_TIERS) expect(resolveGraphicsTier(tier)).toBe(tier);
    expect(resolveGraphicsTier('auto')).toBe('medium');
    expect(resolveGraphicsTier(null, 'high')).toBe('high');
  });
});

describe('readDeviceCaps', () => {
  it('never throws without a context or a DOM', () => {
    const c = readDeviceCaps(null);
    expect(c.renderer).toBe('');
    expect(c.maxTextureSize).toBe(0);
    expect(typeof c.mobileUa).toBe('boolean');
  });

  it('prefers the unmasked renderer string', () => {
    const gl = {
      MAX_TEXTURE_SIZE: 1,
      RENDERER: 2,
      VENDOR: 3,
      getExtension: (name: string) => (name === 'WEBGL_debug_renderer_info' ? {} : null),
      getParameter: (p: number) =>
        ({ 1: 8192, 2: 'masked', 3: 'masked', 0x9245: 'NVIDIA', 0x9246: 'RTX 3060' })[p],
    };
    expect(readDeviceCaps(gl)).toMatchObject({
      renderer: 'RTX 3060',
      vendor: 'NVIDIA',
      maxTextureSize: 8192,
    });
  });
});

describe('DynamicResolution', () => {
  const cfg = DEFAULT_CONFIG.quality.dynamicResolution;
  const run = (dr: DynamicResolution, ms: number, seconds: number): number[] => {
    const changes: number[] = [];
    for (let t = 0; t < seconds * 1000; t += ms) {
      const r = dr.update(ms);
      if (r !== null) changes.push(r);
    }
    return changes;
  };

  it('holds the ratio while frames are on budget', () => {
    const dr = new DynamicResolution(cfg, 2);
    expect(run(dr, 16.7, 20)).toEqual([]);
    expect(dr.pixelRatio).toBe(2);
  });

  it('steps down under load, not below the floor, and back up with headroom', () => {
    const dr = new DynamicResolution(cfg, 2);
    const down = run(dr, 40, 30);
    expect(down[0]).toBe(2 - cfg.step);
    expect(dr.pixelRatio).toBe(cfg.minPixelRatio);
    const up = run(dr, 8, 120);
    expect(up.length).toBeGreaterThan(0);
    expect(dr.pixelRatio).toBe(2);
  });

  it('settles on a stable ratio-dependent workload instead of cycling', () => {
    // 25 ms at ratio 1, 8.5 ms at 0.75: a stable, ratio-dependent workload.
    const dr = new DynamicResolution(cfg, 1);
    const cost = (r: number): number => 25 * (r > 0.9 ? 1 : 0.34);
    const changes: number[] = [];
    for (let t = 0; t < 3600 * 1000;) {
      const ms = cost(dr.pixelRatio);
      t += ms;
      const r = dr.update(ms);
      if (r !== null) changes.push(r);
    }
    expect(changes.length).toBeLessThanOrEqual(3);
    expect(dr.pixelRatio).toBeLessThan(1);
  });

  it('retries a rejected ratio once the workload gets lighter', () => {
    const dr = new DynamicResolution(cfg, 1);
    let load = 1;
    const cost = (r: number): number => 25 * load * (r > 0.9 ? 1 : 0.34);
    const step = (seconds: number): void => {
      for (let t = 0; t < seconds * 1000;) {
        const ms = cost(dr.pixelRatio);
        t += ms;
        dr.update(ms);
      }
    };
    step(1200);
    expect(dr.pixelRatio).toBeLessThan(1);
    load = 0.4;
    step(600);
    expect(dr.pixelRatio).toBe(1);
  });

  it('ignores hidden-tab gaps', () => {
    const dr = new DynamicResolution(cfg, 1);
    expect(dr.update(5000)).toBeNull();
    expect(dr.frameMs).toBe(0);
  });

  it('is on only for auto-detected tiers unless ?dynres= says otherwise', () => {
    expect(dynamicResolutionEnabled(null, 'setting')).toBe(false);
    expect(dynamicResolutionEnabled(null, 'url')).toBe(false);
    expect(dynamicResolutionEnabled(null, 'auto')).toBe(true);
    expect(dynamicResolutionEnabled('0', 'auto')).toBe(false);
    expect(dynamicResolutionEnabled('1', 'setting')).toBe(true);
  });

  it('caps pixel ratio per tier, with low..high unchanged from before v2', () => {
    const t = DEFAULT_CONFIG.quality.tiers;
    expect([t.low.maxPixelRatio, t.medium.maxPixelRatio, t.high.maxPixelRatio]).toEqual([2, 2, 2]);
    expect(t.ultra.maxPixelRatio).toBeGreaterThan(2);
  });
});
