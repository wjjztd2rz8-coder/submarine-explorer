import { describe, expect, it } from 'vitest';
import { BIOMES } from '../../src/world/TerrainBiome.js';
import { SCATTER_TYPES } from '../../src/world/scatter/ScatterTypes.js';
import { ledgeGeometry, tubeSpongeGeometry } from '../../src/world/scatter/ScatterGeometry.js';

describe('Blue Hole overhangs and benthos', () => {
  it('ledge slab is wide, flat and has a darker underside', () => {
    const g = ledgeGeometry();
    g.computeBoundingBox();
    const b = g.boundingBox!;
    expect(b.max.x - b.min.x).toBeGreaterThan(2 * (b.max.y - b.min.y));
    const n = g.getAttribute('normal');
    const c = g.getAttribute('color');
    let down = 0;
    let up = 0;
    let nd = 0;
    let nu = 0;
    for (let i = 0; i < n.count; i++) {
      if (n.getY(i) < -0.3) (down += c.getX(i)), nd++;
      else if (n.getY(i) > 0.3) (up += c.getX(i)), nu++;
    }
    expect(nd).toBeGreaterThan(0);
    expect(down / nd).toBeLessThan(0.75 * (up / nu));
  });
  it('tube sponge is a closed, finite, upright capsule', () => {
    const g = tubeSpongeGeometry();
    g.computeBoundingBox();
    expect(g.boundingBox!.min.y).toBeGreaterThanOrEqual(-1e-6);
    expect(g.boundingBox!.max.y).toBeCloseTo(1, 1);
    for (const v of g.getAttribute('position').array) expect(Number.isFinite(v)).toBe(true);
  });
  it('the Blue Hole biome scatters both new kinds with registered types', () => {
    const kinds = Object.values(BIOMES['great-blue-hole']!.scatter!).map((s) => s.kind);
    expect(kinds).toContain('ledge');
    expect(kinds).toContain('tube');
    expect(SCATTER_TYPES.ledge.size[0]).toBeGreaterThan(SCATTER_TYPES.sponge.size[1]);
  });
});
