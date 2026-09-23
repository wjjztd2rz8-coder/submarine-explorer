/**
 * Fix S (QA-B) submarine checks:
 *  - #3a constraint order: the seabed push-out runs before the surface clamp,
 *    so shallow water no longer lifts the hull out of the sea;
 *  - #15 turn rate at 2x/3x sim speed stays at the 1x real rate unless
 *    `simSpeedScalesTurnRate` is set.
 */

import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { DEFAULT_CONFIG, makeConfig } from '../../src/core/Config.js';
import type { InputState } from '../../src/core/Input.js';
import { FROZEN_INPUT } from '../../src/game/MissionRouter.js';
import { Submarine, type HeightField } from '../../src/sub/Submarine.js';

const DT = 1 / 60;
const cfg = DEFAULT_CONFIG.submarine;
const R = cfg.hullRadius;

const flat = (y: number): HeightField => ({
  sampleHeight: () => y,
  getNormal: (_x, _z, out = new Vector3()) => out.set(0, 1, 0),
});
const input = (p: Partial<InputState> = {}): InputState => ({ ...FROZEN_INPUT, ...p });
const run = (sub: Submarine, i: InputState, frames: number): void => {
  for (let n = 0; n < frames; n++) sub.step(i, DT);
};

describe('QA-B #3a shallow water: seabed first, surface last', () => {
  it('-6 m seabed: the hull cannot float, so it rests aground at ground + hullRadius', () => {
    const sub = new Submarine(cfg, flat(-6));
    sub.reset(0, -R, 0);
    run(sub, input({ ballast: 1 }), 120); // blowing tanks the whole time
    // Old order: clamp to -8, then push-out to -6 + 12 = +6 (hull lifted 6 m clear of the sea).
    expect(sub.position.y).toBeCloseTo(-6 + R, 6);
    expect(sub.position.y).toBeLessThan(-6 + R + cfg.seabedClearance);
    // Resting aground is not a collision storm.
    run(sub, input(), 60);
    expect(sub.getState().touchedBottom).toBe(false);
  });

  it('-18 m seabed: room for the hull, so it stays submerged at the surface ceiling', () => {
    const sub = new Submarine(cfg, flat(-18));
    sub.reset(0, -R, 0);
    run(sub, input({ ballast: 1 }), 120);
    // Old order would have lifted it to -18 + 12 = -6, above the -8 ceiling.
    expect(sub.position.y).toBeCloseTo(-R, 6);
    expect(sub.position.y).toBeGreaterThanOrEqual(-18 + R); // never inside the rock
    // Flooding sinks it to the relaxed floor and no further.
    run(sub, input({ ballast: -1 }), 240);
    expect(sub.position.y).toBeGreaterThanOrEqual(sub.floorFor(-18) - 1e-6);
  });

  it('deep water is unchanged: full clearance floor and the -hullRadius ceiling', () => {
    const sub = new Submarine(cfg, flat(-500));
    expect(sub.floorFor(-500)).toBe(-500 + R + cfg.seabedClearance);
    sub.reset(0, -20, 0);
    run(sub, input({ ballast: 1 }), 600);
    expect(sub.position.y).toBeCloseTo(-R, 6);
    sub.reset(0, -480, 0);
    run(sub, input({ ballast: -1 }), 600);
    expect(sub.position.y).toBeCloseTo(-500 + R + cfg.seabedClearance, 1);
  });

  it('the relaxed floor is continuous in seabed depth', () => {
    const sub = new Submarine(cfg, flat(-100));
    for (let g = -30; g <= 0; g += 0.25) {
      expect(Math.abs(sub.floorFor(g) - sub.floorFor(g - 0.25))).toBeLessThanOrEqual(0.25 + 1e-9);
    }
  });
});

describe('QA-B #15 turn rate at sim speed', () => {
  const yawAfter = (c: typeof cfg, speed: number, frames: number): number => {
    const sub = new Submarine(c, flat(-5000));
    sub.setSimSpeed(speed);
    sub.reset(0, -1000, 0);
    run(sub, input({ yaw: 1 }), frames);
    return sub.yaw;
  };

  it('default: 3x turns at the same real-time rate as 1x (per rendered frame)', () => {
    expect(cfg.simSpeedScalesTurnRate).toBe(false);
    // Sustained rate: the second second of frames, after spin-up.
    const at1 = yawAfter(cfg, 1, 120) - yawAfter(cfg, 1, 60);
    const at3 = yawAfter(cfg, 3, 120) - yawAfter(cfg, 3, 60);
    expect(at1).toBeCloseTo(cfg.yawRate, 1);
    expect(at3 / at1).toBeGreaterThan(0.95);
    expect(at3 / at1).toBeLessThan(1.05);
  });

  it('flag on: the Phase A behaviour, 3x turns three times as fast', () => {
    const scaled = makeConfig({ submarine: { ...cfg, simSpeedScalesTurnRate: true } }).submarine;
    const sustained = (speed: number): number =>
      yawAfter(scaled, speed, 120) - yawAfter(scaled, speed, 60);
    const ratio = sustained(3) / sustained(1);
    expect(ratio).toBeGreaterThan(2.8);
    expect(ratio).toBeLessThan(3.2);
  });

  it('translation still speeds up at 3x', () => {
    const dist = (speed: number): number => {
      const sub = new Submarine(cfg, flat(-5000));
      sub.setSimSpeed(speed);
      sub.reset(0, -1000, 0);
      run(sub, input({ throttle: 1 }), 120);
      return -sub.position.z;
    };
    expect(dist(3) / dist(1)).toBeGreaterThan(2.5);
  });
});
