# S-unused — asset/build cleanup, partial completion

2026-10-12; brief 1510; base `a97ae70`. This serves Backlog item **S-unused**
(§6, §6b). The item remains partially complete: the ownership-blocked bullets
below stay under S-unused. No visual acceptance is claimed; browser/visual
review belongs to Claude.

## Ownership checked before editing

The local worktree began clean. Read live worktree status and branch diffs
against main, plus the launched 1500/S-dead, 1520/S-resolve and 1496/S-rov briefs.
Refreshed live status before final verification.

- S-rov owns vehicles/runtime systems, `ATTRIBUTION.md`, asset documentation,
  README/CHANGELOG and `tests/unit/wrecks.test.ts`.
- S-flow owns shell/settings/Save/UI/docs and README/CHANGELOG.
- S-dead owns shared helper implementations, `PropLoader.ts` dead-export
  cleanup, `GlobeModel.ts` dead exports and the
  `tests/unit/props-procedural.test.ts` import migration.
- V-bluehole owns its geometry/config; Scanner work and other live package
  diffs were also excluded.
- `src/app/boot.ts`, core asset service/manifest, `vite.config.ts`,
  `tests/unit/assets.test.ts`, and the empty reef module/registry were unowned.
  Boot loses only its KTX2 import/hook. No owned file was edited.

## Completed S-unused bullets

- **Decoder assets/setup removed.** Inspected the JSON chunks of every shipped
  GLB, including nested extension names and buffer/image references:

  | GLB                |   Bytes | Position vertices | Embedded images | Extensions used/required |
  | ------------------ | ------: | ----------------: | --------------- | ------------------------ |
  | `rock_09.glb`      | 732,736 |             6,628 | 3 JPEGs         | none / none              |
  | `barrel_stove.glb` | 662,192 |             6,637 | 3 JPEGs         | none / none              |

  Both have glTF 2 headers, one mesh/primitive/material, and no external buffer
  or image URI. Neither JSON chunk uses Draco, Basis/KTX2 or meshopt; there are
  no `.ktx2`/`.basis` assets or authored references. Rock is referenced by Blake
  Plateau and `_test`; barrel is referenced by `_test`.

  Removed Draco/KTX2/meshopt imports, lazy decoder/transcoder setup, renderer
  registration, KTX2 texture routing/helper, five vendored decoder files and
  Vite's decoder-default-URL transform. Ordinary lazy GLTF loading, texture
  options, URL/base resolution, caches, failure eviction/preload reporting and
  existing prop disposal remain. The stock GLTFLoader still contains its
  upstream extension recognition; no decoder implementations are bundled.

- **Pages sourcemaps stopped.** Existing Vite build config now sets
  `sourcemap: false`. No workflow, dependency manifest, gate or tool changed.
- **Empty `reefs.ts` removed.** Its sole export was `{}`; removed its import,
  empty spread and obsolete registry header row. Real reef/geo builders and
  every named wreck builder remain unchanged. No on-screen element or setting
  was added.
- **Asset/loading capability coverage retained and extended.** Existing
  `assets.test.ts` retains URL handling, inference, manifest deduplication,
  model caching and preload failure assertions. Removed assertions solely for
  the deleted decoder capability; added ordinary texture cache/options/retry
  checks and real GLTFLoader parsing of both unchanged GLBs. The parser checks
  exact vertex counts, indexed geometry and three ordinary material textures
  without a decoder. Node image IO is stubbed; JPEG pixels are not decoded or
  visually reviewed. Existing prop/wreck regression specs were run unchanged.

## Measured build bytes

Uncompressed regular-file sizes; compare the original and changed root builds
from the same worktree/dependencies. Public data and both models are byte
identical. Counts include all output files, including copied terrain/content.

| Output                                     | Before, root | After, root | Reduction |
| ------------------------------------------ | -----------: | ----------: | --------: |
| Vendored decoder files (5 → 0)             |    2,837,876 |           0 | 2,837,876 |
| Sourcemaps (5 → 0)                         |    6,707,405 |           0 | 6,707,405 |
| Bundled JS (5 → 2 chunks)                  |    1,670,526 |   1,576,173 |    94,353 |
| Entire production output (195 → 182 files) |   46,931,123 |  37,291,380 | 9,639,743 |

The total includes the changed HTML/service-worker stamp as well as these
three categories. Root output shrinks by about 20.54%. Project-base output is
37,291,627 bytes / 182 files, with 1,576,268 bytes of bundled JS and zero maps
or decoder files. Service-worker shell entries fall from 15 to 12.

## Validation and limitations

- Baseline: `npm run build -- --outDir /tmp/s-unused-baseline-root --emptyOutDir`
  **PASS**.
- Root: `npm run build -- --outDir /tmp/s-unused-after-root --emptyOutDir`
  **PASS**, including `tsc --noEmit`.
- Pages: `VITE_BASE=/submarine-explorer/ npm run build -- --outDir /tmp/s-unused-after-base --emptyOutDir`
  **PASS**, including `tsc --noEmit`.
- `npm run typecheck`: **PASS**.
- `npm test -- tests/unit/assets.test.ts tests/unit/props-loader.test.ts tests/unit/props-procedural.test.ts tests/unit/props-collision.test.ts tests/unit/props-geo.test.ts tests/unit/presets.test.ts tests/unit/publicUrl.test.ts tests/unit/TileLoader.test.ts tests/unit/wrecks.test.ts`:
  **PASS, 9 files / 174 tests**. No existing prop/wreck assertion, skip or gate
  changed. Preset selection still maps seep to brine.
- `npm run format:check`: **PASS**, repository-wide. `git diff --check`:
  **PASS**. Final progress note also checked by Prettier.
- `python3 /tmp/s-unused-output-audit.py`: **PASS** for both bases. All 5 HTML
  asset links, relative module/dynamic chunk references and 12 service-worker
  precache entries resolve. Both builds contain zero maps, sourceMappingURL
  trailers, decoder chunks or WASM/KTX2/Basis files. All copied data is byte
  identical to baseline; the 13 mission identities and their GMRT tiles,
  both model files, `_test` and the offline `demo-synthetic` tile remain.
- Environment recovery: the first default build failed with `EROFS` because
  Vite wrote `.vite-temp` through the shared read-only `node_modules` symlink.
  A CLI-only `--configLoader runner` attempt failed in the existing PWA plugin
  with `Vite module runner has been closed`. Replaced the ignored local
  dependency-directory symlink with links to the same installed packages,
  leaving cache/temp directories local. Normal existing build/test commands
  then passed; no tool/config workaround was committed. The first changed
  build also caught a type mismatch in the new image-IO stub; fixed its texture
  type before the passing checks above.
- Existing large-chunk warning remains informational. Browser/e2e, screenshots
  and visual gates were **not run**, as explicitly prohibited. The reachable
  brine case in `tests/e2e/presets.spec.ts` remains unchanged, including its
  two-draw assertion. No visual tuning or real-site geometry changed.

## Remaining S-unused bullets — not DONE

- **Generic hull-block builder and `_test` replacement:** defer because removal
  affects S-dead's procedural spec/import migration and S-rov's shared wreck
  spec. The generic builder also has extensive bounds, seed, hull-end,
  material, placement and LOD assertions beyond its sole authored `_test`
  dependency. Preserve those regression contracts when files are free; do not
  delete them to make the removal pass. Named Titanic/Endurance/Bismarck
  builders and real-site geometry stay intact.
- **Fixture relocation:** `demo-synthetic`, `barrel_stove.glb` and `_test` still
  ship. Moving them needs coordinated fixture serving/pipeline/tool references
  and README changes while README belongs to S-flow/S-rov. README line 104
  explicitly promises `demo-synthetic` as an offline stand-in (plus its tile
  table and generation example); preserve or deliberately update that promise
  with the relocation. Do not treat it as undocumented dead data.
- **Catalogue-fetch deduplication:** current callers include `GlobeModel.ts`,
  `JournalData.ts` and preset loading. GlobeModel dead-export work belongs to
  S-dead, Globe/shell integration overlaps S-flow/S-bugs, and preset runtime
  belongs to S-rov. Defer sharing the fetch until these integration files are
  free; no replacement work was created.
- **Service-worker registration relocation:** remains in
  `src/app/systems/touch.ts`. Relocation into runtime lifecycle/integration
  would cross active S-flow/S-rov packages. Existing production/secure-context,
  automation exclusion, base scope and offline behavior remain unchanged.
- **Decoder compatibility exports/docs:** `PropLoader.ts` still imports
  `DECODER_PATHS` to publish its unused `DRACO_DECODER_PATH`; S-dead owns its
  removal. Retain the path constants and barrel export until that lands; they
  perform no loader setup or fetch. Removing the vendored-decoder entries in
  `ATTRIBUTION.md` and updating asset docs waits for S-rov ownership to clear.
  README/CHANGELOG also wait for their current owners.
- **`tools/compress_tiles` / `--quant16`:** intentionally untouched under this
  brief's tool restriction. Keep remaining cleanup under S-unused.
- **Brine:** retained capability, not dead code. No preset, routing, controls or
  test was cut; do not convert this into replacement work.
