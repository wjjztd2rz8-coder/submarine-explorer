# S-verify — Blue Hole roof and apron numerical audit

Serves DIRECTOR.md Backlog item 10. Reviewed merge/bookkeeping commit
`8f2909798936be8e8ff836986bd90531e27d0bda`, tested at checkout
`7a0a14bbec4e0ec1ffc39b2d837a9bd69ed45db7`. The two production files are
identical at those commits. `8f29097` has one parent and changes only director/run
notes: the actual geometry delta is `4ac96b6..8f29097`, authored in `260be1b`
and formatted/snapshotted in `ef7f620`. Audited only the tilted ledge/painted
beds, notch/overhang/lip helpers and roof-rise math in
`src/world/props/geo/stalactites.ts:245–338,369–370`, and the widened/varied
`blueHoleApron` in `src/world/terrainFeatures.ts:169–186`.

Read the current director rules/rubric, newest review (2026-10-16 second),
V-bluehole-roof-2 progress, and prior results/progress:

- 2260 (`2260-S-verify-13.md`) verified the earlier gallery bank and occupied
  pendant footprint, before this roof/apron delta.
- 2290 (`S-verify-14.md`, merge `0533aec`) covered Beebe profiles, Challenger
  lander and related UI tests, not this geometry. Its retained last-result file
  is empty; the progress note and execution log supply the available outcomes.
- Completed 2300's worktree/progress (`S-verify-15.md`) pins `4ac96b6` and
  explicitly excludes later visual merges; its atoll/Monterey/Lost City guards
  do not audit these changes.
- Completed but uncollected 2330's result, `S-manifest.md` update and diff own
  sonar policy, the two site JSONs, shared manifest validation and sonar tests.
  Its worktree still has those changes; none were copied or edited here.
  Ownership was rechecked before validation. Titanic scatter and Beebe lamp/
  spire changes at this checkout are outside this audit.

Thus this numerical audit was not already completed. External result wrappers
label earlier gates PASS, while their inner reports document sandbox failures;
this report uses executed check outcomes, not those wrapper labels.

## Numerical evidence

A temporary headless Vitest harness loads the real survey tile and compares
current production code with **only these two files** replaced by their
`4ac96b6` versions. No source or snapshot files are swapped on disk. Both
versions construct both galleries on every tier; flat seating separately
isolates prop buffer/collider changes from the changed terrain. Evidence and
reproduction entry points are under `.cache/2340/` (`audit.ts`,
`vitest.config.mjs`, archived `before-*.ts`, `before.json`, `after.json`).

| Tier   | West / east minimum pendant-to-rendered-ground clearance (m) | West / east highest low-foot gap above rendered ground (m) | East seat rise (m) |
| ------ | ------------------------------------------------------------ | ---------------------------------------------------------- | ------------------ |
| Low    | 7.971717 / 1.761431                                          | 0.438455 / 1.041889                                        | 0.737082           |
| Medium | 13.227298 / 1.030942                                         | 0.434431 / 1.032909                                        | 0.737082           |
| High   | 6.093766 / 1.576376                                          | 0.785714 / 0.438766                                        | 0.900749           |

- All position/normal and other vertex buffers, bounds and collider endpoints
  are finite. Complete attribute/index/instance-buffer hashes, bounds and
  colliders repeat exactly from the authored seeds on all six prop/tier cases.
  Wall/apron meshes remain inside their reported bounds; all nonempty collider
  boxes overlap those bounds. These are intentionally separate checks: the
  approximate collision boxes do not fully enclose the rendered roof.
- Both galleries retain positive occupied-space ground clearance. Actual low
  vertices (within 4 m of each prop's lowest vertex) remain below the existing
  3 m floating-foot limit. The analytic grounding contract now runs on all
  tiers, retaining every original assertion.
- For 33 rays per gallery/tier at notch centres, shoulders and flanks at
  `z = -0.7 D`, previously solid sections remain solid. Restricting to rays
  whose old thickness exceeded the existing 0.4 m limit, current minimum
  west/east thickness is Low **0.600734/1.323439 m**, Medium
  **0.553582/1.416090 m**, High **0.667224/1.426387 m**. Counts are unchanged
  (28 west, 31 east). Peripheral tangencies/misses already existed; they are
  not promoted into a new art requirement. Underside heights differ by at
  most **1.5e-14 m**; east roof tops change by up to **2.315874 m**.
- The existing east close-camera contract passes at Low/Medium/High: hull
  sphere and eye sphere clear colliders, sub clears terrain, lip/apron project
  inside the existing 0.9 margins, mouth thickness exceeds 0.4 m and the
  cavity clears ground by more than 3 m. Added 15 explicit notch-centre/
  shoulder/flank rays per tier retain the same roof-thickness limit.
- Dense apron sampling: **173,761** points, bearings `[-pi, pi]` in half-degree
  increments, radii 110–170 m in 0.25 m increments. Range
  **[-7.630449, +1.299203] m**; analytic bounds are **[-9.86, +1.3] m**
  (four variable steps and the mound amplitude). At offsets of `±1e-5`,
  maximum sampled radial/angular jumps are **0.000043033/0.002492259 m**.
  The function vanishes outside 112–168 m and outside the existing gallery
  windows, is periodic, and is continuous through radial fades (112,120,160,
  168), gallery-window shoulders and wandering step transitions. Clipped
  mound derivatives can have corners; continuity does not imply C1 smoothness.
- Both authored gallery footprints get 9-by-9 rendered-height/normal samples
  on each tier (486 points), with finite, unit normals and sub-millimetre
  height changes at `1e-5 m` neighbour offsets. Ground heights can change by
  up to **2.105437 m** within those footprints, as expected from the apron;
  positive pendant clearance and grounding remain independently verified.
- The mission spawn and composed free-dive spawn each get a 13-by-13 grid at
  2 m spacing on every tier (1,014 points), plus continuity probes. All heights
  are finite. **All 507 mission-grid heights, both spawn-centre heights and the entire
  composed free-dive result are identical before/after.** Surrounding free-dive
  ground changes by at most **0.468947/0.470419/0.781189 m** (Low/Medium/High);
  spawn-centre hull-to-ground clearance stays **42.878890/43.145175/42.540748 m**.
  The remote mission spawn is outside the apron. The west seat remains fixed; the east seat rises as above,
  so the old general claim that the foot stays put needs that qualification.

## Bounds, snapshots and findings

No reproduced failure of the existing numerical, grounding, collision, camera
or budget contracts. No production change was necessary.

The collision envelope is approximate, not a watertight roof collider. In flat
seating, the west aggregate envelope is unchanged; the east envelope's forward
Z extent grows by **0.259583 m**, while its X/Y extents stay fixed. At High the
east visual roof reaches Z **-25.986780 m** versus aggregate collider-front Z
**-25.318164 m**: **0.668616 m** beyond it, previously **0.231848 m**. East
visual max Y becomes **11.603114 m**, versus collider max Y **10.337629 m**
(previous visual max **11.677588 m**). The raised roof already exceeded the
boxes before this delta. These bounds alone do not prove an unsafe navigable
contact or full containment. Existing collision surface/contact-resolution and
camera assertions pass unchanged; do not interpret the visual package's
“Colliders only grow relative to the visual” as a complete enclosure guarantee.
A broader roof collision redesign is outside this brief.

Reviewed the snapshot diff `260be1b^..8f29097` without updating any snapshots:

- Only the two Blue Hole authored props' buffer and placement digests change
  at Low/Medium/High in `props-geo`. The placement digest hashes **bounds and
  colliders**, not just a world transform. On flat seating, the west bounds
  remain identical but 67 collider boxes change; east bounds and 64 boxes
  change. Tilted ledge displacement explains both, with notch/lip rise and
  flank projection adding east roof changes. Roof position/normal/UV/colour
  buffers change; pendant and prop-sediment-apron buffers and indices remain
  byte-identical. No added topology or material/shader setting is hidden here.
- West triangle/draw counts remain **11,392/3**, **50,342/4**, **81,108/4**;
  east remains **9,656/3**, **43,098/4**, **71,676/4** (Low/Medium/High).
  Existing ceilings are unchanged.
- Only Blue Hole's aggregate buffer digest changes in `terrainMerge1140`;
  **6 draws / 21,048 triangles** remain unchanged. This flat-terrain fixture
  is explained by the prop wall changes, not by the analytic terrain apron.
- Other sites' snapshot entries and free-dive snapshots are unchanged by the
  reviewed delta. All focused golden comparisons pass against current frozen
  baselines. No snapshot bytes, assertions or budget limits were loosened.

Documentation qualifications, not simplicity-rule violations:
`terrainFeatures.ts:165–167` still describes equal-height, “lowering only” steps
clear of the seat; the new mounds allow positive height and reach the east seat.
`terrainFeatures.ts:192–193` describes the bank's unchanged analytic start,
not the combined apron/interpolated seat height. These comments should not be
used as invariants for the new apron. Authored geometry was left untouched.

## Simplicity and net change

No new simplicity-rule violation in the reviewed production delta. Existing
`hood`/manifest selection remains the discriminator; there is no added site-ID
branch, runtime config mutation, UI, guidance surface, layout patch, setting,
module or dependency. The feature-local notch table and bounded scalar helpers
extend the existing builder rather than introduce another geometry system.

This verification changes only the two existing Blue Hole capability specs
and this note. It adds explicit
full-buffer coverage for these authored galleries, shares the existing tier/
gallery loops and extends existing grounding/camera checks. Production net
change is **zero**; no on-screen element is added or replaced. No owner files
from other briefs are collected.

## Validation

- Initial focused run: **5 files / 99 tests passed**. Final focused run:
  **5 files / 111 tests passed**, **67.40 s**, including existing geometry
  snapshots, collision resolution and budget guards. Command:
  `npx vitest run tests/unit/blueHoleProps.test.ts tests/unit/blueHoleWall.test.ts tests/unit/blueHoleCollision.test.ts tests/unit/props-geo.test.ts tests/unit/terrainMerge1140.test.ts --configLoader runner --pool=threads --cache=false`.
- The new apron boundary assertion initially distinguished JavaScript `-0`
  from `+0`; corrected this new assertion to numeric zero tolerance. The final
  run passes. No existing regression assertion was changed for this correction.
- Before/after audit harness: **1 test passed per source version**. Invocation:
  `AUDIT_MODE=before` (then `after`) with
  `npx vitest run --config .cache/2340/vitest.config.mjs --configLoader runner --pool=threads --cache=false`.
- Final `npm run typecheck`, gate production build, strict content validation,
  attribution (14 assets), repository-wide Prettier and `git diff --check`:
  **passed**. An earlier typecheck caught an untyped attribute enumeration in
  the new test; the final explicit buffer-attribute typing passes.
- Required gate invocation:
  `GATES_CONFIG_MODE=writable PW_PORT=4234 bash tools/gates.sh --no-e2e`.
  Config, content and build passed. Python: **161/166 passed**; four existing
  provenance cases fail with `spawnSync git EPERM`, and the golden CLI tooling
  case fails with `Unexpected end of JSON input` from subprocess stdout.
  These match the earlier audit/slice reports. No tools or assertions changed.
- The gate's default fork-pool unit runner produced no output beyond its RUN
  header for five minutes and was interrupted (**exit 130**). Attribution and
  repository-wide formatting were then run separately and passed. The gate
  invocation is **not a pass**. No shipped runner configuration changed.
- Final full-unit thread-pool fallback: **192 files / 2,705 tests passed**,
  **371.96 s**, exit 0; no skips. Command:
  `npx vitest run --configLoader runner --pool=threads --cache=false --reporter=verbose`.
- Browser/e2e and golden game captures were **not run**, honoring this brief's
  headless-only constraint. No visual, GPU/performance or real-phone acceptance
  is claimed; appearance and phone rubric judgments remain with Claude/owner.

Logs: `.cache/2340/{baseline-focused,expanded,final-focused,typecheck,audit-before,audit-after,gates,unit-full,attribution,prettier}.log` and
canonical gate logs `.cache/runs/20261016-110923-8-y1daNk/`.
