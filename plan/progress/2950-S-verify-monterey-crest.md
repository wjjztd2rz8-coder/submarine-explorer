# S-verify — Monterey crest, bounds and collision

Director Backlog **9, S-verify / S-bughunt [Codex, standing]**, specifically
**S-verify**. **A collision regression is reproduced.** Exported wall/apron
bounds, finite buffers, tapered-end height limits and relative-ground offsets
check out. Four sampled hull contacts disappear after the profile merge;
this is not a clean collision audit or piloting acceptance.

## Provenance and scope

- Checkout: `f8a4d49162d8172aa9a7c10237125e402ab30515`.
- Audited merge: `00d159b00c46d215727137658fe1490502f0ae1d`.
- Actual first parent: `a35a9c2b1a56ac631147c9622a9e70a176ed7f81`.
- Actual second parent: `0f0607663b48405a68b89295cb22d3fdb5606a8f`.
- Range: `00d159b^1..00d159b`, read from the merge's parent records.
  Only Director and overnight-log documentation differs between merge and checkout.
- Read Director rules/rubric, newest 2026-10-21 evening review, overnight runs
  79–80, V-monterey-foot, the last ten launched briefs (2860–2950), available
  results and progress, and queued 2960/2970. Wrapper PASS summaries are not
  browser-execution evidence. Rechecked registered worktrees before writing:
  main and 2920 clean; 2930 has power/overlayFocus changes and its note;
  2940 has d-shell/hud-touch spec changes and its note. Their work is untouched.
  Finished 2900/2910 evidence was read; their changes are already in this checkout.
- V-monterey-foot remains DONE. No Blue Hole work, opening changes, visual
  follow-up, resource/snapshot audit (2960), or attachment-matrix audit (2970).
  No production, authored data, snapshot or test edits. Only this note is retained.

## Geometry and consumers

The canyon profile replaces `[.93,.12], [1,.17]` with
`[.83,.11], [.85,.19], [.91,.20], [.93,.27], [.97,.28], [1,.31]`
(normalized Y/Z). The other production change multiplies apron vertex colours.
`buildScarp` supplies the profile to both `extrudeProfile` and `wallColliders`.
The collision digest includes **bounds, every box, and collisionSurfaces**;
it does not mean collision stayed unchanged. No collisionSurfaces are exported
on either revision.

`extrudeProfile` resamples the entire closed profile by arc length before
extruding and applying displacement, skyline/pinch, sink and terrain lift.
Changing the upper polyline therefore moves sample locations on lower/rear
faces too. Sampled maximum Y need not remain identical even though normalized
profile height remains 1. Bounds are the wall/apron union, rather than a
promise to enclose every decoration or every proxy box.

`wallColliders` retains nine raw-height slices per X segment. It averages
front/back Z across five X samples, while using the segment's minimum height
scale and terrain lift for its Y limits. This intentionally produces coarse
boxes, rather than triangle collision. `Props.place` transforms their centres,
half extents and rotation into world box colliders. The impostor is built from
the boxes; exported bounds determine the prop culling sphere and LOD distance.
All placed box centres/half extents matched the local-box transforms in the
12 shipped tier/prop cases. Impostor extrema matched Float32 box-union extrema.

## Sampling and independent evidence

Scratch roots: `/tmp/2950-crest-audit/{parent,merge,profile-only}/`, created
from `git archive` of the actual revisions, with shared read-only dependencies.
The fixture uses Three and the existing `projectedRaycast` broad phase: every
hit is against actual indexed triangles, without an analytic wall-height oracle.
No renderer or browser was constructed.

| Fixtures, each Low / Medium / High  | Dimensions W/D/H (m) | Seed / ground                           |
| ----------------------------------- | -------------------- | --------------------------------------- |
| Original small unsnapped baseline   | 32 / 16 / 24         | 42; no ground callback                  |
| Original terrain-following baseline | 70 / 26 / 36         | 17; `.045*x + .025*z`                   |
| canyon-wall-ledge                   | 140 / 50 / 64        | 2553216508; shipped survey/heading 180° |
| canyon-wall-east                    | 700 / 110 / 170      | 900467350; shipped survey/heading 270°  |
| canyon-wall-west                    | 800 / 100 / 150      | 2898390540; shipped survey/heading 90°  |
| canyon-wall-far                     | 500 / 110 / 190      | 1134280944; shipped survey/heading 270° |

All 18 cases per revision have finite wall/apron/impostor attributes, valid
triangle counts/indices, matching position/normal lengths, finite nonempty
positive box extents, and bounds exactly equal to an independent scan of stored
wall/apron positions. Bounds witnesses retain actual extremal vertex IDs/XYZ.
This does not prove every triangle is nondegenerate or every decoration is inside
the exported bounds.

Horizontal rays use X/W = ±.499, ±.47, ±.43, ±.35, ±.2 and 0, covering tapered
ends and inner spans. Their Y levels are ground plus parent sampled crest height
times `.04,.1,.3,.6,.74,.77,.8,.82,.84,.85,.88,.9,.92,.93,.95,.97,.99,1.02`.
The merge uses the same parent ray coordinates. Downward rays use those Xs and
Z/D = `0,.1,.15,.2,.25,.3,.35,.45,.7`, crossing benches and rear faces.
There are **3,564 horizontal and 1,782 vertical probes per revision**, plus
**3,168 horizontal probes through box centres**. Horizontal/vertical hit counts
are 1,945/1,401 in the parent and 1,937/1,390 after the merge. Misses at tapered
or absent faces are retained, not treated as failed contact assertions.

The final matrix uses full default Terrain configurations and all four banks.
An earlier reduced terrain-mesh fixture (`detailSubdiv=1`, preserving sampler
settings) gave identical contact reproductions; full default reruns confirmed
them. The final contact check also loads **all authored props**, so another
bank cannot silently supply the missing collision.

## Every collision/bounds field change

Substantive box changes are **min.z only**, in the highest retained raw slice
of each affected X segment. Counts stay 74/146 for the two baselines and
209/206/214/207 for ledge/east/west/far, at every tier. All min/max X/Y fields,
lower wall boxes and talus boxes are unchanged. Small max.z roundoff is listed
below. Existing undercut corridors are not closed by these shrinking boxes.

| Fixture     | Changed min.z boxes | Low Δmin.z range (m) | Medium = High Δmin.z range (m) |
| ----------- | ------------------: | -------------------: | -----------------------------: |
| Small flat  |                   8 |     .616466–1.381774 |               .620412–1.333208 |
| Small slope |                  15 |     .957432–2.187347 |               .965521–2.130078 |
| Ledge       |                  21 |    1.785940–4.377161 |              1.845870–4.107759 |
| East        |                  20 |   4.088156–10.232860 |              4.153605–9.004112 |
| West        |                  21 |    3.693593–8.292647 |              3.739522–8.127534 |
| Far         |                  21 |    3.979358–9.307080 |              4.068049–8.945268 |

max.z changes only through reconstruction of box centre/half extent, within
2.85e-14 m: slope M/H indices 9,90; ledge Low 24 and M/H 114,132,168;
east Low 10 and M/H 10,73,145,154; west Low 18,36 and M/H 45;
far M/H 4,13,157,175. No other box fields change. Full indices and exact
per-field deltas are retained in `/tmp/2950-crest-audit/field-deltas.json`.

Every changed exported bound is below (merge minus parent, metres; omitted
components are exactly unchanged):

| Fixture     | Tier   |       Δmin.z |      Δmax.y |      Δmax.z |
| ----------- | ------ | -----------: | ----------: | ----------: |
| Small flat  | Low    |  -.195670128 | +.015638351 |           0 |
| Small flat  | Medium |            0 | +.015642166 |           0 |
| Small flat  | High   |            0 | -.053737640 |           0 |
| Small slope | Low    |  +.461463928 | +.015785217 |           0 |
| Small slope | Medium |            0 | -.053848267 |           0 |
| Small slope | High   |            0 | +.035499573 |           0 |
| Ledge       | Low    |            0 | +.012527466 |           0 |
| Ledge       | Medium |            0 | -.091728210 |           0 |
| Ledge       | High   |            0 | -.003555298 |           0 |
| East        | Low    | -6.718643188 | -.041198730 |           0 |
| East        | Medium |            0 | -.041442871 | -.007843018 |
| East        | High   |            0 | -.024230957 | +.018768311 |
| West        | Low    |  -.301651001 | -.179031372 |           0 |
| West        | Medium |            0 | -.177215576 | -.666442871 |
| West        | High   |            0 | -.078521729 | +.239715576 |
| Far         | Low    | -2.544929504 | +.141616821 |           0 |
| Far         | Medium |            0 | +.141616821 | -.812316895 |
| Far         | High   |            0 | -.073440552 | -.015625000 |

The stored-vertex extrema explain these differences independently of cached
bounding boxes. For example, Medium east max.y changes from wall vertex 24840
at `(149.13043212890625,256.68182373046875,115.72981262207031)` to vertex
24839 at `(149.13043212890625,256.640380859375,114.71160125732422)`.
All apron positional extrema are identical. Low flat min.z switches from the
apron's -6.56414270401001 to the resampled wall's -6.759812831878662.
Higher-tier rear max.z differences likewise come from actual resampled wall
vertices, without changing the rear profile endpoints.

For isolation, a third archived fixture applies **only** the new profile to
the first parent, retaining parent apron colours. All 18 evidence payloads
(bounds, every collider field, extremal witnesses, rays and impostor bounds)
are **exactly equal to the complete merge**. This attributes every listed
collision/bounds change to the profile, not apron colouring. It also explains
the changed collision digest in each preserved canyon baseline; no baseline
was rewritten. This is separate from 2960's buffer/resource accounting.

## Reproduced contact regression

At each point below, a +Z ray hits an exposed wall triangle; face normal Z is
less than -.25. Centre an existing **8 m hull sphere** on that actual hit and
call `Props.collide(worldPoint.clone(), config.submarine.hullRadius, normal)`.
With all authored props loaded and full default terrain, it pushes the sphere
in the parent and returns **false**, leaving the sphere unchanged, after the
merge. These centres are more than 100 m above their sampled seabed and remain
below sea level. This does not impose exact box/mesh equality or a new clearance
tolerance: the existing hull sphere intersects an actual triangle at its centre.

| Tier / prop   | Local X,Y (same ray on both revisions)  | Parent → merge hit Z                      | Nearest own box distance, parent → merge (m) |
| ------------- | --------------------------------------- | ----------------------------------------- | -------------------------------------------- |
| Medium / east | -111.36363636363637, 167.02843730848141 | 31.93423207579987 → 32.55516814378878     | 1.5370950191032122 → 9.360112283916777       |
| High / west   | -18.181818181818187, 126.9591006339439  | 52.05508174749568 → 52.149409456787296    | .6634453346846385 → 8.149165352155563        |
| Medium / west | -18.181818181818187, 127.23810102354102 | 49.799066656253714 → 49.50356876262623    | 2.9194604259266015 → 8.149165352155563       |
| Low / west    | -160, 147.57527326112694                | -14.918635847496951 → -11.369189147027626 | 5.144945125595761 → 9.454784464379209        |

Exact current world XYZ, respectively:

- Medium east: `(-3163.2892858326386,-683.1464822505408,-1225.2099228866077)`.
- High west: `(-3560.0766535933194,-683.4531795296268,-1371.4533774318256)`.
- Medium west: `(-3557.4308128991584,-683.4689631139613,-1371.4533774318256)`.
- Low west: `(-3496.5580549895044,-662.3061831088266,-1513.2715592500074)`.

Primary case: Medium east box 55 retains X `[-129.8181818181818,-92.90909090909092]`,
Y `[157.66832502456464,176.3885495923982]`, and max.z `96.67632357588496`.
Its min.z retreats **33.47132709490308 → 42.20387723338831**, or 8.73255013848523 m,
while the actual ray face retreats only .62093606798891 m. Its normal changes
from `(.7626003434,-.2862864216,-.5800696519)` to
`(.8365355478,.1742465653,-.5194674308)`. The nearest adjacent box also remains
more than 8 m away, so checking only box 55 is not the explanation for the miss.

**Mechanism / proposed minimal correction, not implemented:** the proxy's top
raw-profile interval retreats at the new ledges, while its segment-minimum
height scaling and terrain lift place that interval beside lower parts of the
actual wall. The exact samples above demonstrate the resulting undercoverage.
Change Z-extent sampling in existing `wallColliders` to include deformed profile
crossings/corners over the emitted slice's actual Y interval at its existing X
samples. Preserve existing slice counts, overlap, end-height caps and open
undercut heights. Validate that local correction against these contacts and
existing undercut/taper tests. The proposed correction has not been implemented
or validated; no profile tuning, global clearance increase or production change
is authorized here.

**Missing guard:** existing fixed hashes and smaller collider fixtures pass
without exercising this shipped upper-slice contact behavior. A regression
expecting `contact === true` passes four cases on the parent and fails all four
on the merge in the isolated copy of the existing headless fixture. This
failing reproduction is retained in scratch `tests/unit/contact-all.test.ts`
and documented here; the repository capability spec and its fixed hashes/past-bug
assertions remain unchanged while shared production code is read-only.

## Approximation, inherited errors and offsets

The coarse boxes already miss parts of the rendered face. For example, Medium
east at local `(79.54545454545456,65.13084020460491)` hits Z
`14.691046305363571 → 14.711942854926072`; nearest-box distance is
**9.123348208942403 m on both revisions**. Its box is unchanged. This inherited
undercoverage is distinct from the newly lost contacts above. Rear-only ray
hits and absent upper boxes at pinched ends were not counted as fresh defects.
No universal exact collider-to-mesh agreement is claimed.

The existing collider suite's 1.5 m expansion / coverage fractions and tapered
height slack of .6 m are preserved. Across all 18 inspected cases, maximum box
height over the nearby stored wall maximum (within the existing 1 m X slack,
with the existing ground-zero floor) is **.2247368264 → .2336937356 m**, below
that .6 m cap. For sloping ground this is a sampled numerical check, not proof
that every box corner has support. X spans and Y boundaries are unchanged,
and the retreating min.z does not newly block existing undercut water. Existing
seabed/instance clearance assertions (-3 m, half wall height, exposed growth)
and collision floor/heading contracts pass unchanged; no new tolerance is used.

For the original sloping fixture, add 37 m to the supplied ground. At all tiers
on both revisions, wall/apron X/Z and indices are identical; collider X/Z stay
identical; collider Y translation differs from 37 by at most 1.43e-14 m.
Maximum stored-position/bounds translation error is 3.815e-6 m; 14 matched
actual-triangle rays per tier translate with maximum Z discrepancy 5.255e-6 m.
These are measured Float32 effects, not new assertion tolerances. No offset
regression was observed. This does not repeat the terrain-tint or attachment audits.

## Validation and limits

- Initial checkout scarp spec: **PASS, 1 file / 13 tests**, 24.29 s;
  `/tmp/2950-initial.log`.
- Focused checkout capabilities: **PASS, 4 files / 65 tests**, 22.04 s:
  `npx vitest run tests/unit/scarpTerrain.test.ts tests/unit/geo-colliders.test.ts tests/unit/geo-talus.test.ts tests/unit/props-collision.test.ts --configLoader runner --cache=false --pool=threads`.
  Log: `/tmp/2950-focused.log`. No snapshot update flag.
- Full-default isolated geometry matrices: **PASS, 6 tests each** in parent,
  merge and profile-only; 17.96 / 18.23 / 18.16 s.
  Logs `/tmp/2950-{parent,merge}-full-diagnostic.log` and
  `/tmp/2950-profile-only-full.log`. These assert structure and collect
  discrepancies; their passes do not mean hull-contact behavior passed.
- Relative-ground diagnostics: **PASS, 3 tests per revision**;
  `/tmp/2950-offset-{parent,merge}.log`.
- Clean isolated first-parent capability run: **PASS, 4 files / 65 tests**,
  23.56 s, same focused command above; `/tmp/2950-parent-focused-clean.log`.
- Contact regression, same four assertions in isolated copies of the existing
  Props/Terrain fixture with all authored props and full default terrain:
  **parent PASS, 4/4** (20.72 s); **merge FAIL, 4/4** (20.68 s).
  Logs `/tmp/2950-contact-regression-{parent,merge}.log`.
  Run from either archive root:
  `npx vitest run tests/unit/contact-all.test.ts --configLoader runner --cache=false --pool=threads --disableConsoleIntercept`.
  These are demonstrated behavioral failures, distinct from environment blocks.
- Required aggregate invocation:
  `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`.
  Existing writable-config support handles shared read-only dependencies;
  no tool/runner changes. **Completed, exit 1, e2e=none**.
  Log `/tmp/2950-gates.log`; detailed logs
  `.cache/runs/20261021-034029-19-H8X7nf/`.
- Aggregate **PASS**: config preparation, strict content, production build
  (TypeScript plus Vite), full repository units (**192 files / 3,389 tests**,
  484.06 s), attribution (**14 assets**), repository-wide Prettier.
  Existing non-failing bundle-size warnings remain.
- Aggregate **FAIL**: Python, **5 failures / 167 tests** (162 passed), in
  unchanged tooling. Four CI-build-manifest fixtures fail at child
  `spawnSync git EPERM`; the golden-tooling subprocess fails parsing empty CLI
  JSON with `Unexpected end of JSON input`. The four permission failures
  reproduce the previously recorded environment block. The golden failure's
  underlying cause is not classified here. No unrelated repair or gate retry.
- Final owned-note formatting and `git diff --check`: **PASS**. The sole
  retained change is this report. No merge, push or tag.

Initial diagnostic development incorrectly required an index on the merged
impostor geometry. It is valid nonindexed geometry; corrected that scratch
harness before the final runs. No repository assertion or baseline was loosened.

Simplicity: no runtime machinery, abstraction, setting, UI, guidance, layout,
site branch or dependency added. Arcade remains default. Real GMRT data, all
13 site identities, five heroes, scanning, Journal, marine life, all input modes
and accessibility are untouched. Numerical correctness and existing clearance
contracts are the relevant rubric checks. CPU geometry does not establish GPU
behavior, beauty, readability, composition, real-phone timing or Phone-OK.
No rendered judgement, piloting acceptance or visual improvement is inferred.
Actual e2e mode: **none**; no browser, screenshots or game rendering ran.
