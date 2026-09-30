# F1-GEO: geology and biology set pieces

Status: done for wave 1 (see "Known issues" for the visual polish that remains).

## Done

- New prop kind `procedural:geo` with a props.json `feature` (also accepted on
  `procedural:chimney`, so the vent preset still smokes and lights vent pieces).
  Kit in `src/world/props/geo/`: tier table (`detail.ts`), tileable canvas detail
  textures (`textures.ts`), materials (`materials.ts`), shader-animated plumes
  (`plume.ts`), helpers (`shared.ts`) and a builder per feature.
- Features: `smoker-cluster` (Axial ASHES, Beebe with shrimp variant),
  `carbonate-tower` (Lost City Poseidon), `coral-mound` (Blake Plateau, Hudson
  Canyon), `stalactite-cluster` (Great Blue Hole, on the western drop-off),
  `pillow-field` (Kamaehuakanaloa), `tuff-cliff` (Hunga Tonga rim), `canyon-ledge`
  (Monterey wall), `hadal-scarp` (Challenger Deep north wall). One hero per
  non-wreck site, each with compound colliders and a box impostor.
- Existing chimneys get a rock / flowstone detail texture (`buildPlacedChimney`).
- Set pieces conform to the terrain: `Props.followsTerrain` (features and debris)
  places them on the centre sample and `groundHeight()` lifts mounds, skirts and
  wall toes onto the slope, so nothing is buried on the 50-60 m terrain cells.
- Journal: one sentence plus a `reconstruction: true` tag on one entry per site
  that gained a hero (Axial, Kama, Great Blue Hole, Hunga Tonga, Challenger,
  Monterey, Hudson, Blake, Beebe), as the plan asks.
- Tests: `tests/unit/props-geo.test.ts`, `tools/tests/test_validate_props.py`.
  Docs: `docs/props.md`. Dev preview: `/preview/geo.html`.

## Budget (thousand triangles / draw calls, near LOD, per tier low, medium, high, ultra)

| feature            | low   | medium | high   | ultra  |
| ------------------ | ----- | ------ | ------ | ------ |
| smoker-cluster     | 8k/3  | 16k/3  | 25k/3  | 40k/3  |
| carbonate-tower    | 6k/1  | 10k/1  | 13k/1  | 22k/1  |
| coral-mound        | 17k/5 | 97k/5  | 159k/5 | 189k/5 |
| stalactite-cluster | 5k/3  | 12k/3  | 20k/3  | 39k/3  |
| pillow-field       | 16k/2 | 50k/2  | 63k/2  | 156k/2 |
| tuff-cliff         | 2k/1  | 17k/4  | 27k/4  | 71k/4  |
| canyon-ledge       | 1k/1  | 11k/4  | 17k/4  | 45k/4  |
| hadal-scarp        | 3k/1  | 15k/4  | 24k/4  | 59k/4  |

Only one hero per site is in view at a time. Plumes cost one draw call each and no
per-frame CPU. Build time is under 0.1 s per piece at medium.

## Deferred / known issues

- Cut from the brief: no separate Kamaehuakanaloa lava-tube or Hunga Tonga gas-plume
  effect; Hunga Tonga's wall is a tuff scarp only. No Great Blue Hole shaft (the tile
  cannot resolve it, and the Journal says so).
- Poseidon's smoke, glow and shimmer come from the vent preset (unchanged); on the
  low tier the preset builds no visuals, so only the geometry shows.
- Visual polish left: tower flanges are flat plates; the alcove reads a little boxy
  from the side; strata are colour bands only (the strata bump map aliased, so
  scarps use the rock texture); sponge colours are pastel under the preview light.
- Everything is dark beyond ~50-100 m at the vent sites (atmosphere, not this package), so
  heroes only read inside the sub's lights. Those lights are strong and face-on walls
  receive far more than the seabed, so rock albedo is scaled well down (`ALBEDO` in
  `materials.ts`, 0.07) and instanced life is tinted (`LIFE_TINT`); pale rock clipped to
  white otherwise.
- The chase camera hides the sub's surroundings behind the hull in stills; the
  screenshots hide the hull. No profile on a real phone yet.
- The Kamaehuakanaloa heap sits on a steep slope and reads as a thin ribbon.
- Wall colliders are stepped boxes at the profile's most protruding point; the
  lowered crest at the wall ends still has full-height boxes.

## Screenshots

`.cache/codex/shots/f1-geo/`: `<feature>-<tier>-N.png` are preview views; `game-<site>-N.png`
are in-game views with the hull hidden.
