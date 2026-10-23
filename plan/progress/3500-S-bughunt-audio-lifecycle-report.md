# 3500 S-bughunt: audio lifecycle — final report

DIRECTOR Backlog 9. Two audit passes completed. Details and reproduction history
are in [the progress note](3500-S-bughunt-audio-lifecycle.md).

## Confirmed defects fixed

1. A throwing AudioContext constructor escaped the input gesture handler.
   `AudioSystem.unlock()` now leaves audio locked so a later gesture can retry.
   Saved mute and volume edits survive the failed attempt.
2. A caption subscriber could dispose the scene during an audio frame, after
   which the remaining frame still created connected cue nodes. Early returns
   in `AudioSystem.update()` and `Soundscape.update()` stop that work using the
   existing disposal state.

The production diff adds only a construction guard and callback-boundary checks.
No dependency, setting, UI, public signature, site branch, or cleanup abstraction
was added. All existing regression assertions remain.

## Coverage and results

Eight cases were added to the existing `audioLifecycle.test.ts` capability spec:
constructor failure/retry, recovery from suspended and interrupted contexts,
four caption-triggered teardown paths, and scene re-entry with pending unlock
and optional sample loading. The teardown cases include an eligible whale call,
so source allocation after disposal is observable. Existing cases continue to
cover mute before warmup, pause/visibility races, graph reuse, rejected resumes,
and complete source/processor teardown.

- Focused audio suite: **87 passed across four specs**.
- Canonical gates: `GATES_CONFIG_MODE=writable bash tools/gates.sh`.
- Config preparation, strict content validation, and production build: passed.
- Python: 167 tests, five failures matching earlier audit reports. Four manifest
  tests hit `spawnSync git EPERM`; golden tooling fails to parse child stdout
  (`Unexpected end of JSON input`). The latter's underlying cause is unresolved.
- Remaining gate results pending; logs are under
  `.cache/runs/20261023-134714-2-00VCYc/`.

Headless stubs verify lifecycle behavior and graph ownership. Audible output and
physical-device autoplay behavior were outside this audit's acceptance scope.
