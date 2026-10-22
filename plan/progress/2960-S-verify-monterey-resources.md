# S-verify — Monterey resources and snapshot audit

Director Backlog item 9, **S-verify / S-bughunt [Codex, standing]**.
Clean resource result for the final merge; the historical 340-rock experiment's
908k failure is reproducible and was reverted. No retained test edit is needed.

## Range and ownership

- Pinned HEAD: `f8a4d49162d8172aa9a7c10237125e402ab30515`.
- Parent: `a35a9c2b1a56ac631147c9622a9e70a176ed7f81` (`00d159b^1`).
- Merge: `00d159b00c46d215727137658fe1490502f0ae1d`.
  Merge-to-HEAD changes only DIRECTOR and OVERNIGHT-LOG; audited source, data,
  tests and baselines are identical. “Current” below means merge/HEAD.
- Read Director direction, seven simplicity rules and rubric; newest evening
  review of 2026-10-21; run 79 (and run 80's parked silhouette context);
  `V-monterey-foot.md`; launched 2900–2970 briefs, available result files,
  prior Monterey tint progress and uncollected lifecycle/CI progress notes.
- Rechecked queue/launched files and active worktree status before writing.
  Main and this worktree were clean. Finished 2930 owns power/focus changes;
  2940 owns shell/touch e2e expectations; neither was collected here. 2920's
  tint scope remains separate. 2950 owns crest/collider tests; 2970 owns
  attachment tests. Their production and test files remain read-only here.

## Fixtures and counting

Temporary archives under `/tmp/2960-audit/{parent,current}` reuse the existing
`terrainMerge1140` flat sampler (`height=-100`, normal up), all five authored
Monterey props, each tier's normal prop generation and `countGeo` semantics.
Additional observations in those temporary copies record actual mesh index or
position counts, multiply by live `InstancedMesh.count`, and count each mesh
once as a potential draw. They do not apply visibility/LOD selection. “Live”
means populated instances, not buffer capacity or visible instances.

The surveyed variant reuses the `montereyWallLife` terrain fixture: shipped
heightmap, authored transforms and each tier's normal detail sampler, with
`detailSubdiv=1` to avoid unused terrain tessellation. This does not alter prop
quality or the terrain sampler. These are **all-full, prop-only** totals, not
frames. The independent inspection matrix uses the original default Medium
terrain settings, poses and visibility logic without that tessellation change.

Bytes below sum actual typed-array `byteLength`, counting each unique geometry
once within each prop's full tree. Attribute bytes exclude indices and instance
attributes; those are reported separately. Textures, materials, terrain,
JavaScript overhead and GPU allocation are outside these figures.

## Generated prop resources

All five props, full meshes only; P = parent, C = current. Draws are potential
mesh submissions in this fixture, independent of whether a camera sees them.

| Fixture    | Tier   | Draws P=C | Triangles P | Triangles C |  Delta |
| ---------- | ------ | --------: | ----------: | ----------: | -----: |
| Fixed flat | Low    |        30 |     284,010 |     284,010 |      0 |
| Fixed flat | Medium |        42 |     456,672 |     456,588 |    −84 |
| Fixed flat | High   |        42 |   1,250,401 |   1,250,102 |   −299 |
| Surveyed   | Low    |        30 |     284,010 |     284,010 |      0 |
| Surveyed   | Medium |        42 |     413,787 |     412,710 | −1,077 |
| Surveyed   | High   |        42 |   1,074,342 |   1,070,569 | −3,773 |

Live counts are identical P/C and fixed/surveyed. All four banks retain the
same counts independently; the marker retains 19 debris boxes and 7 cylinders.

| Tier   | Rocks per bank / all banks | Sponges per bank / all banks | Corals per bank / all banks |
| ------ | -------------------------: | ---------------------------: | --------------------------: |
| Low    |                      0 / 0 |                      23 / 92 |                     18 / 72 |
| Medium |                   96 / 384 |                     54 / 216 |                    42 / 168 |
| High   |                  160 / 640 |                     90 / 360 |                    70 / 280 |

| Fixture    | Tier   | Attribute bytes P=C |       Index bytes P → C | Instance matrix + colour bytes P=C |  Total full bytes P → C | Delta bytes |
| ---------- | ------ | ------------------: | ----------------------: | ---------------------------------: | ----------------------: | ----------: |
| Fixed flat | Low    |           6,129,568 |   1,611,048 → 1,611,048 |                             14,440 |   7,755,056 → 7,755,056 |           0 |
| Fixed flat | Medium |           8,338,164 |   1,916,628 → 1,916,124 |                             60,344 | 10,315,136 → 10,314,632 |        −504 |
| Fixed flat | High   |          25,873,528 | 11,629,044 → 11,625,456 |                             99,256 | 37,601,828 → 37,598,240 |      −3,588 |
| Surveyed   | Low    |           6,129,568 |   1,611,048 → 1,611,048 |                             14,440 |   7,755,056 → 7,755,056 |           0 |
| Surveyed   | Medium |           8,338,164 |   1,659,318 → 1,652,856 |                             60,344 | 10,057,826 → 10,051,364 |      −6,462 |
| Surveyed   | High   |          25,873,528 |   9,516,336 → 9,471,060 |                             99,256 | 35,489,120 → 35,443,844 |     −45,276 |

The five alternate impostor trees add an unchanged 5 meshes / 10,128 triangles,
723,072 attribute bytes, 72 index bytes and 1,444 instance bytes at every tier
and sampler. Their 724,588 resident buffer bytes are excluded from the table;
full and impostor trees are alternative LODs, not simultaneous frame work.

The larger crest profile is resampled to the existing fixed grid, so extra
profile control points do not add vertex buffers. Above Low, the existing
capped-wall buried-face filter evaluates the changed vertices against the same
ground sampler. Its retained indices change; total triangle/index bytes shrink.
This is not uniform per bank: surveyed west increases by 18 Medium / 117 High
triangles while the other changes reduce the aggregate. No new culling rule
or geometry trimming was introduced by this audit. High all-full prop totals
are not a demonstrated violation of the Medium visible-frame guard.

## Snapshot and apron buffers

The read-only Low snapshot is reproduced exactly at both revisions:

- P: `acb4529991a2c456788592b77493d19822ea278accf94b6267c424dd2e6eefb1`.
- C: `71fb6215af4b472132dcc6f715684828abeda8e09eb6d5141a399976d17af3b4`.
- Both: `{ draws: 30, triangles: 284010 }`.

The digest hashes geometry attribute names and arrays, indices and instance
matrices from **both full and impostor trees**. The draw/triangle fields count
only full meshes. The digest does not hash `instanceColor`, materials, textures
or visibility. A changed digest therefore does not imply more triangles or
more draws.

Per-bank buffer comparisons identify changed wall positions, UVs, normals and
colours; some end-cap index ordering changes at Low without changing index
length; wall-life instance matrices relocate; impostor positions follow the
changed volumes. The marker is identical. Attachment and collider correctness
remain with 2970 and 2950, respectively.

Across all four banks, three tiers and both samplers, apron **position, normal,
UV and index buffers are identical P/C**. Only their already-existing colour
values change; no colour attribute was newly allocated. All generated geometry
attributes were finite. Apron colours have item size 3 and exactly one tuple
per position, with the following unchanged counts/bytes:

| Tier   | Ledge tuples / colour bytes | East tuples / colour bytes | West tuples / colour bytes | Far tuples / colour bytes |
| ------ | --------------------------: | -------------------------: | -------------------------: | ------------------------: |
| Low    |              1,634 / 19,608 |            9,061 / 108,732 |             8,177 / 98,124 |           9,061 / 108,732 |
| Medium |              3,348 / 40,176 |           13,039 / 156,468 |           11,713 / 140,556 |          13,039 / 156,468 |
| High   |              5,270 / 63,240 |           16,133 / 193,596 |           14,586 / 175,032 |          16,133 / 193,596 |

Repeated builds of the existing seed-1140, `[70,26,36]` canyon fixture at each
tier produced identical finite apron colour buffers and matching tuple lengths
on both revisions. No aesthetic RGB thresholds or TerrainBiome tint contract
were imposed. The other three `terrainMerge1140` site snapshots pass unchanged.

## Existing Medium inspection budget

The unmodified fixture runs 128 scatter updates per sample at 1280/720, with
`wide`, `toe`, `oblique`, `high` and `cockpit` poses and −2/0/+2 m vertical drift.
Temporary copies add observations only. Camera ranges, radius, elevation,
azimuth, side offsets, ordering and all assertions remain unchanged. Additional
observations confirm identical camera world/projection matrices P/C for all
15 samples. Each sample counts 40 visible prop meshes P/C; terrain draws
are 50/50/51 (wide), 52 (toe), 49 (oblique), 8 (high) and 52 (cockpit).

`Terrain.update` chooses chunk LOD and counts chunks passing its sphere and box
frustum tests. `Props.update` chooses full/impostor/hidden using existing distance
and sphere tests. The spec then traverses visible prop meshes, additionally
frustum-testing those with `frustumCulled=true`, and multiplies live instance
counts. Instanced boulders rely on the prop cull. Scatter work conservatively
includes every streamed scatter mesh's live instances, without per-instance
frustum rejection. The headless terrain's internal scatter is inactive; the
spec's separate CPU-enabled Scatter supplies the explicit scatter count.

All samples count 413,279 P / 412,202 C visible prop triangles (the 508-triangle
marker is culled). Totals below include terrain + props + scatter + the existing
**225,000** reserve for life, sub and effects. The earlier terrain/props + 200k
guard also passes. These are **sampled frame estimates with a reserve**, not a
complete renderer or real-device measurement.

| Pose    | Drift m | Terrain P=C | Scatter P=C | Total P | Total C | C headroom to 900k |
| ------- | ------: | ----------: | ----------: | ------: | ------: | -----------------: |
| wide    |      −2 |     183,120 |      11,098 | 832,497 | 831,420 |             68,580 |
| wide    |       0 |     183,120 |      11,098 | 832,497 | 831,420 |             68,580 |
| wide    |      +2 |     185,424 |      11,098 | 834,801 | 833,724 |             66,276 |
| toe     |      −2 |     186,472 |      13,722 | 838,473 | 837,396 |             62,604 |
| toe     |       0 |     186,472 |      13,722 | 838,473 | 837,396 |             62,604 |
| toe     |      +2 |     186,472 |      13,722 | 838,473 | 837,396 |             62,604 |
| oblique |      −2 |     174,976 |      13,722 | 826,977 | 825,900 |             74,100 |
| oblique |       0 |     174,976 |      13,722 | 826,977 | 825,900 |             74,100 |
| oblique |      +2 |     174,976 |      13,722 | 826,977 | 825,900 |             74,100 |
| high    |      −2 |      69,632 |      33,920 | 741,831 | 740,754 |            159,246 |
| high    |       0 |      69,632 |      33,920 | 741,831 | 740,754 |            159,246 |
| high    |      +2 |      69,632 |      33,920 | 741,831 | 740,754 |            159,246 |
| cockpit |      −2 |     185,216 |      14,540 | 838,035 | 836,958 |             63,042 |
| cockpit |       0 |     185,216 |      14,540 | 838,035 | 836,958 |             63,042 |
| cockpit |      +2 |     185,216 |      14,540 | 838,035 | 836,958 |             63,042 |

Peak headroom improves from 61,527 to 62,604 triangles. This validates the
existing sampled budget only; it creates no new performance policy.

## Reverted experiments and exact overflow

History records `2e2dbcb` changing canyon boulders 160 → 230, `e69e813` changing
230 → 340, then `90f5a38` restoring 160 before the merge. Temporary copies of
the same current fixture/source with only the historical scarp file restored
reproduce the distinction:

- **230:** the complete inspection matrix passes; peak toe total 866,136,
  headroom 33,864. The existing canyon Medium count assertion independently fails
  with 138 rocks versus the pinned 96; its increased counts violate that
  separate contract. It is not itself a reproduced 900k overflow.
- **340:** the first sample fails the existing 225k-reserve assertion:
  `montereyFrameBudget`, Medium, `wide`, −2 m drift; terrain **183,120** + props
  **488,784** + streamed scatter **11,098** + reserve **225,000** = **908,002**,
  exceeding 900,000 by **8,002**. The run stops at that failure; no claim is
  made about later samples in that failed run.
- The same existing count assertion fails on the 340 experiment with 204
  rocks versus 96. These expected historical failures were run only in
  temporary copies, with no assertions changed.
- Minimal correction is the already-shipped restoration to 160 boulders.
  Final actual counts are 96 Medium / 160 High per bank, not either increased
  experiment. No production defect or final overflow was reproduced.

## Cross-preset isolation and simplicity

Existing tuff/hadal flat and sloped output-equivalence fixtures pass at all
three tiers against their original geometry, placement, material and collision
hashes. Independent temporary comparisons of the seed-1140 fixture also show
identical tuff/hadal full/impostor buffers, instance counts/colours, bounds and
colliders P/C. Existing non-canyon Low hashes and other-site snapshots pass.

Existing assertions already guard the relevant counts, tier isolation, Low
buffer finiteness/digest and streamed inspection reserve. The audit found no
meaningful missing resource/isolation guard to add. Only this progress note is
retained; no test, baseline, production file, data, tool or Director edit.
No limits, timeouts, retries or skips were added. No UI, setting, dependency,
site branch, config mutation or performance machinery. Arcade and all protected
exploration, discovery, life, input and accessibility behavior are untouched.

## Validation

- Focused owned specs: `npm test -- --configLoader runner --cache=false
tests/unit/montereyFrameBudget.test.ts tests/unit/terrainMerge1140.test.ts`:
  **PASS, 2 files / 11 tests**, 5.18 s.
- Temporary parent/current owned-spec copies plus resource observations:
  **PASS, 2 files / 12 tests each**, 26.86 / 26.61 s. Further frame observations
  use the same unchanged assertions; both 15-sample matrices pass.
- Existing non-canyon control selection: `scarpTerrain.test.ts -t
'scarp output equivalence.*(tuff|hadal)'`: **PASS, 6 tests each P/C**.
  Seven unselected tests per invocation are reported skipped by Vitest's name
  filter; no skip was added to a spec. Full gates run the unfiltered suite.
- Historical 230 matrix: **PASS, 1 test**, 5.69 s. Historical 340 matrix:
  **expected FAIL, 1 test**, 5.91 s, exact overflow above. Neither is current
  code. The existing canyon Medium
  count check also fails as expected in each historical copy (138 / 204
  received versus 96 expected); no current assertion was loosened.
- Required gate invocation: `GATES_CONFIG_MODE=writable bash tools/gates.sh
--no-e2e`, log `/tmp/2960-gates.log`, detailed logs
  `.cache/runs/20261021-034751-7-nrxXMr/`. Writable config mode is already
  provided by the tooling for the shared read-only dependency tree.
  **Completed, exit 1, `FAIL gates (e2e=none)`.**
- Gate **PASS**: writable config preparation, strict content validation,
  TypeScript/production build, all **192 unit files / 3,389 tests** (528.52 s),
  attribution and repository-wide Prettier. The existing non-failing Vite
  chunk-size warning remains.
- Gate **FAIL / environment block**: Python, **5 failures / 167 tests**.
  Four unchanged `test_ci_build_manifest` cases fail with `spawnSync git EPERM`
  (copy/provenance, manifest mismatches, missing outputs/workflow SHA and
  symlink/missing-data/overwrite cases). Unchanged `test_golden_tooling` fails
  with `Unexpected end of JSON input`. These match prior reported environment
  failures; no tooling or unrelated files were repaired. The aggregate gate
  is not green despite the clean resource checks.
- Final owned-note Prettier check and `git diff --check`: **PASS**. HEAD remains
  pinned; the sole retained change is this note. No merge, push or tag.
- Actual e2e mode: **none**. No browser, game render or screenshots. CPU geometry
  and buffers establish neither GPU behavior nor real-phone frame time.
  Readability, beauty, composition, visual Phone-OK and real-phone acceptance
  remain with Claude/owner.
