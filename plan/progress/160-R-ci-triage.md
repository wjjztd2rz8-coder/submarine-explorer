# 160 — R-ci-triage (item 18)

Audit snapshot: 2026-11-09, starting at 07:09 UTC. These are the latest eight `ci.yml` runs on `main` at discovery, including queued/cancelled runs. Reports for the active run are a partial snapshot, excluded from complete-run rates. Checkout: `f526a2c5`. This is evidence for the existing Director item, not a second work queue.

## Hosted evidence

`gh run view <id> --log` returned only the project-base log for 42567675781 and no log text for the other completed runs. The pending/active runs explicitly report that logs are not yet available. Empty output is not a passing result. Direct `gh api repos/wjjztd2rz8-coder/submarine-explorer/actions/runs/<id>/logs` ZIP downloads recovered browser logs: 441 archive entries for 42567675781, 90 each for 42555465639 and 42565938834. Run 42545964908 returned only two archive entries, the three cancelled/queued runs returned empty archives, and the active run returned HTTP 404. The recovered shard-10 log confirms both tutorial-copy failures and the catalog tutorial timeout. Recovered **172 JSON timing artifacts** through `gh api`: 38 for each of four fully reported runs, plus 20 for the active run. Artifacts were not expired. Every report includes its exact Playwright argv, per-attempt result, duration and failure stack. Raw metadata, reports, extracted cases and logs are retained locally under `.cache/ci-triage/`.

| Run                                                                                            | Snapshot status     | Reports | Passed / failed / skipped cases | Failed e2e jobs | Elapsed / admitted span    |
| ---------------------------------------------------------------------------------------------- | ------------------- | ------: | ------------------------------- | --------------: | -------------------------- |
| [42577459675](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/42577459675) | pending             |       0 | 0 / 0 / 0                       |               0 | partial / no completed run |
| [42577452027](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/42577452027) | completed cancelled |       0 | 0 / 0 / 0                       |               0 | partial / no completed run |
| [42574507701](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/42574507701) | in_progress         |      20 | 490 / 21 / 50                   |              13 | partial / no completed run |
| [42567675781](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/42567675781) | completed failure   |      38 | 941 / 35 / 92                   |              22 | 66.98 / 42.37 min          |
| [42566262692](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/42566262692) | completed cancelled |       0 | 0 / 0 / 0                       |               0 | partial / no completed run |
| [42565938834](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/42565938834) | completed success   |      38 | 985 / 0 / 83                    |               0 | 42.37 / 42.32 min          |
| [42555465639](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/42555465639) | completed failure   |      38 | 982 / 3 / 83                    |               3 | 45.20 / 44.93 min          |
| [42545964908](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/42545964908) | completed failure   |      38 | 984 / 1 / 83                    |               1 | 105.55 / 65.18 min         |

The four complete report sets each discover **1,068 cases**. Their failed-case count is 39 across 4,272 discovered cases, or **39/3,931 executed cases (0.99%)**. There are no retries in the reports. Skipped rows are excluded from executed denominators; a suite deadline can leave rows unexecuted, so they are not evidence of coverage completing. Run 42567675781 has suite-level **1,500 s deadline errors on shards 9, 18 and 31**; the partial active run has them on shards 3, 4 and 31. These are separate from individual failed-case counts. The three cancelled/queued snapshots have no e2e evidence.

Metadata/artifact recovery commands (replace IDs from the preceding response):

```bash
gh run list --branch main --workflow ci.yml --limit 8 --json databaseId,headSha,status,conclusion,createdAt,updatedAt,url
gh run view 42567675781 --log
gh api --paginate 'repos/wjjztd2rz8-coder/submarine-explorer/actions/runs/42567675781/jobs?per_page=100'
gh api repos/wjjztd2rz8-coder/submarine-explorer/actions/runs/42567675781/logs > /tmp/ci-logs.zip
gh api --paginate 'repos/wjjztd2rz8-coder/submarine-explorer/actions/runs/42567675781/artifacts?per_page=100'
gh api repos/wjjztd2rz8-coder/submarine-explorer/actions/artifacts/13653483213/zip > /tmp/shard-10.zip
```

## Which specs fail, and how often

Counts below are failed / executed cases within each spec; different commits are not interchangeable samples of flakiness. Completed runs are listed newest first. Active-run counts are lower bounds.

| Spec                    | 42567675781 | 42565938834 | 42555465639 | 42545964908 | Active 42574507701 | Diagnosis                                                                                                                                          |
| ----------------------- | ----------: | ----------: | ----------: | ----------: | -----------------: | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `f-bughunt-960.spec.ts` |       16/24 |        0/24 |        0/24 |        0/24 |              10/16 | Real stale expectation: depth coaching correctly auto-skips; all failures demand depth copy on the scan step. Locally reproduced.                  |
| `hud-touch.spec.ts`     |      15/184 |       0/184 |       0/184 |       0/184 |              9/106 | Real stale step prediction after moving back to a contact; a skipped depth step never becomes visible. 22 test deadlines and 2 assertion failures. |
| `f-verify-1000.spec.ts` |        4/25 |        0/25 |        0/25 |        0/25 |               1/10 | Real stale 50 m travel floor: shorter scan holds finish at 46.9709 m. Safety and approach checks still apply.                                      |
| `f-bughunt-880.spec.ts` |        0/10 |        0/10 |        3/10 |        1/10 |                1/4 | Timing race: Journal rows detach when catalogue loads; the later click-retry patch passes one run but still fails the active run.                  |

The history confirms the change boundary: commit [`dd234849`](https://github.com/wjjztd2rz8-coder/submarine-explorer/commit/dd2348491cd8b4fffdc9432209a9ce1807b921dd) raises depth skip from 15 to 30 m and cuts scan hold times by 40% (the Monterey wall hold changes from 3 to 1.8 s). `git merge-base --is-ancestor` confirms it is present in 42567675781 and active 42574507701, and absent from all three earlier fully reported runs. That matches the deterministic tutorial/transit failure boundary.

A passing run on a different SHA does not make the tutorial or transit mismatches flakes. The Journal errors explicitly report detached DOM and asynchronous publication; the fix waits for the existing load promise instead of retrying clicks. No player-facing failure is established by these four spec patterns.

## Changes and simplicity

- Read the running tutorial step through the existing `__game.onboard` hook. Delete the spec-side next-objective/depth-threshold predictor and the 20 × 500 ms frame loop. A bounded state wait accepts either the visible depth card or its real completion after returning to a contact; the remembered early scan must still persist completion across reload.
- Preserve exact device copy assertions for the step actually running, including keyboard/touch transitions, scan reach gating, Journal, debrief and saved settings.
- Await `journal.load()` before clicking its entry. Remove the click retry and redundant explicit scrolling; Playwright handles scrolling.
- Replace the fixed travel floor with the geometric distance needed to enter the initial scan envelope, and assert that the opening starts outside it. Retain real held-input scanning, the two-minute simulated budget, the 300 m upper bound, collision clearance and Journal/debrief assertions. The former 50 m floor became invalid when scan holds were shortened.

This removes a duplicate tutorial decision model and a retry loop. Existing capability/helper surfaces own the changes. No new spec, skip, retry, timeout increase, setting, per-site branch, guidance surface, source/UI/style/art change or layout patch is introduced. Existing package-named specs are extended in place, and new comments describe behavior rather than package history. Cuts are recorded in CHANGELOG.md.

## One proposal to get hosted CI below 30 minutes

**Reserve 40 concurrent hosted runner slots for this CI workflow, retaining the existing 38 shards.** This is a capacity proposal only; no account setting or workflow was changed. The runner timeline reaches exactly 20 concurrent jobs on every fully reported run. The latest complete run spends **635.67 test-minutes**, an absolute lower bound of **31.78 minutes at 20 slots**, even before setup and static work. Shared immutable root/project-base builds already exist and finish in 12–23 seconds on these runs, so adding a shared build again cannot solve the bottleneck. Increasing shard count alone also cannot beat that work bound.

Replay model: keep every observed job duration, start the three static shards and two builds at t=0 when slots permit, release all 38 browser shards and project-base after both builds, and schedule consumers in observed start order on the next free slot. Exclude external queueing, overlapping workflows, the one-second aggregate status job and any post-fix speedup. Include all measured job setup/upload time, failures and deadline costs.

| Run                                                                                            | Observed after first admission | Model: 20 slots | Model: 40 slots | Modeled saving |
| ---------------------------------------------------------------------------------------------- | -----------------------------: | --------------: | --------------: | -------------: |
| [42567675781](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/42567675781) |                      42.37 min |       42.27 min |       25.67 min |      16.60 min |
| [42565938834](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/42565938834) |                      42.32 min |       42.18 min |       26.35 min |      15.83 min |
| [42555465639](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/42555465639) |                      44.93 min |       44.80 min |       28.93 min |      15.87 min |
| [42545964908](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/42545964908) |                      65.18 min |       37.83 min |       25.08 min |      12.75 min |

Thus 40 available slots model **25.08–28.93 min** for all four runs, with exactly the same tests, layouts, projects, guards and zero retries. The oldest run has extra scheduling gaps, explaining the model/observed discrepancy. This is not a measured hosted improvement or a guarantee about queued wall time: the cited newest run waited **24.62 min** before first admission, and the oldest waited **40.37 min**. The capacity must be available to this workflow; an account-wide limit of 40 shared with another workflow is insufficient. Validate the proposal with a subsequent hosted run before claiming the target.

## Reproduction and validation

The initial top-failure command reproduced the identical text mismatch in about 1.2 min; after the fix it passed in 17.0 s. All four targeted representatives passed (57.4 s total). The direct command uses the workflow's Chromium project, CI storage/timing configuration, fully parallel selection, one worker, zero retries and 1,500 s suite budget:

```bash
CI=1 GATES_CONFIG_MODE=writable PW_PORT=4260 PW_OUTDIR=dist-ci-triage \
  npx playwright test tests/e2e/f-bughunt-960.spec.ts \
  -g '960 390x844.*titanic arcade high' \
  --fully-parallel --workers=1 --retries=0 --global-timeout=1500000
```

The full shard command below uses the same workflow gate entry point. Its generated grep was compared byte-for-byte with the hosted JSON argv for **shard 10/38** and matched. The project is implicitly `chromium` in both, because that is the sole configured project. No native Playwright `--shard` is used: `tools/e2e-shards.mjs` owns weighted selection.

```bash
CI=1 GATES_CONFIG_MODE=writable PW_PORT=4260 PW_OUTDIR=dist-ci-triage \
PLAYWRIGHT_JSON_OUTPUT_FILE=.cache/ci-triage/local-shard-10.json \
  bash tools/gates.sh --phase e2e --prebuilt -- 10/38 \
  --reporter=list,json,html --global-timeout=1500000 --retries=0
```

- **PASS:** exact workflow shard 10/38: **26 passed, two existing diagnostic skips, 5.0 min**, zero retries. Log: `/tmp/160-shard.log`; JSON: `.cache/ci-triage/local-shard-10.json`. The initial baseline reproduced `Expected: Hold Space to rise or Ctrl to sink.` / `Received: Get closer to scan · 140 m` (`/tmp/160-before.log`).
- **PASS:** four representative fixes, **4/4 in 57.4 s**, using explicit spec paths and `-g` names (`/tmp/160-after.log`).
- **PASS:** final tutorial-loop checks, **6/6 in 38.5 s**, covering desktop/phone/tablet layout, large UI and the last-step handoff (`/tmp/160-tutorial-loops.log`).
- **PASS:** explicit early-scan movement guard, touch plus two keyboard journeys, **3/3 in 45.6 s** (`/tmp/160-early-scan.log`).
- **PASS:** all **70 affected checks in 14.7 min**, zero retries/skips, covering every one of the 40 observed failing identities plus the related tutorial/layout loops (`/tmp/160-affected.log`). The final DOM-transition wait and explicit early-movement assertion were separately checked by the 6- and 3-case runs above.
- **PASS:** tools/gates.sh (smoke + project-base) on the branch, run by the orchestrator 2026-11-09.
- **PASS:** existing onboarding progression/reload and held/interrupted scan coaching, **2/2 in 20.4 s**, selected by capability search under `tests/e2e` (`/tmp/160-coaching.log`). Capability search results are retained in `.cache/ci-triage/capability-specs.txt` and `capability-grep.txt`.
- **PASS:** TypeScript and evidence inventory checks: all 172 observed shard tables and all 40 failure identities are present. Fresh assisted-scan screenshot inspected: rendered wreck, submarine and seafloor, with scan result; no black canvas.
- A full local 1,068-case suite or a new hosted run of this patch is not claimed. The exact hosted shard plus focused capability checks and the default local gate are the validation scope.

Initial local full-shard output failed to write screenshots because `.cache/codex/shots` was a symlink to a read-only shared checkout. Moved the local symlink aside and created a writable local directory, then restarted the shard. No test/product workaround ships. The default unit pool produced no results and was interrupted; the gate rerun uses the documented validation-only npm wrapper from `plan/progress/f-ci-triage2.md`, adding `--pool=threads --maxWorkers=1 --reporter=verbose` to `npm test` only. Vite uses the existing `GATES_CONFIG_MODE=writable` mode to avoid the shared read-only dependency cache.

## Failure identities

All 40 distinct failed title paths across the four completed report sets and the partial active run. Counts include only reports actually downloaded. P = passed; F = failed/timed out.

| Spec                    | Test title path                                                                                             | Complete runs F/P | Partial active F/P |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------: | -----------------: |
| `f-bughunt-880.spec.ts` | great-blue-hole low: render opening, scan, reload twice and read authored Journal                           |               1/3 |                0/1 |
| `f-bughunt-880.spec.ts` | great-blue-hole medium: render opening, scan, reload twice and read authored Journal                        |               1/3 |                0/0 |
| `f-bughunt-880.spec.ts` | lost-city medium: render opening, scan, reload twice and read authored Journal                              |               1/3 |                0/0 |
| `f-bughunt-880.spec.ts` | monterey-canyon low: render opening, scan, reload twice and read authored Journal                           |               0/4 |                1/0 |
| `f-bughunt-880.spec.ts` | monterey-canyon medium: render opening, scan, reload twice and read authored Journal                        |               1/3 |                0/0 |
| `f-bughunt-960.spec.ts` | 960 390x844 › great-blue-hole arcade high: briefing, assisted scan, Journal, debrief and saves              |               1/3 |                0/0 |
| `f-bughunt-960.spec.ts` | 960 390x844 › great-blue-hole arcade low: briefing, assisted scan, Journal, debrief and saves               |               1/3 |                0/0 |
| `f-bughunt-960.spec.ts` | 960 390x844 › great-blue-hole realistic high: briefing, assisted scan, Journal, debrief and saves           |               1/3 |                1/0 |
| `f-bughunt-960.spec.ts` | 960 390x844 › great-blue-hole realistic low: briefing, assisted scan, Journal, debrief and saves            |               1/3 |                0/0 |
| `f-bughunt-960.spec.ts` | 960 390x844 › titanic arcade high: briefing, assisted scan, Journal, debrief and saves                      |               1/3 |                1/0 |
| `f-bughunt-960.spec.ts` | 960 390x844 › titanic arcade low: briefing, assisted scan, Journal, debrief and saves                       |               1/3 |                0/0 |
| `f-bughunt-960.spec.ts` | 960 390x844 › titanic realistic high: briefing, assisted scan, Journal, debrief and saves                   |               1/3 |                1/0 |
| `f-bughunt-960.spec.ts` | 960 390x844 › titanic realistic low: briefing, assisted scan, Journal, debrief and saves                    |               1/3 |                0/0 |
| `f-bughunt-960.spec.ts` | 960 844x390 › great-blue-hole arcade high: briefing, assisted scan, Journal, debrief and saves              |               1/3 |                1/0 |
| `f-bughunt-960.spec.ts` | 960 844x390 › great-blue-hole arcade low: briefing, assisted scan, Journal, debrief and saves               |               1/3 |                1/0 |
| `f-bughunt-960.spec.ts` | 960 844x390 › great-blue-hole realistic high: briefing, assisted scan, Journal, debrief and saves           |               1/3 |                1/0 |
| `f-bughunt-960.spec.ts` | 960 844x390 › great-blue-hole realistic low: briefing, assisted scan, Journal, debrief and saves            |               1/3 |                1/0 |
| `f-bughunt-960.spec.ts` | 960 844x390 › titanic arcade high: briefing, assisted scan, Journal, debrief and saves                      |               1/3 |                1/0 |
| `f-bughunt-960.spec.ts` | 960 844x390 › titanic arcade low: briefing, assisted scan, Journal, debrief and saves                       |               1/3 |                1/0 |
| `f-bughunt-960.spec.ts` | 960 844x390 › titanic realistic high: briefing, assisted scan, Journal, debrief and saves                   |               1/3 |                0/0 |
| `f-bughunt-960.spec.ts` | 960 844x390 › titanic realistic low: briefing, assisted scan, Journal, debrief and saves                    |               1/3 |                1/0 |
| `f-verify-1000.spec.ts` | 1000 1600x900 › monterey-canyon low: approach, first scan, Journal and debrief                              |               1/3 |                0/0 |
| `f-verify-1000.spec.ts` | 1000 1600x900 › monterey-canyon medium: approach, first scan, Journal and debrief                           |               1/3 |                0/0 |
| `f-verify-1000.spec.ts` | 1000 390x844 › monterey-canyon low: approach, first scan, Journal and debrief                               |               1/3 |                0/0 |
| `f-verify-1000.spec.ts` | 1000 390x844 › monterey-canyon medium: approach, first scan, Journal and debrief                            |               1/3 |                1/0 |
| `hud-touch.spec.ts`     | catalog tutorial and reload › 1024x768-touch › beebe-vent-field: tutorial, contact, reward, chip and reload |               1/3 |                0/0 |
| `hud-touch.spec.ts`     | catalog tutorial and reload › 1024x768-touch › challenger-deep: tutorial, contact, reward, chip and reload  |               1/3 |                0/0 |
| `hud-touch.spec.ts`     | catalog tutorial and reload › 1024x768-touch › titanic: tutorial, contact, reward, chip and reload          |               1/3 |                1/0 |
| `hud-touch.spec.ts`     | catalog tutorial and reload › 1280x720-touch › beebe-vent-field: tutorial, contact, reward, chip and reload |               1/3 |                0/0 |
| `hud-touch.spec.ts`     | catalog tutorial and reload › 1280x720-touch › challenger-deep: tutorial, contact, reward, chip and reload  |               1/3 |                1/0 |
| `hud-touch.spec.ts`     | catalog tutorial and reload › 1280x720-touch › titanic: tutorial, contact, reward, chip and reload          |               1/3 |                1/0 |
| `hud-touch.spec.ts`     | catalog tutorial and reload › 390x844-touch › beebe-vent-field: tutorial, contact, reward, chip and reload  |               1/3 |                1/0 |
| `hud-touch.spec.ts`     | catalog tutorial and reload › 390x844-touch › challenger-deep: tutorial, contact, reward, chip and reload   |               1/3 |                1/0 |
| `hud-touch.spec.ts`     | catalog tutorial and reload › 390x844-touch › titanic: tutorial, contact, reward, chip and reload           |               1/3 |                0/0 |
| `hud-touch.spec.ts`     | catalog tutorial and reload › 667x375-touch › beebe-vent-field: tutorial, contact, reward, chip and reload  |               1/3 |                0/0 |
| `hud-touch.spec.ts`     | catalog tutorial and reload › 667x375-touch › challenger-deep: tutorial, contact, reward, chip and reload   |               1/3 |                1/0 |
| `hud-touch.spec.ts`     | catalog tutorial and reload › 667x375-touch › titanic: tutorial, contact, reward, chip and reload           |               1/3 |                0/0 |
| `hud-touch.spec.ts`     | catalog tutorial and reload › 844x390-touch › beebe-vent-field: tutorial, contact, reward, chip and reload  |               1/3 |                1/0 |
| `hud-touch.spec.ts`     | catalog tutorial and reload › 844x390-touch › challenger-deep: tutorial, contact, reward, chip and reload   |               1/3 |                1/0 |
| `hud-touch.spec.ts`     | catalog tutorial and reload › 844x390-touch › titanic: tutorial, contact, reward, chip and reload           |               1/3 |                1/0 |

## Slowest 15 specs per observed shard

Each table ranks **distinct spec files by summed attempt duration in that shard**, including failed/time-out costs. Durations are seconds, not averages or whole-suite wall time. Cases are grouped by `spec.file` from the JSON reporter (the helper source location when a test is declared in a helper). Fewer than 15 rows means that shard executed fewer than 15 distinct specs; no fabricated/zero-cost rows are added. Skips contribute no executed case duration. All **172 observed shards** follow, with no timing inference for the three snapshots without reports.

### Run [42574507701](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/42574507701) — partial snapshot

#### Shard 2/38

| Rank | Spec                      | Seconds | Executed / failed cases |
| ---: | ------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`       | 267.589 |                   5 / 0 |
|    2 | `phone-accept.spec.ts`    | 178.352 |                   2 / 0 |
|    3 | `journal-debrief.spec.ts` |  67.102 |                   3 / 0 |
|    4 | `f-events-reform.spec.ts` |  44.949 |                   2 / 0 |
|    5 | `f1-ocean.spec.ts`        |  40.565 |                   1 / 0 |
|    6 | `opening-framing.spec.ts` |  35.981 |                   3 / 0 |
|    7 | `f-bughunt-18.spec.ts`    |  32.775 |                   1 / 0 |
|    8 | `f-perf-budget.spec.ts`   |  32.614 |                   1 / 0 |
|    9 | `globe-pins.spec.ts`      |  31.988 |                   1 / 0 |
|   10 | `props.spec.ts`           |  31.281 |                   1 / 0 |
|   11 | `settings.spec.ts`        |  16.713 |                   2 / 0 |
|   12 | `f-title-layout.spec.ts`  |  16.101 |                   1 / 0 |
|   13 | `f-title-scene.spec.ts`   |  12.264 |                   1 / 0 |
|   14 | `f-a11y.spec.ts`          |   8.100 |                   1 / 0 |

#### Shard 3/38 — suite deadline reached

| Rank | Spec                                     | Seconds | Executed / failed cases |
| ---: | ---------------------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`                      | 449.897 |                   7 / 1 |
|    2 | `phone-accept.spec.ts`                   | 263.264 |                   2 / 0 |
|    3 | `d2-predive.spec.ts`                     | 183.355 |                   1 / 0 |
|    4 | `opening-framing.spec.ts`                | 151.625 |                   6 / 0 |
|    5 | `props.spec.ts`                          | 125.854 |                   1 / 0 |
|    6 | `f-bughunt-960.spec.ts`                  |  91.614 |                   1 / 0 |
|    7 | `f2-life.spec.ts`                        |  64.556 |                   1 / 0 |
|    8 | `f2-modes.spec.ts`                       |  63.697 |                   1 / 0 |
|    9 | `f-perf-budget.spec.ts`                  |  37.016 |                   1 / 0 |
|   10 | `f-events-reform.spec.ts`                |  32.149 |                   1 / 0 |
|   11 | `journal-debrief.spec.ts`                |  16.467 |                   1 / 0 |
|   12 | `f2-explore.spec.ts`                     |   7.426 |                   1 / 0 |
|   13 | `f-verify-lander-firstdisc-1240.spec.ts` |   5.465 |                   1 / 0 |

#### Shard 4/38 — suite deadline reached

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `phone-accept.spec.ts`       | 461.532 |                   1 / 0 |
|    2 | `f-fidelity-rollout.spec.ts` | 222.147 |                   1 / 0 |
|    3 | `opening-framing.spec.ts`    | 161.751 |                   7 / 0 |
|    4 | `f-perf-budget.spec.ts`      | 157.617 |                   2 / 0 |
|    5 | `hud-touch.spec.ts`          | 108.237 |                   5 / 0 |
|    6 | `f-title-layout.spec.ts`     |  99.703 |                   1 / 0 |
|    7 | `content-missions.spec.ts`   |  76.833 |                   1 / 0 |
|    8 | `f-bughunt-960.spec.ts`      |  73.394 |                   1 / 1 |
|    9 | `f-text-diet.spec.ts`        |  45.776 |                   1 / 0 |
|   10 | `d-sonar.spec.ts`            |  24.878 |                   1 / 0 |
|   11 | `f2-life.spec.ts`            |  22.804 |                   1 / 0 |
|   12 | `f-verify-1000.spec.ts`      |  14.768 |                   1 / 0 |
|   13 | `settings.spec.ts`           |   7.414 |                   1 / 0 |
|   14 | `f2-explore.spec.ts`         |   7.140 |                   1 / 0 |

#### Shard 6/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `f-fidelity-rollout.spec.ts` | 233.783 |                   2 / 0 |
|    2 | `phone-accept.spec.ts`       | 174.334 |                   1 / 0 |
|    3 | `f3-onboard.spec.ts`         | 159.727 |                   1 / 0 |
|    4 | `hud-touch.spec.ts`          | 105.177 |                   3 / 0 |
|    5 | `opening-framing.spec.ts`    |  96.269 |                   5 / 0 |
|    6 | `content-missions.spec.ts`   |  76.632 |                   1 / 0 |
|    7 | `f-events-reform.spec.ts`    |  56.374 |                   1 / 0 |
|    8 | `d-scan.spec.ts`             |  56.148 |                   1 / 0 |
|    9 | `terrain-render.spec.ts`     |  44.587 |                   1 / 0 |
|   10 | `f1-touch.spec.ts`           |  38.615 |                   1 / 0 |
|   11 | `f-title-layout.spec.ts`     |  35.676 |                   2 / 0 |
|   12 | `f-title-scene.spec.ts`      |  28.379 |                   2 / 0 |
|   13 | `journal-debrief.spec.ts`    |  25.351 |                   1 / 0 |
|   14 | `presets.spec.ts`            |  24.142 |                   1 / 0 |
|   15 | `f-verify-1000.spec.ts`      |  12.032 |                   1 / 0 |

#### Shard 7/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`          | 355.387 |                   5 / 1 |
|    2 | `phone-accept.spec.ts`       | 188.798 |                   1 / 0 |
|    3 | `f-fidelity-rollout.spec.ts` | 185.154 |                   1 / 0 |
|    4 | `opening-framing.spec.ts`    | 143.800 |                   7 / 0 |
|    5 | `settings.spec.ts`           | 135.723 |                   2 / 0 |
|    6 | `f-perf-budget.spec.ts`      |  73.509 |                   1 / 0 |
|    7 | `f-bughunt-880.spec.ts`      |  46.926 |                   1 / 0 |
|    8 | `d-currents.spec.ts`         |  46.878 |                   1 / 0 |
|    9 | `journal-debrief.spec.ts`    |  36.907 |                   2 / 0 |
|   10 | `f-verify-1000.spec.ts`      |  28.536 |                   1 / 0 |
|   11 | `f-events-reform.spec.ts`    |  27.757 |                   1 / 0 |
|   12 | `terrain-render.spec.ts`     |  10.886 |                   1 / 0 |
|   13 | `d-shell.spec.ts`            |   6.530 |                   1 / 0 |
|   14 | `d-modes.spec.ts`            |   3.607 |                   1 / 0 |

#### Shard 9/38

| Rank | Spec                      | Seconds | Executed / failed cases |
| ---: | ------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`       | 283.748 |                   3 / 1 |
|    2 | `f-bughunt-960.spec.ts`   | 114.784 |                   2 / 1 |
|    3 | `phone-accept.spec.ts`    | 109.913 |                   1 / 0 |
|    4 | `sub-playtest.spec.ts`    | 109.053 |                   1 / 0 |
|    5 | `f2-modes.spec.ts`        | 107.839 |                   1 / 0 |
|    6 | `opening-framing.spec.ts` |  80.791 |                   8 / 0 |
|    7 | `d-start.spec.ts`         |  64.872 |                   1 / 0 |
|    8 | `f-content-fix.spec.ts`   |  54.157 |                   1 / 0 |
|    9 | `f-perf-budget.spec.ts`   |  46.365 |                   1 / 0 |
|   10 | `journal-debrief.spec.ts` |  37.014 |                   2 / 0 |
|   11 | `f2-life.spec.ts`         |  25.668 |                   1 / 0 |
|   12 | `f1-ocean.spec.ts`        |  14.516 |                   1 / 0 |
|   13 | `d-polish.spec.ts`        |  13.107 |                   1 / 0 |
|   14 | `settings.spec.ts`        |   5.588 |                   2 / 0 |

#### Shard 10/38

| Rank | Spec                       | Seconds | Executed / failed cases |
| ---: | -------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`        | 398.645 |                   5 / 1 |
|    2 | `phone-accept.spec.ts`     | 168.840 |                   1 / 0 |
|    3 | `d-polish.spec.ts`         | 145.932 |                   1 / 0 |
|    4 | `f-bughunt-960.spec.ts`    | 143.634 |                   2 / 2 |
|    5 | `opening-framing.spec.ts`  | 120.940 |                   8 / 0 |
|    6 | `content-missions.spec.ts` | 120.008 |                   1 / 0 |
|    7 | `f-events-reform.spec.ts`  |  74.938 |                   2 / 0 |
|    8 | `f-bughunt-880.spec.ts`    |  45.123 |                   1 / 0 |
|    9 | `d-sonar.spec.ts`          |  40.938 |                   1 / 0 |
|   10 | `atmosphere.spec.ts`       |  16.771 |                   1 / 0 |
|   11 | `d2-predive.spec.ts`       |   5.104 |                   1 / 0 |
|   12 | `d-shell.spec.ts`          |   5.082 |                   1 / 0 |
|   13 | `f2-progress.spec.ts`      |   2.817 |                   1 / 0 |

#### Shard 11/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `phone-accept.spec.ts`       | 166.422 |                   1 / 0 |
|    2 | `hud-touch.spec.ts`          | 157.851 |                   6 / 0 |
|    3 | `d2-camera.spec.ts`          | 138.557 |                   1 / 0 |
|    4 | `opening-framing.spec.ts`    | 130.195 |                   6 / 0 |
|    5 | `d-power.spec.ts`            |  87.705 |                   1 / 0 |
|    6 | `terrain-render.spec.ts`     |  75.838 |                   2 / 0 |
|    7 | `f1-fixes.spec.ts`           |  70.512 |                   1 / 0 |
|    8 | `f-title-layout.spec.ts`     |  43.565 |                   1 / 0 |
|    9 | `mission.spec.ts`            |  34.780 |                   1 / 0 |
|   10 | `f-first-minute-620.spec.ts` |  31.520 |                   2 / 0 |
|   11 | `journal-debrief.spec.ts`    |  15.280 |                   1 / 0 |
|   12 | `f-title-scene.spec.ts`      |  10.710 |                   1 / 0 |
|   13 | `settings.spec.ts`           |   8.279 |                   1 / 0 |
|   14 | `f-bughunt-18.spec.ts`       |   5.720 |                   1 / 0 |

#### Shard 14/38

| Rank | Spec                      | Seconds | Executed / failed cases |
| ---: | ------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`       | 176.162 |                   4 / 0 |
|    2 | `opening-framing.spec.ts` | 175.336 |                   8 / 0 |
|    3 | `f2-life.spec.ts`         |  36.211 |                   1 / 0 |
|    4 | `f1-ocean.spec.ts`        |  31.833 |                   1 / 0 |
|    5 | `f-copy-regress.spec.ts`  |  28.023 |                   1 / 0 |
|    6 | `f-bughunt-18.spec.ts`    |  18.634 |                   1 / 0 |
|    7 | `presets.spec.ts`         |  12.005 |                   1 / 0 |
|    8 | `f-verify-1000.spec.ts`   |  11.287 |                   1 / 0 |
|    9 | `d-sonar.spec.ts`         |  11.205 |                   1 / 0 |
|   10 | `journal-debrief.spec.ts` |   6.480 |                   1 / 0 |
|   11 | `sub-playtest.spec.ts`    |   5.100 |                   1 / 0 |
|   12 | `f-title-layout.spec.ts`  |   3.701 |                   1 / 0 |
|   13 | `globe-pins.spec.ts`      |   3.390 |                   1 / 0 |
|   14 | `settings.spec.ts`        |   3.202 |                   1 / 0 |
|   15 | `d-shell.spec.ts`         |   3.030 |                   1 / 0 |

#### Shard 15/38

| Rank | Spec                       | Seconds | Executed / failed cases |
| ---: | -------------------------- | ------: | ----------------------: |
|    1 | `journal-debrief.spec.ts`  | 177.666 |                   2 / 0 |
|    2 | `phone-accept.spec.ts`     | 151.776 |                   1 / 0 |
|    3 | `f-bughunt-960.spec.ts`    | 121.715 |                   2 / 1 |
|    4 | `terrain-render.spec.ts`   | 121.581 |                   2 / 0 |
|    5 | `opening-framing.spec.ts`  |  95.812 |                   7 / 0 |
|    6 | `globe.spec.ts`            |  75.118 |                   1 / 0 |
|    7 | `content-missions.spec.ts` |  69.573 |                   1 / 0 |
|    8 | `f3-onboard.spec.ts`       |  68.863 |                   1 / 0 |
|    9 | `f1-ocean.spec.ts`         |  64.675 |                   1 / 0 |
|   10 | `f-briefing-900.spec.ts`   |  34.702 |                   1 / 0 |
|   11 | `d2-predive.spec.ts`       |  30.790 |                   1 / 0 |
|   12 | `f-title-scene.spec.ts`    |  16.560 |                   1 / 0 |
|   13 | `f-text-diet.spec.ts`      |  12.246 |                   1 / 0 |
|   14 | `f2-progress.spec.ts`      |   9.746 |                   1 / 0 |
|   15 | `d-scan.spec.ts`           |   6.359 |                   1 / 0 |

#### Shard 17/38

| Rank | Spec                                     | Seconds | Executed / failed cases |
| ---: | ---------------------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`                      | 374.295 |                   5 / 1 |
|    2 | `f-bluehole-1030.spec.ts`                | 268.663 |                   1 / 0 |
|    3 | `opening-framing.spec.ts`                | 194.440 |                   7 / 0 |
|    4 | `phone-accept.spec.ts`                   | 182.185 |                   1 / 0 |
|    5 | `f-bughunt-960.spec.ts`                  | 112.008 |                   2 / 1 |
|    6 | `settings.spec.ts`                       |  93.740 |                   1 / 0 |
|    7 | `f1-ocean.spec.ts`                       |  43.293 |                   1 / 0 |
|    8 | `f-verify-1000.spec.ts`                  |  36.570 |                   1 / 0 |
|    9 | `sub-playtest.spec.ts`                   |  28.475 |                   1 / 0 |
|   10 | `journal-debrief.spec.ts`                |  25.166 |                   1 / 0 |
|   11 | `terrain-render.spec.ts`                 |  24.287 |                   1 / 0 |
|   12 | `globe-pins.spec.ts`                     |   8.930 |                   1 / 0 |
|   13 | `f-verify-lander-firstdisc-1240.spec.ts` |   7.689 |                   1 / 0 |
|   14 | `f-briefing-900.spec.ts`                 |   4.577 |                   1 / 0 |
|   15 | `f-rebrand-bathyline.spec.ts`            |   1.938 |                   1 / 0 |

#### Shard 18/38

| Rank | Spec                      | Seconds | Executed / failed cases |
| ---: | ------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`       | 452.920 |                   6 / 1 |
|    2 | `f1-touch.spec.ts`        | 101.104 |                   1 / 0 |
|    3 | `f-bughunt-960.spec.ts`   |  77.024 |                   1 / 1 |
|    4 | `settings.spec.ts`        |  63.020 |                   2 / 0 |
|    5 | `phone-accept.spec.ts`    |  61.956 |                   1 / 0 |
|    6 | `journal-debrief.spec.ts` |  53.045 |                   2 / 0 |
|    7 | `opening-framing.spec.ts` |  31.888 |                   5 / 0 |
|    8 | `f1-vehicles.spec.ts`     |  24.110 |                   1 / 0 |
|    9 | `f-events-reform.spec.ts` |  15.852 |                   1 / 0 |
|   10 | `f-bughunt-9-pwa.spec.ts` |  11.447 |                   1 / 0 |
|   11 | `f-arcade-access.spec.ts` |  10.526 |                   1 / 0 |
|   12 | `f3-onboard.spec.ts`      |   6.250 |                   1 / 0 |
|   13 | `f-title-scene.spec.ts`   |   6.242 |                   1 / 0 |
|   14 | `globe-pins.spec.ts`      |   3.854 |                   1 / 0 |
|   15 | `d-shell.spec.ts`         |   2.601 |                   1 / 0 |

#### Shard 21/38

| Rank | Spec                                     | Seconds | Executed / failed cases |
| ---: | ---------------------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`                      | 469.166 |                   6 / 1 |
|    2 | `f-fidelity-rollout.spec.ts`             | 134.759 |                   1 / 0 |
|    3 | `presets.spec.ts`                        | 108.372 |                   2 / 0 |
|    4 | `opening-framing.spec.ts`                | 101.189 |                   5 / 0 |
|    5 | `f-bughunt-960.spec.ts`                  |  82.501 |                   1 / 1 |
|    6 | `d-shell.spec.ts`                        |  43.113 |                   1 / 0 |
|    7 | `journal-debrief.spec.ts`                |  38.376 |                   2 / 0 |
|    8 | `d-sonar.spec.ts`                        |  29.853 |                   1 / 0 |
|    9 | `f-title-layout.spec.ts`                 |  22.296 |                   1 / 0 |
|   10 | `f3-audio.spec.ts`                       |  15.477 |                   1 / 0 |
|   11 | `helpers/titleAudit.ts`                  |  11.532 |                   1 / 0 |
|   12 | `f-verify-lander-firstdisc-1240.spec.ts` |  10.989 |                   1 / 0 |
|   13 | `phone-accept.spec.ts`                   |   3.568 |                   1 / 0 |
|   14 | `f-title-scene.spec.ts`                  |   3.232 |                   1 / 0 |
|   15 | `settings.spec.ts`                       |   2.821 |                   1 / 0 |

#### Shard 27/38

| Rank | Spec                      | Seconds | Executed / failed cases |
| ---: | ------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`       | 281.626 |                   6 / 0 |
|    2 | `phone-accept.spec.ts`    | 202.883 |                   1 / 0 |
|    3 | `f3-onboard.spec.ts`      | 109.194 |                   1 / 0 |
|    4 | `opening-framing.spec.ts` |  64.088 |                   4 / 0 |
|    5 | `d-sonar.spec.ts`         |  59.117 |                   1 / 0 |
|    6 | `f2-life.spec.ts`         |  52.506 |                   2 / 0 |
|    7 | `terrain-render.spec.ts`  |  46.694 |                   2 / 0 |
|    8 | `journal-debrief.spec.ts` |  43.799 |                   2 / 0 |
|    9 | `f-perf-budget.spec.ts`   |  41.917 |                   1 / 0 |
|   10 | `f2-progress.spec.ts`     |  28.462 |                   1 / 0 |
|   11 | `f-verify-1000.spec.ts`   |  18.397 |                   1 / 1 |
|   12 | `f-title-scene.spec.ts`   |   8.706 |                   1 / 0 |
|   13 | `globe-pins.spec.ts`      |   4.764 |                   1 / 0 |
|   14 | `f-bughunt-18.spec.ts`    |   4.198 |                   1 / 0 |
|   15 | `f-a11y.spec.ts`          |   2.660 |                   1 / 0 |

#### Shard 29/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`          | 209.198 |                   7 / 0 |
|    2 | `f-bughunt-960.spec.ts`      | 151.240 |                   2 / 2 |
|    3 | `f3-audio.spec.ts`           | 106.322 |                   1 / 0 |
|    4 | `f1-fixes.spec.ts`           |  83.162 |                   1 / 0 |
|    5 | `opening-framing.spec.ts`    |  55.463 |                   5 / 0 |
|    6 | `f-content-fix.spec.ts`      |  54.920 |                   1 / 0 |
|    7 | `terrain-render.spec.ts`     |  43.130 |                   2 / 0 |
|    8 | `f-briefing-900.spec.ts`     |  35.240 |                   1 / 0 |
|    9 | `f-title-layout.spec.ts`     |  15.344 |                   1 / 0 |
|   10 | `f-first-minute-620.spec.ts` |  12.888 |                   1 / 0 |
|   11 | `f-title-scene.spec.ts`      |   9.151 |                   2 / 0 |
|   12 | `f2-explore.spec.ts`         |   9.129 |                   1 / 0 |
|   13 | `phone-accept.spec.ts`       |   3.503 |                   1 / 0 |

#### Shard 30/38

| Rank | Spec                          | Seconds | Executed / failed cases |
| ---: | ----------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`           | 159.554 |                   6 / 0 |
|    2 | `phone-accept.spec.ts`        | 137.359 |                   1 / 0 |
|    3 | `f3-onboard.spec.ts`          | 122.863 |                   2 / 0 |
|    4 | `f1-fixes.spec.ts`            | 110.956 |                   1 / 0 |
|    5 | `terrain-render.spec.ts`      | 108.282 |                   3 / 0 |
|    6 | `opening-framing.spec.ts`     | 106.311 |                   7 / 0 |
|    7 | `f-fidelity-rollout.spec.ts`  |  49.216 |                   1 / 0 |
|    8 | `f-text-diet.spec.ts`         |  19.478 |                   1 / 0 |
|    9 | `f1-ocean.spec.ts`            |  18.987 |                   1 / 0 |
|   10 | `d-sonar.spec.ts`             |  14.602 |                   1 / 0 |
|   11 | `d-shell.spec.ts`             |   4.204 |                   1 / 0 |
|   12 | `f-rebrand-bathyline.spec.ts` |   2.209 |                   1 / 0 |

#### Shard 31/38 — suite deadline reached

| Rank | Spec                                     | Seconds | Executed / failed cases |
| ---: | ---------------------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`                      | 898.980 |                   7 / 2 |
|    2 | `f3-onboard.spec.ts`                     | 215.958 |                   1 / 0 |
|    3 | `journal-debrief.spec.ts`                | 160.236 |                   2 / 0 |
|    4 | `globe.spec.ts`                          |  57.163 |                   1 / 0 |
|    5 | `f-fidelity-rollout.spec.ts`             |  55.665 |                   1 / 0 |
|    6 | `f-events-reform.spec.ts`                |  33.220 |                   1 / 0 |
|    7 | `f-title-scene.spec.ts`                  |  22.858 |                   1 / 0 |
|    8 | `f1-ocean.spec.ts`                       |  21.540 |                   1 / 0 |
|    9 | `f2-explore.spec.ts`                     |  18.553 |                   2 / 0 |
|   10 | `f-verify-lander-firstdisc-1240.spec.ts` |   4.592 |                   1 / 0 |
|   11 | `opening-framing.spec.ts`                |   4.538 |                   1 / 0 |

#### Shard 33/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`          | 212.448 |                   7 / 0 |
|    2 | `phone-accept.spec.ts`       | 139.826 |                   1 / 0 |
|    3 | `opening-framing.spec.ts`    |  97.579 |                   7 / 0 |
|    4 | `f-fidelity-rollout.spec.ts` |  89.438 |                   1 / 0 |
|    5 | `terrain-render.spec.ts`     |  83.941 |                   2 / 0 |
|    6 | `content-missions.spec.ts`   |  47.406 |                   1 / 0 |
|    7 | `smoke.spec.ts`              |  36.885 |                   1 / 0 |
|    8 | `journal-debrief.spec.ts`    |  31.112 |                   1 / 0 |
|    9 | `f-verify-1000.spec.ts`      |  27.081 |                   1 / 0 |
|   10 | `f-copy-regress.spec.ts`     |   8.781 |                   1 / 0 |
|   11 | `d-currents.spec.ts`         |   7.696 |                   1 / 0 |
|   12 | `mission.spec.ts`            |   7.525 |                   1 / 0 |
|   13 | `d-scan.spec.ts`             |   2.263 |                   1 / 0 |

#### Shard 35/38

| Rank | Spec                                     | Seconds | Executed / failed cases |
| ---: | ---------------------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`                      | 333.819 |                   7 / 0 |
|    2 | `f-bughunt-880.spec.ts`                  | 159.565 |                   2 / 1 |
|    3 | `f3-onboard.spec.ts`                     | 151.813 |                   1 / 0 |
|    4 | `d-scan.spec.ts`                         |  79.744 |                   3 / 0 |
|    5 | `opening-framing.spec.ts`                |  74.153 |                   4 / 0 |
|    6 | `f-events-reform.spec.ts`                |  38.413 |                   1 / 0 |
|    7 | `f-bughunt-960.spec.ts`                  |  29.864 |                   1 / 0 |
|    8 | `f-verify-1000.spec.ts`                  |  19.476 |                   1 / 0 |
|    9 | `terrain-render.spec.ts`                 |  17.492 |                   1 / 0 |
|   10 | `f-endurance-1180.spec.ts`               |  10.939 |                   1 / 0 |
|   11 | `sub-playtest.spec.ts`                   |   9.709 |                   1 / 0 |
|   12 | `f-verify-lander-firstdisc-1240.spec.ts` |   6.528 |                   1 / 0 |
|   13 | `phone-accept.spec.ts`                   |   4.377 |                   1 / 0 |
|   14 | `settings.spec.ts`                       |   3.781 |                   1 / 0 |

#### Shard 38/38

| Rank | Spec                          | Seconds | Executed / failed cases |
| ---: | ----------------------------- | ------: | ----------------------: |
|    1 | `f2-explore.spec.ts`          | 168.277 |                   2 / 0 |
|    2 | `hud-touch.spec.ts`           | 137.015 |                   5 / 0 |
|    3 | `f1-fixes.spec.ts`            |  85.282 |                   1 / 0 |
|    4 | `content-missions.spec.ts`    |  59.167 |                   1 / 0 |
|    5 | `f-lowtier-followups.spec.ts` |  40.779 |                   2 / 0 |
|    6 | `opening-framing.spec.ts`     |  37.890 |                   3 / 0 |
|    7 | `f1-touch.spec.ts`            |  37.496 |                   2 / 0 |
|    8 | `f-briefing-900.spec.ts`      |  33.397 |                   1 / 0 |
|    9 | `d-shell.spec.ts`             |  31.129 |                   1 / 0 |
|   10 | `f-bughunt-960.spec.ts`       |  30.897 |                   1 / 0 |
|   11 | `terrain-render.spec.ts`      |  24.613 |                   1 / 0 |
|   12 | `f-verify-1000.spec.ts`       |  14.015 |                   1 / 0 |
|   13 | `phone-accept.spec.ts`        |  12.435 |                   2 / 0 |
|   14 | `f-content-fix.spec.ts`       |   4.985 |                   1 / 0 |
|   15 | `d-scan.spec.ts`              |   4.608 |                   1 / 0 |

### Run [42567675781](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/42567675781)

#### Shard 1/38

| Rank | Spec                      | Seconds | Executed / failed cases |
| ---: | ------------------------- | ------: | ----------------------: |
|    1 | `d-input-hud.spec.ts`     | 198.557 |                   1 / 0 |
|    2 | `hud-touch.spec.ts`       | 183.670 |                   6 / 0 |
|    3 | `opening-framing.spec.ts` | 128.637 |                   6 / 0 |
|    4 | `journal-debrief.spec.ts` |  92.173 |                   2 / 0 |
|    5 | `f-bughunt-880.spec.ts`   |  67.817 |                   1 / 0 |
|    6 | `f3-audio.spec.ts`        |  54.079 |                   1 / 0 |
|    7 | `f-perf-budget.spec.ts`   |  43.436 |                   1 / 0 |
|    8 | `f-briefing-900.spec.ts`  |  39.088 |                   1 / 0 |
|    9 | `terrain-render.spec.ts`  |  31.130 |                   1 / 0 |
|   10 | `mission.spec.ts`         |  12.892 |                   1 / 0 |
|   11 | `phone-accept.spec.ts`    |   9.820 |                   2 / 0 |
|   12 | `settings.spec.ts`        |   7.066 |                   1 / 0 |
|   13 | `f2-progress.spec.ts`     |   6.883 |                   1 / 0 |
|   14 | `f-a11y.spec.ts`          |   4.664 |                   1 / 0 |

#### Shard 2/38

| Rank | Spec                      | Seconds | Executed / failed cases |
| ---: | ------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`       | 263.765 |                   5 / 0 |
|    2 | `phone-accept.spec.ts`    | 176.241 |                   2 / 0 |
|    3 | `journal-debrief.spec.ts` |  64.765 |                   3 / 0 |
|    4 | `f-events-reform.spec.ts` |  45.074 |                   2 / 0 |
|    5 | `f1-ocean.spec.ts`        |  40.329 |                   1 / 0 |
|    6 | `opening-framing.spec.ts` |  34.286 |                   3 / 0 |
|    7 | `f-perf-budget.spec.ts`   |  32.534 |                   1 / 0 |
|    8 | `f-bughunt-18.spec.ts`    |  31.926 |                   1 / 0 |
|    9 | `props.spec.ts`           |  31.137 |                   1 / 0 |
|   10 | `globe-pins.spec.ts`      |  31.003 |                   1 / 0 |
|   11 | `settings.spec.ts`        |  16.068 |                   2 / 0 |
|   12 | `f-title-layout.spec.ts`  |  15.815 |                   1 / 0 |
|   13 | `f-title-scene.spec.ts`   |  13.440 |                   1 / 0 |
|   14 | `f-a11y.spec.ts`          |   8.566 |                   1 / 0 |

#### Shard 3/38

| Rank | Spec                                     | Seconds | Executed / failed cases |
| ---: | ---------------------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`                      | 402.297 |                   7 / 1 |
|    2 | `phone-accept.spec.ts`                   | 207.678 |                   2 / 0 |
|    3 | `d2-predive.spec.ts`                     | 135.974 |                   1 / 0 |
|    4 | `opening-framing.spec.ts`                | 120.526 |                   6 / 0 |
|    5 | `props.spec.ts`                          | 103.299 |                   1 / 0 |
|    6 | `f-bughunt-960.spec.ts`                  |  72.812 |                   1 / 0 |
|    7 | `f2-life.spec.ts`                        |  50.967 |                   1 / 0 |
|    8 | `f2-modes.spec.ts`                       |  49.169 |                   1 / 0 |
|    9 | `f-perf-budget.spec.ts`                  |  30.145 |                   1 / 0 |
|   10 | `f-events-reform.spec.ts`                |  25.701 |                   1 / 0 |
|   11 | `journal-debrief.spec.ts`                |  12.852 |                   1 / 0 |
|   12 | `f2-explore.spec.ts`                     |   6.009 |                   1 / 0 |
|   13 | `f-verify-lander-firstdisc-1240.spec.ts` |   4.451 |                   1 / 0 |
|   14 | `settings.spec.ts`                       |   4.197 |                   1 / 0 |

#### Shard 4/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `phone-accept.spec.ts`       | 238.218 |                   1 / 0 |
|    2 | `f-fidelity-rollout.spec.ts` | 111.856 |                   1 / 0 |
|    3 | `opening-framing.spec.ts`    |  92.082 |                   7 / 0 |
|    4 | `f-perf-budget.spec.ts`      |  79.285 |                   2 / 0 |
|    5 | `f-bughunt-960.spec.ts`      |  66.997 |                   1 / 1 |
|    6 | `hud-touch.spec.ts`          |  56.448 |                   5 / 0 |
|    7 | `f-title-layout.spec.ts`     |  47.540 |                   1 / 0 |
|    8 | `content-missions.spec.ts`   |  38.859 |                   1 / 0 |
|    9 | `sub-playtest.spec.ts`       |  22.420 |                   1 / 0 |
|   10 | `f-text-diet.spec.ts`        |  22.365 |                   1 / 0 |
|   11 | `d-sonar.spec.ts`            |  12.346 |                   1 / 0 |
|   12 | `f2-life.spec.ts`            |  12.089 |                   1 / 0 |
|   13 | `f-verify-1000.spec.ts`      |   8.746 |                   1 / 0 |
|   14 | `settings.spec.ts`           |   4.931 |                   1 / 0 |
|   15 | `f2-explore.spec.ts`         |   3.470 |                   1 / 0 |

#### Shard 5/38

| Rank | Spec                          | Seconds | Executed / failed cases |
| ---: | ----------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`           | 281.786 |                   4 / 1 |
|    2 | `f-fidelity-rollout.spec.ts`  | 228.995 |                   1 / 0 |
|    3 | `phone-accept.spec.ts`        | 217.918 |                   1 / 0 |
|    4 | `journal-debrief.spec.ts`     | 171.238 |                   3 / 0 |
|    5 | `f-verify-1000.spec.ts`       |  91.477 |                   2 / 1 |
|    6 | `f-bughunt-960.spec.ts`       |  71.337 |                   1 / 1 |
|    7 | `f-content-fix.spec.ts`       |  69.617 |                   1 / 0 |
|    8 | `opening-framing.spec.ts`     |  63.262 |                   5 / 0 |
|    9 | `terrain-render.spec.ts`      |  58.893 |                   1 / 0 |
|   10 | `d-sonar.spec.ts`             |  39.479 |                   2 / 0 |
|   11 | `presets.spec.ts`             |  25.146 |                   1 / 0 |
|   12 | `f-bluehole-squiggle.spec.ts` |  18.212 |                   1 / 0 |
|   13 | `f-a11y.spec.ts`              |   9.443 |                   1 / 0 |
|   14 | `f2-explore.spec.ts`          |   8.152 |                   1 / 0 |
|   15 | `f2-progress.spec.ts`         |   3.968 |                   1 / 0 |

#### Shard 6/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `f-fidelity-rollout.spec.ts` | 142.327 |                   2 / 0 |
|    2 | `phone-accept.spec.ts`       |  96.931 |                   1 / 0 |
|    3 | `f3-onboard.spec.ts`         |  83.389 |                   1 / 0 |
|    4 | `hud-touch.spec.ts`          |  59.873 |                   3 / 0 |
|    5 | `opening-framing.spec.ts`    |  56.232 |                   5 / 0 |
|    6 | `content-missions.spec.ts`   |  41.982 |                   1 / 0 |
|    7 | `f-events-reform.spec.ts`    |  32.827 |                   1 / 0 |
|    8 | `d-scan.spec.ts`             |  29.994 |                   1 / 0 |
|    9 | `terrain-render.spec.ts`     |  25.739 |                   1 / 0 |
|   10 | `f1-touch.spec.ts`           |  20.287 |                   1 / 0 |
|   11 | `journal-debrief.spec.ts`    |  14.352 |                   1 / 0 |
|   12 | `f-title-layout.spec.ts`     |  14.223 |                   2 / 0 |
|   13 | `presets.spec.ts`            |  13.502 |                   1 / 0 |
|   14 | `f-title-scene.spec.ts`      |   8.369 |                   2 / 0 |
|   15 | `f-verify-1000.spec.ts`      |   7.550 |                   1 / 0 |

#### Shard 7/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`          | 354.290 |                   5 / 1 |
|    2 | `phone-accept.spec.ts`       | 187.185 |                   1 / 0 |
|    3 | `f-fidelity-rollout.spec.ts` | 183.537 |                   1 / 0 |
|    4 | `opening-framing.spec.ts`    | 139.987 |                   7 / 0 |
|    5 | `settings.spec.ts`           | 134.758 |                   2 / 0 |
|    6 | `f-perf-budget.spec.ts`      |  73.142 |                   1 / 0 |
|    7 | `d-currents.spec.ts`         |  48.629 |                   1 / 0 |
|    8 | `f-bughunt-880.spec.ts`      |  46.320 |                   1 / 0 |
|    9 | `journal-debrief.spec.ts`    |  36.239 |                   2 / 0 |
|   10 | `f-events-reform.spec.ts`    |  27.506 |                   1 / 0 |
|   11 | `f-verify-1000.spec.ts`      |  25.702 |                   1 / 0 |
|   12 | `terrain-render.spec.ts`     |  10.711 |                   1 / 0 |
|   13 | `d-shell.spec.ts`            |   6.403 |                   1 / 0 |
|   14 | `d-modes.spec.ts`            |   3.610 |                   1 / 0 |

#### Shard 8/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `f-fidelity-rollout.spec.ts` | 222.790 |                   2 / 0 |
|    2 | `opening-framing.spec.ts`    | 165.004 |                   8 / 0 |
|    3 | `hud-touch.spec.ts`          | 146.978 |                   4 / 0 |
|    4 | `content-missions.spec.ts`   | 106.368 |                   1 / 0 |
|    5 | `f-bughunt-880.spec.ts`      |  86.230 |                   1 / 0 |
|    6 | `globe.spec.ts`              |  69.906 |                   1 / 0 |
|    7 | `d-photo.spec.ts`            |  54.186 |                   1 / 0 |
|    8 | `d-sonar.spec.ts`            |  52.570 |                   1 / 0 |
|    9 | `settings.spec.ts`           |  47.048 |                   2 / 0 |
|   10 | `journal-debrief.spec.ts`    |  28.882 |                   1 / 0 |
|   11 | `f1-touch.spec.ts`           |  26.438 |                   2 / 0 |
|   12 | `f2-explore.spec.ts`         |   8.723 |                   1 / 0 |
|   13 | `phone-accept.spec.ts`       |   5.208 |                   1 / 0 |

#### Shard 9/38 — suite deadline reached

| Rank | Spec                      | Seconds | Executed / failed cases |
| ---: | ------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`       | 311.196 |                   3 / 1 |
|    2 | `f2-modes.spec.ts`        | 180.584 |                   1 / 0 |
|    3 | `phone-accept.spec.ts`    | 176.626 |                   1 / 0 |
|    4 | `f-bughunt-960.spec.ts`   | 143.348 |                   2 / 1 |
|    5 | `opening-framing.spec.ts` | 120.139 |                   8 / 0 |
|    6 | `d-start.spec.ts`         |  99.937 |                   1 / 0 |
|    7 | `f-content-fix.spec.ts`   |  85.308 |                   1 / 0 |
|    8 | `f-perf-budget.spec.ts`   |  74.080 |                   1 / 0 |
|    9 | `journal-debrief.spec.ts` |  56.124 |                   2 / 0 |
|   10 | `f2-life.spec.ts`         |  40.815 |                   1 / 0 |
|   11 | `f1-ocean.spec.ts`        |  20.992 |                   1 / 0 |
|   12 | `d-polish.spec.ts`        |  20.028 |                   1 / 0 |
|   13 | `settings.spec.ts`        |   7.581 |                   2 / 0 |

#### Shard 10/38

| Rank | Spec                       | Seconds | Executed / failed cases |
| ---: | -------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`        | 397.856 |                   5 / 1 |
|    2 | `phone-accept.spec.ts`     | 170.124 |                   1 / 0 |
|    3 | `d-polish.spec.ts`         | 165.422 |                   1 / 0 |
|    4 | `f-bughunt-960.spec.ts`    | 141.068 |                   2 / 2 |
|    5 | `opening-framing.spec.ts`  | 121.121 |                   8 / 0 |
|    6 | `content-missions.spec.ts` | 120.679 |                   1 / 0 |
|    7 | `f-events-reform.spec.ts`  |  75.341 |                   2 / 0 |
|    8 | `f-bughunt-880.spec.ts`    |  45.597 |                   1 / 0 |
|    9 | `d-sonar.spec.ts`          |  40.944 |                   1 / 0 |
|   10 | `atmosphere.spec.ts`       |  17.305 |                   1 / 0 |
|   11 | `d-shell.spec.ts`          |   6.818 |                   1 / 0 |
|   12 | `d2-predive.spec.ts`       |   5.158 |                   1 / 0 |
|   13 | `f2-progress.spec.ts`      |   2.792 |                   1 / 0 |

#### Shard 11/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `phone-accept.spec.ts`       | 184.753 |                   1 / 0 |
|    2 | `hud-touch.spec.ts`          | 176.729 |                   6 / 0 |
|    3 | `d2-camera.spec.ts`          | 150.545 |                   1 / 0 |
|    4 | `opening-framing.spec.ts`    | 147.999 |                   6 / 0 |
|    5 | `d-power.spec.ts`            |  93.171 |                   1 / 0 |
|    6 | `terrain-render.spec.ts`     |  84.077 |                   2 / 0 |
|    7 | `f1-fixes.spec.ts`           |  78.668 |                   1 / 0 |
|    8 | `f-title-layout.spec.ts`     |  48.203 |                   1 / 0 |
|    9 | `mission.spec.ts`            |  38.506 |                   1 / 0 |
|   10 | `f-first-minute-620.spec.ts` |  35.172 |                   2 / 0 |
|   11 | `journal-debrief.spec.ts`    |  17.244 |                   1 / 0 |
|   12 | `f-title-scene.spec.ts`      |  13.348 |                   1 / 0 |
|   13 | `settings.spec.ts`           |   9.353 |                   1 / 0 |
|   14 | `f-bughunt-18.spec.ts`       |   6.500 |                   1 / 0 |

#### Shard 12/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `f-fidelity-rollout.spec.ts` | 173.735 |                   1 / 0 |
|    2 | `f2-explore.spec.ts`         | 131.569 |                   1 / 0 |
|    3 | `opening-framing.spec.ts`    | 120.232 |                   6 / 0 |
|    4 | `d2-hazard.spec.ts`          |  80.521 |                   1 / 0 |
|    5 | `journal-debrief.spec.ts`    |  75.501 |                   2 / 0 |
|    6 | `f-bughunt-960.spec.ts`      |  68.513 |                   1 / 1 |
|    7 | `hud-touch.spec.ts`          |  58.204 |                   2 / 0 |
|    8 | `f-verify-1000.spec.ts`      |  46.523 |                   2 / 1 |
|    9 | `f-bughunt-880.spec.ts`      |  43.541 |                   1 / 0 |
|   10 | `helpers/titleAudit.ts`      |  40.916 |                   1 / 0 |
|   11 | `globe.spec.ts`              |  25.687 |                   1 / 0 |
|   12 | `f-first-minute-620.spec.ts` |  25.393 |                   1 / 0 |
|   13 | `f3-onboard.spec.ts`         |  14.120 |                   1 / 0 |
|   14 | `d-scan.spec.ts`             |   9.907 |                   1 / 0 |
|   15 | `settings.spec.ts`           |   9.381 |                   1 / 0 |

#### Shard 13/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`          | 371.097 |                   6 / 1 |
|    2 | `f-fidelity-rollout.spec.ts` | 124.202 |                   1 / 0 |
|    3 | `phone-accept.spec.ts`       |  89.685 |                   1 / 0 |
|    4 | `f1-touch.spec.ts`           |  89.219 |                   2 / 0 |
|    5 | `f2-life.spec.ts`            |  61.890 |                   1 / 0 |
|    6 | `journal-debrief.spec.ts`    |  55.658 |                   3 / 0 |
|    7 | `opening-framing.spec.ts`    |  25.822 |                   4 / 0 |
|    8 | `f-perf-budget.spec.ts`      |  25.378 |                   1 / 0 |
|    9 | `d-photo.spec.ts`            |  18.073 |                   1 / 0 |
|   10 | `d-sonar.spec.ts`            |  13.359 |                   1 / 0 |
|   11 | `f2-progress.spec.ts`        |   6.273 |                   1 / 0 |
|   12 | `helpers/titleAudit.ts`      |   6.234 |                   1 / 0 |
|   13 | `f-title-scene.spec.ts`      |   5.194 |                   1 / 0 |
|   14 | `f2-modes.spec.ts`           |   4.841 |                   1 / 0 |
|   15 | `d-shell.spec.ts`            |   3.129 |                   1 / 0 |

#### Shard 14/38

| Rank | Spec                      | Seconds | Executed / failed cases |
| ---: | ------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`       | 329.822 |                   4 / 0 |
|    2 | `opening-framing.spec.ts` | 307.228 |                   8 / 0 |
|    3 | `f2-life.spec.ts`         |  62.848 |                   1 / 0 |
|    4 | `f1-ocean.spec.ts`        |  58.371 |                   1 / 0 |
|    5 | `f-copy-regress.spec.ts`  |  57.303 |                   1 / 0 |
|    6 | `f-bughunt-18.spec.ts`    |  29.861 |                   1 / 0 |
|    7 | `presets.spec.ts`         |  22.781 |                   1 / 0 |
|    8 | `d-sonar.spec.ts`         |  22.181 |                   1 / 0 |
|    9 | `f-verify-1000.spec.ts`   |  19.515 |                   1 / 0 |
|   10 | `f-title-layout.spec.ts`  |  19.370 |                   1 / 0 |
|   11 | `sub-playtest.spec.ts`    |  10.000 |                   1 / 0 |
|   12 | `journal-debrief.spec.ts` |   8.958 |                   1 / 0 |
|   13 | `globe-pins.spec.ts`      |   5.718 |                   1 / 0 |
|   14 | `d-shell.spec.ts`         |   4.980 |                   1 / 0 |
|   15 | `settings.spec.ts`        |   4.950 |                   1 / 0 |

#### Shard 15/38

| Rank | Spec                       | Seconds | Executed / failed cases |
| ---: | -------------------------- | ------: | ----------------------: |
|    1 | `journal-debrief.spec.ts`  | 153.265 |                   2 / 0 |
|    2 | `phone-accept.spec.ts`     | 132.677 |                   1 / 0 |
|    3 | `f-bughunt-960.spec.ts`    | 116.716 |                   2 / 1 |
|    4 | `terrain-render.spec.ts`   | 106.201 |                   2 / 0 |
|    5 | `opening-framing.spec.ts`  |  87.753 |                   7 / 0 |
|    6 | `globe.spec.ts`            |  66.725 |                   1 / 0 |
|    7 | `content-missions.spec.ts` |  60.368 |                   1 / 0 |
|    8 | `f3-onboard.spec.ts`       |  59.579 |                   1 / 0 |
|    9 | `f1-ocean.spec.ts`         |  56.139 |                   1 / 0 |
|   10 | `f-briefing-900.spec.ts`   |  29.955 |                   1 / 0 |
|   11 | `d2-predive.spec.ts`       |  26.595 |                   1 / 0 |
|   12 | `f-title-scene.spec.ts`    |  14.330 |                   1 / 0 |
|   13 | `f-text-diet.spec.ts`      |  10.387 |                   1 / 0 |
|   14 | `f2-progress.spec.ts`      |   9.184 |                   1 / 0 |
|   15 | `d-scan.spec.ts`           |   5.765 |                   1 / 0 |

#### Shard 16/38

| Rank | Spec                       | Seconds | Executed / failed cases |
| ---: | -------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`        | 148.054 |                   7 / 0 |
|    2 | `d2-camera.spec.ts`        |  75.689 |                   1 / 0 |
|    3 | `opening-framing.spec.ts`  |  69.243 |                   7 / 0 |
|    4 | `phone-accept.spec.ts`     |  62.874 |                   1 / 0 |
|    5 | `mission.spec.ts`          |  50.983 |                   1 / 0 |
|    6 | `content-missions.spec.ts` |  35.263 |                   1 / 0 |
|    7 | `journal-debrief.spec.ts`  |  25.300 |                   2 / 0 |
|    8 | `helpers/titleAudit.ts`    |  21.390 |                   1 / 0 |
|    9 | `f-text-diet.spec.ts`      |  16.744 |                   1 / 0 |
|   10 | `f-events-reform.spec.ts`  |  14.106 |                   1 / 0 |
|   11 | `settings.spec.ts`         |   5.936 |                   1 / 0 |
|   12 | `f-title-audit.spec.ts`    |   5.184 |                   1 / 0 |
|   13 | `d-scan.spec.ts`           |   2.025 |                   1 / 0 |

#### Shard 17/38

| Rank | Spec                                     | Seconds | Executed / failed cases |
| ---: | ---------------------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`                      | 373.987 |                   5 / 1 |
|    2 | `f-bluehole-1030.spec.ts`                | 260.493 |                   1 / 0 |
|    3 | `opening-framing.spec.ts`                | 193.323 |                   7 / 0 |
|    4 | `phone-accept.spec.ts`                   | 188.759 |                   1 / 0 |
|    5 | `f-bughunt-960.spec.ts`                  | 108.891 |                   2 / 1 |
|    6 | `settings.spec.ts`                       | 100.197 |                   1 / 0 |
|    7 | `f1-ocean.spec.ts`                       |  43.103 |                   1 / 0 |
|    8 | `f-verify-1000.spec.ts`                  |  35.925 |                   1 / 0 |
|    9 | `sub-playtest.spec.ts`                   |  29.554 |                   1 / 0 |
|   10 | `journal-debrief.spec.ts`                |  26.784 |                   1 / 0 |
|   11 | `terrain-render.spec.ts`                 |  26.111 |                   1 / 0 |
|   12 | `globe-pins.spec.ts`                     |   8.951 |                   1 / 0 |
|   13 | `f-verify-lander-firstdisc-1240.spec.ts` |   7.637 |                   1 / 0 |
|   14 | `f-briefing-900.spec.ts`                 |   4.552 |                   1 / 0 |
|   15 | `f-rebrand-bathyline.spec.ts`            |   1.836 |                   1 / 0 |

#### Shard 18/38 — suite deadline reached

| Rank | Spec                      | Seconds | Executed / failed cases |
| ---: | ------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`       | 660.997 |                   6 / 1 |
|    2 | `f1-touch.spec.ts`        | 216.099 |                   1 / 0 |
|    3 | `phone-accept.spec.ts`    | 126.248 |                   1 / 0 |
|    4 | `journal-debrief.spec.ts` | 108.488 |                   2 / 0 |
|    5 | `f-bughunt-960.spec.ts`   |  92.021 |                   1 / 1 |
|    6 | `opening-framing.spec.ts` |  54.382 |                   5 / 0 |
|    7 | `f1-vehicles.spec.ts`     |  50.603 |                   1 / 0 |
|    8 | `f-events-reform.spec.ts` |  30.834 |                   1 / 0 |
|    9 | `f-bughunt-9-pwa.spec.ts` |  23.027 |                   1 / 0 |
|   10 | `f-arcade-access.spec.ts` |  20.194 |                   1 / 0 |
|   11 | `f3-onboard.spec.ts`      |  12.656 |                   1 / 0 |
|   12 | `f-title-scene.spec.ts`   |  11.529 |                   1 / 0 |
|   13 | `settings.spec.ts`        |  11.107 |                   1 / 0 |
|   14 | `globe-pins.spec.ts`      |   7.214 |                   1 / 0 |
|   15 | `d-shell.spec.ts`         |   5.197 |                   1 / 0 |

#### Shard 19/38

| Rank | Spec                      | Seconds | Executed / failed cases |
| ---: | ------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`       | 400.031 |                   4 / 0 |
|    2 | `opening-framing.spec.ts` | 198.812 |                   7 / 0 |
|    3 | `journal-debrief.spec.ts` | 176.547 |                   3 / 0 |
|    4 | `phone-accept.spec.ts`    | 135.698 |                   1 / 0 |
|    5 | `f-bughunt-880.spec.ts`   | 103.478 |                   1 / 0 |
|    6 | `d2-predive.spec.ts`      |  75.445 |                   1 / 0 |
|    7 | `terrain-render.spec.ts`  |  66.109 |                   2 / 0 |
|    8 | `presets.spec.ts`         |  39.041 |                   1 / 0 |
|    9 | `f-title-scene.spec.ts`   |  36.364 |                   1 / 0 |
|   10 | `f3-audio.spec.ts`        |  29.696 |                   1 / 0 |
|   11 | `f-a11y.spec.ts`          |  16.450 |                   1 / 0 |
|   12 | `f2-explore.spec.ts`      |   9.015 |                   1 / 0 |
|   13 | `globe-pins.spec.ts`      |   5.688 |                   1 / 0 |
|   14 | `smoke.spec.ts`           |   4.591 |                   1 / 0 |

#### Shard 20/38

| Rank | Spec                      | Seconds | Executed / failed cases |
| ---: | ------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`       | 276.122 |                   3 / 1 |
|    2 | `f-save-soak.spec.ts`     | 113.706 |                   1 / 0 |
|    3 | `opening-framing.spec.ts` |  72.096 |                   6 / 0 |
|    4 | `presets.spec.ts`         |  60.859 |                   1 / 0 |
|    5 | `phone-accept.spec.ts`    |  60.169 |                   1 / 0 |
|    6 | `f-content-fix.spec.ts`   |  55.065 |                   1 / 0 |
|    7 | `journal-debrief.spec.ts` |  49.798 |                   3 / 0 |
|    8 | `f-bughunt-880.spec.ts`   |  37.997 |                   1 / 0 |
|    9 | `f-verify-1000.spec.ts`   |  30.234 |                   2 / 0 |
|   10 | `f-events-reform.spec.ts` |  16.596 |                   1 / 0 |
|   11 | `d-sonar.spec.ts`         |  15.050 |                   1 / 0 |
|   12 | `f1-ocean.spec.ts`        |  13.912 |                   1 / 0 |
|   13 | `settings.spec.ts`        |   9.923 |                   2 / 0 |
|   14 | `f2-explore.spec.ts`      |   6.817 |                   1 / 0 |
|   15 | `f-a11y.spec.ts`          |   3.777 |                   1 / 0 |

#### Shard 21/38

| Rank | Spec                                     | Seconds | Executed / failed cases |
| ---: | ---------------------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`                      | 352.909 |                   6 / 1 |
|    2 | `f-fidelity-rollout.spec.ts`             |  99.777 |                   1 / 0 |
|    3 | `presets.spec.ts`                        |  83.010 |                   2 / 0 |
|    4 | `f-bughunt-960.spec.ts`                  |  77.246 |                   1 / 1 |
|    5 | `opening-framing.spec.ts`                |  76.482 |                   5 / 0 |
|    6 | `d-shell.spec.ts`                        |  33.849 |                   1 / 0 |
|    7 | `journal-debrief.spec.ts`                |  27.761 |                   2 / 0 |
|    8 | `d-sonar.spec.ts`                        |  23.099 |                   1 / 0 |
|    9 | `f-title-layout.spec.ts`                 |  15.562 |                   1 / 0 |
|   10 | `f3-audio.spec.ts`                       |  10.897 |                   1 / 0 |
|   11 | `helpers/titleAudit.ts`                  |   8.546 |                   1 / 0 |
|   12 | `f-verify-lander-firstdisc-1240.spec.ts` |   7.954 |                   1 / 0 |
|   13 | `settings.spec.ts`                       |   2.919 |                   1 / 0 |
|   14 | `f-title-scene.spec.ts`                  |   2.811 |                   1 / 0 |
|   15 | `phone-accept.spec.ts`                   |   2.635 |                   1 / 0 |

#### Shard 22/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`          | 336.910 |                   5 / 1 |
|    2 | `f-fidelity-rollout.spec.ts` | 139.924 |                   1 / 0 |
|    3 | `f-bughunt-18.spec.ts`       |  89.794 |                   1 / 0 |
|    4 | `journal-debrief.spec.ts`    |  74.134 |                   3 / 0 |
|    5 | `f-bughunt-960.spec.ts`      |  67.536 |                   1 / 1 |
|    6 | `f-content-fix.spec.ts`      |  61.251 |                   1 / 0 |
|    7 | `opening-framing.spec.ts`    |  60.717 |                   4 / 0 |
|    8 | `terrain-render.spec.ts`     |  54.186 |                   1 / 0 |
|    9 | `f-perf-budget.spec.ts`      |  41.479 |                   1 / 0 |
|   10 | `smoke.spec.ts`              |  22.809 |                   1 / 0 |
|   11 | `f3-onboard.spec.ts`         |  21.823 |                   1 / 0 |
|   12 | `f-endurance-1180.spec.ts`   |  14.973 |                   1 / 0 |
|   13 | `f-verify-1000.spec.ts`      |  14.515 |                   1 / 0 |
|   14 | `globe-pins.spec.ts`         |   5.324 |                   1 / 0 |
|   15 | `phone-accept.spec.ts`       |   2.174 |                   1 / 0 |

#### Shard 23/38

| Rank | Spec                                     | Seconds | Executed / failed cases |
| ---: | ---------------------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`                      | 196.431 |                   6 / 0 |
|    2 | `f-fidelity-rollout.spec.ts`             | 122.338 |                   1 / 0 |
|    3 | `content-missions.spec.ts`               |  83.786 |                   1 / 0 |
|    4 | `f-bughunt-960.spec.ts`                  |  48.454 |                   1 / 0 |
|    5 | `terrain-render.spec.ts`                 |  44.646 |                   1 / 0 |
|    6 | `opening-framing.spec.ts`                |  36.628 |                   4 / 0 |
|    7 | `journal-debrief.spec.ts`                |  31.441 |                   3 / 0 |
|    8 | `f-perf-budget.spec.ts`                  |  27.689 |                   1 / 0 |
|    9 | `d2-hazard.spec.ts`                      |  18.693 |                   1 / 0 |
|   10 | `settings.spec.ts`                       |  14.642 |                   1 / 0 |
|   11 | `f-first-minute-620.spec.ts`             |  12.524 |                   1 / 0 |
|   12 | `f-verify-1000.spec.ts`                  |   5.876 |                   1 / 0 |
|   13 | `f-rebrand-bathyline.spec.ts`            |   4.503 |                   1 / 0 |
|   14 | `phone-accept.spec.ts`                   |   4.088 |                   1 / 0 |
|   15 | `f-verify-lander-firstdisc-1240.spec.ts` |   3.740 |                   1 / 0 |

#### Shard 24/38

| Rank | Spec                       | Seconds | Executed / failed cases |
| ---: | -------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`        | 191.679 |                   3 / 0 |
|    2 | `opening-framing.spec.ts`  | 134.080 |                   6 / 0 |
|    3 | `d-start.spec.ts`          | 112.923 |                   1 / 0 |
|    4 | `journal-debrief.spec.ts`  | 101.420 |                   4 / 0 |
|    5 | `mission.spec.ts`          | 100.203 |                   1 / 0 |
|    6 | `f-verify-1000.spec.ts`    |  77.217 |                   2 / 1 |
|    7 | `content-missions.spec.ts` |  70.517 |                   1 / 0 |
|    8 | `presets.spec.ts`          |  21.723 |                   1 / 0 |
|    9 | `f-bughunt-18.spec.ts`     |  20.569 |                   1 / 0 |
|   10 | `phone-accept.spec.ts`     |  16.983 |                   1 / 0 |
|   11 | `d-sonar.spec.ts`          |  16.261 |                   1 / 0 |
|   12 | `f-title-scene.spec.ts`    |  10.380 |                   2 / 0 |
|   13 | `settings.spec.ts`         |   8.772 |                   1 / 0 |
|   14 | `helpers/titleAudit.ts`    |   3.728 |                   1 / 0 |

#### Shard 25/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `phone-accept.spec.ts`       | 172.650 |                   1 / 0 |
|    2 | `hud-touch.spec.ts`          | 157.266 |                   5 / 0 |
|    3 | `settings.spec.ts`           | 149.995 |                   1 / 0 |
|    4 | `opening-framing.spec.ts`    | 127.745 |                   6 / 0 |
|    5 | `f-bughunt-960.spec.ts`      |  94.116 |                   1 / 0 |
|    6 | `content-missions.spec.ts`   |  76.785 |                   1 / 0 |
|    7 | `d-input-hud.spec.ts`        |  57.941 |                   1 / 0 |
|    8 | `f-perf-budget.spec.ts`      |  56.849 |                   1 / 0 |
|    9 | `terrain-render.spec.ts`     |  55.608 |                   2 / 0 |
|   10 | `f-fidelity-rollout.spec.ts` |  42.489 |                   1 / 0 |
|   11 | `f-events-reform.spec.ts`    |  41.964 |                   1 / 0 |
|   12 | `d-sonar.spec.ts`            |  32.576 |                   1 / 0 |
|   13 | `f-verify-1000.spec.ts`      |  29.164 |                   2 / 0 |
|   14 | `f-briefing-900.spec.ts`     |   6.597 |                   1 / 0 |
|   15 | `journal-debrief.spec.ts`    |   3.058 |                   1 / 0 |

#### Shard 26/38

| Rank | Spec                                     | Seconds | Executed / failed cases |
| ---: | ---------------------------------------- | ------: | ----------------------: |
|    1 | `phone-accept.spec.ts`                   | 182.101 |                   1 / 0 |
|    2 | `hud-touch.spec.ts`                      | 167.521 |                   6 / 0 |
|    3 | `f-briefing-900.spec.ts`                 |  63.335 |                   1 / 0 |
|    4 | `opening-framing.spec.ts`                |  58.506 |                   6 / 0 |
|    5 | `d-shell.spec.ts`                        |  40.925 |                   1 / 0 |
|    6 | `journal-debrief.spec.ts`                |  40.412 |                   2 / 0 |
|    7 | `f-content-fix.spec.ts`                  |  31.616 |                   1 / 0 |
|    8 | `f2-life.spec.ts`                        |  21.384 |                   1 / 0 |
|    9 | `f-verify-1000.spec.ts`                  |  11.855 |                   1 / 0 |
|   10 | `sub-playtest.spec.ts`                   |  11.807 |                   1 / 0 |
|   11 | `d2-predive.spec.ts`                     |   7.682 |                   1 / 0 |
|   12 | `f-title-scene.spec.ts`                  |   6.479 |                   1 / 0 |
|   13 | `f-a11y.spec.ts`                         |   6.298 |                   1 / 0 |
|   14 | `f-verify-lander-firstdisc-1240.spec.ts` |   4.032 |                   1 / 0 |
|   15 | `settings.spec.ts`                       |   2.483 |                   1 / 0 |

#### Shard 27/38

| Rank | Spec                      | Seconds | Executed / failed cases |
| ---: | ------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`       | 281.592 |                   6 / 0 |
|    2 | `phone-accept.spec.ts`    | 203.437 |                   1 / 0 |
|    3 | `f3-onboard.spec.ts`      | 109.018 |                   1 / 0 |
|    4 | `opening-framing.spec.ts` |  65.406 |                   4 / 0 |
|    5 | `d-sonar.spec.ts`         |  58.901 |                   1 / 0 |
|    6 | `f2-life.spec.ts`         |  53.056 |                   2 / 0 |
|    7 | `terrain-render.spec.ts`  |  46.646 |                   2 / 0 |
|    8 | `f-perf-budget.spec.ts`   |  42.102 |                   1 / 0 |
|    9 | `journal-debrief.spec.ts` |  41.440 |                   2 / 0 |
|   10 | `f2-progress.spec.ts`     |  28.681 |                   1 / 0 |
|   11 | `f-verify-1000.spec.ts`   |  18.611 |                   1 / 1 |
|   12 | `f-title-scene.spec.ts`   |   8.614 |                   1 / 0 |
|   13 | `globe-pins.spec.ts`      |   4.689 |                   1 / 0 |
|   14 | `f-bughunt-18.spec.ts`    |   4.280 |                   1 / 0 |
|   15 | `f-a11y.spec.ts`          |   2.624 |                   1 / 0 |

#### Shard 28/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `f-fidelity-rollout.spec.ts` | 348.772 |                   2 / 0 |
|    2 | `phone-accept.spec.ts`       | 171.092 |                   1 / 0 |
|    3 | `f-bughunt-960.spec.ts`      | 159.289 |                   2 / 2 |
|    4 | `opening-framing.spec.ts`    | 139.627 |                   7 / 0 |
|    5 | `journal-debrief.spec.ts`    | 107.598 |                   2 / 0 |
|    6 | `f-content-fix.spec.ts`      |  69.669 |                   1 / 0 |
|    7 | `f-perf-budget.spec.ts`      |  45.064 |                   1 / 0 |
|    8 | `f-bughunt-880.spec.ts`      |  44.722 |                   1 / 0 |
|    9 | `d-shell.spec.ts`            |  41.413 |                   1 / 0 |
|   10 | `f-first-minute-620.spec.ts` |  27.183 |                   1 / 0 |
|   11 | `f-events-reform.spec.ts`    |  26.864 |                   1 / 0 |
|   12 | `hud-touch.spec.ts`          |  22.954 |                   2 / 0 |
|   13 | `d-input-hud.spec.ts`        |  14.197 |                   1 / 0 |
|   14 | `f2-explore.spec.ts`         |  10.066 |                   1 / 0 |
|   15 | `f-bughunt-18.spec.ts`       |   6.833 |                   1 / 0 |

#### Shard 29/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `f-bughunt-960.spec.ts`      | 140.953 |                   2 / 2 |
|    2 | `hud-touch.spec.ts`          | 137.495 |                   7 / 0 |
|    3 | `f3-audio.spec.ts`           |  65.520 |                   1 / 0 |
|    4 | `f1-fixes.spec.ts`           |  54.595 |                   1 / 0 |
|    5 | `opening-framing.spec.ts`    |  40.533 |                   5 / 0 |
|    6 | `f-content-fix.spec.ts`      |  37.167 |                   1 / 0 |
|    7 | `terrain-render.spec.ts`     |  31.352 |                   2 / 0 |
|    8 | `f-briefing-900.spec.ts`     |  23.328 |                   1 / 0 |
|    9 | `f-first-minute-620.spec.ts` |   8.326 |                   1 / 0 |
|   10 | `f-title-scene.spec.ts`      |   6.610 |                   2 / 0 |
|   11 | `f2-explore.spec.ts`         |   6.045 |                   1 / 0 |
|   12 | `f-title-layout.spec.ts`     |   4.463 |                   1 / 0 |
|   13 | `phone-accept.spec.ts`       |   2.767 |                   1 / 0 |

#### Shard 30/38

| Rank | Spec                          | Seconds | Executed / failed cases |
| ---: | ----------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`           | 200.417 |                   6 / 0 |
|    2 | `phone-accept.spec.ts`        | 169.819 |                   1 / 0 |
|    3 | `f3-onboard.spec.ts`          | 149.847 |                   2 / 0 |
|    4 | `f1-fixes.spec.ts`            | 136.641 |                   1 / 0 |
|    5 | `terrain-render.spec.ts`      | 130.887 |                   3 / 0 |
|    6 | `opening-framing.spec.ts`     | 128.805 |                   7 / 0 |
|    7 | `f-fidelity-rollout.spec.ts`  |  60.740 |                   1 / 0 |
|    8 | `f1-ocean.spec.ts`            |  23.777 |                   1 / 0 |
|    9 | `f-text-diet.spec.ts`         |  19.392 |                   1 / 0 |
|   10 | `d-sonar.spec.ts`             |  18.458 |                   1 / 0 |
|   11 | `d-shell.spec.ts`             |   5.561 |                   1 / 0 |
|   12 | `f-rebrand-bathyline.spec.ts` |   2.792 |                   1 / 0 |

#### Shard 31/38 — suite deadline reached

| Rank | Spec                                     | Seconds | Executed / failed cases |
| ---: | ---------------------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`                      | 900.555 |                   7 / 2 |
|    2 | `f3-onboard.spec.ts`                     | 207.592 |                   1 / 0 |
|    3 | `journal-debrief.spec.ts`                | 162.394 |                   2 / 0 |
|    4 | `globe.spec.ts`                          |  55.453 |                   1 / 0 |
|    5 | `f-fidelity-rollout.spec.ts`             |  54.923 |                   1 / 0 |
|    6 | `f-events-reform.spec.ts`                |  31.350 |                   1 / 0 |
|    7 | `f-title-scene.spec.ts`                  |  23.305 |                   1 / 0 |
|    8 | `f1-ocean.spec.ts`                       |  21.197 |                   1 / 0 |
|    9 | `f2-explore.spec.ts`                     |  18.154 |                   2 / 0 |
|   10 | `opening-framing.spec.ts`                |   4.774 |                   1 / 0 |
|   11 | `f-verify-lander-firstdisc-1240.spec.ts` |   4.483 |                   1 / 0 |

#### Shard 32/38

| Rank | Spec                       | Seconds | Executed / failed cases |
| ---: | -------------------------- | ------: | ----------------------: |
|    1 | `f-beebe-plumes.spec.ts`   | 207.371 |                   1 / 0 |
|    2 | `d-modes.spec.ts`          | 145.010 |                   1 / 0 |
|    3 | `phone-accept.spec.ts`     | 111.916 |                   1 / 0 |
|    4 | `d-input-hud.spec.ts`      |  96.114 |                   2 / 0 |
|    5 | `opening-framing.spec.ts`  |  84.905 |                   4 / 0 |
|    6 | `props.spec.ts`            |  62.852 |                   1 / 0 |
|    7 | `content-missions.spec.ts` |  59.950 |                   1 / 0 |
|    8 | `helpers/titleAudit.ts`    |  43.842 |                   1 / 0 |
|    9 | `hud-touch.spec.ts`        |  40.531 |                   2 / 0 |
|   10 | `sub-playtest.spec.ts`     |  36.637 |                   1 / 0 |
|   11 | `d-sonar.spec.ts`          |  29.083 |                   1 / 0 |
|   12 | `presets.spec.ts`          |  28.987 |                   1 / 0 |
|   13 | `f-verify-1000.spec.ts`    |  22.806 |                   1 / 0 |
|   14 | `journal-debrief.spec.ts`  |  22.031 |                   1 / 0 |
|   15 | `f2-explore.spec.ts`       |  15.884 |                   2 / 0 |

#### Shard 33/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`          | 347.581 |                   7 / 0 |
|    2 | `phone-accept.spec.ts`       | 223.244 |                   1 / 0 |
|    3 | `f-fidelity-rollout.spec.ts` | 142.453 |                   1 / 0 |
|    4 | `opening-framing.spec.ts`    | 133.698 |                   7 / 0 |
|    5 | `terrain-render.spec.ts`     | 118.596 |                   2 / 0 |
|    6 | `content-missions.spec.ts`   |  75.078 |                   1 / 0 |
|    7 | `smoke.spec.ts`              |  59.915 |                   1 / 0 |
|    8 | `journal-debrief.spec.ts`    |  47.469 |                   1 / 0 |
|    9 | `f-verify-1000.spec.ts`      |  43.289 |                   1 / 0 |
|   10 | `f-copy-regress.spec.ts`     |  13.413 |                   1 / 0 |
|   11 | `mission.spec.ts`            |  11.889 |                   1 / 0 |
|   12 | `d-currents.spec.ts`         |   9.256 |                   1 / 0 |
|   13 | `d-scan.spec.ts`             |   5.599 |                   1 / 0 |

#### Shard 34/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`          | 260.122 |                   3 / 1 |
|    2 | `f-fidelity-rollout.spec.ts` | 132.933 |                   1 / 0 |
|    3 | `phone-accept.spec.ts`       | 125.732 |                   1 / 0 |
|    4 | `f-briefing-900.spec.ts`     | 122.813 |                   1 / 0 |
|    5 | `journal-debrief.spec.ts`    | 114.163 |                   2 / 0 |
|    6 | `f3-onboard.spec.ts`         | 113.052 |                   2 / 0 |
|    7 | `f2-explore.spec.ts`         | 109.430 |                   1 / 0 |
|    8 | `f2-modes.spec.ts`           |  97.503 |                   1 / 0 |
|    9 | `content-missions.spec.ts`   |  78.116 |                   1 / 0 |
|   10 | `opening-framing.spec.ts`    |  66.838 |                   5 / 0 |
|   11 | `terrain-render.spec.ts`     |  65.364 |                   2 / 0 |
|   12 | `f-events-reform.spec.ts`    |  30.655 |                   1 / 0 |
|   13 | `f-endurance-1180.spec.ts`   |  29.559 |                   1 / 0 |
|   14 | `presets.spec.ts`            |  24.367 |                   1 / 0 |
|   15 | `globe-pins.spec.ts`         |   6.544 |                   1 / 0 |

#### Shard 35/38

| Rank | Spec                                     | Seconds | Executed / failed cases |
| ---: | ---------------------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`                      | 336.144 |                   7 / 0 |
|    2 | `f-bughunt-880.spec.ts`                  | 148.789 |                   2 / 0 |
|    3 | `f3-onboard.spec.ts`                     | 144.869 |                   1 / 0 |
|    4 | `d-scan.spec.ts`                         |  80.980 |                   3 / 0 |
|    5 | `opening-framing.spec.ts`                |  73.897 |                   4 / 0 |
|    6 | `f-events-reform.spec.ts`                |  38.607 |                   1 / 0 |
|    7 | `f-bughunt-960.spec.ts`                  |  30.920 |                   1 / 0 |
|    8 | `f-verify-1000.spec.ts`                  |  19.097 |                   1 / 0 |
|    9 | `terrain-render.spec.ts`                 |  17.722 |                   1 / 0 |
|   10 | `f-endurance-1180.spec.ts`               |  10.802 |                   1 / 0 |
|   11 | `sub-playtest.spec.ts`                   |  10.620 |                   1 / 0 |
|   12 | `f-verify-lander-firstdisc-1240.spec.ts` |   6.522 |                   1 / 0 |
|   13 | `phone-accept.spec.ts`                   |   4.374 |                   1 / 0 |
|   14 | `settings.spec.ts`                       |   3.804 |                   1 / 0 |

#### Shard 36/38

| Rank | Spec                          | Seconds | Executed / failed cases |
| ---: | ----------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`           | 157.277 |                   6 / 0 |
|    2 | `f-bughunt-960.spec.ts`       |  73.188 |                   1 / 1 |
|    3 | `opening-framing.spec.ts`     |  70.322 |                   5 / 0 |
|    4 | `phone-accept.spec.ts`        |  63.734 |                   1 / 0 |
|    5 | `f1-touch.spec.ts`            |  58.829 |                   1 / 0 |
|    6 | `d-sonar.spec.ts`             |  56.177 |                   1 / 0 |
|    7 | `mission.spec.ts`             |  42.332 |                   1 / 0 |
|    8 | `journal-debrief.spec.ts`     |  39.465 |                   2 / 0 |
|    9 | `f-arcade-access.spec.ts`     |  17.227 |                   1 / 0 |
|   10 | `f3-audio.spec.ts`            |  16.604 |                   1 / 0 |
|   11 | `f-text-diet.spec.ts`         |  10.382 |                   1 / 0 |
|   12 | `f-title-layout.spec.ts`      |   7.673 |                   1 / 0 |
|   13 | `f-title-scene.spec.ts`       |   4.121 |                   1 / 0 |
|   14 | `d-scan.spec.ts`              |   2.825 |                   1 / 0 |
|   15 | `f-rebrand-bathyline.spec.ts` |   1.424 |                   1 / 0 |

#### Shard 37/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`          | 287.750 |                   4 / 1 |
|    2 | `opening-framing.spec.ts`    | 186.395 |                   7 / 0 |
|    3 | `phone-accept.spec.ts`       |  96.310 |                   1 / 0 |
|    4 | `f2-explore.spec.ts`         |  93.383 |                   1 / 0 |
|    5 | `helpers/titleAudit.ts`      |  86.928 |                   1 / 0 |
|    6 | `f2-life.spec.ts`            |  57.980 |                   2 / 0 |
|    7 | `journal-debrief.spec.ts`    |  42.828 |                   1 / 0 |
|    8 | `f-fidelity-rollout.spec.ts` |  32.153 |                   1 / 0 |
|    9 | `f-events-reform.spec.ts`    |  23.282 |                   1 / 0 |
|   10 | `terrain-render.spec.ts`     |  18.443 |                   1 / 0 |
|   11 | `f2-modes.spec.ts`           |  12.380 |                   2 / 0 |
|   12 | `f-verify-1000.spec.ts`      |  11.695 |                   1 / 0 |
|   13 | `d-shell.spec.ts`            |  10.167 |                   1 / 0 |
|   14 | `d-scan.spec.ts`             |   5.740 |                   1 / 0 |
|   15 | `globe-pins.spec.ts`         |   4.755 |                   1 / 0 |

#### Shard 38/38

| Rank | Spec                          | Seconds | Executed / failed cases |
| ---: | ----------------------------- | ------: | ----------------------: |
|    1 | `f2-explore.spec.ts`          | 114.297 |                   2 / 0 |
|    2 | `hud-touch.spec.ts`           |  94.603 |                   5 / 0 |
|    3 | `f1-fixes.spec.ts`            |  58.362 |                   1 / 0 |
|    4 | `content-missions.spec.ts`    |  39.577 |                   1 / 0 |
|    5 | `opening-framing.spec.ts`     |  30.063 |                   3 / 0 |
|    6 | `f-lowtier-followups.spec.ts` |  27.754 |                   2 / 0 |
|    7 | `f1-touch.spec.ts`            |  24.192 |                   2 / 0 |
|    8 | `f-briefing-900.spec.ts`      |  21.304 |                   1 / 0 |
|    9 | `f-bughunt-960.spec.ts`       |  20.141 |                   1 / 0 |
|   10 | `d-shell.spec.ts`             |  19.970 |                   1 / 0 |
|   11 | `terrain-render.spec.ts`      |  18.381 |                   1 / 0 |
|   12 | `phone-accept.spec.ts`        |   9.450 |                   2 / 0 |
|   13 | `f-verify-1000.spec.ts`       |   9.369 |                   1 / 0 |
|   14 | `f-content-fix.spec.ts`       |   3.495 |                   1 / 0 |
|   15 | `d-scan.spec.ts`              |   3.348 |                   1 / 0 |

### Run [42565938834](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/42565938834)

#### Shard 1/38

| Rank | Spec                      | Seconds | Executed / failed cases |
| ---: | ------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`       | 104.735 |                   6 / 0 |
|    2 | `d-input-hud.spec.ts`     |  93.427 |                   1 / 0 |
|    3 | `opening-framing.spec.ts` |  69.455 |                   6 / 0 |
|    4 | `journal-debrief.spec.ts` |  48.150 |                   2 / 0 |
|    5 | `f-bughunt-880.spec.ts`   |  36.279 |                   1 / 0 |
|    6 | `f3-audio.spec.ts`        |  27.496 |                   1 / 0 |
|    7 | `f-perf-budget.spec.ts`   |  21.414 |                   1 / 0 |
|    8 | `f-briefing-900.spec.ts`  |  18.838 |                   1 / 0 |
|    9 | `terrain-render.spec.ts`  |  16.512 |                   1 / 0 |
|   10 | `mission.spec.ts`         |   5.936 |                   1 / 0 |
|   11 | `phone-accept.spec.ts`    |   5.838 |                   2 / 0 |
|   12 | `settings.spec.ts`        |   4.172 |                   1 / 0 |
|   13 | `f2-progress.spec.ts`     |   3.925 |                   1 / 0 |
|   14 | `f-a11y.spec.ts`          |   2.519 |                   1 / 0 |

#### Shard 2/38

| Rank | Spec                      | Seconds | Executed / failed cases |
| ---: | ------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`       | 374.379 |                   5 / 0 |
|    2 | `phone-accept.spec.ts`    | 248.196 |                   2 / 0 |
|    3 | `journal-debrief.spec.ts` |  81.960 |                   3 / 0 |
|    4 | `f-events-reform.spec.ts` |  56.290 |                   2 / 0 |
|    5 | `f1-ocean.spec.ts`        |  50.590 |                   1 / 0 |
|    6 | `opening-framing.spec.ts` |  42.528 |                   3 / 0 |
|    7 | `f-perf-budget.spec.ts`   |  41.178 |                   1 / 0 |
|    8 | `globe-pins.spec.ts`      |  39.416 |                   1 / 0 |
|    9 | `props.spec.ts`           |  38.851 |                   1 / 0 |
|   10 | `f-bughunt-18.spec.ts`    |  38.642 |                   1 / 0 |
|   11 | `f-title-layout.spec.ts`  |  22.172 |                   1 / 0 |
|   12 | `settings.spec.ts`        |  20.851 |                   2 / 0 |
|   13 | `f-title-scene.spec.ts`   |  20.775 |                   1 / 0 |
|   14 | `f-a11y.spec.ts`          |  12.041 |                   1 / 0 |

#### Shard 3/38

| Rank | Spec                                     | Seconds | Executed / failed cases |
| ---: | ---------------------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`                      | 322.913 |                   7 / 0 |
|    2 | `phone-accept.spec.ts`                   | 275.643 |                   2 / 0 |
|    3 | `d2-predive.spec.ts`                     | 195.904 |                   1 / 0 |
|    4 | `props.spec.ts`                          | 125.966 |                   1 / 0 |
|    5 | `opening-framing.spec.ts`                | 120.096 |                   6 / 0 |
|    6 | `f-bughunt-960.spec.ts`                  |  98.644 |                   1 / 0 |
|    7 | `f2-life.spec.ts`                        |  65.482 |                   1 / 0 |
|    8 | `f2-modes.spec.ts`                       |  64.715 |                   1 / 0 |
|    9 | `f-perf-budget.spec.ts`                  |  37.592 |                   1 / 0 |
|   10 | `f-events-reform.spec.ts`                |  32.482 |                   1 / 0 |
|   11 | `journal-debrief.spec.ts`                |  16.545 |                   1 / 0 |
|   12 | `f2-explore.spec.ts`                     |   7.618 |                   1 / 0 |
|   13 | `f-verify-lander-firstdisc-1240.spec.ts` |   5.644 |                   1 / 0 |
|   14 | `settings.spec.ts`                       |   5.318 |                   1 / 0 |

#### Shard 4/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `phone-accept.spec.ts`       | 249.666 |                   1 / 0 |
|    2 | `f-fidelity-rollout.spec.ts` | 134.149 |                   1 / 0 |
|    3 | `opening-framing.spec.ts`    | 102.083 |                   7 / 0 |
|    4 | `f-perf-budget.spec.ts`      |  91.212 |                   2 / 0 |
|    5 | `hud-touch.spec.ts`          |  63.681 |                   5 / 0 |
|    6 | `f-title-layout.spec.ts`     |  52.312 |                   1 / 0 |
|    7 | `content-missions.spec.ts`   |  45.228 |                   1 / 0 |
|    8 | `f-text-diet.spec.ts`        |  25.524 |                   1 / 0 |
|    9 | `sub-playtest.spec.ts`       |  24.964 |                   1 / 0 |
|   10 | `f-bughunt-960.spec.ts`      |  22.370 |                   1 / 0 |
|   11 | `d-sonar.spec.ts`            |  14.971 |                   1 / 0 |
|   12 | `f2-life.spec.ts`            |  13.845 |                   1 / 0 |
|   13 | `f-verify-1000.spec.ts`      |   9.544 |                   1 / 0 |
|   14 | `settings.spec.ts`           |   5.246 |                   1 / 0 |
|   15 | `f2-explore.spec.ts`         |   3.987 |                   1 / 0 |

#### Shard 5/38

| Rank | Spec                          | Seconds | Executed / failed cases |
| ---: | ----------------------------- | ------: | ----------------------: |
|    1 | `f-fidelity-rollout.spec.ts`  | 189.053 |                   1 / 0 |
|    2 | `phone-accept.spec.ts`        | 185.668 |                   1 / 0 |
|    3 | `journal-debrief.spec.ts`     | 137.663 |                   3 / 0 |
|    4 | `f-verify-1000.spec.ts`       |  87.656 |                   2 / 0 |
|    5 | `hud-touch.spec.ts`           |  62.828 |                   4 / 0 |
|    6 | `f-content-fix.spec.ts`       |  53.739 |                   1 / 0 |
|    7 | `opening-framing.spec.ts`     |  52.014 |                   5 / 0 |
|    8 | `terrain-render.spec.ts`      |  47.455 |                   1 / 0 |
|    9 | `d-sonar.spec.ts`             |  31.492 |                   2 / 0 |
|   10 | `f-bughunt-960.spec.ts`       |  24.965 |                   1 / 0 |
|   11 | `presets.spec.ts`             |  19.760 |                   1 / 0 |
|   12 | `f-bluehole-squiggle.spec.ts` |  14.631 |                   1 / 0 |
|   13 | `f-a11y.spec.ts`              |   6.654 |                   1 / 0 |
|   14 | `f2-explore.spec.ts`          |   5.697 |                   1 / 0 |
|   15 | `f2-progress.spec.ts`         |   3.116 |                   1 / 0 |

#### Shard 6/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `f-fidelity-rollout.spec.ts` | 231.188 |                   2 / 0 |
|    2 | `phone-accept.spec.ts`       | 172.789 |                   1 / 0 |
|    3 | `f3-onboard.spec.ts`         | 162.197 |                   1 / 0 |
|    4 | `hud-touch.spec.ts`          | 102.689 |                   3 / 0 |
|    5 | `opening-framing.spec.ts`    |  94.298 |                   5 / 0 |
|    6 | `content-missions.spec.ts`   |  76.771 |                   1 / 0 |
|    7 | `d-scan.spec.ts`             |  58.978 |                   1 / 0 |
|    8 | `f-events-reform.spec.ts`    |  57.902 |                   1 / 0 |
|    9 | `f1-touch.spec.ts`           |  39.905 |                   1 / 0 |
|   10 | `f-title-layout.spec.ts`     |  34.269 |                   2 / 0 |
|   11 | `terrain-render.spec.ts`     |  27.502 |                   1 / 0 |
|   12 | `f-title-scene.spec.ts`      |  26.996 |                   2 / 0 |
|   13 | `journal-debrief.spec.ts`    |  24.144 |                   1 / 0 |
|   14 | `presets.spec.ts`            |  24.129 |                   1 / 0 |
|   15 | `f-verify-1000.spec.ts`      |  11.786 |                   1 / 0 |

#### Shard 7/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `phone-accept.spec.ts`       | 195.117 |                   1 / 0 |
|    2 | `f-fidelity-rollout.spec.ts` | 184.255 |                   1 / 0 |
|    3 | `hud-touch.spec.ts`          | 165.588 |                   5 / 0 |
|    4 | `opening-framing.spec.ts`    | 142.903 |                   7 / 0 |
|    5 | `settings.spec.ts`           | 135.215 |                   2 / 0 |
|    6 | `f-perf-budget.spec.ts`      |  73.104 |                   1 / 0 |
|    7 | `f-bughunt-880.spec.ts`      |  49.804 |                   1 / 0 |
|    8 | `d-currents.spec.ts`         |  46.827 |                   1 / 0 |
|    9 | `journal-debrief.spec.ts`    |  36.403 |                   2 / 0 |
|   10 | `f-events-reform.spec.ts`    |  27.424 |                   1 / 0 |
|   11 | `f-verify-1000.spec.ts`      |  25.945 |                   1 / 0 |
|   12 | `terrain-render.spec.ts`     |  10.853 |                   1 / 0 |
|   13 | `d-shell.spec.ts`            |   6.530 |                   1 / 0 |
|   14 | `d-modes.spec.ts`            |   3.616 |                   1 / 0 |

#### Shard 8/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `f-fidelity-rollout.spec.ts` | 219.546 |                   2 / 0 |
|    2 | `hud-touch.spec.ts`          | 166.149 |                   4 / 0 |
|    3 | `opening-framing.spec.ts`    | 139.949 |                   8 / 0 |
|    4 | `content-missions.spec.ts`   | 105.937 |                   1 / 0 |
|    5 | `f-bughunt-880.spec.ts`      |  91.885 |                   1 / 0 |
|    6 | `globe.spec.ts`              |  69.530 |                   1 / 0 |
|    7 | `d-photo.spec.ts`            |  53.851 |                   1 / 0 |
|    8 | `d-sonar.spec.ts`            |  51.425 |                   1 / 0 |
|    9 | `settings.spec.ts`           |  45.433 |                   2 / 0 |
|   10 | `journal-debrief.spec.ts`    |  29.625 |                   1 / 0 |
|   11 | `f1-touch.spec.ts`           |  24.579 |                   2 / 0 |
|   12 | `f2-explore.spec.ts`         |   7.667 |                   1 / 0 |
|   13 | `phone-accept.spec.ts`       |   4.598 |                   1 / 0 |

#### Shard 9/38

| Rank | Spec                      | Seconds | Executed / failed cases |
| ---: | ------------------------- | ------: | ----------------------: |
|    1 | `f2-modes.spec.ts`        | 182.506 |                   1 / 0 |
|    2 | `phone-accept.spec.ts`    | 178.720 |                   1 / 0 |
|    3 | `sub-playtest.spec.ts`    | 170.165 |                   1 / 0 |
|    4 | `hud-touch.spec.ts`       | 158.620 |                   3 / 0 |
|    5 | `opening-framing.spec.ts` | 121.724 |                   8 / 0 |
|    6 | `f-bughunt-960.spec.ts`   | 111.919 |                   2 / 0 |
|    7 | `d-start.spec.ts`         |  99.737 |                   1 / 0 |
|    8 | `f-content-fix.spec.ts`   |  85.422 |                   1 / 0 |
|    9 | `f-perf-budget.spec.ts`   |  73.823 |                   1 / 0 |
|   10 | `journal-debrief.spec.ts` |  56.050 |                   2 / 0 |
|   11 | `f2-life.spec.ts`         |  40.456 |                   1 / 0 |
|   12 | `f1-ocean.spec.ts`        |  20.989 |                   1 / 0 |
|   13 | `d-polish.spec.ts`        |  19.650 |                   1 / 0 |
|   14 | `settings.spec.ts`        |   7.624 |                   2 / 0 |

#### Shard 10/38

| Rank | Spec                       | Seconds | Executed / failed cases |
| ---: | -------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`        | 256.308 |                   5 / 0 |
|    2 | `phone-accept.spec.ts`     | 213.959 |                   1 / 0 |
|    3 | `d-polish.spec.ts`         | 181.370 |                   1 / 0 |
|    4 | `content-missions.spec.ts` | 156.727 |                   1 / 0 |
|    5 | `opening-framing.spec.ts`  | 152.857 |                   8 / 0 |
|    6 | `f-events-reform.spec.ts`  |  95.055 |                   2 / 0 |
|    7 | `f-bughunt-960.spec.ts`    |  80.990 |                   2 / 0 |
|    8 | `f-bughunt-880.spec.ts`    |  57.375 |                   1 / 0 |
|    9 | `d-sonar.spec.ts`          |  50.946 |                   1 / 0 |
|   10 | `atmosphere.spec.ts`       |  23.972 |                   1 / 0 |
|   11 | `d-shell.spec.ts`          |   8.521 |                   1 / 0 |
|   12 | `d2-predive.spec.ts`       |   6.536 |                   1 / 0 |
|   13 | `f2-progress.spec.ts`      |   3.512 |                   1 / 0 |

#### Shard 11/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`          | 175.020 |                   6 / 0 |
|    2 | `phone-accept.spec.ts`       | 161.437 |                   1 / 0 |
|    3 | `d2-camera.spec.ts`          | 139.018 |                   1 / 0 |
|    4 | `opening-framing.spec.ts`    | 101.157 |                   6 / 0 |
|    5 | `d-power.spec.ts`            |  83.498 |                   1 / 0 |
|    6 | `f1-fixes.spec.ts`           |  70.546 |                   1 / 0 |
|    7 | `terrain-render.spec.ts`     |  45.764 |                   2 / 0 |
|    8 | `f-title-layout.spec.ts`     |  43.781 |                   1 / 0 |
|    9 | `mission.spec.ts`            |  35.760 |                   1 / 0 |
|   10 | `f-first-minute-620.spec.ts` |  30.075 |                   2 / 0 |
|   11 | `journal-debrief.spec.ts`    |  15.399 |                   1 / 0 |
|   12 | `f-title-scene.spec.ts`      |  10.704 |                   1 / 0 |
|   13 | `settings.spec.ts`           |   8.023 |                   1 / 0 |
|   14 | `f-bughunt-18.spec.ts`       |   5.720 |                   1 / 0 |

#### Shard 12/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `f-fidelity-rollout.spec.ts` | 173.519 |                   1 / 0 |
|    2 | `f2-explore.spec.ts`         | 135.239 |                   1 / 0 |
|    3 | `opening-framing.spec.ts`    | 121.681 |                   6 / 0 |
|    4 | `d2-hazard.spec.ts`          |  83.980 |                   1 / 0 |
|    5 | `journal-debrief.spec.ts`    |  76.623 |                   2 / 0 |
|    6 | `hud-touch.spec.ts`          |  60.960 |                   2 / 0 |
|    7 | `f-verify-1000.spec.ts`      |  56.003 |                   2 / 0 |
|    8 | `f-bughunt-880.spec.ts`      |  44.140 |                   1 / 0 |
|    9 | `helpers/titleAudit.ts`      |  40.380 |                   1 / 0 |
|   10 | `globe.spec.ts`              |  26.407 |                   1 / 0 |
|   11 | `f-first-minute-620.spec.ts` |  25.613 |                   1 / 0 |
|   12 | `f-bughunt-960.spec.ts`      |  21.518 |                   1 / 0 |
|   13 | `f3-onboard.spec.ts`         |  14.922 |                   1 / 0 |
|   14 | `d-scan.spec.ts`             |   9.682 |                   1 / 0 |
|   15 | `settings.spec.ts`           |   8.956 |                   1 / 0 |

#### Shard 13/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`          | 307.285 |                   6 / 0 |
|    2 | `f-fidelity-rollout.spec.ts` | 184.923 |                   1 / 0 |
|    3 | `f1-touch.spec.ts`           | 155.352 |                   2 / 0 |
|    4 | `phone-accept.spec.ts`       | 144.695 |                   1 / 0 |
|    5 | `f2-life.spec.ts`            |  97.960 |                   1 / 0 |
|    6 | `journal-debrief.spec.ts`    |  79.403 |                   3 / 0 |
|    7 | `f-perf-budget.spec.ts`      |  43.809 |                   1 / 0 |
|    8 | `opening-framing.spec.ts`    |  34.949 |                   4 / 0 |
|    9 | `d-photo.spec.ts`            |  28.818 |                   1 / 0 |
|   10 | `d-sonar.spec.ts`            |  20.875 |                   1 / 0 |
|   11 | `helpers/titleAudit.ts`      |  10.703 |                   1 / 0 |
|   12 | `f2-modes.spec.ts`           |  10.326 |                   1 / 0 |
|   13 | `f2-progress.spec.ts`        |  10.210 |                   1 / 0 |
|   14 | `f-title-scene.spec.ts`      |   8.535 |                   1 / 0 |
|   15 | `d-shell.spec.ts`            |   5.128 |                   1 / 0 |

#### Shard 14/38

| Rank | Spec                      | Seconds | Executed / failed cases |
| ---: | ------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`       | 287.561 |                   4 / 0 |
|    2 | `opening-framing.spec.ts` | 241.169 |                   8 / 0 |
|    3 | `f2-life.spec.ts`         |  56.751 |                   1 / 0 |
|    4 | `f1-ocean.spec.ts`        |  52.177 |                   1 / 0 |
|    5 | `f-copy-regress.spec.ts`  |  51.187 |                   1 / 0 |
|    6 | `f-bughunt-18.spec.ts`    |  28.787 |                   1 / 0 |
|    7 | `presets.spec.ts`         |  20.338 |                   1 / 0 |
|    8 | `d-sonar.spec.ts`         |  19.772 |                   1 / 0 |
|    9 | `f-verify-1000.spec.ts`   |  18.936 |                   1 / 0 |
|   10 | `f-title-layout.spec.ts`  |  18.379 |                   1 / 0 |
|   11 | `sub-playtest.spec.ts`    |   9.171 |                   1 / 0 |
|   12 | `journal-debrief.spec.ts` |   9.028 |                   1 / 0 |
|   13 | `globe-pins.spec.ts`      |   5.629 |                   1 / 0 |
|   14 | `d-shell.spec.ts`         |   5.289 |                   1 / 0 |
|   15 | `settings.spec.ts`        |   4.766 |                   1 / 0 |

#### Shard 15/38

| Rank | Spec                       | Seconds | Executed / failed cases |
| ---: | -------------------------- | ------: | ----------------------: |
|    1 | `journal-debrief.spec.ts`  | 143.570 |                   2 / 0 |
|    2 | `phone-accept.spec.ts`     | 120.521 |                   1 / 0 |
|    3 | `terrain-render.spec.ts`   |  88.149 |                   2 / 0 |
|    4 | `f-bughunt-960.spec.ts`    |  84.252 |                   2 / 0 |
|    5 | `opening-framing.spec.ts`  |  80.703 |                   7 / 0 |
|    6 | `globe.spec.ts`            |  61.394 |                   1 / 0 |
|    7 | `content-missions.spec.ts` |  56.253 |                   1 / 0 |
|    8 | `f3-onboard.spec.ts`       |  55.397 |                   1 / 0 |
|    9 | `f1-ocean.spec.ts`         |  50.824 |                   1 / 0 |
|   10 | `f-briefing-900.spec.ts`   |  27.857 |                   1 / 0 |
|   11 | `d2-predive.spec.ts`       |  25.247 |                   1 / 0 |
|   12 | `f-title-scene.spec.ts`    |  13.395 |                   1 / 0 |
|   13 | `f-text-diet.spec.ts`      |   9.771 |                   1 / 0 |
|   14 | `f2-progress.spec.ts`      |   8.153 |                   1 / 0 |
|   15 | `d-scan.spec.ts`           |   5.175 |                   1 / 0 |

#### Shard 16/38

| Rank | Spec                       | Seconds | Executed / failed cases |
| ---: | -------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`        | 325.520 |                   7 / 0 |
|    2 | `d2-camera.spec.ts`        | 156.316 |                   1 / 0 |
|    3 | `opening-framing.spec.ts`  | 127.343 |                   7 / 0 |
|    4 | `phone-accept.spec.ts`     | 124.557 |                   1 / 0 |
|    5 | `mission.spec.ts`          | 107.980 |                   1 / 0 |
|    6 | `content-missions.spec.ts` |  67.539 |                   1 / 0 |
|    7 | `helpers/titleAudit.ts`    |  47.041 |                   1 / 0 |
|    8 | `journal-debrief.spec.ts`  |  44.917 |                   2 / 0 |
|    9 | `f-text-diet.spec.ts`      |  39.484 |                   1 / 0 |
|   10 | `f-events-reform.spec.ts`  |  27.491 |                   1 / 0 |
|   11 | `f-title-audit.spec.ts`    |  11.485 |                   1 / 0 |
|   12 | `settings.spec.ts`         |   8.533 |                   1 / 0 |
|   13 | `d-scan.spec.ts`           |   3.445 |                   1 / 0 |

#### Shard 17/38

| Rank | Spec                                     | Seconds | Executed / failed cases |
| ---: | ---------------------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`                      | 150.622 |                   5 / 0 |
|    2 | `f-bluehole-1030.spec.ts`                | 123.574 |                   1 / 0 |
|    3 | `phone-accept.spec.ts`                   | 105.425 |                   1 / 0 |
|    4 | `opening-framing.spec.ts`                |  87.032 |                   7 / 0 |
|    5 | `settings.spec.ts`                       |  49.956 |                   1 / 0 |
|    6 | `f-bughunt-960.spec.ts`                  |  48.875 |                   2 / 0 |
|    7 | `f1-ocean.spec.ts`                       |  23.075 |                   1 / 0 |
|    8 | `f-verify-1000.spec.ts`                  |  19.630 |                   1 / 0 |
|    9 | `sub-playtest.spec.ts`                   |  16.084 |                   1 / 0 |
|   10 | `terrain-render.spec.ts`                 |  14.011 |                   1 / 0 |
|   11 | `journal-debrief.spec.ts`                |  13.019 |                   1 / 0 |
|   12 | `globe-pins.spec.ts`                     |   4.840 |                   1 / 0 |
|   13 | `f-verify-lander-firstdisc-1240.spec.ts` |   4.557 |                   1 / 0 |
|   14 | `f-briefing-900.spec.ts`                 |   2.315 |                   1 / 0 |
|   15 | `f-rebrand-bathyline.spec.ts`            |   1.155 |                   1 / 0 |

#### Shard 18/38

| Rank | Spec                      | Seconds | Executed / failed cases |
| ---: | ------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`       | 271.832 |                   6 / 0 |
|    2 | `f1-touch.spec.ts`        | 101.764 |                   1 / 0 |
|    3 | `settings.spec.ts`        |  66.578 |                   2 / 0 |
|    4 | `phone-accept.spec.ts`    |  63.914 |                   1 / 0 |
|    5 | `journal-debrief.spec.ts` |  54.154 |                   2 / 0 |
|    6 | `f-bughunt-960.spec.ts`   |  47.610 |                   1 / 0 |
|    7 | `opening-framing.spec.ts` |  32.570 |                   5 / 0 |
|    8 | `f1-vehicles.spec.ts`     |  25.542 |                   1 / 0 |
|    9 | `f-events-reform.spec.ts` |  15.111 |                   1 / 0 |
|   10 | `f-bughunt-9-pwa.spec.ts` |  12.304 |                   1 / 0 |
|   11 | `f-arcade-access.spec.ts` |  10.921 |                   1 / 0 |
|   12 | `f3-onboard.spec.ts`      |   6.529 |                   1 / 0 |
|   13 | `f-title-scene.spec.ts`   |   6.264 |                   1 / 0 |
|   14 | `globe-pins.spec.ts`      |   3.693 |                   1 / 0 |
|   15 | `d-shell.spec.ts`         |   3.106 |                   1 / 0 |

#### Shard 19/38

| Rank | Spec                      | Seconds | Executed / failed cases |
| ---: | ------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`       | 388.517 |                   4 / 0 |
|    2 | `opening-framing.spec.ts` | 195.828 |                   7 / 0 |
|    3 | `journal-debrief.spec.ts` | 179.939 |                   3 / 0 |
|    4 | `phone-accept.spec.ts`    | 134.873 |                   1 / 0 |
|    5 | `f-bughunt-880.spec.ts`   |  98.398 |                   1 / 0 |
|    6 | `d2-predive.spec.ts`      |  76.225 |                   1 / 0 |
|    7 | `terrain-render.spec.ts`  |  48.668 |                   2 / 0 |
|    8 | `presets.spec.ts`         |  38.688 |                   1 / 0 |
|    9 | `f-title-scene.spec.ts`   |  36.196 |                   1 / 0 |
|   10 | `f3-audio.spec.ts`        |  29.547 |                   1 / 0 |
|   11 | `f-a11y.spec.ts`          |  16.452 |                   1 / 0 |
|   12 | `f2-explore.spec.ts`      |   8.930 |                   1 / 0 |
|   13 | `globe-pins.spec.ts`      |   5.675 |                   1 / 0 |
|   14 | `smoke.spec.ts`           |   3.960 |                   1 / 0 |

#### Shard 20/38

| Rank | Spec                      | Seconds | Executed / failed cases |
| ---: | ------------------------- | ------: | ----------------------: |
|    1 | `f-save-soak.spec.ts`     | 143.012 |                   1 / 0 |
|    2 | `hud-touch.spec.ts`       | 106.352 |                   3 / 0 |
|    3 | `opening-framing.spec.ts` |  84.726 |                   6 / 0 |
|    4 | `phone-accept.spec.ts`    |  78.174 |                   1 / 0 |
|    5 | `presets.spec.ts`         |  73.809 |                   1 / 0 |
|    6 | `f-content-fix.spec.ts`   |  67.024 |                   1 / 0 |
|    7 | `journal-debrief.spec.ts` |  64.998 |                   3 / 0 |
|    8 | `f-bughunt-880.spec.ts`   |  44.484 |                   1 / 0 |
|    9 | `f-verify-1000.spec.ts`   |  43.455 |                   2 / 0 |
|   10 | `f-events-reform.spec.ts` |  20.556 |                   1 / 0 |
|   11 | `f1-ocean.spec.ts`        |  18.033 |                   1 / 0 |
|   12 | `d-sonar.spec.ts`         |  17.591 |                   1 / 0 |
|   13 | `settings.spec.ts`        |  12.206 |                   2 / 0 |
|   14 | `f2-explore.spec.ts`      |   8.480 |                   1 / 0 |
|   15 | `f-a11y.spec.ts`          |   4.399 |                   1 / 0 |

#### Shard 21/38

| Rank | Spec                                     | Seconds | Executed / failed cases |
| ---: | ---------------------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`                      | 391.776 |                   6 / 0 |
|    2 | `f-fidelity-rollout.spec.ts`             | 182.098 |                   1 / 0 |
|    3 | `presets.spec.ts`                        | 147.564 |                   2 / 0 |
|    4 | `opening-framing.spec.ts`                | 100.916 |                   5 / 0 |
|    5 | `f-bughunt-960.spec.ts`                  |  83.303 |                   1 / 0 |
|    6 | `d-shell.spec.ts`                        |  56.936 |                   1 / 0 |
|    7 | `journal-debrief.spec.ts`                |  56.735 |                   2 / 0 |
|    8 | `d-sonar.spec.ts`                        |  41.449 |                   1 / 0 |
|    9 | `f-title-layout.spec.ts`                 |  29.352 |                   1 / 0 |
|   10 | `f3-audio.spec.ts`                       |  21.371 |                   1 / 0 |
|   11 | `helpers/titleAudit.ts`                  |  15.116 |                   1 / 0 |
|   12 | `f-verify-lander-firstdisc-1240.spec.ts` |  14.664 |                   1 / 0 |
|   13 | `phone-accept.spec.ts`                   |   4.244 |                   1 / 0 |
|   14 | `f-title-scene.spec.ts`                  |   4.042 |                   1 / 0 |
|   15 | `settings.spec.ts`                       |   3.431 |                   1 / 0 |

#### Shard 22/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`          | 163.960 |                   5 / 0 |
|    2 | `f-fidelity-rollout.spec.ts` | 140.185 |                   1 / 0 |
|    3 | `f-bughunt-18.spec.ts`       |  89.385 |                   1 / 0 |
|    4 | `journal-debrief.spec.ts`    |  77.270 |                   3 / 0 |
|    5 | `opening-framing.spec.ts`    |  60.618 |                   4 / 0 |
|    6 | `f-content-fix.spec.ts`      |  59.927 |                   1 / 0 |
|    7 | `f-perf-budget.spec.ts`      |  41.727 |                   1 / 0 |
|    8 | `terrain-render.spec.ts`     |  30.707 |                   1 / 0 |
|    9 | `smoke.spec.ts`              |  22.799 |                   1 / 0 |
|   10 | `f3-onboard.spec.ts`         |  22.032 |                   1 / 0 |
|   11 | `f-bughunt-960.spec.ts`      |  18.723 |                   1 / 0 |
|   12 | `f-endurance-1180.spec.ts`   |  15.053 |                   1 / 0 |
|   13 | `f-verify-1000.spec.ts`      |  14.513 |                   1 / 0 |
|   14 | `globe-pins.spec.ts`         |   5.274 |                   1 / 0 |
|   15 | `phone-accept.spec.ts`       |   2.145 |                   1 / 0 |

#### Shard 23/38

| Rank | Spec                                     | Seconds | Executed / failed cases |
| ---: | ---------------------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`                      | 314.651 |                   6 / 0 |
|    2 | `f-fidelity-rollout.spec.ts`             | 178.539 |                   1 / 0 |
|    3 | `content-missions.spec.ts`               | 126.946 |                   1 / 0 |
|    4 | `f-bughunt-960.spec.ts`                  |  80.858 |                   1 / 0 |
|    5 | `opening-framing.spec.ts`                |  56.501 |                   4 / 0 |
|    6 | `journal-debrief.spec.ts`                |  52.447 |                   3 / 0 |
|    7 | `terrain-render.spec.ts`                 |  48.216 |                   1 / 0 |
|    8 | `f-perf-budget.spec.ts`                  |  45.776 |                   1 / 0 |
|    9 | `d2-hazard.spec.ts`                      |  30.785 |                   1 / 0 |
|   10 | `settings.spec.ts`                       |  27.287 |                   1 / 0 |
|   11 | `f-first-minute-620.spec.ts`             |  18.845 |                   1 / 0 |
|   12 | `f-verify-1000.spec.ts`                  |   8.265 |                   1 / 0 |
|   13 | `f-rebrand-bathyline.spec.ts`            |   7.243 |                   1 / 0 |
|   14 | `phone-accept.spec.ts`                   |   6.546 |                   1 / 0 |
|   15 | `f-verify-lander-firstdisc-1240.spec.ts` |   5.412 |                   1 / 0 |

#### Shard 24/38

| Rank | Spec                       | Seconds | Executed / failed cases |
| ---: | -------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`        | 160.324 |                   3 / 0 |
|    2 | `opening-framing.spec.ts`  | 113.160 |                   6 / 0 |
|    3 | `d-start.spec.ts`          |  87.275 |                   1 / 0 |
|    4 | `journal-debrief.spec.ts`  |  82.529 |                   4 / 0 |
|    5 | `mission.spec.ts`          |  82.047 |                   1 / 0 |
|    6 | `f-verify-1000.spec.ts`    |  71.790 |                   2 / 0 |
|    7 | `content-missions.spec.ts` |  56.631 |                   1 / 0 |
|    8 | `presets.spec.ts`          |  17.336 |                   1 / 0 |
|    9 | `f-bughunt-18.spec.ts`     |  14.894 |                   1 / 0 |
|   10 | `d-sonar.spec.ts`          |  13.631 |                   1 / 0 |
|   11 | `phone-accept.spec.ts`     |  13.477 |                   1 / 0 |
|   12 | `f-title-scene.spec.ts`    |   8.205 |                   2 / 0 |
|   13 | `settings.spec.ts`         |   7.641 |                   1 / 0 |
|   14 | `helpers/titleAudit.ts`    |   3.304 |                   1 / 0 |

#### Shard 25/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `phone-accept.spec.ts`       | 180.702 |                   1 / 0 |
|    2 | `hud-touch.spec.ts`          | 158.349 |                   5 / 0 |
|    3 | `settings.spec.ts`           | 148.659 |                   1 / 0 |
|    4 | `opening-framing.spec.ts`    | 102.568 |                   6 / 0 |
|    5 | `f-bughunt-960.spec.ts`      | 101.222 |                   1 / 0 |
|    6 | `content-missions.spec.ts`   |  77.769 |                   1 / 0 |
|    7 | `d-input-hud.spec.ts`        |  58.209 |                   1 / 0 |
|    8 | `f-perf-budget.spec.ts`      |  56.905 |                   1 / 0 |
|    9 | `f-fidelity-rollout.spec.ts` |  42.889 |                   1 / 0 |
|   10 | `f-events-reform.spec.ts`    |  41.744 |                   1 / 0 |
|   11 | `terrain-render.spec.ts`     |  39.225 |                   2 / 0 |
|   12 | `d-sonar.spec.ts`            |  32.811 |                   1 / 0 |
|   13 | `f-verify-1000.spec.ts`      |  29.254 |                   2 / 0 |
|   14 | `f-briefing-900.spec.ts`     |   6.559 |                   1 / 0 |
|   15 | `journal-debrief.spec.ts`    |   2.900 |                   1 / 0 |

#### Shard 26/38

| Rank | Spec                                     | Seconds | Executed / failed cases |
| ---: | ---------------------------------------- | ------: | ----------------------: |
|    1 | `phone-accept.spec.ts`                   | 182.499 |                   1 / 0 |
|    2 | `hud-touch.spec.ts`                      | 165.441 |                   6 / 0 |
|    3 | `f-briefing-900.spec.ts`                 |  62.559 |                   1 / 0 |
|    4 | `opening-framing.spec.ts`                |  55.668 |                   6 / 0 |
|    5 | `journal-debrief.spec.ts`                |  39.349 |                   2 / 0 |
|    6 | `d-shell.spec.ts`                        |  36.559 |                   1 / 0 |
|    7 | `f-content-fix.spec.ts`                  |  32.191 |                   1 / 0 |
|    8 | `f2-life.spec.ts`                        |  19.808 |                   1 / 0 |
|    9 | `f-verify-1000.spec.ts`                  |  12.239 |                   1 / 0 |
|   10 | `sub-playtest.spec.ts`                   |  10.574 |                   1 / 0 |
|   11 | `d2-predive.spec.ts`                     |   7.100 |                   1 / 0 |
|   12 | `f-title-scene.spec.ts`                  |   5.821 |                   1 / 0 |
|   13 | `f-a11y.spec.ts`                         |   5.772 |                   1 / 0 |
|   14 | `f-verify-lander-firstdisc-1240.spec.ts` |   3.650 |                   1 / 0 |
|   15 | `settings.spec.ts`                       |   2.219 |                   1 / 0 |

#### Shard 27/38

| Rank | Spec                      | Seconds | Executed / failed cases |
| ---: | ------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`       | 344.513 |                   6 / 0 |
|    2 | `phone-accept.spec.ts`    | 221.055 |                   1 / 0 |
|    3 | `f3-onboard.spec.ts`      | 119.705 |                   1 / 0 |
|    4 | `opening-framing.spec.ts` |  74.747 |                   4 / 0 |
|    5 | `d-sonar.spec.ts`         |  66.408 |                   1 / 0 |
|    6 | `f2-life.spec.ts`         |  64.882 |                   2 / 0 |
|    7 | `f-perf-budget.spec.ts`   |  46.207 |                   1 / 0 |
|    8 | `journal-debrief.spec.ts` |  45.909 |                   2 / 0 |
|    9 | `terrain-render.spec.ts`  |  34.471 |                   2 / 0 |
|   10 | `f2-progress.spec.ts`     |  33.243 |                   1 / 0 |
|   11 | `f-verify-1000.spec.ts`   |  26.213 |                   1 / 0 |
|   12 | `f-title-scene.spec.ts`   |   9.933 |                   1 / 0 |
|   13 | `globe-pins.spec.ts`      |   5.862 |                   1 / 0 |
|   14 | `f-bughunt-18.spec.ts`    |   4.887 |                   1 / 0 |
|   15 | `f-a11y.spec.ts`          |   3.069 |                   1 / 0 |

#### Shard 28/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `f-fidelity-rollout.spec.ts` | 245.620 |                   2 / 0 |
|    2 | `phone-accept.spec.ts`       | 113.337 |                   1 / 0 |
|    3 | `opening-framing.spec.ts`    |  91.690 |                   7 / 0 |
|    4 | `f-bughunt-960.spec.ts`      |  76.968 |                   2 / 0 |
|    5 | `journal-debrief.spec.ts`    |  68.852 |                   2 / 0 |
|    6 | `f-content-fix.spec.ts`      |  42.906 |                   1 / 0 |
|    7 | `f-bughunt-880.spec.ts`      |  30.455 |                   1 / 0 |
|    8 | `f-perf-budget.spec.ts`      |  29.855 |                   1 / 0 |
|    9 | `d-shell.spec.ts`            |  27.920 |                   1 / 0 |
|   10 | `f-first-minute-620.spec.ts` |  19.215 |                   1 / 0 |
|   11 | `f-events-reform.spec.ts`    |  18.353 |                   1 / 0 |
|   12 | `hud-touch.spec.ts`          |  15.056 |                   2 / 0 |
|   13 | `d-input-hud.spec.ts`        |   9.064 |                   1 / 0 |
|   14 | `f2-explore.spec.ts`         |   6.732 |                   1 / 0 |
|   15 | `f-bughunt-18.spec.ts`       |   4.859 |                   1 / 0 |

#### Shard 29/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`          | 309.844 |                   7 / 0 |
|    2 | `f3-audio.spec.ts`           | 131.446 |                   1 / 0 |
|    3 | `f-bughunt-960.spec.ts`      | 113.361 |                   2 / 0 |
|    4 | `f1-fixes.spec.ts`           | 104.308 |                   1 / 0 |
|    5 | `opening-framing.spec.ts`    |  69.291 |                   5 / 0 |
|    6 | `f-content-fix.spec.ts`      |  68.100 |                   1 / 0 |
|    7 | `f-briefing-900.spec.ts`     |  45.920 |                   1 / 0 |
|    8 | `terrain-render.spec.ts`     |  39.895 |                   2 / 0 |
|    9 | `f-title-layout.spec.ts`     |  21.305 |                   1 / 0 |
|   10 | `f-first-minute-620.spec.ts` |  15.772 |                   1 / 0 |
|   11 | `f-title-scene.spec.ts`      |  11.702 |                   2 / 0 |
|   12 | `f2-explore.spec.ts`         |  11.196 |                   1 / 0 |
|   13 | `phone-accept.spec.ts`       |   4.446 |                   1 / 0 |

#### Shard 30/38

| Rank | Spec                          | Seconds | Executed / failed cases |
| ---: | ----------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`           | 134.440 |                   6 / 0 |
|    2 | `phone-accept.spec.ts`        |  92.375 |                   1 / 0 |
|    3 | `f1-fixes.spec.ts`            |  79.040 |                   1 / 0 |
|    4 | `opening-framing.spec.ts`     |  78.949 |                   7 / 0 |
|    5 | `f3-onboard.spec.ts`          |  75.418 |                   2 / 0 |
|    6 | `terrain-render.spec.ts`      |  73.830 |                   3 / 0 |
|    7 | `f-fidelity-rollout.spec.ts`  |  34.315 |                   1 / 0 |
|    8 | `f1-ocean.spec.ts`            |  14.294 |                   1 / 0 |
|    9 | `f-text-diet.spec.ts`         |  13.214 |                   1 / 0 |
|   10 | `d-sonar.spec.ts`             |  10.133 |                   1 / 0 |
|   11 | `d-shell.spec.ts`             |   3.444 |                   1 / 0 |
|   12 | `f-rebrand-bathyline.spec.ts` |   1.892 |                   1 / 0 |

#### Shard 31/38

| Rank | Spec                                     | Seconds | Executed / failed cases |
| ---: | ---------------------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`                      | 305.088 |                   7 / 0 |
|    2 | `f3-onboard.spec.ts`                     | 129.012 |                   1 / 0 |
|    3 | `phone-accept.spec.ts`                   | 114.391 |                   1 / 0 |
|    4 | `journal-debrief.spec.ts`                | 103.582 |                   2 / 0 |
|    5 | `opening-framing.spec.ts`                |  52.748 |                   6 / 0 |
|    6 | `f-fidelity-rollout.spec.ts`             |  35.876 |                   1 / 0 |
|    7 | `globe.spec.ts`                          |  34.882 |                   1 / 0 |
|    8 | `presets.spec.ts`                        |  24.678 |                   1 / 0 |
|    9 | `f-events-reform.spec.ts`                |  20.795 |                   1 / 0 |
|   10 | `f1-ocean.spec.ts`                       |  13.849 |                   1 / 0 |
|   11 | `f2-explore.spec.ts`                     |  12.032 |                   2 / 0 |
|   12 | `f-title-scene.spec.ts`                  |   8.734 |                   1 / 0 |
|   13 | `f-verify-lander-firstdisc-1240.spec.ts` |   3.597 |                   1 / 0 |

#### Shard 32/38

| Rank | Spec                       | Seconds | Executed / failed cases |
| ---: | -------------------------- | ------: | ----------------------: |
|    1 | `f-beebe-plumes.spec.ts`   | 207.878 |                   1 / 0 |
|    2 | `d-modes.spec.ts`          | 153.826 |                   1 / 0 |
|    3 | `phone-accept.spec.ts`     | 112.660 |                   1 / 0 |
|    4 | `d-input-hud.spec.ts`      |  97.397 |                   2 / 0 |
|    5 | `opening-framing.spec.ts`  |  85.210 |                   4 / 0 |
|    6 | `props.spec.ts`            |  62.796 |                   1 / 0 |
|    7 | `content-missions.spec.ts` |  59.109 |                   1 / 0 |
|    8 | `helpers/titleAudit.ts`    |  43.573 |                   1 / 0 |
|    9 | `hud-touch.spec.ts`        |  39.646 |                   2 / 0 |
|   10 | `sub-playtest.spec.ts`     |  37.489 |                   1 / 0 |
|   11 | `d-sonar.spec.ts`          |  29.618 |                   1 / 0 |
|   12 | `presets.spec.ts`          |  29.552 |                   1 / 0 |
|   13 | `f-verify-1000.spec.ts`    |  23.162 |                   1 / 0 |
|   14 | `journal-debrief.spec.ts`  |  21.657 |                   1 / 0 |
|   15 | `f2-explore.spec.ts`       |  16.539 |                   2 / 0 |

#### Shard 33/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`          | 432.522 |                   7 / 0 |
|    2 | `phone-accept.spec.ts`       | 221.552 |                   1 / 0 |
|    3 | `f-fidelity-rollout.spec.ts` | 146.554 |                   1 / 0 |
|    4 | `opening-framing.spec.ts`    | 134.481 |                   7 / 0 |
|    5 | `content-missions.spec.ts`   |  75.979 |                   1 / 0 |
|    6 | `terrain-render.spec.ts`     |  74.832 |                   2 / 0 |
|    7 | `smoke.spec.ts`              |  58.659 |                   1 / 0 |
|    8 | `f-verify-1000.spec.ts`      |  49.277 |                   1 / 0 |
|    9 | `journal-debrief.spec.ts`    |  47.849 |                   1 / 0 |
|   10 | `f-copy-regress.spec.ts`     |  13.562 |                   1 / 0 |
|   11 | `mission.spec.ts`            |  12.301 |                   1 / 0 |
|   12 | `d-currents.spec.ts`         |   9.471 |                   1 / 0 |
|   13 | `d-scan.spec.ts`             |   5.542 |                   1 / 0 |

#### Shard 34/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `f-fidelity-rollout.spec.ts` |  66.507 |                   1 / 0 |
|    2 | `phone-accept.spec.ts`       |  66.245 |                   1 / 0 |
|    3 | `f-briefing-900.spec.ts`     |  62.854 |                   1 / 0 |
|    4 | `journal-debrief.spec.ts`    |  62.588 |                   2 / 0 |
|    5 | `f3-onboard.spec.ts`         |  57.813 |                   2 / 0 |
|    6 | `f2-explore.spec.ts`         |  56.914 |                   1 / 0 |
|    7 | `f2-modes.spec.ts`           |  53.788 |                   1 / 0 |
|    8 | `opening-framing.spec.ts`    |  40.873 |                   5 / 0 |
|    9 | `content-missions.spec.ts`   |  40.470 |                   1 / 0 |
|   10 | `hud-touch.spec.ts`          |  34.855 |                   3 / 0 |
|   11 | `terrain-render.spec.ts`     |  25.811 |                   2 / 0 |
|   12 | `f-events-reform.spec.ts`    |  17.474 |                   1 / 0 |
|   13 | `f-endurance-1180.spec.ts`   |  16.866 |                   1 / 0 |
|   14 | `presets.spec.ts`            |  12.734 |                   1 / 0 |
|   15 | `globe-pins.spec.ts`         |   4.012 |                   1 / 0 |

#### Shard 35/38

| Rank | Spec                                     | Seconds | Executed / failed cases |
| ---: | ---------------------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`                      | 358.568 |                   7 / 0 |
|    2 | `f-bughunt-880.spec.ts`                  | 151.074 |                   2 / 0 |
|    3 | `f3-onboard.spec.ts`                     | 146.371 |                   1 / 0 |
|    4 | `d-scan.spec.ts`                         |  81.218 |                   3 / 0 |
|    5 | `opening-framing.spec.ts`                |  73.903 |                   4 / 0 |
|    6 | `f-events-reform.spec.ts`                |  38.752 |                   1 / 0 |
|    7 | `f-bughunt-960.spec.ts`                  |  33.281 |                   1 / 0 |
|    8 | `f-verify-1000.spec.ts`                  |  19.228 |                   1 / 0 |
|    9 | `terrain-render.spec.ts`                 |  17.588 |                   1 / 0 |
|   10 | `f-endurance-1180.spec.ts`               |  11.006 |                   1 / 0 |
|   11 | `sub-playtest.spec.ts`                   |  10.513 |                   1 / 0 |
|   12 | `f-verify-lander-firstdisc-1240.spec.ts` |   6.665 |                   1 / 0 |
|   13 | `phone-accept.spec.ts`                   |   4.351 |                   1 / 0 |
|   14 | `settings.spec.ts`                       |   3.789 |                   1 / 0 |

#### Shard 36/38

| Rank | Spec                      | Seconds | Executed / failed cases |
| ---: | ------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`       | 350.179 |                   6 / 0 |
|    2 | `phone-accept.spec.ts`    | 136.389 |                   1 / 0 |
|    3 | `opening-framing.spec.ts` | 126.424 |                   5 / 0 |
|    4 | `d-sonar.spec.ts`         | 118.696 |                   1 / 0 |
|    5 | `f1-touch.spec.ts`        | 114.742 |                   1 / 0 |
|    6 | `mission.spec.ts`         |  85.252 |                   1 / 0 |
|    7 | `journal-debrief.spec.ts` |  80.988 |                   2 / 0 |
|    8 | `f-bughunt-960.spec.ts`   |  65.047 |                   1 / 0 |
|    9 | `f3-audio.spec.ts`        |  38.261 |                   1 / 0 |
|   10 | `f-arcade-access.spec.ts` |  33.734 |                   1 / 0 |
|   11 | `f-title-scene.spec.ts`   |  24.080 |                   1 / 0 |
|   12 | `f-text-diet.spec.ts`     |  21.527 |                   1 / 0 |
|   13 | `f-title-layout.spec.ts`  |  16.729 |                   1 / 0 |
|   14 | `d-scan.spec.ts`          |   4.737 |                   1 / 0 |
|   15 | `f2-progress.spec.ts`     |   2.421 |                   1 / 0 |

#### Shard 37/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `opening-framing.spec.ts`    | 183.242 |                   7 / 0 |
|    2 | `hud-touch.spec.ts`          | 120.171 |                   4 / 0 |
|    3 | `phone-accept.spec.ts`       |  96.093 |                   1 / 0 |
|    4 | `f2-explore.spec.ts`         |  88.966 |                   1 / 0 |
|    5 | `helpers/titleAudit.ts`      |  86.564 |                   1 / 0 |
|    6 | `f2-life.spec.ts`            |  58.511 |                   2 / 0 |
|    7 | `journal-debrief.spec.ts`    |  45.713 |                   1 / 0 |
|    8 | `f-fidelity-rollout.spec.ts` |  31.807 |                   1 / 0 |
|    9 | `f-events-reform.spec.ts`    |  23.191 |                   1 / 0 |
|   10 | `terrain-render.spec.ts`     |  18.424 |                   1 / 0 |
|   11 | `f2-modes.spec.ts`           |  12.702 |                   2 / 0 |
|   12 | `f-verify-1000.spec.ts`      |  11.495 |                   1 / 0 |
|   13 | `d-shell.spec.ts`            |  11.200 |                   1 / 0 |
|   14 | `d-scan.spec.ts`             |   5.972 |                   1 / 0 |
|   15 | `globe-pins.spec.ts`         |   4.719 |                   1 / 0 |

#### Shard 38/38

| Rank | Spec                          | Seconds | Executed / failed cases |
| ---: | ----------------------------- | ------: | ----------------------: |
|    1 | `f2-explore.spec.ts`          | 177.808 |                   2 / 0 |
|    2 | `hud-touch.spec.ts`           | 145.343 |                   5 / 0 |
|    3 | `f1-fixes.spec.ts`            |  95.134 |                   1 / 0 |
|    4 | `content-missions.spec.ts`    |  64.042 |                   1 / 0 |
|    5 | `f-lowtier-followups.spec.ts` |  47.660 |                   2 / 0 |
|    6 | `opening-framing.spec.ts`     |  41.905 |                   3 / 0 |
|    7 | `f1-touch.spec.ts`            |  39.189 |                   2 / 0 |
|    8 | `f-bughunt-960.spec.ts`       |  37.636 |                   1 / 0 |
|    9 | `f-briefing-900.spec.ts`      |  36.644 |                   1 / 0 |
|   10 | `d-shell.spec.ts`             |  33.040 |                   1 / 0 |
|   11 | `terrain-render.spec.ts`      |  26.255 |                   1 / 0 |
|   12 | `f-verify-1000.spec.ts`       |  14.745 |                   1 / 0 |
|   13 | `phone-accept.spec.ts`        |  13.450 |                   2 / 0 |
|   14 | `f-content-fix.spec.ts`       |   5.704 |                   1 / 0 |
|   15 | `d-scan.spec.ts`              |   5.378 |                   1 / 0 |

### Run [42555465639](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/42555465639)

#### Shard 1/38

| Rank | Spec                      | Seconds | Executed / failed cases |
| ---: | ------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`       | 110.007 |                   6 / 0 |
|    2 | `d-input-hud.spec.ts`     |  95.332 |                   1 / 0 |
|    3 | `opening-framing.spec.ts` |  71.668 |                   6 / 0 |
|    4 | `journal-debrief.spec.ts` |  48.658 |                   2 / 0 |
|    5 | `f-bughunt-880.spec.ts`   |  35.769 |                   1 / 0 |
|    6 | `f3-audio.spec.ts`        |  28.480 |                   1 / 0 |
|    7 | `f-perf-budget.spec.ts`   |  22.989 |                   1 / 0 |
|    8 | `f-briefing-900.spec.ts`  |  20.059 |                   1 / 0 |
|    9 | `terrain-render.spec.ts`  |  16.962 |                   1 / 0 |
|   10 | `mission.spec.ts`         |   6.427 |                   1 / 0 |
|   11 | `phone-accept.spec.ts`    |   5.995 |                   2 / 0 |
|   12 | `settings.spec.ts`        |   4.614 |                   1 / 0 |
|   13 | `f2-progress.spec.ts`     |   4.023 |                   1 / 0 |
|   14 | `f-a11y.spec.ts`          |   2.602 |                   1 / 0 |

#### Shard 2/38

| Rank | Spec                      | Seconds | Executed / failed cases |
| ---: | ------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`       | 371.112 |                   5 / 0 |
|    2 | `phone-accept.spec.ts`    | 248.078 |                   2 / 0 |
|    3 | `journal-debrief.spec.ts` |  81.617 |                   3 / 0 |
|    4 | `f-events-reform.spec.ts` |  57.240 |                   2 / 0 |
|    5 | `f1-ocean.spec.ts`        |  50.828 |                   1 / 0 |
|    6 | `opening-framing.spec.ts` |  42.628 |                   3 / 0 |
|    7 | `f-perf-budget.spec.ts`   |  40.985 |                   1 / 0 |
|    8 | `f-bughunt-18.spec.ts`    |  40.223 |                   1 / 0 |
|    9 | `globe-pins.spec.ts`      |  39.056 |                   1 / 0 |
|   10 | `props.spec.ts`           |  38.591 |                   1 / 0 |
|   11 | `f-title-layout.spec.ts`  |  22.268 |                   1 / 0 |
|   12 | `settings.spec.ts`        |  21.064 |                   2 / 0 |
|   13 | `f-title-scene.spec.ts`   |  20.708 |                   1 / 0 |
|   14 | `f-a11y.spec.ts`          |  10.511 |                   1 / 0 |

#### Shard 3/38

| Rank | Spec                                     | Seconds | Executed / failed cases |
| ---: | ---------------------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`                      | 250.810 |                   7 / 0 |
|    2 | `phone-accept.spec.ts`                   | 214.934 |                   2 / 0 |
|    3 | `d2-predive.spec.ts`                     | 154.056 |                   1 / 0 |
|    4 | `props.spec.ts`                          | 103.071 |                   1 / 0 |
|    5 | `opening-framing.spec.ts`                |  93.163 |                   6 / 0 |
|    6 | `f-bughunt-960.spec.ts`                  |  78.977 |                   1 / 0 |
|    7 | `f2-life.spec.ts`                        |  51.899 |                   1 / 0 |
|    8 | `f2-modes.spec.ts`                       |  49.959 |                   1 / 0 |
|    9 | `f-perf-budget.spec.ts`                  |  30.521 |                   1 / 0 |
|   10 | `f-events-reform.spec.ts`                |  26.245 |                   1 / 0 |
|   11 | `journal-debrief.spec.ts`                |  12.704 |                   1 / 0 |
|   12 | `f2-explore.spec.ts`                     |   6.148 |                   1 / 0 |
|   13 | `f-verify-lander-firstdisc-1240.spec.ts` |   4.458 |                   1 / 0 |
|   14 | `settings.spec.ts`                       |   4.205 |                   1 / 0 |

#### Shard 4/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `phone-accept.spec.ts`       | 236.737 |                   1 / 0 |
|    2 | `f-fidelity-rollout.spec.ts` | 115.211 |                   1 / 0 |
|    3 | `opening-framing.spec.ts`    |  95.655 |                   7 / 0 |
|    4 | `f-perf-budget.spec.ts`      |  82.444 |                   2 / 0 |
|    5 | `hud-touch.spec.ts`          |  57.560 |                   5 / 0 |
|    6 | `f-title-layout.spec.ts`     |  47.071 |                   1 / 0 |
|    7 | `content-missions.spec.ts`   |  37.593 |                   1 / 0 |
|    8 | `f-text-diet.spec.ts`        |  20.841 |                   1 / 0 |
|    9 | `sub-playtest.spec.ts`       |  20.107 |                   1 / 0 |
|   10 | `f-bughunt-960.spec.ts`      |  19.433 |                   1 / 0 |
|   11 | `f2-life.spec.ts`            |  11.891 |                   1 / 0 |
|   12 | `d-sonar.spec.ts`            |  11.609 |                   1 / 0 |
|   13 | `f-verify-1000.spec.ts`      |   8.321 |                   1 / 0 |
|   14 | `settings.spec.ts`           |   4.641 |                   1 / 0 |
|   15 | `f2-explore.spec.ts`         |   3.319 |                   1 / 0 |

#### Shard 5/38

| Rank | Spec                          | Seconds | Executed / failed cases |
| ---: | ----------------------------- | ------: | ----------------------: |
|    1 | `f-fidelity-rollout.spec.ts`  | 189.493 |                   1 / 0 |
|    2 | `phone-accept.spec.ts`        | 186.655 |                   1 / 0 |
|    3 | `journal-debrief.spec.ts`     | 138.378 |                   3 / 0 |
|    4 | `f-verify-1000.spec.ts`       |  88.507 |                   2 / 0 |
|    5 | `hud-touch.spec.ts`           |  63.649 |                   4 / 0 |
|    6 | `f-content-fix.spec.ts`       |  53.859 |                   1 / 0 |
|    7 | `opening-framing.spec.ts`     |  52.618 |                   5 / 0 |
|    8 | `terrain-render.spec.ts`      |  47.636 |                   1 / 0 |
|    9 | `d-sonar.spec.ts`             |  31.701 |                   2 / 0 |
|   10 | `f-bughunt-960.spec.ts`       |  24.808 |                   1 / 0 |
|   11 | `presets.spec.ts`             |  19.971 |                   1 / 0 |
|   12 | `f-bluehole-squiggle.spec.ts` |  15.029 |                   1 / 0 |
|   13 | `f-a11y.spec.ts`              |   6.918 |                   1 / 0 |
|   14 | `f2-explore.spec.ts`          |   6.718 |                   1 / 0 |
|   15 | `f2-progress.spec.ts`         |   3.264 |                   1 / 0 |

#### Shard 6/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `f-fidelity-rollout.spec.ts` | 138.597 |                   2 / 0 |
|    2 | `phone-accept.spec.ts`       |  92.942 |                   1 / 0 |
|    3 | `f3-onboard.spec.ts`         |  83.750 |                   1 / 0 |
|    4 | `hud-touch.spec.ts`          |  55.728 |                   3 / 0 |
|    5 | `opening-framing.spec.ts`    |  53.078 |                   5 / 0 |
|    6 | `content-missions.spec.ts`   |  38.795 |                   1 / 0 |
|    7 | `f-events-reform.spec.ts`    |  32.000 |                   1 / 0 |
|    8 | `d-scan.spec.ts`             |  27.611 |                   1 / 0 |
|    9 | `f1-touch.spec.ts`           |  19.351 |                   1 / 0 |
|   10 | `terrain-render.spec.ts`     |  16.686 |                   1 / 0 |
|   11 | `journal-debrief.spec.ts`    |  13.528 |                   1 / 0 |
|   12 | `f-title-layout.spec.ts`     |  13.257 |                   2 / 0 |
|   13 | `presets.spec.ts`            |  12.683 |                   1 / 0 |
|   14 | `f-title-scene.spec.ts`      |   7.612 |                   2 / 0 |
|   15 | `f-verify-1000.spec.ts`      |   6.805 |                   1 / 0 |

#### Shard 7/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `f-fidelity-rollout.spec.ts` | 126.739 |                   1 / 0 |
|    2 | `phone-accept.spec.ts`       | 124.815 |                   1 / 0 |
|    3 | `hud-touch.spec.ts`          | 107.755 |                   5 / 0 |
|    4 | `opening-framing.spec.ts`    |  99.232 |                   7 / 0 |
|    5 | `settings.spec.ts`           |  85.727 |                   2 / 0 |
|    6 | `f-perf-budget.spec.ts`      |  49.319 |                   1 / 0 |
|    7 | `d-currents.spec.ts`         |  28.898 |                   1 / 0 |
|    8 | `f-bughunt-880.spec.ts`      |  27.191 |                   1 / 0 |
|    9 | `journal-debrief.spec.ts`    |  24.782 |                   2 / 0 |
|   10 | `f-events-reform.spec.ts`    |  18.305 |                   1 / 0 |
|   11 | `f-verify-1000.spec.ts`      |  18.236 |                   1 / 0 |
|   12 | `terrain-render.spec.ts`     |   9.200 |                   1 / 0 |
|   13 | `d-shell.spec.ts`            |   4.645 |                   1 / 0 |
|   14 | `d-modes.spec.ts`            |   2.468 |                   1 / 0 |

#### Shard 8/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `f-fidelity-rollout.spec.ts` | 221.654 |                   2 / 0 |
|    2 | `hud-touch.spec.ts`          | 166.069 |                   4 / 0 |
|    3 | `opening-framing.spec.ts`    | 141.451 |                   8 / 0 |
|    4 | `content-missions.spec.ts`   | 105.434 |                   1 / 0 |
|    5 | `f-bughunt-880.spec.ts`      |  85.587 |                   1 / 1 |
|    6 | `globe.spec.ts`              |  71.245 |                   1 / 0 |
|    7 | `d-photo.spec.ts`            |  53.664 |                   1 / 0 |
|    8 | `d-sonar.spec.ts`            |  53.260 |                   1 / 0 |
|    9 | `settings.spec.ts`           |  47.502 |                   2 / 0 |
|   10 | `journal-debrief.spec.ts`    |  29.838 |                   1 / 0 |
|   11 | `f1-touch.spec.ts`           |  24.921 |                   2 / 0 |
|   12 | `f2-explore.spec.ts`         |   7.951 |                   1 / 0 |
|   13 | `phone-accept.spec.ts`       |   5.077 |                   1 / 0 |

#### Shard 9/38

| Rank | Spec                      | Seconds | Executed / failed cases |
| ---: | ------------------------- | ------: | ----------------------: |
|    1 | `f2-modes.spec.ts`        | 182.592 |                   1 / 0 |
|    2 | `phone-accept.spec.ts`    | 179.595 |                   1 / 0 |
|    3 | `sub-playtest.spec.ts`    | 171.885 |                   1 / 0 |
|    4 | `hud-touch.spec.ts`       | 159.091 |                   3 / 0 |
|    5 | `opening-framing.spec.ts` | 117.935 |                   8 / 0 |
|    6 | `f-bughunt-960.spec.ts`   | 110.604 |                   2 / 0 |
|    7 | `d-start.spec.ts`         | 103.141 |                   1 / 0 |
|    8 | `f-content-fix.spec.ts`   |  86.086 |                   1 / 0 |
|    9 | `f-perf-budget.spec.ts`   |  74.482 |                   1 / 0 |
|   10 | `journal-debrief.spec.ts` |  56.793 |                   2 / 0 |
|   11 | `f2-life.spec.ts`         |  41.180 |                   1 / 0 |
|   12 | `f1-ocean.spec.ts`        |  21.210 |                   1 / 0 |
|   13 | `d-polish.spec.ts`        |  20.069 |                   1 / 0 |
|   14 | `settings.spec.ts`        |   7.436 |                   2 / 0 |

#### Shard 10/38

| Rank | Spec                       | Seconds | Executed / failed cases |
| ---: | -------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`        | 141.596 |                   5 / 0 |
|    2 | `phone-accept.spec.ts`     | 126.970 |                   1 / 0 |
|    3 | `d-polish.spec.ts`         | 101.130 |                   1 / 0 |
|    4 | `opening-framing.spec.ts`  |  86.193 |                   8 / 0 |
|    5 | `content-missions.spec.ts` |  85.766 |                   1 / 0 |
|    6 | `f-events-reform.spec.ts`  |  55.105 |                   2 / 0 |
|    7 | `f-bughunt-960.spec.ts`    |  48.752 |                   2 / 0 |
|    8 | `f-bughunt-880.spec.ts`    |  33.460 |                   1 / 0 |
|    9 | `d-sonar.spec.ts`          |  28.256 |                   1 / 0 |
|   10 | `atmosphere.spec.ts`       |  12.591 |                   1 / 0 |
|   11 | `d-shell.spec.ts`          |   5.371 |                   1 / 0 |
|   12 | `d2-predive.spec.ts`       |   3.984 |                   1 / 0 |
|   13 | `f2-progress.spec.ts`      |   2.309 |                   1 / 0 |

#### Shard 11/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`          | 217.436 |                   6 / 0 |
|    2 | `phone-accept.spec.ts`       | 201.596 |                   1 / 0 |
|    3 | `d2-camera.spec.ts`          | 169.173 |                   1 / 0 |
|    4 | `opening-framing.spec.ts`    | 125.640 |                   6 / 0 |
|    5 | `d-power.spec.ts`            | 107.328 |                   1 / 0 |
|    6 | `f1-fixes.spec.ts`           |  87.280 |                   1 / 0 |
|    7 | `f-title-layout.spec.ts`     |  57.503 |                   1 / 0 |
|    8 | `terrain-render.spec.ts`     |  55.670 |                   2 / 0 |
|    9 | `mission.spec.ts`            |  42.859 |                   1 / 0 |
|   10 | `f-first-minute-620.spec.ts` |  39.222 |                   2 / 0 |
|   11 | `journal-debrief.spec.ts`    |  18.816 |                   1 / 0 |
|   12 | `f-title-scene.spec.ts`      |  13.699 |                   1 / 0 |
|   13 | `settings.spec.ts`           |   9.686 |                   1 / 0 |
|   14 | `f-bughunt-18.spec.ts`       |   7.050 |                   1 / 0 |

#### Shard 12/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `f-fidelity-rollout.spec.ts` | 181.314 |                   1 / 0 |
|    2 | `f2-explore.spec.ts`         | 139.639 |                   1 / 0 |
|    3 | `opening-framing.spec.ts`    | 121.792 |                   6 / 0 |
|    4 | `d2-hazard.spec.ts`          |  85.113 |                   1 / 0 |
|    5 | `journal-debrief.spec.ts`    |  79.112 |                   2 / 0 |
|    6 | `hud-touch.spec.ts`          |  61.300 |                   2 / 0 |
|    7 | `f-verify-1000.spec.ts`      |  54.364 |                   2 / 0 |
|    8 | `f-bughunt-880.spec.ts`      |  45.902 |                   1 / 0 |
|    9 | `helpers/titleAudit.ts`      |  37.349 |                   1 / 0 |
|   10 | `globe.spec.ts`              |  26.730 |                   1 / 0 |
|   11 | `f-first-minute-620.spec.ts` |  26.175 |                   1 / 0 |
|   12 | `f-bughunt-960.spec.ts`      |  21.317 |                   1 / 0 |
|   13 | `f3-onboard.spec.ts`         |  13.435 |                   1 / 0 |
|   14 | `d-scan.spec.ts`             |  10.201 |                   1 / 0 |
|   15 | `settings.spec.ts`           |   9.706 |                   1 / 0 |

#### Shard 13/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`          | 364.982 |                   6 / 0 |
|    2 | `f-fidelity-rollout.spec.ts` | 202.801 |                   1 / 0 |
|    3 | `f1-touch.spec.ts`           | 181.602 |                   2 / 0 |
|    4 | `phone-accept.spec.ts`       | 169.545 |                   1 / 0 |
|    5 | `f2-life.spec.ts`            | 117.564 |                   1 / 0 |
|    6 | `journal-debrief.spec.ts`    |  92.791 |                   3 / 0 |
|    7 | `f-perf-budget.spec.ts`      |  50.543 |                   1 / 0 |
|    8 | `opening-framing.spec.ts`    |  40.992 |                   4 / 0 |
|    9 | `d-photo.spec.ts`            |  33.609 |                   1 / 0 |
|   10 | `d-sonar.spec.ts`            |  24.209 |                   1 / 0 |
|   11 | `helpers/titleAudit.ts`      |  13.219 |                   1 / 0 |
|   12 | `f2-modes.spec.ts`           |  12.498 |                   1 / 0 |
|   13 | `f2-progress.spec.ts`        |  12.205 |                   1 / 0 |
|   14 | `f-title-scene.spec.ts`      |   9.128 |                   1 / 0 |
|   15 | `d-shell.spec.ts`            |   6.041 |                   1 / 0 |

#### Shard 14/38

| Rank | Spec                      | Seconds | Executed / failed cases |
| ---: | ------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`       | 317.494 |                   4 / 0 |
|    2 | `opening-framing.spec.ts` | 262.554 |                   8 / 0 |
|    3 | `f2-life.spec.ts`         |  61.891 |                   1 / 0 |
|    4 | `f1-ocean.spec.ts`        |  57.832 |                   1 / 0 |
|    5 | `f-copy-regress.spec.ts`  |  54.579 |                   1 / 0 |
|    6 | `f-bughunt-18.spec.ts`    |  31.021 |                   1 / 0 |
|    7 | `presets.spec.ts`         |  22.509 |                   1 / 0 |
|    8 | `d-sonar.spec.ts`         |  21.589 |                   1 / 0 |
|    9 | `f-title-layout.spec.ts`  |  20.045 |                   1 / 0 |
|   10 | `f-verify-1000.spec.ts`   |  19.383 |                   1 / 0 |
|   11 | `sub-playtest.spec.ts`    |   9.889 |                   1 / 0 |
|   12 | `journal-debrief.spec.ts` |   9.427 |                   1 / 0 |
|   13 | `globe-pins.spec.ts`      |   6.144 |                   1 / 0 |
|   14 | `d-shell.spec.ts`         |   5.710 |                   1 / 0 |
|   15 | `phone-accept.spec.ts`    |   5.074 |                   1 / 0 |

#### Shard 15/38

| Rank | Spec                       | Seconds | Executed / failed cases |
| ---: | -------------------------- | ------: | ----------------------: |
|    1 | `journal-debrief.spec.ts`  | 180.841 |                   2 / 0 |
|    2 | `phone-accept.spec.ts`     | 153.282 |                   1 / 0 |
|    3 | `terrain-render.spec.ts`   | 109.139 |                   2 / 0 |
|    4 | `f-bughunt-960.spec.ts`    | 108.769 |                   2 / 0 |
|    5 | `opening-framing.spec.ts`  |  96.190 |                   7 / 0 |
|    6 | `globe.spec.ts`            |  75.462 |                   1 / 0 |
|    7 | `content-missions.spec.ts` |  70.156 |                   1 / 0 |
|    8 | `f3-onboard.spec.ts`       |  69.755 |                   1 / 0 |
|    9 | `f1-ocean.spec.ts`         |  64.883 |                   1 / 0 |
|   10 | `f-briefing-900.spec.ts`   |  35.078 |                   1 / 0 |
|   11 | `d2-predive.spec.ts`       |  31.523 |                   1 / 0 |
|   12 | `f-title-scene.spec.ts`    |  16.866 |                   1 / 0 |
|   13 | `f-text-diet.spec.ts`      |  12.320 |                   1 / 0 |
|   14 | `f2-progress.spec.ts`      |   7.414 |                   1 / 0 |
|   15 | `d-scan.spec.ts`           |   6.443 |                   1 / 0 |

#### Shard 16/38

| Rank | Spec                       | Seconds | Executed / failed cases |
| ---: | -------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`        | 166.628 |                   7 / 0 |
|    2 | `d2-camera.spec.ts`        |  77.950 |                   1 / 0 |
|    3 | `opening-framing.spec.ts`  |  71.451 |                   7 / 0 |
|    4 | `phone-accept.spec.ts`     |  63.459 |                   1 / 0 |
|    5 | `mission.spec.ts`          |  52.601 |                   1 / 0 |
|    6 | `content-missions.spec.ts` |  34.834 |                   1 / 0 |
|    7 | `journal-debrief.spec.ts`  |  24.408 |                   2 / 0 |
|    8 | `helpers/titleAudit.ts`    |  22.508 |                   1 / 0 |
|    9 | `f-text-diet.spec.ts`      |  19.844 |                   1 / 0 |
|   10 | `f-events-reform.spec.ts`  |  14.818 |                   1 / 0 |
|   11 | `f-title-audit.spec.ts`    |   5.354 |                   1 / 0 |
|   12 | `settings.spec.ts`         |   5.220 |                   1 / 0 |
|   13 | `d-scan.spec.ts`           |   2.039 |                   1 / 0 |

#### Shard 17/38

| Rank | Spec                                     | Seconds | Executed / failed cases |
| ---: | ---------------------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`                      | 295.431 |                   5 / 0 |
|    2 | `f-bluehole-1030.spec.ts`                | 239.200 |                   1 / 0 |
|    3 | `phone-accept.spec.ts`                   | 180.782 |                   1 / 0 |
|    4 | `opening-framing.spec.ts`                | 153.142 |                   7 / 0 |
|    5 | `settings.spec.ts`                       |  92.151 |                   1 / 0 |
|    6 | `f-bughunt-960.spec.ts`                  |  82.767 |                   2 / 0 |
|    7 | `f1-ocean.spec.ts`                       |  42.826 |                   1 / 0 |
|    8 | `f-verify-1000.spec.ts`                  |  35.901 |                   1 / 0 |
|    9 | `sub-playtest.spec.ts`                   |  27.882 |                   1 / 0 |
|   10 | `journal-debrief.spec.ts`                |  26.525 |                   1 / 0 |
|   11 | `terrain-render.spec.ts`                 |  23.148 |                   1 / 0 |
|   12 | `globe-pins.spec.ts`                     |   8.597 |                   1 / 0 |
|   13 | `f-verify-lander-firstdisc-1240.spec.ts` |   7.518 |                   1 / 0 |
|   14 | `f-briefing-900.spec.ts`                 |   4.377 |                   1 / 0 |
|   15 | `f-rebrand-bathyline.spec.ts`            |   1.772 |                   1 / 0 |

#### Shard 18/38

| Rank | Spec                      | Seconds | Executed / failed cases |
| ---: | ------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`       | 276.540 |                   6 / 0 |
|    2 | `f1-touch.spec.ts`        | 111.218 |                   1 / 0 |
|    3 | `phone-accept.spec.ts`    |  64.556 |                   1 / 0 |
|    4 | `settings.spec.ts`        |  62.466 |                   2 / 0 |
|    5 | `journal-debrief.spec.ts` |  52.989 |                   2 / 0 |
|    6 | `f-bughunt-960.spec.ts`   |  50.718 |                   1 / 0 |
|    7 | `opening-framing.spec.ts` |  33.049 |                   5 / 0 |
|    8 | `f1-vehicles.spec.ts`     |  27.187 |                   1 / 0 |
|    9 | `f-events-reform.spec.ts` |  15.969 |                   1 / 0 |
|   10 | `f-bughunt-9-pwa.spec.ts` |  12.414 |                   1 / 0 |
|   11 | `f-arcade-access.spec.ts` |  10.382 |                   1 / 0 |
|   12 | `f-title-scene.spec.ts`   |   7.127 |                   1 / 0 |
|   13 | `f3-onboard.spec.ts`      |   6.932 |                   1 / 0 |
|   14 | `globe-pins.spec.ts`      |   4.133 |                   1 / 0 |
|   15 | `d-shell.spec.ts`         |   3.218 |                   1 / 0 |

#### Shard 19/38

| Rank | Spec                      | Seconds | Executed / failed cases |
| ---: | ------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`       | 390.666 |                   4 / 0 |
|    2 | `opening-framing.spec.ts` | 201.024 |                   7 / 0 |
|    3 | `journal-debrief.spec.ts` | 175.720 |                   3 / 0 |
|    4 | `phone-accept.spec.ts`    | 137.030 |                   1 / 0 |
|    5 | `f-bughunt-880.spec.ts`   |  94.618 |                   1 / 1 |
|    6 | `d2-predive.spec.ts`      |  75.671 |                   1 / 0 |
|    7 | `terrain-render.spec.ts`  |  49.456 |                   2 / 0 |
|    8 | `presets.spec.ts`         |  39.097 |                   1 / 0 |
|    9 | `f-title-scene.spec.ts`   |  36.357 |                   1 / 0 |
|   10 | `f3-audio.spec.ts`        |  30.315 |                   1 / 0 |
|   11 | `f-a11y.spec.ts`          |  16.438 |                   1 / 0 |
|   12 | `f2-explore.spec.ts`      |   9.208 |                   1 / 0 |
|   13 | `globe-pins.spec.ts`      |   5.605 |                   1 / 0 |
|   14 | `smoke.spec.ts`           |   2.416 |                   1 / 0 |

#### Shard 20/38

| Rank | Spec                      | Seconds | Executed / failed cases |
| ---: | ------------------------- | ------: | ----------------------: |
|    1 | `f-save-soak.spec.ts`     | 191.802 |                   1 / 0 |
|    2 | `hud-touch.spec.ts`       | 142.612 |                   3 / 0 |
|    3 | `opening-framing.spec.ts` | 109.154 |                   6 / 0 |
|    4 | `phone-accept.spec.ts`    | 103.331 |                   1 / 0 |
|    5 | `presets.spec.ts`         |  98.984 |                   1 / 0 |
|    6 | `f-content-fix.spec.ts`   |  89.236 |                   1 / 0 |
|    7 | `journal-debrief.spec.ts` |  82.545 |                   3 / 0 |
|    8 | `f-bughunt-880.spec.ts`   |  57.611 |                   1 / 1 |
|    9 | `f-verify-1000.spec.ts`   |  56.045 |                   2 / 0 |
|   10 | `f-events-reform.spec.ts` |  28.399 |                   1 / 0 |
|   11 | `d-sonar.spec.ts`         |  23.818 |                   1 / 0 |
|   12 | `f1-ocean.spec.ts`        |  22.772 |                   1 / 0 |
|   13 | `settings.spec.ts`        |  12.184 |                   2 / 0 |
|   14 | `f2-explore.spec.ts`      |  11.259 |                   1 / 0 |
|   15 | `f-a11y.spec.ts`          |   5.768 |                   1 / 0 |

#### Shard 21/38

| Rank | Spec                                     | Seconds | Executed / failed cases |
| ---: | ---------------------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`                      | 386.103 |                   6 / 0 |
|    2 | `f-fidelity-rollout.spec.ts`             | 181.581 |                   1 / 0 |
|    3 | `presets.spec.ts`                        | 152.865 |                   2 / 0 |
|    4 | `opening-framing.spec.ts`                |  99.875 |                   5 / 0 |
|    5 | `f-bughunt-960.spec.ts`                  |  80.254 |                   1 / 0 |
|    6 | `d-shell.spec.ts`                        |  56.209 |                   1 / 0 |
|    7 | `journal-debrief.spec.ts`                |  54.664 |                   2 / 0 |
|    8 | `d-sonar.spec.ts`                        |  41.428 |                   1 / 0 |
|    9 | `f-title-layout.spec.ts`                 |  29.494 |                   1 / 0 |
|   10 | `f3-audio.spec.ts`                       |  20.534 |                   1 / 0 |
|   11 | `helpers/titleAudit.ts`                  |  14.307 |                   1 / 0 |
|   12 | `f-verify-lander-firstdisc-1240.spec.ts` |  14.210 |                   1 / 0 |
|   13 | `settings.spec.ts`                       |   5.770 |                   1 / 0 |
|   14 | `phone-accept.spec.ts`                   |   4.181 |                   1 / 0 |
|   15 | `f-title-scene.spec.ts`                  |   3.782 |                   1 / 0 |

#### Shard 22/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`          | 160.607 |                   5 / 0 |
|    2 | `f-fidelity-rollout.spec.ts` | 139.192 |                   1 / 0 |
|    3 | `f-bughunt-18.spec.ts`       |  89.273 |                   1 / 0 |
|    4 | `journal-debrief.spec.ts`    |  73.557 |                   3 / 0 |
|    5 | `f-content-fix.spec.ts`      |  59.918 |                   1 / 0 |
|    6 | `opening-framing.spec.ts`    |  59.270 |                   4 / 0 |
|    7 | `f-perf-budget.spec.ts`      |  41.391 |                   1 / 0 |
|    8 | `terrain-render.spec.ts`     |  30.662 |                   1 / 0 |
|    9 | `smoke.spec.ts`              |  22.691 |                   1 / 0 |
|   10 | `f3-onboard.spec.ts`         |  20.853 |                   1 / 0 |
|   11 | `f-bughunt-960.spec.ts`      |  18.829 |                   1 / 0 |
|   12 | `f-endurance-1180.spec.ts`   |  14.875 |                   1 / 0 |
|   13 | `f-verify-1000.spec.ts`      |  13.920 |                   1 / 0 |
|   14 | `globe-pins.spec.ts`         |   5.179 |                   1 / 0 |
|   15 | `phone-accept.spec.ts`       |   2.090 |                   1 / 0 |

#### Shard 23/38

| Rank | Spec                                     | Seconds | Executed / failed cases |
| ---: | ---------------------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`                      | 249.832 |                   6 / 0 |
|    2 | `f-fidelity-rollout.spec.ts`             | 149.518 |                   1 / 0 |
|    3 | `content-missions.spec.ts`               | 102.887 |                   1 / 0 |
|    4 | `f-bughunt-960.spec.ts`                  |  64.419 |                   1 / 0 |
|    5 | `opening-framing.spec.ts`                |  43.151 |                   4 / 0 |
|    6 | `journal-debrief.spec.ts`                |  39.881 |                   3 / 0 |
|    7 | `terrain-render.spec.ts`                 |  37.604 |                   1 / 0 |
|    8 | `f-perf-budget.spec.ts`                  |  37.313 |                   1 / 0 |
|    9 | `d2-hazard.spec.ts`                      |  23.986 |                   1 / 0 |
|   10 | `settings.spec.ts`                       |  19.466 |                   1 / 0 |
|   11 | `f-first-minute-620.spec.ts`             |  14.778 |                   1 / 0 |
|   12 | `f-verify-1000.spec.ts`                  |   6.633 |                   1 / 0 |
|   13 | `f-rebrand-bathyline.spec.ts`            |   5.640 |                   1 / 0 |
|   14 | `phone-accept.spec.ts`                   |   4.775 |                   1 / 0 |
|   15 | `f-verify-lander-firstdisc-1240.spec.ts` |   4.363 |                   1 / 0 |

#### Shard 24/38

| Rank | Spec                       | Seconds | Executed / failed cases |
| ---: | -------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`        | 203.041 |                   3 / 0 |
|    2 | `opening-framing.spec.ts`  | 136.138 |                   6 / 0 |
|    3 | `d-start.spec.ts`          | 106.521 |                   1 / 0 |
|    4 | `journal-debrief.spec.ts`  | 103.566 |                   4 / 0 |
|    5 | `mission.spec.ts`          | 100.782 |                   1 / 0 |
|    6 | `f-verify-1000.spec.ts`    |  91.341 |                   2 / 0 |
|    7 | `content-missions.spec.ts` |  72.104 |                   1 / 0 |
|    8 | `presets.spec.ts`          |  21.596 |                   1 / 0 |
|    9 | `f-bughunt-18.spec.ts`     |  19.496 |                   1 / 0 |
|   10 | `phone-accept.spec.ts`     |  16.783 |                   1 / 0 |
|   11 | `d-sonar.spec.ts`          |  16.455 |                   1 / 0 |
|   12 | `f-title-scene.spec.ts`    |  10.555 |                   2 / 0 |
|   13 | `settings.spec.ts`         |   8.786 |                   1 / 0 |
|   14 | `helpers/titleAudit.ts`    |   3.657 |                   1 / 0 |

#### Shard 25/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `phone-accept.spec.ts`       | 178.366 |                   1 / 0 |
|    2 | `hud-touch.spec.ts`          | 156.216 |                   5 / 0 |
|    3 | `settings.spec.ts`           | 148.659 |                   1 / 0 |
|    4 | `opening-framing.spec.ts`    | 100.330 |                   6 / 0 |
|    5 | `f-bughunt-960.spec.ts`      |  98.799 |                   1 / 0 |
|    6 | `content-missions.spec.ts`   |  76.597 |                   1 / 0 |
|    7 | `d-input-hud.spec.ts`        |  57.684 |                   1 / 0 |
|    8 | `f-perf-budget.spec.ts`      |  56.716 |                   1 / 0 |
|    9 | `f-fidelity-rollout.spec.ts` |  42.400 |                   1 / 0 |
|   10 | `f-events-reform.spec.ts`    |  40.809 |                   1 / 0 |
|   11 | `terrain-render.spec.ts`     |  38.576 |                   2 / 0 |
|   12 | `d-sonar.spec.ts`            |  32.575 |                   1 / 0 |
|   13 | `f-verify-1000.spec.ts`      |  29.111 |                   2 / 0 |
|   14 | `f-briefing-900.spec.ts`     |   6.475 |                   1 / 0 |
|   15 | `journal-debrief.spec.ts`    |   3.052 |                   1 / 0 |

#### Shard 26/38

| Rank | Spec                                     | Seconds | Executed / failed cases |
| ---: | ---------------------------------------- | ------: | ----------------------: |
|    1 | `phone-accept.spec.ts`                   | 196.789 |                   1 / 0 |
|    2 | `hud-touch.spec.ts`                      | 179.226 |                   6 / 0 |
|    3 | `f-briefing-900.spec.ts`                 |  66.240 |                   1 / 0 |
|    4 | `opening-framing.spec.ts`                |  59.842 |                   6 / 0 |
|    5 | `journal-debrief.spec.ts`                |  41.642 |                   2 / 0 |
|    6 | `d-shell.spec.ts`                        |  41.416 |                   1 / 0 |
|    7 | `f-content-fix.spec.ts`                  |  32.134 |                   1 / 0 |
|    8 | `f2-life.spec.ts`                        |  21.294 |                   1 / 0 |
|    9 | `f-verify-1000.spec.ts`                  |  13.901 |                   1 / 0 |
|   10 | `sub-playtest.spec.ts`                   |  11.182 |                   1 / 0 |
|   11 | `d2-predive.spec.ts`                     |   7.000 |                   1 / 0 |
|   12 | `f-title-scene.spec.ts`                  |   6.356 |                   1 / 0 |
|   13 | `f-a11y.spec.ts`                         |   5.625 |                   1 / 0 |
|   14 | `f-verify-lander-firstdisc-1240.spec.ts` |   4.049 |                   1 / 0 |
|   15 | `settings.spec.ts`                       |   2.580 |                   1 / 0 |

#### Shard 27/38

| Rank | Spec                      | Seconds | Executed / failed cases |
| ---: | ------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`       | 394.584 |                   6 / 0 |
|    2 | `phone-accept.spec.ts`    | 257.734 |                   1 / 0 |
|    3 | `f3-onboard.spec.ts`      | 134.140 |                   1 / 0 |
|    4 | `opening-framing.spec.ts` |  82.077 |                   4 / 0 |
|    5 | `d-sonar.spec.ts`         |  71.171 |                   1 / 0 |
|    6 | `f2-life.spec.ts`         |  65.422 |                   2 / 0 |
|    7 | `journal-debrief.spec.ts` |  54.964 |                   2 / 0 |
|    8 | `f-perf-budget.spec.ts`   |  52.045 |                   1 / 0 |
|    9 | `terrain-render.spec.ts`  |  38.457 |                   2 / 0 |
|   10 | `f2-progress.spec.ts`     |  37.024 |                   1 / 0 |
|   11 | `f-verify-1000.spec.ts`   |  29.929 |                   1 / 0 |
|   12 | `f-title-scene.spec.ts`   |  10.753 |                   1 / 0 |
|   13 | `globe-pins.spec.ts`      |   5.849 |                   1 / 0 |
|   14 | `f-bughunt-18.spec.ts`    |   5.269 |                   1 / 0 |
|   15 | `f-a11y.spec.ts`          |   3.287 |                   1 / 0 |

#### Shard 28/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `f-fidelity-rollout.spec.ts` | 289.926 |                   2 / 0 |
|    2 | `phone-accept.spec.ts`       | 125.947 |                   1 / 0 |
|    3 | `opening-framing.spec.ts`    | 106.383 |                   7 / 0 |
|    4 | `journal-debrief.spec.ts`    |  85.771 |                   2 / 0 |
|    5 | `f-bughunt-960.spec.ts`      |  85.385 |                   2 / 0 |
|    6 | `f-content-fix.spec.ts`      |  55.817 |                   1 / 0 |
|    7 | `f-perf-budget.spec.ts`      |  36.612 |                   1 / 0 |
|    8 | `f-bughunt-880.spec.ts`      |  34.157 |                   1 / 0 |
|    9 | `d-shell.spec.ts`            |  32.531 |                   1 / 0 |
|   10 | `f-events-reform.spec.ts`    |  21.389 |                   1 / 0 |
|   11 | `f-first-minute-620.spec.ts` |  21.121 |                   1 / 0 |
|   12 | `hud-touch.spec.ts`          |  18.387 |                   2 / 0 |
|   13 | `d-input-hud.spec.ts`        |  11.054 |                   1 / 0 |
|   14 | `f2-explore.spec.ts`         |   8.118 |                   1 / 0 |
|   15 | `f-bughunt-18.spec.ts`       |   5.450 |                   1 / 0 |

#### Shard 29/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`          | 164.908 |                   7 / 0 |
|    2 | `f3-audio.spec.ts`           |  67.612 |                   1 / 0 |
|    3 | `f-bughunt-960.spec.ts`      |  62.189 |                   2 / 0 |
|    4 | `f1-fixes.spec.ts`           |  55.056 |                   1 / 0 |
|    5 | `opening-framing.spec.ts`    |  41.311 |                   5 / 0 |
|    6 | `f-content-fix.spec.ts`      |  38.281 |                   1 / 0 |
|    7 | `terrain-render.spec.ts`     |  24.536 |                   2 / 0 |
|    8 | `f-briefing-900.spec.ts`     |  22.704 |                   1 / 0 |
|    9 | `f-first-minute-620.spec.ts` |   8.806 |                   1 / 0 |
|   10 | `f2-explore.spec.ts`         |   6.563 |                   1 / 0 |
|   11 | `f-title-scene.spec.ts`      |   6.484 |                   2 / 0 |
|   12 | `f-title-layout.spec.ts`     |   4.948 |                   1 / 0 |
|   13 | `phone-accept.spec.ts`       |   2.866 |                   1 / 0 |

#### Shard 30/38

| Rank | Spec                          | Seconds | Executed / failed cases |
| ---: | ----------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`           | 242.437 |                   6 / 0 |
|    2 | `phone-accept.spec.ts`        | 164.907 |                   1 / 0 |
|    3 | `f3-onboard.spec.ts`          | 147.372 |                   2 / 0 |
|    4 | `f1-fixes.spec.ts`            | 139.714 |                   1 / 0 |
|    5 | `opening-framing.spec.ts`     | 134.752 |                   7 / 0 |
|    6 | `terrain-render.spec.ts`      | 132.211 |                   3 / 0 |
|    7 | `f-fidelity-rollout.spec.ts`  |  61.364 |                   1 / 0 |
|    8 | `f-text-diet.spec.ts`         |  24.169 |                   1 / 0 |
|    9 | `f1-ocean.spec.ts`            |  24.166 |                   1 / 0 |
|   10 | `d-sonar.spec.ts`             |  17.781 |                   1 / 0 |
|   11 | `d-shell.spec.ts`             |   6.257 |                   1 / 0 |
|   12 | `f-rebrand-bathyline.spec.ts` |   2.891 |                   1 / 0 |

#### Shard 31/38

| Rank | Spec                                     | Seconds | Executed / failed cases |
| ---: | ---------------------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`                      | 426.973 |                   7 / 0 |
|    2 | `f3-onboard.spec.ts`                     | 182.695 |                   1 / 0 |
|    3 | `phone-accept.spec.ts`                   | 158.710 |                   1 / 0 |
|    4 | `journal-debrief.spec.ts`                | 141.782 |                   2 / 0 |
|    5 | `opening-framing.spec.ts`                |  69.118 |                   6 / 0 |
|    6 | `globe.spec.ts`                          |  48.751 |                   1 / 0 |
|    7 | `f-fidelity-rollout.spec.ts`             |  48.523 |                   1 / 0 |
|    8 | `presets.spec.ts`                        |  34.509 |                   1 / 0 |
|    9 | `f-events-reform.spec.ts`                |  28.471 |                   1 / 0 |
|   10 | `f-title-scene.spec.ts`                  |  20.709 |                   1 / 0 |
|   11 | `f1-ocean.spec.ts`                       |  18.650 |                   1 / 0 |
|   12 | `f2-explore.spec.ts`                     |  16.435 |                   2 / 0 |
|   13 | `f-verify-lander-firstdisc-1240.spec.ts` |   4.262 |                   1 / 0 |

#### Shard 32/38

| Rank | Spec                       | Seconds | Executed / failed cases |
| ---: | -------------------------- | ------: | ----------------------: |
|    1 | `f-beebe-plumes.spec.ts`   | 207.259 |                   1 / 0 |
|    2 | `d-modes.spec.ts`          | 147.165 |                   1 / 0 |
|    3 | `phone-accept.spec.ts`     | 113.142 |                   1 / 0 |
|    4 | `d-input-hud.spec.ts`      |  96.409 |                   2 / 0 |
|    5 | `opening-framing.spec.ts`  |  85.462 |                   4 / 0 |
|    6 | `content-missions.spec.ts` |  61.449 |                   1 / 0 |
|    7 | `props.spec.ts`            |  61.421 |                   1 / 0 |
|    8 | `helpers/titleAudit.ts`    |  44.195 |                   1 / 0 |
|    9 | `hud-touch.spec.ts`        |  39.497 |                   2 / 0 |
|   10 | `sub-playtest.spec.ts`     |  36.948 |                   1 / 0 |
|   11 | `d-sonar.spec.ts`          |  29.362 |                   1 / 0 |
|   12 | `presets.spec.ts`          |  28.974 |                   1 / 0 |
|   13 | `f-verify-1000.spec.ts`    |  22.972 |                   1 / 0 |
|   14 | `journal-debrief.spec.ts`  |  22.151 |                   1 / 0 |
|   15 | `f2-explore.spec.ts`       |  16.202 |                   2 / 0 |

#### Shard 33/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`          | 342.389 |                   7 / 0 |
|    2 | `phone-accept.spec.ts`       | 167.934 |                   1 / 0 |
|    3 | `f-fidelity-rollout.spec.ts` | 117.386 |                   1 / 0 |
|    4 | `opening-framing.spec.ts`    | 110.045 |                   7 / 0 |
|    5 | `terrain-render.spec.ts`     |  60.549 |                   2 / 0 |
|    6 | `content-missions.spec.ts`   |  59.673 |                   1 / 0 |
|    7 | `smoke.spec.ts`              |  47.788 |                   1 / 0 |
|    8 | `journal-debrief.spec.ts`    |  38.588 |                   1 / 0 |
|    9 | `f-verify-1000.spec.ts`      |  38.250 |                   1 / 0 |
|   10 | `f-copy-regress.spec.ts`     |  10.690 |                   1 / 0 |
|   11 | `mission.spec.ts`            |   9.953 |                   1 / 0 |
|   12 | `d-currents.spec.ts`         |   9.440 |                   1 / 0 |
|   13 | `d-scan.spec.ts`             |   2.455 |                   1 / 0 |

#### Shard 34/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `f-fidelity-rollout.spec.ts` | 132.581 |                   1 / 0 |
|    2 | `phone-accept.spec.ts`       | 127.378 |                   1 / 0 |
|    3 | `f-briefing-900.spec.ts`     | 122.962 |                   1 / 0 |
|    4 | `journal-debrief.spec.ts`    | 117.830 |                   2 / 0 |
|    5 | `f3-onboard.spec.ts`         | 115.235 |                   2 / 0 |
|    6 | `f2-explore.spec.ts`         | 106.716 |                   1 / 0 |
|    7 | `f2-modes.spec.ts`           |  98.230 |                   1 / 0 |
|    8 | `content-missions.spec.ts`   |  79.633 |                   1 / 0 |
|    9 | `opening-framing.spec.ts`    |  69.027 |                   5 / 0 |
|   10 | `hud-touch.spec.ts`          |  63.032 |                   3 / 0 |
|   11 | `terrain-render.spec.ts`     |  46.094 |                   2 / 0 |
|   12 | `f-endurance-1180.spec.ts`   |  31.858 |                   1 / 0 |
|   13 | `f-events-reform.spec.ts`    |  30.898 |                   1 / 0 |
|   14 | `presets.spec.ts`            |  24.278 |                   1 / 0 |
|   15 | `globe-pins.spec.ts`         |   6.717 |                   1 / 0 |

#### Shard 35/38

| Rank | Spec                                     | Seconds | Executed / failed cases |
| ---: | ---------------------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`                      | 285.470 |                   7 / 0 |
|    2 | `f3-onboard.spec.ts`                     | 122.988 |                   1 / 0 |
|    3 | `f-bughunt-880.spec.ts`                  | 111.884 |                   2 / 0 |
|    4 | `d-scan.spec.ts`                         |  64.398 |                   3 / 0 |
|    5 | `opening-framing.spec.ts`                |  58.965 |                   4 / 0 |
|    6 | `f-events-reform.spec.ts`                |  30.503 |                   1 / 0 |
|    7 | `f-bughunt-960.spec.ts`                  |  25.498 |                   1 / 0 |
|    8 | `f-verify-1000.spec.ts`                  |  15.487 |                   1 / 0 |
|    9 | `terrain-render.spec.ts`                 |  14.269 |                   1 / 0 |
|   10 | `sub-playtest.spec.ts`                   |   9.223 |                   1 / 0 |
|   11 | `f-endurance-1180.spec.ts`               |   8.618 |                   1 / 0 |
|   12 | `f-verify-lander-firstdisc-1240.spec.ts` |   5.370 |                   1 / 0 |
|   13 | `phone-accept.spec.ts`                   |   3.571 |                   1 / 0 |
|   14 | `settings.spec.ts`                       |   3.038 |                   1 / 0 |

#### Shard 36/38

| Rank | Spec                      | Seconds | Executed / failed cases |
| ---: | ------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`       | 273.009 |                   6 / 0 |
|    2 | `phone-accept.spec.ts`    | 107.995 |                   1 / 0 |
|    3 | `opening-framing.spec.ts` | 103.133 |                   5 / 0 |
|    4 | `f1-touch.spec.ts`        |  95.347 |                   1 / 0 |
|    5 | `d-sonar.spec.ts`         |  93.574 |                   1 / 0 |
|    6 | `mission.spec.ts`         |  68.944 |                   1 / 0 |
|    7 | `journal-debrief.spec.ts` |  65.214 |                   2 / 0 |
|    8 | `f-bughunt-960.spec.ts`   |  50.093 |                   1 / 0 |
|    9 | `f3-audio.spec.ts`        |  28.676 |                   1 / 0 |
|   10 | `f-arcade-access.spec.ts` |  26.884 |                   1 / 0 |
|   11 | `f-title-scene.spec.ts`   |  17.044 |                   1 / 0 |
|   12 | `f-text-diet.spec.ts`     |  16.920 |                   1 / 0 |
|   13 | `f-title-layout.spec.ts`  |  12.696 |                   1 / 0 |
|   14 | `d-scan.spec.ts`          |   4.014 |                   1 / 0 |
|   15 | `f2-progress.spec.ts`     |   1.951 |                   1 / 0 |

#### Shard 37/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `opening-framing.spec.ts`    | 140.377 |                   7 / 0 |
|    2 | `hud-touch.spec.ts`          |  85.144 |                   4 / 0 |
|    3 | `phone-accept.spec.ts`       |  66.027 |                   1 / 0 |
|    4 | `helpers/titleAudit.ts`      |  62.844 |                   1 / 0 |
|    5 | `f2-explore.spec.ts`         |  55.879 |                   1 / 0 |
|    6 | `f2-life.spec.ts`            |  41.396 |                   2 / 0 |
|    7 | `journal-debrief.spec.ts`    |  32.615 |                   1 / 0 |
|    8 | `f-fidelity-rollout.spec.ts` |  21.514 |                   1 / 0 |
|    9 | `f-events-reform.spec.ts`    |  15.010 |                   1 / 0 |
|   10 | `terrain-render.spec.ts`     |  13.522 |                   1 / 0 |
|   11 | `f-verify-1000.spec.ts`      |   7.924 |                   1 / 0 |
|   12 | `f2-modes.spec.ts`           |   7.901 |                   2 / 0 |
|   13 | `d-shell.spec.ts`            |   6.808 |                   1 / 0 |
|   14 | `d-scan.spec.ts`             |   4.328 |                   1 / 0 |
|   15 | `globe-pins.spec.ts`         |   3.761 |                   1 / 0 |

#### Shard 38/38

| Rank | Spec                          | Seconds | Executed / failed cases |
| ---: | ----------------------------- | ------: | ----------------------: |
|    1 | `f2-explore.spec.ts`          | 211.789 |                   2 / 0 |
|    2 | `hud-touch.spec.ts`           | 174.143 |                   5 / 0 |
|    3 | `f1-fixes.spec.ts`            | 112.211 |                   1 / 0 |
|    4 | `content-missions.spec.ts`    |  74.766 |                   1 / 0 |
|    5 | `f-lowtier-followups.spec.ts` |  52.405 |                   2 / 0 |
|    6 | `opening-framing.spec.ts`     |  47.489 |                   3 / 0 |
|    7 | `f1-touch.spec.ts`            |  47.053 |                   2 / 0 |
|    8 | `f-briefing-900.spec.ts`      |  40.561 |                   1 / 0 |
|    9 | `f-bughunt-960.spec.ts`       |  39.862 |                   1 / 0 |
|   10 | `d-shell.spec.ts`             |  37.419 |                   1 / 0 |
|   11 | `terrain-render.spec.ts`      |  32.524 |                   1 / 0 |
|   12 | `f-verify-1000.spec.ts`       |  16.687 |                   1 / 0 |
|   13 | `phone-accept.spec.ts`        |  15.755 |                   2 / 0 |
|   14 | `f-content-fix.spec.ts`       |   6.374 |                   1 / 0 |
|   15 | `d-scan.spec.ts`              |   5.920 |                   1 / 0 |

### Run [42545964908](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/42545964908)

#### Shard 1/38

| Rank | Spec                      | Seconds | Executed / failed cases |
| ---: | ------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`       | 211.198 |                   6 / 0 |
|    2 | `d-input-hud.spec.ts`     | 195.058 |                   1 / 0 |
|    3 | `opening-framing.spec.ts` | 128.141 |                   6 / 0 |
|    4 | `journal-debrief.spec.ts` |  92.832 |                   2 / 0 |
|    5 | `f-bughunt-880.spec.ts`   |  66.508 |                   1 / 0 |
|    6 | `f3-audio.spec.ts`        |  54.524 |                   1 / 0 |
|    7 | `f-perf-budget.spec.ts`   |  43.419 |                   1 / 0 |
|    8 | `f-briefing-900.spec.ts`  |  38.876 |                   1 / 0 |
|    9 | `terrain-render.spec.ts`  |  30.732 |                   1 / 0 |
|   10 | `mission.spec.ts`         |  12.955 |                   1 / 0 |
|   11 | `phone-accept.spec.ts`    |   9.929 |                   2 / 0 |
|   12 | `settings.spec.ts`        |   7.422 |                   1 / 0 |
|   13 | `f2-progress.spec.ts`     |   7.141 |                   1 / 0 |
|   14 | `f-a11y.spec.ts`          |   5.555 |                   1 / 0 |

#### Shard 2/38

| Rank | Spec                      | Seconds | Executed / failed cases |
| ---: | ------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`       | 295.560 |                   5 / 0 |
|    2 | `phone-accept.spec.ts`    | 201.224 |                   2 / 0 |
|    3 | `journal-debrief.spec.ts` |  64.593 |                   3 / 0 |
|    4 | `f-events-reform.spec.ts` |  44.660 |                   2 / 0 |
|    5 | `f1-ocean.spec.ts`        |  40.117 |                   1 / 0 |
|    6 | `opening-framing.spec.ts` |  34.406 |                   3 / 0 |
|    7 | `f-perf-budget.spec.ts`   |  32.450 |                   1 / 0 |
|    8 | `globe-pins.spec.ts`      |  31.319 |                   1 / 0 |
|    9 | `f-bughunt-18.spec.ts`    |  31.203 |                   1 / 0 |
|   10 | `props.spec.ts`           |  31.139 |                   1 / 0 |
|   11 | `settings.spec.ts`        |  16.015 |                   2 / 0 |
|   12 | `f-title-layout.spec.ts`  |  15.815 |                   1 / 0 |
|   13 | `f-title-scene.spec.ts`   |  13.721 |                   1 / 0 |
|   14 | `f-a11y.spec.ts`          |   8.613 |                   1 / 0 |

#### Shard 3/38

| Rank | Spec                                     | Seconds | Executed / failed cases |
| ---: | ---------------------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`                      | 283.691 |                   7 / 0 |
|    2 | `phone-accept.spec.ts`                   | 243.529 |                   2 / 0 |
|    3 | `d2-predive.spec.ts`                     | 154.255 |                   1 / 0 |
|    4 | `props.spec.ts`                          | 113.283 |                   1 / 0 |
|    5 | `opening-framing.spec.ts`                | 104.973 |                   6 / 0 |
|    6 | `f-bughunt-960.spec.ts`                  |  86.350 |                   1 / 0 |
|    7 | `f2-life.spec.ts`                        |  56.949 |                   1 / 0 |
|    8 | `f2-modes.spec.ts`                       |  56.649 |                   1 / 0 |
|    9 | `f-perf-budget.spec.ts`                  |  33.211 |                   1 / 0 |
|   10 | `f-events-reform.spec.ts`                |  28.654 |                   1 / 0 |
|   11 | `journal-debrief.spec.ts`                |  14.210 |                   1 / 0 |
|   12 | `f2-explore.spec.ts`                     |   6.784 |                   1 / 0 |
|   13 | `f-verify-lander-firstdisc-1240.spec.ts` |   5.229 |                   1 / 0 |
|   14 | `settings.spec.ts`                       |   5.045 |                   1 / 0 |

#### Shard 4/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `phone-accept.spec.ts`       | 436.904 |                   1 / 0 |
|    2 | `f-fidelity-rollout.spec.ts` | 219.248 |                   1 / 0 |
|    3 | `opening-framing.spec.ts`    | 163.395 |                   7 / 0 |
|    4 | `f-perf-budget.spec.ts`      | 155.174 |                   2 / 0 |
|    5 | `hud-touch.spec.ts`          | 104.950 |                   5 / 0 |
|    6 | `f-title-layout.spec.ts`     |  99.728 |                   1 / 0 |
|    7 | `content-missions.spec.ts`   |  76.786 |                   1 / 0 |
|    8 | `f-text-diet.spec.ts`        |  42.116 |                   1 / 0 |
|    9 | `sub-playtest.spec.ts`       |  41.883 |                   1 / 0 |
|   10 | `f-bughunt-960.spec.ts`      |  33.409 |                   1 / 0 |
|   11 | `d-sonar.spec.ts`            |  24.386 |                   1 / 0 |
|   12 | `f2-life.spec.ts`            |  22.690 |                   1 / 0 |
|   13 | `f-verify-1000.spec.ts`      |  14.429 |                   1 / 0 |
|   14 | `settings.spec.ts`           |   7.301 |                   1 / 0 |
|   15 | `f2-explore.spec.ts`         |   6.970 |                   1 / 0 |

#### Shard 5/38

| Rank | Spec                          | Seconds | Executed / failed cases |
| ---: | ----------------------------- | ------: | ----------------------: |
|    1 | `phone-accept.spec.ts`        | 211.514 |                   1 / 0 |
|    2 | `f-fidelity-rollout.spec.ts`  | 204.723 |                   1 / 0 |
|    3 | `journal-debrief.spec.ts`     | 151.454 |                   3 / 0 |
|    4 | `f-verify-1000.spec.ts`       |  98.405 |                   2 / 0 |
|    5 | `hud-touch.spec.ts`           |  70.754 |                   4 / 0 |
|    6 | `f-content-fix.spec.ts`       |  62.283 |                   1 / 0 |
|    7 | `opening-framing.spec.ts`     |  58.006 |                   5 / 0 |
|    8 | `terrain-render.spec.ts`      |  52.738 |                   1 / 0 |
|    9 | `d-sonar.spec.ts`             |  36.034 |                   2 / 0 |
|   10 | `f-bughunt-960.spec.ts`       |  28.454 |                   1 / 0 |
|   11 | `presets.spec.ts`             |  22.249 |                   1 / 0 |
|   12 | `f-bluehole-squiggle.spec.ts` |  16.549 |                   1 / 0 |
|   13 | `f-a11y.spec.ts`              |   7.927 |                   1 / 0 |
|   14 | `f2-explore.spec.ts`          |   7.407 |                   1 / 0 |
|   15 | `f2-progress.spec.ts`         |   3.655 |                   1 / 0 |

#### Shard 6/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `f-fidelity-rollout.spec.ts` | 192.077 |                   2 / 0 |
|    2 | `phone-accept.spec.ts`       | 139.375 |                   1 / 0 |
|    3 | `f3-onboard.spec.ts`         | 130.824 |                   1 / 0 |
|    4 | `hud-touch.spec.ts`          |  82.906 |                   3 / 0 |
|    5 | `opening-framing.spec.ts`    |  79.342 |                   5 / 0 |
|    6 | `content-missions.spec.ts`   |  63.189 |                   1 / 0 |
|    7 | `d-scan.spec.ts`             |  46.972 |                   1 / 0 |
|    8 | `f-events-reform.spec.ts`    |  46.667 |                   1 / 0 |
|    9 | `f1-touch.spec.ts`           |  32.916 |                   1 / 0 |
|   10 | `terrain-render.spec.ts`     |  23.313 |                   1 / 0 |
|   11 | `f-title-layout.spec.ts`     |  20.708 |                   2 / 0 |
|   12 | `journal-debrief.spec.ts`    |  20.227 |                   1 / 0 |
|   13 | `presets.spec.ts`            |  19.518 |                   1 / 0 |
|   14 | `f-title-scene.spec.ts`      |  12.393 |                   2 / 0 |
|   15 | `f-verify-1000.spec.ts`      |  10.279 |                   1 / 0 |

#### Shard 7/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `phone-accept.spec.ts`       | 156.569 |                   1 / 0 |
|    2 | `f-fidelity-rollout.spec.ts` | 153.621 |                   1 / 0 |
|    3 | `hud-touch.spec.ts`          | 133.985 |                   5 / 0 |
|    4 | `settings.spec.ts`           | 112.049 |                   2 / 0 |
|    5 | `opening-framing.spec.ts`    | 107.186 |                   7 / 0 |
|    6 | `f-perf-budget.spec.ts`      |  60.023 |                   1 / 0 |
|    7 | `f-bughunt-880.spec.ts`      |  37.130 |                   1 / 1 |
|    8 | `d-currents.spec.ts`         |  37.030 |                   1 / 0 |
|    9 | `journal-debrief.spec.ts`    |  28.913 |                   2 / 0 |
|   10 | `f-events-reform.spec.ts`    |  22.527 |                   1 / 0 |
|   11 | `f-verify-1000.spec.ts`      |  20.443 |                   1 / 0 |
|   12 | `terrain-render.spec.ts`     |   9.271 |                   1 / 0 |
|   13 | `d-shell.spec.ts`            |   4.996 |                   1 / 0 |
|   14 | `d-modes.spec.ts`            |   3.166 |                   1 / 0 |

#### Shard 8/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `f-fidelity-rollout.spec.ts` | 126.153 |                   2 / 0 |
|    2 | `hud-touch.spec.ts`          |  82.283 |                   4 / 0 |
|    3 | `opening-framing.spec.ts`    |  75.017 |                   8 / 0 |
|    4 | `content-missions.spec.ts`   |  50.865 |                   1 / 0 |
|    5 | `f-bughunt-880.spec.ts`      |  45.519 |                   1 / 0 |
|    6 | `globe.spec.ts`              |  38.432 |                   1 / 0 |
|    7 | `d-photo.spec.ts`            |  27.202 |                   1 / 0 |
|    8 | `d-sonar.spec.ts`            |  25.382 |                   1 / 0 |
|    9 | `settings.spec.ts`           |  22.160 |                   2 / 0 |
|   10 | `journal-debrief.spec.ts`    |  14.342 |                   1 / 0 |
|   11 | `f1-touch.spec.ts`           |  13.417 |                   2 / 0 |
|   12 | `f2-explore.spec.ts`         |   3.473 |                   1 / 0 |
|   13 | `phone-accept.spec.ts`       |   2.628 |                   1 / 0 |

#### Shard 9/38

| Rank | Spec                      | Seconds | Executed / failed cases |
| ---: | ------------------------- | ------: | ----------------------: |
|    1 | `phone-accept.spec.ts`    |  92.275 |                   1 / 0 |
|    2 | `f2-modes.spec.ts`        |  91.594 |                   1 / 0 |
|    3 | `sub-playtest.spec.ts`    |  90.119 |                   1 / 0 |
|    4 | `hud-touch.spec.ts`       |  82.064 |                   3 / 0 |
|    5 | `opening-framing.spec.ts` |  71.015 |                   8 / 0 |
|    6 | `f-bughunt-960.spec.ts`   |  59.398 |                   2 / 0 |
|    7 | `d-start.spec.ts`         |  49.814 |                   1 / 0 |
|    8 | `f-content-fix.spec.ts`   |  42.235 |                   1 / 0 |
|    9 | `f-perf-budget.spec.ts`   |  38.481 |                   1 / 0 |
|   10 | `journal-debrief.spec.ts` |  30.759 |                   2 / 0 |
|   11 | `f2-life.spec.ts`         |  21.223 |                   1 / 0 |
|   12 | `f1-ocean.spec.ts`        |  12.311 |                   1 / 0 |
|   13 | `d-polish.spec.ts`        |  11.369 |                   1 / 0 |
|   14 | `settings.spec.ts`        |   5.030 |                   2 / 0 |

#### Shard 10/38

| Rank | Spec                       | Seconds | Executed / failed cases |
| ---: | -------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`        | 155.482 |                   5 / 0 |
|    2 | `phone-accept.spec.ts`     | 129.368 |                   1 / 0 |
|    3 | `d-polish.spec.ts`         | 116.091 |                   1 / 0 |
|    4 | `opening-framing.spec.ts`  |  95.033 |                   8 / 0 |
|    5 | `content-missions.spec.ts` |  89.361 |                   1 / 0 |
|    6 | `f-events-reform.spec.ts`  |  56.324 |                   2 / 0 |
|    7 | `f-bughunt-960.spec.ts`    |  53.201 |                   2 / 0 |
|    8 | `f-bughunt-880.spec.ts`    |  34.885 |                   1 / 0 |
|    9 | `d-sonar.spec.ts`          |  30.716 |                   1 / 0 |
|   10 | `atmosphere.spec.ts`       |  14.237 |                   1 / 0 |
|   11 | `d-shell.spec.ts`          |   5.717 |                   1 / 0 |
|   12 | `d2-predive.spec.ts`       |   4.319 |                   1 / 0 |
|   13 | `f2-progress.spec.ts`      |   2.413 |                   1 / 0 |

#### Shard 11/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`          | 218.454 |                   6 / 0 |
|    2 | `phone-accept.spec.ts`       | 200.465 |                   1 / 0 |
|    3 | `d2-camera.spec.ts`          | 168.612 |                   1 / 0 |
|    4 | `opening-framing.spec.ts`    | 125.346 |                   6 / 0 |
|    5 | `d-power.spec.ts`            | 109.874 |                   1 / 0 |
|    6 | `f1-fixes.spec.ts`           |  87.855 |                   1 / 0 |
|    7 | `f-title-layout.spec.ts`     |  59.360 |                   1 / 0 |
|    8 | `terrain-render.spec.ts`     |  55.754 |                   2 / 0 |
|    9 | `mission.spec.ts`            |  43.776 |                   1 / 0 |
|   10 | `f-first-minute-620.spec.ts` |  40.392 |                   2 / 0 |
|   11 | `journal-debrief.spec.ts`    |  18.797 |                   1 / 0 |
|   12 | `f-title-scene.spec.ts`      |  17.202 |                   1 / 0 |
|   13 | `settings.spec.ts`           |  10.028 |                   1 / 0 |
|   14 | `f-bughunt-18.spec.ts`       |   7.546 |                   1 / 0 |

#### Shard 12/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `f-fidelity-rollout.spec.ts` | 104.687 |                   1 / 0 |
|    2 | `f2-explore.spec.ts`         |  70.351 |                   1 / 0 |
|    3 | `opening-framing.spec.ts`    |  69.819 |                   6 / 0 |
|    4 | `d2-hazard.spec.ts`          |  43.055 |                   1 / 0 |
|    5 | `journal-debrief.spec.ts`    |  42.140 |                   2 / 0 |
|    6 | `hud-touch.spec.ts`          |  31.893 |                   2 / 0 |
|    7 | `f-verify-1000.spec.ts`      |  30.780 |                   2 / 0 |
|    8 | `f-bughunt-880.spec.ts`      |  23.758 |                   1 / 0 |
|    9 | `helpers/titleAudit.ts`      |  19.076 |                   1 / 0 |
|   10 | `f-first-minute-620.spec.ts` |  14.677 |                   1 / 0 |
|   11 | `globe.spec.ts`              |  12.931 |                   1 / 0 |
|   12 | `f-bughunt-960.spec.ts`      |  12.864 |                   1 / 0 |
|   13 | `f3-onboard.spec.ts`         |   5.948 |                   1 / 0 |
|   14 | `settings.spec.ts`           |   5.404 |                   1 / 0 |
|   15 | `d-scan.spec.ts`             |   4.599 |                   1 / 0 |

#### Shard 13/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`          | 348.167 |                   6 / 0 |
|    2 | `f-fidelity-rollout.spec.ts` | 199.844 |                   1 / 0 |
|    3 | `f1-touch.spec.ts`           | 178.607 |                   2 / 0 |
|    4 | `phone-accept.spec.ts`       | 163.786 |                   1 / 0 |
|    5 | `f2-life.spec.ts`            | 113.048 |                   1 / 0 |
|    6 | `journal-debrief.spec.ts`    |  86.620 |                   3 / 0 |
|    7 | `f-perf-budget.spec.ts`      |  49.872 |                   1 / 0 |
|    8 | `opening-framing.spec.ts`    |  38.426 |                   4 / 0 |
|    9 | `d-photo.spec.ts`            |  32.649 |                   1 / 0 |
|   10 | `d-sonar.spec.ts`            |  23.738 |                   1 / 0 |
|   11 | `helpers/titleAudit.ts`      |  11.782 |                   1 / 0 |
|   12 | `f2-progress.spec.ts`        |  11.362 |                   1 / 0 |
|   13 | `f2-modes.spec.ts`           |   9.357 |                   1 / 0 |
|   14 | `f-title-scene.spec.ts`      |   8.864 |                   1 / 0 |
|   15 | `d-shell.spec.ts`            |   5.942 |                   1 / 0 |

#### Shard 14/38

| Rank | Spec                      | Seconds | Executed / failed cases |
| ---: | ------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`       | 262.810 |                   4 / 0 |
|    2 | `opening-framing.spec.ts` | 211.190 |                   8 / 0 |
|    3 | `f2-life.spec.ts`         |  49.784 |                   1 / 0 |
|    4 | `f-copy-regress.spec.ts`  |  45.749 |                   1 / 0 |
|    5 | `f1-ocean.spec.ts`        |  44.241 |                   1 / 0 |
|    6 | `f-bughunt-18.spec.ts`    |  24.740 |                   1 / 0 |
|    7 | `presets.spec.ts`         |  17.971 |                   1 / 0 |
|    8 | `d-sonar.spec.ts`         |  17.683 |                   1 / 0 |
|    9 | `f-verify-1000.spec.ts`   |  15.016 |                   1 / 0 |
|   10 | `f-title-layout.spec.ts`  |  11.827 |                   1 / 0 |
|   11 | `sub-playtest.spec.ts`    |   8.065 |                   1 / 0 |
|   12 | `journal-debrief.spec.ts` |   7.206 |                   1 / 0 |
|   13 | `globe-pins.spec.ts`      |   4.387 |                   1 / 0 |
|   14 | `settings.spec.ts`        |   4.012 |                   1 / 0 |
|   15 | `phone-accept.spec.ts`    |   3.849 |                   1 / 0 |

#### Shard 15/38

| Rank | Spec                       | Seconds | Executed / failed cases |
| ---: | -------------------------- | ------: | ----------------------: |
|    1 | `journal-debrief.spec.ts`  |  91.032 |                   2 / 0 |
|    2 | `phone-accept.spec.ts`     |  74.365 |                   1 / 0 |
|    3 | `f-bughunt-960.spec.ts`    |  60.499 |                   2 / 0 |
|    4 | `opening-framing.spec.ts`  |  59.983 |                   7 / 0 |
|    5 | `terrain-render.spec.ts`   |  58.060 |                   2 / 0 |
|    6 | `globe.spec.ts`            |  44.716 |                   1 / 0 |
|    7 | `content-missions.spec.ts` |  37.484 |                   1 / 0 |
|    8 | `f3-onboard.spec.ts`       |  36.866 |                   1 / 0 |
|    9 | `f1-ocean.spec.ts`         |  34.417 |                   1 / 0 |
|   10 | `f-briefing-900.spec.ts`   |  18.521 |                   1 / 0 |
|   11 | `d2-predive.spec.ts`       |  16.847 |                   1 / 0 |
|   12 | `f-title-scene.spec.ts`    |   8.981 |                   1 / 0 |
|   13 | `f-text-diet.spec.ts`      |   6.438 |                   1 / 0 |
|   14 | `f2-progress.spec.ts`      |   5.726 |                   1 / 0 |
|   15 | `d-scan.spec.ts`           |   3.942 |                   1 / 0 |

#### Shard 16/38

| Rank | Spec                       | Seconds | Executed / failed cases |
| ---: | -------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`        | 257.938 |                   7 / 0 |
|    2 | `d2-camera.spec.ts`        | 126.261 |                   1 / 0 |
|    3 | `opening-framing.spec.ts`  | 103.184 |                   7 / 0 |
|    4 | `phone-accept.spec.ts`     |  96.085 |                   1 / 0 |
|    5 | `mission.spec.ts`          |  87.408 |                   1 / 0 |
|    6 | `content-missions.spec.ts` |  54.854 |                   1 / 0 |
|    7 | `helpers/titleAudit.ts`    |  36.463 |                   1 / 0 |
|    8 | `journal-debrief.spec.ts`  |  35.954 |                   2 / 0 |
|    9 | `f-text-diet.spec.ts`      |  28.332 |                   1 / 0 |
|   10 | `f-events-reform.spec.ts`  |  22.519 |                   1 / 0 |
|   11 | `f-title-audit.spec.ts`    |   8.603 |                   1 / 0 |
|   12 | `settings.spec.ts`         |   7.446 |                   1 / 0 |
|   13 | `d-scan.spec.ts`           |   2.662 |                   1 / 0 |

#### Shard 17/38

| Rank | Spec                                     | Seconds | Executed / failed cases |
| ---: | ---------------------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`                      | 190.224 |                   5 / 0 |
|    2 | `f-bluehole-1030.spec.ts`                | 148.820 |                   1 / 0 |
|    3 | `phone-accept.spec.ts`                   | 125.323 |                   1 / 0 |
|    4 | `opening-framing.spec.ts`                | 106.266 |                   7 / 0 |
|    5 | `settings.spec.ts`                       |  61.827 |                   1 / 0 |
|    6 | `f-bughunt-960.spec.ts`                  |  56.986 |                   2 / 0 |
|    7 | `f1-ocean.spec.ts`                       |  28.071 |                   1 / 0 |
|    8 | `f-verify-1000.spec.ts`                  |  23.742 |                   1 / 0 |
|    9 | `sub-playtest.spec.ts`                   |  19.472 |                   1 / 0 |
|   10 | `journal-debrief.spec.ts`                |  17.181 |                   1 / 0 |
|   11 | `terrain-render.spec.ts`                 |  17.024 |                   1 / 0 |
|   12 | `globe-pins.spec.ts`                     |   5.968 |                   1 / 0 |
|   13 | `f-verify-lander-firstdisc-1240.spec.ts` |   5.190 |                   1 / 0 |
|   14 | `f-briefing-900.spec.ts`                 |   2.734 |                   1 / 0 |
|   15 | `f-rebrand-bathyline.spec.ts`            |   1.422 |                   1 / 0 |

#### Shard 18/38

| Rank | Spec                      | Seconds | Executed / failed cases |
| ---: | ------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`       | 527.589 |                   6 / 0 |
|    2 | `f1-touch.spec.ts`        | 216.987 |                   1 / 0 |
|    3 | `settings.spec.ts`        | 145.481 |                   2 / 0 |
|    4 | `phone-accept.spec.ts`    | 138.677 |                   1 / 0 |
|    5 | `journal-debrief.spec.ts` | 112.020 |                   2 / 0 |
|    6 | `f-bughunt-960.spec.ts`   |  90.834 |                   1 / 0 |
|    7 | `opening-framing.spec.ts` |  56.907 |                   5 / 0 |
|    8 | `f1-vehicles.spec.ts`     |  49.644 |                   1 / 0 |
|    9 | `f-events-reform.spec.ts` |  29.278 |                   1 / 0 |
|   10 | `f-bughunt-9-pwa.spec.ts` |  22.695 |                   1 / 0 |
|   11 | `f-arcade-access.spec.ts` |  20.451 |                   1 / 0 |
|   12 | `f3-onboard.spec.ts`      |  12.779 |                   1 / 0 |
|   13 | `f-title-scene.spec.ts`   |  10.778 |                   1 / 0 |
|   14 | `globe-pins.spec.ts`      |   7.127 |                   1 / 0 |
|   15 | `d-shell.spec.ts`         |   4.833 |                   1 / 0 |

#### Shard 19/38

| Rank | Spec                      | Seconds | Executed / failed cases |
| ---: | ------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`       | 312.164 |                   4 / 0 |
|    2 | `opening-framing.spec.ts` | 160.045 |                   7 / 0 |
|    3 | `journal-debrief.spec.ts` | 141.736 |                   3 / 0 |
|    4 | `phone-accept.spec.ts`    | 109.142 |                   1 / 0 |
|    5 | `f-bughunt-880.spec.ts`   |  75.852 |                   1 / 0 |
|    6 | `d2-predive.spec.ts`      |  60.411 |                   1 / 0 |
|    7 | `terrain-render.spec.ts`  |  40.048 |                   2 / 0 |
|    8 | `presets.spec.ts`         |  31.179 |                   1 / 0 |
|    9 | `f-title-scene.spec.ts`   |  29.446 |                   1 / 0 |
|   10 | `f3-audio.spec.ts`        |  24.726 |                   1 / 0 |
|   11 | `f-a11y.spec.ts`          |  13.220 |                   1 / 0 |
|   12 | `f2-explore.spec.ts`      |   6.332 |                   1 / 0 |
|   13 | `globe-pins.spec.ts`      |   4.488 |                   1 / 0 |
|   14 | `smoke.spec.ts`           |   1.779 |                   1 / 0 |

#### Shard 20/38

| Rank | Spec                      | Seconds | Executed / failed cases |
| ---: | ------------------------- | ------: | ----------------------: |
|    1 | `f-save-soak.spec.ts`     | 114.429 |                   1 / 0 |
|    2 | `hud-touch.spec.ts`       |  83.852 |                   3 / 0 |
|    3 | `opening-framing.spec.ts` |  69.174 |                   6 / 0 |
|    4 | `presets.spec.ts`         |  65.195 |                   1 / 0 |
|    5 | `phone-accept.spec.ts`    |  61.667 |                   1 / 0 |
|    6 | `f-content-fix.spec.ts`   |  57.022 |                   1 / 0 |
|    7 | `journal-debrief.spec.ts` |  50.601 |                   3 / 0 |
|    8 | `f-bughunt-880.spec.ts`   |  34.062 |                   1 / 0 |
|    9 | `f-verify-1000.spec.ts`   |  33.405 |                   2 / 0 |
|   10 | `f-events-reform.spec.ts` |  17.405 |                   1 / 0 |
|   11 | `d-sonar.spec.ts`         |  15.246 |                   1 / 0 |
|   12 | `f1-ocean.spec.ts`        |  14.284 |                   1 / 0 |
|   13 | `settings.spec.ts`        |   9.750 |                   2 / 0 |
|   14 | `f2-explore.spec.ts`      |   6.950 |                   1 / 0 |
|   15 | `f-a11y.spec.ts`          |   3.896 |                   1 / 0 |

#### Shard 21/38

| Rank | Spec                                     | Seconds | Executed / failed cases |
| ---: | ---------------------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`                      | 189.652 |                   6 / 0 |
|    2 | `f-fidelity-rollout.spec.ts`             |  95.017 |                   1 / 0 |
|    3 | `presets.spec.ts`                        |  73.965 |                   2 / 0 |
|    4 | `opening-framing.spec.ts`                |  54.422 |                   5 / 0 |
|    5 | `f-bughunt-960.spec.ts`                  |  43.634 |                   1 / 0 |
|    6 | `d-shell.spec.ts`                        |  27.983 |                   1 / 0 |
|    7 | `journal-debrief.spec.ts`                |  27.570 |                   2 / 0 |
|    8 | `d-sonar.spec.ts`                        |  20.926 |                   1 / 0 |
|    9 | `f-title-layout.spec.ts`                 |  10.582 |                   1 / 0 |
|   10 | `f3-audio.spec.ts`                       |   9.893 |                   1 / 0 |
|   11 | `f-verify-lander-firstdisc-1240.spec.ts` |   7.409 |                   1 / 0 |
|   12 | `helpers/titleAudit.ts`                  |   7.178 |                   1 / 0 |
|   13 | `phone-accept.spec.ts`                   |   2.665 |                   1 / 0 |
|   14 | `f-title-scene.spec.ts`                  |   2.638 |                   1 / 0 |
|   15 | `settings.spec.ts`                       |   2.122 |                   1 / 0 |

#### Shard 22/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`          | 200.895 |                   5 / 0 |
|    2 | `f-fidelity-rollout.spec.ts` | 168.437 |                   1 / 0 |
|    3 | `f-bughunt-18.spec.ts`       | 109.584 |                   1 / 0 |
|    4 | `journal-debrief.spec.ts`    |  92.237 |                   3 / 0 |
|    5 | `f-content-fix.spec.ts`      |  73.298 |                   1 / 0 |
|    6 | `opening-framing.spec.ts`    |  72.770 |                   4 / 0 |
|    7 | `f-perf-budget.spec.ts`      |  51.216 |                   1 / 0 |
|    8 | `terrain-render.spec.ts`     |  37.383 |                   1 / 0 |
|    9 | `smoke.spec.ts`              |  27.725 |                   1 / 0 |
|   10 | `f3-onboard.spec.ts`         |  26.511 |                   1 / 0 |
|   11 | `f-bughunt-960.spec.ts`      |  22.515 |                   1 / 0 |
|   12 | `f-endurance-1180.spec.ts`   |  17.777 |                   1 / 0 |
|   13 | `f-verify-1000.spec.ts`      |  17.473 |                   1 / 0 |
|   14 | `globe-pins.spec.ts`         |   6.576 |                   1 / 0 |
|   15 | `phone-accept.spec.ts`       |   2.375 |                   1 / 0 |

#### Shard 23/38

| Rank | Spec                                     | Seconds | Executed / failed cases |
| ---: | ---------------------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`                      | 174.346 |                   6 / 0 |
|    2 | `f-fidelity-rollout.spec.ts`             | 113.744 |                   1 / 0 |
|    3 | `content-missions.spec.ts`               |  74.839 |                   1 / 0 |
|    4 | `f-bughunt-960.spec.ts`                  |  44.071 |                   1 / 0 |
|    5 | `opening-framing.spec.ts`                |  35.498 |                   4 / 0 |
|    6 | `journal-debrief.spec.ts`                |  30.543 |                   3 / 0 |
|    7 | `terrain-render.spec.ts`                 |  27.484 |                   1 / 0 |
|    8 | `f-perf-budget.spec.ts`                  |  24.502 |                   1 / 0 |
|    9 | `d2-hazard.spec.ts`                      |  16.303 |                   1 / 0 |
|   10 | `settings.spec.ts`                       |  13.812 |                   1 / 0 |
|   11 | `f-first-minute-620.spec.ts`             |   9.561 |                   1 / 0 |
|   12 | `f-verify-1000.spec.ts`                  |   5.429 |                   1 / 0 |
|   13 | `f-rebrand-bathyline.spec.ts`            |   4.073 |                   1 / 0 |
|   14 | `phone-accept.spec.ts`                   |   3.797 |                   1 / 0 |
|   15 | `f-verify-lander-firstdisc-1240.spec.ts` |   3.519 |                   1 / 0 |

#### Shard 24/38

| Rank | Spec                       | Seconds | Executed / failed cases |
| ---: | -------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`        | 200.629 |                   3 / 0 |
|    2 | `opening-framing.spec.ts`  | 134.180 |                   6 / 0 |
|    3 | `d-start.spec.ts`          | 106.368 |                   1 / 0 |
|    4 | `journal-debrief.spec.ts`  | 102.856 |                   4 / 0 |
|    5 | `mission.spec.ts`          | 100.811 |                   1 / 0 |
|    6 | `f-verify-1000.spec.ts`    |  92.226 |                   2 / 0 |
|    7 | `content-missions.spec.ts` |  70.709 |                   1 / 0 |
|    8 | `presets.spec.ts`          |  21.926 |                   1 / 0 |
|    9 | `f-bughunt-18.spec.ts`     |  17.928 |                   1 / 0 |
|   10 | `phone-accept.spec.ts`     |  16.885 |                   1 / 0 |
|   11 | `d-sonar.spec.ts`          |  16.394 |                   1 / 0 |
|   12 | `f-title-scene.spec.ts`    |  10.458 |                   2 / 0 |
|   13 | `settings.spec.ts`         |   8.821 |                   1 / 0 |
|   14 | `helpers/titleAudit.ts`    |   3.673 |                   1 / 0 |

#### Shard 25/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `phone-accept.spec.ts`       | 178.723 |                   1 / 0 |
|    2 | `hud-touch.spec.ts`          | 158.463 |                   5 / 0 |
|    3 | `settings.spec.ts`           | 150.143 |                   1 / 0 |
|    4 | `opening-framing.spec.ts`    | 100.355 |                   6 / 0 |
|    5 | `f-bughunt-960.spec.ts`      |  99.261 |                   1 / 0 |
|    6 | `content-missions.spec.ts`   |  77.233 |                   1 / 0 |
|    7 | `f-perf-budget.spec.ts`      |  57.000 |                   1 / 0 |
|    8 | `d-input-hud.spec.ts`        |  56.527 |                   1 / 0 |
|    9 | `f-fidelity-rollout.spec.ts` |  42.523 |                   1 / 0 |
|   10 | `f-events-reform.spec.ts`    |  41.363 |                   1 / 0 |
|   11 | `terrain-render.spec.ts`     |  38.838 |                   2 / 0 |
|   12 | `d-sonar.spec.ts`            |  32.684 |                   1 / 0 |
|   13 | `f-verify-1000.spec.ts`      |  29.594 |                   2 / 0 |
|   14 | `f-briefing-900.spec.ts`     |   6.563 |                   1 / 0 |
|   15 | `journal-debrief.spec.ts`    |   2.797 |                   1 / 0 |

#### Shard 26/38

| Rank | Spec                                     | Seconds | Executed / failed cases |
| ---: | ---------------------------------------- | ------: | ----------------------: |
|    1 | `phone-accept.spec.ts`                   | 356.017 |                   1 / 0 |
|    2 | `hud-touch.spec.ts`                      | 323.075 |                   6 / 0 |
|    3 | `f-briefing-900.spec.ts`                 | 123.372 |                   1 / 0 |
|    4 | `opening-framing.spec.ts`                |  95.804 |                   6 / 0 |
|    5 | `journal-debrief.spec.ts`                |  79.066 |                   2 / 0 |
|    6 | `d-shell.spec.ts`                        |  70.364 |                   1 / 0 |
|    7 | `f-content-fix.spec.ts`                  |  57.665 |                   1 / 0 |
|    8 | `f2-life.spec.ts`                        |  37.963 |                   1 / 0 |
|    9 | `f-verify-1000.spec.ts`                  |  23.156 |                   1 / 0 |
|   10 | `d2-predive.spec.ts`                     |  14.581 |                   1 / 0 |
|   11 | `sub-playtest.spec.ts`                   |  12.341 |                   1 / 0 |
|   12 | `f-title-scene.spec.ts`                  |  10.184 |                   1 / 0 |
|   13 | `f-a11y.spec.ts`                         |   9.341 |                   1 / 0 |
|   14 | `f-verify-lander-firstdisc-1240.spec.ts` |   6.462 |                   1 / 0 |
|   15 | `settings.spec.ts`                       |   3.297 |                   1 / 0 |

#### Shard 27/38

| Rank | Spec                      | Seconds | Executed / failed cases |
| ---: | ------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`       | 398.315 |                   6 / 0 |
|    2 | `phone-accept.spec.ts`    | 259.900 |                   1 / 0 |
|    3 | `f3-onboard.spec.ts`      | 134.113 |                   1 / 0 |
|    4 | `opening-framing.spec.ts` |  83.552 |                   4 / 0 |
|    5 | `d-sonar.spec.ts`         |  72.796 |                   1 / 0 |
|    6 | `f2-life.spec.ts`         |  65.241 |                   2 / 0 |
|    7 | `journal-debrief.spec.ts` |  54.817 |                   2 / 0 |
|    8 | `f-perf-budget.spec.ts`   |  52.010 |                   1 / 0 |
|    9 | `terrain-render.spec.ts`  |  38.107 |                   2 / 0 |
|   10 | `f2-progress.spec.ts`     |  35.921 |                   1 / 0 |
|   11 | `f-verify-1000.spec.ts`   |  29.812 |                   1 / 0 |
|   12 | `f-title-scene.spec.ts`   |  10.854 |                   1 / 0 |
|   13 | `globe-pins.spec.ts`      |   5.977 |                   1 / 0 |
|   14 | `f-bughunt-18.spec.ts`    |   5.303 |                   1 / 0 |
|   15 | `f-a11y.spec.ts`          |   3.283 |                   1 / 0 |

#### Shard 28/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `f-fidelity-rollout.spec.ts` | 212.659 |                   2 / 0 |
|    2 | `phone-accept.spec.ts`       |  88.400 |                   1 / 0 |
|    3 | `opening-framing.spec.ts`    |  75.601 |                   7 / 0 |
|    4 | `f-bughunt-960.spec.ts`      |  63.087 |                   2 / 0 |
|    5 | `journal-debrief.spec.ts`    |  58.757 |                   2 / 0 |
|    6 | `f-content-fix.spec.ts`      |  35.778 |                   1 / 0 |
|    7 | `f-perf-budget.spec.ts`      |  24.142 |                   1 / 0 |
|    8 | `f-bughunt-880.spec.ts`      |  23.511 |                   1 / 0 |
|    9 | `d-shell.spec.ts`            |  21.356 |                   1 / 0 |
|   10 | `f-events-reform.spec.ts`    |  14.638 |                   1 / 0 |
|   11 | `f-first-minute-620.spec.ts` |  13.611 |                   1 / 0 |
|   12 | `hud-touch.spec.ts`          |  12.450 |                   2 / 0 |
|   13 | `d-input-hud.spec.ts`        |   7.929 |                   1 / 0 |
|   14 | `f2-explore.spec.ts`         |   5.556 |                   1 / 0 |
|   15 | `d-photo.spec.ts`            |   4.169 |                   1 / 0 |

#### Shard 29/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`          | 245.926 |                   7 / 0 |
|    2 | `f3-audio.spec.ts`           | 106.512 |                   1 / 0 |
|    3 | `f-bughunt-960.spec.ts`      |  89.031 |                   2 / 0 |
|    4 | `f1-fixes.spec.ts`           |  83.478 |                   1 / 0 |
|    5 | `f-content-fix.spec.ts`      |  54.999 |                   1 / 0 |
|    6 | `opening-framing.spec.ts`    |  54.344 |                   5 / 0 |
|    7 | `f-briefing-900.spec.ts`     |  35.853 |                   1 / 0 |
|    8 | `terrain-render.spec.ts`     |  32.447 |                   2 / 0 |
|    9 | `f-title-layout.spec.ts`     |  15.282 |                   1 / 0 |
|   10 | `f-first-minute-620.spec.ts` |  12.793 |                   1 / 0 |
|   11 | `f-title-scene.spec.ts`      |   8.998 |                   2 / 0 |
|   12 | `f2-explore.spec.ts`         |   8.929 |                   1 / 0 |
|   13 | `phone-accept.spec.ts`       |   3.576 |                   1 / 0 |

#### Shard 30/38

| Rank | Spec                          | Seconds | Executed / failed cases |
| ---: | ----------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`           | 241.437 |                   6 / 0 |
|    2 | `phone-accept.spec.ts`        | 162.661 |                   1 / 0 |
|    3 | `f3-onboard.spec.ts`          | 147.142 |                   2 / 0 |
|    4 | `f1-fixes.spec.ts`            | 138.295 |                   1 / 0 |
|    5 | `opening-framing.spec.ts`     | 131.710 |                   7 / 0 |
|    6 | `terrain-render.spec.ts`      | 131.356 |                   3 / 0 |
|    7 | `f-fidelity-rollout.spec.ts`  |  61.172 |                   1 / 0 |
|    8 | `f-text-diet.spec.ts`         |  24.131 |                   1 / 0 |
|    9 | `f1-ocean.spec.ts`            |  24.000 |                   1 / 0 |
|   10 | `d-sonar.spec.ts`             |  18.384 |                   1 / 0 |
|   11 | `d-shell.spec.ts`             |   5.710 |                   1 / 0 |
|   12 | `f-rebrand-bathyline.spec.ts` |   2.916 |                   1 / 0 |

#### Shard 31/38

| Rank | Spec                                     | Seconds | Executed / failed cases |
| ---: | ---------------------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`                      | 495.361 |                   7 / 0 |
|    2 | `f3-onboard.spec.ts`                     | 210.606 |                   1 / 0 |
|    3 | `phone-accept.spec.ts`                   | 179.056 |                   1 / 0 |
|    4 | `journal-debrief.spec.ts`                | 161.503 |                   2 / 0 |
|    5 | `opening-framing.spec.ts`                |  74.834 |                   6 / 0 |
|    6 | `globe.spec.ts`                          |  56.879 |                   1 / 0 |
|    7 | `f-fidelity-rollout.spec.ts`             |  55.482 |                   1 / 0 |
|    8 | `presets.spec.ts`                        |  39.867 |                   1 / 0 |
|    9 | `f-events-reform.spec.ts`                |  31.321 |                   1 / 0 |
|   10 | `f-title-scene.spec.ts`                  |  22.887 |                   1 / 0 |
|   11 | `f1-ocean.spec.ts`                       |  21.655 |                   1 / 0 |
|   12 | `f2-explore.spec.ts`                     |  18.577 |                   2 / 0 |
|   13 | `f-verify-lander-firstdisc-1240.spec.ts` |   4.737 |                   1 / 0 |

#### Shard 32/38

| Rank | Spec                       | Seconds | Executed / failed cases |
| ---: | -------------------------- | ------: | ----------------------: |
|    1 | `f-beebe-plumes.spec.ts`   | 164.800 |                   1 / 0 |
|    2 | `d-modes.spec.ts`          | 121.233 |                   1 / 0 |
|    3 | `phone-accept.spec.ts`     |  88.805 |                   1 / 0 |
|    4 | `d-input-hud.spec.ts`      |  75.397 |                   2 / 0 |
|    5 | `opening-framing.spec.ts`  |  69.126 |                   4 / 0 |
|    6 | `props.spec.ts`            |  49.862 |                   1 / 0 |
|    7 | `content-missions.spec.ts` |  46.805 |                   1 / 0 |
|    8 | `hud-touch.spec.ts`        |  31.469 |                   2 / 0 |
|    9 | `helpers/titleAudit.ts`    |  31.252 |                   1 / 0 |
|   10 | `sub-playtest.spec.ts`     |  30.731 |                   1 / 0 |
|   11 | `d-sonar.spec.ts`          |  24.018 |                   1 / 0 |
|   12 | `presets.spec.ts`          |  23.433 |                   1 / 0 |
|   13 | `f-verify-1000.spec.ts`    |  18.277 |                   1 / 0 |
|   14 | `journal-debrief.spec.ts`  |  17.398 |                   1 / 0 |
|   15 | `f2-explore.spec.ts`       |  13.128 |                   2 / 0 |

#### Shard 33/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`          | 435.254 |                   7 / 0 |
|    2 | `phone-accept.spec.ts`       | 226.610 |                   1 / 0 |
|    3 | `f-fidelity-rollout.spec.ts` | 143.503 |                   1 / 0 |
|    4 | `opening-framing.spec.ts`    | 133.693 |                   7 / 0 |
|    5 | `terrain-render.spec.ts`     |  75.562 |                   2 / 0 |
|    6 | `content-missions.spec.ts`   |  75.386 |                   1 / 0 |
|    7 | `smoke.spec.ts`              |  60.586 |                   1 / 0 |
|    8 | `f-verify-1000.spec.ts`      |  49.152 |                   1 / 0 |
|    9 | `journal-debrief.spec.ts`    |  47.902 |                   1 / 0 |
|   10 | `f-copy-regress.spec.ts`     |  13.627 |                   1 / 0 |
|   11 | `mission.spec.ts`            |  12.422 |                   1 / 0 |
|   12 | `d-currents.spec.ts`         |  11.977 |                   1 / 0 |
|   13 | `d-scan.spec.ts`             |   3.045 |                   1 / 0 |

#### Shard 34/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `f-fidelity-rollout.spec.ts` | 109.641 |                   1 / 0 |
|    2 | `phone-accept.spec.ts`       |  99.855 |                   1 / 0 |
|    3 | `f-briefing-900.spec.ts`     |  99.765 |                   1 / 0 |
|    4 | `f3-onboard.spec.ts`         |  93.072 |                   2 / 0 |
|    5 | `journal-debrief.spec.ts`    |  92.511 |                   2 / 0 |
|    6 | `f2-explore.spec.ts`         |  87.035 |                   1 / 0 |
|    7 | `f2-modes.spec.ts`           |  75.387 |                   1 / 0 |
|    8 | `content-missions.spec.ts`   |  62.881 |                   1 / 0 |
|    9 | `opening-framing.spec.ts`    |  55.770 |                   5 / 0 |
|   10 | `hud-touch.spec.ts`          |  50.262 |                   3 / 0 |
|   11 | `terrain-render.spec.ts`     |  37.075 |                   2 / 0 |
|   12 | `f-events-reform.spec.ts`    |  25.118 |                   1 / 0 |
|   13 | `f-endurance-1180.spec.ts`   |  24.561 |                   1 / 0 |
|   14 | `presets.spec.ts`            |  19.084 |                   1 / 0 |
|   15 | `globe-pins.spec.ts`         |   5.468 |                   1 / 0 |

#### Shard 35/38

| Rank | Spec                                     | Seconds | Executed / failed cases |
| ---: | ---------------------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`                      | 285.338 |                   7 / 0 |
|    2 | `f3-onboard.spec.ts`                     | 113.305 |                   1 / 0 |
|    3 | `f-bughunt-880.spec.ts`                  | 111.636 |                   2 / 0 |
|    4 | `d-scan.spec.ts`                         |  64.346 |                   3 / 0 |
|    5 | `opening-framing.spec.ts`                |  58.984 |                   4 / 0 |
|    6 | `f-events-reform.spec.ts`                |  30.470 |                   1 / 0 |
|    7 | `f-bughunt-960.spec.ts`                  |  25.822 |                   1 / 0 |
|    8 | `f-verify-1000.spec.ts`                  |  15.155 |                   1 / 0 |
|    9 | `terrain-render.spec.ts`                 |  14.249 |                   1 / 0 |
|   10 | `sub-playtest.spec.ts`                   |   9.066 |                   1 / 0 |
|   11 | `f-endurance-1180.spec.ts`               |   8.626 |                   1 / 0 |
|   12 | `f-verify-lander-firstdisc-1240.spec.ts` |   5.337 |                   1 / 0 |
|   13 | `phone-accept.spec.ts`                   |   3.504 |                   1 / 0 |
|   14 | `settings.spec.ts`                       |   3.032 |                   1 / 0 |

#### Shard 36/38

| Rank | Spec                          | Seconds | Executed / failed cases |
| ---: | ----------------------------- | ------: | ----------------------: |
|    1 | `hud-touch.spec.ts`           | 351.092 |                   6 / 0 |
|    2 | `phone-accept.spec.ts`        | 135.781 |                   1 / 0 |
|    3 | `opening-framing.spec.ts`     | 130.018 |                   5 / 0 |
|    4 | `d-sonar.spec.ts`             | 116.829 |                   1 / 0 |
|    5 | `f1-touch.spec.ts`            | 116.539 |                   1 / 0 |
|    6 | `mission.spec.ts`             |  85.576 |                   1 / 0 |
|    7 | `journal-debrief.spec.ts`     |  81.872 |                   2 / 0 |
|    8 | `f-bughunt-960.spec.ts`       |  65.815 |                   1 / 0 |
|    9 | `f3-audio.spec.ts`            |  35.759 |                   1 / 0 |
|   10 | `f-arcade-access.spec.ts`     |  33.528 |                   1 / 0 |
|   11 | `f-title-scene.spec.ts`       |  24.477 |                   1 / 0 |
|   12 | `f-text-diet.spec.ts`         |  21.444 |                   1 / 0 |
|   13 | `f-title-layout.spec.ts`      |  16.857 |                   1 / 0 |
|   14 | `d-scan.spec.ts`              |   4.959 |                   1 / 0 |
|   15 | `f-rebrand-bathyline.spec.ts` |   2.586 |                   1 / 0 |

#### Shard 37/38

| Rank | Spec                         | Seconds | Executed / failed cases |
| ---: | ---------------------------- | ------: | ----------------------: |
|    1 | `opening-framing.spec.ts`    | 129.663 |                   7 / 0 |
|    2 | `hud-touch.spec.ts`          |  77.591 |                   4 / 0 |
|    3 | `phone-accept.spec.ts`       |  61.301 |                   1 / 0 |
|    4 | `helpers/titleAudit.ts`      |  58.649 |                   1 / 0 |
|    5 | `f2-explore.spec.ts`         |  54.457 |                   1 / 0 |
|    6 | `f2-life.spec.ts`            |  40.255 |                   2 / 0 |
|    7 | `journal-debrief.spec.ts`    |  29.467 |                   1 / 0 |
|    8 | `f-fidelity-rollout.spec.ts` |  20.348 |                   1 / 0 |
|    9 | `f-events-reform.spec.ts`    |  14.642 |                   1 / 0 |
|   10 | `terrain-render.spec.ts`     |  12.544 |                   1 / 0 |
|   11 | `f-verify-1000.spec.ts`      |   7.781 |                   1 / 0 |
|   12 | `d-shell.spec.ts`            |   6.471 |                   1 / 0 |
|   13 | `f2-modes.spec.ts`           |   6.464 |                   2 / 0 |
|   14 | `d-scan.spec.ts`             |   4.345 |                   1 / 0 |
|   15 | `globe-pins.spec.ts`         |   3.454 |                   1 / 0 |

#### Shard 38/38

| Rank | Spec                          | Seconds | Executed / failed cases |
| ---: | ----------------------------- | ------: | ----------------------: |
|    1 | `f2-explore.spec.ts`          | 211.558 |                   2 / 0 |
|    2 | `hud-touch.spec.ts`           | 168.816 |                   5 / 0 |
|    3 | `f1-fixes.spec.ts`            | 107.587 |                   1 / 0 |
|    4 | `content-missions.spec.ts`    |  73.835 |                   1 / 0 |
|    5 | `f-lowtier-followups.spec.ts` |  51.984 |                   2 / 0 |
|    6 | `f1-touch.spec.ts`            |  45.511 |                   2 / 0 |
|    7 | `opening-framing.spec.ts`     |  45.133 |                   3 / 0 |
|    8 | `f-briefing-900.spec.ts`      |  41.775 |                   1 / 0 |
|    9 | `f-bughunt-960.spec.ts`       |  40.780 |                   1 / 0 |
|   10 | `d-shell.spec.ts`             |  36.987 |                   1 / 0 |
|   11 | `terrain-render.spec.ts`      |  30.374 |                   1 / 0 |
|   12 | `f-verify-1000.spec.ts`       |  16.266 |                   1 / 0 |
|   13 | `phone-accept.spec.ts`        |  14.682 |                   2 / 0 |
|   14 | `f-content-fix.spec.ts`       |   6.192 |                   1 / 0 |
|   15 | `d-scan.spec.ts`              |   5.824 |                   1 / 0 |
