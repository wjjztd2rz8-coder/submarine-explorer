import { expect, test, type Page } from './helpers/unlocked.js';
import { clockFramesUntil, pauseClockBeforeNavigation } from './helpers/clock.js';
import type { Discovery } from '../../src/game/Discovery.js';
import type { Mission } from '../../src/game/Mission.js';
import type { Props } from '../../src/world/Props.js';
import type { Submarine } from '../../src/sub/Submarine.js';

interface Game {
  sub: Submarine;
  props: Props;
  discovery: Discovery;
  mission: Mission | null;
}

test.use({ storageState: { cookies: [], origins: [] }, serviceWorkers: 'block' });

async function ready(page: Page): Promise<void> {
  await clockFramesUntil(page, () => {
    const g = window.__game as unknown as Game | undefined;
    return !!(window.__gameReady && g?.props.loaded && g.discovery.loaded);
  });
  // Match golden captures: hold the actual opening while allowing render/UI
  // frames. Begin still resolves its own start pose through the real router.
  await page.evaluate(() => {
    (window.__game as unknown as Game).sub.step = () => {};
  });
  await page.clock.runFor(34);
}

async function pose(page: Page) {
  return page.evaluate(() => {
    const g = window.__game as unknown as Game;
    const first = g.mission?.objectives.find((o) => o.primary);
    const target = g.discovery.pois.find((p) => p.id === first?.poiId);
    return {
      position: g.sub.position.toArray(),
      yaw: g.sub.yaw,
      first: first?.id,
      range: target?.position.distanceTo(g.sub.position),
      failedProps: g.props.stats.failed,
    };
  });
}

for (const [site, first] of [
  ['titanic', 'find-bow'],
  ['great-blue-hole', 'stalactites'],
  ['monterey-canyon', 'canyon-wall'],
  ['beebe-vent-field', 'main-vents'],
  ['lost-city', 'find-poseidon'],
]) {
  for (const tier of ['low', 'medium', 'high']) {
    test(`${site} ${tier}: mission opens at the free-dive scenery with its first primary within 120 m`, async ({
      page,
    }, testInfo) => {
      test.setTimeout(180_000);
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await pauseClockBeforeNavigation(page);
      const params = `tile=${site}&tier=${tier}&tutorial=0&dynres=0&lifeSeed=42`;
      await page.goto(`/?${params}`, { waitUntil: 'domcontentloaded' });
      await ready(page);
      const free = await pose(page);
      expect(free.first).toBeUndefined();
      expect(free.failedProps).toBe(0);

      await page.goto(`/?${params}&mission=${site}`, { waitUntil: 'domcontentloaded' });
      await ready(page);
      await expect(page.locator('.briefing')).toBeVisible();
      const preview = await pose(page);
      await page.locator('.briefing-begin').click();
      await page.clock.runFor(34);
      await expect(page.locator('.briefing')).toBeHidden();
      const mission = await pose(page);
      const distance = Math.hypot(...mission.position.map((p, i) => p - free.position[i]));
      const yawDegrees =
        (Math.abs(Math.atan2(Math.sin(mission.yaw - free.yaw), Math.cos(mission.yaw - free.yaw))) *
          180) /
        Math.PI;
      await testInfo.attach('opening-comparison', {
        body: JSON.stringify({ site, tier, free, preview, mission, distance, yawDegrees }, null, 2),
        contentType: 'application/json',
      });
      expect(mission.failedProps).toBe(0);
      expect(mission.first).toBe(first);
      expect(mission.range).toBeDefined();
      expect(mission.range!).toBeLessThanOrEqual(120);
      expect(distance).toBeLessThanOrEqual(30);
      expect(yawDegrees).toBeLessThanOrEqual(20);
      expect(preview.position).toEqual(mission.position);
      expect(preview.yaw).toEqual(mission.yaw);
      expect(errors).toEqual([]);
    });
  }
}
