# S-bughunt: Beebe lamps and crusted rims

DIRECTOR.md Backlog item 10; non-visual post-merge audit at `7a0a14b`.
No small correctness defect was confirmed. Changes extend two existing capability
suites; production source, authored tuning and snapshots remain unchanged.

## Scope and ownership

Read DIRECTOR.md, the newest review (2026-10-16 second), V-beebe-lighting's
progress, 2250's atmosphere-policy progress and available last-result artifact,
2290's `S-verify-14.md`, and 2320's `S-bughunt-16.md` and result artifact.
2320 audited `4ac96b6`; its legacy-credit finding remains outside this slice and
awaits the director's separate decision. It was neither resumed nor retested.

Reviewed merge `7a0a14b`, first parent `8f29097`, and implementation commits
`154759d`, `3bf1cab`, `9495084`, `73b415f`. The merge is HEAD and an ancestor of
this branch. Its implementation worktree is clean at `73b415f`; the director
reports no Claude package running. No remaining ownership of its spire/lighting
implementation was found. The launched briefs explicitly reserve this lane here.
During the audit, main advanced to documentation-only `2c3077f`, marking this
visual package DONE, and its completed worktree was removed. The ownership
recheck found no new overlap; this branch stays on the reviewed merge.

Read 2330's uncommitted sonar schema/data/test diff and its completion artifact;
it still owns `SiteManifest.ts`, `siteManifest.test.ts` and its site JSON.
Rechecked 2340/2350 worktree status and launched scopes: their roof/apron and
floor/scatter tests remain separate. None of those changes was collected.
No shared isolation snapshot, tools file or DIRECTOR.md was edited.

## Lamp composition and fallback

Validated Beebe data supplies `0.55 / 1 / 0.6 / 1` to the existing
`atmosphereSystem.init` consumer. That consumer selects deep-opening lamps first,
then manifest lamps, then the Headlights identity defaults. It passes
`ctx.effective.light`, resolved from pristine mode/equipment/Daily settings, to
`Headlights.setPreset`; the final multiplication reads that preset each time.
It does not multiply an already tuned light or mutate config/manifest/preset.

| Effective preset            | Each spotlight, parent → merge | Fill, parent → merge   | Spot / fill range |
| --------------------------- | ------------------------------ | ---------------------- | ----------------- |
| Arcade / default Custom     | 750 → 412.50000000000006       | 50 → 30                | 3250 / 220 m      |
| Realistic / low-light Daily | 500 → 275                      | 12 → 7.199999999999999 | 2600 / 80 m       |

Values are identical across Low/Medium/High. The decimal tails are normal binary
floating point multiplication. Colour, angle, ranges, water bands and other scene
lights retain their prior values. Hull light remains an atmosphere-band sample;
the new lamp table does not change it.

The parent comparison covers all 13 shipped sites plus `unknown`, three tiers
and Arcade/Realistic/Custom: **126 comparisons**, including **117 exact non-Beebe
matches**. It restores the actual parent Beebe manifest through the existing
lookup while using the unchanged consumer/resolver. Beebe differs only in the
three headlight/fill intensities. Existing numeric atmosphere snapshots remain
unchanged in this audit.

Nine new cases in `lowSweepReadability.test.ts` cover Beebe, a known site without
lamps (Axial) and a missing manifest (`unknown`) across all tiers. They exercise
both Custom base modes, every gameplay mode, ordinary/low-light Daily resolution,
three repeated applications, off/on and update. Exact composed values remain
finite, input JSON is unchanged, and the scene graph does not grow. Each preset
replacement disposes the previous shared beam geometry exactly once and gives
both beams the same replacement. Existing deep-lamp precedence coverage passes.

## Shared predicate, affected props and collision contracts

Traced every `tieredSpire` caller: smoker clusters, crusted chimneys, carbonate
towers and their rooted carbonate fingers. The newly reached condition is
`irregular && crust && !trunk`; existing irregular trunks already had torn rims.
Only Beebe declares smoker/chimney crust profiles in shipped manifests.

A direct parent/current builder comparison covers **24 shipped vent/spire props,
72 tier builds** across Lost City, Axial, Kamaʻehuakanaloa and Beebe. All **21
other props / 63 tier builds** retain exact buffer, bounds, collider, anchor and
cost evidence. Separate ordinary-spire fixtures compare position/normal/index
buffers with the actual parent primitive, including non-irregular crust,
irregular zero-crust and existing irregular trunks. All match exactly.

The complete affected shipped set is:

- `beebe-chimney-1`: six main/secondary cluster stacks at every tier. Its small
  parasitic spires omit irregular/crust options and are unchanged.
- `beebe-chimney-2`: trunk at every tier; one additional crusted side spire at
  Medium/High. Low's side spire has zero crust and is unchanged.
- `beebe-chimney-3`: trunk at every tier; two additional crusted side spires at
  Medium/High. Low's side spires have zero crust and are unchanged.

Twelve new primitive cases exercise both newly affected profiles, zero crust and
zero irregularity; each covers top fractions 0, 0.45 and 1, seeds 0/42/−7, minimum
segment/ring clamps and rounded/dense tessellation. Position/normal buffers and
indices are finite, deterministic and in range. Bounds remain finite, nonempty
and within the fixture's height/radius envelope. Options are frozen. Positive
height/base radius are the caller contract; zero tip radius remains supported.
Repeated builds of every affected shipped prop also match exactly.

| Prop            | Triangles Low / Medium / High, parent = merge | Draws |
| --------------- | --------------------------------------------- | ----- |
| beebe-chimney-1 | 18,010 / 88,022 / 148,058                     | 9     |
| beebe-chimney-2 | 1,214 / 8,420 / 16,304                        | 2     |
| beebe-chimney-3 | 1,114 / 7,864 / 15,472                        | 2     |

All impostor counts/buffers remain unchanged. The hero's 13 explicit collider
boxes, bounds, three side-mouth centres/normals and `ventTop` of
**27.84017557996292 m** remain exact. The smaller chimneys retain one body box
before decorative habitat expansion. Its base and horizontal extents remain
exact; its top follows the shorter rim:

| Prop            | Low top, parent → merge | Medium top          | High top            |
| --------------- | ----------------------- | ------------------- | ------------------- |
| beebe-chimney-2 | 9.488132 → 9.439518     | 9.488894 → 9.443954 | 9.490226 → 9.442785 |
| beebe-chimney-3 | 8.177513 → 8.165719     | 8.191744 → 8.178936 | 8.191801 → 8.179628 |

These are local metres, not world placement. Bounds-derived vent tops for these
two props therefore move by the same amounts; they are **not byte-identical
anchors**. `toPresetProps` still uses an explicit `ventTop` when present and
otherwise the current local bounds top, transformed through the prop root;
`VentPreset` still selects chimney sources first, sorted by height. Their base,
footprint and source order remain unchanged. This is the existing contract
following the authored rim geometry, not an additional collision/anchor fix.
The real-tile Beebe framing suite passes its collision-free spawn guard.

## Snapshot audit and simplicity

The merge changes three Beebe buffer hashes per tier in props-geo and Beebe
isolation, and six smaller-chimney placement hashes as accounted for above.
It changes the aggregate Beebe Low terrain-merge buffer hash while retaining
**13 draws / 20,338 triangles**, and three Beebe atmosphere entries for lamp
intensities only. No other site's snapshot changes. Existing golden guards and
budget ceilings were retained and exercised without rebaselining.

No production simplification was warranted: net production line change **0**;
no new abstraction, setting, dependency, runtime mutation, site branch, UI,
guidance surface or layout adjustment. Only capability coverage and this note
are added. No appearance, lighting, geometry/material, camera or gameplay value
was tuned. No game rendering, golden capture or visual/real-phone acceptance
was performed or claimed.

## Validation

- Initial focused run: **2 files / 137 tests pass**, 30.38 s.
- Final focused run, including beam resource assertions: **8 files / 232 tests
  pass**, 58.72 s. Suites: lowSweepReadability, props-geo, beebeIsolation,
  terrainMerge1140, beebeFraming, presets, ventHazeBudget and f2-modes.
- Actual-parent numeric audit: **1 test passes**, 40.72 s, containing the
  126 atmosphere and 72 builder comparisons above. Script, parent fixtures and
  numeric report: `.cache/beebe-audit/`; log `/tmp/beebe-parent-audit.log`.
  An initial temporary harness parse error was corrected; its first numeric run
  then exposed the smaller-chimney top changes described above. No shipped
  assertion was removed or weakened.
- Final `npx tsc --noEmit` passes; `git diff --check` passes.
- Required gate invocation:
  `GATES_CONFIG_MODE=writable PW_PORT=4360 bash tools/gates.sh --no-e2e`.
  Browser gates are explicitly excluded under this brief's no-render constraint;
  they are not claimed passed or sandbox-blocked.
- Gate log: `/tmp/beebe-gates.log` and
  `.cache/runs/20261016-110440-3-96mwVJ/`.
- Content and production build pass. Python: **161/166 pass**; four unchanged
  provenance tests fail at `spawnSync git EPERM`, and the unchanged golden
  comparison CLI case fails parsing empty JSON stdout. Both failure signatures
  are recorded in 2320's prior audit. No tooling or assertions were changed.
- Aggregate unit gate: **192 files / 2,714 tests pass**, 467.16 s. Attribution
  and repository-wide Prettier pass. The gate completes with **exit 1** solely
  from the five Python failures above. No browser checks ran. Gates are not
  green; this report does not substitute earlier external gate summaries for
  this worktree's executed results.
- Final package-only formatting and `git diff --check` pass. Changes remain
  uncommitted; no merge, push, tag or new Backlog item was performed.
