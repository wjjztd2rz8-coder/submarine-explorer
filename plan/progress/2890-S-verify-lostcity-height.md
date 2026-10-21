# S-verify — Lost City relief/terrace height audit

Backlog item **9, S-verify / S-bughunt [Codex, standing]**, specifically
**S-verify**. Non-visual verification; the DONE V-lostcity-hill art item stays
closed. Checkout: `c085c7d485e071f6d57f524ab1d29705f72a64db`.

## Range and ownership

Audited the actual merge `e15dd258583ba0645d86026e48172b664ed08f5f` against its
first parent `2cea170c916cdddecc1ad563ddbeb75e272fcea1` (`e15dd25^1`);
second parent is `fd7409d62f4b1027c9314f0a4633e1fac223690c`.
No moving `HEAD~N` baseline was used.

| Existing Lost City profile field | First parent | Merge/current |
| -------------------------------- | -----------: | ------------: |
| reliefM                          |          1.8 |           1.0 |
| reliefWavelengthM                |           36 |            48 |
| terrace.periodM                  |           16 |            24 |
| terrace.amount                   |          1.1 |           0.3 |

`Terrain.ts`, `TerrainNoise.ts` and `TerrainChunk.ts` are byte-identical from
that first parent through this checkout. Profile focus, tessellation, budgets
and all other terrain configuration are unchanged. The audit used the current
runtime with a fixture-local config copy restoring exactly those four parent
values. Biome/scatter changes in the same merge do not change the height
sampler or terrain index allocation; they belong to 2910.

Read Director simplicity rules/rubric, newest review (2026-10-21), overnight
runs 74–75, V-lostcity-hill, 2800 result and S-verify-lostcity-beebe progress,
queued/launched 2850–2910 briefs and available results/progress. The 2800 note
explicitly audits an earlier SHA and its wrapper PASS summary is distinct from
its recorded local Python failures; it does not certify this terrain delta.

Before writing, rechecked every worktree's status/diffs. Completed 2850
(power), 2860 (Challenger), 2870 (journey layout/copy), and 2880 (sub preview,
focus/Journal) still have uncollected changes. Their shared formatting changes
to V-monterey-cliff are excluded. 2900 currently edits lostCityBiome and
montereyFidelity; 2910 remains queued for scatter. Main's Director edit marks
V-bluehole-roof-3 IN FLIGHT; that branch has committed stalactite colour and
snapshot work, despite a clean working tree. None of these files were edited.
There is no ownership overlap with this height audit.

## Existing coverage, before deciding on changes

- `terrainMemo1290`: shipped Lost City/Blue Hole Low/Medium/High samples compare
  memoised height against the pre-cache surface lookup within **1e-9 m**,
  forward/reverse traversal, focus, source boundaries and survey edges.
  Synthetic fixtures cover both triangle halves, mixed subdivisions, warm
  reuse, instance/rebuilt-survey isolation, the **400,000-entry** eviction
  limit, recomputation and disposal.
- `Terrain`: measured interpolation, tile clamping, vertical exaggeration,
  unit/upward normals, chunk coverage and topology counts.
- `terrain-detail`: current terrace slope/focus/strength gating and finite
  displacement; synthetic Medium/High between-vertex triangle rays and shared
  vertices within **0.001 m**; Low disables this fidelity profile. Shipped vent
  checks cover finite buffers, valid indices and nondegenerate LOD-0 triangles
  across all tiers. Existing vertex-budget assertions remain intact.
- `fidelityRollout`: shipped Medium/High rays at authored stations, prop seats
  and POIs within **0.001 m**, shared vertex height/normal/cavity agreement,
  skirts, indices at all three LODs and existing resource ceilings. Lost City
  Low preserves its legacy buffers.

These four unchanged capability specs passed **4 files / 98 tests** before
any tracked edit. No duplicate spec, new test, snapshot update or assertion
change was added: existing guards cover the authored delta, and the extra
boundary audit below isolates inherited discrepancies outside that delta.
A failing test for an unchanged production path would broaden this slice;
the exact reproductions and proposed corrections are recorded instead.

## Independent mesh measurements

Loaded the shipped **367 × 310** GMRT Float32 survey and built actual `Terrain`
instances at each tier, for parent/current configs. CPU `THREE.Raycaster`
intersected actual LOD-0 terrain meshes, excluding scatter. No GPU, renderer,
camera update or browser was used. Sampled each tier independently; no claim
that intentional tier tessellations have identical collision surfaces.

World focus is **(68.2472358820348, -966.0286616148973)** in X/Z metres.
Per profile/tier the deterministic point set is:

- 21 inner points: focus plus X offsets `[-500,-250,-50,0,50,250,500] + 0.123`
  and Z offsets `[-100,0,100] + 0.789`.
- 16 outer/fade points: radii **650, 775, 900, 1050 m**, four cardinal angles,
  plus X/Z offsets **0.123/0.789 m**.
- Medium/High: all **12** touching mixed-density patch edges, at **37%** of
  each overlap, on the edge and **±0.05 m** across it: **36 points**.
  Low has no mixed-density patches.
- 12 supported tile-edge probes, including repeated corners and points at
  fractions **0, 0.37, 1** along all four edges. Used the common supported
  extent of Float32 mesh and double-precision survey:
  X **±9679.9169921875**, Z **±9447.659912109375 m**. No out-of-tile ray agreement
  claim; clamping beyond the survey is covered separately by existing tests.

Total: **49 Low, 85 Medium, 85 High points per profile**, **438 rays** across
both profiles. Every ray hit. Values below are maximum absolute height errors
in metres; inherited exceptions are retained, not hidden by raised limits.

| Tier/profile       |       Inner |  Outer/fade | Mixed edge ±5 cm | Exact mixed edge | Tile boundary |
| ------------------ | ----------: | ----------: | ---------------: | ---------------: | ------------: |
| Low parent/current | 2.407298681 | 2.878808855 |              n/a |              n/a |   0.367755010 |
| Medium parent      | 0.000051182 | 0.000031433 |      0.000053753 |      0.137783266 |   0.000133784 |
| Medium current     | 0.000052676 | 0.000042131 |      0.000053753 |      0.137783266 |   0.000133784 |
| High parent        | 0.000088396 | 0.000045878 |      0.000061417 |      0.161092108 |   0.000149701 |
| High current       | 0.000075828 | 0.000028069 |      0.000061417 |      0.161092108 |   0.000149701 |

Medium/High inner, fade, adjacent seam probes and supported tile boundaries
meet the existing **0.001 m** ray tolerance. Maximum parent/current collision
height change at these samples is **0 / 3.694048873 / 3.400876009 m** for
Low/Medium/High, respectively; these are authored elevation changes, not
mesh/physics errors. All measured mismatch exceptions are identical before
and after the merge.

## Inherited mismatches and smallest proposed corrections

**Low continuous field versus coarse triangles:** Lost City has no
`resolveLow`; its profile is disabled on Low, so `sampleHeight` takes the
continuous bilinear-survey-plus-detail path. The coarse mesh interpolates
triangles between sampled vertices. At X/Z
**(68.37023588203485, -190.23966161489727)**:
`sampleHeight = -1191.3711847689774`, ray Y **-1188.4923759135092**, error
**2.878808855468151 m**, identical parent/current. The four profile changes
cannot cause or fix this. Vertex-only agreement does not establish
between-vertex agreement on Low. If strict physical mesh agreement is wanted
there, the smallest proposed correction is to use the existing near-triangle
sampling path for this supported Low height field, retaining its coarse mesh
and resident budget. Do not enable extra tessellation as a substitute.
This proposal needs a separately scoped production change and regression.

**Exact mixed-density boundaries:** five of twelve exact edges exceed
0.001 m on each of Medium/High. All lie outside the changed 900 m envelope.
For High at X/Z **(1322.39306640625, -2236.863427734375)**:

- `sampleHeight = -971.8230467485819`.
- First ray hit: `chunk_192_112`, face **12287**, Y **-971.6619546405759**.
- Second hit: `chunk_208_112`, face **704**, Y **-971.8230273437498**.
- Error against first/top hit: **0.16109210800595974 m**, identical parent/current.
- At X **1322.39296640625** and **1322.39316640625** (±0.0001 m), only one
  surface hits and errors are **0.000043386 / 0.000019405 m**.

The nominal source boundary is X **1322.3930480110776**, while the stored
Float32 mesh boundary is X **1322.39306640625**. Fine and coarse edges have
different linear elevations between common nodes. Height lookup chooses its
patch; the ray at the shared stored edge can hit both, selecting the higher.
This is a boundary ownership/precision discrepancy, not proof that different
tier surfaces should coincide. The smallest proposed collision correction is
an edge-only evaluation of both adjacent near triangles, returning the higher
surface within the stored-boundary rounding interval. It must preserve
interior patch selection, normal sampling, memo keys and mesh budgets; it
would not smooth or stitch the rendered edge. No production correction was
made or claimed validated.

Reproduction uses the shipped tile, `makeConfig().terrain`, the stated tier,
and `ray.set(new THREE.Vector3(x, 100, z), new THREE.Vector3(0, -1, 0))`, then
`ray.intersectObjects(terrain.group.children.filter(o => o instanceof THREE.Mesh))`
against `terrain.sampleHeight(x,z)`. New terrain starts at LOD 0. Parent config
restores only the four values in the table above.

## Memo, offsets and resources

For all **438** sampled parent/current queries, replacing only `latticeHeight`
with direct `surfaceHeight` lookup produced **zero** error; reverse warm queries
also produced zero. Each terrain instance's memo was empty after disposal.
The existing generic offset/isolation guard passed unchanged: rebuilt survey
fixtures shifted **-500 / -1000 m** retain those sample offsets within their
nine-decimal assertion and cannot contaminate another instance. This is not
an assertion that Lost City's absolute-elevation terrace phase is invariant
under arbitrary survey shifts; the terrace deliberately uses measured depth.
No runtime mutation of survey heights or resolved config was introduced.

All parent/current position and normal buffers are finite; every index at
LODs **0/1/2** is finite, integral and in range. Index arrays are exactly equal
between parent/current at every chunk and LOD; complete terrain stats match.
Resident counts include skirts and duplicate chunk boundaries:

| Tier   | Chunks | Resident vertices | LOD-0 triangles | Subdivision allocation |
| ------ | -----: | ----------------: | --------------: | ---------------------- |
| Low    |     30 |           124,296 |         240,924 | 30 × 1                 |
| Medium |     90 |           513,522 |       1,004,112 | 81 × 2 + 9 × 4         |
| High   |     90 |           627,570 |       1,229,904 | 81 × 2 + 9 × 8         |

All are unchanged (**0% growth**) and below the existing **4,000,000** resident
vertex ceiling. High still requests base subdivision 3, caps at 2, and retains
nine local subdivision-8 chunks. These are resident CPU geometry counts;
chunk count is potential terrain calls, not a rendered-frame/performance
measurement. Scatter, props, life and submarine costs are outside this slice.

## Simplicity and validation limits

Only this progress note is changed. No new runtime logic, test file, config,
setting, UI/guidance surface, layout rule, site branch, dependency, art value
or budget. No production files, snapshots, other progress notes or tooling
were edited; no merge, push or tag. This preserves real GMRT data, site
identities, scan/Journal/life, inputs/accessibility and Arcade default.
The rubric is applied to numerical correctness, simple behavior and retained
phone resource bounds. Physical agreement is separate from visual smoothness,
beauty, opening readability, gameplay clearance and real-phone/play acceptance;
those remain with Claude/owner.

- Existing focused headless checks: **PASS**, exit 0, **4 files / 98 tests**,
  **78.14 s**:
  `npm test -- tests/unit/Terrain.test.ts tests/unit/terrainMemo1290.test.ts tests/unit/terrain-detail.test.ts tests/unit/fidelityRollout.test.ts --configLoader runner --cache=false --pool=threads --maxWorkers=1`.
  Log: `/tmp/lostcity-height-existing.log`.
- Independent diagnostic: actual shipped terrain/mesh APIs, parent/current
  profiles, finite/index/topology/budget assertions and measured ray/memo
  results described above. Harness **completed, exit 0**; this is not a blanket
  ray-agreement pass because the inherited exceptions are explicitly retained.
  Scratch harness/data: `.cache/lostcity-height/{audit.ts,audit.json,diagnose.ts}`;
  logs: `/tmp/lostcity-height-{audit,diagnose}.log`. Bundled as Node SSR with
  Vite's existing raw-shader/manifest loaders; no game rendering or shader
  compilation on a GPU.
- Required invocation:
  `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`.
  Uses existing tooling support for read-only shared dependencies, without
  tooling changes. Config preparation, strict content, and production build
  (`tsc --noEmit` plus Vite) **PASS**. Log:
  `/tmp/lostcity-height-gates.log`; detailed run directory:
  `.cache/runs/20261020-230453-8-Tj2CJ5/`.
- Python: **FAIL, 5 failures / 167 tests** (162 passed). Four unmodified CI
  build-manifest fixtures fail at child `spawnSync git EPERM`; the golden
  tooling subprocess fails parsing empty CLI JSON with
  `Unexpected end of JSON input` (its underlying cause is not classified here).
  These signatures predate this slice in 2800 and other package progress notes.
  This is a reproducible environment block, not terrain assertion evidence.
- Aggregate gate: **INCOMPLETE, interrupted with exit 130** after that block
  was established; the in-progress full unit stage had emitted only its RUN
  header and has **no assertion result**. No aggregate-green or full-unit-pass
  claim. No runner/tool repair, retry, skip or timeout change was attempted.
  Attribution/Prettier stages were not reached by that invocation.
- Separate attribution **PASS**, 14 assets, exit 0. Separate repository-wide
  `npx prettier --check .` **PASS**, exit 0
  (`/tmp/lostcity-height-prettier.log`). Only this owned note was formatted.
  Final owned-note Prettier and `git diff --check` **PASS**.
- Actual e2e mode: **none**. No browser assertions, screenshots, visual
  smoothness, gameplay acceptance or real-phone acceptance were run or inferred
  from wrapper PASS labels.
