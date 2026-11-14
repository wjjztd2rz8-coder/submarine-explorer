# U-home-first-screen (DIRECTOR item 38)

Words replaced, no new elements:

- Home caption (`.home-scene-caption`): "Titanic dive · Next dive" is now "Titanic dive, 3,800 m, a good first dive". The depth comes from the catalogue summary. "a good first dive" shows only before any dive, the same condition as the "Recommended first dive" badge. It replaces "Next dive" and adds no element. `Home.setDiveSite(title, depthM, firstDive)`, called from `shell.ts`.
- Home secondary buttons: transparent background and lighter weight (`home.css`), so "Dive: <site>" is the one filled button. The daily card and mode selector are unchanged.
- "Rated to X m" is now "Safe to X m" in the site list (`MissionSelect.ts`) and the briefing hull line (`MissionRouter.ts`).
- Briefing "Back to home" is now "Back to menu", matching the pick screen.
- Mode helpers: Arcade "Easy. Waypoints and fast travel; no battery limit or currents."; Realistic "Harder. Real speed; battery, oxygen and currents; no waypoints."; Advanced (custom) "Pick each switch yourself, starting from Arcade/Realistic." The unit test that ties the text to the preset values is kept, with only the case of the matched words adjusted.
- Touch key names: the globe close button ("ESC CLOSE" becomes "CLOSE") and hint ("DRAG ROTATE · PINCH ZOOM · TAP A PIN") are swapped on touch. Objectives "+N more · Esc for all" becomes "+N more". The briefing "OR PRESS ENTER" hint was already hidden on touch.

Tests updated for the new strings (d-shell, f-title-*, titleAudit, phone-accept, journal-debrief, homeFocus, predive). No assertion was loosened; the caption checks still guard the "caption names the launch destination" regression.

Gates: see the final report (unit and smoke run via `PW_PORT=4731 tools/gates.sh`). Screenshots were not re-captured; the full journeys spec was not run.
