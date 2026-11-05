# S-perf-lostcity-audit — Lost City Low-tier cost audit

2026-11-05. Item S-perf-lostcity-audit / P2-lostcity-perf.

The current static desktop opening submits 91,378 / 295,322 / 644,556 triangles on Low / Medium / High **for terrain, placed props and settled scatter only**. Low already removes most of the higher-tier geometry and pixel work. Terrain is the largest High component in these samples. This does not identify the cause of the owner's 2026-10-18 iPhone stutter or establish performance on weaker phones.

## Reproduction and limits

Extended the existing `tests/unit/perf-budget.test.ts` diagnostic; no new runtime diagnostic system, settings, site branches or content edits. Run:

```sh
PERF_BUDGET_STATIC=1 npx vitest run tests/unit/perf-budget.test.ts \
  -t 'Lost City static frame census' --configLoader runner --cache=false --pool=threads --maxWorkers=1
```

This writes `.cache/perf-budget/lost-city-census-{low,medium,high}.json`, including each prop's cost in each view, resident geometry, scatter, particle capacities and water settings. The original whole-catalog census and transparent-fill regression remain in this capability spec.

Uses the actual heightmap, production Terrain/Props builders, material groups, draw ranges, instances and transparent double-sided pass policy. The full-prop census includes internal branches without a visibility discount. Frame estimates use production prop LOD and terrain diagnostics, then Three's object frustum test and visible traversal. They count submitted geometry before depth/fog/alpha rejection, rather than visible pixels. Points are counted separately from mesh triangles.

Views: composed Arcade free-dive opening (chase), then the saved `tools/lostcity-poses.json` Poseidon approach (70 m, 38 m above root) and detail (32 m, 66 m above root), aimed at local `[0,56,0]` through the first-person CameraRig. Viewports: desktop 1600×900 and portrait 390×844; identical world poses, CSS aspect ratios. These are fixed CPU workload views, not gameplay timings or rasterized golden images. No viewport/DPR-based triangle discount is applied.

Scatter uses the production constructor, seeded placement, material/geometry and manifest keepout policy. Only its constructor's DOM-presence guard is enabled under Node; terrain image loading stays disabled. A fresh stream settles for 100 updates per view (two cells/update), so counts represent a stationary settled view, not a particular streaming journey. The shader textures have no effect on these counts. Wildlife varies with simulation time: its agent/species limits are listed separately, not invented as an exact rendered population. Vehicle, wildlife meshes, ocean/backdrops, headlight beams and post geometry are excluded from the terrain/prop/scatter subtotals.

## Prop groups

All twelve full props at once. Entries are **triangles / draws**, with points and growth instances separate below. Draws include the point layers; triangle totals do not.

| Prop group        | Low triangles / draws | Medium triangles / draws | High triangles / draws |
| ----------------- | --------------------: | -----------------------: | ---------------------: |
| poseidon-tower    |            15,344 / 7 |               56,330 / 7 |             79,968 / 7 |
| beehive-chimney   |             2,160 / 3 |                4,528 / 3 |              6,648 / 3 |
| imax-tower        |             2,408 / 3 |                5,408 / 3 |              8,068 / 3 |
| unnamed-chimney-1 |             2,708 / 3 |                6,560 / 3 |             10,420 / 3 |
| unnamed-chimney-2 |             2,956 / 3 |                8,088 / 3 |             11,460 / 3 |
| far-spire-1       |             3,340 / 3 |                9,544 / 3 |             12,932 / 3 |
| far-spire-2       |             3,628 / 3 |               10,224 / 3 |             13,772 / 3 |
| far-spire-3       |             3,060 / 3 |                8,728 / 3 |             11,724 / 3 |
| far-spire-4       |             3,804 / 3 |               10,160 / 3 |             13,896 / 3 |
| far-spire-5       |             3,256 / 3 |                9,512 / 3 |             12,716 / 3 |
| far-spire-6       |             2,936 / 3 |                7,928 / 3 |             11,404 / 3 |
| far-spire-7       |             3,524 / 3 |                9,984 / 3 |             13,420 / 3 |
| **All props**     |       **49,124 / 40** |         **146,994 / 40** |       **206,428 / 40** |

Poseidon has 10 / 23 / 33 instanced attached growths (Low / Medium / High); the other eleven props have none. These are retained. Prop effects total 26 draws: fourteen clear-fluid emitters × 25 / 49 / 49 points = 350 / 686 / 686 plume points, plus twelve fringe layers totalling 392 points in every tier. Thus the entire prop particle allocation is 742 / 1,078 / 1,078 points. Poseidon accounts for 159 / 231 / 231 of them; each other prop has 53 / 77 / 77. Geometry costs the remaining fourteen draws.

## Fixed-view submission estimates

Each geometry cell is **triangles / draws**. Scatter's instance count is also shown; it is drawn in four instanced batches, without per-instance frustum rejection. Prop instances remain 10 / 23 / 33 in all sampled views. JSON retains per-prop frame costs and LOD choices; the table above is the conservative bound for each group.

| Tier   | Viewport / view   |      Terrain |        Props |     Scatter | Scatter instances | Subtotal triangles / draws | Prop points submitted |
| ------ | ----------------- | -----------: | -----------: | ----------: | ----------------: | -------------------------: | --------------------: |
| Low    | desktop opening   |  33,248 / 12 |  49,124 / 40 |   9,006 / 4 |               175 |                91,378 / 56 |                   742 |
| Low    | desktop approach  |   21,888 / 9 |  43,128 / 29 |   9,466 / 4 |               199 |                74,482 / 42 |                   502 |
| Low    | desktop detail    |  39,936 / 12 |  37,340 / 24 |  10,086 / 4 |               207 |                87,362 / 40 |                   424 |
| Low    | portrait opening  |  32,112 / 10 |  45,868 / 29 |   9,006 / 4 |               175 |                86,986 / 43 |                   477 |
| Low    | portrait approach |   29,312 / 8 |  31,108 / 20 |   9,466 / 4 |               199 |                69,886 / 32 |                   371 |
| Low    | portrait detail   |   29,952 / 9 |  31,108 / 20 |  10,086 / 4 |               207 |                71,146 / 33 |                   371 |
| Medium | desktop opening   |  99,832 / 41 | 146,994 / 40 |  48,496 / 4 |               692 |               295,322 / 85 |                  1078 |
| Medium | desktop approach  |  75,200 / 27 | 130,338 / 29 |  44,144 / 4 |               632 |               249,682 / 60 |                   742 |
| Medium | desktop detail    |  87,488 / 31 | 115,586 / 24 |  51,224 / 4 |               735 |               254,298 / 59 |                   616 |
| Medium | portrait opening  |  75,036 / 31 | 137,482 / 29 |  48,496 / 4 |               692 |               261,014 / 64 |                   693 |
| Medium | portrait approach |  62,912 / 23 |  99,042 / 20 |  44,144 / 4 |               632 |               206,098 / 47 |                   539 |
| Medium | portrait detail   |  80,320 / 25 |  99,042 / 20 |  51,224 / 4 |               735 |               230,586 / 49 |                   539 |
| High   | desktop opening   | 293,588 / 41 | 206,428 / 40 | 144,540 / 4 |             1,665 |               644,556 / 85 |                  1078 |
| High   | desktop approach  | 211,584 / 27 | 183,300 / 29 | 132,668 / 4 |             1,543 |               527,552 / 60 |                   742 |
| High   | desktop detail    | 258,688 / 31 | 162,880 / 24 | 143,686 / 4 |             1,699 |               565,254 / 59 |                   616 |
| High   | portrait opening  | 235,292 / 31 | 193,712 / 29 | 144,540 / 4 |             1,665 |               573,544 / 64 |                   693 |
| High   | portrait approach | 192,896 / 23 | 139,040 / 20 | 132,668 / 4 |             1,543 |               464,604 / 47 |                   539 |
| High   | portrait detail   | 235,392 / 25 | 139,040 / 20 | 143,686 / 4 |             1,699 |               518,118 / 49 |                   539 |

## Terrain footprint and other per-frame work

The source tile is 367×310 samples (113,770 float heights), spanning **19,359.83×18,895.32 m**. Source spacing is 52.896×61.150 m. Low uses 64-source-cell chunks (up to 3,385.33×3,913.59 m). Medium/High split chunks near the fidelity envelope to 16 source cells (846.33×978.40 m), retaining large distant chunks. No terrain data/resolution was changed.

| Terrain allocation                         |           Low |        Medium |                                     High |
| ------------------------------------------ | ------------: | ------------: | ---------------------------------------: |
| Resident chunks                            |            30 |            90 |                                       90 |
| Resident vertices, including skirts        |       124,296 |       513,522 |                                  627,570 |
| Resident LOD-0 triangles, including skirts |       240,924 |     1,004,112 |                                1,229,904 |
| Base subdivisions per source edge          |             1 |             2 | 2 (requested 3, aligned to power of two) |
| Local subdivision / number of patches      |          none |         4 / 9 |                                    8 / 9 |
| Finest local vertex spacing, metres X×Z    | 52.896×61.150 | 13.224×15.287 |                              6.612×7.644 |
| Seabed albedo edge                         |      1,024 px |      1,024 px |                                 1,024 px |
| Texture normals / second-scale albedo      |     off / off |       on / on |                                  on / on |
| Scatter density / stream radius            |   0.25 / 90 m |   0.6 / 150 m |                                1 / 220 m |
| Settled scatter instances across samples   |       175–207 |       632–735 |                              1,543–1,699 |

| Other work / capacity                                |     Low |    Medium |      High |
| ---------------------------------------------------- | ------: | --------: | --------: |
| Shadow-map passes                                    |       0 |         0 |         0 |
| Main scene renders                                   |       1 |         1 |         1 |
| Post draws (prefilter + blur/downsample + composite) |       0 |         6 |         9 |
| Post triangles (two per full-screen quad)            |       0 |        12 |        18 |
| Post HDR target MSAA samples                         |       0 |         0 |         4 |
| Bloom levels                                         |       0 |         1 |         2 |
| Marine snow points / draws                           | 300 / 1 | 1,200 / 1 | 3,000 / 1 |
| Wildlife agent / species-mesh caps                   |  44 / 4 |   100 / 8 |  180 / 11 |
| Wildlife spark capacity / maximum draws              |  48 / 1 |   140 / 1 |   260 / 1 |
| Headlight beam draws / ray integration steps         |   2 / 6 |     2 / 8 |    2 / 12 |
| Preset smoke / shimmer points                        |   0 / 0 |     0 / 0 |     0 / 0 |
| Preset glow lights (unshadowed)                      |       0 |         3 |         3 |

Shadow-map rendering is not enabled in boot and the light rig does not opt into cast shadows. Lights add shader work, not standalone geometry draws. Post counts follow `UnderwaterPass.render`: one prefilter, two horizontal/vertical blur pairs at level one, optional downsample and another blur pair at level two, then composite. The existing exported `perf` counters add the scene and final composite only; they omit intermediate bloom renders (5 Medium / 8 High draws). The table counts those explicitly from the pass schedule. Bloom targets use one-quarter and one-eighth viewport edges, so those draws do not all shade a full-resolution viewport. MSAA resolves do not add mesh draw calls. Renderer canvas antialiasing is requested on every tier; the browser chooses its actual sample count. God rays fade out at Lost City's depth but post/bloom still execute. Existing permanent marine snow remains GPU-animated with no per-frame attribute upload.

## Ranked reduction opportunities and decision

Rank 1 is the implemented, appearance-preserving saving. Remaining rows are ranked by the measured triangle workload difference in the desktop opening using the **existing** High and Medium policies; these are sizing references, not proposed changes to High, FPS predictions, or additive performance improvements.

| Rank | Reduction / comparison                              | Quantified saving                                                                                                                                                                           | Decision                                                                                                             |
| ---: | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
|    1 | Stop uploading unchanged spark colours during drift | On an active no-emission frame: 1 buffer upload → 0; 576 / 1,680 / 3,120 bytes saved on Low / Medium / High. The three per-frame particle attribute uploads become two (33.3% fewer bytes). | **Implemented generically.** Only emission dirties colour; no pool, position, age, intensity, shader or draw change. |
|    2 | Terrain: existing High → Medium policy              | 293,588 → 99,832 opening triangles, **193,756 fewer (66.0%)**; 41 draws unchanged. Resident vertices fall by 114,048.                                                                       | Retain current tiers. Changing High geometry needs visual acceptance; excluded here.                                 |
|    3 | Scatter: existing High → Medium policy              | 144,540 → 48,496 triangles, **96,044 fewer (66.4%)**; 1,665 → 692 instances; 4 draws unchanged.                                                                                             | Retain current tiers. Thinning scatter changes the scene and can remove organisms.                                   |
|    4 | Prop detail: existing High → Medium policy          | 206,428 → 146,994 triangles, **59,434 fewer (28.8%)**; 40 draws unchanged.                                                                                                                  | Retain all hero sets and detail. Geometry changes lack an appearance-equivalence proof.                              |
|    5 | Existing lower-tier particle/post policy            | High → Medium: snow 3,000 → 1,200 points; post 9 → 6 draws, MSAA 4 → 0. Medium → Low: post 6 → 0, snow 1,200 → 300.                                                                         | Already tiered. No additional cut; these change appearance. Wildlife caps remain untouched.                          |

The implemented saving has **zero triangle/draw-call reduction**. In steady state at 60 active frames/s without emission it avoids about 34.6 / 100.8 / 187.2 kB/s of colour uploads. With an emission every frame there is no upload saving; multiple emissions before a render still coalesce into one WebGL buffer upload. This is a small verified cleanup, not a remedy for the owner's High-tier stutter. Larger visually neutral batching opportunities were not established: props are already fourteen geometry batches, scatter already four, and shadows are already absent.

## Change, tests and remaining acceptance

Runtime change is one moved dirty flag in `Sparks.ts`, with a short explanation. No setting, wrapper, cache or new state. Three tier-table tests in `lifeSim.test.ts` verify unchanged colours while positions drift for 60 updates, emission dirtiness, ring wrap/recolour, and clear/re-emission. They protect High's render data and all species/hero content. The audit extends the existing capability diagnostic and checks complete prop placement, particle totals, terrain diagnostics against the geometry walk, and nonempty settled scatter.

Validation:

- Typecheck: passed (`npm run typecheck`).
- Full affected capability specs: **97 tests passed** with `npx vitest run tests/unit/perf-budget.test.ts tests/unit/lifeSim.test.ts --configLoader runner --cache=false --pool=threads --maxWorkers=1`.
- Diagnostic-only census: **3 tests passed**, with all three JSON reports generated. Tier-table spark upload tests: **3 passed**.
- `git diff --check` and formatting of all changed files: passed.
- Grepped `tests/e2e` for life/spark and geometry budgets. Attempted the required targeted browser commands against the retained current build:

```sh
GATES_CONFIG_MODE=writable PW_PORT=4291 PW_OUTDIR=.cache/lost-city-audit-dist \
  npx playwright test tests/e2e/f2-life.spec.ts -g 'rare encounter at lost-city'
GATES_CONFIG_MODE=writable PW_PORT=4291 PW_OUTDIR=.cache/lost-city-audit-dist \
  npx playwright test tests/e2e/f2-life.spec.ts \
  -g 'animals spawn at a site and stay inside the low tier draw-call budget'
GATES_CONFIG_MODE=writable PW_PORT=4291 PW_OUTDIR=.cache/lost-city-audit-dist \
  npx playwright test tests/e2e/f-perf-budget.spec.ts -g 'lost-city opening'
```

All three were blocked before test execution by web-server startup. A debug rerun logged `connect EPERM` for both `::1:4291` and `127.0.0.1:4291`. No fresh browser screenshots or rendered-frame results are claimed.

Full gate command: `GATES_CONFIG_MODE=writable PW_PORT=4292 tools/gates.sh`. **Not green.**

- Root and project-base builds, content and attribution passed.
- Full unit suite: **4,589 passed / 1 failed** across 194 files. The unchanged `lowTierFollowups.test.ts` test “Blue Hole saved hood pose B agrees with pinhole rays on both actual viewports” exceeded its existing 30-second timeout. An isolated retry reproduced the timeout (36.1 s); no assertion or timeout was changed.
- Python: five failures—four unchanged build-manifest tests with `spawnSync git EPERM`, plus the unchanged golden-comparison test (`Unexpected end of JSON input`).
- Smoke and project-base browser gates: web-server startup failed before tests, consistent with the targeted localhost `EPERM` failures.
- Full-repository formatting: passed.

Retained gate logs: `.cache/runs/20261105-065145-2-RaLXZU/` (`python.log`, `unit.log`, `e2e.log`, `e2e-base.log` and other stage logs).

Real-phone Low acceptance and High visual/device performance remain owner work.
