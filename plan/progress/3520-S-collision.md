# S-collision — smallest scarp correction assessment

Director item **S-collision**, brief **3520**. Started 2026-10-23 at
`ccef323` in the registered worktree. Initial working tree clean.

## Plan

1. Reproduce the four real-tile, real-triangle contacts with ordinary assertions;
   inspect the nearest proxy boxes rather than altering witnesses or hull radius.
2. Try bounded corrections to the existing build-time proxy calculation. Keep
   site branches, per-frame work, additional proxy representations, blanket
   padding and digest rebaselines out of the solution.
3. Retain a correction only if at least two original contacts pass for real and
   the existing geometry/contact contracts remain defensible. Otherwise restore
   experiments and report the exact obstacle. Keep all four cases.
4. Run `tools/gates.sh`, record its actual results and deliver a final report.

## Progress

Read Director's simplicity rules and the 3330/3300 assessments. The four cases
exercise Monterey prop boxes; the separate Lost City terrain seam candidate
cannot satisfy them. Completed two bounded build-time proxy experiments below.

### Baseline mechanism

Promoted the four existing assertions to ordinary `it` temporarily. Fixture
validation remained outside the assertions: shipped indexed wall triangles,
front-facing normals, below sea level, more than 100 m above the surveyed
seabed, all authored props loaded, hull radius exactly 8 m. No witness, terrain,
placement or hull setting changed. Result: **4 failed / 1 passed**, 13.93 s.
The nearest-box displacement is in local wall coordinates:

| Contact     | Nearest box distance (m) | Displacement toward box (m) |
| ----------- | -----------------------: | --------------------------- |
| Medium east |        9.360112283916806 | Y −9.360112283916806        |
| High west   |        8.149165352155535 | Y −8.149165352155535        |
| Medium west |        8.149165352155592 | Y −8.149165352155592        |
| Low west    |        9.454784464379138 | Z +9.454784464379138        |

For the first three contacts the next box upward is also beyond the hull, in
Z: 9.648709089599606, 8.68553717022158 and 11.331377864382631 m respectively.
The boxes are present, transformed correctly and too far away. A guard in the
sphere/box resolver cannot recover missing rock without accepting contacts
outside the configured hull. The defect is the proxy's raw profile intervals
being assigned to segment-minimum scaled heights and averaged terrain lifts.
The actual wall at those heights can belong to a lower, more protruding profile
interval. This agrees with the earlier crest analysis; it is not a terrain
sampler seam or a missing collision-enable flag.

### Candidate 1: replace depth averages with sampled bounds

Temporary source change: initialise `front/back` to `Infinity/-Infinity`, and
replace `front += lo / xs.length; back += hi / xs.length` with
`front = Math.min(front, lo); back = Math.max(back, hi)`. Four replaced lines,
no new function, sample, box or per-frame operation. This is a smaller candidate
than the previous 41-line envelope addition.

With the four assertions ordinary, the focused run reports **21 passed / 9
failed**, 38.08 s. All four requested contacts pass and the 12 existing collider
checks pass. All nine scarp equivalence cases fail: geometry and collision
change, while placement and material digests remain unchanged. Depth extents
also generate the visible distant impostors for all three presets/tiers.
No digest was updated.

A separate numerical check rejects this as a safe correction independently of
the hashes. Around each original witness, cast rays at X/Y offsets
`[-16, -8, 0, 8, 16]` m; retain exposed front-facing hits, then move each point
12 m toward local −Z. This yields 55 points across the four fixtures. Measure
distance to every indexed triangle of the full wall with
`THREE.Triangle.closestPointToPoint`, and distance to every own-prop box.
One point becomes newly obstructed despite an 8 m hull not touching the wall:

- Medium east local point:
  `(-127.36363636363649, 167.02843730848144, 17.937740441909682)`.
- Nearest actual wall triangle: **9.18153284782422 m**.
- Original nearest own box: **11.840300942417729 m**.
- Candidate nearest own box: **7.319133914086634 m**.

The point is before the first +Z ray hit, outside the rock. These are own-wall
proxy distances, not a claim of exact collision with every decorative mesh.
The candidate repairs the positive witnesses by expanding the proxy into more
water. Taking extrema of the same misregistered raw slices does not correct
the raw-height/deformed-height mismatch. Rejected and restored.

### Candidate 2: reduce the wall slice count

Changed only the build-time literal `9` → `8` in `buildScarp`'s
`wallColliders` call. It reduces rather than increases the number of per-frame
boxes, but changes the vertical partition and its impostor. Result: **17 passed /
13 failed**, 40.75 s. All four original contact assertions still fail, along
with all nine geometry/collision equivalence cases. The 12 ordinary collider
checks still pass. It recovers zero requested contacts. Rejected and restored.

## Final decision

**No compliant small fix established; retain all four expected-failure cases.**
The eight-line extrema diff (four replacements) can make all four positive
witnesses green at unchanged frame cost, but the measured new empty-water
obstruction rejects it. The one-literal reduction recovers none. Neither is
retained. No production, data, test, digest or Director change is delivered.

The narrow repair boundary is `src/world/props/geo/scarp.ts:1113`: profile Z
crossings are taken at raw `y0/y1`, before `up(y0/y1)` and per-slice terrain lift
produce the box's emitted Y range. Correct depth bounds must instead correspond
to that emitted range at each X sample. Extrema alone, a new contact guard, or
a uniform pad do not provide that correspondence. The existing sphere/box
resolver correctly rejects every nearest distance above 8 m. `Props.place`
already enables the boxes; there is no missing enable flag to fix in data.

Existing per-site data exposes dimensions, placement, scale and collision kind,
not an independent scarp proxy profile. Changing placement/scale moves mesh and
proxy together; changing dimensions/profile is a visual geometry change rather
than a guard for the existing shipped rock. Switching to a whole-prop sphere
would obstruct water around the hundreds-of-metres-wide banks. Adding new
per-site collider settings or collision/visual proxy copies adds machinery.

A follow-up could **replace**, rather than augment, the raw-slice builder with
one based on deformed profile sections and validate the changed impostors.
That can remain build-time work; per-frame expansion is not inherently needed.
This run establishes why the tested small substitutions fail the constraints,
not a proof that every possible future build-time algorithm must be large.
The earlier 2980/3050 candidates were not imported or modified; the separate
Lost City terrain sampler issue is outside these four cases.

## Validation and reproducibility

Experiments used the existing capability specs, with no assertion or digest
relaxation. Contact assertions were ordinary only during experiments; fixture
validation remained independent. All source/test changes were restored byte
for byte against saved originals before the aggregate gates. Final diff checks
and gate outcomes are recorded below.

```sh
npm test -- tests/unit/montereyScarpSupport.test.ts --configLoader runner --cache=false --maxWorkers=1
npm test -- tests/unit/montereyScarpSupport.test.ts tests/unit/geo-colliders.test.ts tests/unit/scarpTerrain.test.ts --configLoader runner --cache=false --maxWorkers=1
GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e
```

Raw logs and temporary diagnostic source/patches are under `/tmp/scarp-3520/`:
`baseline.log`, `baseline-probes.log`, `extents.log`, `extents-probes.log`,
`eight-slices.log`, `gates.log`, and per-fixture `baseline-*.json` /
`extents-*.json` probe measurements. Successful-test stdout was not retained by
the runner, including with `--disableConsoleIntercept`; the probe runs therefore
write their measurements directly to those JSON files. This does not affect
assertion results. No temporary diagnostic is shipped.

The sole deliverable is this plan/progress/final report. Runtime cost, settings,
guidance, site behavior and UI have zero retained changes. No cases deleted,
no package comments in code, no site branches, no new dependencies, no merge,
push or tag. Browser tests are disabled for the retained documentation-only
result and Director's numeric-only Codex scope; no visual acceptance is claimed.

### Final gate results

`GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e` completed with
**exit 1**. Actual e2e mode: **none**. Detailed gate logs are in
`.cache/runs/20261023-180547-34-prs7r4/`; aggregate transcript:
`/tmp/scarp-3520/gates.log`.

- **PASS** config preparation, strict content, TypeScript plus production build,
  attribution (14 assets), and repository-wide Prettier.
- **PASS** full units: **192 test files / 4,072 passed / 4 expected fail
  (4,076 total)**, 668.87 s. These include the restored original collision
  cases; the expected failures are not repaired contacts.
- **FAIL** Python: **5 failures / 167 tests**, 10.389 s. Four unchanged
  `test_ci_build_manifest` fixtures fail at child `spawnSync git EPERM`.
  `test_golden_tooling` fails in the nested golden comparison test at
  `tools/tests/golden-manifest.test.mjs:151`, parsing empty CLI JSON:
  `Unexpected end of JSON input`. The latter cause is not classified further.
  These match the failures already recorded in the earlier crest audit; no
  Python/tooling changes were part of this run.
- **PASS** final changed-note formatting, `git diff --check`, byte comparisons
  of restored source/test against their saved originals, and empty tracked
  diffs for `src`, `tests`, `data`, `tools` and Director. `git status --short`
  shows only this new report.

No gate failure was waived or repaired outside this task. The aggregate gate
is not green despite the passing unit/build checks. No rendering or real-phone
acceptance is inferred from headless geometry tests.
