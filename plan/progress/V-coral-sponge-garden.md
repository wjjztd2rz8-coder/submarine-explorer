# V-coral-sponge-garden

What changed: new `chimney` scatter kind (tall pale tube-sponge stacks, reusing the existing tube geometry with the muted sponge hues) in `src/world/scatter/ScatterTypes.ts`; requested by the Blake biome entry only (data in `src/world/TerrainBiome.ts`). No site branch, no new tier, no new geometry.

A first attempt reused the existing `tube` kind, but its Blue Hole palette (violet, pink, teal) read as confetti on Blake, so it got its own muted hues.

Before: `.cache/golden/2026-11-01-105334/blake-plateau-corals-1-mission.png`
After: `.cache/golden/2026-11-01-110006/blake-plateau-corals-1-mission.png` (also `-1.png`)

Honest rating: partial. Tall pale stacks now show in the foreground bed (a second silhouette next to the low tan mounds), but the stretch between sub and mounds at the opening is still empty (scatter is sparse beyond the near field), so the mounds themselves still look like similar lumps from 160 m.

Gaps: mound silhouettes at distance are unchanged; fixing that needs per-mound variety in `coral.ts` or a denser mid-range scatter.

Gates: only the two cross-site snapshots (beebeIsolation, beebeScatter) changed, both from the intended Blake biome edit; re-baselined. Everything else passed.
