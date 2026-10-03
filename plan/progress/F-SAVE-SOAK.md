# F-SAVE-SOAK

## Scope

- Historical save fixtures: settings unversioned/v0/v1/v2, bindings v1/v2/v3,
  discovery v0 arrays/maps/wrappers and v1, progress unversioned/v0/v1,
  onboarding unversioned/v1, and the first photo/daily schemas (v1).
- Empty, absent, corrupt, truncated and invalid JSON roots recover to usable
  stores; fresh work survives a new store instance. Invalid individual fields
  retain valid neighbouring data. Recovering any collection leaves every other
  stored collection byte-for-byte intact; future schemas remain untouched.
- Recoverable legacy settings/bindings remain available behind damaged current
  entries. Legacy originals are retained after migration. Completely truncated
  JSON without an intact legacy copy cannot reconstruct missing data; it safely
  starts empty/default and preserves other collections.
- Fixed explicit v0 settings, bare discovery maps, array-shaped discovery
  records and infinite scan counters. Binding edits/resets preserve future saves.
- Added lazy `__game.perf.sceneObjects`, `geometries`, `textures` counters, so
  counting includes hidden attached objects without adding per-frame traversal.
- Headless soak performs ten UI dive/mode/debrief/restart/reload cycles, plus
  ten same-scene mission restarts per cycle while paused. Separate frozen boot
  baselines per mode avoid confusing intentional visibility/resource differences
  with leaks. Marine life remains enabled. Console errors and page errors are
  captured across navigation; the original saves are seeded only once per tab.

## Validation

- First regression run reproduced legacy recovery, explicit-v0 and bare-map
  failures plus non-finite discovery counts; corrected these and reran.
- New unit suite: 47 tests passed. Strict TypeScript passed.
- Browser execution blocked here: Vite cannot listen on localhost (`EPERM`),
  and a direct headless Chromium launch fails with a denied `shutdown` operation.
  The new e2e is implemented and typechecked but runtime assertions are unverified.
- Full `tools/gates.sh` results pending below.

## Environment

The supplied node_modules symlink points into a read-only checkout. Vite's config
loader could not create `.vite-temp`. Copied dependencies into
`/tmp/save-soak-deps/node_modules` and temporarily pointed this worktree's ignored
symlink there to run validation; no package or lockfile changes.

No commits made.
