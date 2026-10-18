# P2-ambience — softer ambient bed

2026-10-18. Numeric/audio behavior only. Checked the clean worktree, neighboring
worktrees, `tools/codex-status.sh` and DIRECTOR's In flight section before editing.
No Claude package was listed in flight. Event/contact files, other backlog work,
`tools/` and `plan/DIRECTOR.md` are untouched.

## Tuning and signal path

| Value                                          | Before          | After                              |
| ---------------------------------------------- | --------------- | ---------------------------------- |
| Crossfaded bed gain                            | 0.035           | 0.025 (28.6% lower, about −2.9 dB) |
| Each bed noise layer's low-pass cutoff         | 300 Hz          | 220 Hz                             |
| Master / SFX / music defaults                  | 0.6 / 0.8 / 0.5 | Unchanged                          |
| Shared effects depth low-pass, surface / abyss | 18,000 / 350 Hz | Unchanged                          |

The two bed values now live in `src/core/config/audio.ts` as `ambientBedGain` and
`ambientNoiseLowpassHz`. These are internal tuning values, with no new setting,
slider, saved field or migration. The gain reduction leaves more space for cues;
the smaller cutoff rolls off more of the noise's upper band on small speakers.
This is a conservative tuning choice, pending listening verification.

Traced `AudioSystem.unlock/update/dispose`, `Loops.ts`, `Soundscape.ts` and
`AudioEngine.ts`. `AmbientBeds` owns the continuous drone/noise bed:

```
noise -> existing low-pass -> noiseMix gain -> depth-weighted bed gain
sine drone -------------------------------> depth-weighted bed gain
bed gain -> ambient bus -> saved SFX gain -> shared depth filter -> saved master gain
```

Only the existing bed noise filters and depth-weighted gain targets change.
Drone frequencies, noise mixes, crossfade weights and 1.5-second smoothing stay.
`Soundscape` separately sends positional vent/wreck voices, shrimp and whales to
the ambient bus; no bus-wide filter or gain change touches those voices. The
thruster, UI, sonar, music, compressor and output ceiling retain their paths.
Filters and gains remain in `manageSources` ownership; stop/disposal and
suspend/resume code are unchanged.

## Saved-volume evidence

`Save.defaultSettings` already uses nullish fallback for configuration defaults;
`migrate` checks field presence and accepts finite numeric zero. `AudioSystem`
starts from config defaults and applies resolved saved gains before its first
warmup source or continuous source starts. No save or initialization change was
needed.

Extended the existing audio capability specs:

- `f3Audio.test.ts`: missing values in v1/v2/v3 saves receive the unchanged
  defaults; mixed explicit master zero, SFX 0.27 and mute true survive while the
  missing music value gets 0.5. Storage round trips preserve both custom volumes
  with mute and all-zero volumes with mute false.
- `audioLifecycle.test.ts`: new-player defaults, custom volumes, individual
  master/SFX/music zero and mute are checked before first source startup and
  after pause/visibility resume. Settings remain unchanged and nodes are reused.
  Bed noise routing, 220 Hz cutoff, 0.025 total gain across depth crossfades,
  unchanged buses/defaults/depth filtering, and idempotent source/filter cleanup
  while suspended are covered.

The softer synthesis applies to existing players too; their explicit saved
volume numbers and mute choices remain intact.

## Actual checks

Executed `GATES_CONFIG_MODE=writable PW_OUTDIR=dist-ambience bash tools/gates.sh`
with inherited `PW_PORT=4372`. Actual e2e mode: **smoke + project-base**, not full
e2e. Overall exit **1**, not green. Writable config mode is the existing tool
option for this checkout's read-only dependency symlink. Gate logs:
`.cache/runs/20261018-133342-2-S3iva0/`.

### Passed

- Focused capability run: `npm test -- --configLoader runner --cache=false
tests/unit/audio.test.ts tests/unit/f3Audio.test.ts
tests/unit/audioLifecycle.test.ts tests/unit/audioTouchUnlock.test.ts
tests/unit/settingsSave.test.ts` — **5 files, 126 tests**.
- Full unit gate: **192 files, 3,236 tests**, 425.84 seconds.
- Gate config setup, strict content validation, production build including
  TypeScript, attribution (14 assets), and repository-wide Prettier. The
  project-base build also succeeded before its preview startup failed.
- `git diff --check`; final changed-file Prettier check.

### Failures

- Python gate: **166 tests, 5 failures**. Four are CI-build-manifest environment
  blocks detailed below. The fifth is `test_golden_tooling`: its nested
  `golden comparison refuses partial sets, missing files and incompatible poses`
  test gets `Unexpected end of JSON input` parsing CLI stdout. Root cause is
  unconfirmed. These tools were not modified. See `python.log` in the gate run.

### Environment blocks

- Four CI-build-manifest checks fail with `spawnSync git EPERM`.
- Gate smoke and project-base e2e runs both stop before browser tests because
  Playwright's preview server exits 1 (`e2e.log` and `e2e-base.log`).
- Targeted audio e2e: `GATES_CONFIG_MODE=writable PW_OUTDIR=dist-ambience
PW_REUSE_SERVER=0 npx playwright test tests/e2e/f3-audio.spec.ts
--output=test-results-ambience-audio` also stops at preview startup. A retry
  with `DEBUG=pw:webserver PW_PORT=4373` confirms local connections rejected with
  `connect EPERM` for IPv4 and IPv6. Log: `.cache/ambience-audio-e2e.log`.
  Test discovery succeeds (3 audio e2e tests); none executed.

No assertions, timeouts or tooling were altered to obtain passes. No browser,
GPU, visual or audio playback acceptance is claimed.

## Scope review and remaining acceptance

Readable/rewarding: informational and discovery cue levels/paths are unchanged.
Simple: tune the existing bed and filter, adding no on-screen element or player
setting. Accessible: preserve zero/mute and independent volume controls, with
captions and reduced-motion behavior untouched. Honest: automated checks prove
numeric behavior and graph ownership; comfort and intelligibility require ears.

**Listening verification: unverified.** No speaker, headphone or phone listening
test was performed. Beauty, phone appearance, screenshot acceptance and game
rendering remain with Claude; none are claimed here.
