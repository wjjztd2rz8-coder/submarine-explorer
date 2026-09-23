# Conventions for agents working in this repo

This scaffold is meant to be built on by many agents, often concurrently. These
rules exist so that parallel work merges cleanly.

## 1. File ownership

Change files in your own lane. If you need something from another lane, add it
through an existing extension point rather than editing that lane's files.

| Lane                | Owns                                                                                                                 | Notes                                                                                                                               |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Data pipeline       | `tools/**`, `data/tiles/**`                                                                                          | `data/tiles/**` is _generated_. Never hand-edit a `meta.json` or `heightmap*.bin`; re-run the tool (`docs/tiles-inventory.md`).     |
| Landmarks / catalog | `data/landmarks.json`, `docs/landmarks.md`, `docs/data-sources.md`                                                   | The engine treats this file as untrusted and optional.                                                                              |
| Content packs       | `data/landmarks/<id>/**`, `data/landmarks/index.json` (append only)                                                  | One agent per landmark folder. Schemas: `plan/PHASE-B-CONTRACTS.md` §2. `data/landmarks/_test/` is the test fixture (B1/B4 own it). |
| Assets              | `docs/assets.md`, `assets-samples/**`, `public/**` (except `public/data`)                                            | `public/data` is a symlink to `../data` — do not replace it with a real directory. Every asset needs an `ATTRIBUTION.md` row.       |
| Props               | `src/world/Props.ts`, `src/world/PropLoader.ts`, `src/world/props/**`, `public/assets/**`, `tools/validate_props.py` | GLBs ≤ 2 MB, CC0/CC-BY, 1 unit = 1 m, front −Z (`docs/props.md`).                                                                   |
| Engine core         | `src/core/**`, `src/main.ts`                                                                                         | The game loop and Config. Adding a tuning constant is fine; renaming one is a breaking change.                                      |
| World               | `src/world/**` (except the Props files above)                                                                        | `Terrain.sampleHeight` / `getNormal` are a public API — other lanes depend on them.                                                 |
| Render              | `src/render/**`                                                                                                      | Atmosphere, headlights, marine snow, caustics (`docs/atmosphere.md`).                                                               |
| Game                | `src/game/**`                                                                                                        | Discovery, missions, content loading (`docs/discovery.md`, `docs/missions.md`). Pure TS where possible; DOM stays in `src/ui/`.     |
| Audio               | `src/audio/**`                                                                                                       | WebAudio only, synthesised cues (`docs/audio.md`). Subscribes to events; does not add them.                                         |
| Submarine           | `src/sub/**`                                                                                                         | `Submarine` must stay unit-testable: keep it dependent on the narrow `HeightField` interface, not on `Terrain`.                     |
| UI                  | `src/ui/**`, `src/styles.css`                                                                                        | DOM overlays only. Do not render UI into the WebGL canvas. Append CSS under a `/* --- <lane> --- */` header.                        |
| Shaders             | `src/shaders/**`                                                                                                     |                                                                                                                                     |
| Tests               | `tests/**`, `tools/tests/**`                                                                                         | Anyone may add tests anywhere. `tests/e2e/qa/**` belongs to the QA pass.                                                            |

Shared files that need a heads-up before you change them, and then only
additively: `src/core/Config.ts` (add a section), `src/core/EventBus.ts` (add
events), `src/main.ts` (one fenced `// --- <pkg> begin/end ---` block per
location), `src/util/types.ts`, `src/util/geo.ts`, `src/styles.css`,
`package.json`, `tsconfig.json`, `vite.config.ts`, `playwright.config.ts`.

## 2. Never change without also updating the docs

These are contracts other people's code and other agents' work depend on.

- **The tile format.** If you touch the binary layout, the row order, the
  endianness, any `meta.json` key, or add a variant (like `heightmap16.bin`),
  you must update **all** of: `docs/tile-format.md`, `tools/tile_writer.py`,
  `tools/inspect_tile.py`, `src/util/types.ts`, `src/world/TileLoader.ts` — and
  add a test.
- **The coordinate convention** (`+X` east, `+Z` **south**, `+Y` up, origin at
  tile centre, sea level 0, engine depths negative, content `depth_m`
  positive). It is documented in `docs/architecture.md`, `docs/tile-format.md`,
  `README.md` and at the top of `src/util/geo.ts`. Changing it means changing
  all of them plus `tests/unit/geo.test.ts`. Don't, unless you have a very good
  reason.
- **Content schemas** (`mission.json`, `pois.json`, `guide.json`,
  `props.json`, `data/landmarks/index.json`). Authoritative in
  [`plan/PHASE-B-CONTRACTS.md`](plan/PHASE-B-CONTRACTS.md) §1–2, with engine
  detail in `docs/discovery.md`, `docs/props.md`, `docs/missions.md`. A schema
  change updates the contracts file, the loader (`src/game/Pois.ts`,
  `Guide.ts`, `Mission.ts`, `src/world/PropLoader.ts`),
  `tools/validate_props.py` for props, and every content pack that uses it.
  Loaders must treat a missing or malformed file as "none" and never throw.
- **`EventBus` event names and payloads.** Add to the `GameEvents` interface;
  don't repurpose an existing event. The full list is in `docs/architecture.md`.
- **localStorage keys** `subexplorer.bindings.v1` and
  `subexplorer.discoveries.v1`. Change a shape by bumping the version and
  extending `migrate()`, never by rewriting in place.
- **Public module APIs** — in particular `Terrain.sampleHeight`,
  `Terrain.getNormal`, `Submarine.getState`, `TileLoader.load`,
  `Props.collide`, and the test hooks below.
- **Test hooks.** `window.__gameReady` (every e2e spec waits on it); the URL
  params `?tile=`, `?mission=`, `?skipBriefing=1`, `?landmark=`, `?poi=`,
  `?at=`, `?depth=`, `?debrief=1`, `?debugProps=1`; and the `window.__game`
  keys the e2e specs read: `sub`, `rig`, `terrain`, `bus`, `headlights` (`.on`),
  `scanner`, `discoveries`, `discovery` (`.loaded`, `.spawnedAt`), `props`
  (`.loaded`, `.stats`), `mission` (`.state`, `.objectives`, `.emitted`) and
  `missionRouter`. The full key list is in `docs/architecture.md`. Add keys to
  the existing object literal in `main.ts`; do not restructure it.

## 3. Running the tests

Run all four before you hand back. The first three take seconds.

```bash
npm run build      # tsc --noEmit + vite build; must be zero TS errors
npm test           # vitest unit tests
npm run test:py    # python unittest: ESRI parser, fetch_all, compress_tiles, validate_props
npm run test:e2e   # playwright suite; needs a build first
```

**e2e isolation.** Several agents often run e2e in the same checkout. Build into
your own directory and serve it on your own port, so you never test someone
else's stale bundle, and delete the directory when done:

```bash
npm run build -- --outDir dist-<you>
PW_PORT=41xx PW_OUTDIR=dist-<you> npm run test:e2e
PW_PORT=41xx PW_OUTDIR=dist-<you> npx playwright test tests/e2e/<spec>.spec.ts
```

`PW_PORT` (default 4173) and `PW_OUTDIR` (default `dist`) are read by
`playwright.config.ts`; `SMOKE_TILE=<id>` limits the smoke spec to one tile.
`dist-*/` is gitignored.

Requirements and expectations:

- **`npm run build` must pass with zero TypeScript errors.** Strict mode is on,
  including `noUnusedLocals` and `noUnusedParameters`. If the error is in a file
  another agent is editing right now, wait and retry; do not "fix" their file.
- **The e2e tests need tiles on disk.** They ship in `data/tiles/`; if one is
  missing, run `tools/fetch_all.py --only <id>` (or
  `tools/make_synthetic_tile.py` when offline).
- **Look at the screenshot.** `tests/e2e/screenshots/*.png` is the only thing
  that catches "compiles, runs, renders a black rectangle". A passing e2e run
  with a black screenshot is a failure.
- **Format only your own files**: `npx prettier --write <files>`. Do **not** run
  `npm run format` (whole repo) while anyone else is working in the checkout —
  it rewrites their in-progress files.

If you add a module, add a unit test for it. Physics and geometry code should be
testable headlessly — depend on a narrow interface (see `HeightField` in
`src/sub/Submarine.ts`) rather than on Three.js objects or the DOM.

## 4. Style

- TypeScript strict, ES modules, **`.js` extension on relative imports**
  (required by `verbatimModuleSyntax`). `import type` for type-only imports.
- Python: 3.9, **standard library only**. No numpy, no GDAL, no Pillow, no
  `pip install`. Keep tools runnable as `python3 tools/<script>.py --help`.
- No new runtime dependencies without a reason in the commit message. The
  runtime dependency list is exactly: `three`.
- Comments explain _why_ and state conventions. Don't narrate what the code
  plainly does.
- Every tunable number goes in `src/core/Config.ts`.

## 5. Commit messages

```
<area>: <imperative summary under 72 chars>

<why the change was needed, and anything non-obvious about how>

Refs: <doc you updated, if you changed a contract>
```

`<area>` is one of: `pipeline`, `content`, `core`, `world`, `props`, `render`,
`game`, `audio`, `sub`, `ui`, `shaders`, `tests`, `docs`, `build`.

Examples:

```
world: add skirt geometry to terrain chunks

Adjacent chunks at different LOD levels showed hairline cracks at their
seams. Dropping a 20 m skirt from each chunk edge hides them without
needing edge-resolution matching.

pipeline: accept xllcenter/yllcenter headers

Some ESRI ASCII producers use cell-centre rather than corner origins.
Normalising at parse time keeps the rest of the pipeline unchanged.

Refs: docs/tile-format.md
```

One logical change per commit. Don't commit `dist/`, `node_modules/`, or
generated tiles.
