import { expect, test } from '@playwright/test';

/**
 * A2 acceptance: three depth bands must look clearly different. Each case
 * spawns the boat at a fixed depth (`?depth=`) and writes a reference frame to
 * docs/img/atmosphere-<depth>.png, then asserts the frames are not near-black
 * and differ from each other in mean colour.
 *
 * Shallow frames use monterey-canyon (its head is < 400 m deep, so the seabed
 * is in view); the abyss frame uses the Titanic plain at 3,800 m.
 */
const CASES = [
  { tile: 'monterey-canyon', depth: 10 },
  { tile: 'monterey-canyon', depth: 300 },
  { tile: 'titanic', depth: 3800 },
];

interface Mean {
  r: number;
  g: number;
  b: number;
}

test.describe('A2 atmosphere depth bands', () => {
  const means: Record<number, Mean> = {};

  for (const c of CASES) {
    test(`renders ${c.tile} at ${c.depth} m`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });

      await page.goto(`/?tile=${c.tile}&depth=${c.depth}`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__gameReady === true, undefined, {
        timeout: 45_000,
      });
      await page.waitForTimeout(1500);

      const png = await page.screenshot({ path: `docs/img/atmosphere-${c.depth}.png` });

      // Mean colour of the saved frame, measured by drawing it on a 2D canvas.
      const mean = await page.evaluate(async (b64): Promise<Mean> => {
        const img = new Image();
        img.src = `data:image/png;base64,${b64}`;
        await img.decode();
        const cv = document.createElement('canvas');
        cv.width = 160;
        cv.height = 100;
        const ctx = cv.getContext('2d')!;
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
        const px = ctx.getImageData(0, 0, cv.width, cv.height).data;
        let r = 0;
        let g = 0;
        let b = 0;
        const n = cv.width * cv.height;
        for (let i = 0; i < n; i++) {
          r += px[i * 4]!;
          g += px[i * 4 + 1]!;
          b += px[i * 4 + 2]!;
        }
        return { r: r / n, g: g / n, b: b / n };
      }, png.toString('base64'));
      means[c.depth] = mean;

      expect(errors, 'no console/page errors').toEqual([]);
      // Not a black frame (the abyss is dark, but headlights light the seabed).
      const lum = 0.2126 * mean.r + 0.7152 * mean.g + 0.0722 * mean.b;
      expect(lum, `frame at ${c.depth} m is not black`).toBeGreaterThan(3);
    });
  }

  test('the three depth frames differ from each other', () => {
    const d = (a: Mean, b: Mean): number =>
      Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);
    expect(d(means[10]!, means[300]!)).toBeGreaterThan(20);
    // Both deep frames are mostly black; the difference is hue (green vs. cold blue)
    // inside the headlight pool, which moves the mean only a few units.
    expect(d(means[300]!, means[3800]!)).toBeGreaterThan(5);
    expect(d(means[10]!, means[3800]!)).toBeGreaterThan(40);
  });
});
