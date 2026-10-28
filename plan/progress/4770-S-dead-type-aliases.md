# 4770 S-dead: unused frame and procedural-builder aliases

Implements standing **S-dead**, DIRECTOR Backlog 8, on 2026-10-28.
Read DIRECTOR's simplicity rules and review rubric, the newest REVIEWS entry,
the OVERNIGHT-LOG tail, and the 4750 brief, result/final report and
`plan/progress/4750-S-dead-config-sweep.md` before editing. The 4750 wrapper
reports passing external gates; its agent report records sandbox limitations.
Neither is used as validation of this change.

## Cuts and consumer evidence

Launch recheck: `rg -n '\b(FrameHook|ProceduralBuilderMap|ProceduralPropKind)\b' src tests tools data`.
Both aliases still existed and each had only its declaration as a named match;
neither was skipped or replaced with other work. Inspected imports/re-exports
of `app/System.js`, `builders/shared.js` and the builder registry barrel:

- Removed `FrameHook` from `src/app/System.ts`. No importer or re-export uses
  it. Retained `FrameState`, `GameSystem`, `GameContext`, `FRAME_STAGES`, the
  runner and the inline generic frame callback signatures unchanged.
- Removed `ProceduralBuilderMap` and its exclusive documentation from
  `src/world/props/builders/shared.ts`. `builders/index.ts` uses `export *`
  from shared, but no consumer imports this alias. Removed `ProceduralPropKind`
  only from shared's type import, where the alias was its sole use. Retained
  `PropsConfig`, `ProceduralBuilder`, registry completeness checking and all
  builder implementations and signatures.

Post-cut exact-name search in source/tests/tools/data returns no matches.
Code diff: one line added, six deleted (net minus five). CHANGELOG records
the cut. No replacement abstractions, tests, dependencies or runtime changes.
Authored geometry, data, camera work and 4750's completed cuts are untouched;
asset exports and unit-helper visibility remain outside this brief.

## Actual validation

- PASS `npm run typecheck`.
- PASS `timeout 90s npx vitest run tests/unit/appSystems.test.ts tests/unit/props-procedural.test.ts --configLoader runner --cache=false --pool=threads --maxWorkers=1`:
  two files, 43 tests, 1.83 seconds.
- PASS production build, including typecheck, using the same writable-config
  bundling approach already implemented by `tools/gates.sh`:

  ```bash
  node --input-type=module - <<'JS'
  import { build } from 'rolldown';
  await build({
    input: 'vite.config.ts', platform: 'node', external: ['vite'],
    output: { file: '.cache/gates/vite-4770.config.mjs', format: 'esm' },
  });
  JS
  npm run build -- --outDir dist-s-dead-type-aliases --config .cache/gates/vite-4770.config.mjs --configLoader native
  ```

  Vite transformed 301 modules, copied public assets and stamped the service
  worker; existing chunk-size warning. Temporary config/build removed afterward.

- PASS formatting check on the four changed files and `git diff --check`.

Earlier build attempts and limitations:

- `npm run build -- --outDir dist-s-dead-type-aliases` failed loading config:
  shared `node_modules/.vite-temp` is read-only (`EROFS`).
- Adding `--configLoader runner` failed in the PWA plugin with
  `Vite module runner has been closed`.
- `GATES_CONFIG_MODE=writable PW_OUTDIR=dist-s-dead-type-aliases PW_PORT=4277 bash tools/gates.sh --phase build`
  completed Vite and service-worker stamping, then failed the separate
  `ci-build-manifest.mjs` step with sandbox `spawnSync git EPERM`. The wrapper
  gate did not pass; no unrelated tooling was changed.

Searched `tests/e2e` for `SystemRunner|FRAME_STAGES|frame.stage|procedural|builder`
and inspected `props.spec.ts` (including "loads the fixture props, lights them,
and logs no errors"). These cuts erase unused types only; no gameplay
capability changed, so a browser run is not applicable to the diff and would
conflict with the brief's no-render constraint. E2e/browser and visual
acceptance remain unverified; no game was rendered. Full unit/Python suites
were not run for this targeted type-only change. The requested unit suites
cover frame scheduling/lifecycle and deterministic procedural geometry.
