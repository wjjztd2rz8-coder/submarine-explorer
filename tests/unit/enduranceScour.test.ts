import { describe, expect, it } from 'vitest';
import { enduranceRidges, enduranceScourHeight } from '../../src/world/presets/EnduranceRelief.js';

describe('Endurance ice-scour ridges (shared by the 3D swells and the sonar)', () => {
  const centre = { x: 10, z: -20 };
  const ridges = enduranceRidges(centre);

  it('is deterministic with ten ridges 45-170 m from the hull', () => {
    expect(ridges).toHaveLength(10);
    expect(enduranceRidges(centre)).toEqual(ridges);
    for (const r of ridges) {
      const d = Math.hypot(r.cx - centre.x, r.cz - centre.z);
      expect(d).toBeGreaterThanOrEqual(55 - 1e-6);
      expect(d).toBeLessThanOrEqual(170 + 1e-6);
    }
  });

  it('peaks on a ridge crest, never exceeds the tallest ridge sum, and is zero far away', () => {
    const r = ridges[0]!;
    const crest = enduranceScourHeight(ridges, r.cx, r.cz);
    expect(crest).toBeGreaterThan(1);
    expect(crest).toBeLessThan(ridges.reduce((a, k) => a + k.height, 0) + 1e-6);
    expect(enduranceScourHeight(ridges, 5000, 5000)).toBe(0);
    expect(enduranceScourHeight(ridges, centre.x, centre.z)).toBeGreaterThanOrEqual(0);
  });
});
