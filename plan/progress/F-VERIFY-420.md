# F-VERIFY-420: merged title and hero-test verification

Date: 2026-10-03. Scope: F-TITLE-G and F-GOLDEN-CHECK verification, tests and
documentation only. No retained changes in `src/` or `data/`.

## Plan and status

1. Run `f-title-scene.spec.ts`, `d-shell.spec.ts` and `f-touch-audit.spec.ts`
   three times each, without retries. Attempted; every invocation failed before
   executing a case because preview startup is blocked by the environment. Browser runtime
   verification and identification of observed flakes remain incomplete.
2. Temporarily remove a hero's fill, check that readability tests fail, restore
   the original and rerun. Complete: both Titanic tiers fail at the scene ambient
   floor with runtime fill removed; all ten tests pass before and after restoration.
3. Compare the architecture title section with the implementation, correct any
   omissions and log fixes. Complete.
4. Run `tools/gates.sh`, check formatting and inspect the final diff. Complete:
   all static gates pass; both browser gates fail at preview startup.

## Browser attempts and timing review

Production build passed using a local Vite config bundle. Playwright discovery
with `--repeat-each=3 --retries=0` lists **111 cases**: 48 title, 9 shell and
54 touch cases, representing 16, 3 and 18 distinct cases respectively.

Then each spec was invoked separately three times using the same build, one
worker and zero retries:

| Spec                    | Attempt 1            | Attempt 2            | Attempt 3            |
| ----------------------- | -------------------- | -------------------- | -------------------- |
| `f-title-scene.spec.ts` | Server failed; 0 ran | Server failed; 0 ran | Server failed; 0 ran |
| `d-shell.spec.ts`       | Server failed; 0 ran | Server failed; 0 ran | Server failed; 0 ran |
| `f-touch-audit.spec.ts` | Server failed; 0 ran | Server failed; 0 ran | Server failed; 0 ran |

All nine exit with status 1. Direct preview diagnosis identifies two blockers:
the default config loader attempts to write `node_modules/.vite-temp` on the
read-only external dependency tree (`EROFS`); using the same writable native
bundle that successfully built the app reaches server startup but fails with
`listen EPERM: operation not permitted 127.0.0.1:4220`.
`DEBUG=pw:webserver` also reports `connect EPERM` for both `::1:4220` and
`127.0.0.1:4220`. These are environment failures, not evidence of a flaky case.
No browser passes or confirmed runtime flakes are claimed. Logs:
`.cache/f-verify-420/<spec>-run-<1..3>.log`, `preview-startup.log` and
`preview-native-startup.log` in the same directory.

Command for each attempt (replace the spec name and run number):

```sh
PW_PORT=4220 PW_OUTDIR=dist-verify-420 PW_REUSE_SERVER=0 DEBUG=pw:webserver \
  npx playwright test tests/e2e/f-title-scene.spec.ts --retries=0 \
  --output=test-results-verify-420-f-title-scene-1
```

Source review found timing weaknesses, distinct from confirmed flakes:

- Title selector/modal/reduced-motion idle checks used a 250 ms settle sleep and
  a 500 ms observation sleep. `terrainReady` and resize can mark presentation
  dirty before `render.prepare` processes it; on a loaded main thread a sleep can
  end before enough frames have run. Settle over two animation frames, then
  observe at least eight frame opportunities spanning 500 ms. Draw-count equality
  stays strict, and the span still exceeds the title's 30 fps interval.
- Title quit/Continue and shell home/pause/quit pose checks used 400–500 ms sleeps.
  Require eight animation frames over the original observation duration so input
  has opportunities to be sampled and gated. Position equality stays strict.
- Optional title terrain/font failure checked a counter at request interception,
  then slept 500 ms. Request abort precedes the async loader's catch handler.
  Poll the existing `[title] Monterey preview unavailable` warning before checking
  the fallback caption, readiness, fatal state and page errors.
- Touch audit already synchronizes on ready, DOM visibility, state attributes,
  actionability and checked values; it contains no fixed sleeps. No changes made.

The test-only helper uses `requestAnimationFrame`, registered after the existing
app loop, without adding production hooks or increasing test timeout limits.
These changes require the pending browser runs to establish runtime behavior.

## Hero threshold mutation

Baseline and restored command:

```sh
npm test -- --configLoader runner --cache=false tests/unit/heroReadability.test.ts
```

Both runs pass **10/10 tests**. For the negative control, temporarily replaced
`const fill = num(this.params.ambientFill, 0)` in `WreckPreset.update()` with
`const fill = 0`. Authored Titanic `ambientFill: 30` stayed intact, so the
`minFill` parameter check still passed. This specifically tests whether the
scene-light assertions detect loss of the runtime contribution, rather than only
whether a JSON setting is present.

The mutated suite exits 1 with **2 failures / 8 passes**: Titanic Low and Medium
fail the scene ambient assertion at **0.18 < 24**. The source was restored
byte-for-byte in a `finally` block before subsequent validation; `git diff -- src
data` is empty. Mutation logs are `.cache/f-verify-420/hero-runtime-zero.log`,
with baseline/restored logs alongside it.

The existing floors also constrain linear RGB luminance after fog (at 40 m and
nine seabed samples), rather than intensity alone, and check nonaccumulation over
two fresh atmosphere samples. Titanic/Lost City/Beebe/Monterey have positive fill
floors; Blue Hole intentionally has `minFill: 0` because its reef preset adjusts
ambient by a multiplier. These are code-level regression floors, not a substitute
for pixel readability review. The mutation establishes that removal of Titanic
fill is caught; no threshold tuning was needed.

## Architecture comparison

Reviewed `app/systems.ts`, `app/systems/title.ts`, `app/systems/render.ts`,
`render/title/TitleScene.ts`, `render/title/TitleTerrain.ts`, shell/Home and styles.
The existing description of lazy scene creation, shared canvas, independent
gameplay transforms, 2.4 km real Monterey crop, optional loading/fallback captions,
modal/site gating, reduced motion, 30 fps cap, budgets and diagnostic snapshots
matches the source.

Expanded the title section to document renderer target/exposure/clear/viewport/
scissor restoration; pixel-ratio and quality dirty events; static renderer-call
idleness; and the embedded globe's document/modal/layout visibility conditions.
In particular, exceptionally short layouts stop the globe when its slot has no
client rects. Changes are logged in `CHANGELOG.md`.

## Gates and remaining verification

Gate command: `GATES_CONFIG_MODE=writable PW_PORT=4221 bash tools/gates.sh`.
The writable config mode avoids writes to the external `node_modules` symlink;
dependencies and lockfiles are unchanged. It applies to build/unit config
loading; Playwright's default preview command still hits the config-loader
restriction described above, and the native-preview diagnostic establishes the
independent localhost restriction. Results:

| Gate             | Result                                                      |
| ---------------- | ----------------------------------------------------------- |
| Config / build   | Pass; typecheck and production build                        |
| Unit             | Pass; 1,156 tests in 107 files                              |
| Python           | Pass; 140 tests                                             |
| Strict content   | Pass                                                        |
| Attribution      | Pass                                                        |
| Prettier         | Pass                                                        |
| E2e smoke        | Fail before any case; preview startup blocked               |
| Project-base E2e | Build passes; browser fails before any case at server start |

The overall gate exits **1**, preserving both browser failures. Combined output:
`.cache/f-verify-420/gates.log`; individual gate logs: `.cache/gates/`.
Final whole-repository formatting and `git diff --check` pass after the progress
note/changelog edits. `src/`, `data/`, package files and dependency symlink are
unchanged; the retained diff contains only tests and documentation.

Remaining: on a host that permits localhost preview and Chromium, rebuild and run
the three specs three times each with `--repeat-each=3 --retries=0`, then rerun
`tools/gates.sh`. Record any failing case and trace before calling it flaky.
