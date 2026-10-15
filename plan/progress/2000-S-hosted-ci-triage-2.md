# 2000 — hosted CI triage, S-tests step 3 / R-release

## Evidence and scope

Inspected on 2026-10-15. Checkout **61b2caf193244c578ed421ae8c363be721317dec** already includes the later R-ci-triage repairs; the brief's 94ea748 head and b1de6c0 run are historical. Selected the newest **completed CI workflow on main**, not the newer successful Pages deployment:

- [CI 38682281312](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/38682281312), **c985e096f70df8d50f1e7d96974b62d18b563c63**, failure, 2026-10-15 **04:35:38–05:12:57 UTC** (37m19s including queueing).
- **17/30 e2e shards failed**, 27 failed cases in **eight spec files**. All 785 listed cases are accounted for: **676 passed, 25 failed, 2 timed out, 82 pre-existing skips**. No interrupted/unexecuted cases; no shard global deadline or job deadline was reached. No skips were added by this work.
- Both builds, static checks and project-base browser checks passed. Hosted unit result: **190 files / 2,216 tests passed**.
- CI **38697281304** at checkout 61b2caf was queued when selected. A newer pending run is not evidence that these repairs pass hosted CI.

Read-only evidence commands:

```bash
gh run list --branch main --status completed --limit 8 \
  --json databaseId,headSha,conclusion,createdAt,updatedAt,workflowName,url
gh run list --branch main --workflow ci.yml --status completed --limit 1 \
  --json databaseId,headSha,conclusion,url
gh api repos/wjjztd2rz8-coder/submarine-explorer/actions/runs/38682281312/logs > /tmp/2000-latest-ci.zip
gh api --paginate repos/wjjztd2rz8-coder/submarine-explorer/actions/runs/38682281312/jobs > /tmp/2000-jobs.json
gh api --paginate repos/wjjztd2rz8-coder/submarine-explorer/actions/runs/38682281312/artifacts > /tmp/2000-artifacts.json
```

Downloaded the complete log ZIP through the Actions API, extracted to `/tmp/2000-ci-logs`, and downloaded **all 30** `e2e-timings-38682281312-1-*` JSON artifacts via `actions/artifacts/<id>/zip` into `/tmp/2000-timings`. Failure summaries below agree with those JSON results; duplicate gate-tail output is counted once.

## Root causes

**Stale specifications/fixtures: 26 cases.** Timeouts are symptoms in several of these, not evidence of a product timer defect:

| Code | Cause and existing repair in this checkout                                                                                                                                                                                                                                                        |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1   | Two migrated-cosmetics cases call real-time `homeReady` while Playwright's clock is paused. The 45 s readiness wait cannot progress. R-ci-triage passes the paused-clock flag, preserving readiness/focus/persistence assertions.                                                                 |
| S2   | Four Advanced/Daily cases measure the checkbox glyph as though it were the former large control. The authored Advanced UI now uses text-sized switches. Existing repairs distinguish those switches from the large menu/radio controls. No further size thresholds changed here.                  |
| S3   | Four landscape Home/title cases expect the former 48 px menu height; the authored landscape menu is now 44 px (44.5 px measured). Existing repairs follow that design. No further size thresholds changed here.                                                                                   |
| S4   | Two Blue Hole approach cases fail the old 1e-6 m clearance tolerance by about 0.0000146 m; the driver also predates the gallery minimum scan depth. Existing repair retains clearance, scan, Journal and debrief guards and drives down to the required depth. No further tolerance changes here. |
| S5   | Eight animal-hint cases freeze `overlay.update` to hide a scan card, also stopping the guidance lifetime clock. The hint never expires, even under additional simulated time. Existing `setScanCardSuppressed` suppresses the source while the guidance slot keeps ticking.                       |
| S6   | One Blue Hole mission fixture teleports to the gallery scan pose but lets buoyancy move the vehicle above the 10 m minimum before capture under slow rendering. Existing helper holds the posed vehicle; production scan depth, real scan input and mission-completion assertions remain.         |
| S7   | Five Monterey reload/objective cases teleport into urgent seabed-proximity warnings. The urgent warning correctly owns the shared slot. Existing helper searches for a safe out-of-range location before requiring the standing objective.                                                        |

**Software-GL timing: T1, one capture-status race.** The hosted `d-photo.spec.ts` first failure is **a null toast bounding box at line 144**, not the downstream Journal hero assertion. `toHaveText` can match a hidden toast whose text is retained; four protocol round trips allow the 2.5 s status timer to expire before measurement on software rendering. This timing diagnosis is inferred from that hosted failure and the timer implementation; the unmodified photo spec passes locally. Source evidence: `PhotoMode.toast()` hides success status after 2500 ms without clearing its text. The previous R-ci-triage patch changed Journal rendering but left this timing race in the spec.

This change repairs that remaining assumption in the existing **photo capability spec**: pause the clock before navigation; pump real game frames for readiness, held-input simulation, orbit, capture, exits and reload; measure the visible status while simulated time is held; then explicitly advance **2500 ms and require it hidden**. All previous layout, nonblank JPEG, freeze/supplies, camera restoration, download, persistence and deletion checks remain. No new package-named spec, skips, larger deadlines, removed assertion or relaxed threshold.

The two **240 s** test-deadline failures are S5: Blue Hole 1600x900/100% and Monterey 1280x720/100%. Both remain stuck asserting that the hint is hidden. Software rendering magnifies the cost, but the stopped guidance clock is a deterministic fixture defect. They are **not established independent software-GL regressions**. The other six S5 cases fail the same assertion within the test budget.

## Every hosted failing case

Locations are from the failing commit; current line numbers can differ. Each shard links to its job log.

| Shard/job                                                                                                 | Spec/location and exact case path                                                                                                                   | Cause | Result   |
| --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | -------- |
| [2/30](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/38682281312/job/116249606031)  | `f2-progress.spec.ts:201` — migrated Journal cosmetics keep labels, swatches and keyboard focus at 1280px                                           | S1    | failed   |
| [2/30](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/38682281312/job/116249606031)  | `hud-touch.spec.ts:1538` — catalog tutorial and reload › 667x375-touch › monterey-canyon: tutorial, contact, reward, chip and reload                | S7    | failed   |
| [3/30](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/38682281312/job/116249605842)  | `f2-progress.spec.ts:201` — migrated Journal cosmetics keep labels, swatches and keyboard focus at 390px                                            | S1    | failed   |
| [6/30](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/38682281312/job/116249605948)  | `d-photo.spec.ts:68` — photo mode freezes the sim, saves to the Journal, persists and deletes                                                       | T1    | failed   |
| [12/30](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/38682281312/job/116249606022) | `f2-modes.spec.ts:14` — two modes, Advanced and Daily at 390x844                                                                                    | S2    | failed   |
| [12/30](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/38682281312/job/116249606022) | `hud-touch.spec.ts:1273` — animal guidance placement › 1600x900-100 › great-blue-hole: the animal hint waits for the scan card, then clears the HUD | S5    | timedOut |
| [12/30](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/38682281312/job/116249606022) | `hud-touch.spec.ts:1538` — catalog tutorial and reload › 844x390-touch › monterey-canyon: tutorial, contact, reward, chip and reload                | S7    | failed   |
| [17/30](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/38682281312/job/116249606165) | `hud-touch.spec.ts:510` — large UI and menu reachability › touch audit 390x844 › Daily, expanded mode picker and menu exits are reachable by touch  | S2    | failed   |
| [18/30](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/38682281312/job/116249606232) | `f2-modes.spec.ts:14` — two modes, Advanced and Daily at 1280x720                                                                                   | S2    | failed   |
| [18/30](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/38682281312/job/116249606232) | `hud-touch.spec.ts:1538` — catalog tutorial and reload › 1024x768-touch › monterey-canyon: tutorial, contact, reward, chip and reload               | S7    | failed   |
| [19/30](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/38682281312/job/116249606161) | `hud-touch.spec.ts:1273` — animal guidance placement › 1280x720-100 › monterey-canyon: the animal hint waits for the scan card, then clears the HUD | S5    | timedOut |
| [20/30](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/38682281312/job/116249606188) | `hud-touch.spec.ts:510` — large UI and menu reachability › touch audit 667x375 › Daily, expanded mode picker and menu exits are reachable by touch  | S2    | failed   |
| [21/30](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/38682281312/job/116249606236) | `f-verify-1000.spec.ts:140` — 1000 1600x900 › great-blue-hole medium: approach, first scan, Journal and debrief                                     | S4    | failed   |
| [21/30](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/38682281312/job/116249606236) | `hud-touch.spec.ts:1538` — catalog tutorial and reload › 1280x720-touch › monterey-canyon: tutorial, contact, reward, chip and reload               | S7    | failed   |
| [23/30](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/38682281312/job/116249606122) | `f-title-layout.spec.ts:79` — home layout 667x375                                                                                                   | S3    | failed   |
| [24/30](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/38682281312/job/116249606169) | `f-title-layout.spec.ts:79` — home layout 844x390                                                                                                   | S3    | failed   |
| [24/30](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/38682281312/job/116249606169) | `hud-touch.spec.ts:1273` — animal guidance placement › 360x640-100 › monterey-canyon: the animal hint waits for the scan card, then clears the HUD  | S5    | failed   |
| [25/30](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/38682281312/job/116249606155) | `hud-touch.spec.ts:1273` — animal guidance placement › 844x390-100 › monterey-canyon: the animal hint waits for the scan card, then clears the HUD  | S5    | failed   |
| [27/30](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/38682281312/job/116249606069) | `hud-touch.spec.ts:1273` — animal guidance placement › 360x640-150 › monterey-canyon: the animal hint waits for the scan card, then clears the HUD  | S5    | failed   |
| [28/30](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/38682281312/job/116249606033) | `hud-touch.spec.ts:1273` — animal guidance placement › 844x390-150 › great-blue-hole: the animal hint waits for the scan card, then clears the HUD  | S5    | failed   |
| [29/30](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/38682281312/job/116249606164) | `content-missions.spec.ts:120` — great-blue-hole: briefing to primary scans to debrief                                                              | S6    | failed   |
| [29/30](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/38682281312/job/116249606164) | `f-title-scene.spec.ts:367` — title mobile 667x375 › scene plate, copy, menu and selector remain separate and tappable                              | S3    | failed   |
| [29/30](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/38682281312/job/116249606164) | `f-verify-1000.spec.ts:140` — 1000 390x844 › great-blue-hole medium: approach, first scan, Journal and debrief                                      | S4    | failed   |
| [29/30](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/38682281312/job/116249606164) | `hud-touch.spec.ts:1273` — animal guidance placement › 390x844-100 › great-blue-hole: the animal hint waits for the scan card, then clears the HUD  | S5    | failed   |
| [30/30](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/38682281312/job/116249606131) | `f-title-scene.spec.ts:367` — title mobile 844x390 › scene plate, copy, menu and selector remain separate and tappable                              | S3    | failed   |
| [30/30](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/38682281312/job/116249606131) | `hud-touch.spec.ts:1273` — animal guidance placement › 390x844-150 › great-blue-hole: the animal hint waits for the scan card, then clears the HUD  | S5    | failed   |
| [30/30](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/38682281312/job/116249606131) | `hud-touch.spec.ts:1538` — catalog tutorial and reload › 390x844-touch › monterey-canyon: tutorial, contact, reward, chip and reload                | S7    | failed   |

## Real product bugs

**Journal photo on an undiscovered entry:** the prior Journal redesign displayed a single photo as a hero only in the discovered-entry branch; the locked-entry branch returned before rendering it, while the thumbnail grid needs two photos. A pilot could capture a valid unscanned POI photo, see it in Photos, then open that POI entry and find no picture. This is a real product regression, distinct from T1. It was already fixed by **d6d23b4**, included in **61b2caf**, by rendering the hero before the locked-entry early return. The existing photo capability test still requires exactly one hero image, no duplicate grid, saved-photo persistence and unchanged discoveries. The hosted run stops earlier at T1, so it does not itself reach/prove the Journal failure. Local passing coverage confirms the repaired path. No additional runtime change is justified by these logs; no unresolved product regression is established by the other 26 failures.

## Runtime recommendation

Timeouts do **not** dominate: 2/703 executed cases reach the test limit, and all 27 failing cases together consume **40.48 of 465.29 browser-test minutes** (8.7%). Passing software-rendered tests account for the rest. Shard browser wall times range **8.27–23.75 min**, median **15.16 min**. The slowest shard (12) spends 23.66 min in tests, still inside the current 25 min suite budget. Retries were already **zero** in this hosted run; disabling them again cannot save time.

Queueing matters: job intervals show a maximum of **20 concurrent jobs**. Shard 25 starts at 04:51:31, **14m35s after the first e2e jobs**, then finishes at 05:12:57. A 30-shard matrix therefore does not mean 30 simultaneous browsers. This is an observed concurrency ceiling, not a claim about a permanent account plan limit.

**Smallest immediate timing change proposed:** use the existing `tools/e2e-update-timings.mjs` with all 30 hosted reports to refresh `tools/e2e-timings.json`; retain the existing one worker per runner, zero retries, 240 s test limit, 25 min suite deadline and 30 min job deadline. Exact commands after a repaired completed hosted run:

```bash
node tools/e2e-update-timings.mjs <completed-run-url> <all-30-hosted-report-paths>
CI=1 node tools/e2e-shards.mjs 1/30 --plan
```

A dry-run using this failed run's 703 completed costs and current discovery puts conservative shard estimates at **17.88–17.92 min**, versus an observed old-allocation estimate of **9.84–25.27 min** (includes the balancer's startup allowance and retained costs for runtime-skipped cases). Repair-driven time reductions must be measured on the next run; failed attempts are not successful timing baselines. No workflow or timing database change was applied here.

If release latency remains excessive after those repairs/weights, trial **38 shards** with the same deadlines/workers and refreshed weights. Only the matrix grows; no test changes or exclusions. A simple 20-slot queue model, reserving one slot for 11 min of checks and another for 3 min of project-base work, with 1 min setup per shard, estimates **14.2 min per shard / 30.3 min total** versus **17.9 / 37.8 min at 30 shards**, before build/queue/upload overhead. **40 shards is worse in that model** (39.9 min) because the remaining two spill into another wave. These are planning estimates, not a measured speedup or a guarantee of available runners. Reducing to 18–20 shards estimates 26.9–29.9 min per shard and would exceed the current 25 min suite deadline; do not make that change or raise deadlines to accommodate it.

## Validation

- **PASS:** all **27 hosted failing cases**, `CI=1`, `--retries=0`, one worker. Exact failure-key selection from the downloaded reports selects the other 26 cases; they pass in **8.0 min**, log `/tmp/2000-failures-current.log`. The remaining photo case passes with its quota/storage companion in `/tmp/2000-dphoto-after.log` (**2 passed**), and again in the final smoke run.
- **PASS:** final photo capability + root smoke, **5/5**, `CI=1`, zero retries; `/tmp/2000-photo-smoke-final.log`. Project-base browser checks **8/8**, `CI=1`, zero retries; `/tmp/2000-base.log`. This is affected-case + smoke/project-base validation, not a claim of a local full 785-case run.
- **PASS:** root and project-base `npm run build` including TypeScript, using isolated outputs and a locally bundled native Vite config to avoid writing to the read-only shared dependency tree. Logs `/tmp/2000-build-full.log` and `/tmp/2000-build-base.log`. An initial helper typing error (`boolean | undefined`) was corrected to `window.__gameReady === true`; both final builds pass.
- **PASS:** Python **166/166**, strict content validation, attribution, changed-file Prettier and `git diff --check`. Python/content output is in `/tmp/2000-checks.log`; attribution in `/tmp/2000-attribution.log`.
- **PASS:** existing photo-mode, photo-store and shard-balancer unit capability checks, **3 files / 22 tests**, using `npm test -- --configLoader runner --cache=false --pool=threads tests/unit/photoMode.test.ts tests/unit/photoStore.test.ts tests/unit/e2eShards.test.ts`; `/tmp/2000-capability-units.log`.
- **LIMITATION:** full local unit runs with both config loaders report no tests. Default/fork attempts were interrupted; the full thread-pool attempt was explicitly bounded at **300 s**, exit **124**, also before reporting tests (`/tmp/2000-units-threads.log`). Therefore the aggregate local gates are **not** claimed green. This startup stall was also recorded in the earlier triage notes; the inspected hosted run's unit job passes. No unit assertion failure was observed, and no runtime/unit-runner configuration was changed to hide the limitation.
- **VISUAL QA:** inspected fresh photo-mode and Journal Photos screenshots: a visible Titanic/bow scene and a rendered saved thumbnail, not a black canvas. The inherited `.cache/codex/shots` symlink points outside this writable worktree; replaced only that local untracked symlink with a local directory before capture. The first baseline attempt stopped on that path's EROFS; the subsequent unmodified baseline passed **2/2** (`/tmp/2000-dphoto-before.log`). This does not reproduce the hosted toast race locally; the fix follows the hosted null-box evidence and timer source.
- **RELEASE:** final `gh run list` still shows **38682281312** as the newest completed CI and **38697281304** queued. Hosted green for these repairs is unverified. No tag, push, workflow dispatch or rerun was performed. Only `tests/e2e/d-photo.spec.ts` and this progress note changed.
