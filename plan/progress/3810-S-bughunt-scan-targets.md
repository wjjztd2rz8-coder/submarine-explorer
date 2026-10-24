# 3810 — S-bughunt scan-target registry

2026-10-24. Director Backlog 9, **S-verify / S-bughunt [Codex, standing]**.
Audited SHA: **`37a88eade4cd77640dcb78b843d4efe34286d101`**.

## Scope and ownership

Read Director Backlog, simplicity rules and rubric; newest dated Review
(2026-10-24 midday, below the older targeted preamble); Overnight Log through
run 116; CONTRIBUTING-AGENTS; launched 3790–3810 briefs; relevant 3040/3700,
3640/3740 Journal briefs, reports and progress; and 3760–3780 results. Prior
wrapper PASS summaries do not supersede the failures described in their reports.
No applicable AGENTS.md was found.

Before edits, pinned the clean checkout and inventoried all registered worktree
HEADs, statuses, staged/unstaged statistics, main-relative committed paths and
diffs of candidate owned paths. Rechecked HEAD/status and neighboring ownership
immediately before editing. 3790 save and 3800 spawn-determinism worktrees were
clean with disjoint briefs. Finished 3760–3780 remained registered but clean;
their changes are already collected at this checkout. Main had an unrelated
`tests/e2e/presets.spec.ts` edit. Held 2980/3050 collision, 3310 journeys,
3320/3340 browser and 3380 CI work remain untouched and uncollected. The held
3310 Scanner source matches HEAD; its older test file lacks collected 3700
guards. No held patch was imported or required.

Only `tests/unit/gamePois.test.ts` and this named note change. That existing
capability covers POI depth placement and hull-safe spawning, making it the
closest depth/hull spec for registry output. Production, fixtures, authored
data, snapshots, tools and other progress notes remain read-only.

## Round 1: existing supported contracts

- **Identity:** [Pois.parsePois](../../src/game/Pois.ts#L95) rejects nonfinite
  lat/lon and retains the first duplicate ID. The existing
  [parser guard](../../tests/unit/gamePois.test.ts#L45) checks malformed and
  duplicate entries. [gameExplore](../../tests/unit/gameExplore.test.ts#L199)
  checks every indexed site's coexisting POI, secret, sample and supported
  wildlife IDs, objective isolation, global wildlife namespace separation and
  cross-site reload isolation. IDs are unique within a site, not globally;
  discovery identity includes the landmark. [Strict content validation](../../tools/validate_landmark.py#L285)
  rejects raw duplicate POIs, nonfinite numbers, out-of-bbox coordinates and
  invalid authored guide links rather than hiding them through parser dedupe.
- **Position/depth:** [placePois](../../src/game/Pois.ts#L164) excludes
  out-of-bbox POIs, converts geographic coordinates to metres and clamps Y to
  the sampled seabed. [Existing depth and placement tests](../../tests/unit/gamePois.test.ts#L61)
  cover signed depth, snapping, defaults and outside-tile rejection.
  [exploreTerrain](../../tests/unit/exploreTerrain.test.ts#L22) checks all 13
  sites' secret/sample bounds, seabed offsets and scanning through physics.
  Wildlife uses [one cached target per eligible species](../../src/world/life/Life.ts#L102),
  with position supplied by the selected live animal; it is not an authored
  static POI. Animal/scatter spawn determinism is 3800's separate slice.
- **Journal:** [buildJournalSite](../../src/game/JournalData.ts#L249) constructs
  linked entries; [copyJournal](../../tests/unit/copyJournal.test.ts#L20) checks
  all 13 sites' objectives, unique Journal keys and authored provenance, and
  [its all-POI loop](../../tests/unit/copyJournal.test.ts#L127) requires exactly
  one authored Journal link for every POI. [journalData](../../tests/unit/journalData.test.ts#L105)
  tests hero and nonhero scan/reload unlocking, wildlife identity, isolation,
  counts and retained first timestamps. Collected [3640](3640-S-bughunt-journal-discovery.md)
  and [3740](3740-S-bughunt-journal-reload.md) already audit those contracts.
- **No repeat reward in a dive:** [Scanner.update](../../src/game/Scanner.ts#L290)
  excludes scanned keys in every pool;
  [complete](../../src/game/Scanner.ts#L481) checks/adds membership before
  recording or emitting. [Same-dive hold and re-hold](../../tests/unit/gameScanner.test.ts#L711)
  retain exactly one completion and count. [Three-pool edge cases](../../tests/unit/gameScanner.test.ts#L327)
  exercise 0/100 m, held/released scans, exact payload cardinality and finite
  progress. [Progress.award](../../src/game/Progress.ts#L118) independently
  guards rewarded identities, with [curiosity reward guards](../../tests/unit/exploreTerrain.test.ts#L94)
  and [repeat-reward capability](../../tests/unit/progress.test.ts#L130).
  [Samples.collect](../../src/game/Samples.ts#L14) is also idempotent per dive.
  Arrival event contacts are hint-only; existing
  [Scanner arrival guards](../../tests/unit/gameScanner.test.ts#L224) prohibit
  their entering the beam in all three pools. Their separate witness/Journal
  path has [no-bonus and provenance guards](../../tests/unit/eventsReform.test.ts#L214)
  and [per-site arrival/re-entry coverage](../../tests/unit/eventsSystem.test.ts#L24).

## Round 2: material gap and policy review

The missing assertion was complete runtime POI placement across the shipped
catalogue. Input validation, first-objective tests and hero reachability can
pass without checking every optional placed POI's finite coordinates against
the actual terrain footprint. The new table in
[gamePois](../../tests/unit/gamePois.test.ts#L82) adds 13 cases covering all 52
authored POIs using shipped GMRT heightmaps and the real Low terrain sampler.
It requires nonempty authored
lists, no parser/placement losses, finite XYZ, containment, underwater placement
and no burial below the sampled floor. Terrain resources are disposed. It does
not build a renderer, create a WebGL context or assess images.

No supported-path defect was reproduced. The new guard passes against unchanged
production; there is **no failing-before/passing-after fix claim** and no
production correction is proposed. This adds an output contract rather than
reimplementing placement arithmetic, adding another registry or duplicating the
already comprehensive Journal/reward cases.

The requested “never rescans” contract is dive-local: `resetDive()` deliberately
permits a later completed scan, with `firstTime: false` and count incremented.
DiscoveryStore.record intentionally counts valid completions; it does not own
Scanner's dive deduplication. Persistent cosmetic rewards remain idempotent.
Infinity is also a documented absent-distance sentinel in ScanView, not a
nonfinite target position defect. No broader malformed-caller guarantee or
ambiguous product policy is asserted.

## Validation

- Baseline: `npm test -- --configLoader runner --cache=false tests/unit/gamePois.test.ts`
  — exit 0, **15 tests / 1 file passed**, 196 ms.
  Log: `/tmp/3810-pois-baseline.log`.
- Initial focus included a nonexistent `tests/unit/gameProgress.test.ts` filter;
  Vitest ignored that unmatched filter and reported exit 0, **292 tests / 7
  files passed**, 4.93 s. This does not validate that nonexistent spec.
  Log: `/tmp/3810-focused.log`.
- Final focus: `npm test -- --configLoader runner --cache=false tests/unit/gamePois.test.ts tests/unit/gameScanner.test.ts tests/unit/gameExplore.test.ts tests/unit/copyJournal.test.ts tests/unit/journalData.test.ts tests/unit/exploreTerrain.test.ts tests/unit/gameDiscoveryStore.test.ts tests/unit/progress.test.ts tests/unit/progressMigration.test.ts`
  — exit 0, **345 tests / 9 files passed**, 5.33 s. Includes all 28 POI tests
  (15 historical plus 13 new site cases).
  Log: `/tmp/3810-focused-final.log`.
- Required: `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`
  — running; actual outcomes will be recorded after completion.
  Run directory: `.cache/runs/20261024-110311-3-tk65QU/`;
  combined log: `/tmp/3810-gates.log`.
  Python: **167 tests, 5 failures**, 10.257 s. The four
  `test_ci_build_manifest.TestCiBuildManifest` failures are
  `test_both_bases_survive_copy_and_verify_all_provenance_fields`,
  `test_every_manifest_mismatch_is_rejected`,
  `test_missing_output_or_manifest_and_workflow_sha_mismatch_fail`, and
  `test_symlinks_missing_public_data_and_manifest_overwrite_are_rejected`:
  all fail creating the fixture manifest because Node's `spawnSync git` returns
  `EPERM` at `tools/ci-build-manifest.mjs:11`. The fifth,
  `test_golden.TestGolden.test_golden_tooling`, reports `Unexpected end of JSON
input` at `tools/tests/golden-manifest.test.mjs:151` in the partial/missing/
  incompatible-set rejection subtest. These are the same tooling failure
  signatures reported by collected 3740/3760/3770; they are not counted as
  successful checks or scan-target regressions. Tooling is outside ownership.

## Simplicity and limits

One table extends an existing capability; no runtime complexity or new
abstraction, UI, setting, site branch, config mutation, dependency, schema or
policy. Historical assertions, tolerances, budgets and snapshots are preserved.
Correct registry placement and single rewards protect simple, rewarding,
honest exploration. Real terrain, all 13 identities, five heroes, scanning,
Journal, marine life, input, accessibility and Arcade default are unchanged.

Actual local e2e mode: **none**. No browser, game rendering, WebGL context,
screenshots, hosted CI, GPU, unaided journeys or real-phone validation. Visual
readability/beauty, touch layout and phone performance remain with Claude/owner.
No merge, push, tag or hosted workflow dispatch.
