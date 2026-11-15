/** Touch pitch is an attitude the sub steers to: capped, self-levelling, and no drag on climbs. */

import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import type { InputState } from '../../src/core/Input.js';
import { Submarine, type HeightField } from '../../src/sub/Submarine.js';

const DT = 1 / 60;
const cfg = DEFAULT_CONFIG.submarine;
const deg = (r: number): number => (r * 180) / Math.PI;

function input(partial: Partial<InputState> = {}): InputState {
  return {
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
    ...partial,
  };
}

const deepSeabed: HeightField = {
  sampleHeight: () => -5000,
  getNormal: (_x, _z, out = new Vector3()) => out.set(0, 1, 0),
};

function makeSub(): Submarine {
  const sub = new Submarine(cfg, deepSeabed);
  sub.position.set(0, -500, 0);
  return sub;
}

function run(sub: Submarine, state: InputState, seconds: number): void {
  for (let i = 0; i < seconds / DT; i++) sub.step(state, DT);
}

describe('touch pitch attitude', () => {
  it('caps the nose-down angle at the touch limit however long it is held', () => {
    const sub = makeSub();
    run(sub, input({ pitchAim: -1, throttle: 1, ballast: -1 }), 10);
    expect(deg(sub.pitch)).toBeGreaterThanOrEqual(-20);
    expect(deg(sub.pitch)).toBeLessThan(-14);
  });

  it('levels itself within about a second of release', () => {
    const sub = makeSub();
    run(sub, input({ pitchAim: -1, throttle: 1, ballast: -1 }), 4);
    run(sub, input({ pitchAim: 0 }), 1.5);
    expect(Math.abs(deg(sub.pitch))).toBeLessThan(2);
  });

  it('pushing the slider up levels the nose and tilts it at most 10 degrees up', () => {
    const sub = makeSub();
    run(sub, input({ pitchAim: -1, throttle: 1, ballast: -1 }), 4);
    run(sub, input({ pitchAim: 1, ballast: 1 }), 2);
    expect(deg(sub.pitch)).toBeGreaterThan(0);
    expect(deg(sub.pitch)).toBeLessThanOrEqual(10.5);
  });

  it('climbs at the same speed from level and from nose-down', () => {
    const climb = (startPitch: number): number => {
      const sub = makeSub();
      sub.pitch = startPitch;
      run(sub, input({ pitchAim: 1, ballast: 1 }), 8);
      return sub.velocity.y;
    };
    const level = climb(0);
    expect(level).toBeGreaterThan(1);
    expect(climb((-17 * Math.PI) / 180)).toBeCloseTo(level, 1);
  });

  it('leaves keyboard pitch (a rate, pitchAim unset) alone', () => {
    const sub = makeSub();
    run(sub, input({ pitch: -1 }), 2);
    const held = sub.pitch;
    expect(deg(held)).toBeLessThan(-20);
    run(sub, input(), 2);
    // It coasts a little as the rate dies away, but never returns to level.
    expect(deg(sub.pitch)).toBeLessThan(-20);
  });
});
