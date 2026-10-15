# V-bluehole-2

## What changed

- Floating purple "gems" on the west gallery wall were not brain corals or scatter (the previous note guessed so): they were the gallery builder's own 12 capsule sponges, placed from an approximate wall profile so they hovered in front of the displaced wall. Removed them (net simpler: about 55 lines and four imports gone). Real sponges still come from the biome scatter.
- New `clear_ground` prop flag (`PropDef.clearsGround`, `Props.coversGround(x, z)`): footprint test in the prop's local frame. Both Blue Hole galleries set it in `props.json`. The scatter layer (`Scatter.setGroundKeepout`, all kinds, applied when instances gather) and sessile life (`SimEnv.blocked`, `placePatch`) skip it, so boulders, tubes and corals no longer pile into the gallery's own fallen-block apron. No site branch: the flag is data, the helpers are generic. Documented in `docs/props.md`.
- Gallery wall shading (`stalactites.ts` paint): the darkening of the lower face, the blue-grey and teal tint of the low wall, the underside multiplier and the east opening-light floor were all lifted, so the hood interior and end walls stay readable.
- Sand shelf banding: per-pixel `riserShade` 0.3 to 0.2 and `lipLight` 0.2 to 0.12 (`blueHoleApron`), so the bright lip lines are subordinate to the bed tones.

## Screenshots (`.cache/codex/shots/V-bluehole-2/`)

- `before/`: previous slice's `after/` golden set. `after/`: this slice (High desktop, same poses). `step1` to `step5` are intermediate captures.
- West poses: floating gems gone, wall lighter, bands softer. East poses: foreground scatter inside the footprint gone, hood wall lighter.

## Simplicity rules

- 1 net simpler: sponge block deleted; additions are one data flag with two small helpers that replace per-site clamping.
- 4 no site branches: flag in data, generic helpers; only edits to tables are the shading constants in the gallery builder and the apron config.
- 6 tests: `props-loader.test.ts` gains a capability test (a flagged prop reports its footprint, an unflagged one does not). `blueHoleProps` and `terrainMerge1140` drop the removed sponge draw (draw budget 8 to 6) and the terrainMerge snapshot is re-baselined for the deliberate builder change. No guard loosened.
- 7 no package numbers in comments.

## Remaining issues

- Terrain carve behind each gallery seat: skipped. It changes the heightfield under the prop that `wallColliders` and the envelope tests are measured against, and the hour is better spent elsewhere; the hood is still a free-standing slab with a smooth rolled lip.
- East hood end walls and interior are lighter but still a flat slate-blue next to the cream roof; the roof lip needs breakup and a proper cavity gradient.
- Terrace banding is softened, not gone; it is a stepped heightfield, so a real fix is breaking the beds' regularity in `blueHoleTerraces`.
- Rating: about 3.2 (was about 3).
