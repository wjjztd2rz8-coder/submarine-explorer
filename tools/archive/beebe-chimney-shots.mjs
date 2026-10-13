/**
 * Dev capture for the three Beebe chimneys (beebe-chimney-1..3) plus the spawn view.
 *
 * Usage: npm run build, serve dist with `vite preview --port 4472`, then
 *   node tools/beebe-chimney-shots.mjs <out-dir> <prefix> [base-url]
 * Env: GOLDEN_TIER=low|medium|high (default high).
 * Ranges 42 m (far) and 26 m (near). Writes <out-dir>/<prefix>-spawn.png and <prefix>-c<N>-<far|near>.png (1600x900).
 */
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const [outDir, prefix, baseArg] = process.argv.slice(2);
if (!outDir || !prefix)
  throw new Error('Usage: node tools/beebe-chimney-shots.mjs <out> <prefix> [url]');
const base = baseArg ?? 'http://localhost:4472/submarine-explorer/';
const tier = process.env.GOLDEN_TIER ?? 'high';
await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const q = new URLSearchParams({
  tile: 'beebe-vent-field',
  tutorial: '0',
  tier,
  lifeSeed: '42',
  dynres: '0',
});
await page.goto(`${base}?${q}`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(
  () => window.__gameReady && window.__game?.props.loaded && window.__game?.discovery.loaded,
  null,
  { timeout: 180000 },
);
await page.evaluate(() => window.__game.terrain.texturesReady);
await page.evaluate(() => {
  window.__game.sub.step = () => {};
});
const settle = () =>
  page.evaluate(
    () =>
      new Promise((d) => {
        let n = 0;
        const f = () => (++n < 8 ? requestAnimationFrame(f) : d());
        requestAnimationFrame(f);
      }),
  );
const snap = async (name) => {
  await settle();
  await page.screenshot({ path: resolve(outDir, `${prefix}-${name}.png`), timeout: 180000 });
  const perf = await page.evaluate(() => ({
    d: window.__game.perf.drawCalls,
    t: window.__game.perf.triangles,
  }));
  console.log(name, JSON.stringify(perf));
};
await snap('spawn');
for (const [n, id] of [
  [1, 'beebe-chimney-1'],
  [2, 'beebe-chimney-2'],
  [3, 'beebe-chimney-3'],
]) {
  for (const [label, range] of [
    ['far', 42],
    ['near', 26],
  ]) {
    const ok = await page.evaluate(
      ({ id, range }) => {
        const g = window.__game;
        const hero = g.props.placed.find((p) => p.def.id === id);
        hero.root.updateMatrixWorld(true);
        const H = hero.def.dimensionsM[2];
        const c = hero.root.position.clone();
        const top = hero.localBounds.max.y;
        const ty = c.y + Math.min(top, H * 1.4) * 0.5;
        for (let i = 0; i < 16; i++) {
          const a = Math.PI / 4 + (i * Math.PI) / 8;
          const x = c.x + Math.sin(a) * range;
          const z = c.z - Math.cos(a) * range;
          const y = Math.max(g.terrain.sampleHeight(x, z) + 6, ty - 2);
          const p = g.sub.position.clone().set(x, y, z);
          if (g.props.collide(p.clone(), g.config.submarine.hullRadius, p.clone())) continue;
          const yaw = Math.atan2(c.x - x, -(c.z - z));
          g.sub.reset(x, y, z, yaw);
          g.sub.pitch = Math.atan2(ty - y, range);
          g.rig.resetView();
          g.rig.setMode('first-person');
          g.rig.snap(g.sub.position, yaw, g.sub.pitch);
          const e = g.rig.camera.position;
          g.rig.lookElevation =
            (Math.atan2(ty - e.y, Math.hypot(c.x - e.x, c.z - e.z)) - g.sub.pitch) / 0.55;
          g.rig.snap(g.sub.position, yaw, g.sub.pitch);
          return true;
        }
        return false;
      },
      { id, range },
    );
    if (!ok) {
      console.log('no clear pose', id, label);
      continue;
    }
    await snap(`c${n}-${label}`);
  }
}
if (errors.length) console.error(errors);
await browser.close();
