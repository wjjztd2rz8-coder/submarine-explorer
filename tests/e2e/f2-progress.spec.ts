import { homeReady } from './helpers/home.js';
import { clockFramesUntil, pauseClockBeforeNavigation } from './helpers/clock.js';
import { scanWithKeyboard } from './helpers/scan.js';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { scanAim } from './helpers/scanAim.js';

const shots = '.cache/codex/shots/f2-progress';
// Reward, persistence and focus guards need presented frames, not a continuous
// software-GL loop between every Journal action. Phone coverage sets its own viewport.
test.use({ viewport: { width: 960, height: 600 } });
test.describe.configure({ timeout: 120_000 });
test.beforeEach(async ({ page }) => pauseClockBeforeNavigation(page));

async function ready(page: Page): Promise<void> {
  await clockFramesUntil(
    page,
    () =>
      window.__gameReady === true &&
      (window.__game as { discovery: { loaded: boolean } }).discovery.loaded,
  );
}
async function realistic(page: Page): Promise<void> {
  await page.addInitScript(() =>
    localStorage.setItem(
      'subexplorer.settings.v3',
      JSON.stringify({ version: 2, gameplayMode: 'realistic', graphicsTier: 'low' }),
    ),
  );
}
async function shot(page: Page, name: string): Promise<void> {
  await mkdir(shots, { recursive: true });
  await page.screenshot({ path: `${shots}/${name}.png` });
}
async function scan(page: Page, id: string): Promise<void> {
  const pose = await page.evaluate((poi) => {
    const g = window.__game as {
      discovery: {
        spawnPose(id: string): { x: number; y: number; z: number; yaw: number };
        stats: { markTeleport(): void };
        pois: Array<{ id: string; position: { x: number; y: number; z: number } }>;
      };
      sub: {
        reset(x: number, y: number, z: number, yaw: number): void;
        position: unknown;
        yaw: number;
        pitch: number;
      };
      config: { submarine: { maxPitch: number } };
    };
    const p = g.discovery.spawnPose(poi);
    g.sub.reset(p.x, p.y, p.z, p.yaw);
    g.discovery.stats.markTeleport();
    const target = g.discovery.pois.find((target) => target.id === poi);
    if (!target) throw new Error(`Missing scan target: ${poi}`);
    return { from: p, target: target.position, maxPitch: g.config.submarine.maxPitch };
  }, id);
  // The safe spawn can be tens of metres above a contact on a slope. Aim in 3D
  // so a held scan keeps this target inside the cone throughout its beam time.
  const aim = scanAim(pose.from, pose.target, pose.maxPitch);
  await page.evaluate(({ yaw, pitch }) => {
    const g = window.__game as {
      sub: { yaw: number; pitch: number; position: unknown };
      scanner: { cancel(): void };
      rig: { snap(position: unknown, yaw: number, pitch: number): void };
    };
    g.scanner.cancel();
    g.sub.yaw = yaw;
    g.sub.pitch = pitch;
    g.rig.snap(g.sub.position, yaw, pitch);
  }, aim);
  await expect
    .poll(
      async () => {
        await page.clock.fastForward(50);
        return page.evaluate(
          (poi) =>
            (window.__game as { scanner: { view: { candidateId: string } } }).scanner.view
              .candidateId === poi,
          id,
        );
      },
      { timeout: 10_000, intervals: [20] },
    )
    .toBe(true);
  await scanWithKeyboard(page, id);
  expect(
    await page.evaluate(
      (poi) =>
        (
          window.__game as { discoveries: { isDiscovered(site: string, poi: string): boolean } }
        ).discoveries.isDiscovered('blake-plateau-corals', poi),
      id,
    ),
  ).toBe(true);
}

// Guards duplicate discoveries, cosmetic persistence and loss of star/debrief credit after the reward cut.
test('discoveries unlock Your sub cosmetics; photo bonus and best stars survive reload', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await realistic(page);
  await page.goto('/?mission=blake-plateau-corals&skipBriefing=1');
  await ready(page);
  for (const id of [
    'blake-mound-field-core',
    'blake-coral-thicket',
    'blake-second-mound',
    'blake-inter-mound-channel',
  ])
    await scan(page, id);
  await page.keyboard.press('Escape');
  await page.clock.fastForward(50);
  await expect(
    page.locator('.pause-actions').getByRole('button', { name: 'Upgrades', exact: true }),
  ).toHaveCount(0);
  await page
    .locator('.pause-actions')
    .getByRole('button', { name: 'Your sub', exact: true })
    .click();
  const sub = page.locator('.sub-screen');
  await expect(sub).toBeVisible();
  await sub.getByRole('button', { name: 'Red', exact: true }).click();
  await sub
    .getByRole('group', { name: 'Photo frame' })
    .getByRole('button', { name: 'White' })
    .focus();
  await page.keyboard.press('Enter');
  await expect(sub.getByRole('button', { name: 'Red', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(sub.getByRole('button', { name: 'White', exact: true }).last()).toBeFocused();
  const held = await page.evaluate(
    () => (window.__game as { sub: { position: { y: number } } }).sub.position.y,
  );
  // Keep the full freeze interval: every scheduled frame must leave the sub still.
  await page.clock.runFor(400);
  expect(
    await page.evaluate(
      () => (window.__game as { sub: { position: { y: number } } }).sub.position.y,
    ),
  ).toBe(held);
  await page.keyboard.press('Escape');
  await page.clock.fastForward(50);
  await expect(sub).toBeHidden();
  await expect(page.locator('.pause-menu')).toBeVisible();
  await page.locator('.pause-actions button', { hasText: /^Resume$/ }).click();
  await page.keyboard.press('p');
  await page.clock.fastForward(50);
  await expect(page.locator('.photo-mode')).toBeVisible();
  await page.locator('.photo-mode-capture').click();
  await clockFramesUntil(
    page,
    () => (window.__game as { progress: { bonus: boolean } }).progress.bonus,
  );
  await page.keyboard.press('p');
  await page.clock.fastForward(50);
  await expect(page.locator('.photo-mode')).toBeHidden();
  await page.keyboard.press('Escape');
  await page.clock.fastForward(50);
  await expect(page.locator('.pause-menu')).toBeVisible();
  await page.locator('.pause-surface').click();
  const debrief = page.locator('.mission-debrief');
  await expect(debrief).toBeVisible();
  await expect(debrief.locator('.debrief-stars')).toHaveAttribute('aria-label', '3 of 3 stars');
  await expect(debrief).not.toContainText('research points');
  await shot(page, 'debrief');
  await debrief.locator('[data-action="dive-sites"]').click();
  await homeReady(page, true);
  const sites = page.locator('.home-sites');
  await expect(sites.locator('[data-mission="blake-plateau-corals"] .mission-stars')).toHaveText(
    '★★★',
  );
  await expect(sites.locator('[data-mission="titanic"]')).toBeEnabled();
  await expect(sites.locator('[data-mission="challenger-deep"]')).toBeEnabled();
  await expect(sites.locator('.mission-lock')).toHaveCount(0);
  await page.goto('/?mission=blake-plateau-corals&skipBriefing=1');
  await ready(page);
  expect(
    await page.evaluate(() => {
      const g = window.__game as {
        progress: { cosmetics: { paint: string; frame: string }; points: number };
        subMesh: {
          vehicle: { materials: { paintUniforms: { uHullBase: { value: { getHex(): number } } } } };
        };
      };
      return {
        cosmetics: g.progress.cosmetics,
        points: g.progress.points,
        color: g.subMesh.vehicle.materials.paintUniforms.uHullBase.value.getHex(),
      };
    }),
  ).toMatchObject({ cosmetics: { paint: 'red', frame: 'white' }, points: 0, color: 0xda655b });
  expect(errors).toEqual([]);
});

// Guards migrated grants showing as pressed swatches, locked choices staying disabled, phone-sized
// touch targets, no horizontal overflow, and the picker no longer living on the Journal front page.
for (const [width, height] of [
  [1280, 720],
  [390, 844],
  [844, 390],
])
  test(`Your sub shows migrated cosmetics with touch-sized swatches at ${width}x${height}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.addInitScript(() => {
      if (!localStorage.getItem('subexplorer.progress.v1'))
        localStorage.setItem(
          'subexplorer.progress.v1',
          JSON.stringify({
            version: 1,
            lifetime: 150,
            cosmetics: { paint: 'gold', trim: 'amber', decal: 'finder', frame: 'gold' },
          }),
        );
    });
    await page.goto('/');
    await homeReady(page, true);
    await page.locator('.home-menu').getByRole('button', { name: 'Journal', exact: true }).click();
    await expect(page.locator('.journal')).toBeVisible();
    await expect(page.locator('.journal [data-cosmetic]')).toHaveCount(0);
    await page.locator('.jr-close').click();
    await page.locator('.home-menu').getByRole('button', { name: 'Your sub', exact: true }).click();
    const sub = page.locator('.sub-screen');
    await expect(sub).toBeVisible();
    for (const [group, name] of [
      ['Sub paint', 'Gold'],
      ['Lamp trim', 'Amber'],
      ['Sub decal', 'Finder'],
      ['Photo frame', 'Gold'],
    ])
      await expect(
        sub.getByRole('group', { name: group }).getByRole('button', { name, exact: true }),
      ).toHaveAttribute('aria-pressed', 'true');
    await expect(sub.getByRole('button', { name: /^Silver/ })).toBeDisabled();
    await expect(sub.locator('canvas')).toBeVisible();
    const boxes = await sub.locator('[data-cosmetic]').evaluateAll((els) =>
      els.map((e) => ({
        w: e.getBoundingClientRect().width,
        h: e.getBoundingClientRect().height,
      })),
    );
    expect(boxes.length).toBeGreaterThan(10);
    expect(boxes.every((b) => b.w >= 44 && b.h >= 44)).toBe(true);
    expect(await sub.locator('.ss-panel').evaluate((p) => p.scrollWidth <= p.clientWidth)).toBe(
      true,
    );
    if (width === 390) {
      // Portrait phone: paint, trim, decal and frame plus the preview fit without scrolling.
      const inView = await sub
        .locator('.ss-group, .ss-stage')
        .evaluateAll((els) =>
          els
            .map((e) => e.getBoundingClientRect())
            .map((r) => r.top >= 0 && r.bottom <= innerHeight),
        );
      expect(inView).toHaveLength(5);
      expect(inView.every(Boolean)).toBe(true);
    }
    await page.clock.runFor(500); // The preview draws on animation frames.
    await page.screenshot({
      path: `.cache/codex/shots/P2-sub-screen-portrait/sub-${width}x${height}.png`,
    });
    await page.keyboard.press('Escape');
    await expect(sub).toBeHidden();
    await expect(page.locator('.home-menu')).toBeVisible();
  });

test('all downloaded missions stay open in Realistic', async ({ page }) => {
  await realistic(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await homeReady(page, true);
  await page.locator('.home-menu').getByRole('button', { name: 'Dive sites', exact: true }).click();
  await expect(page.locator('.home-sites .is-mission:not(:disabled)')).toHaveCount(13);
  await expect(page.locator('.upgrades')).toHaveCount(0);
});

// Guards direct deep mission links retaining the mission and a pressure-safe full-depth hull.
test('a fresh Realistic Challenger mission fits Class C without research', async ({ page }) => {
  await realistic(page);
  await page.goto('/?mission=challenger-deep');
  await ready(page);
  await expect(page.locator('.progress-hull-notice')).toHaveCount(0);
  const state = await page.evaluate(() => {
    const g = window.__game as {
      sub: { getState(): { hullClass: string; ratedDepth: number } };
      mission: unknown;
    };
    return { hull: g.sub.getState(), mission: Boolean(g.mission) };
  });
  expect(state.hull.hullClass).toBe('C');
  expect(state.hull.ratedDepth).toBe(-11000);
  expect(state.mission).toBe(true);
});

test('old discoveries are credited before fitting a deep-mission vehicle', async ({ page }) => {
  const discovered = Object.fromEntries(
    [
      'great-blue-hole/great-blue-hole-outer-dropoff',
      'great-blue-hole/great-blue-hole-western-dropoff',
      'hunga-tonga-caldera/hunga-tonga-caldera-floor',
      'hunga-tonga-caldera/hunga-tonga-rim-wall',
      'blake-plateau-corals/blake-mound-field-core',
      'blake-plateau-corals/blake-coral-thicket',
      'blake-plateau-corals/blake-second-mound',
      'blake-plateau-corals/blake-inter-mound-channel',
    ].map((key) => [key, { at: '2026-09-01T00:00:00Z', count: 1 }]),
  );
  const old = JSON.stringify({ version: 1, discovered, stats: { scans: 8 } });
  await page.addInitScript(
    (value) => localStorage.setItem('subexplorer.discoveries.v1', value),
    old,
  );
  await page.goto('/?mission=titanic&skipBriefing=1&tier=low');
  await ready(page);
  const result = await page.evaluate(() => {
    const g = window.__game as {
      progress: { lifetime: number };
      subMesh: { hullClass: string };
      mission: { objectives: { complete: boolean }[] };
    };
    return {
      lifetime: g.progress.lifetime,
      vehicle: g.subMesh.hullClass,
      completed: g.mission.objectives.filter((o) => o.complete).length,
    };
  });
  expect(result).toEqual({ lifetime: 0, vehicle: 'B', completed: 0 });
  expect(await page.evaluate(() => localStorage.getItem('subexplorer.discoveries.v1'))).toBe(old);
});

test('species discovery credits once without research or full-depth access changes', async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('subexplorer.progress.v1'))
      localStorage.setItem(
        'subexplorer.progress.v1',
        JSON.stringify({ version: 1, points: 0, lifetime: 899 }),
      );
  });
  await page.goto('/');
  await homeReady(page, true);
  const earned = await page.evaluate(() => {
    const progress = (
      window.__game as { progress: { award(kind: string, id: string): number; lifetime: number } }
    ).progress;
    return {
      first: progress.award('species', 'dumbo-octopus'),
      repeat: progress.award('species', 'dumbo-octopus'),
      lifetime: progress.lifetime,
    };
  });
  expect(earned).toEqual({ first: 1, repeat: 0, lifetime: 899 });
  await page.goto('/?mission=challenger-deep&skipBriefing=1&tier=low');
  await ready(page);
  expect(
    await page.evaluate(
      () => (window.__game as { subMesh: { hullClass: string } }).subMesh.hullClass,
    ),
  ).toBe('C');
  await expect(page.locator('.progress-hull-notice')).toHaveCount(0);
});
