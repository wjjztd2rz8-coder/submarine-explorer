import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { Sonar, paletteColor, sonarReliefRange } from '../../src/ui/Sonar.js';
import { Terrain } from '../../src/world/Terrain.js';
import { makeSyntheticTile } from './helpers.js';
import { recordSonarCanvas } from './helpers/sonarCanvas.js';

afterEach(() => vi.unstubAllGlobals());

function render(id: string, dpr: number, ridge = false) {
  vi.unstubAllGlobals();
  const tile = makeSyntheticTile({
    id,
    cols: 3,
    rows: 3,
    height: (c, r) => (ridge ? (c === 1 ? -50 : -150) : -c * 30 - r * 20),
  });
  const terrain = new Terrain(tile, DEFAULT_CONFIG.terrain, 'low');
  const recorded = recordSonarCanvas();
  vi.stubGlobal('document', recorded.document);
  vi.stubGlobal('devicePixelRatio', dpr);
  const sonar = new Sonar(terrain, [], { size: 96 });
  // Exercise the raster and contours directly, holding the view fixed.
  (sonar as unknown as { renderBathymetry(x: number, z: number): void }).renderBathymetry(0, 0);
  terrain.dispose();
  return { sonar, ...recorded };
}

describe('1200 shared sonar relief', () => {
  it('uses a navy deep end and teal shallow end with no pale green stops', () => {
    const stops = DEFAULT_CONFIG.sonarPalettes.default.stops;
    const [r, g, b] = paletteColor(stops, 0);
    expect(b).toBeGreaterThan(g);
    expect(g).toBeGreaterThan(r);
    for (let t = 0; t <= 1; t += 0.05) {
      const [red, green, blue] = paletteColor(stops, t);
      expect(blue).toBeGreaterThan(green * 0.9);
      expect(red).toBeLessThan(green * 0.4);
    }
  });

  it('maps equal relative depths identically across site depth ranges', () => {
    const stops = DEFAULT_CONFIG.sonarPalettes.default.stops;
    for (const [lo, hi] of [
      [-125, -5],
      [-3096, -2915],
      [-5002, -724],
      [-6575, -2087],
      [-3978, -3339],
    ]) {
      const { low, span } = sonarReliefRange(lo, hi, 20);
      expect(paletteColor(stops, (lo - low) / span)).toEqual(paletteColor(stops, 0));
      expect(paletteColor(stops, (hi - low) / span)).toEqual(paletteColor(stops, 1));
      expect(paletteColor(stops, ((lo + hi) / 2 - low) / span)).toEqual(paletteColor(stops, 0.5));
    }
  });

  it('has no Blue Hole colour exception for the same sampled relief', () => {
    const generic = render('test', 1).rasters[0];
    const blueHole = render('great-blue-hole', 1).rasters[0];
    // The synthetic tile is away from the Blue Hole carve's geographic focus.
    expect(blueHole.data).toEqual(generic.data);
  });

  it('keeps shading continuous across a survey ridge with opposing cell slopes', () => {
    const { rasters } = render('test', 2, true);
    const image = rasters[0];
    const row = Math.floor(image.height / 2);
    const center = Math.floor(image.width / 2);
    for (let x = center - 3; x <= center + 3; x++) {
      const at = (x: number, channel: number) => image.data[(row * image.width + x) * 4 + channel];
      for (const channel of [0, 1, 2])
        expect(Math.abs(at(x + 1, channel) - at(x, channel))).toBeLessThan(20);
    }
  });

  it('samples intermediate bilinear heights at DPR 2 without changing CSS dimensions or contour units', () => {
    const one = render('test', 1);
    const two = render('test', 2);
    expect(two.sonar.canvas.style).toEqual(one.sonar.canvas.style);
    expect(two.rasters[0].width).toBe(one.rasters[0].width * 2);
    expect(two.rasters[0].height).toBe(one.rasters[0].height * 2);
    expect(two.paths.length).toBeGreaterThan(0);
    expect(two.paths.every((p) => p.width === 0.8)).toBe(true);
    expect(two.labels.length).toBeGreaterThan(0);
    // A source cell spans many pixels; intermediate pixels must carry a smooth
    // gradient rather than repeating the nearest grid height in square blocks.
    const image = two.rasters[0];
    const row = Math.floor(image.height / 2);
    const greens = Array.from(
      { length: 12 },
      (_, x) => image.data[(row * image.width + x + Math.floor(image.width / 2) - 6) * 4 + 1],
    );
    expect(new Set(greens).size).toBeGreaterThan(4);
  });
});
