# U-first-dive-hints (DIRECTOR item 39, findings 7-10)

## Changes

- Existing guidance surface only (the tutorial card in the guidance slot, and the scan/objective card). No new surface.
- Touch first-dive move step now names the control: "Steer with the left pad toward <place>." (fallback "Drag the left pad to move and turn."). Shown on the first dive only, as before (tutorial is one-time via TutorialSave). Skip stays beside it.
- Touch scan/objective cues say "TURN LEFT" / "TURN RIGHT" instead of "TURN 111° STARBOARD". Desktop and gamepad keep degrees. One helper `turnCue` in `src/ui/ScanOverlay.ts` replaces two duplicated format strings.
- Tests updated by capability: touch asserts left/right and direction correctness; non-touch still asserts degrees.

## Not changed (honest)

- RISE/SINK, SONAR, LIGHTS, SCAN already carry text labels on the HUD; the existing depth step names the slider once a target is in reach. I added no extra labels, to keep the HUD uncluttered.
- Edge arrow and checkmark (finding 10) are world markers explained by "Follow the marker"; I did not add a legend. The "OK" ring in the journal toast is unchanged.

## Evidence

Fresh journey capture (great-blue-hole) at 390x844 and 844x390: frames 05 dive-start and 08 first-scan-next-frame reviewed. The card reads "Steer with the left pad toward the stalactite gallery." and the toast reads "... TURN RIGHT"; no layout shift, toast wraps to three lines in both sizes without overlapping the HUD.

## Rating

Modest improvement (about 6/10 for the target). The joystick is now named and degrees are gone, but SONAR/LIGHTS/photo and the edge arrow remain unexplained beyond their own labels.
