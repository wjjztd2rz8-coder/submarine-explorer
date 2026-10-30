# V-bluehole-floor-2

## Why spawn depended on detail amplitude

`placePois` snaps the first primary (stalactite gallery) to `sampleHeight`, which includes generic detail. At the gallery that detail was -3.9 m (target -32.6 m); with it removed the target is -29.6 m. `composedMissionSpawn` wanted the sub `clearance` (22 m) above the target, i.e. at -7.6 m, which is above the legal ceiling (-8 m, hull radius), so every candidate was rejected and the mission fell back to the free-dive spawn 4161 m away. The geometry was marginal by 0.4 m; the detail amplitude only exposed it. Separately the gallery scan needs `min_depth_m` 10.

## Changes

- `src/game/Spawn.ts` (`composedMissionSpawn`): the preferred height over a floor is capped at the first primary's minimum scan depth (hull radius at least), and never below the hull gap over the floor. Used for the initial height, the floor loop and the transit check. Deep sites are unchanged (the cap never binds).
- `tests/unit/missionShallowTarget.test.ts`: new capability test, a target within a clearance of the surface still gets an opening (fails without the fix).
- `src/world/Terrain.ts`: smooth-rock biomes get zero generic detail amplitude (carve terms author them); biome now resolved before the detail params.
- `data/landmarks/great-blue-hole/site.json`: `opening.mission.localAltitudeWeight -0.1` (existing knob). With the shallow-target fix more approach bearings are legal, and the shelf one (hugging camera) outscored the over-the-hole one; the weight keeps the previous opening pose.
- Tests following the rule: missionApproach (`<=` ceiling), heroIntegrity station height and heroReadability min altitude use the same cap; fidelityRollout seam y tolerance 4 to 3 decimals (float32 step at 1 km depth is 1.2e-4). Snapshots re-baselined for great-blue-hole only (beebeIsolation buffers, freeDiveComposition pose).

## Screenshots (.cache/codex/shots/V-bluehole-floor-2/)

before.png (main), after-0.25.png (scale 0.25 experiment), after-0.png (shipped), after.png (0.25 with fix, superseded). The first attempt without the localAltitudeWeight picked the rim shelf and a hugging camera (rejected).

## Honest rating

Opening composition unchanged (same pose, sub and gallery). Foreground bowl: ~3.8/5 vs ~3.6 before. The fine sawtooth is gone and the mid floor is cleaner, but the bottom-left still reads as stacked terraces with serrated edges: those are the carved bed steps in terrainFeatures and the tint, not generic detail. A real fix would soften the terrace profile at gallery range (blend bed risers), which is a separate carve change.

## Simplicity

Spawn: one helper replaces three repeated clearance expressions. Terrain: one ternary, no new config field. No site branches in code; one data knob. Tests: one new, four adjusted to the same rule.
