import type { FogExp2, Scene } from 'three';
import { expect, test } from './helpers/unlocked.js';
import type { Save } from '../../src/core/Save.js';
import type { Atmosphere } from '../../src/render/Atmosphere.js';
import type { CameraRig } from '../../src/sub/CameraRig.js';
import type { Submarine } from '../../src/sub/Submarine.js';
import type { Props } from '../../src/world/Props.js';
import type { Terrain } from '../../src/world/Terrain.js';
import type { PresetSystem } from '../../src/world/presets/Presets.js';
import { DEFAULT_CAMERA } from '../../src/core/config/camera.js';
import type { Discovery } from '../../src/game/Discovery.js';
import type { Mission } from '../../src/game/Mission.js';
import type { Headlights } from '../../src/render/Headlights.js';

interface Game {
  save: Save;
  discovery: Discovery;
  mission: Mission | null;
  sub: Submarine;
  rig: CameraRig;
  props: Props;
  terrain: Terrain;
  atmosphere: Atmosphere;
  presets: PresetSystem;
  headlights: Headlights;
}

for (const tier of ['low', 'medium', 'high']) {
  for (const route of ['tile', 'mission']) {
    test(`Lost City ${route} ${tier}: Arcade preserves its route-specific opening and ambient-lit seabed`, async ({
      page,
    }) => {
      await page.goto(`/?${route}=lost-city&tutorial=0&tier=${tier}`, {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForFunction(() => {
        const g = window.__game as unknown as Game | undefined;
        return window.__gameReady === true && g?.props.loaded && g.presets.entered;
      });
      if (route === 'mission') {
        await page
          .locator('.briefing')
          .getByRole('button', { name: 'Begin dive', exact: true })
          .click();
        await expect(page.locator('.briefing')).toBeHidden();
      }
      await page.keyboard.press('Escape');
      await expect(page.locator('.pause-menu')).toBeVisible();
      await page.evaluate(() => (window.__game as unknown as Game).headlights.setEnabled(false));
      const opening = await page.evaluate(() => {
        const g = window.__game as unknown as Game;
        const hero = g.props.placed.find((p) => p.def.id === 'poseidon-tower')!;
        const pos = g.sub.position;
        const light = g.atmosphere.ambient;
        const luminance = 0.2126 * light.color.r + 0.7152 * light.color.g + 0.0722 * light.color.b;
        const density = ((g.atmosphere.group.parent as Scene).fog as FogExp2).density;
        const floorProxies = [];
        for (let bearing = -1; bearing < 8; bearing++) {
          const angle = (bearing * Math.PI) / 4;
          const radius = bearing < 0 ? 0 : 40;
          const x = pos.x + radius * Math.cos(angle);
          const z = pos.z + radius * Math.sin(angle);
          const y = g.terrain.sampleHeight(x, z);
          const eye = g.rig.camera.position;
          const distance = Math.hypot(eye.x - x, eye.y - y, eye.z - z);
          floorProxies.push(
            light.intensity * luminance * Math.exp(-Math.pow(density * distance, 2)),
          );
        }
        // Pin the current free-dive eye and the independent mission approach camera.
        const localEye = g.rig.camera.position
          .clone()
          .sub(pos)
          .applyAxisAngle(pos.clone().set(0, 1, 0), g.sub.yaw);
        g.rig.camera.updateMatrixWorld(true);
        hero.root.updateMatrixWorld(true);
        const towerAxis = [];
        for (let height = 0; height <= 60; height += 5) {
          towerAxis.push(
            hero.root
              .localToWorld(pos.clone().set(0, height, 0))
              .project(g.rig.camera)
              .toArray(),
          );
        }
        const primary = g.mission?.objectives.find((o) => o.primary);
        const target = g.discovery.pois.find((p) => p.id === primary?.poiId);
        return {
          primaryRange: target?.position.distanceTo(pos),
          scanRadius: target?.radius,
          mode: g.save.get().gameplayMode,
          heroRange: Math.hypot(pos.x - hero.root.position.x, pos.z - hero.root.position.z),
          localEye: localEye.toArray(),
          towerAxis,
          chaseRadius: g.rig.chaseRadius,
          altitude: pos.y - g.terrain.sampleHeight(pos.x, pos.z),
          ambient: light.intensity,
          fill: g.presets.params.ambientFill,
          floorProxies,
          lampsOn: g.headlights.on,
        };
      });
      expect(opening.mode).toBe('arcade');
      if (route === 'tile') {
        expect(opening.heroRange).toBeGreaterThan(30);
        expect(opening.heroRange).toBeLessThanOrEqual(40);
        expect(opening.chaseRadius).toBe(66);
      } else {
        expect(opening.primaryRange).toBeCloseTo(220, 0);
        expect(opening.primaryRange!).toBeGreaterThan(opening.scanRadius!);
        expect(opening.chaseRadius).toBeCloseTo(Math.hypot(38, 90), 6);
      }
      const tuning = DEFAULT_CAMERA.lostCityArcadeOpening;
      const expectedEye =
        route === 'tile'
          ? [
              tuning.chaseOffsetXM,
              DEFAULT_CAMERA.chaseOffset.y + tuning.chaseOffsetYM,
              DEFAULT_CAMERA.chaseOffset.z,
            ]
          : [0, DEFAULT_CAMERA.chaseOffset.y, DEFAULT_CAMERA.chaseOffset.z];
      const armScale = opening.chaseRadius / Math.hypot(...expectedEye);
      for (let axis = 0; axis < 3; axis++)
        expect(opening.localEye[axis]).toBeCloseTo(expectedEye[axis] * armScale, 1);
      for (const [x, y, z] of opening.towerAxis) {
        expect(Math.abs(x)).toBeLessThan(0.9);
        expect(Math.abs(y)).toBeLessThan(0.9);
        expect(z).toBeGreaterThan(-1);
        expect(z).toBeLessThan(1);
      }
      expect(opening.altitude).toBeGreaterThanOrEqual(22);
      expect(opening.fill).toBe(16);
      expect(opening.ambient).toBeGreaterThanOrEqual(16);
      expect(opening.floorProxies.every((value) => value > 2.5)).toBe(true);
      expect(opening.lampsOn).toBe(false);
    });
  }
}

test('Lost City Realistic free dive retains the vent opening and camera arm', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'subexplorer.settings.v3',
      JSON.stringify({ version: 2, gameplayMode: 'realistic', graphicsTier: 'low' }),
    ),
  );
  await page.goto('/?tile=lost-city&tutorial=0');
  await page.waitForFunction(
    () => window.__gameReady === true && (window.__game as unknown as Game).props.loaded,
  );
  await page.keyboard.press('Escape');
  const pose = await page.evaluate(() => {
    const g = window.__game as unknown as Game;
    const hero = g.props.placed.find((p) => p.def.id === 'poseidon-tower')!;
    return {
      range: Math.hypot(
        g.sub.position.x - hero.root.position.x,
        g.sub.position.z - hero.root.position.z,
      ),
      arm: g.rig.chaseRadius,
      mode: g.save.get().gameplayMode,
    };
  });
  expect(pose.mode).toBe('realistic');
  expect(pose.range).toBeGreaterThan(42);
  expect(pose.range).toBeLessThan(46);
  expect(pose.arm).toBeCloseTo(Math.hypot(38, 90), 6);
});
