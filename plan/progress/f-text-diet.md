# f-text-diet

Owner phone playtest 2026-10-11: too much text at every menu, key names on touch, a data chip that does not matter in play. Branch `claude/f-text-diet`.

## Changes

- **Briefing** (`src/ui/Briefing.ts`, `mission.css`, `predive.css`): the card shows head and meta, OBJECTIVES, the memorial note and the dive settings. Summary, FACTS and HAZARDS (de-duplicated, each once) are inside one collapsed "About this site" disclosure. `SITE_PRIORITIES`, the CONTROLS section and the `controls` field are gone. "OR PRESS ENTER" is hidden under `html.is-touch`. Mode descriptions in `ModeSelector.ts` are one short line.
- **Hull hazard**: the rewrite in `src/app/systems/progress.ts` is removed; `src/app/systems/mission.ts` filters hull-class hazards out of the briefing copy (the HULL meta row already states class and rating). The "View controls" injection (D-INPUT-HUD) and the now-unused `keyLabel` option on `MissionRouter` are removed.
- **Data credit**: the HUD chip and `DataCreditsLayout.ts` are deleted, along with their CSS in `hud.css` and `hud-layout.css` and the Escape handling in `shell.ts`. New `src/ui/DataCredits.ts` builds the credit (citation as text, GMRT/DOI/CC BY 4.0 links, "Not for navigation"). `PauseMenu` has a "Data credits" entry and view, wired in `shell.ts`.
- **Photo mode**: on touch the button reads "Capture" and the tip "Drag to orbit · pinch to zoom". Desktop: "Capture (Enter / Space)" and "Esc: exit · drag: orbit · wheel: zoom".
- **How to play** (touch): `src/ui/HowToPlay.ts` (inline SVG tiles, ten of them, no key names), rendered by `ControlsCard` when the touch layout is shown (device tabs hidden when the device is touch). The pause menu entry is relabelled "How to play" on touch (`controlsLabel`). Boost reads "Tap for a burst of speed". CSS in new `src/styles/howto.css` (not `onboard.css`).
- **Hints** (`src/game/Hints.ts`): no "press" in hint text ("use PHOTO", "Deploy the tethered ROV (label)").
- Docs: README Attribution and pause-menu text, `docs/missions.md`, `docs/architecture.md`, `docs/tile-format.md`. CHANGELOG entry added.

## Tests and specs changed, and why

- Deleted `tests/unit/dataCreditsLayout.test.ts` and `tests/e2e/hud-attribution.spec.ts` (pinned the removed chip and layout code). `tests/unit/hudAttributionEscape.test.ts` became `shellEscape.test.ts` (Escape still pauses, steps back through pause views, yields to settings and photo mode; the credit-dismissal cases are gone).
- `hudControlTips` (dropped the `layoutDataCredits` stub), `photoMode` (`documentElement` stub, plus a touch case), `predive` (realistic description), `arcadeLoadout` (hazards no longer repeat the hull line), `onboardCompletion` (creature hint wording "use G").
- E2E: `.hud-attribution` removed from the HUD selector lists in the overlap specs (1390, touch-audit, verify-610/740, flow-audit-510, bughunt-15, toast-placement, hud-layout, monterey-portrait); `f-verify-530` loses its credit-chip block (the Titanic atmosphere tests stay); `d2-camera` and `f-bughunt-15` assert the chip is gone; `f-journal-photo-1370` uses `.hud-reset-camera` (desktop) or `.tc-btn-pause` (touch) as the focus opener; `mission` and `f-briefing-900` assert the disclosure, no controls list, no hull hazard; `d-photo` has the new desktop strings; `f-toast-placement` hint wording.
- New `tests/e2e/f-text-diet.spec.ts`: phone briefing fit and no Enter hint, How to play (10 tiles, no key words), Data credits (citation, DOI, CC BY link), photo mode touch text, desktop Controls and credits.

## Screenshots

`.cache/codex/shots/f-text-diet/` in the worktree: `phone-titanic`, `phoneland-titanic`, `desktop-titanic` (first-minute sets, `03-briefing.png` is the briefing), and `pause/` (phone, phoneland, desktop: `-1-pause`, `-2-controls`, `-3-credits`; `phone-4-photo`).

## Noticed, not changed

- **Journal** (`src/ui/Journal.ts` ~line 647) lists the site's facts and hazards again, including the hull-rating hazard line, and has its own "More about" disclosure. f-journal-mobile should de-duplicate there and add the data credit to the site page.
- Touch has no ROV button, yet the `rov` hint can fire on touch with label "E" (`onboard.ts` `hintLabels`). The onboard owner should suppress it on touch.
- On a short landscape phone (844x390) the briefing still scrolls to reach Begin (the sticky footer is off there since F-CHALLENGER-CAM). Portrait is the target and fits.
- The touch `.hud-footer` rules in `hud-layout.css` are removed. The footer now holds only the Reset camera button, which `touch.css` hides on touch.
- `PhotoGallery.ts` ("then press Enter to save it here") is outside this package.
