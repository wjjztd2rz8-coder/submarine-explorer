import { describe, expect, it } from 'vitest';
import { biomeFor } from '../../src/world/TerrainBiome.js';

describe('lost-city biome', () => {
  const b = biomeFor('lost-city');
  it('scatters talus blocks and rubble larger than the default, on slopes', () => {
    const rubble = b.scatter.find((s) => s.kind === 'rubble');
    const boulder = b.scatter.find((s) => s.kind === 'boulder');
    expect(rubble?.sizeMul).toBeGreaterThan(1);
    expect(boulder?.sizeMul).toBeGreaterThan(1);
    expect(rubble!.slopeMaxDeg).toBeGreaterThanOrEqual(40);
  });
  it('bands its slopes', () => {
    expect(b.strata?.periodM).toBeGreaterThan(0);
    expect(b.strata?.amount).toBeGreaterThan(0);
  });
});
