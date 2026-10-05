import { expect, test } from './helpers/unlocked.js';
import { clockFramesUntil, pauseClockBeforeNavigation } from './helpers/clock.js';

/**
 * A2 acceptance: three depth bands must look clearly different. Each case
 * spawns the boat at a fixed depth (`?depth=`) and writes a frame to
 * tests/e2e/screenshots/atmosphere-<depth>.png (gitignored), then asserts the
 * frames are not near-black and differ from each other in mean colour.
 *
 * The tracked reference copies in docs/img/ are only refreshed on request, so a
 * plain test run leaves the working tree clean:
 *   UPDATE_DOCS_IMG=1 PW_PORT=... PW_OUTDIR=... npx playwright test tests/e2e/atmosphere.spec.ts
 *
 * Shallow frames use monterey-canyon (its head is < 400 m deep, so the seabed
 * is in view); the abyss frame uses the Titanic plain at 3,800 m.
 */
const CASES = [
  { tile: 'monterey-canyon', depth: 10 },
  { tile: 'monterey-canyon', depth: 300 },
  { tile: 'titanic', depth: 3800 },
];

// Read the env without pulling in @types/node just for one variable.
const env =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const UPDATE_DOCS_IMG = env.UPDATE_DOCS_IMG === '1';
// A string-typed specifier keeps tsc from needing @types/node for one call.
const NODE_FS: string = 'node:fs';
async function copyFile(from: string, to: string): Promise<void> {
  const fs = (await import(/* @vite-ignore */ NODE_FS)) as {
    copyFileSync(a: string, b: string): void;
  };
  fs.copyFileSync(from, to);
}

interface Mean {
  r: number;
  g: number;
  b: number;
}

test('A2 atmosphere depth bands render distinct non-black frames', async ({ page }) => {
  await pauseClockBeforeNavigation(page);
  const means: Record<number, Mean> = {};

  for (const c of CASES) {
    await test.step(`renders ${c.tile} at ${c.depth} m`, async () => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });

      await page.goto(`/?tile=${c.tile}&depth=${c.depth}`, { waitUntil: 'domcontentloaded' });
      await clockFramesUntil(page, () => {
        const g = window.__game as { props: { loaded: boolean }; discovery: { loaded: boolean } };
        return window.__gameReady === true && g?.props.loaded && g.discovery.loaded;
      });
      // Present the loaded scene before measuring its colour.
      await page.clock.runFor(34);

      const shot = `tests/e2e/screenshots/atmosphere-${c.depth}.png`;
      const png = await page.screenshot({ path: shot });
      if (UPDATE_DOCS_IMG) await copyFile(shot, `docs/img/atmosphere-${c.depth}.png`);

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

  await test.step('the three depth frames differ from each other', () => {
    const d = (a: Mean, b: Mean): number =>
      Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);
    expect(d(means[10]!, means[300]!)).toBeGreaterThan(20);
    // Both deep frames are mostly black; the difference is hue (green vs. cold blue)
    // inside the headlight pool, which moves the mean only a few units.
    expect(d(means[300]!, means[3800]!)).toBeGreaterThan(5);
    expect(d(means[10]!, means[3800]!)).toBeGreaterThan(40);
  });
});
