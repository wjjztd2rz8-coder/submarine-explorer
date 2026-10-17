# J-contact-choice

## Changes

- `src/ui/ScanOverlay.ts`: a ready scan contact that is not the outstanding mission objective now reads `SCAN TARGET · OPTIONAL` (merged into the existing kicker line) and its second line carries the objective's direction (`Stern section · TURN 56° STARBOARD`) instead of hiding it. When the contact is the objective there is no tag.
- A NEW ENTRY / SCAN COMPLETE card, while an objective is outstanding, shows the same direction line in its detail slot, so wildlife results no longer remove the objective direction. One shared `objectiveCue` helper, no new chip/toast/surface.
- `tests/unit/guidance.test.ts`: new capability case (tag, direction on scan card and result card, no tag for the objective); `texts` helper now reads kicker/detail.

## Simplicity rules

Single guidance surface kept; no new element, setting, site branch, layout exception or config mutation; test by capability, no package name in code.

## Evidence

`.cache/codex/shots/J-contact-choice/{before,after}-{desktop,portrait}.png` (competing contact: fixture bow in range, objective 120 m away).

## Remaining

- On desktop the optional card's second line no longer says HOLD <key> TO SCAN (the kicker/ring still mark it as a scan target); on touch the SCAN button is visible. On a 390 px phone the direction line wraps to two lines.
- Cue is an optional contact's only guidance; the first-time result card loses its "OPEN JOURNAL" detail while an objective is outstanding (the Journal button stays on the HUD).
