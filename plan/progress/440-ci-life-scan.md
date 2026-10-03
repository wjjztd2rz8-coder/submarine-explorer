# 440 CI life scan

## Plan

1. Reproduce the unchanged wildlife scan with SwiftShader, two CPU cores and CDP CPU throttling; capture scanner deltas, input and geometry.
2. Fix scan tests through existing discovery/scanner hooks without changing gameplay or content; audit related scan specs.
3. Check shard cancellation configuration.
4. Complete three review/verification rounds and run `tools/gates.sh --full-e2e`; report verification limits.

## Findings and reproduction (round 1)

`scan.discovery` supplies `steps * fixedDt` to `Discovery.update`, then to `Scanner.update`. `Time` allows at most eight 60 Hz physics steps per rendered frame: **0.133 seconds of scan progress**, regardless of how long that frame actually takes. Wildlife receives `Time.frameDelta`, capped at **0.25 seconds**. A fixed wall-clock hold therefore does not guarantee enough scanner time, and wildlife can move ahead of scan progress. Keyboard scan is level-triggered, rather than an edge that must coincide with a frame.

Before editing the tests, attempted the original animal test with Chromium `--disable-gpu --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`, `taskset -c 0,1`, and a temporary CDP 12x CPU throttle inserted after boot. **The browser reproduction could not reach boot:** this workspace denies localhost sockets (`connect EPERM ::1:4440` and `127.0.0.1:4440`), and preview startup fails. Dependencies are also mounted read-only; native Vite configuration bundled in `.cache/440` avoids the separate `.vite-temp` write error, but does not solve the socket restriction. No approval/escalation is available in this environment.

Then reproduced the timing failure headlessly, on two cores, with the real `Time`, `Life`, `Scanner`, seed 3, the same comb jelly placement (9 m ahead at 120 m depth), and a stationary sub over an open-water seabed. No synthetic scan-complete event or discovery write was used. For 20 wall seconds:

| FPS | Scanner seconds supplied | Wildlife seconds supplied | Completed |
| --- | ------------------------ | ------------------------- | --------- |
| 60  | 19.98                    | 20                        | 1         |
| 4   | 10.67                    | 20                        | 1         |
| 2   | 5.33                     | 10                        | 1         |
| 1   | 2.67                     | 5                         | 1         |
| 0.5 | 1.33                     | 2.5                       | 0         |

At 0.5 fps the scan reaches **67%**, with input held, the jelly still in range and facing, and no aborts. This isolates insufficient simulation time as a reproducible failure mechanism. It does **not** measure the actual CI runner's FPS or establish which additional geometry/input effects occurred there; a throttled browser run remains unverified.

Raw evidence is retained locally in `.cache/440/headless-samples.jsonl`, `headless-before.log`, `repro-before.log`, and `repro-after.log`. The temporary reproduction specs were removed. A permanent regression in `tests/unit/e2eScan.test.ts` retains the ten-frame/20-second failure and verifies that explicit scanner advancement completes the real animal target.

## Implementation and scan audit (round 2)

- Added `tests/e2e/helpers/scan.ts`. It reads the actual held keyboard/touch scan action, validates the current candidate through real geometry, then advances **only discovery** in 60 Hz increments based on the target's existing `scanSeconds`. The real scanner, recorder, bus subscribers and overlay run; vehicle physics, wildlife, mission clocks and resources do not advance artificially.
- The helper respects dive/pause, photo, briefing/debrief, Journal, Settings and globe gates; uses the deployed ROV pose and its existing POI range multiplier; restores radii and releases keyboard input on failure. It tolerates a rendered frame finishing an explicitly named partial scan between calls.
- The animal fixture publishes its live targets with `Life.update(0, ...)` immediately after spawning and temporarily holds the specimen/target array with the existing `Life.enabled` flag. A `finally` restores life. This removes drift and target-publication races during the discovery assertion.
- Applied the helper to `f2-life`, `discovery`, `d-scan`, `d-sonar`, `d-rov`, `mission`, `d-flow`, `content-missions`, `f2-progress`, `f2-explore`, and `f1-touch`. Partial-progress and holding-after-completion checks now use explicit scan seconds too. Touch tests still dispatch actual touch input. Banner, Journal, persistence, objectives, RP, sample, sonar and per-dive assertions remain.
- Audited remaining raw scan key holds and scan-completion waits. Remaining key holds support explicit partial/post-completion checks or the shared helper. `f2-modes` deliberately emits bus events to test mode/objective handling and has no scan-progress wait.
- Production source and content files are unchanged. No timeout was increased and no new public game hook was added.

CI already had **`strategy.fail-fast: false`**. Kept it. Removed **`--max-failures=1`** from the shard command so later tests within a failed shard are attempted as well. The 20-minute suite budget and newer-push cancellation remain; those can still end a run independently of a test failure. The separate project-base job has no shard matrix.

## Verification and final report (round 3)

- Initial focused checks: typecheck plus scanner, wildlife and helper tests: **35 passed**.
- Final review added modal gate coverage and handling of completion between partial-scan calls. Final focused checks on two cores: **36 passed**, typecheck passed.
- `npx playwright test --list`: **300 tests in 55 files**, including every edited spec, collected successfully.
- Ran `GATES_CONFIG_MODE=writable PW_PORT=4440 tools/gates.sh --full-e2e` after implementation, and again after final review. Build, unit, Python, content, attribution and Prettier gates pass. Final unit count: **1,162 tests across 108 files**; Python: **140 tests**.
- **Both `e2e` and `e2e-base` gates fail before running browser tests:** `Process from config.webServer was not able to start. Exit code: 1`. Native-config preview diagnostics independently confirm the localhost `EPERM` restriction. There are no new browser screenshots to review. **The full gate is not green and browser validation remains outstanding.**
- `git diff --check` passes. Logs: `.cache/440/full-gates-final.log`, `.cache/440/focused-final.log`, `.cache/gates/*.log`.

The change removes the reproduced scan-test timing weakness while preserving gameplay/content. Claude must run the full browser gate, and preferably the original stress reproduction against the pre-fix revision, in a workspace that permits localhost/Chromium before treating CI as verified. No commit or push was performed.

## Orchestrator full-gate follow-up: buried Monterey wall growth

The orchestrator ran the full gate outside the sandbox: build, unit, Python, content, attribution, Prettier, and project-base e2e passed. Main e2e had **278 passed, 21 skipped, 1 failed**. All scan specs passed. The remaining failure was `f-geo-scarp`: Monterey's minimum instance clearance was **-10.625416823047203 m**, below the existing **>-3 m** bound.

### Exact reproduction and cause

Reproduced that exact minimum headlessly using the real Monterey heightmap, default medium-tier terrain, actual `Props` placement and authored `canyon-wall-ledge`. A temporary test asserted the unchanged browser bound and failed before the fix; evidence is in `.cache/440/wall-before.log`. The root transform and sampler match the browser result exactly.

The 96 boulders are correctly seated, with minimum clearance **+0.18850848564272837 m**. The bad anchors belong to **wall sponges and corals**, also included in the browser's instance check. The wall is lifted to the terrain at its foot, but parts of its displaced/terraced face intersect the sloping seabed. `addWallLife` selected face vertices without checking whether terrain buried the final outward-offset anchor, allowing growth to attach more than 10 m underground.

### Fix and regression coverage

`src/world/props/geo/scarp.ts` now passes the existing local ground sampler to `addWallLife` and rejects anchors at or below the seabed. The sampling loop continues to fill the existing requested sponge/coral counts from exposed wall vertices. No content definitions, species, densities, dimensions, materials, gameplay rules, or scanner timing changed. This is a correction to rendered attachment placement.

**No e2e assertions were changed or excluded.** `f-geo-scarp.spec.ts` still checks every instanced mesh with the original **count >20**, **min >-3**, and **max <height/2** bounds.

Added `tests/unit/scarpTerrain.test.ts` for the real Monterey tile at **low, medium, high and ultra** tiers. It checks every instance against those same bounds, requires exposed sponge/coral anchors, and verifies requested growth counts. Medium retains **192 total instances**, including **54 sponges and 42 coral fans**. The measured minimum after the fix is **+0.18850848564272837 m** and maximum is **56.417883849604664 m**, below half the wall's **135.82422256469727 m** height. Boulders are unchanged. Supporting geometry documentation is updated in `docs/props.md`.

Typecheck and **32 focused tests** pass: the four new real-tile cases plus existing talus, Monterey polish and hero-readability tests. Inspected the orchestrator's Monterey toe screenshot; the scene renders correctly. A post-fix browser screenshot/run cannot be produced within this sandbox.

A fresh full-gate attempt is recorded in `.cache/440/full-gates-wall-fix.log`. The orchestrator's original browser log is preserved in `.cache/440/orchestrator-e2e.log`; the placement diagnostics after the fix are in `.cache/440/wall-after.json`.

Final local gates: **PASS build, unit (1,166 tests across 109 files), Python (140 tests), content, attribution and Prettier**. Both browser gates stop at preview startup because this sandbox cannot run the localhost server. `git diff --check` passes. The orchestrator must rerun `tools/gates.sh --full-e2e` outside the sandbox to verify the wall-placement correction in Chromium. No commit or push was performed.
