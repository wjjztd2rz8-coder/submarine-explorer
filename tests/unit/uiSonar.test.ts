/**
 * F2 (QA-A #1): the sonar canvas takes the tile's aspect, so the map fills it
 * with no transparent letterbox, and world positions still land on the right
 * pixels. Pure helpers; the canvas itself is covered by tests/e2e/mission.spec.ts.
 */

import { describe, expect, it } from 'vitest';
import {
  canSonarWheelStep,
  easeSonarRange,
  sonarCanvasSize,
  sonarContourInterval,
  sonarFlatProfile,
  sonarLocalContourInterval,
  sonarPoiIcon,
  sonarPoiVisible,
  sonarProject,
  sonarProjectZoomed,
  sonarReliefRange,
} from '../../src/ui/Sonar.js';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';

describe('sonar canvas sizing', () => {
  it('portrait tile (Titanic, ~25 x 33 km): 220 px tall, narrower wide', () => {
    const s = sonarCanvasSize(25_000, 33_400, 220);
    expect(s.height).toBe(220);
    expect(s.width).toBe(Math.round((220 * 25_000) / 33_400));
  });

  it('landscape tile: 220 px wide', () => {
    expect(sonarCanvasSize(40_000, 39_000 / 1.25, 220)).toEqual({ width: 220, height: 172 });
  });

  it('square and degenerate tiles', () => {
    expect(sonarCanvasSize(10, 10, 220)).toEqual({ width: 220, height: 220 });
    expect(sonarCanvasSize(0, 0, 220)).toEqual({ width: 220, height: 220 });
  });

  it('projection maps the tile corners to the canvas corners (north up)', () => {
    const W = 25_000;
    const D = 33_400;
    const { width, height } = sonarCanvasSize(W, D, 220);
    expect(sonarProject(-W / 2, -D / 2, W, D, width, height)).toEqual({ px: 0, py: 0 }); // NW
    expect(sonarProject(W / 2, D / 2, W, D, width, height)).toEqual({ px: width, py: height }); // SE
    const c = sonarProject(0, 0, W, D, width, height);
    expect(c.px).toBeCloseTo(width / 2, 9);
    expect(c.py).toBeCloseTo(height / 2, 9);
  });
});

describe('D-SONAR sub-centred map', () => {
  it('eases zoom through intermediate ranges in both directions', () => {
    expect(easeSonarRange(1000, 500, 0)).toBe(1000);
    expect(easeSonarRange(1000, 500, 0.5)).toBeCloseTo(Math.sqrt(500_000));
    expect(easeSonarRange(1000, 500, 1)).toBe(500);
    expect(easeSonarRange(500, 1000, 0.5)).toBeCloseTo(Math.sqrt(500_000));
  });

  it('allows one wheel zoom step per 150 ms', () => {
    expect(canSonarWheelStep(1000, -Infinity)).toBe(true);
    expect(canSonarWheelStep(1149, 1000)).toBe(false);
    expect(canSonarWheelStep(1150, 1000)).toBe(true);
  });
  it('starts at a 1 km span and offers every contracted range plus the tile', () => {
    expect(DEFAULT_CONFIG.sonarZoom.initial).toBe(1000);
    expect(DEFAULT_CONFIG.sonarZoom.levels).toEqual([250, 500, 1000, 2000, 'tile']);
  });

  it('centres the sub and keeps north above east at each metric zoom', () => {
    for (const span of [250, 500, 1000, 2000]) {
      expect(sonarProjectZoomed(400, -200, 400, -200, span, 165, 220)).toEqual({
        px: 82.5,
        py: 110,
      });
      const north = sonarProjectZoomed(400, -200 - span / 4, 400, -200, span, 165, 220);
      const east = sonarProjectZoomed(400 + span / 4, -200, 400, -200, span, 165, 220);
      expect(north.py).toBe(55);
      expect(east.px).toBe(137.5);
    }
  });

  it('limits contacts to sensor range and visible map area', () => {
    expect(sonarPoiVisible(499, 500, 100, 100, 220, 220)).toBe(true);
    expect(sonarPoiVisible(501, 500, 100, 100, 220, 220)).toBe(false);
    expect(sonarPoiVisible(100, 500, -1, 100, 220, 220)).toBe(false);
  });

  it('gives scanned state priority over current objective', () => {
    expect(sonarPoiIcon(false, false)).toBe('·');
    expect(sonarPoiIcon(false, true)).toBe('◇');
    expect(sonarPoiIcon(true, true)).toBe('✓');
  });

  it('normalises local metres with a noise floor rather than the tile range', () => {
    expect(sonarReliefRange(-3810, -3790, 20)).toEqual({ low: -3810, span: 20 });
    expect(sonarReliefRange(-3802, -3798, 20)).toEqual({ low: -3810, span: 20 });
    expect(sonarReliefRange(-4300, -3700, 20)).toEqual({ low: -4300, span: 600 });
  });

  it('adapts contour intervals to actual relief without sub-metre noise', () => {
    expect(sonarContourInterval(25, 10, 20)).toBe(2);
    expect(sonarContourInterval(25, 100, 20)).toBe(20);
    expect(sonarContourInterval(100, 2000, 20)).toBe(100);
    expect(sonarContourInterval(5, 1, 20)).toBe(Infinity);
  });
});

describe('flat-site sonar relief', () => {
  it('leaves relief-rich views (Blue Hole, ~0.12 m/m) untouched', () => {
    const p = sonarFlatProfile(122, 1000);
    expect(p).toEqual({ flatness: 0, gainBoost: 1, tint: 0 });
    expect(sonarLocalContourInterval(10, 122, 20, p.flatness)).toBe(
      sonarContourInterval(10, 122, 20),
    );
  });

  it('boosts shading and tint on near-flat plains', () => {
    const titanic = sonarFlatProfile(9, 1000);
    expect(titanic.flatness).toBe(1);
    expect(titanic.gainBoost).toBeGreaterThan(5);
    expect(titanic.gainBoost).toBeLessThanOrEqual(16);
    expect(titanic.tint).toBeGreaterThan(0);
    expect(sonarFlatProfile(0, 1000).gainBoost).toBe(16);
    expect(sonarFlatProfile(6, 1000).gainBoost).toBeCloseTo(0.08 / 0.006);
  });

  it('chooses about six contours across the local relief, never below 1 m', () => {
    expect(sonarLocalContourInterval(25, 9, 20, 1)).toBe(2);
    expect(sonarLocalContourInterval(25, 6, 20, 1)).toBe(1);
    expect(sonarLocalContourInterval(100, 596, 20, 1)).toBe(100);
    expect(sonarLocalContourInterval(5, 1, 20, 1)).toBe(Infinity);
  });

  it('preserves the existing interval as the relief reaches the flatness boundary', () => {
    for (const relief of [60, 122, 300, 596]) {
      const { flatness } = sonarFlatProfile(relief, 1000);
      expect(flatness).toBe(0);
      expect(sonarLocalContourInterval(25, relief, 20, flatness)).toBe(
        sonarContourInterval(25, relief, 20),
      );
    }
    const almostSteep = sonarFlatProfile(59.99, 1000);
    expect(sonarLocalContourInterval(25, 59.99, 20, almostSteep.flatness)).toBe(
      sonarContourInterval(25, 59.99, 20),
    );
  });

  it('honours the line budget and noise floor on flat views at every range', () => {
    for (const view of [250, 500, 1000, 2000, 33000]) {
      const relief = view * 0.01;
      const { flatness } = sonarFlatProfile(relief, view);
      for (const budget of [1, 3, 6, 20]) {
        const interval = sonarLocalContourInterval(25, relief, budget, flatness);
        expect(interval).toBeGreaterThanOrEqual(1);
        expect(Math.ceil(relief / interval)).toBeLessThanOrEqual(budget);
      }
    }
    for (const relief of [0, 0.5, 1.99])
      expect(sonarLocalContourInterval(25, relief, 20, 1)).toBe(Infinity);
    expect(sonarLocalContourInterval(25, 2, 20, 1)).toBe(1);
  });

  it('fades gain and tint with local slope independently of zoom or absolute depth', () => {
    const mid = sonarFlatProfile(40, 1000);
    expect(mid.flatness).toBeCloseTo(0.5);
    expect(mid.tint).toBeCloseTo(0.12);
    expect(mid.gainBoost).toBeCloseTo(1.5);
    expect(sonarFlatProfile(20, 500)).toEqual(mid);
    expect(sonarFlatProfile(60, 1000)).toEqual({ flatness: 0, gainBoost: 1, tint: 0 });
  });
});
