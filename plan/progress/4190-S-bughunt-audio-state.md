# 4190 — S-bughunt: audio state coverage check

DIRECTOR Backlog **7, S-verify / S-bughunt [Codex, standing]**.
Audited HEAD: **`c4c6d2a97ad6e768211aa76c524b6648913ee02a`**.
Initial worktree clean; HEAD retained throughout. Report only.

**Stopped under task 1's existing-coverage condition.** The requested audio
state/lifecycle slice is already covered by the
[3670 audio audit](3670-S-bughunt-audio-state.md), the
[3600 settings consumer inventory](3600-S-bughunt-settings-persistence.md),
and existing capability specs below. The relevant implementation and specs
are unchanged since 3670's audited SHA. No new discrepancy or correction is
proposed. This is a coverage-based completion, not a fresh diagnostic pass.

## Intake and scope

Read CONTRIBUTING-AGENTS.md, all of plan/DIRECTOR.md (Backlog, seven simplicity
rules and rubric), and the last 160 lines of plan/OVERNIGHT-LOG.md through
run 146. Read every available progress note numbered 4000–4140, including
4010's live-settings trace and 4120's mode/restart audit. There is no 4100
progress note in this checkout; Overnight run 143 records its completion
without a note. Also read 3500's audio progress/report and 3600/3670 evidence.

The question was whether saved mute and independent gains reach the actual
graph, survive supported state changes, and leave no old nodes/listeners on
scene replacement. Checked existing assertions and current ownership paths
before deciding whether another disposable probe would add evidence.

## Existing evidence and supported boundaries

| Boundary                                            | Existing evidence and current trace                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Live volume/mute edits and fresh graph after reload | `tests/unit/audioLifecycle.test.ts:130` uses real Save, its change subscription, serialized storage, disposal and a second graph, for both mute values. It includes zero master/music and zero SFX. `:335` checks six saved mixes before even the warmup source starts, then through pause/visibility return.                                                                                                                                                                                                                                                          |
| Pause and tab visibility                            | `audioLifecycle.test.ts:476` repeats ten independent pause/hidden cycles, edits gains while blocked, checks mute on return, unchanged node count and disconnected teardown. `:508`, `:538` and `:566` cover late gesture resume, hide during resume and late hide suspension. `:622` and `:660` cover blocked cues and scan state.                                                                                                                                                                                                                                     |
| Dive restart / Home / scene replacement             | `audioLifecycle.test.ts:405` checks three lifetimes, context close once, every node disconnected, zero timers and removed visibility listeners. `:284` isolates an old pending unlock/sample load from the next scene; `:961` checks muted captions, bus cleanup and re-entry. `tests/unit/audioTouchUnlock.test.ts:36` checks capture handlers and save/caption disposal across two app restarts.                                                                                                                                                                     |
| Source and processor ownership                      | `audioLifecycle.test.ts:1024`, `:1075`, `:1096`, `:1110` and `:1136` inspect bed/bus routing, complete cue-group release, repeated loop stop, suspended one-shots and whale-call release. 3670 maps these to AudioEngine, Loops, Score and Soundscape ownership.                                                                                                                                                                                                                                                                                                       |
| Gameplay mode changes                               | 3600's consumer inventory and 4010's later trace cover the settings fan-out. Current `Save.setGameplayMode` / `setGameplayOption` preserve the other saved fields. `audioSystem` forwards each new Save snapshot to the same AudioSystem; `modesSystem` resolves gameplay consumers without changing audio tuning. `resolveEffective` has no audio override. Thus named/Custom transitions retain the saved mix. This is inspected integration evidence; the lifecycle test named “mode changes” at `:476` exercises pause/visibility, not Arcade/Realistic selection. |
| Graphics tier changes                               | 3600's inventory, 4010's non-defects section and `docs/settings.md:23` establish **after reload** application. Audio construction consumes `config.audio`, not the graphics tier. Existing `settingsSave.test.ts:93` and `quality.test.ts:133` cover saved tiers/reconstruction and URL precedence; audio's fresh-Save/fresh-graph tests cover mix restoration. Changing a saved tier alone does not promise an immediate audio rebuild.                                                                                                                               |

Player-facing Dive again restarts the mission and reloads the page, as traced
in [4120](4120-S-bughunt-difficulty-modes.md). Fresh saved settings and a fresh
audio graph are therefore the relevant persistence contract. Manually mutating
an active `ctx.tier` or injecting a replacement audio configuration is not a
supported tier transition and does not justify a speculative defect report.

3670 records **4 files / 89 audio tests passed**, plus a full unit pass, on
`54c6c9df62ed70b82c6d01223470a604c3d66173`. Those are historical results,
not tests executed for 4190. Its failed Python gate is not reclassified here.
3500's constructor-retry and callback-disposal defects are already fixed;
this note does not rediscover them.

## New evidence, commands and results

All commands ran from this worktree. Intake used `cat` on the named notes and
source/spec files, `tail -n 160 plan/OVERNIGHT-LOG.md`, and `rg -n` to locate
audio settings, lifecycle assertions, mode handlers and tier/reload policy.
The material reproducible comparison was:

```bash
git rev-parse HEAD
git status --short
git diff --quiet 54c6c9df62ed70b82c6d01223470a604c3d66173 HEAD -- src/audio src/app/systems/audio.ts src/app/systems/modes.ts src/app/boot.ts src/core/Save.ts src/core/Config.ts src/core/config/audio.ts src/core/config/quality.ts src/game/EffectiveSettings.ts src/ui/Settings.ts src/ui/settings tests/unit/audio.test.ts tests/unit/audioLifecycle.test.ts tests/unit/audioTouchUnlock.test.ts tests/unit/f3Audio.test.ts tests/unit/f2-modes.test.ts tests/unit/settingsSave.test.ts tests/unit/quality.test.ts docs/audio.md docs/settings.md
```

Results: HEAD equals the pin above; initial status empty; comparison **exit 0,
no output**, establishing no differences in those paths. A broader
`git diff --name-status` including `src/app` showed only `systems/mission.ts`
and `systems/props.ts` changed there; it showed no change in the selected audio,
settings, mode, boot or test paths. This is new source-comparison evidence,
not new graph observations. No disposable diagnostic, shipped-data sweep,
unit run, build, Python run or aggregate gate was started after the stop
condition was established. No new failing inputs/state/output exist to retain.

Owned-note formatting and whitespace checks:

```bash
node_modules/.bin/prettier --write plan/progress/4190-S-bughunt-audio-state.md
node_modules/.bin/prettier --check plan/progress/4190-S-bughunt-audio-state.md
git diff --check
git rev-parse HEAD
git status --short
```

Formatting and whitespace checks passed. Final HEAD remains the pin; final
status contains only this new progress note.

## Limits and simplicity

Existing headless AudioContext/AudioParam doubles establish modeled state,
routing and ownership, not actual gain-envelope timing or audible output.
No new combined mode × tier × restart matrix or current-SHA test pass is
claimed. The early-stop instruction takes precedence over undertaking duplicate
diagnostics or CONTRIBUTING-AGENTS' generic full-gate instructions.

Local e2e mode **none**. No browser, rendering, screenshots, visual judgment,
GPU, real-phone or hosted-CI validation. Readability, beauty, touch layout and
phone performance remain unassessed. No production, test, data, snapshot,
configuration, tools or DIRECTOR changes; 4150/4160/4170 and owner-blocked
collision work are untouched. No merge, push, tag or workflow dispatch.

Net simpler: cite established capability evidence without adding duplicate
tests or runtime machinery. No settings, guidance, site branches, runtime
Config mutation, package numbers in code or relaxed assertions/tolerances.
