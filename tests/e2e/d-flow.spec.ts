import { scanWithKeyboard } from './helpers/scan.js';
import { expect, test, type Page } from './helpers/unlocked.js';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';

/**
 * D-FLOW: primary completion keeps the dive going, the end-of-dive choices do
 * what they say, and the Journal replaces the field guide
 * (plan/PHASE-D-CONTRACTS.md §4). Runs on the real Titanic content.
 */

const shots = '.cache/codex/shots/d-flow';
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
  await page.screenshot({ path: `${shots}/${name}.png` });
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

async function boot(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await ready(page);
}

async function ready(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
  await page.waitForFunction(
    () => (window.__game as { discovery?: { loaded: boolean } } | undefined)?.discovery?.loaded,
    undefined,
    { timeout: 20_000 },
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

test.describe('D-FLOW dive flow', () => {
  test('primaries complete -> keep exploring -> secondary -> surface -> debrief actions', async ({
    page,
  }) => {
    test.setTimeout(150_000);
    const errors = collectErrors(page);
    await seed(page);
    await boot(page, DIVE);

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
    await expect(page.locator('.obj-progress')).toHaveText('0 of 4 objectives · 0 of 2 primary');
    await recordFlowEvents(page);

    await teleport(page, 'titanic-bow');
    await scan(page, 'find-bow');
    await teleport(page, 'titanic-stern');
    await scan(page, 'find-stern');

    let p = await probe(page);
    expect(p.state).toBe('primaries-complete');
    const banner = page.locator('.obj-banner');
    await expect(banner).toBeVisible({ timeout: 8_000 });
    await expect(banner.locator('.obj-banner-title')).toHaveText('Primary objectives complete');
    await expect(banner.locator('.obj-banner-detail')).toHaveText(
      '2 of 4 objectives. 2 optional targets remain.',
    );
    await expect(banner.locator('button')).toHaveText(['Keep exploring', 'Surface and debrief']);
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
    await expect(page.locator('.obj-progress')).toHaveText('3 of 4 objectives · primaries done');

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
    expect(events[0]?.payload).toEqual({ missionId: 'titanic', completed: 2, total: 4 });
    expect(events[2]?.payload).toMatchObject({
      missionId: 'titanic',
      reason: 'surface',
      completed: 3,
      total: 4,
    });
    await expect(debrief.locator('.debrief-title')).toHaveText('Mission complete');
    await expect(debrief.locator('.debrief-subtitle')).toHaveText('All primary objectives');
    await expect(
      debrief.locator('.debrief-stat[data-field="objectives"] .debrief-value'),
    ).toHaveText('3 of 4');
    await expect(debrief.locator('.debrief-btn')).toHaveText([
      'Dive sites',
      'Home',
      'Keep exploring',
      'Dive again',
      'Journal',
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
    await debrief.locator('[data-action="dive-sites"]').click();
    await expect(debrief).toBeHidden();
    await expect(page.locator('.home-screen')).toBeVisible();
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

  test('Home from the debrief; Dive again starts a fresh dive', async ({ page }) => {
    test.setTimeout(120_000);
    const errors = collectErrors(page);
    await seed(page);
    await boot(page, DIVE);
    await teleport(page, 'titanic-bow');
    await scan(page, 'find-bow');
    // Surfacing before the primaries is an honest "Dive ended".
    await surfaceFromPause(page);
    const debrief = page.locator('.mission-debrief');
    await expect(debrief.locator('.debrief-title')).toHaveText('Back at the surface');
    await expect(debrief.locator('.debrief-subtitle')).toHaveText(
      'You found 1 of 4 — the rest are still down there.',
    );
    // One filled primary; at most two quiet links visible, the rest under More.
    await expect(debrief.locator('.debrief-btn.is-primary')).toHaveCount(1);
    await expect(debrief.locator('.debrief-secondary > .debrief-btn')).toHaveCount(2);
    await expect(debrief.locator('[data-field="objectives"] .debrief-value')).toHaveText('1 of 4');
    expect((await probe(page)).emitted).not.toContain('mission:complete');

    await debrief.locator('.debrief-more-toggle').click();
    await debrief.locator('[data-action="home"]').click();
    await expect(page.locator('.home-screen')).toBeVisible();
    await expect(page.locator('.home-sites')).toBeHidden();
    await expect(page.locator('.home-menu')).toBeVisible();
    // Back to the dive for Dive again (the page itself is still the mission dive).
    await boot(page, DIVE);
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
    await ready(page);
    expect(new URL(page.url()).searchParams.get('mission')).toBe('titanic');
    const fresh = await probe(page);
    expect(fresh.state).toBe('diving');
    expect(fresh.complete).toEqual([]);
    expect(fresh.emitted).toEqual(['mission:started']);
    await expect(page.locator('.obj-progress')).toHaveText('0 of 4 objectives · 0 of 2 primary');
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

test.describe('D-FLOW Journal', () => {
  test('home front page, site entries, spoilers, reload', async ({ page }) => {
    const errors = collectErrors(page);
    await seed(page);
    await boot(page, '/');
    const raw = await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY);

    await expect(page.locator('.home-screen')).toBeVisible();
    await page.locator('.home-menu button', { hasText: 'Journal' }).click();
    const journal = page.locator('.journal');
    await expect(journal).toBeVisible();
    await expect(journal.locator('.jr-honesty')).toContainText('real survey data');
    await expect(journal.locator('.jr-site-card')).toHaveCount(13);
    await expect(journal.locator('.jr-site-card[data-target="titanic"] .jr-card-count')).toHaveText(
      // The bow, plus the site-level overview that opens with any scan there.
      '2 of 8 entries logged',
    );
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
    await ready(page);
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
