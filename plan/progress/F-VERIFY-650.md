# F-VERIFY-650 — f27 merge verification

## Plan

1. Verify sparse Titanic snow and retained hull readability at 1600×900,
   844×390 touch and 360×640 portrait, including Low; retain the permanent
   marine-snow regressions.
2. Check credits at those sizes plus 667×375, at 100% and 150% UI scale:
   viewport containment, sonar/scan/touch clearance, reachable attribution
   links and Escape before pause.
3. Reproduce Beebe opening target/sub overlap on surveyed terrain and the
   actual hull at every requested aspect. Adjust only Beebe's pose if needed.
4. Check every Monterey canyon boulder against surveyed seabed, retain Low,
   and compare rendered draw calls/triangles from `window.__game.perf` with
   `main~3`. Add tests and a changelog entry only for reproduced regressions.
5. Run two rounds, including full E2E, and distinguish headless evidence from
   rendered verification.

## Baseline and execution

- HEAD/main: `beb67345d9653f299b24321a4eb72977e582b1e5`.
- Requested baseline main~3: `58bfcf7428c686b8600a33bdaef44d82d20e79ef`.
  This already includes snow 570, credits relayout and Beebe/Monterey changes.
  The difference to HEAD is documentation and two E2E expectation updates;
  runtime source is identical. Comparison can bound this verification's fixes,
  but cannot isolate the original merge's performance cost.
- Browser skill setup succeeded, but URL selection reports “No browser is
  available”; documented recovery lists no browsers (`[]`).
- Standalone Chromium also fails before page creation at
  `sandbox_host_linux.cc:41 ... shutdown: Operation not permitted (1)`;
  `.cache/verify650/chromium-launch.log`.
- A minimal localhost probe reproduces `listen EPERM 127.0.0.1:4650`;
  `.cache/verify650/localhost-bind.log`.
- Round 1: `GATES_CONFIG_MODE=writable PW_PORT=4650
PW_OUTDIR=dist-verify650 tools/gates.sh --full-e2e`;
  `.cache/verify650/gates-round1.log`. Build, **124 unit files / 1,326 tests**,
  **144 Python tests**, strict content, attribution and formatting passed.
  Full E2E and project-base E2E stopped before tests because their preview
  servers could not start. The project-base build passed.
- The pre-fix build is retained as `dist-verify650-baseline`; its runtime source
  is identical to the requested main~3. Round 1 unit/E2E logs were copied into
  `.cache/verify650/` before round 2 could overwrite `.cache/gates/`.
- Round 2 uses the same full-gate command and `dist-verify650` for the final
  build; `.cache/verify650/gates-round2.log`. Build, **126 unit files / 1,334
  tests**, **144 Python tests**, strict content, attribution and formatting
  passed. Full E2E and project-base E2E again stopped before tests at preview
  server startup; the project-base build passed. Final logs were copied to
  `.cache/verify650/unit-round2.log`, `e2e-round2.log` and `e2e-base-round2.log`.
  Changed-file formatting and `git diff --check` also pass.

## Findings

### Beebe: reproduced and fixed

- Surveyed-terrain audit uses the authored free-dive spawn, fitted Class C
  submarine at the shipped 26 m length, actual tier geometry and CameraRig.
  The nearest contact is `bvf-main-vents` and remains in scan range.
- With 54 m / -16 m, its projection falls inside the hull silhouette at all
  three requested sizes. On Medium/High/Ultra a ray from the camera through
  the contact intersects the actual submarine mesh. In portrait, the Medium
  hull projects approximately x=127–233, y=353–560; the target is (179,533).
  These are projected geometry measurements, not rendered pixels.
- `beebeOpeningReadability.test.ts` failed on all four tiers before the fix;
  `.cache/verify650/beebe-regression-before.log`. It checks the full target
  reticle plus 8 CSS px clearance, entire hull containment, actual contact
  sightline and Reset camera across 1600×900, 844×390 and 360×640.
- Change only Beebe's `chaseOffsetY` from **-16 to -38** in `Spawn.ts`: cancel
  the configured 38 m vertical offset, retaining the short **54 m** arm,
  bearing, range, altitude and heading. All four tests pass after the change;
  `.cache/verify650/beebe-regression-after.log`. Add the required changelog row.
- The permanent-snow suite now applies authored vertical chase offsets to
  free-dive cameras, so it tests Beebe's real pose rather than radius alone.
  No snow settings or other site poses were changed.
- Visual approval of the new opening remains pending browser access.

### Monterey: no buried boulder regression reproduced

- Inspect every transformed vertex of every boulder on all four authored
  canyon walls, using each tier's real surveyed height sampler. Embedded
  undersides are intentional; every individual centre and exposed top must
  clear the local seabed. Tier mesh tessellation is reduced only in unit
  setup, leaving the height sampler and full prop geometry intact.
- Before-fix audit found no buried centres or wholly buried rocks. The new
  `montereyBoulders.test.ts` checks individual exposure, retained counts and
  three instanced batches per wall at Medium+; Low retains zero rubble.
- Minimum centre/top clearance (metres): Medium **0.088 / 0.411**, High
  **0.088 / 0.410**, Ultra **0.080 / 0.367**. Across all four walls there are
  **0 / 384 / 640 / 1,024** rocks at Low/Medium/High/Ultra.
- Allocated full-wall mesh/triangle totals from the headless audit are
  **28 / 89,528**, **40 / 293,950**, **40 / 442,938**, **40 / 770,048** by tier.
  These include wall, apron and colonies; they ignore renderer culling, LOD
  and post passes and are **not `window.__game.perf` draw-call measurements**.
  Audit: `.cache/verify650/geometry-before.jsonl`.
- `scarp.ts` and its geometry dependencies are unchanged from main~3. No
  Monterey fix was warranted. Rendered performance comparison remains pending.

### Titanic and credits: headless checks pass; rendered checks pending

- Round 1 passes `marineSnowReadability.test.ts` and the existing hull-lighting
  proxy regressions. The permanent field retains 300/1,200/3,000/3,000 particles,
  GPU drift, 0.24 opacity and the 3 px cap. This does not establish pixel-level
  hull readability at the requested viewports.
- Existing credits layout and capture-phase Escape unit tests pass. Browser
  tests in `f-verify-530.spec.ts` now include **1600×900** and **667×375**, in
  addition to 360×640 and 844×390, at both **100% and 150%** UI scale. They
  check sonar, scan panel, tutorial, toast, touch controls, attribution link
  hit testing, rotation/expanded sonar and Escape closing credits before pause.
  No credits regression was reproduced headlessly; no UI change was made.
- Added `f-verify-650.spec.ts`: **18 cases** cover all three sites at all three
  requested sizes on Low/Medium. They retain screenshots for hull/readability
  review, check snow uniforms, actual Beebe hull/reticle separation, individual
  Monterey rock exposure and actual `__game.perf` counters. With
  `F650_BASELINE_URL`, Monterey samples 60 frames after 30 settling frames in
  both builds with matching tier, viewport, pose and life seed; asserts no
  increase in maximum draw calls or triangles and attaches both measurements.
- Typecheck and test discovery pass: **39 focused browser cases** across
  `f-verify-530.spec.ts` and `f-verify-650.spec.ts`;
  `.cache/verify650/typecheck.log`, `.cache/verify650/e2e-list.log`.
- Both new geometry suites pass (**8 tests**);
  `.cache/verify650/focused-geometry.log`.

## Browser follow-up in an environment permitting localhost and Chromium

Both retained builds can be served without rebuilding. The pre-fix baseline
contains the merged main~3 runtime, before this Beebe adjustment.

```bash
# Terminal 1: retained baseline, separate from both gate ports.
npx vite preview --configLoader runner --port 4751 --strictPort \
  --outDir dist-verify650-baseline

# Terminal 2: final build, focused viewport/credits/performance checks.
GATES_CONFIG_MODE=writable PW_PORT=4650 PW_OUTDIR=dist-verify650 \
  F650_BASELINE_URL=http://localhost:4751 \
  npx playwright test tests/e2e/f-verify-650.spec.ts \
  tests/e2e/f-verify-530.spec.ts --output=test-results-verify650

# Then review all opening/credits screenshots and rerun full gates.
GATES_CONFIG_MODE=writable PW_PORT=4650 PW_OUTDIR=dist-verify650 \
  tools/gates.sh --full-e2e
```

Do not mark Titanic rendered readability, credits browser containment or
Monterey renderer performance as verified until these browser checks and
screenshot review complete. No rendered pass or screenshot comparison is
claimed from blocked execution.

## External full-E2E follow-up: short-landscape mission credits

The orchestrator ran `tools/gates.sh --full-e2e` outside this sandbox. Build,
unit, Python, content, attribution and formatting passed. Main E2E reported
**403 passed, 21 skipped, 1 failed**; project-base E2E passed. The only failure
was `530 credits short-landscape / 150% Beebe mission keeps open credits clear
of objectives and the real contact`. All 18 new 650 opening tests passed.
The failed panel was at x=261.516, y=365, width=400, height=218; its bottom
was 583 in the 667×375 viewport. Original browser logs are preserved in
`.cache/verify650/orchestrator-e2e-before-credits-fix.log` and
`orchestrator-base-before-credits-fix.log`; the failure context is in
`test-results-gates-4372-209637/f-verify-530-530-credits-s-8b3c5-ctives-and-the-real-contact-chromium/error-context.md`.

Root cause: `HUD.layoutDataCredits()` searches only inside a 12 px viewport
margin with 8 px gaps around every obstacle. The short-landscape tutorial
starts at y=58, Pause splits the centre strip, and mission/telemetry occupy
the right column. At enlarged UI scale, the remaining padded areas do not
meet the 120×48 reading minimum. The search returns null and HUD returns
without assigning left/top/maxHeight; the fixed panel consequently retains
its CSS auto position below the chip. This is a product layout failure,
not a timeout or a reason to relax the browser assertions.

Fix: preserve the preferred search, then retry with **4 px viewport margins
and 4 px obstacle gaps** only when no preferred slot exists. Keep the same
**120×48 minimum**, all obstacles, content, scrolling and Escape behavior.
The ordinary desktop/phone placement remains the first choice; no tutorial,
sonar, scan or touch controls are hidden, resized or moved by this fix.

Added a live-HUD regression with conservative envelopes derived from the
short-landscape CSS and the failed chip position. These are a headless
reproduction, not a captured DOM-rectangle dump. It first asserts the old
padded search returns null, then requires the actual HUD placement to stay
inside the viewport with the full reading minimum and no obstacle overlap.
It also checks steady-frame caching and restoration of the full 400 px
panel with normal margins after the mission obstacles clear. The test fails
before the fix and passes afterward. The existing E2E containment, overlap,
link, Escape and timing assertions are unchanged.

Validation:

- Focused credits-layout and capture-phase Escape suites: **14 tests passed**;
  `.cache/verify650/credits-regression-after.log`. Before-fix failure:
  `.cache/verify650/credits-regression-before.log`.
- `GATES_CONFIG_MODE=writable PW_PORT=4650 PW_OUTDIR=dist-verify650
tools/gates.sh --no-e2e`: build/typecheck, **126 unit files / 1,335 tests**,
  **144 Python tests**, content, attribution and formatting passed;
  `.cache/verify650/gates-credits-followup.log`. The focused suites passed
  again after strengthening the regression's viewport margin assertion.
- `CHANGELOG.md` records the credits fix. `git diff --check` passes.
- Inspected three retained external captures: Titanic Low at 1600×900 has
  readable hull geometry and sparse snow; Beebe Medium at 360×640 keeps the
  submarine framed with the contact reticle below it; Monterey Medium at
  844×390 shows the canyon wall and surrounding seabed. These captures precede
  the credits fix and do not establish the missing main~3 performance comparison.
- Browser execution is still unavailable in this sandbox. The corrected
  667×375 mission layout requires the orchestrator's browser rerun; no passing
  post-fix E2E result is claimed.

Focused external rerun against the retained final build, then full gates:

```bash
GATES_CONFIG_MODE=writable PW_PORT=4372 PW_OUTDIR=dist-verify650 \
  npx playwright test tests/e2e/f-verify-530.spec.ts
GATES_CONFIG_MODE=writable PW_PORT=4372 PW_OUTDIR=dist-verify650 \
  tools/gates.sh --full-e2e
```
