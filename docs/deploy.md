# Deploying Bathyline

The game is a static site: `npm run build` writes HTML, JS, CSS, models and the
bathymetry tiles to `dist/`, and any static host can serve it. The repository
ships two GitHub Actions workflows. CI checks every push and pull request, and
deploy publishes `dist/` to GitHub Pages. Nothing is published until the
repository owner does the one-time setup below.

## 1. Continuous integration (`.github/workflows/ci.yml`)

Runs on every push to `main` and every pull request targeting `main`. A newer
push to a PR cancels its older run (`concurrency`); main runs finish so each
merge has a completed result to inspect. Jobs use
Node 22 and npm caching; browser jobs use `ubuntu-24.04` to keep rendering and
fonts stable across `ubuntu-latest` migrations. Build/static/deploy jobs retain
`ubuntu-latest`. Playwright installs Chromium **and OS dependencies** on every
browser runner, including cache hits:

| Job                     | Gates                                                                                  | Job limit        |
| ----------------------- | -------------------------------------------------------------------------------------- | ---------------- |
| Build and static checks | Python tests, strict mission content, one typecheck, unit tests, attribution, Prettier | 15 min           |
| Builds (two bases)      | One Vite build each for `/` and `/submarine-explorer/`, manifest and artifact upload   | 15 min per base  |
| E2e (38 shards)         | Download/validate root artifact, Chromium install, balanced full Playwright suite      | 30 min per shard |
| Project-base            | Download/validate project-base artifact, Chromium install, all eight base cases        | 15 min           |

Both browser consumers depend on the completed build matrix; static checks run
independently and remain required. Each complete Vite output is an immutable v4
artifact named `ci-build-<run_id>-<run_attempt>-<root|project-base>`. The embedded
`ci-build-manifest.json` binds the output to the workflow SHA, lockfile SHA-256,
exact Node version, deployment base and outdir. Consumers reject mismatches,
missing essential files and symlinks before starting a preview. Builds include
portable copies of public data/tiles, models, fonts and PWA files. Root shards
serve `PW_OUTDIR=dist-root`; project-base serves `dist-project-base` with
`VITE_BASE`/`PW_BASE=/submarine-explorer/` and port 4211. Consumers never build
or typecheck, and a failed producer prevents dependent browser jobs from running.

GitHub runners have no GPU, so Chromium renders WebGL on SwiftShader. Each
shard retains one browser worker, CI's low-tier preference, existing per-test
limits and zero hosted retries (the workflow overrides Playwright's CI default).
`--fully-parallel` enables test-level sharding even for
large files; one worker still executes tests sequentially on each runner.
The shard denominator is derived from the matrix size. Root E2e has a 25-minute
suite budget and finishes the shard after test failures; `fail-fast: false`
lets other shards finish too. Timeouts and incomplete suites fail CI. A
successful run must pass every job and all existing tests, including the
separate project-base check (eight-minute suite budget).

Chromium is cached by OS, architecture and lockfile hash. Every browser job
runs `tools/install-playwright-chromium.sh` even on cache hits to ensure OS
dependencies, with three bounded attempts, back-off and an eight-minute step
limit. Failure screenshots and reports are uploaded for 14 days;
all shards upload their JSON timings. The tiles are committed, so game data
needs no network access. Hosted queue, artifact-transfer and dependency delays
still require measurement before claiming wall-time savings.

To reproduce CI locally after `npm ci`, run `npm run ci`. It delegates to
`tools/gates.sh --full-e2e`, the canonical ordered gate list: Python, strict
content, build/typecheck, unit, root browser, project-base build/browser,
attribution and formatting. CI selects runner phases instead of duplicating
command lists. Local runs build once per base into isolated outputs under
`.cache/runs/<id>/`; `.cache/gates/<gate>.log` links to each latest gate log.
Use a unique `PW_PORT` when sharing the checkout. `PW_OUTDIR`, when supplied,
is built and retained; CI's internal `--prebuilt` phases validate downloaded
outputs and retain them without rebuilding.

For routine local work, `PW_PORT=4197 bash tools/gates.sh` runs every static
gate plus the existing `smoke.spec.ts` (home shell, Titanic and Monterey Canyon
rendering/error checks) and the separate project-base browser check. With no
`SMOKE_TILE` override this schedules three root smoke cases plus eight
project-base cases instead of repeating
the entire suite for every concurrent task. It keeps owned preview servers and failure
propagation; builds and browser artifacts go under `.cache/runs/<id>/`, which
`tools/clean-artifacts.sh` prunes. This is a
smoke pass; the full suite remains required in CI. No test or assertion is
removed, and the 38-shard CI workflow and `npm run ci` retain full discovery.

Use `PW_PORT=4197 bash tools/gates.sh --full-e2e` for the full local gate set,
including before a release push (Pages deploy does not wait for CI).

The task feedback loop in `tools/codex-task.sh` uses the same local smoke
default. Set `FULL_E2E=1 tools/codex-task.sh <brief.md> <name>` when the
brief requires full regression feedback or package screenshots. Queue briefs
can opt in with `<!-- env: FULL_E2E=1 -->` as their first line. Task result
summaries include the selected e2e mode; smoke does not run package screenshot
specs or establish their acceptance. `tools/resume.sh` reads these review and
release requirements from `plan/RESUME-PROMPT.md`.

When `CI` is nonempty, the gate script defaults to the full suite as well.
`--no-e2e` retains the existing explicit static-only option. Each simultaneous
gate run needs a different `PW_PORT`; its two suites use that port sequentially.
Per-test limits, retries and browser worker count are unchanged. Reduced local
test selection avoids repeated long soak, content and visual sweeps on shared
CPUs; passing wall time still needs measurement in a browser-capable environment.

`check:content` fails on unreviewed warnings as well as errors. An explicit
pressure-band review is checked against the mission and hull configuration;
it is printed as a reviewed note. `test:e2e:base` builds into
`dist-project-base/` and checks `/submarine-explorer/` on port 4211, with
artifacts in `test-results-project-base/`. CI consumes the project-base artifact
and invokes Playwright directly through the runner, keeping that result path
for failure uploads.

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

`deploy.yml` runs independently on every push to `main`, checking out that
push's commit. It can also be run by hand (`workflow_dispatch`). Pages does
not wait for remote CI; the existing release process requires passing local
gates (`tools/gates.sh --full-e2e`, including project-base) before pushing.
The workflow runs the attribution check, builds, and fails if
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

  ```bash
  VITE_BASE=/submarine-explorer/ npm run build -- --outDir dist-base
  PW_BASE=/submarine-explorer/ VITE_BASE=/submarine-explorer/ \
    PW_OUTDIR=dist-base PW_PORT=4197 npx playwright test tests/e2e/base-url.spec.ts
  ```

  The browser test checks the tile and content requests, fixture GLBs, and
  globe texture under the project path; it saves globe and dive screenshots in
  `test-results/`.

Runtime requests for tiles, content, models, decoder files, the globe texture,
and local guide links use `import.meta.env.BASE_URL`. Authored JSON keeps
site-relative paths such as `"model": "/assets/models/x.glb"`; the loader
resolves those paths under the deployment base. An explicit URL supplied to a
tile loader or the globe texture setting stays under caller control.

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
