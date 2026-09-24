import { describe, expect, it } from 'vitest';
import { waypointReadout } from '../../src/ui/Waypoints.js';

describe('waypoint readout', () => {
  it('reports slant range, signed depth direction and an in-range cue', () => {
    expect(waypointReadout({ x: 0, y: -100, z: 0 }, { x: 0, y: -110, z: -40 }, 50)).toBe(
      '41 m · ↓10 m · IN RANGE',
    );
    expect(waypointReadout({ x: 0, y: -100, z: 0 }, { x: 0, y: -80, z: -100 }, 50)).toBe(
      '102 m · ↑20 m',
    );
  });
});
