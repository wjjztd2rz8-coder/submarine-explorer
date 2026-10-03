/**
 * Compare only the terrain shader in frozen hero scenes, across every tier.
 * Build/start a preview first; this tool does not mutate or stash the checkout:
 *   npm run build -- --outDir dist-mip-verify
 *   npm run preview -- --port 4260 --strictPort --outDir dist-mip-verify
 *   node tools/terrain-mip-verify.mjs http://localhost:4260/
 *
 * Exact baseline: git show 40df6ec^:src/shaders/terrain.frag.glsl.
 * Output: .cache/mip-verify/ (PNG pairs, shader sources, metrics, contact sheet).
 * MIP_SITES=lost-city MIP_TIERS=high limits a diagnostic run, which is marked
 * incomplete. MIP_BEFORE_REF overrides the baseline ref for a later comparison.
 * MIP_BEFORE_SHADER can supply the extracted baseline GLSL in a shallow checkout.
 * Run on a machine that permits Chromium and a local preview server.
 */
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const heroes = [
  ['titanic', 'bow-hull'],
  ['lost-city', 'poseidon-tower'],
  ['great-blue-hole', 'karst-grotto'],
  ['beebe-vent-field', 'beebe-chimney-1'],
  ['monterey-canyon', 'canyon-wall-ledge'],
];
const tiers = ['high', 'medium', 'low'];

/** Match whole injection sections; never substitute an approximate zero bias. */
export function terrainSections(source) {
  const parts = source.split(/^[ \t]*\/\/ @(?:albedo|rough|normal)[ \t]*$/m);
  const markers = [...source.matchAll(/^[ \t]*\/\/ @(albedo|rough|normal)[ \t]*$/gm)];
  if (parts.length !== 4 || markers.map((m) => m[1]).join(',') !== 'albedo,rough,normal')
    throw new Error('Expected terrain sections: declarations, @albedo, @rough, @normal');
  return parts;
}

export function replaceTerrainShader(compiled, currentParts, baselineParts) {
  for (let i = 0; i < currentParts.length; i++) {
    const section = currentParts[i];
    if (!section || compiled.split(section).length !== 2)
      throw new Error(`Terrain injection section ${i} is missing or ambiguous`);
    compiled = compiled.replace(section, () => baselineParts[i]);
  }
  return compiled;
}

/** Screenshot-space Rec.709 luma, on sRGB bytes (0..255), not linear radiance. */
export function summarizePixels(bytes, width, height) {
  if (bytes.length !== width * height * 4 || width < 1 || height < 1)
    throw new Error('Expected full-resolution RGBA pixels');
  let whole = 0;
  let lower = 0;
  let squared = 0;
  let count = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const luma = 0.2126 * bytes[i] + 0.7152 * bytes[i + 1] + 0.0722 * bytes[i + 2];
      whole += luma;
      if (y >= Math.floor(height / 2)) {
        lower += luma;
        squared += luma * luma;
        count++;
      }
    }
  }
  const mean = lower / count;
  return {
    wholeMean: whole / (width * height),
    lowerMean: mean,
    lowerStdDev: Math.sqrt(Math.max(0, squared / count - mean * mean)),
  };
}

export function luminanceDelta(before, after) {
  const absolute = after - before;
  return { absolute, percent: before === 0 ? null : (100 * absolute) / before };
}

async function main() {
  if (process.argv.includes('--help')) {
    console.log('Usage: node tools/terrain-mip-verify.mjs [preview-url] [output-directory]');
    return;
  }
  const base = new URL(process.argv[2] ?? 'http://localhost:4260/');
  if (!['http:', 'https:'].includes(base.protocol)) throw new Error('Preview URL must be HTTP(S)');
  if (!base.pathname.endsWith('/')) base.pathname += '/';
  const output = resolve(process.argv[3] ?? '.cache/mip-verify');
  const beforeRef = process.env.MIP_BEFORE_REF ?? '40df6ec^';
  const before = process.env.MIP_BEFORE_SHADER
    ? await readFile(process.env.MIP_BEFORE_SHADER, 'utf8')
    : execFileSync('git', ['show', `${beforeRef}:src/shaders/terrain.frag.glsl`], {
        encoding: 'utf8',
      });
  const after = await readFile('src/shaders/terrain.frag.glsl', 'utf8');
  const beforeParts = terrainSections(before);
  const afterParts = terrainSections(after);
  const select = (requested, known) => {
    const values = requested ? requested.split(',') : known;
    if (
      !values.length ||
      new Set(values).size !== values.length ||
      values.some((v) => !known.includes(v))
    )
      throw new Error(`Expected a unique selection from ${known.join(',')}`);
    return values;
  };
  const sites = select(
    process.env.MIP_SITES,
    heroes.map(([site]) => site),
  );
  const selectedTiers = select(process.env.MIP_TIERS, tiers);
  const expected = sites.length * selectedTiers.length * 2;
  await mkdir(output, { recursive: true });
  await writeFile(resolve(output, 'before.frag.glsl'), before);
  await writeFile(resolve(output, 'after.frag.glsl'), after);
  const results = [];
  const failures = [];
  const report = {
    capturedAt: new Date().toISOString(),
    base: base.href,
    beforeRef,
    beforeShaderFile: process.env.MIP_BEFORE_SHADER ?? null,
    beforeHash: createHash('sha256').update(before).digest('hex'),
    afterHash: createHash('sha256').update(after).digest('hex'),
    viewport: [1280, 720],
    method:
      'Exact old/new shader sections, same frozen scene and post pass. Canvas luma excludes DOM overlays. Lower half is a fixed screen region, not a terrain-only mask.',
    results,
    failures,
    complete: false,
  };
  // Save an incomplete manifest even if browser startup fails.
  await writeFile(resolve(output, 'results.json'), JSON.stringify(report, null, 2));
  let browser;
  try {
    browser = await chromium.launch({
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    });
    for (const [site, heroId] of heroes.filter(([id]) => sites.includes(id))) {
      for (const tier of selectedTiers) {
        const context = await browser.newContext({
          viewport: { width: 1280, height: 720 },
          deviceScaleFactor: 1,
          serviceWorkers: 'block',
        });
        let stage = 'load scene';
        try {
          // Pause native callbacks without changing the game's pause/UI state.
          await context.addInitScript(() => {
            const raf = window.requestAnimationFrame.bind(window);
            const cancel = window.cancelAnimationFrame.bind(window);
            const pending = new Map();
            let id = 0;
            let paused = false;
            let lastTime = 0;
            const schedule = (key, entry) => {
              entry.native = raf((time) => {
                entry.native = null;
                if (paused) return;
                lastTime = time;
                pending.delete(key);
                entry.callback(time);
              });
            };
            window.requestAnimationFrame = (callback) => {
              const key = ++id;
              const entry = { callback, native: null };
              pending.set(key, entry);
              if (!paused) schedule(key, entry);
              return key;
            };
            window.cancelAnimationFrame = (key) => {
              const entry = pending.get(key);
              if (entry?.native != null) cancel(entry.native);
              pending.delete(key);
            };
            window.__mipFrames = {
              pause: () => {
                paused = true;
              },
              // One frame at dt=0 prepares a changed camera's lighting/LOD.
              step: () => {
                paused = true;
                const entries = [...pending];
                for (const [key, entry] of entries) {
                  if (entry.native != null) cancel(entry.native);
                  pending.delete(key);
                  entry.callback(lastTime);
                }
              },
            };
          });
          const page = await context.newPage();
          page.setDefaultTimeout(120_000);
          const errors = [];
          page.on('pageerror', (e) => errors.push(e.message));
          page.on('console', (m) => {
            if (m.type() === 'error') errors.push(m.text());
          });
          page.on('crash', () => errors.push('Chromium renderer crashed'));
          const url = new URL(base);
          url.search = new URLSearchParams({
            tile: site,
            tier,
            tutorial: '0',
            dynres: '0',
            lifeSeed: '42',
          });
          const start = Date.now();
          const response = await page.goto(url.href, { waitUntil: 'domcontentloaded' });
          if (!response?.ok()) throw new Error(`Preview returned ${response?.status()}`);
          await page.waitForFunction(() => {
            const g = window.__game;
            return window.__gameReady && g?.props.loaded && g.discovery.loaded && g.explore.ready;
          });
          await page.waitForFunction(() => {
            const g = window.__game;
            const material = g.terrain.group.children.find(
              (m) => m.material?.name === 'seabed',
            )?.material;
            const textures = Object.entries(material?.userData.uniforms ?? {}).filter(([key]) =>
              /^tAlb|^tNrm/.test(key),
            );
            return (
              textures
                .filter(([key]) => key.startsWith('tAlb'))
                .every(([, u]) => u.value.image?.width > 1) &&
              (!material?.customProgramCacheKey().includes('TERRAIN_PBR_NORMALS') ||
                textures
                  .filter(([key]) => key.startsWith('tNrm'))
                  .every(([, u]) => u.value.image?.width > 1))
            );
          });
          const readyWallSeconds = (Date.now() - start) / 1000;
          await page.evaluate(
            ({ beforeParts, afterParts, replaceSource }) => {
              const g = window.__game;
              g.sub.step = () => {};
              const m = g.terrain.group.children.find(
                (mesh) => mesh.material?.name === 'seabed',
              ).material;
              const originalCompile = m.onBeforeCompile;
              const originalKey = m.customProgramCacheKey();
              const replace = (0, eval)(`(${replaceSource})`);
              const render = g.renderer.render.bind(g.renderer);
              let calls = [];
              g.renderer.render = (scene, camera) => {
                if (scene === g.scene) calls = [];
                calls.push({ scene, camera, target: g.renderer.getRenderTarget() });
                return render(scene, camera);
              };
              window.__mipReplay = {
                draw: (variant) => {
                  m.onBeforeCompile = (shader, renderer) => {
                    originalCompile(shader, renderer);
                    // Validate that the preview was built from this exact working shader.
                    for (const section of afterParts)
                      if (!shader.fragmentShader.includes(section))
                        throw new Error('Preview shader is stale');
                    if (variant === 'before')
                      shader.fragmentShader = replace(
                        shader.fragmentShader,
                        afterParts,
                        beforeParts,
                      );
                  };
                  m.customProgramCacheKey = () => `${originalKey}-mip-verify-${variant}`;
                  m.needsUpdate = true;
                  if (!calls.length) throw new Error('No presented scene/post calls to replay');
                  for (const call of calls) {
                    g.renderer.setRenderTarget(call.target);
                    g.renderer.clear();
                    render(call.scene, call.camera);
                  }
                  g.renderer.setRenderTarget(null);
                  g.renderer.getContext().finish();
                  return g.renderer.domElement.toDataURL('image/png');
                },
              };
            },
            { beforeParts, afterParts, replaceSource: replaceTerrainShader.toString() },
          );
          await page.evaluate(async () => {
            for (let i = 0; i < 4; i++) await new Promise((done) => requestAnimationFrame(done));
            await document.fonts.ready;
            window.__mipFrames.pause();
          });
          for (const view of ['opening', 'far']) {
            stage = view;
            if (view === 'far') {
              await page.evaluate((heroId) => {
                const g = window.__game;
                const hero = g.props.placed.find((p) => p.def.id === heroId);
                if (!hero || hero.localBounds.isEmpty()) throw new Error(`Missing hero ${heroId}`);
                hero.root.updateMatrixWorld(true);
                const centre = hero.localBounds.getCenter(g.sub.position.clone());
                const half = hero.localBounds.getSize(g.sub.position.clone()).multiplyScalar(0.5);
                const axis = /^(?!.*(ledge|cliff|scarp)).+/.test(hero.def.feature ?? '');
                let chosen;
                for (let i = 0; i < 16; i++) {
                  const angle = Math.PI / 4 + (i * Math.PI) / 8;
                  const dx = Math.sin(angle),
                    dz = -Math.cos(angle);
                  const edge = axis
                    ? 0
                    : Math.min(
                        half.x / Math.max(Math.abs(dx), 1e-6),
                        half.z / Math.max(Math.abs(dz), 1e-6),
                      );
                  const target = hero.root.localToWorld(
                    centre.clone().add(g.sub.position.clone().set(dx * edge, 0, dz * edge)),
                  );
                  const direction = hero.root
                    .localToWorld(g.sub.position.clone().set(dx, 0, dz))
                    .sub(hero.root.localToWorld(g.sub.position.clone().set(0, 0, 0)))
                    .setY(0)
                    .normalize();
                  const p = target.clone().addScaledVector(direction, 40);
                  p.y = g.terrain.sampleHeight(p.x, p.z) + 15;
                  if (
                    p.y < -g.config.submarine.hullRadius &&
                    !g.props.collide(p.clone(), g.config.submarine.hullRadius, p.clone())
                  ) {
                    chosen = { target, p };
                    break;
                  }
                }
                if (!chosen) throw new Error('No clear 40 m approach');
                const { target, p } = chosen;
                const yaw = Math.atan2(target.x - p.x, -(target.z - p.z));
                g.sub.reset(p.x, p.y, p.z, yaw);
                g.sub.pitch = Math.max(
                  -g.config.submarine.maxPitch,
                  Math.min(g.config.submarine.maxPitch, Math.atan2(target.y - p.y, 40)),
                );
                g.rig.resetView();
                g.rig.setMode('first-person');
                g.rig.snap(g.sub.position, yaw, g.sub.pitch);
                const eye = g.rig.camera.position;
                g.rig.lookElevation =
                  (Math.atan2(target.y - eye.y, Math.hypot(target.x - eye.x, target.z - eye.z)) -
                    g.sub.pitch) /
                  0.55;
                g.rig.snap(g.sub.position, yaw, g.sub.pitch);
              }, heroId);
            }
            await page.evaluate(() => window.__mipFrames.step());
            const pose = await page.evaluate(() => {
              const g = window.__game;
              const gl = g.renderer.getContext();
              const debug = gl.getExtension('WEBGL_debug_renderer_info');
              return {
                tier: g.perf.tier,
                pixelRatio: g.perf.pixelRatio,
                dynamicResolution: g.perf.dynamicResolution,
                sub: g.sub.position.toArray(),
                yaw: g.sub.yaw,
                pitch: g.sub.pitch,
                camera: g.rig.camera.position.toArray(),
                quaternion: g.rig.camera.quaternion.toArray(),
                mode: g.rig.mode,
                props: { ...g.props.stats },
                renderer: debug
                  ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
                  : gl.getParameter(gl.RENDERER),
              };
            });
            if (
              pose.tier !== tier ||
              pose.dynamicResolution ||
              pose.pixelRatio !== 1 ||
              pose.props.failed ||
              pose.props.skipped ||
              !pose.props.full
            )
              throw new Error(`Unexpected quality or incomplete props: ${JSON.stringify(pose)}`);
            const pair = {};
            for (const variant of ['before', 'after', 'repeat']) {
              const png = await page.evaluate(
                (variant) => window.__mipReplay.draw(variant === 'repeat' ? 'after' : variant),
                variant,
              );
              const filename = `${site}-${tier}-${view}-${variant}`;
              await writeFile(
                resolve(output, `${filename}-canvas.png`),
                Buffer.from(png.split(',')[1], 'base64'),
              );
              if (variant !== 'repeat')
                await page.screenshot({
                  path: resolve(output, `${filename}.png`),
                  timeout: 30_000,
                });
              const stats = await page.evaluate(
                async ({ png, summarizeSource }) => {
                  const img = new Image();
                  img.src = png;
                  await img.decode();
                  const canvas = document.createElement('canvas');
                  canvas.width = img.width;
                  canvas.height = img.height;
                  const ctx = canvas.getContext('2d');
                  ctx.drawImage(img, 0, 0);
                  const summarize = (0, eval)(`(${summarizeSource})`);
                  return summarize(
                    ctx.getImageData(0, 0, img.width, img.height).data,
                    img.width,
                    img.height,
                  );
                },
                { png, summarizeSource: summarizePixels.toString() },
              );
              pair[variant] = {
                filename: `${filename}.png`,
                canvas: `${filename}-canvas.png`,
                hash: createHash('sha256').update(png).digest('hex'),
                ...stats,
              };
            }
            if (pair.after.hash !== pair.repeat.hash)
              throw new Error('Frozen replay is not pixel-identical; pair rejected');
            if (pair.after.wholeMean < 3) throw new Error('Near-black frame; pair rejected');
            if (errors.length) throw new Error(errors.join('; '));
            results.push({
              site,
              heroId,
              tier,
              view,
              readyWallSeconds,
              pose,
              ...pair,
              wholeDelta: luminanceDelta(pair.before.wholeMean, pair.after.wholeMean),
              lowerDelta: luminanceDelta(pair.before.lowerMean, pair.after.lowerMean),
              visualReview:
                'pending: inspect aliasing, far-terrain blandness and opening hero readability',
            });
            console.log(
              `${site}/${tier}/${view}: lower luma ${pair.before.lowerMean.toFixed(3)} -> ${pair.after.lowerMean.toFixed(3)}`,
            );
          }
        } catch (error) {
          failures.push({ site, tier, stage, message: error.message });
          console.error(`${site}/${tier}/${stage}: ${error.message.split('\n')[0]}`);
        } finally {
          await context.close();
        }
      }
    }
  } catch (error) {
    failures.push({ stage: 'browser startup', message: error.message });
    console.error(error.message.split('\n')[0]);
  } finally {
    if (browser) await browser.close();
    report.complete = failures.length === 0 && results.length === 30 && expected === 30;
    await writeFile(resolve(output, 'results.json'), JSON.stringify(report, null, 2));
    const rows = results.map(
      (r) =>
        `| ${r.site} | ${r.tier} | ${r.view} | ${r.before.lowerMean.toFixed(3)} | ${r.after.lowerMean.toFixed(3)} | ${r.lowerDelta.absolute.toFixed(3)} | ${r.lowerDelta.percent?.toFixed(3) ?? 'n/a'}% |`,
    );
    await writeFile(
      resolve(output, 'results.md'),
      [
        `Capture matrix: ${report.complete ? 'COMPLETE' : 'INCOMPLETE'}; visual review pending.`,
        '',
        '| Site | Tier | View | Before lower luma | After lower luma | Delta | Delta % |',
        '| --- | --- | --- | ---: | ---: | ---: | ---: |',
        ...rows,
        '',
        report.method,
        'Readability and far-detail judgments require inspection; luma alone cannot establish either.',
        ...failures.map(
          (f) => `Failure: ${f.site ?? ''}/${f.tier ?? ''}/${f.stage}: ${f.message.split('\n')[0]}`,
        ),
        '',
      ].join('\n'),
    );
    await writeFile(
      resolve(output, 'index.html'),
      `<!doctype html><html lang="en"><meta charset="utf-8"><title>Terrain mip verification</title>
<style>body{background:#081522;color:#eef;font:16px system-ui;margin:24px}section{display:grid;grid-template-columns:1fr 1fr;gap:12px}img{width:100%}figure{margin:0}a{color:#adf}</style>
<h1>Terrain mip verification: ${report.complete ? 'capture matrix complete' : 'INCOMPLETE'}</h1><p>Visual review pending. <a href="results.md">Luminance deltas</a> · <a href="results.json">Manifest and failures</a></p>
${results.map((r) => `<h2>${r.site} · ${r.tier} · ${r.view}</h2><section>${['before', 'after'].map((v) => `<figure><a href="${r[v].filename}"><img src="${r[v].filename}" alt="${r.site} ${r.tier} ${r.view} ${v}"></a><figcaption>${v} · lower luma ${r[v].lowerMean.toFixed(3)}</figcaption></figure>`).join('')}</section>`).join('\n')}</html>`,
    );
    console.log(`Report: ${resolve(output, 'results.md')}`);
    if (!report.complete) process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  await main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
