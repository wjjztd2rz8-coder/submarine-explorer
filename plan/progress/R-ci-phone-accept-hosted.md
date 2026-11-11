# R-ci-phone-accept-hosted

2026-11-11. DIRECTOR item 16b, brief 180. Tests/tooling only.

## Evidence and diagnosis

Downloaded actual failed artifacts with `gh run download`:

- Run [42827804490, shard 1](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/42827804490/job/129869803361), artifact `e2e-artifacts-42827804490-1-1`.
- Run [42801871242, shard 1](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/42801871242/job/129781308998), artifact `e2e-artifacts-42801871242-1-1`.
- Run [42827804490, shard 31](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/42827804490/job/129869803977), artifact `e2e-artifacts-42827804490-1-31`.

Read each `error-context.md` and extracted the HTML report's embedded operation timeline. These artifacts contain **no trace.zip**: the workflow supplies `--retries=0`, while configuration records traces only on the first retry. The requested job log was also fetched through `gh api .../actions/jobs/129869803361/logs`.

| Run/shard      | Journey            | Last HUD checkpoint | 100 ms advances | Time advancing frames | Test duration |
| -------------- | ------------------ | ------------------- | --------------: | --------------------: | ------------: |
| 42827804490/1  | Monterey landscape | 31.0 game seconds   |             313 |             178.751 s |     240.821 s |
| 42801871242/1  | Monterey landscape | 15.0 game seconds   |             158 |             186.269 s |     240.664 s |
| 42827804490/31 | Hudson desktop     | 21.0 game seconds   |             216 |             169.729 s |     240.720 s |

These failures **continue making progress until the test deadline**. The longest leaf operation, including grouped advances, is only 3.787 / 7.309 / 5.324 seconds respectively. The Monterey snapshot shows its first objective scanned, live controls and standing guidance to the second objective; Hudson likewise has a scanned objective and standing guidance. No modal is open. The final closed-page error follows timeout teardown. Thus the closed session alone does not establish a crashed renderer, GPU OOM, or a clock/dialog deadlock. The bimodal explanation in the brief is not supported by these three timelines.

The dominant cost is the 600 rendered 100 ms advances, with other browser round trips periodically blocked behind rendering. World drawing in software WebGL is the supported bottleneck inference, rather than uniformly slow DOM assertions. The exact hosted GL driver is not exposed by these artifacts. At the observed progress rates, a full minute projects to roughly 8–16 wall minutes, so the historical 15-minute override can conceal the cost or still lose to the suite deadline. Increasing budgets cannot meet the release-time objective.

A separate local three-round diagnostic measured 12 ordinary 100 ms game frames per mode, preserving normal frame stepping. Its actual GL backend is **ANGLE Vulkan / llvmpipe**, with **295,122 triangles** at Monterey. Mean wall time per frame:

| Drawing mode                | Mean per frame |
| --------------------------- | -------------: |
| Native resolution           |     114.389 ms |
| Quarter pixel ratio         |      85.250 ms |
| Diagnostic drawing disabled |       4.833 ms |

Thus reducing pixels alone saves about 25%; the bulk is inside world drawing rather than clock/physics work. This justified reducing draw frequency too, without reducing physics, guidance or layout checks. Disabling draws was a temporary diagnostic only; the shipped capability spec still draws 120 world frames during the minute and normal frames before/after it. Diagnostic script and JSON report live under `.cache/180/`; its successful run took 19.5 seconds.

Raw artifacts, extracted report, and computed operation counts are retained under `.cache/180/evidence/`; the job log is `/tmp/180-shard1.log`.

## Change

Push CI registers one first-minute viewport per site, rotating over portrait, landscape and desktop: **13 journeys**, every site exactly once, all three layouts represented. Local and `PW_RENDER_REVIEW=1` discovery retain **39 journeys**. The existing 14 other phone acceptance cases remain registered in both modes. Existing discovery-based balancing automatically consumes the smaller matrix; no workflow, hand-maintained shard list or timing weight changes.

During each journey's piloting loop only, draw the world once per five frames and reduce the WebGL drawing-buffer pixel ratio to one quarter, following existing capability-test rendering reductions (`f-verify-1000` and `hud-touch`). Scene/camera matrices still update on every frame, preserving projection-dependent HUD checks. A page-local restoration closure retains the original renderer and resolution; no window global or product setting is added. This cuts per-draw raster pixels to one sixteenth and world draws from 600 to 120 while keeping the CSS viewport, camera aspect, 600 game/physics frames, all 121 guidance checks, per-second HUD clearance, native input, control reachability, scanner acceptance, sixty unfrozen game seconds, debrief counts/exits and restored piloting. Full pixel ratio returns, followed by one normal rendered frame, before the first-minute screenshot and all debrief evidence. The same capability optimization applies locally, with all 39 journeys retained.

No timeout, retry or past-bug assertion is relaxed. The matrix regression executes actual registration and proves complete site coverage, all three layouts, and full local/render-review coverage. The deadline regression now checks all three bodies with both local and hosted CI flags.

## Validation

- Grepped `tests/e2e` for first-minute, guidance, clock and HUD coverage before running the affected spec by exact capability name.
- `CI=1 GATES_CONFIG_MODE=writable PW_PORT=4383 PW_OUTDIR=.cache/180/dist npx playwright test tests/e2e/phone-accept.spec.ts -g 'monterey-canyon: guidance reaches first scan within sixty seconds and debrief exits' --retries=0`: **3 passed in 5.2 minutes**, all three layouts, before reducing registration to one viewport per site. Reported durations: portrait 1.6 m, landscape 1.7 m, desktop 1.8 m. This local machine is not a hosted latency guarantee.
- Configuration/deadline/matrix, clock and shard units: **22 passed across 3 files**. TypeScript, repository-wide Prettier, attribution and `git diff --check` pass.
- Requested push-equivalent command: **27 passed in 6.2 minutes**, with the final code and normal CI retries/deadlines. Playwright assigns this non-parallel spec's **27 cases** to shard 1; this differs from the hosted individual-test balancer. All 13 journeys passed on their first attempt. JSON report: `.cache/180/push-throttled-report.json`.
- Original-loop 900-second diagnostic from an isolated copy of the HEAD spec/config: **passed in 138.800 s** (Monterey landscape), preserving every assertion. This local case did not require the enlarged budget. Its report is `.cache/180/long-budget-report.json`. An earlier trace experiment was invalidated when a second command reused its output directory and then failed on a port conflict; it was interrupted and is not counted as validation. The definitive diagnostic used separate ports/output paths.
- The first two monolithic full-gate attempts were interrupted after roughly 20 and 15 minutes in the unsharded unit stage, without complete unit results. The second used `VITEST_MAX_WORKERS=1`. A separate 60-second verbose diagnostic made partial progress (630 results, including 15–22-second mesh cases) and ended at its external diagnostic deadline; it is not counted as a full pass.
- An isolated `CI=1 VITEST_MAX_WORKERS=1 GATES_CONFIG_MODE=writable PW_PORT=4396 bash tools/gates.sh --full-e2e` attempt, after all separate browser diagnostics finished, has passed Python (**169 tests**), strict content validation, build and **all 4,866 units across 196 files**. The unit stage took **1,650.14 seconds (27.5 minutes)**. Child CPU monitoring shows workers actively computing and advancing; absence of intermediate default-reporter output was not proof of a unit deadlock. The canonical full CI browser suite is now running; **no complete full-gate pass is claimed yet**. Primary log: `/tmp/180-gates-isolated.log`; per-phase logs: `.cache/gates/`; CPU samples: `/tmp/180-gates-processes.log`.
- The isolated full browser stage initially failed ten legacy screenshot cases with `EROFS`: `.cache/codex/shots` was a worktree-created symlink into the read-only main checkout. Preserved that ignored symlink as `.cache/codex/shots.shared-link` and created a workspace-local `.cache/codex/shots` directory. No assertion or source file changed for this environment repair. The remaining suite is continuing; those early cases will be rerun using Playwright's last-failed selection after the suite finishes. One separate browser-history check (`d-shell`: Back/Forward after Home) has passed on retry and will be reported as flaky.
- Independently verified root smoke: **3 passed in 25.3 s**. Fresh project-base build, manifest verification and canonical `--phase e2e-base --prebuilt` gate: **8 passed in 1.4 minutes**.

- Full local phone spec (all 39 viewport/site journeys plus 14 other cases): **53 passed in 13.1 minutes**, with the final code, normal 90-second local deadline, and no retries. JSON: `.cache/180/local-full-phone-report.json`.
- The earlier buffer-only matrix also passed 27/27 in 12.9 minutes. The three-round diagnostic showed why that saving alone would be insufficient on the slowest hosted frames, so the final code also reduces draw frequency.

### Exact final named check

```sh
CI=1 GATES_CONFIG_MODE=writable PW_PORT=4394 PW_OUTDIR=.cache/180/dist \
  npx playwright test tests/e2e/phone-accept.spec.ts \
  -g 'monterey-canyon: guidance reaches first scan within sixty seconds and debrief exits' \
  --retries=0
```

**1 passed**, landscape Monterey, **36.143 seconds** (37.1 seconds including startup). Its final code restores and redraws the native-resolution buffer before evidence capture. JSON: `.cache/180/named-throttled-report.json`.

### Requested push-equivalent and per-test timings

```sh
CI=1 GATES_CONFIG_MODE=writable PW_PORT=4393 PW_OUTDIR=.cache/180/dist \
  PLAYWRIGHT_JSON_OUTPUT_FILE=.cache/180/push-throttled-report.json \
  npx playwright test tests/e2e/phone-accept.spec.ts --shard=1/38 \
  --reporter=list,json --output=.cache/180/push-throttled-results
```

Each duration below comes directly from the final JSON report. These are local shared-machine measurements, with static gates and some separate browser diagnostics running concurrently, not hosted benchmarks.

| Layout                           | Test                                                                                     | Status | Seconds |
| -------------------------------- | ---------------------------------------------------------------------------------------- | ------ | ------: |
| first minute acceptance 390x844  | great-blue-hole: guidance reaches first scan within sixty seconds and debrief exits      | passed |  24.778 |
| first minute acceptance 390x844  | lost-city: guidance reaches first scan within sixty seconds and debrief exits            | passed |  20.768 |
| first minute acceptance 390x844  | hudson-canyon: guidance reaches first scan within sixty seconds and debrief exits        | passed |  25.566 |
| first minute acceptance 390x844  | titanic: guidance reaches first scan within sixty seconds and debrief exits              | passed |  18.708 |
| first minute acceptance 390x844  | challenger-deep: guidance reaches first scan within sixty seconds and debrief exits      | passed |  17.757 |
| first minute acceptance 844x390  | hunga-tonga-caldera: guidance reaches first scan within sixty seconds and debrief exits  | passed |  17.290 |
| first minute acceptance 844x390  | kamaehuakanaloa: guidance reaches first scan within sixty seconds and debrief exits      | passed |  17.759 |
| first minute acceptance 844x390  | monterey-canyon: guidance reaches first scan within sixty seconds and debrief exits      | passed |  29.046 |
| first minute acceptance 844x390  | bismarck: guidance reaches first scan within sixty seconds and debrief exits             | passed |  20.177 |
| first minute acceptance 1280x800 | blake-plateau-corals: guidance reaches first scan within sixty seconds and debrief exits | passed |  29.753 |
| first minute acceptance 1280x800 | axial-seamount-ashes: guidance reaches first scan within sixty seconds and debrief exits | passed |  19.825 |
| first minute acceptance 1280x800 | endurance: guidance reaches first scan within sixty seconds and debrief exits            | passed |  20.424 |
| first minute acceptance 1280x800 | beebe-vent-field: guidance reaches first scan within sixty seconds and debrief exits     | passed |  19.098 |
| phone acceptance 390x844         | Home names the next site and launches that destination                                   | passed |   4.160 |
| phone acceptance 390x844         | Settings keeps Close visible while Aa cycles and persists at 150 percent                 | passed |   3.557 |
| phone acceptance 390x844         | briefing and opening HUD fit at large scale with no boost or key names                   | passed |  17.931 |
| phone acceptance 390x844         | Arcade scan reaches 100 m and records two primaries in Journal and debrief               | passed |   6.049 |
| phone acceptance 390x844         | Your sub exposes four reachable groups and retains an unlocked swatch                    | passed |   2.464 |
| phone acceptance 390x844         | touch help and photo gestures name no keyboard keys or boost                             | passed |   4.709 |
| phone acceptance 390x844         | an optional event starts on arrival at its subject and clears touch controls             | passed |   6.198 |
| phone acceptance 844x390         | Home names the next site and launches that destination                                   | passed |   4.170 |
| phone acceptance 844x390         | Settings keeps Close visible while Aa cycles and persists at 150 percent                 | passed |   3.530 |
| phone acceptance 844x390         | briefing and opening HUD fit at large scale with no boost or key names                   | passed |  19.255 |
| phone acceptance 844x390         | Arcade scan reaches 100 m and records two primaries in Journal and debrief               | passed |   6.656 |
| phone acceptance 844x390         | Your sub exposes four reachable groups and retains an unlocked swatch                    | passed |   2.247 |
| phone acceptance 844x390         | touch help and photo gestures name no keyboard keys or boost                             | passed |   5.029 |
| phone acceptance 844x390         | an optional event starts on arrival at its subject and clears touch controls             | passed |   5.905 |

## Under-30-minute follow-up proposal

Existing weights project a maximum **16.760 minutes per shard across 38 shards** after this change (previously about 17.3). At 20 browser slots, even an ideal **636.028 runner-minutes** needs **31.801 minutes** before setup/build overhead. Rebalancing alone cannot establish under 30. After collecting fresh successful timings, a concrete capacity option is **24 browser slots and 48 shards**, approximately two **13.295-minute** waves (**26.590 minutes**) plus build/setup. This requires available runner capacity and hosted measurement; it is a proposal, not a claimed acceptance result or an unrequested workflow change. Hosted green and under-30 acceptance remain open.
