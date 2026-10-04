/**
 * Hero opening-frame benchmark. Build/start preview separately, then run:
 *   node tools/perf-budget.mjs [http://localhost:4299/] [output-directory]
 * PERF_SITES=titanic,lost-city and PERF_TIERS=low restrict a repeat measurement.
 * Fresh Arcade profiles, deterministic life seed, fixed spawn/chase view,
 * 1280x720 at DPR 1, dynamic resolution disabled, normal effects/life enabled.
 * Software WebGL keeps this reproducible without a physical GPU; timings are
 * host-specific diagnostics, not a phone/desktop GPU performance prediction.
 */
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const base = new URL(process.argv[2] ?? 'http://localhost:4299/');
const output = resolve(process.argv[3] ?? '.cache/perf-budget');
const sites = (
  process.env.PERF_SITES ?? 'titanic,lost-city,great-blue-hole,beebe-vent-field,monterey-canyon'
).split(',');
const tiers = (process.env.PERF_TIERS ?? 'low,high').split(',');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const results = [];
try {
  for (const site of sites) {
    for (const tier of tiers) {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1,
      });
      try {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('console', (message) => {
          if (message.type() === 'error') errors.push(message.text());
        });
        const url = new URL(base);
        url.search = new URLSearchParams({
          tile: site,
          tier,
          tutorial: '0',
          dynres: '0',
          lifeSeed: '42',
        }).toString();
        await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 120_000 });
        await page.waitForFunction(
          () => {
            const g = window.__game;
            return (
              window.__gameReady &&
              g?.props.loaded &&
              g.discovery.loaded &&
              g.life &&
              g.explore.ready
            );
          },
          null,
          { timeout: 120_000 },
        );
        const result = await page.evaluate(async () => {
          const g = window.__game;
          // Hold the opening pose while lighting, life and normal render hooks run.
          g.sub.step = () => {};
          const frame = () => new Promise((done) => requestAnimationFrame(done));
          for (let i = 0; i < 30; i++) await frame();
          const samples = [];
          let previous = await frame();
          for (let i = 0; i < 60; i++) {
            const now = await frame();
            samples.push({
              ms: now - previous,
              calls: g.perf.drawCalls,
              triangles: g.perf.triangles,
            });
            previous = now;
          }
          const times = samples.map((s) => s.ms).sort((a, b) => a - b);
          const gl = g.renderer.getContext();
          const debug = gl.getExtension('WEBGL_debug_renderer_info');
          return {
            tier: g.perf.tier,
            renderer: debug
              ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
              : gl.getParameter(gl.RENDERER),
            pixelRatio: g.perf.pixelRatio,
            dynamicResolution: g.perf.dynamicResolution,
            pose: {
              sub: g.sub.position.toArray(),
              yaw: g.sub.yaw,
              camera: g.rig.camera.position.toArray(),
              mode: g.rig.mode,
            },
            props: { ...g.props.stats },
            samples,
            drawCalls: Math.max(...samples.map((s) => s.calls)),
            triangles: Math.max(...samples.map((s) => s.triangles)),
            meanMs: times.reduce((a, b) => a + b, 0) / times.length,
            medianMs: times[Math.floor(times.length / 2)],
            p95Ms: times[Math.ceil(times.length * 0.95) - 1],
          };
        });
        if (
          errors.length ||
          result.props.failed ||
          result.props.skipped ||
          !result.props.count ||
          !result.props.full ||
          !result.drawCalls ||
          !result.triangles
        )
          throw new Error(
            `${site}/${tier}: incomplete scene ${JSON.stringify({ errors, props: result.props })}`,
          );
        if (result.tier !== tier || result.dynamicResolution || result.pixelRatio !== 1)
          throw new Error(`${site}/${tier}: unexpected quality settings`);
        await page.screenshot({ path: resolve(output, `${site}-${tier}.png`), timeout: 90_000 });
        if (errors.length) throw new Error(`${site}/${tier}: ${errors.join('; ')}`);
        results.push({ site, ...result });
        console.log(
          `${site} ${tier}: ${result.drawCalls} calls, ${result.triangles} triangles; mean ${result.meanMs.toFixed(1)} ms, p50 ${result.medianMs.toFixed(1)}, p95 ${result.p95Ms.toFixed(1)}`,
        );
        await writeFile(
          resolve(output, 'results.json'),
          JSON.stringify(
            {
              capturedAt: new Date().toISOString(),
              base: base.href,
              viewport: [1280, 720],
              warmupFrames: 30,
              sampleFrames: 60,
              results,
            },
            null,
            2,
          ),
        );
        await writeFile(
          resolve(output, 'results.md'),
          [
            '| Site | Tier | Max draws | Max triangles | Mean frame ms | p50 ms | p95 ms |',
            '| --- | --- | ---: | ---: | ---: | ---: | ---: |',
            ...results.map(
              (r) =>
                `| ${r.site} | ${r.tier} | ${r.drawCalls} | ${r.triangles} | ${r.meanMs.toFixed(1)} | ${r.medianMs.toFixed(1)} | ${r.p95Ms.toFixed(1)} |`,
            ),
            '',
            'Headless Chromium / SwiftShader; 1280×720, DPR 1; 30 warmup + 60 sampled frames.',
            'Default free-dive spawn, chase camera, Arcade, life seed 42, dynamic resolution off.',
            'Frame ms = requestAnimationFrame interval, including GPU/browser scheduling. Geometry totals use renderer.info via __game.perf, including the High-tier post pass.',
            '',
          ].join('\n'),
        );
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}
