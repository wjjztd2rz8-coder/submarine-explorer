# J-home-controls — shared device guide

## Functional change

Home's existing Controls action now opens the same `ControlsCard` reference dialog
as Pause Controls / How to play. It replaces Home's direct jump into keyboard
rebinding settings. No dialog, on-screen action, setting, CSS adjustment or guidance
surface was added. Touch keeps the existing ten illustrated How to play tiles and
hides device tabs and Change keys. Keyboard/pad retain the layout tabs and the
keyboard layout's Change keys route into the existing Settings controls page.

`createControlsSystem` owns the single guide and device listeners in both Home and
dive system lists. Home uses its existing `Input` and touch detection; it does not
install onboarding, a vehicle, scanner, terrain or mission simulation. The
existing decorative title crop is unchanged. The guide still uses `FocusTrap`
for overlay ownership, Close/Escape, opener focus and idempotent close. The
existing dive Settings Device layout shortcut remains in place and now explicitly
removes its button/listener on teardown. Settings already owns reduced-motion
application, so the redundant onboarding save subscription was removed.

## Existing fixes preserved

Read the current Director Backlog and `J-journeys-repeat.md`, traced Home/Pause,
`ControlsCard`, `Input`, `TouchControls`, Home startup and onboarding ownership.
Also inspected the launched, uncommitted work in `../2220-S-bughunt-10`:

- Preserve its per-instance onboarding cleanup and registered Skip cleanup so
  disposing an old dive twice cannot clear the next dive's handlers.
- Carry its modifier/pen device rules into the extracted guide owner: Shift and
  Control alone, and pen pointers, do not switch touch guidance to keyboard.
  Normal keys, mouse/touch pointers and sampled gamepad input still switch it.
- Leave its Settings reload-timer and mode fixes to that lane; `Settings.ts` and
  mode resolution were not changed here. Onboarding will need an extraction-aware
  conflict resolution when the two branches are integrated; retain these rules
  in the shared controls owner rather than restoring duplicate ownership.

## Capability coverage

Extended existing onboarding, overlay-focus and Home startup capability specs.
Each added e2e case identifies its regression, with DOM/state assertions:

- Keyboard and gamepad Home routing, device layout, keyboard Change keys,
  Close/Escape focus return, trapped focus and three repeated openings.
- Touch Home before any dive, touch Pause, and Home after quitting a dive,
  retaining illustrated content without key names/device tabs/rebinding UI.
- One guide DOM tree, Home app state, absent dive resources/loading/HUD/onboarding,
  and no default dive tile requests while opening/closing Home guidance.
- Existing desktop Pause coverage now checks repeated closes and opener focus.
- Unit coverage drives the real Home Controls button for all three devices with
  no dive context; repeated shell teardown checks DOM/listener cleanup and that
  disposing the previous guide owner again leaves its successor intact.
- Retain all six launched onboarding modifier/pen/old-disposal regressions.

## Validation

- Final `npm run typecheck` and production build pass. The final build used the
  gate-generated writable Vite config and `.cache/home-controls-dist`; log:
  `.cache/controls-build.log`.
- Two focused unit rounds pass: **138/138 tests in five files each**
  (`onboardCompletion`, `f3Onboard`, `overlayFocus`, `homeFocus`, `appSystems`).
  Logs: `.cache/controls-unit-round-1.log`, `.cache/controls-unit-round-2.log`.
- Playwright discovers all **32 tests** across the onboarding, shell, Settings
  and accessibility capability specs. Discovery is not execution.
- Focused browser command requested two rounds with `--repeat-each=2`, selecting
  the keyboard/pad Home, touch Home/Pause and desktop Pause cases. It stops before
  any test assertions: Playwright cannot start its preview server. Direct preview
  diagnosis reports `listen EPERM: operation not permitted 127.0.0.1:4230`.
  Log: `.cache/controls-e2e.log`. These browser cases remain unverified here.
- Full requested invocation: `GATES_CONFIG_MODE=writable FULL_E2E=1 ROUNDS=2
PW_PORT=4231 bash tools/gates.sh --full-e2e`. Aggregate log:
  `.cache/controls-gates.log`; individual logs:
  `.cache/runs/20261016-003338-3-yZLhFh/`.
  The full run finishes with **2,336/2,336 unit tests passing in 191 files**
  (492.27 seconds); content, build, attribution and repository-wide Prettier also
  pass. The aggregate gate exits 1: the four Python manifest failures below and
  both browser phases (root full suite and project-base) fail. Both browser phases
  report preview-server startup failure before any assertions execute. The
  project-base build itself succeeds. These are environment blockers, not a green
  full-e2e result.
- Four Python build-manifest tests fail because Node's `execFileSync` reports
  `spawnSync git EPERM` in this restricted environment; 162 of 166 Python tests
  pass. The separate build-phase manifest probe fails for the same reason after
  successfully bundling. No manifest/gate code was modified.
- Changed-file formatting and `git diff --check` pass. No screenshot acceptance
  was used. Nothing under `tools/` or `plan/DIRECTOR.md` was changed.
