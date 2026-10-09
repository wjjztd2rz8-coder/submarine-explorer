# f-ci-triage — hosted e2e shard failures

## Completed plan

1. Inspect the latest ten runs; recover failed job logs, hosted JSON timings and retry traces.
2. Classify failures and make observations deterministic while preserving assertions and coverage.
3. Retry only Chromium installation; validate static gates, affected browser matrices, the complete suite and shard selection.

## Hosted evidence

`gh run list -L 10` contains five CI runs. `gh run view RUN --job JOB --log` returned empty output; `gh api repos/wjjztd2rz8-coder/submarine-explorer/actions/jobs/JOB/logs` recovered every failed job log. Evidence, downloaded reports and retry traces are retained under `/tmp/f-ci-triage`.

Latest completed run [37931174069](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/37931174069), at `14a7efd`, fails ten browser shards and one installer. Static/project-base jobs pass.

| Shards     | Failed spec/cases                                                                                  | Classification                                                             |
| ---------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 2, 4, 5    | `f-verify-1000`: desktop Challenger Low, High, Medium first minute                                 | Slow-CI timeout during the 600-frame loop, before final outcome assertions |
| 10         | `f-verify-1000`: phone Challenger High first minute                                                | Same                                                                       |
| 14         | `f-verify-1000`: phone Endurance High first minute                                                 | Same                                                                       |
| 23, 24, 25 | `f-verify-1000`: desktop Endurance High, Medium, Low first minute                                  | Same; shard 24 also exhausts the 25-minute suite budget                    |
| 18         | `f-verify-1000`: desktop Monterey High first scan/Journal/debrief                                  | Slow-CI timeout during rendered scan increments                            |
| 12         | `f-fidelity-rollout`: Lost City Medium desktop Poseidon tower 2                                    | Slow-CI timeout sampling the third vertical drift                          |
| 7          | Install Playwright Chromium: apt dependency installation stalls, then the five-minute step expires | Infrastructure; no browser cases executed                                  |

[37925173112](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/37925173112), at `bb16793`, repeats the eight first-minute cases on shards 1, 5, 6, 7, 8, 24, 26, 28 and the Monterey High scan on shard 22. Lost City towers **2 and 3** fail on shards 12/13. Static formatting also fails; current main passes formatting.

[37908510422](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/37908510422) repeats the eight first-minute cases on shards 4, 6, 8, 16, 23, 28, 30, 7, the Monterey High scan on shard 3, and an installer timeout on shard 27. It adds no new failing spec family.

Cancelled 37924033047 (`fd94479`) has one failed static job (Prettier on `plan/REVIEWS.md`); its two available timing reports contain 37 passed and 3 skipped cases. Cancelled 37923083028 (`b7c339c`) has one failed installer job (shard 11); its one timing report contains 19 passed and 1 skipped case. Neither available report contains failed/flaky browser cases. These runs are incomplete, not hosted green.

The completed hosted failures establish throughput problems, without proving that unexecuted assertions would pass. No recovered hosted failure establishes a persistent state leak or production bug.

## Final changes and retained coverage

- **First minute:** the Challenger Low retry reaches only 407 clock advances: 189.5 wall seconds in clock calls plus 99.5 in browser evaluations. Retain all **600 real 100 ms simulation/render frames**, all twelve site/tier/viewport combinations, every clearance/breach assertion and the Journal/life-disabled checks. Sample after each game frame in a browser RAF callback, eliminating 600 extra evaluation round trips. Add exact sample-count and elapsed-time assertions. Reduce intermediate drawing-buffer resolution to **25% of the tier's pixel ratio**, then restore before frame 600. Opening, minute and Journal screenshots use full tier resolution. This raster-work cut is logged in `CHANGELOG.md`.
- **Scanning:** the Monterey High retry makes only 16 advances; median clock-call duration is 13.66 seconds (169.8 seconds total), plus 55.8 seconds in evaluations. Apply the same temporary resolution reduction during scanning. Retain the original real held-input frame loop, every per-frame clearance check, two-minute simulated completion limit, `<30 m` transit, Journal and debrief assertions. Restore and present a full-resolution frame before the screenshot. No scan/physics fast-forward helper or fake completion events.
- **Fidelity:** a Lost City 16-frame group takes up to 82.9 seconds; the aggregate retry runs out of budget at drift three. Split only desktop Poseidon towers 2/3 into independent -2/0/+2 m cases. All 16 authored poses, three drifts per pose, eight warm-up/eight measured frames, nonzero draw/triangle assertions and strict `<900000` triangles remain. Fidelity grows from **16 to 20 cases**; the split is logged in `CHANGELOG.md`.
- **Chromium:** both workflow install steps use `tools/install-playwright-chromium.sh`: two attempts, each bounded by 120 seconds plus a five-second kill grace, with one ten-second delay. The existing five-minute step budget remains. Final failure status propagates. Four stdlib tests cover immediate success, failure then success, timeout then success and second-failure propagation.
- **Local navigation ordering race:** the full run exposes `f-bughunt-960`, phone Titanic Realistic High, sampling the old document after a mission tap (`Execution context was destroyed`, caller at the post-tap readiness check). Register a requested-mission URL/load wait before the action, then pump frames in the new document. Preserve all matrix cases and assertions.
- **Local credits ordering race:** both `f-monterey-portrait-hud` cases read the credits panel before its queued details toggle handler positions it. Trace rectangles are scan-stack y=138..195.39 and credits y=184..402, with **no inline placement styles** on the panel. Wait for the handler's explicit `aria-expanded=true`, then run the unchanged bounds, projected-submarine and pairwise-overlap checks. Both failures reproduce before the fix and pass twice afterward. No CSS or placement-code change is needed.

No test/config retries or timeouts increased, assertion thresholds lowered, cases dropped, or production code changed. Source comparison retains all original assertion expressions in all four changed specs; add sample/cadence and credits-readiness assertions.

## Shards and validation

Refresh **549** completed timing weights from all **29** available latest-run JSON artifacts, including retry costs. Shard 7 has no browser report. Keep old weights for interrupted/unexecuted coverage and 240-second file fallbacks for new drift selectors. All **622 selectors** match exactly one of **30 shards**, estimated at **18.2–18.3 minutes** each, below the 25-minute suite budget. These are roster estimates, not a new hosted green run; no local durations enter the weights.

| Validation                                    | Result                                                                                                                                                              |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Static gates                                  | Build/typecheck, **163 unit files / 1624 tests**, **152 Python tests**, strict content, attribution and repository-wide Prettier pass                               |
| Final original scan loop, two-CPU affinity    | **12 passed / 8.6 min**, CI=1, retries=0; Monterey High desktop passes in 1.6 min                                                                                   |
| Initial 1000 matrix, two-CPU affinity         | **25 passed / 30.4 min**, including all twelve first-minute cases; the intermediate scan implementation is superseded by the separate final scan validation         |
| Complete run's final 1000 implementation      | **All 25 cases pass**, including the restored scan loop                                                                                                             |
| Complete fidelity matrix                      | **20 passed**, including final split case enumeration; six split drifts also pass in the initial two-CPU focused run                                                |
| Final navigation matrix, two CPUs/two workers | **24 passed / 8.9 min**, all sites/modes/tiers/viewports, retries=0                                                                                                 |
| Final credits checks, two CPUs                | **4 passed / 37.4 s** (both cases repeated twice), retries=0                                                                                                        |
| Project-base                                  | Native-config build and **8 browser checks pass / 2.7 min**, retries=0                                                                                              |
| Complete suite, CI=1/four workers/retries=0   | **570 passed, 49 existing skips, 3 ordering failures / 37.4 min**; the two affected spec files loaded their pre-fix code and then passed final focused verification |

The complete initial suite plus final verification of every case in the two corrected files covers **573 passed / 49 skipped / zero unresolved failures**. `/tmp/f-ci-triage/final-coverage.json` records all 622 selections and which results were superseded by focused verification. This is **not** a fresh green full-suite invocation. A new hosted run remains required for hosted confirmation.

Logs: `.cache/gates`, `/tmp/f-ci-triage/{full-e2e-final,matrix,scan-final,navigation-final,monterey-final,base-e2e-final}.log`. Inspected Low and High desktop Challenger minute screenshots: full-resolution terrain, submarine and HUD render correctly. Use checkout-local screenshot directories instead of the ignored symlink into the read-only sibling worktree. Native-bundled Vite config handles this checkout's read-only dependency tree; the earlier runner-config project-base build hit the known PWA closeBundle import issue and was replaced with a successful native-config build.
