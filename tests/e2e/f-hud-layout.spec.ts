// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { finishAnimations } from './helpers/hudTips.js';
import { GUIDANCE } from './helpers/guidance.js';
import { setScanCardSuppressed } from './helpers/tutorial.js';

const shots = '.cache/codex/shots/f-hud-layout';
const env =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const before = env.HUD_LAYOUT_CAPTURE === 'before';
const url = '/?tile=titanic&landmark=_test&poi=test-bow&skipBriefing=1&tier=low';

async function boot(page: Page, touch: boolean): Promise<void> {
  await page.goto(url + (touch ? '&touch=1' : ''), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
  // A contact is in range from the start, so its card is up and the tutorial waits.
  await expect(page.locator(GUIDANCE.scan)).toBeVisible();
  await expect(page.locator(GUIDANCE.tutorial)).toBeHidden();
}

async function shot(page: Page, name: string): Promise<void> {
  await mkdir(shots, { recursive: true });
  await page.screenshot({ path: `${shots}/${name}.png` });
}

async function clearLayout(page: Page, selectors: string[]): Promise<void> {
  const viewport = page.viewportSize()!;
  // One renderer round trip observes a coherent layout, rather than waiting
  // for WebGL separately for every rectangle at every tutorial step.
  const boxes = await page.evaluate(
    (selectors) =>
      selectors.map((selector) => {
        const element = document.querySelector<HTMLElement>(selector)!;
        const box = element.getBoundingClientRect();
        return { selector, x: box.x, y: box.y, width: box.width, height: box.height };
      }),
    selectors,
  );
  for (const box of boxes) {
    expect(box.width, box.selector).toBeGreaterThan(0);
    expect(box.height, box.selector).toBeGreaterThan(0);
    expect(box.x, box.selector).toBeGreaterThanOrEqual(0);
    expect(box.y, box.selector).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, box.selector).toBeLessThanOrEqual(viewport.width);
    expect(box.y + box.height, box.selector).toBeLessThanOrEqual(viewport.height);
  }
  for (let i = 0; i < boxes.length; i++) {
    for (const b of boxes.slice(i + 1)) {
      const a = boxes[i]!;
      const overlaps =
        a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
      expect(overlaps, `${a.selector} overlaps ${b.selector}`).toBe(false);
    }
  }
}

for (const layout of [
  { name: 'desktop-1600', width: 1600, height: 900, touch: false },
  { name: 'desktop-1280', width: 1280, height: 720, touch: false },
  { name: 'phone-landscape', width: 844, height: 390, touch: true },
  { name: 'tablet-landscape', width: 1024, height: 768, touch: true },
]) {
  test.describe(layout.name, () => {
    test.use({ viewport: { width: layout.width, height: layout.height }, hasTouch: layout.touch });
    test('fresh dive HUD has separate spaces', async ({ page }) => {
      await boot(page, layout.touch);
      await shot(page, `${before ? 'before' : 'after'}-${layout.name}`);
      if (before) return; // Capture the unmodified game before applying the fix.
      const selectors = ['.guidance-slot', '.hud-readouts'];
      if (layout.touch) selectors.push('.tc-stick', '.tc-slider', '.tc-buttons', '.tc-btn-pause');
      else selectors.push('.hud-reset-camera');
      await clearLayout(page, selectors);
      // The tutorial is laid out on its own: it never shares the screen with the scan card.
      await setScanCardSuppressed(page, true);
      await finishAnimations(page, '.guidance-slot[data-step]');
      const tutorialSelectors = ['.guidance-slot[data-step]', ...selectors.slice(1)];
      await clearLayout(page, tutorialSelectors);
      const skip = (await page.getByRole('button', { name: 'Skip', exact: true }).boundingBox())!;
      expect(skip.width).toBeGreaterThanOrEqual(44);
      expect(skip.height).toBeGreaterThanOrEqual(44);
      for (let step = 1; step < 3; step++) {
        const button = page.locator('.guidance-skip');
        if (layout.touch) await button.tap();
        else await button.click();
        await expect(page.locator('.guidance-slot[data-step]')).toHaveAttribute(
          'data-step',
          ['move', 'depth', 'scan'][step],
        );
        await clearLayout(page, tutorialSelectors);
      }
    });
  });
}

// A real mission: on desktop the objectives panel is up too; phones name the objective in the slot.
for (const layout of [
  { name: 'desktop-1280', width: 1280, height: 720, touch: false },
  { name: 'phone-landscape', width: 844, height: 390, touch: true },
]) {
  test.describe(`mission ${layout.name}`, () => {
    test.use({ viewport: { width: layout.width, height: layout.height }, hasTouch: layout.touch });
    test('card, objectives and readouts do not overlap', async ({ page }) => {
      // Unlock the mission without touching the tutorial record: a fresh pilot's tutorial still runs.
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
      await page.goto(
        `/?mission=monterey-canyon&skipBriefing=1&tier=low${layout.touch ? '&touch=1' : ''}`,
      );
      await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
      await page.waitForFunction(
        () => (window.__game as { discovery: { loaded: boolean } }).discovery.loaded,
      );
      await expect(page.locator('.guidance-slot[data-step]')).toBeVisible();
      if (!layout.touch) await expect(page.locator('.objectives-panel')).toBeVisible();
      else await expect(page.locator('.objectives-panel')).toBeHidden();
      await finishAnimations(page, '.guidance-slot[data-step]');
      await shot(page, `mission-${layout.name}`);
      const selectors = ['.guidance-slot[data-step]', '.hud-readouts'];
      if (!layout.touch) selectors.push('.objectives-panel');
      if (layout.touch) selectors.push('.tc-stick', '.tc-slider', '.tc-buttons');
      await clearLayout(page, selectors);
    });
  });
}
