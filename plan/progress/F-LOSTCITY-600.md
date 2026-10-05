# F-LOSTCITY-600 — banding and Poseidon base life

Director item 3. Implementation complete; rendered acceptance pending a
browser-capable environment. Ambient fill remains **16**.

## Changes

- `src/world/LostCityBands.ts` and the Lost City entry in `TerrainBiome.ts`:
  broad 12.8 m beds, irregular lateral drift, pale resistant layers, cooler
  weathered layers and softened joints. Vertex tint fades in on 4–17° slopes;
  the old fragment bands started at about 28°, hiding gentle slopes. Level
  silt remains unbanded. Tint stays above 0.7 and averages above 0.94 in the
  acceptance sample, avoiding a uniformly darkened floor.
- `Terrain.ts`: a small optional biome hook writes colours into existing
  chunk vertices, shared by every LOD, and disables the old fragment strata
  for that material to avoid multiplying two darkening passes. **Only Lost
  City opts in**; this is the necessary shared terrain connection. Other site
  palettes, shaders and geometry remain unchanged.
- `props/geo/towers.ts` (the Lost City carbonate family): stronger, irregular
  vertex-colour beds on the apron, spires and flanges. Existing material light
  response and vertex glow are unchanged.
- Poseidon alone gets three small clusters on the inactive apron, clear of
  the columns. Existing `branchingColony` and life `buildAnemone` templates
  use subdued ivory/peach colours. Separate seeded randomness preserves the
  tower layout. Roots are ray-seated into the actual rendered rock/rubble
  triangles, then slightly embedded. Low/Medium/High retain both life batches;
  counts scale with the existing growth budget. Added work: **two instanced
  draws**, no new terrain or rock triangles and no new prop entries.
- Mission ambient/fog, camera, HUD and Journal are untouched. No other site's
  carbonate props exist in the current content. CHANGELOG updated.

## Golden capture

Both capture attempts use `GOLDEN_SITES=lost-city bash tools/golden.sh`.

- Before: `.cache/golden/2026-10-04-095158/index.html` and `poses.json`.
  This is an **incomplete failure report, with no PNG captures**.
- After: `.cache/golden/2026-10-04-095827/index.html` and `poses.json`.
  Also an **incomplete failure report, with no PNG captures**. Build/preview
  logs for the before attempt are in `.cache/lost-city-600/before-golden/`;
  after build/preview logs are in `.cache/lost-city-600/after-golden/` and
  the after invocation log is `.cache/lost-city-after-golden.log`.

The default Vite loader first failed writing into the read-only linked
`node_modules/.vite-temp`. The runner loader then hit Vite 8's late PWA
import issue. Following the existing writable gate workflow, a local
Rolldown config bundle plus the native loader built successfully, without
changing tracked tooling. That configuration was passed to the unmodified
golden script through temporary shell functions. Preview then failed with
`listen EPERM 127.0.0.1:4298`; Chromium also failed with
`sandbox_host_linux.cc:41 ... shutdown: Operation not permitted`.

No first-ten-second documentary-look judgment or screenshot comparison can
be claimed from these reports. Before/after PNGs and the actual rendered
`f-perf-budget` totals remain pending. Do not treat empty contact sheets as
golden acceptance.

## Verification

- Initial focused checks: typecheck and 62 existing tests passed (Lost City
  biome, opening readability/camera, terrain detail and geology props).
- New Lost City checks: seven tests passed, covering gentle-slope contrast,
  a minimum/mean colour floor, unbanded flat silt, opt-in site isolation,
  unchanged terrain geometry, exactly two base-life meshes, bounded colony
  counts and triangle-seated roots on sloping ground at Low/Medium/High.
- Full gate round 1: build/typecheck, all **1312 unit tests / 123 files**,
  Python pipeline, strict content validation, attribution and repository-wide
  Prettier all passed. Full E2E and project-base E2E both stopped before tests
  because the preview server could not start. Logs:
  `.cache/lost-city-round1.log` and `.cache/lost-city-600/round1/`.
- Full gate round 2 (`FULL_E2E=1`, `ROUNDS=2`): the same seven static gates
  passed, including **1312 unit tests / 123 files**. Full E2E and project-base
  E2E again stopped before tests because the preview server could not start.
  Logs: `.cache/lost-city-round2.log` and `.cache/lost-city-600/round2/`.

To finish rendered review on a browser-capable host, capture the base revision
and this revision with `GOLDEN_SITES=lost-city tools/golden.sh`, review all three
poses and the first ten seconds at Low/Medium/High, then run the full E2E
suite including `f-lostcity-readable` and `f-perf-budget`. The latter caps Low
at 1500 draws and 1,500,000 triangles; its expected 12 Lost City props are
unchanged.
