# f-beebe-rocks

## Changes

- `src/world/props/geo/beebe.ts`: new `angularRock` (icosahedron clipped by six random planes, noise-displaced, flat-shaded) used for the Beebe apron rubble; vertex colour is basalt-dark with rusty sulfide patches, fine grain and a light sediment dusting on upward faces. Blocks sit about half buried. Rubble stays one merged mesh (`beebe-seabed-talus`), so draw calls, colliders and scan targets are unchanged.
- `src/world/props/geo/talus.ts`: `scatterRubble` takes optional `make` and `lift`; default behaviour (and every other site) is unchanged.
- Sand apron edge: the rim radius is now distorted by multi-scale noise plus angular bays (tapered to zero at the mesh edge and inside r~0.6, so the buried outer rim and the unit-test clearances still hold); the lift fade starts at r 0.6 and ends at 0.96.
- `tests/unit/__snapshots__/beebeIsolation.test.ts.snap`: regenerated (Beebe-only; geometry hashes and triangle counts rose by 660 to 6700 per tier, draws unchanged).
- CHANGELOG entry added.

## Shots (tools/golden-shots.mjs, GOLDEN_SITES=beebe-vent-field)

- Before: `.cache/golden/2026-10-09-133006/beebe-vent-field-{2,3}.png`
- Final (high): `.cache/golden/2026-10-09-134438/beebe-vent-field-{2,3}.png` (earlier iteration `...-133822`)
- Low tier: `.cache/golden/2026-10-09-134332/beebe-vent-field-3.png`

## Gates

PW_PORT=4890 tools/gates.sh: see final run result in the commit message / report.

## Weaknesses

- Rocks are faceted but still low-poly; at closest range edges read as hard polygons.
- A few small pale rocks remain; they come from the biome scatter and the habitat chunks, not the apron rubble.
- Feathering is geometric only (the apron uses the terrain shader, so there is no colour blend); the edge now reads soft from the cockpit camera but was not checked from a high overhead view.
- Triangle count rises on high (about +4,200 for the chimney-1 budget).
