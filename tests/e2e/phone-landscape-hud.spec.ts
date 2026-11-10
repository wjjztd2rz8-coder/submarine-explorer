/**
 * Phone landscape HUD: the guidance card sits on the screen's centre line, sonar owns the
 * left edge, readouts and the bar own the right edge, and none of them meets a touch control.
 */
import { expect, test, type Page } from '@playwright/test';
import { reviewScreenshot } from './helpers/render.js';

const url = '/?mission=monterey-canyon&skipBriefing=1&touch=1&tier=low';
const shots = '.cache/codex/shots/U-phone-landscape-hud';

async function boxes(page: Page, selectors: string[]) {
  return page.evaluate(
    (list) =>
      list.map((selector) => {
        const e = document.querySelector(selector);
        const r = e?.getBoundingClientRect();
        return {
          selector,
          ok: !!r && r.width > 0,
          x: r?.x ?? 0,
          y: r?.y ?? 0,
          w: r?.width ?? 0,
          h: r?.height ?? 0,
        };
      }),
    selectors,
  );
}

for (const viewport of [
  { width: 844, height: 390 },
  { width: 932, height: 430 },
  { width: 667, height: 375 },
]) {
  test.describe(`phone landscape ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport, hasTouch: true, isMobile: true });

    test('guidance is centred; sonar left, readouts and bar right; controls clear', async ({
      page,
    }) => {
      await page.addInitScript(() =>
        localStorage.setItem(
          'subexplorer.progress.v1',
          JSON.stringify({
            version: 1,
            points: 0,
            lifetime: 900,
            awarded: [],
            upgrades: {},
            ratings: {},
          }),
        ),
      );
      await page.goto(url);
      await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
      await expect(page.locator('.guidance-slot')).toBeVisible();
      await page.evaluate(() =>
        Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))),
      );
      await reviewScreenshot(page, {
        path: `${shots}/landscape-${viewport.width}x${viewport.height}.png`,
      });
      const [guide, sonar, readouts, bar, ...controls] = await boxes(page, [
        '.guidance-slot',
        '.sonar',
        '.hud-readouts',
        '.hud-journal',
        '.tc-stick',
        '.tc-slider',
        '.tc-buttons',
        '.tc-btn-pause',
      ]);
      const centre = viewport.width / 2;
      expect(Math.abs(guide!.x + guide!.w / 2 - centre)).toBeLessThanOrEqual(4);
      expect(sonar!.x + sonar!.w).toBeLessThan(guide!.x);
      expect(readouts!.x).toBeGreaterThan(guide!.x + guide!.w);
      expect(bar!.x).toBeGreaterThan(guide!.x + guide!.w);
      for (const a of [guide!, sonar!, readouts!, bar!]) {
        for (const c of controls) {
          if (!c.ok) continue;
          const overlap = a.x < c.x + c.w && c.x < a.x + a.w && a.y < c.y + c.h && c.y < a.y + a.h;
          expect(overlap, `${a.selector} overlaps ${c.selector}`).toBe(false);
        }
      }
      // The sub is centred; the card stays in the top band above it.
      expect(guide!.y + guide!.h).toBeLessThan(viewport.height * 0.5);
    });
  });
}
