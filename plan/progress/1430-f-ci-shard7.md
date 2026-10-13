# 1430 — hosted CI shard 7 screenshot timeout

Status: fix and local verification complete; awaiting a subsequent hosted CI run.

## Diagnosis

Reviewed [main push 38131716507](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/38131716507),
SHA `c49469182ff8271fe038030150d79505caafc502` (2026-10-11).
`gh run view 38131716507 --log-failed` returned no output in this workspace;
the jobs API and direct job/run log downloads supplied the evidence.
All 29 other e2e shards, static checks and project-base passed.

[Shard 7 job 114447285386](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/38131716507/job/114447285386)
failed only `tests/e2e/f-sonar-palette-1200.spec.ts:12`, desktop Lost City,
“smooth relief and existing map layout”. The original attempt timed out in
`page.screenshot` at line 80; the retry timed out in `locator.screenshot` at
line 79 while waiting for element stability. Both exceeded the unchanged
240,000 ms test budget (reported durations 244,204 and 244,902 ms including
cleanup). All pixel, relief, DPR and layout assertions had already passed.
The retry trace also shows slow DOM round trips before capture, consistent
with a continuously rendered 1600×900 DPR-2 scene saturating software GL.
No failed assertion establishes a product regression.

Other desktop sonar cases passed but took 2.2–3.5 minutes; portrait cases
took 16.0–59.8 seconds. This supports reducing rendering/capture work across
the existing spec rather than special-casing Lost City.

## Change

- Desktop viewport: 1600×900 → 800×500, reducing scene pixels by 72% while
  preserving landscape layout and DPR 2. Portrait remains 390×844 at DPR 2.
- Two diagnostic captures → one CSS-scale page screenshot clipped to the
  already measured sonar box. This removes the full HUD capture and the
  locator screenshot's additional scroll/stability frame waits.
- Retain all ten site/layout cases and every pixel, legend, relief, canvas
  resolution, raster padding, positioning and portrait width assertion.
  The right-edge assertion now uses the actual viewport width, tightening
  the desktop bound from 1600 to 800 pixels.
- No product changes, skips, timeout/retry increases or CI gate changes.
  Cheap assertions remain in the existing capability spec. The change
  deletes capture work and needs no new helper or configuration machinery.

## Earlier vehicles fix

[Shard 5 job 114447285383](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/38131716507/job/114447285383)
passed `f1-vehicles.spec.ts` in **86,108 ms**, retry **0**, with no errors.
The earlier 800×500 viewport, CSS-scale captures and reduced hull frame
waits therefore held on the hosted run. Local verification also passed
unchanged in **22.1 s**.

## Screenshot scan

Scanned the other e2e specs for repeated page captures within one test.
These calls capture the viewport (none of the candidates explicitly sets
`fullPage: true`), but still incur software-GL rendering/capture costs:

| Spec / test                                     | Captures within one test                                                    | Hosted result on this run |
| ----------------------------------------------- | --------------------------------------------------------------------------- | ------------------------- |
| `d-input-hud.spec.ts:16`, HUD/controls/UI scale | 5 page captures, including two consecutive captures at the initial viewport | Passed, 2.3 min           |
| `d2-camera.spec.ts:26`, chase/free look/reset   | 6 page captures, including two consecutive free-look captures               | Passed, 1.2 min           |
| `d-photo.spec.ts:68`, photo/Journal persistence | 5 page captures, including duplicate photo-mode and gallery captures        | Passed, 3.5 min           |
| `d-power.spec.ts:7`, depletion/debrief          | 3 page captures plus a settings-element capture                             | Passed, 51.8 s            |
| `d-currents.spec.ts:29`, flow modes             | 5 page captures plus a settings-element capture                             | Passed, 35.0 s            |
| `d-polish.spec.ts:8`, HUD/readouts/guide        | 3 page captures plus element captures, including a 1920×1080 viewport       | Passed, 1.4 min           |
| `f1-fixes.spec.ts`, each scenery case           | 3 page captures at 1280×800                                                 | Passed, 43.3–96 s         |
| `f1-terrain.spec.ts`, each tile/tier            | 2 page captures at 1600×900                                                 | Passed, 15.6–102 s        |

The photo and HUD duplicate captures are useful follow-up candidates for
S-tests. This fix stays focused on the failing sonar capability; the scan
does not remove those other tests or their assertions.

## Verification (2026-10-12)

- Typecheck and isolated production build passed (`dist-1430`). The shared
  dependency tree is read-only, so Vite configuration was bundled into
  `.cache/1430/vite.config.mjs` with the existing gates-script technique and
  loaded with `--configLoader native`.
- Before edit, CI-config Lost City: desktop **17.1 s**, portrait **9.9 s**.
- After edit, all **10 sonar e2e cases passed** with CI settings; desktop
  Lost City **8.1 s**, portrait **8.4 s**. Desktop cases ranged 5.8–10.8 s.
  Inspected the Lost City map capture: relief, contours, labels and legend
  render correctly.
- Second verification used a temporary config with
  `--use-angle=swiftshader --enable-unsafe-swiftshader`, confirmed by a
  renderer probe reporting `SwiftShader Device (Subzero)`. Both Lost City
  cases passed: desktop **22.2 s**, portrait **43.1 s**. The temporary config
  inherits CI assertions, DPR, timeouts and retry policy; it is untracked.
- Initial local vehicles capture failed with `EROFS` because
  `.cache/codex/shots` links outside the writable worktree. Temporarily
  replaced that local symlink with a worktree output directory; the
  unchanged vehicles test then passed. This was an output-path restriction,
  not a rendering or assertion failure.
- Full unit suite: **1,934 passed in 191 files**. Used
  `npm test -- tests/unit/*.test.ts --maxWorkers=2 --pool=threads --configLoader runner --cache=false`
  to avoid the stalled default discovery in this workspace. The file list
  includes every unit test file. The separate sonar palette check also
  passed all **5** tests.
- Python pipeline suite: **156 passed**.
- Prettier passed for both changed files; `git diff --check` passed.
- Shard planning still discovers **806 tests**, each assigned exactly once.
  All ten sonar cases remain selected, with desktop Lost City still on
  shard 7/30. No test selection or timing estimate was changed. No post-fix hosted run
  has been triggered; local software rendering supports the fix but does
  not reproduce hosted CPU contention exactly.

Evidence and local logs are retained under `.cache/1430/`; map captures are
in `test-results-1430/`, forced-software captures in
`test-results-1430-software/`, vehicles captures in
`.cache/1430/vehicles-shots/`. Restored the shared screenshot symlink and
removed the temporary build output after browser checks.
