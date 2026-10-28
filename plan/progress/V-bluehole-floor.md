# V-bluehole-floor

## Changes

- Cause of the sawtooth/lumpy floor and far wall: fine carved relief in `src/world/terrainFeatures.ts` aliasing at gallery range, not shading. Three terms:
  - `blueHoleWallRelief`: flutes at 43 bearings per turn, cubed (sharp), plus a 61-per-turn rubble hummock term. Rubble deleted; flutes now 19 per turn, squared (broad, soft).
  - `blueHoleApron`: the sediment mounds on the gallery shelf (the floor under the sub) were 6 and 19 per turn; now 3 and 7 per turn with longer radial period, so they read as low swells.
- Tried and reverted: scaling the generic detail amplitude down for `smoothRock` biomes in `Terrain.ts`. The floor was smoother but the mission opening spawned the sub on the surface 4161 m from the objective (heights feed spawn placement), so it was dropped. Kept as `failed-detail-amplitude.png`.
- Shaft/roof geometry, colliders, spawn and Low draw pin untouched.

## Screenshots

`.cache/codex/shots/V-bluehole-floor/`: before.png, after.png (kept), failed-detail-amplitude.png (reverted experiment).
In after.png the far wall and mid floor are continuous soft bands; a little sawtooth remains in the extreme bottom corners (near-field detail noise), which the reverted experiment would have removed.

## Tests

Snapshots re-baselined for the intended carve change only: terrainFeatures (blue hole heights and tint hashes) and sonarScour1320 (blue hole sonar renders). Gates: smoke and project-base e2e pass; unit passes after the re-baseline.

## Simplicity

Net: one term deleted (rubble), two constants softened; no new flags, no site branches, no new draws.

## Honest rating

Improvement but incomplete: ~4.3/5 on the far wall and mid floor, foreground corners still faintly jagged. Remaining idea: reduce generic detail amplitude for smooth-rock biomes without moving the spawn (needs investigation of why spawn depends on it).
