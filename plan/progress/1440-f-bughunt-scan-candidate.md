# 1440 Scan candidate, objective chip and tutorial order bug hunt

## Plan

Two rounds: reproduce scan selection and held-input transitions with strict
regressions, then audit tutorial order/Reset/restart, Journal rescans and mission
completion with contacts left over. Keep objective candidate priority, keyboard /
pad / touch parity, completion-only tutorial scans and the 150–300 m mission
approaches. Fix confirmed bugs minimally; retain all existing assertions.

## Round 1

- Confirmed two bugs with four failing scanner regressions before the fixes:
  a nearer supplemental sample overrode a scannable mission objective (both
  fixed-target orders); switching contacts while holding Scan retained the old
  active card identity and omitted the new target's start event.
- Minimal Scanner fixes: protect objective priority in the supplemental pool;
  clear the old active state before starting the replacement scan. Switching
  now reports range versus facing accurately. Existing stickiness, decay and
  completion assertions are unchanged. All 25 scanner tests pass.

## Round 2

- Added real Input → Scanner → ScanOverlay probes for keyboard G, pad RB and
  the actual touch Scan pointer listeners. Held progress, release/interrupt,
  resume, selected identity and one completion agree for all three devices.
- Added onboarding system probes for early lights + completed scan + Journal
  or Photo, clearing all deferred actions on a new dive, and system reboot
  before completion (the lifecycle used by Reset/restart reloads). New scans
  still require completion; old listeners cannot advance the new tutorial.
- Added persistent Journal integration coverage: same-dive repeats do nothing;
  a new-dive rescan preserves the first timestamp, unlocks and unique entries,
  increments the scan count once and survives storage reload.
- Added real Mission + Scanner + waypoints integration: the optional objective
  takes over after the last primary, ending/resuming credits completion once,
  and non-objective contacts remain scannable after all objectives are done.
- Retained the objective chip/card exclusivity and suppression regressions;
  no tutorial, input, HUD, mission-opening or content production code changed.

## Validation (in progress)

- Vite's default config bundler cannot write to the shared read-only
  node_modules. The existing writable-config gate mode and Vitest runner avoid
  this without changing dependencies or repository configuration.
- Focused capability checks: 197 tests in 11 files passed, including the
  retained approach, tutorial-order, input and progress regressions.
- Production build / TypeScript passed. All 806 E2E tests in 96 files collect.
- Full gate running with
  `GATES_CONFIG_MODE=writable PW_PORT=4440 PW_OUTDIR=dist-1440 tools/gates.sh --full-e2e`.
  Logs: `.cache/gates/`; browser collection: `.cache/1440-e2e-collection.log`.
