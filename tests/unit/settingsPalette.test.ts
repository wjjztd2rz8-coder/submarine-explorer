/**
 * C5 sonar palettes (Config.sonarPalettes): depth order must read without hue,
 * so relative luminance rises along every palette's stops.
 */

import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { paletteColor, relativeLuminance } from '../../src/ui/Sonar.js';

describe('sonar palettes', () => {
  for (const [name, pal] of Object.entries(DEFAULT_CONFIG.sonarPalettes)) {
    it(`${name}: stops ascend and luminance rises with depth order`, () => {
      expect(pal.label.length).toBeGreaterThan(0);
      let lastAt = -1;
      let lastLum = -1;
      for (let t = 0; t <= 1.0001; t += 0.05) {
        const [r, g, b] = paletteColor(pal.stops, t);
        const lum = relativeLuminance(r, g, b);
        expect(lum).toBeGreaterThanOrEqual(lastLum);
        lastLum = lum;
      }
      for (const [at] of pal.stops) {
        expect(at).toBeGreaterThan(lastAt);
        lastAt = at;
      }
    });
  }

  it('paletteColor clamps and interpolates', () => {
    const stops: Array<[number, number, number, number]> = [
      [0, 0, 0, 0],
      [1, 100, 200, 50],
    ];
    expect(paletteColor(stops, -1)).toEqual([0, 0, 0]);
    expect(paletteColor(stops, 2)).toEqual([100, 200, 50]);
    expect(paletteColor(stops, 0.5)).toEqual([50, 100, 25]);
    expect(paletteColor([], 0.5)).toEqual([0, 0, 0]);
  });

  it('default survey relief has several clearly separated depth bands', () => {
    const pal = DEFAULT_CONFIG.sonarPalettes.default;
    expect(pal.stops.length).toBeGreaterThanOrEqual(4);
    const depths = [0, 0.25, 0.5, 0.75, 1].map((t) =>
      relativeLuminance(...paletteColor(pal.stops, t)),
    );
    for (let i = 1; i < depths.length; i++)
      expect(depths[i]! - depths[i - 1]!).toBeGreaterThan(0.015);
  });

  it('alternate palettes keep separate channel signatures', () => {
    const midpoint = (name: keyof typeof DEFAULT_CONFIG.sonarPalettes) =>
      paletteColor(DEFAULT_CONFIG.sonarPalettes[name].stops, 0.5);
    expect(midpoint('deuteranopia')).not.toEqual(midpoint('default'));
    expect(midpoint('highContrast')).not.toEqual(midpoint('deuteranopia'));
  });
});
