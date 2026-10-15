import { expect, test, type Page } from './helpers/unlocked.js';

/**
 * Globe pins (docs/globe.md): every pin is drawn at its projected location (no
 * ring fan-out, no leader lines); the dot is small inside a padded hit area
 * (44 px on touch); overlapping playable pins merge into one counted cluster
 * that zooms in or, at full zoom, opens a chooser; catalogue sites are faint
 * non-pointer specks; the focused pin shows a name label.
 */

interface HomeGlobe {
  textureReady: boolean;
  pinCount: number;
  orbit: { distance: number; minDistance: number };
  opts: { config: { pinHitPx: number; pinHitTouchPx: number } };
}

async function openHomeGlobe(page: Page): Promise<void> {
  await page.goto('/?tier=low', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
  await page.locator('.home-menu').getByRole('button', { name: 'Dive sites', exact: true }).click();
  await page.waitForFunction(() => {
    const g = (window.__game as { homeGlobe: HomeGlobe }).homeGlobe;
    return g.textureReady && g.pinCount > 0;
  });
}

const distance = (page: Page): Promise<number> =>
  page.evaluate(() => (window.__game as { homeGlobe: HomeGlobe }).homeGlobe.orbit.distance);

test.describe('globe pins', () => {
  test('pins sit on their location: no leaders, small dot, padded hit area, faint catalogue', async ({
    page,
  }) => {
    await openHomeGlobe(page);
    await expect(page.locator('.globe.is-embedded .globe-leaders')).toHaveCount(0);
    const dot = await page
      .locator('.globe.is-embedded .globe-pin.is-mission .globe-pin-dot')
      .first()
      .evaluate((n) => n.getBoundingClientRect().width);
    expect(dot).toBeGreaterThanOrEqual(10);
    expect(dot).toBeLessThanOrEqual(14);
    const hit = await page
      .locator('.globe.is-embedded .globe-pin.is-mission')
      .first()
      .evaluate((n) => n.getBoundingClientRect().width);
    expect(hit).toBeGreaterThanOrEqual(32);
    // The dot is centred in its button, i.e. exactly on the projected point.
    const off = await page
      .locator('.globe.is-embedded .globe-pin.is-mission')
      .first()
      .evaluate((n) => {
        const a = n.getBoundingClientRect();
        const b = n.querySelector('.globe-pin-dot')!.getBoundingClientRect();
        return Math.hypot(
          a.x + a.width / 2 - (b.x + b.width / 2),
          a.y + a.height / 2 - (b.y + b.height / 2),
        );
      });
    expect(off).toBeLessThan(1);
    const speck = page.locator('.globe.is-embedded .globe-pin.is-catalogue').first();
    await expect(speck).toHaveCSS('pointer-events', 'none');
  });

  test('a numbered cluster zooms in until its members separate', async ({ page }) => {
    await openHomeGlobe(page);
    const cluster = page.locator('.globe.is-embedded .globe-cluster:not([hidden])').first();
    await expect(cluster).toBeVisible();
    const count = Number(await cluster.locator('.globe-cluster-count').textContent());
    expect(count).toBeGreaterThanOrEqual(2);
    const ids = (await cluster.getAttribute('data-sites'))!.split(' ');
    expect(ids).toHaveLength(count);
    // Members are hidden while clustered.
    await expect(
      page.locator(`.globe.is-embedded .globe-pin[data-landmark="${ids[0]}"]`),
    ).toHaveClass(/is-clustered/);
    const before = await distance(page);
    await cluster.click();
    await expect.poll(() => distance(page), { timeout: 15_000 }).toBeLessThan(before * 0.8);
    await expect(
      page.locator(`.globe.is-embedded .globe-pin[data-landmark="${ids[0]}"]`),
    ).not.toHaveClass(/is-clustered/, { timeout: 15_000 });
  });

  test('Tab reaches a clustered member, shows it alone with its name label', async ({ page }) => {
    await openHomeGlobe(page);
    const cluster = page.locator('.globe.is-embedded .globe-cluster:not([hidden])').first();
    const id = (await cluster.getAttribute('data-sites'))!.split(' ')[0];
    const pin = page.locator(`.globe.is-embedded .globe-pin[data-landmark="${id}"]`);
    await pin.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await expect(pin).toBeFocused();
    await expect(pin).not.toHaveClass(/is-clustered/);
    await expect(pin.locator('.globe-pin-label')).toBeVisible();
  });

  test('at full zoom, a still-overlapping cluster opens a chooser of its sites', async ({
    page,
  }) => {
    await page.goto('/?tile=titanic&globe=1&tier=low', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
    await page.waitForFunction(() => (window.__game as { globe: HomeGlobe }).globe.pinCount > 0);
    // An absurd hit area makes every playable pin overlap even at full zoom.
    await page.evaluate(() => {
      const g = (window.__game as { globe: HomeGlobe }).globe;
      g.opts.config.pinHitPx = 4000;
      g.opts.config.pinHitTouchPx = 4000;
      g.orbit.distance = g.orbit.minDistance;
    });
    const cluster = page.locator('.globe:not(.is-embedded) .globe-cluster:not([hidden])').first();
    await expect(cluster).toBeVisible();
    await cluster.click();
    const chooser = page.locator('.globe:not(.is-embedded) .globe-chooser');
    await expect(chooser).toBeVisible();
    await expect(chooser.locator('.globe-chooser-item').first()).toBeFocused();
    expect(await chooser.locator('.globe-chooser-item').count()).toBeGreaterThanOrEqual(2);
    await page.keyboard.press('Escape');
    await expect(chooser).toBeHidden();
    await expect(page.locator('.globe:not(.is-embedded)')).toBeVisible();
  });
});

test.describe('globe pins on touch', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('hit areas are 44 px, the globe is wide, and the first tap names a pin', async ({
    page,
  }) => {
    await openHomeGlobe(page);
    const box = await page.locator('.globe.is-embedded .globe-canvas').boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(390 * 0.6);
    expect(box!.height).toBeGreaterThanOrEqual(220);
    const sizes = await page
      .locator('.globe.is-embedded .globe-pin:not(.is-catalogue)')
      .evaluateAll((pins) =>
        pins.map((p) => {
          const style = getComputedStyle(p);
          // Fractional translations can subtract to 43.999996 in DOMRect.
          // Measure the layout box and prove neither it nor its ancestors
          // shrink the hit area on screen.
          const transforms = [];
          for (let element: Element | null = p; element; element = element.parentElement) {
            const transform = new DOMMatrixReadOnly(getComputedStyle(element).transform);
            transforms.push([transform.a, transform.b, transform.c, transform.d]);
          }
          return {
            width: parseFloat(style.width),
            height: parseFloat(style.height),
            transforms,
          };
        }),
      );
    expect(sizes.length).toBeGreaterThan(0);
    for (const size of sizes) {
      expect(size.width).toBeGreaterThanOrEqual(44);
      expect(size.height).toBeGreaterThanOrEqual(44);
      for (const linear of size.transforms) expect(linear).toEqual([1, 0, 0, 1]);
    }
    // The sites list is a sheet over the globe: collapsed it keeps its rows out of reach, and the
    // grab bar opens it.
    await expect(page.locator('.home-sites [data-mission="titanic"]')).toBeHidden();
    await page.locator('.home-sites-grab').click();
    await expect(page.locator('.home-sites [data-mission="titanic"]')).toBeVisible();
    await page.locator('.home-sites-grab').click();

    const pin = page
      .locator('.globe.is-embedded .globe-pin:not(.is-clustered):not(.is-back):not(.is-catalogue)')
      .first();
    await pin.tap();
    await expect(pin).toHaveClass(/is-active/);
    await expect(pin.locator('.globe-pin-label')).toBeVisible();
    expect(new URL(page.url()).searchParams.get('mission')).toBeNull();
  });
});
