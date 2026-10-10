# f-challenger-lander

Challenger Deep lander hero and trench slope (DIRECTOR priority 5, follow-up to f-challenger-seabed).

## Changes

- `src/world/props/geo/lander.ts` (new, feature `benthic-lander`, registered in `features.ts`, `index.ts`, `tools/validate_props.py`, `docs/props.md`): three-legged frame with foot pads, cross braces, top ring, yellow flotation spheres, ballast plate, housings, bait arm with wire cage and mackerel, mast with emissive orange flag and unlit strobe. Frame is one merged vertex-coloured mesh; flag and strobe are one mesh each, so 3 draw calls at every tier (sphere detail and segment counts drop on Low).
- `data/landmarks/challenger-deep/props.json`: `leggo-lander-marker` now `procedural:geo` / `benthic-lander`, 9 x 9 x 12 m (was a 3 m debris pile). Position and Journal facts are unchanged; the note says the shape is generic.
- `src/world/ChallengerRelief.ts` + `TerrainBiome.ts`: `vertexTint` for challenger-deep, brightening and warming up the trench wall, terrace bands bent by a plan-view wobble, darker recesses on steep faces. Flat floor stays close to 1.0. Free: reuses existing terrain vertices.
- `src/core/config/deepOpenings.ts`: opening range 34 -> 30 m (22 and 26 lose the scan candidate in the unit test).
- `tests/unit/props-geo.test.ts`: dims entry for the new feature.

## See it

`GOLDEN_SITES=challenger-deep GOLDEN_LAYOUTS=desktop,portrait tools/golden.sh`; shots in `.cache/codex/shots/f-challenger-lander/`. Capture 1 shows the lander with legs, flag and cage beside the sub; capture 2 is a close hero shot.

## Tiers / performance

Lander: 3 draw calls, a few thousand triangles at most (Low roughly half). Slope relief adds no draw calls.

## Known gaps

- The lander is 9 m, about proportional to the game's exaggerated sub size but larger than a real lander. Real Leggo dimensions are unpublished.
- Capture 1 is still a 40 m chase view: the lander is readable but small; the range could not shrink further without losing the scan candidate. Camera is not mine.
- The wall is still the smooth real GMRT surface; its readability comes from colour only. In capture 1 the far wall is a moderate gain, not dramatic.
