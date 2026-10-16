# S-perf-stall — bounded sampling of real stalls

`late.perf` now uses the existing frame state to exclude hidden, frozen and
first-resumed intervals from both performance telemetry and dynamic resolution.
It still advances its timestamp on skipped frames, so the next active sample
starts at the preceding frame. Active intervals of 250 ms or longer contribute
one sample capped at 250 ms to both averages. A timestamp of zero is now a valid
baseline rather than the uninitialized sentinel.

The loop's `resumeFrame` handling and the dynamic resolution controller are
unchanged. Home remains frozen and needs no additional frame fields. No settings,
UI, visual tuning, listeners or parallel timing state were added; one shared
sample and exclusion check replace the duration heuristic and separate frozen
check. Settings continue to resolve once during initialization.

Existing capability specs identify the regressions they guard:

- `quality.test.ts`: samples at 250, 300 and 5,000 ms raise the reported average
  by the same bounded amount and recover on the next normal frame; one stall
  cannot immediately resize the renderer.
- `quality.test.ts`: repeated active 500 ms frames lower resolution while
  respecting the configured floor, guarding against telemetry-only fixes.
- `quality.test.ts`: hidden, frozen and resume intervals leave the average and
  resolution unchanged, including short intervals and repeated long gaps; the
  next normal sample uses the updated baseline.
- `appSystems.test.ts`: the existing clock/resume regression also runs the real
  quality system, proving that actual loop transitions (including no RAF while
  hidden and throttled hidden RAF) exclude resume gaps without lowering resolution.
  Clock, fixed-step and listener-cleanup assertions remain in place.

Validation:

- Two focused rounds of quality and app-system specs: **53/53 tests pass each**
  in two existing files.
- `git diff --check` and changed-file formatting pass.
- Full `GATES_CONFIG_MODE=writable bash tools/gates.sh` completed with exit 1.
  Logs: `.cache/runs/20261016-054650-2-y6XME5/`.
- Full unit suite: **2,390/2,390 tests pass across 192 files** (335.46 seconds).
  Content, production build/typecheck, attribution and repository-wide Prettier
  pass. The project-base build also succeeds.
- Python: **162/166 tests pass**. The four build-manifest failures report
  `spawnSync git EPERM`, matching the environment failures documented by the
  preceding Controls work; no manifest or gate code was changed.
- Both browser gates fail before assertions because their preview server cannot
  start. A direct preview probe confirms
  `listen EPERM: operation not permitted 127.0.0.1:4372`.
  Browser checks remain unverified in this restricted environment.
