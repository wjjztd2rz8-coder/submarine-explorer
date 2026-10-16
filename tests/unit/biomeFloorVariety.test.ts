import { describe, expect, it } from 'vitest';
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
  it('a canyon floor strews pebbles and carries broad current ripples', () => {
    const biome = biomeFor('monterey-canyon');
    const placed = placeCell(0, 0, flatGround, biome, cell).dropstone ?? [];
    expect(placed.length).toBeGreaterThan(40);
    // Crest spacing readable from the approach, not just underfoot.
    expect(biome.rippleLenM).toBeGreaterThan(1);
    expect(biome.ripple).toBeGreaterThan(0.6);
  });
});
