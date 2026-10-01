// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from './helpers/unlocked.js';
import type { CameraRig } from '../../src/sub/CameraRig.js';
import type { Submarine } from '../../src/sub/Submarine.js';
import type { Props } from '../../src/world/Props.js';
import type { Save } from '../../src/core/Save.js';
import type { GameConfig } from '../../src/core/Config.js';

const shots = '.cache/codex/shots/f-visual-fixes';
interface Game {
  sub: Submarine;
  rig: CameraRig;
  props: Props;
  save: Save;
  config: GameConfig;
  terrain: { sampleHeight(x: number, z: number): number };
  discovery: { loaded: boolean };
}
const sites = [
  { id: 'great-blue-hole', hero: 'karst-grotto', detail: true },
  { id: 'hunga-tonga-caldera', hero: 'caldera-tuff-wall', detail: true },
  { id: 'titanic', hero: 'bow-hull', detail: true },
  { id: 'lost-city', hero: 'poseidon-tower', detail: true },
  { id: 'endurance', hero: 'main-hull', detail: true },
  { id: 'beebe-vent-field', hero: 'beebe-chimney-1', detail: true },
  { id: 'blake-plateau-corals', hero: 'lophelia-mound', detail: true },
  { id: 'challenger-deep', hero: 'leggo-lander-marker', detail: false },
  { id: 'monterey-canyon', hero: 'canyon-wall-ledge', detail: false },
  { id: 'hudson-canyon', hero: 'coral-ledge-mound', detail: false },
  { id: 'axial-seamount-ashes', hero: 'mushroom-chimney', detail: false },
  { id: 'kamaehuakanaloa', hero: 'hiolo-north-chimney-1', detail: false },
  { id: 'bismarck', hero: 'main-hull', detail: false },
];

async function settle(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        let frames = 0;
        const next = (): void => {
          if (++frames >= 8) resolve();
          else requestAnimationFrame(next);
        };
        requestAnimationFrame(next);
      }),
  );
}

async function assertUnderwater(page: Page): Promise<void> {
  const eye = await page.evaluate(() => {
    const g = window.__game as unknown as Game;
    const p = g.rig.camera.position;
    return {
      sub: g.sub.position.y,
      mode: g.rig.mode,
      y: p.y,
      floor: g.terrain.sampleHeight(p.x, p.z) + g.config.camera.terrainClearance,
    };
  });
  expect(eye.sub).toBeLessThan(0);
  expect(eye.mode).toBe('chase');
  expect(eye.y).toBeLessThanOrEqual(-2 + 1e-6);
  expect(eye.y).toBeGreaterThanOrEqual(eye.floor - 1e-6);
}

test.describe('F-VISUAL-FIXES composed openings and close lighting', () => {
  test.describe.configure({ timeout: 180_000 });
  test.use({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    storageState: { cookies: [], origins: [] },
  });

  for (const site of sites) {
    test(`${site.id}: underwater free-dive opening${site.detail ? ' and 15 m detail' : ''}`, async ({
      page,
    }) => {
      await mkdir(shots, { recursive: true });
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      await page.goto(`/?tile=${site.id}&skipBriefing=1`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => {
        const g = window.__game as unknown as Game | undefined;
        return window.__gameReady && g?.props.loaded && g.discovery.loaded;
      });
      await settle(page);
      await assertUnderwater(page);
      const opening = await page.evaluate((heroId) => {
        const g = window.__game as unknown as Game;
        const hero = g.props.placed.find((p) => p.def.id === heroId)!;
        const centre = hero.root.localToWorld(hero.localBounds.getCenter(g.sub.position.clone()));
        const toHero = centre.clone().sub(g.sub.position).setY(0).normalize();
        return {
          facing: g.sub.getForward(g.sub.position.clone()).dot(toHero),
          collision: g.props.collide(
            g.sub.position.clone(),
            g.config.submarine.hullRadius,
            g.sub.position.clone(),
          ),
        };
      }, site.hero);
      expect(opening.facing).toBeGreaterThan(0.98);
      expect(opening.collision).toBe(false);
      await page.screenshot({ path: `${shots}/${site.id}-spawn.png` });

      if (site.detail) {
        const approach = await page.evaluate((heroId) => {
          const g = window.__game as unknown as Game;
          const hero = g.props.placed.find((p) => p.def.id === heroId)!;
          const centre = hero.localBounds.getCenter(g.sub.position.clone());
          if (hero.def.model === 'procedural:chimney' && hero.def.dimensionsM)
            centre.y = hero.localBounds.min.y + hero.def.dimensionsM[2] * 0.55;
          const half = hero.localBounds.getSize(g.sub.position.clone()).multiplyScalar(0.5);
          const worldCentre = hero.root.localToWorld(centre.clone());
          const candidates = [];
          for (let i = 0; i < 16; i++) {
            const angle = Math.PI / 4 + (i * Math.PI) / 8;
            const dx = Math.sin(angle),
              dz = -Math.cos(angle);
            const edge = Math.min(
              half.x / Math.max(Math.abs(dx), 1e-6),
              half.z / Math.max(Math.abs(dz), 1e-6),
            );
            const target = hero.root.localToWorld(
              centre.clone().add(g.sub.position.clone().set(dx * edge, 0, dz * edge)),
            );
            const direction = target.clone().sub(worldCentre).setY(0).normalize();
            let score = 0,
              clear = true;
            for (const range of [40, 15]) {
              const p = target.clone().addScaledVector(direction, range);
              p.y = Math.max(g.terrain.sampleHeight(p.x, p.z) + 18, Math.min(-12, target.y));
              if (p.y > -8 || g.props.collide(p.clone(), g.config.submarine.hullRadius, p.clone()))
                clear = false;
              score += Math.abs(p.y - target.y);
            }
            if (clear) candidates.push({ target, direction, score });
          }
          candidates.sort((a, b) => a.score - b.score);
          if (!candidates.length) throw new Error(`No safe detail approach for ${heroId}`);
          const { target, direction } = candidates[0];
          return {
            target: { x: target.x, y: target.y, z: target.z },
            direction: { x: direction.x, z: direction.z },
          };
        }, site.hero);
        for (const range of [40, 15]) {
          await page.evaluate(
            ({ target, direction, range }) => {
              const g = window.__game as unknown as Game;
              const x = target.x + direction.x * range,
                z = target.z + direction.z * range;
              const y = Math.max(g.terrain.sampleHeight(x, z) + 18, Math.min(-12, target.y));
              g.sub.reset(x, y, z, Math.atan2(target.x - x, -(target.z - z)));
              g.rig.resetView();
              g.rig.snap(g.sub.position, g.sub.yaw, 0);
            },
            { ...approach, range },
          );
          await settle(page);
          await assertUnderwater(page);
          await page.evaluate((target) => {
            const g = window.__game as unknown as Game;
            g.rig.setMode('first-person');
            g.rig.snap(g.sub.position, g.sub.yaw, g.sub.pitch);
            const eye = g.rig.camera.position;
            const cameraPitch = Math.atan2(
              target.y - eye.y,
              Math.hypot(target.x - eye.x, target.z - eye.z),
            );
            g.rig.lookElevation = (cameraPitch - g.sub.pitch) / 0.55;
            g.rig.snap(g.sub.position, g.sub.yaw, g.sub.pitch);
          }, approach.target);
          await settle(page);
          await page.screenshot({ path: `${shots}/${site.id}-${range}m.png` });
        }
        if (site.id === 'titanic') {
          await page.evaluate(() =>
            (window.__game as unknown as Game).save.setGameplayMode('realistic'),
          );
          await settle(page);
          await page.screenshot({ path: `${shots}/${site.id}-15m-realistic.png` });
        }
      }
      expect(errors).toEqual([]);
    });
  }
});
