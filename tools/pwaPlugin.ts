/**
 * Vite plugin (F1-TOUCH): after the build, stamps `public/sw.js` in the output
 * with a version and the app-shell file list. The version hashes the worker,
 * shipped files outside the persistent tile cache, emitted names and index.html, so an
 * unchanged deploy keeps its caches and a changed one refreshes them.
 * The list is relative to the service worker's scope, so any `base` works.
 */

import type { Plugin, ResolvedConfig } from 'vite';

interface NodeFs {
  existsSync(p: string): boolean;
  readFileSync(p: string, enc: 'utf8'): string;
  readFileSync(p: string): Uint8Array;
  readdirSync(
    p: string,
    opts: { withFileTypes: true },
  ): Array<{
    name: string;
    isDirectory(): boolean;
    isFile(): boolean;
  }>;
  writeFileSync(p: string, data: string): void;
}
interface NodePath {
  resolve(...parts: string[]): string;
}
interface NodeCrypto {
  createHash(alg: string): {
    update(d: string | Uint8Array): ReturnType<NodeCrypto['createHash']>;
    digest(enc: 'hex'): string;
  };
}

/** Files that are copied from `public/` and belong to the shell. */
const STATIC_SHELL = [
  'manifest.webmanifest',
  'favicon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-192.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
];

export function pwaPlugin(): Plugin {
  let config: ResolvedConfig;
  const shell: string[] = [];
  let indexHtml = '';
  return {
    name: 'submarine:pwa',
    apply: 'build',
    configResolved(c) {
      config = c;
    },
    generateBundle(_options, bundle) {
      shell.length = 0;
      for (const [name, item] of Object.entries(bundle)) {
        if (name.endsWith('.map')) continue;
        if (name === 'index.html' && item.type === 'asset') indexHtml = String(item.source);
        if (/\.(js|css|html)$/.test(name)) shell.push(name);
      }
    },
    async closeBundle() {
      const fs = (await import('node:fs' as string)) as NodeFs;
      const path = (await import('node:path' as string)) as NodePath;
      const crypto = (await import('node:crypto' as string)) as NodeCrypto;
      const out = path.resolve(config.root, config.build.outDir, 'sw.js');
      if (!fs.existsSync(out)) return;
      const files = [...shell, ...STATIC_SHELL].filter(
        (f) => f === 'index.html' || !f.startsWith('sw.'),
      );
      // `./` is the navigation URL of the shell; it resolves to index.html.
      const list = ['', ...files];
      const template = fs.readFileSync(path.resolve(config.publicDir, 'sw.js'), 'utf8');
      // Mutable mission/model files are versioned too: a content-only deploy
      // must refresh ASSETS even when bundled JS/CSS filenames are unchanged.
      const hash = crypto.createHash('sha1').update(files.join('|') + indexHtml + template);
      const outputDir = path.resolve(config.root, config.build.outDir);
      const hashFiles = (relative: string): void => {
        const entries = fs.readdirSync(path.resolve(outputDir, relative), { withFileTypes: true });
        entries.sort((a, b) => a.name.localeCompare(b.name, 'en'));
        for (const entry of entries) {
          const name = relative ? `${relative}/${entry.name}` : entry.name;
          // Tile ids are immutable and live in TILES across deployments.
          if (name === 'data/tiles' || name === 'sw.js' || name.endsWith('.map')) continue;
          if (entry.isDirectory()) hashFiles(name);
          else if (entry.isFile())
            hash.update(name).update(fs.readFileSync(path.resolve(outputDir, name)));
        }
      };
      hashFiles('');
      const version = hash.digest('hex').slice(0, 12);
      const src = template
        .replace('__SW_VERSION__', version)
        .replace('__SW_PRECACHE__', JSON.stringify(list));
      fs.writeFileSync(out, src);
      config.logger.info(`sw.js stamped: version ${version}, ${list.length} shell files`);
    },
  };
}
