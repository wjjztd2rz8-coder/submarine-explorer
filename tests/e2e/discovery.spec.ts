import { advanceScan, completeScan } from './helpers/scan.js';
import { expect, test, type Page } from './helpers/unlocked.js';

/**
 * B1 discovery loop, end to end, against the `_test` fixture landmark on the
 * real Titanic tile: spawn next to a POI (`?poi=`), hold G until the scan
 * completes, check it persisted across a reload, open the Journal (J; it
 * replaced the field guide in D-FLOW), and screenshot the Journal and the
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

async function boot(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
  await page.waitForFunction(
    () => (window.__game as { discovery?: { loaded: boolean } } | undefined)?.discovery?.loaded,
    undefined,
    { timeout: 20_000 },
  );
}

test.describe('B1 scan, discovery, Journal', () => {
  test('scan the bow, persist across reload, open the Journal', async ({ page }) => {
    const errors = collectErrors(page);
    await boot(page, URL_SCAN);

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
    await expect(page.locator('.scan-panel .scan-hint')).toHaveText(/HOLD G TO SCAN/);

    // Record bus events from inside the page.
    await page.evaluate(() => {
      const w = window as unknown as { __b1: Array<{ name: string; payload: unknown }> };
      w.__b1 = [];
      const bus = (window.__game as { bus: { on(n: string, h: (p: unknown) => void): void } }).bus;
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
    await expect(page.locator('.scan-panel .scan-kicker')).toHaveText('SCANNING');
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

    await expect(page.locator('.scan-panel .scan-kicker')).toHaveText('NEW ENTRY');
    await expect(page.locator('.scan-panel .scan-name')).toHaveText('The bow section');
    await page.screenshot({ path: 'tests/e2e/screenshots/discovery-scan.png' });

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
    await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
    await page.waitForFunction(
      () => (window.__game as { discovery?: { loaded: boolean } } | undefined)?.discovery?.loaded,
    );
    expect((await probe(page)).discovered).toBe(true);

    // --- Journal (J) --------------------------------------------------------
    const journal = page.locator('.journal');
    await expect(journal).toBeHidden();
    await page.keyboard.press('j');
    await expect(journal).toBeVisible();
    // The dive's own site opens first: its overview and the bow are logged.
    await expect(journal.locator('.jr-nav-item[data-target="_test"] .jr-nav-meta')).toHaveText(
      'THIS DIVE · 2/3',
    );
    await expect(journal.locator('.jr-body .jr-title')).toHaveText('Test site · Titanic tile');
    // The debris entry is still locked; the bow is unlocked.
    // It collapses into one quiet count row rather than a locked list item.
    await expect(journal.locator('.jr-site-entries li.is-locked')).toHaveCount(0);
    await expect(journal.locator('.jr-site-entries .jr-more-to-find')).toHaveText('1 more to find');
    await journal.locator('.jr-nav-item[data-target="_test/poi/bow"]').click();
    await expect(journal.locator('.jr-body .jr-title')).toHaveText('The bow section');
    await expect(journal.locator('.jr-tag.is-recreation')).toHaveText('Recreation');
    await expect(journal.locator('.jr-memorial')).toBeVisible();
    await expect(journal.locator('.jr-facts tr')).toHaveCount(3);
    await expect(journal.locator('.jr-sources a')).toHaveCount(1);
    // Scanning is suppressed while the Journal is open.
    expect(
      await page.evaluate(
        () => (window.__game as { scanner: { enabled: boolean } }).scanner.enabled,
      ),
    ).toBe(false);
    await page.screenshot({ path: 'tests/e2e/screenshots/discovery-guide.png' });

    await page.keyboard.press('Escape');
    await expect(journal).toBeHidden();

    expect(errors, errors.join(' | ')).toEqual([]);
  });

  test('?debrief=1 opens the debrief after a few seconds', async ({ page }) => {
    const errors = collectErrors(page);
    await boot(page, '/?tile=titanic&landmark=_test&debrief=1');
    const debrief = page.locator('.debrief');
    await expect(debrief).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.debrief-title')).toHaveText('Dive debrief');
    await expect(page.locator('.debrief-stat[data-field="maxDepth"] .debrief-value')).toHaveText(
      /\d[\d,]* m/,
    );
    await expect(page.locator('.debrief-btn')).toHaveText(['Dive again', 'Journal']);
    await page.screenshot({ path: 'tests/e2e/screenshots/discovery-debrief.png' });

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
