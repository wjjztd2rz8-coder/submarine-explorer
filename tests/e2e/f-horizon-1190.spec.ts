import { expect, test } from '@playwright/test';
import type * as THREE from 'three';
import type { Submarine } from '../../src/sub/Submarine.js';
import { clockFramesUntil, pauseClockBeforeNavigation } from './helpers/clock.js';

interface Game {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  sub: Submarine;
  props: { loaded: boolean; stats: { failed: number } };
  discovery: { loaded: boolean };
  presets: { entered: boolean };
  perf: { tier: string };
}

for (const site of ['titanic', 'endurance']) {
  for (const tier of ['low', 'high']) {
    for (const [layout, width, height] of [
      ['desktop', 1600, 900],
      ['portrait', 390, 844],
    ] as const) {
      test(`${site} ${tier} ${layout}: horizon and opening remain readable`, async ({
        page,
      }, info) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('console', (message) => {
          if (message.type() === 'error') errors.push(message.text());
        });
        // Start each layout before navigation so portrait gets its authored pose.
        await page.setViewportSize({ width, height });
        await pauseClockBeforeNavigation(page);
        await page.goto(
          `/?tile=${site}&tier=${tier}&tutorial=0&dynres=0&lifeSeed=42${layout === 'portrait' ? '&touch=1' : ''}`,
          { waitUntil: 'domcontentloaded' },
        );
        await clockFramesUntil(page, () => {
          const g = window.__game as unknown as Game;
          return !!(
            window.__gameReady &&
            g.props.loaded &&
            g.discovery.loaded &&
            g.presets.entered
          );
        });
        await page.evaluate(() => {
          (window.__game as unknown as Game).sub.step = () => {};
        });
        await page.clock.runFor(34);
        const probe = await page.evaluate((site) => {
          const g = window.__game as unknown as Game;
          const dome = g.scene.getObjectByName(`${site}Horizon`) as THREE.Mesh<
            THREE.SphereGeometry,
            THREE.MeshBasicMaterial
          >;
          const canvas = g.renderer.domElement.getBoundingClientRect();
          return {
            visible: dome.visible,
            vertices: dome.geometry.getAttribute('position').count,
            tier: g.perf.tier,
            failed: g.props.stats.failed,
            canvas: { width: canvas.width, height: canvas.height },
            wreckHaze: !!g.scene.getObjectByName('wreckHaze'),
          };
        }, site);
        expect(probe.visible).toBe(true);
        expect(probe.vertices).toBe(561);
        expect(probe.tier).toBe(tier);
        expect(probe.failed).toBe(0);
        expect(probe.canvas).toEqual({ width, height });
        if (tier === 'low') expect(probe.wreckHaze).toBe(false);
        const png = await page.screenshot({
          path: info.outputPath(`${site}-${tier}-${layout}.png`),
        });
        const mean = await page.evaluate(async (b64) => {
          const img = new Image();
          img.src = `data:image/png;base64,${b64}`;
          await img.decode();
          const canvas = document.createElement('canvas');
          canvas.width = 100;
          canvas.height = 100;
          const ctx = canvas.getContext('2d')!;
          // Sample the scene between the top HUD and bottom controls; bright
          // overlays must not let an otherwise black canvas pass this check.
          ctx.drawImage(
            img,
            img.width * 0.28,
            img.height * 0.3,
            img.width * 0.44,
            img.height * 0.4,
            0,
            0,
            100,
            100,
          );
          const pixels = ctx.getImageData(0, 0, 100, 100).data;
          let sum = 0;
          for (let i = 0; i < pixels.length; i += 4)
            sum += Math.max(pixels[i]!, pixels[i + 1]!, pixels[i + 2]!);
          return sum / 10000;
        }, png.toString('base64'));
        expect(mean).toBeGreaterThan(10);
        expect(errors).toEqual([]);
      });
    }
  }
}
