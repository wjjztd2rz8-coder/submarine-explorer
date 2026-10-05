// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';
import { expect, test } from './helpers/unlocked.js';
import type { Submarine } from '../../src/sub/Submarine.js';
import type { CameraRig } from '../../src/sub/CameraRig.js';
import type { Props } from '../../src/world/Props.js';

const shots = '.cache/beebe-680/after';
interface BeebeGame {
  sub: Submarine;
  rig: CameraRig;
  props: Props;
  discovery: { loaded: boolean };
}

for (const view of [
  { name: 'desktop-high', width: 1600, height: 900, tier: 'high' },
  { name: 'portrait-high', width: 390, height: 844, tier: 'high' },
  { name: 'portrait-low', width: 390, height: 844, tier: 'low' },
]) {
  test(`Beebe opening and ten seconds: ${view.name}`, async ({ page }) => {
    test.setTimeout(180_000);
    await mkdir(shots, { recursive: true });
    await page.setViewportSize({ width: view.width, height: view.height });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(
      `/?tile=beebe-vent-field&skipBriefing=1&tutorial=0&tier=${view.tier}${view.width < view.height ? '&touch=1' : ''}`,
    );
    await page.waitForFunction(() => {
      const game = window.__game as unknown as BeebeGame | undefined;
      return window.__gameReady && game?.props.loaded && game.discovery.loaded;
    });
    for (const second of [0, 10]) {
      if (second) await page.waitForTimeout(second * 1000);
      const framing = await page.evaluate(() => {
        const game = window.__game as unknown as BeebeGame;
        const hero = game.props.placed.find((p) => p.def.id === 'beebe-chimney-1')!;
        hero.root.updateMatrixWorld(true);
        game.rig.camera.updateMatrixWorld(true);
        const tip = game.sub.position.clone().set(0, Number(hero.full.userData.ventTop), 0);
        hero.root.localToWorld(tip);
        tip.project(game.rig.camera);
        return {
          tip: tip.toArray(),
          chase: game.rig.mode,
          failedProps: game.props.stats.failed,
          apron: Boolean(hero.full.getObjectByName('beebe-mineral-seabed')),
          rubble: Boolean(hero.full.getObjectByName('beebe-seabed-talus')),
        };
      });
      expect(framing.chase).toBe('chase');
      expect(framing.failedProps).toBe(0);
      expect(framing.apron).toBe(true);
      expect(framing.rubble).toBe(true);
      expect(framing.tip[0]).toBeLessThan(-0.1);
      expect(Math.abs(framing.tip[0]!)).toBeLessThan(0.9);
      expect(Math.abs(framing.tip[1]!)).toBeLessThan(0.9);
      await page.screenshot({
        path: `${shots}/beebe-${view.name}-${second}s.png`,
        timeout: 60_000,
      });
    }
    expect(errors).toEqual([]);
  });
}
