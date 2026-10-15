# V-bluehole

## What changed

- Gallery hood (`extrudeProfile` option `ground`, used by `stalactites.ts`): toward the wall ends every profile point is limited to the terrain height under it, so the roof and its end walls run into the ground instead of standing in water over a lower slope. Mid-wall is unconstrained, so the overhang and the pendants still hang from the real roof underside.
- Shelf projection (`shelf` in `stalactites.ts`) draws back into the wall over the last 30% of each end; pendant placement is unchanged (clusters sit well inside).
- Apron mesh density (`blueHoleApron.rowDensity` 2 to 3, `columnDensity` 1.5 to 2.5, High and Medium only; Low keeps its grid): the stepped sediment beds lose their long wedge facets.
- Blue Hole biome scatter (`BIOMES['great-blue-hole']`): rock-awning `ledge` kind removed. On the smooth reef treads the awnings read as plates hovering over the bed. Ripple 0.6 to 0.25 and burrow 0.15 to 0 remove the regular dimple pattern seen at oblique angles on the reef.

## Screenshots (`.cache/codex/shots/V-bluehole/`)

- `before/` and `after/`: golden set (High desktop; shots 1 to 3 west gallery, east 2 and 3).
- `after-side/`: same code from a side-on diagnostic pose (not a golden pose), showing the hood end now meeting the ground.
- `after-low/`: Low tier, portrait.

## Simplicity rules

- 1 net simpler: one scatter kind and one stale comment removed; the only addition is one optional extrude parameter that replaces what would have been per-site clamping.
- 4 no site branches: terrain clamp is a generic extrude option, scatter change is in the biome table, density in the apron config table.
- 6 tests: `blueHoleOverhangs.test.ts` now asserts the Blue Hole biome has no `ledge` (deliberate design change, not a loosened guard); `beebeScatter` and `terrainMerge1140` snapshots re-baselined for the biome and apron change. No other assertions touched.
- 7 no package numbers in comments.

## Remaining issues

- The east hood is still a free-standing extruded slab with a smooth rolled lip; it reads as a canopy, not as rock the terrain grows out of. A real fix is a terrain carve behind each gallery seat (`terrainFeatures.ts`) so the roof is the terrain's own overhang, plus lip breakup. A lip-noise attempt was dropped because it moves the pendants away from the envelope the prop tests guard.
- Purple brain corals (life, sessile) still appear in gaps between the prop wall and the terrain behind it in the west view; they sit on the terrain but look like floating gems. Needs a life exclusion over gallery footprints.
- Dark side curtain of the east hood (underside shading plus opening light) is still heavy.
- Rating: about 3 (was 2.5 to 3).
