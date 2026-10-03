# F-BUGHUNT-5

2026-10-03. Two audit/fix rounds in the current worktree; no commit. Read
`plan/DIRECTOR.md` and the F-BUGHUNT-3-FIXES/F-BUGHUNT-4 notes. Reviewed
`git log f5..main`, particularly `e3d4605` (deferred hull), `84e5430`
(save-soak), `b6a10cb` (portrait telemetry), and `933db7b`/`ad38c53`
(Lost City biome, seven spires and shimmer expectations).

## Round 1 — confirmed defects and fixes

- **Input / repeated mode transitions:** holding a gamepad's Start toggled
  photo mode every sampled frame; camera, sonar, lights and sim speed had the
  same problem. Track rising button edges per pad index and clear history on
  disconnect/disposal. Scan and boost remain held actions. This is an inherited
  gap in the audited Input path, not newly introduced by save-soak.
- **Discovery migration overflow:** two valid finite counts of `1e308`
  overflowed the aggregated scan count to Infinity, which JSON writes as null.
  Clamp migrated counters and saturate sums/increments at
  `Number.MAX_SAFE_INTEGER`. Preserve discoveries, dates and ordinary counts.
  The save-soak finite-field check missed finite operands whose sum overflows.
- **Tile validation:** the previously confirmed F-BUGHUNT-4 zero-spacing
  defect remained open. Reject nonnumeric/unsafe grid dimensions, nonpositive
  or nonfinite metric cell sizes, invalid geographic bounds/centres and
  nonfinite/reversed depth extrema. Check decoded float32 samples on both
  endian paths and the optional uint16 path; reject nonfinite quantisation
  parameters and float32 overflow. Optional decode failure retains canonical
  fallback. Upgrade the previous characterization test to assert rejection.
- All 22 initial defect repros failed against the original code, then passed
  with the fixes. Focused Input/Discovery/TileLoader suite: 66 tests passed.
  Changelog updated and changed files formatted with Prettier.

## Round 2 — review and acceptance

- Deferred hull/access safety survived both mode directions, briefings,
  retrieval of a deployed ROV, props delays/failures, and subsequent site loads
  in the existing integration tests. The captured initial mode in mission
  composition agrees with the documented loaded-dive policy; no new stale-hull
  defect reproduced. Live speed/light/sensor options continue through the
  existing settings subscriptions.
- Save.ts legacy recovery, hostile storage, future schema protection and
  reset isolation passed the save-soak tests. Binding migration intentionally
  reserves changed default keys before legacy custom conflicts, as asserted in
  `subInput.test.ts`; no policy change here.
- All shipped tile metadata and canonical heightmaps pass the stricter
  boundary. Quantised files are derived, ignored assets and absent here;
  synthetic quantised decoding/fallback tests pass.
- Actual Lost City props and terrain load on low and high: all 12 carbonate
  chimneys placed, zero skipped/failed, finite bounds/positions, and a
  collision-free composed opening within the Class A rating. Existing
  primary-objective and hero camera framing tests pass. No biome/props change
  was needed.
- Broader targeted audit: 112 tests passed across arcade loadout, save-soak,
  F-BUGHUNT-4, free/mission composition and Daily systems. New package suite:
  26 tests passed, including canonical fallback after optional decode overflow.
- `tools/gates.sh --no-e2e`: **PASS build, unit, Python, strict content,
  attribution and Prettier**. Full unit suite: **88 files / 913 tests passed**.
  `git diff --check` passed. E2e is excluded because it cannot run in this
  sandbox; the complete browser gates still need an external run.

## Unconfirmed follow-ups

- Portrait objectives completion/abort banners could extend the telemetry
  stack into the lower scan/tutorial/control region on short phones at 150%
  scale. Existing sonar/right-column specificity and ResizeObserver stacking
  remain intact; browser bounds must establish any actual overlap.
- Lost City's background spires could occlude small scan markers or affect
  first-ten-second readability/phone FPS. Placement, opening and geometry
  checks pass, but those visual/performance concerns need fresh browser shots.
- No browser-rendered phone, golden-shot or e2e acceptance is claimed. E2e
  cannot run in this sandbox; run the complete `tools/gates.sh` outside it,
  including existing portrait and save-soak Playwright specs.

The ignored shared node_modules symlink was temporarily replaced with links
to the same packages plus writable local Vite caches for sandbox gate execution,
then restored. No dependency, lockfile or gate configuration changes.
