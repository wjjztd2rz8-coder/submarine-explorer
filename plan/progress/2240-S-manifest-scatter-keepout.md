# S-manifest: Challenger scatter keepout

Item: **S-manifest**, one migration slice. Baseline: `446af2a`.
Read `S-manifest.md`, `2160-S-manifest-slice.md`, inventory rows 1/19 in
`2110-S-verify-9.md`, and the current `2200-S-manifest-3.md` and implementation
commit `5805623`. Both selectors remained in `src/app/systems/props.ts` after
that props/material migration.

## Inventory delta for collection

Remove inventory rows **1 and 19**: Challenger eligibility and the literal
`leggo-lander-marker` lookup for the boulder keepout. This reduces the remaining
inventory from **12 to 10 expressions**. The shared progress inventory is
unchanged so concurrent slices can collect this delta independently.

Challenger's optional, typed `scatter.keepoutHero: true` reserves the existing
`opening.freeDive.hero`; no hero ID is duplicated in the new section. The eager
manifest loader and strict validator validate the section and reject an enabled
policy without an opening hero. Other sites omit the section. False or absent
policy does nothing. Missing prop content or a missing placed hero still does
nothing, without clearing an existing keepout.

The load callback still installs ground exclusion, then boulder exclusion, then
performs eligible opening reframing, emits `props:loaded`, logs and refreshes
the debug panel. The hero's matrix is updated before cloning its local bounds
and transforming them into world space. Eligibility uses the resolved content
landmark, including explicit content overrides and mission content.

## Behavior evidence and two review rounds

1. Before the runtime migration, the original focused suite passed **85 tests
   in four files**. Extended the existing geometry audit to obtain bounds through
   the real props-system load callback, then captured six deterministic scatter
   cases against the original selectors: Low/High at 1600×900, 844×390 and
   390×844. That capture passed **four tests in one file**. The resulting
   `tests/fixtures/challenger-keepout.json` records exact bounds, counts, draw
   calls and SHA-256 hashes of every instance matrix/color buffer. Existing
   snapshots and numerical assertions were not changed or regenerated.
2. The migrated callback matches those captures exactly. Low bounds are
   `[-484.3211063720522, -10924.859178454482, 493.76746796970417]` through
   `[-449.3814033843813, -10890.72942817291, 518.9262909830098]`; High bounds are
   `[-484.2806314803896, -10925.259231232789, 493.92854260807087]` through
   `[-449.3814033843813, -10891.106605284598, 518.9262909830098]`.
   Each viewport retains 10/249 boulders, 289/3178 total instances and four
   draws at Low/High. Existing collision, camera-arm, spawn-clearance and
   non-boulder preservation checks remain intact.

Existing capability tests now also cover all thirteen shipped sites, unknown
sites, missing content/heroes, explicit content overrides, mission loading,
disabled policy, a different hero ID, and a scaled/rotated/slope-aligned prop.
They assert delayed callback ordering, the exact event payload and nonmutation
of local bounds. The validator table covers malformed sections, unknown fields,
invalid flags and missing opening references. Shipped-content coverage verifies
Challenger is the only enabled site and its existing hero belongs to its props.
The existing other-site/unknown-site scatter snapshots are retained unchanged.

## Net simplification and scope

Deletes both identity selectors and one nesting level; reuses the opening hero
and one manifest read for scatter and camera policy. Runtime props wiring is
two lines shorter; the required typed section and strict validation add ten net
lines, for **eight net shared TypeScript lines added**. There is no new helper,
independent tuning table, resource lifecycle, setting or UI surface. No terrain
carving, life exclusion, material profile or atmosphere code/data changed.
The prop/material slice and queued atmosphere slice remain separate.

## Validation

- Focused command: `npx vitest run tests/unit/siteManifest.test.ts tests/unit/props-loader.test.ts tests/unit/verify1360.test.ts tests/unit/beebeScatter.test.ts tests/unit/props-geo.test.ts tests/unit/deepOpening.test.ts tests/unit/openingClearance1290.test.ts tests/unit/arcadeLoadout.test.ts --configLoader runner --cache=false`:
  **254 tests in eight files passed** (62.90 s).
- `npm run typecheck`: **passed**.
- A second diagnostic run with the verbose reporter passed the same **254 tests
  in eight files**: 112 policy/validator tests (1.40 s) plus 142 geometry, scatter,
  clearance and loadout tests (55.79 s).
- Repository-wide `npx prettier --check .`, `python3 tools/check_attribution.py`
  (14 asset files) and `git diff --check`: **passed**.
- Full invocation: `GATES_CONFIG_MODE=writable PW_PORT=4240 FULL_E2E=1 ROUNDS=2 bash tools/gates.sh --full-e2e`.
  **Completed, exit 1**. Configuration, content, production build, unit,
  attribution and repository-wide Prettier gates passed. Full unit result:
  **2,417 tests in 192 files passed** (373.77 s).
- Python gate: **162/166 passed**; four build-manifest provenance tests fail with
  `spawnSync git EPERM`, the same failures documented by the preceding slice.
  No provenance check was bypassed.
- Both full-suite `e2e` and project-base `e2e-base` gates failed **before browser
  tests** because Playwright's owned preview server could not start. The
  project-base production build passed before its preview startup failure.
- The full browser suite was also invoked directly against the gate build on
  port 4241. It exited **1 before tests**, because its preview server could not
  start. Direct reproduction reports `listen EPERM 127.0.0.1:4241`.
  A separate project-base build also passed; its browser invocation on port
  4242 likewise exited 1 before tests because the preview failed to start.

Logs: `.cache/scatter-keepout/` and `.cache/runs/20261016-051848-3-OnaRv1/`.
Full gates are **not green in this sandbox**. Re-run them where provenance
subprocesses and local preview binding are permitted.
No browser or visual acceptance pass is claimed. No checks, runner settings or
regression assertions were weakened.
