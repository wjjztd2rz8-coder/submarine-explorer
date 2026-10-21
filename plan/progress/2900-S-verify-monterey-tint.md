# S-verify — Monterey tint data-flow audit

Backlog item **9, S-verify / S-bughunt [Codex, standing]**, specifically
**S-verify**. Non-visual verification of run 75; V-monterey-cliff stays DONE.

## Provenance and ownership

- Merge: `f827eba0da2b6623a5a199b40922507579ccd641`.
- Actual first parent: `fcc078dcfbbb284e0bded6cc615692a238564cbf`.
- Checkout: `c085c7d485e071f6d57f524ab1d29705f72a64db`; the only commit
  after the merge updates Director status and the run 75 log.
- Read current Director rules/rubric, newest review (2026-10-21), overnight
  run 75, V-monterey-cliff evidence, queue/launched briefs and available
  results/progress. Earlier Monterey fidelity and 2790 evidence predate this tint.
- Rechecked all registered worktrees before editing. Main has a Director
  status edit for IN FLIGHT V-bluehole-roof-3; that worktree has no current
  diff. Completed 2850/2860/2870 retain source/test changes and each also
  formats V-monterey-cliff.md; their wrapper results report external passes,
  with browser limits explained in their notes. 2880 has pending
  shell/Journal/SubScreen and capability changes. These files and notes,
  including V-monterey-cliff.md, are untouched here. 2890 owns height/memo
  tests; queued 2910 owns scatter tests. Neither overlaps these two specs.

## Merge and contract

The exact merge range adds MontereyBands.ts, imports/registers
`montereySlopeTint` in Monterey's existing `vertexTint` field, adds only a
Monterey color digest to the Low and High beebeIsolation snapshots, and
switches lostCityBiome's uncolored control to Hudson. Its color loop still
checked only Lost City. Both snapshots remain untouched.

Terrain bakes the hook after chunk construction into one Float32 RGB tuple
per stored position, including skirts. It passes stored X/Z, stored Y divided
by vertical exaggeration, and stored normal Y. LOD switches reuse that color
attribute; material.vertexColors is true and fragment strata strength is zero.

Installed Three **0.186.0** contracts were read locally:
`src/core/BufferAttribute.js`, `src/materials/Material.js`, WebGLPrograms and
color shader chunks. Float32 RGB is unnormalized, itemSize 3, with count equal
to array length / 3. The standard shader multiplies diffuse color by vertex
color. The biome hook explicitly supplies linear multipliers: values above 1
are valid. No display-RGB ceiling, beauty threshold or level-silt RGB invariant
was introduced. LostCityBands.ts is unchanged across parent, merge and
checkout (git blob `4b410d67536942e63c5a7bc7ee36009d8cd064b1`).

## Property matrix and coverage

| Property                                    | Headless evidence                                                                                                                                                                                     |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deterministic finite nonnegative RGB tuples | 448 direct samples: 4 X × 4 Z × 4 depth × 7 slope angles; repeat equality and finite Float32 conversion                                                                                               |
| Shipped numeric domain                      | Survey extent from 820 × 638 metadata, X approximately ±20,058 m, Z ±19,477 m; depths −2332.81, −800, 0, +265.41 m; 0/4/15/30/70/89/90° normals                                                       |
| Low / Medium / High wiring                  | Existing 65 × 65 synthetic terrain fixture, each tier with detail on, detail off with exaggeration 2, and budget fallback                                                                             |
| Buffer contract                             | Every actual vertex including skirts: Float32 itemSize 3, unnormalized, finite nonnegative channels, exact Float32 hook output using actual position/depth/normal                                     |
| Material and fallback                       | vertexColors true, strata strength zero, Node neutral texture placeholders settled; standard shader source retains color includes and tier normal-map defines                                         |
| Shared seams / LOD                          | Existing seam test expanded to all tiers; >100 shared surface samples per tier, existing height/normal/cavity guards preserved, colors agree within 1e−5; all three LODs retain the same color buffer |
| Unaffected control                          | Hudson remains without a color attribute and vertexColors false; Lost City assertions retained                                                                                                        |

Existing Monterey tests already cover mixed-density height/normal/cavity seams,
index validity, CPU triangle/collision agreement, Low/other-site geometry
isolation and pure-data sampling. Existing material-readiness tests cover
successful and failed asynchronous map loads. Added guards target the missing
Monterey tint path; no formulas are copied as an independent numeric oracle.
Hook equality establishes transport/wiring, while finite/tuple/seam properties
and actual merge comparisons establish separate structural evidence.

## Actual merge comparison and result

**Clean numeric/data-flow result; no production defect reproduced.** A temporary
CPU harness archives the exact parent and merge source plus site manifests,
uses Vite's SSR transforms for the existing raw GLSL/glob imports, and constructs
the complete shipped Monterey survey with unmodified default terrain settings.
It never constructs a renderer. Evidence and harness:
`/tmp/2900-tint-audit/{parent,merge}/evidence.json` and
`/tmp/2900-tint-audit/audit-entry.ts`; run logs `/tmp/2900-parent.log` and
`/tmp/2900-merge.log`. The comparison assertions passed and are summarized in
`/tmp/2900-compare.log`.

| Tier   | Chunk meshes, parent = merge | Actual resident vertices, parent = merge | LOD-0 triangles incl. skirts, parent = merge | New RGB bytes | Observed color channel range |
| ------ | ---------------------------: | ---------------------------------------: | -------------------------------------------: | ------------: | ---------------------------- |
| Low    |                          130 |                                  571,766 |                                    1,109,290 |     6,861,192 | 0.419348–1.060000            |
| Medium |                          190 |                                2,280,668 |                                    4,484,080 |    27,368,016 | 0.418579–1.060000            |
| High   |                          190 |                                2,610,140 |                                    5,136,368 |    31,321,680 | 0.415264–1.060000            |

Every parent position/normal/aCavity buffer and all three per-chunk LOD index
buffers have identical SHA-256 digests after the merge. All TerrainStats,
per-LOD triangle counts and chunk mesh counts are identical. All 36 sampled
height/data-height/normal tuples per tier are exactly equal, covering tile
boundaries and interior coordinates. All complete-survey color attributes are
finite, nonnegative, unnormalized Float32 triples with one tuple per actual
vertex. The parent has none. The material flag changes false → true; strata
strength is zero, and composed shader-source digests remain equal (Three's
vertex-color defines are selected by the changed material flag).

The no-tint Hudson synthetic control is identical across both revisions at all
three tiers, including geometry/index digests, stats, collision/normal samples
and material.vertexColors false. Snapshot diff inspection and the unchanged
beebeIsolation spec confirm the two added digests are confined to Monterey;
no snapshot was regenerated.

These are resident/all-chunks LOD-0 counts, not measured per-frame draws.
One mesh/material group per chunk means no additional terrain draws; all
vertices remain below the existing 4,000,000 default limit. RGB costs exactly
12 additional bytes per vertex: **6.54 / 26.10 / 29.87 MiB** on Low/Medium/High.
Thus unchanged geometry/draw budgets do not mean zero extra buffer memory.
These byte lengths describe retained CPU attribute payloads; GPU allocation,
upload cost and phone frame time were not measured. No new memory limit is
invented. The flat-input output also includes authored multipliers above 1;
this is valid for the hook and does not turn the visual note's silt prose into
an identity-RGB requirement.

## Simplicity and limits

Only the two existing capability specs and this note change. No production
fix was needed. No settings, guidance, UI, site branch,
layout patch, config mutation, dependency, snapshot update or budget increase.
GMRT data and all protected gameplay surfaces remain untouched; Arcade stays
the default. The rubric is applied to numerical correctness, simple behavior
and CPU resource counts only.

Actual e2e mode: **none**. No browser, renderer, GPU shader compilation,
screenshots, appearance judgement, opening/readability acceptance or real-phone
frame-time/visual acceptance is established by this audit.

## Validation

- Initial focused headless run: **PASS, 4 files / 81 tests** (lostCityBiome,
  montereyFidelity, beebeIsolation, terrain-detail), 24.32 seconds.
- Baseline readiness-focused run: **PASS, 4 files / 28 tests**,
  `/tmp/2900-baseline-focused.log`.
- After extensions: **PASS, 4 files / 34 tests**, 7.79 seconds,
  `/tmp/2900-focused.log` (lostCityBiome, montereyFidelity,
  beebeIsolation, terrainMaterialReady; no snapshot writes).
- TypeScript: **PASS**, `/tmp/2900-typecheck.log`.
- Final focused command:
  `npm test -- --configLoader runner --cache=false tests/unit/lostCityBiome.test.ts tests/unit/montereyFidelity.test.ts tests/unit/beebeIsolation.test.ts tests/unit/terrainMaterialReady.test.ts`.
- Required aggregate invocation:
  `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`;
  `/tmp/2900-gates.log`, `.cache/runs/20261020-230720-28-MU0YdF/`.
  The existing writable-config mode handles the shared read-only dependencies;
  no runner, tool, timeout or assertion was changed.
- Config preparation, content validation and production build: **PASS**.
- Python: **FAIL, 5 failures / 167 tests**, exit 1. Four unchanged
  CI-build-manifest fixtures fail with `spawnSync git EPERM`; the unchanged
  golden-manifest tooling subprocess test fails with `Unexpected end of JSON input`.
  The four permission errors reproduce the recorded sandbox environment block;
  the fifth is recorded as a tooling failure without claiming its cause was
  established here. No tool repairs or retries.
- Full unit gate: **PASS, 192 files / 3,371 tests**, 530.72 seconds;
  `unit.log` in the aggregate run directory. The runner was quiet until its
  completed summary; it was not interrupted and no test timeout was changed.
- Attribution: **PASS, 14 assets**. Repository-wide Prettier: **PASS**.
- Aggregate result: **FAIL, exit 1, e2e=none**, solely the five Python
  tooling failures above. No browser assertions ran; none were requested.
  Stop at the reproduced permission block: no tool changes or gate retries.
- Owned-file Prettier and `git diff --check`: **PASS**.
