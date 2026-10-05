// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { finishAnimations, holdFreshTips, processedFrames } from './helpers/hudTips.js';

const shots = '.cache/codex/shots/f-hud-layout';
const env =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const before = env.HUD_LAYOUT_CAPTURE === 'before';
const url = '/?tile=titanic&landmark=_test&poi=test-bow&skipBriefing=1&tier=low';

async function boot(page: Page, touch: boolean): Promise<void> {
  await page.goto(url + (touch ? '&touch=1' : ''), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
  await holdFreshTips(page);
  await expect(page.locator('.onboard-card')).toBeVisible();
  await expect(page.locator('.scan-panel')).toBeVisible();
  await finishAnimations(page, '.onboard-card');
}

async function shot(page: Page, name: string): Promise<void> {
  await mkdir(shots, { recursive: true });
  await page.screenshot({ path: `${shots}/${name}.png` });
}

async function clearLayout(page: Page, selectors: string[]): Promise<void> {
  const viewport = page.viewportSize()!;
  const boxes = [];
  for (const selector of selectors) {
    const element = page.locator(selector);
    await expect(element).toBeVisible();
    const box = (await element.boundingBox())!;
    expect(box.x, selector).toBeGreaterThanOrEqual(0);
    expect(box.y, selector).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, selector).toBeLessThanOrEqual(viewport.width);
    expect(box.y + box.height, selector).toBeLessThanOrEqual(viewport.height);
    boxes.push({ selector, ...box });
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
      const selectors = ['.onboard-card', '.scan-panel', '.hud-readouts', '.hud-attribution'];
      if (layout.touch) {
        await expect(page.locator('.hud-control-tips')).toBeHidden();
        selectors.push('.tc-stick', '.tc-slider', '.tc-buttons', '.tc-btn-pause');
      } else selectors.push('.hud-control-tips', '.hud-reset-camera');
      await clearLayout(page, selectors);
      for (const name of ['Skip step', 'Skip tutorial']) {
        const box = (await page.getByRole('button', { name, exact: true }).boundingBox())!;
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
      for (let step = 1; step < 5; step++) {
        const button = page.getByRole('button', { name: 'Skip step', exact: true });
        if (layout.touch) await button.tap();
        else await button.click();
        await expect(page.locator('.onboard-card')).toContainText(`Step ${step + 1} of 5`);
        await clearLayout(page, selectors);
      }
    });
  });
}

// A real mission: the objectives panel is up too, and the card still has its own space.
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
      await expect(page.locator('.onboard-card')).toBeVisible();
      await expect(page.locator('.objectives-panel')).toBeVisible();
      await holdFreshTips(page);
      await finishAnimations(page, '.onboard-card');
      await shot(page, `mission-${layout.name}`);
      const selectors = ['.onboard-card', '.objectives-panel', '.hud-readouts'];
      if (layout.touch) selectors.push('.tc-stick', '.tc-slider', '.tc-buttons');
      else selectors.push('.hud-control-tips');
      await clearLayout(page, selectors);
    });
  });
}

test.describe('controls hint bar', () => {
  test.use({ viewport: { width: 1280, height: 720 } });
  test('hides after the first move, still records all controls, and stays in Help', async ({
    page,
  }) => {
    await page.goto('/?mission=titanic&skipBriefing=1&tier=low');
    await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
    await holdFreshTips(page);
    const tips = page.locator('.hud-control-tips');
    await expect(tips).toBeVisible();
    await page.keyboard.down('KeyW');
    try {
      await page.waitForFunction(
        () => (window.__game as { cameraTips: { moved: boolean } }).cameraTips.moved,
      );
    } finally {
      await page.keyboard.up('KeyW');
    }
    await expect(tips).toBeHidden();
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem('subexplorer.controlsLearned.v1')!).learned,
      ),
    ).toBe(false);
    for (const key of ['KeyA', 'Space']) {
      await page.keyboard.down(key);
      await processedFrames(page);
      await page.keyboard.up(key);
    }
    await expect(tips).toBeHidden();
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem('subexplorer.controlsLearned.v1')!).learned,
      ),
    ).toBe(true);
    await page.keyboard.press('Escape');
    await page.locator('.pause-menu').getByRole('button', { name: 'Controls' }).click();
    await expect(page.getByRole('dialog', { name: 'Controls guide' })).toBeVisible();
  });

  test('the hint deadline expires without marking controls learned', async ({ page }) => {
    await page.goto('/?tile=titanic&tier=low');
    await page.waitForFunction(() => window.__gameReady === true);
    await holdFreshTips(page);
    await expect(page.locator('.hud-control-tips')).toBeVisible();
    await page.evaluate(() => {
      (window.__game as { cameraTips: { until: number } }).cameraTips.until = performance.now() - 1;
    });
    await expect(page.locator('.hud-control-tips')).toBeHidden();
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem('subexplorer.controlsLearned.v1')!).learned,
      ),
    ).toBe(false);
  });
});
