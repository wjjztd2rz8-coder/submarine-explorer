import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { biomeFor } from '../../src/world/TerrainBiome.js';
import { placeCell } from '../../src/world/scatter/ScatterPlacement.js';

const flatGround = {
  sampleHeight: () => -700,
  normalAt: (_x: number, _z: number, out: [number, number, number]) => {
    out[0] = 0;
    out[1] = 1;
    out[2] = 0;
  },
  contains: () => true,
};
const cell = { cellSizeM: 64, density: 1, rockLo: 0.05, rockHi: 0.3, seed: 7 };

describe('open sediment floor variety', () => {
  it.each(['low', 'medium', 'high'] as const)(
    '%s: a canyon floor retains cobbles, sand patches and broad current ripples',
    (tier) => {
      const biome = biomeFor('monterey-canyon');
      const density = DEFAULT_CONFIG.terrain.tiers[tier].scatterDensity;
      const placed = placeCell(0, 0, flatGround, biome, { ...cell, density }).dropstone ?? [];
      expect(placed.length).toBeGreaterThan(40 * density);
      const small = placeCell(
        0,
        0,
        flatGround,
        {
          ...biome,
          scatter: biome.scatter.map((spec) => ({ ...spec, sizeMul: 1 })),
        },
        { ...cell, density },
      ).dropstone!;
      expect(small).toHaveLength(placed.length);
      // The same seeds retain their locations while the authored cobbles stay visible.
      for (let i = 0; i < placed.length; i++) {
        expect(placed[i].x).toBe(small[i].x);
        expect(placed[i].z).toBe(small[i].z);
        expect(placed[i].sx / small[i].sx).toBeGreaterThan(2);
      }
      expect(biome.a).not.toBe(biome.b);
      expect(biome.colorA).not.toBe(biome.colorB);
      expect(biome.patch).toBeGreaterThan(0.5);
      // Crest spacing readable from the approach, not just underfoot.
      expect(biome.rippleLenM).toBeGreaterThan(1);
      expect(biome.ripple).toBeGreaterThan(0.6);
    },
  );

  it('the wreck-site abyssal plain strews debris and carries visible ripples', () => {
    const biome = biomeFor('titanic');
    expect(placeCell(0, 0, flatGround, biome, cell).dropstone?.length).toBeGreaterThan(40);
    expect(placeCell(0, 0, flatGround, biome, cell).rubble?.length).toBeGreaterThan(10);
    expect(biome.rippleLenM).toBeGreaterThan(1);
    expect(biome.ripple).toBeGreaterThan(0.6);
  });
});
