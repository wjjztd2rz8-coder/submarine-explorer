# 1392 — Touch Boost toggle and HUD Journal

Round 3 fixes are implemented and left uncommitted. The orchestrator's latest run passed all static gates and project-base E2E; the full browser suite reported 730 passed, 20 failed and 49 skipped. The recorded remaining causes are addressed below. A fresh browser rerun remains pending because this sandbox blocks the preview server.

## Round 3 follow-up

- **Restore the reward lane:** the earlier widened Scan button started at x411.8125 on 667×375, overlapping the discovery notice ending at x432.59375. Scan now occupies the two right columns, starting at x471.8125 with the existing 112px height; the reward has roughly 39px horizontal clearance. Portrait retains its two-column Scan override. Boost remains in its right dock.
- **Separate the narrow-phone tutorial from scan cards and telemetry:** at widths up to 700px in short landscape, reserve the existing 270px right HUD/action column and set the tutorial's bottom offset to 176px. At 667×375 its expected box is x132–397, y143–199 (two text lines still fit above the 44px Skip target). This clears the measured wrapped scan card ending at y130.984375, telemetry starting at x405, utility buttons starting at x411.8125, and Boost starting at x595. These values are derived from the failure rectangles and CSS; fresh browser measurement is still required. The wider landscape Boost clearance, portrait and tablet tutorial layouts remain intact.
- **Fix stale selectors for the merged redesign:** touch Pause and its reference dialog are named `How to play`; desktop retains `Controls` / `Controls guide`, while selecting its Touch preview changes the dialog name. Updated the first-minute and onboarding specs accordingly. Touch reference assertions check Left stick, Right slider and all ten diagram SVGs. Journal Close now uses its accessible `Close Journal` name, and spoilers use role `switch`.
- **Exercise the actual phone Journal navigation:** the old touch audit expected a contents tree and next-entry arrow. The merged sheet uses front-page site cards, site-page entry rows and Back. The audit now checks first/last site and entry hit targets, opens the first entry and asserts its exact title, returns through site to front with Back, retains the unlocked-content, header-overflow, Close and return-home assertions. No Journal, ControlsCard, PauseMenu or onboarding production files were edited, and no layout assertion was relaxed.
- **Validation:** production build/strict TypeScript pass; six touch/input/onboarding files pass (93 tests), and six Journal/guidance files pass (74 tests), totalling **167 focused unit tests**. Python passes (156 tests). Formatting and `git diff --check` pass. Playwright discovers 153 cases in the seven focused specs. The focused browser attempt still stops before execution with localhost `EPERM`; logs use the `*-round3.log` suffix in `.cache/codex/1392/`. The attached latest desktop/tablet/small-landscape Boost on/off screenshots were inspected; they show the merged HUD and toggle state, but predate the narrower Scan and tutorial changes.

## Round 2 follow-up

- **Landscape overlap fixed in the layout:** on landscape phones up to 900px wide and 460px tall, the tutorial strip now ends 8px before the right Boost column. Its right inset includes the slider/Boost width (56px), the same capped edge margin as the controls, and the 8px gap. At 844×390, the measured strip ends at x764 instead of x832 while Boost starts at x772. At 667×375 it ends at x587 while Boost starts at x595; at 80% UI it ends at x590.2 while Boost starts at x598.2. These are calculations from the reported rectangles and CSS, pending browser measurement. The existing overlap assertions are unchanged. Boost remains above the right slider in landscape; portrait and tablet placement are unaffected.
- **Lost City failures are stale E2E expectations, independent of Boost/Journal:** all six failures are at the exact camera-eye assertion. The test expected the old `[-20, 46, 90]` arm direction, but main's existing `f-e2e-regress` tuning is `chaseOffsetXM: -8`, `chaseOffsetYM: 30` with a base chase height of 38 and unchanged radius 66. The corrected pinned direction is `[-8, 68, 90]`. Its normalized X is -4.669093906802596; all six recorded failures measured -4.669093906802594. The precision, range, framing, altitude and lighting assertions remain intact. No camera, Spawn, Journal or gameplay changes were made.
- Removed the obsolete `.hud-attribution` selector from the package's overlap spec after main removed that chip.
- **Round 2 checks:** production build/strict TypeScript pass; six focused unit files pass (72 tests, including Lost City camera/readability and Boost/Journal wiring); Python passes (156 tests). The orchestrator's merged-base full unit run passed 184 files / 1,855 tests. Formatting and `git diff --check` pass; Playwright discovers 114 cases across the five focused specs. The focused browser rerun stops before executing tests with localhost `EPERM`. Logs are in `.cache/codex/1392/{build,unit,python,e2e}-round2.log`.
- **Screenshot review:** inspected the available round-1 portrait, both landscape sizes, tablet, desktop and Boost on/off captures, plus the 844×390 Titanic reward/tutorial capture that visibly shows the Skip button covering Boost. These captures predate the merged credit-chip removal and the round-2 clearance fix. Fresh captures cannot be generated inside this sandbox; do not treat the existing images as after-fix validation.

## Changes

- Touch Boost uses its own `Input.touchBoost` latch. A completed tap toggles it; pointer release leaves it active. The button has `aria-pressed`, a cyan fill/border and an active glow. Cancelled gestures do not toggle. Keyboard Shift and gamepad RT still use holds.
- The touch system passes the final frame's boost result to the controls. When progress rejects boost after meter depletion, the latch and visual clear; recovery requires a new tap. Hidden controls, pause, menus, photo mode, page hiding, blur, rotation, desktop mode and disposal also clear the latch.
- Boost sits beside the right slider in portrait, using the nearest second-row action slot, and directly above the slider in landscape/tablet with a 12px gap. All touch buttons retain at least 48px hit areas. Scan spans the action cluster below Photo/Sonar/Lights in landscape. Portrait preserves the existing tutorial clearance and utility/Scan layout.
- HUD.ts changes only one markup line: `JOURNAL`, with title/aria `Journal (J)`. Wiring and disposal live in the touch system and enqueue the existing `toggleJournal` action. Desktop uses the HUD footer; touch places it beside Pause at the top, including the expanded-map layout. The narrow landscape expanded map reserves both buttons. The pause entry and Journal implementation are unchanged.

## Coverage

- `f-touch-controls-1392.spec.ts`: portrait 390×844, landscape 844×390 and 667×375, tablet 1024×768 touch, desktop 1280×720. Checks each individual button against every visible HUD panel and control, viewport containment, 48px touch sizes, centre-point hit testing, docking, tap on/off, Journal opening, pause reset and desktop hold behavior. Additional cases exercise the real meter depletion/recovery, page visibility and mission end.
- Existing `f-touch-audit`, `f-touch-stack` and 1390 overlap sweep now include Boost and Journal. Control overlap checks use individual action buttons, since portrait Boost occupies the otherwise empty slot inside the action cluster's bounding rectangle. The 1390 all-site sweep also adds 667×375 and 1024×768.
- Unit tests cover tap cancellation, active/aria state, frame rejection, reset paths, hidden-page interruption, Journal action wiring/cleanup, keyboard hold and gamepad trigger hold.
- Screenshot destinations are `.cache/codex/shots/1392-f-touch-controls/{portrait,landscape,landscape-small,tablet,desktop}.png`, plus touch `*-boost-on.png` and `*-boost-off.png`. Round-1 captures are now available and were inspected during round 2. Both original `.cache/phonefb/` references remain absent from this checkout.

## Round 1 validation

- Strict TypeScript and production build pass. The build uses the repository's writable bundled-config workflow because shared node_modules is read-only and Vite's runner cannot execute the existing PWA closeBundle imports.
- Focused unit suite: 4 files, 62 tests passed (`touchControls`, `touchControlsAudit`, `subInput`, `progressSystem`).
- Python suite: 156 tests passed.
- Full unit suite: **184 files, 1,855 tests passed** in 832.51 seconds with one thread (`--configLoader runner --cache=false --pool=threads --maxWorkers=1 --reporter=verbose`). The initial two-thread attempt produced no test result output and was stopped.
- Changed-file Prettier, `git diff --check`, all 13 strict content validations and attribution pass. Playwright discovery succeeds: 107 cases across the four focused specs. Focused browser suite and FULL_E2E were attempted; both stop before executing tests because the preview server cannot start (`EPERM` on localhost). The Browser skill runtime reports `No browser is available`, and discovery returns an empty list. No measured layout/screenshot results are claimed.

## Run outside the sandbox

After a production build, run the full suite with its own preview port. A focused visual pass is:

```bash
npm run build -- --outDir dist-1392
GATES_CONFIG_MODE=writable PW_PORT=4792 PW_OUTDIR=dist-1392 npx playwright test \
  tests/e2e/f-touch-controls-1392.spec.ts tests/e2e/f-touch-audit.spec.ts \
  tests/e2e/f-touch-stack.spec.ts tests/e2e/f-bughunt-hud-touch-overlap-1390.spec.ts \
  tests/e2e/f-lostcity-readable.spec.ts \
  tests/e2e/f-first-minute-620.spec.ts tests/e2e/f3-onboard.spec.ts
```

Inspect the five layout captures and Boost on/off captures before accepting the layout. This worktree owns no changes to Briefing, PauseMenu, Globe, onboarding/Tutorial, Spawn, events or Journal.ts.
