# F3-ONBOARD — first-dive tutorial, hints, controls guide

## Player-visible

- First dive: a bottom-centre coach card with five steps (move/turn, rise/sink, lights, scan,
  photo or Journal). Steps advance on the real action; "Skip step" and "Skip tutorial" are always
  visible (44 px). Hidden while a menu/Journal/photo mode is open; never freezes play.
- Hints (once each, max one per 20 s, dismissable chip): battery under 30%, hull rating at 85%,
  scannable target in range, creature near, ROV ready (keyboard, after 60 s).
- Pause > Controls opens a device layout card (keyboard / gamepad / touch, auto-detected from last
  input, tabs to peek at others, "Change keys" opens the rebind page). Settings header has
  "Device layout". Bottom tip strip is device-aware (hidden on touch).

## Files

- New: src/game/Hints.ts, Tutorial.ts, TutorialSave.ts; src/ui/ControlsCard.ts, TutorialCard.ts;
  src/app/systems/onboard.ts; src/styles/onboard.css; tests/unit/f3Onboard.test.ts;
  tests/e2e/f3-onboard.spec.ts (shots in .cache/codex/shots/f3-onboard/).
- Edits: systems.ts (registry), context.ts (`controlsCard`), shell.ts (Pause Controls opens card),
  hud.ts system (tips via card), styles.css (import), tests/e2e/helpers/unlocked.ts (seed
  onboarding as done for experienced-pilot specs).

## Deviations

- Onboarding state lives in its own key `subexplorer.onboard.v1` (versioned, safe default = new
  player), not the settings save, so settings migrations/resets are untouched.
- Hints use their own dismissable chip instead of `hud.notice` (not dismissable) or captions.
- Keyboard tip text is unchanged because existing e2e specs assert it (d2-camera, d-polish);
  gamepad gets compact text, touch hides the strip (existing CSS).
- `?tutorial=0|1` URL override added for testing.
- Settings button is injected from the onboard system (no Settings.ts edit), named "Device layout"
  so existing `name: 'Controls'` locators stay unambiguous.
