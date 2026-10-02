// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import type { Submarine } from '../../src/sub/Submarine.js';
import type { Props } from '../../src/world/Props.js';

const shots = '.cache/codex/shots/f-arcade-access';
test.use({ storageState: { cookies: [], origins: [] } });

async function ready(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__gameReady === true);
  await page.waitForFunction(() => {
    const g = window.__game as { props: { loaded: boolean }; discovery: { loaded: boolean } };
    return g.props.loaded && g.discovery.loaded;
  });
}
async function shot(page: Page, name: string): Promise<void> {
  await mkdir(shots, { recursive: true });
  await page.screenshot({ path: `${shots}/${name}.png` });
}

test('fresh Arcade Titanic starts beside the wreck in its deep-ocean vehicle', async ({ page }) => {
  await page.goto('/?mission=titanic&tutorial=0');
  await ready(page);
  await expect(page.locator('.briefing-start input[value="near-site"]')).toBeChecked();
  await page.locator('.briefing-begin').click();
  await expect(page.locator('.briefing')).toBeHidden();
  const pose = await page.evaluate(() => {
    const g = window.__game as {
      sub: Submarine;
      subMesh: { hullClass: string };
      terrain: { sampleHeight(x: number, z: number): number };
      props: Props;
      progress: { lifetime: number };
      mission: { def: { briefing: { depth_m: number }; hull_class: string } };
    };
    const state = g.sub.getState();
    const hero = g.props.placed.find((p) => p.def.id === 'bow-hull')!;
    const bounds = hero.localBounds.clone().applyMatrix4(hero.root.matrixWorld);
    return {
      lifetime: g.progress.lifetime,
      depth: state.depth,
      altitude: g.sub.position.y - g.terrain.sampleHeight(g.sub.position.x, g.sub.position.z),
      wreckRange: bounds.distanceToPoint(g.sub.position),
      hull: state.hullClass,
      vehicle: g.subMesh.hullClass,
      missionHull: g.mission.def.hull_class,
      rating: Math.abs(state.ratedDepth),
      siteDepth: g.mission.def.briefing.depth_m,
      breached: state.hullBreached,
    };
  });
  expect(pose.lifetime).toBe(0);
  expect(pose.depth).toBeGreaterThan(3500);
  expect(pose.altitude).toBeGreaterThan(10);
  expect(pose.altitude).toBeLessThan(80);
  expect(pose.wreckRange).toBeGreaterThan(40);
  expect(pose.wreckRange).toBeLessThan(150);
  expect(pose.hull).toBe('B');
  expect(pose.vehicle).toBe('B');
  expect(pose.missionHull).toBe('B');
  expect(pose.rating).toBe(6500);
  expect(pose.rating).toBeGreaterThan(pose.siteDepth);
  expect(pose.breached).toBe(false);
  await expect(page.locator('.progress-hull-notice')).toHaveCount(0);
  await shot(page, 'titanic-fresh-arcade');
});

test('Arcade opens every card on a phone; switching to Realistic restores locks', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?tutorial=0');
  await ready(page);
  await page.locator('.home-menu button', { hasText: /^Dive sites$/ }).click();
  const sites = page.locator('.home-sites');
  await expect(sites.locator('.mission-lock')).toHaveCount(0);
  await expect(sites.locator('.is-mission:disabled')).toHaveCount(0);
  await expect(sites.locator('[data-mission="titanic"]')).toBeEnabled();
  await expect(sites.locator('[data-mission="challenger-deep"]')).toBeEnabled();
  const sizes = await sites.locator('.is-mission').evaluateAll((buttons) =>
    buttons.map((b) => ({
      width: b.getBoundingClientRect().width,
      height: b.getBoundingClientRect().height,
    })),
  );
  expect(sizes.length).toBeGreaterThanOrEqual(13);
  expect(sizes.every((size) => size.width >= 44 && size.height >= 44)).toBe(true);
  await sites.locator('[data-mission="titanic"]').scrollIntoViewIfNeeded();
  await shot(page, 'arcade-sites-phone');
  await page.evaluate(() =>
    (window.__game as { save: { setGameplayMode(mode: 'realistic'): void } }).save.setGameplayMode(
      'realistic',
    ),
  );
  await expect(sites.locator('[data-mission="titanic"]')).toBeDisabled();
  await expect(sites.locator('[data-mission="titanic"] .mission-lock')).toContainText(
    'Class B · 300 lifetime RP',
  );
  await expect(sites.locator('[data-mission="challenger-deep"] .mission-lock')).toContainText(
    'Class C · 900 lifetime RP',
  );
  await expect(sites.locator('.is-mission:not(:disabled)')).toHaveCount(4);
  await sites.locator('[data-mission="titanic"]').scrollIntoViewIfNeeded();
  await shot(page, 'realistic-sites-phone');
  await page.evaluate(() =>
    (window.__game as { save: { setGameplayMode(mode: 'arcade'): void } }).save.setGameplayMode(
      'arcade',
    ),
  );
  await expect(sites.locator('.mission-lock')).toHaveCount(0);
  await expect(sites.locator('[data-mission="titanic"]')).toBeEnabled();
});

test('a fresh Realistic shared Titanic link keeps the coastal hull and opens free dive', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'subexplorer.settings.v2',
      JSON.stringify({ version: 2, gameplayMode: 'realistic', graphicsTier: 'low' }),
    ),
  );
  await page.goto('/?mission=titanic&tutorial=0');
  await ready(page);
  await expect(page.locator('.progress-hull-notice')).toContainText('Class B · 300 lifetime RP');
  await expect(page).toHaveURL(/tile=titanic/);
  const state = await page.evaluate(() => {
    const g = window.__game as { sub: Submarine; subMesh: { hullClass: string }; mission: unknown };
    return {
      hull: g.sub.getState().hullClass,
      rating: g.sub.getState().ratedDepth,
      vehicle: g.subMesh.hullClass,
      mission: g.mission,
    };
  });
  expect(state).toEqual({ hull: 'A', rating: -1000, vehicle: 'A', mission: null });
  await shot(page, 'titanic-realistic-locked');
});
