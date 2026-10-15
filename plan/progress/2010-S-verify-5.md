# 2010 — S-verify, fifth pass

Base reviewed: `8beae85`; merged checkout: `61b2caf`. Also inspected the
S-hud, S-picker and V-journeys changes already present at the base. Scope is
functional behavior and tests; no visual judgment or layout changes.

## Plan

1. Trace Home sheet keyboard ownership, HUD controls, guidance/mode updates,
   save compatibility and teardown. Reproduce confirmed defects with tests
   in existing capability files, then fix them.
2. Review the repairs, audit HUD CSS selector usage and run focused plus broad
   checks. Record limits of validation without changing visuals.

## Round 1 — confirmed defects and repairs

- A swipe left Home's shared `swiped` flag set until another pointerdown, so
  Enter/Space on the sheet grab stopped toggling it. Only the trailing pointer
  click is now ignored; keyboard clicks (`detail === 0`) remain usable.
- Completion banner buttons had `tabIndex = -1`, excluding both choices from
  keyboard navigation. Native Tab stops are restored. Showing the banner
  still leaves flight focus alone; pointerdown still prevents focus theft.
  Existing Input handling preserves native Space/Enter without piloting.
- The HUD system never invoked `HUD.dispose`, leaving readouts and Journal /
  Reset camera buttons mounted after teardown. Register its existing disposer.
- The waypoint system likewise left its DOM mounted and allowed its pending
  POI load to update waypoints and sonar after teardown. Dispose the view and
  guard the combined ready callback for that particular system lifetime.

Five new cases in `overlayFocus.test.ts` failed against the original source
(the waypoint case runs settled and pending). They pass after the repairs.
The existing waypoint capability mock now exposes the view's dispose API.
Initial focused validation: 224 tests passed across eight capability files;
TypeScript check passed.

## Round 2 — audit and validation

- Home owns the entire site subview (sheet and embedded globe) through its
  existing FocusTrap. Escape closes the subview and restores Dive sites / Free
  dive; nested Settings retains keyboard ownership until it closes. Collapsed
  phone rows are excluded through CSS visibility. The globe remains usable
  beside/behind the sheet as intended.
- Existing modal tests walk forward/reverse Tab, filter hidden/inert/disabled
  controls and closed disclosures, and verify nested Escape and focus return.
  Onboarding / shell lifecycle coverage checks listener removal and zero timers
  over three Home/dive/Home lifetimes. Globe and MissionRouter tests cover
  pending asynchronous work and repeated disposal. No additional listener or
  timer defect was confirmed in those paths.
- Live Arcade/Realistic/Custom changes resolve effective settings; the approach
  waypoint intentionally survives until the approach ends, then follows the
  saved waypoint switch. Settings/briefing suppression clears guidance offers
  and resumed sources offer current state. Existing guidance, onboarding and
  mode-switch tests passed; no further stale guidance defect was reproduced.
- Settings migration, gameplay switches and save-soak tests passed. No storage
  keys, schemas, default settings or persisted values changed in this patch.
- Reviewed every selector in `hud-layout.css`, including conditional touch,
  current objective, expanded sonar, scan guidance and completion states. All
  33 class/state tokens have live TypeScript producers; compound selectors
  match the current DOM structure. Sheet custom properties are consumed by
  `sonar.css`. No unused selector was found, so the stylesheet is unchanged.
- V-journeys' landscape briefing footer, waypoint placement and debrief score
  row were inspected functionally alongside the existing capability guards.
  No visual assessment is claimed; no CSS, geometry, colors or layout changed.

### Validation

- Focused unit audit: **224 / 224 pass**, eight existing capability files
  (`overlayFocus`, `missionApproachWaypoint`, `touchControlsAudit`, `guidance`,
  `missionApproachSystem`, `onboardCompletion`, `settingsSave`, `saveSoak`).
  Expanded audit: **67 / 67 pass** across `uiHud`, `homeFocus`, `predive`,
  `missionRouter`, `debriefSummary`, `firstMove`, `photoMode` and `f2-modes`.
  Total: **291 passing tests in 16 capability files**.
- Production build/typecheck, strict content validation, attribution,
  changed-file Prettier and `git diff --check` pass.
- Added three browser regressions in existing capability specs: Dive sites and
  Free dive sheet swipes followed by Enter/Space, Tab into the list and Escape
  focus return; completion choices with Tab/Shift+Tab and Space/Enter.
  Playwright discovers all **15 tests** in the two extended files; final
  TypeScript check passes.
- Full browser suite was attempted against the isolated production build.
  Preview startup fails before assertions: `listen EPERM 127.0.0.1:4635`.
  Browser regressions therefore still need execution on a socket-capable
  runner. No screenshots or browser passes are claimed.
- Broad writable-config gate: content and build pass; **162 / 166 Python tests
  pass**, with four build-manifest tests blocked by `spawnSync git EPERM`.
  The default full unit invocation reported no results for over two minutes
  and was interrupted. The full thread-pool retry also reported no test
  results before its 180-second bound expired (exit 124). Full-suite success
  is not claimed; the focused suites above completed normally.

Logs: `/tmp/s-verify-{red,targeted,expanded,gates,e2e,units,typecheck}.log` and
`.cache/runs/20261015-022107-28-3PMzQV/`.
