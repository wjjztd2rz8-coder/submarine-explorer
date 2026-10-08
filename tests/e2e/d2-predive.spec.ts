// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from './helpers/unlocked.js';

/**
 * D2-PREDIVE (playtest #3): the game mode is visible on the home screen, in
 * the briefing's Dive settings and at the top of Settings > Gameplay, all
 * bound to one setting; the briefing previews the real start pose; the UI
 * scale readout never clips.
 */

const shots = '.cache/codex/shots/d2-predive';

interface Pose {
  x: number;
  y: number;
  z: number;
}

interface GameSave {
  get(): {
    gameplayMode: string;
    uiScale: number;
    hullWarningStyle: string;
    gameplay: Record<string, unknown>;
  };
  save(partial: Record<string, unknown>): void;
}

async function boot(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
}

async function saved(page: Page): Promise<ReturnType<GameSave['get']>> {
  return page.evaluate(() => (window.__game as { save: GameSave }).save.get());
}

async function pose(page: Page): Promise<Pose> {
  return page.evaluate(() => {
    const p = (window.__game as { sub: { position: Pose } }).sub.position;
    return { x: p.x, y: p.y, z: p.z };
  });
}

const dist = (a: Pose, b: Pose): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

test('home screen shows the game mode and changes it', async ({ page }) => {
  await mkdir(shots, { recursive: true });
  await page.setViewportSize({ width: 1280, height: 720 });
  await boot(page, '/');
  const mode = page.locator('.home-screen .mode-selector');
  await expect(mode).toBeVisible();
  await expect(mode.getByRole('radiogroup', { name: 'Game mode' })).toBeVisible();
  await expect(mode.getByRole('radio', { name: 'Arcade' })).toBeChecked();
  await expect(mode.locator('.mode-desc')).toContainText('Fast travel');
  // The selector must not run into the tagline above it.
  const tagline = await page.locator('.home-tagline').boundingBox();
  const box = await mode.boundingBox();
  expect(box!.y).toBeGreaterThan(tagline!.y + tagline!.height);
  await page.screenshot({ path: `${shots}/home-mode.png` });

  await mode.getByRole('radio', { name: 'Realistic' }).click();
  await expect(mode.getByRole('radio', { name: 'Realistic' })).toBeChecked();
  await expect(mode.locator('.mode-desc')).toContainText('battery and oxygen');
  expect((await saved(page)).gameplayMode).toBe('realistic');
  expect((await saved(page)).gameplay.speedProfile).toBe('research');

  // Same setting in Settings: the segmented control there follows.
  await page.locator('.home-menu').getByRole('button', { name: 'Settings' }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings' });
  await expect(dialog.getByRole('radio', { name: 'Realistic' })).toBeChecked();
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.keyboard.press('Escape');
  await expect(mode).toBeVisible();
  await page.screenshot({ path: `${shots}/home-mode-1920.png` });
});

test('briefing Dive settings: mode, start and Advanced persist to settings', async ({ page }) => {
  await mkdir(shots, { recursive: true });
  await boot(page, '/?mission=titanic');
  const briefing = page.locator('.briefing');
  await expect(briefing).toBeVisible();
  const dive = briefing.locator('.briefing-dive');
  await expect(dive).toHaveAttribute('aria-label', 'Dive settings');
  await expect(dive.getByRole('radio', { name: 'Arcade' })).toBeChecked();
  await expect(dive.locator('.briefing-start input[value="near-site"]')).toBeChecked();
  // One start choice only: the old footer radiogroup merged into Dive settings.
  await expect(briefing.locator('input[value="near-site"]')).toHaveCount(1);
  const more = dive.locator('.mode-advanced');
  const toggle = briefing.getByRole('button', { name: 'Advanced' });
  await expect(more).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(briefing.locator('.briefing-begin')).toBeInViewport();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${shots}/briefing-collapsed.png` });

  // Keyboard: Enter on the disclosure opens it and does not start the dive.
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(more).toBeVisible();
  await expect(briefing).toBeVisible();
  await expect(briefing.getByRole('button', { name: 'Advanced' })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  for (const label of [
    'Visual waypoints',
    'Sonar markers',
    'Battery and oxygen',
    'Currents',
    'Forward speed',
  ]) {
    await expect(more.getByLabel(label, { exact: true })).toBeVisible();
  }
  await expect(briefing.locator('.briefing-begin')).toBeInViewport();
  await page.screenshot({ path: `${shots}/briefing-expanded.png` });

  // Mouse: an option edit persists and flips the mode to Custom.
  await more.getByLabel('Sonar markers', { exact: true }).selectOption('false');
  await expect(dive.locator('.mode-custom-tag')).toBeVisible();
  let s = await saved(page);
  expect(s.gameplayMode).toBe('custom');
  expect(s.gameplay.sonarMarkers).toBe(false);
  expect(s.gameplay.visualHints).toBe(true);
  await more.getByLabel('Currents', { exact: true }).selectOption('exaggerated');
  expect((await saved(page)).gameplay.currents).toBe('exaggerated');

  // Keyboard: arrows on the mode radios apply a preset; options re-sync.
  await dive.getByRole('radio', { name: 'Arcade' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(dive.getByRole('radio', { name: 'Realistic' })).toBeChecked();
  await expect(briefing).toBeVisible();
  s = await saved(page);
  expect(s.gameplayMode).toBe('realistic');
  await expect(more.getByLabel('Visual waypoints', { exact: true })).toHaveValue('false');
  await expect(more.getByLabel('Battery and oxygen', { exact: true })).toHaveValue('true');
  await expect(more.getByLabel('Forward speed', { exact: true })).toHaveValue('research');
  await dive.getByRole('radio', { name: 'Arcade' }).click();
  await expect(more.getByLabel('Sonar markers', { exact: true })).toHaveValue('true');
  await expect(more.getByLabel('Forward speed', { exact: true })).toHaveValue('fast');

  // Focus stays in the card; axe is clean.
  for (let i = 0; i < 25; i++) await page.keyboard.press('Tab');
  expect(await page.evaluate(() => !!document.activeElement?.closest('.briefing'))).toBe(true);
  const axe = await new AxeBuilder({ page }).include('.briefing-actions').analyze();
  expect(axe.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);

  // Reload: the choices persisted and the briefing shows them.
  await more.getByLabel('Visual waypoints', { exact: true }).selectOption('false');
  await boot(page, '/?mission=titanic');
  await expect(page.locator('.briefing-dive').locator('.mode-custom-tag')).toBeVisible();
  expect((await saved(page)).gameplay.visualHints).toBe(false);
});

for (const start of ['near-site', 'surface'] as const) {
  test(`briefing previews the ${start} start; Begin dive does not teleport`, async ({ page }) => {
    await boot(page, '/?mission=titanic');
    await expect(page.locator('.briefing')).toBeVisible();
    await page.waitForFunction(
      () => (window.__game as { discovery: { loaded: boolean } }).discovery.loaded,
    );
    // Arcade default: near site, deep beside the bow, already behind the card.
    await expect.poll(async () => (await pose(page)).y, { timeout: 15_000 }).toBeLessThan(-3000);
    // Props load after discovery and reframe a waiting pilot once; wait for it to settle.
    await page.waitForFunction(
      () => (window.__game as { props: { loaded: boolean } }).props.loaded,
    );
    let near = await pose(page);
    await expect
      .poll(async () => {
        const now = await pose(page);
        const moved = dist(now, near);
        near = now;
        return moved;
      })
      .toBeLessThan(0.01);
    if (start === 'surface') {
      await page.locator('.briefing-start input[value="surface"]').check();
      await expect.poll(async () => (await pose(page)).y).toBeGreaterThan(-50);
      const surface = await pose(page);
      expect(dist(surface, near)).toBeGreaterThan(500);
      const s = await saved(page);
      expect(s.gameplay.startPosition).toBe('surface');
      expect(s.gameplayMode).toBe('custom');
      // Back and forth: the preview follows the choice.
      await page.locator('.briefing-start input[value="near-site"]').check();
      // Choosing a start makes the mode Custom, which keeps the classic long approach.
      await expect.poll(async () => (await pose(page)).y).toBeLessThan(-3000);
      await page.locator('.briefing-start input[value="surface"]').check();
      await expect.poll(async () => (await pose(page)).y).toBeGreaterThan(-50);
    }
    await page.waitForTimeout(300); // frozen: nothing drifts under the card
    const previewed = await pose(page);
    await page.locator('.briefing-begin').click();
    await expect(page.locator('.briefing')).toBeHidden();
    const started = await pose(page);
    expect(dist(started, previewed)).toBeLessThan(1);
    if (start === 'surface') expect(started.y).toBeGreaterThan(-50);
    else expect(started.y).toBeLessThan(-3000);
  });
}

test('Settings: mode on top of Gameplay, separate waypoint toggles, hull warning, UI scale', async ({
  page,
}) => {
  await mkdir(shots, { recursive: true });
  await page.setViewportSize({ width: 1280, height: 720 });
  await boot(page, '/');
  await page.locator('.home-menu').getByRole('button', { name: 'Settings' }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings' });
  const gameplay = dialog.getByRole('region', { name: 'Gameplay' });
  // The mode is the first control in Gameplay, a segmented control.
  const first = gameplay.locator('input, select').first();
  await expect(first).toHaveAttribute('type', 'radio');
  await expect(gameplay.getByRole('radio', { name: 'Arcade' })).toBeChecked();
  await expect(gameplay.locator('.mode-desc')).toContainText('Fast travel');

  await gameplay.getByRole('button', { name: 'Advanced' }).click();
  // Two separate waypoint settings, each with its own one-line description.
  for (const [label, words] of [
    ['Visual waypoints', 'dive view'],
    ['Sonar markers', 'sonar map'],
  ] as const) {
    const control = gameplay.getByLabel(label, { exact: true });
    await expect(control).toBeVisible();
    const noteId = await control.getAttribute('aria-describedby');
    expect(noteId).toBeTruthy();
    await expect(page.locator(`[id="${noteId}"]`)).toContainText(words);
  }
  await gameplay.getByLabel('Sonar markers', { exact: true }).selectOption('false');
  await expect(gameplay.locator('.mode-custom-tag')).toBeVisible();
  let s = await saved(page);
  expect(s.gameplay.sonarMarkers).toBe(false);
  expect(s.gameplay.visualHints).toBe(true);
  await gameplay.getByRole('radio', { name: 'Arcade' }).check();
  await expect(gameplay.getByLabel('Sonar markers', { exact: true })).toHaveValue('true');
  await gameplay.scrollIntoViewIfNeeded();
  await gameplay.screenshot({ path: `${shots}/settings-gameplay.png` });

  // Hull warning style.
  await dialog.getByLabel('Hull warning', { exact: true }).selectOption('gauge');
  s = await saved(page);
  expect(s.hullWarningStyle).toBe('gauge');
  expect(s.gameplayMode).toBe('arcade');

  // UI scale: − / slider / + and a readout that is never clipped.
  const row = dialog.locator('.settings-scale-row');
  const value = row.locator('.settings-scale-value');
  const slider = dialog.getByLabel('UI scale', { exact: true });
  await expect(slider).toHaveAttribute('type', 'range');
  await expect(value).toHaveText('100%');
  await row.getByRole('button', { name: 'Increase UI scale' }).click();
  await expect(value).toHaveText('105%');
  await row.getByRole('button', { name: 'Decrease UI scale' }).click();
  await row.getByRole('button', { name: 'Decrease UI scale' }).click();
  await expect(value).toHaveText('95%');
  await slider.focus();
  await page.keyboard.press('End');
  await expect(value).toHaveText('150%');
  expect((await saved(page)).uiScale).toBe(150);
  await page.keyboard.press('Home');
  await expect(value).toHaveText('80%');

  const fits = async (): Promise<{ clipped: boolean; overlaps: boolean }> =>
    row.evaluate((r) => {
      const out = r.querySelector('.settings-scale-value') as HTMLElement;
      const box = out.getBoundingClientRect();
      const others = [...r.querySelectorAll('.settings-scale button, .settings-scale input')].map(
        (e) => e.getBoundingClientRect(),
      );
      const panel = r.closest('.settings-panel')!.getBoundingClientRect();
      return {
        clipped:
          out.scrollWidth > out.clientWidth ||
          box.right > panel.right + 0.5 ||
          out.clientWidth === 0,
        overlaps: others.some(
          (o) =>
            o.left < box.right - 0.5 &&
            o.right > box.left + 0.5 &&
            o.top < box.bottom &&
            o.bottom > box.top,
        ),
      };
    });
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    for (const scale of [80, 100, 125, 150]) {
      await page.evaluate(
        (uiScale) => (window.__game as { save: GameSave }).save.save({ uiScale }),
        scale,
      );
      await expect(value).toHaveText(`${scale}%`);
      expect(await fits(), `${viewport.width}x${viewport.height} at ${scale}%`).toEqual({
        clipped: false,
        overlaps: false,
      });
      if (viewport.width === 1280 && (scale === 100 || scale === 150)) {
        await row.scrollIntoViewIfNeeded();
        await row.screenshot({ path: `${shots}/ui-scale-${scale}.png` });
      }
    }
  }
  const axe = await new AxeBuilder({ page }).include('.settings').analyze();
  expect(axe.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});
