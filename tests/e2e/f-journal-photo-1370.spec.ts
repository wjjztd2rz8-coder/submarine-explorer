import { expect, test } from './helpers/unlocked.js';
import { clockFramesUntil, pauseClockBeforeNavigation } from './helpers/clock.js';

// Keyboard focus restoration depends on the photo-active CSS visibility rule;
// keep browser coverage alongside the lifecycle unit regression.
for (const profile of [
  { width: 1600, height: 900, touch: false },
  { width: 844, height: 390, touch: true },
  { width: 390, height: 844, touch: true },
]) {
  test.describe(`1370 photo focus ${profile.width}x${profile.height}`, () => {
    test.use({
      viewport: { width: profile.width, height: profile.height },
      hasTouch: profile.touch,
      isMobile: profile.touch,
      deviceScaleFactor: 1,
      serviceWorkers: 'block',
      storageState: { cookies: [], origins: [] },
    });

    test('Done restores prior HUD focus and Tab/Escape keep a keyboard exit over two rounds', async ({
      page,
    }, info) => {
      test.setTimeout(180_000);
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await pauseClockBeforeNavigation(page);
      await page.goto('/?mission=titanic&poi=titanic-bow&skipBriefing=1&tier=low', {
        waitUntil: 'domcontentloaded',
      });
      await clockFramesUntil(
        page,
        () =>
          window.__gameReady === true &&
          (window.__game as { discovery: { spawnedAt: string | null } }).discovery.spawnedAt ===
            'titanic-bow',
      );
      const mode = page.locator('.photo-mode');
      const credit = page.locator('.hud-attribution summary');
      const touchPhoto = page.locator('.tc-btn-photo');
      const capture = mode.locator('.photo-mode-capture');
      const done = mode.locator('.photo-mode-exit');
      const pause = mode.locator('.photo-mode-pause');

      for (let round = 1; round <= 2; round++) {
        if (profile.touch) {
          // Keyboard input changes touch modality. Re-enter it using real touch
          // before PHOTO; its pointer handler preserves the previous HUD focus.
          await page.locator('#viewport').tap({ position: { x: 5, y: 200 } });
          await page.clock.runFor(34);
          await credit.focus();
          await touchPhoto.tap();
        } else {
          await credit.focus();
          await page.keyboard.press('p');
        }
        await page.clock.runFor(34);
        await expect(mode).toBeVisible();
        await expect(page.locator('.hud')).toBeHidden();
        await page.clock.fastForward(500);
        if (profile.touch) await capture.tap();
        else await capture.click();
        await page.clock.runFor(34);
        await expect(mode.locator('.photo-mode-toast')).toHaveText('Saved to Journal');
        await page.screenshot({ path: info.outputPath(`round-${round}-photo.png`) });
        if (profile.touch) await done.tap();
        else await done.click();
        await expect(mode).toBeHidden();
        await expect(credit).toBeFocused();

        // A visible persistent HUD control also acts as a keyboard opener at
        // both touch viewport sizes, including when input switches to keyboard.
        await credit.focus();
        await page.keyboard.press('p');
        await page.clock.runFor(34);
        await expect(mode).toBeVisible();
        for (const control of [capture, done, pause, capture]) {
          await page.keyboard.press('Tab');
          await expect(control).toBeFocused();
        }
        await page.keyboard.press('Shift+Tab');
        await expect(pause).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(mode).toBeHidden();
        await expect(credit).toBeFocused();
        await expect(page.locator('.pause-menu')).toBeHidden();
      }
      expect(errors).toEqual([]);
    });
  });
}
