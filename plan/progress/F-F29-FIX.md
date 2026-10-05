# F29 fix: regressions after the 670-730 merges

- Beebe opening (Spawn.ts): 680's pose (range 76, altitude 8, chaseOffsetX -10) won the merge over 660's
  chaseOffsetY -38, so the scan reticle overlapped the hull at 844x390. Pose is now altitude 8, range 76,
  chaseOffsetX -24, chaseOffsetY -38. Both 650 readability and 680 framing unit tests pass (a sweep showed
  X in -20..-30 with Y -38 passes both). Code was wrong, tests unchanged.
- lostCityBiome unit test: 700 added a Monterey terrain carve that needs meta.center; the test's synthetic
  tile now supplies one. Test was stale.
- f-rebrand-bathyline: 720 intentionally changed the Journal kicker to 'Journal'; test updated.
- f-flow-audit-510: 730 moved the spec to a paused clock, but the post-Begin check had no frame advance, so
  the tutorial card never rendered. Added page.clock.runFor(34). UI not regressed.
- f-save-soak and f-verify-650 pass with the corrected Beebe pose (no change needed).
- f-flow-audit-510 also needed clock.runFor before the touch SCAN button check and inside pause() (paused clock stalls actionability). All 5 cases pass.
