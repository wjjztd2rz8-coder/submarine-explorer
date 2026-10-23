# 3390 — S-verify: merged Monterey rubble retune

Director Backlog **9, S-verify / S-bughunt [Codex, standing]**; this slice
serves **S-verify**. **No supported rubble-placement regression reproduced.**
All four shipped banks retain their requested counts, finite transforms,
supported seats, exposure and separation. Existing guards suffice; only this
note changes. The four older scarp-contact defects remain unresolved.

## Provenance and ownership

- Pinned checkout/current: `db48e944cd9e9c85b38209393185dae2395b2b65`.
- Actual visual merge: `cce7bc6fe2c52693573a483c42e9fba3f2c2830b`.
- Actual first parent: `f5172e727cf5a3ef0192bf093040d962c27b60b2`.
- Read the actual first-parent diff, not the merge's combined diff.
  `git diff cce7bc6 HEAD -- src/core src/util src/world data` is empty;
  the relevant rubble/boulder/scarp test files also match the merge.
  The archived current diagnostic therefore measures this exact merged retune.
- Read DIRECTOR's Backlog, seven simplicity rules and rubric, the newest
  2026-10-23 morning REVIEWS entry, OVERNIGHT-LOG through run 93 (including
  run 91), V-monterey-apron, 2950–2970 progress, launched briefs and results,
  and current 3390–3410 briefs. The earlier audits pin `00d159b` against
  `a35a9c2`, covering the crest/attachment change, not `cce7bc6`'s distribution.
  No prior result/progress for this retune audit was found. Historical wrapper
  summaries say PASS/smoke even when their final reports say Python failure
  and e2e none; actual command evidence controls this report.
- Read `MONTEREY_RUBBLE`, `buildScarp`, `placeRocks`, `isSupported`,
  `rockMatrix`, Props/Terrain placement and the existing rubble, boulder,
  scarp, support and frame-budget capabilities before writing.
- Rechecked registered worktree status, queue/launched/hold and results,
  including finished work awaiting collection. 3360 owns assets tests;
  3370 owns camera/firstMove changes; 3380 owns its hosted-CI note. None is
  collected or depended on here. 3310's journey extension, 3320-R's full-e2e
  note and 3340's touch spec/note remain with their packages. 2980's scarp/
  collider changes and 3050's Terrain/seam changes remain unmerged and
  untouched. 3400 owns mission-core/Mission; 3410 is report-only. No overlap
  with the two tests available to 3390 or this note was found. No other
  worktree's patch was copied, overwritten or committed.

## Exact retune and hashes

The four changed fields are:

| Field            | First parent | Merge/current |
| ---------------- | ------------ | ------------- |
| `blockRadius`    | `[1.2, 3.2]` | `[1.0, 2.4]`  |
| `fragmentRadius` | `[0.3, 2.2]` | `[0.3, 1.8]`  |
| `radiusSkew`     | `1.8`        | `2.6`         |
| `scarRadius`     | `[0.6, 2.8]` | `[0.6, 1.8]`  |

The block lower bound changes too; the visual note's ceiling description
does not list that separately. The **0.3 fragment floor remains unchanged**.
`placeRocks` scales the radius range by `size`; the shipped canyon uses
`size = 0.7 * max(0.6, H/30)`. Thus 0.3 is the retained configuration floor,
not an assertion that every unit-size fixture's final radius is at least
0.3 world metres. Shipped minima are all above 0.3 m (table below). No lower
floor, different count or unfinished pebble/apron work is included.

`scarpObservations` returns `[geometry, placement, materials, collision]`.
Only index **1**, the placement digest, was rebaselined for canyon Medium
and High:

- Medium: `22ffbd573c2457751851093c92d0dbfe17da23baf086dedbfbbabb23260d029f`
  → `2388236a2b7cdd5c181238436c7610e72494795168cb8fce017b09a097e53e70`.
- High: `1803d1002b109b2df6235f55043610cdd8a23e4e9eb162ecb28c8c96e14b9517`
  → `24a9d2d3d5e76844a41b3ec0006653474f0ee3a2557b4663c4f4aa758a9667a1`.

That digest includes object transforms/graph, counts, **instance matrices and
instance colours**, not just rock matrices. Per-object surveyed comparisons
show exactly `boulders-0`, `boulders-1`, `boulders-2` changing matrices **and
colours** on each Medium/High bank. Colour depends on each selected spot's
runout `u`; changed acceptance/rejection changes some selected spots. Hence
“rubble matrices only changed” in the visual note is incomplete shorthand:
the changed output is confined to rubble instance data, including colours.
No geometry, material or collider rebaseline was needed or made here.

All 12 shipped bank/tier comparisons have identical root transforms, wall
and apron attribute/index buffers, remaining full-tree objects (including
wall-life matrices/colours), impostor buffers/transforms, local bounds and
every numeric placed-collider field. Crest vertices are included in the wall
buffer comparison. Low's entire full/impostor observations are identical.
All original tuff/hadal and canyon-Low hashes pass on both archived revisions.
Unchanged collision hashes establish isolation of this retune, not correctness
of the pre-existing coarse collision approximation.

## Deterministic measurement method

Temporary roots `/tmp/3390-monterey/{parent,current}` were populated with
`git archive` of the exact first parent and pinned checkout, including their
own `src`, shipped `data`, and unmodified existing rubble/boulder/scarp tests.
Dependencies are linked read-only. The temporary observation spec reuses the
`montereyBoulders` Props/Terrain fixture: actual meta/heightmap/props, authored
transforms and stable seeds, all four banks, Low/Medium/High. As in that spec,
`detailSubdiv=1` avoids unused terrain surface tessellation while preserving
the tier's height/detail sampler and prop geometry. No renderer is created.

Spies delegate unchanged to the real `placeRocks` and `rockMatrix`, recording
the actual talus and final selected spots. This includes scar-fall replacements
that are not returned by the ordinary placement call. No archived production
source is edited. For each live instance:

- Compose `mesh.matrixWorld * instanceMatrix` and require all 16 values finite.
- Measure centre minus surveyed seabed, and maximum transformed template-
  vertex clearance above the same sampler, exactly as `montereyBoulders` does.
  Required values stay **>0 m** and **>0.25 m**, respectively.
- Evaluate the existing `isSupported` contract at the final spot: normal Y
  **>=0.5**, four tangent/bitangent rim probes at `0.8*r`, maximum permitted
  surface drop `0.55 * r`. Record the minimum signed rim margin and verify
  the seat equals `talusSurface` exactly. These are spot-support contracts;
  they do not certify every stretched template vertex against apron triangles.
- Measure horizontal nearest-neighbour distance for actual world centres and
  local surface seats. The ordinary sampler's separate radius-relative rule
  is distance `>= 0.6 * (r1 + r2)`. Scar-fall replacement invokes support but does
  not run that ordinary pairwise rejection. We retain that distinction instead
  of inventing a stronger universal separation/nonintersection requirement.

Full payloads preserve per-instance mesh/index, world XYZ, radius, seat,
normal, support margin, exposure and matrices in `observations-{tier}.json`.
`comparison.json` records the parent/current summaries and object-field diffs.
No additional seed, snapshot baseline or artistic size-ratio assertion is retained.

## Generated counts and radii

P = first parent; C = merge/current. Radii are the actual final spot radii in
metres before the unchanged squash/stretch transform.

| Tier / bank                 | Live P=C | Ordinary + scar-fall P=C |   Radius min–max P |  Radius min–max C |
| --------------------------- | -------: | -----------------------: | -----------------: | ----------------: |
| Low / all four individually |        0 |                    0 + 0 |                  — |                 — |
| Medium / ledge              |       96 |                  81 + 15 |  0.448503–5.958456 | 0.448009–3.828287 |
| Medium / east               |       96 |                  81 + 15 | 1.192262–14.126674 | 1.190049–8.872780 |
| Medium / west               |       96 |                  81 + 15 | 1.051826–10.831643 | 1.052038–8.031949 |
| Medium / far                |       96 |                  85 + 11 | 1.330036–15.400916 | 1.330000–9.632969 |
| High / ledge                |      160 |                 145 + 15 |  0.448503–5.958456 | 0.448009–3.828287 |
| High / east                 |      160 |                 145 + 15 | 1.190190–14.126674 | 1.190001–8.872780 |
| High / west                 |      160 |                 145 + 15 | 1.051826–10.831643 | 1.050006–8.031949 |
| High / far                  |      160 |                 149 + 11 | 1.330036–15.400916 | 1.330000–9.632969 |

Medium batches are **32/32/32** per bank; High **54/53/53**. Totals remain
**384 Medium + 640 High = 1,024** on each revision, with no Low batches.
All 1,024 radius/matrix records change; 838 seat XYZ records change. Count
and stable coordinates are different contracts: the altered radii influence
support/separation candidate acceptance, so relocation is expected.

Minimum measured clearance/exposure and horizontal world-centre separation,
metres; every cell is P → C:

| Tier / bank    | Centre above seabed (>0) | Maximum vertex exposure (>0.25) | Nearest world centre |
| -------------- | -----------------------: | ------------------------------: | -------------------: |
| Medium / ledge |      0.098958 → 0.087722 |             0.477123 → 0.436116 |  0.673120 → 0.540938 |
| Medium / east  |      0.213474 → 0.197858 |             0.996868 → 0.891933 |  0.449658 → 0.909498 |
| Medium / west  |      0.183920 → 0.178718 |             0.875388 → 0.762619 |  0.981526 → 1.000748 |
| Medium / far   |      0.237425 → 0.254972 |             1.019885 → 1.016025 |  1.271901 → 0.750172 |
| High / ledge   |      0.081956 → 0.088244 |             0.366567 → 0.441404 |  0.447169 → 0.495962 |
| High / east    |      0.199288 → 0.202359 |             0.906556 → 0.876777 |  0.327198 → 0.504588 |
| High / west    |      0.184511 → 0.179293 |             0.877934 → 0.764134 |  1.006010 → 0.401425 |
| High / far     |      0.241331 → 0.252291 |             1.017100 → 0.992666 |  0.848501 → 0.494129 |

All **1,024/1,024** final spots on each revision pass support, exact surface
seating and transform finiteness. Across the generated set, minimum normal Y
is **0.512140 → 0.512140**; minimum rim margin is **0.000814259 →
0.000302004 m**, both nonnegative. The smallest ordinary-pair separation
ratio (distance divided by `0.6*(r1+r2)`) is **1.001861 → 1.000247**,
retaining the existing >=1 contract. Minimum final seat-to-seat distance is
**0.327926 → 0.327926 m**, including scar-fall replacements. Actual minimum
world-centre distance is **0.327198 → 0.401425 m**; all observed distances
also exceed the standalone fixture's 0.25 m threshold. No whole-mesh
nonoverlap requirement is inferred from centre/seat separation.

The least current exposure is Medium `canyon-wall-ledge`, `boulders-1[12]`,
centre **(-3388.062943673343, -740.3023848566087, -1342.7597451480192)**:
**0.43611556680900776 m**, versus required **>0.25 m**. This is a passing
witness, not a newly buried rock. Smaller intended maxima and changed
clearances do not amount to a supported-placement regression.

The original `montereyRubble1320` fixture also retains **160/160** supported,
repeatable placements. Its radius range is **0.210191–1.647326 →
0.210003–1.258101 m** (`size=0.7`); nearest-neighbour range is
**0.740597–6.381271 → 0.331877–6.381271 m**, still satisfying >0.25 m,
maximum >3 m and spread ratio >5. Runout counts beyond `u=1` are **86 → 87**,
and below `u=0.6` **40 → 39**, retaining >30 / >20. The existing broad size
range (>5) passes without a new artistic ratio or a changed tolerance.

## Existing coverage, budgets and retained defects

No test edit is justified. `montereyRubble1320` already guards deterministic
requested count, supported runout, final surface seating and patch separation;
`montereyBoulders` checks every actual transformed rock's centre and vertex
exposure on all four surveyed banks, with Low omission and exact tier counts.
`scarpTerrain` preserves geometry/placement/material/collision hashes across
all presets/tiers and guards the primary real-slope instances and culling.
The clean numerical comparison supplies evidence without duplicating these
capabilities or mirroring formulas in permanent tests.

Existing `montereyFrameBudget` passes its unchanged Medium matrix (five
inspection poses, each at -2/0/+2 m drift), including streamed scatter and the
**225,000** life/sub/effects reserve within **900,000**, as well as the older
200k reserve guard. This cites the existing guard, not a new performance
audit. The historical 2960 resource report remains evidence for the earlier
crest merge, not a fresh real-device timing claim here.

The four `montereyScarpSupport` upper-wall cases remain **expected failures**
in the focused current run. Their fixture assertions still validate actual
exposed triangle hits before the expected failure; the failed assertion is
the existing **8 m hull** contact. They predate this retune. Historical 2950
evidence (world coordinates and nearest own-box distance) is retained here
with its original provenance:

| Tier / bank   | Historical world XYZ                                           | Box distance before crest → after crest (required <8 m for push-out) |
| ------------- | -------------------------------------------------------------- | -------------------------------------------------------------------: |
| Medium / east | (-3163.2892858326386, -683.1464822505408, -1225.2099228866077) |                                                  1.537095 → 9.360112 |
| High / west   | (-3560.0766535933194, -683.4531795296268, -1371.4533774318256) |                                                  0.663445 → 8.149165 |
| Medium / west | (-3557.4308128991584, -683.4689631139613, -1371.4533774318256) |                                                  2.919460 → 8.149165 |
| Low / west    | (-3496.5580549895044, -662.3061831088266, -1513.2715592500074) |                                                  5.144945 → 9.454784 |

Those historical comparisons are `a35a9c2 → 00d159b`, **not** the parent/current
range in this audit. This retune's parent/current wall/collider comparisons
are identical. The existing focused cases confirm the current defects remain;
we do not rerun or broaden 2950's contact investigation. Its smallest proposed
correction is to sample the deformed profile when determining the existing
wall-collider Z extents. That remains an owner-scoped collision decision;
2980/3050 and all four expected-failure assertions are untouched. See
[2950's original report](2950-S-verify-monterey-crest.md) for full evidence.

## Validation

- `npm test -- --configLoader runner --cache=false
tests/unit/montereyRubble1320.test.ts tests/unit/montereyBoulders.test.ts
tests/unit/scarpTerrain.test.ts tests/unit/montereyScarpSupport.test.ts
tests/unit/montereyFrameBudget.test.ts`: **exit 0**, **5 files, 20 passed +
  4 existing expected failures**, **31.40 s**.
  Log: `/tmp/3390-monterey/focused.log`.
- From each archived root, `./node_modules/.bin/vitest run --configLoader
runner --cache=false`: **exit 0**, **4 files / 21 passed** on each revision,
  **63.78 s parent / 61.66 s current**. These run the three unmodified
  archived rubble/boulder/scarp specs plus the temporary three-tier observation
  spec; original per-revision hashes pass without rebaselining.
  Logs: `/tmp/3390-monterey/{parent,current}.log`.
- Required `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`:
  **completed, exit 1**, `FAIL gates (e2e=none)`.
  Log: `/tmp/3390-monterey/gates.log`; detailed logs:
  `.cache/runs/20261023-092227-8-wTB0BT/`.
  Existing writable-config mode was used without changing tools or dependencies.
  **PASS:** config preparation, strict content, TypeScript/Vite production
  build, full units (**192 files, 3,837 passed + 4 existing expected failures,
  608.82 s**), attribution and repository-wide Prettier. The existing Vite
  chunk-size warning remains non-failing.
  **FAIL:** Python, **5 failures / 167 tests** (162 passed). Four unchanged
  `test_ci_build_manifest` cases fail at `spawnSync git EPERM`: environment
  restrictions on the fixture's child process. The unchanged golden-tooling
  test fails its partial/incompatible-set case (`golden-manifest.test.mjs:113`,
  assertion at line 151) with `Unexpected end of JSON input`; its underlying
  cause is not newly classified here. These match the previously recorded
  tooling failures; none is a rubble product failure. No unrelated repair or
  gate retry was attempted. The aggregate gate is **not green**.
- Final `./node_modules/.bin/prettier --write
plan/progress/3390-S-verify-monterey-apron.md`, the corresponding scoped
  `prettier --check`, and `git diff --check`: **exit 0**. Only the owned note
  is formatted. Final SHA/ownership/status checks retain the pinned HEAD and
  show only this progress note in this worktree. Finished/uncollected and
  concurrent worktrees remain independent and untouched.

## Simplicity and acceptance limits

Report only: no permanent test, production code, authored data, geometry,
hash, snapshot, count, threshold, budget, timeout, retry, skip, dependency,
setting, UI, guidance, layout, site branch or runtime config change. No tools
or DIRECTOR edits. No merge, push, tag, hosted-workflow dispatch or collection.
All seven simplicity rules are preserved without an exception. Real GMRT,
all 13 identities, five hero set pieces, scanning, Journal, marine life,
keyboard/pad/touch input, accessibility and the Arcade default are untouched.

The rubric is applied to numerical correctness, simple behavior and honest
evidence. Actual local e2e mode is **none**. CPU fixtures establish neither
visual quality/readability/composition nor browser, hosted, GPU, touch-layout
or real-phone performance acceptance. No visual improvement is assumed;
those judgments and the unfinished Sonnet apron work remain with Claude/owner.
