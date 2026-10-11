# 1230 — CI shard triage, second pass

## Plan

1. Inspect the latest three CI runs after the 1120 fixes; recover failed logs or timing artifacts and distinguish browser failures, retries, skipped coverage and infrastructure failures.
2. Identify remaining slow cases from hosted reports. If no newer hosted run exists, collect a local `tools/gates.sh --full-e2e` JSON report and split or trim rendering work only where the evidence warrants it. Preserve assertions and record every cut in `CHANGELOG.md`.
3. Run `tools/gates.sh`, record root causes and the final hosted outcome, and report any unresolved failures explicitly.

## Progress

- Checkout starts at `48b9197`; working tree was clean. No `AGENTS.md` is present; repository conventions are in `CONTRIBUTING-AGENTS.md`.
- `gh run list -w CI -L 3` finds two completed green runs: `38089953352` (`bed1019`, 2026-10-10 22:03 UTC) and `38074554773` (`99c384b`, 2026-10-10 18:08 UTC).
- Run `38089953352` has all 30 e2e jobs, static checks and project-base passing. `gh run view 38089953352 --log-failed` returns no failed logs.
- Initially, new main run `38116826645` (`cb15f7d`, 2026-10-11 06:03 UTC) was underway and its failed logs were unavailable. It was monitored while inspecting the completed run's 30 JSON reports and running local gates; its final green outcome is recorded below.
- All 30 timing artifacts from `38089953352` contain **598 expected passes, 86 skips, zero unexpected results and zero flaky results**. All passing cases complete on their first attempt. Both completed green SHAs contain the 1120 merge (`c8896e9`).
- Initially refresh `tools/e2e-timings.json` from the complete `38089953352` reports, then replace those samples with all 30 reports of the newly completed `38116826645`: **598 measured costs**, with **35 unmeasured prior costs preserved**. Before the refresh every shard was estimated at 19.8–19.9 minutes. The newest run's actual durations range from **342.5 to 1269.3 seconds**; the final estimates span **17.202–17.235 minutes**, below the 25-minute suite budget. Estimates retain conservative costs for dynamically skipped cases and are not a promise of future runtime.
- Replaying the newest run's exact per-case durations through the original and final assignments, with the same two-second per-case startup allowance, reduces the heaviest shard from **21.869 to 16.451 minutes**. Every one of the 684 selectors has an observed sample. This is a retrospective calculation, not a newly executed hosted assignment; old costs retained for dynamic skips keep the planner conservative.
- Playwright discovery and exact grep matching confirm **684 cases assigned exactly once** across the 30 shards; no selectors are dropped or overlap. Existing `e2eShards.test.ts` checks pass (4 tests).
- No new cuts are justified. `CHANGELOG.md` records the timing refresh and the previously unlogged inherited hosted skips from `4fa89cd` and `99c384b`.
- The default local unit gate produced no results and was interrupted. A subsequent serial gate process and focused browser process ended with SIGTERM (143), without a test failure report. Restart `tools/gates.sh` in a retained terminal session with `GATES_CONFIG_MODE=writable`, port 4373 and a temporary exported shell function that appends `--pool=threads --maxWorkers=1 --reporter=verbose` only to `npm test`. Repository scripts/configuration are untouched. The pool/worker choice matches the successful serial configuration documented in `plan/progress/1160.md`.
- The slowest hosted vehicles/ROV/cockpit case passes locally with `CI=1`, retries disabled and the isolated gate build: **1 passed / 68.1 s** (including server startup). Inspect hull A orbit, hull C cockpit and the ROV/tether screenshots: the submarine, cockpit, tether and HUD render correctly. Only the successful report `/tmp/f-ci-triage2/hull-local-final.json` counts as validation; earlier interrupted attempts do not. Its local duration does not enter shard weights.

## Root causes

1. **Software-rendering throughput:** the earlier 1120 investigation (`f-ci-triage.md`) established first-minute/scan loops exhausting their wall-clock budgets, grouped Lost City fidelity drifts exhausting a test budget, and intermittent Chromium installation failures. Its resolution cuts and split poses are already on main. Subsequent commits added three installer attempts and hosted-only skips; the green result cannot be attributed to 1120 alone.
2. **Remaining real-time movement floors:** the last red run, [38068954065](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/38068954065) at `4fa89cd`, failed shards **21, 22, 26 and 29**. `gh run view --log-failed` returned no output even for this failed run, so recover the four job logs with `gh api repos/wjjztd2rz8-coder/submarine-explorer/actions/jobs/JOB/logs`. Every failure is `f-bughunt-1090` chase-arm travel at the unchanged `>10 m` assertion; attempts observed **0.96–8.87 m**. This is consistent with software GL failing the real-time movement window. Commit `99c384b` skips those 16 cases on CI; both subsequent completed runs are green.
3. **Stale balancing inputs:** weights still cited `37931174069`, before the fixes and later skip changes. Current cases were being scheduled using obsolete timeout/retry costs and file fallbacks. The complete, retry-free hosted timing refresh improves estimated balance without changing test execution or assertions.

## Coverage and slow cases

The green hosted suite has **684 selections**, comprising 598 passes and these 86 existing skips, classified from their report annotations:

The original 1120 failure families are covered by **21 passing `f-verify-1000` cases** (with its four High first-minute cases skipped), **20 passing fidelity cases**, **24 passing 960 navigation cases**, and **two passing Monterey portrait HUD cases**. All 32 cases in `f-bughunt-1090` are skipped on CI. The older changelog wording is corrected to distinguish skipped High first-minute cases from the still-running High scan cases.

| Spec/source             | Skipped | Reason                                                                             |
| ----------------------- | ------: | ---------------------------------------------------------------------------------- |
| `f-bughunt-1090`        |      32 | 16 Low opening/idle cases and 16 chase-arm travel cases are local-only on CI.      |
| `f-verify-1000`         |       4 | High-tier first-minute cases are local-only on CI; High-tier scan cases still run. |
| `d-flow`                |       1 | Home/Dive-again is local-only on CI because two boots exceed its 120 s limit.      |
| `f-first-minute-620`    |      26 | Existing opt-in real-time audit (`FIRSTMIN_AUDIT=1`).                              |
| `visual-qa`             |      14 | Existing optional visual audit.                                                    |
| `helpers/titleAudit.ts` |       7 | Project-base variants require `PW_BASE`; covered by the separate project-base job. |
| `f-bughunt-880`         |       1 | 830 geometry was reverted; Low relief acceptance awaits replacement geometry.      |
| `base-url`              |       1 | Project-base-only case; the separate hosted project-base job passed.               |

The newest run's slowest passing hosted cases are vehicles/ROV/cockpit (235.25 s), desktop Challenger Medium first minute (218.22 s), Lost City desktop sonar (207.95 s), Blue Hole desktop sonar (207.28 s), and Beebe plumes (206.52 s). The vehicles case has little margin against the 240 s CI default; retain it as a watch item, since the completed runs do not prove a need to remove poses or weaken an assertion. No local timing is written into shard weights.

## Final report

`tools/gates.sh` completes with **exit 0** using the terminal/serial-unit invocation above:

| Gate                                                  | Result                                                                                    |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Build/typecheck                                       | Passed                                                                                    |
| Unit                                                  | 174 files / 1730 tests passed                                                             |
| Python                                                | 153 tests passed                                                                          |
| Strict content, attribution, repository-wide Prettier | Passed                                                                                    |
| Browser smoke                                         | 3 passed / 22.1 s                                                                         |
| Project-base build and browser                        | 8 passed / 1.8 min                                                                        |
| Focused vehicles render                               | 1 passed / 68.1 s, CI=1, retries=0                                                        |
| Shard roster and costs                                | 684 exact selections; 598 hosted costs match reports; 35 unmeasured prior costs preserved |

After the final timing refresh, the existing shard/updater unit checks pass again (**2 files / 5 tests**), and exact matching confirms all 684 cases belong to precisely one shard. `/tmp/f-ci-triage2/final-shard-audit.json` records the final cost and replay checks.

The inspected Monterey smoke screenshot shows terrain, submarine, fish and HUD rendering correctly. The separate vehicles screenshots confirm hull, cockpit and ROV/tether rendering. A local full-e2e fallback is not needed because complete post-fix hosted reports are available. Local gates use the default smoke plus project-base mode; this is not a local full-suite run.

The newest main run, [38116826645](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/38116826645), completes **green in 33 min 3 s** at `cb15f7d`: all **30 e2e shards**, static checks and project-base pass. Its complete 30-report set contains **598 passes, 86 existing skips, zero retries, zero flaky cases and zero failures**. `gh run view 38116826645 --log-failed` produces an empty file. A final `gh run list -w CI -L 3` shows this run and both preceding runs green.

No new test cuts, assertion changes, timeout/retry changes or production changes are made. The final timing refresh and inherited cuts are logged in `CHANGELOG.md`. The hosted result validates main before this local timing refresh; the new assignment is verified by the complete roster, measured-cost checks and replay, and takes effect on the next push containing it.

Evidence and downloaded JSON reports are under `/tmp/f-ci-triage2`; gate logs are in `.cache/gates` and `/tmp/f-ci-triage2/gates.log`.
