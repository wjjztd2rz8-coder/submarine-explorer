# Conventions for agents working in this repo

This scaffold is meant to be built on by many agents, often concurrently. These
rules exist so that parallel work merges cleanly.

## 1. File ownership

Change files in your own lane. If you need something from another lane, add it
through an existing extension point rather than editing that lane's files.

| Lane                | Owns                                                                      | Notes                                                                                                           |
| ------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Data pipeline       | `tools/**`, `data/tiles/**`                                               | `data/tiles/**` is _generated_. Never hand-edit a `meta.json` or `heightmap.bin`; re-run the tool.              |
| Landmarks / content | `data/landmarks.json`, `docs/landmarks.md`, `docs/data-sources.md`        | The engine treats this file as untrusted and optional.                                                          |
| Assets              | `docs/assets.md`, `assets-samples/**`, `public/**` (except `public/data`) | `public/data` is a symlink to `../data` — do not replace it with a real directory.                              |
| Engine core         | `src/core/**`, `src/main.ts`                                              | The game loop and Config. Adding a tuning constant is fine; renaming one is a breaking change.                  |
| World               | `src/world/**`                                                            | `Terrain.sampleHeight` / `getNormal` are a public API — other lanes depend on them.                             |
| Submarine           | `src/sub/**`                                                              | `Submarine` must stay unit-testable: keep it dependent on the narrow `HeightField` interface, not on `Terrain`. |
| UI                  | `src/ui/**`, `src/styles.css`                                             | DOM overlays only. Do not render UI into the WebGL canvas.                                                      |
| Shaders             | `src/shaders/**`                                                          |                                                                                                                 |
| Tests               | `tests/**`, `tools/tests/**`                                              | Anyone may add tests anywhere.                                                                                  |

Shared files that need a heads-up before you change them: `src/core/Config.ts`,
`src/util/types.ts`, `src/util/geo.ts`, `package.json`, `tsconfig.json`,
`vite.config.ts`.

## 2. Never change without also updating the docs

These are contracts other people's code and other agents' work depend on.

- **The tile format.** If you touch the binary layout, the row order, the
  endianness, or any `meta.json` key, you must update **all** of:
  `docs/tile-format.md`, `tools/tile_writer.py`, `tools/inspect_tile.py`,
  `src/util/types.ts`, `src/world/TileLoader.ts` — and add a test.
- **The coordinate convention** (`+X` east, `+Z` **south**, `+Y` up, origin at
  tile centre, sea level 0, depths negative). It is documented in
  `docs/architecture.md`, `docs/tile-format.md`, `README.md` and at the top of
  `src/util/geo.ts`. Changing it means changing all of them plus
  `tests/unit/geo.test.ts`. Don't, unless you have a very good reason.
- **`EventBus` event names and payloads.** Add to the `GameEvents` interface;
  don't repurpose an existing event.
- **Public module APIs** — in particular `Terrain.sampleHeight`,
  `Terrain.getNormal`, `Submarine.getState`, `TileLoader.load`,
  and `window.__gameReady` (the e2e test waits on it).

## 3. Running the tests

Run all four before you hand back. They are fast (seconds).

```bash
npm run build      # tsc --noEmit + vite build; must be zero TS errors
npm test           # vitest unit tests
npm run test:py    # python unittest for the ESRI ASCII parser
npm run test:e2e   # playwright smoke test; needs `npm run build` first
```

Requirements and expectations:

- **`npm run build` must pass with zero TypeScript errors.** Strict mode is on,
  including `noUnusedLocals` and `noUnusedParameters`.
- **The e2e test needs tiles on disk.** If `data/tiles/` is empty, run
  `tools/fetch_tile.py` (or `tools/make_synthetic_tile.py` when offline) first.
- **Look at the screenshot.** `tests/e2e/screenshots/*.png` is the only thing
  that catches "compiles, runs, renders a black rectangle". A passing e2e run
  with a black screenshot is a failure.
- **Run `npm run format`** before handing back.

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

`<area>` is one of: `pipeline`, `core`, `world`, `sub`, `ui`, `shaders`,
`tests`, `docs`, `build`.

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
