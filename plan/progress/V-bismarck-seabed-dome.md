# V-bismarck-seabed-dome

## What changed
- Dome: diagnosed as the finite seabed tile's far crest meeting open water with no distance fade (the biome had none, unlike other tiles with `horizonFadeM`). The seamount flank itself is untouched. `TerrainBiome.ts` bismarck gets `horizonFadeM: [90, 420]`, so the far crest melts into the water. The limb is much softer but a faint arc remains (it is real flank relief).
- Grounding: new generic `scourCollar` (ship.ts) builds a dark gap plus a low sediment berm along both hull sides, used by Bismarck as an extra core mesh (`bismarck-scour`). Any other hull can call it.
- Snow dots: they were wreck-preset haze particles. Bismarck mission overrides (`mission.json`, data) now use smaller (0.6 m), fainter (0.12) and darker haze. Dark slide blocks and plate debris untouched.

## Ratings (opening, honest)
- Before 3.5 / 10, after about 4.2 / 10.
- Screenshots: before `.cache/golden/2026-11-06-172019/bismarck-1-mission.png`, after `.cache/golden/2026-11-06-172839/bismarck-1-mission.png`; close view `.cache/golden/2026-11-06-172630/bismarck-2.png`.

## Simplicity check
Net: one generic helper plus one biome field plus data overrides; no site branches, no runtime config mutation, no new settings, no UI, no package numbers in code. No tests changed.

## What remains
- The hull still reads as a slab at opening range: the collar is similar in tone to the bed and the hull bottom edge is straight. A true carved scour in the terrain heightfield (generic per-wreck footprint depression) would ground it properly.
- A faint arc of the far crest remains; a longer-range fix would need a taller horizon fade or a scene backdrop.
- Debris plates and slide blocks are still large dark ovals near the spawn.
