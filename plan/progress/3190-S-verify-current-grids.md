# S-verify — shipped current grids and load states

Director Backlog item **9, S-verify / S-bughunt [Codex, standing]**.
Pinned checkout: **a545afe00196649a2d6de4cf1c8039851aba9074**.
Production, authored data and all other specs are read-only. This package owns
only `tests/unit/currents.test.ts` and this note. No merge, push or tag.

## Scope and evidence

Read `plan/DIRECTOR.md` rules/rubric, newest `plan/REVIEWS.md` review
(2026-10-22), `plan/OVERNIGHT-LOG.md` through run 82, D-CURRENTS's original
brief/result/final report in the primary checkout's `.cache/codex/`,
`docs/currents.md`, `plan/progress/S-resolve.md`, the current implementation,
content fetch/public URL helpers, geographic conversion, tile loading, runtime
current/preset callers, effective settings and existing current/preset/mode specs.
D-CURRENTS's old Gentle description predates S-resolve: the supported settings
are Off/Realistic, with Strong reserved for Daily. No mode policy was changed.

Before editing, inspected the queued/launched briefs, results, progress evidence
and registered worktree status/diff inventories, including finished work awaiting
collection. The queue root was empty; launched 3190/3200/3210 declare disjoint
ownership. No other worktree claimed the currents spec. Unmerged 2980 scarp and
3050 seam work, and completed 3130 sensitivity, 3140 spawns, 3150 CI, 3160 Kama
materials, 3170 ambient and 3180 wildlife Journal work were left in their own
worktrees. No changes were imported or depended on. Other worktree diffs include
production, workflows and a Director edit; none belongs to this package.
Recent result wrappers' PASS summaries conflict with some agent notes; only
actual command results from this checkout are used below.

`data/landmarks/index.json` supplies 13 playable sites; each mission supplies its
tile, cross-checked against all GMRT entries in `data/tiles/index.json` and the
tile's `meta.json`. All 13 site IDs equal their tile IDs. Runtime
`src/app/systems/currents.ts` constructs `Currents(meta.id, meta.id,
fetchContentJson)`; landmark overrides do not select a different grid.
`public/data` points to the checked-in `data` directory. No scientific source
was contacted or collected.

## Shipped document results

Each row requested `/data/currents/<site>.json` and
`/submarine-explorer/data/currents/<site>.json` through the real constructor,
`publicUrl` and `fetchContentJson` with a local text-response fixture. Both
requests admitted the unchanged document with matching site/tile, attribution,
bounds and dimensions. Status was **loading → ready** for every row.
Bounds matched the metadata's northwest/southeast geographic coordinates in
world metres to the files' three-decimal precision. Current dimensions are
3×3 samples across the tile, independent of terrain heightmap dimensions.

| Site = tile          | Status                | Grid   | Wet | Masked | Model depth (m) | X bounds (±m) | Z bounds (±m) |
| -------------------- | --------------------- | ------ | --- | ------ | --------------- | ------------- | ------------- |
| axial-seamount-ashes | ready                 | 3×3    | 9   | 0      | 1000            | 22321.199     | 22227.990     |
| beebe-vent-field     | ready                 | 3×3    | 9   | 0      | 3000            | 16783.539     | 16693.923     |
| bismarck             | ready                 | 3×3    | 9   | 0      | 3000            | 16727.218     | 16663.348     |
| blake-plateau-corals | ready                 | 3×3    | 9   | 0      | 500             | 31827.273     | 36720.516     |
| challenger-deep      | ready                 | 3×3    | 9   | 0      | 5000            | 27306.839     | 27853.781     |
| endurance            | ready                 | 3×3    | 9   | 0      | 2000            | 13332.239     | 16663.348     |
| great-blue-hole      | ready                 | 3×3    | 9   | 0      | 50              | 16754.688     | 16724.498     |
| hudson-canyon        | ready                 | 3×3    | 7   | 2      | 100             | 25823.482     | 27823.206     |
| hunga-tonga-caldera  | ready                 | 3×3    | 9   | 0      | 100             | 16776.844     | 16693.923     |
| kamaehuakanaloa      | ready                 | 3×3    | 9   | 0      | 1000            | 16775.703     | 16724.498     |
| lost-city            | ready                 | 3×3    | 9   | 0      | 700             | 9706.365      | 9478.235      |
| monterey-canyon      | ready                 | 3×3    | 4   | 5      | 100             | 20082.057     | 19506.819     |
| titanic              | ready                 | 3×3    | 9   | 0      | 3000            | 12504.178     | 16693.923     |
| demo-synthetic       | missing (404 fixture) | absent | —   | —      | —               | —             | —             |

There are **110 wet / 7 masked / 117 total real-site nodes**. The synthetic
demo tile is outside the 13-site mission catalogue and offline generator's
mapping; its absent document is intentional optional content. A 404 fixture
settles **loading → missing**, retains `grid = null` and samples zero.
No real site's document is absent, wholly masked, mismapped or rejected.

All sources retain name `NRL HYCOM GOFS 3.1 GLBy0.08 expt_93.0`, URL
`https://ncss.hycom.org/thredds/ncss/GLBy0.08/expt_93.0`, sample timestamp
`2024-01-15T12:00:00Z`, fetch timestamp `2026-09-24T04:34:00Z`, the DoD
Distribution A public-release statement and each row's representative model
depth. The existing offline Python validator independently checks source,
license, timestamps, depths, dimensions, vector limits and tile containment.
These depths describe a modeled environmental layer, not the current dive
depth, a live forecast or a measured bottom current.

## Existing and added guards

All four prior test bodies are retained byte-identical: synthetic bilinear
interpolation, clamping/non-finite coordinates, masked interpolation, rejected
identity/attribution, failed fetch and impulse guards. `presets.test.ts` already
checks bearings, slope modulation, coupling/caps and Low-tier preset behavior;
`f2-modes.test.ts` checks migration, pure resolution, Arcade defaults and Daily
policy. `gameContentPath.test.ts` already checks HTML, invalid JSON and HTTP
fallback parsing; `publicUrl.test.ts` checks deployment bases. Those remain
read-only controls; no interpolation formula, collision matrix, HUD or mode
migration matrix was duplicated.

Added **27 cases** in the existing currents capability spec:

- One catalogue/document inventory and optional-demo load case.
- Thirteen real-site cases, each admitting its local JSON under both root and
  project bases and checking all nine authored nodes. This is **234 node
  samples**, including all seven masks twice. Expected flow comes directly from
  each authored east/north pair: `X = east`, `Y = 0`, `Z = -north`.
  Masked nodes yield zero, including after a nonzero reused-vector sample.
  Assertions use 12-decimal precision for flow and three-decimal precision
  for authored metre bounds. Sampling returns the same caller-owned vector.
- Four edge midpoint cases with explicit independent authored expectations:
  Monterey west/lower edge `[east,north] = [0.041,-0.034]` yields
  `[X,Y,Z] = [0.041,0,0.034]`; Monterey north and Hudson west masked segments
  yield zero; Titanic south/east segment `[0.078,0.146]` yields
  `[0.078,0,-0.146]`. Existing bilinear/out-of-bounds tests remain the controls.
- Seven controlled late loads of Titanic content: valid success, wrong site,
  wrong tile, missing license, ragged rows, invalid JSON and rejected content
  read. Before completion, repeated samples clear a nonzero output, status
  stays loading and grid stays null. `ready` resolves without leaking rejection;
  success becomes ready with centre `[-0.018,0,-0.003]`, all other cases become
  missing/null/zero. Completion itself does not mutate an earlier output.
- Two opposite completion orders with the same construction order (Monterey,
  then Titanic), distinct real documents and one reusable output object. One
  instance can be ready while the other is loading and zero. Completion never
  overwrites the caller's sentinel vector. Alternating centre/corner samples
  select only the requested site's field; neither instance retains the output
  or mutates its input/admitted document (serialized before/after comparisons).

Only valid constructor calls and supported finite sample coordinates were
added; malformed/rejected content exercises the documented load boundary.
No cancellation/disposal contract was invented. No runtime/data discrepancy
was reproduced; there is no proposed production correction.

## Simplicity and rubric

No runtime growth, UI, guidance surface, layout patch, site branch, config
mutation, dependency, setting, schema, snapshot or resource-budget change.
One existing capability spec gains data integration and load-state checks;
there are no package-named specs/comments, skips, retries, timeout increases
or weakened assertions. History stays here. Existing authored site variation
remains data. Current impulse guards, contacts, preset modulation and physics
remain unchanged.

The behavioral and honesty checks protect comfortable piloting and the existing
missing-data guidance without adding text. Unchanged production/content protect
GMRT terrain, all 13 site identities, five hero set pieces, scanning, Journal,
marine life, inputs/accessibility and Arcade defaults. Discovery retention and
resource budgets are left to their established controls. Readability, beauty,
composition and visual Phone-OK remain Claude/owner judgments.

## Validation

- Baseline focused command:
  `npm test -- --configLoader runner --cache=false tests/unit/currents.test.ts tests/unit/presets.test.ts tests/unit/f2-modes.test.ts tests/unit/publicUrl.test.ts`:
  **PASS, 4 files / 92 tests**, exit 0, 414 ms; `/tmp/3190-baseline.log`.
- Same focused command after extension: **PASS, 4 files / 119 tests**, exit 0,
  405 ms; `/tmp/3190-focused.log`. The currents spec now has 31 cases including
  its four original cases.
- `python3 tools/currents.py`: **PASS**, all 13 documents validated offline,
  exit 0. `python3 -m unittest discover -s tools/tests -p test_currents.py -v`:
  **PASS, 2 tests**, exit 0, 0.002 s. No `--fetch` invocation.
- Required aggregate command:
  `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`.
  Log: `/tmp/3190-gates.log`; detailed logs:
  `.cache/runs/20261022-172217-32-Eojg2P/`.
  **Completed: exit 1, FAIL gates (e2e=none)**. Config preparation, strict
  content, production build (TypeScript and Vite), full units, attribution
  and repository-wide Prettier **PASS**. Full unit result: **192 files /
  3,546 tests passed**, **544.88 s**, with no skips, expected failures or
  behavioral failures. The existing build chunk-size warning is non-failing.
  The aggregate failure is solely the five Python tooling failures below.
- Aggregate Python result: **162 passed / 5 failed / 167 total**, 10.175 s.
  Both current-specific Python tests pass in this run. Four
  `test_ci_build_manifest` failures report `spawnSync git EPERM`:
  `test_both_bases_survive_copy_and_verify_all_provenance_fields`,
  `test_every_manifest_mismatch_is_rejected`,
  `test_missing_output_or_manifest_and_workflow_sha_mismatch_fail`, and
  `test_symlinks_missing_public_data_and_manifest_overwrite_are_rejected`.
  These are environment execution blocks; the smallest next action is to run
  the unchanged checks where Node may spawn git. `test_golden_tooling` reports
  24/25 internal Node cases passing; its failing partial-set/missing-file/
  incompatible-pose case raises `Unexpected end of JSON input` while parsing
  child stdout at `tools/tests/golden-manifest.test.mjs:151`. The underlying
  cause is not established here. Retaining child stdout/stderr and exit status
  before parsing is the smallest proposed diagnostic. These are the same five
  unrelated tooling failures recorded in previous packages, not current-field
  product failures; no tooling repair or assertion relaxation was made.
- Final owned-file formatting check and `git diff --check`: **PASS**. Checkout
  SHA remains pinned. The only changes are the currents spec and this note;
  production, data, tools, Director, other tests and snapshots have no diff.

Actual e2e mode: **none**. No browser, renderer, screenshots, GPU checks,
unaided-play success, real-phone performance or visual acceptance is claimed.
This establishes shipped-data integration, not HYCOM scientific accuracy or
real-phone drift quality.
