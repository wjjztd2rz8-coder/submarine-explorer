# 3530 S-bughunt: pause, resume and background-tab lifecycle

Serves DIRECTOR Backlog 9 (`S-verify / S-bughunt`). Scope: unit-level lifecycle
audit; extend existing capability specs and fix confirmed defects minimally.

## Plan

1. Round 1: trace visibility/blur input, frame clocks, partial scans and modal
   ownership. Add regression cases before making any confirmed fixes.
2. Round 2: audit event ordering with the Journal open and long resume deltas;
   verify cleanup and repeated transitions against the real frame boundaries.
3. Run focused capability tests and `GATES_CONFIG_MODE=writable bash tools/gates.sh`.
   Record all gate results and limitations here and in a final report.

## Progress

- Read `plan/DIRECTOR.md`, `CONTRIBUTING-AGENTS.md`, frame/input/shell/discovery
  systems and existing capability coverage. Working tree started clean.
- Existing tests cover hidden-tab pad suppression, held input clearing, paused
  and hidden mission clocks, first-resume physics suppression, and quality
  sampling. Extended these capabilities rather than add a new spec.
- Round 1 reproduced a missing clock reset on blur/focus without visibility
  events: a 60-second RAF gap advanced eight physics steps and 0.25 seconds of
  mission/dive time on return. Added the two window events to the existing
  reset handler in `startLoop`, with matching teardown. No new state was needed.
- Extended `appSystems.test.ts` to check that focus recovery drops the long
  interval, clears fractional physics backlog and leaves quality sampling
  untouched. Also checked a throttled frame between blur and focus, so each
  transition independently resets the clock, plus listener cleanup.
- Round 2 added five cases to `overlayFocus.test.ts` using real Input,
  Discovery/Scanner, Journal, shell/input gates and the RAF loop. Pause,
  Journal, visibility alone and both blur/hide orders each interrupt a partial
  scan exactly once. Frozen frames neither advance nor decay its progress;
  a one-hour return interval adds no progress or dive time. Re-holding finishes
  and persists exactly one discovery. Return ordering includes focus before
  visibility and visibility before focus.
- Expanded the existing mission/debrief/Journal case into primary-only and
  all-objective completion cases. A late scan event updates Mission while
  Journal retains focus and keyboard ownership; completion banners wait for
  three seconds of active play after resume. Existing nested debrief Escape,
  focus return, Keep exploring and non-dismissible abort assertions remain.
  No additional production defect was found in these paths.
- Focused suite: **304 passed across five capability specs** (`appSystems`,
  `overlayFocus`, `missionRouter`, `gameScanner`, `subInput`), using
  `npm test -- --configLoader runner --cache=false <spec paths>`.
- Updated both existing frame-clock descriptions in `docs/architecture.md`.
  Blur clears input and resets the transition interval; it does not introduce
  a new persistent pause policy for a visible unfocused page.

## Gates

Command: `GATES_CONFIG_MODE=writable bash tools/gates.sh`. Logs:
`.cache/runs/20261023-180410-2-tVx7Iu/`.

- Overall: **FAIL**, exit 1 (`e2e=smoke`).
- PASS config preparation, strict content validation and production builds
  (root and project base), including TypeScript.
- PASS full unit suite: **192 specs, 4,078 passed, four expected failures**
  (4,082 total), 639.64 seconds. Existing collision expected-failure cases
  remain intact and are not claimed fixed.
- Python: **167 tests, five failures**. Four manifest tests hit
  `spawnSync git EPERM`; golden tooling fails parsing comparison child stdout.
  These signatures match the earlier `3500-S-bughunt-audio-lifecycle` report.
  No tooling or assertion was changed to suppress them.
- Browser smoke and project-base checks both failed before any browser test
  ran: `Process from config.webServer was not able to start. Exit code: 1`.
  The logs do not expose a deeper startup cause; no browser acceptance is
  claimed and no gate configuration was changed to bypass this failure.
- PASS attribution and repository-wide Prettier. Final changed-file formatting
  and `git diff --check` also pass.

## Simplicity

Production change: five added lines at the existing frame-clock boundary.
No new UI, settings, dependencies, site branches or lifecycle abstraction.
Package history stays in these progress/report files.

## Acceptance limits

Both unit-level audit rounds are complete. Synthetic DOM events and controlled
RAF timestamps verify ordering and clock ownership; physical-phone lifecycle
and visual behavior are not claimed as verified.
