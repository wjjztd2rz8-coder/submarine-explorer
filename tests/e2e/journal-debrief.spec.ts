import fixtureGuide from '../../data/landmarks/_test/guide.json' with { type: 'json' };
import { reviewScreenshot } from './helpers/render.js';
import { expect, test as freshTest, type Page, type Locator } from '@playwright/test';
import { test as experiencedTest } from './helpers/unlocked.js';
import { homeReady } from './helpers/home.js';
import { diveReady, loadDive } from './helpers/dive.js';
import { advanceScan, completeScan, scanWithKeyboard } from './helpers/scan.js';

// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir, rm, writeFile } from 'node:fs/promises';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { execFile } from 'node:child_process';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { promisify } from 'node:util';

import { clockFramesUntil, pauseClockBeforeNavigation } from './helpers/clock.js';
import { type Discovery } from '../../src/game/Discovery.js';

import { type Submarine } from '../../src/sub/Submarine.js';
import { type CameraRig } from '../../src/sub/CameraRig.js';
import {
  journalEntries,
  journalFront,
  journalIsSheet,
  journalSiteRows,
  openJournalCategory,
  openJournalSite,
  setJournalSpoilers,
} from './helpers/journal.js';
import { type Journal } from '../../src/ui/Journal.js';

// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import process from 'node:process';

import catalog from '../../data/landmarks/index.json' with { type: 'json' };
import spentKit from '../fixtures/legacy-save-spent-kit.json' with { type: 'json' };
import secretSample from '../fixtures/legacy-save-secret-sample.json' with { type: 'json' };
import heroStars from '../fixtures/legacy-save-hero-stars.json' with { type: 'json' };
import type { Progress } from '../../src/game/Progress.js';

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 390, height: 844 },
]) {
  freshTest.describe(`cold Journal at ${viewport.width}px`, () => {
    const touch = viewport.width === 390;
    freshTest.use({ viewport, hasTouch: touch, serviceWorkers: 'block' });
    freshTest(
      `cold dive Journal shows cached entries before other sites load at ${viewport.width}px`,
      async ({ page }) => {
        // Regression guard: one slow unrelated site hid ready current-site entries
        // behind "Loading the Journal…" and an "All dive sites" breadcrumb.
        const act = (button: Locator) => (touch ? button.tap() : button.click());
        await page.addInitScript(() => {
          localStorage.setItem(
            'subexplorer.discoveries.v1',
            JSON.stringify({ version: 1, discovered: { 'titanic/titanic-bow': true } }),
          );
        });
        let release!: () => void;
        const pending = new Promise<void>((resolve) => (release = resolve));
        await page.route('**/data/landmarks/beebe-vent-field/guide.json', async (route) => {
          await pending;
          await route.continue();
        });
        const journal = page.getByRole('dialog', { name: 'Journal', exact: true });
        try {
          await loadDive(page, `/?tile=titanic&tier=low&tutorial=0${touch ? '&touch=1' : ''}`);
          if (touch) await page.locator('.tc-btn-pause').tap();
          else await page.keyboard.press('Escape');
          await act(
            page.locator('.pause-menu').getByRole('button', { name: 'Journal', exact: true }),
          );
          await expect(journal).toBeVisible();
          await expect(journal.locator('.jr-crumb')).toHaveText('RMS Titanic');
          await expect(journal.locator('.jr-body .jr-title')).toHaveText('RMS Titanic');
          await expect(journal.locator('.jr-body [data-row="titanic/poi/bow"]')).toContainText(
            'The bow section',
          );
          await expect(journal).not.toContainText('Loading the Journal…');
        } finally {
          release();
        }
        await page.evaluate(() =>
          (window.__game as unknown as { journal: Journal }).journal.load(),
        );
        await act(journal.getByRole('button', { name: 'Close Journal', exact: true }));
        await act(
          page.locator('.pause-menu').getByRole('button', { name: 'Journal', exact: true }),
        );
        await expect(journal.locator('.jr-body .jr-title')).toHaveText('RMS Titanic');
        await expect(await journalSiteRows(page)).toHaveCount(catalog.landmarks.length);
      },
    );
  });
}

freshTest(
  'Journal rotation releases focus from the hidden desktop spoilers switch',
  async ({ page }) => {
    // Regression guard: rotation hid the focused input in the desktop nav,
    // leaving keyboard ownership on an invisible control in the phone sheet.
    await loadDive(page, '/?tile=great-blue-hole&tier=low&tutorial=0');
    await page.evaluate(async () => {
      const { journal, discovery } = window.__game as unknown as {
        journal: Journal;
        discovery: Discovery;
      };
      discovery.store.record('great-blue-hole', 'great-blue-hole-stalactites');
      await journal.load();
      journal.open('overview');
    });
    const journal = page.locator('.journal');
    const box = journal.locator('.jr-spoilers input');
    await box.focus();
    await expect(box).toBeFocused();
    await page.setViewportSize({ width: 600, height: 900 });
    await expect(journal).toHaveClass(/is-phone/);
    await expect(box).toBeHidden();
    await expect(journal.locator('.jr-body')).toBeFocused();
    await page.keyboard.press('Tab');
    expect(await journal.evaluate((root) => root.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(journal).toBeHidden();
  },
);

freshTest.describe('Journal reading', () => {
  freshTest.use({ serviceWorkers: 'block' });
  for (const width of [1280, 360]) {
    for (const discovery of ['life:comb-jelly', 'secret:find-1', 'sample:material-1']) {
      freshTest(
        `first ${discovery} replaces the empty Journal hint at ${width}px`,
        async ({ page }) => {
          // Regression guard: non-POI discoveries left the front page asking for a first scan.
          await page.setViewportSize({ width, height: 800 });
          await page.addInitScript((id) => {
            const key = 'subexplorer.discoveries.v1';
            if (!localStorage.getItem(key))
              localStorage.setItem(
                key,
                JSON.stringify({ version: 1, discovered: { [`titanic/${id}`]: true } }),
              );
          }, discovery);
          await page.goto('/?tier=low', { waitUntil: 'domcontentloaded' });
          const journal = page.getByRole('dialog', { name: 'Journal', exact: true });
          for (let round = 0; round < 2; round++) {
            await homeReady(page);
            const opener = page
              .locator('.home-menu')
              .getByRole('button', { name: 'Journal', exact: true });
            await opener.click();
            await expect(journal.locator('.jr-site-card')).toHaveCount(catalog.landmarks.length);
            await expect(journal.locator('.jr-lead')).toHaveText(
              `1/${catalog.landmarks.length} sites scanned`,
            );
            await expect(journal.locator('.jr-locked')).toHaveCount(0);
            await expect(journal.locator('.jr-spoilers input')).not.toBeChecked();
            await journal.locator('.jr-site-card[data-target="titanic"]').click();
            await expect(await journalEntries(page, 'titanic/poi/')).toHaveCount(0);
            if (!(await journalIsSheet(page)))
              await openJournalCategory(
                page,
                'titanic',
                discovery.startsWith('life:') ? 'life' : 'secret',
              );
            const key = discovery.replace(':', '/');
            const entry = await journalEntries(page, `titanic/${key}`);
            await expect(entry).toBeVisible();
            await entry.click();
            await expect(journal.locator('.jr-title-row .jr-tag')).toHaveText('Game addition');
            await expect(journal.locator('.jr-body .jr-locked')).toHaveCount(0);
            await page.keyboard.press('Escape');
            await expect(opener).toBeFocused();
            if (round === 0) await page.reload({ waitUntil: 'domcontentloaded' });
          }
        },
      );
    }
  }
  freshTest(
    '360px Journal contains long text and keeps keyboard navigation in reading order',
    async ({ page }) => {
      // Regression guard: long content must wrap without pushing controls off a narrow phone.
      await page.setViewportSize({ width: 360, height: 800 });
      const long = 'UnbrokenJournalText'.repeat(24);
      await page.route('**/data/landmarks/titanic/guide.json', (route) =>
        route.fulfill({
          json: {
            ...fixtureGuide,
            entries: fixtureGuide.entries.map((entry) =>
              entry.id === 'bow'
                ? {
                    ...entry,
                    title: long,
                    paragraphs: [long],
                    facts: [{ label: long, value: long }],
                    sources: [{ title: long, url: 'https://example.org/journal' }],
                  }
                : entry,
            ),
          },
        }),
      );
      await page.addInitScript(() => {
        localStorage.setItem(
          'subexplorer.discoveries.v1',
          JSON.stringify({ version: 1, discovered: { 'titanic/titanic-bow': true } }),
        );
      });
      await page.goto('/?tier=low', { waitUntil: 'domcontentloaded' });
      await homeReady(page);
      const opener = page
        .locator('.home-menu')
        .getByRole('button', { name: 'Journal', exact: true });
      await opener.focus();
      await page.keyboard.press('Enter');
      const journal = page.getByRole('dialog', { name: 'Journal', exact: true });
      await expect(journal.locator('.jr-site-card')).toHaveCount(catalog.landmarks.length);
      await page.keyboard.press('Tab');
      await expect(journal.locator('.jr-close')).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(journal.locator('.jr-site-card').first()).toBeFocused();
      await journal.locator('.jr-site-card[data-target="titanic"]').focus();
      await page.keyboard.press('Enter');
      await expect(journal.locator('.jr-body')).toBeFocused();
      const row = journal.locator('[data-row="titanic/poi/bow"]');
      await expect(row).toHaveText(`${long}›`);
      await row.focus();
      await page.keyboard.press('Enter');
      await expect(journal.locator('.jr-title-row .jr-title')).toHaveText(long);
      for (const selector of [
        '.jr-panel',
        '.jr-body',
        '.jr-title-row',
        '.jr-facts',
        '.jr-sources',
      ]) {
        expect(
          await journal.locator(selector).evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
          selector,
        ).toBe(true);
      }
      await page.keyboard.press('Tab');
      await expect(journal.locator('.jr-back')).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(row).toBeVisible();
      await expect(journal.locator('.jr-body')).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(opener).toBeFocused();
    },
  );
});

freshTest.describe('legacy save persistence', () => {
  for (const [name, fixture] of [
    ['spent kit', spentKit],
    ['secret and sample', secretSample],
    ['hero stars', heroStars],
  ] as const) {
    // Regression guard: runtime migration and subsequent saves must retain archived
    // balances, purchases, ratings, cosmetic grants and independent Journal/Daily data.
    freshTest(`${name} survives migration, a cosmetic edit and reload`, async ({ page }) => {
      await page.addInitScript((records) => {
        for (const [key, value] of Object.entries(records))
          if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(value));
      }, fixture.records);
      await loadDive(page, '/?tile=titanic&tier=low&tutorial=0');
      const probe = () =>
        page.evaluate(() => {
          const progress = (window.__game as unknown as { progress: Progress }).progress;
          return {
            progress: progress.snapshot(),
            discoveries: JSON.parse(localStorage.getItem('subexplorer.discoveries.v1')!),
            daily: JSON.parse(localStorage.getItem('subexplorer.daily.v1')!),
          };
        });
      const before = await probe();
      // Boot also credits Journal discoveries that the archived reward record lacks.
      const { awarded, ...archived } = fixture.records['subexplorer.progress.v1'];
      expect(before.progress).toMatchObject({ ...archived, version: 2 });
      expect(before.progress.awarded).toEqual(expect.arrayContaining(awarded));
      expect(before.discoveries).toEqual(fixture.records['subexplorer.discoveries.v1']);
      expect(before.daily).toEqual(fixture.records['subexplorer.daily.v1']);
      expect(
        await page.evaluate(() =>
          (window.__game as unknown as { progress: Progress }).progress.selectCosmetic(
            'paint',
            'stock',
          ),
        ),
      ).toBe(true);
      const edited = await probe();
      expect(edited.progress).toEqual({
        ...before.progress,
        cosmetics: { ...before.progress.cosmetics, paint: 'stock' },
      });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await diveReady(page);
      expect(await probe()).toEqual(edited);
    });
  }
});

freshTest.describe('mission progression and Home Journal', () => {
  const test = experiencedTest;
  /**
   * Primary completion keeps the dive going, the end-of-dive choices do
   * what they say, and the Journal replaces the field guide
   * (plan/PHASE-D-CONTRACTS.md §4). Runs on the real Titanic content.
   */

  const shots = '.cache/codex/shots/journal-debrief/progression';
  const STORAGE_KEY = 'subexplorer.discoveries.v1';
  /** A browser that logged the Titanic bow on an earlier dive. */
  const SEEDED = JSON.stringify({
    version: 1,
    discovered: { 'titanic/titanic-bow': { at: '2026-09-01T10:00:00.000Z', count: 2 } },
    stats: { scans: 2, firstAt: '2026-09-01T10:00:00.000Z' },
  });

  async function shot(page: Page, name: string): Promise<void> {
    await mkdir(shots, { recursive: true });
    await page.waitForTimeout(350);
    await reviewScreenshot(page, { path: `${shots}/${name}.png` });
  }

  function collectErrors(page: Page): string[] {
    const errors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(e.message));
    return errors;
  }

  async function seed(page: Page): Promise<void> {
    await page.addInitScript(
      ([key, doc]) => {
        if (!localStorage.getItem(key)) localStorage.setItem(key, doc);
      },
      [STORAGE_KEY, SEEDED] as const,
    );
  }

  /** Put the boat next to a POI (the `?poi=` spawn pose) and wait until it is the scan candidate. */

  test.describe('mission dive flow', () => {
    // Regression guard: primary completion ended the dive early or debrief/Journal navigation lost progress and focus.
    // Regression guard: primary completion ended the dive early or debrief/Journal navigation lost progress and focus.
  });

  test.describe('Home Journal', () => {
    for (const viewport of [
      { width: 1280, height: 800 },
      { width: 390, height: 844 },
    ]) {
      for (const content of ['empty', 'missing', 'corrupt'] as const) {
        // Regression guard: a settled empty/failed catalogue left Home's Journal loading forever.
        test(`unavailable Home Journal catalogue: ${content} at ${viewport.width}px`, async ({
          page,
        }) => {
          await page.setViewportSize(viewport);
          await page.route('**/data/landmarks/index.json', (route) =>
            route.fulfill({
              status: content === 'missing' ? 404 : 200,
              contentType: 'application/json',
              body: content === 'corrupt' ? '{' : '{"version":1,"landmarks":[]}',
            }),
          );
          await seed(page);
          await page.goto('/', { waitUntil: 'domcontentloaded' });
          await homeReady(page);
          const raw = await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY);
          const opener = page.getByRole('button', { name: 'Journal', exact: true });
          const journal = page.getByRole('dialog', { name: 'Journal', exact: true });
          for (let round = 0; round < 2; round++) {
            await opener.click();
            await expect(journal.locator('.jr-empty')).toHaveText('No Journal sites available.');
            await expect(journal.locator('.jr-site-card')).toHaveCount(0);
            await page.keyboard.press('Escape');
            await expect(journal).toBeHidden();
            await expect(opener).toBeFocused();
          }
          expect(await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY)).toBe(raw);
        });
      }
    }

    // Regression guard: primary completion ended the dive early or debrief/Journal navigation lost progress and focus.
    test('home front page, site entries, spoilers, reload', async ({ page }) => {
      const errors = collectErrors(page);
      await seed(page);
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await homeReady(page);
      const raw = await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY);

      await expect(page.locator('.home-screen')).toBeVisible();
      await page.locator('.home-menu button', { hasText: 'Journal' }).click();
      const journal = page.locator('.journal');
      await expect(journal).toBeVisible();
      await expect(journal.locator('.jr-honesty')).toContainText('real survey data');
      await expect(journal.locator('.jr-site-card')).toHaveCount(catalog.landmarks.length);
      await expect(
        journal.locator('.jr-site-card[data-target="titanic"] .jr-card-count'),
      ).toHaveText('1/7');
      await expect(journal.locator('.jr-spoilers input')).not.toBeChecked();
      await shot(page, 'journal-home');

      // A site page, then its entries: the bow is logged, the stern is not.
      await journal.locator('.jr-site-card[data-target="titanic"]').click();
      await expect(journal.locator('.jr-body .jr-title')).toHaveText('RMS Titanic');
      const bow = journal.locator('.jr-nav-item[data-target="titanic/poi/bow"]');
      const stern = journal.locator('.jr-nav-item[data-target="titanic/poi/stern"]');
      // Unscanned targets are not listed at all: no rows, no names, no counts.
      await expect(stern).toHaveCount(0);
      await expect(journal.locator('.jr-nav-item', { hasText: /Unscanned target/ })).toHaveCount(0);
      await bow.click();
      await expect(journal.locator('.jr-tag.is-recreation')).toHaveText('Recreation');
      await expect(journal.locator('.jr-sources a').first()).toHaveAttribute('href', /^https?:/);
      await expect(journal.locator('.jr-body')).not.toContainText(/illustrative|not surveyed/i);
      await shot(page, 'journal-site');

      await journal.locator('.jr-spoilers input').check();
      await expect(stern).toBeVisible();
      await stern.click();
      await expect(journal.locator('.jr-tag.is-undiscovered')).toBeVisible();
      await expect(journal.locator('.jr-body .jr-para').first()).toBeVisible();
      // Species unlock only through a documented linkage; with spoilers they are readable.
      await expect(journal.locator('.jr-nav-item.is-species')).not.toHaveCount(0);
      await shot(page, 'journal-spoilers');

      await page.keyboard.press('Escape');
      await expect(journal).toBeHidden();
      // The Journal never rewrites discovery v1.
      expect(await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY)).toBe(raw);

      // Reload: the spoiler toggle is in-memory only; the bow stays logged.
      await page.reload({ waitUntil: 'domcontentloaded' });
      await homeReady(page);
      await page.locator('.home-menu button', { hasText: 'Journal' }).click();
      await expect(journal.locator('.jr-spoilers input')).not.toBeChecked();
      await journal.locator('.jr-site-card[data-target="titanic"]').click();
      await expect(journal.locator('.jr-nav-item[data-target="titanic/poi/bow"]')).not.toHaveText(
        'Undiscovered',
      );
      expect(errors, errors.join(' | ')).toEqual([]);
    });
  });

  /** Dive again sits under "More" while Keep exploring is offered. */
});

freshTest.describe('Journal scan rewards and counts', () => {
  const test = experiencedTest;
  type Game = {
    discovery: Discovery;
    journal: Journal;
    sub: Submarine;
    rig: CameraRig;
    terrain: { sampleHeight(x: number, z: number): number };
    config: { submarine: { hullRadius: number; seabedClearance: number } };
  };

  async function start(page: Page, site: string, poi: string): Promise<void> {
    await pauseClockBeforeNavigation(page);
    await page.goto(`/?tile=${site}&poi=${poi}&tier=low`, { waitUntil: 'domcontentloaded' });
    await clockFramesUntil(page, () => window.__gameReady === true);
    await clockFramesUntil(
      page,
      () => (window.__game as unknown as Game).discovery.spawnedAt !== null,
    );
    await page.evaluate((id) => {
      const g = window.__game as unknown as Game;
      const target = g.discovery.pois.find((p) => p.id === id)!;
      g.sub.pitch = Math.atan2(
        target.position.y - g.sub.position.y,
        Math.hypot(target.position.x - g.sub.position.x, target.position.z - g.sub.position.z),
      );
      g.rig.snap(g.sub.position, g.sub.yaw, g.sub.pitch);
    }, poi);
    await page.clock.runFor(34);
  }

  // Regression guard: two gallery contacts used to promise new entries but open identical text.
  test('consecutive gallery scans unlock distinct Journal entries', async ({ page }, info) => {
    await start(page, 'great-blue-hole', 'great-blue-hole-stalactites');
    let firstBody = '';
    for (const [index, gallery] of [
      { id: 'great-blue-hole-stalactites', entry: 'the-hole', title: 'Stalactite gallery' },
      {
        id: 'great-blue-hole-stalactites-east',
        entry: 'eastern-gallery',
        title: 'Eastern stalactite gallery',
      },
    ].entries()) {
      if (index) {
        await page.evaluate((id) => {
          const g = window.__game as unknown as Game;
          const target = g.discovery.pois.find((p) => p.id === id)!;
          // View the eastern contact from inside the bowl, clear of the shallow rim.
          const y = Math.max(
            target.position.y + 16,
            g.terrain.sampleHeight(target.position.x, target.position.z - 40) +
              g.config.submarine.hullRadius +
              g.config.submarine.seabedClearance +
              16,
          );
          g.sub.reset(target.position.x, y, target.position.z - 40, Math.PI);
          g.sub.pitch = Math.atan2(target.position.y - y, 40);
          g.rig.snap(g.sub.position, g.sub.yaw, g.sub.pitch);
          g.discovery.stats.markTeleport();
        }, gallery.id);
        await page.clock.runFor(34);
      }
      await scanWithKeyboard(page, gallery.id);
      await expect(page.locator('.guidance-slot .guidance-kicker')).toHaveText('New Journal entry');
      await expect(page.locator('.guidance-slot .guidance-name')).toHaveText(gallery.title);
      await page.keyboard.press('j');
      await clockFramesUntil(page, () => (window.__game as unknown as Game).journal.isOpen);
      await expect(page.locator('.jr-body .jr-title')).toHaveText(gallery.title);
      await expect(page.locator('.jr-body .jr-tag.is-recreation')).toHaveText('Recreation');
      expect(await page.evaluate(() => (window.__game as unknown as Game).journal.selectedId)).toBe(
        gallery.entry,
      );
      const body = await page.locator('.jr-body .jr-para').allTextContents();
      expect(body.length).toBeGreaterThan(0);
      expect(body.join('\n')).not.toBe(firstBody);
      firstBody = body.join('\n');
      await expect(
        page.locator('.jr-nav-item[data-target="great-blue-hole"] .jr-nav-meta'),
      ).toHaveText(`${index + 1}/4 points of interest`);
      await expect(
        page.locator('details[data-category="great-blue-hole/poi"] summary .jr-nav-meta'),
      ).toHaveText(`${index + 1}/4`);
      await page.clock.runFor(34);
      await page.screenshot({ path: info.outputPath(`gallery-${index + 1}.png`) });
      await page.keyboard.press('Escape');
    }
    expect(
      await page.evaluate(() => {
        const d = (window.__game as unknown as Game).discovery;
        return {
          scans: d.scanner.view.completed,
          discoveries: d.stats.snapshot().discoveries.length,
        };
      }),
    ).toEqual({ scans: 2, discoveries: 2 });
  });

  for (const { site, poi, total } of [
    { site: 'titanic', poi: 'titanic-bow', total: 7 },
    { site: 'great-blue-hole', poi: 'great-blue-hole-stalactites', total: 4 },
  ]) {
    // Regression guard: overview unlocks inflated totals and THIS DIVE implied session scan counts.
    test(`${site}: Journal counts points of interest consistently across views and reload`, async ({
      page,
    }, info) => {
      await start(page, site, poi);
      await scanWithKeyboard(page, poi);
      await page.keyboard.press('j');
      await clockFramesUntil(page, () => (window.__game as unknown as Game).journal.isOpen);
      for (const width of [1280, 390]) {
        await page.setViewportSize({ width, height: 844 });
        // Media-query change events can arrive after resize resolves. Wait for
        // the actual reader layout before choosing its navigation controls.
        await clockFramesUntil(
          page,
          width === 390
            ? () => !!document.querySelector('.journal.is-phone')
            : () => !!document.querySelector('.journal:not(.is-phone)'),
        );
        await journalFront(page);
        await expect(page.locator('.jr-lead .jr-chip').first()).toHaveText(
          /^1\/\d+ points of interest$/,
        );
        const card = page.locator(`.jr-site-card[data-target="${site}"]`);
        await expect(card).toHaveAttribute(
          'aria-label',
          new RegExp(`1 of ${total} points of interest logged$`),
        );
        await expect(card.locator('.jr-card-count')).toHaveText(`1/${total}`);
        await openJournalSite(page, site);
        await expect(page.locator('.jr-progress .jr-chip').first()).toHaveText(
          `1/${total} points of interest`,
        );
        if (await journalIsSheet(page)) {
          await expect(
            page.locator('.jr-group-title', { hasText: 'Points of interest' }).locator('.jr-badge'),
          ).toHaveText(`1/${total}`);
        } else {
          await expect(page.locator(`.jr-nav-item[data-target="${site}"] .jr-nav-meta`)).toHaveText(
            `1/${total} points of interest`,
          );
          await expect(
            page.locator(`details[data-category="${site}/site"] summary .jr-nav-meta`),
          ).toHaveText(/^[1-9]\d*\/[1-9]\d*$/);
          await expect(
            page.locator(`details[data-category="${site}/poi"] summary .jr-nav-meta`),
          ).toHaveText(`1/${total}`);
        }
        await setJournalSpoilers(page, true);
        await openJournalSite(page, site);
        await expect(page.locator('.jr-progress .jr-chip').first()).toHaveText(
          `1/${total} points of interest`,
        );
        await page.clock.runFor(34);
        await page.screenshot({ path: info.outputPath(`counts-${width}.png`) });
      }
      await page.reload({ waitUntil: 'domcontentloaded' });
      await clockFramesUntil(page, () => window.__gameReady === true);
      await clockFramesUntil(page, () => (window.__game as unknown as Game).discovery.loaded);
      await page.keyboard.press('j');
      await clockFramesUntil(page, () => (window.__game as unknown as Game).journal.isOpen);
      await openJournalSite(page, site);
      await expect(page.locator('.jr-progress .jr-chip').first()).toHaveText(
        `1/${total} points of interest`,
      );
      expect(
        await page.evaluate(
          () => (window.__game as unknown as Game).discovery.scanner.view.completed,
        ),
      ).toBe(0);
    });
  }
});

freshTest.describe('scan persistence and fixture debrief', () => {
  const test = experiencedTest;
  /**
   * Discovery loop against the `_test` fixture landmark on the
   * real Titanic tile: spawn next to a POI (`?poi=`), hold G until the scan
   * completes, check it persisted across a reload, open the Journal (J; it
   * contains the logged discovery), and screenshot the Journal and the
   * debrief (`?debrief=1`).
   *
   * State is read through `window.__game.{scanner,discoveries,discovery}`.
   */

  const STORAGE_KEY = 'subexplorer.discoveries.v1';
  const URL_SCAN = '/?tile=titanic&landmark=_test&poi=test-bow';

  interface ScanProbe {
    loaded: boolean;
    spawnedAt: string | null;
    phase: string;
    progress: number;
    candidateId: string | null;
    completed: number;
    discovered: boolean;
  }

  async function probe(page: Page): Promise<ScanProbe> {
    return page.evaluate(() => {
      const g = window.__game as {
        scanner: {
          view: { phase: string; progress: number; candidateId: string | null; completed: number };
        };
        discoveries: { isDiscovered(l: string, p: string): boolean };
        discovery: { loaded: boolean; spawnedAt: string | null };
      };
      return {
        loaded: g.discovery.loaded,
        spawnedAt: g.discovery.spawnedAt,
        phase: g.scanner.view.phase,
        progress: g.scanner.view.progress,
        candidateId: g.scanner.view.candidateId,
        completed: g.scanner.view.completed,
        discovered: g.discoveries.isDiscovered('_test', 'test-bow'),
      };
    });
  }

  function collectErrors(page: Page): string[] {
    const errors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(e.message));
    return errors;
  }

  test.describe('fixture scan, discovery and Journal', () => {
    // Regression guard: held scan repeated completion or reload/Journal lost the logged entry.
    test('scan the bow, persist across reload, open the Journal', async ({ page }) => {
      const errors = collectErrors(page);
      await loadDive(page, URL_SCAN);

      // The ?poi= spawn puts the bow in range and in the beam.
      await page.waitForFunction(
        () => {
          const g = window.__game as {
            discovery: { spawnedAt: string | null };
            scanner: { view: { candidateId: string | null } };
          };
          return g.discovery.spawnedAt === 'test-bow' && g.scanner.view.candidateId === 'test-bow';
        },
        undefined,
        { timeout: 10_000 },
      );
      const before = await probe(page);
      expect(before.discovered).toBe(false);
      await expect(page.locator('.guidance-slot .guidance-hint')).toHaveText(/Hold G/);

      // Record bus events from inside the page.
      await page.evaluate(() => {
        const w = window as unknown as { __b1: Array<{ name: string; payload: unknown }> };
        w.__b1 = [];
        const bus = (window.__game as { bus: { on(n: string, h: (p: unknown) => void): void } })
          .bus;
        for (const name of ['scan:started', 'scan:progress', 'scan:aborted', 'scan:complete']) {
          bus.on(name, (payload) => w.__b1.push({ name, payload }));
        }
      });

      // Advance discovery time while the real scan key is held.
      await page.keyboard.down('g');
      await advanceScan(page, 0.6);
      const mid = await probe(page);
      expect(mid.phase).toBe('scanning');
      expect(mid.progress).toBeGreaterThan(0.1);
      await expect(page.locator('.guidance-slot .guidance-kicker')).toHaveText('SCANNING');
      await completeScan(page, 'test-bow');
      await advanceScan(page, 0.3);
      await page.keyboard.up('g');

      const events = await page.evaluate(
        () => (window as unknown as { __b1: Array<{ name: string; payload: unknown }> }).__b1,
      );
      const names = events.map((e) => e.name);
      expect(names[0]).toBe('scan:started');
      expect(names).toContain('scan:progress');
      const complete = events.filter((e) => e.name === 'scan:complete');
      expect(complete).toHaveLength(1);
      expect(complete[0]?.payload).toEqual({
        poiId: 'test-bow',
        landmarkId: '_test',
        firstTime: true,
      });
      // Holding past completion must not rescan.
      expect(names.filter((n) => n === 'scan:started')).toHaveLength(1);

      await expect(page.locator('.guidance-slot .guidance-kicker')).toHaveText('New Journal entry');
      await expect(page.locator('.guidance-slot .guidance-name')).toHaveText(
        'Bow section (fixture)',
      );
      await reviewScreenshot(page, { path: 'tests/e2e/screenshots/discovery-scan.png' });

      const saved = await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY);
      expect(saved).not.toBeNull();
      const doc = JSON.parse(saved as string) as {
        version: number;
        discovered: Record<string, { at: string; count: number }>;
      };
      expect(doc.version).toBe(1);
      expect(doc.discovered['_test/test-bow']?.count).toBe(1);

      // --- reload: still discovered -------------------------------------------
      await page.reload({ waitUntil: 'domcontentloaded' });
      await diveReady(page, {});
      expect((await probe(page)).discovered).toBe(true);

      // --- Journal (J) --------------------------------------------------------
      const journal = page.locator('.journal');
      await expect(journal).toBeHidden();
      await page.keyboard.press('j');
      await expect(journal).toBeVisible();
      // The bow counts once; automatically opened overview pages do not count.
      await expect(journal.locator('.jr-nav-item[data-target="_test"] .jr-nav-meta')).toHaveText(
        `1/${fixtureGuide.entries.length - 1} points of interest`,
      );
      await expect(journal.locator('.jr-body .jr-title')).toHaveText('Test site · Titanic tile');
      // The debris entry is still locked; the bow is unlocked.
      // It is not listed rather than shown as a locked list item.
      await expect(journal.locator('.jr-site-entries li.is-locked')).toHaveCount(0);
      await expect(journal.locator('.jr-site-entries .jr-nav-item.is-poi')).toHaveCount(1);
      await journal.locator('.jr-nav-item[data-target="_test/poi/bow"]').click();
      await expect(journal.locator('.jr-body .jr-title')).toHaveText('The bow section');
      await expect(journal.locator('.jr-tag.is-recreation')).toHaveText('Recreation');
      // Guards the memorial note repeating on every entry: it belongs to the site page only.
      await expect(journal.locator('.jr-memorial')).toHaveCount(0);
      const bowEntry = fixtureGuide.entries.find((entry) => entry.id === 'bow')!;
      await expect(journal.locator('.jr-facts tr')).toHaveCount(bowEntry.facts.length);
      await expect(journal.locator('.jr-sources a')).toHaveCount(bowEntry.sources.length);
      // Scanning is suppressed while the Journal is open.
      expect(
        await page.evaluate(
          () => (window.__game as { scanner: { enabled: boolean } }).scanner.enabled,
        ),
      ).toBe(false);
      await reviewScreenshot(page, { path: 'tests/e2e/screenshots/discovery-guide.png' });

      await page.keyboard.press('Escape');
      await expect(journal).toBeHidden();

      expect(errors, errors.join(' | ')).toEqual([]);
    });

    // Regression guard: held scan repeated completion or reload/Journal lost the logged entry.
  });
});

freshTest.describe('frozen debrief and resume', () => {
  const test = experiencedTest;

  for (const viewport of [
    { width: 390, height: 844, touch: true },
    { width: 1280, height: 720, touch: false },
  ]) {
    test.describe(`frozen debrief ${viewport.width}x${viewport.height}`, () => {
      test.use({
        viewport,
        hasTouch: viewport.touch,
        isMobile: viewport.touch,
        deviceScaleFactor: 1,
        serviceWorkers: 'block',
        storageState: { cookies: [], origins: [] },
      });
    });
  }
});

freshTest.describe('summary, disclosures and provenance', () => {
  const test = experiencedTest;

  for (const viewport of [
    { width: 1600, height: 900, touch: false },
    { width: 390, height: 844, touch: true },
    { width: 844, height: 390, touch: true },
  ]) {
    test.describe(`summary and Journal ${viewport.width}x${viewport.height}`, () => {
      test.use({
        viewport,
        hasTouch: viewport.touch,
        isMobile: viewport.touch,
        deviceScaleFactor: 1,
        serviceWorkers: 'block',
        storageState: { cookies: [], origins: [] },
      });
    });
  }
});

freshTest.describe('photo capture and focus', () => {
  const test = experiencedTest;
  // Keyboard focus restoration depends on the photo-active CSS visibility rule;
  // keep browser coverage alongside the lifecycle unit regression.
  for (const profile of [
    { width: 1600, height: 900, touch: false },
    { width: 844, height: 390, touch: true },
    { width: 390, height: 844, touch: true },
  ]) {
    test.describe(`photo focus ${profile.width}x${profile.height}`, () => {
      test.use({
        viewport: { width: profile.width, height: profile.height },
        hasTouch: profile.touch,
        isMobile: profile.touch,
        deviceScaleFactor: 1,
        serviceWorkers: 'block',
        storageState: { cookies: [], origins: [] },
      });

      // Regression guard: Photo Done restored focus before the HUD was visible and Tab/Escape lost the keyboard exit.

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
        // A persistent, focusable HUD control the photo mode must hand focus back to.
        // The touch HUD has none since the data chip left it, so focus restoration is
        // checked on desktop only; touch keeps the capture/Done/Pause walk.
        const credit = page.locator('.hud-reset-camera');
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
          await reviewScreenshot(page, { path: info.outputPath(`round-${round}-photo.png`) });
          if (profile.touch) await done.tap();
          else await done.click();
          await expect(mode).toBeHidden();
          if (!profile.touch) await expect(credit).toBeFocused();

          // A visible persistent HUD control also acts as a keyboard opener,
          // including on touch viewports when input switches to keyboard.
          if (!profile.touch) await credit.focus();
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
          if (!profile.touch) await expect(credit).toBeFocused();
          await expect(page.locator('.pause-menu')).toBeHidden();
        }
        expect(errors).toEqual([]);
      });
    });
  }
});

freshTest.describe('Home to scan and return journey', () => {
  const test = freshTest;
  /** Fresh player: no hull unlocks, discoveries, skipped briefing or completed tutorial. */

  /** Native touch gestures through Chromium, including pointer capture and release. */

  for (const layout of [
    { width: 1280, height: 720, touch: false },
    { width: 390, height: 844, touch: true },
    { width: 844, height: 390, touch: true },
  ]) {
    const size = `${layout.width}x${layout.height}`;
    test.describe(`two-objective scan journey ${size}`, () => {
      test.use({
        viewport: { width: layout.width, height: layout.height },
        hasTouch: layout.touch,
        isMobile: layout.touch,
        deviceScaleFactor: 1,
        storageState: { cookies: [], origins: [] },
        serviceWorkers: 'block',
      });
    });
  }

  for (const viewport of [
    { width: 1600, height: 900, touch: false, sites: ['titanic', 'great-blue-hole'] },
    {
      width: 844,
      height: 390,
      touch: true,
      sites: ['lost-city', 'beebe-vent-field', 'titanic', 'great-blue-hole'],
    },
    {
      width: 390,
      height: 844,
      touch: true,
      sites: ['monterey-canyon', 'titanic', 'great-blue-hole'],
    },
  ]) {
    const size = `${viewport.width}x${viewport.height}`;
    test.describe(`journey ${size}`, () => {
      test.use({
        viewport: { width: viewport.width, height: viewport.height },
        hasTouch: viewport.touch,
        isMobile: viewport.touch,
        deviceScaleFactor: 1,
        storageState: { cookies: [], origins: [] },
        serviceWorkers: 'block',
      });
      // One complete journey per hero site, across desktop and both touch
      // orientations. Dedicated HUD/credits/toast specs cover the viewport matrix.
    });
  }
});

freshTest.describe('catalog Journal additions', () => {
  const test = freshTest;
  for (const layout of [
    { width: 1280, height: 800, touch: false },
    { width: 390, height: 844, touch: true },
  ]) {
    test.describe(`Journal ${layout.width}x${layout.height}`, () => {
      test.use({
        viewport: { width: layout.width, height: layout.height },
        hasTouch: layout.touch,
        isMobile: layout.touch,
        storageState: { cookies: [], origins: [] },
        serviceWorkers: 'block',
      });

      // Regression guard: staged wildlife and secrets repeated addition caveats or clipped Journal titles.

      test('all declared sites give secrets and staged wildlife exactly one addition tag', async ({
        page,
      }, testInfo) => {
        test.setTimeout(240_000);
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(e.message));
        await page.goto('/?tier=low', { waitUntil: 'domcontentloaded' });
        await homeReady(page);
        const homeJournal = page
          .locator('.home-menu')
          .getByRole('button', { name: 'Journal', exact: true });
        if (layout.touch) await homeJournal.tap();
        else await homeJournal.click();
        await expect(page.locator('.jr-site-card')).toHaveCount(catalog.landmarks.length);
        await expect(page.locator('.jr-honesty')).toContainText('real survey data');
        await page.locator('.jr-spoilers input').check();
        for (const site of catalog.landmarks) {
          await openJournalSite(page, site);
          for (const kind of ['life', 'secret']) {
            await openJournalCategory(page, site, kind);
            const entry = (await journalEntries(page, `${site}/${kind}/`)).first();
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
        await reviewScreenshot(page, { path: testInfo.outputPath('journal-addition.png') });
        expect(errors).toEqual([]);
      });
    });
  }
});

freshTest.describe('scan still', () => {
  const test = experiencedTest;
  const shots = '.cache/codex/shots/J-journal-preview';
  const DIVE = '/?mission=titanic&poi=titanic-bow&skipBriefing=1';

  const VIEWPORTS = [
    { name: 'desktop', width: 1280, height: 800, touch: false },
    { name: 'phone-portrait', width: 390, height: 844, touch: true },
    { name: 'phone-landscape', width: 844, height: 390, touch: true },
  ];

  for (const viewport of VIEWPORTS) {
    // Regression guard: a first scan files a still above its Journal text on every viewport.
    test(`a fresh scan opens its Journal entry with a picture (${viewport.name})`, async ({
      browser,
    }) => {
      await mkdir(shots, { recursive: true });
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        hasTouch: viewport.touch,
        isMobile: viewport.touch,
      });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(DIVE);
      await diveReady(page);
      await page.waitForFunction(
        () =>
          (window.__game as { discovery: { spawnedAt: string | null } }).discovery.spawnedAt ===
          'titanic-bow',
      );
      await scanWithKeyboard(page, 'titanic-bow');
      // The still is read on the next drawn frame, not at the scan itself.
      await page.waitForFunction(() => {
        const raw = localStorage.getItem('subexplorer.photos.v1');
        return (
          !!raw && JSON.parse(raw).photos.some((p: { poiId: string }) => p.poiId === 'titanic-bow')
        );
      });
      await page.evaluate(() =>
        (window.__game as { journal: { open(): void; show(key: string): void } }).journal.open(),
      );
      const journal = page.locator('.journal');
      await expect(journal).toBeVisible();
      await page.evaluate(() =>
        (window.__game as { journal: { show(key: string): void } }).journal.show('titanic/poi/bow'),
      );
      const hero = journal.locator('.jr-hero img');
      await expect(hero).toHaveCount(1);
      // At the top: the picture precedes the first paragraph of the entry.
      const order = await journal.evaluate((root) => {
        const img = root.querySelector('.jr-hero');
        const para = root.querySelector('.jr-para');
        return (
          !!img &&
          !!para &&
          !!(img.compareDocumentPosition(para) & Node.DOCUMENT_POSITION_FOLLOWING)
        );
      });
      expect(order).toBe(true);
      const box = (await hero.boundingBox())!;
      expect(box.width).toBeGreaterThan(100);
      // Guards the capture pushing the entry text below the fold on short screens.
      expect(box.height).toBeLessThanOrEqual(viewport.height * 0.33);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
      await page.waitForTimeout(400);
      await reviewScreenshot(page, { path: `${shots}/${viewport.name}.png` });
      expect(errors).toEqual([]);
      await context.close();
    });
  }
});
