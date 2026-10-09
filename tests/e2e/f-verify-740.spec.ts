import { openJournalCategory } from './helpers/journal.js';
import { dismissTutorial } from './helpers/tutorial.js';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { writeFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import catalog from '../../data/landmarks/index.json' with { type: 'json' };
import type { Discovery } from '../../src/game/Discovery.js';
import type { Save } from '../../src/core/Save.js';
import type { Submarine } from '../../src/sub/Submarine.js';
import type { Props } from '../../src/world/Props.js';
import { clockFramesUntil, pauseClockBeforeNavigation } from './helpers/clock.js';

interface Game {
  discovery: Discovery;
  save: Save;
  sub: Submarine;
  props: Props;
  explore: { ready: boolean };
  config: { submarine: { hullRadius: number } };
}

const panels = [
  '.sonar',
  '.objectives-panel',
  '.hud-readouts',
  '.hud-attribution',
  '.hud-warning',
  '.hud-notice',
  '.hud-objective',
  '.hud-prompt',
  '.hud-control-tips',
  '.hud-reset-camera',
  '.scan-panel',
  '.onboard-card',
  '.onboard-hint',
  '.tc-stick',
  '.tc-slider',
  '.tc-buttons',
  '.tc-btn-pause',
  '.tc-rotate-hint',
];

async function bounds(page: Page) {
  return page.evaluate(
    (selectors) =>
      selectors.flatMap((selector) => {
        const e = document.querySelector<HTMLElement>(selector);
        if (!e?.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return [];
        const r = e.getBoundingClientRect();
        if (!r.width || !r.height) return [];
        return [
          { selector, text: e.innerText, ...r.toJSON(), clips: e.scrollWidth > e.clientWidth + 1 },
        ];
      }),
    panels,
  );
}

for (const layout of [
  { width: 1280, height: 800, touch: false },
  { width: 390, height: 844, touch: true },
  // The original dropped 590 failure was at this short-landscape breakpoint.
  { width: 844, height: 390, touch: true },
]) {
  test.describe(`740 Surface ${layout.width}x${layout.height}`, () => {
    test.use({
      viewport: { width: layout.width, height: layout.height },
      hasTouch: layout.touch,
      isMobile: layout.touch,
      deviceScaleFactor: 1,
      storageState: { cookies: [], origins: [] },
      serviceWorkers: 'block',
    });

    for (const mode of ['arcade', 'realistic'] as const) {
      test(`${mode}: Blue Hole Surface HUD, scan card and hints stay separate`, async ({
        page,
      }, testInfo) => {
        test.setTimeout(180_000);
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(e.message));
        page.on('console', (e) => {
          if (e.type() === 'error') errors.push(e.text());
        });
        await pauseClockBeforeNavigation(page);
        await page.addInitScript((gameplayMode) => {
          localStorage.setItem(
            'subexplorer.settings.v2',
            JSON.stringify({ version: 2, gameplayMode, reduceMotion: true }),
          );
        }, mode);
        await page.goto('/?mission=great-blue-hole&tier=low&dynres=0&tutorial=0&lifeSeed=42', {
          waitUntil: 'domcontentloaded',
        });
        await clockFramesUntil(page, () => {
          const g = window.__game as unknown as Game | undefined;
          return !!(window.__gameReady && g?.discovery.loaded && g.props.loaded && g.explore.ready);
        });
        expect(
          await page.evaluate(() => (window.__game as unknown as Game).save.get().gameplayMode),
        ).toBe(mode);
        await page.locator('.briefing-start input[value="surface"]').check();
        if (layout.touch) await page.locator('.briefing-begin').tap();
        else await page.locator('.briefing-begin').click();
        await expect(page.locator('.briefing')).toBeHidden();
        await page.evaluate(() => document.fonts.ready.then(() => {}));
        // Render a stable Surface state; timers cannot expire a toast during capture.
        await page.clock.runFor(100);
        const surface = await page.evaluate(() => {
          const g = window.__game as unknown as Game;
          return {
            y: g.sub.position.y,
            radius: g.config.submarine.hullRadius,
            start: g.save.get().gameplay.startPosition,
          };
        });
        expect(surface.start).toBe('surface');
        expect(surface.y).toBeGreaterThan(-20);
        expect(surface.y).toBeLessThanOrEqual(-surface.radius + 1);
        for (const selector of [
          '.sonar',
          '.objectives-panel',
          '.hud-readouts',
          '.hud-attribution',
          ...(layout.touch ? ['.tc-stick', '.tc-slider', '.tc-buttons', '.tc-btn-pause'] : []),
        ])
          await expect(page.locator(selector)).toBeVisible();
        if (mode === 'realistic') {
          await expect(page.locator('.hud-power')).toBeVisible();
          await expect(page.locator('.hud-current')).toBeVisible();
        }
        const auditSurface = async (name: string) => {
          const boxes = await bounds(page);
          // Save evidence before assertions: a persistent collision must be reviewable.
          const screenshot = testInfo.outputPath(`${name}.png`);
          await page.screenshot({ path: screenshot });
          const diagnostics = testInfo.outputPath(`${name}.json`);
          await writeFile(
            diagnostics,
            JSON.stringify(
              {
                layout,
                mode,
                surface,
                currentY: await page.evaluate(
                  () => (window.__game as unknown as Game).sub.position.y,
                ),
                boxes,
                errors,
              },
              null,
              2,
            ),
          );
          await testInfo.attach(name, { path: screenshot, contentType: 'image/png' });
          await testInfo.attach(`${name}-bounds`, {
            path: diagnostics,
            contentType: 'application/json',
          });
          expect.soft(errors).toEqual([]);
          for (const b of boxes) {
            expect.soft(b.left, `${b.selector} left`).toBeGreaterThanOrEqual(0);
            expect.soft(b.top, `${b.selector} top`).toBeGreaterThanOrEqual(0);
            expect.soft(b.right, `${b.selector} right`).toBeLessThanOrEqual(layout.width);
            expect.soft(b.bottom, `${b.selector} bottom`).toBeLessThanOrEqual(layout.height);
            expect.soft(b.clips, `${b.selector} clips text`).toBe(false);
          }
          for (let i = 0; i < boxes.length; i++)
            for (const b of boxes.slice(i + 1)) {
              const a = boxes[i];
              expect
                .soft(
                  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom,
                  `${a.selector} overlaps ${b.selector}: ${JSON.stringify([a, b])}`,
                )
                .toBe(false);
            }
        };
        await auditSurface('surface');

        // Separate component stress case: the live repro above has no injected
        // scan or hint state. Complete the real tutorial through its button to
        // produce its real toast, then render an authored contact's completion
        // card without claiming a scan occurred at the surface.
        await page.evaluate(() => {
          // The completion toast shares a chip with contextual hints. This
          // fixture owns completion; animal hints have separate live coverage
          // in f-toast-placement and f-first-minute-620.
          localStorage.setItem(
            'subexplorer.onboard.v1',
            JSON.stringify({ version: 1, seenHints: ['creature'] }),
          );
        });
        await page.goto('/?mission=great-blue-hole&tier=low&dynres=0&tutorial=1&lifeSeed=42', {
          waitUntil: 'domcontentloaded',
        });
        await clockFramesUntil(page, () => {
          const g = window.__game as unknown as Game | undefined;
          return !!(window.__gameReady && g?.discovery.loaded && g.props.loaded && g.explore.ready);
        });
        await page.locator('.briefing-start input[value="surface"]').check();
        if (layout.touch) await page.locator('.briefing-begin').tap();
        else await page.locator('.briefing-begin').click();
        await page.clock.runFor(100);
        await expect(page.locator('.onboard-card')).toBeVisible();
        await dismissTutorial(page, layout.touch, true);
        await page.evaluate(() => {
          const g = window.__game as unknown as Game;
          const contact = g.discovery.pois[0];
          if (!contact) throw new Error('No authored contact for the Surface stress case');
          g.discovery.overlay.showComplete(contact.name, true, { scan: 'G', guide: 'J' });
        });
        await page.clock.runFor(100);
        await expect(page.locator('.onboard-card')).toBeHidden();
        await expect(page.locator('.onboard-hint')).toContainText('Nice work.');
        await expect(page.locator('.scan-panel')).toBeVisible();
        expect(
          await page.evaluate(() => (window.__game as unknown as Game).sub.position.y),
        ).toBeGreaterThan(-20);
        await auditSurface('surface-card-and-toast');
      });
    }
  });
}

for (const layout of [
  { width: 1280, height: 800, touch: false },
  { width: 390, height: 844, touch: true },
]) {
  test.describe(`740 Journal ${layout.width}x${layout.height}`, () => {
    test.use({
      viewport: { width: layout.width, height: layout.height },
      hasTouch: layout.touch,
      isMobile: layout.touch,
      storageState: { cookies: [], origins: [] },
      serviceWorkers: 'block',
    });

    test('all thirteen sites give secrets and staged wildlife exactly one addition tag', async ({
      page,
    }, testInfo) => {
      test.setTimeout(240_000);
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto('/?tier=low', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__gameReady === true);
      const click = async (selector: string) => {
        const button = page.locator(selector);
        await button.scrollIntoViewIfNeeded();
        if (layout.touch) await button.tap();
        else await button.click();
      };
      const contents = async () => {
        const toggle = page.locator('.jr-contents-toggle');
        if ((await toggle.isVisible()) && (await toggle.getAttribute('aria-expanded')) === 'false')
          await click('.jr-contents-toggle');
      };
      const homeJournal = page
        .locator('.home-menu')
        .getByRole('button', { name: 'Journal', exact: true });
      if (layout.touch) await homeJournal.tap();
      else await homeJournal.click();
      await expect(page.locator('.jr-site-card')).toHaveCount(13);
      await expect(page.locator('.jr-honesty')).toContainText('real survey data');
      await page.locator('.jr-spoilers input').check();
      for (const site of catalog.landmarks) {
        await contents();
        await click(`.jr-nav-item.is-site[data-target="${site}"]`);
        for (const kind of ['life', 'secret']) {
          await contents();
          await openJournalCategory(page, site, kind);
          const entry = page.locator(`.jr-nav-item[data-target^="${site}/${kind}/"]`).first();
          await expect(entry).toBeVisible();
          await entry.scrollIntoViewIfNeeded();
          if (layout.touch) await entry.tap();
          else await entry.click();
          const tag = page.locator('.jr-title-row .jr-tag:not(.is-undiscovered)');
          await expect(tag).toHaveCount(1);
          await expect(tag).toHaveText('Game addition');
          await expect(page.locator('.jr-body .jr-para').first()).toBeVisible();
          await expect(page.locator('.jr-body')).not.toContainText(
            /\b(?:illustrative|reconstructed|recreations?)\b/i,
          );
          const title = page.locator('.jr-title-row');
          expect(await title.evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
          if (kind === 'life')
            await expect(page.locator('.jr-sources a').first()).toHaveAttribute(
              'href',
              /^https?:\/\//,
            );
        }
      }
      await page.screenshot({ path: testInfo.outputPath('journal-addition.png') });
      expect(errors).toEqual([]);
    });
  });
}
