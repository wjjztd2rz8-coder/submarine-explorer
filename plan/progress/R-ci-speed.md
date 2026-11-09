# R-ci-speed — measure, then rebalance

2026-11-09. The smallest safe change is a hosted timing-data refresh for the
existing discovery-driven **38 shards × 1 worker**. Expected saving: **about
3 minutes** in a queue replay. **Under 30 minutes is not established and is not
supported by the measured work budget.** No hosted after-run has been started.

## Measured baseline

Selected with `gh run list --workflow ci.yml --branch main --status completed
--limit 10`; then ran `gh run view <id> --json jobs` for each. GitHub CLI omits
step timestamps and job creation timestamps from that JSON, so supplemented it
with `gh api repos/{owner}/{repo}/actions/runs/<id>/jobs?filter=latest&per_page=100`.
The sample contains six executed workflows and four cancellations with no jobs.
All executed workflows are attempt 1; all **270 jobs and every step's wall time**
are listed in [the complete audit](R-ci-speed-timings.md), including each job's
queue time, runtime, result and direct log link.

Initial queue is workflow creation to first job start. Execution span is first
job start to last job finish. Those spans include internal queueing; overlapping
job waits cannot be added to obtain workflow latency. Browser work is the sum of
Playwright step wall times across runners, not elapsed workflow time.

| Run                                                                                            | Result    | Created → updated | Initial queue | First start → last finish | Browser step work | Slowest three shards (job wall)         |
| ---------------------------------------------------------------------------------------------- | --------- | ----------------: | ------------: | ------------------------: | ----------------: | --------------------------------------- |
| [42619364712](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/42619364712) | success   |            43m10s |         0m03s |                    43m07s |           589m29s | 4/38 24m58s, 3/38 22m53s, 9/38 21m55s   |
| [42603455499](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/42603455499) | failure   |            81m19s |        41m19s |                    39m56s |           601m03s | 4/38 24m54s, 10/38 20m55s, 13/38 20m53s |
| [42603309159](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/42603309159) | cancelled |             0m50s |             — |                         — |                 — | —                                       |
| [42603268062](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/42603268062) | success   |            42m20s |         0m03s |                    42m17s |           610m05s | 4/38 24m52s, 18/38 22m55s, 9/38 21m28s  |
| [42592035972](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/42592035972) | failure   |            49m59s |         0m03s |                    49m55s |           672m52s | 31/38 25m26s, 3/38 25m24s, 4/38 25m23s  |
| [42581353994](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/42581353994) | failure   |            78m53s |        31m23s |                    47m29s |           664m03s | 18/38 25m31s, 9/38 25m23s, 31/38 25m23s |
| [42578209765](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/42578209765) | failure   |            61m15s |        13m13s |                    48m01s |           679m18s | 9/38 25m33s, 31/38 25m24s, 4/38 25m23s  |
| [42577519028](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/42577519028) | cancelled |             6m14s |             — |                         — |                 — | —                                       |
| [42577459675](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/42577459675) | cancelled |             0m34s |             — |                         — |                 — | —                                       |
| [42577452027](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/42577452027) | cancelled |             0m06s |             — |                         — |                 — | —                                       |

The supplied run `42619420675` was still executing at collection time, so it is
not one of the ten completed samples. Its first jobs started at 13:26:34 UTC,
**42m48s** after creation at 12:43:46 UTC. A final 62-minute runtime cannot be
asserted from that incomplete run. Runs on `main` serialize behind the preceding
run; the long initial waits above are separate from test execution.

The latest green run reached **20 concurrent jobs**. Its browser jobs ranged
from **9m48s to 24m58s** (median 16m00.5s). Shard 4 was the longest job, but shard
13 finished last: it waited **22m20s** after job creation and then ran **20m32s**.
The imbalance lets slow shards start late and extends the workflow's tail.

Median latest-green browser setup steps: dependency install **3s**, build
artifact download **2s**, Chromium install **4s**. Both deployment bases already
build once and share immutable artifacts; the Chromium composite already caches
browsers. Replacing those mechanisms would add machinery for negligible saving.

## Change and expected saving

- Refresh **985** completed-case costs from the two recent complete green
  one-worker hosted runs, `42619364712` and `42603268062`, using all **76 JSON
  artifacts** and the existing `tools/e2e-update-timings.mjs`. Average the two
  measurements per case; retain prior estimates/fallbacks for skipped cases.
  Each run had **985 passed / 83 skipped / 0 failures / 0 retries / 0 report
  errors**, and the same **1,068 distinct discovered cases** as this checkout.
- Cut **84 retired timing keys** absent from full local discovery, including
  the existing render cases in that discovery. These are obsolete estimates,
  not specs or test selections. Keep current render and project-base estimates.
- Keep the existing balancer, shard count, single browser worker, discovery,
  assertions, skips, render policy, timeouts and retries. No product code or test
  changes, extra CI branch, manual experiment trigger or dependency.

Replay uses the unchanged current CI discovery, the mean observed cost of each
case from those two green reports (including zero work for actual skips), and
2s per case from the existing balancer. At 20 slots, retain the latest green
run's browser admission order, static/project-base occupancy and build-ready
time; allow 21s per browser job for setup/upload plus 3s initial admission.
Both layouts use the same costs and scheduling assumptions.

| Projection using identical measured costs           | Before weights | Refreshed weights |
| --------------------------------------------------- | -------------: | ----------------: |
| Discovered cases selected exactly once              |          1,068 |             1,068 |
| Shards × workers per runner                         |         38 × 1 |            38 × 1 |
| Browser work per shard, including 2s/case allowance |  10m12s–25m21s |     14m14s–17m23s |
| Queue replay, full workflow                         |         43m46s |            40m55s |

Expected replay saving: **2m51s (6.5%)**. The actual latest green baseline is
43m10s; the old-layout replay is 36s slower, illustrating model error. This is a
projection fitted to those runs, not independent validation or a measured hosted
speedup. GitHub admission order, software-renderer speed and competing workflows
can change. Simulating 40, 57 and 76 one-worker shards did not reach 30 minutes;
keep 38 rather than expanding the workflow matrix for an unmet target.

Even the latest green browser steps alone consume **589m29s**, or **29m28s** at
20 perfectly utilized slots. Add its static checks (26m59s), project-base browser
job (5m38s), build jobs and runner setup/upload: total required job work is
**about 636 runner-minutes**, a **31.8-minute ideal lower bound** before
additional queueing. The other green run has 610m05s of browser-step work.
Balancing/artifact/cache changes alone cannot deliver a credible under-30 full
run at this measured capacity. The next acceptance check is a complete green
hosted run on the patch; the target remains open. Cutting actual test cost or
raising available capacity would require a separately measured follow-up.

## Prior attempts and simplicity

Read `../124-r-ci-speed/plan/progress/R-ci-speed.md` and
`../131-s-verify-ci-speed/plan/progress/R-ci-speed-2.md`. The former proposed two
workers without full hosted acceptance; the latter added a dispatch experiment
and explicitly retained the one-worker default. Neither patch was merged here.
This change replaces stale measurements in the existing mechanism and deletes
retired metadata. It adds no scheduler, selector roster, per-site branch,
product setting or package-named test. Every discovery result remains covered.

## Validation

- Actual Playwright CLI discovery with the refreshed selectors, repeated for all
  **38 shards**, selects all **1,068 CI cases exactly once** with one worker.
  Full discovery (including the existing render policy) has **1,085 cases**;
  obsolete weights were pruned against this larger roster, not the CI subset.
- **15 focused unit tests passed** in `e2eShards.test.ts`, `e2eTimings.test.ts`
  and `playwrightConfig.test.ts`:

  ```bash
  npx vitest run tests/unit/e2eShards.test.ts tests/unit/e2eTimings.test.ts \
    tests/unit/playwrightConfig.test.ts --configLoader runner --cache=false \
    --pool=threads --maxWorkers=1
  ```

- Grepped `tests/e2e` for shard/worker/artifact/browser/preview coverage, then ran
  existing capability tests by spec and name, with `CI=1`,
  `GATES_CONFIG_MODE=writable`, owned builds/ports, one worker and no retries:

  ```bash
  PW_OUTDIR=dist-ci-speed PW_PORT=4296 npx playwright test \
    tests/e2e/smoke.spec.ts -g 'plain root opens the home shell'
  # 1 passed, 2.2s
  PW_OUTDIR=dist-ci-speed PW_PORT=4296 npx playwright test \
    tests/e2e/d-input-hud.spec.ts \
    -g 'readable contextual HUD, controls and UI scale survive reload'
  # 1 passed, 25.6s
  VITE_BASE=/submarine-explorer/ PW_BASE=/submarine-explorer/ \
    PW_OUTDIR=dist-ci-speed-base PW_PORT=4297 npx playwright test \
    tests/e2e/base-url.spec.ts \
    -g 'project-base build loads data, models, and globe texture'
  # 1 passed, 21.3s; separate project-base build and manifest gate passed
  ```

  The initial HUD attempt failed on `EROFS` at the shared screenshot symlink;
  the successful repeat used worktree-local screenshot storage. The HUD capture
  was inspected and shows the rendered submarine, terrain and controls.

- Python gate: **169 passed**; content validation and root build/typecheck passed.
  Attribution, repository-wide Prettier and `git diff --check` passed.
- **Canonical gate: incomplete, exit 124.** Ran
  `GATES_CONFIG_MODE=writable PW_OUTDIR=dist-ci-speed PW_PORT=4295 bash tools/gates.sh`;
  interrupted the initial attempt while its broad unit stage was still active.
  Repeated with `VITEST_MAX_WORKERS=1 timeout 300s bash tools/gates.sh` and the same
  build/port environment. Python, content and build passed before the five-minute
  limit expired in the unit stage. A diagnostic reporter reached
  `props-geo.test.ts`; a separate 90s broad-unit threads run also did not finish.
  No full unit-suite or full-gate pass is claimed, and no unrelated test,
  timeout or assertion was changed to obtain a pass. The gate's later browser,
  attribution and formatting stages were exercised separately as listed above.
- Additional named root smoke command:
  `PW_OUTDIR=dist-ci-speed PW_PORT=4296 npx playwright test tests/e2e/smoke.spec.ts -g 'boots on'`
  with the same CI/writable-config environment: **2 passed in 18.0s**, Titanic and
  Monterey terrain/render/error checks. In total **five named browser cases passed**.
- Restored the shared screenshot symlink after validation; retained local captures
  and raw measurement/selection/model logs under `.cache/ci-speed/`. Removed the
  two owned build directories. No push, merge, dispatch or deployment performed.
