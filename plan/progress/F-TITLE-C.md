# F-TITLE-C progress: Bathyline title scene shot

Status 2026-10-03: done, pending coordinator review.

## Built

- `src/render/title/TitleScene.ts`: scene, single perspective camera (FOV 42, near 1, far 3000), class B vehicle via `buildVehicle('B', tier)`, two spot lamps, cool hemispheric fill plus rim, exp2 depth fog, navy `#06131F` fallback, own snow Points (Low 200, Medium+ 600), 40 s closed-loop sway, clearance enforcement (>= 12 m over floor sampled around camera and vehicle), dt clamp (0.1 s), 30 fps draw cap, dirty-only static drawing, per-layout framing via view offset.
- `tests/unit/titleScene.test.ts`: 18 tests (budgets, clearance with ridge fixtures, sway limits and loop, reduced motion transforms, framing, scissor restore, dirty and fps logic with a fake renderer, dispose, stale setCrop).
- `TitleCropInput` is defined locally (type-only compatible with package B).

## Deviations and notes for the bridge (package E)

- Crop ownership transfers on `setCrop`: the scene calls `crop.dispose()` on replace, null, scene dispose, and immediately for a crop arriving after dispose.
- `resize(w, h, layout)`: w,h are the full canvas CSS size. Portrait renders into a scissored top hero band (`clamp(128, 22% h, 190)`), short-landscape into the left 42%; `draw` sets viewport/scissor for those and restores them. Outside the region is not cleared (bridge clears to navy).
- Portrait and short-landscape apply camera zoom (1..3) to hold the silhouette on narrow bands; desktop zoom stays 1. FOV stays 42.
- Reduced motion hides the snow points (spec section 8 says particles disappear) and freezes camera, hover and vehicle.
- Own snow points instead of MarineSnow (that class needs Atmosphere config/samples); no edits to Atmosphere/MarineSnow/Headlights.
- Extra public members: `scene`, `camera`, `TITLE_SHOT`, `regionFor`. Draw cadence uses accumulated `update(dt)`, no wall clock.
- Not visually verified in a browser (no GL in unit tests); lamp intensity and fog density are first-pass numbers to tune at integration.

## Proposed CHANGELOG entry

- F-TITLE-C: Bathyline title scene shot (`src/render/title/TitleScene.ts`): research sub beside a canyon crop with lamps, fog, marine snow, 40 s sway, reduced-motion stillness, per-layout framing and a 30 fps / dirty-only draw policy.
