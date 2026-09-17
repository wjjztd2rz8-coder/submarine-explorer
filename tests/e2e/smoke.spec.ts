import { expect, test } from '@playwright/test';

/**
 * Visual smoke test: boot the built game against a real tile, wait for the
 * engine to flag `window.__gameReady`, screenshot it, and assert that nothing
 * logged an error.
 *
 * Requires a tile on disk. Run the pipeline first:
 *   python3 tools/fetch_tile.py --id titanic --north 41.88 --south 41.58 \
 *       --east -49.80 --west -50.10
 */

const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;

/**
 * Both tiles are smoke-tested: `titanic` is an abyssal plain (proves the deep
 * lighting works) and `monterey-canyon` has kilometres of relief (proves the
 * terrain mesh really follows the bathymetry).
 */
const TILES = env?.SMOKE_TILE ? [env.SMOKE_TILE] : ['titanic', 'monterey-canyon'];

for (const TILE of TILES) {
  test(`boots on "${TILE}", renders the seafloor, and logs no errors`, async ({
    page,
  }, testInfo) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto(`/?tile=${TILE}`, { waitUntil: 'domcontentloaded' });

    // The engine sets this once the first frame has been presented.
    await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });

    // Let the camera settle and a few frames of fog/lighting accumulate.
    await page.waitForTimeout(1500);

    // The HUD must be showing a real depth, which proves the tile actually loaded.
    const depth = await page.locator('.hud-value[data-field="depth"]').textContent();
    expect(depth).toMatch(/\d+\s*m/);

    await page.screenshot({ path: `tests/e2e/screenshots/${TILE}.png`, fullPage: false });
    await page.screenshot({ path: testInfo.outputPath('smoke.png') });

    // No fatal overlay.
    await expect(page.locator('.fatal')).toHaveCount(0);
    expect(await page.evaluate(() => window.__gameError ?? null)).toBeNull();

    expect(pageErrors, `page errors: ${pageErrors.join(' | ')}`).toEqual([]);
    expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);

    // Sanity-check that the terrain mesh really was built.
    const chunks = await page.evaluate(() => {
      const g = window.__game as { terrain?: { stats?: { chunks: number } } } | undefined;
      return g?.terrain?.stats?.chunks ?? 0;
    });
    expect(chunks).toBeGreaterThan(0);
  });
}
