# V-golden-capture-complete

Completed 2026-11-09. Tests/tools only; no art, site data or runtime changes.

## Cause

Inspected `/home/vijay/submarine-explorer/.cache/golden/2026-11-09-064047/poses.json` (clean build `cb9eeb9301d130668b0fd56f80d24a07ec7fc073`). Challenger was present in both `plannedHeroes` and `plannedMissions`. The catalogue-driven mission list contained all 13 sites, with Challenger last. Its three free-dive PNGs were saved, but its mission screenshot failed at `challenger-deep: capture 1`: `page.screenshot: Target page, context or browser has been closed`. Context cleanup also reported the closed browser. The manifest contains 32 free-dive and 12 mission captures, 44 of the expected 45, and already says `complete: false`.

This was a browser closure during capture, not a missing site-list entry. The saved evidence does not establish what closed Chromium. Existing error handling retained the partial sheet and set exit status 1; `golden.sh` already propagates that status. The gap was that success depended only on caught errors, without checking saved captures against the plan, and the final output ended with the contact-sheet/readability messages instead of an explicit failure summary.

## Change and simplicity

- `goldenManifest` now takes the runner's existing jobs instead of independently supplied hero/mission lists. It derives those manifest summaries and verifies each required filename, including every layout, both mission times, and free-dive approach/detail frames.
- One filename builder is shared by the runner, coverage check and ordinary mission-spawn evidence helper. Jobs explicitly carry their required frames: the spawn helper retains `mode: mission` with frame 1; the dedicated mission sweep requires frames 1 and 2. Manifest coverage reads that plan instead of inferring frame counts from the manifest's display mode.
- Missing captures become manifest failures even when no exception was recorded. Duplicate successes cannot substitute for a missing image. Existing browser/cleanup failures still fail a run with all files present.
- The CLI uses `manifest.complete` as its single completion decision and ends incomplete runs with `Golden shots: INCOMPLETE`, the recorded errors, missing filenames and manifest path. The partial sheet and poses remain available; exit status is 1.
- Cut: duplicate manifest planning inputs and the separate failure-array-only success decision. This merges planning, naming and completion evidence without another site list, per-site branches or retries. The cut is logged in `CHANGELOG.md`. Capability tests extend the existing golden manifest spec; no package-named spec or package numbers in code.

## Validation

- Existing capability specs were located with `rg` in `tests/e2e` before selecting the runs below.
- Focused tooling: `node --test --experimental-test-isolation=none --test-skip-pattern='golden comparison refuses' tools/tests/golden-*.test.mjs`: **33 pass**. The excluded comparison CLI test is an existing sandbox failure and remains included in canonical gates. New tests remove every catalogue mission/hero output in turn, remove either mission time at every layout, supply duplicate successes, cover an arbitrary future site and an aliased gallery, and preserve cleanup failures. A subprocess test injects a browser-launch failure and verifies actual exit 1, stderr naming every missing frame, and retained incomplete poses/contact sheet.
- Replayed the historical manifest through the new coverage check: it adds exactly `Missing capture: challenger-deep-1-mission.png`.
- Build/typecheck passed using the writable Vite config and an isolated `.cache/golden-capture-dist` output.
- Requested Playwright commands were run with `GATES_CONFIG_MODE=writable`, `PW_OUTDIR=.cache/golden-capture-dist`, separate `PW_PORT` values 4877–4879, and isolated results:
  - `npx playwright test tests/e2e/opening-framing.spec.ts -g 'persists spawn PNG and golden manifest'`
  - `npx playwright test tests/e2e/f-bluehole-squiggle.spec.ts -g 'Blue Hole: golden sediment terraces, brightness and floor material bisect'`
  - `npx playwright test tests/e2e/f-bluehole-1030.spec.ts -g 'desktop \+ portrait Low golden comparison and frame budgets'`
    All three exit 1 before executing tests because preview cannot start. Direct preview startup confirms `listen EPERM: operation not permitted 127.0.0.1:4877`. Logs: `.cache/golden-capture/{opening,hero,layout,preview}.log`. Browser captures remain unverified locally.

## Gates

Ran `GATES_CONFIG_MODE=writable PW_PORT=4876 PW_OUTDIR=.cache/golden-capture-dist tools/gates.sh`. An initial run was interrupted during units after a TypeScript import-directive error; that error was corrected. The completed run used an exported `npm` function to apply `timeout 90s` and verbose reporting only to `npm test`, so the remaining gates could finish. No repository gate or test assertions were relaxed.

Completed run: `.cache/runs/20261109-084943-2-nVI4MZ/`, **FAIL gates (e2e=smoke)**, exit 1.

- Passed: writable config, content, root build/typecheck, project-base build/typecheck, attribution and repository-wide Prettier.
- Python tooling: five failures already documented in `U-scan-fish-vs-objective.md`: four build-manifest tests report `spawnSync git EPERM`; the existing golden comparison CLI test receives empty subprocess JSON. The golden suite reports 33 passes and that one failure, including the passing new CLI failure test.
- Full unit suite: stopped at the explicit 90-second limit, with 1,701 passing cases logged and no failed-case markers; no complete suite result.
- Root smoke and project-base browser checks: preview startup fails before tests execute, consistent with the direct localhost `EPERM` diagnostic.

## Orchestrator gate review and correction

The orchestrator's unsandboxed run, `.cache/runs/20261109-085305-1769685-0wQNMP/`, passed Python, content, build, smoke e2e, project-base e2e, attribution and formatting. Units completed with 4,661 passes and two failures, both in `tests/unit/e2eRender.test.ts`. These were implementation regressions that the locally bounded unit run had missed:

- The spawn helper had been relabeled `mode: all` to obtain a one-frame plan. Restored `mode: mission`; frame requirements now belong to each job. `goldenJobs` produces the full required frame list, and the runner and manifest use it. There is no longer a mode-based frame-count inference in the manifest.
- The screenshot exception already explained the absent image, but coverage added a duplicate failure. Recorded output failures now carry their filename. Coverage adds a missing-output error only when that filename has no existing failure; the recorded failure still forces `complete: false`. Other unreported missing outputs remain errors.

The original eight helper unit tests are unchanged and all pass:
`GATES_CONFIG_MODE=writable npx vitest run tests/unit/e2eRender.test.ts --configLoader runner --cache=false --reporter=verbose`.

Added strict assertions for all nightly/mission/gallery frame plans and a capability regression proving that a reported failure stays singular, still fails the run, and cannot hide a different missing frame. The full golden tooling command now reports **34 passes and one failure**, the same sandbox-only comparison CLI JSON failure; the new and modified capability checks pass. Typecheck and changed-file formatting also pass.

Repeated all three targeted Playwright commands above after the correction; all stop at preview startup in this sandbox. Logs: `.cache/golden-capture/revision-{opening,hero,layout}.log`. The unsandboxed full gate run after these fixes is pending; no green full-suite result is claimed. No assertion was removed, broadened or weakened.
