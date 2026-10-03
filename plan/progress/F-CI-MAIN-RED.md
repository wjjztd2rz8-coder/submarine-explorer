# F-CI-MAIN-RED — hosted failure audit and test synchronization

Date: 2026-10-03. **Partial implementation; acceptance remains pending.**
No application/gameplay, workflow, gate, package, dependency or retry changes.
No commits, pushes, PRs or remote workflow runs.

## Baseline and evidence access

- Read `F-BUGHUNT-11.md` before editing and checked recent history. Its gate
  caller/documentation work is already merged (`2dff17d`); no overlapping edits.
  This checkout starts at `6014c0c`. Local `main` is `dac0f06`, one documentation
  commit ahead, changing only `plan/OVERNIGHT-LOG.md`. Fetch/rebase cannot run:
  the shared Git metadata is outside the writable sandbox (`FETCH_HEAD` is
  read-only). The existing application/test tree matches local main.
- `gh run list --workflow CI --branch main --limit 8` fails connecting to
  `api.github.com`. Attempted both `gh run view <id> --log-failed` and
  `gh run download <id>` for every supplied ID; all fail for the same reason.
  An independent API read was also inaccessible. Errors are retained in
  `.cache/f-ci-main-red/gh-*.error` and `download-*.error`.
- Recovered complete cached log ZIPs for runs 37124455252 and 37109366947 from
  `/tmp/gh-cli-cache/`. Read every job's combined log, including canceled jobs,
  rather than extrapolating shard 14's failure to the whole matrix. Cached
  `/tmp/ciart/` includes the latest mission failure's contexts and retry trace;
  the trace's title, time and source match that run's failure. Relevant log
  extracts are under `.cache/f-ci-main-red/<run>/`.
- The last-eight list cannot be retrieved: four supplied runs lack cached
  logs, and two further recent run IDs are unknown. Only **two runs** have
  been classified. Missing evidence is not a pass or a timing diagnosis.

## Failing-test inventory

Times below are UTC from the cached logs, not local time.

| Run / failure time                                                                                    | Failing test                                                                                  | Observed result                                                                                                                                                                    | Classification / cause                                                                                                                                                                                                                                                                                                                                         | Action                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [37109366947](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/37109366947), 08:23 | `presets.spec.ts:81`, vent enters and compiles its preset shader; shard 14/16                 | Both attempts expected 2 draws, received 0; failed after 55.5 s of suite execution                                                                                                 | Deterministic test/configuration mismatch. CI seeds Low; `Presets` disables visuals on Low. Five geometry cases (vent, reef, canyon, brine, wreck) expect nonzero draws without selecting their required tier. Longer waits cannot enable those visuals.                                                                                                       | Explicit Medium for all eight preset shader cases, preserving exact draw counts; retain the separate explicit Low physics case.                                                              |
| [37124455252](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/37124455252), 12:57 | `mission.spec.ts:316`, crush depth → HULL FAILURE → aborted debrief → Dive again; shard 14/16 | First attempt: clock advanced 0.75 s during a fixed 2 s sleep, expected >1.6. Retry: debrief absent at 20 s; context shows HULL BREACH at 1,078 m and the emergency-ascent banner. | Slow-renderer synchronization. Mission uses unfrozen frame delta, capped at 250 ms by `Time.tick`; physics additionally caps at eight 60 Hz steps per frame. A five-simulated-second blow lock therefore can exceed 20 wall seconds. Retry reached the alert; no evidence of an exception or stuck router. Eventual ascent completion remains unverified here. | Observe two accumulated seconds of capped rendered-frame time for the clock check; poll the router's debrief state with a 120 s ascent budget, then assert the UI and all original outcomes. |
| [37120726881](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/37120726881)        | Unknown                                                                                       | Log/download unavailable                                                                                                                                                           | Unclassified                                                                                                                                                                                                                                                                                                                                                   | Retrieve logs/artifacts when GitHub access is available.                                                                                                                                     |
| [37120312161](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/37120312161)        | Unknown                                                                                       | Log/download unavailable                                                                                                                                                           | Unclassified                                                                                                                                                                                                                                                                                                                                                   | Retrieve logs/artifacts when GitHub access is available.                                                                                                                                     |
| [37112430408](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/37112430408)        | Unknown                                                                                       | Log/download unavailable                                                                                                                                                           | Unclassified                                                                                                                                                                                                                                                                                                                                                   | Retrieve logs/artifacts when GitHub access is available.                                                                                                                                     |
| [37110821917](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/37110821917)        | Unknown                                                                                       | Log/download unavailable                                                                                                                                                           | Unclassified                                                                                                                                                                                                                                                                                                                                                   | Retrieve logs/artifacts when GitHub access is available.                                                                                                                                     |

Both recovered runs have exactly one reported failing test, on shard 14.
Each canceled 14 other shards after that final failure; shard 16 completed
(2 tests on the earlier run, 3 on the later). Static checks and project-base
passed in both. Shard 14 stopped with 13 and 14 cases unexecuted, respectively.
These are fail-fast cancellations and unexecuted coverage, not additional test
failures. Neither run exhausted the 20-minute suite or 24-minute job budget;
there is no shard-load timeout in the recovered evidence. Canceled cases still
need full execution before acceptance.

## Changes and limits

- `tests/e2e/presets.spec.ts`: shader cases append `tier=medium`. Replace the
  fixed one-second sleep with two observed animation frames, so the entered
  geometry renders before checking console errors and taking its screenshot.
  Active preset, source and draw-count assertions remain exact. Explicit Low
  and Lost City cases retain their existing tiers and expectations.
- `tests/e2e/mission.spec.ts`: sample the clock in animation-frame callbacks
  over two accumulated seconds of the engine's capped frame time. Keep the
  original >1.6 and <2.6 numeric checks: an incorrectly physics-capped clock
  still undercounts slow frames. This documents the existing 250 ms frame
  clamp instead of claiming uncapped wall-clock time. Changing that gameplay
  clock policy is outside this task's no-gameplay-change constraint.
- Remove the alert's explicit five-second override so the existing configured
  expectation budget applies (20 s locally / 60 s CI). Poll the mission's
  debrief state for at most 120 s to accommodate physics on the software GPU;
  the existing 90 s local / 240 s CI total-test budgets remain in force. Keep
  debrief visibility, banner removal, abort event, depth, emergency flag,
  frozen state, focus and restart assertions. No thresholds relaxed or tests
  skipped; no global timeout increase.

## Validation

- Ran `GATES_CONFIG_MODE=writable PW_PORT=4399 tools/gates.sh --full-e2e`.
  Build/typecheck, **102 unit files / 1,115 tests**, **138 Python tests**, strict
  content and attribution pass. Initial formatting check raced the formatting
  of `presets.spec.ts`; corrected before final validation.
- Both browser gates fail at preview startup, before assertions. Direct Node
  listener reproduces `listen EPERM: operation not permitted 127.0.0.1:4399`.
  Project-base production build passes. These failures cannot establish browser
  correctness or passing timing; no fresh screenshots are claimed.
- Local and `CI=true` Playwright discovery load both modified specs without
  error. The supplied dependency symlink remains unchanged; the existing
  `GATES_CONFIG_MODE=writable` handles read-only dependency caches.
- Final full-gate attempt, same command: **PASS config, build, unit (1,115),
  Python (138), strict content, attribution and repository-wide Prettier**;
  **FAIL e2e and e2e-base before assertions at preview startup**, exit 1.
  Project-base build also passes. Final changed-file formatting and whitespace
  checks pass. Logs: `.cache/f-ci-main-red/gates-final.log` and `.cache/gates/`.

## Acceptance still required

In a host with Git writes, GitHub access and localhost/browser execution:
rebase on current main, retrieve the full last-eight inventory, classify any
additional failures, run full gates, then obtain **two consecutive complete
green CI runs**. Inspect retries and canceled coverage. Branch pushes require
the owner's authorization; none was supplied or performed here. CI currently
triggers on main pushes and PRs, so a branch push alone does not run it.
