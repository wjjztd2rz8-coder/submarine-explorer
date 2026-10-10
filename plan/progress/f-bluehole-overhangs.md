# f-bluehole-overhangs

Shots: .cache/golden/2026-10-10-023527 (before), 2026-10-10-024410 (after); see great-blue-hole-1/3 and east-2.

- Heightfields cannot overhang, so overhangs are instanced rock awnings: new scatter kind `ledge` (wide flat slab, darker underside vertex colour, on rock slopes up to 62 deg) in ScatterGeometry/ScatterTypes/TerrainBiome.
- New `tube` scatter kind: clustered slender capsule sponges in five muted hues; sponge density up (0.8/0.5 to 1.2/0.9).
- Three extra wall notches in terrainFeatures.ts (bearings 1.5, 4.6, 0.1; gallery mouths untouched).
- Cost: +2 instanced draws in Blue Hole scatter (4 to 6); terrain triangles unchanged (Low cap test still passes). Snapshots updated: beebeIsolation (biome hash), beebeScatter (Blue Hole only).
- Test: tests/unit/blueHoleOverhangs.test.ts.

Judgement: a visible but modest gain (~+0.25). Slabs read as ledges on the terrace beds and tubes add colour variety; the gallery-seat floor in poses 2/3 is still mostly smooth. Slab rock texture is somewhat busy.
