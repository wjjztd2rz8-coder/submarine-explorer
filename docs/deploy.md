# Deploying Submarine Explorer

The game is a static site: `npm run build` writes HTML, JS, CSS, models and the
bathymetry tiles to `dist/`, and any static host can serve it. The repository
ships two GitHub Actions workflows. CI checks every push and pull request, and
deploy publishes `dist/` to GitHub Pages. Nothing is published until the
repository owner does the one-time setup below.

## 1. Continuous integration (`.github/workflows/ci.yml`)

Runs on every push to `main` and every pull request targeting `main`. A newer
push to the same branch or PR cancels the older run (`concurrency`). One job on
`ubuntu-latest`, with a 60-minute timeout:

| Step                                                                            | Command                                       |
| ------------------------------------------------------------------------------- | --------------------------------------------- |
| Install                                                                         | `npm ci` (Node 22, npm cache)                 |
| Python pipeline tests                                                           | `python3 -m unittest discover -s tools/tests` |
| Typecheck and build                                                             | `npm run build`                               |
| Unit tests                                                                      | `npm test`                                    |
| Browser                                                                         | `npx playwright install --with-deps chromium` |
| End-to-end                                                                      | `npm run test:e2e -- --reporter=list,html`    |
| Attribution                                                                     | `python3 tools/check_attribution.py`          |
| Formatting                                                                      | `npx prettier --check .`                      |
| On failure: upload `tests/e2e/screenshots`, `playwright-report`, `test-results` | `actions/upload-artifact` (14 days)           |

GitHub runners have no GPU, so Chromium renders WebGL on SwiftShader. The GPU
flags in `playwright.config.ts` are harmless there. The suite runs with one
worker; locally it takes about 2–3 minutes, and CI can take several times
longer. The tiles are committed, so e2e needs no network access.

To reproduce CI locally, run `npm run ci`, which runs the same checks in order
after `npm ci`. When other people or agents share the checkout, use the isolated
form from `CONTRIBUTING-AGENTS.md` (`--outDir dist-<you>`,
`PW_PORT`/`PW_OUTDIR`) instead.

## 2. Enabling GitHub Pages (owner, once)

1. Push the repository to GitHub (public, per `plan/DECISIONS.md`).
2. **Settings → Pages → Build and deployment → Source: "GitHub Actions".**
   No branch or folder needs to be selected.
3. **Settings → Actions → General → Workflow permissions**: the default
   read-only token is enough. `deploy.yml` requests `pages: write` and
   `id-token: write` itself.
4. Push to `main`, or run **Actions → Deploy to GitHub Pages → Run workflow**.
   The site appears at `https://<owner>.github.io/<repo>/`, and the URL is
   shown on the `github-pages` environment.

`deploy.yml` runs when CI completes successfully for a push to `main` in this
repository (`workflow_run`), and it checks out the exact commit that CI
tested. It can also be run by hand (`workflow_dispatch`); a manual run does not
wait for CI. The workflow runs the attribution check, builds, and fails if
`dist/` contains anything that must not ship. It then uploads `dist/` with
`actions/upload-pages-artifact` and deploys it with `actions/deploy-pages`.
Only one deployment runs at a time. `public/.nojekyll` ships in `dist/`; it
only matters if you ever switch to branch-based publishing.

## 3. `VITE_BASE` and custom domains

`vite.config.ts` reads `base` from `VITE_BASE` (default `/`). A project site is
served from a sub-path, so the deploy workflow builds with
`VITE_BASE=/<repo>/`, taking the repository name from
`github.event.repository.name`.

- **Custom domain** (e.g. `seafloor.example.org`), or a repository named
  `<owner>.github.io`: the site is served from `/`. Add a repository
  **variable** (not a secret) `PAGES_BASE` with the value `/` under
  **Settings → Secrets and variables → Actions → Variables**. The workflow
  uses it in place of `/<repo>/`. Then set the domain under Settings → Pages →
  Custom domain, add the DNS record GitHub shows, and tick "Enforce HTTPS".
- **Local check of a sub-path build**:
  `VITE_BASE=/submarine-explorer/ npm run build -- --outDir dist-base`, then
  `npx vite preview --outDir dist-base` and open
  `http://localhost:4173/submarine-explorer/`.

> **Known blocker for sub-path hosting (tracked for a `src/` fix).** Vite
> prefixes the base onto the URLs in `index.html` and the bundled JS/CSS, but
> not onto runtime `fetch` / loader URLs written as string literals. Several
> modules build URLs from root-absolute constants (`'/data/tiles'`,
> `'/data/landmarks'`, `'/data/landmarks.json'`, `'/assets/models/'`,
> `'/assets/decoders/draco/'`, `'/assets/globe/…'`). Under `/<repo>/` those
> requests go to `https://<owner>.github.io/data/...` and 404. The fix is to
> build them from `import.meta.env.BASE_URL`, which always ends in `/`, e.g.
> `` `${import.meta.env.BASE_URL}data/tiles` ``, and to resolve site-relative
> paths from JSON content (`props.json` `"model": "/assets/models/x.glb"`) the
> same way at load time. Until that lands, deploy with `PAGES_BASE=/`
> (custom domain or `<owner>.github.io` repository).

## 4. What ships, and how big it is

`vite.config.ts` turns off Vite's own public-dir copy
(`build.copyPublicDir: false`) and copies `public/` itself, following the
`public/data -> ../data` symlink, with a filter. These never reach `dist/`:

- `data/tiles/_samples/` (the raw GMRT sample now lives in `tools/fixtures/`);
- `*.gz` / `*.br` pre-compressed tile copies (`tools/compress_tiles.py`);
- `heightmap16.bin` (the opt-in uint16 variant; `TileLoader` uses it only with
  `prefer16`, which is off, and falls back to float32 without it).

`npm run dev` and `vite preview` are unchanged. With 14 tiles, `dist/` is about
**40 MB**: `dist/data` about 29 MB (float32 `heightmap.bin` + `meta.json` per
tile, plus landmark content), and `dist/assets` about 11 MB (bundle, source
maps, GLB models, Draco decoder, globe texture). Before the filter,
`dist/data` was 76 MB. GitHub Pages allows a published site of up to 1 GB, and
individual files in the repository must stay under 100 MB.

## 5. Caching

GitHub Pages cannot set custom response headers, so it uses its own short
default cache lifetime. Hosts that read a `_headers` file (Netlify,
Cloudflare Pages) pick up `public/_headers`, which ships in `dist/` and is
ignored by Pages:

```
/data/tiles/:id/heightmap.bin
  Cache-Control: public, max-age=31536000, immutable
/data/tiles/:id/meta.json
  Cache-Control: public, max-age=31536000, immutable
```

This relies on a rule: **tiles are immutable by path**. Once a tile id has
been published, its `heightmap.bin` and `meta.json` are never rewritten in
place. If a site is re-surveyed or re-fetched with different data, publish it
under a new id, or remove these rules before deploying the change.
`/data/tiles/index.json` is deliberately left out because it changes every time
a tile is added, and the landmark content under `/data/landmarks/` is edited
often too. After the first deploy on such a host, check that the rules
apply with
`curl -sI https://<site>/data/tiles/titanic/heightmap.bin | grep -i cache-control`.
If your host ignores `:id` placeholders, use its config file (e.g.
`netlify.toml` `[[headers]]`) with the equivalent paths.

## 6. Adding a tile without breaking CI

1. Fetch and inspect it as in the README ("How to add a tile").
2. Commit `data/tiles/<id>/heightmap.bin`, `data/tiles/<id>/meta.json` and the
   regenerated `data/tiles/index.json`. The `.gz` and `heightmap16.bin` copies
   are gitignored and excluded from the build. Keep `heightmap.bin` well under
   GitHub's 100 MB file limit (the current largest is about 6 MB).
3. Pick a new id rather than overwriting a published tile (see "Caching").
4. Run `npm run ci` (or the isolated commands) before opening the PR. The smoke
   spec boots `titanic` and `monterey-canyon`; `SMOKE_TILE=<id> npm run
test:e2e` boots yours.
5. Any new file under `public/assets/` or `public/audio/` needs a row in
   `ATTRIBUTION.md` (next section).

## 7. What the attribution check enforces

`tools/check_attribution.py` (`npm run check:attribution`, stdlib only,
`--help` for options) walks `public/assets/**` and `public/audio/**`. Every
file's name must appear in `ATTRIBUTION.md` as a whole word; the path is
optional, so either `rock_09.glb` or `public/assets/models/rock_09.glb` passes.
`public/assets/decoders/` (vendored Draco decoder) is exempt file by file, but
the folder itself must be mentioned. OS litter (`.DS_Store`, `.gitkeep`) is
ignored. It exits 1 with the list of unattributed files, or 2 if
`ATTRIBUTION.md` is missing. CI runs it, and so does the deploy workflow before
building. It checks that a row exists, not that the licence is compatible;
reviewers still check the licence against `plan/DECISIONS.md`.

## 8. Licences

- **Code**: MIT, see `LICENSE`.
- **Original content** (the text in `data/landmarks/**`, and the docs): CC BY-SA
  4.0, see `LICENSE-CONTENT.md`.
- **Bathymetry**: GMRT (CC BY 4.0) with GEBCO fill. The citation must stay with
  the tiles; it is in each `meta.json` and shown in the HUD.
- **Third-party assets** (models, imagery, fonts, audio, vendored code): their
  own licences, listed in `ATTRIBUTION.md`.
