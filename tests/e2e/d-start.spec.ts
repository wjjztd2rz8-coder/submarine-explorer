// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

const shots = '.cache/codex/shots/d-start';

async function boot(page: Page, mission: string): Promise<void> {
  await page.goto(`/?mission=${mission}`);
  await page.waitForFunction(() => window.__gameReady === true);
  await page.waitForFunction(
    () => (window.__game as { discovery: { loaded: boolean } }).discovery.loaded,
  );
}

async function pose(page: Page): Promise<{ x: number; y: number; z: number }> {
  return page.evaluate(() => {
    const p = (window.__game as { sub: { position: { x: number; y: number; z: number } } }).sub
      .position;
    return { x: p.x, y: p.y, z: p.z };
  });
}

test('Arcade near-site starts show the first target at deep and shallow sites', async ({
  page,
}) => {
  await mkdir(shots, { recursive: true });
  for (const [id, filename] of [
    ['titanic', 'near-site-titanic.png'],
    ['challenger-deep', 'near-site-challenger.png'],
    ['lost-city', 'near-site-lost-city.png'],
  ]) {
    await boot(page, id);
    await expect(page.locator('.briefing-start input[value="near-site"]')).toBeChecked();
    if (id === 'titanic') await page.screenshot({ path: `${shots}/briefing-start-choice.png` });
    await page.locator('.briefing-begin').click();
    await expect(page.locator('.briefing')).toBeHidden();
    await page.evaluate(
      () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
    );
    await page.screenshot({ path: `${shots}/${filename}` });
    const near = await page.evaluate(() => {
      const g = window.__game as {
        sub: { position: { x: number; y: number; z: number } };
        discovery: { pois: Array<{ id: string; position: { x: number; y: number; z: number } }> };
        mission: { objectives: Array<{ poiId: string; primary: boolean }> };
        terrain: { sampleHeight(x: number, z: number): number };
        config: {
          submarine: {
            hullRadius: number;
            seabedClearance: number;
            hullClasses: Record<string, { crushDepth: number }>;
          };
          mission: { spawnClearanceM: number };
        };
        missionRouter: { mission: { def: { hull_class: string } } };
      };
      const p = g.sub.position;
      const first = g.mission.objectives.find((o) => o.primary)!;
      const target = g.discovery.pois.find((poi) => poi.id === first.poiId)!.position;
      const hull = g.config.submarine;
      return {
        range: Math.hypot(p.x - target.x, p.z - target.z),
        altitude: p.y - g.terrain.sampleHeight(p.x, p.z),
        minAltitude: hull.hullRadius + hull.seabedClearance + g.config.mission.spawnClearanceM,
        rating: hull.hullClasses[g.missionRouter.mission.def.hull_class]!.crushDepth,
        y: p.y,
      };
    });
    expect(near.range).toBeGreaterThanOrEqual(349);
    expect(near.range).toBeLessThanOrEqual(601);
    expect(near.altitude).toBeGreaterThanOrEqual(near.minAltitude - 0.5);
    expect(near.y).toBeGreaterThan(near.rating);
  }
});

test('Surface choice applies only to this briefing; saved preference survives reload', async ({
  page,
}) => {
  await boot(page, 'titanic');
  await page.locator('.briefing-start input[value="surface"]').check();
  await page.locator('.briefing-begin').click();
  await expect(page.locator('.briefing')).toBeHidden();
  expect((await pose(page)).y).toBeGreaterThan(-20);
  await page.screenshot({ path: `${shots}/surface.png` });
  await boot(page, 'titanic');
  await expect(page.locator('.briefing-start input[value="near-site"]')).toBeChecked();
  await page.evaluate(() => {
    const save = (
      window.__game as {
        save: {
          setGameplayMode(mode: 'realistic'): void;
          setGameplayOption(key: 'startPosition', value: 'surface'): void;
        };
      }
    ).save;
    save.setGameplayMode('realistic');
    save.setGameplayOption('startPosition', 'surface');
  });
  await boot(page, 'titanic');
  await expect(page.locator('.briefing-start input[value="surface"]')).toBeChecked();
  await page.locator('.briefing-start input[value="near-site"]').check();
  await page.locator('.briefing-begin').click();
  await expect(page.locator('.briefing')).toBeHidden();
  expect((await pose(page)).y).toBeLessThan(-3000);
  await boot(page, 'titanic');
  await expect(page.locator('.briefing-start input[value="surface"]')).toBeChecked();
});
