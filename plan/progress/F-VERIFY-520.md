# F-VERIFY-520: Lost City surroundings and Beebe plume verification

Date: 2026-10-03. Base: `7110f46` (same as local `main`).

**Latest status after orchestrator feedback:** external full gate ran **322 passed / 1 failed / 21 skipped**, with project-base E2E passing. All 15 Lost City/Beebe/readability/plume/five-hero budget cases pass. The sole failure was the title-menu 667×375 touch check; its late Daily-card loading race is addressed below without reducing assertions. Corrected browser cases await the orchestrator's rerun; the sandbox still cannot launch a browser or bind a preview socket.

## Plan and progress

1. Review today's merged surroundings/plume changes and existing guards. Complete.
2. Run five-hero readability, hero integrity, static budgets and related unit tests. Complete; passing.
3. Measure Low rendered budgets, check runtime console output and inspect fresh 844×390 screenshots for both sites. External orchestrator run passes all five rendered budgets and both touch lighting/console cases. Mission screenshots reviewed; persisted free-dive PNGs require a rerun after the attachment fix below. Frame-time comparison is still outstanding.
4. Fix confirmed bugs with regression coverage, rerun relevant checks and log results. Expanded browser coverage, fixed missing benchmark console-error detection, synchronized title assertions with Daily loading, and retained capture files. Static checks pass; post-fix browser execution remains outstanding.

## Reviewed changes

- Lost City: `6462675`, `509c1ec`, `31f0672`; tower flanges/rubble, cooler slope biome, larger instanced scatter, retained +16 ambient fill, reduced distance haze, rooted life embedding and colony scale variation.
- Beebe: `9763ccf`, `101b9f2`, merged by `f145e4e`; deterministic per-orifice height/width/opacity/lean, current bend, small white-smoker wisps, additive warm haze and widened prop plume bounds.
- Subsequent main fix `2647826` already makes haze opt-in; Beebe's registered override preserves its extra batched draw. The existing preset tests verify generic vents retain two draws, Beebe gets three and carbonate vents omit warm haze.

## Readability and hero integrity

Targeted unit command:

```bash
npm test -- --configLoader runner --cache=false \
  tests/unit/heroReadability.test.ts tests/unit/heroIntegrity.test.ts \
  tests/unit/perf-budget.test.ts tests/unit/lostCityReadability.test.ts \
  tests/unit/lostCityBiome.test.ts tests/unit/presets.test.ts
```

**53/53 pass.** `heroReadability.test.ts` still covers Titanic, Lost City, Great Blue Hole, Beebe and Monterey at Low/Medium (10 cases). Checks include free/mission openings, collision-free spawn, nearby hero/terrain, ambient intensity and linear luminance after fog at nine floor samples, and fill nonaccumulation. `heroIntegrity.test.ts` passes all 17 cases, covering five-site Journal/POI links, supported geometry, first-minute scan access and carbonate replacement placement.

Negative control: temporarily changed only `VentPreset.update()`'s runtime fill to zero while leaving authored overrides intact. The readability suite exits 1 with exactly **4 failures / 6 passes**: Lost City Low/Medium drop to about 0.227 ambient versus a floor of 12; Beebe Low/Medium drop to 0.18 versus 6. Source was restored byte-for-byte in `finally`; restored readability run passes **10/10**. No retained `src/` or `data/` changes.

Evidence: `.cache/f-verify-520/targeted-unit.log`, `vent-fill-negative-control.log`, `hero-restored.log`.

## Low static prop budgets

Ran `PERF_BUDGET_STATIC=1` with the current test against current source and against pre-visual source `c638c21`, extracted into an ignored isolated directory. Both runs use the **same current props documents and tile metadata**, isolating builder changes from older content revisions. Both pass all ten Low/High diagnostic cases.

| Site            | Before Low calls | After Low calls | Before Low triangles | After Low triangles |
| --------------- | ---------------: | --------------: | -------------------: | ------------------: |
| Titanic         |               33 |              33 |               83,894 |              83,894 |
| Lost City       |               26 |              26 |               39,428 |              49,620 |
| Great Blue Hole |                8 |               8 |               18,720 |              18,720 |
| Beebe           |               12 |              12 |               11,026 |              11,026 |
| Monterey        |               30 |              30 |               84,220 |              84,220 |

Lost City's richer geometry adds 10,192 static triangles (+25.8%), with unchanged prop draw count. All Low props remain below the existing **1,200 calls / 1.2M triangles** guard. This is not proof of unchanged frame time or full-frame cost: static counts include all prop trees/material groups/internal LODs but exclude terrain/scatter, life, vehicles and preset haze. Beebe's one extra preset haze draw is covered separately by unit tests. Rendered performance remains unmeasured.

Evidence: `.cache/f-verify-520/static-{baseline,current}.json` and corresponding logs. Baseline source and test configuration are isolated in an ignored directory; the repository dependency link and configuration were not changed.

## Initial browser coverage and sandbox execution

Retained changes:

- `f-perf-budget.spec.ts`: run the existing 30-frame warmup/60-frame sample budget check for all five heroes, rather than Titanic alone. Preserve the 1,500 calls / 1.5M triangles limits, expected prop counts, Low tier, dynamic-resolution setting and agreement with `renderer.info`. Collect console errors as well as page exceptions.
- `f-verify-520.spec.ts`: fresh Arcade, Low, touch contexts at **844×390**, DPR 1, tutorial off, life seed 42 and dynamic resolution off for Lost City and Beebe. Wait for props/preset/discovery/life/exploration, hold the opening pose, settle 30 frames and check loading, ambient/fog floors, geometry budget and console/page errors. Attach each player-view PNG and opening diagnostics. Lighting proxies do not replace visual review of terrain, plume and hull readability.
- `tools/perf-budget.mjs`: collect `console.error` events, including shader diagnostics which can occur without a page exception; reject errors through screenshot completion before recording a successful result.

Playwright discovery passes: **15 cases in four specs**, comprising five hero budgets, two touch captures, seven existing Lost City readability cases and the existing Beebe plume case. Typecheck passes. These browser assertions were **initially unexecuted** in the sandbox; the subsequent external results are recorded below.

Attempts:

- `tools/golden.sh`: failed at the default Vite config loader's write to the read-only `node_modules/.vite-temp` (`EROFS`). No captures.
- `GATES_CONFIG_MODE=writable PW_PORT=4252 PW_OUTDIR=dist-verify-520 bash tools/gates.sh --full-e2e`: static gates pass; full E2E and project-base E2E fail at preview startup, before any browser case.
- Targeted four-spec run with `GATES_CONFIG_MODE=writable`, port 4252, production output `dist-verify-520`, zero retries: preview startup fails; zero cases executed.
- Preview using a writable Rolldown config bundle and native loader removes the dependency-write problem, but fails with **`listen EPERM: operation not permitted 127.0.0.1:4252`**.
- `PERF_TIERS=low node tools/perf-budget.mjs http://127.0.0.1:4252/ .cache/f-verify-520/runtime`: Chromium exits before creating a page with **`sandbox_host_linux.cc:41 ... shutdown: Operation not permitted (1)`**. A separate launch probe has the same result.

Logs: `.cache/f-verify-520/{gates,targeted-e2e,e2e-discovery,golden,preview-native,perf-runtime}.log`; detailed gate logs in `.cache/gates/`; golden build failure in `.cache/golden-build.log`.

**The initial sandbox attempt obtained no fresh captures or runtime measurements.** The external run below supersedes its budget/console status; frame-time comparison and persisted free-dive screenshot review remain outstanding.

## Validation and remaining work

| Check                                             | Result                       |
| ------------------------------------------------- | ---------------------------- |
| Production build / typecheck                      | Pass                         |
| Full unit suite                                   | 1,285 tests / 119 files pass |
| Python                                            | 144 tests pass               |
| Strict content / attribution                      | Pass                         |
| Targeted visual/integrity/readability unit tests  | 53 pass                      |
| Low/High static diagnostic runs, before and after | 10 pass each                 |
| Whole-repository formatting / diff whitespace     | Pass                         |
| Full and project-base E2E                         | Blocked at preview startup   |
| Runtime perf / console / 844×390 visual review    | Blocked                      |

On a host that permits preview sockets and Chromium, rebuild and run:

```bash
npm run build -- --outDir dist-verify-520
PW_PORT=4252 PW_OUTDIR=dist-verify-520 npx playwright test \
  tests/e2e/f-perf-budget.spec.ts tests/e2e/f-verify-520.spec.ts \
  tests/e2e/f-lostcity-readable.spec.ts tests/e2e/f-beebe-plumes.spec.ts \
  --retries=0 --output=test-results-verify-520
```

Inspect the two attached 844×390 PNGs for recognizable hulls, floor relief, tower/chimney detail and plume separation. Then run the Low benchmark against previews built from the pre-visual and current revisions on the same host; compare draws/triangles and host-specific mean/p50/p95, followed by the full E2E gate. Fix any observed regression with focused tests before completing sign-off.

## Orchestrator gate follow-up

The orchestrator ran `tools/gates.sh --full-e2e` outside the sandbox. Build, 1,285 unit tests, 144 Python tests, strict content, attribution and formatting pass. Root E2E: **322 passed, 1 failed, 21 skipped**; project-base E2E passes. Evidence copied before another gate can overwrite it: `.cache/f-verify-520/orchestrator-e2e.log` and `orchestrator-e2e-base.log`. Artifact root: `test-results-gates-4371-3704548/`.

All seven Lost City readability cases, the Beebe plume test, all five expanded Low rendered-budget cases and both 844×390 touch lighting/console cases pass. This establishes rendered geometry stays within the unchanged budgets and no collected console/page errors occurred in those checks. It does **not** establish unchanged frame-time distributions.

### Title touch failure and correction

The sole failed case is `f-title-scene.spec.ts`, `title mobile 667x375`, at the strict centre-point hit assertion. The saved `home-mobile.png` shows Continue, Dive sites, Free dive and Mode with **no Daily card**. The error-context snapshot shows the **Daily card now inserted between Free dive and Mode**.

Source explains the change: shell mission summaries load asynchronously after shell init; `createDailySystem()` initially sees an empty catalogue and inserts the card on its next one-second refresh. `__gameReady` and title `drawCount` signal a presented frame, not a complete menu. The test enumerated visible buttons and scrolled/hit-tested while the new row could move them. No persistent CSS overlap was established by the supplied failure.

Corrections in both title layout suites:

- Assert Daily is visible before screenshots, locator enumeration and scrolling. This includes the Daily action in the existing checks and prevents incomplete-menu geometry from becoming the baseline.
- The 667×375 title case now holds the catalogue request until after home/title presentation, asserts that a request was intercepted and the card is initially hidden, releases it in `finally`, then waits for Daily and runs the original checks. This exercises asynchronous loading explicitly, with no fixed settle sleep.
- Preserve all 48 px width/height floors, viewport/non-overlap checks, strict `elementFromPoint` ownership, actual touch navigation and title/globe activity assertions. Add the button label to hit-test failures. No assertion or timeout limit was weakened.

### Capture persistence correction and available visual evidence

The two hero touch capture cases used inline `testInfo.attach` bodies. The configured list reporter did not persist them, and no `f-verify-520` PNG/JSON files exist in the external artifact tree despite both cases passing. Change the spec to write PNGs via `page.screenshot({ path: testInfo.outputPath(...) })`, write the opening JSON to a real output file, and attach those paths. Output names are `<site>-low-844x390.png` and `<site>-opening.json`.

Reviewed the external Low-tier 844×390 **mission/tutorial** captures from `f-bughunt-15.spec.ts`: Lost City (`...-b1ad2-.../arcade-opening.png`) has a readable hull, tower flanges and slope; Beebe at 100% (`...-fa56b-.../arcade-opening.png`) has a visible brown floor and lit hull, with dark chimney silhouettes and a small sub. These are not black frames, but the tutorial overlays obscure the chimney/plume area and the routes differ from the new free-dive capture cases. They do not replace review of the intended uncluttered free-dive screenshots. The separately persisted 1280×720 Beebe Low screenshot also shows the floor, hull and pale prop plume; it is not the requested phone aspect.

### Follow-up checks and rerun

Post-fix typecheck passes, and **20/20** focused unit cases in `homeFocus`, `dailySystem` and `titleLayoutBoundary` pass. Playwright discovery passes: **27 cases across the two title suites and hero capture suite**. Whole-repository Prettier and `git diff --check` pass. No production `src/` or `data/` changes were required. Post-fix browser tests cannot execute inside this sandbox; their runtime status is pending, not green.

Recommended external verification, after rebuilding the gate output:

```bash
PW_PORT=4371 PW_OUTDIR=<fresh-build-output> npx playwright test \
  tests/e2e/f-title-scene.spec.ts tests/e2e/f-title-layout.spec.ts \
  --repeat-each=3 --retries=0 --output=test-results-verify-520-title
PW_PORT=4371 PW_OUTDIR=<fresh-build-output> npx playwright test \
  tests/e2e/f-verify-520.spec.ts --retries=0 --output=test-results-verify-520-captures
bash tools/gates.sh --full-e2e
```

Inspect the two persisted 844×390 free-dive PNGs and attach their opening metrics to final sign-off. Record the rerun's result separately from the previous full gate failure.
