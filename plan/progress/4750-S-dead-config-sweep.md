# 4750 S-dead: unused config keys and exports sweep

Serves DIRECTOR backlog S-dead. Audit date: 2026-10-28.

## Scope and existing work

Read `plan/DIRECTOR.md`, including “Definition of done”, and
`CONTRIBUTING-AGENTS.md`. Applied the brief's report-only restriction: no new
runtime, CSS, config, or test-helper changes. No clear behavior defect requiring
a small fix was established. This note is the only new tracked file from this
audit. Art data was not edited. No screenshot or visual acceptance is claimed.

The checkout already had edits to `CHANGELOG.md`, `atmosphere.ts`, `predive.css`,
`start.css`, `touch.css`, `kit.ts`, `PropLoader.ts`, and `scarp.ts` when this
audit began. Those edits remove 163 lines and add seven, including four
changelog bullets naming every cut. They were preserved and audited, not
introduced by this pass.

## Evidence for the existing cuts

Consumer searches covered source, unit/e2e tests, tools (including archived
tools), data text, and the HTML entrypoint. Historical documentation was also
searched for the removed names. `git grep ... HEAD -- src tests tools docs`
distinguished original declarations from consumers; current-tree `rg` checked
the result. Compiler checking includes `src`, unit/e2e tests, and build/test
configs, with `noUnusedLocals` and `noUnusedParameters` enabled.

| Existing cut                                                                                                                                                | Evidence and limits                                                                                                                                                                                                                                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `WaterConfig.fogDensityShallow`, `fogDensityDeep`, `fogDeepAt`, `deepColor`                                                                                 | At HEAD each name occurs only in the interface and `DEFAULT_WATER` in `src/core/config/atmosphere.ts`; none remains in executable source, tests, or tools. `sampleAtmosphere()` reads `config.bands`.                                                                                                                                           |
| Top-level `WaterConfig.ambientIntensity`                                                                                                                    | No `water.ambientIntensity` reader. The live, identically named **band** field is retained: `Atmosphere.ts` interpolates `a.ambientIntensity`/`b.ambientIntensity` and applies the resulting sample to the light. Generic name matches alone would have been misleading.                                                                        |
| `PropLoader.DRACO_DECODER_PATH`                                                                                                                             | At HEAD the alias occurs only at its declaration. Current source/test/tool searches find no consumer. The separate `DECODER_PATHS` declaration is discussed below; removing this alias does not establish that a decoder is configured.                                                                                                         |
| Vehicle-kit `roundEnd`, `flipWinding`, `smooth`                                                                                                             | The first two occur only at their declarations at HEAD. There is no import/call of the kit's `smooth`; same-name geometry calls resolve to other modules. For example, `scarp.ts` explicitly imports its live `smooth` from `./shared.js`.                                                                                                      |
| Scarp `interp`                                                                                                                                              | Only its original declaration at HEAD; no call/import in source, tests, or tools.                                                                                                                                                                                                                                                               |
| `.briefing-more`, `.briefing-more-field`, `.briefing-more-toggle`, `.briefing-start`, `.briefing-start-label`, `.briefing-start-segments`, `.settings-body` | No exact class producer or query in source, tests, tools, or HTML. `Briefing.renderDiveSettings()` emits `briefing-dive`/`briefing-dive-row`, and Settings emits `settings-panel`. The live `briefing-start-option` fallback and mode-selector styles remain. A screenshot filename containing `briefing-start-choice` is not a class producer. |

Representative reproducible searches:

```bash
git grep -n -E '\b(roundEnd|flipWinding|DRACO_DECODER_PATH|fogDensityShallow|fogDensityDeep|fogDeepAt|deepColor)\b' HEAD -- src tests tools docs
rg -n '\b(interp|smooth)\b' src tests tools --glob '*.{ts,mjs,py}'
rg -n 'water\.ambientIntensity|config\.bands|a\.ambientIntensity|b\.ambientIntensity' src
rg -n '\bbriefing-(more(-field|-toggle)?|start(-label|-segments)?)\b|\bsettings-body\b' src tests tools index.html --glob '*.{ts,html,js,mjs}'
```

## Further findings, reported without cuts

An identifier-count sweep generated candidates from exported declarations;
exact `rg` searches and module imports were then inspected. This is a
conservative grep audit, not a claim that Knip ran or that every possible
dynamic consumer was resolved. An attempted legacy TypeScript compiler-API
script could not load that API from the installed TypeScript 7 package; its
output was not used as evidence.

| Finding                                            | Evidence                                                                                                                                                                                 | Follow-up within S-dead                                                                                                                             |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dead exported type `AssetKind`                     | `src/core/assets/manifest.ts:15` is its only named occurrence in source/tests/tools/data. The assets barrel uses `export *`, with no named importer.                                     | Delete the unused type when implementation is authorized.                                                                                           |
| Dead exported type `FrameHook`                     | Only `src/app/System.ts:123`; `GameSystem.frame` declares its callback type inline.                                                                                                      | Delete the alias.                                                                                                                                   |
| Dead exported type `ProceduralBuilderMap`          | Only `src/world/props/builders/shared.ts:133`; no consumer import.                                                                                                                       | Delete the alias and its now-unnecessary `ProceduralPropKind` import.                                                                               |
| Dead compatibility constant `DECODER_PATHS`        | Only its declaration in `src/core/assets/AssetService.ts:32` and barrel re-export in `index.ts:6` remain. No property access, `DRACOLoader`, or `setDecoderPath` in source/tests.        | Remove the constant and explicit re-export together. The existing changelog's “decoder setup” wording is stronger than the implementation supports. |
| Unneeded unit-helper export `vehicleSolids`        | Declaration in `tests/unit/helpers/vehicleClearance.ts:144`; internal call at line 233 from `auditVehicle`. The consuming vehicle spec imports `auditVehicle`, `clearance`, and `solid`. | Make it private; keep its implementation.                                                                                                           |
| Unneeded unit-helper export `SyntheticTileOptions` | Declaration in `tests/unit/helpers.ts:13`; used locally by `makeSyntheticTile` at line 24; no external reference.                                                                        | Make the interface private; keep its shape.                                                                                                         |

Useful checks for these findings:

```bash
rg -n '\b(AssetKind|FrameHook|ProceduralBuilderMap|DECODER_PATHS|vehicleSolids|SyntheticTileOptions)\b' src tests tools data --glob '*.{ts,js,mjs,json,py,sh}'
rg -n 'vehicleClearance\.js|helpers\.js' tests/unit --glob '*.ts'
```

The CSS sweep's remaining unmatched literal selector, `.obj-nav-turn`, is
**live**: `ObjectivesPanel.ts:117–118` loops over `target`, `bearing`, `depth`,
and `turn` to produce `obj-nav-${f}`. Existing objective-panel unit tests query
the generated fields. Keep those rules.

All 39 named function/constant exports across 16 `tests/e2e/helpers/*.ts`
files have references outside their defining file; module import searches
confirmed the shared helpers have callers. Unit helpers such as
`encodeHeightmap` also have real consumers (`TileLoader.test.ts`). No helper
implementation was proposed for deletion merely because its export is unused.
No additional config field was established as dead by the conservative search.

## Gates and capability coverage

Validation used the existing edited checkout and an isolated
`dist-s-dead-audit` build. The static gate command was:

```bash
GATES_CONFIG_MODE=writable PW_OUTDIR=dist-s-dead-audit PW_PORT=4275 bash tools/gates.sh --no-e2e
```

The combined run was interrupted after its unit stage stopped making visible
progress; later gates were checked separately. Logs from its completed stages
are under `.cache/runs/20261028-022600-3-FMRo5w/`. Additional command logs
are retained in `.cache/s-dead-audit/`. The isolated build was removed after
validation.

| Gate                      | Result                                                                                                                                                                                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run typecheck`       | PASS, separately and as part of build.                                                                                                                                                                                                                                   |
| Production build          | PASS (`tsc --noEmit` plus Vite); existing chunk-size warning.                                                                                                                                                                                                            |
| Strict content validation | PASS, all 13 mission packs.                                                                                                                                                                                                                                              |
| Attribution               | PASS, 14 asset files attributed.                                                                                                                                                                                                                                         |
| `npx prettier --check .`  | PASS, including this note; `git diff --check` also passes.                                                                                                                                                                                                               |
| Unit tests                | PASS for the five capability files below: 165 tests. The full suite did not finish: its two-worker retry timed out after 60 s and one-worker retry after 180 s (exit 124). No full-suite pass is claimed.                                                                |
| Python tests              | FAIL, 167 run, five failures: four manifest tests report `spawnSync git EPERM`; the golden tooling subprocess test reports empty JSON output. The pre-existing `20261027-113924-7-hDvVh0/python.log` records the same five failure names. No test assertion was changed. |
| Full e2e                  | BLOCKED before test execution: preview web server cannot start.                                                                                                                                                                                                          |

The passing unit command was:

```bash
timeout 60s npx vitest run tests/unit/assets.test.ts tests/unit/props-loader.test.ts tests/unit/lowSweepReadability.test.ts tests/unit/scarpTerrain.test.ts tests/unit/vehicles.test.ts --configLoader runner --cache=false --pool=threads --maxWorkers=1
```

It completed in 37.74 s. The final full-suite attempt was
`timeout 180s npm test -- --configLoader runner --cache=false --pool=threads --maxWorkers=1`.
It printed the runner banner but no test results before timeout; this is an
incomplete gate, not an identified failing assertion.

Although this pass adds no behavior changes, the pre-existing CSS/config cuts
were mapped to capability specs with `rg` searches for briefing, Advanced,
start position, and settings. These requested focused commands were attempted:

```bash
GATES_CONFIG_MODE=writable PW_OUTDIR=dist-s-dead-audit PW_PORT=4275 npx playwright test tests/e2e/d2-predive.spec.ts -g 'briefing Dive settings: mode, start and Advanced persist to settings' --output=.cache/s-dead-e2e-predive
DEBUG=pw:webserver GATES_CONFIG_MODE=writable PW_OUTDIR=dist-s-dead-audit PW_PORT=4275 npx playwright test tests/e2e/settings.spec.ts -g 'briefing returns home on Escape; Settings opens from pause after the dive begins' --output=.cache/s-dead-e2e-settings
GATES_CONFIG_MODE=writable PW_OUTDIR=dist-s-dead-audit PW_PORT=4276 npm run test:e2e -- --output=.cache/s-dead-e2e-full
```

All three exited before executing tests. The debug log reports `connect EPERM`
for both `::1:4275` and `127.0.0.1:4275`, followed by web-server exit 1. These
are attempts, not passing browser evidence. No screenshots were inspected or
claimed. Full gates are **not green** in this environment.

## Simplicity review

No shared-code site branches, package numbers in code, settings, runtime
layers, or new tests were added. Existing capability specs were selected rather
than adding a brief-named spec. The existing deletions are net simpler and
logged in `CHANGELOG.md`; this report-only pass makes no additional cut to log.
Further findings remain evidence for the standing S-dead backlog item, not a
second forward plan.
