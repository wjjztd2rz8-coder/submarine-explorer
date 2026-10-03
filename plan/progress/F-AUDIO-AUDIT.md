# F-AUDIO-AUDIT

## Round 1 — audit and fixes

- Audited score, soundscape, all SFX, audio shell wiring, volume sliders and Save.
- Hidden tabs had no audio lifecycle handler. Pause and visibility now block
  independently, silence master gain synchronously and suspend the audio clock.
  Resuming a hidden dive or returning to a paused tab keeps audio suspended.
- First gestures on home/pause skipped context resume. A silent one-sample
  source now starts inside the gesture; the paused graph suspends after unlock.
  Later paused gestures preserve the frozen clock. Late resume promises reconcile
  against the current pause/visibility/disposal state.
- Discovery, repeat-scan and trench cues could queue while paused. All cue paths
  now honor pause/visibility; pending sonar echoes cancel when playback blocks.
- Several one-shots and all continuous loops left processors connected. Engine
  ownership now disconnects complete source groups at their final ended event or
  disposal, including suspended sources and habitat-exit whale calls. Stop and
  disposal are idempotent; graph nodes are reused across mode switches.
- Stacked effects lacked output protection. The master mix now passes through
  compression and a unity sample peak guard with configurable 0.95 ceiling.
- Audio sliders already save on input and Save already persists all three gains
  and mute. No production persistence change needed; browser coverage now uses
  input alone, omitting the change event, before reload.

## Round 2 — regression review and verification

- Added `tests/unit/audioLifecycle.test.ts`: 16 tests covering warmup, async
  resume races, independent visibility/pause, muted restore, blocked cues, stale
  echoes, ten mode cycles, ended one-shots, loop teardown, whale habitat exit
  and output protection.
- Added touch integration coverage for capture-phase pointer press/release,
  touch end and keyboard listeners across two restarts. Rejected first resumes
  release the silent warmup and remain retryable from a later touch gesture.
- Extended real Chromium audio coverage for pause/visibility and input-only
  slider persistence. Existing touch and first-source saved gains remain covered.
- Updated `docs/audio.md` and `CHANGELOG.md`; no commits made.
- Ignored node_modules and screenshot symlinks pointed outside writable roots.
  Replaced with worktree-local copies/directories for Vite caches and screenshots;
  tracked dependency/setup files are unchanged.
- Targeted lifecycle/touch tests pass (17 tests); TypeScript strict checking passes.
- Full `PW_PORT=4190 tools/gates.sh`: build, unit, Python, strict content,
  attribution and Prettier pass. Both browser gates fail before running tests
  because this sandbox denies binding localhost (`listen EPERM 127.0.0.1:4190`;
  project-base port 4290 is likewise unavailable). Targeted Chromium audio
  startup hits the same restriction. No browser screenshots could be produced
  or reviewed.
- Final `PW_PORT=4190 tools/gates.sh --no-e2e` passes all six gates, including
  **949 unit tests across 92 files**. All changed files were formatted individually;
  `git diff --check` passes. The only integration/tuning changes outside audio
  are capture-phase gesture wiring in `src/app/systems/audio.ts` and output
  protection defaults in `src/core/config/audio.ts`.

## Orchestrator gate follow-up — Playwright dependency identity

- The orchestrator's unrestricted gate run passed the six non-browser gates,
  then failed both browser gates during collection with no tests found. These
  failures occurred before any audio or other browser assertions ran.
- Reproduced locally with `npx playwright test --list`: every suite declaration
  failed. A fresh transform cache had the same failure, ruling out stale test
  transforms.
- Root cause: the worktree-local dependency copy retained an absolute
  `node_modules/node_modules` symlink to
  `/home/vijay/submarine-explorer/node_modules`. ESM package resolution followed
  that nested link, while the CLI and CommonJS loaded the worktree-local tree.
  These were two instances of the same Playwright version, not invalid test
  declarations or skip conditions.
- Removed only the ignored local nested symlink. A direct ESM/CommonJS singleton
  comparison now returns `true`, with the Playwright common module loaded solely
  from this worktree. No test declarations, assertions, skips, timeouts,
  dependency versions or tracked gate/configuration files changed.
- `npx playwright test --list`: **237 tests in 47 files** collect successfully.
- `PW_BASE=/submarine-explorer/ npx playwright test tests/e2e/base-url.spec.ts --list`: **1 test in 1 file** collects successfully, including its original
  conditional skip declaration.
- Actual browser execution still belongs to the orchestrator's unrestricted
  environment; this sandbox cannot bind the Vite preview port. Test discovery
  requires neither Vite nor Chromium and verifies the reported collection
  failures are fixed.

- Follow-up `PW_PORT=4370 tools/gates.sh --no-e2e` passes all six gates,
  including **949 unit tests**. The exact npm e2e gate entry point also
  successfully lists **237 tests**. Prettier and `git diff --check` pass.
