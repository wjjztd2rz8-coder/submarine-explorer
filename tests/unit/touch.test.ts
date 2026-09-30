import { describe, expect, it } from 'vitest';
import {
  classifyDevice,
  DoubleTap,
  isTap,
  pinchWheelDelta,
  sliderAxis,
  STICK_DEAD_ZONE,
  stickAxes,
} from '../../src/core/Touch.js';

describe('stickAxes', () => {
  it('is zero inside the dead zone', () => {
    expect(stickAxes(2, -2, 60)).toEqual({ throttle: 0, yaw: 0 });
    expect(stickAxes(60 * STICK_DEAD_ZONE * 0.9, 0, 60).yaw).toBe(0);
  });
  it('maps up to ahead and right to starboard', () => {
    const a = stickAxes(0, -60, 60);
    expect(a.throttle).toBeCloseTo(1);
    expect(a.yaw).toBeCloseTo(0);
    expect(stickAxes(60, 0, 60).yaw).toBeCloseTo(1);
    expect(stickAxes(0, 60, 60).throttle).toBeCloseTo(-1);
  });
  it('clamps past the radius and keeps direction', () => {
    const a = stickAxes(300, -300, 60);
    expect(Math.hypot(a.yaw, a.throttle)).toBeCloseTo(1);
    expect(a.yaw).toBeCloseTo(a.throttle);
  });
  it('tolerates a zero radius', () => {
    expect(stickAxes(5, 5, 0)).toEqual({ throttle: 0, yaw: 0 });
  });
});

describe('sliderAxis', () => {
  it('is neutral in the middle and full at the ends', () => {
    expect(sliderAxis(0.5)).toBe(0);
    expect(sliderAxis(0)).toBe(1);
    expect(sliderAxis(1)).toBe(-1);
    expect(sliderAxis(-4)).toBe(1);
  });
});

describe('DoubleTap', () => {
  it('fires on the second close tap only', () => {
    const d = new DoubleTap();
    expect(d.tap(1000, 100, 100)).toBe(false);
    expect(d.tap(1200, 110, 105)).toBe(true);
    expect(d.tap(1300, 110, 105)).toBe(false);
  });
  it('ignores slow or distant taps', () => {
    const d = new DoubleTap();
    d.tap(0, 0, 0);
    expect(d.tap(900, 0, 0)).toBe(false);
    expect(d.tap(1000, 300, 0)).toBe(false);
  });
});

describe('pinch and helpers', () => {
  it('zooms in (negative) when fingers spread', () => {
    expect(pinchWheelDelta(100, 150)).toBeLessThan(0);
    expect(pinchWheelDelta(150, 100)).toBeGreaterThan(0);
    expect(pinchWheelDelta(0, 100)).toBe(0);
  });
  it('recognises taps', () => {
    expect(isTap(120, 3)).toBe(true);
    expect(isTap(500, 3)).toBe(false);
    expect(isTap(100, 40)).toBe(false);
  });
  it('classifies devices', () => {
    expect(classifyDevice(false, 1920, 1080)).toBe('desktop');
    expect(classifyDevice(true, 390, 844)).toBe('phone');
    expect(classifyDevice(true, 820, 1180)).toBe('tablet');
  });
});

describe('service worker registration', () => {
  it('registers only in secure production pages outside automation', async () => {
    const { shouldRegisterServiceWorker: reg } = await import('../../src/core/Pwa.js');
    expect(reg(true, false, true, true)).toBe(true);
    expect(reg(false, false, true, true)).toBe(false);
    expect(reg(true, true, true, true)).toBe(false);
    expect(reg(true, false, false, true)).toBe(false);
    expect(reg(true, false, true, false)).toBe(false);
  });
});
