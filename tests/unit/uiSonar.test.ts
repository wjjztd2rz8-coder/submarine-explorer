/**
 * F2 (QA-A #1): the sonar canvas takes the tile's aspect, so the map fills it
 * with no transparent letterbox, and world positions still land on the right
 * pixels. Pure helpers; the canvas itself is covered by tests/e2e/mission.spec.ts.
 */

import { describe, expect, it } from 'vitest';
import { sonarCanvasSize, sonarProject } from '../../src/ui/Sonar.js';

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
