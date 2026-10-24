/** Guard HUD depth signs, hull ratings and seabed proximity warnings. */

import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { FROZEN_INPUT } from '../../src/game/MissionRouter.js';
import { spawnHeight, spawnSettings } from '../../src/game/Spawn.js';
import { Submarine } from '../../src/sub/Submarine.js';
import {
  formatDepth,
  formatTileLine,
  seabedWarning,
  uiScaleFactors,
  type HudWarnConfig,
} from '../../src/ui/HUD.js';

const s = DEFAULT_CONFIG.submarine;
const W: HudWarnConfig = {
  hullRadius: s.hullRadius,
  seabedWarnAltitudeM: s.seabedWarnAltitudeM,
  seabedWarnTimeToContactS: s.seabedWarnTimeToContactS,
  seabedApproachAltitudeM: s.seabedApproachAltitudeM,
  contactAltitudeM: s.hullRadius + s.seabedClearance,
};

describe('formatDepth', () => {
  it('a boat above the water never reads as a positive depth', () => {
    expect(formatDepth(6.6, 8)).toBe('0 m · SURFACED');
    expect(formatDepth(-8, 8)).toBe('8 m · SURFACED');
    expect(formatDepth(-9, 8)).toBe('9 m');
    expect(formatDepth(-3812.4, 8)).toBe('3812 m');
    expect(Number.parseFloat(formatDepth(-8, 8))).toBe(8);
  });
});

describe('depth and hull reporting at input boundaries', () => {
  it.each([NaN, Infinity, -Infinity, -1, -1000, 0])(
    'rejects depth request %s before it can corrupt HUD or hull state',
    (requestedDepth) => {
      const terrain = {
        sampleHeight: () => -500,
        getNormal: (_x: number, _z: number, out = new Vector3()) => out.set(0, 1, 0),
      };
      const settings = spawnSettings(DEFAULT_CONFIG);
      const y = spawnHeight(-500, requestedDepth, settings);
      expect(y).toBe(spawnHeight(-500, null, settings));
      const sub = new Submarine(s, terrain);
      sub.reset(0, y, 0);
      sub.step(FROZEN_INPUT, 1 / 60);
      const state = sub.getState();
      for (const value of [state.depth, state.altitude, state.crushRatio, state.ratedRatio]) {
        expect(Number.isFinite(value)).toBe(true);
      }
      expect(Number.isFinite(Number.parseFloat(formatDepth(state.depth, s.hullRadius)))).toBe(true);
      expect(state.hullStress).toBe(0);
      expect(state.hullBreached).toBe(false);
      expect(state.emergencyBlow).toBe(false);
    },
  );

  it.each(Object.entries(s.hullClasses))(
    'keeps the exact %s operating rating quiet and warns immediately below it',
    (classId, hull) => {
      const sub = new Submarine(s, {
        sampleHeight: () => -20000,
        getNormal: (_x, _z, out = new Vector3()) => out.set(0, 1, 0),
      });
      sub.setHullClass(classId);
      sub.reset(0, hull.ratedDepth, 0);
      expect(sub.getState()).toMatchObject({ ratedRatio: 1, crushWarning: false, hullStress: 0 });
      sub.step(FROZEN_INPUT, 1 / 60);
      expect(sub.getState()).toMatchObject({ hullBreached: false, emergencyBlow: false });
      sub.reset(0, hull.ratedDepth - 1, 0);
      const warning = sub.getState();
      expect(warning.crushWarning).toBe(true);
      expect(warning.hullStress).toBeGreaterThan(0);
      expect(warning.hullStress).toBeLessThan(1);
      expect(warning.hullBreached).toBe(false);
    },
  );

  it('clamps an extreme finite depth request above the trench floor without pressure damage', () => {
    const ground = -10931;
    const sub = new Submarine(s, {
      sampleHeight: () => ground,
      getNormal: (_x, _z, out = new Vector3()) => out.set(0, 1, 0),
    });
    sub.setHullClass('C');
    sub.reset(0, spawnHeight(ground, Number.MAX_VALUE, spawnSettings(DEFAULT_CONFIG)), 0);
    sub.step(FROZEN_INPUT, 1 / 60);
    const state = sub.getState();
    expect(state.altitude).toBeGreaterThanOrEqual(s.hullRadius + s.seabedClearance);
    expect(state.ratedRatio).toBeLessThan(1);
    expect(Number.parseFloat(formatDepth(state.depth, s.hullRadius))).toBeGreaterThan(10800);
    expect(state).toMatchObject({ hullStress: 0, hullBreached: false, emergencyBlow: false });
  });
});

describe('seabedWarning', () => {
  it('wreck inspection altitudes (12-25 m) are quiet near a scan target', () => {
    for (const alt of [12.5, 14, 18, 25]) expect(seabedWarning(alt, 0, W, true)).toBe(false);
    expect(seabedWarning(18, 0, W, false)).toBe(false); // above the 15 m static threshold
    expect(seabedWarning(13, 0, W, false)).toBe(true); // genuinely close, no target
  });

  it('a fast approach always warns, target or not', () => {
    // 40 m up, sinking 8 m/s: contact at 12 m in 3.5 s.
    expect(seabedWarning(40, -8, W, true)).toBe(true);
    expect(seabedWarning(40, -2, W, true)).toBe(false); // 14 s away
    expect(seabedWarning(40, 3, W, false)).toBe(false); // rising
    expect(seabedWarning(200, -20, W, false)).toBe(false); // above the approach band
  });
});

describe('formatTileLine', () => {
  it('shows the fitted hull class and rating', () => {
    const meta = { id: 'challenger-deep', cols: 10, rows: 10 };
    expect(formatTileLine(meta, 'C', -11000)).toBe('challenger-deep · hull C 11,000 m');
    expect(formatTileLine(meta, 'C', -11000, 'at rating limit')).toBe(
      'challenger-deep · hull C 11,000 m · at rating limit',
    );
  });
});

describe('UI scale factors', () => {
  it('clamps viewport and saved scale independently', () => {
    expect(uiScaleFactors(1280, 150)).toEqual({ auto: 0.8, user: 1.5 });
    expect(uiScaleFactors(1920, 100)).toEqual({ auto: 1, user: 1 });
    expect(uiScaleFactors(3000, 60)).toEqual({ auto: 1.25, user: 0.8 });
  });
});
