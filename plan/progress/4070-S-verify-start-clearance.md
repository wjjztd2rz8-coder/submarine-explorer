# S-verify: deferred mission starts on shipped terrain

2026-10-25. DIRECTOR Backlog **7, S-verify / S-bughunt [Codex, standing]**.
Audited HEAD: **`d7a02fd78fa4c3fa34057b2e53b1b149729ff8e3`**, initially clean.
Local e2e mode: **none**.

**Clean for the selected integration slice:** all six deferred/fresh comparisons
(12 independent contexts) produce exactly equal `(x, y, z, yaw)`, fitted hull,
placed POIs and first-target scan radius. Independent clearance and authored
approach checks pass. No discrepancy or production correction is proposed.
Only this progress note changes.

## Provenance and ownership

Read DIRECTOR Backlog, simplicity rules and rubric; CONTRIBUTING-AGENTS; the
newest dated REVIEWS entry, **2026-10-24 night** (the file begins with an older
2026-10-23 entry); OVERNIGHT-LOG through **run 140**; and collected progress
[4010](4010-S-bughunt-stale-mode-reads.md),
[3140](3140-S-bughunt-hero-spawn.md),
[3280](3280-S-verify-spawn-clear.md),
[3370](3370-S-bughunt-opening-first-move.md),
[3410](3410-S-bughunt-late-opening-placement.md),
[3420](3420-S-bughunt-late-placement-fix.md) and
[3490](3490-S-verify-late-placement-modes.md).
Read 4010's actual diff with `git show da1b44d7 -- src/app/systems/mission.ts`:
the captured option becomes a getter of `ctx.effective.gameplay.startPosition`.
It is collected through merge `c48b320b`; this checkout contains the correction.

Read launched 4010/4030/4040/4060/4070 briefs under
`/home/vijay/submarine-explorer/.cache/codex/queue/launched/`, 4010's result and
neighboring available final reports. `queue/launched.log` registers this exact
slice at **2026-10-25 07:00:02**. No earlier 4070 progress/history exists.
The 4010 result wrapper says smoke gates PASS, whereas its embedded Codex report
and detailed progress note record browser-server startup and five Python
failures. Those are separate historical reports, not validation performed here.

`git rev-parse HEAD`, `git status --short`, `git worktree list --porcelain`,
per-tree status/diff statistics and `git log HEAD..<tree-SHA>` established the
collection boundary. Main and this worktree share the pinned SHA. Relevant
uncollected diffs were read without importing them:

- Finished 4030 owns `LifeSim.ts`, `lifeSim.test.ts` and its note (birth-frame
  integration); finished 4040 owns `Progress.ts`, `progress.test.ts` and its note
  (unresolved-objective ratings). Neither changes start selection or hull fitting.
- 4060 owns only its publication/scan audit note. Its final report is available.
  None of these patches or their claimed suite results is used as passing evidence.
- Held 2980/3050 retain scarp/Terrain collision changes; 3310 has its divergent
  committed journey change; 3320/3380 retain reports, and 3340 retains its touch
  spec/report. These lanes, 3510 journeys, owner collision decisions and the four
  expected failures remain untouched. 4080 is queued; 4050 is already collected.

Ownership was rechecked after diagnostics. No overlapping placement patch or
completed audit of this specific live-preference/real-resource comparison was
found. No uncollected patch is required by the probe. A read-only Sol review was
requested under CONTRIBUTING-AGENTS' owner instruction; it confirmed the coverage
gap and reviewed the disposable probe/results without requesting a correction.

## Existing proof and selected gap

| Evidence                                                                                                                                                                                                                                                   | Already proves                                                                                                                        | Remaining boundary                                                                                                           |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| [3140](3140-S-bughunt-hero-spawn.md), [3280](3280-S-verify-spawn-clear.md); [missionApproach](../../tests/unit/missionApproach.test.ts), [missionComposition](../../tests/unit/missionComposition.test.ts)                                                 | Actual heightmaps, hull vertices, shipped prop contacts, authored approaches, fitted hulls and prior all-site/tier baseline clearance | Static opening selection; no pending live preference edit                                                                    |
| [3370](3370-S-bughunt-opening-first-move.md), [3410](3410-S-bughunt-late-opening-placement.md), [3420](3420-S-bughunt-late-placement-fix.md), [3490](3490-S-verify-late-placement-modes.md); [firstMove](../../tests/unit/firstMove.test.ts) lines 423–725 | First-frame/late-placement reanchor, all 13 sites in Arcade/Realistic, loading orders and fresh lifecycle controls                    | Real-resource caller fixture has a static Save; no deferred preference change                                                |
| [4010](4010-S-bughunt-stale-mode-reads.md); [firstMove](../../tests/unit/firstMove.test.ts) lines 317–421                                                                                                                                                  | Held POI readiness, live Custom edits/preset switches, explicit Begin intent, settled pose after further edits and props notification | Titanic flat -3820 m terrain, no props; no fresh final-settings resource comparison                                          |
| [missionApproachSystem](../../tests/unit/missionApproachSystem.test.ts), [missionRouter](../../tests/unit/missionRouter.test.ts)                                                                                                                           | Glue, scan-radius restoration, surface/heading math, hull loadout, routing, Home guard and disposal                                   | Glue fixture uses flat terrain and mocked router; router math alone does not combine live settings with loaded site geometry |
| [deepOpening](../../tests/unit/deepOpening.test.ts)                                                                                                                                                                                                        | Challenger/Endurance fixed openings, actual terrain/props, hull and camera calculations, staged life/snapshots                        | Different sites and static starts, no pending preference read. Read only; no wildlife simulation or snapshot rerun here      |

Selected mission IDs equal the site IDs:

- **Hunga Tonga, `hunga-tonga-caldera`:** briefing depth 469 m, fitted **A**;
  shallow sloped terrain and tuff-wall prop, first target `hunga-tonga-rim-wall`.
  Exercises saved Custom surface → Arcade near-site and Custom near-site → surface.
- **Titanic, `titanic`:** 3800 m, fitted **B**; actual wreck/debris geometry,
  first target `titanic-bow`. Exercises Custom surface → Realistic near-site and
  Custom near-site → surface, filling the flat-terrain limitation in 4010.
- **Great Blue Hole, `great-blue-hole`:** 125 m, fitted **A**, despite authored
  mission metadata saying B; gallery geometry and runtime terrain reconstruction.
  Exercises both Custom preference directions, first target
  `great-blue-hole-stalactites`. Select by primary **mission objective** ID:
  gallery POIs themselves have `primary: false` in POI data.

This deliberately samples both supported starts and both hull classes needed
by these three missions, plus Arcade, Realistic and Custom final settings. It
is not another 13-site/tier static spawn matrix or six new permanent regressions.

## Diagnostic path and resources

Disposable source/config/results/logs: `/tmp/4070-start-clearance/`.
`start-clearance.test.ts` reuses the existing firstMove DOM-view mocks; the
production MissionRouter remains real. Each invocation constructs a new
in-memory `Save(storage: null)`, resolved settings, Progress, progress system,
submarine system/SubMesh, Terrain, Props/props system and CameraRig. No renderer
or WebGL context is constructed. CameraRig only performs numerical calculations.

Terrain uses the actual local `meta.json` and float32 `heightmap.bin`, default
Low terrain configuration, unchanged detail/carve/fidelity rules and
`Terrain.sampleHeight`/`getNormal`. All three metadata sources say **GMRT** and
`nodata_count: 0`; each binary length equals `cols * rows * 4`. No synthetic
terrain sampler or alternate clearance oracle replaces runtime Terrain.

| Site            | Grid / binary bytes   | Runtime chunks / base subdivision | Actual props / colliders |
| --------------- | --------------------- | --------------------------------- | ------------------------ |
| Hunga Tonga     | 586 × 546 / 1,279,824 | 90 / 1                            | 1 / 189                  |
| Titanic         | 548 × 546 / 1,196,832 | 144 / 1                           | 7 / 12                   |
| Great Blue Hole | 574 × 547 / 1,255,912 | 144 / 1                           | 2 / 271                  |

All selected props are shipped procedural models: Hunga's `caldera-tuff-wall`,
Titanic's two hulls/five debris groups, and Blue Hole's two grotto groups.
Actual `propsSystem` → `Props.load` → placement runs against local JSON responses;
all selected props load, with **0 failed / 0 skipped / 0 unloaded**. No GLB is
required by these three sites; Blake GLBs and other sites are outside this sample.

POI IO uses production `loadPois` → `fetchContentJson` → validation → `placePois`,
with local-file responses and a held promise on `pois.json`. All authored POIs
load and lie inside the tile, with no POI warnings. The Discovery DOM/guide/scanner
shell is replaced by this real load/place readiness boundary; full Discovery,
guide loading and persisted browser storage are not exercised.

Sequence for every pair:

1. Start the real skipped-briefing mission while POI IO is pending; initialize
   modes before the router, then subscribe to Save changes as production does.
2. Finish actual props loading while POIs remain unavailable. Verify no mission
   reset occurred. Pause, edit Save's supported start option or choose the preset,
   and verify `ctx.effective` contains the selected final start.
3. Release POI IO. Modes installs the loaded base radii, Mission resolves its
   objectives and the router invokes the live getter and real mission placement.
   Observe exactly one `sub.reset` and one reanchor notification after setup.
4. Independently rebuild a fresh context with the final settings present from
   initialization, load the same resources in the same order and compare results.
   Both contexts have all resources loaded at measurement. This is a fresh
   final-settings boot fixture, not a persisted reload or browser session.

No post-initialization pose is injected. Independent contracts use the existing
visible-hull-vertex `hullClearance` helper; centre/seabed clearance; fitted rating
and surface bounds; real prop collision with the established `hullRadius + 4 m`
margin; authored surface coordinates/depth; and near-site first-target range,
scan exclusion and signed authored yaw offset. The range/yaw constants are the
existing product contracts, not new thresholds. Fresh-context equality supplies
a second check of the deferred ordering rather than an expected pose produced
by calling the same spawn function directly.

## Numerical results and baseline comparison

Coordinates are world metres, yaw radians, rounded below to six decimals.
Full-precision records are in `results.json`. **Every pair has exact array
and hull equality: maximum measured pose-component delta = 0.**

| Site / final choice / mode           | Hull | Deferred = fresh `(x, y, z, yaw)`                    | First-target range / scan radius (m) | Minimum sampled visible-hull gap (m) |
| ------------------------------------ | ---- | ---------------------------------------------------- | ------------------------------------ | ------------------------------------ |
| Hunga Tonga / near-site / arcade     | A    | `(-2240.666632, -449.114960, 2270.771487, 1.570796)` | 160.000000 / 120                     | 35.436713                            |
| Hunga Tonga / surface / custom       | A    | `(1253.383550, -8.000000, 934.931487, -1.919862)`    | 3622.840118 / 600                    | 133.559246                           |
| Titanic / near-site / realistic      | B    | `(426.885002, -3768.000000, -275.987110, -0.785398)` | 140.000000 / 36                      | 26.061174                            |
| Titanic / surface / custom           | B    | `(-711.186512, -8.000000, -2036.587816, 2.617994)`   | 4280.549286 / 100                    | 3800.374120                          |
| Great Blue Hole / near-site / custom | A    | `(-163.151627, -11.605201, -44.801940, -1.570796)`   | 150.000000 / 100                     | 109.489745                           |
| Great Blue Hole / surface / custom   | A    | `(3849.144079, -8.000000, -11.405940, -1.570796)`    | 4160.886413 / 100                    | 55.583652                            |

The three near-site distances remain exactly the authored **160 / 140 / 150 m**
to floating-point precision (existing assertion: two decimal places), beyond the
resolved scan radii **120 / 36 / 100 m** respectively. The selected surface
starts retain authored X/Z and hull-safe **y = -8 m**. No opening policy is changed.

Reuse the historical baseline instead of recreating its full matrix:
3140's Low Hunga gap **35.44 m** agrees with **35.436713 m** here;
3280's all-tier minimum Titanic **26.06 m** agrees with **26.061174 m**;
Blue Hole **109.49 m** agrees with **109.489745 m**. These are consistency checks
at the precision and scopes reported by those notes, not claims that every
historical intermediate SHA/tier/mode has identical geometry. The selected
unchanged Low approach cases also pass on the pinned SHA. General route
navigation, reachability and collision repair are not repeated.

## Reused intent, stability and lifecycle controls

- Existing firstMove's six pending-start cases (lines 317–421) are run unchanged:
  its two explicit Begin cases preserve the captured choice across a conflicting
  pending preference edit. All six retain the settled pose after another edit
  and `props:loaded`. No claim is made that preferences override explicit intent.
- Existing Beebe Arcade `skip-delayed-ready`, `free-no-reset` and
  `restart-after-debrief`, plus the free-dive/fresh-camera control, exercise real
  reanchoring, the depth-probe no-reset case and fresh-context cleanup. 3490's
  wider all-site/mode late-prop matrix remains prior evidence, not a new run.
- `arcadeLoadout.test.ts` lines 806–840 covers Home cancelling pending starts
  with/without skip briefing; its active-dive refit/disposal control also passes.
  `missionApproachSystem.test.ts` lines 109–119 retains Home/late-prop protection.
- URL precedence is preserved by `mission.ts` lines 42–45 (`disposed`, Home,
  `poi`/`at`/`depth` guards). Existing headless `?depth=` spawn, `?at=` parse/pose,
  free-depth no-reset and disposed-Discovery/late-POI-probe controls pass.
  These do not claim a new end-to-end mission-plus-POI/at precedence matrix;
  browser URL/start specs were read where relevant, not run.

The new diagnostic loads props **before** releasing POIs; post-placement prop
arrival and settled-choice retention are covered by the existing controls above.
It does not add another late-resource cross product or replay 4010's stale-read hunt.

## Exact commands and actual outcomes

Run from the pinned worktree. Logs named below are under
`/tmp/4070-start-clearance/`. Every listed Vitest command used Node only.

```bash
python3 /tmp/4070-start-clearance/build-probe.py
node node_modules/vitest/vitest.mjs run --config /tmp/4070-start-clearance/vitest.config.mjs --configLoader runner --cache=false --reporter verbose > /tmp/4070-start-clearance/diagnostic.log 2>&1
```

Generator and diagnostic exit **0**; **1 file / 6 comparisons passed**, **10.85 s**.
`results.json` contains **12** records, with exact paired hull/pose/POI/radius/prop
statistics equality. Disposable probe SHA-256:
`cb1b2b9a9e1381ccbe76189c55e0e28e439945887fd9e610f2b24f233c49724a`;
results SHA-256:
`2778f84d7f4f8a592e9d3afaea8d787a988d86c71c6954013c39d86b672060f6`.
An earlier inline Python generator attempt exited **1** with an f-string brace
syntax error before generating/running the probe. The corrected generator above
succeeded; that setup error is not a game failure or regression-before evidence.

```bash
node_modules/.bin/vitest run --configLoader runner --cache=false tests/unit/missionApproachSystem.test.ts tests/unit/missionRouter.test.ts tests/unit/f2-modes.test.ts > /tmp/4070-start-clearance/existing-glue.log 2>&1
node_modules/.bin/vitest run --configLoader runner --cache=false tests/unit/firstMove.test.ts -t 'pending mission start|beebe-vent-field / arcade / (skip-delayed-ready|free-no-reset|restart-after-debrief)|anchors free dive' > /tmp/4070-start-clearance/existing-firstMove.log 2>&1
node_modules/.bin/vitest run --configLoader runner --cache=false tests/unit/missionApproach.test.ts -t '(hunga-tonga-caldera|titanic|great-blue-hole) low' > /tmp/4070-start-clearance/existing-approach.log 2>&1
node_modules/.bin/vitest run --configLoader runner --cache=false tests/unit/arcadeLoadout.test.ts -t 'Home cancels pending|defers mode refits' > /tmp/4070-start-clearance/existing-lifecycle.log 2>&1
node_modules/.bin/vitest run --configLoader runner --cache=false tests/unit/gameSpawn.test.ts tests/unit/props-collision.test.ts tests/unit/discoveryReward1240.test.ts -t '\?depth=|\?at=|late POIs and guide' > /tmp/4070-start-clearance/existing-probes.log 2>&1
```

| Log                      | Actual exit | Completed Vitest result              | Duration |
| ------------------------ | ----------- | ------------------------------------ | -------- |
| `existing-glue.log`      | 0           | 3 files / 65 passed                  | 439 ms   |
| `existing-firstMove.log` | 0           | 1 file / 10 passed, 101 filtered out | 1.78 s   |
| `existing-approach.log`  | 0           | 1 file / 3 passed, 43 filtered out   | 2.49 s   |
| `existing-lifecycle.log` | 0           | 1 file / 3 passed, 66 filtered out   | 892 ms   |
| `existing-probes.log`    | 0           | 3 files / 4 passed, 42 filtered out  | 562 ms   |

**85 existing selected tests passed**, plus the six disposable paired checks.
Filtered tests are Vitest name-selection skips, not added skips or weakened tests.
These are completed command exit codes and Vitest summaries, independent of the
historical wrapper PASS labels or orchestrator review messages. No repository-wide
build/gates, Python suite, hosted workflow or local e2e was requested or run.

```bash
node_modules/.bin/prettier --write plan/progress/4070-S-verify-start-clearance.md
node_modules/.bin/prettier --check plan/progress/4070-S-verify-start-clearance.md
git diff --check
git rev-parse HEAD
git status --short
```

Owned-note Prettier write and check: exit **0**. `git diff --check`: exit **0**.
Because the owned note is new/untracked, also run
`git diff --no-index --check /dev/null plan/progress/4070-S-verify-start-clearance.md`
to inspect its actual contents: exit **1**, with **no whitespace diagnostics**
(the no-index comparison includes a new file versus `/dev/null`). This auxiliary
comparison is recorded separately from the successful required diff check.
Final HEAD remains the audited SHA;
status contains only `?? plan/progress/4070-S-verify-start-clearance.md`.

## Simplicity, rubric and limits

Report only: no production/test/fixture/data/configuration/dependency/tool changes,
no new settings, guidance surface, layout patches, runtime machinery, shared-code
site branches or permanent test duplication. Existing assertions, snapshots,
thresholds, budgets, skips and product policies remain intact. Real GMRT terrain,
all 13 identities, five hero set pieces, scan, Journal, life, input and accessibility
are protected by leaving their implementation unchanged; Arcade stays default.

This supports correct start selection, comfortable placement and honest reporting.
It does not establish rewardingness, visual readability, beauty, touch layout or
physical-phone performance; those rubric judgments remain with Claude/owner.

Node runs real terrain/prop mesh construction and numerical sampling without
rendering. Canvas contexts return null and images signal failure, so terrain
texture maps `basalt_a.jpg`, `silt_a.jpg`, `carbonate_a.jpg` warn and retain fallback
materials (24 expected warnings across 12 contexts). Textures are not needed by
the sampler. No prop is unloaded in this three-site sample. The visible-hull
check samples mesh vertices, not every point of every triangle/cosmetic, and
prop keepout uses the existing collision sphere/margin. There is no exhaustive
continuous hull/roof-intersection claim.

Resource IO timing is controlled local-file delivery; network timing/frequency,
full Discovery/guide UI, actual physics travel, scanner completion, persisted
reloads, currents/power/life simulation and unselected site/tier combinations
are outside this diagnostic. No GPU, browser, WebGL, rendering, screenshots,
pixel/visual acceptance, unaided journey or real-phone validation is claimed.
No merge, push, tag or hosted workflow action was performed.
