# 4760 S-dead: unused asset exports

Implements only the two asset findings from 4750 under DIRECTOR Backlog 8,
standing **S-dead** (2026-10-28). Read DIRECTOR's simplicity rules and rubric,
the newest REVIEWS entry, OVERNIGHT-LOG tail, CONTRIBUTING-AGENTS, and the 4750
brief, dispatcher result/final report and progress note before editing. The
checkout was clean at launch. No broader export sweep was repeated.

## Consumer evidence and cut

Launch search (all text files, including tools archives and data):

```bash
rg -n '\b(AssetKind|DECODER_PATHS)\b' src tests tools data
```

Only three matches: `manifest.ts:15` declared `AssetKind`;
`AssetService.ts:32` declared `DECODER_PATHS`; `index.ts:6` re-exported the
constant. Neither had a named consumer. Inspection of asset module references
confirmed `PropLoader` imports the live `assets` singleton and its `ModelCache`
calls `assets.loadGLTF`. The assets barrel's manifest wildcard stays intact.

Deleted the type, compatibility constant and obsolete compatibility comment;
removed only `DECODER_PATHS` from the explicit barrel export. Code is eight
lines shorter across the three owned files. Retained `publicUrl`, still called
by `resolveAssetUrl`, all request types, URL handling, lazy loader and caches.
Decoder assets were neither deleted nor configured. Added one Removed entry
to CHANGELOG, preserving existing entries and 4750's completed cuts.

After the cut, `rg -n --hidden '\b(AssetKind|DECODER_PATHS)\b' src tests tools data`
returned no matches. No source, tests, tools or authored data outside the owned
files were changed; no new API, abstraction, dependency or tests were added.

## Validation

- `npm run typecheck`: **PASS**.
- `timeout 90s npx vitest run tests/unit/assets.test.ts tests/unit/props-loader.test.ts --configLoader runner --cache=false --pool=threads --maxWorkers=1`:
  **PASS**, 2 files / 63 tests, 1.50 s. Existing coverage checks manifest
  normalization/merge, base URL resolution, shared model/texture loads,
  option-specific caching, mixed preload failures/retries, real plain GLB
  parsing, authored prop URLs, failed models and prop resource lifetimes.
- `npm run build -- --outDir dist-s-dead-assets --config .cache/s-dead-assets-vite.config.mjs --configLoader native`:
  **PASS**, including TypeScript, public copy and service-worker stamping;
  existing chunk-size warning. The temporary config was bundled from the
  unchanged `vite.config.ts` with the same Rolldown/native approach used by
  `tools/gates.sh` writable mode; no tracked tooling was changed.
- Earlier `VITE_BASE=/submarine-explorer/ npm run build -- --outDir dist-s-dead-assets --configLoader runner`
  failed in the existing PWA plugin with `Vite module runner has been closed`.
  Writable-mode build gates below completed both Vite builds and stamping,
  then **failed** in `tools/ci-build-manifest.mjs` with `spawnSync git EPERM`:

```bash
GATES_CONFIG_MODE=writable PW_OUTDIR=dist-s-dead-assets PW_PORT=4276 bash tools/gates.sh --phase build
VITE_BASE=/submarine-explorer/ GATES_CONFIG_MODE=writable PW_OUTDIR=dist-s-dead-assets-base PW_PORT=4277 bash tools/gates.sh --phase build
```

Gate logs: `.cache/runs/20261028-031914-2-w0Yw3j/build.log` (root) and
`.cache/runs/20261028-031914-2-vnKoRI/build.log` (project base). Provenance gate
is unverified; no tooling failure was repaired or assertion weakened.

Capability search:
`rg -n -i 'asset|prop.?load|decoder|glb|gltf|base.?url' tests/e2e`.
It identified the fixture prop-loading and project-base asset tests. Attempted
both against their isolated outputs and ports:

```bash
DEBUG=pw:webserver GATES_CONFIG_MODE=writable PW_OUTDIR=dist-s-dead-assets PW_PORT=4276 npx playwright test tests/e2e/props.spec.ts -g 'loads the fixture props, lights them, and logs no errors' --output=.cache/s-dead-assets-e2e-props
DEBUG=pw:webserver VITE_BASE=/submarine-explorer/ PW_BASE=/submarine-explorer/ GATES_CONFIG_MODE=writable PW_OUTDIR=dist-s-dead-assets-base PW_PORT=4277 npx playwright test tests/e2e/base-url.spec.ts -g 'project-base build loads data, models, and globe texture' --output=.cache/s-dead-assets-e2e-base
```

Both exited 1 **before executing any test**: localhost checks returned
`connect EPERM` for IPv6 and IPv4, and the preview web server exited 1.
Browser capability checks remain **unverified** under sandbox restrictions.
No game rendering, screenshots or visual acceptance is claimed. Full unit,
Python and full e2e suites were not run for these scoped deletions.
Isolated build outputs and the temporary Vite config were removed afterward.

Formatting of changed files and `git diff --check`: **PASS**. This package
adds no behavior, settings, site branches, UI or art changes; simplicity is
the removal of the two unconsumed declarations. Visual and phone rubric
acceptance remains outside this package.
