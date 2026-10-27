# V-lostcity-talus

## Changes (src/world/props/geo/towers.ts only)

- Vertex paint: the apron and its blocks now lerp toward the existing OLD carbonate colour (strength 0.85) until near the rim, and the SEABED fade starts later (0.95..1.25 instead of 0.8..1.1). The skirt reads pale instead of olive-grey.
- Foot-block size (existing `nearFoot` scatter): `main.r0 * 0.1` raised to `0.15`, so the blocks packed around the main tower foot are larger. Count unchanged.

## Simplicity rules check

- No new draw calls: rubble stays merged into the tower geometry; Low still has `rubble: false` and is untouched.
- High plume budget not touched. No site-specific branches, no package numbers, no new data or kits.
- Net: +3 lines of paint, 0 new functions.

## Rating

- Before: about 3.7. After: about 3.8. The apron is visibly paler near the main tower and the foot blocks are bigger, but at the golden pose the pale tone still falls off quickly with water-colour depth, and the apron remains smaller than a true debris slope.

## Gates

static, unit (except 4 expected hash snapshots, updated), e2e smoke and project-base passed on the first run; the only failures were lost-city buffer digests (vertex colours changed; draws and triangle counts identical). Snapshots updated in props-geo and terrainMerge1140.

## Remaining

- A real "grew out of debris" read needs a wider or higher skirt (geometry change) or a data-driven rubble count bump; both were outside this item's data-only scope.

## Screenshots

- Before: .cache/golden/2026-10-27-124334/lost-city-1.png
- After: .cache/golden/2026-10-27-124600/lost-city-1.png (also -2, -3)
