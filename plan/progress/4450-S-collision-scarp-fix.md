# 4450 — S-collision: Monterey scarp hull contact

Director item **S-collision**, 2026-10-26. The four exposed-triangle hull contacts
are repaired and promoted from `it.fails` to ordinary tests. No tests are deleted.

## Evidence and minimal port

Started clean on main `3902a46fe294de703be00df1205022542f280faa` in
`codex/4450-S-collision-scarp-fix`. Read `plan/DIRECTOR.md`, the complete
uncommitted 2980 diff (three files, above `f8a4d491`), the 3330 decision note,
and `/home/vijay/submarine-explorer/.cache/codex/3330-S-collision-decide-result.md`.
The requested result file is absent in this worktree; the main worktree copy
reports the report-only decision and its gates. No old branch is merged or
cherry-picked, and no other worktree is edited.

The useful part of 2980 is clipping deformed cross-sections at the **emitted**
box heights: those heights use a segment-minimum taper and averaged terrain
lift, so the old raw `y0..y1` interval can describe different rock. Its full
source patch also recomputes deformation and feeds widened boxes into the
visible distant impostor. That would violate this task's visual constraint.

This port reads the already-built mesh's ordered sections and reuses `crossings`
to clip each at a wall box's bottom/top, including interior section corners.
Only its Z extents grow. The impostor is materialized first from the original
boxes; only the same wall collision boxes are then aligned. Apron boxes, world
bounds, X overlaps, tapered heights and slice counts stay fixed. There is one
returned collider array and the existing sphere/box resolver remains the only
collision path. The terrain floor solver is untouched.

Simplicity: replaces the candidate's 41 added lines of separately sampled and
reconstructed deformation with 28 added build-time lines using existing mesh
data and the existing crossing helper. No extra collider representation, query
path, per-frame work, site branch, setting mutation, dependency or package ID in
code is introduced. The retained raw proxy calculation is needed to preserve
the existing impostor; it is not another contact solver. The temporary section
coordinates are discarded after construction. This deliberately keeps the
coarse box model, not a new exact triangle collision system.

The candidate's duplicate contact cases and added full-detail hash column are
not imported. The existing four witness coordinates, 8 m hull, face validation,
and contact assertions remain intact. The ground-offset invariance test is
ported into the existing collider capability spec, with Float32 precision for
mesh-derived Z coordinates.

## Each of the nine rebaselines

`scarpObservations` remains `[geometry, placement, materials, collision]`.
**Only collision (index 3) changes**, once for each preset/tier. The existing
27 geometry, placement and material digest values remain byte-identical,
including both full geometry and the distant impostor. No `.snap` file changes.
The two fixtures are a flat unsnapped `[32,16,24]` wall, seed 42, and a sloping
`[70,26,36]` wall, seed 17. Table counts are changed/total boxes; maxima are
front/rear depth growth in metres (flat; sloping). Each row is a collision
coverage correction, with no visual, spawn or camera change.

| Baseline      | Why correct                                                                                                                       | Changed boxes, flat; slope | Maximum Z growth, flat; slope | Collision hash, old → new (prefix) |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ----------------------------- | ---------------------------------- |
| tuff-low      | Coarse regular tuff beds now cover the pinched, lifted rock sections at the emitted slab heights.                                 | 72/76; 133/151             | 3.748/9.309; 2.980/13.127     | `2eb7876c1498` → `af01ce409c6f`    |
| tuff-medium   | Medium tuff sections include displaced joints and bedding at the actual slab heights, covering front and rear rock.               | 72/76; 135/151             | 2.442/12.686; 4.548/12.348    | `388cd94d98fa` → `c355b5940cad`    |
| tuff-high     | Dense tuff sections correct the profile interval after taper and lift; their depth extrema cover the rendered jointed wall.       | 72/76; 136/151             | 4.124/13.209; 4.354/12.531    | `4d8e50adb9da` → `d20bbf5c99c5`    |
| canyon-low    | Coarse eroded canyon sections cover the receding upper beds after taper and terrain lift, including the Low west witness.         | 72/74; 131/146             | 4.121/8.532; 7.501/12.276     | `7767fa5f2dd7` → `28e4bfa03ccf`    |
| canyon-medium | Fidelity canyon sections include the exposed upper terraces at their final heights, repairing the Medium east and west witnesses. | 72/74; 135/146             | 4.059/13.110; 6.699/12.629    | `c510a21edf07` → `67abdbfd3d9b`    |
| canyon-high   | Dense canyon sections include the receding crest and scar relief at final heights, repairing the High west witness.               | 72/74; 135/146             | 4.137/13.799; 6.669/14.101    | `c86e83a5175f` → `20a1216bb13e`    |
| hadal-low     | Coarse slump sections cover the displaced benches at the emitted pinched heights rather than the raw profile interval.            | 72/78; 133/150             | 3.986/9.613; 6.498/12.478     | `d17b24bd8146` → `78dbe93a244c`    |
| hadal-medium  | Medium slump sections include front and rear bench extrema after the height scale and terrain lift.                               | 72/78; 132/150             | 4.259/12.590; 7.243/11.677    | `d5dba26b5308` → `c69fc1a9d3e7`    |
| hadal-high    | Dense slump sections cover final bench depths where taper and lift put a slab beside a different raw profile interval.            | 72/78; 134/150             | 4.180/13.105; 7.350/11.732    | `0c62feb8e5bf` → `d0ef0b099cd4`    |

The before/after audit also asserts, for every box in all 18 fixtures: unchanged
count, exact X/Y endpoints and world bounds, no Z contraction. Apron boxes stay
unchanged. All original geometry/placement/material hashes pass without edits;
there is no art acceptance hidden in these rebaselines. Full collision hashes
remain in `tests/unit/scarpTerrain.test.ts`.

## Class B spawn, overlap and framing guard

A temporary before/after diagnostic imports main's original builder alongside
the port and exercises every affected site: Monterey, Hunga Tonga and Challenger,
at Low/Medium/High. For each it compares Class B free-dive and mission poses in
Arcade, Realistic and Custom, including explicit null results for inaccessible
rated depths. It compares camera eyes/matrices and projected hull/hero bounds
and envelope-overlap pixel areas at desktop 1600×900, portrait 390×844 and
landscape 844×390: 45 non-null poses and 135 camera/overlap comparisons;
nine null pose results also stay null. All nine site/tier comparisons are
**exactly equal**. No
Class B spawn, overlap number or camera framing moves, so the stop condition
is not triggered. This is numeric evidence, not a new visual assessment.

The existing free-dive composition snapshots for all 13 sites and all three
modes also pass unchanged. The temporary audit and original-builder copy are
removed from the tree; diagnostic source/results remain in
`/tmp/4450-scarpAudit.test.ts`, `/tmp/4450-audit.json` and `/tmp/4450-audit.log`.

## Validation

- First focused run, before updating collision hashes: four contacts pass;
  34 passing tests and exactly nine collision-only hash failures (four files,
  47.80 s). `/tmp/4450-focused.log`.
- Rebaselined scarp/collider capabilities: **28 passed**, including three
  ground-offset checks (24.41 s). `/tmp/4450-equivalence.log`.
- Before/after diagnostics: **18 passed** (30.49 s), covering the nine fixture
  pairs and nine affected site/tier opening comparisons. `/tmp/4450-audit.log`.
- `GATES_CONFIG_MODE=writable bash tools/gates.sh`: **completed, exit 1**.
  Config, content, build (including TypeScript), unit, attribution and Prettier
  passed. Full unit suite: **192 files / 4,273 tests passed**, zero expected
  failures, 552.22 s. Both production-base builds passed.
  Run directory: `.cache/runs/20261026-143540-30-Ou5VUs/`;
  aggregate output: `/tmp/4450-gates.log`.
- Python gate: **FAIL**, 167 Python tests / five failures. Four
  `test_ci_build_manifest` cases cannot launch Git from Node (`spawnSync git EPERM`); `test_golden_tooling` fails when its CLI report has empty stdout
  (`Unexpected end of JSON input`, `golden-manifest.test.mjs:151`). These tooling
  paths have no diff in this package. No tooling change or test relaxation is
  attempted.
- Root smoke and project-base browser gates: **FAIL before test execution**,
  both report `Process from config.webServer was not able to start. Exit code: 1`. Neither log exposes a deeper startup cause, so browser behavior is
  unverified in this environment. This result is not reported as passing e2e.
- Final changed-file Prettier and `git diff --check`: **PASS**. The only retained
  changes are the scarp builder, its three existing capability specs and this
  note; `.snap` files, site data, camera/spawn code, `tools/` and Director have
  empty diffs.

No merge, push, visual/art edit, or edit to `tools/` or `plan/DIRECTOR.md`.
