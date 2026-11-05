# S-verify-audio-settings

Audited baseline: `19a639a46d0c4c99dc92282df040091964308681`.
Two passes: resolution/lifecycle inventory, then defect reproduction and review
of the minimal fix. Found one missed gesture-recovery case and one redundant
mixer application; no further quality-tier or control-mode defect confirmed.

## Resolution inventory

- `Save` owns settings defaults, migration, validation and change snapshots.
- Boot resolves graphics quality once with URL > saved tier > detection;
  Settings compares the saved preference with that boot decision for reload.
- Boot resolves effective gameplay settings; `modesSystem` recomputes only on
  gameplay changes and updates existing consumers without mutating Config.
- Audio consumes saved snapshots before its first gesture and on changes.
  Master gain combines saved mute/volume with independent pause/hidden gates;
  effects/music retain their own saved gains.
- `AudioSystem` and `AudioEngine` also provide config defaults for standalone
  construction. These do not introduce competing preference precedence: saved
  gains overwrite graph defaults before any source starts. Initial direct gain
  assignment and later smoothed application have different timing requirements.
- `TouchControls` owns live touch mode and releases held input on mode changes,
  blur, visibility and rotation. The shell's ControlsCard tracks the device for
  its guide using the same touch detection and keyboard/mouse/touch rules;
  it also follows gamepad activity. Its initial detection supports Home before
  the dive controls exist. No conflicting resolution was found.
- Input device switching and gameplay preset selection are separate concerns.
  ModeSelector writes Save; boot and `modesSystem` supply effective settings
  to physics, camera, scanning, power, lighting, sonar and currents.

## Confirmed defect and fix

After a successful unlock, the browser can interrupt the context while a modal
still pauses playback. The paused-gesture guard trusted the historical unlock
flag without checking context state, skipping the gesture needed to warm the
interrupted graph. Existing interrupted-context tests covered active playback,
while blocked-gesture tests covered an ordinary suspended context.

The two initial pause/hidden regression rows failed on the original code:
expected one synchronous warmup source, received none. The guard now skips only
an already unlocked **suspended** context. An interrupted context uses the
existing engine unlock and playback reconciliation, remaining silent behind
the pause/visibility gate. There is no new recovery path or lifecycle state.

Removed `setSettings(this.settings)` after first-unlock loop construction:
saved gains were already assigned before the warmup/source starts, and unlock
completion reconciles playback with the latest settings. This avoids scheduling
the same gains again during initialization.

Four new rows in `tests/unit/audioLifecycle.test.ts` cover pause/hidden × mute
on/off. They verify synchronous warmup, silence and suspension while blocked,
no extra warmup for subsequent ordinarily paused gestures, restored independent
gains (including zero SFX), reuse of one graph, and disconnected teardown.
`docs/audio.md` documents the recovery contract.

Net simpler: remove duplicate initial mixer application, refine the existing
guard, and add no new state, settings, dependencies, layout rules or Config
mutation. Production source line count is unchanged. No package numbers were
added to source or tests.

## Validation

- **277 tests passed in nine capability files**: `audio`, `audioLifecycle`,
  `audioTouchUnlock`, `f3Audio`, `settingsSave`, `settingsScreen`, `quality`,
  `f2-modes`, and `touchControlsAudit`. Command: `npm test -- --configLoader
runner --cache=false` followed by those `tests/unit/*.test.ts` paths.
- TypeScript/Vite production build, strict content validation, attribution,
  repository Prettier and whitespace checks passed.
- Searched `tests/e2e` for audio, pause, visibility, tier/reload and control
  mode coverage before attempting the selected capability cases below.

Each browser command used `GATES_CONFIG_MODE=writable`, its own `PW_PORT`, and
`PW_OUTDIR=dist-audio-settings-audit` from the production gate build:

```sh
npx playwright test tests/e2e/f3-audio.spec.ts -g 'first touch resumes|pause and visibility|modal gestures keep audio paused'
npx playwright test tests/e2e/settings.spec.ts -g 'Apply and reload uses saved boot settings'
npx playwright test tests/e2e/f3-onboard.spec.ts -g 'keyboard Escape from touch Pause keeps tutorial labels and control mode consistent'
npx playwright test tests/e2e/smoke.spec.ts -g 'boots'
```

All stop before test bodies because the preview cannot start. Direct preview
reproduction identifies `listen EPERM 127.0.0.1:4289`. No browser acceptance,
screenshots, audible-output or real-phone Safari result is claimed. The new
regressions model an interrupted AudioContext; they do not emulate the device's
autoplay policy itself.

Gate invocation: `GATES_CONFIG_MODE=writable PW_PORT=4288
PW_OUTDIR=dist-audio-settings-audit bash tools/gates.sh`. Writable config mode
avoids temporary bundles in the shared read-only dependency tree.

The Python gate runs 167 tests and reports five failures in unchanged tools:
four manifest tests fail on `spawnSync git EPERM`; golden comparison receives
empty subprocess JSON. The final aggregate gate was interrupted during its
full-unit phase after several minutes without a completion result; it therefore
did not reach its browser/base/attribution/format stages. Attribution and format
were run separately and passed, and the targeted browser attempts above failed
at server setup. A separate verbose single-worker full-unit attempt progressed
through unrelated geometry tests but exceeded its 60-second limit (exit 124).
No full-unit or aggregate-gate pass is claimed.

Logs: `.cache/audio-settings-audit/` (`focused.log`, `gates-final.log`, browser
logs and `full-unit.log`) and the paths in its gate logs. The isolated generated
build was removed after the attempts. Follow-up in a browser-capable environment:
rerun the gate and the named Playwright selections; real-phone interruption
recovery and audible output remain unverified.
