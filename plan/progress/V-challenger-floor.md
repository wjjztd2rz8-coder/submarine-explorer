# V-challenger-floor

## What changed

- `TerrainBiome.ts` challenger-deep biome (data only): ripple 2.5 -> 1.8, reach 0.4 -> 0.2, ripple fade 70-200 m -> 30-110 m, so the plain is pale and calm away from the lander; boulders 1.6 -> 2.4 per 1000 m2 and sizeMul 2.6 -> 3.4 so they read at the opening distance.
- `lander.ts` bait glow: the pool is 7k -> 12k wide, 0.5 opacity, lifted slightly; the halo sprite no longer depth-tests. The old pool/halo were sliced flat by the seabed, giving a hard straight edge under the cage.
- No new options, no site branches, no new elements (net: same props, softer).

## Shots (desktop 1600x900, mission opening)

- Before: .cache/golden/2026-11-13-175021/challenger-deep-1-mission.png
- After: .cache/golden/2026-11-13-175417/challenger-deep-1-mission.png

## Self-rating

About 4.0 (from ~3.5). Pool reads as a soft gradient, sparse rocks on a paler plain. Amphipod trails are not visible at this camera distance; the burrow setting is unchanged. Not frustratingly dark.

## Assertions

None changed.
