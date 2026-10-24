# 3530 S-bughunt lifecycle — final report

DIRECTOR Backlog 9. Two unit-level audit rounds completed. Reproduction and
coverage details are in [the progress note](3530-S-bughunt-lifecycle.md).

## Confirmed defect fixed

After a long RAF stall across window blur/focus without `visibilitychange`, the
first returning frame still executed eight physics steps and added 0.25 seconds
to mission and dive clocks. Input already cleared correctly, but the frame clock
did not observe these transitions.

`startLoop` now routes blur and focus through its existing reset handler and
removes both listeners on teardown. The next frame discards physics and clock
catch-up using the existing resume flag. A throttled frame after blur does not
consume the reset needed on focus. Rendering keeps its existing clamped delta.

The production diff is five added lines. No new state, setting, dependency, UI,
site branch or lifecycle abstraction. Blur still permits subsequent frames on
a visible unfocused page; this change adds no persistent auto-pause policy.

## Coverage

Extended existing capability specs, preserving the previous assertions:

- `appSystems.test.ts`: focus return without visibility events, an intervening
  blurred frame, mission/dive clock equality, fractional physics backlog,
  unchanged quality sampling and listener cleanup.
- `overlayFocus.test.ts`: five partial-scan cases covering Pause, Journal,
  visibility alone and both hide/blur orders. Each checks exactly one abort,
  no scan progress or decay during frozen frames, no catch-up after a one-hour
  interval, cleared held input and exactly one persisted completion on re-hold.
- The existing Journal/debrief case now covers primary-only and all-objective
  completion while Journal is open. Journal retains focus and keyboard
  ownership; the completion banner waits for active play after resume. Nested
  debrief close/focus return and non-dismissible abort behavior remain checked.

No additional production defect was confirmed in the scan or mission/modal
paths. Both architecture clock descriptions document the transition behavior.

## Validation

- Focused lifecycle suite: **304 passed across five specs**.
- `git diff --check` and formatting of changed files: passed.
- Canonical gates: **FAIL**, exit 1, using
  `GATES_CONFIG_MODE=writable bash tools/gates.sh` (smoke + project base);
  logs: `.cache/runs/20261023-180410-2-tVx7Iu/`.
- Full unit suite: **192 specs passed, 4,078 passed tests and four existing
  expected failures** (4,082 total), 639.64 seconds. Collision expected-failure
  cases remain intact.
- Config preparation, strict content validation, both production builds
  (including TypeScript), attribution and repository-wide formatting: passed.
- Python: 167 tests, five failures matching earlier audit reports. Four
  manifest cases report `spawnSync git EPERM`; golden tooling cannot parse
  comparison child stdout (`Unexpected end of JSON input`). Its underlying
  cause was not established by this audit.
- Browser smoke and project-base checks failed before browser tests ran:
  `Process from config.webServer was not able to start. Exit code: 1`.
  No deeper startup cause appears in the gate logs. No browser acceptance is
  claimed, and no tooling or assertions were changed to bypass gate failures.

Controlled timestamps and synthetic DOM events establish unit-level behavior.
Physical-device background/resume and visual acceptance were outside scope.
