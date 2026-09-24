// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import type { InputState } from '../../src/core/Input.js';
import { startingReserves } from '../../src/game/Power.js';
import { snowFlowStep } from '../../src/render/MarineSnow.js';
import { Submarine } from '../../src/sub/Submarine.js';

const config = DEFAULT_CONFIG;
const terrain = {
  sampleHeight: () => -20000,
  getNormal: (_x: number, _z: number, out = new Vector3()) => out.set(0, 1, 0),
};
const idle = {
  throttle: 0,
  yaw: 0,
  pitch: 0,
  ballast: 0,
  lookDx: 0,
  lookDy: 0,
  toggleCamera: false,
  toggleSonar: false,
  boost: false,
  toggleLights: false,
  ping: false,
  scan: false,
  cycleSimSpeed: false,
  togglePhotoMode: false,
} as InputState;

describe('rated and crush depths', () => {
  it('leaves the Challenger floor calm, warns past rating, and fails past crush', () => {
    const sub = new Submarine(config.submarine, terrain);
    sub.setHullClass('C');
    sub.reset(0, -10931, 0);
    expect(sub.getState().crushWarning).toBe(false);
    expect(sub.getState().hullStress).toBe(0);
    sub.reset(0, -11000, 0);
    expect(sub.getState().crushWarning).toBe(false);
    sub.reset(0, -11050, 0);
    expect(sub.getState().crushWarning).toBe(true);
    sub.reset(0, -12101, 0);
    sub.step(idle, 1 / 60);
    expect(sub.getState().hullBreached).toBe(true);
    expect(sub.getState().emergencyCause).toBe('crush');
  });

  it('rates every mission hull for every cell in its own tile', () => {
    const index = JSON.parse(readFileSync('data/landmarks/index.json', 'utf8')) as {
      landmarks: string[];
    };
    for (const id of index.landmarks) {
      const mission = JSON.parse(readFileSync(`data/landmarks/${id}/mission.json`, 'utf8')) as {
        hull_class: string;
        tile: string;
      };
      const meta = JSON.parse(readFileSync(`data/tiles/${mission.tile}/meta.json`, 'utf8')) as {
        min_m: number;
      };
      const hull = config.submarine.hullClasses[mission.hull_class]!;
      expect(meta.min_m, id).toBeGreaterThanOrEqual(hull.ratedDepth);
      expect(hull.crushDepth, id).toBeLessThan(hull.ratedDepth);
    }
  });
});

describe('descent reserves', () => {
  it('starts full at the surface and uses active descent speed and the supply drain model', () => {
    const { power, descentProfiles } = config;
    expect(startingReserves(0, descentProfiles.research, power)).toEqual({
      battery: 1,
      oxygen: 1,
      descentSeconds: 0,
    });
    const research = startingReserves(3800, descentProfiles.research, power);
    const fast = startingReserves(3800, descentProfiles.fast, power);
    expect(research.descentSeconds).toBe(7600);
    expect(research.battery).toBeLessThan(fast.battery);
    expect(research.oxygen).toBeLessThan(fast.oxygen);
    expect(research.battery).toBeGreaterThan(0);
    expect(startingReserves(10931, descentProfiles.research, power).battery).toBeGreaterThan(0);
    const oneHour = startingReserves(1800, descentProfiles.research, power);
    expect(oneHour.battery).toBeCloseTo(
      1 -
        1.03 *
          (1 / power.batteryIdleHours +
            0.5 / power.batteryThrustHours +
            1 / power.batteryLightsHours),
    );
    expect(oneHour.oxygen).toBeCloseTo(1 - 1.03 / power.oxygenHours);
    expect(startingReserves(100000, descentProfiles.research, power).battery).toBe(0);
  });
});

it('advects snow in the sampled current direction and holds position when off', () => {
  const moved = snowFlowStep({ x: 2, z: -3 }, { x: -0.2, z: 0.1 }, 5);
  expect(moved).toEqual({ x: 1, z: -2.5 });
  expect(snowFlowStep(moved, { x: 0, z: 0 }, 5)).toEqual(moved);
});
