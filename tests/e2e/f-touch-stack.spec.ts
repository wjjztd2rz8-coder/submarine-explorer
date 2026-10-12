import { dismissTutorial } from './helpers/tutorial.js';
import { expect, test, type Page } from '@playwright/test';

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

    test('tutorial collapses to one line at its last step', async ({ page }) => {
      await ready(page, tutorialUrl);
      const card = page.locator('.onboard-card');
      for (const step of ['move', 'depth', 'lights', 'scan']) {
        await expect(card).toHaveAttribute('data-step', step);
        await page.locator('.onboard-skip-step').tap();
      }
      await expect(card).toHaveAttribute('data-step', 'journal');
      await page.screenshot({ path: `${shots}/tutorial-journal-${tag}.png` });
      const h = (await card.boundingBox())!.height;
      expect(h).toBeLessThanOrEqual(56);
      // Scan card + tutorial leave the middle of the screen open.
      const bottoms = await page.evaluate(() =>
        ['.onboard-card', '.scan-panel']
          .map((s) => document.querySelector(s)?.getBoundingClientRect())
          .filter((r): r is DOMRect => !!r && r.height > 0)
          .map((r) => r.bottom),
      );
      expect(Math.max(...bottoms)).toBeLessThan(viewport.height * 0.5 + 20);
    });

    test('objective chip shows when no contact is in range', async ({ page }) => {
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
      await expect(page.locator('.scan-panel')).toBeHidden();
      const chip = page.locator('.scan-objective-chip');
      await expect(chip).toBeVisible();
      await expect(chip).toContainText('▸');
      const box = (await chip.boundingBox())!;
      expect(box.height).toBeLessThanOrEqual(28);
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
