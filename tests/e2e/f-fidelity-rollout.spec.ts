import { expect, test } from './helpers/unlocked.js';
import type { Submarine } from '../../src/sub/Submarine.js';
import type { CameraRig } from '../../src/sub/CameraRig.js';
import type { Props } from '../../src/world/Props.js';
import type { Terrain } from '../../src/world/Terrain.js';

interface Game {
  sub: Submarine;
  rig: CameraRig;
  props: Props;
  terrain: Terrain;
  discovery: { loaded: boolean };
  config: { submarine: { hullRadius: number; maxPitch: number } };
  perf: { tier: string; triangles: number; drawCalls: number };
}

for (const site of ['great-blue-hole', 'lost-city']) {
  for (const layout of [
    { name: 'desktop', width: 1600, height: 900 },
    { name: 'portrait', width: 390, height: 844 },
  ]) {
    test(`${site} Medium ${layout.name}: every golden pose stays below 900k rendered triangles`, async ({
      page,
    }) => {
      test.setTimeout(240_000);
      await page.setViewportSize(layout);
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(
        `/?tile=${site}&tier=medium&skipBriefing=1&tutorial=0&lifeSeed=42&dynres=0${layout.name === 'portrait' ? '&touch=1' : ''}`,
      );
      await page.waitForFunction(() => {
        const g = window.__game as unknown as Game;
        return window.__gameReady && g?.props.loaded && g.discovery.loaded;
      });
      await page.evaluate(async () => {
        const g = window.__game as unknown as Game;
        g.sub.step = () => {};
        await g.terrain.texturesReady;
      });
      // Match golden-shots.mjs: composed chase opening, west/east authored galleries,
      // or the first clear Poseidon axis approach. No lighting or art overrides.
      const poses = await page.evaluate((site) => {
        const g = window.__game as unknown as Game;
        const poses = [
          {
            name: 'opening',
            position: g.sub.position.toArray(),
            yaw: g.sub.yaw,
            pitch: g.sub.pitch,
            target: null as number[] | null,
          },
        ];
        const ids =
          site === 'great-blue-hole' ? ['karst-grotto', 'karst-grotto-east'] : ['poseidon-tower'];
        for (const id of ids) {
          const hero = g.props.placed.find((p) => p.def.id === id)!;
          hero.root.updateMatrixWorld(true);
          const east = id === 'karst-grotto-east';
          const centre = hero.localBounds.getCenter(g.sub.position.clone());
          if (site === 'lost-city')
            centre.y = Math.max(hero.localBounds.min.y, 0) + hero.def.dimensionsM![2] * 0.45;
          if (east) centre.set(0, 6.2, -9);
          const target = hero.root.localToWorld(centre);
          const direction = g.sub.position
            .clone()
            .set(east ? -0.544639035 : 1, 0, east ? -0.838670568 : 0);
          if (site === 'lost-city') {
            let clear = false;
            for (let i = 0; i < 16; i++) {
              const angle = Math.PI / 4 + (i * Math.PI) / 8;
              direction
                .copy(
                  hero.root.localToWorld(
                    g.sub.position.clone().set(Math.sin(angle), 0, -Math.cos(angle)),
                  ),
                )
                .sub(hero.root.localToWorld(g.sub.position.clone().set(0, 0, 0)))
                .setY(0)
                .normalize();
              clear = [40, 30].every((range) => {
                const p = target.clone().addScaledVector(direction, range);
                p.y = g.terrain.sampleHeight(p.x, p.z) + 15;
                return (
                  p.y < -g.config.submarine.hullRadius &&
                  !g.props.collide(p.clone(), g.config.submarine.hullRadius, p.clone())
                );
              });
              if (clear) break;
            }
            if (!clear) throw new Error('No clear Poseidon golden approach');
          }
          for (const shot of [2, 3]) {
            const range =
              site === 'lost-city'
                ? shot === 2
                  ? 40
                  : 30
                : east
                  ? shot === 2
                    ? 55
                    : 42
                  : shot === 2
                    ? 40
                    : 36;
            const lateral = shot === 3 && site === 'great-blue-hole' ? (east ? 8 : 10) : 0;
            const p = target.clone().addScaledVector(direction, range);
            p.x -= direction.z * lateral;
            p.z += direction.x * lateral;
            p.y =
              site === 'lost-city'
                ? g.terrain.sampleHeight(p.x, p.z) + 15
                : hero.root.position.y + (shot === 2 ? 5 : east ? 6.5 : 9);
            poses.push({
              name: `${id}-${shot}`,
              position: p.toArray(),
              yaw: Math.atan2(target.x - p.x, -(target.z - p.z)),
              pitch: Math.max(
                -g.config.submarine.maxPitch,
                Math.min(g.config.submarine.maxPitch, Math.atan2(target.y - p.y, range)),
              ),
              target: target.toArray(),
            });
          }
        }
        return poses;
      }, site);
      for (const pose of poses) {
        for (const drift of [-2, 0, 2]) {
          await page.evaluate(
            ({ pose, drift }) => {
              const g = window.__game as unknown as Game;
              const [x, y, z] = pose.position;
              g.sub.reset(x, y + drift, z, pose.yaw);
              g.sub.pitch = pose.pitch;
              g.rig.resetView();
              g.rig.setMode(pose.target ? 'first-person' : 'chase');
              g.rig.snap(g.sub.position, pose.yaw, pose.pitch);
              if (pose.target) {
                const [tx, ty, tz] = pose.target;
                const eye = g.rig.camera.position;
                g.rig.lookElevation =
                  (Math.atan2(ty - eye.y, Math.hypot(tx - eye.x, tz - eye.z)) - pose.pitch) / 0.55;
                g.rig.snap(g.sub.position, pose.yaw, pose.pitch);
              }
            },
            { pose, drift },
          );
          const perf = await page.evaluate(
            () =>
              new Promise<{ tier: string; draws: number; triangles: number }>((resolve) => {
                let frames = 0,
                  triangles = 0;
                const next = () => {
                  const g = window.__game as unknown as Game;
                  if (++frames > 8) triangles = Math.max(triangles, g.perf.triangles);
                  if (frames >= 16)
                    resolve({ tier: g.perf.tier, draws: g.perf.drawCalls, triangles });
                  else requestAnimationFrame(next);
                };
                requestAnimationFrame(next);
              }),
          );
          expect(perf.tier).toBe('medium');
          expect(perf.draws).toBeGreaterThan(0);
          expect(perf.triangles, `${pose.name}, vertical drift ${drift} m`).toBeGreaterThan(0);
          expect(perf.triangles, `${pose.name}, vertical drift ${drift} m`).toBeLessThan(900_000);
        }
      }
      expect(errors).toEqual([]);
    });
  }
}
