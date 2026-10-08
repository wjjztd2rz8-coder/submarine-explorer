# 810 — Monterey terrain fidelity prototype

Date: 2026-10-06 (local). Baseline: `355d8e85de801eaf3f079efb1ac220a9a7b1e90c`.

Implementation and headless checks are complete. The orchestrator's external
full E2E run passed 421 tests, skipped 34, and found one Medium scarp frame over
budget (1,027,690 triangles versus the strict 900,000 limit); project-base passed.
The corrective pass below reduces that view's CPU geometry cost and leaves every
existing assertion intact. **The corrected rendered frame awaits external rerun.**
This sandbox still refuses localhost listeners and Chromium startup. No local
before/after golden PNGs were produced, and no documentary-realism score is assigned.

## What changed

- Monterey-only `terrain.fidelity` profile in `src/core/config/terrain.ts`.
  Four 64-cell chunks touching the opening canyon are split into 16-cell patches.
  Of the resulting 190 chunks, 26 get local subdivisions: **4 on Medium, 8 on
  High/Ultra**. The other 164 retain subdivision 2. Low retains its original 130
  chunks at subdivision 1. Refinement is focused at the canyon ledge, radius
  1,400 m with 450 m fade. High spacing there is about 6.1 × 7.6 m instead of
  24.5 × 30.6 m. Local upgrades budget actual vertices, including skirts/seams.
- Shape-preserving cubic survey reconstruction on Monterey's Medium+ surface:
  survey knots stay fixed, interpolation introduces no extrema between samples,
  and source-cell slope breaks soften. The existing broad detail stays; a bounded
  1.2 m erosion layer adds dipping beds/rills on slopes and fades outside the
  opening canyon. Survey-only `sampleDataHeight` and the detail-off toggle retain
  their old values.
- Mixed-density chunks evaluate derivative normals and cavity with a common
  **world-position-dependent** spacing. It transitions to the coarse spacing
  outside the detail envelope, allowing cached neighbour heights to be reused.
  Near LOD strides yield 4/2/1 or 8/2/1 subdivisions; perimeter skirts remain.
  Profile LOD distance now uses a chunk's axis-aligned bounds, including its skirt,
  rather than the oversized sphere; frustum culling continues to use the sphere.
- Filtered fine grain/lamination normals on Monterey terrain and reconstructed
  walls, with no new texture fetches or draws. Normals lie in the surface tangent
  plane, filter frequencies below a pixel, and fade over 45–160 m. Existing CC0
  triplanar terrain textures are unchanged.
- The visible canyon banks are separate `canyon-ledge` props, **not the GMRT
  heightfield**. Their old caps were 220 × 150 segments. New caps are 230 × 150
  on Medium, 520 × 280 on High, 640 × 320 on Ultra; Low is unchanged. Rounded bed
  returns, resolution-filtered gully octaves and smaller geometric grain avoid
  aliasing sharp displacement into facets. Medium+ bed contrast drops from 2.8
  to 1.5; the existing rock/life lighting is retained. These props still use
  their existing procedural colour/detail material, with the new normal layer.
- `sampleHeight` on this profile resolves the actual near triangle, so collision,
  prop aprons and snapped scan targets use the new rendered surface. Wall life
  checks the frontmost triangle, including back-facing triangles that can hide
  another face, plus the actual triangulated apron. An O(1) apron sampler and a
  bounded candidate grid keep placement work manageable without reducing colony
  counts. The shared wall-face visibility correction also excludes buried Low
  candidates; Low's mesh/material/count budgets are unchanged.

Other sites retain their terrain buffers/shading and scarp presets. A regression
test compares Low Monterey and non-Monterey terrain buffers byte-for-byte with
the profile disabled. No other site's appearance was intentionally changed.

## Counts per tier

Raw evidence: [F-FIDELITY-810-geometry.json](F-FIDELITY-810-geometry.json).
Reproduce with `node tools/terrain-fidelity.mjs <output.json>`.

These are **CPU geometry/frustum counts**, using real bathymetry, real placed
props, composed Arcade spawn, and CameraRig at DPR 1. Opening pose is recomputed
against each surface (small height/footprint differences are in the JSON).
They exclude the submarine, free-swimming life, scatter, particles and post
passes, and are **not renderer.info or measured GPU/frame-time results**.

Resident terrain triangles include skirts at LOD 0; resident vertices include
skirts and duplicated boundaries. The ceiling remains 4,000,000 vertices.

| Tier   | Near subdivision before → after | Resident vertices before → after | Resident triangles before → after | Terrain chunks before → after |
| ------ | ------------------------------- | -------------------------------: | --------------------------------: | ----------------------------: |
| Low    | 1 → 1                           |                571,766 → 571,766 |             1,109,290 → 1,109,290 |                     130 → 130 |
| Medium | 2 → 4                           |            2,186,288 → 2,280,668 |             4,305,392 → 4,484,080 |                     130 → 190 |
| High   | 2 (capped from 3) → 8 locally   |            2,186,288 → 2,610,140 |             4,305,392 → 5,136,368 |                     130 → 190 |
| Ultra  | 2 (capped from 3) → 8 locally   |            2,186,288 → 2,610,140 |             4,305,392 → 5,136,368 |                     130 → 190 |

Opening terrain + prop totals:

| Layout             | Tier   | Draws before → after | Triangles before → after |
| ------------------ | ------ | -------------------: | -----------------------: |
| Desktop 1600 × 900 | Low    |              68 → 68 |        328,450 → 328,450 |
| Desktop 1600 × 900 | Medium |              80 → 92 |        655,082 → 683,934 |
| Desktop 1600 × 900 | High   |              80 → 92 |      841,382 → 1,961,742 |
| Desktop 1600 × 900 | Ultra  |              80 → 92 |    1,141,894 → 2,702,534 |
| Portrait 390 × 844 | Low    |              53 → 53 |        317,294 → 317,294 |
| Portrait 390 × 844 | Medium |              65 → 73 |        589,442 → 623,030 |
| Portrait 390 × 844 | High   |              65 → 73 |      762,942 → 1,779,622 |
| Portrait 390 × 844 | Ultra  |              65 → 73 |    1,063,454 → 2,520,414 |

Desktop terrain alone: Low 40 draws / 44,948 triangles unchanged; Medium
40 / 205,416 → 52 / 186,472; High/Ultra 40 / 262,504 → 52 / 579,944.
Props retain 28 draws on Low and 40 on Medium+, with triangles growing from
449,666 → 497,462 (Medium), 578,878 → 1,381,798 (High), and
879,390 → 2,122,590 (Ultra). Most of the added High/Ultra work is the visible
wall geometry; judge that cost against the screenshots before rollout.

## Three iterations and what worked

1. **Find both meshes.** Increasing whole-tile subdivisions alone misses the
   reconstructed banks and hits the 4M vertex cap. Local budgets plus separate
   canyon wall caps concentrate detail where the player sees it.
2. **Keep the field continuous and the noise resolvable.** Smooth survey
   interpolation, rounded bed returns, filtered gully octaves and fine shader
   normals address different scales. Splitting every survey chunk initially
   raised desktop terrain draws to 511; splitting only the four nearby parents
   brought that to 52. Reusing derivative samples outside the focus avoids
   paying four new height evaluations for every distant vertex.
3. **Raycast the final surfaces.** Denser walls exposed a buried coral seat and
   a face hidden by a folded terrace. Actual frontmost wall/apron triangle checks
   fixed both while keeping colony counts. Raycast checks now cover snapped
   scan targets at all Medium+ tiers and mixed-density seams. The visual effect
   of the new shading still needs browser review.

## Validation

- Build/typecheck pass. Read-only `node_modules` requires a locally bundled Vite
  config with native loading; `tools/golden.sh` now supports this via
  `GATES_CONFIG_MODE=writable`, matching the gates workaround.
- **138 unit files / 1,429 tests pass**, including existing static perf-budget
  guards, hero spawn/scan integrity and wall-life attachment/count guards at all
  four tiers. Six new tests cover local allocation, seams/normals/cavity, valid
  LOD indices, triangle sampling, unchanged sites, monotone interpolation,
  independently raycast apron sampling, and composed shader hooks.
- **144 Python tests pass**; strict content validation, attribution and formatting
  of changed files pass. No new external assets or dependencies.
- The orchestrator's original external full E2E: **421 passed, 34 skipped, one
  failed**; project-base passed. The sole failure was Medium Monterey's scarp
  frame budget; the Low frame budgets and other browser assertions passed.
  Local Chromium remains unavailable, so the corrected branch needs an external
  rerun. The E2E assertion remains `perf.triangles < 900_000`.

## External gate correction

The opening census excluded the submarine, swimming life, scatter and effects;
it also missed the scarp inspection camera, which can see all four banks at once.
The failing cockpit pose has 834,366 terrain/prop triangles in the original CPU
census, versus the external render's 1,027,690: about 193k additional triangles.
Medium wall caps of 300 × 170 left insufficient room for that normal scene work.

Two rendering changes fix the allocation. Monterey's spherical survey bounds
kept a distant patch at LOD 0 even when its actual bounds were beyond the near
distance; using the bounds lowers cockpit terrain cost from 223,104 to 185,216.
Medium wall caps are now 230 × 150, retaining the original 150-row bank resolution
and a denser hero face (230 × 150 versus the original 123 × 123). Medium terrain
still has four local subdivisions and the erosion/normal layers. High/Ultra wall
caps, Low budgets, and other sites are unchanged.

| Medium inspection pose    | Terrain + props before fix | Terrain + props after fix |
| ------------------------- | -------------------------: | ------------------------: |
| Wide                      |                    821,774 |                   682,886 |
| Toe                       |                    820,926 |                   682,678 |
| Oblique                   |                    786,238 |                   672,438 |
| High                      |                    782,654 |                   660,150 |
| Cockpit (failed E2E pose) |                    834,366 |                   682,678 |

Adding the original frame's 193,324-triangle remainder to the corrected cockpit
census projects **876,002** triangles. This is an estimate, not a new browser
measurement. The new `montereyFrameBudget.test.ts` exercises all five inspection
views and ±2 m vertical drift, reserving **200,000 triangles** for the rest of the
frame under the same 900,000 total budget. It fails with the original geometry
allocation. Full geometry evidence retains the pre-fix records alongside current
records and the orchestrator's failure. No existing test assertion was changed.

Validation logs: `.cache/fidelity-810/fix-unit.log`, `fix-build.log`,
`fix-python.log`; the census tool now includes Medium scarp views and accepts
`FIDELITY_TIERS=medium` for a focused run. The orchestrator should rerun the
unchanged `f-geo-scarp.spec.ts` and the full gates outside the sandbox.

## Golden handoff for Claude

`tools/monterey-poses.json` fixes the wall approach/close framing, so changes in
geometry or colony density no longer choose a different camera patch. The
geometry evidence contains collision-checked High desktop/portrait sub and
camera poses for shots 2–3. Shot 1 remains the real composed opening.
Portrait uses 390 × 844 and touch controls; desktop uses 1600 × 900. Both use
High, life seed 42, dynamic resolution off, and wait for terrain textures.

The exact requested command is supported, including the `monterey` alias:

```bash
GATES_CONFIG_MODE=writable GOLDEN_SITES=monterey GOLDEN_LAYOUTS=desktop,portrait tools/golden.sh
```

It built successfully but failed to listen on 127.0.0.1:4298. A direct capture
attempt also failed to launch Chromium. Failure manifest with both planned
layouts/poses: `.cache/golden/2026-10-07-025439/poses.json`; logs:
`.cache/fidelity-810/golden.log`, `chromium.log`, `e2e.log`.

For a true matched baseline, serve the baseline commit on an unrestricted host
and run **this branch's capture script** against that URL (the old script has
neither these fixed poses nor portrait support). Then serve this branch and run
the same script again. A baseline bundle is left in `dist-810-before/` and the
passing after bundle in `dist-810/`; the initial baseline build emitted the
bundle but failed its PWA stamping hook, so rebuild the baseline with native
config loading for a clean browser comparison.

```bash
# With baseline and after previews already running on separate ports:
GOLDEN_SITES=monterey GOLDEN_LAYOUTS=desktop,portrait node tools/golden-shots.mjs --base-url http://127.0.0.1:4310/
GOLDEN_SITES=monterey GOLDEN_LAYOUTS=desktop,portrait node tools/golden-shots.mjs --base-url http://127.0.0.1:4311/
PERF_SITES=monterey-canyon PERF_TIERS=low,medium,high,ultra node tools/perf-budget.mjs http://127.0.0.1:4311/ .cache/fidelity-810/rendered-after
```

Compare all six images, inspect bed/rill shading and ledge silhouettes, confirm
fans/sponges meet rock and the apron, then run the full E2E suite and record
actual per-tier renderer counts. High/Ultra geometry cost is a particular review
point; no screenshot-derived beauty score is assigned here.

## Recipe for the other sites

1. Capture baseline desktop/portrait shots and all-tier rendered perf. Identify
   whether the problem geometry is survey terrain, reconstructed props, or both.
2. Add one site profile centered on its playable hero. Keep Low at existing cost,
   use small near patches and existing large far chunks, and choose power-of-two
   subdivisions compatible with LOD indices. Verify actual resident allocation.
3. Use shape-preserving survey interpolation where source knots read as facets;
   add small slope-masked, faded relief through the common height function.
   Keep sub-vertex detail in filtered normal shading. Retune geology to the site,
   rather than copying Monterey's mudstone beds to vents or wreck fields.
4. Use world-position derivative spacing across every density boundary. Test
   seams, cavity, skirts and all LOD buffers, then raycast prop seats/scan targets
   against the finished near surface. For vertical props, seat colonies against
   actual mesh triangles and any terrain-following apron.
5. Compare the same poses, run geometry budgets and full browser guards, measure
   all tiers, and document the visual result and added cost before enabling the
   profile. Do not change shared default shading for unreviewed sites.
