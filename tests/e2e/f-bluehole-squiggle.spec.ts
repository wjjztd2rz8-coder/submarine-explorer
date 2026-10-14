import { clockFramesUntil, pauseClockBeforeNavigation } from './helpers/clock.js';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { execFile } from 'node:child_process';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { dirname, resolve } from 'node:path';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import process from 'node:process';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { promisify } from 'node:util';
import { build as bundleConfig } from 'rolldown';
import { build, preview } from 'vite';
import { expect, test } from './helpers/unlocked.js';
import type { Submarine } from '../../src/sub/Submarine.js';
import type { CameraRig } from '../../src/sub/CameraRig.js';
import type { Terrain } from '../../src/world/Terrain.js';
import type { Props } from '../../src/world/Props.js';

interface FloorGame {
  sub: Submarine;
  rig: CameraRig;
  terrain: Terrain;
  props: Props;
}
interface FloorFramesWindow {
  __floorFrames: { pause(): void; resume(): void };
}

const run = promisify(execFile);
const sources = [
  'src/core/config/props.ts',
  'src/world/props/geo/stalactites.ts',
  'src/world/props/geo/talus.ts',
];
interface Capture {
  filename: string;
  position: number[];
  yaw: number;
  pitch: number;
  lookElevation: number;
  tier: string;
  failedProps: number;
  triangles: number;
  heroGeometry: Array<{ id: string; meshes: Array<{ vertices: number }> }>;
}
interface Manifest {
  complete: boolean;
  failures: unknown[];
  captures: Capture[];
}

function floorMaterials() {
  const g = window.__game as unknown as FloorGame;
  const hero = g.props.placed.find((p) => p.def.id === 'karst-grotto')!;
  const apron = hero.full.getObjectByName('grotto-sediment-apron') as import('three').Mesh;
  const material = apron.material as import('three').MeshStandardMaterial;
  const seabed = g.terrain.group.children.find(
    (o) => (o as import('three').Mesh).isMesh,
  ) as import('three').Mesh;
  const uniforms = (seabed.material as import('three').Material).userData.uniforms;
  return {
    apronMap: !!material.map,
    apronBump: !!material.bumpMap,
    terrainContrast: uniforms.uContrast.value.toArray(),
    terrainNormalStrength: uniforms.uNormalStrength.value,
  };
}

function assertFloorMaterials(evidence: ReturnType<typeof floorMaterials>): void {
  expect(evidence.apronMap).toBe(false);
  expect(evidence.apronBump).toBe(false);
  expect(evidence.terrainContrast).toEqual([0, 0, 0]);
  expect(evidence.terrainNormalStrength).toBe(0);
}

// Guard the contour-map regression without invoking golden captures in push CI.
test('Blue Hole: mapless sediment and neutral terrain material', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await pauseClockBeforeNavigation(page);
  await page.goto('/?tile=great-blue-hole&tier=high&tutorial=0&dynres=0');
  await clockFramesUntil(
    page,
    () => !!(window.__gameReady && (window.__game as unknown as FloorGame).props.loaded),
  );
  await page.evaluate(() => (window.__game as unknown as FloorGame).terrain.texturesReady);
  await page.clock.fastForward(16);
  assertFloorMaterials(await page.evaluate(floorMaterials));
  expect(errors).toEqual([]);
});

// This is also the review harness: full gates run the actual golden tool on
// HEAD and the working sources, then isolate the floor's material paths at pose 2.
test('Blue Hole: golden sediment terraces, brightness and floor material bisect @render', async ({
  page,
  baseURL,
}, testInfo) => {
  test.setTimeout(720_000);
  const folder = resolve('.cache/bluehole-squiggle');
  await mkdir(folder, { recursive: true });
  const { stdout: baseline } = await run('git', ['rev-parse', 'HEAD']);
  const { stdout: changed } = await run('git', ['diff', '--name-only', 'HEAD', '--', ...sources]);

  async function capture(base: string, label: string): Promise<Manifest> {
    const { stdout } = await run(process.execPath, ['tools/golden-shots.mjs', '--base-url', base], {
      env: {
        ...process.env,
        GOLDEN_SITES: 'great-blue-hole',
        GOLDEN_LAYOUTS: 'desktop',
        GOLDEN_TIER: 'high',
        GOLDEN_MODE: 'free-dive',
      },
      timeout: 300_000,
      maxBuffer: 2 * 1024 * 1024,
    });
    const sheet = stdout.match(/Contact sheet: (.+)/)?.[1]?.trim();
    expect(sheet, stdout).toBeTruthy();
    const output = dirname(sheet!);
    const manifest = JSON.parse(await readFile(resolve(output, 'poses.json'), 'utf8')) as Manifest;
    expect(manifest.complete).toBe(true);
    expect(manifest.failures).toEqual([]);
    expect(manifest.captures).toHaveLength(5);
    for (const shot of manifest.captures) {
      expect(shot.tier).toBe('high');
      expect(shot.failedProps).toBe(0);
      expect(shot.triangles).toBeGreaterThan(0);
      await copyFile(resolve(output, shot.filename), resolve(folder, `${label}-${shot.filename}`));
    }
    return manifest;
  }

  let before: Manifest | undefined;
  if (changed.trim()) {
    const originals = new Map<string, string>();
    for (const file of sources) {
      const { stdout } = await run('git', ['show', `HEAD:${file}`]);
      originals.set(resolve(file), stdout);
    }
    const configFile = resolve(folder, 'vite.config.mjs');
    await bundleConfig({
      input: 'vite.config.ts',
      platform: 'node',
      external: ['vite'],
      output: { file: configFile, format: 'esm' },
    });
    const outDir = resolve(folder, 'before-dist');
    await build({
      configFile,
      configLoader: 'native',
      logLevel: 'warn',
      build: { outDir },
      plugins: [{ name: '1280-original-apron', enforce: 'pre', load: (id) => originals.get(id) }],
    });
    const server = await preview({
      configFile,
      configLoader: 'native',
      build: { outDir },
      preview: { host: '127.0.0.1', port: 0, strictPort: false, open: false },
    });
    try {
      before = await capture(server.resolvedUrls!.local[0], 'before');
    } finally {
      await server.close();
    }
  }
  const after = await capture(baseURL!, 'after');
  for (const shot of after.captures) {
    const previous = before?.captures.find((p) => p.filename === shot.filename);
    // Preserve every solid's tessellation; terrace shape and rock seats may change.
    if (previous)
      expect(shot.heroGeometry.map((p) => p.meshes.map((m) => m.vertices))).toEqual(
        previous.heroGeometry.map((p) => p.meshes.map((m) => m.vertices)),
      );
  }

  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  // Hold the presented WebGL frame during screenshot readback, as golden-shots
  // does, so SwiftShader does not continually queue frames ahead of the capture.
  await page.addInitScript(() => {
    const raf = window.requestAnimationFrame.bind(window);
    let paused = false;
    const pending: FrameRequestCallback[] = [];
    window.requestAnimationFrame = (callback) =>
      raf((now) => {
        if (paused) pending.push(callback);
        else callback(now);
      });
    (window as unknown as FloorFramesWindow).__floorFrames = {
      pause: () => {
        paused = true;
      },
      resume: () => {
        paused = false;
        for (const callback of pending.splice(0)) raf(callback);
      },
    };
  });
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto(`${baseURL}/?tile=great-blue-hole&tier=high&tutorial=0&lifeSeed=42&dynres=0`);
  await page.waitForFunction(
    () => window.__gameReady && (window.__game as unknown as FloorGame).props.loaded,
  );
  await page.evaluate(() => (window.__game as unknown as FloorGame).terrain.texturesReady);
  const pose = after.captures.find((p) => p.filename === 'great-blue-hole-2.png')!;
  await page.evaluate((p) => {
    const g = window.__game as unknown as FloorGame;
    g.sub.step = () => {};
    g.sub.reset(p.position[0], p.position[1], p.position[2], p.yaw);
    g.sub.pitch = p.pitch;
    g.rig.resetView();
    g.rig.setMode('first-person');
    g.rig.lookElevation = p.lookElevation;
    g.rig.snap(g.sub.position, p.yaw, p.pitch);
  }, pose);
  const materialEvidence = await page.evaluate(floorMaterials);
  assertFloorMaterials(materialEvidence);

  // Each ablation starts from the production state. Recover the original rock
  // canvas from the blocks; divide by its mean to keep the diagnosis equally lit.
  for (const pass of ['complete', 'terrain-detail-off', 'apron-hidden', 'apron-rock-map']) {
    await page.evaluate((pass) => {
      const g = window.__game as unknown as FloorGame;
      const hero = g.props.placed.find((p) => p.def.id === 'karst-grotto')!;
      const apron = hero.full.getObjectByName('grotto-sediment-apron') as import('three').Mesh;
      const material = apron.material as import('three').MeshStandardMaterial;
      const seabed = g.terrain.group.children.find(
        (o) => (o as import('three').Mesh).isMesh,
      ) as import('three').Mesh;
      const uniforms = (seabed.material as import('three').Material).userData.uniforms;
      const state = (apron.userData.bisect ??= {
        color: material.color.clone(),
        ripple: uniforms.uRipple.value,
        burrow: uniforms.uBurrow.value,
        detail: uniforms.uRockDetail.value,
      });
      material.color.copy(state.color);
      material.map = null;
      material.bumpMap = null;
      apron.visible = pass !== 'apron-hidden';
      uniforms.uRipple.value = pass === 'terrain-detail-off' ? 0 : state.ripple;
      uniforms.uBurrow.value = pass === 'terrain-detail-off' ? 0 : state.burrow;
      uniforms.uRockDetail.value = pass === 'terrain-detail-off' ? 0 : state.detail;
      if (pass === 'apron-rock-map') {
        const blocks = hero.full.getObjectByName('fallen-blocks') as import('three').Mesh;
        const map = (blocks.material as import('three').MeshStandardMaterial).map!;
        material.map = material.bumpMap = map;
        material.color.multiplyScalar(1 / map.userData.meanLinear);
      }
      material.needsUpdate = true;
    }, pass);
    await page.evaluate(
      () =>
        new Promise<void>((done) => {
          let frames = 0;
          const next = () => (++frames < 4 ? requestAnimationFrame(next) : done());
          requestAnimationFrame(next);
        }),
    );
    const path = resolve(folder, `bisect-${pass}.png`);
    await page.evaluate(() => (window as unknown as FloorFramesWindow).__floorFrames.pause());
    try {
      await page.screenshot({ path, timeout: 30_000 });
    } finally {
      await page.evaluate(() => (window as unknown as FloorFramesWindow).__floorFrames.resume());
    }
    await testInfo.attach(pass, { path });
  }
  expect(errors).toEqual([]);

  let brightness: unknown;
  if (before) {
    const pair = await Promise.all(
      ['before', 'after'].map(async (label) =>
        (await readFile(resolve(folder, `${label}-great-blue-hole-2.png`))).toString('base64'),
      ),
    );
    const means = await page.evaluate(
      async (pair: string[]) =>
        Promise.all(
          pair.map(async (png) => {
            const image = new Image();
            image.src = `data:image/png;base64,${png}`;
            await image.decode();
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            const context = canvas.getContext('2d')!;
            context.drawImage(image, 0, 0);
            // Visible central sediment; excludes cockpit, HUD, ceiling and side awnings.
            const data = context.getImageData(420, 520, 680, 200).data;
            let sum = 0;
            for (let i = 0; i < data.length; i += 4)
              sum += data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;
            return sum / (data.length / 4);
          }),
        ),
      pair,
    );
    brightness = { before: means[0], after: means[1], ratio: means[1] / means[0] };
    // Small allowance for moving snow/caustics in otherwise identical golden poses.
    expect(means[1]).toBeGreaterThanOrEqual(means[0] * 0.97);
  }
  await writeFile(
    resolve(folder, 'comparison.json'),
    JSON.stringify(
      {
        baselineCommit: baseline.trim(),
        before,
        after,
        materialEvidence,
        brightness,
      },
      null,
      2,
    ),
  );
  await testInfo.attach('comparison', { path: resolve(folder, 'comparison.json') });
  await writeFile(
    resolve(folder, 'index.html'),
    `<!doctype html><html lang="en"><meta charset="utf-8">
<title>Blue Hole floor material bisect</title><style>body{background:#081522;color:#e6f0f7;font:16px system-ui;margin:24px}main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}img{width:100%}figure{margin:0}figcaption{padding:8px}</style>
<h1>Blue Hole sediment floor</h1><p>Baseline ${baseline.trim()}. <a href="comparison.json">Poses, materials and brightness</a>.</p><main>${[
      ...after.captures.flatMap((shot) =>
        (before ? ['before', 'after'] : ['after']).map((label) => `${label}-${shot.filename}`),
      ),
      ...['complete', 'terrain-detail-off', 'apron-hidden', 'apron-rock-map'].map(
        (pass) => `bisect-${pass}.png`,
      ),
    ]
      .map(
        (file) =>
          `<figure><img src="${file}" alt="${file}"><figcaption>${file}</figcaption></figure>`,
      )
      .join('')}</main></html>`,
  );
});
