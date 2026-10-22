# V-eight-sites-lit (a): Kamaʻehuakanaloa lit at spawn

Shots: `.cache/codex/shots/V-eight-sites-lit-a/{before,after}/` (low-portrait, low-landscape, medium-landscape, high-desktop; mission spawn, Arcade).

## What changed (data only)

- `data/landmarks/kamaehuakanaloa/site.json`: site ambient (`atmosphere.tiers`) lifted from 6 to 18 with a neutral blue-grey colour, now on low, medium and high (it was Low only, so Medium and High stayed black).
- `src/world/TerrainBiome.ts`: the Kamaʻehuakanaloa biome is now an iron-oxide silt bed (silt A, basalt B, warm tan-rust colours, stain 0.12) instead of dark basalt with rust speckle.

## Findings

- The spawn sits about 145 m above the local bed; the scan subject at spawn is the nearest Crown jelly (Atolla, dark red bell) about 11 m ahead in open water, not the vent (200 m away, over the rim). A vent glow light (SeamountPreset, tried on Low) had no visible effect for that reason and was reverted.
- A life opening staging golden coral (groups strategy) also failed: no seabed within reach of the spawn. Reverted.

## Ratings (my reading of the shots)

| View             | Before | After |
| ---------------- | ------ | ----- |
| Low portrait     | 2.2    | 3.4   |
| Low landscape    | 2.2    | 3.4   |
| Medium landscape | 1.8    | 3.2   |

## Known gaps

- The jelly is still a dark crimson shape (true Atolla colour) against a lit bed: readable with surface detail, not glowing. Brightening it needs a species-level or a spawn-staging change.
- High reads a little bright and warm on the bed edge; no tier-specific tuning was done.
- No snapshot changed intentionally beyond what gates report (see final report).
