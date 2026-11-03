# U-phone-sheet-half (2026-11-03)

Item: U-phone-sheet-half (plan/DIRECTOR.md Backlog). Walkthrough source: plan/progress/U-play-walkthrough-2.md items 5 and 6.

## Changes

1. **Phone site sheet starts at half height** (`src/styles/home.css`, `src/ui/Home.ts` comment).
   - The globe now fills the top half (`--sheet-half: 50dvh`) instead of a 96 px peek, so it stays visible as the picker.
   - The sheet is 50dvh when collapsed (the default when the list opens) and the existing full height (min(72dvh, 600px)) when expanded.
   - Swipe up or the grab bar expands to the full list. Swipe down or the grab bar returns to half.
   - Removed: the peek transform and the rule that hid the rows of a collapsed sheet. The `is-collapsed` class keeps its meaning (not expanded), so JS and unit tests are unchanged.
2. **Debrief "More" renamed to "More options"** (`src/ui/Debrief.ts`). It toggles the extra debrief actions (Dive again, Home and similar) that sit under the link.
3. **"Surface and debrief" spans the full grid row** (`src/styles/menus.css`, `src/styles/touch.css` short-landscape variant). It was the lone half-width cell in the 2-column pause grid. The rule is generic, so it also applies on desktop.

## Tests

- `tests/e2e/phone-accept.spec.ts`, `tests/e2e/f3-audio.spec.ts`: "More" to "More options".
- `tests/e2e/globe-pins.spec.ts`:
  - The collapsed sheet no longer hides its rows; the assertion now checks they stay visible.
  - Added a guard that the sheet starts at half height.
  - Waits for the sheet's height transition to settle before tapping a pin (a tap during the transition landed on a sheet row).
- `tests/e2e/hud-touch.spec.ts`: comment only.

## Verification

- `PW_PORT=5802 tools/gates.sh` (smoke): passed, including after the globe-pins spec fix.
- Targeted e2e: globe-pins, phone-accept, f3-audio all pass.

## Remaining issues

- The hud-touch "lost-city" catalog tutorial and "hero guidance sequence" (titanic 360x640, lost-city and monterey-canyon 390x844) failures are pre-existing: the base build fails the same cases. Not caused by this change.
- No screenshot review of the half-height sheet or the pause menu yet. Needs a visual check on a phone-size viewport.
- Swipe down from half height does nothing (there is no peek state any more). Decide if a hide-to-peek is wanted.
- The pause full-width rule also applies on desktop; the owner may want it phone-only.
