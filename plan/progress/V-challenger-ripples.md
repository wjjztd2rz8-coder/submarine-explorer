# V-challenger-ripples

## What changed

- Ripples were already a fragment-shader effect (`ripple`, `rippleLenM` per biome), but on the trench floor they were
  masked to isolated macro-noise patches and weak (0.3), so none showed in the lander light pool.
- New optional per-biome field `rippleReach` (default 0, so every other site is unchanged) lowers the mask threshold;
  Challenger sets `ripple: 2.5`, `rippleReach: 0.4`. Wired through `TerrainMaterial` uniform `uRippleReach` into
  `terrain.frag.glsl`. No meshes, colliders, spawn or terrain data touched (real GMRT kept).
- Vertex colour cannot carry ripples: the GMRT cells are about 60 m, so even High vertices are 20 m apart.

## What was cut

Nothing needed cutting: the Low lander budget (1985/2000 triangles) is geometry; ripples add no triangles or draw calls.
Net simplicity is neutral: one optional data field and one uniform, no new element.

## Tests

`biomeFloorVariety.test.ts`: trench ripples reach the light pool and stay bounded. No snapshots changed.

## Screenshots

`.cache/golden/2026-10-23-235424/` (ripple 4, reach 0.4: close view too strong) and the final 2.5 value is gentler.
Baseline: `.cache/golden/2026-10-23-234620/`. Close views (poses 2, 3) show clear sand ripples across the floor.

## Honest score

Challenger stays about 3.4-3.5. The opening view (pose 1) still shows NO visible ripples: the camera is about 25-45 m
from the floor and ripple detail fades over 22-75 m (`detailFadeRippleM`, global config). Close and approach views gain
a real texture. Next lever: a per-biome ripple fade distance (or a larger crest wavelength at range) so ripples read in the opening.

## Simplicity rules

1 net-neutral, 2-3 n/a, 4 per-site data only (no site branch), 5 n/a, 6 extended existing spec, 7 no package numbers in code.

## Snapshot

`beebeIsolation` snapshot updated: only the terrain shader and uniform digests changed (new `uRippleReach` uniform, default 0
so Beebe's output is identical); biome and buffer digests are untouched.
