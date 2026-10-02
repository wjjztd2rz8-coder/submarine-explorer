# F-HERO-BLUEHOLE: first 60 seconds at the Great Blue Hole (progress)

Branch `claude/f-hero-bluehole`. Shots: `.cache/codex/shots/f-hero-bluehole/{before,after}/` (before = golden set 2026-10-02-0704; after = `opening-high.png`, `opening-low.png`, `c1.png` for the descent).

## What was wrong

- The GMRT tile is a flat 4 m platform at the hole (cells ~58 m): no hole at all, so the opening was a brown seabed with caustic honeycomb.
- The grotto prop stood on the atoll slope 6.5 km away, drawn at the shared (very dark) geo albedo: a black curtain.
- Blue tang schools of 10-24 dark navy fish read as noise.

## What changed

- `world/terrainFeatures.ts` (new) + `Terrain.sampleDataHeight`: an analytic carve of the sinkhole (radius 160 m with an irregular outline, ledge ~40 m, floor 125 m) applied over the survey height, so mesh, collision, scatter and sonar all see it. Only for tile `great-blue-hole`.
- `TerrainBiome`/`TerrainMaterial`/`terrain.frag.glsl`: generic `depthShade` (surface-depth dependent blue darkening); Blue Hole starts it at 14 m, complete by 95 m. Pale sand palette, lower contrast and detail.
- `Spawn.ts`: opening 235 m east of the grotto, 12 m above its base, over open water (`openWater` skips the clear-seabed-line raise), facing the ledge across the dark hole.
- `props.json`: grotto moved onto the west ledge, heading 90 (opens toward the hole), 84 x 28 x 40 m. `stalactites.ts`: limestone albedo lift (x4.2). Note rewritten.
- `mission.json` reef overrides: shafts 0.14 opacity down to 110 m, caustics 0.8, ambient 1.5.
- `life.json` / `catalogue.ts`: smaller tang/grunt groups, brighter tang palette.

## Known gaps

- No distinct halocline/H2S haze at ~90 m (only the depth shade); no overhangs on the hole wall itself (heightfield).
- Terrain texture still shows a repeating pattern on the walls up close.
- Golden shots 2 and 3 for this site are poorly framed (the tool's pose lands against the carved wall).
- Low tier: hole interior is dark with little ambient fill.
