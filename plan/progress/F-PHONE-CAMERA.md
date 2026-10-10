# F-PHONE-CAMERA

Phone landscape (844x390 touch) only; desktop and portrait unchanged.

- Camera: `CameraRig.setPhoneLandscape()` applies a projection view offset (`PHONE_LANDSCAPE_SHIFT` = 0.14), sliding the picture left so the sub/wreck clears the right-hand PHOTO/SONAR/SCAN buttons. Wired in `app/systems/render.ts` (resize plus a class observer for touch-mode changes). Chase arm, terrain collision and aim are untouched, so there is no scene or tier cost.
- Titles: `phoneMissionTitle()` (ObjectivesPanel) gives "Lost City dive" and "Lighthouse Reef"; shown only in phone landscape, same text size.
- Blue Hole sonar: not changed. A Blue Hole-only depth curve made the hole read as a dark ring but broke tests/unit/sonarPalette1200.test.ts (shared ramp, no site exception) so it was dropped; needs a shared-ramp fix (Codex 1250).
- Tests: tests/unit/phoneCamera.test.ts.
- Shots: .cache/codex/shots/f-phone-camera/{before,after,after2,after3}/ (tools/firstminute-shots.mjs, FM_LAYOUTS=phoneland). Final: after2 (Titanic, Endurance), after (Lost City), after3 (Blue Hole, shows the dropped curve).
- Tier behaviour/perf: no draw-call change on any tier.
- Known gaps: Endurance hull is still small in frame and its minimap is stripes; Endurance with 14% shift leaves the sub just left of PHOTO (clear). Portrait unchanged.
