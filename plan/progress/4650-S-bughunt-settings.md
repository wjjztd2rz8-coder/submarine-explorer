# S-bughunt: settings, pause and audio lifecycle

Audited baseline: `6a0443db10de6ebe3f5f20aa29d053f7e97a077c`.
Serves the standing Codex S-bughunt item in `plan/DIRECTOR.md`.

## Confirmed defect and minimal fix

Audio followed `app:state` but ignored modal freezes. When a briefing,
debrief or Settings froze the simulation while the shell still said `dive`,
a keyboard or touch gesture could start the graph at the saved master gain.
Music continued and its audio clock advanced behind the frozen scene. The
ordinary Pause → Settings path already suspended audio because Pause changes
the shell state; the missing case was a modal without that state transition.

Three new rows in the existing `tests/unit/audioLifecycle.test.ts` failed
before the fix: expected `state: suspended, masterGain: 0`, received
`state: running, masterGain: 0.6`. They exercise the real shell frame gate,
application audio frame hook, Save and audio facade, with fake WebAudio nodes.

The application audio frame now synchronizes pause with the shell/modal
freeze, including the free-dive debrief. `AudioSystem.setPaused` ignores
unchanged states, avoiding repeated suspend/resume calls every frame. Existing
visibility and immediate shell-state handling remain responsible for those
transitions. Photo mode retains its shutter and ambience: its physics freeze
does not represent a shell pause. An additional capability regression verifies
the real shutter cue remains available. Updated `docs/audio.md` accordingly.

## Audit and regression coverage

- Settings: traced Save → controls → live consumers and boot-only preferences.
  Existing settings/overlay specs cover live accessibility edits, reset,
  protected/unavailable storage, pending reload, focus and nested dismissal.
- Quality: reviewed saved Auto/Low/Medium/High resolution, URL precedence and
  Apply and reload. Existing quality and save specs cover these contracts.
  No separate tier-switch or persistence defect was confirmed.
- Pause/resume: the new audio rows check silence on the first gesture behind
  each modal, repeated frozen frames, edits while paused, gestures while
  paused, closing a modal into Pause, and eventual resume. They preserve
  independent zero/nonzero effects/music levels and restore the saved master
  after unmuting. Each row creates a second Save and audio graph from the same
  storage to check a fresh runtime. Existing race/visibility tests still pass.
- Browser lifecycle: extended only `tests/e2e/f3-audio.spec.ts`. New desktop and
  mobile-touch cases use native briefing controls, keyboard/touch sliders,
  Pause/Settings, a Low → Medium saved tier change, Apply and reload, and the
  actual Dive again action. They check deferred tier application, saved mute
  and independent gains, frozen audio time, unchanged mission URL, and a fresh
  mission briefing after restart. These cases await browser execution below;
  the unit fresh-runtime check is not presented as browser restart acceptance.
- Existing audio e2e gain assertions are retained after resume: AudioParam
  ramps cannot finish while their context is suspended. Cue assertions also
  wait for the resumed frame before emitting events. The spec now uses the
  repository's existing experienced-player fixture for its mission cases.

No new settings, UI, dependencies, runtime config mutation, CSS patches,
package-named specs or package numbers in code were introduced.

## Validation and limits

Pass:

- **532 tests in 16 capability files**, covering audio lifecycle/unlock,
  settings, quality, overlays, shell, touch, missions, modes, reduced motion
  and photo mode. After adding the nested-Pause assertion, the audio lifecycle
  file passed again: **71 tests**.
- Production `npm run build` (TypeScript plus Vite) with an isolated output and
  a locally bundled config. The shared read-only dependency directory requires
  this config workaround. The generated build was removed after verification.
- Strict content validation, attribution, changed-file Prettier and
  `git diff --check`.
- Playwright discovery: **31 tests** across the audio and settings specs,
  including the two new desktop/touch mission cases.

Not green / not claimed as acceptance:

- Browser execution stopped before test bodies: preview cannot bind localhost,
  independently reproduced as `listen EPERM 127.0.0.1:4267`. No screenshots or
  browser-native touch/reload/restart result was obtained in this sandbox.
- The full unit command printed its RUN header without completing and was
  interrupted (exit 130). Focused capability runs above completed normally.
- Python: **167 tests, 5 failures** in unchanged tooling. Four build-manifest
  tests fail on `spawnSync git EPERM`; the golden subprocess test receives
  empty JSON (`Unexpected end of JSON input`).
- The gate build phase bundled successfully but its subsequent manifest writer
  also hit `spawnSync git EPERM`. A standalone TypeScript/Vite build then
  completed successfully; this does not claim manifest verification passed.

Logs are in `.cache/settings-audit/` (focused, final regression, final build,
browser, Python and interrupted full-unit logs). Browser-capable follow-up:

```sh
npm run build -- --outDir dist-settings-audit
PW_PORT=4267 PW_OUTDIR=dist-settings-audit npx playwright test tests/e2e/f3-audio.spec.ts tests/e2e/settings.spec.ts
```
