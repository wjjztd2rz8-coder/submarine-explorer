# P2-sub-screen progress

Owner phone feedback #15: the cosmetic picker was small and unnoticed on the Journal front page.

## What moved

- The Journal front-page "Cosmetics" disclosure (four `<select>` rows, `renderCosmetics`, `Journal.setProgress`, `.jr-cosmetic*` CSS) is deleted.
- New `src/ui/SubScreen.ts` + `src/styles/sub-screen.css`: "Your sub" overlay (own FocusTrap, Escape/Back returns to the opener, shares `.field-guide` stacking). Reached from Home and Pause via a "Your sub" button.
- Each slot (paint, lamp trim, decal, photo frame) is a group of >=44px buttons (`aria-pressed`, locked ones disabled with the unlock hint). Choices still save through `Progress.selectCosmetic`.
- Preview: a private three.js renderer reusing `SubMesh`, created on open (lazy import), disposed on close, updates live on each pick. No WebGL means choices still work.
- Net simpler: one picker on one screen replaces a hidden disclosure with native selects, a per-render focus-restore branch in Journal and its CSS. No new settings.

## Tests (extended, no new spec)

- `tests/unit/journalGroups.test.ts`: three Journal-cosmetics tests replaced by one guarding that the front page never carries cosmetic controls again. Selection, unlock and persistence stay covered by `tests/unit/cosmetics.test.ts`.
- `tests/e2e/f2-progress.spec.ts`: pause flow now opens Your sub (guards live selection, focus kept, Escape returns to Pause without unpausing the dive); migrated-grants test now runs on Your sub at 1280x720, 390x844, 844x390 (guards pressed state for migrated grants, locked choices disabled, >=44px targets, no horizontal overflow, Journal has no picker).
- `tests/unit/overlayFocus.test.ts`, `homeFocus`, `dailySystem`: action stubs gained `subScreen`; debrief-to-Journal test no longer drives selects.

## Screenshots

`.cache/codex/shots/P2-sub-screen/sub-{1280x720,390x844,844x390}.png`, all viewed: preview renders, no overlap; portrait scrolls inside the panel; landscape preview left, swatches right (scroll).

## Self-rating

7.5/10. Works and is tested in all three viewports. Weak points: phone portrait needs a scroll to reach decal/frame; the preview is a second WebGL context while open; Home button count grew by one.
