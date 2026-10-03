# F-TOUCH-AUDIT — phone play audit

Implementation complete in two review passes; no commit. Browser geometry and
screenshots still need the director's unsandboxed run.

## Code findings and fixes

- **Virtual stick / ballast / holds:** pointer-up/cancel/capture-loss already
  released normal gestures, but blur, visibility loss and rotation did not clear
  the held pointer or its cached stick centre. Those interruptions now release
  all touch gestures. Scan/Boost track each held pointer: lifting a second finger
  no longer interrupts the first, and a late pointer-up after rotation cannot
  cancel a newly started hold.
- **844×390 sonar:** `zoom: 0.62` shrank hit areas as well as the map. The
  feature-specific 24 px button width also beat the generic coarse-pointer rule;
  actual targets could be about 15×27 px. Only the minimap canvas now shrinks;
  range buttons are explicitly 44×44 px. Expanded sonar loses the desktop 1.8×
  transform on short landscape screens, has a viewport-bounded canvas, and sits
  above tutorial buttons so they cannot intercept its range controls. Pause moves
  to the left corner while that map is expanded, outside the map's hit area.
- **Enlarged landscape controls:** at 150% UI (effective scale 1.2), the right
  cluster exceeded its 270 px reservation and entered the scan/tutorial column.
  Short landscape controls cap their scale at 0.8, retaining their 48/52 px
  button floors and existing stick/slider size floors.
- **390×844 HUD:** the fixed scan/tutorial spacing could overlap a two-line
  tutorial, and enlarged controls nearly touched its bottom. The scan panel now
  ends 400 px above the bottom, the tutorial 230 px above it. The portrait mission
  stack omits duplicate bearing/progress details and numeric heading, retaining
  the current objective. The map retains its heading marker, waypoints show
  bearing and Pause holds the full objective list. Supply meter columns
  can shrink to the available narrow width. Long scan names wrap within the panel.
- **Daily / mode picker:** the landscape home menu previously had only 86 px
  between its fixed 280 px top and 24 px bottom. It now occupies a separate
  full-height right column (358 px at 844×390), with the existing scroll behavior
  keeping Daily, all Advanced fields and menu exits reachable.
- **Journal / hint chips:** the spoiler checkbox had a 24 px control inside a
  short label; its label now provides a 44 px target and wraps at enlarged UI.
  Inline entry buttons have a real inline-flex 44 px box. Touch headers wrap in
  landscape too. The dismissible rotate advisory has a 44 px target. Tutorial
  and hint dismissal buttons already had explicit 44 px floors.
- **Scan instructions:** keyboard-only `HOLD G` / `PRESS J` instructions named
  unavailable phone controls. Touch now shows `HOLD SCAN` and `PAUSE → JOURNAL`;
  keyboard bindings still appear when touch stops being the primary input.

## Coverage and validation

Read the touch, HUD-layout, onboarding, Daily/modes, pre-dive, scan and Journal
e2e specs and their imported layout styles, plus the real control handlers.

- `tests/unit/touchControls.test.ts`: event-dispatched stick/ballast/Scan release
  on blur, resize and hidden tabs, recovery after interruption, multiple Scan
  pointers and keyboard/touch scan prompt changes.
- `tests/e2e/f-touch-audit.spec.ts`: both phone orientations; 80/100/150% fresh
  dive HUD bounds and pairwise overlaps; 44 px targets and centre hit testing;
  tutorial/hint dismissal; scan overflow/completion wording; expanded sonar;
  mission stack; Daily launch with Advanced open; each mode field and journal
  navigation, spoilers, entries and Close.
- Typecheck and five new unit tests pass. Full gate results follow below.
- Chromium launch is blocked here: `sandbox_host_linux.cc:41`,
  `shutdown: Operation not permitted`. No screenshots or browser pass claimed.
- The shared `node_modules` link is read-only in this sandbox. A temporary
  worktree-local mirror of package symlinks supplies writable Vite/Vitest caches
  for the unchanged gate command; the original dependency link is restored after
  validation. Shared packages are not edited.

## Director: visual judgement / browser follow-up

Run the new spec and existing `f1-touch`, `f-hud-layout`, `f3-onboard`,
`f2-modes`, `d-flow` and `d-scan` specs outside the sandbox. Capture 390×844 and
844×390 at 100% and 150% UI, with both Arcade and Realistic and a live scan target.

- Inspect the initial six-second rotate advisory against scan text; its existing
  42% vertical anchor can share the middle of the portrait scan region. Decide
  whether the advisory should be deferred or assigned a separate visual slot.
- Confirm scene/sub visibility with the higher portrait scan panel and the
  narrower minimap. Inspect unusually long target titles, a mission-completion
  banner, hull warnings and Realistic battery/oxygen/current rows together; their
  combined heights and visual priority need rendered review.
- Judge the landscape menu/title balance, Daily detail wrapping and long streak
  text, nested Advanced scrolling in Daily briefing, and Journal's wrapped header
  and independent navigation/body scroll proportions.
- Check the expanded map above tutorial content and the capped landscape stick
  size for thumb comfort. Geometry floors do not establish ergonomic comfort.
- The full bathymetry credit still shares the portrait bottom region with touch
  controls. Its best readable placement needs a design decision; landscape
  already reserves a separate credit strip. Include it in the portrait review.
- Check real iOS/Android browser chrome, notches and safe-area insets, continuous
  stick + ballast + Scan, app-switch recovery and rotation mid-gesture. Emulated
  viewports cannot establish device comfort or browser chrome behavior.

## Gates

`PW_PORT=4317 bash tools/gates.sh`:

- PASS build, unit (88 files / 893 tests), Python (126 tests), content,
  attribution and Prettier.
- Both e2e gates stop before tests: the preview server cannot start. A direct
  bind confirms `listen EPERM: operation not permitted 127.0.0.1:4317`.
  Independently, Chromium launch fails with the sandbox shutdown error above.
  The project-base build succeeds; its browser tests also cannot start.
- All six non-browser gates also pass after the final geometry review
  (`PW_PORT=4317 bash tools/gates.sh --no-e2e`). Playwright discovers all 12 new
  cases with `--list`; browser results remain unverified in this environment.
