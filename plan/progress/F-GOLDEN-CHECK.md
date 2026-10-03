# F-GOLDEN-CHECK: hero-site code readability audit

2026-10-03. Scope: the five hero sites, ordinary Arcade free dive and near-site missions, Low and Medium graphics. Browser inspection is unavailable.

## Plan and progress

1. Read `plan/DIRECTOR.md`, the authored openings in `src/game/Spawn.ts`, each site's `mission.json`, depth-band sampling, preset overrides and scene-light propagation. Complete.
2. Measure actual survey terrain and procedural hero geometry; verify hull clearance, approach distance, ambient/fill floors and fog transmission without headlights. Complete: ten tests, twenty opening/tier combinations, two fresh atmosphere frames each.
3. Make the smallest necessary value fixes, then run `tools/gates.sh --no-e2e`. No authored values failed the code-level floors; no tuning changes are needed. Sandbox gates passed; results below.

## Per-site values

The following are **Medium free-dive opening** measurements in world metres. Depth is positive below sea level; altitude is above the actual seabed beneath the hull. Hero range is horizontal distance to the placed prop origin, not POI range or camera distance. Ambient is global: every seabed point receives it regardless of depth or distance. Spawn base ambient is sampled at submarine depth; final scene ambient/fog use chase-camera depth, matching `atmosphereSystem`.

| Site            | Spawn (x, y, z); yaw               | Depth / altitude  | Hero range | Base ambient at sub | Fill override                    | Scene ambient | Scene fog density (1/m) | Fog transmission at 40 m | Ambient luminance proxy at 40 m |
| --------------- | ---------------------------------- | ----------------- | ---------- | ------------------- | -------------------------------- | ------------- | ----------------------- | ------------------------ | ------------------------------- |
| Titanic         | (336.13, -3777.64, -292.75); -70°  | 3777.64 / 24.72 m | 45.97 m    | 0.1800              | +30                              | 30.1800       | 0.0010000               | 99.840%                  | 4.8296                          |
| Lost City       | (68.25, -782.15, -922.03); 10°     | 782.15 / 35.14 m  | 44.00 m    | 0.2201              | +16                              | 16.2331       | 0.0013914               | 99.691%                  | 2.8113                          |
| Great Blue Hole | (-65.11, -30.06, -44.80); -90°     | 30.06 / 93.06 m   | 230.48 m   | 0.5486              | reef ambient ×1.5 in sunlit zone | 1.3353        | 0.0002056               | 99.993%                  | 0.9833                          |
| Beebe vents     | (20.72, -4966.39, -60.07); 175°    | 4966.39 / 27.23 m | 46.64 m    | 0.1800              | +8                               | 8.1800        | 0.0010000               | 99.840%                  | 1.4001                          |
| Monterey Canyon | (-3400.93, -722.32, -1324.19); 10° | 722.32 / 27.12 m  | 34.65 m    | 0.2411              | +24                              | 24.2557       | 0.0008967               | 99.871%                  | 3.0811                          |

All five receive non-zero ambient at spawn, including the seabed under the sub and a 40 m horizontal ring. None relies on headlights, vent glow, sun or caustics to pass. Titanic remains in the abyss band; Lost City and Monterey interpolate between midnight and abyss. Blue Hole's 93 m altitude is over the reconstructed sinkhole floor; its sub is about 12 m above the grotto's base, facing across the hole toward the ledge. Low has slightly different procedural detail/prop bounds, but passes the same limits.

## Mission openings and tier details

| Site            | Medium mission depth / altitude | Distance to nearest primary (3D) | Scene ambient | Scene fog density | Transmission at 40 m |
| --------------- | ------------------------------- | -------------------------------- | ------------- | ----------------- | -------------------- |
| Titanic         | 3777.64 / 24.72 m               | 47.61 m                          | 30.1800       | 0.0010000         | 99.840%              |
| Lost City       | 782.15 / 35.14 m                | 44.58 m                          | 16.2331       | 0.0013914         | 99.691%              |
| Great Blue Hole | 175.13 / 64.23 m                | 226.07 m                         | 0.6150        | 0.0006158         | 99.939%              |
| Beebe vents     | 4966.39 / 27.23 m               | 46.27 m                          | 8.1800        | 0.0010000         | 99.840%              |
| Monterey Canyon | 22.89 / 25.19 m                 | 226.07 m                         | 24.8902       | 0.0002056         | 99.993%              |

Blue Hole and Monterey's first mission contacts lie away from the scenic free-dive props. `composedMissionSpawn` therefore opens near a primary instead of teleporting to a distant hero: about 4.45 km from the Blue Hole grotto and 17.36 km from Monterey's scenic wall. Tests separately bound these missions to 300 m from a primary. Their authored surface starts remain at 5 m and are outside this near-site audit.

Titanic's free-dive opening applies its authored 70 m chase arm; `missionSystem` currently uses the default approximately 97.7 m arm. Tests follow each call path instead of assuming missions apply the optional radius. Both pass the ambient, fog and clearance floors.

Lost City's `hazeScale: 1.5` and `hazeLift: 0.4` are applied to the sample by the vent preset. On Medium the adjusted fog reaches the scene; on Low `PresetSystem` writes only adjusted ambient back, leaving base fog (approximately 0.0009275 at the free-dive camera, 99.863% transmission at 40 m). The tests use the actual scene fog. The fill and warm tint reach both tiers.

## Acceptance floors and computation

| Site            | Minimum scene ambient / additive fill | Spawn altitude | Free-dive horizontal hero range |
| --------------- | ------------------------------------- | -------------- | ------------------------------- |
| Titanic         | 24 / 24                               | 22–60 m        | 12–80 m                         |
| Lost City       | 12 / 12                               | 22–60 m        | 12–80 m                         |
| Great Blue Hole | 0.5 / none (reef scale)               | 22–100 m       | 12–250 m                        |
| Beebe vents     | 6 / 6                                 | 22–60 m        | 12–80 m                         |
| Monterey Canyon | 16 / 16                               | 22–60 m        | 12–80 m                         |

These conservative regression floors retain margin beneath current tuning. The 22 m minimum is hull radius 8 + seabed clearance 4 + spawn clearance 10. Missions retain the same altitude bounds and a maximum 300 m primary-contact distance. Collision checks and depth-safe hull selection use the actual runtime functions; existing `arcadeLoadout.test.ts` covers fresh Arcade access with no research.

Three.js `FogExp2` transmission is `T(d) = exp(-(density × d)²)`. Linear ambient-colour luminance is `Y = 0.2126r + 0.7152g + 0.0722b`; the ambient proxy is `sceneAmbientIntensity × Y × T(d)`. Tests require `T(40) >= 0.95` and proxy `>= 0.1`, both at a 40 m viewing distance and at nine actual seabed samples (under the hull plus eight bearings at 40 m horizontal radius), using their real chase-camera distances. Two fresh atmosphere frames assert unchanged ambient, guarding cumulative fill. This is a lighting-input bound; albedo, occlusion, tone mapping, framing and perceived ten-second readability still require visual review.

## Changes and validation

- Added `tests/unit/heroReadability.test.ts`: ten parameterized tests using checked-in heightmaps, actual `Terrain`, procedural `Props`, composed spawn functions, `CameraRig`, and `PresetSystem`. Covers Low/Medium, free dive/mission, lamps off, override loading, scene-light propagation, altitude, range, collision, depth safety and fog-weighted ambient floors.
- Added this report. Existing site values already pass; no runtime or content values changed. Factual site content, Arcade access and HUD remain unchanged.
- Focused tests: **10 passed**. `GATES_CONFIG_MODE=writable tools/gates.sh --no-e2e`: **passed** (config, build/typecheck, unit, Python, strict content, attribution, Prettier). Unit suite: **103 files / 1125 tests passed**. Browser E2E was omitted with the supported `--no-e2e` switch because the sandbox has no browser; visual acceptance remains unverified.
