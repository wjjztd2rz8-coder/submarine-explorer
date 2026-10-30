import missionData from '../../data/landmarks/titanic/mission.json' with { type: 'json' };
import fixtureGuide from '../../data/landmarks/_test/guide.json' with { type: 'json' };
import { reviewScreenshot } from './helpers/render.js';
import { expect, test as freshTest, type Page, type Locator } from '@playwright/test';
import { test as experiencedTest } from './helpers/unlocked.js';
import { homeReady, openSiteList } from './helpers/home.js';
import { diveReady, loadDive } from './helpers/dive.js';
import { advanceScan, completeScan, scanWithKeyboard } from './helpers/scan.js';
import { scanAim } from './helpers/scanAim.js';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir, rm, writeFile } from 'node:fs/promises';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { execFile } from 'node:child_process';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { promisify } from 'node:util';
import { readGoldenBuild } from '../../tools/golden-build.mjs';
import { clockFramesUntil, pauseClockBeforeNavigation, withClockFrames } from './helpers/clock.js';
import { type Discovery } from '../../src/game/Discovery.js';
import { type MissionRouter } from '../../src/game/MissionRouter.js';
import { type Submarine } from '../../src/sub/Submarine.js';
import { type CameraRig } from '../../src/sub/CameraRig.js';
import {
  journalContents,
  journalEntries,
  journalFirstOfKind,
  journalFront,
  journalIsSheet,
  openJournalCategory,
  openJournalSite,
  setJournalSpoilers,
} from './helpers/journal.js';
import { type Journal } from '../../src/ui/Journal.js';
import { expectCompactPhoneHud } from './helpers/phoneHud.js';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import process from 'node:process';
import AxeBuilder from '@axe-core/playwright';
import catalog from '../../data/landmarks/index.json' with { type: 'json' };
import spentKit from '../fixtures/legacy-save-spent-kit.json' with { type: 'json' };
import secretSample from '../fixtures/legacy-save-secret-sample.json' with { type: 'json' };
import heroStars from '../fixtures/legacy-save-hero-stars.json' with { type: 'json' };
import type { Progress } from '../../src/game/Progress.js';

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

const objectiveCount = missionData.objectives.length;
const primaryCount = missionData.objectives.filter((o) => o.primary).length;
const secondaryCount = objectiveCount - primaryCount;

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
  const DIVE = '/?mission=titanic&poi=titanic-bow&skipBriefing=1';

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

  interface Probe {
    state: string;
    emitted: string[];
    complete: string[];
  }

  async function probe(page: Page): Promise<Probe> {
    return page.evaluate(() => {
      const m = (window.__game as { mission: unknown }).mission as {
        state: string;
        emitted: Array<{ name: string }>;
        objectives: Array<{ id: string; complete: boolean }>;
      };
      return {
        state: m.state,
        emitted: m.emitted.map((e) => e.name),
        complete: m.objectives.filter((o) => o.complete).map((o) => o.id),
      };
    });
  }

  /** Put the boat next to a POI (the `?poi=` spawn pose) and wait until it is the scan candidate. */
  async function teleport(page: Page, poiId: string): Promise<void> {
    await page.evaluate((id) => {
      const g = window.__game as {
        sub: {
          reset(x: number, y: number, z: number, yaw: number): void;
          position: unknown;
          yaw: number;
          pitch: number;
        };
        rig: { snap(p: unknown, yaw: number, pitch: number): void };
        discovery: {
          spawnPose(id: string): { x: number; y: number; z: number; yaw: number } | null;
          stats: { markTeleport(): void };
        };
      };
      const pose = g.discovery.spawnPose(id);
      if (!pose) throw new Error(`no POI ${id}`);
      g.sub.reset(pose.x, pose.y, pose.z, pose.yaw);
      g.rig.snap(g.sub.position, g.sub.yaw, g.sub.pitch);
      g.discovery.stats.markTeleport();
    }, poiId);
    await page.waitForFunction(
      (id) =>
        (window.__game as { scanner: { view: { candidateId: string | null } } }).scanner.view
          .candidateId === id,
      poiId,
      { timeout: 10_000 },
    );
  }

  async function scan(page: Page, objectiveId: string): Promise<void> {
    await scanWithKeyboard(page);
    await page.waitForFunction(
      (id) =>
        (
          window.__game as { mission: { objectives: Array<{ id: string; complete: boolean }> } }
        ).mission.objectives.some((o) => o.id === id && o.complete),
      objectiveId,
      { timeout: 20_000 },
    );
  }

  async function subPos(page: Page): Promise<{ x: number; y: number; z: number }> {
    return page.evaluate(() => {
      const p = (window.__game as { sub: { position: { x: number; y: number; z: number } } }).sub
        .position;
      return { x: p.x, y: p.y, z: p.z };
    });
  }

  async function recordFlowEvents(page: Page): Promise<void> {
    await page.evaluate(() => {
      const w = window as unknown as { __flow: Array<{ name: string; payload: unknown }> };
      w.__flow = [];
      const bus = (window.__game as { bus: { on(n: string, h: (p: unknown) => void): void } }).bus;
      for (const name of ['mission:primaryComplete', 'mission:complete', 'mission:ended']) {
        bus.on(name, (payload) => w.__flow.push({ name, payload }));
      }
    });
  }

  async function flowEvents(page: Page): Promise<Array<{ name: string; payload: unknown }>> {
    return page.evaluate(
      () => (window as unknown as { __flow: Array<{ name: string; payload: unknown }> }).__flow,
    );
  }

  async function surfaceFromPause(page: Page): Promise<void> {
    await page.keyboard.press('Escape');
    await expect(page.locator('.pause-menu')).toBeVisible();
    const surface = page.locator('.pause-surface');
    await expect(surface).toBeVisible();
    await surface.click();
    await expect(page.locator('.mission-debrief')).toBeVisible();
  }

  test.describe('mission dive flow', () => {
    // Regression guard: primary completion ended the dive early or debrief/Journal navigation lost progress and focus.
    test('primaries complete -> keep exploring -> secondary -> surface -> debrief actions', async ({
      page,
    }, testInfo) => {
      // Keep the shared software-rendering budget when CI allows more time for this long flow.
      test.setTimeout(Math.max(testInfo.timeout, 150_000));
      const errors = collectErrors(page);
      await seed(page);
      await loadDive(page, DIVE);

      // The Journal already has the bow, but this dive starts fresh.
      const start = await page.evaluate(() => {
        const g = window.__game as {
          discoveries: { isDiscovered(l: string, p: string): boolean };
          mission: { state: string; objectives: Array<{ complete: boolean }> };
        };
        return {
          logged: g.discoveries.isDiscovered('titanic', 'titanic-bow'),
          state: g.mission.state,
          anyComplete: g.mission.objectives.some((o) => o.complete),
        };
      });
      expect(start).toEqual({ logged: true, state: 'diving', anyComplete: false });
      await expect(page.locator('.obj-progress')).toHaveText(
        `0 of ${objectiveCount} objectives · 0 of ${primaryCount} primary`,
      );
      await recordFlowEvents(page);

      await teleport(page, 'titanic-bow');
      await scan(page, 'find-bow');
      await teleport(page, 'titanic-stern');
      await scan(page, 'find-stern');

      let p = await probe(page);
      expect(p.state).toBe('primaries-complete');
      const banner = page.locator('.obj-banner');
      await expect(banner).toBeVisible({ timeout: 30_000 });
      await expect(banner.locator('.obj-banner-title')).toHaveText('Primary objectives complete');
      await expect(banner.locator('.obj-banner-detail')).toHaveText(
        `${primaryCount} of ${objectiveCount} objectives. ${secondaryCount} optional targets remain.`,
      );
      await expect(banner.locator('button')).toHaveText(['Keep exploring', 'Surface and debrief']);
      // The banner is the one completion presentation: it carries the stars earned so far.
      await expect(banner.locator('.obj-banner-stars')).toHaveAttribute(
        'aria-label',
        /^[0-3] of 3 stars$/,
      );
      await expect(page.locator('.mission-debrief')).toHaveCount(0);
      await shot(page, 'primaries-complete-banner');

      // Keep exploring: the banner goes, the dive goes on, no debrief.
      await banner.locator('.is-keep').click();
      await expect(banner).toBeHidden();
      await page.waitForTimeout(1000);
      expect((await probe(page)).state).toBe('primaries-complete');
      await expect(page.locator('.mission-debrief')).toHaveCount(0);
      expect((await flowEvents(page)).map((e) => e.name)).toEqual(['mission:primaryComplete']);

      // A secondary still counts after the primaries.
      await teleport(page, 'titanic-boilers');
      await scan(page, 'boilers');
      p = await probe(page);
      expect(p.complete).toEqual(['find-bow', 'find-stern', 'boilers']);
      await expect(page.locator('.obj-progress')).toHaveText(
        `3 of ${objectiveCount} objectives · primaries done`,
      );

      // Surface from the pause menu: complete then ended, once each.
      await surfaceFromPause(page);
      const debrief = page.locator('.mission-debrief');
      expect((await probe(page)).state).toBe('debrief');
      const events = await flowEvents(page);
      expect(events.map((e) => e.name)).toEqual([
        'mission:primaryComplete',
        'mission:complete',
        'mission:ended',
      ]);
      expect(events[0]?.payload).toEqual({
        missionId: 'titanic',
        completed: primaryCount,
        total: objectiveCount,
      });
      expect(events[2]?.payload).toMatchObject({
        missionId: 'titanic',
        reason: 'surface',
        completed: 3,
        total: objectiveCount,
      });
      await expect(debrief.locator('.debrief-title')).toHaveText('Primaries complete');
      await expect(debrief.locator('.debrief-next')).toHaveText(
        'Next: Finish the optional objectives for 2 stars; some are a long transit away.',
      );
      // Optional scans must not make a finished primary mission read as incomplete.
      await expect(debrief.locator('[data-field="objectives"]')).toHaveText(
        '2 of 2 primary objectives',
      );
      await expect(debrief.locator('.debrief-btn')).toHaveText([
        'Dive sites',
        'Keep exploring',
        'Journal',
        'Dive again',
        'Home',
      ]);
      await shot(page, 'debrief');

      // The debrief freezes the game: the pose holds, and Keep exploring resumes it.
      const held = await subPos(page);
      await page.waitForTimeout(800);
      expect(await subPos(page)).toEqual(held);
      await debrief.locator('[data-action="keep-exploring"]').click();
      await expect(debrief).toBeHidden();
      expect((await probe(page)).state).toBe('primaries-complete');
      const resumed = await subPos(page);
      expect(Math.hypot(resumed.x - held.x, resumed.z - held.z)).toBeLessThan(2);
      await expect(page.locator('.objectives-panel')).toBeVisible();

      // Surface again: ended fires again, complete does not.
      await surfaceFromPause(page);
      expect((await flowEvents(page)).map((e) => e.name)).toEqual([
        'mission:primaryComplete',
        'mission:complete',
        'mission:ended',
        'mission:ended',
      ]);

      // Journal opens over the debrief; Escape closes only the Journal.
      await debrief.locator('[data-action="journal"]').click();
      await expect(page.locator('.journal')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('.journal')).toBeHidden();
      await expect(debrief).toBeVisible();

      // Dive sites opens the site chooser in place, without launching a dive.
      await page.evaluate(() => {
        (window as unknown as { __samePage: boolean }).__samePage = true;
      });
      // dispatchEvent skips Playwright's input-ack wait, which stalls behind the dive's frames on software GL.
      await debrief.locator('[data-action="dive-sites"]').dispatchEvent('click');
      await expect(debrief).toBeHidden({ timeout: 60_000 });
      await expect(page.locator('.home-screen')).toBeVisible({ timeout: 30_000 });
      await expect(page.locator('.home-sites')).toBeVisible();
      await expect(page.locator('.home-sites h2')).toHaveText('Dive sites');
      expect(new URL(page.url()).searchParams.get('mission')).toBeNull();
      expect(
        await page.evaluate(() => (window as unknown as { __samePage?: boolean }).__samePage),
      ).toBe(true);
      expect(await page.evaluate(() => (window.__game as { appState: string }).appState)).toBe(
        'home',
      );
      expect(errors, errors.join(' | ')).toEqual([]);
    });

    // Regression guard: primary completion ended the dive early or debrief/Journal navigation lost progress and focus.

    test('Home from the debrief; Dive again starts a fresh dive', async ({ page }) => {
      test.skip(!!process.env.CI, 'two full boots exceed the timeout on software GL');
      test.setTimeout(120_000);
      const errors = collectErrors(page);
      await seed(page);
      await loadDive(page, DIVE);
      await teleport(page, 'titanic-bow');
      await scan(page, 'find-bow');
      // Surfacing before the primaries is an honest "Dive ended".
      await surfaceFromPause(page);
      const debrief = page.locator('.mission-debrief');
      await expect(debrief.locator('.debrief-title')).toHaveText('Back at the surface');
      await expect(debrief.locator('.debrief-highlight')).toHaveText('Scanned Bow section.');
      await expect(debrief.locator('.debrief-next')).toHaveText(
        'Next: Keep exploring to finish the primary objectives.',
      );
      // One filled primary; at most two quiet links visible, the rest under More.
      await expect(debrief.locator('.debrief-btn.is-primary')).toHaveCount(1);
      await expect(debrief.locator('.debrief-secondary > .debrief-btn')).toHaveCount(2);
      // Partial dives must count the unfinished primaries, excluding optional targets.
      await expect(debrief.locator('[data-field="objectives"]')).toHaveText(
        '1 of 2 primary objectives',
      );
      expect((await probe(page)).emitted).not.toContain('mission:complete');
      await shot(page, 'debrief-partial');

      await debrief.locator('.debrief-more-toggle').click();
      await debrief.locator('[data-action="home"]').click();
      await expect(page.locator('.home-screen')).toBeVisible();
      await expect(page.locator('.home-sites')).toBeHidden();
      await expect(page.locator('.home-menu')).toBeVisible();
      // Back to the dive for Dive again (the page itself is still the mission dive).
      await loadDive(page, DIVE);
      await teleport(page, 'titanic-bow');
      await scan(page, 'find-bow');
      await surfaceFromPause(page);
      const before = await page.evaluate(
        (k) => JSON.parse(localStorage.getItem(k) ?? '{}').discovered['titanic/titanic-bow'].count,
        STORAGE_KEY,
      );

      await openMoreIfPresent(debrief);
      await Promise.all([
        page.waitForEvent('load'),
        debrief.locator('[data-action="dive-again"]').click(),
      ]);
      await diveReady(page);
      expect(new URL(page.url()).searchParams.get('mission')).toBe('titanic');
      const fresh = await probe(page);
      expect(fresh.state).toBe('diving');
      expect(fresh.complete).toEqual([]);
      expect(fresh.emitted).toEqual(['mission:started']);
      await expect(page.locator('.obj-progress')).toHaveText(
        `0 of ${objectiveCount} objectives · 0 of ${primaryCount} primary`,
      );
      await expect(page.locator('.mission-debrief')).toHaveCount(0);
      await page.waitForFunction(
        () =>
          (window.__game as { scanner: { view: { candidateId: string | null } } }).scanner.view
            .candidateId === 'titanic-bow',
        undefined,
        { timeout: 15_000 },
      );
      await shot(page, 'dive-again-fresh');
      // The same POI scans again in the new dive; the Journal count goes up.
      await scan(page, 'find-bow');
      const after = await page.evaluate(
        (k) => JSON.parse(localStorage.getItem(k) ?? '{}').discovered['titanic/titanic-bow'].count,
        STORAGE_KEY,
      );
      expect(after).toBe(before + 1);
      expect(errors, errors.join(' | ')).toEqual([]);
    });
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
      // Unscanned targets collapse into one quiet count row: no per-target rows, no names.
      await expect(stern).toHaveCount(0);
      await expect(journal.locator('.jr-nav-item', { hasText: /Unscanned target/ })).toHaveCount(0);
      await expect(journal.locator('.jr-more-to-find')).toHaveText(/^\d+ more to find$/);
      await bow.click();
      await expect(journal.locator('.jr-tag.is-recreation')).toHaveText('Recreation');
      await expect(journal.locator('.jr-sources a').first()).toHaveAttribute('href', /^https?:/);
      await expect(journal.locator('.jr-body')).not.toContainText(/illustrative|not surveyed/i);
      await shot(page, 'journal-site');

      await journal.locator('.jr-spoilers input').check();
      await expect(journal.locator('.jr-more-to-find')).toHaveCount(0);
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
  async function openMoreIfPresent(root: import('@playwright/test').Locator): Promise<void> {
    const toggle = root.locator('.debrief-more-toggle');
    if (await toggle.count()) await toggle.click();
  }
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
      await expect(page.locator('.guidance-slot .guidance-hint')).toHaveText(/HOLD G TO SCAN/);

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
      // It collapses into one quiet count row rather than a locked list item.
      await expect(journal.locator('.jr-site-entries li.is-locked')).toHaveCount(0);
      await expect(journal.locator('.jr-site-entries .jr-more-to-find')).toHaveText(
        `${fixtureGuide.entries.length - 2} more to find`,
      );
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

    test('?debrief=1 opens the debrief after a few seconds', async ({ page }) => {
      const errors = collectErrors(page);
      await loadDive(page, '/?tile=titanic&landmark=_test&debrief=1');
      const debrief = page.locator('.debrief');
      await expect(debrief).toBeVisible({ timeout: 15_000 });
      await expect(page.locator('.debrief-title')).toHaveText('Dive debrief');
      await expect(debrief.locator('.debrief-score')).toContainText('0 scans');
      await expect(debrief.locator('.debrief-next')).toHaveText(
        'Next: Face a target and hold Scan.',
      );
      await expect(page.locator('.debrief-btn')).toHaveText(['Dive again', 'Journal']);
      await reviewScreenshot(page, { path: 'tests/e2e/screenshots/discovery-debrief.png' });

      // "Journal" opens the Journal on top of the debrief.
      await page.locator('.debrief-btn', { hasText: 'Journal' }).click();
      await expect(page.locator('.journal')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('.journal')).toBeHidden();
      await expect(debrief).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(debrief).toBeHidden();

      expect(errors, errors.join(' | ')).toEqual([]);
    });
  });
});

freshTest.describe('frozen debrief and resume', () => {
  const test = experiencedTest;
  type Game = {
    discovery: Discovery;
    missionRouter: MissionRouter;
    sub: Submarine;
    rig: CameraRig;
    appState: string;
    save: { get(): { gameplayMode: string } };
  };

  async function snapshot(page: Page) {
    return page.evaluate(() => {
      const g = window.__game as unknown as Game;
      const m = g.missionRouter.mission;
      return {
        app: g.appState,
        state: m.state,
        elapsed: m.elapsedS,
        duration: m.durationS,
        sessionElapsed: g.discovery.stats.elapsedS,
        scans: g.discovery.stats.snapshot().discoveries,
        counts: m.counts(),
        pose: { ...g.sub.position, yaw: g.sub.yaw, pitch: g.sub.pitch },
        frozen: g.missionRouter.frozen,
      };
    });
  }

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
      for (const site of ['titanic', 'beebe-vent-field', 'great-blue-hole']) {
        // Regression guard: zero-scan debrief hid Keep exploring or allowed timers/motion under Journal and focus escaped.
        test(`${site}: zero and one scan, focus, Journal, resume and exit`, async ({
          page,
        }, info) => {
          test.setTimeout(180_000);
          const errors: string[] = [];
          page.on('pageerror', (error) => errors.push(error.message));
          await pauseClockBeforeNavigation(page);
          await page.goto(`/?mission=${site}&skipBriefing=1&tier=low`, {
            waitUntil: 'domcontentloaded',
          });
          await clockFramesUntil(
            page,
            () =>
              window.__gameReady === true && (window.__game as unknown as Game).discovery.loaded,
          );
          expect(
            await page.evaluate(() => (window.__game as unknown as Game).save.get().gameplayMode),
          ).toBe('arcade');
          const directory = `.cache/codex/shots/journal-debrief/frozen/pass-${info.repeatEachIndex + 1}/${viewport.width}x${viewport.height}/${site}`;
          await mkdir(directory, { recursive: true });
          const shot = async (name: string) => {
            await page.clock.runFor(34);
            await reviewScreenshot(page, { path: `${directory}/${name}.png` });
          };
          const act = async (selector: string) => {
            const control = page.locator(selector);
            if (viewport.touch) await control.tap();
            else await control.click();
          };
          const debrief = page.locator('.mission-debrief');
          let scanName = '';
          for (const scans of [0, 1]) {
            await page.clock.fastForward(250);
            const diving = await snapshot(page);
            await page.keyboard.press('Escape');
            await act('.pause-surface');
            await expect(debrief).toBeVisible();
            await expect(page.locator('.pause-menu')).toBeHidden();
            await expect(page.locator('.objectives-panel')).toBeHidden();
            await expect(debrief.locator('[data-field="discoveries"] .debrief-value')).toHaveText(
              String(scans),
            );
            await expect(debrief.locator('.debrief-highlight')).toHaveText(
              scans === 0 ? 'The site is waiting for your first scan.' : `Scanned ${scanName}.`,
            );
            await expect(debrief.locator('.debrief-btn.is-primary')).toHaveCount(1);
            await expect(debrief.locator('.debrief-btn.is-primary')).toHaveAttribute(
              'data-action',
              scans === 0 ? 'keep-exploring' : 'dive-sites',
            );
            const quiet = scans === 0 ? 'dive-sites' : 'keep-exploring';
            await expect(debrief.locator('.debrief-secondary > [data-action]')).toHaveCount(2);
            await expect(
              debrief.locator(`.debrief-secondary > [data-action="${quiet}"]`),
            ).toBeVisible();
            await expect(
              debrief.locator('.debrief-secondary > [data-action="journal"]'),
            ).toBeVisible();
            await expect(debrief.locator('.debrief-more-items')).toBeHidden();
            const panel = debrief.locator('.debrief-panel');
            expect(
              await panel.evaluate((e) => e.scrollHeight - e.clientHeight),
            ).toBeLessThanOrEqual(1);
            expect(await panel.evaluate((e) => e.scrollWidth - e.clientWidth)).toBeLessThanOrEqual(
              1,
            );
            const box = (await panel.boundingBox())!;
            expect(box.x).toBeGreaterThanOrEqual(0);
            expect(box.y).toBeGreaterThanOrEqual(0);
            expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
            expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
            const ended = await snapshot(page);
            expect(ended.state).toBe('debrief');
            expect(ended.frozen).toBe(true);
            expect(ended.elapsed).toBe(diving.elapsed);
            await page.keyboard.down('w');
            await page.clock.fastForward(1000);
            await page.keyboard.up('w');
            expect(await snapshot(page)).toEqual(ended);
            // Opening intentionally blurs focus to avoid held flight keys firing a button.
            const primary = scans === 0 ? 'keep-exploring' : 'dive-sites';
            for (const target of [primary, quiet, 'journal', 'more', primary]) {
              await page.keyboard.press('Tab');
              await expect(
                debrief.locator(
                  target === 'more' ? '.debrief-more-toggle' : `[data-action="${target}"]`,
                ),
              ).toBeFocused();
            }
            await page.keyboard.press('Shift+Tab');
            await expect(debrief.locator('.debrief-more-toggle')).toBeFocused();
            await page.keyboard.press('Enter');
            await expect(debrief.locator('.debrief-more-toggle')).toHaveAttribute(
              'aria-expanded',
              'true',
            );
            for (const target of ['dive-again', 'home', primary]) {
              await page.keyboard.press('Tab');
              await expect(debrief.locator(`[data-action="${target}"]`)).toBeFocused();
            }
            await debrief.locator('.debrief-more-toggle').click();
            await shot(`${scans}-scan-debrief`);
            await act('.mission-debrief [data-action="journal"]');
            await expect(page.locator('.journal')).toBeVisible();
            await page.keyboard.press('Tab');
            expect(await page.evaluate(() => !!document.activeElement?.closest('.journal'))).toBe(
              true,
            );
            await act('.jr-close');
            await expect(debrief.locator('[data-action="journal"]')).toBeFocused();
            expect(await snapshot(page)).toEqual(ended);
            // Activate the new primary with Enter; exercise pointer/touch on the secondary.
            if (scans === 0) {
              await page.keyboard.press('Tab');
              await page.keyboard.press('Tab');
              await expect(debrief.locator('[data-action="keep-exploring"]')).toBeFocused();
              await page.keyboard.press('Enter');
            } else {
              await act('.mission-debrief .debrief-more-toggle');
              await expect(debrief.locator('.debrief-more-items')).toBeVisible();
              await act('.mission-debrief [data-action="keep-exploring"]');
            }
            await expect(debrief).toBeHidden();
            // Phones name the objective in the guidance slot, not the panel.
            if (!viewport.touch) await expect(page.locator('.objectives-panel')).toBeVisible();
            await expect(page.locator('.hud-readouts')).toBeVisible();
            const resumed = await snapshot(page);
            expect(resumed).toEqual({
              ...ended,
              state: diving.state,
              duration: null,
              frozen: false,
            });
            expect(await page.evaluate(() => !!document.activeElement?.closest('.debrief'))).toBe(
              false,
            );
            // The first resumed frame carries no clock time; the next one ticks.
            await page.clock.fastForward(250);
            await page.clock.fastForward(250);
            const ticking = await snapshot(page);
            expect(ticking.elapsed).toBeGreaterThan(resumed.elapsed);
            expect(ticking.sessionElapsed).toBeGreaterThan(resumed.sessionElapsed);
            expect(ticking.scans).toEqual(resumed.scans);
            expect(ticking.counts).toEqual(resumed.counts);
            await page.keyboard.down('w');
            for (let frame = 0; frame < 8; frame++) await page.clock.fastForward(250);
            await page.keyboard.up('w');
            expect((await snapshot(page)).pose).not.toEqual(ticking.pose);
            await shot(`${scans}-scan-resumed`);
            if (scans === 0) {
              // Use the existing assisted geometry/time helper, retaining real scan input/events.
              const target = await page.evaluate(() => {
                const g = window.__game as unknown as Game;
                const poi = g.discovery.pois[0]!;
                const pose = g.discovery.spawnPose(poi.id)!;
                g.sub.reset(pose.x, pose.y, pose.z, pose.yaw);
                g.rig.snap(g.sub.position, g.sub.yaw, g.sub.pitch);
                g.discovery.stats.markTeleport();
                return { id: poi.id, name: poi.name };
              });
              scanName = target.name;
              await scanWithKeyboard(page, target.id);
              expect((await snapshot(page)).scans).toEqual([
                { poiId: target.id, name: target.name },
              ]);
            }
          }
          // A rebuilt summary must reset its expanded More state and retain the one scan.
          await page.keyboard.press('Escape');
          await act('.pause-surface');
          await expect(debrief.locator('.debrief-more-items')).toBeHidden();
          await expect(debrief.locator('[data-field="discoveries"] .debrief-value')).toHaveText(
            '1',
          );
          await page.keyboard.press('Escape');
          await expect(debrief).toBeHidden();
          expect((await snapshot(page)).frozen).toBe(false);
          await page.keyboard.press('Escape');
          await act('.pause-surface');
          await act('.mission-debrief [data-action="dive-sites"]');
          await expect(page.locator('.home-sites')).toBeVisible();
          await page.getByRole('button', { name: 'Back to menu', exact: true }).click();
          await expect(page.locator('.home-menu')).toBeVisible();
          expect(errors).toEqual([]);
        });
      }
    });
  }
});

freshTest.describe('summary, disclosures and provenance', () => {
  const test = experiencedTest;
  const env = (globalThis as { process?: { env?: Record<string, string> } }).process?.env ?? {};

  type Game = {
    journal: Journal;
    discovery: Discovery;
    mission: { primaryCounts(): { completed: number; total: number } };
    sub: Submarine;
    rig: CameraRig;
    save: { get(): { gameplayMode: string } };
  };
  const sites = ['titanic', 'lost-city', 'great-blue-hole', 'beebe-vent-field', 'monterey-canyon'];

  async function contained(panel: Locator): Promise<void> {
    await expect(panel).toBeVisible();
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
    { width: 844, height: 390, touch: true },
  ]) {
    const disclosures = viewport.width !== 844;
    const rounds = Number(env.ROUNDS ?? (disclosures ? 3 : 2));
    test.describe(`summary and Journal ${viewport.width}x${viewport.height}`, () => {
      test.use({
        viewport,
        hasTouch: viewport.touch,
        isMobile: viewport.touch,
        deviceScaleFactor: 1,
        serviceWorkers: 'block',
        storageState: { cookies: [], origins: [] },
      });
      for (const site of sites) {
        // Regression guard: Journal disclosure focus escaped closed groups, provenance tags duplicated or debrief became a scrolling list.
        test(`${site}: expandable groups, single tag and short debrief over ${rounds} rounds`, async ({
          page,
        }) => {
          test.setTimeout(240_000);
          const errors: string[] = [];
          page.on('pageerror', (error) => errors.push(error.message));
          await pauseClockBeforeNavigation(page);
          await page.addInitScript(() => {
            localStorage.setItem(
              'subexplorer.settings.v3',
              JSON.stringify({ version: 2, graphicsTier: 'low' }),
            );
          });
          await page.goto(`/?mission=${site}&skipBriefing=1&tier=low`, {
            waitUntil: 'domcontentloaded',
          });
          await clockFramesUntil(
            page,
            () =>
              window.__gameReady === true && (window.__game as unknown as Game).discovery.loaded,
          );
          expect(
            await page.evaluate(() => (window.__game as unknown as Game).save.get().gameplayMode),
          ).toBe('arcade');
          if (disclosures)
            await page.evaluate(() => (window.__game as unknown as Game).journal.load());
          const directory = `.cache/codex/shots/journal-debrief/${viewport.width}x${viewport.height}/${site}`;
          await mkdir(directory, { recursive: true });
          const shot = async (name: string) => {
            await page.clock.runFor(34);
            await reviewScreenshot(page, { path: `${directory}/${name}.png` });
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
            await contained(debrief.locator('.debrief-panel'));
            await expect(debrief.locator('[data-field="discoveries"] .debrief-value')).toHaveText(
              round === 1 ? '0' : '1',
            );
            // Primary progress stays explicit in the same compact row on every viewport.
            const primary = await page.evaluate(() =>
              (window.__game as unknown as Game).mission.primaryCounts(),
            );
            await expect(debrief.locator('[data-field="objectives"]')).toHaveText(
              `${primary.completed} of ${primary.total} primary objectives`,
            );
            if (disclosures) {
              expect(
                await debrief
                  .locator('.debrief-panel')
                  .evaluate((el) => el.scrollHeight - el.clientHeight),
              ).toBeLessThanOrEqual(1);
              await expect(debrief.locator('.debrief-score')).toHaveCount(1);
              await expect(debrief.locator('.debrief-highlight')).toHaveText(
                round === 1 ? 'The site is waiting for your first scan.' : `Scanned ${scanName}.`,
              );
              await expect(debrief.locator('.debrief-next')).toHaveCount(1);
              await expect(debrief.locator('.debrief-btn.is-primary')).toHaveCount(1);
              await expect(
                debrief.locator('.debrief-stats, .debrief-lists, .debrief-subtitle'),
              ).toHaveCount(0);
            }
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
            await expect(debrief.locator('.debrief-rating')).not.toContainText('research points');
            await expect(debrief.locator('.debrief-stars')).toHaveAttribute(
              'aria-label',
              /[0-3] of 3 stars/,
            );
            await expect(debrief.locator('.debrief-section.is-samples')).toHaveCount(0);

            await shot(`round-${round}-debrief`);
            await act(debrief.locator('[data-action="journal"]'));
            const journal = page.locator('.journal');
            await expect(journal).toBeVisible();
            await contained(journal.locator('.jr-panel'));
            await contained(journal.locator('.jr-header'));
            await contained(journal.locator('.jr-body'));
            if (round === 1) await expect(journal.locator('.jr-locked')).toBeVisible();
            if (disclosures) {
              if (viewport.touch) {
                // The phone sheet has no tree: the site page lists its groups as rows.
                await contained(journal.locator('.jr-panel'));
                await expect(journal.locator('.jr-nav')).toBeHidden();
                await contained(journal.locator('.jr-body'));
                if (round === 1) {
                  await journal.locator('.jr-spoilers input').check();
                  await openJournalCategory(page, site, 'life');
                  await expect(journal.locator('.jr-site-more summary')).toBeVisible();
                  await act(journal.locator('.jr-row.is-life').first());
                  const tags = journal.locator('.jr-title-row .jr-tag:not(.is-undiscovered)');
                  await expect(tags).toHaveCount(1);
                  await expect(tags).toHaveText('Game addition');
                  await shot('journal-game-addition');
                  await act(journal.locator('.jr-back'));
                  await act(journal.locator('.jr-row.is-secret').first());
                  await expect(tags).toHaveCount(1);
                  await expect(tags).toHaveText('Game addition');
                  await shot('journal-secret');
                  await act(journal.locator('.jr-back'));
                  const axe = await withClockFrames(page, () =>
                    new AxeBuilder({ page }).include('.journal').analyze(),
                  );
                  expect(axe.violations.map((v) => v.id)).toEqual([]);
                  await journal.locator('.jr-spoilers input').uncheck();
                }
              } else {
                const current = journal.locator(`.jr-nav-list > li > [data-target="${site}"]`);
                await expect(current).toHaveAttribute('aria-expanded', 'true');
                await contained(journal.locator('.jr-panel'));
                await contained(journal.locator('.jr-nav'));
                const poi = journal.locator(`details[data-category="${site}/poi"]`);
                if (round === 1) {
                  await expect(
                    journal.locator('.jr-nav-list > li > [aria-expanded="true"]'),
                  ).toHaveCount(1);
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
              }
            }
            if (round === 1) {
              await journalFront(page);
              await expect(journal.locator('.jr-honesty')).toHaveCount(1);
              await shot('journal-front');
              await journal.locator(`.jr-site-card[data-target="${site}"]`).click();
              await journal.locator('.jr-spoilers input').check();
              await (
                site === 'monterey-canyon'
                  ? (await journalEntries(page, 'monterey-canyon/poi/canyon-wall')).first()
                  : await journalFirstOfKind(page, 'poi')
              ).click();
              await expect(journal.locator('.jr-tag.is-recreation')).toHaveCount(1);
              await expect(journal.locator('.jr-tag.is-recreation')).toHaveText('Recreation');
              await expect(journal.locator('.jr-honesty')).toHaveCount(0);
              if (await journalIsSheet(page)) {
                await expect(journal.locator('.jr-nav')).toBeHidden();
                expect((await journal.locator('.jr-body').boundingBox())!.height).toBeGreaterThan(
                  viewport.height * 0.5,
                );
                // Back goes up one level, to the site page, and leaves the article focused.
                await journal.locator('.jr-back').click();
                await expect(journal.locator('.jr-body .jr-entries')).toBeVisible();
                await expect(journal.locator('.jr-body')).toBeFocused();
                await (await journalFirstOfKind(page, 'poi')).click();
              }
              await shot('journal-spoiler-entry');
              await setJournalSpoilers(page, false);
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
  const env =
    (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
  const shots = env.FLOW_AUDIT_SHOTS ?? '.cache/codex/shots/journal-debrief/journey';
  const captureSeconds = Number(env.FLOW_AUDIT_SECONDS ?? 10);
  const sites = ['titanic', 'lost-city', 'great-blue-hole', 'beebe-vent-field', 'monterey-canyon'];
  type Game = {
    discovery: Discovery;
    journal: Journal;
    sub: Submarine;
    rig: CameraRig;
    onboard: { tutorial: { index: number } };
    life: { enabled: boolean; clear(): void } | null;
  };

  async function ready(page: Page): Promise<void> {
    await clockFramesUntil(
      page,
      () => window.__gameReady === true && (window.__game as unknown as Game).discovery.loaded,
    );
    await page.evaluate(() => (window.__game as unknown as Game).journal.load());
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
    // Paused clock: Playwright's actionability check needs rendered frames.
    await page.clock.runFor(34);
    if (touch) await page.locator('.tc-btn-pause').tap();
    else await page.keyboard.press('Escape');
    await page.clock.runFor(17);
    await expect(page.locator('.pause-menu')).toBeVisible();
  }

  async function closeJournal(page: Page, touch: boolean): Promise<void> {
    if (touch) await page.locator('.jr-close').tap();
    else await page.keyboard.press('Escape');
    await expect(page.locator('.journal')).toBeHidden();
  }

  async function checkJournalNavigation(journal: Locator, site: string): Promise<void> {
    const page = journal.page();
    if (await journalIsSheet(page)) {
      // The sheet's contents are the front page: site cards, no tree.
      await journalContents(page);
      await contained(journal.locator('.jr-body'));
      await contained(journal.locator(`.jr-site-card[data-target="${site}"]`));
      await openJournalSite(page, site);
      return;
    }
    await contained(journal.locator('.jr-nav'));
    await contained(journal.locator(`.jr-nav-item[data-target="${site}"]`));
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
      await expect
        .poll(async () => {
          await page.clock.fastForward(250);
          return page.evaluate(() => (window.__game as unknown as Game).onboard.tutorial.index);
        })
        .toBe(step);
    } finally {
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await session.detach();
    }
  }

  async function firstActions(page: Page, touch: boolean): Promise<void> {
    if (touch) {
      await holdTouchUntilStep(page, '.tc-stick', 1, 0.8, 0.2);
      await holdTouchUntilStep(page, '.tc-slider', 2, 0.5, 0.15);
    } else {
      await page.keyboard.down('w');
      await page.keyboard.down('d');
      try {
        await clockFramesUntil(
          page,
          () => (window.__game as unknown as Game).onboard.tutorial.index === 1,
          250,
        );
      } finally {
        await page.keyboard.up('w');
        await page.keyboard.up('d');
      }
      await page.keyboard.down('Space');
      try {
        await clockFramesUntil(
          page,
          () => (window.__game as unknown as Game).onboard.tutorial.index === 2,
          250,
        );
      } finally {
        await page.keyboard.up('Space');
      }
    }
    await page.clock.runFor(17);
    // The scan step is current even while the scan card keeps the tutorial card hidden.
    expect(
      await page.evaluate(() => (window.__game as unknown as Game).onboard.tutorial.index),
    ).toBe(2);
  }

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
      for (const site of ['titanic', 'great-blue-hole']) {
        // Regression guard: consecutive primary scans must keep reward directions
        // consistent with visible waypoints and retain both Journal entries.
        test(`${site}: Home -> first scan -> Journal -> second scan -> Journal -> debrief`, async ({
          page,
        }, info) => {
          const prefix = `${site}-${size}`;
          const directory = `${env.FLOW_AUDIT_SHOTS ?? '.cache/codex/shots/journeys'}/round-${info.repeatEachIndex + 1}/${prefix}`;
          const sha = (
            await promisify(execFile)('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' })
          ).stdout.trim();
          let build: ReturnType<typeof readGoldenBuild> | undefined;
          const planned = [
            'home',
            'settings-aa',
            'pick-mission',
            'briefing',
            'dive-start',
            'scan-ready',
            'first-scan',
            'first-scan-next-frame',
            'journal',
            'second-scan-ready',
            'second-scan',
            'second-scan-next-frame',
            'second-journal',
            'debrief',
          ];
          const steps: unknown[] = [];
          const failures: { step: string; error: string }[] = [];
          const errors: string[] = [];
          const startedMs = Date.now();
          const startedAt = new Date(startedMs).toISOString();
          let current = planned[0];
          let sequence = 0;
          page.on('pageerror', (error) => errors.push(error.message));
          // Each case owns its directory; retries cannot retain an earlier build's PNGs.
          await rm(directory, { recursive: true, force: true });
          await mkdir(directory, { recursive: true });
          const persist = async (): Promise<void> => {
            await writeFile(
              `${directory}/manifest.json`,
              JSON.stringify(
                {
                  sha,
                  build,
                  capturedAt: startedAt,
                  site,
                  layout: size,
                  tier: 'low',
                  input: layout.touch ? 'touch' : 'keyboard',
                  route: 'Home mission selection; POI spawn poses; held scan controls',
                  clock: 'paused; discovery-only scan time; rendered frames for overlays',
                  startedAt,
                  wallMs: Date.now() - startedMs,
                  status: failures.length
                    ? 'failed'
                    : current === 'complete'
                      ? 'passed'
                      : 'running',
                  planned,
                  steps,
                  failures,
                  errors,
                },
                null,
                2,
              ),
            );
          };
          const shot = async (step: string): Promise<void> => {
            const served = readGoldenBuild(await page.content());
            expect(served.sha, 'Capture must use the current checkout build').toBe(sha);
            if (build)
              expect(served, 'Build must stay the same throughout the journey').toEqual(build);
            build = served;
            const path = `${directory}/${prefix}-${String(++sequence).padStart(2, '0')}-${step}.png`;
            const state = await page.evaluate((touch) => {
              const g = window.__game as unknown as Game & {
                appState: string;
                perf: { tier: string };
                mission: { state: string; elapsedS: number; objectives: unknown[] } | null;
              };
              const visible = (el: HTMLElement): boolean => {
                if (!el.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true }))
                  return false;
                const rect = el.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0;
              };
              const describe = (el: HTMLElement) => ({
                selector: `.${[...el.classList].join('.')}`,
                text: el.innerText,
                rect: el.getBoundingClientRect().toJSON(),
              });
              const modal = [
                '.settings',
                '.home-screen',
                '.briefing',
                '.journal',
                '.mission-debrief',
              ]
                .map((selector) => document.querySelector<HTMLElement>(selector))
                .find((el) => el && visible(el));
              const hudPanels = modal
                ? []
                : [
                    '.sonar',
                    '.objectives-panel',
                    '.hud-readouts',
                    '.guidance-slot',
                    '.d-scan-edge',
                    '.hud-bar',
                    '.tc-stick',
                    '.tc-slider',
                    '.tc-buttons',
                  ].flatMap((selector) => {
                    const el = document.querySelector<HTMLElement>(selector);
                    return el && visible(el) ? [describe(el)] : [];
                  });
              // Read primary copy rather than scroll containers: a scrollable
              // Journal/body is intentional, an ellipsized mission title is not.
              const text = [
                ...document.querySelectorAll<HTMLElement>(
                  '.obj-title, .obj-item.is-current .obj-item-title, .guidance-text, ' +
                    '.briefing-title, .briefing-summary, .debrief-kicker, .debrief-title, ' +
                    '.debrief-highlight, .debrief-next, .jr-body .jr-title, .jr-crumb',
                ),
              ]
                .filter((el) => visible(el) && (!modal || modal.contains(el)))
                .map((el) => ({
                  ...describe(el),
                  clips:
                    el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1,
                }));
              const controls = modal ?? document;
              const touchTargets = touch
                ? [
                    ...controls.querySelectorAll<HTMLElement>(
                      'button, summary, a[href], select, input, [role="button"], [role="tab"], .tc-stick, .tc-slider',
                    ),
                  ]
                    // Native radios may be transparent overlays; their visible
                    // label is the full tappable target, as with a checkbox.
                    .map((el) => (el instanceof HTMLInputElement ? (el.labels?.[0] ?? el) : el))
                    .filter((el) => {
                      if (!visible(el)) return false;
                      const r = el.getBoundingClientRect();
                      // Offscreen items in scrolling lists are not visible targets.
                      if (
                        r.bottom <= 0 ||
                        r.top >= innerHeight ||
                        r.right <= 0 ||
                        r.left >= innerWidth
                      )
                        return false;
                      return document
                        .elementsFromPoint(
                          Math.max(0, Math.min(innerWidth - 1, r.x + r.width / 2)),
                          Math.max(0, Math.min(innerHeight - 1, r.y + r.height / 2)),
                        )
                        .some((hit) => el === hit || el.contains(hit));
                    })
                    .map(describe)
                : [];
              return {
                url: location.href,
                viewport: [innerWidth, innerHeight],
                appState: g?.appState,
                tier: g?.perf?.tier,
                elapsedS: g?.discovery?.stats.elapsedS,
                guidance: document.querySelector<HTMLElement>('.guidance-slot')?.innerText,
                waypoint: (() => {
                  const el = document.querySelector<HTMLElement>('.d-scan-edge');
                  return el && visible(el) ? el.innerText : null;
                })(),
                readouts: document.querySelector<HTMLElement>('.hud-readouts')?.innerText,
                stats: g?.discovery?.stats.snapshot(),
                debugSpawn: g?.discovery?.spawnedAt,
                scanner: g?.discovery ? { ...g.discovery.scanner.view } : null,
                position: g?.sub?.position.toArray(),
                velocity: g?.sub?.velocity.toArray(),
                yaw: g?.sub?.yaw,
                pitch: g?.sub?.pitch,
                mission: g?.mission
                  ? {
                      state: g.mission.state,
                      elapsedS: g.mission.elapsedS,
                      objectives: g.mission.objectives,
                    }
                  : null,
                tutorialStep: g?.onboard?.tutorial.index,
                hudPanels,
                text,
                touchTargets,
                panels: [
                  '.home-screen',
                  '.settings',
                  '.guidance-slot',
                  '.briefing',
                  '.journal',
                  '.mission-debrief',
                ].flatMap((selector) => {
                  const el = document.querySelector<HTMLElement>(selector);
                  return el && visible(el)
                    ? [
                        {
                          selector,
                          text: el.innerText,
                          rect: el.getBoundingClientRect().toJSON(),
                        },
                      ]
                    : [];
                }),
              };
            }, layout.touch);
            steps.push({ step, wallMs: Date.now() - startedMs, path, state });
            // Retain state even if image capture itself fails. Screenshots are
            // required independently of render-review flags.
            try {
              await page.screenshot({ path });
            } finally {
              await persist();
            }
            // Regression guard: passing navigation must also preserve readable
            // mission copy, separate HUD regions and usable touch controls.
            for (const text of state.text)
              expect(text.clips, `${step}: clipped ${text.selector}: ${text.text}`).toBe(false);
            for (const [i, panel] of state.hudPanels.entries()) {
              const a = panel.rect;
              expect(a.left, `${step}: ${panel.selector}`).toBeGreaterThanOrEqual(0);
              expect(a.top, `${step}: ${panel.selector}`).toBeGreaterThanOrEqual(0);
              expect(a.right, `${step}: ${panel.selector}`).toBeLessThanOrEqual(layout.width);
              expect(a.bottom, `${step}: ${panel.selector}`).toBeLessThanOrEqual(layout.height);
              for (const other of state.hudPanels.slice(i + 1)) {
                const b = other.rect;
                expect(
                  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom,
                  `${step}: ${panel.selector} overlaps ${other.selector}`,
                ).toBe(false);
              }
            }
            if (layout.touch)
              expect(state.touchTargets.length, `${step}: visible touch targets`).toBeGreaterThan(
                0,
              );
            for (const target of state.touchTargets) {
              expect(target.rect.width, `${step}: ${target.selector}`).toBeGreaterThanOrEqual(44);
              expect(target.rect.height, `${step}: ${target.selector}`).toBeGreaterThanOrEqual(44);
            }
          };
          // Navigation/physics have their own capability specs. Set a stable scan
          // pose so software rendering and coasting cannot change the held target.
          const setScanPose = async (id: string): Promise<void> => {
            await test.step(`Set scan pose: ${id}`, async () => {
              // Completion cards suppress the next ready cue for their lifetime.
              // Pump frames explicitly: a locator wait cannot expire a paused timer.
              await clockFramesUntil(
                page,
                () =>
                  !document
                    .querySelector<HTMLElement>('.guidance-slot')
                    ?.innerText.includes('New Journal entry'),
                250,
              );
              const pose = await page.evaluate((id) => {
                const g = window.__game as unknown as Game & {
                  config: {
                    submarine: { maxPitch: number; hullRadius: number; seabedClearance: number };
                  };
                  terrain: { sampleHeight(x: number, z: number): number };
                };
                const from = g.discovery.spawnPose(id);
                const target = g.discovery.pois.find((poi) => poi.id === id);
                if (!from || !target) throw new Error(`No POI pose for ${id}`);
                if (id.startsWith('great-blue-hole-stalactites')) {
                  // The generic south bearing lands on the shallow reef rim.
                  // Observe these galleries from inside the bowl, at a hull-safe depth.
                  from.x = target.position.x;
                  // Which side is deep differs per gallery (the rim is shallow).
                  from.z = target.position.z + (id.endsWith('-east') ? -40 : 40);
                  from.y = Math.max(
                    target.position.y + 16,
                    g.terrain.sampleHeight(from.x, from.z) +
                      g.config.submarine.hullRadius +
                      g.config.submarine.seabedClearance +
                      4,
                  );
                }
                return { from, target: target.position, maxPitch: g.config.submarine.maxPitch };
              }, id);
              const aim = scanAim(pose.from, pose.target, pose.maxPitch);
              await page.evaluate(
                ({ from, aim }) => {
                  const g = window.__game as unknown as Game;
                  g.sub.reset(from.x, from.y, from.z, aim.yaw);
                  g.sub.pitch = aim.pitch;
                  g.rig.snap(g.sub.position, g.sub.yaw, g.sub.pitch);
                  g.discovery.stats.markTeleport();
                },
                { from: pose.from, aim },
              );
              await page.clock.runFor(34);
              expect(
                await page.evaluate(
                  () => (window.__game as unknown as Game).discovery.scanner.view.candidateId,
                ),
              ).toBe(id);
              await expect(page.locator('.guidance-slot')).toContainText(/HOLD .* TO SCAN/i);
              await expect(page.locator('.guidance-slot')).not.toContainText(/OPTIONAL/i);
            });
          };
          const scan = async (id: string, completed: number): Promise<void> => {
            await test.step(`Hold scan: ${id}`, async () => {
              if (layout.touch) {
                const button = page.locator('.tc-btn-scan');
                await expect(button).toBeVisible();
                const box = (await button.boundingBox())!;
                const session = await page.context().newCDPSession(page);
                try {
                  await session.send('Input.dispatchTouchEvent', {
                    type: 'touchStart',
                    touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }],
                  });
                  await completeScan(page, id);
                } finally {
                  await session.send('Input.dispatchTouchEvent', {
                    type: 'touchEnd',
                    touchPoints: [],
                  });
                  await session.detach();
                }
              } else await scanWithKeyboard(page, id);
              // Inspect the completion card before advancing to its next frame.
              expect(
                await page.evaluate(
                  () => (window.__game as unknown as Game).discovery.scanner.view.completed,
                ),
              ).toBe(completed);
            });
          };
          const reward = async (step: string): Promise<void> => {
            await expect(page.locator('.guidance-slot')).toContainText('New Journal entry');
            for (const name of [step, `${step}-next-frame`]) {
              if (name !== step) await page.clock.fastForward(17);
              const direction = await page.locator('.guidance-slot .guidance-hint').innerText();
              if (/TURN \d|RISE TOWARD|SINK TOWARD|DIVE DEEPER|\d+ m AHEAD/.test(direction)) {
                const nextName = await page.evaluate(() => {
                  const g = window.__game as unknown as Game;
                  const id = g.discovery.scanner.view.objectiveId;
                  return g.discovery.pois.find((p) => p.id === id)?.name;
                });
                expect(nextName, 'Directional rewards need the current objective').toBeTruthy();
                expect(direction, 'Reward directions must agree with the objective').toContain(
                  `${nextName} ·`,
                );
              }
              await shot(name);
            }
          };
          try {
            await persist();
            await pauseClockBeforeNavigation(page);
            // Low is a public launch option, not an injected save or game state.
            await page.goto('/?tier=low', { waitUntil: 'domcontentloaded' });
            await homeReady(page, true);
            await shot(current);
            const home = page.locator('.home-screen');
            current = 'settings-aa';
            await act(home.getByRole('button', { name: 'Settings', exact: true }), layout.touch);
            const settings = page.getByRole('dialog', { name: 'Settings' });
            await act(settings.getByRole('button', { name: 'Aa: cycle UI scale' }), layout.touch);
            await expect(settings.locator('.settings-scale-value')).toHaveText('105%');
            await shot(current);
            await act(settings.getByRole('button', { name: 'Decrease UI scale' }), layout.touch);
            await expect(settings.locator('.settings-scale-value')).toHaveText('100%');
            await act(settings.locator('.settings-close'), layout.touch);
            current = 'pick-mission';
            await act(home.getByRole('button', { name: 'Dive sites', exact: true }), layout.touch);
            await openSiteList(page, layout.touch, true);
            const choice = home.locator(`.mission-item[data-mission="${site}"]`);
            await expect(choice).toBeEnabled();
            await choice.scrollIntoViewIfNeeded();
            await shot(current);
            await Promise.all([
              page.waitForURL((url) => url.searchParams.get('mission') === site, {
                waitUntil: 'domcontentloaded',
              }),
              act(choice, layout.touch),
            ]);
            current = 'briefing';
            await clockFramesUntil(
              page,
              () =>
                window.__gameReady === true && (window.__game as unknown as Game).discovery.loaded,
            );
            await expect(page.locator('.briefing')).toBeVisible();
            await shot(current);
            await act(page.locator('.briefing-begin'), layout.touch);
            await page.clock.runFor(34);
            current = 'dive-start';
            expect(
              await page.evaluate(
                () => (window.__game as unknown as { perf: { tier: string } }).perf.tier,
              ),
            ).toBe('low');
            await shot(current);
            await firstActions(page, layout.touch);
            const start = await page.evaluate(() => {
              const g = window.__game as unknown as Game;
              return {
                target: g.discovery.scanner.view.objectiveId,
              };
            });
            expect(start.target).toBeTruthy();
            current = 'scan-ready';
            await setScanPose(start.target!);
            await shot(current);
            current = 'first-scan';
            await scan(start.target!, 1);
            const result = await page.evaluate(() => {
              const g = window.__game as unknown as Game;
              return {
                id: g.discovery.scanner.view.lastCompleteId,
                first: g.discovery.scanner.view.lastCompleteFirstTime,
                entry: g.discovery.pois.find(
                  (p) => p.id === g.discovery.scanner.view.lastCompleteId,
                )?.guideEntry,
              };
            });
            expect(result.id).toBe(start.target);
            expect(result.first).toBe(true);
            await reward(current);
            current = 'journal';
            await pause(page, layout.touch);
            await act(
              page.locator('.pause-menu').getByRole('button', { name: 'Journal', exact: true }),
              layout.touch,
            );
            const journal = page.locator('.journal');
            await expect(journal).toBeVisible();
            await expect(journal.locator('.jr-body .jr-locked')).toHaveCount(0);
            await expect(journal.locator('.jr-body .jr-title')).toBeVisible();
            await expect(journal.locator('.jr-body .jr-title')).not.toHaveText('Undiscovered');
            expect(
              await page.evaluate(() => (window.__game as unknown as Game).journal.selectedId),
            ).toBe(result.entry);
            await shot(current);
            await closeJournal(page, layout.touch);
            await act(
              page.locator('.pause-menu').getByRole('button', { name: 'Resume', exact: true }),
              layout.touch,
            );
            await page.clock.runFor(34);
            const second = await page.evaluate(() => {
              const g = window.__game as unknown as Game;
              return {
                target: g.discovery.scanner.view.objectiveId,
              };
            });
            expect(second.target).toBeTruthy();
            expect(second.target).not.toBe(start.target);
            current = 'second-scan-ready';
            await setScanPose(second.target!);
            await shot(current);
            current = 'second-scan';
            await scan(second.target!, 2);
            const secondResult = await page.evaluate(() => {
              const g = window.__game as unknown as Game;
              const view = g.discovery.scanner.view;
              return {
                id: view.lastCompleteId,
                first: view.lastCompleteFirstTime,
                entry: g.discovery.pois.find((p) => p.id === view.lastCompleteId)?.guideEntry,
              };
            });
            expect(secondResult.id).toBe(second.target);
            expect(secondResult.first).toBe(true);
            expect(secondResult.entry).not.toBe(result.entry);
            await reward(current);
            await clockFramesUntil(
              page,
              () => {
                const banner = document.querySelector<HTMLElement>('.obj-banner');
                return !!banner?.checkVisibility({ checkVisibilityCSS: true });
              },
              250,
            );
            const keep = page.locator('.obj-banner .is-keep');
            await expect(keep).toBeVisible();
            await act(keep, layout.touch);
            current = 'second-journal';
            await pause(page, layout.touch);
            await act(
              page.locator('.pause-menu').getByRole('button', { name: 'Journal', exact: true }),
              layout.touch,
            );
            await expect(journal).toBeVisible();
            await expect(journal.locator('.jr-body .jr-locked')).toHaveCount(0);
            await expect(journal.locator('.jr-body .jr-title')).toBeVisible();
            await expect(journal.locator('.jr-body .jr-title')).not.toHaveText('Undiscovered');
            expect(
              await page.evaluate(() => (window.__game as unknown as Game).journal.selectedId),
            ).toBe(secondResult.entry);
            await shot(current);
            await closeJournal(page, layout.touch);
            current = 'debrief';
            await act(page.locator('.pause-surface'), layout.touch);
            const debrief = page.locator('.mission-debrief');
            await expect(debrief).toBeVisible();
            await expect(debrief.locator('[data-field="discoveries"] .debrief-value')).toHaveText(
              '2',
            );
            await expect(debrief.locator('.debrief-highlight')).toContainText('Scanned');
            await shot(current);
            expect(errors).toEqual([]);
            current = 'complete';
          } catch (error) {
            failures.push({ step: current, error: String(error) });
            await shot(`blocked-${current}`).catch((captureError) => {
              failures.push({ step: current, error: `Failure capture: ${String(captureError)}` });
            });
            throw error;
          } finally {
            await persist();
          }
        });
      }
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
      for (const site of sites.filter((site) => viewport.sites.includes(site))) {
        // Regression guard: Home-to-dive Journal/debrief journey lost navigation, unlocks or focus; map records uncertain bug attribution.
        test(`${site}: Home -> opening -> Journal -> debrief -> Home`, async ({ page }, info) => {
          test.setTimeout(captureSeconds > 10 ? 480_000 : 240_000);
          await pauseClockBeforeNavigation(page);
          await page.addInitScript(() => {
            if (!localStorage.getItem('subexplorer.settings.v3'))
              localStorage.setItem(
                'subexplorer.settings.v3',
                JSON.stringify({ version: 2, graphicsTier: 'low' }),
              );
          });
          const directory = `${shots}/round-${info.repeatEachIndex + 1}/${size}/${site}`;
          const sha = (
            await promisify(execFile)('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' })
          ).stdout.trim();
          const capturedAt = new Date().toISOString();
          let build: ReturnType<typeof readGoldenBuild> | undefined;
          await rm(directory, { recursive: true, force: true });
          await mkdir(directory, { recursive: true });
          const errors: string[] = [];
          page.on('pageerror', (e) => errors.push(e.message));
          const records: unknown[] = [];
          const persist = async (): Promise<void> => {
            await writeFile(
              `${directory}/manifest.json`,
              JSON.stringify({ sha, build, capturedAt, steps: records }, null, 2),
            );
          };
          await persist();
          const shot = async (name: string): Promise<void> => {
            const served = readGoldenBuild(await page.content());
            expect(served.sha, 'Capture must use the current checkout build').toBe(sha);
            if (build)
              expect(served, 'Build must stay the same throughout the journey').toEqual(build);
            build = served;
            await page.clock.runFor(34);
            const path = `${directory}/${name}.png`;
            await page.screenshot({ path });
            records.push({
              path,
              ...(await page.evaluate(() => {
                const g = window.__game as unknown as Game;
                const selectors = [
                  '.objectives-panel',
                  '.hud-readouts',
                  '.guidance-slot',
                  '.sonar',
                  '.tc-stick',
                  '.tc-slider',
                  '.tc-buttons',
                  '.tc-btn-pause',
                  '.jr-panel',
                  '.debrief-panel',
                ];
                return {
                  elapsedS: g.discovery?.stats.elapsedS ?? null,
                  tutorialStep: g.onboard?.tutorial.index ?? null,
                  candidate: g.discovery?.scanner.view.candidateId ?? null,
                  position: g.sub
                    ? { x: g.sub.position.x, y: g.sub.position.y, z: g.sub.position.z }
                    : null,
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
            await persist();
          };
          const touch = viewport.touch;
          await page.goto('/', { waitUntil: 'domcontentloaded' });
          await homeReady(page, true);
          const home = page.locator('.home-screen');
          await expect(home).toBeVisible();
          await expect(home.getByRole('button', { name: /^Dive(:|$)/ })).toBeEnabled();
          await expect(home.getByRole('button', { name: 'Continue', exact: true })).toHaveCount(0);
          await shot('01-home');
          await act(home.getByRole('button', { name: 'Dive sites', exact: true }), touch);
          const back = home.getByRole('button', { name: 'Back to menu', exact: true });
          await act(back, touch);
          await expect(home.locator('.home-sites')).toBeHidden();
          await act(home.getByRole('button', { name: 'Dive sites', exact: true }), touch);
          await openSiteList(page, touch, true);
          const choice = home.locator(`.mission-item[data-mission="${site}"]`);
          await expect(choice).toBeEnabled();
          await choice.scrollIntoViewIfNeeded();
          await contained(choice);
          await shot('02-pick-site');
          // Site selection navigates; tap/click can resolve before the new
          // document commits. Do not pump/evaluate the outgoing game.
          await Promise.all([
            page.waitForURL((url) => url.searchParams.get('mission') === site, {
              waitUntil: 'domcontentloaded',
            }),
            act(choice, touch),
          ]);
          await ready(page);
          await expect(page.locator('.briefing')).toBeVisible();
          await shot('03-briefing');
          const cancel = page.getByRole('button', { name: 'Back to home', exact: true });
          await cancel.scrollIntoViewIfNeeded();
          await act(cancel, touch);
          await expect(home).toBeVisible();
          await act(home.getByRole('button', { name: 'Dive sites', exact: true }), touch);
          await openSiteList(page, touch, true);
          await Promise.all([
            page.waitForURL((url) => url.searchParams.get('mission') === site, {
              waitUntil: 'domcontentloaded',
            }),
            act(home.locator(`.mission-item[data-mission="${site}"]`), touch),
          ]);
          await ready(page);
          const begin = page.locator('.briefing-begin');
          await begin.scrollIntoViewIfNeeded();
          await shot('04-briefing-actions');
          await act(begin, touch);
          // The clock is paused: render frames so the first tutorial step is shown.
          await page.clock.runFor(34);
          // The objective card is up from the start, so the tutorial waits at its first step.
          expect(
            await page.evaluate(() => (window.__game as unknown as Game).onboard.tutorial.index),
          ).toBe(0);
          if (touch) await expectCompactPhoneHud(page);
          await shot('05-dive-start');
          await firstActions(page, touch);
          // Normal CI observes ten seconds. The director's phone audit captures
          // 10/30/60 simulation seconds using FLOW_AUDIT_SECONDS=60.
          for (const seconds of [10, 30, 60].filter((s) => s <= captureSeconds)) {
            await expect
              .poll(
                async () => {
                  // One real frame per bounded clock advance; Time caps its delta at 250 ms.
                  await page.clock.fastForward(250);
                  return page.evaluate(
                    () => (window.__game as unknown as Game).discovery.stats.elapsedS,
                  );
                },
                { timeout: 180_000, intervals: [20] },
              )
              .toBeGreaterThanOrEqual(seconds);
            if (touch) await expectCompactPhoneHud(page);
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
          await contained(journal.locator('.jr-body'));
          // Check the long current-site label plus points-of-interest count in its actual column.
          await checkJournalNavigation(journal, site);
          await shot('07-journal-unscanned');
          await closeJournal(page, touch);
          await expect(page.locator('.pause-menu')).toBeVisible();
          await shot('08-pause');
          await act(page.locator('.pause-surface'), touch);
          const debrief = page.locator('.mission-debrief');
          await expect(debrief).toBeVisible();
          await expect(debrief.locator('.debrief-title')).toHaveText('Back at the surface');
          await expect(debrief.locator('[data-field="discoveries"] .debrief-value')).toHaveText(
            '0',
          );
          await shot('09-debrief-unscanned');
          await act(debrief.locator('[data-action="journal"]'), touch);
          await expect(journal).toBeVisible();
          await shot('10-journal-from-debrief');
          await closeJournal(page, touch);
          await expect(debrief).toBeVisible();
          await expect(debrief.locator('[data-action="journal"]')).toBeFocused();
          await act(debrief.locator('[data-action="keep-exploring"]'), touch);

          // Supplemental reward/navigation check AFTER the opening. Teleport is
          // explicit in the filename; it is not evidence of a reachable opening scan.
          const poi = await page.evaluate(() => {
            const g = window.__game as unknown as Game;
            const poi = g.discovery.pois[0]!;
            const pose = g.discovery.spawnPose(poi.id)!;
            // Animals from the previous pose can be nearer than the POI at this
            // one; this step checks rewards and navigation, not wildlife targeting.
            if (g.life) {
              g.life.clear();
              g.life.enabled = false;
            }
            g.sub.reset(pose.x, pose.y, pose.z, pose.yaw);
            g.rig.snap(g.sub.position, g.sub.yaw, g.sub.pitch);
            g.discovery.stats.markTeleport();
            return { id: poi.id, entry: poi.guideEntry };
          });
          // Paused clock: render frames so the touch HUD shows after resuming.
          await page.clock.runFor(34);
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
          await contained(journal.locator('.jr-body'));
          await checkJournalNavigation(journal, site);
          await shot('11-journal-assisted-scan');
          await journal.locator('.jr-body').evaluate((e) => (e.scrollTop = e.scrollHeight));
          if (size === '844x390')
            expect(await journal.locator('.jr-body').evaluate((e) => e.scrollTop)).toBeGreaterThan(
              0,
            );
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
          await expect(debrief.locator('[data-field="discoveries"] .debrief-value')).toHaveText(
            '1',
          );
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
          await act(debrief.locator('.debrief-more-toggle'), touch);
          await act(debrief.locator('[data-action="home"]'), touch);
          await expect(home).toBeVisible();
          await expect(home.locator('.home-menu')).toBeVisible();
          await shot('13-return-home');
          expect(errors).toEqual([]);
        });
      }
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
