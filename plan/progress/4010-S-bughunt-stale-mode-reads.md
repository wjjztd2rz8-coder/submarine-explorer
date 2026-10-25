# S-bughunt: stale settings after optional loading

Date: 2026-10-25. DIRECTOR Backlog **7, S-verify / S-bughunt**.
Audited HEAD: `1c620c846d0101e5650113ac9ae75ef2027c2d86`, initially clean.

## Scope and audit

Read DIRECTOR's simplicity rules and rubric, CONTRIBUTING-AGENTS, the newest
dated REVIEWS entry, OVERNIGHT-LOG through run 134, and the merged 3960 note.
Two passes: trace settings/mode/camera/quality consumers across `src/`, then
revisit delayed completions and long-lived callbacks against actual setting
lifetimes and consumed fields. Searches included `ctx.settings`, destructured
settings, `save.get()`, `ctx.effective`, gameplayMode, camera/quality config,
Promise completions, awaits, timers and event handlers. Followed boot/startup,
SystemRunner ordering, Save notifications, settings/modes application, mission
and free-dive placement, Discovery/POI helpers, audio, title, presets and quality.

Read-only worktree checks found no other changes to mission.ts or firstMove.test.ts.
No changes to the concurrent life package, CI package, shared configuration,
dependencies, site data or other worktrees. Owned files are mission.ts, the
existing firstMove capability, and this note.

## Confirmed defect and smallest correction

`missionSystem` supplied `defaultStartPosition` as an initialization-time
primitive to MissionRouter. With `?skipBriefing=1`, the router starts the mission
immediately but defers placement until `discovery.ready`. A player can pause
and edit Settings while optional POIs are still downloading. At completion the
router read its captured option, even though modesSystem had already replaced
`ctx.effective` with the selected settings.

Changed that existing option to a getter returning
`ctx.effective.gameplay.startPosition`. No router API change, listener, cache,
new setting or additional placement path. The existing disposed/Home/probe
guards, first-move reanchor and camera ordering remain intact. Explicit Begin
choices remain captured user intent. After placement `lastChoice` still retains
the applied start, so later settings changes and late props cannot switch the
settled dive between surface and near-site.

Extended `tests/unit/firstMove.test.ts` with six cases using real Save,
resolveEffective, modesSystem, missionSystem, MissionRouter, Mission, Progress,
Submarine, CameraRig and POI parsing/placement. Existing DOM view mocks remain;
terrain is a flat -3820 m field and props are absent. Uses shipped Titanic
mission/POIs/meta. POI readiness is held by an explicit promise, settings change
while paused, then POIs arrive. Four skipped-briefing cases cover both Custom
start edits and a saved Custom surface start switching to Arcade or Realistic.
Two explicit Begin cases preserve each explicit choice across a pending edit.
All six also check the fitted B hull, reanchoring, and retention of the settled
pose after a later preference edit and `props:loaded`.

Final regression against the unchanged production line:

| Pending change              | Observed before correction | Required selected start      |
| --------------------------- | -------------------------- | ---------------------------- |
| near-site -> surface        | y = -3768 m                | y = -8 m (hull-safe surface) |
| surface -> near-site        | 4280.5493 m from first POI | 140 m approach               |
| Custom surface -> Arcade    | 4280.5493 m from first POI | 140 m approach               |
| Custom surface -> Realistic | 4280.5493 m from first POI | 140 m approach               |

The two explicit-choice controls passed before correction. After correction
all six pass, including settled-pose checks. An initial test draft incorrectly
expected the nominal -5 m surface rather than the established -8 m hull floor,
and missed briefing preview's additional reanchor; corrected the new fixture
expectations before retaining the baseline above. No existing assertion changed.

## Non-defects

- `progress.ts:28`: stale-looking mode argument is behaviorally inert.
  `Progress.hullFor(depth, _mode)` ignores mode and calls requiredHull(depth).
  Existing progress tests cover A/B/C fitting in Arcade, Realistic and Custom;
  no speculative production cleanup.
- Boot settings and initial HUD/waypoint/audio/caption reads: no Settings UI
  exists during boot/tile loading. SystemRunner runs all init/start hooks
  synchronously before promise callbacks or input can interleave. Once live,
  settings listeners use their next snapshot or save.get(), and mode consumers
  use ctx.effective or objects updated by modesSystem.
- Terrain detail, tier, quality source and delayed Life/prop/preset construction:
  graphics tier and terrain detail apply after reload (`docs/settings.md`).
  They describe the active resources, even if a different saved tier is pending.
  Dynamic resolution reads the renderer's current pixel ratio and calls resize;
  it does not change the active tier or quality source.
- Discovery retains initial scan/submarine config across POI loading and debug
  spawn calls, but placePois consumes only defaultRadiusM/defaultSeconds and
  spawnPoseForPoi consumes spawn distance/bearing/clearance and hull geometry.
  Those fields do not vary between modes. ScanOverlay likewise consumes only
  unchanged dimensions/banner duration. modesSystem's ready callback reads
  ctx.effective for current radius floor/multiplier, and Scanner receives live
  configuration. No stale mode-dependent field is consumed by those helpers.
- Delayed free-dive placement already uses live camera settings and save.get()
  after 3960. Mission placement, power descent and life scanning read live
  ctx.effective at execution. Preset currents use a field updated by
  setCurrentMode; async preset selection does not overwrite it.
- Resize/UI scale, media-query reduced motion, title frames and audio
  unlock/resume callbacks use current Save/rig/renderer state or mutable fields
  refreshed by their subscriptions. Briefing's explicit choice and the placed
  dive's lastChoice intentionally retain the user's chosen start.

## Validation

Logs: `/tmp/4010-stale-reads/`.

- Baseline: `node_modules/.bin/vitest run --configLoader runner --cache=false tests/unit/firstMove.test.ts -t 'pending mission start'`:
  exit **1**, **4 failed / 2 passed / 105 skipped**, 810 ms
  (`before-final.log`). Getter restored immediately afterward.
- Focused: `node_modules/.bin/vitest run --configLoader runner --cache=false tests/unit/firstMove.test.ts tests/unit/missionApproachSystem.test.ts tests/unit/missionRouter.test.ts tests/unit/f2-modes.test.ts tests/unit/dailyBoot.test.ts tests/unit/progress.test.ts tests/unit/startupLifecycle.test.ts tests/unit/quality.test.ts tests/unit/settingsScreen.test.ts tests/unit/audioLifecycle.test.ts`:
  exit **0**, **10 files / 353 tests passed**, 55.66 s (`focused.log`).
- `npm run typecheck`: exit **0**, no diagnostics (`typecheck.log`).
- `PW_PORT=4210 GATES_CONFIG_MODE=writable bash tools/gates.sh --full-e2e`:
  exit **1**, actual summary **FAIL gates (e2e=full)** (`gates.log`). Per-gate
  logs: `.cache/runs/20261025-030237-7-Sfybgv/`.

| Gate        | Actual result                                                       |
| ----------- | ------------------------------------------------------------------- |
| config      | PASS                                                                |
| content     | PASS                                                                |
| build       | PASS; TypeScript and production Vite bundle                         |
| unit        | PASS; **192 files, 4235 passed / 4 expected fail**, 621.39 s        |
| e2e         | FAIL before browser tests: config.webServer could not start, exit 1 |
| e2e-base    | Base production build passed; same webServer startup failure        |
| attribution | PASS                                                                |
| prettier    | PASS; repository check, no unowned formatting                       |
| python      | FAIL; **5 failures / 167 tests**, 10.407 s                          |

The four existing collision expected-failure cases remain unchanged. Both
browser logs report only `Process from config.webServer was not able to start.
Exit code: 1`; neither establishes gameplay results or screenshots. No browser
gate pass or visual acceptance is claimed, and no server/tooling workaround was
introduced.

Full-gate Python result is **5 failures / 167 tests**, 10.407 s: four unchanged
`test_ci_build_manifest` cases fail with `spawnSync git EPERM` at
`tools/ci-build-manifest.mjs:11`; `test_golden_tooling` fails with
`Unexpected end of JSON input` at `tools/tests/golden-manifest.test.mjs:151`.
These match the failures documented by 3960 and do not exercise this correction.
No tooling repair or repeated gate run is included in this package.

Final owned-file Prettier check and `git diff --check`: exit **0**. HEAD remains
the audited SHA; status lists only the two owned code/test files and this note.

## Simplicity and limits

One value becomes a getter on an existing option, preserving settings resolution
and avoiding runtime machinery. Tests extend a capability file; no package
numbers in code, new guidance surface, layout patch or site branch. Protects
comfortable piloting and the selected opening without changing factual content,
scan, Journal, marine life, inputs or accessibility. This CPU fixture establishes
the scheduling defect and placement numerics; it makes no visual, beauty,
rewardingness, phone-performance or real-world frequency claim. No commit,
merge, push, tag or hosted workflow action.
