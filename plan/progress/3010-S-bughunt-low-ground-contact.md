# S-bughunt — Low near-ground contact

Backlog item **9, S-verify / S-bughunt [Codex, standing]**, specifically
**S-bughunt**. Pinned checkout: `f8a4d49162d8172aa9a7c10237125e402ab30515`.
Range: that exact checkout versus this working diff; no dependency on
uncollected worktrees.

**Result:** Low contact now uses existing near triangles. The subsequent repair
request for the 16 downstream failures also repairs first-person aim and updates
only derived Low elevation oracles with independent geometry evidence. All
**197 focused capability tests pass**, including every previously failing file.
No behavioral assertion/tolerance was relaxed, authored camera pose/offset
changed, or rendering/visual/play/phone acceptance claimed. Full gates below.

## Scope and ownership

Read Director rules/rubric, newest 2026-10-21 evening review, overnight tail
through run 80, durable 2890 report, launched 2920–3030 briefs and available
results/progress. Rechecked active worktree status/diffs before this follow-up.
The user's explicit follow-up to repair the 16 failures supersedes the earlier
read-only boundary for their affected existing capabilities/oracles and the
necessary `CameraRig.ts` numerical correction. No repeated permission request.
No active package owns CameraRig or these affected capability/oracle files.

Other worktrees remain uncollected and untouched: shell/power/focus 2930, CI
2940, crest/resources/attachments 2950–2970, scarp collision 2980, mission/event
2990–3000, material lifetime 3020, worker/plugin 3030. No edits to their notes,
props/scarp production, authored data, config/site tables, tools/ or Director.
No visual item is reopened, including V-lostcity-hill and parked Blue Hole.

## Ground-contact root cause and correction

Lost City's fidelity profile is disabled on Low without `resolveLow`, and it
has no carve. Its old early return answered detail-enabled contact with the
continuous bilinear-survey-plus-noise field. LOD-0 triangles instead join the
vertex elevations. Vertex-only checks missed the between-vertex discrepancy.

One `Terrain.sampleHeight` routing condition now includes supported,
detail-enabled **Low** queries even without an active fidelity profile/carve.
Existing near-triangle interpolation, patch selection and bounded lattice memo
are reused; `surfaceHeight` remains the mesh vertex/derivative-normal source.
No site branch, duplicate sampler, per-frame raycast, padding or tessellation.
The API comment states the preserved pure-data and outside contracts.

Affected: supported detail-enabled uncarved/unprofiled Low, including Lost City.
Preserved: carved tiers, active fidelity (including Low `resolveLow`), unprofiled
Medium/High interior, uncarved detail-disabled bilinear data, out-of-tile
reconstruction, normals, survey, resolved settings and site tables.

Read consumers: Submarine floor/contact and altitude; CameraRig eye/arm
clearance; Spawn route/opening floors; POI/prop seats and terrain fitting; Sonar
floor intersections; Scatter placement. Correct contact intentionally changes
some derived Low seats/openings/life heights despite unchanged authored inputs.
No new consumer sampler or placement exception was introduced.

## Independent failing-before / passing-after witness

CPU `THREE.Raycaster` intersects actual generated LOD-0 positions/indices,
independently of height interpolation/patch-selection formulas. Shipped witness
X/Z **(68.37023588203485, -190.23966161489727)**:

| Measurement           |                  Metres |
| --------------------- | ----------------------: |
| Before `sampleHeight` |     -1191.3711847689774 |
| Actual triangle ray Y |     -1188.4923759135092 |
| Before error          |       2.878808855468151 |
| After `sampleHeight`  |     -1188.4923842029825 |
| After error           | 0.000008289473271361203 |

Y=100 downward ray hits `chunk_128_128`, face **3056**. Residual is below the
existing **0.001 m** tolerance (double lattice versus Float32 stored mesh).
The existing Terrain capability adds both triangle halves (fractions 0.2/0.8),
source cells around 63/64 and 127/128, exact chunk edges and ±0.001 source-cell
offsets, final partial chunks, 12 supported tile-edge/corner probes at fractions
0/0.37/1. Boundary extent is common to Float32 mesh/double survey; no outside
ray guarantee. Generic unprofiled Low's **0.05137347350444088 m** error also
changes from fail to pass. Original new guards: **2 failed / 13 passed**, exit 1,
0.594 s (`/tmp/3010-before.log`); no assertion was removed to obtain the pass.

Uncarved detail-disabled control retains its bilinear centre **-17.5 m** versus
actual triangle **-15 m**. Shipped Lost City pure Low differs from its own
triangles by **2.3531541097188438 m** at the witness. This general bilinear
approximation stays under the pure-data contract; corrected detail-enabled
error includes it plus between-vertex detail. All-tier outside and unprofiled
Medium/High continuous controls retain their old contracts.

## Shipped surface and immutable terrain mesh matrix

Rebuilt from actual GMRT Float32 tiles, without relying on 2890 scratch files.
Per site/tier: 21 interior points, 16 cardinal points at radii
650/775/900/1050 m, 12 supported boundaries: **49 queries**, **588 rays per
revision**, four sites × three tiers. Outer origin Y=10,000 includes positive
Monterey survey land; exact witness separately retains Y=100. No renderer/GPU.

Maximum absolute height errors (m); all counts identical before/after:

| Site            | Tier   | Before error | After error | Chunks | Resident vertices | LOD-0 triangles |
| --------------- | ------ | -----------: | ----------: | -----: | ----------------: | --------------: |
| lost-city       | low    |  2.878808855 | 0.000174391 |     30 |           124,296 |         240,924 |
| lost-city       | medium |  0.000133784 | 0.000133784 |     90 |           513,522 |       1,004,112 |
| lost-city       | high   |  0.000149701 | 0.000149701 |     90 |           627,570 |       1,229,904 |
| hudson-canyon   | low    |  0.448327540 | 0.000032663 |    270 |         1,092,204 |       2,116,224 |
| hudson-canyon   | medium |  0.173162117 | 0.173162117 |    270 |         4,168,314 |       8,202,960 |
| hudson-canyon   | high   |  0.233864648 | 0.233864648 |    270 |         4,168,314 |       8,202,960 |
| monterey-canyon | low    |  0.000119084 | 0.000119084 |    130 |           571,766 |       1,109,290 |
| monterey-canyon | medium |  0.000122253 | 0.000122253 |    190 |         2,280,668 |       4,484,080 |
| monterey-canyon | high   |  0.000150504 | 0.000150504 |    190 |         2,610,140 |       5,136,368 |
| great-blue-hole | low    |  0.000132382 | 0.000132382 |    144 |           448,719 |         871,184 |
| great-blue-hole | medium |  0.000100026 | 0.000100026 |    144 |         1,418,754 |       2,789,512 |
| great-blue-hole | high   |  0.000131445 | 0.000131445 |    144 |         1,718,274 |       3,385,480 |

All **12 complete geometry SHA-256 hashes match**: every position, normal,
colour (where present), cavity attribute and all three LOD index buffers.
Complete stats and attribute/index byte counts match; sampled normals match.
Medium/High samples and carved controls at all tiers are exactly unchanged.
Lost City Low remains **4,598,952 attribute + 1,938,588 index bytes**, 30 chunks /
124,296 resident vertices / 240,924 LOD-0 triangles: **0% geometry growth**.
No terrain mesh/normal/colour, tessellation, budget, survey or site-table edit.
Resident counts include skirts/duplicate boundaries; Hudson Medium/High's
pre-existing 4,168,314 vertices include skirts beyond the source-grid fit
estimate and remain unchanged. These are CPU counts, not GPU/phone frame time.

Hudson's inherited unprofiled Medium/High approximation (0.173162117 /
0.233864648 m) remains explicit. Distinct tiers need not share one physical
surface. This set does not certify every point or other LODs.
Data `/tmp/3010-{before,repair-after}.json`; logs
`/tmp/3010-{audit-before,repair-audit}.log`; rebuildable `.cache/low-contact/`.
Initial Vite-server bootstrap was blocked; completed evidence uses SSR builds
and Node, with no running server/game rendering.

## Memo and retained seam limitation

Original **1e-9 m** memo oracle remains: replace only `latticeHeight` with
direct `surfaceHeight`, keeping actual patch/triangle selection. No weakening
or continuous-field oracle substitution. Existing shipped forward/reverse,
mixed-density/edges, instance/rebuilt-survey isolation, **400,000-entry** eviction,
recomputation and disposal guards remain. Lost City Low now actually exercises
the memo. New generic Low guard: four total corner evaluations for opposite
halves, zero new evaluations on reverse warm queries, exact repeat values,
and empty memo after disposal.

Independent cold/reverse-warm versus uncached error is zero on Lost City/Hudson,
**1.1368683772161603e-13 m** on Monterey Low (same before/after), zero on other
controls; all below 1e-9. Lost City Low populates **125** corners, Hudson Low
**132**; every disposed instance is empty. No new cache/allocation policy.

**Separate retained finding:** Lost City High exact mixed-density edge X/Z
**(1322.39306640625, -2236.863427734375)** remains sample
**-971.8230467485819 m**, first/top ray **-971.6619546405759 m**
(`chunk_192_112`, face 12287), second **-971.8230273437498 m**
(`chunk_208_112`, face 704), error **0.161092108 m** against first hit.
Nominal boundary X **1322.3930480110776** differs from stored Float32 X.
No seam ownership/stitching, normals or LOD policy change. Medium's reported
exact-edge exception is also outside this path; not every mixed edge was rerun.

## Downstream root causes repaired without weakening guards

The first sampler correction exposed 16 failures in six files: 12 snapshot
failures, two frozen placement/workload equalities and two behavioral framing
failures. They are resolved separately; updating frozen numbers alone would
have left the framing defects.

**First-person aim used the wrong origin.** CameraRig positioned the eye at its
forward/vertical offset, but built the look target from the submarine origin.
That introduced a downward parallax error, sensitive to corrected Low seats.
Build the existing target from the desired eye instead; when clearance translates
the eye, translate its target by the same delta. Only five source lines change.
No authored pose, offset, FOV, range, lighting or geometry tuning. No new
allocations/terrain queries. Chase/photo aim stays untouched; first-person aim
is corrected across tiers, while Medium/High terrain sampling stays unchanged.

- Existing Hunga Low guard, unchanged **top <0.48**, improves
  **0.4910792656418065 → 0.47166580190778323**. Same eye, pilot position,
  target, pitch, yaw and `lookElevation`; only the target-origin algorithm differs.
- Existing Beebe Low fixed-world pose and **visible mouths >0** are unchanged.
  The front-facing mouth's NDC Y improves **0.916930779689816 →
  0.8758360628352371**, inside its unchanged **0.9** screen bound. Eye is still
  **(53.367680136657945, -4968.174142090568, -27.972270225578242)**.
  Medium/High framing and the existing High eye-position assertion pass too.
- New three-case camera capability checks level north/east commands at the eye
  in open water, floor clearance and surface ceiling, within existing **1e-6**
  camera precision. With pinned old camera all **3 fail** (direction errors
  **0.013887884 / 0.020829943 / 0.006944319**); corrected camera passes.
  Existing camera/focus/control/ceiling/phone/framing matrix: **7 files / 42
  tests PASS**, 19.03 s. No framing assertion or threshold changed.
  Logs `/tmp/3010-camera-{before,final}.log`, `/tmp/3010-framing-fixed.log`.

**Derived Low snapshots encoded continuous elevations.** Added independent
triangle intersections at every base/framed opening in every mode, and at
Low deep-opening pilot/life coordinates, retaining **0.001 m**. Only then
updated the affected oracles with Vitest:

- Free-dive: **30 entries** (10 affected sites × Arcade/Realistic/Custom),
  **60 Y leaves only**. X/Z/yaw/framing/settings/keys unchanged. Titanic,
  Monterey and Blue Hole snapshots unchanged. No entries added/deleted.
- Deep opening: only **two Low entries**; pose Y and derived one-frame life
  coordinates change, with species/counts intact. Medium/High unchanged.
  Existing scanner, 60-second CPU simulation, hull/camera clearance, depth,
  retained-life and pool-budget assertions now all run and pass after snapshots.
- The orchestrator's 20 obsolete warnings were unvisited Custom/Realistic
  snapshots after early Arcade failures; all modes now run, with no deletion.
  Snapshot delta proof `/tmp/3010-snapshot-delta.log`; selected regeneration
  **20 tests PASS**, 24.76 s. Snapshot files retain Vitest's generator format;
  an explicit Prettier attempt could not infer `.snap` parsers and changed none.

**Challenger fixed keepout matrices encoded old ground Y.** The exact equality
assertion remains. Independently captured before/after instance buffers and
actual height queries with unchanged fixture code, then checked **873 active
instances across three views**: all non-Y matrix elements, colours, counts,
stats and X/Z bounds are exact. Only Y translations and rigid hero Y bounds
change. **867** translations differ; **289** unique changed anchors intersect
actual LOD-0 triangles with max error **0.00037248277840262745 m**. Matrix delta
residual **0.00092695626335626 m** fits the two Float32 rounding intervals; max
vertical shift **0.4912109375 m**. The diagnostic uses original double query
coordinates, not rounded matrix X/Z as a substitute for source queries.
Only fixture **Low** Y bounds/matrix hashes update; High remains exact.
New capability guard checks every Low instance's declared ground anchor against
triangles within **0.001 m**, preserving all no-op keepout/matrix/count and
boulder/eye/arm/lander clearance assertions. Logs `/tmp/3010-scatter-{before,
after,delta}.log`; captures `/tmp/3010-scatter-{before,after}.json`.

**Lost City effect workload encoded old grounded positions.** Preserve paired
equality, draw/point/area counts and all High limits. Refresh only three exact
Low projected-pixel oracles, at the same four-decimal assertion precision:

| Range m | Old value retained as upper resource bound | New exact oracle |
| ------: | -----------------------------------------: | ---------------: |
|      70 |                               10433.658403 |     10427.554334 |
|      32 |                               44317.485993 |     43367.581471 |
|      10 |                               66444.480600 |     66410.314796 |

Added explicit **≤ old value** checks, so no old Low resource ceiling increases.
Plume draws/points **14/350**, fringe **12/392**, fringe area **250.88 m²** stay
unchanged. This is projected CPU workload evidence, not GPU fill time.
No retries, skips, timeout/limit increases, discarded assertions or blank scenes.

## Validation and limits

- Final normal (non-update) focused run: **PASS**, exit 0, **16 files / 197
  tests**, **185.55 s**, `/tmp/3010-all-focused.log`. Includes Terrain,
  terrainMemo1290, terrain-detail, terrainCarveAgreement, fidelityRollout,
  subCameraRig, subCameraFocus, cameraControls, cameraCeiling, phoneCamera,
  beebeFraming, lowTierFollowups, deepOpening, freeDiveComposition, perf-budget
  and verify1360. Existing single-worker thread runner, unchanged timeouts.
- Independent terrain/memo, snapshot scope, fixture scope and matrix/triangle
  diagnostics: **PASS**, as detailed above. No source interpolation formula
  copied as independent triangle evidence.
- Required final `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`:
  **completed, exit 1**, `/tmp/3010-final-gates.log`;
  `.cache/runs/20261021-095230-28-eNSb7u/`.
  Config preparation, strict content, production build (tsc + Vite), full unit
  suite, attribution (**14 assets**) and repository-wide Prettier **PASS**.
  Units: **192 files / 3,398 tests PASS**, **470.97 s**, with no assertion
  failures, obsolete snapshots, retries or new skips. All 16 reported failures
  are resolved and the three new camera regressions pass.
  Python: **162 passed / 5 failed (167)**, **8.933 s**: four unchanged
  build-manifest fixtures hit child `spawnSync git EPERM`; golden-tooling hits
  `Unexpected end of JSON input` (underlying cause not classified). These local
  signatures predate the package and Python passed outside the sandbox in the
  orchestrator's supplied run. No tooling/runner repair attempted. Aggregate
  **FAIL gates (e2e=none)** solely on that Python stage, not a unit failure.
- Final changed source/test/JSON/note Prettier and `git diff --check`: **PASS**.
  Vitest owns `.snap` formatting. HEAD remains
  `f8a4d49162d8172aa9a7c10237125e402ab30515`; no merge/push/tag.
- Prior outside-sandbox orchestrator run
  `.cache/runs/20261021-092302-3530124-RGwz36/` had the 16 failures before these
  repairs. Its reported smoke + project-base pass is prior-state evidence,
  not current browser acceptance. Current local actual e2e mode: **none**.

No browser launch, game rendering, screenshots, shader/GPU validation, visual
beauty/readability/composition acceptance, unaided play or real-phone
performance/Phone-OK acceptance. Those remain with Claude/owner. CPU triangle
agreement and projection guards do not establish them.

Simplicity: reuse existing triangle interpolation/memo and eye/target vectors;
no UI/guidance, setting, dependency, layout patch, site branch, renderer, extra
geometry, padding or per-frame raycasts. Existing resource/instance ceilings
and authored site identities remain. Real GMRT, all 13 sites, five heroes,
scan/Journal/life, input/accessibility and Arcade default stay protected.
Only the necessary two production files, affected existing capabilities/derived
oracles and this named note change. No merge, push, tag or tools/Director edit.
