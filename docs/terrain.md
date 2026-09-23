# Terrain: detail layer, material and LOD (package A1)

Source of truth: `src/world/Terrain.ts`, `TerrainChunk.ts`, `TerrainNoise.ts`, `TerrainMaterial.ts`, `src/shaders/terrain.*.glsl`. Tunables: `terrain` section of `src/core/Config.ts`. Tests: `tests/unit/terrain-detail.test.ts`, `tests/unit/Terrain.test.ts`.

## Why this exists

Survey cells are 45–61 m on our GMRT tiles (450 m where GEBCO fills). At a few metres of altitude a plain displaced grid reads as a faceted blanket. The terrain therefore renders **measured data plus a procedural detail term**, with the detail small enough never to invent a landform.

## The detail layer

- `height(x, z) = data(x, z) + detailStrength · detailAt(x, z, slope)`.
- `detailAt` is 2–4 octaves of value-noise fBm (`fbm2`), first-octave wavelength `detailWavelengthCells` (3 cells), peak amplitude `detailAmplitudeCells` (15 % of a cell, so ±6.9 m on Titanic's 46 m cells).
- Amplitude is scaled by local **data slope**: full on rock (slope ≥ `detailSlopeHiDeg` = 25°), reduced to `detailSedimentFactor` (0.3) on sediment (slope ≤ `detailSlopeLoDeg` = 4°), smooth between.
- It is a pure function of world position and `detailSeed`, so neighbouring chunks agree exactly at seams.
- `Terrain.sampleHeight` returns the same sum, so submarine collision and camera clamping match what is drawn. `sampleDataHeight` gives the survey-only value.
- **Pure-data mode:** set `terrain.detailStrength = 0`. This is the "survey only" toggle for the settings screen (C5).

## Mesh and LOD

- Tile is split into chunks of `chunkCells` source cells; each chunk is sampled at `detailSubdiv` vertices per cell (tier dependent) so the detail has vertices to live on.
- **Vertex budget.** `Config.terrain.maxVertices` (default 4,000,000) caps resident terrain vertices. If `cols·rows·subdiv²` exceeds it, `Terrain` steps the tier's `detailSubdiv` down (3 → 2 → 1, never below 1) until it fits (`fitSubdivToBudget`). `stats.requestedSubdiv` keeps the tier's value, and `debugString()` then reads `subdiv 2, capped from 3 by vertex budget`. In practice, `blake-plateau-corals` (1202×1201) drops to subdiv 1 on both medium and high; `endurance` (1202×~700) drops to 2 on high and keeps 2 on medium; `titanic` (548×546) keeps 3. Set `maxVertices` to 0 to disable the cap.
- Three index buffers per chunk (stride 1 / 2 / 4) share one vertex buffer. `Terrain.update(camera)` picks the LOD by distance (`lodDistancesM`, scaled by the tier's `lodDistanceScale`) and lets Three frustum-cull per chunk via correct bounding spheres.
- Cracks between LODs are hidden by per-chunk perimeter **skirts** (`skirtDepthM`), so chunks never need to know their neighbours' LOD.
- Normals come from the sampled height grid, not from triangles, so shading is identical on both sides of a seam.

## Material

`MeshStandardMaterial` patched via `onBeforeCompile` (fog, lights and tone mapping stay Three's). Triplanar projection blends three procedural albedo textures: sediment (flat), rock/basalt (slope between `rockSlopeLoDeg` and `rockSlopeHiDeg`), sand (shallower than `sandDepthShallow`, gone below `sandDepthDeep`), plus a tiling noise normal map (`materialNormalStrength`). A depth-ramp LUT (`colorRamp`) tints by depth, and steep rock is pulled `rockColorMix` (0.6) of the way toward `rockColor`.

**Palette** (docs/art-direction.md §0; sRGB hex in Config):

- The ramp is sand `#C9B489` at 0 m, `#BFAB83` at −120 m, `#8F8068` at −260 m, then sediment `#7A6E5C` from −400 m, drifting greyer to `#6F6A62` at −6,000 m.
- Basalt is `#3B3A3D`.
- Keep every stop low-saturation. The old ramp was green/teal between −120 and −1,200 m (`#A8C47E`, `#86C090`, `#7BB3A2`). Multiplied by the cyan water light, it gave the lime/emerald look in QA-B #4. Textures are generated at load, so there are no binary assets and no attribution rows; swapping in CC0 PBR maps from `docs/assets.md` is a change to `makeSeabedTexture` only.

## Graphics tiers (`?tier=low|medium|high`, default from `Config.graphicsTier`)

| tier                            | subdiv | detail octaves | texture px | LOD distance scale |
| ------------------------------- | ------ | -------------- | ---------- | ------------------ |
| low                             | 1      | 2              | 128        | 0.55               |
| medium (this Mac, 60 fps floor) | 2      | 3              | 256        | 1.0                |
| high (Linux, Radeon 9600 XT)    | 3      | 4              | 512        | 1.8                |

`?debugTerrain=1` logs chunks, LOD counts, draw calls and fps once a second.

## Known gaps (see plan/QA-A.md)

- Formal fps measurement on this Mac was not recorded before the agent was stopped; do it during the Phase A QA pass with `?debugTerrain=1`.
- A faint cell-aligned pattern is still visible from high altitude in the surface band (docs/img/atmosphere-10.png). Likely the albedo texture repeat coinciding with cell size; try a non-integer `materialTextureScaleM`.
