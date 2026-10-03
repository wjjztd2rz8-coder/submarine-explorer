# F-TITLE-B progress

Built `src/render/title/TitleTerrain.ts` (2,400 m Monterey crop, 160x160 cells, ~51k tris) and `tests/unit/titleTerrain.test.ts`.

Deviation: no standalone bilinear helper exists (only `Terrain.sampleDataHeight`, which needs a full Terrain), so a small private sampler mirrors its convention; geo conversion reuses `latLonToWorld`.

Proposed CHANGELOG entry:

- Title scene: fixed Monterey Canyon GMRT terrain crop (`TitleTerrain`) at real scale, rebased to the upper-channel anchor.
