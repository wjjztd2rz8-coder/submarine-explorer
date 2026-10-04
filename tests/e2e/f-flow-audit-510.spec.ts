// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';
import type { Discovery } from '../../src/game/Discovery.js';
import type { Journal } from '../../src/ui/Journal.js';
import type { Submarine } from '../../src/sub/Submarine.js';
import type { CameraRig } from '../../src/sub/CameraRig.js';
import { completeScan, scanWithKeyboard } from './helpers/scan.js';
import { waitForFrames } from './helpers/frames.js';

/** Fresh player: no hull unlocks, discoveries, skipped briefing or completed tutorial. */
const shots = '.cache/codex/shots/510-f-journal-debrief-flow-audit';
const sites = ['titanic', 'lost-city', 'great-blue-hole', 'beebe-vent-field', 'monterey-canyon'];
type Game = {
  discovery: Discovery;
  journal: Journal;
  sub: Submarine;
  rig: CameraRig;
  onboard: { tutorial: { index: number } };
};

async function ready(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__gameReady === true);
  await page.waitForFunction(() => (window.__game as unknown as Game).discovery.loaded);
}

async function act(target: Locator, touch: boolean): Promise<void> {
  if (touch) await target.tap();
  else await target.click();
}

async function contained(target: Locator): Promise<void> {
  const offender = await target.evaluate((e) => {
    if (e.scrollWidth <= e.clientWidth + 1) return '';
    const wide = [...e.querySelectorAll('*')].find(
      (c) =>
        c.getBoundingClientRect().right > e.getBoundingClientRect().left + e.clientWidth + 1 ||
        c.scrollWidth > c.clientWidth + 1,
    );
    return `${[...e.querySelectorAll('*')]
      .map(
        (c) =>
          c.tagName +
          '.' +
          c.className +
          ':' +
          Math.round(c.getBoundingClientRect().right - e.getBoundingClientRect().left),
      )
      .slice(-14)
      .join(
        ' | ',
      )} ${e.scrollWidth}>${e.clientWidth} via ${wide?.tagName}.${wide?.className} ${wide?.textContent?.slice(0, 40)}`;
  });
  expect(offender, `${target} must not clip text horizontally`).toBe('');
}

async function pause(page: Page, touch: boolean): Promise<void> {
  if (touch) await page.locator('.tc-btn-pause').tap();
  else await page.keyboard.press('Escape');
  await expect(page.locator('.pause-menu')).toBeVisible();
}

async function closeJournal(page: Page, touch: boolean): Promise<void> {
  if (touch) await page.locator('.jr-close').tap();
  else await page.keyboard.press('Escape');
  await expect(page.locator('.journal')).toBeHidden();
}

/** Native touch gestures through Chromium, including pointer capture and release. */
async function holdTouchUntilStep(
  page: Page,
  selector: string,
  step: number,
  xFraction: number,
  yFraction: number,
): Promise<void> {
  const box = (await page.locator(selector).boundingBox())!;
  const session = await page.context().newCDPSession(page);
  try {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }],
    });
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: box.x + box.width * xFraction, y: box.y + box.height * yFraction }],
    });
    await page.waitForFunction(
      (step) => (window.__game as unknown as Game).onboard.tutorial.index === step,
      step,
    );
  } finally {
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await session.detach();
  }
}

async function firstActions(page: Page, touch: boolean): Promise<void> {
  if (touch) {
    await holdTouchUntilStep(page, '.tc-stick', 1, 0.8, 0.2);
    await holdTouchUntilStep(page, '.tc-slider', 2, 0.5, 0.15);
    await page.locator('.tc-btn-lights').tap();
  } else {
    await page.keyboard.down('w');
    await page.keyboard.down('d');
    try {
      await page.waitForFunction(
        () => (window.__game as unknown as Game).onboard.tutorial.index === 1,
      );
    } finally {
      await page.keyboard.up('w');
      await page.keyboard.up('d');
    }
    await page.keyboard.down('Space');
    try {
      await page.waitForFunction(
        () => (window.__game as unknown as Game).onboard.tutorial.index === 2,
      );
    } finally {
      await page.keyboard.up('Space');
    }
    await page.keyboard.press('l');
  }
  await expect(page.locator('.onboard-card')).toHaveAttribute('data-step', 'scan');
  // The tutorial asks for a toggle; restore light for the scene observations.
  if (touch) await page.locator('.tc-btn-lights').tap();
  else await page.keyboard.press('l');
}

for (const viewport of [
  { width: 1600, height: 900, touch: false },
  { width: 844, height: 390, touch: true },
  { width: 390, height: 844, touch: true },
]) {
  const size = `${viewport.width}x${viewport.height}`;
  test.describe(`510 flow ${size}`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      hasTouch: viewport.touch,
      isMobile: viewport.touch,
      deviceScaleFactor: 1,
      storageState: { cookies: [], origins: [] },
      serviceWorkers: 'block',
    });
    for (const site of sites) {
      test(`${site}: Home -> first minute -> Journal -> debrief -> Home`, async ({ page }) => {
        // Real unfrozen game time, never an injected clock or accelerated vehicle.
        test.setTimeout(900_000);
        const directory = `${shots}/${size}/${site}`;
        await mkdir(directory, { recursive: true });
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(e.message));
        const records: unknown[] = [];
        const shot = async (name: string): Promise<void> => {
          await waitForFrames(page, 2);
          const path = `${directory}/${name}.png`;
          await page.screenshot({ path });
          records.push({
            path,
            ...(await page.evaluate(() => {
              const g = window.__game as unknown as Game;
              const selectors = [
                '.onboard-card',
                '.objectives-panel',
                '.hud-readouts',
                '.scan-panel',
                '.sonar',
                '.hud-attribution',
                '.tc-stick',
                '.tc-slider',
                '.tc-buttons',
                '.tc-btn-pause',
                '.jr-panel',
                '.debrief-panel',
              ];
              return {
                elapsedS: g.discovery.stats.elapsedS,
                tutorialStep: g.onboard.tutorial.index,
                candidate: g.discovery.scanner.view.candidateId,
                position: { x: g.sub.position.x, y: g.sub.position.y, z: g.sub.position.z },
                panels: selectors.flatMap((selector) => {
                  const e = document.querySelector<HTMLElement>(selector);
                  if (!e?.getClientRects().length) return [];
                  return [
                    { selector, rect: e.getBoundingClientRect().toJSON(), text: e.innerText },
                  ];
                }),
              };
            })),
          });
          await writeFile(`${directory}/manifest.json`, JSON.stringify(records, null, 2));
        };
        const touch = viewport.touch;
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await ready(page);
        const home = page.locator('.home-screen');
        await expect(home).toBeVisible();
        await expect(home.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled();
        await shot('01-home');
        await act(home.getByRole('button', { name: 'Dive sites', exact: true }), touch);
        const back = home.getByRole('button', { name: 'Back to menu', exact: true });
        await act(back, touch);
        await expect(home.locator('.home-sites')).toBeHidden();
        await act(home.getByRole('button', { name: 'Dive sites', exact: true }), touch);
        const choice = home.locator(`.mission-item[data-mission="${site}"]`);
        await expect(choice).toBeEnabled();
        await choice.scrollIntoViewIfNeeded();
        await contained(choice);
        await shot('02-pick-site');
        await act(choice, touch);
        await ready(page);
        await expect(page.locator('.briefing')).toBeVisible();
        await shot('03-briefing');
        const cancel = page.getByRole('button', { name: 'Back to home', exact: true });
        await cancel.scrollIntoViewIfNeeded();
        await act(cancel, touch);
        await expect(home).toBeVisible();
        await act(home.getByRole('button', { name: 'Dive sites', exact: true }), touch);
        await act(home.locator(`.mission-item[data-mission="${site}"]`), touch);
        await ready(page);
        const begin = page.locator('.briefing-begin');
        await begin.scrollIntoViewIfNeeded();
        await shot('04-briefing-actions');
        await act(begin, touch);
        await expect(page.locator('.onboard-card')).toHaveAttribute('data-step', 'move');
        await shot('05-dive-start');
        await firstActions(page, touch);
        // After learning motion/depth/lights, observe the opening without guessing
        // a target route. This is a reproducible script, not a human usability study.
        for (const seconds of [10, 30, 60]) {
          await page.waitForFunction(
            (s) => (window.__game as unknown as Game).discovery.stats.elapsedS >= s,
            seconds,
            { timeout: 600_000 },
          );
          await shot(`06-dive-${seconds}s`);
        }
        await pause(page, touch);
        await act(
          page.locator('.pause-menu').getByRole('button', { name: 'Journal', exact: true }),
          touch,
        );
        const journal = page.locator('.journal');
        await expect(journal.locator('.jr-body .jr-locked')).toBeVisible();
        await expect(journal.locator('.jr-body .is-undiscovered')).toHaveText('No scans logged');
        await contained(journal.locator('.jr-header'));
        await contained(journal.locator('.jr-nav'));
        await contained(journal.locator('.jr-body'));
        // Check the long current-site label plus THIS DIVE count in its actual column.
        await contained(journal.locator(`.jr-nav-item[data-target="${site}"]`));
        await shot('07-journal-unscanned');
        await closeJournal(page, touch);
        await expect(page.locator('.pause-menu')).toBeVisible();
        await shot('08-pause');
        await act(page.locator('.pause-surface'), touch);
        const debrief = page.locator('.mission-debrief');
        await expect(debrief).toBeVisible();
        await expect(debrief.locator('.debrief-title')).toHaveText('Dive ended');
        await expect(debrief.locator('[data-field="discoveries"] .debrief-value')).toHaveText('0');
        await shot('09-debrief-unscanned');
        await act(debrief.locator('[data-action="journal"]'), touch);
        await expect(journal).toBeVisible();
        await shot('10-journal-from-debrief');
        await closeJournal(page, touch);
        await expect(debrief).toBeVisible();
        await expect(debrief.locator('[data-action="journal"]')).toBeFocused();
        await act(debrief.locator('[data-action="keep-exploring"]'), touch);

        // Supplemental reward/navigation check AFTER the first minute. Teleport is
        // explicit in the filename; it is not evidence of a reachable opening scan.
        const poi = await page.evaluate(() => {
          const g = window.__game as unknown as Game;
          const poi = g.discovery.pois[0]!;
          const pose = g.discovery.spawnPose(poi.id)!;
          g.sub.reset(pose.x, pose.y, pose.z, pose.yaw);
          g.rig.snap(g.sub.position, g.sub.yaw, g.sub.pitch);
          g.discovery.stats.markTeleport();
          return { id: poi.id, entry: poi.guideEntry };
        });
        if (touch) {
          const session = await page.context().newCDPSession(page);
          await expect(page.locator('.tc-btn-scan')).toBeVisible();
          const box = (await page.locator('.tc-btn-scan').boundingBox())!;
          try {
            await session.send('Input.dispatchTouchEvent', {
              type: 'touchStart',
              touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }],
            });
            await completeScan(page, poi.id);
          } finally {
            await session
              .send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
              .catch(() => undefined);
            await session.detach();
          }
        } else await scanWithKeyboard(page, poi.id);
        await pause(page, touch);
        await act(
          page.locator('.pause-menu').getByRole('button', { name: 'Journal', exact: true }),
          touch,
        );
        await expect(journal.locator('.jr-body .jr-title')).not.toHaveText('Undiscovered');
        await expect(journal.locator('.jr-body .jr-locked')).toHaveCount(0);
        await expect
          .poll(() => page.evaluate(() => (window.__game as unknown as Game).journal.selectedId))
          .toBe(poi.entry);
        await contained(journal.locator('.jr-nav'));
        await contained(journal.locator('.jr-body'));
        await shot('11-journal-assisted-scan');
        await journal.locator('.jr-body').evaluate((e) => (e.scrollTop = e.scrollHeight));
        if (size === '844x390')
          expect(await journal.locator('.jr-body').evaluate((e) => e.scrollTop)).toBeGreaterThan(0);
        await closeJournal(page, touch);
        // Opening a focused entry must reset a prior scrolled article.
        await page.evaluate((entry) => {
          const g = window.__game as unknown as Game;
          g.journal.open(entry ?? undefined);
        }, poi.entry);
        await expect.poll(() => journal.locator('.jr-body').evaluate((e) => e.scrollTop)).toBe(0);
        await closeJournal(page, touch);
        await act(page.locator('.pause-surface'), touch);
        await expect(debrief).toBeVisible();
        await expect(debrief.locator('[data-field="discoveries"] .debrief-value')).toHaveText('1');
        await contained(debrief.locator('.debrief-panel'));
        await shot('12-debrief-assisted-scan');
        await debrief.locator('.debrief-panel').evaluate((e) => (e.scrollTop = e.scrollHeight));
        if (size === '844x390')
          expect(
            await debrief.locator('.debrief-panel').evaluate((e) => e.scrollTop),
          ).toBeGreaterThan(0);
        await act(debrief.locator('[data-action="keep-exploring"]'), touch);
        await pause(page, touch);
        await act(page.locator('.pause-surface'), touch);
        await expect
          .poll(() => debrief.locator('.debrief-panel').evaluate((e) => e.scrollTop))
          .toBe(0);
        await act(debrief.locator('[data-action="home"]'), touch);
        await expect(home).toBeVisible();
        await expect(home.locator('.home-menu')).toBeVisible();
        await shot('13-return-home');
        expect(errors).toEqual([]);
      });
    }
  });
}
