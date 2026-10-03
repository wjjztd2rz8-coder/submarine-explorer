# F-BUGHUNT-15: touch/mobile HUD audit

Status 2026-10-03: two code audit rounds complete; layout fixes and browser
regressions implemented. Browser acceptance remains pending because this
sandbox denies local listening sockets and Chromium startup.

## Round 1 — portrait layout and hero coverage

- Audited `hud-layout.css`, `touch.css`, the underlying scan/onboard/flow CSS,
  `HUD`, `TutorialCard`/`HintChip`, `TouchControls`, `ObjectivesPanel`,
  `ScanOverlay`, and the HUD/onboarding systems at 360×640, 390×844 and 844×390.
- Existing `f-hud-layout.spec.ts` checks desktop/tablet/844×390 fixtures and
  Monterey objectives. `f-touch-audit.spec.ts` checks a Titanic fixture at
  390×844/667×375/844×390 and 80/100/150% UI, but omitted map credit and tested
  missions without a simultaneous scan panel. It did not cover 360×640.
- Source-confirmed conflict: the old portrait scan panel ends at y=240 on a
  640 px screen (`bottom:400px`), intersecting the minimap and right telemetry.
  Compact short portrait telemetry, map and tutorial rows now reserve a separate
  contact row. Portrait telemetry is also compact at 390×844, where increased
  UI scale and mission objectives otherwise consume the contact's space.
- Full attribution previously occupied the bottom-right control cluster.
  Portrait credit now uses a single line above controls; complete text remains
  in the DOM/accessibility tree and `title`. The rotate suggestion at 42% of
  viewport height could cover the card/contact; it now yields while a tutorial,
  contextual hint or scan panel is up.
- Tutorial step count, text and 44 px buttons remain. Only the redundant short
  portrait title/dots and collapsed map legend are omitted. Cuts are logged in
  `CHANGELOG.md`. No gameplay, Arcade mode, hull access or spawn defaults changed.

## Round 2 — expanded map, cascade and duplicate prompts

- Reviewed stylesheet order and specificity: short portrait compaction runs
  after the general phone portrait rules; mission telemetry still follows
  the actual objective height through its existing `ResizeObserver`.
- Existing expanded-map bounds assertions covered landscape only. The scaled
  expanded portrait map could reach the action buttons; its canvas now has a
  height budget below Pause and above the buttons, without scaling the entire
  panel. Coach/contact panels yield while the expanded map is open and restore
  when it closes. Expanded portrait overlap checks are now required too.
- The duplicate range hint was already retired: `onboard.ts` feeds
  `scanTargetInRange:false`, and `waypoints.css` suppresses `.hud-prompt`.
  The obsolete “Something to scan is in range” string is absent from `src`.
  No second hint implementation was removed in this package. New browser
  assertions cover the actual in-range scanner after skipping the tutorial:
  one scan hint element, hidden HUD prompt, absent obsolete/scan-target chip
  text, and no consumed `scan-target` hint record. Other contextual hints are
  allowed and included in overlap checks when visible.

## Regression coverage

- New `tests/e2e/f-bughunt-15.spec.ts`: 18 cases — all five hero missions at
  each requested viewport, plus Beebe at 150% UI at each size. Each checks
  the default Arcade opening, then moves to a real safe POI scan pose and
  checks every tutorial step, contact, objectives, readouts, credit, stick,
  ballast, action buttons and Pause. Rectangle samples share one browser frame
  and poll for observers/animations to settle. Failures include rectangles.
- Each hero case produces `arcade-opening.png` and
  `contact-and-tutorial.png` in Playwright's output directory for visual review.
- Expanded `f-touch-audit.spec.ts` adds 360×640 at 80/100/150% UI, includes
  credit in fresh/mission bounds checks, and checks expanded portrait map
  bounds against buttons/Pause. Its existing menu viewport matrix is retained.
- `f1-touch.spec.ts` now expects the rotate suggestion to yield to its real
  in-range scan panel. Existing desktop HUD/control-learning tests are retained.

## Validation

- Typecheck passes; Playwright discovery loads **47 tests across three edited
  touch specifications**, including all 18 new hero cases.
- Required gate invocation:
  `GATES_CONFIG_MODE=writable PW_PORT=4395 tools/gates.sh --full-e2e`.
  Writable configuration mode is necessary because the supplied dependency
  tree is read-only; the normal Vite loader fails writing `node_modules/.vite-temp`.
- Gate **exits 1**: configuration, production build/typecheck, **1,140 unit
  tests across 104 files**, **140 Python tests**, strict content, attribution
  and formatting pass. Project-base production build passes too. Both e2e
  gates fail before browser assertions at preview startup. Logs:
  `.cache/f-bughunt-15-gates.log` and `.cache/gates/`.
- Independent preview probe fails with `listen EPERM` on `127.0.0.1:4395`.
  Independent Playwright launch fails at Chromium sandbox-host startup with
  `Operation not permitted`. No browser rectangles or screenshots have been
  measured here; the layout fixes remain source-audited, not visually accepted.
- The normal Playwright preview also hits the read-only Vite config cache;
  `.cache/f-bughunt-15-browser-startup.log` records the startup diagnostic.
  Bypassing that cache with the native config probe still reaches the socket
  denial above. No gate or overlap assertion was weakened to claim a pass.

On a browser-capable host, run the full gate above and inspect the hero PNGs,
especially 360×640 with objectives/contact and 150% expanded portrait sonar.
