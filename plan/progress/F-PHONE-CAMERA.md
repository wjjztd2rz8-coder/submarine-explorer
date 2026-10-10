# F-PHONE-CAMERA

Phone landscape (844x390 touch) only; desktop and portrait unchanged.

- Camera: `CameraRig.setPhoneLandscape()` applies a projection view offset (`PHONE_LANDSCAPE_SHIFT` = 0.14), sliding the picture left so the sub/wreck clears the right-hand PHOTO/SONAR/SCAN buttons. Wired in `app/systems/render.ts` (resize plus a class observer for touch-mode changes). Chase arm, terrain collision and aim are untouched, so there is no scene or tier cost.
- Titles: `phoneMissionTitle()` (ObjectivesPanel) gives "Lost City dive" and "Lighthouse Reef"; shown only in phone landscape, same text size.
- Blue Hole sonar: depth curve (t^2.2) for that site so the hole and walls read as a dark ring rather than a flat tile. The shallow reef flat is still a uniform teal (honest to the data).
- Tests: tests/unit/phoneCamera.test.ts.
- Shots: .cache/codex/shots/f-phone-camera/{before,after,after2,after3}/ (tools/firstminute-shots.mjs, FM_LAYOUTS=phoneland). Final: after2 (Titanic, Endurance), after (Lost City), after3 (Blue Hole).
- Tier behaviour/perf: no draw-call change on any tier.
- Known gaps: Endurance hull is still small in frame and its minimap is stripes; Endurance with 14% shift leaves the sub just left of PHOTO (clear). Portrait unchanged.
