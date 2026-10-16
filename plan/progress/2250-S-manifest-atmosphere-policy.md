# S-manifest: atmosphere policy

Baseline: `446af2a`. This takes only inventory rows **3 and 10** of
`2110-S-verify-9.md` and the associated Medium/High ambient-floor table.
The inventory's older six-site/intensity-3 description is superseded by the
live eight-site/intensity-6 policy captured before this migration.

## Scope and inventory delta

Read `S-manifest.md`, `2160-S-manifest-slice.md`, the literal-branch inventory
and associated table inputs in `2110-S-verify-9.md`, and the landed 2200 scope
and commit `5805623`. Prop/material profiles are already present and unchanged.
At inspection, the 2240 scatter worktree and branch were clean at the same
baseline, with no committed diff or progress note. Its scatter keepout remains
outside this slice. Neither atmosphere row had landed.

- Row 3: Monterey's hemisphere and lamp multipliers now live in its optional
  `atmosphere.hemisphere` and `atmosphere.lamps`. The hemisphere carries its
  existing `montereyFill` name; `MONTEREY_OPENING` and the Monterey identity
  predicate are deleted. Strata and rubble stay in their existing module.
- Row 10: each eligible site's `atmosphere.tiers.low` owns its ambient floor.
  `LOW_READABILITY_SITES` and `LOW_SEABED_LIGHT` are deleted.
- Associated table: the four Medium/High policies now live in those sites'
  `atmosphere.tiers.medium` and `.high`. `SITE_SEABED_LIGHT` is deleted.
- `siteLightWater` replaces the two duplicate band-mapping helpers, including
  `lowSiteWater`. The original deep → site → Low composition is equivalent to
  deep → selected-tier policy because the old site and Low stages were mutually
  exclusive. The deep table, its −1000 m cutoff, particles and consumers remain
  unchanged. Deep lamps retain precedence over manifest lamps; hemisphere fills
  remain independent and additive.

The shared inventory stays untouched while other slices are in flight. Against
its post-2200 count of 12, this slice removes **2 expressions**, leaving **10**
before separately scoped scatter work. No other inventory row is taken.

## Numeric equivalence

Round 1 added instrumentation to the existing `lowSweepReadability.test.ts`
capability suite and captured **42 numeric snapshots against the live baseline**:
13 shipped sites plus `unknown`, each at Low/Medium/High. All 53 baseline tests
passed. These new snapshots were frozen before source/data migration; their
SHA-256 remains
`282f01a30cf338b27928ac6caea6c7ef17531d1ff03bdb41156bed59f6e8b4d1`.
They contain complete authored bands, custom boundary-band inputs, numeric
samples at 0, −20, −199.999, −200, −200.001, −700, −999.999, −1000,
−1000.001 and −4200 m, every scene light's name/type/colour/intensity/range/angle,
and the complete selected tier. System samples must also equal the composed
pure-water samples. Only the DOM caustic texture generator is replaced by a
texture handle for these headless numeric checks; no light or policy is mocked
in the equivalence capture.

All 42 migrated results match those snapshots exactly. The table below shows
before = after ambient intensities at the midnight/abyss stops (−200/−1000 m):

| Site             | Low        | Medium     | High       |
| ---------------- | ---------- | ---------- | ---------- |
| Axial            | 6 / 6      | 0.4 / 0.18 | 0.4 / 0.18 |
| Beebe            | 6 / 6      | 0.4 / 0.18 | 0.4 / 0.18 |
| Bismarck         | 6 / 6      | 6 / 6      | 6 / 6      |
| Blake Plateau    | 6 / 6      | 6 / 6      | 6 / 6      |
| Challenger       | 0.4 / 18   | 0.4 / 18   | 0.4 / 18   |
| Endurance        | 0.4 / 20   | 0.4 / 20   | 0.4 / 20   |
| Great Blue Hole  | 0.4 / 0.18 | 0.4 / 0.18 | 0.4 / 0.18 |
| Hudson           | 6 / 6      | 6 / 6      | 6 / 6      |
| Hunga Tonga      | 6 / 6      | 6 / 6      | 6 / 6      |
| Kamaʻehuakanaloa | 6 / 6      | 0.4 / 0.18 | 0.4 / 0.18 |
| Lost City        | 6 / 6      | 0.4 / 0.18 | 0.4 / 0.18 |
| Monterey         | 0.4 / 0.18 | 0.4 / 0.18 | 0.4 / 0.18 |
| Titanic          | 0.4 / 0.18 | 0.4 / 0.18 | 0.4 / 0.18 |
| Unknown          | 0.4 / 0.18 | 0.4 / 0.18 | 0.4 / 0.18 |

Floored bands retain colour `0x879399`; untouched midnight/abyss bands retain
`0x2e4e5e` / `0x1a2a33`. Deep-opening abyss colour remains `0x879399`.
The custom stop inputs at −199.999/−200/−200.001 m use intensities 9/2/9:
applicable floors yield **9/6/9**, preserving the brighter input while still
replacing its colour below the inclusive boundary. Unknown sites keep the
original water object. Surface/twilight bands, fog, sun, grade, water colours,
snow and all other fields are preserved. Monterey retains hemisphere sky
`0xa8bbc8`, ground `0x493d32`, intensity **3**, and lamp multipliers
**2 / 1.2 / 3 / 1.5** (spot intensity/range, fill intensity/range).

## Simplification and validation

Shared production TypeScript is **19 lines shorter**, including the new schema
and validation. Two ambient algorithms become one; one predicate, one membership
list and both independent policy constants disappear. No UI, guidance, setting,
layout adjustment, dependency, exposure change or budget is added. Existing
rendering algorithms and defaults are unchanged.

The only shared-schema addition is `atmosphere`. Its section, hemisphere, lamps,
tiers and tier rows reject unknown fields and malformed objects. Required values
are checked; colours must be integral 24-bit values, intensities/multipliers
finite and nonnegative, names nonempty, and depth finite and at/below zero.
Validator table cases cover missing members, absent/empty optional sections,
wrong types, unknown tiers, invalid colours, negatives, NaN and both infinities.
Shipped-content assertions check the exact policy/cohort, including absent sites.
Capability tests retain lamp gains across modes/toggles, explicitly guard deep
lamp precedence, missing tier fallback, input/config/manifest immutability and
brighter-input max behavior. A structural comparison confirms all nine changed
JSON files differ only by their added atmosphere section; props and other
sections are identical to baseline.

Round 2 verification:

- Typecheck passes.
- **332 tests in six files pass**: `siteManifest`, `lowSweepReadability`,
  `montereyOpening`, `deepOpening`, `enduranceAtmosphere`, and `props-geo`.
- **57 tests in two files pass** in the additional geometry/isolation run
  (`beebeIsolation`, `props-geo`; overlaps the preceding run).
- The standalone deep-opening run also passes all seven tests.
- Existing byte/geometry snapshots and guards are unchanged; no rebaseline.
  The sole new snapshot file is the baseline atmosphere numeric capture.

## Full gate evidence and blockers

Invocation:
`FULL_E2E=1 ROUNDS=2 GATES_CONFIG_MODE=writable PW_PORT=4225 bash tools/gates.sh --full-e2e`.
Logs: `.cache/atmosphere-policy/` and
`.cache/runs/20261016-051835-7-yYiqum/` (gate links under `.cache/gates/`).

- Content validation, root and project-base production builds, attribution and
  repository-wide Prettier pass. `git diff --check` passes.
- Python: **162/166 pass**; four build-manifest provenance cases fail with
  `spawnSync git EPERM`, matching the blocker recorded by 2200. No provenance
  assertion or runner setting was changed.
- The aggregate unit gate completes: **2,579 tests pass in all 192 files**, in
  378.50 seconds. Its minimal reporter emitted only the startup header until
  completion; this run was neither interrupted nor left incomplete.
- Full e2e and project-base e2e both fail to start their owned preview servers.
  Full e2e was also invoked independently against the successful build while
  the aggregate unit gate ran. A direct preview diagnostic confirms
  `listen EPERM: operation not permitted 127.0.0.1:4226`. The independent
  project-base build succeeds and its preview also fails to start. No browser,
  pixel/screenshot or full-e2e pass is claimed.
- The full gate invocation completes with **exit 1**. The remaining blockers are
  the four Python provenance subprocess failures and browser preview startup;
  no checks, assertions, runner configuration or budgets were weakened.

No files under `tools/` or `plan/DIRECTOR.md` were changed. No push, merge or
release action was performed. Full gates are **not green in this sandbox**;
re-run them where provenance subprocesses and local preview binding are permitted.

## Orchestrator full-e2e follow-up

The orchestrator ran the full gates outside this sandbox in
`.cache/runs/20261016-052611-1177325-YyCqC8/`. Python, content, build, unit,
project-base e2e, attribution and Prettier passed. Root e2e reported **762 passed,
35 skipped and two failures**. The user's follow-up explicitly requested repairs
for those failures; the changes below are limited to those gate repairs.

### Home Controls target

The failure context shows a visible dialog named **Controls guide** while the
assertion waits for the hidden `.settings` dialog. Home already routes Controls
to the shared `ControlsCard`, and the existing title-audit helper targets that
card correctly. The older title-scene case still expected the pre-consolidation
Settings Controls page.

The case now checks the shared guide's exact accessible name, Controls heading
and input-device group, title inactivity/stopped draws, Escape dismissal,
opener focus and resumed drawing. It then reopens the guide and follows
**Change keys** to Settings, retaining the existing Controls-region and focused
**Back to Settings** assertions as well as the final dismissal/focus/resume
checks. No UI routing or behavior was changed and no assertion was weakened.

### Offscreen terrain submission

The wall-view log reports Monterey's first three views at 889,862 / 896,874 /
887,962 triangles and the elevated view at **915,040**, above the unchanged
900,000 ceiling. The lighting migration changes no geometry or camera values.
A headless census using the exact elevated camera construction from that test
found **101,760 terrain triangles** submitted solely because a steep chunk's
large bounding sphere intersects the frustum while its entire bounding box is
outside. Existing chunk boxes already enclose all geometry, including skirts.

`Terrain.update` now additionally checks that box and sets the chunk mesh's
visibility before rendering. This avoids fully offscreen submissions and
restores visibility on subsequent views. The sphere check, LOD selection,
geometry/index buffers, terrain profiles, materials, exposure, camera and
budgets are retained. There is no site branch or per-site adjustment. In the
headless fixture, the terrain portion drops from **171,392 to 69,632 triangles**;
this is numeric submission evidence, not a claimed browser frame measurement.

The existing scarp capability suite now reconstructs that real-tile camera pose,
requires at least 100,000 offscreen triangles to be rejected, checks accounting
and unchanged position buffers, and checks visibility recovery after looking
away. The new regression fails against the original `Terrain.ts` (zero rejected
triangles) and passes with the fix. Existing golden files remain untouched.

The original atmosphere change saves 19 shared TypeScript lines; including the
four lines needed for this gate repair, the combined change still saves **15**.
Focused follow-up verification passes **347 tests in six files** and typecheck.
The final full gate rerun and browser limitations are recorded below.
