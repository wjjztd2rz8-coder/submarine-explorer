# 3500 S-bughunt: audio lifecycle

Serves DIRECTOR Backlog 9 (`S-verify / S-bughunt`). Scope: headless audio
lifecycle coverage with the existing stubbed AudioContext capability specs.

## Plan

1. Audit pass 1: trace lazy context creation, saved mute, suspension/recovery,
   and scene teardown. Add regression cases before minimal confirmed fixes.
2. Audit pass 2: review asynchronous and synchronous callbacks around teardown,
   exercise scene re-entry, and verify all requested lifecycle boundaries.
3. Run focused audio tests and `tools/gates.sh`; record results and limitations
   in this note and a final report.

## Progress

- Read `plan/DIRECTOR.md`, `CONTRIBUTING-AGENTS.md`, the audio modules, app
  integration, and existing audio capability specs. Working tree started clean.
- Existing coverage already checks saved gains before warmup, independent
  pause/visibility state, delayed suspend/resume reconciliation, rejected resume,
  and ordinary repeated teardown. Extend those specs rather than create a
  package-specific test file.
- Pass 1 reproduced five failures in the expanded lifecycle spec: throwing
  context construction and scene disposal from each of thruster, vent, shrimp,
  and hull-creak captions. The latter left connected nodes because the active
  frame continued allocating cues after teardown.
- Fixed construction failure at the existing lazy creation boundary: leave the
  system locked and retry on a later gesture. Saved settings remain available,
  including mute and volume edits made between attempts.
- Fixed scene disposal with early returns after caption-producing operations in
  `AudioSystem.update` and inside `Soundscape.update`. Reuse existing disposed
  and playback-blocked state; no new lifecycle state or cleanup machinery.
- Pass 2 reviewed pending unlock, optional sample loading, one-shot ownership,
  spatial voices, whale calls, loop ownership, and event subscriptions. Added a
  scene re-entry case with old unlock/fetch completions and a new active whale
  call plus scan cue, followed by suspended teardown. No additional production
  defect was found in that asynchronous path.
- Strengthened the shrimp-disposal fixture with a loaded, eligible whale sample
  so continuing past the caption would allocate an observable leaked voice.
- Added eight parameter-expanded cases to `audioLifecycle.test.ts`: constructor
  failure/retry (one), suspended/interrupted gesture recovery (two), caption
  disposal (four), and pending scene re-entry (one). Existing saved-gain tests
  continue to check mute before even the warmup source starts. Existing pause,
  hidden-tab, rejected-resume and race assertions remain unchanged.
- Focused final run: **87 tests passed across four audio capability specs**.
  Command: `npm test -- --configLoader runner --cache=false tests/unit/audioLifecycle.test.ts tests/unit/audio.test.ts tests/unit/audioTouchUnlock.test.ts tests/unit/f3Audio.test.ts`.
- Updated `docs/audio.md` with construction failure/retry and callback teardown
  behavior. `git diff --check` passes.

## Gates

Command: `GATES_CONFIG_MODE=writable bash tools/gates.sh`. The existing writable
config mode avoids writing temporary bundles into the shared dependency tree.
Logs: `.cache/runs/20261023-134714-2-00VCYc/`.

- PASS config, strict content validation, and production build.
- Python: **167 tests, five failures**. Four `test_ci_build_manifest` cases fail
  at `spawnSync git EPERM`; `test_golden_tooling` reports `Unexpected end of JSON input`
  from its comparison child output. These same failures are recorded in
  earlier audits, including `3440-S-verify-unit-gap-audit.md`. The golden child
  failure's underlying cause is not established here. No gate or assertion was
  changed to hide these failures.
- Full unit, browser smoke/project-base, attribution, and Prettier results pending.

## Simplicity

No new settings, UI, dependencies, lifecycle abstraction, or site-specific code.
Keep fixes at the existing ownership boundaries and use existing capability
specs. Package history stays in this note and the report.

## Acceptance limits

Both audit passes are complete. Unit checks model nodes, sources, gain settings,
context promises and events; they do not establish audible output or real-device
autoplay behavior. No visual work or device acceptance is claimed.
