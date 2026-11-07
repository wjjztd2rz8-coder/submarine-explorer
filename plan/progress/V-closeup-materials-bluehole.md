# V-closeup-materials-bluehole

## Changes

- `src/world/props/geo/materials.ts`: new shared `limestoneWeathering(material, {pits, streaks, bumps})`, layered on any vertex-painted geo material (same pattern as `canyonRockDetail`). Wall-projected value noise on world position, no UVs, no texture fetches, no new draw calls or lights. It gives:
  - solution pits at three scales (about 1 m, 3.5 m, 9 m), warped and stretched along the fall line so they read as runnels, with the fine scale fading out by about 110 m;
  - dark, slightly cool stain streaks running down the face;
  - a pale silt film on shallow slopes;
  - normal perturbation from the same pit field when `bumps` > 0.
- `src/world/props/geo/stalactites.ts`: applies it to the grotto wall (`pits 0.4, streaks 0.45`, `bumps 0.3` on tiers with `d.bump`, 0 on Low, which keeps albedo only).
- No site branch: the helper is generic and can be added to other limestone wall builders.

## Simplicity rules

1. Net simpler: one small shared helper, no new settings, no new on-screen elements.
2. No site branches. 7. Comments say why.
   Tests: no behaviour change in logic; existing specs unchanged.

## Look

Shots in `.cache/codex/shots/V-closeup-materials-bluehole/` (`before-3.png`, `after-3.png`, `after-3-low.png`, `after-1/2.png`, `after-mission-low.png`).
Detail frame: the tan wall now carries irregular pitting, vertical dark staining and
mottled tone instead of a clean gradient. Opening frames are unchanged (the effect fades with distance).

## Remaining issues / rating

Rating about 3.5/5 for the detail frame (was about 2). Still reads as slab/terrace:

- The grey sediment apron is still a stack of smooth steps; the weathering is masked to steep faces so it would not polka-dot the silt. A silt-specific grain (scour, worm tracks, sparse rubble) would be the next package.
- Wall silhouette and the fixed-geometry ledges are unchanged: the wall is still one smooth curved sweep with few real ledges.
- Pits are procedural dimples; at the closest range they may look slightly regular.
- Low tier shows only subtle streaks and tone, no pit relief.
