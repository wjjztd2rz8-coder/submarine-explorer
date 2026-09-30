import { defineConfig, type Plugin, type ResolvedConfig } from 'vite';
import { pwaPlugin } from './tools/pwaPlugin.js';

/**
 * Static data serving
 * -------------------
 * Tiles live in `data/tiles/<id>/` at the repo root so the Python pipeline can
 * write them without knowing anything about the web app. Vite serves whatever
 * is in `publicDir` verbatim at the site root, so we point publicDir at
 * `public/`, which contains a single symlink:
 *
 *     public/data -> ../data
 *
 * The game therefore fetches `<base>data/tiles/<id>/meta.json`. A symlink was
 * chosen over `publicDir: 'data'` so that `public/` stays available for real
 * static assets (favicon, models), and over a custom middleware so that
 * `vite build` copies the tiles into `dist/` with no extra plumbing.
 *
 * Deployment (plan/PHASE-C-CONTRACTS.md §6, docs/deploy.md)
 * ----------------------------------------------------------
 * - `base` comes from `VITE_BASE` (default `/`). GitHub Pages project sites are
 *   served from `/<repo>/`, so the deploy workflow sets `VITE_BASE=/<repo>/`.
 * - The build copies `public/` itself (see `copyPublicFiltered`) so that files
 *   the game never requests stay out of `dist/`. Dev and preview serving are
 *   unchanged: `vite` still serves all of `public/`.
 */

// Read env without pulling in @types/node just for one variable (same trick as
// playwright.config.ts).
const env =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};

/** Normalise `VITE_BASE` to `/`, `/x/` or a full URL ending in `/`. */
function resolveBase(raw: string | undefined): string {
  const v = (raw ?? '').trim();
  if (v === '' || v === '/') return '/';
  if (v === '.' || v === './') return './';
  if (/^https?:\/\//i.test(v)) return v.endsWith('/') ? v : `${v}/`;
  const trimmed = v.replace(/^\/+|\/+$/g, '');
  return `/${trimmed}/`;
}

/**
 * Paths (relative to `public/`, forward slashes) that must not ship:
 * - `data/tiles/_samples/`: raw pipeline samples (moved to tools/fixtures/).
 * - `*.gz` / `*.br`: pre-compressed tile copies from tools/compress_tiles.py;
 *   hosts compress on the fly and the loader never requests them.
 * - `heightmap16.bin`: opt-in uint16 variant (`TileLoader` `prefer16`, off by
 *   default; the loader falls back to float32 when it is absent).
 */
function isExcludedFromBuild(relPath: string): boolean {
  const p = relPath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (p === 'data/tiles/_samples' || p.startsWith('data/tiles/_samples/')) return true;
  if (/\.(gz|br)$/i.test(p)) return true;
  return /(^|\/)heightmap16\.bin$/.test(p);
}

// Minimal shapes of the node built-ins we use; avoids a dependency on @types/node.
interface NodeFs {
  existsSync(p: string): boolean;
  cpSync(
    src: string,
    dest: string,
    opts: {
      recursive: boolean;
      dereference: boolean;
      force: boolean;
      errorOnExist: boolean;
      filter: (src: string) => boolean;
    },
  ): void;
}
interface NodePath {
  resolve(...parts: string[]): string;
  relative(from: string, to: string): string;
}

/**
 * Replaces Vite's own public-dir copy (`build.copyPublicDir: false`) with a
 * filtered one. Symlinks are dereferenced (public/data -> ../data), and files
 * already written by the bundle are never overwritten, which matches Vite's
 * precedence for name clashes.
 */
function copyPublicFiltered(): Plugin {
  let config: ResolvedConfig;
  return {
    name: 'submarine:copy-public-filtered',
    apply: 'build',
    configResolved(c) {
      config = c;
    },
    async writeBundle() {
      const fs = (await import('node:fs' as string)) as NodeFs;
      const path = (await import('node:path' as string)) as NodePath;
      const publicDir = config.publicDir;
      if (!publicDir || !fs.existsSync(publicDir)) return;
      const outDir = path.resolve(config.root, config.build.outDir);
      let skipped = 0;
      fs.cpSync(publicDir, outDir, {
        recursive: true,
        dereference: true,
        force: false,
        errorOnExist: false,
        filter: (src) => {
          const rel = path.relative(publicDir, src);
          if (rel !== '' && isExcludedFromBuild(rel)) {
            skipped++;
            return false;
          }
          return true;
        },
      });
      config.logger.info(`public/ copied to ${config.build.outDir} (${skipped} excluded paths)`);
    },
  };
}

/**
 * three's DRACOLoader and KTX2Loader name default decoder URLs with
 * `new URL('../libs/…', import.meta.url)`, which makes the bundler emit a
 * second, hashed copy of every decoder file next to the vendored ones in
 * `public/assets/decoders/`. The game always sets the decoder path
 * (`src/core/assets/AssetService.ts`), so blank those defaults out.
 */
function stripLoaderDefaultDecoderUrls(): Plugin {
  const target = /three\/examples\/jsm\/loaders\/(DRACOLoader|KTX2Loader)\.js$/;
  const defaultUrl =
    /new URL\(\s*'\.\.\/libs\/(?:draco|basis)\/[^']+',\s*import\.meta\.url\s*\)\.toString\(\)/g;
  return {
    name: 'submarine:strip-loader-default-decoder-urls',
    enforce: 'pre',
    transform(code, id) {
      if (!target.test(id.replace(/\\/g, '/'))) return null;
      return { code: code.replace(defaultUrl, "''"), map: null };
    },
  };
}

export default defineConfig({
  base: resolveBase(env.VITE_BASE),
  publicDir: 'public',
  plugins: [stripLoaderDefaultDecoderUrls(), copyPublicFiltered(), pwaPlugin()],
  server: { port: 5173 },
  preview: { port: 4173 },
  build: { outDir: 'dist', sourcemap: true, target: 'es2022', copyPublicDir: false },
});
