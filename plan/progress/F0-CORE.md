# F0-CORE: code split and core infrastructure

Status: done. This package is a no-behaviour-change refactor plus new
infrastructure. At default settings the game looks and plays the same as
before; the before/after screenshots are in `.cache/codex/shots/f0-core/`.

## What moved where

| Before                                      | After                                                                                                                |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `src/main.ts` (1,800 lines)                 | `src/main.ts` (~45 lines), plus `src/app/{boot,context,System,loop,systems}.ts` and 23 systems in `src/app/systems/` |
| `src/styles.css` (3,700 lines)              | `src/styles.css` (an `@import` list), plus 27 module files in `src/styles/`                                          |
| `src/core/Config.ts` (1,850 lines)          | `src/core/Config.ts` (`DEFAULT_CONFIG`, `makeConfig`, re-exports), `src/core/config/types.ts` and 12 domain files    |
| `src/world/props/Procedural.ts` (995 lines) | `Procedural.ts` (compat barrel), plus `builders/{wrecks,debris,vents,reefs,geology,generic,shared,index}.ts`         |
| `ModelCache`'s private GLTF loader          | `src/core/assets/` (shared service)                                                                                  |

### App systems

- `boot.ts` builds the `BootContext` (params, config, bus, save, quality tier,
  tile, renderer, scene). `main.ts` inits `createSystems()` through a
  `SystemRunner`, fills `window.__game` and starts `loop.ts`.
- A `GameSystem` has `name`, `init(ctx)`, an optional `start(ctx)`, `frame`
  hooks keyed by stage, and an optional `dispose()`. `FRAME_STAGES` (in
  `System.ts`) is the old frame, step for step. Systems that share a stage run
  in list order.
- The init order in `systems.ts` reproduces the old build order, because
  several things depend on it:
  - the capture-phase key handlers (power's Escape guard runs before the
    shell's, and settings runs before the mission router)
  - the `app:state` listeners (journal and audio hear the initial `dive` emit;
    the ROV and photo mode do not)
  - DOM append order

  `tests/unit/appSystems.test.ts` pins these constraints.

- The `window.__game` contract is unchanged. The same keys are present (systems
  add theirs with `ctx.expose`, and `appState` is still a getter). The new keys
  are `perf` and `quality`.

### Styles

- The 27 files are an exact, ordered split of the old stylesheet; concatenating
  them gives the original text, apart from section comments. No selectors
  changed.
- I did not merge them into the ten groups the audit proposed, and I did not
  move overrides next to their components. Either would reorder the cascade,
  and nothing here verifies computed styles. If that consolidation happens, it
  should be done with visual diffs.

### Config

- Default values are identical. I checked them against the pre-split
  `DEFAULT_CONFIG` with a deep compare, allowing only the added `ultra` tier
  rows and the new `quality` section.
- `tools/validate_landmark.py` used to regex hull classes out of `Config.ts`.
  It now reads `Config.ts` plus `src/core/config/*.ts` (`read_config_source`).

### Props

- `PROCEDURAL_BUILDERS` maps each `ProceduralPropKind` to a builder. Its
  `satisfies` check fails the compile if a kind has no builder.
- `Props.build` dispatches through that registry.
- `reefs.ts` and `geology.ts` are empty family slots for F1 packages.

## New APIs

- **`core/Quality.ts`**
  - `detectTier(caps)`: pure heuristics.
  - `readDeviceCaps(gl)`: reads the WebGL renderer and limits, cores,
    `deviceMemory`, mobile UA, coarse pointer with no hover, and screen size.
  - `resolveQuality(urlTier, setting, caps)`: precedence is `?tier=` >
    saved tier > detection. `?tier=auto` forces detection.
  - `DynamicResolution`: steps the pixel ratio with hysteresis on smoothed
    frame time.
- **`core/config/quality.ts`**
  - `GraphicsTier = low | medium | high | ultra` and `GraphicsTierSetting = tier | auto`.
  - Per-tier `maxPixelRatio`. `low`, `medium` and `high` stay at 2; `ultra` is 3.
  - The dynamic-resolution tunables.
- **`app/systems/quality.ts`**
  - Runs dynamic resolution only when the tier was auto-detected.
    `?dynres=1` forces it on and `?dynres=0` turns it off.
  - `window.__game.perf` exposes `{ tier, tierSource, drawCalls, triangles,
frameMs, pixelRatio, maxPixelRatio, resolutionScale, dynamicResolution }`.
    The draw and triangle counts include the post pass (renderer.info plus
    `UnderwaterPass.scene*`). Checked on a real GPU: titanic at medium draws
    56 calls and 218k triangles; `?tier=ultra` draws 597k triangles.
- **`core/assets/`**
  - `assets.loadGLTF(url)` handles Draco, Meshopt and KTX2 inside the glTF.
  - `assets.loadTexture(url, { srgb, repeat })` loads PNG, JPEG, WebP or
    `.ktx2`, with a cache per URL and option set.
  - `assets.preload(requests)` never rejects and returns `{ loaded, failed }`.
  - `AssetManifest`, `mergeManifests()` and `resolveAssetUrl()` (base-aware).
  - Boot calls `assets.setRenderer(renderer)`, so KTX2 is ready.
  - The only decoder copies are the ones in `public/assets/decoders/{draco,basis}`.
    The Basis transcoder is new and credited in ATTRIBUTION.md. A Vite plugin
    blanks three's default `new URL('../libs/…')` decoder paths so the bundle
    emits no second copy; I checked `dist/`.
- **Settings**
  - The graphics tier list now includes Auto and Ultra.
  - The reload prompt compares against the saved setting at boot
    (`activeTierSetting`), so `auto` does not always look pending.
  - Old saves (`low`, `medium`, `high`) are kept as they are, and `auto` and
    `ultra` are now valid saved values.

## Tier and performance notes

- **Default:** it stays `medium`, a fixed tier, so fresh installs and e2e runs
  render exactly as before and dynamic resolution stays off. On the headless
  SwiftShader runner, `auto` would pick `low`.
- **Detection examples:**
  - A discrete desktop GPU gets `high`.
  - An Apple M-series or other integrated GPU gets `medium`.
  - Old Intel HD gets `low`.
  - A phone gets `low`, or `medium` with a recent Adreno 7xx/8xx,
    Mali-G7xx/Immortalis or Apple GPU plus at least 6 GB and 8 cores.
  - A tablet gets `medium`, or `low` with 4 cores or fewer or 3 GB or less.
  - `ultra` is never picked automatically.
- **Tier contents:** `ultra` currently equals `high` everywhere except the
  pixel-ratio cap. The terrain, atmosphere and presets tier tables got `ultra`
  rows copied from `high`. F1 packages should give `ultra` its own content.

## Follow-ups

0. Detection misses some discrete AMD GPUs whose renderer string lacks "RX"
   (e.g. `AMD Radeon Graphics (RADV GFX1200)` on Linux, which gets `medium`).
   Extend `DISCRETE_RE` if that matters; on the default fixed tier it has no effect.

1. Once F1 has tuned the tiers and there is a mobile layout, switch the default
   `graphicsTier` to `auto`. Log it in CHANGELOG.md; it is a default change.
2. Consolidate `src/styles/` into the audit's ten modules, and move overrides
   next to their components, with a visual-diff check.
3. Build the `ContentCatalog` from audit §4.5. The shell, waypoints and globes
   still fetch mission and hint data separately; the systems keep the old
   behaviour.
4. Show the tier source in Settings (for example "auto: medium"). That needs
   player-facing text, which this package was asked not to add.
5. Nothing calls `dispose()` yet; the page reloads between dives. An in-page
   site switch would need real teardown in each system.
