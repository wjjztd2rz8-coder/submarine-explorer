import { expect, test, type Page } from './helpers/unlocked.js';
import { clockFramesUntil, pauseClockBeforeNavigation } from './helpers/clock.js';
import type { Input } from '../../src/core/Input.js';
import type { TouchControls } from '../../src/ui/TouchControls.js';
import type { Journal } from '../../src/ui/Journal.js';

interface Game {
  input: Input;
  touch: TouchControls;
  journal: Journal;
  discovery: { loaded: boolean };
  props: { loaded: boolean };
  missionRouter: { endDive(): void };
}
const shots = '.cache/codex/shots/1392-f-touch-controls';

async function boot(page: Page, touch: boolean): Promise<void> {
  await pauseClockBeforeNavigation(page);
  await page.goto(`/?mission=titanic&skipBriefing=1&tier=low${touch ? '&touch=1' : ''}`);
  await clockFramesUntil(page, () => {
    const g = window.__game as unknown as Game;
    return window.__gameReady === true && g.discovery.loaded && g.props.loaded;
  });
  await page.clock.fastForward(50);
}

async function layout(page: Page): Promise<void> {
  const issues = await page.evaluate(() => {
    const elements = [
      ...document.querySelectorAll<HTMLElement>(
        '.tc-stick, .tc-slider, .tc-btn, .hud-journal, .sonar, .hud-readouts, ' +
          '.objectives-panel, .guidance-slot, .hud-reset-camera',
      ),
    ].filter((el) => el.checkVisibility());
    const boxes = elements.map((el) => ({ name: el.className, r: el.getBoundingClientRect() }));
    const issues: string[] = [];
    for (const { name, r } of boxes) {
      if (r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight)
        issues.push(`${name} offscreen: ${JSON.stringify(r)}`);
    }
    for (let i = 0; i < boxes.length; i++) {
      const a = boxes[i];
      for (const b of boxes.slice(i + 1)) {
        if (
          a.r.left < b.r.right &&
          b.r.left < a.r.right &&
          a.r.top < b.r.bottom &&
          b.r.top < a.r.bottom
        )
          issues.push(`${a.name} overlaps ${b.name}: ${JSON.stringify([a.r, b.r])}`);
      }
    }
    for (const el of elements.filter((el) => el.matches('.tc-btn, .hud-journal'))) {
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      if (!el.contains(hit)) issues.push(`${el.className} cannot receive a tap`);
      if (
        document.documentElement.classList.contains('is-touch') &&
        (r.width < 48 || r.height < 48)
      )
        issues.push(`${el.className} below 48px`);
    }
    return issues;
  });
  expect(issues).toEqual([]);
}

for (const v of [
  { width: 390, height: 844, name: 'portrait', touch: true },
  { width: 844, height: 390, name: 'landscape', touch: true },
  { width: 667, height: 375, name: 'landscape-small', touch: true },
  { width: 1024, height: 768, name: 'tablet', touch: true },
  { width: 1280, height: 720, name: 'desktop', touch: false },
]) {
  test.describe(v.name, () => {
    test.use({ viewport: v, hasTouch: v.touch, isMobile: v.touch });
    test('separates every button, opens Journal through the action, and toggles Boost', async ({
      page,
    }) => {
      await boot(page, v.touch);
      await layout(page);
      await page.screenshot({ path: `${shots}/${v.name}.png` });
      const journal = page.locator('.hud-journal');
      await expect(journal).toHaveAttribute('title', 'Journal (J)');
      if (v.touch) {
        const boost = page.locator('.tc-btn-boost');
        const slider = (await page.locator('.tc-slider').boundingBox())!;
        const dock = (await boost.boundingBox())!;
        if (v.width < v.height) {
          expect(slider.x - dock.x - dock.width).toBeGreaterThanOrEqual(8);
          expect(slider.x - dock.x - dock.width).toBeLessThanOrEqual(20);
          expect(dock.y).toBeGreaterThanOrEqual(slider.y);
          expect(dock.y + dock.height).toBeLessThanOrEqual(slider.y + slider.height);
        } else {
          expect(Math.abs(slider.x - dock.x)).toBeLessThanOrEqual(1);
          expect(slider.y - dock.y - dock.height).toBeGreaterThanOrEqual(8);
          expect(slider.y - dock.y - dock.height).toBeLessThanOrEqual(16);
        }
        await expect(boost).toHaveAttribute('aria-pressed', 'false');
        await boost.tap();
        await page.clock.fastForward(50);
        await expect(boost).toHaveAttribute('aria-pressed', 'true');
        await expect(boost).toHaveClass(/is-active/);
        expect(
          await page.evaluate(() => (window.__game as unknown as Game).input.state.boost),
        ).toBe(true);
        await page.screenshot({ path: `${shots}/${v.name}-boost-on.png` });
        await boost.tap();
        await page.clock.fastForward(50);
        await expect(boost).toHaveAttribute('aria-pressed', 'false');
        await page.screenshot({ path: `${shots}/${v.name}-boost-off.png` });
        await boost.tap();
        await page.clock.fastForward(50);
        await journal.tap();
      } else await journal.click();
      await page.clock.fastForward(50);
      await page.clock.fastForward(50);
      expect(await page.evaluate(() => (window.__game as unknown as Game).journal.isOpen)).toBe(
        true,
      );
      expect(await page.evaluate(() => (window.__game as unknown as Game).input.touchBoost)).toBe(
        false,
      );
      await page.evaluate(() => (window.__game as unknown as Game).journal.close());
      await page.clock.fastForward(50);
      await layout(page);
      if (v.touch) {
        await expect(page.locator('.tc-btn-boost')).toHaveAttribute('aria-pressed', 'false');
        await page.locator('.tc-btn-boost').tap();
        await page.clock.fastForward(50);
        await page.locator('.tc-btn-pause').tap();
        await page.clock.fastForward(50);
        expect(await page.evaluate(() => (window.__game as unknown as Game).input.touchBoost)).toBe(
          false,
        );
        await expect(page.locator('.pause-menu')).toBeVisible();
        await expect(
          page.locator('.pause-menu').getByRole('button', { name: 'Journal', exact: true }),
        ).toBeVisible();
      } else {
        await page.keyboard.down('Shift');
        await page.clock.fastForward(50);
        expect(
          await page.evaluate(() => (window.__game as unknown as Game).input.state.boost),
        ).toBe(true);
        await page.keyboard.up('Shift');
        await page.clock.fastForward(50);
        expect(
          await page.evaluate(() => (window.__game as unknown as Game).input.state.boost),
        ).toBe(false);
      }
    });
  });
}

test.describe('touch boost reset', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  test('meter depletion clears the latch and recovery requires another tap', async ({ page }) => {
    await boot(page, true);
    const boost = page.locator('.tc-btn-boost');
    await boost.tap();
    await page.clock.fastForward(50);
    await expect(boost).toHaveAttribute('aria-pressed', 'true');
    // Each rendered frame permits at most eight fixed steps. Advance until
    // the real progress system rejects boost rather than counting wall time.
    await clockFramesUntil(page, () => !(window.__game as unknown as Game).input.touchBoost, 250);
    await expect(boost).toHaveAttribute('aria-pressed', 'false');
    expect(await page.evaluate(() => (window.__game as unknown as Game).input.touchBoost)).toBe(
      false,
    );
    for (let frame = 0; frame < 12; frame++) await page.clock.fastForward(250);
    await expect(boost).toHaveAttribute('aria-pressed', 'false');
    await boost.tap();
    await page.clock.fastForward(50);
    await expect(boost).toHaveAttribute('aria-pressed', 'true');
  });
  test('hidden page and dive end clear the latch', async ({ page }) => {
    await boot(page, true);
    const boost = page.locator('.tc-btn-boost');
    await boost.tap();
    await page.clock.fastForward(50);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(boost).toHaveAttribute('aria-pressed', 'false');
    await page.evaluate(() => {
      delete (document as unknown as { hidden?: boolean }).hidden;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await boost.tap();
    await page.clock.fastForward(50);
    await page.evaluate(() => (window.__game as unknown as Game).missionRouter.endDive());
    await page.clock.fastForward(50);
    expect(await page.evaluate(() => (window.__game as unknown as Game).input.touchBoost)).toBe(
      false,
    );
    await expect(page.locator('.tc-root')).toBeHidden();
  });
});
