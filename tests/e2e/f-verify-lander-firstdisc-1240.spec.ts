import { expect, test, type Page } from '@playwright/test';
import type { Discovery } from '../../src/game/Discovery.js';
import type { Tutorial } from '../../src/game/Tutorial.js';
import type { Props } from '../../src/world/Props.js';
import type { PerfStats } from '../../src/app/systems/quality.js';
import { clockFramesUntil, pauseClockBeforeNavigation } from './helpers/clock.js';
import { completeScan, scanWithKeyboard } from './helpers/scan.js';

interface Game {
  discovery: Discovery;
  props: Props;
  perf: PerfStats;
  onboard: { tutorial: Tutorial };
}

async function holdTouch(page: Page, selector: string, y: number, work: () => Promise<void>) {
  const box = (await page.locator(selector).boundingBox())!;
  const session = await page.context().newCDPSession(page);
  try {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }],
    });
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height * y }],
    });
    await work();
  } finally {
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await session.detach();
  }
}

for (const touch of [false, true]) {
  test.describe(`1240 ${touch ? 'portrait touch' : 'desktop'}`, () => {
    test.use({
      viewport: touch ? { width: 390, height: 844 } : { width: 1280, height: 720 },
      hasTouch: touch,
      isMobile: touch,
      deviceScaleFactor: 1,
      storageState: { cookies: [], origins: [] },
      serviceWorkers: 'block',
    });
    for (const site of [
      { id: 'challenger-deep', poi: 'cd-leggo-amphipod-site', opening: true },
      { id: 'endurance', poi: 'endurance-hull', opening: true },
      { id: 'titanic', poi: 'titanic-bow', opening: false },
      { id: 'lost-city', poi: 'lost-city-poseidon', opening: false },
    ]) {
      test(`${site.id}: scan reward names the POI and opens its authored Journal entry`, async ({
        page,
      }) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await pauseClockBeforeNavigation(page);
        const tutorial = site.id === 'challenger-deep';
        await page.goto(
          `/?tile=${site.id}&tier=low&dynres=0&lifeSeed=42&tutorial=${tutorial ? 1 : 0}${touch ? '&touch=1' : ''}${site.opening ? '' : `&poi=${site.poi}`}`,
          {
            waitUntil: 'domcontentloaded',
          },
        );
        await clockFramesUntil(page, () => {
          const g = window.__game as unknown as Game;
          return (
            window.__gameReady === true &&
            g.props.loaded &&
            g.discovery.loaded &&
            g.discovery.scanner.view.candidateId !== null
          );
        });
        const target = await page.evaluate((id) => {
          const g = window.__game as unknown as Game;
          const poi = g.discovery.pois.find((p) => p.id === id)!;
          const entry = g.discovery.entries.find((e) => e.id === poi.guideEntry)!;
          return {
            name: poi.name,
            entryId: entry.id,
            title: entry.title,
            candidate: g.discovery.scanner.view.candidateId,
          };
        }, site.poi);
        expect(target.candidate).toBe(site.poi);
        expect(target.title).not.toBe(target.name); // Authored copy really differs at these sites.
        await expect(page.locator('.guidance-name')).toHaveText(target.name);
        if (touch) await holdTouch(page, '.tc-btn-scan', 0.5, () => completeScan(page, site.poi));
        else await scanWithKeyboard(page, site.poi);
        await expect(page.locator('.guidance-kicker')).toHaveText('NEW ENTRY');
        await expect(page.locator('.guidance-name')).toHaveText(target.name);
        await expect(page.locator('.guidance-hint')).toHaveText(
          touch ? 'OPEN JOURNAL' : 'PRESS J · JOURNAL',
        );
        const result = await page.evaluate(() => {
          const g = window.__game as unknown as Game;
          return {
            scanned: g.discovery.scanner.view.lastCompleteId,
            step: g.onboard.tutorial.step?.id,
            calls: g.perf.drawCalls,
            triangles: g.perf.triangles,
          };
        });
        expect(result.scanned).toBe(site.poi);
        expect(result.calls).toBeGreaterThan(0);
        expect(result.calls).toBeLessThanOrEqual(1500);
        expect(result.triangles).toBeGreaterThan(10_000);
        expect(result.triangles).toBeLessThanOrEqual(1_500_000);

        if (tutorial) {
          expect(result.step).toBe('move');
          const moved = () =>
            clockFramesUntil(
              page,
              () => (window.__game as unknown as Game).onboard.tutorial.step?.id === 'depth',
              250,
            );
          if (touch) await holdTouch(page, '.tc-stick', 0.1, moved);
          else {
            await page.keyboard.down('KeyA');
            try {
              await moved();
            } finally {
              await page.keyboard.up('KeyA');
            }
          }
          const rose = () =>
            clockFramesUntil(
              page,
              () => (window.__game as unknown as Game).onboard.tutorial.finished,
              250,
            );
          if (touch) await holdTouch(page, '.tc-slider', 0.05, rose);
          else {
            await page.keyboard.down('Space');
            try {
              await rose();
            } finally {
              await page.keyboard.up('Space');
            }
          }
          // Completion is retained without starting another scan or reordering movement and depth: the retained scan finishes the last step.
          expect(
            await page.evaluate(
              () => (window.__game as unknown as Game).discovery.scanner.view.completed,
            ),
          ).toBe(1);
        }

        if (touch) {
          await page.locator('.tc-btn-pause').tap();
          await page
            .locator('.pause-menu')
            .getByRole('button', { name: 'Journal', exact: true })
            .tap();
        } else await page.keyboard.press('KeyJ');
        await clockFramesUntil(
          page,
          () => (window.__game as unknown as Game).discovery.guide.isOpen,
        );
        await expect(page.locator('.journal .jr-body .jr-title')).toHaveText(target.title);
        await expect(page.locator('.journal .jr-body')).not.toContainText('Scan to unlock');
        if (tutorial) {
          expect(
            await page.evaluate(() => (window.__game as unknown as Game).onboard.tutorial.finished),
          ).toBe(true);
          expect(
            await page.evaluate(
              () => JSON.parse(localStorage.getItem('subexplorer.onboard.v1')!).tutorialDone,
            ),
          ).toBe(true);
        }
        await page.screenshot({
          path: `.cache/codex/shots/1240/${site.id}-${touch ? 'portrait' : 'desktop'}-journal.png`,
        });
        expect(errors).toEqual([]);
      });
    }
  });
}
