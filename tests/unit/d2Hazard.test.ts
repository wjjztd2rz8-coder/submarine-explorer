// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import type { InputState } from '../../src/core/Input.js';
import { Power, startingReserves } from '../../src/game/Power.js';
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
  toggleLights: false,
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
    const { power, speedProfiles } = config;
    expect(startingReserves(0, speedProfiles.research, power)).toEqual({
      battery: 1,
      oxygen: 1,
      descentSeconds: 0,
    });
    const research = startingReserves(3800, speedProfiles.research, power);
    const fast = startingReserves(3800, speedProfiles.fast, power);
    expect(research.descentSeconds).toBe(7600);
    expect(research.battery).toBeLessThan(fast.battery);
    expect(research.oxygen).toBeLessThan(fast.oxygen);
    expect(research.battery).toBeGreaterThan(0);
    expect(startingReserves(10931, speedProfiles.research, power).battery).toBeGreaterThan(0);
    const oneHour = startingReserves(1800, speedProfiles.research, power);
    expect(oneHour.battery).toBeCloseTo(
      1 -
        1.03 *
          (1 / power.batteryIdleHours +
            0.5 / power.batteryThrustHours +
            1 / power.batteryLightsHours),
    );
    expect(oneHour.oxygen).toBeCloseTo(1 - 1.03 / power.oxygenHours);
    expect(startingReserves(100000, speedProfiles.research, power).battery).toBe(0);
  });
});

describe('power ascent recovery', () => {
  it('releases controls on surfacing before the emergency lock can expire', () => {
    const sub = new Submarine(config.submarine, terrain);
    sub.reset(0, -config.submarine.hullRadius - 0.01, 0);
    sub.startEmergencyAscent();
    expect(sub.getState().controlLockRemaining).toBe(config.submarine.emergencyBlowLockSeconds);

    // This shallow rescue must finish before the normal lock countdown.
    for (let i = 0; i < 60; i++) sub.step(idle, 1 / 60);
    expect(config.submarine.emergencyBlowLockSeconds).toBeGreaterThan(1);
    expect(sub.position.y).toBe(-config.submarine.hullRadius);
    expect(sub.getState()).toMatchObject({
      emergencyBlow: false,
      emergencyCause: null,
      controlLockRemaining: 0,
      crushWarning: false,
      hullBreached: false,
      hullStress: 0,
    });
    for (let i = 0; i < 60; i++) sub.step({ ...idle, throttle: 1, yaw: 1, ballast: -1 }, 1 / 60);
    expect(sub.yaw).toBeGreaterThan(0);
    expect(sub.position.z).toBeLessThan(0);
    expect(sub.position.y).toBeLessThan(-config.submarine.hullRadius);
    expect(sub.getState().emergencyBlow).toBe(false);
  });

  it('clears an active ascent and its remaining lock when reset for a fresh dive', () => {
    const sub = new Submarine(config.submarine, terrain);
    sub.reset(0, -100, 0);
    sub.startEmergencyAscent();
    sub.step(idle, 1 / 60);
    expect(sub.getState().emergencyBlow).toBe(true);
    expect(sub.getState().controlLockRemaining).toBeGreaterThan(0);
    expect(sub.velocity.y).toBeGreaterThan(0);

    sub.reset(0, -100, 0);
    expect(sub.velocity.length()).toBe(0);
    expect(sub.getState()).toMatchObject({
      emergencyBlow: false,
      emergencyCause: null,
      controlLockRemaining: 0,
      crushWarning: false,
      hullBreached: false,
      hullStress: 0,
    });
    for (let i = 0; i < 60; i++) sub.step({ ...idle, throttle: 1, yaw: 1, ballast: -1 }, 1 / 60);
    expect(sub.yaw).toBeGreaterThan(0);
    expect(sub.position.z).toBeLessThan(0);
    expect(sub.position.y).toBeLessThan(-100);
    expect(sub.getState().emergencyBlow).toBe(false);
  });
});

describe('dive supply boundaries', () => {
  it.each([0, -1, -Number.MAX_VALUE, NaN, Infinity, -Infinity])(
    'preserves both reserves and their warnings for elapsed time %s',
    (dt) => {
      const power = new Power(config.power, true);
      power.setLevels(0.24, 0.09);
      const before = power.state;
      expect(power.step(dt, { throttle: 1, ballast: -1, lights: true, sensors: true })).toBeNull();
      expect(power.state).toEqual(before);
      power.step(1 / 60, { throttle: 0, ballast: 0, lights: false, sensors: false });
      expect(power.state.battery).toBeLessThan(before.battery);
      expect(power.state.oxygen).toBeLessThan(before.oxygen);
      expect(power.state.depleted).toBeNull();
    },
  );

  it.each([1e12, Number.MAX_VALUE])(
    'saturates both supplies at zero for a finite %s second step and stays empty',
    (dt) => {
      for (const load of [
        { throttle: 0, ballast: 0, lights: false, sensors: false },
        { throttle: -1, ballast: 1, lights: true, sensors: true },
      ]) {
        const power = new Power(config.power, true);
        power.step(dt, load);
        expect(power.state).toMatchObject({
          battery: 0,
          oxygen: 0,
          low: ['battery', 'oxygen'],
          critical: ['battery', 'oxygen'],
          depleted: 'battery',
        });
        power.step(1 / 60, load);
        expect(power.state).toMatchObject({ battery: 0, oxygen: 0, depleted: 'battery' });
      }
    },
  );

  it.each([
    { level: 0.250001, low: [], critical: [] },
    { level: 0.25, low: ['battery', 'oxygen'], critical: [] },
    { level: 0.100001, low: ['battery', 'oxygen'], critical: [] },
    { level: 0.1, low: ['battery', 'oxygen'], critical: ['battery', 'oxygen'] },
  ])('classifies both supplies at $level without consuming them', ({ level, low, critical }) => {
    const power = new Power(config.power, true);
    power.setLevels(level, level);
    for (let i = 0; i < 3; i++) {
      expect(power.state).toMatchObject({
        battery: level,
        oxygen: level,
        low,
        critical,
        depleted: null,
      });
    }
  });
});

it('advects snow in the sampled current direction and holds position when off', () => {
  const moved = snowFlowStep({ x: 2, z: -3 }, { x: -0.2, z: 0.1 }, 5);
  expect(moved).toEqual({ x: 1, z: -2.5 });
  expect(snowFlowStep(moved, { x: 0, z: 0 }, 5)).toEqual(moved);
});
