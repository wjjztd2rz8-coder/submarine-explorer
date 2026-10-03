// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import * as fs from 'node:fs';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { tmpdir } from 'node:os';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { join } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import type { ResolvedConfig } from 'vite';
import { pwaPlugin } from '../../tools/pwaPlugin.js';

const { copyFileSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = fs;

const temporary: string[] = [];
afterEach(() => {
  for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true });
});

it('refreshes the cache version when worker logic, shell or mutable content changes', async () => {
  const root = mkdtempSync(join(tmpdir(), 'subexp-pwa-')) as string;
  temporary.push(root);
  const publicDir = join(root, 'public');
  const outDir = join(root, 'dist');
  mkdirSync(publicDir);
  for (const name of ['sw.js', 'manifest.webmanifest', 'favicon.svg'])
    copyFileSync(`public/${name}`, join(publicDir, name));
  cpSync('public/icons', join(publicDir, 'icons'), { recursive: true });
  cpSync(publicDir, outDir, { recursive: true });
  const plugin = pwaPlugin();
  if (
    typeof plugin.configResolved !== 'function' ||
    typeof plugin.generateBundle !== 'function' ||
    typeof plugin.closeBundle !== 'function'
  )
    throw new Error('Expected callable plugin hooks');
  const closeBundle = plugin.closeBundle;
  plugin.configResolved.call(
    {} as never,
    {
      root,
      publicDir,
      build: { outDir: 'dist' },
      logger: { info: vi.fn() },
    } as unknown as ResolvedConfig,
  );
  await plugin.generateBundle.call(
    {} as never,
    {} as never,
    {
      'index.html': { type: 'asset', source: '<html>shell</html>' },
      'assets/app-hash.js': { type: 'chunk' },
    } as never,
    false,
  );
  const stamp = async () => {
    await closeBundle.call({} as never);
    const output = readFileSync(join(outDir, 'sw.js'), 'utf8') as string;
    expect(output).not.toContain('__SW_VERSION__');
    expect(output).not.toContain('__SW_PRECACHE__');
    return output.match(/const VERSION = '([^']+)'/)![1];
  };
  const initial = await stamp();
  expect(await stamp()).toBe(initial);
  writeFileSync(
    join(publicDir, 'sw.js'),
    `${readFileSync('public/sw.js', 'utf8')}\n// worker logic changed\n`,
  );
  const workerChanged = await stamp();
  expect(workerChanged).not.toBe(initial);
  writeFileSync(join(outDir, 'manifest.webmanifest'), '{"name":"Updated shell"}');
  const shellChanged = await stamp();
  expect(shellChanged).not.toBe(workerChanged);
  mkdirSync(join(outDir, 'data/landmarks/titanic'), { recursive: true });
  writeFileSync(join(outDir, 'data/landmarks/titanic/mission.json'), '{"hint":"New content"}');
  const contentChanged = await stamp();
  expect(contentChanged).not.toBe(shellChanged);
  mkdirSync(join(outDir, 'data/tiles'), { recursive: true });
  writeFileSync(join(outDir, 'data/tiles/index.json'), '{"tiles":[]}');
  expect(await stamp()).toBe(contentChanged);
});

it.each(['https://example.test/', 'https://example.test/submarine-explorer/'])(
  'resolves the manifest start URL, scope and icons under %s',
  (base) => {
    const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8')) as {
      start_url: string;
      scope: string;
      id: string;
      orientation: string;
      icons: Array<{ src: string }>;
    };
    const url = new URL('manifest.webmanifest', base);
    expect(new URL(manifest.start_url, url).href).toBe(base);
    expect(new URL(manifest.scope, url).href).toBe(base);
    expect(new URL(manifest.id, url).href).toBe(base);
    expect(manifest.orientation).toBe('landscape');
    for (const icon of manifest.icons) {
      expect(new URL(icon.src, url).href.startsWith(base)).toBe(true);
      expect(readFileSync(`public/${icon.src}`).byteLength).toBeGreaterThan(0);
    }
  },
);
