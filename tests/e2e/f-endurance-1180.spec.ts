import { expect, test } from '@playwright/test';
import type * as THREE from 'three';
import type { SubMesh } from '../../src/sub/SubMesh.js';
import type { Submarine } from '../../src/sub/Submarine.js';
import type { CameraRig } from '../../src/sub/CameraRig.js';
import { clockFramesUntil, pauseClockBeforeNavigation } from './helpers/clock.js';

interface Game {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  subMesh: SubMesh;
  sub: Submarine;
  rig: CameraRig;
  props: { loaded: boolean; stats: { failed: number } };
  discovery: { loaded: boolean };
  presets: { entered: boolean };
}

for (const tier of ['low', 'medium', 'high', 'ultra']) {
  test(`Endurance ${tier}: hull-close lighting stays finite and horizon renders`, async ({
    page,
  }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.setViewportSize({ width: 1600, height: 900 });
    await pauseClockBeforeNavigation(page);
    await page.goto(`/?tile=endurance&tier=${tier}&tutorial=0&dynres=0&lifeSeed=42`, {
      waitUntil: 'domcontentloaded',
    });
    await clockFramesUntil(page, () => {
      const g = window.__game as unknown as Game;
      return !!(window.__gameReady && g.props.loaded && g.discovery.loaded && g.presets.entered);
    });
    await page.evaluate(() => {
      (window.__game as unknown as Game).sub.step = () => {};
    });
    await page.clock.fastForward(250);
    const probe = await page.evaluate(() => {
      const g = window.__game as unknown as Game;
      const dome = g.scene.getObjectByName('enduranceHorizon') as THREE.Mesh;
      // Surface location raycast from the reported golden blob. Render and
      // read in the same task, before WebGL discards the drawing buffer.
      const position = g.sub.position.clone().set(-0.4568, -0.3455, -1.4879);
      g.subMesh.vehicle.root.localToWorld(position);
      position.project(g.rig.camera);
      const canvas = g.renderer.domElement;
      g.renderer.render(g.scene, g.rig.camera);
      const readback = document.createElement('canvas');
      readback.width = canvas.width;
      readback.height = canvas.height;
      const ctx = readback.getContext('2d')!;
      ctx.drawImage(canvas, 0, 0);
      const x = Math.round((position.x * 0.5 + 0.5) * canvas.width);
      const y = Math.round((-position.y * 0.5 + 0.5) * canvas.height);
      return {
        pixel: Array.from(ctx.getImageData(x, y, 1, 1).data),
        ndc: position.toArray(),
        horizon: dome.visible,
        failed: g.props.stats.failed,
      };
    });
    expect(Math.abs(probe.ndc[0])).toBeLessThan(1);
    expect(Math.abs(probe.ndc[1])).toBeLessThan(1);
    expect(Math.max(...probe.pixel.slice(0, 3))).toBeGreaterThan(10);
    expect(probe.horizon).toBe(true);
    expect(probe.failed).toBe(0);
    await page.clock.fastForward(50);
    await page.screenshot({ path: testInfo.outputPath(`endurance-${tier}-desktop.png`) });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.clock.fastForward(250);
    await page.screenshot({ path: testInfo.outputPath(`endurance-${tier}-portrait.png`) });
    expect(errors).toEqual([]);
  });
}
