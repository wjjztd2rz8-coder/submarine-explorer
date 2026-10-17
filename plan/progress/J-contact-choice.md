# J-contact-choice

## Changes

- `src/ui/ScanOverlay.ts`: a ready scan contact that is not the outstanding mission objective now reads `SCAN TARGET · OPTIONAL` (merged into the existing kicker line) and on touch its second line carries the objective's direction (`Stern section · TURN 56° STARBOARD`); desktop keeps the scan prompt. When the contact is the objective there is no tag.
- A NEW ENTRY / SCAN COMPLETE card, while an objective is outstanding, shows the same direction line on touch (desktop keeps its Journal line), so wildlife results no longer remove the objective direction. One shared `objectiveCue` helper, no new chip/toast/surface.
- `tests/unit/guidance.test.ts`: new capability case (tag, direction on scan card and result card, no tag for the objective); `texts` helper now reads kicker/detail.

## Simplicity rules

Single guidance surface kept; no new element, setting, site branch, layout exception or config mutation; test by capability, no package name in code.

## Evidence

`.cache/codex/shots/J-contact-choice/{before,after}-{desktop,portrait}.png` (competing contact: fixture bow in range, objective 120 m away).

## Remaining

- Touch only: the optional card's detail and an objective-outstanding result card carry the objective cue (SCAN button visible, no mission list). Desktop keeps `HOLD <key> TO SCAN` and OPEN JOURNAL/LOGGED; the objective direction shows in the mission block and waypoint there.
- On a 390 px phone the direction line wraps to two lines; the first-time result card loses "OPEN JOURNAL" on touch while an objective is outstanding.
