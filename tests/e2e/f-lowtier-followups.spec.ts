import { expect, test } from './helpers/unlocked.js';
import type { GameContext } from '../../src/app/context.js';
import type { Scanner } from '../../src/game/Scanner.js';
import blueHolePoses from '../../tools/blue-hole-poses.json' with { type: 'json' };
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';

type Game = Pick<GameContext, 'sub' | 'props' | 'rig' | 'discovery'> & { scanner: Scanner };

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
const shots = '.cache/1100/screenshots';

test('Blake portrait keeps the contact reticle off SCAN and restores it when controls move', async ({
  page,
}) => {
  await page.goto('/?tile=blake-plateau-corals&tier=low&touch=1&tutorial=0&lifeSeed=42&dynres=0');
  await page.waitForFunction(
    () =>
      window.__gameReady &&
      (window.__game as unknown as Game).props.loaded &&
      (window.__game as unknown as Game).discovery.loaded,
  );
  await page.evaluate(() => {
    (window.__game as unknown as Game).sub.step = () => {};
  });
  await expect(page.locator('.tc-btn-scan')).toBeVisible();
  await expect(page.locator('.scan-panel')).toBeVisible();
  await expect(page.locator('.scan-reticle')).toBeHidden();
  // Clear the projected contact without moving it; the reticle must reappear at its true aim.
  await page.locator('.tc-buttons').evaluate((el) => {
    (el as HTMLElement).style.transform = 'translateY(-400px)';
  });
  await expect(page.locator('.scan-reticle')).toBeVisible();
  const overlap = await page.evaluate(() => {
    const r = document.querySelector('.scan-reticle')!.getBoundingClientRect();
    const b = document.querySelector('.tc-btn-scan')!.getBoundingClientRect();
    return r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top;
  });
  expect(overlap).toBe(false);
  await page.locator('.tc-buttons').evaluate((el) => {
    (el as HTMLElement).style.transform = '';
  });
  await expect(page.locator('.scan-reticle')).toBeHidden();
  await mkdir(shots, { recursive: true });
  await page.screenshot({ path: `${shots}/blake-opening.png` });
});

test('Blue Hole east gallery owns its scan card at both authored poses', async ({ page }) => {
  await page.goto('/?tile=great-blue-hole&tier=low&touch=1&tutorial=0&lifeSeed=42&dynres=0');
  await page.waitForFunction(
    () =>
      window.__gameReady &&
      (window.__game as unknown as Game).props.loaded &&
      (window.__game as unknown as Game).discovery.loaded,
  );
  for (const [name, range] of [
    ['approach', blueHolePoses.east.approachRange],
    ['detail', blueHolePoses.east.close.range],
  ] as const) {
    await page.evaluate(
      ({ fixed, range }) => {
        const g = window.__game as unknown as Game;
        g.sub.step = () => {};
        const hero = g.props.placed.find((p) => p.def.id === 'karst-grotto-east')!;
        hero.root.updateMatrixWorld(true);
        const target = hero.root.localToWorld(g.sub.position.clone().fromArray(fixed.target));
        const position = target
          .clone()
          .addScaledVector(g.sub.position.clone().fromArray(fixed.direction), range);
        const close = range === fixed.close.range ? fixed.close : null;
        position.x -= fixed.direction[2] * (close?.lateral ?? 0);
        position.z += fixed.direction[0] * (close?.lateral ?? 0);
        position.y = hero.root.position.y + (close?.above ?? fixed.above);
        const yaw = Math.atan2(target.x - position.x, -(target.z - position.z));
        const pitch = Math.atan2(target.y - position.y, range);
        g.sub.reset(position.x, position.y, position.z, yaw);
        g.sub.pitch = pitch;
        g.rig.setMode('first-person');
        g.rig.snap(g.sub.position, yaw, pitch);
        const eye = g.rig.camera.position;
        g.rig.lookElevation =
          (Math.atan2(target.y - eye.y, Math.hypot(target.x - eye.x, target.z - eye.z)) - pitch) /
          0.55;
        g.rig.snap(g.sub.position, yaw, pitch);
        g.scanner.update(0, g.sub.position, g.sub.getForward(), false);
      },
      { fixed: blueHolePoses.east, range },
    );
    await expect(page.locator('.scan-panel .scan-name')).toHaveText('Eastern stalactite gallery');
    await expect(page.locator('.scan-panel .scan-hint')).toHaveText('HOLD SCAN TO SCAN');
    expect(
      await page.evaluate(() => (window.__game as unknown as Game).scanner.view.nearestId),
    ).toBe('great-blue-hole-stalactites-east');
    await mkdir(shots, { recursive: true });
    await page.screenshot({ path: `${shots}/blue-hole-east-${name}.png` });
  }
});
