# 3150 — S-ci-watch latest main

Serves DIRECTOR S-verify / S-bughunt and item 10, R-release. Audit: 2026-10-22.
Local HEAD and remote main: `a545afe00196649a2d6de4cf1c8039851aba9074`.

## Plan

1. Audit hosted main runs and failing job logs before changing anything.
2. Classify spec failures separately from setup failures; fix only small proven defects.
3. Run `tools/gates.sh`, record limits, and recheck the newest hosted-green SHA.

## Release evidence

**Newest fully green main SHA: `55220c89f02b61aefbe08877035b97ff0baec918`.**
[CI 39513009283](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39513009283)
finished 2026-10-20 23:39:55 UTC: all 42 jobs succeeded, including all 38 e2e
shards, static checks, both builds and project-base. It is an ancestor of audited
main. Every newer CI run in the 30-run main query failed or was cancelled.
Skipped deployment workflows are not green CI evidence. Current main is not taggable.

A second `gh run list` audit at approximately 17:21 UTC confirmed the same latest
run and green SHA (`ci-runs-round2.json`, `green-round2.json` in the local evidence directory).
Final hosted list checks at 17:30 UTC confirmed both unchanged after local gates.

Used `gh run list --branch main`, workflow-specific CI lists (including
`--status success`), and `gh run view --json jobs,headSha,conclusion,url`.
`gh run view --log-failed` returned no text, so fetched individual failing-job
logs with `gh api repos/wjjztd2rz8-coder/submarine-explorer/actions/jobs/<id>/logs`.
JSON and full text evidence are retained locally in `.cache/ci-watch/`.

| Main SHA  | Hosted run                                                                                             | Result                                                                                                                                  |
| --------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `a545afe` | [39802535646](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39802535646)         | Cancelled; 11 jobs passed, 30 failed, static checks exceeded the 15-minute job deadline during unit tests. No newer push superseded it. |
| `d8bfff3` | [39789582744](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39789582744)         | Failed; 25 jobs passed, 17 failed.                                                                                                      |
| `3556bcd` | [39786918236](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39786918236)         | Failed; 20 jobs passed, 22 failed.                                                                                                      |
| `d8bfff3` | [Nightly 39790514209](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39790514209) | Diagnostics job succeeded; all four capability-review shards failed before test execution. Nightly is outside release gates.            |

## Failures by shard

Shard numbers below are out of 38. Setup failures have **no failing spec**;
calling them stale tests would conceal missing coverage.

| Run                    | Shards                                                                               | Failure and classification                                                                                                                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Latest `39802535646`   | 1, 2, 4, 5, 7, 9, 11, 12, 14, 15, 18, 20, 21, 25, 27, 28, 29, 30, 32, 33, 34, 36, 37 | `Build manifest nodeVersion mismatch` before discovery: real CI configuration defect.                                                                                                                                           |
| Latest                 | 3, 6, 13, 17, 24, 26, 35                                                             | Chromium installer: first attempt exceeds 120 seconds; retries encounter APT locks held by the first attempt's `apt-get`. Infrastructure failure; not a spec flake.                                                             |
| Previous `39789582744` | 1, 7, 8, 11, 22, 29, 36, 37                                                          | Same Node manifest mismatch; no specs executed.                                                                                                                                                                                 |
| Previous               | 4, 6, 12, 18, 24, 31                                                                 | Same Chromium/APT setup failure; no specs executed.                                                                                                                                                                             |
| Previous               | 14, 15                                                                               | `journal-debrief.spec.ts:1540`, unaided 390x844 journeys, Blue Hole and Titanic respectively. Deterministic stale/overprecise measurement; strict 44 px regression guard retained.                                              |
| Previous               | 38                                                                                   | `d-shell.spec.ts:96`, home/site/pause/resume/quit journey. Hosted rendering/timing flake: timeout at `waitForFrames` after returning home (`:252`); this exact test passed on latest main in 3.8 minutes. No assertion changed. |
| Earlier `39786918236`  | 2, 6, 9, 10, 12, 16, 19, 26, 37                                                      | Same Node manifest mismatch.                                                                                                                                                                                                    |
| Earlier                | 1, 13, 15, 21, 24, 25, 29, 30, 36, 38; project-base                                  | Same Chromium/APT setup failure.                                                                                                                                                                                                |
| Earlier                | 14                                                                                   | Same Blue Hole journey touch-target measurement.                                                                                                                                                                                |
| Earlier                | static checks                                                                        | Prettier rejected `plan/STATUS.md`; already resolved in previous main, whose static checks passed.                                                                                                                              |
| Nightly                | capability-review 1–4                                                                | Same Node manifest mismatch; no capability specs executed.                                                                                                                                                                      |

The latest run's remaining e2e shards (8, 10, 16, 19, 22, 23, 31, 38) passed.
Both builds and project-base passed. `gh run view` confirms the static job annotation: “The job has exceeded the maximum execution time of 15m0s.” Cancellation is not a pass for static checks.

The latest [shard 38 job 119907347825](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39802535646/job/119907347825)
ran the exact shell journey successfully in 3.8 minutes, with all 21 shard tests passing.
This supports the timing-flake classification without weakening or extending its timeout.
Evidence: `.cache/ci-watch/latest-shell-passed.log`.

The globe failures report `43.99998474121094` against `>=44` at
`pick-mission: .globe-pin.is-mission`, identical to the preceding audit in
[2940-S-ci-watch-newest.md](2940-S-ci-watch-newest.md), which reproduced the exact
value using a 44 px button with a fractional translation on a blank Chromium page.
These repeatable measurement failures are not flakes. The strict guard protects
phone hit areas; no tolerance, rounding, skip, CSS sizing or placement change is
introduced here. Both journeys remain unresolved release blockers. The stale
Your sub menu expectations from that audit are already fixed in this checkout;
there is no remaining safe menu-expectation edit to repeat.

## Smallest safe change

Pin all six `setup-node` steps in `.github/workflows/ci.yml` and
`.github/workflows/render-nightly.yml` to **22.23.4**. Producer job
[119906874548](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39802535646/job/119906874548)
used `v22.23.4`; failing consumer
[119907347293](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39802535646/job/119907347293)
used cached `v22.23.3`. Major-only selection resolved differently across hosted
images, while the manifest correctly requires exact runtime equality. Pinning
removes that variability without weakening provenance validation.

APT process cleanup and the static-job time budget remain follow-ups: this
change does not claim to repair either. The installer already retries; adding
more retries would not establish a safe fix for a surviving privileged child.
No gameplay regression was established by these logs.

Net simpler: replace six ambiguous runtime selectors with exact selectors; add
no runtime code, settings, UI, site branches, package-named tests or dependencies.
No existing test assertion changed. No tag, merge or push performed.

## Validation

- Audit-first: existing manifest capability tests **PASS**, 4 tests, before edits;
  all provenance mismatches, including Node version, remain rejected.
  `.cache/ci-watch/manifest-before.log`.
- Existing installer policy tests **PASS**, 5 tests; these mock commands and do not
  demonstrate hosted APT recovery. `.cache/ci-watch/installer-audit.log`.
- Selector consistency audit **PASS**: all six producer/consumer steps use 22.23.4.
- Focused CI shard-selection capability tests **PASS**, 1 file / 7 tests:
  `npm test -- --configLoader runner --cache=false tests/unit/e2eShards.test.ts`.
  `.cache/ci-watch/unit-probe.log`.
- Aggregate invocation: `GATES_CONFIG_MODE=writable PW_PORT=4379 PW_OUTDIR=.cache/ci-watch/dist bash tools/gates.sh`.
  Log: `.cache/ci-watch/gates.log`; run: `.cache/runs/20261022-121837-3-ahbz4a/`.
  Python (167 tests), strict content, TypeScript/production build, unit
  (192 files / 3,519 tests; 554.47 seconds), and root smoke (3 tests) **PASS**.
  Project-base (8 tests), attribution and repository-wide Prettier **PASS**.
  Final result: **PASS gates (e2e=smoke)**, exit 0.
  Actual e2e mode is smoke, not full suite. Hosted success/failure logs provide
  the shell-flake evidence; no isolated local reruns of failing journeys are claimed.
