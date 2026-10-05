import { expect, test, type Locator, type Page } from '@playwright/test';
import type { PerfStats } from '../../src/app/systems/quality.js';
import type { Save } from '../../src/core/Save.js';
import type { Discovery } from '../../src/game/Discovery.js';
import type { CameraRig } from '../../src/sub/CameraRig.js';
import type { Submarine } from '../../src/sub/Submarine.js';
import type { Journal } from '../../src/ui/Journal.js';
import type { Props } from '../../src/world/Props.js';
import type { Terrain } from '../../src/world/Terrain.js';
import { waitForFrames } from './helpers/frames.js';
import { completeScan } from './helpers/scan.js';
import { scanAim } from './helpers/scanAim.js';

interface Game {
  sub: Submarine;
  rig: CameraRig;
  terrain: Terrain;
  props: Props;
  discovery: Discovery;
  journal: Journal;
  save: Save;
  perf: PerfStats;
  config: { submarine: { hullRadius: number; maxPitch: number } };
  explore: { ready: boolean };
  life: object | null;
}

async function ready(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const g = window.__game as unknown as Game | undefined;
    return window.__gameReady && g?.props.loaded && g.discovery.loaded && g.explore.ready && g.life;
  });
}

async function contained(target: Locator): Promise<void> {
  await expect(target).toBeVisible();
  expect(
    await target.evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
    `${target} clips horizontally`,
  ).toBe(true);
}

/** Keep the phone's primary input on touch while exercising the held scan control. */
async function scanWithTouch(page: Page, id: string): Promise<void> {
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
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await session.detach();
  }
  await expect(page.locator('.tc-btn-pause')).toBeVisible();
}

async function hudFits(page: Page, surface: boolean): Promise<void> {
  const selectors = [
    '.sonar',
    '.hud-readouts',
    '.hud-attribution',
    '.tc-stick',
    '.tc-slider',
    '.tc-buttons',
    '.tc-btn-pause',
  ];
  if (surface) selectors.push('.objectives-panel');
  if (await page.locator('.scan-panel').isVisible()) selectors.push('.scan-panel');
  for (const selector of selectors) await expect(page.locator(selector)).toBeVisible();
  const boxes = await page.evaluate(
    (selectors) =>
      selectors.map((selector) => ({
        selector,
        ...document.querySelector(selector)!.getBoundingClientRect().toJSON(),
      })),
    selectors,
  );
  const viewport = page.viewportSize()!;
  for (const box of boxes) {
    expect(box.left, box.selector).toBeGreaterThanOrEqual(-1);
    expect(box.top, box.selector).toBeGreaterThanOrEqual(-1);
    expect(box.right, box.selector).toBeLessThanOrEqual(viewport.width + 1);
    expect(box.bottom, box.selector).toBeLessThanOrEqual(viewport.height + 1);
  }
  for (let i = 0; i < boxes.length; i++)
    for (const b of boxes.slice(i + 1)) {
      const a = boxes[i];
      expect(
        a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom,
        `${a.selector} overlaps ${b.selector}`,
      ).toBe(false);
    }
}

/** Read the canvas capture alone so bright HUD labels cannot hide a black scene. */
async function sceneLuminance(page: Page, path: string): Promise<number> {
  const png = await page.locator('#viewport').screenshot({
    path,
    style: 'body > :not(#viewport) { visibility: hidden !important; }',
  });
  return page.evaluate(async (b64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${b64}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 100;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let luminance = 0;
    for (let i = 0; i < pixels.length; i += 4)
      luminance += 0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
    return luminance / (canvas.width * canvas.height);
  }, png.toString('base64'));
}

for (const viewport of [
  { width: 844, height: 390 },
  { width: 390, height: 844 },
]) {
  test.describe(`590 Blue Hole ${viewport.width}x${viewport.height}`, () => {
    test.use({
      viewport,
      hasTouch: true,
      isMobile: true,
      deviceScaleFactor: 1,
      storageState: { cookies: [], origins: [] },
      serviceWorkers: 'block',
    });
    for (const mode of ['arcade', 'realistic'] as const) {
      test(`${mode}: opening and Surface start remain clear`, async ({ page }, testInfo) => {
        test.setTimeout(180_000);
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(e.message));
        page.on('console', (e) => {
          if (e.type() === 'error') errors.push(e.text());
        });
        await page.addInitScript(
          (gameplayMode) =>
            localStorage.setItem(
              'subexplorer.settings.v2',
              JSON.stringify({ version: 2, gameplayMode }),
            ),
          mode,
        );
        await page.goto('/?tile=great-blue-hole&tier=low&dynres=0&tutorial=0&lifeSeed=42');
        await ready(page);
        const opening = await page.evaluate(async () => {
          const g = window.__game as unknown as Game;
          g.sub.step = () => {};
          for (let i = 0; i < 30; i++)
            await new Promise<void>((done) => requestAnimationFrame(() => done()));
          let draws = 0;
          let triangles = 0;
          for (let i = 0; i < 60; i++) {
            await new Promise<void>((done) => requestAnimationFrame(() => done()));
            draws = Math.max(draws, g.perf.drawCalls);
            triangles = Math.max(triangles, g.perf.triangles);
          }
          return {
            mode: g.save.get().gameplayMode,
            depth: -g.sub.position.y,
            altitude: g.sub.position.y - g.terrain.sampleHeight(g.sub.position.x, g.sub.position.z),
            radius: g.config.submarine.hullRadius,
            collision: g.props.collide(
              g.sub.position.clone(),
              g.config.submarine.hullRadius,
              g.sub.position.clone(),
            ),
            props: { ...g.props.stats },
            draws,
            triangles,
          };
        });
        expect(opening.mode).toBe(mode);
        expect(opening.depth).toBeGreaterThan(30);
        expect(opening.altitude).toBeGreaterThan(opening.radius);
        expect(opening.collision).toBe(false);
        expect(opening.props).toMatchObject({ count: 2, failed: 0, skipped: 0 });
        expect(opening.draws).toBeGreaterThan(0);
        expect(opening.draws).toBeLessThanOrEqual(1500);
        expect(opening.triangles).toBeGreaterThan(10_000);
        expect(opening.triangles).toBeLessThanOrEqual(1_500_000);
        await hudFits(page, false);
        expect(
          await sceneLuminance(page, testInfo.outputPath(`${mode}-opening-canvas.png`)),
        ).toBeGreaterThan(3);
        await page.screenshot({ path: testInfo.outputPath(`${mode}-opening.png`) });

        await page.goto('/?mission=great-blue-hole&tier=low&dynres=0&tutorial=0&lifeSeed=42');
        await ready(page);
        await page.locator('.briefing-start input[value="surface"]').check();
        await page.locator('.briefing-begin').tap();
        await expect(page.locator('.briefing')).toBeHidden();
        await waitForFrames(page, 2);
        const surface = await page.evaluate(() => {
          const g = window.__game as unknown as Game;
          return {
            y: g.sub.position.y,
            radius: g.config.submarine.hullRadius,
            start: g.save.get().gameplay.startPosition,
          };
        });
        expect(surface.start).toBe('surface');
        expect(surface.y).toBeGreaterThan(-20);
        expect(surface.y).toBeLessThanOrEqual(-surface.radius + 1);
        if (mode === 'realistic') {
          await expect(page.locator('.hud-power')).toBeVisible();
          await expect(page.locator('.hud-current')).toBeVisible();
          await contained(page.locator('.hud-readouts'));
        }
        await hudFits(page, true);
        expect(
          await sceneLuminance(page, testInfo.outputPath(`${mode}-surface-canvas.png`)),
        ).toBeGreaterThan(3);
        await page.screenshot({ path: testInfo.outputPath(`${mode}-surface.png`) });
        expect(errors).toEqual([]);
      });
    }
  });
}

test.describe('590 scanned portrait Journal/debrief', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 1,
    storageState: { cookies: [], origins: [] },
    serviceWorkers: 'block',
  });
  for (const site of [
    'titanic',
    'lost-city',
    'great-blue-hole',
    'beebe-vent-field',
    'monterey-canyon',
  ]) {
    test(`${site}: scanned header, facts and summary fit`, async ({ page }, testInfo) => {
      test.setTimeout(180_000);
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(`/?mission=${site}&skipBriefing=1&tier=low&tutorial=0&lifeSeed=42`);
      await ready(page);
      const entry = await page.evaluate(() => {
        const g = window.__game as unknown as Game;
        const poi = g.discovery.pois[0];
        const pose = g.discovery.spawnPose(poi.id)!;
        g.sub.reset(pose.x, pose.y, pose.z, pose.yaw);
        g.discovery.stats.markTeleport();
        return {
          id: poi.id,
          entry: poi.guideEntry,
          from: { x: pose.x, y: pose.y, z: pose.z },
          target: { x: poi.position.x, y: poi.position.y, z: poi.position.z },
          maxPitch: g.config.submarine.maxPitch,
        };
      });
      const aim = scanAim(entry.from, entry.target, entry.maxPitch);
      await page.evaluate(({ yaw, pitch }) => {
        const g = window.__game as unknown as Game;
        g.sub.yaw = yaw;
        g.sub.pitch = pitch;
        g.sub.step = () => {};
        g.rig.snap(g.sub.position, yaw, pitch);
      }, aim);
      await scanWithTouch(page, entry.id);
      await page.locator('.tc-btn-pause').tap();
      await page.locator('.pause-menu').getByRole('button', { name: 'Journal', exact: true }).tap();
      const journal = page.locator('.journal');
      await expect(journal).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => (window.__game as unknown as Game).journal.selectedId))
        .toBe(entry.entry);
      await expect(journal.locator('.jr-locked')).toHaveCount(0);
      await expect(journal.locator('.jr-facts')).toHaveCount(1);
      for (const selector of [
        '.jr-panel',
        '.jr-header',
        '.jr-heading',
        '.jr-crumb',
        '.jr-count',
        '.jr-nav',
        '.jr-body',
        '.jr-facts',
      ])
        await contained(journal.locator(selector));
      await journal.locator('.jr-facts').scrollIntoViewIfNeeded();
      for (const cell of await journal.locator('.jr-facts th, .jr-facts td').all())
        await contained(cell);
      await page.screenshot({ path: testInfo.outputPath(`${site}-journal-facts.png`) });
      await journal.locator('.jr-body').evaluate((e) => {
        e.scrollTop = e.scrollHeight;
      });
      await journal.locator('.jr-close').tap();
      await page.locator('.pause-surface').tap();
      const debrief = page.locator('.mission-debrief');
      await expect(debrief).toBeVisible();
      await expect(debrief.locator('[data-field="discoveries"] .debrief-value')).toHaveText('1');
      await contained(debrief.locator('.debrief-panel'));
      await page.screenshot({ path: testInfo.outputPath(`${site}-debrief.png`) });
      await debrief.locator('[data-action="journal"]').tap();
      await expect.poll(() => journal.locator('.jr-body').evaluate((e) => e.scrollTop)).toBe(0);
      await journal.locator('.jr-close').tap();
      await expect(debrief.locator('[data-action="journal"]')).toBeFocused();
      expect(errors).toEqual([]);
    });
  }
});
