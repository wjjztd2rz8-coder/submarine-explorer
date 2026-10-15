# S-scan-reach: scans need a close approach

Problem: both Blue Hole galleries scanned from 150 to 190 m while surfaced at 8 to 25 m, and Titanic from 160 to
190 m, so the dive into the hole and the close wreck view never happened.

## What changed

- Reach is per-site data. `radius_m` (raw, multiplied by the live sensor scale, about 2.4 in Arcade, 1.2 in
  Realistic) is now 30 for Titanic bow and stern (Arcade 72 m) and 36 for both Blue Hole galleries (Arcade 86 m).
  The earlier 180 to 200 m values are gone. Smaller values failed the hero-integrity legal-station proof (the
  hull cannot get inside the wreck or alcove box).
- New optional POI field `min_depth_m` (parsed in `Pois.ts`, carried as `minDepthM` on the scan target,
  enforced in `Scanner.geometry`). Both Blue Hole galleries set 10 m, so the surface start cannot scan them.
  The galleries sit on a ledge about 33 m deep, with a 12 m seabed clearance, so 10 to 21 m is the band.
- Guidance copy: the objective line says "DIVE DEEPER" when the sub is within the radius but too shallow, instead
  of "CLOSE TO N M" for a range it has already met (`ScanOverlay.ts`). Star rules are unchanged (they count scans).
- Blue Hole mission approach 220 to 150 m and free-dive opening range 100 to 85 m (`Spawn.ts`, existing per-site
  tables) so the first scan still lands within the opening minute and the gallery is in range at the opening frame.
- Tests, extending existing specs: `gameScanner` (depth gate), `gamePois` (field parsing), `heroMissionSpawn` (the
  bot now pitches and trims depth on the final approach), `missionApproach` (removed the hint-range assertion that
  duplicated the sonar-range one), `blueHoleOpening` / `f30Regression` / `lowTierFollowups` /
  `terrainCarveAgreement` (POI radii scaled by the Arcade reach through `withArcadeReach` in `helpers.ts`),
  `beebeIsolation` snapshot (spawn hash changed with the Blue Hole approach).

## Verified

- `PW_PORT=4711 tools/gates.sh`: all passed (python, content, build,
  unit, e2e smoke, e2e-base, attribution, prettier).
- Targeted e2e (d-scan, mission, f-bughunt-880, f-lowtier-followups, d-start, journal-debrief, content-missions,
  opening-framing): 169 passed. 6 failures are all `opening-framing` "endurance merged opening" camera radius
  (expected 70, got 54), from the V-endurance camera work and not from this package (no Endurance data touched).
- Screenshots in `.cache/codex/shots/S-scan-reach/`: `titanic-bow` (scan contact at 23 m over the bow),
  `bluehole-gallery` (poi spawn at 12 m depth, 31 m from the gallery), `bluehole-free-open` (free-dive opening,
  gallery at 85 m, in range at the Arcade scale, 56 m deep).

## Notes

- Realistic mode reaches 36 m (Titanic) and 43 m (galleries): tight but fair with the 3x hint range and sonar.
- Other sites keep their existing reach; extend per-site data the same way if more need it.
