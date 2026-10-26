# S-collision — terrain lift sampling assessment

Backlog 10, brief 4320. Started 2026-10-25 at
`c99a71549f53945bd4565f40c5904b404b58773f`, initially clean.

## Plan

1. Locate and reproduce all four expected-failure Monterey contacts with the
   shipped terrain, wall triangles, prop placements and 8 m hull. Preserve every
   fixture assertion and witness.
2. Compare proxy and mesh sampling. Test a bounded replacement of averaged
   terrain lifts with sampled lower/upper bounds, using the existing samples,
   boxes and runtime resolver. Measure contact coverage and new obstruction of
   water; run existing geometry/contact guards without rebaselining them.
3. Keep a fix only if the original guards remain intact and the measurements
   support it. Otherwise restore experiments and report numbers. Keep all four
   cases pending the owner's decision.
4. Correct the separately reported Prettier failure in
   `plan/OVERNIGHT-LOG.md`, and verify all retained changes.

## Progress

Read Director and the 2950, 3300, 3330 and 3520 assessments. All four cases are
rows in the opening `describe.each` in
`tests/unit/montereyScarpSupport.test.ts`. The failed collision assertion is
`expect(collides).toBe(true)` inside its shared `it.fails` body. Fixture checks
are in `beforeAll`, outside the expected failure. No case is deleted.

The previous Lost City terrain seam fix did not recover these Monterey prop
contacts. The 3520 depth-extrema experiment recovered four positive witnesses
but newly obstructed water 9.182 m from the actual wall with an 8 m hull.
This run tests vertical terrain-lift bounds instead of repeating that change.

The orchestrator reported Python, content, build, units, smoke e2e,
project-base e2e and attribution passing; only Prettier failed, in
`plan/OVERNIGHT-LOG.md`. Prettier adds two blank lines around its final review
heading. File content and all assertions are unchanged. Targeted formatting
verification passes. The original external gate report remains a failed run;
a new aggregate pass has not been claimed.

### Current baseline

Temporarily promoted the four `it.fails` assertions to ordinary tests and
extended the same capability fixture with numerical diagnostics. All setup
checks, inputs, placements and assertions remained intact. Result:
**4 failed / 1 passed**, 15.97 s. All four ray hits have unit world scale.

| Contact     | Nearest own box (m) | Gap direction | Excess over 8 m hull (m) |
| ----------- | ------------------: | ------------- | -----------------------: |
| Medium east |   9.360112283916806 | downward Y    |        1.360112283916806 |
| High west   |   8.149165352155535 | downward Y    |        0.149165352155535 |
| Medium west |   8.149165352155592 | downward Y    |        0.149165352155592 |
| Low west    |   9.454784464379138 | positive Z    |        1.454784464379138 |

`extrudeProfile` deforms each section at its own X: raw Y is scaled by the
local pinch/skyline, lifted by `lift(x, rawY)`, and lowered by the end sink.
`wallColliders` instead uses a segment-minimum height multiplier, samples Z
from raw profile intervals with displacement at the interval midpoint, and
averages each boundary's terrain lift across five X samples. The raw profile
slice that determines depth therefore does not consistently describe rock at
the box's emitted Y interval. The shared sphere/box resolver correctly rejects
all four distances above 8 m; it is not dropping valid box contacts.

### First bounded experiment: lower/upper lift bounds

Replaced four lines in `wallColliders`: initialise `dyA/dyB` with
`Infinity/-Infinity`, then accumulate `Math.min(dyA, at(y0))` and
`Math.max(dyB, at(y1))` instead of their averages. This reuses existing samples
and collider counts and adds no per-frame work or site branch.

All four contact assertions pass as ordinary tests. Nearest own-box distances:
**7.633422042231871 / 2.5790750141192404 / 2.2937779628320243 /
7.27824879733555 m**, in the table's order. The full focused run reports
**21 passed / 9 failed**, 42.39 s. All nine output-equivalence guards fail;
no digest is changed. The 12 collider checks and the four other terrain/anchor
checks pass. No new empty-water obstruction appears in the initial **53**
exposed-front probes, offset 12 m toward local negative Z; this limited sample
does not establish safety.

The positive contacts need only the upper lift bound, so a second experiment
removes the lower-bound change and broadens the water probes before deciding
whether any correction can be retained.

### Second experiment: upper lift bound only

Two line replacements in `wallColliders`, with the lower lift unchanged:

```diff
-      let dyB = 0;
+      let dyB = -Infinity;
 ...
-        dyB += at(y1) / xs.length;
+        dyB = Math.max(dyB, at(y1));
```

All four ordinary contact assertions still pass at exactly the first
experiment's distances. Focused result: **21 passed / 9 failed**, 47.61 s.
The nine existing equivalence failures change geometry and collision digests;
placement and material digests remain unchanged. No assertions or digests are
weakened. The same boxes also generate the distant impostor, so this alters
rendered proxy geometry beyond the four contacts.

The existing collider counts stay unchanged, but most boxes grow vertically:

| Contact fixture | Total boxes | Boxes changed | Largest top increase (m) | Exterior probes |
| --------------- | ----------: | ------------: | -----------------------: | --------------: |
| Medium east     |         206 |           182 |        31.79387167501683 |             172 |
| High west       |         214 |           190 |       11.374107511028278 |             244 |
| Medium west     |         214 |           190 |       11.571324126338851 |             252 |
| Low west        |         214 |           190 |       10.498581845289031 |             136 |

For the wider check, cast front-facing +Z rays at local X/Y offsets from
−48 to +48 m in 8 m steps around each original witness. Retain the same
below-sea-level, >100 m seabed-clearance and normal-Z <−0.25 conditions.
Move each exposed hit 10, 12, 16 and 20 m toward negative Z, before the first
ray hit. This yields **804 exterior probe points**. Of these, **58** newly
intersect an own-wall box with the 8 m hull. Compare those points with every
indexed wall triangle using `THREE.Triangle.closestPointToPoint`; **one** is
more than 8 m from the actual wall:

- Fixture: Medium west, offsets X +32 m, Y −8 m, Z −20 m from its ray hit.
- Local point: `(13.818181818181756, 119.23810102354105, 46.482931111519065)`.
- Nearest indexed wall triangle: **11.234917766705774 m**.
- Original nearest own-prop box: **10.910110666949826 m**.
- Candidate nearest own-prop box: **6.595954351528894 m**.

These distances use the unit-scale local wall frame and include all indexed
wall triangles and own-prop boxes, including apron boxes. The free-water
finding concerns the wall proxy relative to the wall mesh; it is not an exact
collision claim for every separate decorative mesh. This is a concrete new
proxy obstruction, independent of the equivalence failures. Upper lift bounds
recover contacts by growing boxes across terrain/bench variation rather than
correcting which deformed profile interval occupies the emitted height.
Rejected and restored.

## Decision

**No safe small fix retained. All four expected-failure cases remain unchanged.**
The two-line upper-lift change repairs four positive contacts but introduces
the measured obstruction and fails nine unchanged guards. The four-line
variant also fails those guards and adds unnecessary lower growth. Neither
corrects the raw-profile/deformed-height mismatch. No hull padding, site
branch, setting, new proxy representation or runtime operation is introduced.
No output baseline is re-recorded and no owner decision is pre-empted.

A repair still needs depth bounds sampled from the deformed wall at each
emitted height, preserving the existing taper and undercuts. This run does
not establish a compliant replacement. It reports the bounded experiments
and their limits, without claiming that every build-time correction is unsafe.

Only this progress note and the requested two-blank-line formatting fix in
`plan/OVERNIGHT-LOG.md` are retained. No UI or guidance surface is added or
replaced. Production code, data, tests and Director remain unchanged.

## Validation

Experiments and final checks use the existing capability specs:

```sh
npm test -- tests/unit/montereyScarpSupport.test.ts --configLoader runner --cache=false --maxWorkers=1
npm test -- tests/unit/montereyScarpSupport.test.ts tests/unit/geo-colliders.test.ts tests/unit/scarpTerrain.test.ts --configLoader runner --cache=false --maxWorkers=1
node_modules/.bin/prettier --check .
git diff --check
```

Baseline instrumentation and both candidates are temporary. Original production
and test files were saved before editing and restored byte for byte before the
final run. Raw logs, diagnostic fixture, source patch and probe JSON are in
`/tmp/scarp-4320/`: `baseline.log`, `baseline-boxes.log`, `lift-bounds.log`,
`upper-lift.log`, `baseline/`, `lift-bounds/`, and the four top-level JSON files
for the second experiment. `support.diagnostic.ts` preserves the probe code;
`upper-lift.patch` preserves the rejected two-line production experiment.

The orchestrator's supplied gate run used **smoke + project-base** and reported
all checks passing except Prettier. This sandbox does not rerun Vite or Chromium.
The formatting correction addresses its sole reported failure; no fresh
aggregate gate or browser result is claimed.

Final restored-state results:

- **PASS** focused capabilities: **3 files / 26 passed / 4 expected fail
  (30 total)**, 45.23 s, exit 0; `final-focused.log`. The four expected failures
  record unrepaired contacts, not successful collision coverage.
- **PASS** repository-wide Prettier, exit 0; `prettier.log`. The orchestrator's
  reported formatting failure is corrected.
- **PASS** original source/test byte comparisons, `git diff --check`, and empty
  tracked diffs for `src/`, `tests/`, `data/`, `tools/` and Director.
- Retained files: `plan/progress/4320-S-collision-seam.md` and
  `plan/OVERNIGHT-LOG.md`. No cases deleted, assertions loosened, source changes,
  dependencies, merge, push or tag.
