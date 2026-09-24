/**
 * F2 (QA-A #1): the sonar canvas takes the tile's aspect, so the map fills it
 * with no transparent letterbox, and world positions still land on the right
 * pixels. Pure helpers; the canvas itself is covered by tests/e2e/mission.spec.ts.
 */

import { describe, expect, it } from 'vitest';
import {
  sonarCanvasSize,
  sonarContourInterval,
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
