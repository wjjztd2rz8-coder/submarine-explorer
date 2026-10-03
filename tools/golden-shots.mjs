/**
 * Capture the five hero sites for nightly visual review; never builds or starts a server.
 *
 * Usage (from the repo root, with Node on PATH):
 *   npm run build
 *   npm run preview
 *   node tools/golden-shots.mjs [http://localhost:4173/]
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
 * Output: .cache/golden/<UTC YYYY-MM-DD-HHMMSS>/<site>-<1|2|3>.png + index.html.
 * GOLDEN_SITES=lost-city,beebe-vent-field limits the run to those sites.
 * Chromium uses SwiftShader so the tool also works without a physical GPU.
 */
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log(
      'Usage: node tools/golden-shots.mjs [base-url | --base-url URL] (default http://localhost:4173/)',
    );
    return;
  }
  if (
    (args[0] === '--base-url' && (args.length !== 2 || !args[1])) ||
    (args[0] !== '--base-url' && (args.length > 1 || args[0]?.startsWith('-')))
  )
    throw new Error('Usage: node tools/golden-shots.mjs [base-url | --base-url URL]');
  let base = new URL(args[0] === '--base-url' ? args[1] : (args[0] ?? 'http://localhost:4173/'));
  if (!['http:', 'https:'].includes(base.protocol)) throw new Error('Base URL must be HTTP(S).');
  if (!base.pathname.endsWith('/')) base.pathname += '/';
  base.search = '';
  base.hash = '';
  const stamp = new Date().toISOString().slice(0, 19).replace('T', '-').replaceAll(':', '');
  const output = resolve('.cache/golden', stamp);
  const only = process.env.GOLDEN_SITES?.split(',').map((site) => site.trim());
  const heroes = [
    ['titanic', 'bow-hull'],
    ['lost-city', 'poseidon-tower'],
    ['great-blue-hole', 'karst-grotto'],
    ['beebe-vent-field', 'beebe-chimney-1'],
    ['monterey-canyon', 'canyon-wall-ledge'],
  ].filter(([site]) => !only || only.includes(site));
  if (!heroes.length || only?.some((site) => !heroes.some(([id]) => id === site)))
    throw new Error(`Unknown or empty GOLDEN_SITES: ${process.env.GOLDEN_SITES}`);
  await mkdir(output, { recursive: true });
  const captures = [];
  const failures = [];
  let browser;
  let baseResolved = false;
  let stage = 'launch Chromium';
  async function bounded(label, operation, timeout = 120_000) {
    let timer;
    try {
      return await Promise.race([
        operation,
        new Promise((_, reject) => {
          timer = setTimeout(
            () => reject(new Error(`${label} timed out after ${timeout} ms`)),
            timeout,
          );
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }
  async function settle(page) {
    await bounded(
      'settle rendered frames',
      page.evaluate(
        () =>
          new Promise((done) => {
            let frames = 0;
            const next = () => (++frames >= 8 ? done() : requestAnimationFrame(next));
            requestAnimationFrame(next);
          }),
      ),
    );
  }
  try {
    browser = await chromium.launch({
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    });
    for (const [site, heroId] of heroes) {
      stage = `${site}: create context`;
      const context = await browser.newContext({
        viewport: { width: 1600, height: 900 },
        deviceScaleFactor: 1,
        serviceWorkers: 'block',
      });
      try {
        // Hold the last presented frame during capture so SwiftShader does not
        // continually queue WebGL work ahead of Chromium's screenshot readback.
        // Resume the queued callbacks afterwards; no game/render settings change.
        await context.addInitScript(() => {
          const raf = window.requestAnimationFrame.bind(window);
          const cancel = window.cancelAnimationFrame.bind(window);
          const pending = new Map();
          let nextId = 0;
          let paused = false;
          const schedule = (id, entry) => {
            entry.nativeId = raf((now) => {
              entry.nativeId = null;
              if (paused) return;
              pending.delete(id);
              entry.callback(now);
            });
          };
          window.requestAnimationFrame = (callback) => {
            const id = ++nextId;
            const entry = { callback, nativeId: null };
            pending.set(id, entry);
            if (!paused) schedule(id, entry);
            return id;
          };
          window.cancelAnimationFrame = (id) => {
            const entry = pending.get(id);
            if (entry?.nativeId !== null && entry?.nativeId !== undefined) cancel(entry.nativeId);
            pending.delete(id);
          };
          window.__goldenFrames = {
            pause: () => {
              paused = true;
            },
            resume: () => {
              paused = false;
              for (const [id, entry] of pending) if (entry.nativeId === null) schedule(id, entry);
            },
          };
        });
        const page = await context.newPage();
        page.setDefaultTimeout(120_000);
        const evaluate = (...args) => bounded(stage, page.evaluate(...args));
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('crash', () => errors.push('Chromium renderer crashed'));
        stage = `${site}: navigate preview`;
        // Vite returns a helpful link (rather than a redirect) at / when preview
        // has a project base. Follow that link before waiting on game hooks.
        if (!baseResolved) {
          const response = await context.request.get(base.href, { timeout: 30_000 });
          const body = await response.text();
          if (body.includes('The server is configured with a public base URL')) {
            const href = body.match(/<a\s[^>]*href=["']([^"']+)["']/i)?.[1];
            if (!href) throw new Error('Preview base warning has no destination');
            const destination = new URL(href, base);
            if (destination.origin !== base.origin)
              throw new Error('Preview base must stay on the same origin');
            base = destination;
            if (!base.pathname.endsWith('/')) base.pathname += '/';
          } else if (!response.ok()) {
            throw new Error(`Preview returned HTTP ${response.status()} for ${base.href}`);
          }
          await response.dispose();
          baseResolved = true;
          console.log(`Preview base: ${base.href}`);
        }
        const url = new URL(base);
        url.search = new URLSearchParams({ tile: site, tutorial: '0', tier: 'high' }).toString();
        const loaded = await page.goto(url.href, {
          waitUntil: 'domcontentloaded',
          timeout: 120_000,
        });
        if (!loaded?.ok())
          throw new Error(`Preview returned HTTP ${loaded?.status()} for ${url.href}`);
        stage = `${site}: load game and props`;
        console.log(stage);
        await page.waitForFunction(
          () =>
            window.__gameReady && window.__game?.props.loaded && window.__game?.discovery.loaded,
          null,
          { timeout: 120_000 },
        );
        await settle(page);
        await evaluate(() => {
          // Freeze translation, pitch and ballast; keep normal lighting/render updates.
          window.__game.sub.step = () => {};
        });
        const capture = async (n, range) => {
          stage = `${site}: capture ${n}`;
          console.log(stage);
          await settle(page);
          if (errors.length) throw new Error(`${site}: ${errors.join('; ')}`);
          const filename = `${site}-${n}.png`;
          const pose = await evaluate(() => {
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
          if (pose.tier !== 'high')
            throw new Error(`${site}: expected high tier, got ${pose.tier}`);
          if (pose.failedProps)
            throw new Error(`${site}: ${pose.failedProps} props failed to load`);
          await bounded(
            'wait for fonts',
            page.evaluate(() => document.fonts.ready.then(() => {})),
          );
          await evaluate(() => window.__goldenFrames.pause());
          let captureMethod = 'playwright';
          let png;
          try {
            try {
              png = await page.screenshot({
                caret: 'initial',
                timeout: 30_000,
              });
            } catch (error) {
              if (page.isClosed() || errors.length) throw error;
              console.warn(
                `${filename}: normal screenshot failed; trying Chromium viewport capture (${error.message.split('\n')[0]})`,
              );
              const session = await context.newCDPSession(page);
              try {
                const { data } = await bounded(
                  'Chromium viewport capture',
                  session.send('Page.captureScreenshot', {
                    format: 'png',
                    fromSurface: false,
                    captureBeyondViewport: false,
                  }),
                  30_000,
                );
                png = Buffer.from(data, 'base64');
                captureMethod = 'cdp-viewport';
              } finally {
                await bounded('detach capture session', session.detach(), 5_000).catch(() => {});
              }
            }
          } finally {
            await bounded(
              'resume render loop',
              page.evaluate(() => window.__goldenFrames.resume()),
            );
          }
          if (errors.length) throw new Error(`${site}: ${errors.join('; ')}`);
          if (
            png.length < 24 ||
            png.toString('hex', 0, 8) !== '89504e470d0a1a0a' ||
            png.readUInt32BE(16) !== 1600 ||
            png.readUInt32BE(20) !== 900
          )
            throw new Error(`${filename}: capture is not a 1600 × 900 PNG`);
          await writeFile(resolve(output, filename), png);
          captures.push({ site, heroId, filename, range, captureMethod, ...pose });
          console.log(`${filename} (${pose.hull}, ${pose.tier})`);
        };
        await capture(1, null);
        stage = `${site}: choose approach`;
        const approach = await evaluate((propId) => {
          const g = window.__game;
          const hero = g.props.placed.find((p) => p.def.id === propId);
          if (!hero || hero.localBounds.isEmpty())
            throw new Error(`Missing hero bounds: ${propId}`);
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
        const closeRange = await evaluate(
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
          stage = `${site}: position ${n}`;
          await evaluate(
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
      } catch (error) {
        failures.push({ site, stage, message: error.message });
        console.error(`${stage}: ${error.message.split('\n')[0]}`);
      } finally {
        await bounded('close site context', context.close(), 10_000).catch((error) => {
          failures.push({ site, stage: 'close context', message: error.message });
        });
      }
    }
  } catch (error) {
    failures.push({ stage, message: error.message });
    console.error(`${stage}: ${error.message.split('\n')[0]}`);
  } finally {
    if (browser)
      await bounded('close Chromium', browser.close(), 10_000).catch((error) => {
        failures.push({ stage: 'close Chromium', message: error.message });
      });
    // Keep a reviewable partial sheet if a site fails; exit status still reports failure.
    await writeFile(
      resolve(output, 'poses.json'),
      JSON.stringify(
        { base: base.href, stamp, complete: failures.length === 0, failures, captures },
        null,
        2,
      ),
    );
    await writeFile(
      resolve(output, 'index.html'),
      `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Golden shots ${stamp}</title><style>
body{margin:24px;background:#081522;color:#e6f0f7;font:16px system-ui}main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}figure{margin:0}img{width:100%;height:auto}a{color:inherit}figcaption{padding:8px 0}@media(max-width:800px){main{grid-template-columns:1fr}}
</style><h1>Golden shots · ${stamp} UTC</h1><p>${failures.length ? `INCOMPLETE: ${failures.length} failure(s). ` : ''}High tier · 1600 × 900 · fresh Arcade profile. 1: spawn; 2: 40 m; 3: 15 m (30 m for axis-framed set pieces). <a href="poses.json">Pose manifest and failures</a></p>
<main>${captures.map(({ filename, site, range }) => `<figure><a href="${filename}"><img loading="lazy" src="${filename}" alt="${site}, ${range === null ? 'default spawn' : `${range} m approach`}"></a><figcaption>${filename}</figcaption></figure>`).join('\n')}</main></html>`,
    );
    console.log(`Contact sheet: ${resolve(output, 'index.html')}`);
    if (failures.length) process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`Golden shots: ${error.message}`);
  process.exitCode = 1;
});
