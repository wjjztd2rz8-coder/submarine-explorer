import { defineConfig } from 'vite';

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
 * The game therefore fetches `/data/tiles/<id>/meta.json`. A symlink was chosen
 * over `publicDir: 'data'` so that `public/` stays available for real static
 * assets (favicon, textures) later, and over a custom middleware so that
 * `vite build` copies the tiles into `dist/` with no extra plumbing.
 */
export default defineConfig({
  publicDir: 'public',
  server: { port: 5173 },
  preview: { port: 4173 },
  build: { outDir: 'dist', sourcemap: true, target: 'es2022' },
});
