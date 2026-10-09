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

const run = promisify(execFile);
const changedSources = [
  'src/world/terrainFeatures.ts',
  'src/world/TerrainBiome.ts',
  'src/world/Terrain.ts',
  'src/core/config/terrain.ts',
];

interface Capture {
  filename: string;
  tier: string;
  triangles: number;
  failedProps: number;
  terrain: { vertices: number; subdivisionCounts?: Record<number, number> };
  heroGeometry: unknown;
}
interface Manifest {
  complete: boolean;
  failures: unknown[];
  captures: Capture[];
}

// Use the actual golden tool and authored poses. On an uncommitted visual task,
// a load-only plugin supplies HEAD's four original sources to an isolated build;
// the checkout is never rewritten. A clean CI checkout needs only the new capture.
test('1030 Blue Hole: desktop + portrait Low golden comparison and frame budgets', async ({
  baseURL,
}, testInfo) => {
  test.setTimeout(720_000);
  const local = resolve('.cache/f1030');
  const shots = resolve('.cache/codex/shots/1030-f-bluehole-horizon-ledges');
  await mkdir(local, { recursive: true });
  await mkdir(shots, { recursive: true });
  const { stdout: commit } = await run('git', ['rev-parse', 'HEAD']);
  const { stdout: changed } = await run('git', [
    'diff',
    '--name-only',
    'HEAD',
    '--',
    ...changedSources,
  ]);

  async function capture(base: string, label: string) {
    const { stdout } = await run(process.execPath, ['tools/golden-shots.mjs', '--base-url', base], {
      env: {
        ...process.env,
        GOLDEN_SITES: 'great-blue-hole',
        GOLDEN_LAYOUTS: 'desktop,portrait',
        GOLDEN_TIER: 'low',
        GOLDEN_MODE: 'free-dive',
      },
      timeout: 300_000,
      maxBuffer: 2 * 1024 * 1024,
    });
    console.log(stdout);
    const sheet = stdout.match(/Contact sheet: (.+)/)?.[1]?.trim();
    expect(sheet).toBeTruthy();
    const folder = dirname(sheet!);
    const manifest = JSON.parse(await readFile(resolve(folder, 'poses.json'), 'utf8')) as Manifest;
    expect(manifest.complete).toBe(true);
    expect(manifest.failures).toEqual([]);
    expect(manifest.captures).toHaveLength(10);
    for (const shot of manifest.captures) {
      expect(shot.tier).toBe('low');
      expect(shot.failedProps).toBe(0);
      expect(shot.triangles).toBeGreaterThan(0);
      expect(shot.triangles, shot.filename).toBeLessThan(500_000);
      await copyFile(resolve(folder, shot.filename), resolve(local, `${label}-${shot.filename}`));
    }
    await writeFile(resolve(local, `${label}-poses.json`), JSON.stringify(manifest, null, 2));
    await testInfo.attach(`${label}-poses`, { path: resolve(local, `${label}-poses.json`) });
    return manifest;
  }

  let before: Manifest | undefined;
  if (changed.trim()) {
    const originals = new Map<string, string>();
    for (const file of changedSources) {
      const { stdout } = await run('git', ['show', `HEAD:${file}`]);
      originals.set(resolve(file), stdout);
    }
    const configFile = resolve(local, 'vite.config.mjs');
    await bundleConfig({
      input: 'vite.config.ts',
      platform: 'node',
      external: ['vite'],
      output: { file: configFile, format: 'esm' },
    });
    const outDir = resolve(local, 'before-dist');
    await build({
      configFile,
      configLoader: 'native',
      logLevel: 'warn',
      build: { outDir },
      plugins: [{ name: '1030-original-sources', enforce: 'pre', load: (id) => originals.get(id) }],
    });
    const server = await preview({
      configFile,
      configLoader: 'native',
      build: { outDir },
      preview: { host: '127.0.0.1', port: 0, strictPort: false, open: false },
    });
    try {
      const url = server.resolvedUrls?.local[0];
      expect(url).toBeTruthy();
      before = await capture(url!, 'before');
    } finally {
      await server.close();
    }
  }

  const after = await capture(baseURL!, 'after');
  for (const shot of after.captures) {
    expect(shot.terrain.vertices).toBeLessThan(500_000);
    expect(shot.terrain.subdivisionCounts?.[16]).toBeGreaterThan(0);
    const previous = before?.captures.find((p) => p.filename === shot.filename);
    if (previous) expect(shot.heroGeometry, shot.filename).toEqual(previous.heroGeometry);
  }
  await writeFile(
    resolve(local, 'comparison.json'),
    JSON.stringify({ baselineCommit: commit.trim(), before, after }, null, 2),
  );
  await writeFile(
    resolve(local, 'index.html'),
    `<!doctype html><html lang="en"><meta charset="utf-8"><title>1030 Blue Hole Low</title>
<style>body{background:#081522;color:#e6f0f7;font:16px system-ui;margin:24px}main{display:grid;grid-template-columns:repeat(${before ? 2 : 1},minmax(0,1fr));gap:16px}figure{margin:0}img{width:100%}figcaption{padding:8px}</style>
<h1>Blue Hole · Low · desktop + portrait</h1><p>Baseline ${commit.trim()}. <a href="comparison.json">Poses and budgets</a>.</p>
<main>${after.captures.map((shot) => (before ? ['before', 'after'] : ['after']).map((label) => `<figure><img src="${label}-${shot.filename}" alt="${label} ${shot.filename}"><figcaption>${label} ${shot.filename}</figcaption></figure>`).join('')).join('')}</main></html>`,
  );
  // Six review images are picked up by codex-task.sh's next-round feedback.
  for (const filename of [
    'great-blue-hole-1.png',
    'great-blue-hole-portrait-1.png',
    'great-blue-hole-portrait-3.png',
  ]) {
    for (const label of before ? ['before', 'after'] : ['after']) {
      await copyFile(
        resolve(local, `${label}-${filename}`),
        resolve(shots, `${label}-${filename}`),
      );
    }
  }
  await testInfo.attach('Blue Hole Low comparison', { path: resolve(local, 'comparison.json') });
});
