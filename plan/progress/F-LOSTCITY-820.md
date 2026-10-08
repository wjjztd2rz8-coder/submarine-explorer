# F-LOSTCITY-820 — close-up carbonate texture

Implementation changed and verified headlessly. **Rendered acceptance and the
requested before/after PNGs remain blocked by the execution environment.**

## Plan

1. Capture the unchanged Lost City golden poses 1–3 before editing.
2. Replace the carbonate tower/chimney UV flow map with a Lost City-only
   world-space triplanar material using the shipped carbonate albedo and packed
   normal/roughness maps. Add close-range, filtered procedural pore normals;
   compile them out on Low. Preserve F-600 vertex beds and silhouette lighting.
3. Add a Lost City-only flange with more radial samples, a rounded thin lens
   profile and deterministic rim irregularity; retain the shared smoker primitive.
4. Verify geometry, material variants, F-600 life/bands and other-site isolation.
   Run three full gate rounds and attempt matching after golden captures.
5. Record actual results, screenshot evidence or capture blockers, and CHANGELOG.

## Progress

- Located `buildCarbonateTower` / `buildCarbonateChimney` in
  `src/world/props/geo/towers.ts`: both previously used `projectUVs(geom, 5)` and the canvas
  flow map/bump. Shared `spire.ts` flange has eight profile points and 26–42
  radial segments. Only Lost City content uses carbonate towers/chimneys.
- Built the baseline before editing, then attempted the repository golden capture.
  In-app browser discovery also returned no connected browsers.
- Implemented and tested the surface and geometry changes below. CHANGELOG updated.

## Implementation

- `src/world/LostCityCarbonate.ts`: `MeshStandardMaterial` with world position
  passed from `modelMatrix`, fourth-power triplanar weights from the geometric
  world normal, and metre-scaled samples of the existing `carbonate_a.jpg` and
  `carbonate_n.jpg`. Normal RG and roughness B use the same packed convention
  and projection axes as `TerrainMaterial`; the normal is projected into the
  surface tangent plane and respects double-sided flange undersides.
- Remove `projectUVs`, the canvas flow map and its UV bump path from carbonate
  towers/chimneys. Albedo repeats every 2.4 m with restrained contrast and a
  distance mip bias. Keep the original mean rock albedo, ivory/cream vertex
  palette and cool emissive lift. All F-600 `lostCityBedTint` calls, terrain
  banding, colony placement and life batches remain in place.
- Medium/High/Ultra sample carbonate normal detail, fading from 5 to 65 m.
  Analytic 3D pore gradients use a 6.5 cm base scale and a finer second octave,
  fade from 3 to 18 m, and suppress subpixel detail using pixel derivatives.
  Low compiles out both normal paths and loads only albedo. Reference-counted
  maps are shared across the field, bind only after loading, fall back neutrally
  on failure, and release on the last material disposal.
- `src/world/LostCityFlange.ts`: 28/56/72/96 radial segments for
  Low/Medium/High/Ultra, with 19 profile points on Low and 41 otherwise.
  Thin upper/lower lens surfaces join at a sampled half-ellipse lip. Thickness
  is capped independently of overhang; seeded scalloping and small grain warp
  the rim. Angular-index taper works across the 2π seam. Carbonate columns
  also opt into the existing spire's knobbly radius noise at strength 0.035.
- Scope: only the carbonate builder imports these two new modules. Shared
  `spire.ts`, `materials.ts`, terrain shaders/material, other-site data, camera,
  lighting, plume settings and global quality configuration are unchanged.

## Verification

- **81 focused unit checks pass**: seven new surface tests plus existing Lost
  City biome/bands/base-life, geology, hero integrity and readability checks.
  New checks cover UV-free coloured geometry; tier-specific image requests;
  neutral/error/loading/disposal behavior; field-wide map reuse; shader/glow
  composition; finite unit flange normals, taper across the angular seam,
  reduced thickness, deterministic geometry and Low's triangle savings.
- **All four actual Three `WebGLProgram` shader variants compiled and linked**
  with Mesa's surfaceless GLES compiler. This uses Three's own include expansion,
  light loop unrolling and GLSL ES 3.0 prefixes, with directional light,
  spotlight, exponential fog, ACES, vertex colour and double-sided shading.
  It validates shader compilation, not rendered appearance. Sources, temporary
  exporter/compiler and results: `.cache/lost-city-820/`, including
  `shader-compile.log`.
- Three requested full gate rounds use `tools/gates.sh --full-e2e` with
  `GATES_CONFIG_MODE=writable`, `PW_PORT=4282`, `PW_OUTDIR=dist-lostcity-820`
  and `FULL_E2E=1`.
  All three rounds pass build/typecheck, **1,429 unit tests / 137 files**, **144 Python
  tests**, strict content validation, attribution and repository formatting.
  Full E2E and project-base E2E cannot start the preview server. Each round's
  detailed logs are preserved in `.cache/lost-city-820/roundN/` with summary
  `.cache/lost-city-820/roundN.log`.
- An earlier development gate caught an incomplete test-hook type in the new
  test; it was corrected before these final rounds. That run is retained as
  `round0.log` / `round0/`.

### Geometry budget

Headless comparison against baseline `355d8e85`'s builder, identical flat-ground
100 × 100 × 60 m Poseidon fixture and seed 820; rock triangles only:

| Tier   | Before |   After | Mesh draws including base life |
| ------ | -----: | ------: | -----------------------------: |
| Low    | 15,440 |  28,964 |                          3 → 3 |
| Medium | 30,524 | 116,078 |                          3 → 3 |
| High   | 43,136 | 154,688 |                          3 → 3 |
| Ultra  | 64,950 | 215,058 |                          3 → 3 |

The added triangles smooth the flange outline and lip; no extra material draw
is introduced. Low rock uses 19% of High's triangles. This fixture does not
replace the scene-wide rendered `f-perf-budget` measurement. Comparison output
is `.cache/lost-city-820/geometry-budget.log`.

## Golden captures / visual QA

Both attempts target the unchanged `lost-city-1..3` poses with
`GOLDEN_SITES=lost-city node tools/golden-shots.mjs --base-url http://127.0.0.1:4282/`:

- Before: [failure manifest](../../.cache/golden/2026-10-07-024230/poses.json).
  Baseline build passed; build/preview/capture logs are in
  `.cache/lost-city-820/before/`. The unmodified bundle is retained locally as
  `dist-lostcity-820-before`.
- After: [failure manifest](../../.cache/golden/2026-10-07-024905/poses.json).
  Final build is retained locally as `dist-lostcity-820`; logs are
  `after-preview.log` and `after-golden.log` in `.cache/lost-city-820/`.
- **Neither attempt produced any PNGs.** Preview startup fails with
  `listen EPERM 127.0.0.1:4282`; Chromium launch fails in
  `sandbox_host_linux.cc:41` with `shutdown: Operation not permitted`.
  The Browser skill's runtime returned no available browser connections.
  No claim of visual acceptance, before/after appearance or measured frame
  performance is made from empty contact sheets or shader compilation.

On a browser-capable host, serve the preserved baseline and final bundles in
turn, run the command above against each, and compare all three poses. Inspect
Beehive in pose 2 for isotropic pores and rounded delicate lips, pose 1 for
the unchanged broad beds/base life, and pose 3 for restrained distant detail.
Also run full E2E and project-base gates, including `f-lostcity-readable` and
`f-perf-budget`, and check Low/Medium close views. These are the remaining
rendered acceptance steps.
