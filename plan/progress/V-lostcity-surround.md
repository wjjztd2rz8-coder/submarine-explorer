# V-lostcity-surround

Branch claude/V-lostcity-surround. Files: src/world/LostCityBands.ts, src/core/config/terrain.ts, src/world/props/geo/towers.ts, data/landmarks/lost-city/props.json; snapshots follow.

## Changed (net simpler: two noise terms and one terrace config deleted)

- Streak cause: the Lost City terrace shelves (`terrace` in LOST_CITY_FIDELITY) drew lit contour lines across the ridge, and the fine/cobble silt noise in `lostCitySlopeTint` smeared into streaks at grazing angles. Terrace amount is now 0 (shelf height is skipped), and the silt tint keeps only the broad drift term. The ridge is a smooth dark slope.
- Tower skirt (towers.ts paint): the apron blends into the seabed colour later (0.8 to 1.1 of the rim instead of 0.5 to 1.05) and the foot is less stained, so rubble and talus stay pale until the rim.
- Mid-ground chimneys: site data only. `unnamed-chimney-1` and `-2` (already marked invented in their notes) are 18 m and 24 m instead of 6 m and 9 m and moved off the survey-pose line behind the camera onto the ridge. No new props, so draws and the plume budget are unchanged.

## Shots (.cache/codex/shots/V-lostcity-surround/)

before-3.png, after-3.png.

## Rating: 3.7 of 5 (was 3.5)

Streaks and wood-grain are gone; the ridge is clean. One mid-ground chimney now reads at left. Second chimney is placed on the ridge but is not in this frame.

## Gaps

- The tower fills the detail frame, so the pale skirt is only partly visible (right foot); it reads grey rather than pale.
- Only one extra chimney appears in the frame; the other sits outside the golden pose's view.
- The ridge is now smooth and a little bland; a pale scatter tint turned the flecks orange, so I left the olive tint.
- The mid-ground chimney is dark blue-grey (fog and chimney material), not pale carbonate.

## Tests

- terrain-detail terrace capability test now builds its own shelved profile (Lost City ships flat); `terrace` support in Terrain.ts has no shipped user now, a follow-up could delete it.
- props-geo and terrainMerge1140 snapshots re-baselined: Low terrain triangles 48224 to 49124 (+1.9%, the taller chimneys), draws unchanged at 14. beebeIsolation colour hash follows the shared Lost City vertex tint.
- perf-budget Low pins follow the sprites' ground (70 m 10428.69 to 10661.43, 32 m 44027.34 to 44211.16, 10 m 67089.93 to 67265.49); ceilings moved up under 0.5%. Draws and point counts are unchanged, so the plume budget is not raised; this is placement on the flattened ground.
