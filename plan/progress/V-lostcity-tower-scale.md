# V-lostcity-tower-scale

Change (data only, `data/landmarks/lost-city/site.json` mission opening): rangeM 130 -> 106, chaseRadius 80 -> 56, chaseOffsetX 40 (unchanged), chaseOffsetY 40 -> 8. Existing mission arm fields; no code change, no site branches, tower materials untouched.

Tests: arcadeLoadout and f-bughunt-18 mission-arm literals (80 -> 56, 130 -> 106) follow the data; mission approach table lost-city 130 -> 106; the hero mission spawn 110 m literal became 105 (same bend as Endurance: the real property, range above twice the effective scan radius, is still asserted on the next lines; 106 m is outside Arcade's 100 m scan floor). Portrait HUD-lane test constrained the offsets: X 60 clipped the hull at the left edge, Y 14 overlapped the joystick lane; X 40 / Y 8 passes.

Shots: .cache/codex/shots/V-lostcity-tower-scale/{before,after}-lost-city-1-mission.png, after-lost-city-portrait-1-mission.png (copy: plan/progress/V-lostcity-tower-scale-after.png).

Rating: about 6/10 (was ~3.9). The tower group is about twice as large, sits centre-right with its flank and rim towers, and the sub is low-left, clear of it. Not met: the upper ~45% of the frame is still plain water (the camera looks nearly level; fixing it needs a downward pitch, which is code, or a haze/far ridge), and the tower is centre-right rather than dead centre.
