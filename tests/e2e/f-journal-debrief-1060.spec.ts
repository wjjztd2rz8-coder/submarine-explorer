// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from './helpers/unlocked.js';
import { clockFramesUntil, pauseClockBeforeNavigation, withClockFrames } from './helpers/clock.js';
import { openJournalCategory } from './helpers/journal.js';
import { scanWithKeyboard } from './helpers/scan.js';
import type { Journal } from '../../src/ui/Journal.js';
import type { Discovery } from '../../src/game/Discovery.js';
import type { Submarine } from '../../src/sub/Submarine.js';
import type { CameraRig } from '../../src/sub/CameraRig.js';

const env = (globalThis as { process?: { env?: Record<string, string> } }).process?.env ?? {};
const rounds = Number(env.ROUNDS ?? 3);
type Game = { journal: Journal; discovery: Discovery; sub: Submarine; rig: CameraRig };
const sites = ['titanic', 'lost-city', 'great-blue-hole', 'beebe-vent-field', 'monterey-canyon'];

async function contents(page: Page): Promise<void> {
  const toggle = page.locator('.jr-contents-toggle');
  if ((await toggle.isVisible()) && (await toggle.getAttribute('aria-expanded')) === 'false')
    await toggle.click();
}

async function fits(panel: Locator): Promise<void> {
  expect(await panel.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  const box = (await panel.boundingBox())!;
  const viewport = panel.page().viewportSize()!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
}

for (const viewport of [
  { width: 1600, height: 900, touch: false },
  { width: 390, height: 844, touch: true },
]) {
  test.describe(`1060 Journal/debrief ${viewport.width}x${viewport.height}`, () => {
    test.use({
      viewport,
      hasTouch: viewport.touch,
      isMobile: viewport.touch,
      deviceScaleFactor: 1,
      storageState: { cookies: [], origins: [] },
    });
    for (const site of sites) {
      test(`${site}: expandable groups, single tag and short debrief over ${rounds} rounds`, async ({
        page,
      }) => {
        test.setTimeout(240_000);
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await pauseClockBeforeNavigation(page);
        await page.goto(`/?mission=${site}&skipBriefing=1&tier=low`, {
          waitUntil: 'domcontentloaded',
        });
        await clockFramesUntil(
          page,
          () => window.__gameReady === true && (window.__game as unknown as Game).discovery.loaded,
        );
        await page.evaluate(() => (window.__game as unknown as Game).journal.load());
        const directory = `.cache/codex/shots/1060/${viewport.width}x${viewport.height}/${site}`;
        await mkdir(directory, { recursive: true });
        const shot = async (name: string) => {
          await page.clock.runFor(34);
          await page.screenshot({ path: `${directory}/${name}.png` });
        };
        const act = async (control: Locator) => {
          if (viewport.touch) await control.tap();
          else await control.click();
        };
        let scanName = '';
        for (let round = 1; round <= rounds; round++) {
          await page.keyboard.press('Escape');
          await act(page.locator('.pause-surface'));
          const debrief = page.locator('.mission-debrief');
          await expect(debrief).toBeVisible();
          await fits(debrief.locator('.debrief-panel'));
          expect(
            await debrief
              .locator('.debrief-panel')
              .evaluate((el) => el.scrollHeight - el.clientHeight),
          ).toBeLessThanOrEqual(1);
          await expect(debrief.locator('.debrief-score')).toHaveCount(1);
          await expect(debrief.locator('[data-field="discoveries"] .debrief-value')).toHaveText(
            round === 1 ? '0' : '1',
          );
          await expect(debrief.locator('.debrief-highlight')).toHaveText(
            round === 1 ? 'The site is waiting for your first scan.' : `Scanned ${scanName}.`,
          );
          await expect(debrief.locator('.debrief-next')).toHaveCount(1);
          await expect(debrief.locator('.debrief-btn.is-primary')).toHaveCount(1);
          await expect(
            debrief.locator('.debrief-stats, .debrief-lists, .debrief-subtitle'),
          ).toHaveCount(0);
          await shot(`round-${round}-debrief`);
          await act(debrief.locator('[data-action="journal"]'));
          const journal = page.locator('.journal');
          await expect(journal).toBeVisible();
          await contents(page);
          const current = journal.locator(`.jr-nav-list > li > [data-target="${site}"]`);
          await expect(current).toHaveAttribute('aria-expanded', 'true');
          await fits(journal.locator('.jr-panel'));
          await fits(journal.locator('.jr-nav'));
          const poi = journal.locator(`details[data-category="${site}/poi"]`);
          if (round === 1) {
            await expect(journal.locator('.jr-nav-list > li > [aria-expanded="true"]')).toHaveCount(
              1,
            );
            await expect(poi).toHaveAttribute('open', '');
            await expect(poi.locator('.jr-more-to-find')).toHaveText(/^\d+ more to find$/);
            await expect(
              journal.locator('.jr-nav-item', { hasText: /Unscanned target/ }),
            ).toHaveCount(0);
            const wildlife = journal.locator(`details[data-category="${site}/life"]`);
            await expect(wildlife).not.toHaveAttribute('open', '');
            await shot('journal-default-groups');
            // Native Enter and Space toggle a category and preserve focus.
            const summary = wildlife.locator('summary');
            await summary.focus();
            await page.keyboard.press('Enter');
            await expect(wildlife).toHaveAttribute('open', '');
            await page.keyboard.press('Space');
            await expect(wildlife).not.toHaveAttribute('open', '');
            await expect(summary).toBeFocused();
            // Site collapse restores the same rebuilt control, including on touch.
            await act(current);
            await expect(current).toHaveAttribute('aria-expanded', 'false');
            await expect(journal.locator(`#journal-entries-${site}`)).toBeHidden();
            if (!viewport.touch) await expect(current).toBeFocused();
            await act(current);
            await contents(page);
            await expect(current).toHaveAttribute('aria-expanded', 'true');
            // Collapsed categories are skipped by the stacked focus trap.
            await summary.focus();
            await page.keyboard.press('Tab');
            expect(
              await page.evaluate(
                () =>
                  !!document.activeElement?.closest('.journal') &&
                  (document.activeElement?.tagName === 'SUMMARY' ||
                    !document.activeElement?.closest('details:not([open])')),
              ),
            ).toBe(true);
            await page.keyboard.press('Shift+Tab');
            await expect(summary).toBeFocused();
            await journal.locator('.jr-spoilers input').check();
            await expect(wildlife).not.toHaveAttribute('open', '');
            await openJournalCategory(page, site, 'life');
            await act(wildlife.locator('.jr-nav-item').first());
            const tags = journal.locator('.jr-title-row .jr-tag:not(.is-undiscovered)');
            await expect(tags).toHaveCount(1);
            await expect(tags).toHaveText('Game addition');
            await shot('journal-game-addition');
            await openJournalCategory(page, site, 'secret');
            await act(
              journal.locator(`details[data-category="${site}/secret"] .jr-nav-item`).first(),
            );
            await expect(tags).toHaveCount(1);
            await expect(tags).toHaveText('Game addition');
            await shot('journal-secret');
            await journal.locator('.jr-spoilers input').uncheck();
            await openJournalCategory(page, site, 'life');
            await act(wildlife.locator('summary'));
            await journal.locator('.jr-spoilers input').check();
            await expect(wildlife).not.toHaveAttribute('open', '');
            const axe = await withClockFrames(page, () =>
              new AxeBuilder({ page }).include('.journal').analyze(),
            );
            expect(axe.violations.map((v) => v.id)).toEqual([]);
            await journal.locator('.jr-spoilers input').uncheck();
            // Selecting the expanded site from an entry must still open its
            // overview and mission facts, rather than just collapsing the list.
            await act(current);
            await expect(current).toHaveAttribute('aria-expanded', 'true');
            await expect(journal.locator('.jr-site-more summary')).toBeVisible();
          }
          await shot(`round-${round}-journal`);
          await act(journal.locator('.jr-close'));
          await expect(debrief.locator('[data-action="journal"]')).toBeFocused();
          await act(debrief.locator('[data-action="keep-exploring"]'));
          await expect(debrief).toBeHidden();
          if (round === 1) {
            const target = await page.evaluate(() => {
              const g = window.__game as unknown as Game;
              const target = g.discovery.pois[0]!;
              const pose = g.discovery.spawnPose(target.id)!;
              g.sub.reset(pose.x, pose.y, pose.z, pose.yaw);
              g.rig.snap(g.sub.position, g.sub.yaw, g.sub.pitch);
              g.discovery.stats.markTeleport();
              return { id: target.id, name: target.name };
            });
            scanName = target.name;
            await scanWithKeyboard(page, target.id);
          }
        }
        expect(errors).toEqual([]);
      });
    }
  });
}
