# 3670 — S-bughunt: audio state

Serves `plan/DIRECTOR.md` Backlog 9 (`S-verify / S-bughunt`, Codex standing).
Audited checkout: `54c6c9df62ed70b82c6d01223470a604c3d66173`.

## Scope and ownership

- Read Director Backlog, simplicity rules and rubric; the newest dated review
  (`2026-10-24 early`, below the older targeted entry at the top of
  `plan/REVIEWS.md`); and the Overnight log through run 110. Read repository
  conventions, launched audio/settings/adjacent briefs, previous audio progress
  and final report, and the 3590/3600 results and progress notes. Their wrapper
  PASS summaries conflict with the agents' recorded failures; they are historical
  evidence, not validation of this checkout.
- Checked registered worktree status, tracked diff paths/statistics and branch
  differences before editing. This worktree and main started clean at the SHA
  above. Held 2980/3050 collision edits, 3310 journeys, 3320/3340/3380 packages,
  and finished or active 3640–3660 work remain separate. Concurrent 3680/3690
  own settings and depth/hull slices; none of those diffs owns this audio spec
  or progress note. No patches were collected or used.
- The brief describes 3580–3600 as uncollected; current registry has no such
  worktrees, and Overnight run 106 records their earlier collection. Their
  progress notes and the audio reload tests are already in the pinned checkout.
  This audit does not recollect, edit or rebrief them.
- Only this progress note changes. Production, tests, fixtures, snapshots,
  authored data, tools, Director, and four collision expected failures remain
  untouched.

## Round 1: capability map

All references below are to the pinned checkout; test paths are existing guards.

| Supported contract                                                                                                                          | Production guard                                                                                                                                                                                                            | Existing headless evidence                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Saved mute and independent master/SFX/music gains apply before the first source; zero is valid; unmute restores the chosen volume           | `src/app/systems/audio.ts:26` applies saved settings before gestures; `src/audio/AudioSystem.ts:60` applies the saved mix and `:158` initializes gains before unlock                                                        | `tests/unit/audioLifecycle.test.ts:130` reload round trip for both mute values; `:180` constructor-failure recovery then unmute to 0.4; `:335` six saved-gain cases inspect gains before the warmup starts                                                               |
| Pause and hidden state are independent; gain edits cannot unsilence a blocked graph; return restores the saved mix without recreating loops | `src/audio/AudioSystem.ts:43` combines pause/hidden; `:178` and `:184` reconcile current state, cancel scheduled master changes and silence synchronously                                                                   | `tests/unit/audioLifecycle.test.ts:335` saved gains through resume; `:476` ten pause/visibility cycles, edits while blocked and mute on return; `:622` blocked discrete cues; `:660` no stale scan start/hum                                                             |
| Gesture recovery reuses the graph, including browser suspension/interruption and rejected first resume                                      | `src/audio/AudioSystem.ts:145` reuses the engine; `src/audio/AudioEngine.ts:79` warms a source within the gesture and releases it after a rejected resume                                                                   | `tests/unit/audioLifecycle.test.ts:213` suspended/interrupted recovery with only a warmup source added; `:434` first unlock while paused; `:453` rejected warmup cleanup and later recovery                                                                              |
| Late suspend/resume completions respect current pause/visibility/disposal state                                                             | `src/audio/AudioSystem.ts:184` reconciles completion against current playback blocking and returns after disposal                                                                                                           | `tests/unit/audioLifecycle.test.ts:508` late gesture resume/pause/disposal; `:538` hide during visibility resume; `:566` late hide suspension after returning to muted play                                                                                              |
| Scene changes release nodes and old callbacks cannot allocate audio into a new scene                                                        | `src/audio/AudioSystem.ts:359` idempotent disposal and `:294` frame callback guards; `src/audio/Soundscape.ts:104` late sample-load guard and `:207` disposal                                                               | `tests/unit/audioLifecycle.test.ts:243` four caption-triggered teardowns; `:284` pending old unlock/sample load with new scene and a single whale call; `:405` three lifetimes; `:691` scan dispatch disposal; `:961` muted captions, bus unsubscription and fresh scene |
| Sources and processors are released on final end, explicit stop or suspended teardown                                                       | `src/audio/AudioEngine.ts:102` owns whole source groups with idempotent release; `:138` releases voices, buses, filters and output stages, then closes; Loops/Score/MachineLoop register sources once and update parameters | `tests/unit/audioLifecycle.test.ts:1096` cue groups disconnect after their final source; `:1110` repeated loop stop plus suspended one-shots; `:1136` whale habitat exit/end; `:1024` bed graph and teardown; `:1075` independent bus routing                            |
| App restarts remove gesture handlers, captions and save listeners                                                                           | `src/app/systems/audio.ts:20` uses the existing disposable registry for settings, audio, captions, app state and capture handlers                                                                                           | `tests/unit/audioTouchUnlock.test.ts:36` press/release/keyboard capture over two restarts and cleanup; `tests/unit/f3Audio.test.ts:129` servo dispatch and unsubscription                                                                                                |

Historical coverage/fixes: [3500 audio lifecycle progress](3500-S-bughunt-audio-lifecycle.md),
[3500 report](3500-S-bughunt-audio-lifecycle-report.md),
[original audio audit](F-AUDIO-AUDIT.md), and
[3600 settings consumer trace](3600-S-bughunt-settings-persistence.md).
`docs/audio.md` documents graph reuse, first-gesture mute, independent blocking,
complete teardown and muted accessibility captions.

## Round 2: challenge and conclusion

- Re-read the source ownership paths in AudioEngine, Loops, Score, Cues and
  Soundscape against the assertions, including delayed unlock/sample completion,
  suspended one-shots, habitat exit and disposal inside a caption callback.
  Sources start in construction/cue allocation; ordinary updates steer existing
  parameters. Pause/resume and settings changes do not rebuild continuous voices.
- Rechecked mute/unmute against saved zero gains, live edits during blocking,
  constructor retry, browser interruption and scene replacement. Mute gates the
  master while retaining the saved bus gains and accessibility captions; it does
  not tear down the graph. This matches the documented policy.
- No additional demonstrated defect or materially missing supported contract.
  Existing guards adequately cover this exact slice. Added no duplicate tests,
  abstractions, settings, dependencies or speculative production fixes. There is
  no new failing-before/passing-after evidence because no fix was needed.

## Validation

- `npm test -- --configLoader runner --cache=false tests/unit/audioLifecycle.test.ts tests/unit/audio.test.ts tests/unit/audioTouchUnlock.test.ts tests/unit/f3Audio.test.ts`
  — exit **0**, **4 files / 89 tests passed**, **2.23 s**.
  Log: `/tmp/3670-audio-focused.log`.
- Required gate command: `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`.
  Logs: `.cache/runs/20261024-044733-27-V6frgC/` and `/tmp/3670-gates.log`.
  Config preparation, strict content validation and production build passed.
  The build includes TypeScript checking; its chunk-size warning is non-fatal.
- Python: **167 tests / 5 failures**, **10.552 s**. Four unchanged
  `test_ci_build_manifest` cases fail at `spawnSync git EPERM`; unchanged
  `test_golden_tooling` fails with `Unexpected end of JSON input` from its
  comparison child output. These match the earlier audio/settings audit
  signatures. The manifest error is an environment restriction; the underlying
  reason for the empty golden child output is not established here. No tooling
  edits or bypasses were attempted.
- Full unit suite: **192 files passed; 4,132 tests passed and 4 existing
  expected failures (4,136 total)**, **714.37 s**. Historical collision
  expected-failure assertions were preserved.
- Attribution and repository-wide formatting passed. Overall required command
  exited **1**, `FAIL gates (e2e=none)`, solely from the five Python failures
  above. There were no browser gates in this run.
- Final owned-file formatting check and `git diff --check` passed. Rechecked
  checkout SHA and registered worktree ownership after the run: this checkout
  remains pinned; only this progress note is new here. No cross-worktree edits
  were made.
- Main advanced independently to `4681ff8eb0751455f1c3d745c8cbcb1f42912aa9`
  during validation, collecting only the 3640/3650 progress notes. Compared its
  paths against this checkout: no source/test or audio ownership change. The
  commands above tested the pinned checkout, not the moving main reference.

## Simplicity and limits

Evidence-only completion is net simpler than duplicating existing guards. No
runtime behavior, player guidance, settings policy, site identity or protected
exploration/input capability changes. Correctness, reward cues and muted
accessibility behavior are covered at headless contract level. Readability,
beauty, layout and phone performance remain with Claude/owner.

Local e2e mode is **none**. No browser, game rendering, WebGL context, screenshot,
GPU, hosted CI, unaided journey, audible-output or physical-device autoplay
acceptance was performed. AudioParam stubs record target values immediately;
they do not establish the real audio envelope or sound quality. No merge, push,
tag or hosted workflow dispatch.
