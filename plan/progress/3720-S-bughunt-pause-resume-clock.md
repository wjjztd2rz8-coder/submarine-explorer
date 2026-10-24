# S-bughunt: pause/resume and hidden-tab clocks

Serves DIRECTOR Backlog 9, S-verify / S-bughunt [Codex, standing], specifically
S-bughunt. Audited SHA: `d2dba6e75319b4be556a2372834f3cef4be8d567`.

Both audit rounds found adequate existing coverage and no supported-path defect.
Only this note changes. Production and all tests remain unchanged; there is no
new failing-before/passing-after claim or proposed production correction.

## Intake and ownership

Read CONTRIBUTING-AGENTS.md; DIRECTOR's Backlog, simplicity rules and rubric;
REVIEWS' newest dated comprehensive entry (2026-10-24 early) and the older
targeted entry above it; OVERNIGHT-LOG through run 111; launched 3530/3590/3620
and 3690–3720 briefs; relevant final results and progress notes. Result wrappers
label earlier gates PASS despite their embedded reports recording failures;
those labels do not establish successful commands or validate this SHA.

Inspected registered worktrees' HEAD/status, committed differences and tracked
diff paths/statistics; read the adjacent held 3690 uiHud diff and its boundary
report. Rechecked ownership and local SHA/status immediately before this edit.
Finished 3670/3680 have notes only; 3690 holds uiHud boundary additions and its
note. Concurrent 3700 owns scanner coverage; 3710 owns input-state work. Held
2980/3050 collision work, 3310 journeys, 3320/3340/3380 packages and all their
files remain untouched. No patches are copied or required from these worktrees.

The relevant clock and supply work is already collected: OVERNIGHT runs 103,
106 and 107 record 3530, 3590 and 3620 respectively. Current git history includes
`d98676e` (3590) and `1c9dee1` (3620), with merge `589839f` for the latter.
Their guards are present in this checkout. The older 3620 note's description of
3590 as uncollected is historical, not the current ownership state.

## Round 1: production and existing capability map

All references below are to the pinned checkout. No test addition is warranted
by relocating already-covered clock cases into a depth/hull capability.

| Supported contract                                                                                     | Production evidence                                                                                                                                                                                                                                                                            | Existing headless guard                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bound delivered physics after a long RAF gap                                                           | [Time.ts:40](../../src/core/Time.ts#L40) clamps delta to 0.25 s, delivers at most eight steps, drops remaining backlog; [discardSteps:35](../../src/core/Time.ts#L35) also clears fractional interpolation/backlog                                                                             | [appSystems.test.ts:82](../../tests/unit/appSystems.test.ts#L82) uses real startLoop timestamps, long gaps, 8/9 ms recovery and exact admitted steps                                                                                                                                                                                                                 |
| Pause, hidden documents and debriefs freeze simulation and dive clocks                                 | [shell.ts:49](../../src/app/systems/shell.ts#L49) sets frozen from hidden state, shell/modal state and free-dive debrief; [loop.ts:28](../../src/app/loop.ts#L28) sets steps and clockDt to zero while frozen or resuming                                                                      | [appSystems.test.ts:24](../../tests/unit/appSystems.test.ts#L24) hidden-frame gating; [:82](../../tests/unit/appSystems.test.ts#L82) suspended and throttled RAF, Pause/debrief and equal mission/session totals                                                                                                                                                     |
| Returning intervals and repeated transition events cannot catch up or double-reset later active frames | [loop.ts:74](../../src/app/loop.ts#L74) coalesces app/visibility/blur/focus reset events; [:97](../../src/app/loop.ts#L97) includes wasFrozen and discards interrupted fractions after each frame                                                                                              | [appSystems.test.ts:159](../../tests/unit/appSystems.test.ts#L159) pause/resume entirely between RAFs, hide/show, both blur/focus timing orders, repeated modal transitions and 40 repeated touch-active cycles; [:255](../../tests/unit/appSystems.test.ts#L255) listener cleanup                                                                                   |
| Vehicle simulation and supply drain use admitted fixed steps, with supported speed multipliers         | [submarine.ts:104](../../src/app/systems/submarine.ts#L104) advances Submarine only for f.steps; [Submarine.ts:256](../../src/sub/Submarine.ts#L256) runs whole ticks for simSpeed; [power.ts:71](../../src/app/systems/power.ts#L71) charges steps × fixedDt × simSpeed once per active frame | [powerSystem.test.ts:243](../../tests/unit/powerSystem.test.ts#L243) ordinary/batched real-Time delivery at 1×/2×/3× and three supported loads; [:283](../../tests/unit/powerSystem.test.ts#L283) zero-step/Pause/debrief/resume preserve exact supply state, then one/eight steps charge exactly twice                                                              |
| Disabled Arcade supplies do not drain; depletion dispatch remains single                               | [Power.ts:70](../../src/game/Power.ts#L70) rejects disabled/nonpositive/nonfinite duration; [power.ts:81](../../src/app/systems/power.ts#L81) latches ascent and free-dive debrief ownership                                                                                                   | [power.test.ts:8](../../tests/unit/power.test.ts#L8) disabled/zero time, [:36](../../tests/unit/power.test.ts#L36) split-duration conservation; [powerSystem.test.ts:318](../../tests/unit/powerSystem.test.ts#L318) battery/oxygen/both exhaustion, one ascent and free/mission dispatch; [:369](../../tests/unit/powerSystem.test.ts#L369) existing mode guards    |
| Sighting duration advances only on active dive-clock time; paused excursions cannot rearm arrival      | [explore.ts:190](../../src/app/systems/explore.ts#L190) feeds clockDt once, zero when blocked/frozen/outside dive; [Events.ts:63](../../src/game/Events.ts#L63) rejects zero/invalid dt before elapsed time or arrival-latch mutation, clamps expiry and requires a new entry                  | [gameExplore.test.ts:82](../../tests/unit/gameExplore.test.ts#L82) remote/occupied/no-overlap/no-queue/invalid-dt/reset cases; [eventsSystem.test.ts:150](../../tests/unit/eventsSystem.test.ts#L150) each shipped event kind preserves exact elapsed time through blocked/frozen/Pause frames, logs once, expires without replay and ignores a paused exit/re-entry |
| Scan/event progress and dive statistics exclude interruptions without duplicate completion             | [discovery.ts:67](../../src/app/systems/discovery.ts#L67) sends admitted fixed duration to Scanner and clockDt to statistics; [mission.ts:230](../../src/app/systems/mission.ts#L230) sends clockDt separately from UI delta                                                                   | [overlayFocus.test.ts:2919](../../tests/unit/overlayFocus.test.ts#L2919) keyboard/touch partial scans across Pause/Journal/debrief/hidden/blur/both event orders, hour-long returning interval, one abort and one saved completion; [missionCore.test.ts:469](../../tests/unit/missionCore.test.ts#L469) debrief time excluded and Keep exploring resumes            |

The stage ordering in [System.ts:32](../../src/app/System.ts#L32) places freeze
and input gates before vehicle and supply simulation, and calls each registered
hook once per frame. Event elapsed time uses the active real dive clock, not
simSpeed-scaled supply time. Arrival events replaced the former timed-spawn
mechanism; waiting at an occupied contact does not spawn another event.
Mission completion timers also consume clockDt in
[MissionRouter.ts:482](../../src/game/MissionRouter.ts#L482), with pending/open
banner countdowns in [:534](../../src/game/MissionRouter.ts#L534). The existing
[overlayFocus completion cases:1822](../../tests/unit/overlayFocus.test.ts#L1822)
retain Journal ownership during late primary/all completion, exclude frozen
and returning intervals, and show the banner after exactly three active seconds.

## Round 2: challenge and scope assessment

Traced long gaps with no RAF, hidden tabs that continue throttled RAF, a frozen
fraction before resume, app transitions wholly between frames, and repeated
blur/focus pairs before and between frames. Existing appSystems and overlayFocus
cases already distinguish those boundaries and assert subsequent active time.
The supply integration checks consume the same admitted-step contract; the
event caller consumes the same clockDt contract. Existing event-system cases
also verify elapsed time remains unchanged and a paused excursion cannot rearm
the arrival latch. No missing supported boundary was identified.

[3530's report](3530-S-bughunt-lifecycle-report.md) records the historical
eight-step/0.25 s blur/focus catch-up defect and its five-line production fix.
[3590's verification](3590-S-verify-loop-blur-focus.md) challenges repeated
transitions and quality recovery; [3620's supply audit](3620-S-bughunt-supply-sim-time.md)
adds the actual supply integration guards. These are existing evidence, not a
new reproduction or fix in this audit.

Preserved policies: a visible unfocused page can advance after the interrupted
blur interval; blur is not a persistent auto-pause mode. The first returning
interval intentionally contributes zero even if short. Time.elapsed/frameDelta
continue serving camera/UI animation while frozen; active dive clocks and
supplies use their own gated durations. A visible long frame with no lifecycle
signal is capped, not inferred to be a hidden-tab transition. No policy redesign
or unconditional claim about arbitrary injected RAF timestamps is made.

The held 3690 nonfinite-reset/HUD report is outside this slice and stays with
that package; it is not a demonstrated supported pause/resume defect. No
production correction is justified here.

## Validation

Focused existing headless capabilities, no edits:

```bash
npm test -- --configLoader runner --cache=false tests/unit/appSystems.test.ts tests/unit/powerSystem.test.ts tests/unit/power.test.ts tests/unit/d2Hazard.test.ts tests/unit/Submarine.test.ts tests/unit/eventsSystem.test.ts tests/unit/gameExplore.test.ts tests/unit/overlayFocus.test.ts tests/unit/missionRouter.test.ts tests/unit/missionCore.test.ts
```

Exit 0: **10 files / 317 tests passed**, 4.61 s. Log:
`/tmp/3720-focused.log`. No failing-before/passing-after result applies.

Required command (running; final result to be recorded):

```bash
GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e
```

Log: `/tmp/3720-gates.log`. Actual local e2e mode is **none**.
Detailed gate logs: `.cache/runs/20261024-051710-7-tJGOip/`.

Python completed with **5 failures / 167 tests**, 16.312 s (162 passed):

- Four `test_ci_build_manifest` cases report `spawnSync git EPERM`:
  `test_both_bases_survive_copy_and_verify_all_provenance_fields`,
  `test_every_manifest_mismatch_is_rejected`,
  `test_missing_output_or_manifest_and_workflow_sha_mismatch_fail`, and
  `test_symlinks_missing_public_data_and_manifest_overwrite_are_rejected`.
- `test_golden_tooling` fails in its comparison child-output JSON parsing:
  `Unexpected end of JSON input`, `tools/tests/golden-manifest.test.mjs:151`.
  Its internal Node suite passes 24/25 subtests. This run does not establish
  the underlying cause of the empty child output.

These signatures match the previous lifecycle/supply/depth audits. They remain
actual command failures, irrespective of earlier wrapper PASS labels. No tool,
assertion, configuration policy or timeout is changed to suppress them. The
smallest follow-up is to run the unchanged tooling where child processes are
permitted and inspect the golden child's status/stderr/stdout before proposing
a tooling correction; it is outside this clock slice.

## Simplicity, rubric and limits

Evidence note only: no redundant tests, runtime complexity, abstraction, setting,
UI, guidance surface, site branch, dependency, schema or runtime config mutation.
All historical assertions, tolerances, budgets, snapshots and the four collision
expected failures remain intact; no retry, skip or timeout change. Predictable
active-time accounting protects correct, simple, rewarding exploration without
changing factual site content or rewards. Arcade remains default. GMRT terrain,
all 13 site identities, five hero set pieces, scanning, Journal, marine life,
keyboard/pad/touch input and accessibility are unchanged.

No game rendering, browser, WebGL context, screenshot or pixel acceptance was
used. No hosted CI, GPU, unaided journeys, physical-device lifecycle, visual
readability/beauty, touch layout or real-phone performance validation is claimed.
No merge, push, tag, hosted workflow dispatch or other-worktree mutation.
