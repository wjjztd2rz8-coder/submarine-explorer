import { homeReady } from './helpers/home.js';
import { scanWithKeyboard } from './helpers/scan.js';
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
  await page.waitForFunction(
    (poi) =>
      (window.__game as { scanner: { view: { candidateId: string } } }).scanner.view.candidateId ===
      poi,
    id,
    { timeout: 10_000 },
  );
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
test('discoveries unlock Journal cosmetics; photo bonus and best stars survive reload', async ({
  page,
}) => {
  test.setTimeout(180_000);
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
  await expect(
    page.locator('.pause-actions').getByRole('button', { name: 'Upgrades', exact: true }),
  ).toHaveCount(0);
  await page
    .locator('.pause-actions')
    .getByRole('button', { name: 'Journal', exact: true })
    .click();
  const journal = page.locator('.journal');
  await expect(journal).toBeVisible();
  // The existing Journal navigation leads to its front page on desktop and phone.
  await journal.getByRole('button', { name: 'Front page', exact: true }).click();
  await journal.getByText('Cosmetics', { exact: true }).click();
  await journal.getByLabel('Sub paint', { exact: true }).selectOption('red');
  await journal.getByLabel('Photo frame', { exact: true }).focus();
  await journal.getByLabel('Photo frame', { exact: true }).selectOption('white');
  await expect(journal.getByLabel('Sub paint', { exact: true })).toHaveValue('red');
  await expect(journal.getByLabel('Photo frame', { exact: true })).toBeFocused();
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
  await expect(journal).toBeHidden();
  await expect(page.locator('.pause-menu')).toBeVisible();
  await page.locator('.pause-actions button', { hasText: /^Resume$/ }).click();
  await page.keyboard.press('p');
  await expect(page.locator('.photo-mode')).toBeVisible();
  await page.locator('.photo-mode-capture').click();
  await page.waitForFunction(
    () => (window.__game as { progress: { bonus: boolean } }).progress.bonus,
  );
  await page.keyboard.press('p');
  await expect(page.locator('.photo-mode')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(page.locator('.pause-menu')).toBeVisible();
  await page.locator('.pause-surface').click();
  const debrief = page.locator('.mission-debrief');
  await expect(debrief).toBeVisible();
  await expect(debrief.locator('.debrief-stars')).toHaveAttribute('aria-label', '3 of 3 stars');
  await expect(debrief).not.toContainText('research points');
  await shot(page, 'debrief');
  await debrief.locator('[data-action="dive-sites"]').click();
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

// Guards phone access to the single picker and removal of the old purchase/access surface.
test('phone Journal offers cosmetics and all downloaded missions stay open in Realistic', async ({
  page,
}) => {
  await realistic(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await homeReady(page);
  await page.locator('.home-menu').getByRole('button', { name: 'Journal', exact: true }).click();
  const journal = page.locator('.journal');
  await expect(journal).toBeVisible();
  await journal.getByText('Cosmetics', { exact: true }).click();
  await expect(journal.getByLabel('Sub paint', { exact: true })).toHaveValue('stock');
  // Guards the formerly unreachable lamp slot alongside every existing cosmetic control.
  await expect(journal.getByLabel('Lamp trim', { exact: true })).toHaveValue('stock');
  await expect(journal.getByLabel('Sub decal', { exact: true })).toHaveValue('stock');
  await expect(journal.getByLabel('Photo frame', { exact: true })).toHaveValue('stock');
  // Preserve the workshop's phone touch-target guard on its replacement controls.
  const controls = await journal.locator('[data-cosmetic]').evaluateAll((elements) =>
    elements.map((element) => ({
      width: element.getBoundingClientRect().width,
      height: element.getBoundingClientRect().height,
    })),
  );
  expect(controls).toHaveLength(4);
  expect(controls.every((control) => control.width >= 44 && control.height >= 44)).toBe(true);
  expect(
    await journal.locator('.jr-panel').evaluate((panel) => panel.scrollWidth <= panel.clientWidth),
  ).toBe(true);
  await journal.locator('.jr-close').click();
  await page.locator('.home-menu button', { hasText: /^Dive sites$/ }).click();
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
  await homeReady(page);
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
  await page.goto('/?mission=challenger-deep&skipBriefing=1');
  await ready(page);
  expect(
    await page.evaluate(
      () => (window.__game as { subMesh: { hullClass: string } }).subMesh.hullClass,
    ),
  ).toBe('C');
  await expect(page.locator('.progress-hull-notice')).toHaveCount(0);
});
