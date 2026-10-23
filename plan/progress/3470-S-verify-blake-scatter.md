# 3470 — S-verify: Blake scatter colour rebaseline

DIRECTOR Backlog **9, S-verify / S-bughunt [Codex, standing]**, specifically
**S-verify**. The `ada2729` Blake scatter rebaseline is fully explained by
`colorA` changing **rubble and mound instance colours**. No geometry, placement,
support, count, cell-processing or draw-count regression reproduced. Only this
note changes; existing tests and snapshots remain intact.

## Provenance and ownership

- Pinned checkout: `73b43c0bfb18ae54f8f9b2443ea76741252de629`.
- Actual data commit: `9b8f8f8454fd89ac50732af6fb8309c77870549e`.
- Its parent: `e4ce192496195c06acfb655ac3d05dd559391691`.
- Snapshot commit: `ada2729268e3be52a320eb2ecfa7be9edba801ca`.
- Audited data range: `e4ce192..9b8f8f8`; snapshot range:
  `ada2729^..ada2729`; compared reconstructed parent inputs with pinned HEAD.
  `git diff 9b8f8f8^ HEAD -- src/world/scatter src/core/config/terrain.ts
tests/unit/beebeScatter.test.ts` is empty. The only relevant biome changes
  through HEAD are the data changes below. No source revision was substituted.

Read DIRECTOR Backlog, simplicity rules and rubric, the newest 2026-10-23
morning REVIEWS entry, OVERNIGHT-LOG through runs 95/96, CONTRIBUTING-AGENTS,
`V-eight-sites-lit-b`, actual data/snapshot diffs, 3160/3170 and 3390 evidence,
2920's launched brief/result/last/log, and current 3420–3470 launched briefs.
No applicable AGENTS.md was found. Rechecked registered worktree status and
diffs, including committed changes affecting the two owned paths and finished
work awaiting collection; retained read-only diffs in
`/tmp/3470-scatter/ownership-diffs.txt`. Rechecked HEAD and ownership before
writing this note. No competing claim to this comparison was found.

2920 concerns run 77, before this data commit; its last report is empty and
its log ends in two model-at-capacity errors. Its wrapper PASS is not evidence
for this comparison. 3160 explains Kama's earlier mound colour change, not
Blake's later data. 3390 measures Monterey rubble distributions, not Scatter's
Blake buffers. No earlier completed result supplies this exact comparison.
3450 owns material bindings and `biomeFloorVariety.test.ts`; 3460 owns runtime
ambient and `lowSweepReadability.test.ts`. Their patches are not dependencies.
3420–3440, 3310's journey extension, 3320-R, 3340, 3380 and the owner-blocked
2980/3050 remain with their packages. No worktree patch was collected/copied.
The four expected-failure collision cases remain untouched.

## Inputs and consumers

| Authored field       | Parent     | Current     | Scatter consequence            |
| -------------------- | ---------- | ----------- | ------------------------------ |
| Blake `colorA`       | `0x4f4b42` | `0x5f5a4d`  | Rubble and mound instance RGB  |
| Blake `colorB`       | `0x45423a` | `0x56524a`  | None for Blake's scatter kinds |
| Blake `colorC`       | `0x3f3c34` | `0x4f4b44`  | None for Blake's scatter kinds |
| Blake `horizonFadeM` | absent     | `[150,700]` | Not consumed                   |
| Hunga `horizonFadeM` | absent     | `[250,900]` | Not consumed                   |

The same commit changes site.json ambient colour/intensity on all tiers:
`0x879399 / 6` to `0x6f8f9e / 11` (Blake), `/ 9` (Hunga).
Scatter does not read that manifest policy; runtime lighting belongs to 3460.

`ScatterPlacement.placeCell` reads scatter specs (kind, density, slope limit,
substrate preference, optional size multiplier), ground and cell options.
Its per-cell/per-kind RNG supplies shape, placement and colour variation.
`makeInstance` passes the biome to `SCATTER_TYPES[kind].color` before yaw and
final X/Z squash draws. Palette changes preserve the number of RNG calls.
`ScatterTypes.tinted` converts sRGB hex to linear RGB, then multiplies all three
channels by one seeded scalar: **1.1–2.0** for rubble, **1.0–1.35** for mound.
These are existing authored ranges, not new acceptance thresholds. Sponge uses
`SPONGE_HUES`; whip uses fixed `0xd2c7ae`. Neither reads Blake's palette.
Hunga's pillow/boulder read its unchanged `colorC`, mound its unchanged `colorA`.

`Scatter.rebuild` composes instance transforms and calls `setColorAt` with the
generated linear RGB. Blake uses ordinary type geometry, not Beebe's
`scatterRock` fractured-basalt path. No new geometry vertex colour is derived
from these changed palette fields.

## Exact aggregate and component delta

The existing `1130: other sites retain byte-identical...` snapshot hashes JSON
of the ordered mesh list. Every entry contains **name, count, geometry attribute
name → SHA-256 of its array, index-array SHA-256 or null, SHA-256 of the entire
instanceMatrix array, SHA-256 of the entire instanceColor array**. This includes
unused buffer slots, not just live instances. Separately snapshotted stats are
`cells`, `instances`, `drawCalls`. Materials, uniforms, object UUIDs, bounds and
camera state are not included in the meshes hash.

With the original fixture (seed 1130, density 1, range 128 m, camera
`(32,-85,32)`, 128 updates), reproduced exactly:

- Parent: `666bc789ecf420792f6e52e0897f960910aad8022cb981939a7b03662cbbda51`.
- Current: `ee4169bb41e44855c769563bd034e93deca4fe119797f6845b64c73ff96c6ade`.

| Blake kind | P=C count | Geometry attributes P=C     | Index P=C | Whole matrix array | Instance colour delta              | Triangles per instance P=C |
| ---------- | --------: | --------------------------- | --------- | ------------------ | ---------------------------------- | -------------------------: |
| rubble     |       195 | position, normal, uv, color | null      | identical          | 195/195 live RGB; 585 scalar slots |                         20 |
| sponge     |        31 | position, uv, normal, color | null      | identical          | none                               |                        162 |
| whip       |        20 | position, normal, uv, color | null      | identical          | none                               |                         64 |
| mound      |        30 | position, uv, normal, color | null      | identical          | 30/30 live RGB; 90 scalar slots    |                        100 |

Entire instance-colour buffer hashes:

| Kind   | Parent SHA-256                                                     | Current SHA-256                                                    |
| ------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| rubble | `f5ca389ce06dd033e87c523e4d4cbae7662996c6706463605fc0695158b3d3d0` | `2d9fe66b5db71b74c66b40210d69be87143d1ee4ef46d0739065118db23e9290` |
| mound  | `8f3339330d5ac1f249b32369701cf5ccee4b05aafc21b5a979385ade9f85c62c` | `7b2495393de002972a6f0ff7ff0210264e7ecd41a67a397cbd9b8827436d0edc` |

For an exact value witness, legacy Blake rubble instance 0 changes from
`[0.0895046666264534, 0.0805443748831749, 0.062366027384996414]` to
`[0.13099932670593262, 0.1170407235622406, 0.0849556177854538]`;
mound instance 0 changes from
`[0.09447471797466278, 0.0850168764591217, 0.06582911312580109]` to
`[0.13827352225780487, 0.12353981286287308, 0.08967307209968567]`.
These are expected Float32 linear RGB values, not defects.

Independent attribution: changing **only colorA** in the parent fixture yields
the complete current aggregate above. Changing only colorB, only colorC, or
only horizonFadeM each yields the complete parent aggregate. Replacing just
the two changed colour digests in current observations with parent digests
reconstructs the entire parent mesh list exactly. No unexplained component
remains. Thus “no scatter numerics touched” in the visual note needs the
qualification **placement/cost unchanged; instance colour numerics changed**.
No production correction or further snapshot rebaseline is proposed.

## Actual tier and streaming evidence

All values below are **parent = current** at the initial fixture position.
Actual config settings are Low **0.25 / 90 m**, Medium **0.6 / 150 m**, High
**1 / 220 m** (density multiplier / streaming range). No shipped tier is empty
for these biomes; no artificial empty tier was introduced. The Low control's
allocated whip mesh does have zero live instances and is correctly excluded
from drawCalls.

| Site / tier              | Cells | Per-kind live counts                                           | Total instances | Active draws |
| ------------------------ | ----: | -------------------------------------------------------------- | --------------: | -----------: |
| Blake / legacy           |    21 | rubble 195, sponge 31, whip 20, mound 30                       |             276 |            4 |
| Blake / Low              |     9 | rubble 54, sponge 5, whip 13, mound 11                         |              83 |            4 |
| Blake / Medium           |    25 | rubble 129, sponge 26, whip 20, mound 17                       |             192 |            4 |
| Blake / High             |    45 | rubble 195, sponge 31, whip 20, mound 30                       |             276 |            4 |
| Hunga / legacy           |    21 | pillow 124, boulder 12, mound 13                               |             149 |            3 |
| Hunga / Low              |     9 | pillow 30, boulder 2, mound 4                                  |              36 |            3 |
| Hunga / Medium           |    25 | pillow 122, boulder 11, mound 11                               |             144 |            3 |
| Hunga / High             |    45 | pillow 363, boulder 45, mound 13                               |             421 |            3 |
| Great Blue Hole / legacy |    21 | sponge 65, whip 15, tube 304, rubble 80, boulder 88, mound 30  |             582 |            6 |
| Great Blue Hole / Low    |     9 | sponge 6, whip 0, tube 31, rubble 26, boulder 12, mound 11     |              86 |            5 |
| Great Blue Hole / Medium |    25 | sponge 39, whip 12, tube 195, rubble 61, boulder 78, mound 17  |             402 |            6 |
| Great Blue Hole / High   |    45 | sponge 65, whip 15, tube 351, rubble 80, boulder 246, mound 30 |             787 |            6 |

Blake's Low/Medium/High changed live RGB counts are respectively rubble
**54/129/195** and mound **11/17/30**; no other kind changes. All per-kind
attribute/index/matrix arrays and all stats match. Hunga and unchanged registry
neighbour Great Blue Hole match in **every component including colours** on
all tiers and legacy settings. This control does not reopen Blue Hole art.
Blake High has the legacy visible counts despite more resident cells because
its kinds' draw ranges are 95/120/100/70 m, all below both streaming radii.

Use the existing streaming path's offsets `[0,0], [64,0], [-64,0], [1024,1024],
[0,0]` relative to `(32,32)`, settling for 128 updates at each position.
Cell counts at those five stops, shared by all three sites:
legacy **21/26/31/21/21**; Low **9/12/15/9/9**; Medium
**25/30/35/25/25**; High **45/52/59/45/45**.
The complete per-update stats trace matches parent/current/replays, including
initial construction, with the existing maximum **two generated cells/update**.
This is cell/stat accounting, not measured execution time.

Blake instances along those stops: legacy and High **276/284/318/293/276**,
Low **83/62/85/60/83**, Medium **192/183/219/160/192**. Low draws are
**4/4/4/3/4**; legacy/Medium/High retain four throughout. Per-kind path counts
for every site/tier are retained in the raw
evidence. Returning after eviction restores the exact live matrix/colour
multiset for each revision; sorting only handles resident-cell insertion order.
Full array hashes are still compared directly between revisions and replays
at each common stop, including stale capacity slots.

## Fixture, support and isolation

Temporary `/tmp/3470-scatter/audit.ts` reuses the literal `populated`/`settle`
functions from `beebeScatter.test.ts`, with trace instrumentation and a local
document-presence stub. No renderer or WebGL context is constructed. Ground
is the existing plane `-100 + 0.05*x - 0.1*z`, its supplied normal
`[-0.05,sqrt(1-0.05²-0.1²),0.1]`, and contains=true; seed and rock thresholds
remain 1130 / 0.02 / 0.3. Only changed parent data fields are reconstructed in
isolated biome copies. Source, geometry, data and snapshots remain read-only;
no checkout file was reverted or another worktree copied.

Across 12 site/settings pairs, four concurrent constructions per pair
(parent/current/current replay/parent replay) produce identical corresponding
observations. Replays have distinct geometry, material, matrix-array and
colour-array objects. A further forward/reverse site-order check keeps prior
outputs alive while constructing later controls: prior observations stay
unchanged, and reverse-order outputs match. Deeply frozen biome/spec/fade
copies, ground and fixture options are accepted; serialized BIOMES,
DEFAULT_BIOME, reusable config and parent/current copies remain unchanged.
Functions in the control biome are retained by identity when cloning.

**68,524** live transform checks (including both revisions/replays/path stops)
pass finite buffers, positive determinant, existing range/capacity contracts and
the existing burial interval `[-0.001, scale.y+0.001)` m. All complete generated
instance-colour and matrix buffers are finite. **1,419** pure-cell current
instances across `(0,0), (1,0), (-1,0), (16,16)` retain exact parent placement
fields, finite values, existing slope acceptance and exact supplied-ground
embedding; repeat `placeCell` calls match. Geometry and transforms are
byte-identical, preserving the supplied-ground support relationship. This is
not a new surveyed-terrain collision or Monterey support audit, and does not
claim whole-mesh nonintersection.

## Existing guards and simplicity

No new test is warranted by this clean comparison. Existing `beebeScatter`
retains the aggregate snapshot (including colours), Beebe geometry isolation,
Challenger tier placement/budgets, late keepout invalidation, wreck-floor finite
grounded transforms and repeatability, plus carbonate per-kind seeded streams,
cell budget, range/capacity, eviction/revisit and pure-cell ground translation.
`biomeFloorVariety` already guards deterministic seeded placement, finite
instances, embed, slope and exclusion contracts. `beebeIsolation` retains the
broader unchanged-site structural snapshots. This diagnostic explains the
specific authored delta without another package-specific snapshot or a weaker
colour-excluding baseline. No material structural isolation regression emerged
that needs a permanent duplicate guard.

Net simpler: one evidence note, no runtime/test machinery, settings, site
branches, config mutation, UI/guidance/layout, dependencies, schema or policy
changes. All existing counts, budgets, tolerances and historical assertions
remain unchanged. Rubric evidence is behavioral/numerical correctness and
honest limits; readability, beauty, composition and phone acceptance stay with
Claude/owner.

## Validation

- `npm test -- --configLoader runner --cache=false
tests/unit/beebeScatter.test.ts tests/unit/beebeIsolation.test.ts
tests/unit/biomeFloorVariety.test.ts`: **PASS**, 3 files / 25 tests, 6.75 s.
- Temporary diagnostic built with `node --input-type=module` calling
  `build` from `vite` with `{configFile:false, build:{ssr:
'/tmp/3470-scatter/audit.ts', outDir:'/tmp/3470-scatter/build',
rollupOptions:{output:{entryFileNames:'audit.mjs'}}}}`.
  `node /tmp/3470-scatter/build/audit.mjs`: **PASS**, 12 comparisons,
  exact old/new snapshot reproduction, component attribution and isolation.
  Raw evidence: `/tmp/3470-scatter/evidence.json`; log:
  `/tmp/3470-scatter/audit.log`; these are local diagnostic artifacts.
- Initial diagnostic setup attempts were tooling/fixture errors: a raw
  Rolldown bundle left `import.meta.glob` unprocessed, and `structuredClone`
  rejected the unchanged control's function-valued tint. Vite SSR build and
  a function-preserving recursive copy corrected these without changing any
  production code. Neither error was a product regression.
- `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`: **FAIL**, exit 1,
  `FAIL gates (e2e=none)`. Config, content, build (including TypeScript), unit,
  attribution and repository Prettier checks **PASS**. Unit: **192 files,
  3,845 passed + 4 expected failures (3,849 total)**, **584.38 s**. The four
  historical collision expected failures are preserved. Python alone fails.
  Run logs: `.cache/runs/20261023-125506-27-YBt4Cs/`.
  The Python gate reports **167 tests, 5 failures**: four
  `test_ci_build_manifest.TestCiBuildManifest` cases fail in manifest setup with
  `spawnSync git EPERM` (sandbox/process tooling block, before their assertions).
  `test_golden.TestGolden.test_golden_tooling` fails its nested
  `golden comparison refuses partial sets, missing files and incompatible poses`
  case at `golden-manifest.test.mjs:151`: `JSON.parse(report.stdout)` receives
  empty output (`Unexpected end of JSON input`). Its nested suite is 24/25.
  The latter is a tooling-harness failure with unresolved cause here; no
  browser was launched. It is not attributed to Blake or silently counted as
  a pass. These unrelated tools remain read-only, with no retries or fixes.
- `npx prettier --write plan/progress/3470-S-verify-blake-scatter.md` formats
  only the owned note. Final
  `npx prettier --check plan/progress/3470-S-verify-blake-scatter.md` and
  `git diff --check`: **PASS**. Final HEAD remains the pinned SHA; `git status
--short` lists only this new note. Tests, snapshots and production/data have
  no diff.

Actual local e2e mode is **none**. CPU mesh/stat accounting does not establish
visual quality, GPU output/compilation, frame time, real-phone performance,
touch layout, successful journeys, offline play or hosted CI status. No browser,
screenshots, hosted workflow, merge, push or tag was used.
