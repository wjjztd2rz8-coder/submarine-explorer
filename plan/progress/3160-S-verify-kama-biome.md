# S-verify — Kamaʻehuakanaloa material integration

DIRECTOR Backlog item **9, S-verify / S-bughunt [Codex, standing]**, specifically
**S-verify**. Audited checkout: **`a545afe00196649a2d6de4cf1c8039851aba9074`**.
Actual merge range:
**`d8bfff30a08c457d04183b86a7ccd0e4944b49ed..022ed26dc87679a03424cdc0f7c8e08a982ec1bd`**.
`022ed26` is a two-parent merge; the first parent is `d8bfff3`, not its topic
parent `33cb2b1`. Material/terrain/scatter production sources are unchanged
between that merge and this checkout.

No material defect reproduced. The authored values reach the CPU material and
its compile-hook uniform bindings on Low, Medium and High. Geometry, collision
samples, scatter placement and allocation counts are unchanged. The only
scatter snapshot change is the intended sediment mound instance color inherited
from the new `colorA`. No baseline was updated.

## Provenance and ownership

Read DIRECTOR rules/rubric, the newest 2026-10-22 review, overnight log through
run 82, `V-eight-sites-lit-a.md`, 3020 terrain-map lifetime evidence, launched
briefs and available result/last reports for 2920 and 3130–3180. Checked
queue/hold and every registered worktree's status/diff before editing, including
finished work awaiting collection. Main and this worktree were clean. No
applicable AGENTS.md was present.

2920's available durable evidence is weaker than its wrapper label: its
`-last.md` is empty, its task log ends with two **model-at-capacity** errors,
and its result wrapper claims smoke/project-base PASS without an agent report.
No matching 2920 progress note is present. Its brief concerns the earlier run
77 palette, predates this merge, and assumes a tint function that Kama does not
have. None of those wrapper labels is treated as this audit's browser evidence.

Unmerged 2980 owns scarp production/collider tests; 3050 owns Terrain seam work.
Finished 3130 changes Terrain/mission/scarp capability tests; 3140 changes
mission composition and DIRECTOR; 3150 changes CI workflows. Their completion
notes were read; none of their changes was imported, collected or repeated.
3170 owns atmosphere checks in `lowSweepReadability.test.ts`; 3180 owns wildlife
Journal checks in `journalData.test.ts`. No claim overlaps the sole test file
owned here, `tests/unit/biomeFloorVariety.test.ts`. The only other owned file
changed is this note. Production, authored data, snapshots, tools, workflows,
DIRECTOR and other packages' notes remain read-only.

DONE V-eight-sites-lit (a), parked Blue Hole work and the opening-rule decision
remain closed/out of scope. This report gives no appearance rating.

## Binding trace and old/new inputs

`Terrain` selects `biomeFor(tile.meta.id)`, which returns the registered biome
object without cloning. Kama spreads VOLCANIC; Axial shares its inherited scatter
array. `createTerrainMaterial` allocates private material/uniform/texture objects,
converts palette hex colors to linear `THREE.Color` values, and injects the same
uniform objects into the standard-material shader in `onBeforeCompile`.
Texture requests are cached **within each construction**, by filename.

Paths below are under `assets/terrain/`, resolved through `publicUrl` and the
existing deployment base. Controlled Image handles completed without image
decoding. The compile hook received a plain standard-shader object and an unused
renderer type placeholder; no renderer was constructed.

| Binding                                       | Actual first parent                            | Current, all three tiers        |
| --------------------------------------------- | ---------------------------------------------- | ------------------------------- |
| A albedo                                      | `basalt_a.jpg`                                 | `silt_a.jpg`                    |
| B albedo                                      | `silt_a.jpg`                                   | `basalt_a.jpg`                  |
| C albedo / scatter rock map                   | `basalt_a.jpg`                                 | `basalt_a.jpg`                  |
| A/B/C normals, Medium and High                | basalt / silt / basalt `_n.jpg`                | silt / basalt / basalt `_n.jpg` |
| Low normals                                   | neutral placeholder; normal shader path absent | same                            |
| Within-owner map sharing                      | A = C                                          | B = C                           |
| `uColA` sRGB input                            | `0x55514e`                                     | `0x8a6b54`                      |
| `uColB` sRGB input                            | `0x6a645c`                                     | `0x7a6a5c`                      |
| `uColC` sRGB input                            | `0x2f2e30`                                     | same                            |
| `uStain` sRGB input                           | `0x8a4a22`                                     | `0x6e3a1c`                      |
| `uStainAmount`                                | 0.20                                           | 0.12                            |
| `uPatch`                                      | 0.45                                           | 0.30                            |
| `uContrast` A/B/C                             | [1.3, 1.9, 1.3]                                | [1.9, 1.3, 1.3]                 |
| Material color / roughness / metalness / side | white / 0.92 / 0 / FrontSide                   | same                            |
| PBR-normal / texture-breakup switches         | off on Low; on on Medium/High                  | same                            |

The contrast change follows `SET_CONTRAST`: silt is 1.9 and basalt 1.3, multiplied
by the unchanged config gain of 1. These are legitimate multipliers above 1;
no blanket [0,1] bound was imposed. Actual linear palette components include:

| Uniform  | Parent linear RGB                          | Current linear RGB                         |
| -------- | ------------------------------------------ | ------------------------------------------ |
| `uColA`  | [0.0908417112, 0.0822827071, 0.0761853815] | [0.2541520943, 0.1470272665, 0.0886555863] |
| `uColB`  | [0.1441284708, 0.1274376804, 0.1070231030] | [0.1946178304, 0.1441284708, 0.1070231030] |
| `uStain` | [0.2541520943, 0.0684781698, 0.0159962934] | [0.1559264637, 0.0423114106, 0.0116122452] |

The new test checks the exact `THREE.Color` conversion, not these rounded display
values. Other uniforms compare equal: ripple 0.1, wavelength 0.45 m, direction
[cos(1.1), sin(1.1)], burrow 0.25, rock bias 0.25, texture/macro scales 3.4/55 m,
normal strength 0.9, fades [30,110]/[22,75]/[14,50] m, slope thresholds
0.04894348370484647/0.15195190384357404, exaggeration 1, disabled depth shade and
strata [0,0], white depth tint and rock-detail strength 0. Kama has no
`vertexTint`, so this change adds no terrain color attribute. Existing geometry
attributes are position, normal and aCavity.

With all requested maps unavailable, readiness settles and all albedo slots keep
the same neutral [128,128,128,255] fallback; all normals keep
[128,128,210,255]. The palette/numeric uniforms still reach the compile bindings;
`rockTexture` resolves null. On success, all albedo handles use sRGB and normal
handles use NoColorSpace; both paths retain the authored palette uniforms. The separate no-document Node path allocates only
the two fallbacks and settles immediately on all three tiers. Existing generic
readiness tests already cover partial failure and delayed disposal; that matrix
was not expanded here.

## Parent/current resources and buffer evidence

Read-only parent modules were extracted with `git archive` into
`/tmp/3160-parent` (src, fixture helper and manifest JSON), using the existing
dependency tree. `/tmp/3160-audit.mjs` loads parent and current modules with Vite
SSR, with HMR/websockets/watching disabled and a writable temporary cache. It
uses the existing `makeSyntheticTile({ id })` fixture and, independently, shipped
GMRT meta/heightmap bytes for Kama, Axial and Titanic. Config, seeds, tier,
exaggeration and options match. Each scatter gets 128 stationary updates at
(32,-85,32); these are resource fixtures, not opening/journey simulations.

`node /tmp/3160-audit.mjs` completed successfully. Raw evidence:
`/tmp/3160-parent-current.json`, `/tmp/3160-deltas.json`, `/tmp/3160-audit.log`.
All fields outside Kama's biome/material inputs compare equal, including both
control sites. All terrain position/normal/aCavity/index bytes and nine
sampleHeight/detailHeight/normal query tuples match parent/current, on each
fixture and tier. Shader-source hashes and program-cache keys match. This is a
bounded collision sampling comparison, not a repeat of 3050's seam audit.

Every number in the following tables is **parent = current**. Terrain bytes
count typed-array payloads across all generated chunks/LODs, including skirts;
scatter geometry and instance buffers are listed separately.

| Kama fixture / tier | Terrain meshes |  Vertices | Triangles | Attribute bytes | Index bytes |
| ------------------- | -------------: | --------: | --------: | --------------: | ----------: |
| Synthetic / Low     |              1 |        76 |       118 |           1,900 |         708 |
| Synthetic / Medium  |              1 |       217 |       376 |           5,425 |       2,256 |
| Synthetic / High    |              1 |       428 |       774 |          10,700 |       4,644 |
| GMRT / Low          |             90 |   348,597 |   674,952 |       8,714,925 |   4,049,712 |
| GMRT / Medium       |             90 | 1,329,012 | 2,614,440 |      33,225,300 |  15,686,640 |
| GMRT / High         |             90 | 2,941,695 | 5,818,464 |      73,542,375 |  34,910,784 |

| Kama fixture / tier | Resident cells | Pillow / boulder / mound instances | Active scatter draws | Constructed geometry / material handles |
| ------------------- | -------------: | ---------------------------------- | -------------------: | --------------------------------------- |
| Synthetic / Low     |              9 | 18 / 5 / 0                         |                    2 | 4 / 3                                   |
| Synthetic / Medium  |             25 | 97 / 16 / 0                        |                    2 | 4 / 3                                   |
| Synthetic / High    |             45 | 403 / 68 / 0                       |                    2 | 4 / 3                                   |
| GMRT / Low          |              9 | 18 / 5 / 0                         |                    2 | 93 / 3                                  |
| GMRT / Medium       |             25 | 97 / 52 / 0                        |                    2 | 93 / 3                                  |
| GMRT / High         |             45 | 403 / 186 / 0                      |                    2 | 93 / 3                                  |

All three scatter meshes are allocated even when a kind has zero live instances.
Their base geometry contains 360/240/300 vertices and 120/80/100 triangles,
respectively; aggregate attribute payload is 39,600 bytes. Each keeps the existing
4096-instance capacity: 262,144 matrix bytes plus 49,152 color bytes per kind,
933,888 bytes total. No cap or budget was changed. All recorded terrain counts
remain within the existing `maxVertices`; these generated/allocated counts do
not represent a measured rendered frame.

| Texture resource per material                           | Parent Low → current Low | Parent Medium/High → current Medium/High |
| ------------------------------------------------------- | ------------------------ | ---------------------------------------- |
| Unique requested maps                                   | 2 → 2                    | 4 → 4                                    |
| Constructed texture handles, including two placeholders | 4 → 4                    | 6 → 6                                    |
| Successfully loaded map handles                         | 2 → 2                    | 4 → 4                                    |
| No-document fallback handles                            | 2 → 2                    | 2 → 2                                    |
| Reported texture edge length                            | 1024 → 1024              | 1024 → 1024                              |

The ownership array retains placeholder references after their successful-load
release; handle construction counts are not live GPU allocation measurements.
C's owner-array index changes 2→3 on Low and 2→4 on Medium/High because the first
request changes from basalt to silt. That is the expected cache alias/order
change, not an extra map. Scatter rock materials still use C basalt. Texture
images were not decoded, so decoded image bytes and GPU memory are not claimed.

## Snapshot accounting

`node /tmp/3160-snapshot-audit.mjs` **PASS**; evidence in
`/tmp/3160-snapshot-audit.json` and its `.log`. It independently reproduces the
exact recorded old/new digests using the existing scatter fixture (seed 1130,
64 m cells, density 1, range 128 m, rock thresholds .02/.3, the same sloped plane,
128 updates at (32,-85,32)). No snapshots were written.

| Changed snapshot field                               | Parent → current          | Explanation                                                                                      |
| ---------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------ |
| `beebeIsolation`: Kama biome                         | `3f8ee739…` → `f1554322…` | exactly the seven authored fields: a, b, colorA, colorB, stain, stainAmount, patch               |
| `beebeIsolation`: Kama Low and High numeric uniforms | `88586fc8…` → `da6cd5e5…` | color/stain/patch changes plus the A/B contrast swap; the same digests also reproduced on Medium |
| `beebeScatter`: Kama meshes digest                   | `8e575f7d…` → `5b7f90b8…` | only mound instance colors change with colorA                                                    |

The scatter snapshot retains 21 cells, 149 instances (124 pillow, 12 boulder,
13 mound) and three draws. All per-kind geometry attributes, indices, transforms,
counts and pillow/boulder colors match exactly. Mound color-buffer SHA-256:
`6c4635e04002324275bec589361ff8ef4f3de7b7aa0b628da99430947e458f2b`
→ `affee82c6d0d704048b3ef40bfbb9400084c72728f41a966c994803e69e9d404`.
`SCATTER_TYPES.mound.color` tints `colorA`; pillow/boulder tint unchanged colorC.
Palette fields never enter Terrain meshing/collision or scatter placement
acceptance. Shader consumers read uPatch for the A/B weight threshold, the
per-slot uContrast and uCol values for albedo, and uStain/uStainAmount for the
existing stain mix; their source is unchanged. This explains the composite scatter hash without treating it as a
topology change. All other material/scatter snapshot fields are unchanged.

The merge's three `lowSweepReadability` snapshot changes concern Kama ambient
bands/samples/lights from the separate site atmosphere policy (Low's 6→18 and
new Medium/High policies). Their exact runtime/boundary verification belongs to
3170; they are not evidence of changed material resources here.

## Existing and added coverage; isolation

Existing adequate guards were retained unchanged: `beebeIsolation` all-site
Low/High biome/numeric-uniform/buffer/shader snapshots; `beebeScatter` geometry,
placement, colors, draw counts and established instance limits; `terrain-detail`
mesh/collision comparisons and budgets; `terrainMaterialReady` generic URL
sharing, map error/readiness/fallback and completed 3020 callback/disposal matrix;
`lostCityBiome` existing tint and terrain capability checks.

The missing contract was **registered Kama data through actual texture and
compile-hook bindings**, including Medium and cross-site order. Six cases were
added to `biomeFloorVariety.test.ts`: three tiers × loaded/unavailable maps.
Each uses one config and the real registered objects throughout:

1. Axial → Titanic → Kama → Axial → Titanic.
2. Titanic → Axial → Kama → Titanic → Axial, retaining the first sequence's
   materials while constructing the second.

The control IDs are `axial-seamount-ashes` (volcanic) and `titanic` (sediment).
The registry identity assertion prevents an unknown ID silently testing the
fallback biome. Tests check exact requested filenames, loaded texture bindings
and color spaces, unavailable fallbacks, C rock promise, all compile-hook uniform
object identities, tier defines, exact Kama palette/material scalars, and B/C
aliasing. Every retained earlier material's entire binding state remains stable;
repeated site states match regardless of order. Each construction has private
material/uniform objects, Color/Vector values and texture handles. Serialized
config and the whole BIOMES registry remain byte-identical, including their
shared scatter array. Parent/current Axial/Titanic geometry, collision, uniforms,
shader, scatter and resource records also compare equal.

No production correction is proposed: no defect was reproduced. Harness setup
was corrected during development for optional Titanic-only fade uniforms, the
full Axial ID and zero-count allocated scatter meshes; those initial probe
failures were fixture mistakes, not product failures. The first standalone SSR
attempt encountered a restricted HMR socket/dependency cache; it was replaced
with disabled network services and a /tmp cache. No browser was launched.

## Simplicity and rubric

One existing capability spec is extended; no package-named spec, skipped test,
retry, timeout change, weakened historical assertion or snapshot rebaseline.
No production/site branch, runtime config mutation, setting, dependency, schema,
UI, guidance surface, layout patch, shader or art change. Package history stays
in this note. The numeric rubric checks behavioral correctness and established
resource limits; scanning, retained discoveries, input/accessibility, all 13
site identities, GMRT surveys, five hero set pieces and Arcade defaults remain
protected by untouched production/content and existing gates. No new guidance
or rewards require player interpretation. Beauty, readability/composition,
visual Phone-OK and unaided journeys remain Claude/owner judgments.

## Validation

- Focused final command:
  `npm test -- --configLoader runner --cache=false tests/unit/biomeFloorVariety.test.ts tests/unit/terrainMaterialReady.test.ts tests/unit/beebeIsolation.test.ts tests/unit/beebeScatter.test.ts tests/unit/lostCityBiome.test.ts tests/unit/terrain-detail.test.ts`:
  **PASS: 6 files / 147 tests**, exit **0**, **22.14 s**.
  Log `/tmp/3160-focused-final.log`. No snapshot update flag was used.
- Independent parent/current resource and snapshot audits: **PASS**, exit **0**,
  commands and evidence paths above.
- `npm run typecheck`: **PASS**, exit **0**; final repeat after test fixture
  refinements also **PASS**, `/tmp/3160-typecheck-final.log`.
- Required `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`:
  **completed, exit 1, FAIL gates (e2e=none)**. Log `/tmp/3160-gates.log`,
  run `.cache/runs/20261022-125406-41-T8pph4/`.
- Aggregate **PASS**: config preparation, strict content, production build
  (TypeScript/Vite), full units (**192 files / 3,525 tests, all passed**,
  **518.71 s**), attribution and repository-wide Prettier. The existing build
  chunk-size warning remains non-failing. There are no unit behavioral failures
  or expected-failure cases in this checkout's run.
- Aggregate **FAIL**: Python, **162 passed / 5 failed / 167 total**, **8.957 s**.
  Four `test_ci_build_manifest` cases stop on `spawnSync git EPERM` (environment
  execution restriction). `test_golden_tooling` reports `Unexpected end of JSON
input` in its Node tooling test; its underlying cause is not established by
  this audit. These are the same unrelated tooling failures recorded by 3130;
  no tooling repair, assertion relaxation or check bypass was made.
- Final owned-file Prettier check and `git diff --check`: **PASS**. Final status
  contains only the owned capability spec and this note. Production/data,
  baseline snapshots and other packages' changes have no diff here.
- Actual e2e mode: **none**. No renderer/browser/game capture, shader execution,
  image quality, device performance, real-phone acceptance or successful unaided
  journey is established by these CPU bindings and resource counts.
