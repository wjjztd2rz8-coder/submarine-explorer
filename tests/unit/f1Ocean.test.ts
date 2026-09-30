import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, GRAPHICS_TIERS } from '../../src/core/Config.js';
import { godRayStrength } from '../../src/app/systems/render.js';

describe('F1-OCEAN', () => {
  it('god rays are off above the surface and in the deep, strongest in the shallows', () => {
    const base = 0.35;
    expect(godRayStrength(base, 5)).toBe(0);
    expect(godRayStrength(base, -1000)).toBe(0);
    expect(godRayStrength(base, -15)).toBeGreaterThan(godRayStrength(base, -120));
    expect(godRayStrength(base, -15)).toBeCloseTo(base, 5);
  });

  it('every tier has bounded post knobs, and richer tiers never have less', () => {
    const tiers = DEFAULT_CONFIG.water.tiers;
    const order = GRAPHICS_TIERS;
    for (let i = 1; i < order.length; i++) {
      const lo = tiers[order[i - 1]!];
      const hi = tiers[order[i]!];
      expect(hi.bloomLevels).toBeGreaterThanOrEqual(lo.bloomLevels);
      expect(hi.rayOctaves).toBeGreaterThanOrEqual(lo.rayOctaves);
      expect(hi.beamDetail).toBeGreaterThanOrEqual(lo.beamDetail);
      expect(hi.msaa).toBeGreaterThanOrEqual(lo.msaa);
      expect(hi.snowCount).toBeGreaterThanOrEqual(lo.snowCount);
    }
    // The low tier skips the post stack entirely, so its post knobs must be zero.
    expect(tiers.low.post).toBe(false);
    expect(tiers.low.bloomLevels + tiers.low.rayOctaves + tiers.low.msaa).toBe(0);
  });
});
