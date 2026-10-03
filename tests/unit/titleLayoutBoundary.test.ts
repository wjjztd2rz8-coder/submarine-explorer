import { describe, expect, it } from 'vitest';
import { titleLayout } from '../../src/app/systems/title.js';
import { regionFor } from '../../src/render/title/TitleScene.js';

describe('title viewport breakpoints', () => {
  it.each([360, 390, 500])(
    'uses the sideways composition at a short square %ipx viewport',
    (size) => {
      const layout = titleLayout(size, size);
      // home.css includes equality in min-aspect-ratio: 1/1. The canvas
      // composition must follow that left-hand plate, including at browser zoom.
      expect(layout).toBe('short-landscape');
      const region = regionFor(size, size, layout);
      expect(region.w).toBeLessThan(size);
      expect(region.h).toBe(size);
    },
  );

  it.each([
    [499, 500, 'portrait'],
    [501, 500, 'short-landscape'],
    [501, 501, 'portrait'],
    [959, 501, 'portrait'],
    [960, 501, 'desktop'],
  ] as const)('keeps the neighboring %ix%i layout as %s', (width, height, layout) => {
    expect(titleLayout(width, height)).toBe(layout);
  });
});
