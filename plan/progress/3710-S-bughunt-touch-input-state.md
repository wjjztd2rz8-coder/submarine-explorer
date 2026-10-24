# S-bughunt: touch, pad and keyboard input state

DIRECTOR Backlog 9, **S-verify / S-bughunt [Codex, standing]**, specifically
**S-bughunt**. Audited SHA: `d2dba6e75319b4be556a2372834f3cef4be8d567`.
Initial checkout clean. Two headless audit rounds; production remains read-only.

## Intake and ownership

Read DIRECTOR Backlog, simplicity rules and rubric, CONTRIBUTING-AGENTS.md,
the topmost targeted review and newest dated comprehensive review (2026-10-24
early), and OVERNIGHT-LOG through run 111. Read launched briefs for 3670–3720,
relevant 1630/3440/3590 results, collected S-bughunt/2750/3440/3590/3600 progress
evidence, and held 3340 plus finished 3680/3690 notes. Historical result-wrapper
PASS labels conflict with their embedded reports of failed commands; they are
not validation of this checkout.

Inspected registered worktrees' HEADs, status and diff statistics/changed paths;
rechecked before writing. Held 2980/3050 collision patches, 3310 journey work,
3320 full-e2e, 3340 touch layout audit and 3380 CI evidence remain untouched.
Finished 3670/3680 own notes only; 3690 owns uiHud tests and its note. Neighboring
3700 owns scan cooldown and 3720 pause/resume clocks. None of their patches is
required or copied here. The 3590 interruption coverage is already collected
on the audited SHA; run 106 records its collection/removal.

Only this named progress note changes. The brief repeats the depth/hull spec
wording from 3690, but this input audit needs no test edit: existing input and
touch capability guards already cover the supported slice. No ownership is
claimed over uiHud or another brief's files.

## Round 1: existing guards and coverage

Links refer to the audited checkout. Existing assertions remain intact.

| Supported contract                                                                                                              | Production guard                                                                                                                                                                                           | Existing capability evidence                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nonzero touch axes override keyboard; deflected pad axes override both; neutral/released sources expose remaining holds         | [Input.sample:680](../../src/core/Input.ts#L680) recomputes axes each frame; scan combines held sources                                                                                                    | [subInput:351](../../tests/unit/subInput.test.ts#L351) simultaneous sources and held pad edges through Pause; [subInput:517](../../tests/unit/subInput.test.ts#L517) all four axes, scan, neutral fallback, disconnect/reconnect and stale disconnected controls                                                                                |
| A new selected pad gets its own edge history; held shortcuts do not repeat each frame                                           | [Input:718](../../src/core/Input.ts#L718) resets history on pad-index changes and compares pressed buttons                                                                                                 | [subInput:462](../../tests/unit/subInput.test.ts#L462) sparse-pad handoff/reconnect for every mapped edge; [subInput:598](../../tests/unit/subInput.test.ts#L598) once-per-press edges                                                                                                                                                          |
| Keyboard or mouse changes touch mode; switching away releases touch pointers and holds                                          | [TouchControls:187](../../src/ui/TouchControls.ts#L187), [mode listeners:195](../../src/ui/TouchControls.ts#L195), [releaseAll:479](../../src/ui/TouchControls.ts#L479)                                    | [touchControls:138](../../tests/unit/touchControls.test.ts#L138) real mode-switch listeners, touch reactivation and modifier policy; [touchControlsAudit:468](../../tests/unit/touchControlsAudit.test.ts#L468) desktop interruption resets gesture history; release mechanics covered below                                                    |
| Lost capture/cancellation releases stick, slider and Scan, ignoring unrelated IDs and stale moves; new gestures work            | [TouchControls stick:232](../../src/ui/TouchControls.ts#L232), [slider:283](../../src/ui/TouchControls.ts#L283), [Scan:323](../../src/ui/TouchControls.ts#L323)                                            | [touchControlsAudit:263](../../tests/unit/touchControlsAudit.test.ts#L263) both pointercancel and lostpointercapture, all held controls, wrong IDs, stale moves and fresh presses                                                                                                                                                               |
| Releasing one Scan finger does not cancel another finger's hold                                                                 | [TouchControls:335](../../src/ui/TouchControls.ts#L335) checks remaining pointer owners                                                                                                                    | [touchControlsAudit:589](../../tests/unit/touchControlsAudit.test.ts#L589) duplicate cancel/lost-capture followed by final release                                                                                                                                                                                                              |
| Blur/hidden/dispose clears keyboard, touch, queued edges and camera deltas; touch interruptions discard stale pointer ownership | [Input.attach:516](../../src/core/Input.ts#L516), [clear:631](../../src/core/Input.ts#L631), [TouchControls:125](../../src/ui/TouchControls.ts#L125), [releaseAll:479](../../src/ui/TouchControls.ts#L479) | [subInput:391](../../tests/unit/subInput.test.ts#L391) held/queued/delta cleanup; [touchControlsAudit:555](../../tests/unit/touchControlsAudit.test.ts#L555) blur/resize/orientation/hidden, focus return, stale moves and late old-finger release after a new Scan                                                                             |
| Unfocused/hidden pad polling stays neutral; the returning sample baselines shortcuts                                            | [Input:558](../../src/core/Input.ts#L558), [sample:724](../../src/core/Input.ts#L724)                                                                                                                      | [subInput:144](../../tests/unit/subInput.test.ts#L144), [subInput:206](../../tests/unit/subInput.test.ts#L206) with and without background samples; fresh release/repress restores shortcuts                                                                                                                                                    |
| Menus/editors do not leak piloting or replay queued shortcuts                                                                   | [input system:20](../../src/app/systems/input.ts#L20), [input gate:25](../../src/app/loop.ts#L25), [shell:49](../../src/app/systems/shell.ts#L49), [Input:760](../../src/core/Input.ts#L760)               | [subInput:252](../../tests/unit/subInput.test.ts#L252), [subInput:317](../../tests/unit/subInput.test.ts#L317) editing focus; [appSystems:24](../../tests/unit/appSystems.test.ts#L24) hidden gate; [overlayFocus:2920](../../tests/unit/overlayFocus.test.ts#L2920) real keyboard/touch partial scans across Pause/Journal/debrief/blur/hidden |
| Teardown removes listeners before replacement controls attach                                                                   | [Input.dispose:620](../../src/core/Input.ts#L620), [TouchControls.dispose:172](../../src/ui/TouchControls.ts#L172)                                                                                         | [subInput:424](../../tests/unit/subInput.test.ts#L424), [touchControlsAudit:449](../../tests/unit/touchControlsAudit.test.ts#L449), [touchControlsAudit:509](../../tests/unit/touchControlsAudit.test.ts#L509) idempotence, callback removal and reboot                                                                                         |

The collected [3590 audit](3590-S-verify-loop-blur-focus.md) explicitly extended
the focus-return/stale-pointer guards. [3440](3440-S-verify-unit-gap-audit.md)
already mapped the input boundary and added denied-gamepad-poll fallback;
[subInput:95](../../tests/unit/subInput.test.ts#L95) retains that guard.

## Round 2: transition review, findings and simplicity

Traced the sequence from sampling through shell/input gates to late input/touch
cleanup. State changes clear keyboard/touch input immediately; frozen frames
clear again while preserving the established photo-mode controls. Touch mode
changes use the same releaseAll path as interruptions. Pointer ownership is
removed before stale move/up events can affect fresh controls. Scan completion
and interruption behavior is checked through real Input/Scanner consumers in
[touchControlsAudit:106](../../tests/unit/touchControlsAudit.test.ts#L106) and
[overlayFocus:2932](../../tests/unit/overlayFocus.test.ts#L2932).

Current policy is simultaneous input composition, not exclusive device ownership.
A physically held keyboard key can still supply an axis after a pad recenters;
a physically deflected pad or held Scan resumes level input after focus returns.
Returning pad shortcut edges are baselined rather than replayed. These are
explicit existing assertions, not stuck-control reproductions. Touch mode follows
touch/mouse/keyboard events; pad glyph selection is separate from touch-mode
visibility. An exclusive pad/touch handoff policy would be ambiguous and is
report-only. Canvas camera gestures use window pointer tracking rather than
calling setPointerCapture; the lost-capture contract above concerns captured
flight controls. Native capture delivery and actual app switching need device QA.

No additional production defect or materially missing supported contract was
demonstrated. No new test, failing-before/passing-after claim or proposed fix.
This completes the audit using already collected evidence without duplicate
assertions. No production, test, fixture, snapshot, tolerance, setting, dependency,
schema, runtime Config, UI or site data changes. Arcade and all exploration,
reward and accessibility policies remain intact. Correctness is supported by
the existing headless guards; visual readability/beauty, touch layout and
real-phone performance remain with Claude/owner.

## Validation

- `npm test -- --configLoader runner --cache=false tests/unit/subInput.test.ts tests/unit/touch.test.ts tests/unit/touchControls.test.ts tests/unit/touchControlsAudit.test.ts tests/unit/appSystems.test.ts tests/unit/overlayFocus.test.ts`
  exited **0**: **6 files / 304 tests passed**, **2.45 s**.
- `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e` is running.
  Summary log: `/tmp/3710-gates.log`; individual logs:
  `.cache/runs/20261024-051632-3-qH5Pl0/`.
  Initial results: PASS config, strict content and production build including
  TypeScript. Python ran **167 tests / 5 failures**, **13.416 s**: four
  `test_ci_build_manifest` cases report `spawnSync git EPERM`; golden tooling
  reports `Unexpected end of JSON input`. These match collected 3590 and
  finished 3680 evidence; they remain actual failures, with no workaround/retry.

The Python failures are
`test_both_bases_survive_copy_and_verify_all_provenance_fields`,
`test_every_manifest_mismatch_is_rejected`,
`test_missing_output_or_manifest_and_workflow_sha_mismatch_fail`,
`test_symlinks_missing_public_data_and_manifest_overwrite_are_rejected`
(all `test_ci_build_manifest.TestCiBuildManifest`), and
`test_golden.TestGolden.test_golden_tooling` (JSON parsing at
`tools/tests/golden-manifest.test.mjs:151`).

No browser launch, game rendering, WebGL context, screenshots, GPU, hosted CI,
unaided journey or real-phone validation. Actual local e2e mode is **none**.
No merge, push, tag, hosted workflow dispatch or tools changes.
