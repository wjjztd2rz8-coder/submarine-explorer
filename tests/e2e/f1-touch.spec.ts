import { completeScan } from './helpers/scan.js';
/**
 * F1-TOUCH: touch play on emulated phones and a tablet. Real touches go through
 * the CDP `Input.dispatchTouchEvent`, so the pointer events the controls listen
 * to are the ones a browser produces on a device.
 */
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';
import { devices, expect, test, type CDPSession, type Page } from './helpers/unlocked.js';

const shots = '.cache/codex/shots/f1-touch';
const diveUrl = '/?tile=titanic&landmark=_test&poi=test-bow&skipBriefing=1&touch=1';

// The device descriptors also name webkit; this project runs Chromium.
const { defaultBrowserType: _p, ...phoneLandscape } = devices['iPhone 13 landscape'];
const { defaultBrowserType: _q, ...phonePortrait } = devices['iPhone 13'];
const { defaultBrowserType: _t, ...tablet } = devices['iPad (gen 7) landscape'];

async function boot(page: Page, url = diveUrl): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
  await page.waitForFunction(
    () => {
      const g = window.__game as { discovery?: { loaded: boolean; spawnedAt: string | null } };
      return g.discovery?.loaded && g.discovery.spawnedAt;
    },
    undefined,
    { timeout: 20_000 },
  );
}

async function centre(page: Page, selector: string): Promise<{ x: number; y: number }> {
  const box = await page.locator(selector).boundingBox();
  if (!box) throw new Error(`no box for ${selector}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function touch(
  cdp: CDPSession,
  type: 'touchStart' | 'touchMove' | 'touchEnd',
  points: Array<{ x: number; y: number; id: number }>,
): Promise<void> {
  await cdp.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: type === 'touchEnd' ? [] : points,
  });
}

async function subPos(page: Page): Promise<[number, number, number]> {
  return page.evaluate(() => {
    const p = (window.__game as { sub: { position: { x: number; y: number; z: number } } }).sub
      .position;
    return [p.x, p.y, p.z] as [number, number, number];
  });
}

async function shot(page: Page, name: string): Promise<void> {
  await mkdir(shots, { recursive: true });
  await page.screenshot({ path: `${shots}/${name}.png` });
}

test.describe('phone landscape', () => {
  test.use({ ...phoneLandscape });

  test('stick moves the sub, scan holds, pause opens by touch', async ({ page }) => {
    const cdp = await page.context().newCDPSession(page);
    await boot(page);
    await expect(page.locator('.tc-root')).toBeVisible();
    await expect(page.locator('.tc-stick')).toBeVisible();
    await shot(page, 'phone-landscape');

    // Push the stick up (ahead): the sub travels.
    const before = await subPos(page);
    const s = await centre(page, '.tc-stick');
    await touch(cdp, 'touchStart', [{ x: s.x, y: s.y, id: 1 }]);
    await touch(cdp, 'touchMove', [{ x: s.x, y: s.y - 60, id: 1 }]);
    await page.waitForTimeout(1500);
    const axis = await page.evaluate(
      () =>
        (window.__game as { input: { touchAxes: { throttle: number } } }).input.touchAxes.throttle,
    );
    expect(axis).toBeGreaterThan(0.8);
    await touch(cdp, 'touchEnd', []);
    const after = await subPos(page);
    expect(Math.hypot(after[0] - before[0], after[2] - before[2])).toBeGreaterThan(0.2);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window.__game as { input: { touchAxes: { throttle: number } } }).input.touchAxes
              .throttle,
        ),
      )
      .toBe(0);

    // The ballast slider sinks the sub.
    const y0 = (await subPos(page))[1];
    const sl = await page.locator('.tc-slider').boundingBox();
    if (!sl) throw new Error('no slider');
    const sx = sl.x + sl.width / 2;
    await touch(cdp, 'touchStart', [{ x: sx, y: sl.y + sl.height * 0.5, id: 2 }]);
    await touch(cdp, 'touchMove', [{ x: sx, y: sl.y + sl.height * 0.95, id: 2 }]);
    await page.waitForTimeout(1500);
    await touch(cdp, 'touchEnd', []);
    expect(Math.abs((await subPos(page))[1] - y0)).toBeGreaterThan(0.05);

    // Hold Scan on the contact.
    const b = await centre(page, '.tc-btn-scan');
    await touch(cdp, 'touchStart', [{ x: b.x, y: b.y, id: 3 }]);
    await expect
      .poll(() =>
        page.evaluate(() =>
          (window.__game as { input: { touchHeld: Set<string> } }).input.touchHeld.has('scan'),
        ),
      )
      .toBe(true);
    await completeScan(page, 'test-bow');
    await touch(cdp, 'touchEnd', []);

    // Drag on the view to look; double-tap resets.
    await page.touchscreen.tap(400, 150);
    await page.touchscreen.tap(402, 152);

    // Pause by touch.
    await page.locator('.tc-btn-pause').tap();
    await expect(page.locator('.pause-menu')).toBeVisible();
    await expect(page.locator('.tc-root')).toBeHidden();
    await shot(page, 'phone-landscape-pause');
  });

  test('pointer look is hidden on touch and menu buttons are at least 44px', async ({ page }) => {
    await boot(page);
    await page.locator('.tc-btn-pause').tap();
    await expect(page.locator('.pause-menu')).toBeVisible();
    const heights = await page
      .locator('.pause-actions button')
      .evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
    expect(heights.length).toBeGreaterThan(0);
    for (const h of heights) expect(h).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.classList.contains('is-touch'))).toBe(
      true,
    );
    expect(
      await page.evaluate(
        () => getComputedStyle(document.querySelector('.settings-pointer-lock') as Element).display,
      ),
    ).toBe('none');
  });

  test('keyboard use hides the controls again', async ({ page }) => {
    await boot(page);
    await expect(page.locator('.tc-root')).toBeVisible();
    await page.keyboard.press('KeyW');
    await expect(page.locator('.tc-root')).toBeHidden();
  });
});

test.describe('phone portrait', () => {
  test.use({ ...phonePortrait });

  test('controls and the rotate hint show, play stays possible', async ({ page }) => {
    await boot(page);
    await expect(page.locator('.tc-stick')).toBeVisible();
    await expect(page.locator('.tc-rotate-hint')).toBeVisible();
    await shot(page, 'phone-portrait');
  });
});

test.describe('tablet', () => {
  test.use({ ...tablet });

  test('landscape tablet layout', async ({ page }) => {
    await boot(page);
    await expect(page.locator('.tc-stick')).toBeVisible();
    await expect(page.locator('.tc-rotate-hint')).toBeHidden();
    await shot(page, 'tablet-landscape');
  });
});

test.describe('quality on devices', () => {
  test('phone and tablet auto-detect low or medium, with dynamic resolution', async ({
    browser,
  }) => {
    for (const d of [phoneLandscape, tablet]) {
      const ctx = await browser.newContext({ ...d });
      const page = await ctx.newPage();
      await page.goto('/?tile=titanic&landmark=_test&skipBriefing=1&tier=auto', {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForFunction(() => window.__gameReady === true, undefined, {
        timeout: 45_000,
      });
      const perf = await page.evaluate(
        () => (window.__game as { perf: { tier: string; dynamicResolution: boolean } }).perf,
      );
      expect(['low', 'medium']).toContain(perf.tier);
      expect(perf.dynamicResolution).toBe(true);
      await ctx.close();
    }
  });
});

test.describe('pwa', () => {
  test('manifest is linked and the worker script is served', async ({ page, request }) => {
    await page.goto('/?tile=titanic&landmark=_test&skipBriefing=1');
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(href).toBeTruthy();
    const res = await request.get(new URL(href!, page.url()).href);
    const manifest = await res.json();
    expect(manifest.name).toBe('Bathyline');
    for (const icon of manifest.icons) {
      const r = await request.get(new URL(icon.src, new URL(href!, page.url())).href);
      expect(r.ok()).toBe(true);
    }
    const sw = await request.get(new URL('sw.js', page.url()).href);
    expect(await sw.text()).not.toContain('__SW_VERSION__');
    // Automation never registers it.
    expect(
      await page.evaluate(() => navigator.serviceWorker.getRegistrations().then((r) => r.length)),
    ).toBe(0);
  });
});
