# S-bughunt-audio-lifecycle

DIRECTOR item 16k / brief 184. Audited baseline:
`e473ab352ba60e4a8567c2fd9848bd4d59685e71` (2026-11-09).

## Two audit passes

1. Read the director simplicity rules, previous audio audit evidence, runtime
   graph, gesture integration, saved settings, and existing audio capability
   tests. First-gesture warmup runs synchronously, including behind a paused
   shell; capture handlers cover press/release and keyboard input. Hidden and
   paused states reconcile independently after asynchronous context operations.
   Save snapshots supply mute and independent gains before sources start.
   Source groups own their processors and teardown closes the context, removes
   subscriptions/listeners and stops loops. Existing coverage also verifies
   interrupted/rejected unlocks, saved zero gains, reload, optional sample loading
   after scene disposal and repeated scene lifetimes. Baseline focused run:
   **97 tests passed across four audio files**.
2. Exercised missing combinations using the existing mocks in
   `tests/unit/audioLifecycle.test.ts`: mute on/off with all gains edited to zero
   during a pending first gesture, then hide/show; and overlapping discovery
   stingers plus a two-source collision cue ending out of order before suspended
   teardown. New cases verify current settings after asynchronous completion,
   graph reuse, independent stinger cleanup, retained shared buses and complete
   idempotent teardown. All three added rows pass against unchanged production
   code. The pending-resume test waits for reconciliation instead of assuming a
   fixed number of microtasks.

No new defect confirmed; no runtime fix made. Stacked score accents already use
the maximum decayed strength rather than addition, and effects share the
compressor/peak guard. The mocks check routing, parameters, state and ownership;
they do not measure audible output or reproduce physical iOS autoplay policy.

## Validation

Focused command:

```sh
npx vitest run tests/unit/audio.test.ts tests/unit/audioLifecycle.test.ts tests/unit/audioTouchUnlock.test.ts tests/unit/f3Audio.test.ts --configLoader runner --cache=false
```

**100 tests passed across four files.**

Searched `tests/e2e` for audio, mute and volume capability coverage. Attempted
all five existing audio cases against the isolated production build:

```sh
GATES_CONFIG_MODE=writable PW_PORT=4295 PW_OUTDIR=dist-audio-lifecycle npx playwright test tests/e2e/f3-audio.spec.ts -g 'adaptive audio starts|modal gestures keep audio paused|first touch resumes|pause and visibility'
```

Playwright stopped before test bodies because its preview could not start.
Direct reproduction with `npm run preview -- --port 4295 --strictPort
--outDir dist-audio-lifecycle --configLoader runner` reports
`listen EPERM 127.0.0.1:4295`. No browser, screenshot or real-device acceptance
is claimed.

Gate command:

```sh
GATES_CONFIG_MODE=writable PW_PORT=4294 PW_OUTDIR=dist-audio-lifecycle bash tools/gates.sh
```

Gate logs: `.cache/runs/20261109-111743-2-ZWaie0/`.
Full unit gate: **4,672 tests passed across 195 files** in 1,283.27 seconds.
Root and project-base production builds/typechecks, strict content validation,
attribution and repository formatting passed. Root smoke and project-base Playwright gates both
stopped at preview startup, as did the selected audio capability run.
Python ran 169 tests with five failures in unchanged tools: four build-manifest
tests report `spawnSync git EPERM`; the golden comparison test reports
`Unexpected end of JSON input` from subprocess output. These match earlier
audio audit reports. Aggregate gate result: **FAIL**, due to those Python
failures and the unavailable browser preview. Whitespace checks also passed.
Removed the isolated `dist-audio-lifecycle` build after validation; logs remain.

## Simplicity

Extended one existing capability spec; no new spec, setting, UI, dependency,
runtime state or abstraction. No assertions relaxed. No cuts needed.
