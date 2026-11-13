# V-challenger-floor

## What changed

- `TerrainBiome.ts` challenger-deep biome (data only): ripple 2.5 -> 1.8, reach 0.4 -> 0.2, ripple fade 70-200 m -> 30-110 m, so the plain is pale and calm away from the lander; boulder sizeMul 2.6 -> 3.4 (density unchanged at 1.6, so instance and draw budgets stay equal) so they read at the opening distance.
- `lander.ts` bait glow: the pool is 7k -> 12k wide, 0.5 opacity, lifted slightly; the halo sprite no longer depth-tests. The old pool/halo were sliced flat by the seabed, giving a hard straight edge under the cage.
- No new options, no site branches, no new elements (net: same props, softer).

## Shots (desktop 1600x900, mission opening)

- Before: .cache/golden/2026-11-13-175021/challenger-deep-1-mission.png
- After: .cache/golden/2026-11-13-175417/challenger-deep-1-mission.png

## Self-rating

About 4.0 (from ~3.5). Pool reads as a soft gradient, sparse rocks on a paler plain. Amphipod trails are not visible at this camera distance; the burrow setting is unchanged. Not frustratingly dark.

## Assertions

Updated deliberately (they pinned the old Challenger values): biomeFloorVariety ripple reach/fade now read the biome values; beebeScatter 1310 derives the boulder scale ratio from the biome sizeMul; beebeIsolation and beebeScatter snapshots and tests/fixtures/challenger-keepout.json regenerated (only the challenger-deep entries changed; other sites byte-identical). The keepout assertions (lander hits 0, spawn/eye/arm gaps) still pass with larger boulders; no clearance assertion was loosened.
