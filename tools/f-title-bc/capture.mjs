/**
 * Opt-in real-tile review; not discovered by Playwright or shipped by Vite.
 * Run: node tools/f-title-bc/capture.mjs [before|after|--build-only]
 * Starts/owns a dev server, uses deterministic software WebGL, captures DPR 1.
 */
import { chromium } from '@playwright/test';
import { build, createServer } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const label = process.argv[2] ?? 'after';
if (label === '--build-only') {
  await build({
    configFile: false,
    cacheDir: '.cache/f-title-bc-vite',
    publicDir: false,
    build: {
      outDir: '.cache/f-title-bc-build',
      target: 'es2022',
      rollupOptions: { input: resolve('tools/f-title-bc/index.html') },
    },
  });
  process.exit(0);
}
assert.match(label, /^[a-z0-9-]+$/);
const output = resolve('.cache/codex/shots/f-title-bc', label);
await mkdir(output, { recursive: true });
const server = await createServer({
  configFile: false,
  root: process.cwd(),
  cacheDir: '.cache/f-title-bc-vite',
  publicDir: 'public',
  server: { host: '127.0.0.1', port: 0 },
});
let browser;
const results = [];
const failures = [];
try {
  browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  await server.listen();
  const address = server.httpServer.address();
  for (const [width, height] of [
    [1280, 720],
    [390, 844],
  ]) {
    for (const tier of ['low', 'high']) {
      const context = await browser.newContext({
        viewport: { width, height },
        deviceScaleFactor: 1,
      });
      try {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto(`http://127.0.0.1:${address.port}/tools/f-title-bc/?tier=${tier}`);
        await page.waitForFunction(() => window.__titleReview, null, { timeout: 120_000 });
        const metrics = await page.evaluate(() => window.__titleReview.metrics);
        const filename = `${width}x${height}-${tier}.png`;
        await page.screenshot({ path: resolve(output, filename) });
        // Retain a lamps-off comparison so terrain lighting can be distinguished
        // from the hemisphere/rim fill. It is a review aid, not a beauty shot.
        await page.evaluate(() => {
          const { title, renderer } = window.__titleReview;
          title.scene.traverse((o) => {
            if (o.isSpotLight) o.visible = false;
          });
          title.invalidate();
          title.draw(renderer);
        });
        await page.screenshot({
          path: resolve(output, `${width}x${height}-${tier}-lamps-off.png`),
        });
        assert.deepEqual(errors, []);
        const budget =
          tier === 'low' ? { calls: 35, triangles: 100_000 } : { calls: 60, triangles: 200_000 };
        // Capture every combination even when reviewing a defective revision.
        // Keep metrics and images before reporting failed acceptance assertions.
        try {
          assert.ok(
            metrics.actual.calls > 0 && metrics.actual.calls <= budget.calls,
            JSON.stringify(metrics),
          );
          assert.ok(
            metrics.actual.triangles >= 51_200 && metrics.actual.triangles <= budget.triangles,
            JSON.stringify(metrics),
          );
          assert.ok(
            metrics.cameraClearance >= 12 && metrics.cameraMeshClearance >= 12,
            JSON.stringify(metrics),
          );
          assert.ok(metrics.vehicleClearance >= 12, JSON.stringify(metrics));
          assert.ok(metrics.snow <= (tier === 'low' ? 200 : 600));
          if (width === 1280) {
            assert.ok(
              metrics.silhouette.widthFraction >= 0.14 && metrics.silhouette.widthFraction <= 0.18,
              JSON.stringify(metrics),
            );
          }
        } catch (error) {
          failures.push(`${filename}: ${error.message}`);
        }
        results.push({ filename, ...metrics });
        console.log(
          `${filename}: ${metrics.actual.calls} calls / ${metrics.actual.triangles} triangles; camera clearance ${metrics.cameraMeshClearance.toFixed(2)} m; hull ${(100 * metrics.silhouette.widthFraction).toFixed(1)}%`,
        );
      } finally {
        await context.close();
      }
    }
  }
  await writeFile(resolve(output, 'metrics.json'), JSON.stringify(results, null, 2) + '\n');
  assert.deepEqual(failures, []);
} catch (error) {
  await writeFile(resolve(output, 'run-error.txt'), String(error.stack ?? error) + '\n');
  throw error;
} finally {
  await browser?.close();
  await server.close();
}
