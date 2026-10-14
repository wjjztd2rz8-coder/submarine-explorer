# S-guidance

Branch `claude/S-guidance`. One guidance slot (`src/ui/GuidanceSlot.ts`, pure priority in `src/game/Guidance.ts`).

## Replaced

Tutorial card, hint chip, ExploreNotice (placement solver), discovery toast ("+RP"), NEW ENTRY card, objective chip, `.hud-warning`, `.hud-notice`, `.hud-objective`, `.hud-prompt`, objectives-panel alert strip, waypoint objective hint, phone mission-title strip and phone objectives list. Sources offer messages: HUD warnings and router emergency (urgent), ScanOverlay (scan, discovery, standing objective), onboard (tutorial/hints), explore (sightings).

## Deleted

`TutorialCard.ts`, `ExploreNotice.ts`, `explore.css`, `EventsVisual.screenBounds`, `phoneMissionTitle`, `scanObjectiveHints`, about 330 lines of `hud-layout.css` (1,023 to 694; no new `@media`, no patches added), hintChip / tutorialCardDevice / exploreNoticeLayout tests. Net `src`: +809 / -1,843; `tests`: +739 / -913.

## Hull gauge threshold

Shows at 80% of rating, hides below 75%. Mission depths against their hull: Titanic 58% (a 50% threshold would show it all dive), Beebe 45%, Endurance 46%, all other sites lower except Challenger Deep 99% (always shows). A unit test pins this against the mission data. 80% is still a judgement; it is below the 85% near-hull tip. "nominal" text: not present in the code at this base.

## Decisions to review

- Order is urgent > scan > discovery > hint/tutorial > objective (hints outrank the standing objective so they are not hidden all dive).
- Safety tips (battery, pressure) are urgent-tier; the animal hint waits while a warning, scan card or result holds the slot.
- Standing objective: always on phones; on desktop only with a contact (the panel covers the rest).
- Loosened deliberately: the objective chip height <= 28 px became <= 64 px (the slot card); desktop Skip tutorial removed; hint Dismiss removed; `d-scan` authored-hint asserts dropped (hint was hidden under the panel in every mission).

## Screenshots

`.cache/codex/shots/S-guidance/{portrait,landscape}-01..07` (briefing, mission start, contact, scanning, after scan, next objective, SEABED PROXIMITY). Read: slot sits under the readouts, Journal and Pause are clear, no overlaps, waypoint label drops the name when the slot shows it (after the CSS fix; re-capture was not redone).

## Unfinished

- Not all touched e2e specs were rerun. At the last run `f-bughunt-15`, `f-bughunt-960` and `d-power` failed (not yet diagnosed; probable selector or timing fallout from my spec rewrites, f-bughunt-960 fails in about 0.3 s so likely a setup assertion). Specs after f-bughunt-960 in the list were not reached: f-bughunt-hud-touch-overlap-1390, f-challenger-opening, f-copy-regress, f-events-reform (caption must not cover the event subject; the old placement solver is gone, so this guard may fail), f-first-minute-620, f-touch-_, f-verify-_, f1-touch, f2-*, mission. f3-onboard and f-hud-layout pass.
- `f-events-reform` covered-subject guard needs a placement decision if it fails.
- Landscape screenshots were not re-read after the final CSS edits.
