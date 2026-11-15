import { expect, it } from 'vitest';
import { Vector3 } from 'three';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { defaultSettings } from '../../src/core/Save.js';
import { EventBus } from '../../src/core/EventBus.js';
import { resolveEffective } from '../../src/game/EffectiveSettings.js';
import { Scanner } from '../../src/game/Scanner.js';
import { Submarine, surveySpeedScale, transitSpeedScale } from '../../src/sub/Submarine.js';
import { FROZEN_INPUT } from '../../src/game/MissionRouter.js';
import { facingCue, turnCue } from '../../src/ui/ScanOverlay.js';

const arcade = resolveEffective(defaultSettings(DEFAULT_CONFIG), 'arcade', null);
const realistic = resolveEffective(defaultSettings(DEFAULT_CONFIG), 'realistic', null);
it('linearly caps arcade speed at 5 m/s inside 100 m and releases at 260 m', () => {
  const c = arcade.submarine;
  expect(surveySpeedScale(c, 100) * c.maxSpeed).toBeCloseTo(5);
  expect(surveySpeedScale(c, 0) * c.maxSpeed).toBeCloseTo(5);
  expect(surveySpeedScale(c, 180) * c.maxSpeed).toBeCloseTo((5 + c.maxSpeed) / 2);
  expect(surveySpeedScale(c, 260)).toBe(1);
  expect(surveySpeedScale(c, Infinity)).toBe(1);
  expect(surveySpeedScale(realistic.submarine, 0)).toBe(1);
});
it('doubles the forward cap beyond 300 m while holding forward, easing to cruise by 180 m', () => {
  const c = arcade.submarine;
  expect(transitSpeedScale(c, 400, 1)).toBe(2);
  expect(transitSpeedScale(c, 300, 1)).toBe(2);
  expect(transitSpeedScale(c, 240, 1)).toBeCloseTo(1.5);
  expect(transitSpeedScale(c, 180, 1)).toBe(1);
  expect(transitSpeedScale(c, 400, 0)).toBe(1);
  expect(transitSpeedScale(c, 400, -1)).toBe(1);
  expect(transitSpeedScale(realistic.submarine, 400, 1)).toBe(1);
});
it('reaches roughly twice cruise thrust far from contacts', () => {
  const c = arcade.submarine;
  const terrain = {
    sampleHeight: () => -10000,
    getNormal: (_x: number, _z: number, out = new Vector3()) => out.set(0, 1, 0),
  };
  const near = new Submarine(c, terrain);
  near.reset(0, -1000, 0);
  near.setSurveyDistance(120);
  const far = new Submarine(c, terrain);
  far.reset(0, -1000, 0);
  far.setSurveyDistance(500);
  const inp = { ...FROZEN_INPUT, throttle: 1 };
  for (let i = 0; i < 120 * 60; i++) {
    near.step(inp, 1 / 60);
    far.step(inp, 1 / 60);
  }
  expect(far.getState().speed).toBeGreaterThan(near.getState().speed * 1.6);
});
it('raises forward cap in transit without affecting vertical limits', () => {
  const c = arcade.submarine;
  const sub = new Submarine(c, {
    sampleHeight: () => -10000,
    getNormal: (_x, _z, out = new Vector3()) => out.set(0, 1, 0),
  });
  sub.reset(0, -1000, 0);
  sub.setSurveyDistance(400);
  sub.velocity.set(30, 0, 0);
  sub.step({ ...FROZEN_INPUT, throttle: 1 }, 1 / 60);
  expect(sub.velocity.length()).toBeGreaterThan(c.maxSpeed * 0.9);
  sub.velocity.set(0, 30, 0);
  sub.step({ ...FROZEN_INPUT, throttle: 1 }, 1 / 60);
  expect(sub.velocity.y).toBeLessThanOrEqual(c.maxVerticalSpeed + 1e-6);
});
it('applies the same scale to vertical speed without mutating settings', () => {
  const c = arcade.submarine;
  const sub = new Submarine(c, {
    sampleHeight: () => -10000,
    getNormal: (_x, _z, out = new Vector3()) => out.set(0, 1, 0),
  });
  sub.reset(0, -1000, 0);
  sub.setSurveyDistance(100);
  sub.velocity.set(30, 30, 0);
  sub.step(FROZEN_INPUT, 1 / 60);
  expect(sub.velocity.length()).toBeLessThanOrEqual(5.00001);
  expect(sub.velocity.y).toBeLessThanOrEqual((c.maxVerticalSpeed * 5) / c.maxSpeed);
  expect(c.maxSpeed).toBeGreaterThan(5);
});
it('only unscanned placed POIs affect survey distance, beyond hint range too', () => {
  const scanner = new Scanner(arcade.scan, new EventBus());
  const target = {
    id: 'p',
    name: 'P',
    landmarkId: 's',
    position: new Vector3(0, 0, -200),
    radius: 1,
    scanSeconds: 1,
  };
  scanner.setTargets([target]);
  scanner.setExtraTargets([{ ...target, id: 'fish', position: new Vector3() }]);
  expect(scanner.nearestUnscannedFixedDistance(new Vector3())).toBe(200);
  scanner.scannedThisDive.add('s/p');
  expect(scanner.nearestUnscannedFixedDistance(new Vector3())).toBe(Infinity);
  scanner.resetDive();
  expect(scanner.nearestUnscannedFixedDistance(new Vector3())).toBe(200);
});
it('explains a rejected hold immediately, once per rejection, and refreshes the cone', () => {
  const bus = new EventBus();
  const reasons: string[] = [];
  bus.on('scan:aborted', (event) => reasons.push(event.reason));
  const scanner = new Scanner(realistic.scan, bus);
  scanner.setTargets([
    {
      id: 'p',
      name: 'P',
      landmarkId: 's',
      position: new Vector3(50, 0, -60),
      radius: 100,
      scanSeconds: 10,
    },
  ]);
  const p = new Vector3();
  const f = new Vector3(0, 0, -1);
  scanner.update(0.1, p, f, true);
  scanner.update(0.1, p, f, true);
  expect(reasons).toEqual(['facing']);
  scanner.setConfig(arcade.scan);
  scanner.update(0.1, p, f, true);
  expect(scanner.isScanning).toBe(true);
  expect(realistic.scan.coneHalfAngleDeg).toBe(35);
  expect(arcade.scan.coneHalfAngleDeg).toBe(45);
});
it('uses plain directions and an explicit facing instruction', () => {
  expect(turnCue(-35)).toBe('Turn left');
  expect(turnCue(90)).toBe('Turn right');
  expect(turnCue(91)).toBe('Turn around');
  expect(facingCue(-35)).toBe('Turn toward the marker · left ←');
});
