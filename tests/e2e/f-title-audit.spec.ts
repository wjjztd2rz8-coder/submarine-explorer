import { expect, test } from './helpers/unlocked.js';
import { titleAudit } from './helpers/titleAudit.js';

titleAudit();

test.describe('title touch navigation', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test('Daily and selector actions work by tap; a CSS-hidden globe stops drawing', async ({
    page,
  }) => {
    await page.goto('/?tier=low', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__gameReady === true);
    await expect(page.locator('.daily-card')).toBeVisible();
    await page.locator('.home-menu').getByRole('button', { name: 'Free dive', exact: true }).tap();
    await expect(page.locator('.home-sites')).toBeVisible();
    await page.getByRole('button', { name: 'Back to menu' }).tap();
    await expect(
      page.locator('.home-menu').getByRole('button', { name: 'Free dive', exact: true }),
    ).toBeFocused();
    await page.locator('.home-menu').getByRole('button', { name: 'Dive sites', exact: true }).tap();
    await expect
      .poll(() => page.locator('.globe.is-embedded .globe-pin').count())
      .toBeGreaterThan(0);
    // Playable pins are at least 44 x 44 CSS px on touch; catalogue specks are not targets.
    await expect
      .poll(() =>
        page
          .locator('.globe.is-embedded .globe-pin:not(.is-catalogue)')
          .evaluateAll(
            (pins) =>
              pins.length > 0 &&
              pins.every(
                (pin) =>
                  parseFloat(getComputedStyle(pin).width) >= 44 &&
                  parseFloat(getComputedStyle(pin).height) >= 44,
              ),
          ),
      )
      .toBe(true);
    await page.setViewportSize({ width: 667, height: 320 });
    // The landscape picker now displays its globe. Exercise CSS hiding directly
    // so the renderer-stop guard survives layout changes.
    await expect(page.locator('.home-globe-slot')).toBeVisible();
    await page.addStyleTag({ content: '.home-globe-wrap { display: none !important; }' });
    await expect
      .poll(() =>
        page.evaluate(() => (window.__game as { homeGlobe: { isOpen: boolean } }).homeGlobe.isOpen),
      )
      .toBe(false);
    const site = page.locator('.home-sites [data-mission="titanic"]');
    await site.scrollIntoViewIfNeeded();
    await Promise.all([page.waitForURL(/[?&]mission=titanic\b/), site.tap()]);
    await page.waitForFunction(() => window.__gameReady === true);
    await expect(page.locator('.briefing')).toBeVisible();
  });
});
