# S-bughunt: hazard recovery

Audited SHA: `f587b1650e345451211a2751b146f126fe2e26c0`.
Serves DIRECTOR Backlog 7, **S-verify / S-bughunt [Codex, standing]**,
specifically S-bughunt (the constraint template's Backlog 9 is historical).

No supported-path production defect reproduced. Two missing recovery boundaries
are added to the existing `tests/unit/d2Hazard.test.ts`. Both pass unchanged
production; there is no failing-before/passing-after production fix claim.
Only that spec and this progress note change.

## Intake and ownership

Read CONTRIBUTING-AGENTS, DIRECTOR's Backlog/simplicity rules/rubric, the
topmost targeted review and newest dated review (2026-10-24 afternoon), and
OVERNIGHT-LOG through run 127. Read launched 3730, 3880 and 3890 briefs,
3730/3850 result reports, the collected
[3730 supply audit](3730-S-bughunt-fuel-battery.md),
[3720 clock audit](3720-S-bughunt-pause-resume-clock.md) and
[3850 scan/reward audit](3850-S-bughunt-journal-scan-reward.md).
Earlier result wrappers advertise smoke PASS while their embedded reports
record failed local no-e2e gates. Those wrapper labels are not validation here.

Pinned the initially clean checkout, inspected every registered worktree's
HEAD, status, changed paths/statistics and branch-only commits, and read
relevant held diffs/reports. Held 2980 scarp/contact changes and 3050 Terrain
seam changes, 3310's committed journey/scanner/UI package, 3320's full-e2e
report, 3340's touch e2e additions/report and 3380's CI report do not own this
hazard spec. None is collected, copied or required here. Their worktrees remain
untouched. Concurrent 3870 save migration and 3880 pause/resume start clean at
the same SHA and have separate slices/notes. Rechecked SHA/status and their
ownership immediately before editing; no hazard-spec overlap.

OVERNIGHT run 116 records collection of 3730's twelve boundary cases, all
present in this checkout. The current slice therefore preserves and cites
those guards rather than adding duplicate depletion/threshold tests.

## Round 1: existing capability map

All citations refer to the pinned checkout except the explicitly identified
new hazard cases.

| Contract                                                                                                                     | Existing evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Arcade freezes supplies; mode changes preserve levels; only a fresh dive replenishes them                                    | [power.test.ts:8](../../tests/unit/power.test.ts#L8), [reset guard:50](../../tests/unit/power.test.ts#L50); [powerSystem.test.ts:369](../../tests/unit/powerSystem.test.ts#L369) covers both exhausted resources across mode changes. [docs/power.md:29](../../docs/power.md#L29) documents rescue and fresh-dive replenishment.                                                                                                                                                           |
| Depletion, duration and low/critical boundaries                                                                              | [d2Hazard.test.ts:148](../../tests/unit/d2Hazard.test.ts#L148) retains all twelve collected 3730 cases; [power.test.ts:50](../../tests/unit/power.test.ts#L50) covers reset of both reserves. [Power.ts:63](../../src/game/Power.ts#L63) restores reserves; [:89](../../src/game/Power.ts#L89) derives warnings/depletion from current levels.                                                                                                                                             |
| Battery, oxygen or simultaneous failure causes one ascent and one appropriate debrief, with no replay on later active frames | [powerSystem.test.ts:318](../../tests/unit/powerSystem.test.ts#L318) exercises the real Power/Submarine/system hooks and event bus, both mission-owned and free dives. [power.ts:81](../../src/app/systems/power.ts#L81) latches rescue dispatch; [:88](../../src/app/systems/power.ts#L88) leaves mission debrief ownership with the router.                                                                                                                                              |
| Power ascent ignores piloting commands, continues after the nominal timer and finishes at the surface                        | [Submarine.test.ts:69](../../tests/unit/Submarine.test.ts#L69) exercises a long ascent and reset afterward; [Submarine.ts:277](../../src/sub/Submarine.ts#L277) gates commands on active ascent, [:376](../../src/sub/Submarine.ts#L376) clears cause/lock at the surface. Early surface arrival and reset during an active lock were not guarded.                                                                                                                                         |
| Rescue supersedes completion actions and cannot duplicate abort/reward events                                                | [missionRouter.test.ts:706](../../tests/unit/missionRouter.test.ts#L706) covers power/crush ascent; [:735](../../tests/unit/missionRouter.test.ts#L735) challenges pending/open completion timers and stale actions; [:810](../../tests/unit/missionRouter.test.ts#L810) prevents old Keep exploring actions from resuming an abort.                                                                                                                                                       |
| Retry starts a fresh runtime, mission progress and mission timers                                                            | [missionRouter.test.ts:579](../../tests/unit/missionRouter.test.ts#L579) clicks Dive again after power abort, checks one reload/restart and cleared objective/time/end state, constructs a replacement controller and rescans logged objectives. [MissionRouter.ts:650](../../src/game/MissionRouter.ts#L650) restarts then navigates, rather than reusing the exhausted runtime.                                                                                                          |
| Dive-local scans/session reset; Journal survives                                                                             | [discoveryReward1240.test.ts:209](../../tests/unit/discoveryReward1240.test.ts#L209) restarts and clears completion/session state; [gameScanner.test.ts:711](../../tests/unit/gameScanner.test.ts#L711) permits a new-dive repeat without losing Journal state; [missionCore.test.ts:59](../../tests/unit/missionCore.test.ts#L59) reloads after complete/partial scans and requires fresh progress. [Discovery.ts:100](../../src/game/Discovery.ts#L100) subscribes resetDive to restart. |
| Modal controls and input cannot dismiss an exhausted free dive into unsafe play                                              | [overlayFocus.test.ts:1936](../../tests/unit/overlayFocus.test.ts#L1936) guards the non-dismissible power debrief, Journal/Settings focus ownership and no fallback Escape dispatch; [:2919](../../tests/unit/overlayFocus.test.ts#L2919) guards partial scans across interruptions.                                                                                                                                                                                                       |
| Old runtime callbacks/listeners cannot affect a replacement                                                                  | [powerSystem.test.ts:93](../../tests/unit/powerSystem.test.ts#L93) guards disposed deferred reserves; [:119](../../tests/unit/powerSystem.test.ts#L119) isolates successive runtimes; [overlayFocus.test.ts:3183](../../tests/unit/overlayFocus.test.ts#L3183) challenges repeated pause/quit/dispose around discovery readiness.                                                                                                                                                          |

## Round 2: recovery boundaries

Added [d2Hazard.test.ts:95](../../tests/unit/d2Hazard.test.ts#L95), using the
existing config, terrain and idle input:

- A shallow rescue reaches the surface within one simulated second, before
  the shipped five-second control lock could expire. Assert cleared emergency
  cause/active state/remaining lock and safe hull state, then demonstrate yaw,
  thrust and downward ballast work on subsequent fixed ticks.
- Reset during an ascent with positive remaining lock and upward velocity.
  Assert zero residual velocity and cleared emergency/lock/hull state, then
  demonstrate yaw, thrust and descent immediately work in the fresh dive.

The existing long-ascent test resets only after surfacing and after the lock
has elapsed; it could not catch a stale lock in either boundary above. These
two public-behavior cases guard that gap without recreating depletion dispatch,
scanner, modal or restart fixtures. Battery and oxygen share the same power
ascent path, already exercised separately by powerSystem's integration cases.

Surfacing is not a recharge action. Supplies remain exhausted during the abort
debrief; Dive again reloads a new runtime, where Power starts full (then applies
documented mission descent cost). No in-place refill, reuse of an aborted
controller or arbitrary respawn policy is inferred. Scanning during ascent is
explicitly supported by MissionRouter and already tested; no new cancellation
policy is introduced. No out-of-scope production reproduction or correction
is outstanding.

## Validation

Exact focused command before and after additions:

```bash
npm test -- --configLoader runner --cache=false tests/unit/d2Hazard.test.ts tests/unit/power.test.ts tests/unit/powerSystem.test.ts tests/unit/Submarine.test.ts tests/unit/missionRouter.test.ts tests/unit/discoveryReward1240.test.ts tests/unit/gameScanner.test.ts tests/unit/overlayFocus.test.ts
```

- Before: exit 0; **8 files / 311 tests passed**, 2.11 s.
  Log: `/tmp/3890-focused-before.log`.
- After: exit 0; **8 files / 313 tests passed**, 2.09 s.
  Log: `/tmp/3890-focused-after.log`. Both added cases pass unchanged source.
- `npx prettier --write tests/unit/d2Hazard.test.ts`: exit 0, unchanged.
- `git diff --check`: exit 0.

Required gates:

```bash
GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e
```

Aggregate log: `/tmp/3890-gates.log`. Actual local e2e mode: **none**.
Detailed logs: `.cache/runs/20261024-194730-27-s3ICIO/`.

Completed **exit 1, `FAIL gates (e2e=none)`**. Writable config preparation,
strict content validation (all 13 sites, zero errors/warnings), TypeScript and
production build, full units, attribution (14 asset files) and repository-wide
Prettier **passed**. The existing build chunk-size advisory is non-failing.
Full units: **192 files passed; 4,222 passed / 4 existing expected failures
(4,226 total)**, 644.17 s. The four collision expected-failure cases are
unchanged. Python is the only failing stage, detailed below. No stage was
interrupted or retried.

Python completed **167 tests in 10.989 s: 162 passed / 5 failed**:

- Four `test_ci_build_manifest.TestCiBuildManifest` cases fail during fixture
  manifest creation with `spawnSync git EPERM`:
  `test_both_bases_survive_copy_and_verify_all_provenance_fields`,
  `test_every_manifest_mismatch_is_rejected`,
  `test_missing_output_or_manifest_and_workflow_sha_mismatch_fail`, and
  `test_symlinks_missing_public_data_and_manifest_overwrite_are_rejected`.
- `test_golden.TestGolden.test_golden_tooling` fails its Node subtest
  “golden comparison refuses partial sets, missing files and incompatible poses”
  with `Unexpected end of JSON input` at
  `tools/tests/golden-manifest.test.mjs:151:23`; 24/25 internal subtests pass.

These match the collected 3730/3850 failure signatures. The first four establish
a child-process permission block; this run does not establish why the golden
comparison child's report is empty. Smallest follow-up: execute the unchanged
checks where child processes are permitted and retain the golden child's
status/stderr/stdout before proposing a tooling correction. No tools edit,
retry, skip, timeout increase or assertion change is made here.

## Simplicity, rubric and limits

Two capability guards, no new fixture/abstraction or production complexity.
Historical assertions, tolerances, budgets, snapshots and product policies
remain intact. No UI, guidance surface, setting, runtime config mutation, site
branch, dependency, schema, retry, skip or timeout change. Predictable recovery
protects correct, simple and rewarding exploration and honest telemetry.
Arcade stays default. Real GMRT terrain, all 13 site identities, five hero set
pieces, scanning, Journal, marine life, keyboard/pad/touch and accessibility
remain unchanged.

No game rendering, browser, WebGL context, screenshots, pixel acceptance,
hosted CI, GPU, unaided journeys or real-phone validation. Readability, beauty,
touch layout and physical-phone performance remain with Claude/owner.
Production, tools, DIRECTOR, shared fixtures, authored data, snapshots, held
packages and other worktrees remain read-only. No merge, push, tag or hosted
workflow dispatch.

Final ownership check retains the audited SHA and exactly the two owned changed
paths. Concurrent 3870/3880 now contain only their own untracked progress notes;
no overlapping spec edit or uncollected dependency. Final
`npx prettier --check tests/unit/d2Hazard.test.ts plan/progress/3890-S-bughunt-hazard-recovery.md`
and `git diff --check`: both exit 0.
