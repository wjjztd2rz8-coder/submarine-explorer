/**
 * Vite plugin (F1-TOUCH): after the build, stamps `public/sw.js` in the output
 * with a version and the app-shell file list. The version is a hash of the
 * emitted file names (they carry content hashes) plus index.html, so an
 * unchanged deploy keeps its caches and a changed one refreshes them.
 * The list is relative to the service worker's scope, so any `base` works.
 */

import type { Plugin, ResolvedConfig } from 'vite';

interface NodeFs {
  existsSync(p: string): boolean;
  readFileSync(p: string, enc: 'utf8'): string;
  writeFileSync(p: string, data: string): void;
}
interface NodePath {
  resolve(...parts: string[]): string;
}
interface NodeCrypto {
  createHash(alg: string): { update(d: string): { digest(enc: 'hex'): string } };
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
      const version = crypto
        .createHash('sha1')
        .update(files.join('|') + indexHtml)
        .digest('hex')
        .slice(0, 12);
      const src = fs
        .readFileSync(out, 'utf8')
        .replace('__SW_VERSION__', version)
        .replace('__SW_PRECACHE__', JSON.stringify(list));
      fs.writeFileSync(out, src);
      config.logger.info(`sw.js stamped: version ${version}, ${list.length} shell files`);
    },
  };
}
