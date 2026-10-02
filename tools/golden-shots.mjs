/**
 * Capture the five hero sites for nightly visual review; never builds or starts a server.
 *
 * Usage (from the repo root, with Node on PATH):
 *   npm run build
 *   npm run preview -- --port 4298 --strictPort
 *   node tools/golden-shots.mjs [http://localhost:4298/]
 *   node tools/golden-shots.mjs --base-url http://localhost:4298/submarine-explorer/
 *
 * Fresh, independent browser contexts; Arcade defaults, high tier, tutorial off.
 * 1600×900 PNGs: 1 = default free-dive spawn (chase); 2 = 40 m from the
 * hero footprint (or axis, for vent set pieces), 15 m above the seabed; 3 = 15 m from it (30 m
 * for set pieces), at the same altitude.
 * Approach/detail use the cockpit camera aimed at the hero. Bearings are searched
 * in a fixed order for one clear side at BOTH distances, using actual prop bounds.
 * The submarine's physics step is frozen after loading to hold each exact pose.
 * A pose manifest accompanies the contact sheet for reproducible comparisons.
 * Output: .cache/golden/<UTC YYYY-MM-DD-HHMM>/<site>-<1|2|3>.png + index.html.
 * GOLDEN_SITES=lost-city,beebe-vent-field limits the run to those sites.
 * Chromium uses SwiftShader so the tool also works without a physical GPU.
 */
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: node tools/golden-shots.mjs [base-url] (default http://localhost:4298/)');
  process.exit(0);
}
const base = new URL(args[0] === '--base-url' ? args[1] : (args[0] ?? 'http://localhost:4298/'));
if (!['http:', 'https:'].includes(base.protocol)) throw new Error('Base URL must be HTTP(S).');
const stamp = new Date().toISOString().slice(0, 16).replace('T', '-').replace(':', '');
const output = resolve('.cache/golden', stamp);
await mkdir(output, { recursive: true });
const only = process.env.GOLDEN_SITES?.split(',');
const heroes = [
  ['titanic', 'bow-hull'],
  ['lost-city', 'poseidon-tower'],
  ['great-blue-hole', 'karst-grotto'],
  ['beebe-vent-field', 'beebe-chimney-1'],
  ['monterey-canyon', 'canyon-wall-ledge'],
].filter(([site]) => !only || only.includes(site));
const captures = [];
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
async function settle(page) {
  await page.evaluate(
    () =>
      new Promise((done) => {
        let frames = 0;
        const next = () => (++frames >= 8 ? done() : requestAnimationFrame(next));
        requestAnimationFrame(next);
      }),
  );
}
try {
  for (const [site, heroId] of heroes) {
    const context = await browser.newContext({
      viewport: { width: 1600, height: 900 },
      deviceScaleFactor: 1,
    });
    try {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const url = new URL(base);
      url.search = new URLSearchParams({ tile: site, tutorial: '0', tier: 'high' }).toString();
      await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 120_000 });
      await page.waitForFunction(
        () => window.__gameReady && window.__game?.props.loaded && window.__game?.discovery.loaded,
        null,
        { timeout: 120_000 },
      );
      await settle(page);
      await page.evaluate(() => {
        // Freeze translation, pitch and ballast; keep normal lighting/render updates.
        window.__game.sub.step = () => {};
      });
      const capture = async (n, range) => {
        await settle(page);
        if (errors.length) throw new Error(`${site}: ${errors.join('; ')}`);
        const filename = `${site}-${n}.png`;
        const pose = await page.evaluate(() => {
          const g = window.__game;
          return {
            position: g.sub.position.toArray(),
            yaw: g.sub.yaw,
            pitch: g.sub.pitch,
            camera: g.rig.camera.position.toArray(),
            view: g.rig.mode,
            tier: g.perf.tier,
            hull: g.sub.getState().hullClass,
            failedProps: g.props.stats.failed,
          };
        });
        if (pose.tier !== 'high') throw new Error(`${site}: expected high tier, got ${pose.tier}`);
        await page.screenshot({ path: resolve(output, filename), timeout: 90_000 });
        captures.push({ site, heroId, filename, range, ...pose });
        console.log(`${filename} (${pose.hull}, ${pose.tier})`);
      };
      await capture(1, null);
      const approach = await page.evaluate((propId) => {
        const g = window.__game;
        const hero = g.props.placed.find((p) => p.def.id === propId);
        if (!hero || hero.localBounds.isEmpty()) throw new Error(`Missing hero bounds: ${propId}`);
        hero.root.updateMatrixWorld(true);
        // Vent set pieces are framed from their axis; wall scarps from their footprint edge.
        const axis = /^(?!.*(ledge|cliff|scarp)).+/.test(hero.def.feature ?? '');
        const centre = hero.localBounds.getCenter(g.sub.position.clone());
        const half = hero.localBounds.getSize(g.sub.position.clone()).multiplyScalar(0.5);
        if (hero.def.model === 'procedural:chimney' && hero.def.dimensionsM?.[2])
          centre.y = Math.max(hero.localBounds.min.y, 0) + hero.def.dimensionsM[2] * 0.45;
        for (let i = 0; i < 16; i++) {
          const angle = Math.PI / 4 + (i * Math.PI) / 8;
          const dx = Math.sin(angle),
            dz = -Math.cos(angle);
          // Sprawling vent set pieces (a feature) are framed from their axis, not their footprint edge.
          const edge = axis
            ? 0
            : Math.min(
                half.x / Math.max(Math.abs(dx), 1e-6),
                half.z / Math.max(Math.abs(dz), 1e-6),
              );
          const target = hero.root.localToWorld(
            centre.clone().add(g.sub.position.clone().set(dx * edge, 0, dz * edge)),
          );
          const direction = axis
            ? hero.root
                .localToWorld(g.sub.position.clone().set(dx, 0, dz))
                .sub(hero.root.localToWorld(g.sub.position.clone().set(0, 0, 0)))
                .setY(0)
                .normalize()
            : target.clone().sub(hero.root.localToWorld(centre.clone())).setY(0).normalize();
          if (direction.lengthSq() < 0.5) continue;
          const clear = (axis ? [40, 30] : [40, 15]).every((range) => {
            const p = target.clone().addScaledVector(direction, range);
            p.y = g.terrain.sampleHeight(p.x, p.z) + 15;
            return (
              p.y < -g.config.submarine.hullRadius &&
              !g.props.collide(p.clone(), g.config.submarine.hullRadius, p.clone())
            );
          });
          if (clear) return { target: target.toArray(), direction: direction.toArray() };
        }
        throw new Error(`No clear fixed approach for ${propId}`);
      }, heroId);
      // A feature set piece is framed from its axis, so its close shot stays outside the spires.
      const closeRange = await page.evaluate(
        (propId) =>
          (window.__game.props.placed.find((p) => p.def.id === propId)?.def.feature ?? '').match(
            /^(?!.*(ledge|cliff|scarp)).+/,
          )
            ? 30
            : 15,
        heroId,
      );
      for (const [n, range] of [
        [2, 40],
        [3, closeRange],
      ]) {
        await page.evaluate(
          ({ target, direction, range }) => {
            const g = window.__game;
            const x = target[0] + direction[0] * range;
            const z = target[2] + direction[2] * range;
            const y = g.terrain.sampleHeight(x, z) + 15;
            const yaw = Math.atan2(target[0] - x, -(target[2] - z));
            g.sub.reset(x, y, z, yaw);
            g.sub.pitch = Math.max(
              -g.config.submarine.maxPitch,
              Math.min(g.config.submarine.maxPitch, Math.atan2(target[1] - y, range)),
            );
            g.rig.resetView();
            g.rig.setMode('first-person');
            g.rig.snap(g.sub.position, yaw, g.sub.pitch);
            const eye = g.rig.camera.position;
            const pitch = Math.atan2(
              target[1] - eye.y,
              Math.hypot(target[0] - eye.x, target[2] - eye.z),
            );
            g.rig.lookElevation = (pitch - g.sub.pitch) / 0.55;
            g.rig.snap(g.sub.position, yaw, g.sub.pitch);
          },
          { ...approach, range },
        );
        await capture(n, range);
      }
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  // Keep a reviewable partial sheet if a site fails; exit status still reports failure.
  await writeFile(
    resolve(output, 'poses.json'),
    JSON.stringify({ base: base.href, stamp, captures }, null, 2),
  );
  await writeFile(
    resolve(output, 'index.html'),
    `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Golden shots ${stamp}</title><style>
body{margin:24px;background:#081522;color:#e6f0f7;font:16px system-ui}main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}figure{margin:0}img{width:100%;height:auto}a{color:inherit}figcaption{padding:8px 0}@media(max-width:800px){main{grid-template-columns:1fr}}
</style><h1>Golden shots · ${stamp} UTC</h1><p>High tier · 1600 × 900 · fresh Arcade profile. 1: spawn; 2: 40 m; 3: 15 m. <a href="poses.json">Pose manifest</a></p>
<main>${captures.map(({ filename, site, range }) => `<figure><a href="${filename}"><img loading="lazy" src="${filename}" alt="${site}, ${range === null ? 'default spawn' : `${range} m approach`}"></a><figcaption>${filename}</figcaption></figure>`).join('\n')}</main></html>`,
  );
  console.log(`Contact sheet: ${resolve(output, 'index.html')}`);
}
