# S-verify / S-bughunt — Titanic scatter

## Scope and revision boundary

DIRECTOR.md Backlog item 10; reviewed `4ac96b6` (V-titanic-seabed slice 1)
from checkout `7a0a14b`. Read the newest review (2026-10-16, second),
`V-titanic-seabed.md`, and the completed sibling-worktree reports
`2300-S-verify-15/plan/progress/S-verify-15.md` and
`2320-S-bughunt-16/plan/progress/S-bughunt-16.md`.

Despite its subject, `4ac96b6` is a one-parent bookkeeping commit. Its immediate
parent `7db1176` already contains the changed biome and snapshots: their direct
diff is empty. The authored change is `2becca4`, followed by snapshot commit
`21af923`; the meaningful before/after comparison is **`b64db69` → `4ac96b6`**.
No historical report count was used in place of running the fixture.

Rechecked `git worktree list`, current DIRECTOR queue, and sibling status/diffs
before the test edits. The queue text predates the launched verification
worktrees. 2300 owns Monterey/Lost City/atoll verification and explicitly excludes
later visual scopes; 2320 owns Journal/touch fixes and its larger migration
finding. 2330's pending diff owns sonar policy, site manifests/schema and sonar
snapshots. 2340 owns Blue Hole roof/apron geometry verification
(`blueHoleProps.test.ts`); 2360 owns Beebe lamp/spire checks
(`lowSweepReadability.test.ts`, `props-geo.test.ts`). No ownership overlap found;
none of those edits were collected. This change only extends the two authorized
capability suites and adds this report.

## Data and implementation trace

Titanic previously inherited abyssal ooze scatter: dropstones at density 1.8,
size multiplier 1; mounds at 3.5. It now overrides only its own table:
dropstones at 30 with size multiplier 2.2, rubble at 10, unchanged mounds at 3.5.
All prefer flat ground; slope limits remain 18° for stones/rubble, 10° for mounds.
Ripple strength/wavelength change from 0.12 / 0.9 m to 0.8 / 1.2 m. Direction,
palette, staining, material slots and all other biome fields are unchanged.

`Terrain` passes the biome, resolved tier density/range, tile-derived seed,
height/normal callbacks and slope thresholds to `Scatter`.
`ScatterPlacement.placeCell` uses a separate deterministic cell/kind seed,
64 m cells, density per 1,000 m², slope/substrate rejection and existing clumps.
`sizeMul` scales all three dimensions and the embedded depth, leaving horizontal
positions, yaw, tilt and colours unchanged. Ground anchor is
`y + embed * sy = sampleHeight(x,z)`. Tier scaling changes density and range,
not the physical stone size.

`Scatter` streams two cells per update and gathers one instanced mesh per kind.
It retains the 4,096-instance cap per kind. Rubble draws within 95 m, mounds
within 70 m; stones use the tier range. Existing geometry is reused: stones
180 triangles, rubble 20, mounds 100 per instance. `TerrainMaterial` passes
ripples into existing `uRipple`, `uRippleLen`, `uRippleDir` uniforms;
`terrain.frag.glsl` applies near-field slope/normal detail. Ripples add no mesh,
height displacement or draw and do not alter scatter grounding.

## Measured counts and costs

These are **headless scatter-layer costs**, not measured frame time or a
rendered full scene. The existing `beebeScatter` fixture uses seed 1130,
height `-100 + 0.05*x - 0.1*z`, its existing upward normal, thresholds
0.02 / 0.3, camera `(32,-85,32)`, no keepout and 128 updates. Only biome data
changes between each pair. Tier settings come from `makeConfig().terrain.tiers`.

| Tier / fixture              | Density / range | Cells | Instances before → after (delta) | Triangles before → after (delta) | Draws |
| --------------------------- | --------------- | ----- | -------------------------------- | -------------------------------- | ----- |
| Low                         | 0.25 / 90 m     | 9     | 25 → 271 (+246)                  | 3,460 → 36,860 (+33,400)         | 2 → 3 |
| Medium                      | 0.6 / 150 m     | 25    | 105 → 1,422 (+1,317)             | 16,500 → 227,320 (+210,820)      | 2 → 3 |
| High                        | 1 / 220 m       | 45    | 323 → 4,421 (+4,098)             | 53,740 → 748,180 (+694,440)      | 2 → 3 |
| Existing isolation snapshot | 1 / 128 m       | 21    | 148 → 1,862 (+1,714)             | 22,240 → 287,560 (+265,320)      | 2 → 3 |

| Tier / fixture              | Dropstones before → after | Rubble before → after | Mounds before → after |
| --------------------------- | ------------------------- | --------------------- | --------------------- |
| Low                         | 12 → 190                  | 0 → 68                | 13 → 13               |
| Medium                      | 75 → 1,228                | 0 → 164               | 30 → 30               |
| High                        | 268 → 4,096               | 0 → 270               | 55 → 55               |
| Existing isolation snapshot | 93 → 1,537                | 0 → 270               | 55 → 55               |

The art note's “about 1,700 on High” describes its 128 m snapshot fixture,
not the configured 220 m High range. Configured High reaches the existing
stone cap. Costs remain bounded without changing any ceiling, but the sizeable
High vertex increase is real. This audit establishes counts and geometry costs;
phone performance still needs the owner. No new performance setting or tuning.

## Isolation, determinism and regression guards

- Loaded the actual pre-change `TerrainBiome.ts` from `b64db69` into a temporary
  ignored fixture, adjusting only relative import paths. A temporary headless
  probe verified the reconstructed old Titanic biome against that module and
  deep-equality of **every other biome and DEFAULT_BIOME** with the current
  module. This also verifies no shared ooze-table mutation. Probe passed;
  its imports/test were removed from the tracked suites. Evidence:
  `.cache/2350-S-verify-titanic-scatter/{parent-comparison.log,counts.jsonl,parentBiome.ts}`.
- Read both cross-site snapshot diffs for `b64db69..4ac96b6`: only Titanic's
  biome hash, two tier uniform hashes, scatter mesh hash and counts changed.
  Terrain buffers, shader hashes/cache keys, all other sites and all other
  snapshot entries stayed byte-identical. No removed or weakened guard.
- `biomeFloorVariety.test.ts` retains both existing tests and their pebble,
  rubble and ripple assertions. Added three tier cases: expected ideal-ground
  density, exact repeatability, changed-seed variation, finite instance fields,
  2.2× size with stable horizontal placement/colour, embed depth, slope limits
  and exclusion of clump members. Ripple values must be finite and bounded.
- `beebeScatter.test.ts` needed three additional tier cases because its existing
  Titanic coverage is only the 128 m snapshot. They guard exact configured-tier
  instance/draw/triangle costs, unchanged mound matrices/colours, byte-identical
  seeded replay, unchanged per-kind allocation/cap and geometry complexity,
  finite positive transforms, and transformed vertices crossing the ground plane
  for every drawn stone, rubble fragment and mound. This checks actual composed
  mesh grounding, in addition to the placement anchor equation.
- Existing cross-site isolation tests pass against their unchanged snapshots.
  No production defect reproduced; no source fix, snapshot update or budget
  rebaseline was necessary. All existing assertions remain intact.

## Simplicity and remaining art work

No new production machinery, UI surface, guidance text, layout override, setting,
runtime config mutation, dependency, site branch or package-number code comment.
The reviewed art slice extends the existing site data table and reuses existing
geometry/materials. This verification adds tests only. No new on-screen element
was introduced by this verification, so there is no replacement surface to name.

Scour beside the hull, hull-plating repetition, and approach-distance readability
remain art gaps for Claude/owner. No geometry, lighting, camera, gameplay or
appearance tuning, game render, golden capture, visual acceptance or real-phone
acceptance was performed. Roof/apron math, Beebe lamps/spires, sonar migration,
manifest/schema and 2300's terrain-material/mission-pacing tests are untouched.

## Validation

- PASS: final focused run, **3 files / 14 tests**, 3.91 s:
  `npm test -- --configLoader runner --cache=false --pool=threads tests/unit/biomeFloorVariety.test.ts tests/unit/beebeScatter.test.ts tests/unit/beebeIsolation.test.ts`.
  Includes all existing snapshots in those suites; no update flag used.
- PASS: independent TypeScript check, repository-wide Prettier, attribution
  (14 asset files), and `git diff --check`.
- Invoked `GATES_CONFIG_MODE=writable PW_PORT=4350 bash tools/gates.sh --no-e2e`.
  Config preparation, strict content validation and production build passed.
  Browser gates are deliberately not requested under this brief's no-render
  constraint; no browser result is claimed.
- Python gate: **161/166 passed**, five failures. Four build-manifest cases fail
  at `spawnSync git EPERM`; the golden tooling CLI test fails parsing empty
  report stdout (`Unexpected end of JSON input`,
  `tools/tests/golden-manifest.test.mjs:151`). These reproduce the same failures
  recorded by 2300/2320, outside this brief. No tools or thresholds were changed.
- PASS: full unit gate, **192 files / 2,699 tests**, 474.98 s. The gate also
  passed attribution and repository-wide Prettier. It completed with **exit 1**
  solely because of the five Python tooling failures above. This is not an
  all-green gate run.
- PASS: independent thread-pool full unit run, **192 files / 2,699 tests**,
  469.38 s, exit 0:
  `npm test -- --configLoader runner --cache=false --pool=threads`.

Evidence: `.cache/2350-S-verify-titanic-scatter/` contains `focused-final.log`,
`isolation.log`, `parent-comparison.log`, `counts.jsonl`, `gates.log`,
`unit-threads.log`, `typecheck.log`, `prettier.log`, and `attribution.log`.
The existing gates retain per-step logs in
`.cache/runs/20261016-110528-7-b2wtmo/`.
