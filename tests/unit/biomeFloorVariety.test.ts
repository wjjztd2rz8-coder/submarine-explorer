import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, makeConfig } from '../../src/core/Config.js';
import { biomeFor } from '../../src/world/TerrainBiome.js';
import { placeCell } from '../../src/world/scatter/ScatterPlacement.js';
import { SCATTER_TYPES } from '../../src/world/scatter/ScatterTypes.js';

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
    expect([biome.ripple, biome.rippleLenM, biome.rippleDir].every(Number.isFinite)).toBe(true);
    expect(biome.ripple).toBeLessThanOrEqual(1);
  });

  it.each(['low', 'medium', 'high'] as const)(
    'wreck-floor %s density preserves seeded placement, size and embed contracts',
    (tier) => {
      const biome = biomeFor('titanic');
      const { scatterDensity } = makeConfig().terrain.tiers[tier];
      const options = { ...cell, density: scatterDensity };
      const placed = placeCell(-1, 2, flatGround, biome, options);
      expect(placed).toEqual(placeCell(-1, 2, flatGround, biome, options));
      expect(placed.dropstone).not.toEqual(
        placeCell(-1, 2, flatGround, biome, { ...options, seed: cell.seed + 1 }).dropstone,
      );
      // Solitary stones have no clump or patch rejection on ideal ground.
      const expected = (30 * scatterDensity * cell.cellSizeM ** 2) / 1000;
      expect(placed.dropstone!.length).toBeGreaterThanOrEqual(Math.floor(expected));
      expect(placed.dropstone!.length).toBeLessThanOrEqual(Math.ceil(expected));
      const unitSize = placeCell(
        -1,
        2,
        flatGround,
        {
          ...biome,
          scatter: biome.scatter.map((spec) => ({ ...spec, sizeMul: 1 })),
        },
        options,
      );
      for (const spec of biome.scatter) {
        const def = SCATTER_TYPES[spec.kind];
        const instances = placed[spec.kind]!;
        expect(instances.length).toBeGreaterThan(0);
        for (const [index, inst] of instances.entries()) {
          expect(Object.values(inst).every(Number.isFinite)).toBe(true);
          expect(inst.sy).toBeGreaterThan(0);
          expect(inst.y + def.embed * inst.sy).toBeCloseTo(-700, 10);
          const base = unitSize[spec.kind]![index]!;
          const factor = spec.kind === 'dropstone' ? 2.2 : 1;
          expect(inst.sx / base.sx).toBeCloseTo(factor, 10);
          expect(inst.sy / base.sy).toBeCloseTo(factor, 10);
          expect(inst.sz / base.sz).toBeCloseTo(factor, 10);
          // Enlarging stones adjusts embed depth, never the seeded horizontal placement or colour.
          const { sx: _sx, sy: _sy, sz: _sz, y: _y, ...stable } = inst;
          const { sx: _bx, sy: _by, sz: _bz, y: _baseY, ...baseStable } = base;
          expect(stable).toEqual(baseStable);
        }
      }

      const slope = (degrees: number) => ({
        ...flatGround,
        normalAt: (_x: number, _z: number, out: [number, number, number]) => {
          out[0] = Math.sin((degrees * Math.PI) / 180);
          out[1] = Math.cos((degrees * Math.PI) / 180);
          out[2] = 0;
        },
      });
      expect(placeCell(-1, 2, slope(20), biome, options)).toEqual({});
      const gentle = placeCell(-1, 2, slope(12), biome, options);
      expect(gentle.mound).toBeUndefined();
      expect(gentle.dropstone!.length).toBeGreaterThan(0);
      // A late clump member must obey the same footprint exclusion as its seed.
      const kept = placeCell(0, 0, flatGround, biome, {
        ...options,
        exclude: (x) => x >= 32,
      });
      expect(kept.rubble!.length).toBeGreaterThan(0);
      expect(
        Object.values(kept)
          .flat()
          .every((inst) => inst.x < 32),
      ).toBe(true);
    },
  );
});
