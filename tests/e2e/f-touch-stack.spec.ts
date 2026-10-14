import { dismissTutorial, setScanCardSuppressed } from './helpers/tutorial.js';
import { expect, test, type Page } from '@playwright/test';
import { GUIDANCE } from './helpers/guidance.js';

const shots = '.cache/codex/shots/f-touch-stack';
const stackUrl = '/?mission=titanic&skipBriefing=1&touch=1&tier=low';
const tutorialUrl = '/?tile=titanic&landmark=_test&poi=test-bow&skipBriefing=1&touch=1&tier=low';

async function ready(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
}

for (const viewport of [
  { width: 844, height: 390 },
  { width: 667, height: 375 },
  { width: 932, height: 430 },
]) {
  test.describe(`touch stack ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport, hasTouch: true, isMobile: true });
    const tag = `${viewport.width}x${viewport.height}`;

    test('tutorial stays one line at its last step and yields to the scan card', async ({
      page,
    }) => {
      await ready(page, tutorialUrl);
      const card = page.locator(GUIDANCE.tutorial);
      // A contact is in range from the start: its card owns the slot, the tutorial waits.
      await expect(page.locator(GUIDANCE.scan)).toBeVisible();
      await expect(card).toBeHidden();
      await setScanCardSuppressed(page, true);
      for (const step of ['move', 'depth']) {
        await expect(card).toHaveAttribute('data-step', step);
        await page.locator('.guidance-skip').tap();
      }
      await expect(card).toHaveAttribute('data-step', 'scan');
      await page.screenshot({ path: `${shots}/tutorial-scan-${tag}.png` });
      const h = (await card.boundingBox())!.height;
      expect(h).toBeLessThanOrEqual(56);
      await setScanCardSuppressed(page, false);
      await expect(card).toBeHidden();
      await expect(page.locator(GUIDANCE.scan)).toBeVisible();
      // The scan card alone leaves the middle of the screen open.
      const bottom = await page.evaluate(
        () => document.querySelector('.guidance-slot')!.getBoundingClientRect().bottom,
      );
      expect(bottom).toBeLessThan(viewport.height * 0.5 + 20);
    });

    test('completion banner clears every touch control and the telemetry', async ({ page }) => {
      // Regression: on a phone in landscape the banner sat under Sonar/Lights/Boost, hiding Surface.
      await ready(page, stackUrl);
      await dismissTutorial(page, true);
      await page.evaluate(() =>
        (
          window.__game as unknown as { missionRouter: { showBanner(kind: 'primary'): void } }
        ).missionRouter.showBanner('primary'),
      );
      const banner = page.locator('.obj-banner');
      await expect(banner).toBeVisible();
      await banner.evaluate((e) => Promise.all(e.getAnimations().map((a) => a.finished)));
      await page.screenshot({ path: `${shots}/completion-banner-${tag}.png` });
      const hits = await page.evaluate(() => {
        const b = document.querySelector('.obj-banner')!.getBoundingClientRect();
        return [
          '.tc-stick',
          '.tc-slider',
          '.tc-buttons',
          '.tc-btn-pause',
          '.hud-journal',
          '.hud-readouts',
          '.sonar',
        ].filter((selector) => {
          const r = document.querySelector(selector)?.getBoundingClientRect();
          return (
            !!r &&
            r.width > 0 &&
            r.left < b.right &&
            b.left < r.right &&
            r.top < b.bottom &&
            b.top < r.bottom
          );
        });
      });
      expect(hits).toEqual([]);
      for (const name of ['Keep exploring', 'Surface and debrief']) {
        const box = (await banner.getByRole('button', { name }).boundingBox())!;
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
        expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
      }
    });

    test('the standing objective line shows when no contact is in range', async ({ page }) => {
      await ready(page, stackUrl);
      await dismissTutorial(page, true);
      await page.evaluate(() => {
        const g = window.__game as {
          sub: { position: { x: number; y: number; z: number }; yaw: number; pitch: number };
          rig: { snap(p: unknown, yaw: number, pitch: number): void };
        };
        g.sub.position.x += 900;
        g.rig.snap(g.sub.position, g.sub.yaw, g.sub.pitch);
      });
      await expect(page.locator(GUIDANCE.scan)).toBeHidden();
      const chip = page.locator(GUIDANCE.objective);
      await expect(chip).toBeVisible();
      await expect(chip).toContainText('OBJECTIVE');
      const box = (await chip.boundingBox())!;
      expect(box.height).toBeLessThanOrEqual(64);
      const overlaps = await page.evaluate((b) => {
        return [
          '.tc-stick',
          '.tc-slider',
          '.tc-btn-scan',
          '.tc-btn-lights',
          '.tc-btn-sonar',
          '.tc-btn-photo',
          '.tc-btn-pause',
          '.tc-btn-boost',
          '.hud-journal',
          '.sonar',
          '.hud-readouts',
          '.objectives-panel',
        ]
          .flatMap((s) => Array.from(document.querySelectorAll<HTMLElement>(s)))
          .filter((e) => e.checkVisibility())
          .map((e) => e.getBoundingClientRect())
          .filter(
            (r) => b.x < r.right && r.x < b.x + b.width && b.y < r.bottom && r.y < b.y + b.height,
          ).length;
      }, box);
      expect(overlaps).toBe(0);
      await page.screenshot({ path: `${shots}/objective-chip-${tag}.png` });
    });
  });
}
