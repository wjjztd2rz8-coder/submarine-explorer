// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { scanAim } from './helpers/scanAim.js';

const shots = '.cache/codex/shots/f2-progress';
async function ready(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__gameReady === true);
  await page.waitForFunction(
    () => (window.__game as { discovery: { loaded: boolean } }).discovery.loaded,
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
  await page.waitForFunction(
    (poi) =>
      (window.__game as { scanner: { view: { candidateId: string } } }).scanner.view.candidateId ===
      poi,
    id,
    { timeout: 10_000 },
  );
  await page.keyboard.down('g');
  try {
    await page.waitForFunction(
      (poi) =>
        (
          window.__game as { discoveries: { isDiscovered(site: string, poi: string): boolean } }
        ).discoveries.isDiscovered('blake-plateau-corals', poi),
      id,
      { timeout: 20_000 },
    );
  } finally {
    if (!page.isClosed()) await page.keyboard.up('g');
  }
}

test('new researcher earns RP, buys a live upgrade and earns a three-star dive', async ({
  page,
}) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?mission=blake-plateau-corals&skipBriefing=1');
  await ready(page);
  expect(
    await page.evaluate(
      () =>
        (window.__game as { sub: { getState(): { hullClass: string } } }).sub.getState().hullClass,
    ),
  ).toBe('A');
  for (const id of [
    'blake-mound-field-core',
    'blake-coral-thicket',
    'blake-second-mound',
    'blake-inter-mound-channel',
  ])
    await scan(page, id);
  await page.keyboard.press('Escape');
  await page.locator('.pause-actions .progress-menu-button').click();
  const upgrades = page.locator('.upgrades');
  await expect(upgrades).toBeVisible();
  await expect(upgrades.locator('.upgrades-balance')).toContainText('90 RP available');
  const before = await page.evaluate(
    () =>
      (window.__game as { headlights: { lights: { distance: number }[] } }).headlights.lights[0]
        .distance,
  );
  await upgrades.locator('[data-upgrade="light-range"]').click();
  const after = await page.evaluate(
    () =>
      (window.__game as { headlights: { lights: { distance: number }[] } }).headlights.lights[0]
        .distance,
  );
  expect(after).toBeCloseTo(before * 1.1);
  await expect(upgrades.locator('.upgrades-balance')).toContainText('55 RP available');
  await shot(page, 'upgrades');
  const held = await page.evaluate(
    () => (window.__game as { sub: { position: { y: number } } }).sub.position.y,
  );
  await page.waitForTimeout(400);
  expect(
    await page.evaluate(
      () => (window.__game as { sub: { position: { y: number } } }).sub.position.y,
    ),
  ).toBe(held);
  await page.keyboard.press('Escape');
  await expect(upgrades).toBeHidden();
  await expect(page.locator('.pause-menu')).toBeVisible();
  await page.locator('.pause-actions button', { hasText: /^Resume$/ }).click();
  // A photo of the current subject completes the bonus goal through the real capture flow.
  await page.keyboard.press('p');
  await expect(page.locator('.photo-mode')).toBeVisible();
  await page.locator('.photo-mode-capture').click();
  await page.waitForFunction(
    () => (window.__game as { progress: { bonus: boolean } }).progress.bonus,
  );
  // Photo toggles are sampled on animation frames. Wait for the exit before
  // Escape opens pause, otherwise Escape can run before P and re-open photo mode.
  await page.keyboard.press('p');
  await expect(page.locator('.photo-mode')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(page.locator('.pause-menu')).toBeVisible();
  await page.locator('.pause-surface').click();
  const debrief = page.locator('.mission-debrief');
  await expect(debrief).toBeVisible();
  await expect(debrief.locator('.debrief-stars')).toHaveAttribute('aria-label', '3 of 3 stars');
  await expect(debrief.locator('.debrief-rating')).toContainText('160 RP earned this dive');
  await shot(page, 'debrief');
  await debrief.locator('[data-action="dive-sites"]').click();
  const sites = page.locator('.home-sites');
  await expect(sites.locator('[data-mission="blake-plateau-corals"] .mission-stars')).toHaveText(
    '★★★',
  );
  await expect(sites.locator('[data-mission="titanic"]')).toBeDisabled();
  await expect(sites.locator('[data-mission="titanic"] .mission-lock')).toContainText(
    'Class B · 300 lifetime RP',
  );
  await expect(sites.locator('[data-mission="challenger-deep"] .mission-lock')).toContainText(
    'Class C · 900 lifetime RP',
  );
  await sites.locator('[data-mission="blake-plateau-corals"]').scrollIntoViewIfNeeded();
  await shot(page, 'mission-select');
  await page.reload();
  await ready(page);
  await page.locator('.home-menu .progress-menu-button').click();
  await expect(page.locator('[data-upgrade="light-range"]').locator('..')).toContainText(
    'Level 1 / 3',
  );
  expect(errors).toEqual([]);
});

test('phone workshop is touch-operable and locks leave four starter missions open', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await ready(page);
  await page.locator('.home-menu .progress-menu-button').click();
  await expect(page.locator('.upgrades')).toBeVisible();
  const sizes = await page.locator('.upgrades button').evaluateAll((buttons) =>
    buttons.map((button) => ({
      width: button.getBoundingClientRect().width,
      height: button.getBoundingClientRect().height,
    })),
  );
  expect(sizes.every((size) => size.width >= 44 && size.height >= 44)).toBe(true);
  expect(
    await page
      .locator('.upgrades-panel')
      .evaluate((panel) => panel.scrollWidth <= panel.clientWidth),
  ).toBe(true);
  await shot(page, 'upgrades-phone');
  await page.locator('.upgrades-close').click();
  await page.locator('.home-menu button', { hasText: /^Dive sites$/ }).click();
  await expect(page.locator('.home-sites .is-mission:not(:disabled)')).toHaveCount(4);
  await shot(page, 'mission-select-phone');
});

test('deep free dive uses only unlocked hulls, shared locked mission becomes a rated free dive', async ({
  page,
}) => {
  await page.goto('/?mission=challenger-deep');
  await ready(page);
  await expect(page.locator('.progress-hull-notice')).toContainText('Class C · 900 lifetime RP');
  const hull = await page.evaluate(() =>
    (
      window.__game as {
        sub: { getState(): { hullClass: string; ratedDepth: number } };
        subMesh: { hullClass: string };
        mission: unknown;
      }
    ).sub.getState(),
  );
  expect(hull.hullClass).toBe('A');
  expect(hull.ratedDepth).toBe(-1000);
  expect(await page.evaluate(() => (window.__game as { mission: unknown }).mission)).toBeNull();
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
  await page.goto('/?mission=titanic&skipBriefing=1');
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
  expect(result).toEqual({ lifetime: 330, vehicle: 'B', completed: 0 });
  expect(await page.evaluate(() => localStorage.getItem('subexplorer.discoveries.v1'))).toBe(old);
});

test('species hook pays once and unlocks a full-depth vehicle on the next dive', async ({
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
  await ready(page);
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
  expect(earned).toEqual({ first: 15, repeat: 0, lifetime: 914 });
  await page.goto('/?mission=challenger-deep&skipBriefing=1');
  await ready(page);
  expect(
    await page.evaluate(
      () => (window.__game as { subMesh: { hullClass: string } }).subMesh.hullClass,
    ),
  ).toBe('C');
  await expect(page.locator('.progress-hull-notice')).toHaveCount(0);
});
