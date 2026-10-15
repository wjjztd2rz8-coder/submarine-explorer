# 2140 — S-tests coverage audit

Baseline: `1c1dad6`. Scope: `tests/`; no application, test configuration,
timeout, retry, skip or budget changes. Two rounds: inventory and selective cuts,
then coverage review and gates. This is a ranked maintenance audit, not a claim
that every private probe or elapsed-time test is redundant.

## Round 1: worst 15

Locations and titles below identify the baseline selections. Rank weighs weak
failure signals, coupling, redundant work and scheduling sensitivity. Each cut
is recorded in its row, with the surviving capability coverage.

| Rank | Test / selection                                                                                | Problem                                                                                                                               | Decision and coverage that stays                                                                                                                                                                                                                                                                                                                                                                               |
| ---: | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    1 | `unit/beebeIsolation.test.ts` — shared prop placement byte-identical outside Beebe              | SHA of shared source after four regex exclusions fails on comments, imports and refactors, without executing placement.               | **Cut the test.** `props-loader.test.ts` executes depth, seabed snapping, footprint support, heading, slope, failed loads and LOD selection; `props-collision.test.ts` executes placed hull and transformed surface collisions. Beebe's actual geometry/collider snapshot remains.                                                                                                                             |
|    2 | `unit/beebeIsolation.test.ts` — other sites retain byte-identical biome/terrain/opening presets | `evidence.spawn` hashes almost all of `Spawn.ts`, including comments. The rest of this test measures real output.                     | **Cut only the spawn-source digest and its snapshot field.** Rename the test to its remaining scope. All other snapshot bytes remain unchanged. `gameSpawn.test.ts`, `missionApproach.test.ts`, `freeDiveComposition.test.ts` and `bughunt1090.test.ts` keep spawn depth, heading, hull, prop and camera-clearance behavior.                                                                                   |
|    3 | `unit/f-bughunt-4.test.ts` — measures Monterey wall cost before/after enlargement               | Rebuilds historical dimensions and requires the new geometry to cost over twice as many triangles. A cheaper correct builder fails.   | **Cut the historical comparison test and unused imports.** `perf-budget.test.ts` checks current shipped prop costs; `montereyFrameBudget.test.ts` checks five inspection views with drift and a 200k reserve below 900k; `montereyBoulders.test.ts` preserves all four walls' exposed rubble and Low omission. This retires a diagnostic expectation, not a performance ceiling.                               |
|    4 | `unit/f-bughunt-4.test.ts` — rejects malformed cell spacing                                     | Builds a real Monterey tile just to reject `cellsize_m_x: 0`.                                                                         | **Fold the field-name diagnostic assertion into the existing `TileLoader.test.ts` malformed-metadata test; cut the standalone real-tile duplicate.** `f-bughunt-5.test.ts` retains the exact zero-spacing input in its malformed metadata table, drives `TileLoader.load`, expects `TileLoadError` and verifies no heightmap fetch. The remaining Blue Hole collision and material-isolation regressions stay. |
|    5 | `unit/terrainMemo1290.test.ts` — isolates different sites and rebuilt tiles                     | Private `Map` identity checks duplicate the stronger result checks and prescribe storage ownership.                                   | **Cut two identity assertions only.** The same test still checks different sites and rebuilt same-ID tiles return the exact independent depth offsets and that querying them leaves the first site's height intact.                                                                                                                                                                                            |
|    6 | `unit/terrainMemo1290.test.ts` — reuses corners / bounded eviction / disposal                   | Private-method calls and map size couple tests to memoization.                                                                        | **Retain.** They guard distinct CPU/memory regressions: no recomputation on a repeated query, bounded cache growth, equal results after eviction and release on disposal. Output-only equivalence does not replace these resource guarantees.                                                                                                                                                                  |
|    7 | `unit/beebeScatter.test.ts` — other sites byte-identical / Beebe rocks at every tier            | Broad geometry, matrix and color hashes obscure which rendered property changed.                                                      | **Retain.** They cover actual generated output and unchanged placement/draw cost, rather than source spelling. A smaller visual-equivalence oracle is not established by this task; deleting them would remove the isolation guard.                                                                                                                                                                            |
|    8 | `unit/terrainMerge1140.test.ts` — tuff/hadal scarp buffers                                      | Fixed historical buffer digests constrain geometry refactors.                                                                         | **Retain.** Actual mesh-output equivalence for the two non-Monterey features is a unique cross-site regression guard. Do not drop it merely because it uses hashes.                                                                                                                                                                                                                                            |
|    9 | `e2e/mission.spec.ts` — briefing freezes; Enter starts                                          | 400 ms before a screenshot duplicates visible/content assertions; the separate 800 ms input hold tests freezing.                      | **Cut the 400 ms screenshot sleep.** All briefing, focus, start and freeze assertions remain; retain the 800 ms hold.                                                                                                                                                                                                                                                                                          |
|   10 | `e2e/mission.spec.ts` — scan bow/stern → banner → debrief                                       | Two 300 ms screenshot sleeps follow assertions that already wait for the objective/debrief UI.                                        | **Cut both sleeps.** Real scans, event order, counts, navigation, debrief, screenshots and restart remain.                                                                                                                                                                                                                                                                                                     |
|   11 | `e2e/mission.spec.ts` — briefing traps focus / Escape returns Home                              | 300 ms before a retrying hidden assertion adds a fixed readiness guess.                                                               | **Cut the sleep.** Hidden briefing, visible Home, unchanged mission state, focus trapping and subsequent Enter start are still asserted.                                                                                                                                                                                                                                                                       |
|   12 | `e2e/mission.spec.ts` — crush depth / aborted debrief                                           | 300 ms after Escape is a weak observation window for a negative behavior check.                                                       | **Replace with two rendered frame opportunities.** The debrief must remain visible, Tab trapped, and restart event/navigation correct. A retrying positive visibility check alone could pass before delayed input handling.                                                                                                                                                                                    |
|   13 | `e2e/d2-predive.spec.ts` — Dive settings persist                                                | 300 ms screenshot delay after the Advanced section is hidden and Begin is in the viewport.                                            | **Cut the sleep.** Disclosure visibility, keyboard behavior, persisted settings and screenshot remain. The other 300 ms freeze observation in this spec stays.                                                                                                                                                                                                                                                 |
|   14 | `e2e/settings.spec.ts` — briefing returns Home / settings from Pause                            | 300 ms after Enter in Settings is an input-observation guess.                                                                         | **Replace with two rendered frame opportunities.** Pause stays visible and Escape closes Settings back to Pause; the separate one-second thrust/flood freeze check stays.                                                                                                                                                                                                                                      |
|   15 | `e2e/helpers/titleAudit.ts` — reduced motion idle / Home input and quit                         | Raw 300 ms idle and 100 ms per held pilot key can expire before software WebGL gets a frame. Shared by title and project-base audits. | **Replace with `waitForFrames(page, 2, minimumMs)`.** Preserve the 300/100 ms minimum observation windows and add actual frame opportunities. Draw count, gameplay/save equality, unloaded resources and renderer allocation assertions stay.                                                                                                                                                                  |

Readiness limits such as `waitForFunction(..., { timeout: 45000 })` are maximum
failure bounds, not unconditional sleeps. They stay. Other fixed waits need a
specific observation contract before replacement: `d-photo.spec.ts` waits past
the real 400 ms capture debounce; `f2-life.spec.ts` has camera easing; render and
opening suites have timed atmosphere/settling samples. This audit does not
silently remove those intervals or weaken a numeric regression threshold.

## Round 2: coverage review and validation

The inventory scanned all **278 TypeScript files** under `tests/`: **191 unit
entries and 65 e2e entries**, plus helpers/configuration. The fixed-wait search,
source/hash search, repeated literal test-title search and focused coverage
review selected the 15 rows above. Fixture reads are not classified as source
assertions merely because they use `readFileSync`.

The patch removes **three standalone unit cases**, one spawn-source snapshot
field and two redundant cache identity assertions; it folds the zero-spacing
error-message assertion into the existing loader capability test. **Nine raw
`waitForTimeout` call sites become five deletions and four frame-aware waits**
(59 → 50 remaining sites across `tests/`, 24 → 23 files). These are source-site
counts, not expanded case counts or a measured wall-time speedup.

A syntax-tree comparison retains **all 307 browser matcher expressions** in the
four changed browser files/helper, with identical test declarations. Route,
viewport, save/clock fixtures and screenshot calls are unchanged. The snapshot
comparison permits exactly the scope-correct test-name change and deleted
spawn-source field; all terrain, biome, shader and chimney output values remain
byte-identical. The six removed unit matcher expressions are accounted for by
rows 1, 3, 4 and 5; the diagnostic matcher from row 4 now lives in `TileLoader`.
State/fixture review supplements matcher comparison: equal assertion text alone
is not proof of equivalent coverage.

Validation (logs under `.cache/2140/`):

- **PASS:** TypeScript; production builds for `/` and `/submarine-explorer/`;
  strict content for all 13 sites; attribution; repository-wide Prettier;
  `git diff --check`.
- **PASS:** full unit suite, **191 files / 2,288 tests**, no skips, in 731.06 seconds. Affected-unit check also passes: 4 files / 36 tests.
  The sandbox's stalled default fork run was stopped; unit runs use the existing
  writable config loader, no dependency cache, one thread worker and unchanged
  assertions/timeouts.
- **PASS:** e2e discovery: local 795 cases / 8 declaration-time skips, hosted
  778 / 8, project-base 8 / 0. Each inventory has exhaustive, disjoint 30-shard
  regex selection. No e2e case, skip, retry or timeout configuration changes.
- **ENVIRONMENT FAILURE:** Python 162/166 pass; four unchanged
  `test_ci_build_manifest` cases fail at `spawnSync git EPERM`. The canonical
  build phase bundles successfully, then fails at the same Git provenance call.
  Direct production builds pass; the manifest gate is not bypassed or weakened.
- **BLOCKED BEFORE ASSERTIONS:** targeted browser selection, full suite and
  project-base suite cannot start their owned Vite preview. The full debug log
  records `connect EPERM` for both `::1:4240` and `127.0.0.1:4240`. No browser,
  screenshot or hosted-CI pass is claimed.

The full browser attempt uses `ROUNDS=2`; the two requested review rounds are
complete. On a socket-capable host, run the normal complete gate:

```bash
ROUNDS=2 PW_PORT=4240 PW_OUTDIR=dist-2140 bash tools/gates.sh --full-e2e
```

Evidence: `inventory.json`, `assertion-audit.{mjs,json}`, `shard-audit.log`,
`unit.log`, `final-focused.log`, `typecheck.log`, `build-direct.log`,
`build-base.log`, `build.log`, `python.log`, `content.log`, `attribution.log`,
`prettier.log`, `e2e.log`, `full-e2e.log`, and `base-e2e.log`.

No application changes, dependency changes, new specs, commits or external actions.
