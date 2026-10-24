# S-bughunt: site selection and Home globe state

Audited checkout: `e518b3cfa5aadf58cea5ae2d19dea3f23d7f8250` (2026-10-24).
Backlog 9, S-verify / S-bughunt [Codex, standing]. Result: clean supported-path
audit; progress note only. No production fix or new test is justified by the
evidence below. No failing-before/passing-after product result is claimed.

## Scope and ownership

Read DIRECTOR's Backlog, simplicity rules and rubric; the newest dated REVIEWS
entry (2026-10-24 midday, below an older misplaced targeted-review heading);
OVERNIGHT-LOG through run 114; launched briefs 3730–3750; and existing results
and progress evidence. The three current `*-last.md` result files were empty.
Relevant collected evidence includes
[3400](3400-S-bughunt-mission-catalog-failures.md),
[3290](3290-S-bughunt-debrief-journal.md),
[3430](3430-S-bughunt-debrief-rewards.md) and
[3690](3690-S-bughunt-depth-gauge-bounds.md).
The 3400 note's Home/shell source trace is in its production-guard section;
the tests and production citations below use this checkout's current lines.

Checked the registered worktrees, statuses, changed paths and diff summaries
before editing, including work awaiting collection. Held 2980/3050 touch
scarp/Terrain and collision specs; 3310 retains its journey extension; 3320 and
3380 retain reports; 3340 retains touch e2e changes. None supplies this audit's
evidence or overlaps this note. 3730 now edits `d2Hazard.test.ts`; 3740 was clean
at the ownership recheck. V-lostcity-foot-2 has its own art commit and snapshot
changes. All remain untouched. Main was clean at the initial check.

The brief's generic instruction mentions an existing depth/hull capability
spec. The nearest such current spec, `uiHud.test.ts`, already received the
3690 boundary coverage. Site selection belongs to existing Home, globe,
navigation and startup capabilities, which are read and run here. No unrelated
selection assertions are appended to a depth/hull spec, and no additional test
file is claimed. Only this named note changes.

## Capability map

| Contract                                                                                 | Production guard                                                                                                                                                                                                                                                                                                                                      | Existing headless evidence                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unknown saved mission does not become Home's announced destination                       | [shell.ts:32](../../src/app/systems/shell.ts#L32) validates saved IDs; [shell.ts:77](../../src/app/systems/shell.ts#L77) checks catalogue membership and retains the Titanic fallback                                                                                                                                                                 | [homeFocus.test.ts:164](../../tests/unit/homeFocus.test.ts#L164): absent, known and removed saved IDs before/after catalogue arrival; label, URL, event, saved ID and focus                                                                                                                                                                                                                                                              |
| Late catalogue data cannot replace a new shell's selection                               | [shell.ts:160](../../src/app/systems/shell.ts#L160) checks disposal before publishing summaries                                                                                                                                                                                                                                                       | [homeFocus.test.ts:207](../../tests/unit/homeFocus.test.ts#L207): delayed old catalogue with both fresh and reused context                                                                                                                                                                                                                                                                                                               |
| Mission and tile identities remain distinct                                              | [shell.ts:100](../../src/app/systems/shell.ts#L100) emits the summary's tile; [MissionRouter.ts:63](../../src/game/MissionRouter.ts#L63) resolves the mission definition                                                                                                                                                                              | [homeFocus.test.ts:198](../../tests/unit/homeFocus.test.ts#L198), [missionRouter.test.ts:72](../../tests/unit/missionRouter.test.ts#L72)                                                                                                                                                                                                                                                                                                 |
| Unknown URL mission/tile falls back without retaining a previous mission                 | [MissionRouter.ts:63](../../src/game/MissionRouter.ts#L63) returns null on missing mission; [MissionRouter.ts:95](../../src/game/MissionRouter.ts#L95) chooses an indexed/default tile                                                                                                                                                                | [missionRouter.test.ts:92](../../tests/unit/missionRouter.test.ts#L92), [missionRouter.test.ts:122](../../tests/unit/missionRouter.test.ts#L122)                                                                                                                                                                                                                                                                                         |
| Repeated catalogue IDs do not create competing site identities                           | [GlobeModel.ts:122](../../src/ui/GlobeModel.ts#L122) keeps the first valid ID; [GlobeModel.ts:78](../../src/ui/GlobeModel.ts#L78) resolves mission > tile > catalogue                                                                                                                                                                                 | [globe.test.ts:92](../../tests/unit/globe.test.ts#L92), [globe.test.ts:119](../../tests/unit/globe.test.ts#L119): duplicate, malformed and invalid-coordinate rows                                                                                                                                                                                                                                                                       |
| Former hull locks do not disable sites under current auto-fit policy                     | [Progress.ts:86](../../src/game/Progress.ts#L86) allows all depths; [progress.ts:78](../../src/app/systems/progress.ts#L78) refreshes selector ratings without installing a lock                                                                                                                                                                      | [overlayFocus.test.ts:352](../../tests/unit/overlayFocus.test.ts#L352): fresh/formerly locked/finished rows remain enabled and ordered, including unknown depth and Class C                                                                                                                                                                                                                                                              |
| Rapid and repeated list previews replace an old globe card                               | [Globe.ts:341](../../src/ui/Globe.ts#L341) ignores absent IDs, clears hover/focus for valid IDs and replaces the pinned site; [GlobeModel.ts:416](../../src/ui/GlobeModel.ts#L416) replaces the orbit target and zeroes fling velocity                                                                                                                | [overlayFocus.test.ts:1451](../../tests/unit/overlayFocus.test.ts#L1451): both focus and pointer preview paths select wreck/vent/wreck after an old globe preview; [globe.test.ts:337](../../tests/unit/globe.test.ts#L337) guards numeric orbit easing, wrapping and zoom bounds                                                                                                                                                        |
| A repeated load selection shares work; a superseded load cannot initialize stale systems | [deferredStartup.ts:59](../../src/app/deferredStartup.ts#L59) shares the current key, aborts the old attempt and checks cancellation after loading                                                                                                                                                                                                    | [startupLifecycle.test.ts:125](../../tests/unit/startupLifecycle.test.ts#L125), [startupLifecycle.test.ts:182](../../tests/unit/startupLifecycle.test.ts#L182), [startupLifecycle.test.ts:226](../../tests/unit/startupLifecycle.test.ts#L226), [startupLifecycle.test.ts:247](../../tests/unit/startupLifecycle.test.ts#L247): duplicate, cancel/dispose, late resolve/reject, Home then new selection                                  |
| Selection navigates to a fresh page instead of swapping a live mission/camera            | [MissionSelect.ts:49](../../src/ui/MissionSelect.ts#L49), [Globe.ts:433](../../src/ui/Globe.ts#L433), [shell.ts:100](../../src/app/systems/shell.ts#L100) construct URLs and navigate                                                                                                                                                                 | [missionRouter.test.ts:325](../../tests/unit/missionRouter.test.ts#L325) removes prior mission/free-dive parameters as specified; [globe.test.ts:397](../../tests/unit/globe.test.ts#L397) removes globe reopening; [startupLifecycle.test.ts:433](../../tests/unit/startupLifecycle.test.ts#L433) exercises three page lifetimes with one loop and disposed systems                                                                     |
| Home releases mission ownership and late placement cannot reset its camera               | [MissionRouter.ts:656](../../src/game/MissionRouter.ts#L656) hides debrief before leaving; [mission.ts:148](../../src/app/systems/mission.ts#L148) returns to shell; [mission.ts:164](../../src/app/systems/mission.ts#L164) disposes the router on Home; [mission.ts:42](../../src/app/systems/mission.ts#L42) rejects placement while Home/disposed | [homeFocus.test.ts:178](../../tests/unit/homeFocus.test.ts#L178) retains started mission destination through repeated Home entry; [overlayFocus.test.ts:2534](../../tests/unit/overlayFocus.test.ts#L2534) and [overlayFocus.test.ts:2789](../../tests/unit/overlayFocus.test.ts#L2789) cover shell/globe lifetime cleanup; the exact debrief-to-Home placement guard is source-traced, not claimed as a dedicated integration assertion |
| Fresh/restarted missions reset camera controls and pose                                  | [camera.ts:60](../../src/app/systems/camera.ts#L60) resets view on mission start; [mission.ts:98](../../src/app/systems/mission.ts#L98) resets submarine and snaps rig                                                                                                                                                                                | [firstMove.test.ts:322](../../tests/unit/firstMove.test.ts#L322) includes restart-after-debrief and hull-loss reset sequences with real headless placement/camera state; [missionRouter.test.ts:579](../../tests/unit/missionRouter.test.ts#L579) requires a fresh run after Dive again                                                                                                                                                  |

## Findings and limits of the contracts

No supported player-path stale mission or camera defect was reproduced. Adequate
existing coverage and source guards complete this audit without duplicating
tests. Unknown `previewSite` IDs are deliberately a no-op; they do not select an
unknown mission or replace the prior valid preview. Previewing the same valid
site again replaces the same target. Neither operation emits a launch event.
The exact unknown-preview no-op and orbit-target replacement are source checks,
not newly executed dedicated assertions.

`Globe.select` retains an optional mission-access veto (requirement card, no
navigation) and catalogue-only pins remain nonlaunchable. No production caller
currently installs `setMissionAccess`; manufacturing a hull lock would contradict
the current auto-fit policy. Arbitrary forged `GlobeSite` objects passed directly
to `select` are trusted internal API inputs, not a demonstrated unknown-ID UI path.
Closing/reopening the globe retains its valid pinned preview/orbit target; no
policy requiring it to clear that selection is established. These are report-only
boundaries, not proposed product changes.

Normal debrief Home/Dive sites actions use `shellBaseHref`, removing dive-specific
query state before selection. Mission URLs also clear prior query state. Free-dive
`tileUrl` deliberately removes mission/Daily/briefing/globe routing while retaining
other parameters, including optional QA pose inputs; the existing API does not
promise to clear every pose parameter. No camera-composition or URL policy change
is proposed based on that ambiguity.

## Validation

- `./node_modules/.bin/vitest run tests/unit/homeFocus.test.ts tests/unit/globe.test.ts tests/unit/overlayFocus.test.ts tests/unit/missionRouter.test.ts tests/unit/startupLifecycle.test.ts tests/unit/firstMove.test.ts tests/unit/uiHud.test.ts --configLoader runner --cache=false`
  — exit 0; **7 files / 385 tests passed**, 57.95 s. Log:
  `/tmp/3750-focused.log`. Existing DOM/renderer stubs are used; no browser,
  WebGL context or game rendering is launched.
- `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e` — **exit 1,
  FAIL gates (e2e=none)**;
  log `/tmp/3750-gates.log`, gate logs
  `.cache/runs/20261024-093402-3-yrT6sC/`. Config, content and build passed.
  Python failed: **162 passed / 5 failed (167 total)**, 12.385 s.
  Full unit, attribution and repository Prettier passed. Full unit result:
  **192 files passed; 4,148 tests passed / 4 existing expected failures
  (4,152 total)**, 840.89 s. Existing collision expected failures are unchanged.
  The build log confirms TypeScript checking and Vite bundling completed;
  its existing large-chunk warning is nonfatal. Content reports no errors or
  warnings; attribution confirms 14 attributed asset files. No browser gates ran.

Python failures, read from the actual gate log:

- `test_both_bases_survive_copy_and_verify_all_provenance_fields`,
  `test_every_manifest_mismatch_is_rejected`,
  `test_missing_output_or_manifest_and_workflow_sha_mismatch_fail`, and
  `test_symlinks_missing_public_data_and_manifest_overwrite_are_rejected`
  fail in `test_ci_build_manifest` with `spawnSync git EPERM` from
  `tools/ci-build-manifest.mjs:11`.
- `test_golden_tooling` fails its Node subtest “golden comparison refuses
  partial sets, missing files and incompatible poses” at
  `tools/tests/golden-manifest.test.mjs:151`: empty child stdout reaches
  `JSON.parse`, producing `Unexpected end of JSON input`. Its internal Node
  suite reports **24 passed / 1 failed (25 total)**. This output does not
  establish the underlying cause of the fifth failure.

These match the failures recorded by collected 3690; that prior result does not
make this run pass. The first four demonstrate a subprocess permission block.
No tooling correction is supported by a site-selection reproduction. Smallest
proposed follow-up is to run the unchanged checks in an environment that permits
the child processes and retain the golden child's status/stderr/stdout before
proposing a fix. No retries, skips or timeout/assertion changes were made.

Final checks: `./node_modules/.bin/prettier --check plan/progress/3750-S-bughunt-site-select.md`
and `git diff --check` both exit 0. A local link check validated all 50 citation
targets and line bounds. Final ownership review rechecked all registered
worktrees, including held work and 3730/3740's separate files; no overlap.
V-lostcity-foot-2 finished its own art commits during the audit and is now clean;
those commits were not collected or used here. The audited checkout SHA remains
unchanged, and `git status --short` shows only this new progress note.

## Simplicity and rubric

Runtime and test complexity are unchanged. No new UI, guidance, settings,
dependencies, abstractions, branches, config mutations, data, schema, snapshots,
budgets or historical assertions. Correct destination identity, orderly lifecycle
teardown and the existing auto-fit policy protect simple exploration and rewards;
factual site content and discovery honesty remain unchanged. Visual readability,
beauty, touch layout and phone performance are not scored.

Actual local e2e mode is **none**. No hosted CI, GPU, unaided journey, screenshots
or real-phone validation is claimed. No merge, push, tag or workflow dispatch.
