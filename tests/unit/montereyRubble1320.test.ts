import { describe, expect, it } from 'vitest';
import { MONTEREY_RUBBLE } from '../../src/core/config/monterey.js';
import { isSupported, placeRocks, talusSurface } from '../../src/world/props/geo/talus.js';

const apron = {
  gnd: (x: number, z: number) => 0.02 * x + 0.01 * z,
  foot: (x: number) => 2 * Math.sin(x / 20),
  reach: (x: number) => 14 + 4 * Math.cos(x / 15),
  top: () => 4,
  seed: 17,
};
const options = { size: 0.7, blocks: 0.04, span: 0.46, scatter: MONTEREY_RUBBLE };

describe('1320 Monterey rockfall distribution', () => {
  it('retains the requested count with supported runout and a broad size range', () => {
    const rocks = placeRocks(apron, 140, 160, 42, options);
    expect(rocks).toHaveLength(160);
    expect(placeRocks(apron, 140, 160, 42, options)).toEqual(rocks);
    expect(rocks.filter((rock) => rock.u > 1).length).toBeGreaterThan(30);
    expect(rocks.filter((rock) => rock.u < 0.6).length).toBeGreaterThan(20);
    const sizes = rocks.map((rock) => rock.r);
    expect(Math.max(...sizes) / Math.min(...sizes)).toBeGreaterThan(5);
    for (const rock of rocks) {
      expect(isSupported(apron, rock)).toBe(true);
      expect(rock.y).toBe(talusSurface(apron, rock.x, rock.z));
      expect(rock.z).toBeLessThan(apron.foot(rock.x));
    }
  });

  it('leaves gaps between patches instead of overlapping a single row of blocks', () => {
    const rocks = placeRocks(apron, 140, 160, 42, options);
    const nearest = rocks.map((rock, i) =>
      Math.min(
        ...rocks
          .filter((_, j) => i !== j)
          .map((other) => Math.hypot(rock.x - other.x, rock.z - other.z)),
      ),
    );
    expect(Math.min(...nearest)).toBeGreaterThan(0.25);
    expect(Math.max(...nearest)).toBeGreaterThan(3);
    expect(Math.max(...nearest) / Math.min(...nearest)).toBeGreaterThan(5);
  });
});
