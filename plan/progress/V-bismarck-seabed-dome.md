# V-bismarck-seabed-dome

## What changed
- Dome: diagnosed as the finite seabed tile's far crest meeting open water with no distance fade (the biome had none, unlike other tiles with `horizonFadeM`). The seamount flank itself is untouched. `TerrainBiome.ts` bismarck gets `horizonFadeM: [90, 420]`, so the far crest melts into the water. The limb is much softer but a faint arc remains (it is real flank relief).
- Grounding: tried a generic sediment/scour collar along the hull sides. A collar placed at the hull's local mud line either hides under the terrain or pokes out as a floating wedge (the hull origin is set by the lowest footprint corner, so the local y=0 is not the bed), and widening hull bounds broke the footprint tests. Removed, not shipped.
- Snow dots: they were wreck-preset haze particles. Bismarck mission overrides (`mission.json`, data) now use smaller (0.6 m), fainter (0.12) and darker haze. Dark slide blocks and plate debris untouched.

## Ratings (opening, honest)
- Before 3.5 / 10, after about 4.0 / 10 (dome and snow improved, hull still reads as a slab).
- Screenshots: before `.cache/golden/2026-11-06-172019/bismarck-1-mission.png`, after `.cache/golden/2026-11-06-181118/bismarck-1-mission.png` (collar attempt removed; hull unchanged).

## Simplicity check
Net: one biome field plus data overrides; no site branches, no runtime config mutation, no new settings, no UI, no package numbers in code. No tests changed.

## What remains
- Hull grounding is not done. It needs a carved scour in the terrain heightfield (a generic per-wreck footprint depression sampled by the terrain builder), not a mesh collar.
- A faint arc of the far crest remains; a longer-range fix would need a taller horizon fade or a scene backdrop.
- Debris plates and slide blocks are still large dark ovals near the spawn.
