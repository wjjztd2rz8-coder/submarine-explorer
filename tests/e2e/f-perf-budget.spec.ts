import { expect, test } from '@playwright/test';
import type { WebGLRenderer } from 'three';
import type { PerfStats } from '../../src/app/systems/quality.js';
import type { Props } from '../../src/world/Props.js';
import type { Submarine } from '../../src/sub/Submarine.js';

interface Game {
  renderer: WebGLRenderer;
  perf: PerfStats;
  props: Props;
  sub: Submarine;
  discovery: { loaded: boolean };
  explore: { ready: boolean };
  life: object | null;
}

// Guard actual rendered work, including terrain, submarine and normal effects.
// Frame time deliberately has no assertion: software GPUs vary across runners.
test.use({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1,
  storageState: { cookies: [], origins: [] },
});

test('Titanic opening stays within the Low-tier frame geometry budget', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?tile=titanic&tier=low&dynres=0&tutorial=0&lifeSeed=42', {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForFunction(() => {
    const g = window.__game as unknown as Game | undefined;
    return window.__gameReady && g?.props.loaded && g.discovery.loaded && g.explore.ready && g.life;
  });
  const sample = await page.evaluate(async () => {
    const g = window.__game as unknown as Game;
    g.sub.step = () => {};
    const frame = (): Promise<void> => new Promise((done) => requestAnimationFrame(() => done()));
    for (let i = 0; i < 30; i++) await frame();
    let calls = 0;
    let triangles = 0;
    let countersMatch = true;
    for (let i = 0; i < 60; i++) {
      await frame();
      calls = Math.max(calls, g.perf.drawCalls);
      triangles = Math.max(triangles, g.perf.triangles);
      // Low has no post pass: the exported totals must match renderer.info.
      countersMatch &&= g.perf.drawCalls === g.renderer.info.render.calls;
      countersMatch &&= g.perf.triangles === g.renderer.info.render.triangles;
    }
    return {
      calls,
      triangles,
      countersMatch,
      tier: g.perf.tier,
      dynamicResolution: g.perf.dynamicResolution,
      props: { ...g.props.stats },
    };
  });
  expect(errors).toEqual([]);
  expect(sample.tier).toBe('low');
  expect(sample.dynamicResolution).toBe(false);
  expect(sample.props.count).toBe(6);
  expect(sample.props.failed).toBe(0);
  expect(sample.props.skipped).toBe(0);
  expect(sample.props.full).toBeGreaterThan(0);
  expect(sample.countersMatch).toBe(true);
  // Prevent a blank/missing scene from passing the upper-bound checks.
  expect(sample.calls).toBeGreaterThan(0);
  expect(sample.triangles).toBeGreaterThan(10_000);
  expect(sample.calls).toBeLessThanOrEqual(1500);
  expect(sample.triangles).toBeLessThanOrEqual(1_500_000);
});
