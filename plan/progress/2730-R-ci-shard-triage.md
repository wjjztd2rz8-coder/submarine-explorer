# R-ci-shard-triage — hosted failure inventory

Backlog: **DIRECTOR.md item 12e, R-ci-shard-triage**, brief 2730.
Date: 2026-10-20. Status: **audit complete; remaining failures reported; no runtime/spec fixes claimed**.

## Finding

P2-copy explains **29 of 43 failed cases** in the requested run, all in `hud-touch.spec.ts`. Each exact case has a passing reporter line in newest main CI. **No title spec failed in the requested run.** The other 14 original failures were 11 scan-journey cases, two Lost City preset assertions, and one shell timeout. Thirteen recur on newest main; the shell case passes there, while one different fidelity case times out.

Most red shards shared HUD test assumptions: **22 of the 28 red shards** contained a HUD failure. Builds, static checks, project-base checks, dependencies and browser installation succeeded. There is **no evidence of a shared build, runner installation, or shard-wide timeout failure**. The isolated timed-out tests reached individual 240-second limits, below the 1,500-second shard limit. The 46-minute run elapsed time includes runner scheduling and shard waves.

## Scope and ownership recheck

Before considering edits, checked worktrees, status/history, CONTRIBUTING-AGENTS.md, DIRECTOR, P2-copy, and launched briefs 2700–2730 in the main checkout's `.cache/codex/queue/launched/`. Rechecked the active journey, hull and event worktrees: their changes concern journal-debrief, vehicle clearance and event unit coverage respectively. Did not duplicate or edit those changes. This checkout starts at newest main SHA `09ec9f7b4c6fce24d715941824c3b62a7b042736` and was clean.

Only this progress note changes. No art, geometry, CSS, layout, application behavior, assertion, tooling, or DIRECTOR edits. No new specs, guidance or settings. No merge, push or tag.

## Hosted evidence and actual modes

| Run                                                                                                           | SHA       | Elapsed | E2E shards        | E2E case outcomes            |
| ------------------------------------------------------------------------------------------------------------- | --------- | ------- | ----------------- | ---------------------------- |
| [Requested CI 39173052443](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39173052443)   | `cb279a7` | 46m04s  | 10 pass / 28 fail | 693 pass / 43 fail / 68 skip |
| [Newest main CI 39179986984](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39179986984) | `09ec9f7` | 48m07s  | 26 pass / 12 fail | 722 pass / 14 fail / 68 skip |

Both had four successful non-shard jobs: static checks, root build, project-base build, and project-base browser check. The latter's **8 passes** are separate from these 38-shard totals. Skips are not passes.

Actual hosted mode: **full push-CI e2e**, printed as `FAIL gates (e2e=full)`; Chromium, one worker per shard, CI Low storage seed, explicit tier overrides, `@render` excluded, zero retries. Per-shard command:

```bash
bash tools/gates.sh --phase e2e --prebuilt -- N/38 \
  --reporter=list,json,html --global-timeout=1500000 --retries=0
```

Used `gh run view RUN --json databaseId,headSha,status,conclusion,createdAt,updatedAt,url,jobs`, `gh run view RUN --log-failed`, and `gh run list --branch main --limit 12 --json databaseId,headSha,name,status,conclusion,createdAt,updatedAt,url`. Original/newest CI `--log-failed` returned exit zero with empty stdout; their corresponding complete gh cached ZIPs contained the actual logs. Extracted top-level per-job logs once, deduplicating the gate's repeated summaries. Cross-checked all 38 shard conclusions against job metadata, failure headers against detailed error blocks, and all 29 P2-covered cases against passing lines on newest main. Subsequent direct API archive attempts produced zero bytes and are not counted as evidence retrieval.

Retained source archives, metadata, per-case error blocks, per-shard totals, and local check logs in this worktree's ignored `.cache/codex/ci-shard-triage/`. Archives: `run-log-39173052443-1792363057.zip` and `run-log-39179986984-1792368950.zip`. Inventories: `old-cases.json`, `new-cases.json`, `old-shards.json`, `new-shards.json`. The complete original failure inventory also follows.

## Original failures grouped by cause

Each table lists every original failed test exactly once, with its hosted job. All are Chromium. Locations match the original run.

### A. Wildlife supersedes the catalog tutorial: 12 cases, fixed by P2-copy

`hud-touch.spec.ts:1595:9`: `expect(locator).toHaveAttribute(expected) failed`, locator `.guidance-slot[data-step]`, expected `data-step="move"`, **element(s) not found**, line 1676. After the Arcade 100 m scan floor, procedural life could remain in range at the fixture's parking spots. P2-copy changed this catalog guidance fixture to `life=0`. All 12 pass on newest main.

| Shard                                                                                                     | Failing test                                                                                                                                         |
| --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| [10/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39173052443/job/117812745537) | `tests/e2e/hud-touch.spec.ts:1595:9 › catalog tutorial and reload › 667x375-touch › hudson-canyon: tutorial, contact, reward, chip and reload`       |
| [23/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39173052443/job/117812745521) | `tests/e2e/hud-touch.spec.ts:1595:9 › catalog tutorial and reload › 667x375-touch › kamaehuakanaloa: tutorial, contact, reward, chip and reload`     |
| [4/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39173052443/job/117812745551)  | `tests/e2e/hud-touch.spec.ts:1595:9 › catalog tutorial and reload › 1024x768-touch › hudson-canyon: tutorial, contact, reward, chip and reload`      |
| [7/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39173052443/job/117812745375)  | `tests/e2e/hud-touch.spec.ts:1595:9 › catalog tutorial and reload › 844x390-touch › kamaehuakanaloa: tutorial, contact, reward, chip and reload`     |
| [14/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39173052443/job/117812745433) | `tests/e2e/hud-touch.spec.ts:1595:9 › catalog tutorial and reload › 390x844-touch › hudson-canyon: tutorial, contact, reward, chip and reload`       |
| [14/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39173052443/job/117812745433) | `tests/e2e/hud-touch.spec.ts:1595:9 › catalog tutorial and reload › 1280x720-keyboard › hudson-canyon: tutorial, contact, reward, chip and reload`   |
| [12/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39173052443/job/117812745466) | `tests/e2e/hud-touch.spec.ts:1595:9 › catalog tutorial and reload › 1280x720-touch › hudson-canyon: tutorial, contact, reward, chip and reload`      |
| [12/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39173052443/job/117812745466) | `tests/e2e/hud-touch.spec.ts:1595:9 › catalog tutorial and reload › 1280x720-keyboard › kamaehuakanaloa: tutorial, contact, reward, chip and reload` |
| [22/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39173052443/job/117812745451) | `tests/e2e/hud-touch.spec.ts:1595:9 › catalog tutorial and reload › 844x390-touch › hudson-canyon: tutorial, contact, reward, chip and reload`       |
| [34/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39173052443/job/117812745443) | `tests/e2e/hud-touch.spec.ts:1595:9 › catalog tutorial and reload › 1280x720-touch › kamaehuakanaloa: tutorial, contact, reward, chip and reload`    |
| [15/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39173052443/job/117812745414) | `tests/e2e/hud-touch.spec.ts:1595:9 › catalog tutorial and reload › 390x844-touch › kamaehuakanaloa: tutorial, contact, reward, chip and reload`     |
| [2/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39173052443/job/117812745349)  | `tests/e2e/hud-touch.spec.ts:1595:9 › catalog tutorial and reload › 1024x768-touch › kamaehuakanaloa: tutorial, contact, reward, chip and reload`    |

### B. Standing objective also appears on desktop: 10 cases, fixed by P2-copy

`hud-touch.spec.ts:1595:9`: `expect(locator).toBeHidden() failed`, locator `.guidance-slot[data-kind="objective"]`, **expected hidden, received visible**, line 1697. P2-scan-range intentionally shows distance guidance on desktop too; P2-copy updates the expectation. All ten pass on newest main.

| Shard                                                                                                     | Failing test                                                                                                                                              |
| --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [16/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39173052443/job/117812745573) | `tests/e2e/hud-touch.spec.ts:1595:9 › catalog tutorial and reload › 1280x720-keyboard › great-blue-hole: tutorial, contact, reward, chip and reload`      |
| [1/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39173052443/job/117812745380)  | `tests/e2e/hud-touch.spec.ts:1595:9 › catalog tutorial and reload › 1280x720-keyboard › hunga-tonga-caldera: tutorial, contact, reward, chip and reload`  |
| [32/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39173052443/job/117812745487) | `tests/e2e/hud-touch.spec.ts:1595:9 › catalog tutorial and reload › 1280x720-keyboard › beebe-vent-field: tutorial, contact, reward, chip and reload`     |
| [14/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39173052443/job/117812745433) | `tests/e2e/hud-touch.spec.ts:1595:9 › catalog tutorial and reload › 1280x720-keyboard › challenger-deep: tutorial, contact, reward, chip and reload`      |
| [11/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39173052443/job/117812745457) | `tests/e2e/hud-touch.spec.ts:1595:9 › catalog tutorial and reload › 1280x720-keyboard › endurance: tutorial, contact, reward, chip and reload`            |
| [26/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39173052443/job/117812745426) | `tests/e2e/hud-touch.spec.ts:1595:9 › catalog tutorial and reload › 1280x720-keyboard › titanic: tutorial, contact, reward, chip and reload`              |
| [28/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39173052443/job/117812745472) | `tests/e2e/hud-touch.spec.ts:1595:9 › catalog tutorial and reload › 1280x720-keyboard › monterey-canyon: tutorial, contact, reward, chip and reload`      |
| [28/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39173052443/job/117812745472) | `tests/e2e/hud-touch.spec.ts:1595:9 › catalog tutorial and reload › 1280x720-keyboard › bismarck: tutorial, contact, reward, chip and reload`             |
| [37/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39173052443/job/117812745429) | `tests/e2e/hud-touch.spec.ts:1595:9 › catalog tutorial and reload › 1280x720-keyboard › lost-city: tutorial, contact, reward, chip and reload`            |
| [34/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39173052443/job/117812745443) | `tests/e2e/hud-touch.spec.ts:1595:9 › catalog tutorial and reload › 1280x720-keyboard › blake-plateau-corals: tutorial, contact, reward, chip and reload` |

### C. Wildlife scan card survives quiet-spot setup: 6 cases, fixed by P2-copy

`hud-touch.spec.ts:1595:9`: `expect(locator).toBeHidden() failed`, locator `.guidance-slot[data-kind="scan"]`, **expected hidden, received visible**, line 1694. Same catalog fixture change to `life=0` removes the competing source. All six pass on newest main.

| Shard                                                                                                     | Failing test                                                                                                                                              |
| --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [20/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39173052443/job/117812745492) | `tests/e2e/hud-touch.spec.ts:1595:9 › catalog tutorial and reload › 1280x720-keyboard › axial-seamount-ashes: tutorial, contact, reward, chip and reload` |
| [6/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39173052443/job/117812745497)  | `tests/e2e/hud-touch.spec.ts:1595:9 › catalog tutorial and reload › 667x375-touch › axial-seamount-ashes: tutorial, contact, reward, chip and reload`     |
| [14/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39173052443/job/117812745433) | `tests/e2e/hud-touch.spec.ts:1595:9 › catalog tutorial and reload › 1280x720-touch › axial-seamount-ashes: tutorial, contact, reward, chip and reload`    |
| [13/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39173052443/job/117812745431) | `tests/e2e/hud-touch.spec.ts:1595:9 › catalog tutorial and reload › 844x390-touch › axial-seamount-ashes: tutorial, contact, reward, chip and reload`     |
| [15/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39173052443/job/117812745414) | `tests/e2e/hud-touch.spec.ts:1595:9 › catalog tutorial and reload › 390x844-touch › axial-seamount-ashes: tutorial, contact, reward, chip and reload`     |
| [35/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39173052443/job/117812745424) | `tests/e2e/hud-touch.spec.ts:1595:9 › catalog tutorial and reload › 1024x768-touch › axial-seamount-ashes: tutorial, contact, reward, chip and reload`    |

### D. Landscape objective exceeds its height guard: 1 case, fixed by P2-copy

`hud-touch.spec.ts:794:7`: `expect(received).toBeLessThanOrEqual(expected)`, **expected height <=64, received 66.3125**, line 810. P2-copy's already-merged landscape card change retains the 64 px limit. Passes on newest main. No visual change made here.

| Shard                                                                                                     | Failing test                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [18/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39173052443/job/117812745444) | `tests/e2e/hud-touch.spec.ts:794:7 › landscape guidance and completion › touch stack 667x375 › the standing objective line shows when no contact is in range` |

### E. Distance-aware scan tutorial versus old copy: 10 cases, still red on main

`f-bughunt-960.spec.ts:58:11`: `expect(locator).toHaveText(expected) failed`, locator `.guidance-name`, line 158. **Expected `Hold SCAN on a glowing target.`; received `Get closer to scan · 278 m` for Titanic or `Get closer to scan · 150 m` for Blue Hole.** All ten recur identically on newest main.

Current `src/game/Tutorial.ts` deliberately returns the distance instruction at the scan step when `scanDistanceM` is provided. This journey expectation was not updated after P2-scan-range and is outside P2-copy's edited spec list. Existing guidance/onboarding units pass locally; browser reproduction was blocked before assertions. Reported for repair in the existing journey capability: assert the scan step and its distance instruction while out of range, retaining input/device checks. No application copy rollback or loosened assertion here.

| Shard                                                                                                     | Failing test                                                                                                                                |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| [6/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39173052443/job/117812745497)  | `tests/e2e/f-bughunt-960.spec.ts:58:11 › 960 390x844 › great-blue-hole arcade high: briefing, assisted scan, Journal, debrief and saves`    |
| [5/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39173052443/job/117812745373)  | `tests/e2e/f-bughunt-960.spec.ts:58:11 › 960 390x844 › titanic realistic low: briefing, assisted scan, Journal, debrief and saves`          |
| [5/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39173052443/job/117812745373)  | `tests/e2e/f-bughunt-960.spec.ts:58:11 › 960 844x390 › great-blue-hole arcade high: briefing, assisted scan, Journal, debrief and saves`    |
| [31/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39173052443/job/117812745503) | `tests/e2e/f-bughunt-960.spec.ts:58:11 › 960 844x390 › great-blue-hole realistic high: briefing, assisted scan, Journal, debrief and saves` |
| [27/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39173052443/job/117812745486) | `tests/e2e/f-bughunt-960.spec.ts:58:11 › 960 390x844 › great-blue-hole realistic high: briefing, assisted scan, Journal, debrief and saves` |
| [28/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39173052443/job/117812745472) | `tests/e2e/f-bughunt-960.spec.ts:58:11 › 960 844x390 › great-blue-hole realistic low: briefing, assisted scan, Journal, debrief and saves`  |
| [17/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39173052443/job/117812745458) | `tests/e2e/f-bughunt-960.spec.ts:58:11 › 960 844x390 › titanic realistic high: briefing, assisted scan, Journal, debrief and saves`         |
| [22/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39173052443/job/117812745451) | `tests/e2e/f-bughunt-960.spec.ts:58:11 › 960 390x844 › great-blue-hole realistic low: briefing, assisted scan, Journal, debrief and saves`  |
| [30/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39173052443/job/117812745404) | `tests/e2e/f-bughunt-960.spec.ts:58:11 › 960 390x844 › titanic realistic high: briefing, assisted scan, Journal, debrief and saves`         |
| [35/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39173052443/job/117812745424) | `tests/e2e/f-bughunt-960.spec.ts:58:11 › 960 844x390 › titanic realistic low: briefing, assisted scan, Journal, debrief and saves`          |

### F. Assisted target competes with wildlife: 1 case, still red on main

`f-bughunt-960.spec.ts:58:11`: **`page.evaluate: Error: Expected scan candidate great-blue-hole-stalactites, got life:brain-coral`**. Stack: `helpers/scan.ts:7` → `completeScan:73` → `scanWithKeyboard:84` → journey line 206. Repeats identically on newest main.

The fixture uses `lifeSeed=42`, teleports to the first POI's `spawnPose`, aims at that POI, then demands that exact candidate with wildlife enabled. Logs establish fixture competition; they do not establish incorrect player-facing scanner priority. Local browser reproduction was blocked. Reported for an isolated assisted-scan fixture in the existing capability; retain wildlife scanning coverage and the expected-target guard in `completeScan`.

| Shard                                                                                                     | Failing test                                                                                                                              |
| --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| [11/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39173052443/job/117812745457) | `tests/e2e/f-bughunt-960.spec.ts:58:11 › 960 1280x720 › great-blue-hole arcade high: briefing, assisted scan, Journal, debrief and saves` |

### G. Deliberately removed Lost City preset shimmer: 2 stale specs, still red on main

Both repeat on newest main. Lost City's mission has `smokeIntensity: 0`, `glowLights: 0` and **`shimmerStrength: 0`**. `VentPreset.buildShimmer()` immediately returns at zero strength. Commit `1a9562c` (P2-lostcity-perf) deliberately removed the duplicate preset shimmer while retaining prop-level clear-fluid effects; see `plan/progress/P2-lostcity-perf.md`. P2-copy did not touch these specs.

- `f-content-fix.spec.ts:44:1`, evaluation line 55: **`page.evaluate: TypeError: Cannot read properties of null (reading 'uniforms')`**. It dereferences `p.preset.shimmer.uniforms.uStrength.value` and still expects strength 0.03 and 36 preset particles.
- `presets.spec.ts:178:1`, assertion line 209: **`expect(received).toEqual(expected)`: expected `draws: 1`, received `draws: 0`**. Other fields match: vent, mission source, carbonate, zero lights, null smoke.

Existing presets/performance units pass locally (82 tests), including Low effect preservation and the High transparent-fill budget. Browser verification is blocked. Reported for updates in existing preset/content capabilities to guard absent preset shimmer and retained prop effects. Do not restore the removed effect or tune materials for CI.

| Shard                                                                                                     | Failing test                                                                                    |
| --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [15/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39173052443/job/117812745414) | `tests/e2e/f-content-fix.spec.ts:44:1 › Lost City mission and free dive both retain clear flow` |

| Shard                                                                                                     | Failing test                                                                                                 |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| [30/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39173052443/job/117812745404) | `tests/e2e/presets.spec.ts:178:1 › Lost City uses clear carbonate flow without smoke or glow in a free dive` |

### H. Isolated shell frame wait: 1 original case, passes on newest main

`d-shell.spec.ts:96:1`: **`Test timeout of 240000ms exceeded` / `page.evaluate: Test timeout of 240000ms exceeded`**, stack `helpers/frames.ts:5` from `d-shell.spec.ts:250`. P2-copy edited Dive button matching in this file, but the recorded failure is a frame wait; causation by that button change is not established. Newest main passes the case. No remaining deterministic bug or shared timeout established.

| Shard                                                                                                     | Failing test                                                                           |
| --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| [38/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39173052443/job/117812745522) | `tests/e2e/d-shell.spec.ts:96:1 › home, site grid, pause, objectives, resume and quit` |

## Newest main: one new timing failure

The 13 recurring cases are E (10), F (1), G (2). The fourteenth is new:

| Shard                                                                                                    | Failing test                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| [3/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39179986984/job/117833940415) | `tests/e2e/f-fidelity-rollout.spec.ts:45:7 › lost-city Medium desktop: poseidon-tower-3, vertical drift 0 m stays below 900k rendered triangles` |

**`Test timeout of 240000ms exceeded.`** No assertion mismatch or stack establishes a triangle-budget violation. This case samples 16 rendered frames at Medium. Reported as an unresolved timing/render-cost symptom. No frame count, triangle guard or timeout changed. No local render/performance acceptance was attempted under this nonvisual brief; local browser startup is also blocked.

## Newest workflow on main is a different diagnostic mode

The newest workflow of any kind is [nightly 39431812593](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39431812593), 2026-10-20, same SHA `09ec9f7`. Diagnostics and capability-review shards 1, 3, 4 pass; capability-review shard 2 fails. Mode: **nightly capability evidence**, `PW_RENDER_REVIEW=1`, not push-CI full shards. Shard 2 reports **86 passed / 1 failed / 1 skipped**; this is not the whole nightly count.

Failure: `journal-debrief.spec.ts:257:5`, `mission progression and Home Journal › mission dive flow › primaries complete -> keep exploring -> secondary -> surface -> debrief actions`. **150000 ms test timeout**, then `expect(locator).toBeVisible() failed` for `.journal` after the debrief Journal click, line 373. Call log includes **`Protocol error (Runtime.callFunctionOn): Internal server error, session closed.`** A timing/session symptom is established; a broken Journal action is not proven. [Previous nightly 39279848843](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39279848843) passed on the same SHA. Reported; did not edit the capability file owned by the launched journey-harness brief.

## Exact local checks

### Passed

- TypeScript phases of all three build attempts completed without errors.
- `GATES_CONFIG_MODE=writable PW_PORT=4273 PW_OUTDIR=dist-ci-triage bash tools/gates.sh --phase build`: **config and production build pass**, including public asset copy and service-worker stamping. Overall gate fails afterward at the manifest block below; this is not a passing complete gate.
- `npm test -- --configLoader runner --cache=false tests/unit/tutorial.test.ts tests/unit/presets.test.ts tests/unit/perf-budget.test.ts`: **exit 0, 82 tests passed in 2 files**: presets (67), perf-budget (15). The tutorial.test.ts filter matches no file and adds no coverage.
- `npm test -- --configLoader runner --cache=false tests/unit/f3Onboard.test.ts tests/unit/guidance.test.ts`: **exit 0, 72 tests passed in 2 files** (29 + 43).
- Total actual unit coverage: **154 passed**.

### Environment blocks and unsuccessful attempts

- `npm run build -- --outDir dist-ci-triage`: **exit 1** after typecheck, `EROFS` writing through shared `node_modules/.vite-temp/`.
- `npm run build -- --outDir dist-ci-triage --configLoader runner`: **exit 1**, `Vite module runner has been closed` at the existing PWA plugin's closeBundle hook. Repository-supported writable native-bundle mode resolves that loader issue; no tooling changed.
- Writable build gate above: **exit 1 overall** after successful production build, because provenance generation in `tools/ci-build-manifest.mjs` reports `spawnSync git EPERM`. No prebuilt provenance bypass claimed.
- **Targeted CI-mode browser reproduction**, not smoke, full-suite or project-base:

```bash
CI=1 GATES_CONFIG_MODE=writable PW_PORT=4273 PW_OUTDIR=dist-ci-triage \
  npm run test:e2e -- \
  tests/e2e/f-bughunt-960.spec.ts tests/e2e/presets.spec.ts \
  tests/e2e/f-content-fix.spec.ts \
  --grep '960 390x844.*titanic realistic low|960 1280x720.*great-blue-hole arcade high|Lost City' \
  --retries=0 --reporter=list --output=test-results-ci-triage-baseline
```

**Exit 1 before tests/assertions**: `Process from config.webServer was not able to start. Exit code: 1`. Four representative cases intended; zero local browser passes or reproduced assertion failures claimed. Direct preview confirms **`listen EPERM: operation not permitted 127.0.0.1:4273`**:

```bash
GATES_CONFIG_MODE=writable npm run preview -- \
  --port 4273 --strictPort --outDir dist-ci-triage --configLoader runner
```

### Not run

Full local e2e, smoke, project-base browser selection, screenshot/visual acceptance, full unit suite, Python tooling suite. This documentation-only audit changes no source or tests; existing relevant capability guards were the local checks. Hosted logs remain the evidence for browser assertion failures.

Final changed-file formatting and whitespace checks are recorded below.

- Final verification: changed-file Prettier check and `git diff --check` passed (exit 0). Inventory validation confirmed all 43 original failed case names are present, with no unresolved table/link placeholders.
