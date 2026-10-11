import { Vector3 } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import type { PlacedPoi } from '../../src/game/Pois.js';
import type { SubmarineState } from '../../src/sub/Submarine.js';
import { Sonar } from '../../src/ui/Sonar.js';
import { Terrain } from '../../src/world/Terrain.js';
import { makeSyntheticTile } from './helpers.js';
import { recordSonarCanvas } from './helpers/sonarCanvas.js';

afterEach(() => vi.unstubAllGlobals());

function setup(flatness = 1) {
  vi.unstubAllGlobals();
  const terrain = new Terrain(makeSyntheticTile(), DEFAULT_CONFIG.terrain, 'low');
  const recorded = recordSonarCanvas();
  vi.stubGlobal('document', recorded.document);
  const sonar = new Sonar(terrain);
  const ctx = sonar.canvas.getContext('2d')!;
  ctx.setLineDash = vi.fn();
  ctx.createRadialGradient = vi.fn(() => ({ addColorStop: vi.fn() }) as unknown as CanvasGradient);
  const arc = vi.spyOn(ctx, 'arc');
  const rotate = vi.spyOn(ctx, 'rotate');
  const internals = sonar as unknown as {
    flatness: number;
    drawFlatGuides(ctx: CanvasRenderingContext2D, state: SubmarineState): void;
  };
  internals.flatness = flatness;
  const draw = () => internals.drawFlatGuides(ctx, { position: new Vector3() } as SubmarineState);
  terrain.dispose();
  return { sonar, ctx, arc, rotate, draw, ...recorded };
}

function poi(x: number, radius = 200): PlacedPoi {
  return { id: `test-${x}`, position: new Vector3(x, 0, 0), radius } as PlacedPoi;
}

describe('1250 flat sonar guides', () => {
  it('keeps range rings faint and caps halos while excluding contacts beyond sensor range', () => {
    const { sonar, ctx, arc, paths, draw } = setup();
    sonar.setSensorRange(100);
    sonar.setPois([poi(50), poi(101), poi(1000)]);
    draw();
    expect(ctx.createRadialGradient).toHaveBeenCalledTimes(1);
    expect(arc.mock.calls.at(-1)?.[2]).toBe(18);
    expect(paths.every((path) => path.width === 0.7)).toBe(true);
    expect(paths.every((path) => path.style === 'rgba(200,240,235,0.22)')).toBe(true);
  });

  it('draws an oriented hull plan with a phone-readable minimum size beneath markers', () => {
    const { sonar, paths, rotate, draw } = setup();
    sonar.setFootprints([{ x: 0, z: 0, lengthM: 44, widthM: 7.6, headingDeg: 90 }]);
    draw();
    const hull = paths.find((path) => path.width === 1.2)!;
    expect(hull).toBeDefined();
    expect(rotate).toHaveBeenCalledWith(Math.PI / 2);
    expect(Math.max(...hull.points.map((point) => point[1]))).toBe(12);
    expect(Math.min(...hull.points.map((point) => point[1]))).toBe(-12);
    expect(Math.max(...hull.points.map((point) => point[0]))).toBe(2);
  });

  it('adds no guides on relief-rich views or when markers are disabled', () => {
    for (const flatness of [0, 1]) {
      const { sonar, paths, arc, draw } = setup(flatness);
      sonar.setFootprints([{ x: 0, z: 0, lengthM: 143, widthM: 28, headingDeg: 0 }]);
      sonar.setPois([poi(0)]);
      if (flatness > 0) sonar.setMarkersVisible(false);
      draw();
      expect(paths).toEqual([]);
      expect(arc).not.toHaveBeenCalled();
    }
  });
});
