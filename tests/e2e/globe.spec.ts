import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * C1 globe mission select (docs/globe.md) and the field guide SPECIES tab:
 *  (a) `?globe=1` opens the globe with a loaded texture and pins; content
 *      packs with a mission.json are mission pins; the game is frozen and
 *      keys do not reach it; retired O/N shortcuts do nothing; Tab focuses a
 *      pin; Escape closes and the sub moves again.
 *  (b) Enter on the Titanic pin navigates to `?mission=titanic`.
 *  (c) axe finds no violations in the open overlay.
 *  (d) J opens the field guide; the SPECIES tab lists the fixture's rows and
 *      the "placement is invented" disclaimer.
 */

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
}

interface GlobeProbe {
  isOpen: boolean;
  textureReady: boolean;
  pinCount: number;
}

async function globeReady(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const g = (window.__game as { globe: GlobeProbe }).globe;
      return g.isOpen && g.textureReady && g.pinCount > 0;
    },
    undefined,
    { timeout: 30_000 },
  );
}

async function globeOpen(page: Page): Promise<boolean> {
  return page.evaluate(() => (window.__game as { globe: GlobeProbe }).globe.isOpen);
}

async function subPos(page: Page): Promise<number[]> {
  return page.evaluate(() => {
    const p = (window.__game as { sub: { position: { x: number; y: number; z: number } } }).sub
      .position;
    return [p.x, p.y, p.z];
  });
}

async function holdForward(page: Page, ms: number): Promise<void> {
  await page.keyboard.down('KeyW');
  await page.keyboard.down('ShiftLeft');
  await page.waitForTimeout(ms);
  await page.keyboard.up('ShiftLeft');
  await page.keyboard.up('KeyW');
}

/** Tab until the pin for `id` has focus (pins are the first focusables). */
async function tabToPin(page: Page, id: string): Promise<void> {
  for (let i = 0; i < 120; i++) {
    await page.keyboard.press('Tab');
    const at = await page.evaluate(
      () => (document.activeElement as HTMLElement | null)?.dataset?.landmark,
    );
    if (at === id) return;
  }
  throw new Error(`Tab never reached the ${id} pin`);
}

test.describe('globe mission select', () => {
  test('opens, freezes the game, pins, Tab and Escape; screenshot', async ({ page }) => {
    const errors = collectErrors(page);
    await boot(page, '/?tile=titanic&globe=1');
    await globeReady(page);
    await expect(page.locator('.globe:not(.is-embedded)')).toBeVisible();

    // Content packs with a mission.json are launchable mission pins.
    for (const id of ['titanic', 'lost-city', 'monterey-canyon']) {
      await expect(
        page.locator(`.globe:not(.is-embedded) .globe-pin[data-landmark="${id}"]`),
      ).toHaveAttribute('data-state', 'mission');
    }
    // A listed landmark whose content pack has not landed yet is a free-dive
    // pin and a "content coming" row. Which one that is changes as packs land,
    // so pick it from the list instead of hard-coding an id.
    const pending = await page
      .locator('.mission-item.is-pending[data-pending]')
      .first()
      .getAttribute('data-pending', { timeout: 5_000 })
      .catch(() => null);
    if (pending) {
      await expect(
        page.locator(`.globe:not(.is-embedded) .globe-pin[data-landmark="${pending}"]`),
      ).toHaveAttribute('data-state', 'tile');
    }
    await expect(
      page.locator('.globe:not(.is-embedded) .globe-pin[data-state="catalogue"]').first(),
    ).toBeAttached();

    // Frozen, and keys never reach the game.
    const before = await subPos(page);
    await holdForward(page, 1000);
    expect(await subPos(page)).toEqual(before);

    // Settings must not open over the globe.
    await page.keyboard.press('KeyO');
    expect(
      await page.evaluate(
        () => (window.__game as { settings: { isOpen: boolean } }).settings.isOpen,
      ),
    ).toBe(false);
    expect(await globeOpen(page)).toBe(true);

    // Tab lands on a pin and shows its card.
    await page.keyboard.press('Tab');
    await expect(page.locator('.globe:not(.is-embedded) .globe-pin:focus')).toHaveCount(1);
    await expect(page.locator('.globe:not(.is-embedded) .globe-card')).toBeVisible();

    await page.waitForTimeout(1500); // let the camera ease to the focused pin
    await page.screenshot({ path: 'tests/e2e/screenshots/globe.png' });

    await page.keyboard.press('Escape');
    expect(await globeOpen(page)).toBe(false);
    await expect(page.locator('.globe:not(.is-embedded)')).toBeHidden();
    const closed = await subPos(page);
    await holdForward(page, 1000);
    const moved = await subPos(page);
    expect(
      Math.hypot(moved[0] - closed[0], moved[1] - closed[1], moved[2] - closed[2]),
    ).toBeGreaterThan(0.1);

    await page.keyboard.press('KeyN');
    await expect.poll(() => globeOpen(page)).toBe(false);
    await page.keyboard.press('Escape');
    await page.locator('.pause-menu').getByRole('button', { name: 'Mission select' }).click();
    await expect(
      page.locator('.pause-sites-scroll .mission-item.is-mission').first(),
    ).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('Enter on the Titanic pin starts the Titanic mission', async ({ page }) => {
    const errors = collectErrors(page);
    await boot(page, '/?tile=lost-city&globe=1');
    await globeReady(page);
    await tabToPin(page, 'titanic');
    await expect(page.locator('.globe:not(.is-embedded) .globe-card')).toContainText('MISSION');
    await Promise.all([page.waitForURL(/[?&]mission=titanic\b/), page.keyboard.press('Enter')]);
    const url = new URL(page.url());
    expect(url.searchParams.get('mission')).toBe('titanic');
    expect(url.searchParams.get('globe')).toBeNull();
    expect(errors).toEqual([]);
  });

  test('axe finds no violations on the open globe', async ({ page }) => {
    await boot(page, '/?tile=titanic&globe=1');
    await globeReady(page);
    await page.keyboard.press('Tab'); // show the card as well
    await expect(page.locator('.globe:not(.is-embedded) .globe-card')).toBeVisible();
    const axe = await new AxeBuilder({ page }).include('.globe:not(.is-embedded)').analyze();
    expect(axe.violations.map((v) => `${v.id}: ${v.nodes.length} (${v.help})`)).toEqual([]);
  });
});

test('Journal lists the survey species with their OBIS sources', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page, '/?tile=titanic&landmark=_test');
  await page.keyboard.press('KeyJ');
  const journal = page.locator('.journal');
  await expect(journal).toBeVisible();
  // D-FLOW: no species is linked to a scanned POI yet, so they are spoilers.
  await expect(journal.locator('.jr-hidden-note')).toContainText('2 species not yet identified');
  await journal.locator('.jr-spoilers input').check();
  const rows = journal.locator('.jr-site-entries .jr-nav-item.is-species');
  await expect(rows).toHaveCount(2); // the row without a scientific name is dropped
  await rows.first().click();
  await expect(journal.locator('.jr-body .jr-title')).toHaveText('abyssal grenadier');
  await expect(journal.locator('.jr-latin i')).toHaveText('Coryphaenoides armatus');
  await expect(journal.locator('.jr-sources a').last()).toHaveAttribute('href', /api\.obis\.org/);
  expect(errors).toEqual([]);
});
