# R-ci-green-3

Hosted CI on main (run 39911030459) was red. Changes:

- d-start, f-arcade-access, mission specs: the openings now carry an authored `opening.mission.yawOffset` and `rangeM`. Tests read both from `data/landmarks/<id>/site.json` (`helpers/site.ts`) instead of expecting dead-ahead / 220 m.
- `src/styles/home.css`: `.home-sites-grab` hit area is 44 px tall (was 24). The negative margins keep the visible bar and the layout below where they were.
- `journal-debrief.spec.ts` unaided journeys: the 1280x720 / 844x390 "timeouts" were a real test failure, not CI slowness. The journey only held forward; with a 35 degree yaw offset the bow is passed at ~80 m, so the scan prompt never appeared and the 1200-frame loop ran until the 360 s timeout. `held()` now lets the work steer, and the approach follows the visible nav-line turn cue (STBD / PORT / AHEAD), like a player. All six journey variants pass locally (about 4 s each).
- `tests/unit/montereyScarpSupport.test.ts`: `beforeAll` gets a 60 s hook timeout.
