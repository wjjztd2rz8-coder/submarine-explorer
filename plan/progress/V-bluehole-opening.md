# V-bluehole-opening

Blue Hole free-dive/mission opening (`FREE_DIVE_OPENINGS['great-blue-hole']` in `src/game/Spawn.ts`, data only).

- Sub opens ~6 m deeper (altitude -22 to -28, 60 m depth) and the chase view tilts down less (offsetY 22 to 10), so the
  sub sits lower in frame and the camera looks up at the ledge. The gallery now stands against the hole wall under the
  surface light shafts instead of against bare haze.
- Range 85 to 58 from the hole centre: the deeper start would otherwise leave the gallery outside scan reach
  (`blueHoleOpening` first-scan contract, S-scan-reach), and the on-screen gallery footprint (`blueHoleWall`) must not shrink.
- Updated the `beebeIsolation` spawn snapshot (intended change).
- Screenshots: `.cache/codex/shots/V-bluehole-opening/` (`before-*`, `final-*`; desktop 1600x900, portrait 390x844).
- Known gap: the gallery prop itself is unchanged; the opening is darker (60 m) but readable. No prop or backdrop added.
