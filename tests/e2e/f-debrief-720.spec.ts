// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from './helpers/unlocked.js';
import type { Discovery } from '../../src/game/Discovery.js';
import type { Journal } from '../../src/ui/Journal.js';
import type { Submarine } from '../../src/sub/Submarine.js';
import type { CameraRig } from '../../src/sub/CameraRig.js';
import { scanWithKeyboard } from './helpers/scan.js';
import { clockFramesUntil, pauseClockBeforeNavigation } from './helpers/clock.js';

const env =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const before = env.F_DEBRIEF_PHASE === 'before';
const rounds = Number(env.ROUNDS ?? 2);
const sites = ['titanic', 'lost-city', 'great-blue-hole', 'beebe-vent-field', 'monterey-canyon'];
type Game = {
  discovery: Discovery;
  journal: Journal;
  sub: Submarine;
  rig: CameraRig;
  save: { get(): { gameplayMode: string } };
};

async function contained(target: Locator): Promise<void> {
  await expect(target).toBeVisible();
  expect(await target.evaluate((e) => e.scrollWidth - e.clientWidth)).toBeLessThanOrEqual(1);
  const box = (await target.boundingBox())!;
  const viewport = target.page().viewportSize()!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
}

async function contents(page: Page): Promise<void> {
  const toggle = page.locator('.jr-contents-toggle');
  if ((await toggle.isVisible()) && (await toggle.getAttribute('aria-expanded')) === 'false')
    await toggle.click();
}

for (const viewport of [
  { width: 1600, height: 900, touch: false },
  { width: 390, height: 844, touch: true },
  { width: 844, height: 390, touch: true },
]) {
  test.describe(`720 debrief/Journal ${viewport.width}x${viewport.height}`, () => {
    test.use({
      viewport,
      hasTouch: viewport.touch,
      isMobile: viewport.touch,
      deviceScaleFactor: 1,
      serviceWorkers: 'block',
      storageState: { cookies: [], origins: [] },
    });
    for (const site of sites) {
      test(`${site}: short summary, Journal, resume and exit`, async ({ page }) => {
        test.setTimeout(240_000);
        // Present frames explicitly: repeated DOM checks must not continuously
        // render a 1600px WebGL scene on a hosted software GPU.
        await pauseClockBeforeNavigation(page);
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        const directory = `.cache/codex/shots/720-f-debrief-journal/${before ? 'before' : 'after'}/${viewport.width}x${viewport.height}/${site}`;
        await mkdir(directory, { recursive: true });
        const shot = async (name: string): Promise<void> => {
          await page.clock.runFor(34);
          await page.screenshot({ path: `${directory}/${name}.png` });
        };
        // Rendering tier only: mode retains the Arcade default, discoveries start empty.
        await page.addInitScript(() => {
          localStorage.setItem(
            'subexplorer.settings.v2',
            JSON.stringify({ version: 2, graphicsTier: 'low' }),
          );
        });
        await page.goto(`/?mission=${site}&skipBriefing=1`, { waitUntil: 'domcontentloaded' });
        await clockFramesUntil(
          page,
          () => window.__gameReady === true && (window.__game as unknown as Game).discovery.loaded,
        );
        expect(
          await page.evaluate(() => (window.__game as unknown as Game).save.get().gameplayMode),
        ).toBe('arcade');
        for (let round = 1; round <= rounds; round++) {
          await page.keyboard.press('Escape');
          await page.locator('.pause-surface').click();
          const debrief = page.locator('.mission-debrief');
          await expect(debrief).toBeVisible();
          await expect(debrief.locator('[data-field="discoveries"] .debrief-value')).toHaveText(
            String(round === 1 ? 0 : 1),
          );
          await contained(debrief.locator('.debrief-panel'));
          if (!before) {
            await expect(debrief.locator('.debrief-btn.is-primary')).toHaveCount(1);
            await expect(debrief.locator('.debrief-btn.is-primary')).toHaveAttribute(
              'data-action',
              round === 1 ? 'keep-exploring' : 'dive-sites',
            );
            // Zero scans: Dive sites is demoted to a quiet link; otherwise it is the primary.
            await expect(
              debrief.locator('.debrief-secondary > [data-action="dive-sites"]'),
            ).toHaveCount(round === 1 ? 1 : 0);
            await expect(debrief.locator('.debrief-highlight')).toHaveCount(1);
            await expect(debrief.locator('.debrief-next')).toHaveCount(1);
            await expect(debrief.locator('.debrief-rating')).toContainText('research points');
            await expect(debrief.locator('.debrief-section.is-samples')).toHaveCount(0);
          }
          await shot(`round-${round}-debrief`);
          await debrief.locator('[data-action="journal"]').click();
          const journal = page.locator('.journal');
          await expect(journal).toBeVisible();
          await contained(journal.locator('.jr-panel'));
          await contained(journal.locator('.jr-header'));
          await contained(journal.locator('.jr-body'));
          await shot(`round-${round}-journal`);
          if (round === 1) {
            await expect(journal.locator('.jr-locked')).toBeVisible();
            await contents(page);
            await journal.locator('[data-target="front"]').click();
            await expect(journal.locator('.jr-honesty')).toHaveCount(1);
            await shot('journal-front');
            await journal.locator(`.jr-site-card[data-target="${site}"]`).click();
            await journal.locator('.jr-spoilers input').check();
            await contents(page);
            await journal
              .locator(
                site === 'monterey-canyon'
                  ? '[data-target="monterey-canyon/poi/canyon-wall"]'
                  : '.jr-nav-item.is-poi',
              )
              .first()
              .click();
            if (!before) {
              await expect(journal.locator('.jr-tag.is-recreation')).toHaveCount(1);
              await expect(journal.locator('.jr-tag.is-recreation')).toHaveText('Recreation');
              await expect(journal.locator('.jr-honesty')).toHaveCount(0);
              if (viewport.width === 390) {
                await expect(journal.locator('.jr-nav')).toBeHidden();
                expect((await journal.locator('.jr-body').boundingBox())!.height).toBeGreaterThan(
                  viewport.height * 0.5,
                );
                await contents(page);
                await contained(journal.locator('.jr-nav'));
                await journal.locator('.jr-contents-toggle').click();
                await expect(journal.locator('.jr-contents-toggle')).toBeFocused();
              }
            }
            await shot('journal-spoiler-entry');
            await journal.locator('.jr-spoilers input').uncheck();
          }
          await journal.locator('.jr-close').click();
          await expect(debrief.locator('[data-action="journal"]')).toBeFocused();
          await debrief.locator('[data-action="keep-exploring"]').click();
          await expect(debrief).toBeHidden();
          if (round === 1) {
            // Assisted scan tests rewards/unlocking; this is not a natural first-scan timing audit.
            const id = await page.evaluate(() => {
              const g = window.__game as unknown as Game;
              const poi = g.discovery.pois[0]!;
              const pose = g.discovery.spawnPose(poi.id)!;
              g.sub.reset(pose.x, pose.y, pose.z, pose.yaw);
              g.rig.snap(g.sub.position, g.sub.yaw, g.sub.pitch);
              g.discovery.stats.markTeleport();
              return poi.id;
            });
            await scanWithKeyboard(page, id);
          }
        }
        await page.keyboard.press('Escape');
        await page.locator('.pause-surface').click();
        await page.locator('.mission-debrief [data-action="dive-sites"]').click();
        await expect(page.locator('.home-sites')).toBeVisible();
        await page.getByRole('button', { name: 'Back to menu', exact: true }).click();
        await expect(page.locator('.home-menu')).toBeVisible();
        expect(errors).toEqual([]);
      });
    }
  });
}
