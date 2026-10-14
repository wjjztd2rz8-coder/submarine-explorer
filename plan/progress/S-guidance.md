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

## Priority refinement found during e2e

- Scan cards that only steer toward a contact ("TURN 141° STARBOARD", in range but not yet scannable) are `soft` (`GuidanceMessage.soft`): they rank just below a discovery result or sighting. For the few seconds a scan result is up, `ScanOverlay` also offers its ready-contact card as soft (`completeLeft`), because the next contact is usually already in range and ready and would bury NEW ENTRY; a new scan under way takes the slot back at once. A scan in progress and an interrupted scan stay above discovery; a ready contact outranks a sighting. Unit test in `guidance.test.ts`.
- The static SEABED PROXIMITY trigger is suppressed while any contact is in range (`scanner.view.nearestInRange`, animals included; was POI-only via `focusPoint`). Without that, after scanning a Great Blue Hole gallery at 10-12 m altitude a nearby fish became the nearest contact, the warning fired and (urgent) replaced the NEW ENTRY card. The approach trigger is unchanged and never suppressed.
- Touch tutorial copy "Push left stick forward; sideways to turn." became "Left stick: move and turn." (three lines in the 228 px phone column; less text anyway). Skip button horizontal padding 14 to 8 px (still 44 px wide). Short-landscape slot padding unified at 5 px 8 px (the old 6 px rule only applied at 900-460 px and made 932x430 two px taller), compact slot text gap 0, slot line-height 1.25.

## Merge with main

`git merge main` conflicts kept both sides: S-rewards' fixed equipment removed the hull-change note and the `+RP` toast (guidance side dropped them too), samples are scanned like any find (`COLLECT` and `STOWED FOR THIS DIVE` copy gone, kicker is SCANNING FIND then NEW ENTRY), events no longer award RP; `ExploreNotice` and its layout test stay deleted. Unit: 190 files, 2180 tests pass.

## E2E results (chromium, one process)

All of these pass on this branch: f-bughunt-15, f-bughunt-960, d-power, f-bughunt-hud-touch-overlap-1390, f-challenger-opening, f-copy-regress, f-events-reform, f-first-minute-620, f-touch-audit, f-touch-controls-1392, f-touch-stack, f-verify-1000/520/530/610/650/740/920, f-verify-hull-lostcity-1290, f-verify-lander-firstdisc-1240, f1-touch, f2-explore, f2-life, f2-modes (except the one below), f2-progress, mission, d-scan, f3-onboard, f-hud-layout.

Pre-existing on main, not this branch: `f2-modes` "a fresh realistic pilot gets an accessible Daily dive and a sufficient hull" expects a rated depth <= 1000 m, the S-rewards fixed hull gives 3008 m. `f2-explore` secrets count (3/3 to 3/5) and the phone sample hint (STOWED FOR THIS DIVE) were stale on main too; fixed here.

## Assertions changed deliberately

- f-bughunt-15: objectives panel is only measured where it is visible (phones have none, the slot carries the objective); "scan card up" means `data-kind="scan"` (a tutorial step is itself cyan, so the old tone test matched it).
- f-bughunt-hud-touch-overlap-1390: the sub is stepped for 500 ms before `sub.step` is stubbed and `away()` holds 60 m above the unknown terrain (an unstepped or low sub tripped the urgent seabed warning and owned the slot); the `Logged` text after re-entering range is replaced by "slot visible, tutorial hidden" because an unscanned contact in range outranks the logged one in `Scanner` (the logged text is pinned in d-scan).
- f-first-minute-620 "animal hint": an animal in range is named by the scan card itself, so the separate "Animal nearby" tip no longer shows. The test asserts the card names it and no tip appears, then the move and objective checks as before.
- f-verify-740: no `.objectives-panel` visibility check on touch layouts.
- f-touch-audit: the long-name completion check completes a real scan first (a ready contact outranks a result, as in play).
- f-touch-stack: unchanged limits now hold (tutorial 56 px, objective 64 px) after the CSS unification above.
- f-events-reform caption-must-not-cover-event-subject: KEPT and passing on desktop and phone for all three events. Decision: the sighting shares the slot with scan cards and a ready contact outranks it, so the test holds the contact card back (`setScanCardSuppressed`) to review the sighting's own layout; the caption (top-centre desktop, under readouts on phones) does not cover the event subject or any HUD/thumb control at start. The caption now retires 3 s after the log, so the "moving" step asserts it is hidden rather than visible; its layout read still proves nothing is covered. The self-overlap of `.guidance-slot` in the overlay list was removed (the caption is that slot).
- f2-explore: sample test pins NEW ENTRY / Journal entry; event caption test stands out of scan range; secrets total 3/5.
- f-verify-hull-lostcity-1290: unchanged; the tower-tip clearance (8 px) now holds after the compact text gap.

## Screenshots

`.cache/codex/shots/S-guidance/{portrait,landscape}-01..06` (mission start with tutorial step, contact in range, scanning, after scan with NEW ENTRY, logged contact plus next objective, SEABED PROXIMITY), 390x844 and 844x390 touch, recaptured after the final CSS and read. Slot sits under the readouts (portrait) / top-centre lane (landscape), Journal and Pause are clear (4 px gap in landscape), no overlaps, the waypoint label sits below the slot and drops the target name when the slot shows it.

## Unresolved

- 4 px gap between Pause/Journal and the landscape slot is tight but clear.
- A sighting waits behind a ready contact card by design; no unit pin for sightings other than the e2e above.
