# 2130 — S-bughunt, eighth pass

## Plan

Two rounds auditing audio and input lifecycles. Reproduce confirmed bugs in
existing capability unit suites before minimal fixes. Preserve visuals,
settings, storage keys and tuning.

## Round 1 — input focus

- Reviewed keyboard, touch and gamepad sampling, editable focus, interruption
  cleanup, pointer cancellation and pause/resume clock coverage.
- Reproduced gamepad polling restoring flight controls after editable focus
  cleared them. All four new cases (input, textarea, select, contenteditable)
  failed before the fix; the existing 45 input tests passed.
- Reuse the editable-target predicate during sampling and clear merged input
  while the editor owns focus. Continue polling pad button history so returning
  to play does not fire an old toggle. Held pad axes resume normally; cleared
  touch latches stay clear. Tests exercise two focus/play cycles per editor.
- After the fix: input, app-system/clock and touch suites pass **105 tests in
  four files**. Logs: `/tmp/2130-input-before.log`, `/tmp/2130-input-after.log`.

## Round 2 — audio lifecycle

- Reviewed gesture unlock, suspend/resume races, saved gains, source disposal
  and bus subscriptions. Existing capability tests cover these paths.
- Reproduced scan-start callbacks producing captions and latching scan hum
  while paused/hidden. EventBus snapshots also allowed a queued callback to emit
  after an earlier listener disposed audio; a servo-caption subscriber disposing
  audio had the same effect. All four new cases failed before the fix; the
  existing 45 lifecycle tests passed.
- Guard scan starts before playback and again after the synchronous servo
  caption callback. Tests verify no blocked captions or resumed phantom hum,
  normal scanning/abort afterward, and disconnected graphs after disposal.
- After the fix: audio lifecycle, mobile gesture integration, audio math/mix and
  saved-settings suites pass **102 tests in five files**. Logs:
  `/tmp/2130-audio-before.log`, `/tmp/2130-audio-after.log`.

No visuals, settings, storage contracts or tuning changed. Existing tests retain
coverage for tab-hide resume/suspend ordering, interrupted/rejected mobile
unlocks, muted saved gains, gesture/visibility/input listener removal, scene
re-entry, stick/slider/scan cancellation, mixed-device input, and paused/hidden
mission/physics timers.

## Validation

- PASS: TypeScript (`npm run typecheck`). Log: `/tmp/2130-typecheck.log`.
- PASS: production build with the repository's writable-config workaround:
  bundle `vite.config.ts` through Rolldown into `.cache/2130/vite.config.mjs`,
  then `npm run build -- --config .cache/2130/vite.config.mjs --configLoader native --outDir dist-2130`.
  Log: `/tmp/2130-build.log`.
- PASS: strict content validation, attribution, changed-file Prettier and
  `git diff --check`.
- Python: **162/166 passed**. Four build-manifest tests fail because the sandbox
  rejects `spawnSync git` with `EPERM`. Log: `/tmp/2130-python.log`.
- Browser suite attempted against isolated `dist-2130`, port 4230, with
  `GATES_CONFIG_MODE=writable PW_PORT=4230 PW_OUTDIR=dist-2130 npm run test:e2e`.
  Preview cannot bind `127.0.0.1:4230` (`listen EPERM`), so no browser assertions
  or screenshot QA ran. Logs: `/tmp/2130-e2e.log`, `/tmp/2130-preview.log`.
- PASS: full unit suite, **191 files / 2,299 tests**, in 440.97 seconds:
  `npx vitest run --configLoader runner --pool=threads --cache=false --reporter=verbose`.
  Log: `/tmp/2130-unit-full.log`.

Changes are uncommitted. Temporary isolated build/config output was removed
after validation.
