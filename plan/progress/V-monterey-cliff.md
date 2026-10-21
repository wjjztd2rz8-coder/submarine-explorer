# V-monterey-cliff

## Cause
The pale right-hand slab is the surveyed terrain bank, not a prop wall. Monterey's terrain biome had no baked bed colour, so the steep bank was plain silt/sand texture lit pale. The prop walls (scarp builder) already had strata.

## Changes
- `src/world/MontereyBands.ts` (new, ~20 lines): `montereySlopeTint` reuses `lostCityBedTint` for mudstone beds on steep slopes, a darker patchy face and a cooler grey-green cast; level silt is untouched.
- `src/world/TerrainBiome.ts`: Monterey biome gets `vertexTint: montereySlopeTint` (baked into existing vertices, no new draw calls or triangles, so Low budgets are unchanged).
- Tests: `lostCityBiome.test.ts` control for "no baked colour" is now hudson-canyon (Monterey now has it; assertion not loosened); `beebeIsolation` snapshot rebaselined (Monterey buffers gain a `color` attribute, nothing else).

## Simplicity rules
Extends the existing per-biome `vertexTint` hook and reuses the Lost City bed function; no site branch, setting, UI, spec or package numbers.

## Shots
`.cache/codex/shots/V-monterey-cliff/{before,after}-{1,2,3}.png`

## Rating and remaining issues
Right bank is now darker than the left wall, the same grey-green, with faint beds (about 3.8 up from 3.6 for this frame). Remaining: the beds on the bank are lower contrast than the prop walls (smooth vertices, no relief), the crest is still a fairly clean line and there is no talus skirt at its foot. A terrace relief pass was tried and dropped: it broke the terrain-memo test, which requires heights to be offset-invariant. The shaded sandy slope in the foreground is also a little darker than before.
