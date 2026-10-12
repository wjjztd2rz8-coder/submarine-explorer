# 1392 — Touch Boost toggle and HUD Journal

Implementation complete; browser acceptance and screenshot review are pending because this sandbox blocks the preview server and no connected browser is available.

## Changes

- Touch Boost uses its own `Input.touchBoost` latch. A completed tap toggles it; pointer release leaves it active. The button has `aria-pressed`, a cyan fill/border and an active glow. Cancelled gestures do not toggle. Keyboard Shift and gamepad RT still use holds.
- The touch system passes the final frame's boost result to the controls. When progress rejects boost after meter depletion, the latch and visual clear; recovery requires a new tap. Hidden controls, pause, menus, photo mode, page hiding, blur, rotation, desktop mode and disposal also clear the latch.
- Boost sits beside the right slider in portrait, using the nearest second-row action slot, and directly above the slider in landscape/tablet with a 12px gap. All touch buttons retain at least 48px hit areas. Scan spans the action cluster below Photo/Sonar/Lights in landscape. Portrait preserves the existing tutorial clearance and utility/Scan layout.
- HUD.ts changes only one markup line: `JOURNAL`, with title/aria `Journal (J)`. Wiring and disposal live in the touch system and enqueue the existing `toggleJournal` action. Desktop uses the HUD footer; touch places it beside Pause at the top, including the expanded-map layout. The narrow landscape expanded map reserves both buttons. The pause entry and Journal implementation are unchanged.

## Coverage

- `f-touch-controls-1392.spec.ts`: portrait 390×844, landscape 844×390 and 667×375, tablet 1024×768 touch, desktop 1280×720. Checks each individual button against every visible HUD panel and control, viewport containment, 48px touch sizes, centre-point hit testing, docking, tap on/off, Journal opening, pause reset and desktop hold behavior. Additional cases exercise the real meter depletion/recovery, page visibility and mission end.
- Existing `f-touch-audit`, `f-touch-stack` and 1390 overlap sweep now include Boost and Journal. Control overlap checks use individual action buttons, since portrait Boost occupies the otherwise empty slot inside the action cluster's bounding rectangle. The 1390 all-site sweep also adds 667×375 and 1024×768.
- Unit tests cover tap cancellation, active/aria state, frame rejection, reset paths, hidden-page interruption, Journal action wiring/cleanup, keyboard hold and gamepad trigger hold.
- Screenshot destinations are `.cache/codex/shots/1392-f-touch-controls/{portrait,landscape,landscape-small,tablet,desktop}.png`, plus touch `*-boost-on.png` and `*-boost-off.png`. No screenshots were generated or visually inspected in this session. Both original `.cache/phonefb/` references are absent from this checkout.

## Validation

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
  tests/e2e/f-touch-stack.spec.ts tests/e2e/f-bughunt-hud-touch-overlap-1390.spec.ts
```

Inspect the five layout captures and Boost on/off captures before accepting the layout. This worktree owns no changes to Briefing, PauseMenu, Globe, onboarding/Tutorial, Spawn, events or Journal.ts.
