import type { WebGLRenderer } from 'three';
import { expect, test, type Page } from './helpers/unlocked.js';

type TitleStats = {
  active: boolean;
  terrainReady: boolean;
  animated: boolean;
  drawCount: number;
  calls: number;
  triangles: number;
};

async function title(page: Page): Promise<TitleStats> {
  return page.evaluate(() => (window.__game as { titleScene: TitleStats }).titleScene);
}

async function boot(page: Page, url = '/?tier=low'): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
}

async function presented(page: Page): Promise<void> {
  await expect.poll(async () => (await title(page)).active).toBe(true);
  await expect.poll(async () => (await title(page)).drawCount).toBeGreaterThan(0);
}

async function stopped(page: Page): Promise<void> {
  // Allow any pending resize/asset presentation to settle, then observe multiple frames.
  await page.waitForTimeout(250);
  const before = (await title(page)).drawCount;
  await page.waitForTimeout(500);
  expect((await title(page)).drawCount).toBe(before);
}

async function expectMobileRegions(
  page: Page,
  viewport: { width: number; height: number },
): Promise<void> {
  const regions = await page
    .locator('.home-copy, .home-body, .home-scene-plate')
    .evaluateAll((elements) => {
      const rect = (element: Element) => {
        const r = element.getBoundingClientRect();
        return { x: r.x, y: r.y, right: r.right, bottom: r.bottom };
      };
      return elements.map((element) => {
        const content = rect(element);
        const visible = { ...content };
        const scrollports = [];
        // Under 600px, the whole home panel scrolls; taller layouts scroll the
        // menu body. Clip only to real scrolling ancestors, never the viewport
        // or home shell: an element overflowing without a scroller must fail.
        for (
          let parent = element.parentElement;
          parent && !parent.classList.contains('home-screen');
          parent = parent.parentElement
        ) {
          const style = getComputedStyle(parent);
          if (style.display !== 'contents' && /^(auto|scroll)$/.test(style.overflowY)) {
            const scrollport = rect(parent);
            scrollports.push(scrollport);
            visible.y = Math.max(visible.y, scrollport.y);
            visible.bottom = Math.min(visible.bottom, scrollport.bottom);
          }
        }
        return { name: element.className, content, visible, scrollports };
      });
    });
  for (const region of regions) {
    // Horizontal overflow is never allowed, including in offscreen content.
    expect(region.content.x, region.name).toBeGreaterThanOrEqual(0);
    expect(region.content.right, region.name).toBeLessThanOrEqual(viewport.width);
    for (const box of region.scrollports) {
      expect(box.x, `${region.name} scroller`).toBeGreaterThanOrEqual(0);
      expect(box.right, `${region.name} scroller`).toBeLessThanOrEqual(viewport.width);
      expect(box.y, `${region.name} scroller`).toBeGreaterThanOrEqual(0);
      expect(box.bottom, `${region.name} scroller`).toBeLessThanOrEqual(viewport.height);
    }
  }
  const visible = regions.filter(({ visible: box }) => box.bottom > box.y);
  for (let i = 0; i < visible.length; i++) {
    const { name, visible: a } = visible[i];
    expect(a.y, name).toBeGreaterThanOrEqual(0);
    expect(a.bottom, name).toBeLessThanOrEqual(viewport.height);
    for (const { name: other, visible: b } of visible.slice(i + 1)) {
      expect(
        a.x < b.right && b.x < a.right && a.y < b.bottom && b.y < a.bottom,
        `${name} overlaps ${other}`,
      ).toBe(false);
    }
  }
}

for (const tier of ['low', 'high'] as const) {
  test(`home presents the shared title canvas within ${tier} budgets`, async ({
    page,
  }, testInfo) => {
    await boot(page, `/?tier=${tier}`);
    await presented(page);
    await expect(page).toHaveTitle('Bathyline');
    await expect(page.locator('.home-screen')).toHaveClass(/has-title-scene/);
    await expect(page.locator('#viewport')).toBeVisible();
    await expect(page.locator('.globe.is-embedded')).toBeHidden();
    await expect.poll(async () => (await title(page)).terrainReady).toBe(true);
    await expect(page.locator('.home-scene-caption')).toHaveText(
      'Monterey Canyon · Real GMRT bathymetry',
    );
    await expect.poll(async () => (await title(page)).animated).toBe(true);
    const before = (await title(page)).drawCount;
    await expect.poll(async () => (await title(page)).drawCount).toBeGreaterThan(before);
    const stats = await title(page);
    expect(stats.calls).toBeGreaterThan(0);
    expect(stats.calls).toBeLessThanOrEqual(tier === 'low' ? 35 : 60);
    expect(stats.triangles).toBeGreaterThan(0);
    expect(stats.triangles).toBeLessThanOrEqual(tier === 'low' ? 100_000 : 200_000);
    expect(await page.locator('#viewport').count()).toBe(1);
    await page.screenshot({ path: testInfo.outputPath(`home-${tier}.png`) });
  });
}

for (const name of ['Dive sites', 'Free dive'] as const) {
  for (const exit of ['Back', 'Escape'] as const) {
    test(`${name} hands off to the globe; ${exit} restores title and focus`, async ({ page }) => {
      await boot(page);
      await presented(page);
      const origin = page.locator('.home-menu').getByRole('button', { name, exact: true });
      await origin.click();
      await expect(page.locator('.home-sites h2')).toHaveText(name);
      await expect(page.locator('.globe.is-embedded')).toBeVisible();
      await expect.poll(async () => (await title(page)).active).toBe(false);
      await stopped(page);
      if (name === 'Free dive') {
        await expect(page.locator('.home-sites .mission-select')).toHaveClass(/is-free-dive/);
        await expect(page.locator('.home-sites [data-tile="titanic"]')).toBeVisible();
        await expect(page.locator('.home-sites [data-mission="titanic"]')).toBeHidden();
      }
      for (const key of ['Tab', 'Shift+Tab']) {
        await page.keyboard.press(key);
        expect(
          await page.evaluate(() => {
            const focused = document.activeElement;
            return (
              focused !== null &&
              focused.closest('.home-sites, .globe.is-embedded') !== null &&
              focused.getClientRects().length > 0
            );
          }),
        ).toBe(true);
      }
      const before = (await title(page)).drawCount;
      if (exit === 'Back') await page.getByRole('button', { name: 'Back to menu' }).click();
      else await page.keyboard.press('Escape');
      await expect(page.locator('.home-sites')).toBeHidden();
      await expect(page.locator('.globe.is-embedded')).toBeHidden();
      await expect(origin).toBeFocused();
      await expect.poll(async () => (await title(page)).active).toBe(true);
      await expect.poll(async () => (await title(page)).drawCount).toBeGreaterThan(before);
    });
  }
}

test('Free dive launches a tile route and leaves the title inactive', async ({ page }) => {
  await boot(page);
  await page.locator('.home-menu').getByRole('button', { name: 'Free dive', exact: true }).click();
  await Promise.all([
    page.waitForURL(/[?&]tile=titanic\b/),
    page.locator('.home-sites [data-tile="titanic"]').click(),
  ]);
  await page.waitForFunction(() => window.__gameReady === true);
  expect(new URL(page.url()).searchParams.has('mission')).toBe(false);
  await expect(page.locator('.home-screen')).toBeHidden();
  await expect(page.locator('.globe.is-embedded')).toBeHidden();
  expect((await title(page)).active).toBe(false);
  expect((await title(page)).drawCount).toBe(0);
});

for (const preference of ['OS', 'saved'] as const) {
  test(`${preference} reduced motion presents a static title and redraws on resize`, async ({
    page,
  }) => {
    if (preference === 'OS') await page.emulateMedia({ reducedMotion: 'reduce' });
    else
      await page.addInitScript(() => {
        localStorage.setItem(
          'subexplorer.settings.v2',
          JSON.stringify({ version: 2, reduceMotion: true }),
        );
      });
    await boot(page);
    await presented(page);
    await expect.poll(async () => (await title(page)).terrainReady).toBe(true);
    await expect.poll(async () => (await title(page)).animated).toBe(false);
    await stopped(page);
    await page.evaluate(() => {
      const renderer = (window.__game as { renderer: WebGLRenderer }).renderer;
      const render = renderer.render;
      renderer.render = (scene, camera) => {
        // Observe the next title presentation without adding a production debug API.
        const probe = window as typeof window & { __titlePose?: () => number[] };
        probe.__titlePose = () => {
          const vehicle = scene.getObjectByName('vehicle-B')!.parent!;
          return [
            ...camera.position.toArray(),
            ...camera.quaternion.toArray(),
            ...vehicle.position.toArray(),
            ...vehicle.quaternion.toArray(),
            Number(scene.getObjectByName('titleSnow')!.visible),
          ];
        };
        renderer.render = render;
        render.call(renderer, scene, camera);
      };
    });
    const before = (await title(page)).drawCount;
    await page.setViewportSize({ width: 1100, height: 700 });
    await expect.poll(async () => (await title(page)).drawCount).toBeGreaterThan(before);
    const pose = () =>
      page.evaluate(() =>
        (window as typeof window & { __titlePose: () => number[] }).__titlePose(),
      );
    const staticPose = await pose();
    expect(staticPose.at(-1), 'reduced motion hides title snow').toBe(0);
    await stopped(page);
    expect(await pose(), 'title camera and vehicle transforms stay static').toEqual(staticPose);
    if (preference === 'OS') await page.emulateMedia({ reducedMotion: 'no-preference' });
    else {
      await page
        .locator('.home-menu')
        .getByRole('button', { name: 'Settings', exact: true })
        .click();
      await page
        .getByLabel('Reduce motion (no banking, particles or flashes)', { exact: true })
        .uncheck();
      await page.keyboard.press('Escape');
    }
    await expect.poll(async () => (await title(page)).animated).toBe(true);
    const resumed = (await title(page)).drawCount;
    await expect.poll(async () => (await title(page)).drawCount).toBeGreaterThan(resumed);
  });
}

test('covering home modals stop title draws and return to a usable menu', async ({ page }) => {
  await boot(page);
  await presented(page);
  for (const [name, selector] of [
    ['Settings', '.settings'],
    ['Journal', '.journal'],
    ['Controls', '.settings'],
    ['Upgrades', '.upgrades'],
  ]) {
    await page.locator('.home-menu').getByRole('button', { name, exact: true }).click();
    const dialog = page.locator(selector);
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAccessibleName(name);
    if (name === 'Controls') {
      await expect(dialog.getByRole('region', { name: 'Controls', exact: true })).toBeVisible();
      await expect(
        dialog.getByRole('button', { name: 'Back to Settings', exact: true }),
      ).toBeFocused();
    }
    await expect.poll(async () => (await title(page)).active).toBe(false);
    await stopped(page);
    const before = (await title(page)).drawCount;
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(
      page.locator('.home-menu').getByRole('button', { name, exact: true }),
    ).toBeFocused();
    await expect.poll(async () => (await title(page)).active).toBe(true);
    await expect.poll(async () => (await title(page)).drawCount).toBeGreaterThan(before);
  }
});

test('quit after a mission lazily presents home, keeps Continue and freezes the sub', async ({
  page,
}) => {
  await boot(page, '/?mission=titanic&skipBriefing=1&tier=low');
  await expect(page.locator('.home-screen')).toBeHidden();
  expect((await title(page)).drawCount).toBe(0);
  await page.keyboard.press('Escape');
  await page.locator('.pause-menu').getByRole('button', { name: 'Quit to home' }).click();
  await expect(page.locator('.home-screen')).toBeVisible();
  await presented(page);
  await expect(page.locator('.globe.is-embedded')).toBeHidden();
  const resume = page.locator('.home-menu').getByRole('button', { name: 'Continue', exact: true });
  await expect(resume).toBeEnabled();
  await expect(resume).toBeFocused();
  // Shell navigation strips dive/debug params but preserves device preferences.
  expect(new URL(page.url()).pathname).toBe('/');
  expect(Object.fromEntries(new URL(page.url()).searchParams)).toEqual({ tier: 'low' });
  const pose = () =>
    page.evaluate(() => {
      const p = (window.__game as { sub: { position: { x: number; y: number; z: number } } }).sub
        .position;
      return [p.x, p.y, p.z];
    });
  const before = await pose();
  await page.keyboard.down('w');
  await page.waitForTimeout(500);
  await page.keyboard.up('w');
  expect(await pose()).toEqual(before);
  await resume.click();
  await expect(page.locator('.home-screen')).toBeHidden();
  await expect(page.locator('.briefing')).toBeVisible();
  expect(Object.fromEntries(new URL(page.url()).searchParams)).toEqual({
    mission: 'titanic',
    tier: 'low',
  });
  await expect.poll(async () => (await title(page)).active).toBe(false);
});

test('optional title terrain and font failures leave an honest, usable fallback', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  let blocked = 0;
  await page.route('**/data/tiles/monterey-canyon/**', (route) => {
    blocked++;
    return route.abort();
  });
  let blockedFonts = 0;
  await page.route('**/fonts/*.woff2', (route) => {
    blockedFonts++;
    return route.abort();
  });
  await boot(page);
  await presented(page);
  await expect.poll(() => blocked).toBeGreaterThan(0);
  await expect.poll(() => blockedFonts).toBeGreaterThan(0);
  await page.waitForTimeout(500);
  await expect(page.locator('.home-scene-caption')).toHaveText('Expedition preview');
  expect((await title(page)).terrainReady).toBe(false);
  expect(await page.evaluate(() => window.__gameError)).toBeFalsy();
  await page.locator('.home-menu').getByRole('button', { name: 'Dive sites' }).click();
  await expect(page.locator('.home-sites [data-mission="titanic"]')).toBeVisible();
  expect(errors).toEqual([]);
});

for (const viewport of [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 667, height: 375 },
  { width: 844, height: 390 },
]) {
  test.describe(`title mobile ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport, hasTouch: true, isMobile: true });
    test('scene plate, copy, menu and selector remain separate and tappable', async ({
      page,
    }, testInfo) => {
      await boot(page);
      await presented(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await expectMobileRegions(page, viewport);
      await page.screenshot({ path: testInfo.outputPath('home-mobile.png') });
      for (const button of await page.locator('.home-menu button:visible').all()) {
        await button.scrollIntoViewIfNeeded();
        // Check both scrolling strategies as each action comes into view.
        await expectMobileRegions(page, viewport);
        const box = (await button.boundingBox())!;
        expect(box.width).toBeGreaterThanOrEqual(48);
        expect(box.height).toBeGreaterThanOrEqual(48);
        expect(
          await button.evaluate((el) => {
            const r = el.getBoundingClientRect();
            return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
          }),
        ).toBe(true);
      }
      await page.locator('.home-menu').getByRole('button', { name: 'Dive sites' }).tap();
      await expect(page.locator('.globe.is-embedded')).toBeVisible();
      await expect.poll(async () => (await title(page)).active).toBe(false);
      await page.screenshot({ path: testInfo.outputPath('sites-mobile.png') });
      await page.getByRole('button', { name: 'Back to menu' }).tap();
      await expect(page.locator('.globe.is-embedded')).toBeHidden();
      await presented(page);
    });
  });
}
