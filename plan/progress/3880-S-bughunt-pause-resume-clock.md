# S-bughunt: pause/resume/quit-to-Home clocks

DIRECTOR Backlog 7, S-verify / S-bughunt [Codex, standing], specifically
S-bughunt. Audited SHA: `f587b1650e345451211a2751b146f126fe2e26c0`.
Initial checkout clean. Both headless audit rounds found adequate collected
coverage and no additional supported-path defect. Only this note changes;
production and tests remain unchanged. No failing-before/passing-after claim.

## Intake and ownership

Read CONTRIBUTING-AGENTS.md; DIRECTOR Backlog, simplicity rules and rubric;
REVIEWS' newest dated comprehensive entry (2026-10-24 afternoon) and the older
targeted entry above it; OVERNIGHT-LOG through run 127; launched 3530, 3590,
3720 and current 3870–3890 briefs; relevant results and progress notes.

The exact clock slice was already audited in
[3720](3720-S-bughunt-pause-resume-clock.md), collected in OVERNIGHT run 113.
[3530's report](3530-S-bughunt-lifecycle-report.md) documents the historical
blur/focus catch-up defect and collected fix;
[3590](3590-S-verify-loop-blur-focus.md) extends interruption guards;
[3620](3620-S-bughunt-supply-sim-time.md) covers admitted supply time;
[3710](3710-S-bughunt-touch-input-state.md) audits input interruption;
[3730](3730-S-bughunt-fuel-battery.md) adds reserve boundary cases. These
guards are present at this SHA, rather than borrowed from held patches.

Inspected every registered worktree's HEAD/status, tracked diff statistics and
commits absent from main. Held 2980/3050 contain collision changes; 3310 holds
a committed journey/scanner/UI patch; 3320/3380 hold notes; 3340 holds e2e touch
coverage and a note. Read 3310's relevant Scanner and unit-test diffs: they do
not supply the interruption guards cited below and are not dependencies.
Current neighboring 3870 save migration and 3890 hazard recovery checkouts
were clean during intake. Their named notes/spec slices remain theirs,
including finished work awaiting collection. Rechecked this SHA and clean
status immediately before writing. No other worktree or held package was
edited by this audit. Final ownership recheck: 3870 now has its save audit
note; 3890 has its recovery note and two shallow-ascent/reset cases in
`d2Hazard.test.ts`. Read that diff/note; those uncollected recovery cases do
not cover this clock slice and are not copied or required. Held-package
statuses are unchanged, main is clean, and this checkout still has only its
named note at the pinned SHA.

## Round 1: existing capability map

Links refer to the pinned checkout. Historical assertions remain intact.

| Supported contract                                                                                               | Production evidence                                                                                                                                                                                                                        | Existing headless guards                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pause, hidden documents, modal debrief and Home stop physics and dive clocks                                     | [shell.ts:49](../../src/app/systems/shell.ts#L49) freezes any non-dive shell state; [loop.ts:28](../../src/app/loop.ts#L28) supplies zero steps and clockDt                                                                                | [appSystems.test.ts:24](../../tests/unit/appSystems.test.ts#L24) hidden-frame input/clock gate; [:82](../../tests/unit/appSystems.test.ts#L82) real loop timestamps, Pause/debrief and equal mission/session totals                                                                                                                                                                             |
| Long returning intervals and repeated lifecycle events cannot catch up or leave fractional backlog               | [loop.ts:74](../../src/app/loop.ts#L74) coalesces app/visibility/blur/focus resets and discards interrupted steps; [Time.ts:35](../../src/core/Time.ts#L35) clears accumulator/interpolation, caps ordinary gaps to 0.25 s/eight steps     | [appSystems.test.ts:159](../../tests/unit/appSystems.test.ts#L159) transitions between RAFs, throttled hidden RAF, both blur/focus timing orders, 8/9 ms recovery and repeated touch-active pairs; [:255](../../tests/unit/appSystems.test.ts#L255) listener cleanup                                                                                                                            |
| Battery/oxygen drain follows admitted fixed time once, including supported sim speeds                            | [power.ts:71](../../src/app/systems/power.ts#L71) returns on zero steps and charges steps × fixedDt × simSpeed                                                                                                                             | [powerSystem.test.ts:243](../../tests/unit/powerSystem.test.ts#L243) ordinary/batched six-second conservation; [:283](../../tests/unit/powerSystem.test.ts#L283) exact reserve preservation through zero-step/Pause/debrief/resume frames followed by one/eight-step charging                                                                                                                   |
| Depletion/warnings stay bounded, Arcade supplies stay disabled, rescue dispatch stays single                     | [Power.ts:70](../../src/game/Power.ts#L70) rejects invalid duration; [power.ts:81](../../src/app/systems/power.ts#L81) latches emergency ownership                                                                                         | [d2Hazard.test.ts:95](../../tests/unit/d2Hazard.test.ts#L95) invalid/huge duration and warning thresholds; [powerSystem.test.ts:318](../../tests/unit/powerSystem.test.ts#L318) battery/oxygen/both, single ascent and debrief; [:369](../../tests/unit/powerSystem.test.ts#L369) mode guards                                                                                                   |
| A partial scan neither advances nor decays through interruptions, and resumes without duplicate saved completion | [discovery.ts:67](../../src/app/systems/discovery.ts#L67) passes gated fixed time, dive clock and blocked state separately                                                                                                                 | [overlayFocus.test.ts:2919](../../tests/unit/overlayFocus.test.ts#L2919) keyboard/touch × Pause/Journal/debrief/hidden/blur/both event orders: stable progress/statistics, one abort, one-hour return, cleared hold, active decay and one persisted completion                                                                                                                                  |
| Quit clears input and cannot apply a stale asynchronous descent charge                                           | [input.ts:20](../../src/app/systems/input.ts#L20) clears on non-dive states; [shell.ts:128](../../src/app/systems/shell.ts#L128) Quit enters Home; [power.ts:32](../../src/app/systems/power.ts#L32) guards deferred work by disposal/Home | [appSystems.test.ts:266](../../tests/unit/appSystems.test.ts#L266) held keys across Pause/Home and replacement Input; [overlayFocus.test.ts:3183](../../tests/unit/overlayFocus.test.ts#L3183) real Quit button before readiness/after queued microtask over three lifetimes, no stale reserve/notice/reset listeners                                                                           |
| Blur/hidden/touch interruptions release old controls and baseline returning pad shortcut edges                   | [Input.ts:516](../../src/core/Input.ts#L516) lifecycle listeners and clear; [input.ts:31](../../src/app/systems/input.ts#L31) frozen-frame cleanup                                                                                         | [subInput.test.ts:144](../../tests/unit/subInput.test.ts#L144), [:206](../../tests/unit/subInput.test.ts#L206), [:391](../../tests/unit/subInput.test.ts#L391) background polling/held and queued input; [touchControlsAudit.test.ts:468](../../tests/unit/touchControlsAudit.test.ts#L468), [:555](../../tests/unit/touchControlsAudit.test.ts#L555) gesture/pointer ownership and fresh holds |
| Event lifetime excludes freezes and cannot replay a paused arrival                                               | [explore.ts:190](../../src/app/systems/explore.ts#L190) uses gated clockDt                                                                                                                                                                 | [eventsSystem.test.ts:150](../../tests/unit/eventsSystem.test.ts#L150) unchanged elapsed time through blocked/frozen/Pause, one log, expiry and paused exit/re-entry latch                                                                                                                                                                                                                      |

## Round 2: challenge and decision

Traced suspended RAF and throttled hidden RAF, app transitions entirely between
frames, fractional fixed time at resume, repeated blur/focus inside Pause or
debrief, partial scans and quit with pending asynchronous mission readiness.
The collected contracts above already distinguish these boundaries. Home uses
the same non-dive freeze/input gate as Pause; supply and scan consumers receive
zero admitted time. Quit-specific tests cover both held input and deferred
reserve mutation. Repeated shell lifetimes additionally release listeners,
modal ownership and timers in
[overlayFocus.test.ts:2534](../../tests/unit/overlayFocus.test.ts#L2534).
No redundant case belongs in the hazard spec merely to relocate these guards.

Preserved policy: blur resets the interrupted interval, but a visible unfocused
page can subsequently advance; it is not a persistent auto-pause mode. Held pad
axes/Scan can return as level input, while returning shortcut edges are
baselined ([subInput.test.ts:351](../../tests/unit/subInput.test.ts#L351)).
Camera/UI elapsed time continues while the dive is frozen. The first returning
interval intentionally contributes zero. A visible long frame without a
lifecycle signal is capped. No ambiguous policy change or supported regression
was identified, so no production correction is proposed.

## Validation

Focused existing headless capabilities:

```bash
npm test -- --configLoader runner --cache=false tests/unit/appSystems.test.ts tests/unit/powerSystem.test.ts tests/unit/power.test.ts tests/unit/d2Hazard.test.ts tests/unit/overlayFocus.test.ts tests/unit/subInput.test.ts tests/unit/touchControlsAudit.test.ts tests/unit/gameScanner.test.ts tests/unit/eventsSystem.test.ts tests/unit/missionRouter.test.ts
```

Exit **0**: **10 files / 412 tests passed**, **2.78 s**.
Log: `/tmp/3880-pause-focused.log`.

Required gates:

```bash
GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e
```

Exit **1**, **FAIL gates (e2e=none)**. Log: `/tmp/3880-pause-gates.log`;
detailed logs: `.cache/runs/20261024-194646-7-9pOszq/`.

- PASS config preparation, strict content, production build (including
  TypeScript), attribution and repository-wide formatting.
- PASS full units: **192 files / 4,220 passed tests / four existing expected
  failures**, **4,224 total**, **649.62 s**. Existing collision expected-failure
  cases remain intact.
- FAIL Python, detailed below. No browser stages ran; actual local e2e mode
  is **none**.

Python ran **167 tests in 9.474 s: 162 passed, five failed**:

- `test_ci_build_manifest.TestCiBuildManifest`:
  `test_both_bases_survive_copy_and_verify_all_provenance_fields`,
  `test_every_manifest_mismatch_is_rejected`,
  `test_missing_output_or_manifest_and_workflow_sha_mismatch_fail`, and
  `test_symlinks_missing_public_data_and_manifest_overwrite_are_rejected`
  report `spawnSync git EPERM`.
- `test_golden.TestGolden.test_golden_tooling` reports
  `Unexpected end of JSON input` at `tools/tests/golden-manifest.test.mjs:151`
  while parsing comparison-child output. Its Node suite passes 24/25 subtests;
  the underlying cause of empty output is not established here.

These signatures match collected lifecycle/supply audits. They remain failed
commands regardless of historical wrapper PASS labels. Retain these tooling
failures outside this slice: the smallest follow-up is to run unchanged tooling
where child processes are permitted and inspect the golden child's exit status,
stderr and stdout before proposing any tooling correction. No retries, skips,
timeout increases or tooling edits were used.

Final `npx prettier --check plan/progress/3880-S-bughunt-pause-resume-clock.md`
and `git diff --check` both exited **0** after recording the gate outcome.

## Simplicity, rubric and limits

Evidence note only: no runtime complexity or duplicate tests, no UI/guidance,
settings, abstractions, dependencies, schema, site branches or runtime Config
mutation. Existing assertions, tolerances, budgets, snapshots and product
policies remain intact. Correct active-time accounting protects simple,
rewarding exploration and its Journal records without changing factual content.
Arcade remains default. Real GMRT terrain, all 13 site identities, five hero
set pieces, scanning, Journal, marine life, keyboard/pad/touch input and
accessibility are unchanged.

No browser launch, game rendering, WebGL context, screenshots, GPU, hosted CI,
unaided journey or physical-device validation. Visual readability/beauty, touch
layout and real-phone performance remain with Claude/owner. No merge, push,
tag, hosted workflow dispatch or tools changes.
