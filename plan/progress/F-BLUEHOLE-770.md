# F-BLUEHOLE-770 — closer first scan, calmer opening

2026-10-06. Chose the spawn-shift option: shorten the existing scenic free-dive
approach to `karst-grotto` from 205 m to 100 m. The first Scanner contact remains
`great-blue-hole-stalactites`, now **100.25 m on Low / 100.22 m on Medium**.
It is facing, in range and immediately scannable; a four-second hold completes
the scan from the opening pose. No new feature or surveyed coordinate was added.

The gallery already links to the `the-hole` Journal entry with its **Recreation**
tag, and the POI already states that placement and geometry are not surveyed.
Keep that single entry tag. Published dimensions (about 320 m wide / 125 m deep),
stalactite depth (roughly 40–50 m), the terrain carve and site content are unchanged.
The eastern and western atoll mission primaries and surface-start route remain
the surveyed slope experience; this correction targets the scenic free-dive
opening shown in the golden, rather than moving those real slope contacts.

## Opening guidance

Animal guidance is deferred while the scan card is visible and the dive clock
is below eight seconds. Target, interrupted-scan and completion cards all count.
The hint is not marked seen while deferred; it can appear at eight seconds, or
earlier if the card disappears. Safety hints keep their priority, and the existing
twelve-second animal-hint lifetime is retained. The rule uses unfrozen dive time,
not the application's elapsed clock; mission start resets that existing dive clock.

## Verification rounds

1. Inspected the opening configuration, actual terrain/props, scanner selection,
   Journal provenance and onboarding clocks. The old scenic approach was 205 m;
   animal guidance had no opening delay.
2. Added the closer pose and visibility-based delay. The targeted spawn,
   onboarding, composition and hero-readability suites passed **51/51** tests.
3. Ran the full requested gate command, with writable config loading for this
   workspace's shared dependency tree:

   ```sh
   GATES_CONFIG_MODE=writable tools/gates.sh --full-e2e
   ```

Gate results: config, production build, **1,427 unit tests across 137 files**,
**144 Python tests**, strict content validation, attribution and repository
formatting all passed. The full-suite and project-base browser gates could not
start their preview server, so the command exited 1. Logs are in `.cache/gates/`.
The project-base production build also passed before its preview failure.

`tests/unit/blueHoleOpening.test.ts` loads actual heightmaps, tier-specific Terrain,
both procedural grottos, placed POIs and the real Scanner. It covers Low and Medium,
Arcade/Realistic/Custom scenic poses, and 390×844 portrait, 844×390 landscape and
16:9 desktop camera projections. It asserts the actual first hint is within 110 m,
is scannable immediately, completes successfully, has linked Journal provenance,
and keeps camera, seabed and hull clearance. These are numeric checks, not pixel QA.

The hint tests cover the boundary immediately before eight seconds, eligibility at
eight seconds, unseen persistence, disappearance of the scan card and safety-hint
priority. A system test additionally checks a large application clock and frozen
frames, using the real HintEngine and TutorialSave.

To regenerate pose measurements after creating `.cache`:

```sh
BLUEHOLE_OPENING_AUDIT=1 npx vitest run tests/unit/blueHoleOpening.test.ts --configLoader runner --cache=false
```

The optional audit writes `.cache/bluehole-opening-measurements.json`.

## Browser limitation

Playwright Chromium is installed but cannot launch in this sandbox. A direct
launch probe failed with `sandbox_host_linux.cc:41` / `shutdown: Operation not
permitted (1)`. No new screenshots were captured and rendered visuals are
**not verified**. Claude's screenshot review remains pending on a browser-capable
runner; compare the opening scan card and scenery before eight seconds, then
animal guidance after eight seconds.

A separate local HTTP bind probe confirmed `listen EPERM: operation not permitted
127.0.0.1:4370`, consistent with both preview gates failing to start. Browser E2E
assertions were not executed or weakened. Final documentation formatting and
`git diff --check` were checked after recording these results.

## Orchestrator full E2E follow-up

The orchestrator ran `tools/gates.sh --full-e2e` outside the sandbox. Static gates
and project-base E2E passed; the main suite reported **399 passed, 48 skipped,
9 failed**. Eight animal-toast cases and the final save-soak allocation comparison
failed. Evidence: `.cache/gates/e2e.log` and
`test-results-gates-4370-756996/f-save-soak-four-dives-mod-7d411-thout-scene-leaks-or-errors-chromium/error-context.md`.

- Toast root cause: the fixture pauses the browser clock, skips the tutorial and
  advances only 50 ms. Passive locator polling leaves the new eight-second dive
  delay frozen, so it keeps seeing the tutorial completion toast. The fixture now
  advances eight seconds with `page.clock.runFor`, including every animation
  frame, before checking animal guidance. `fastForward` would skip frames and
  run into the game's delta clamp; passive polling would leave time frozen.
  The original exact device-specific text, viewport containment,
  overlap, wrapping, eight-pixel spacing and dismissal assertions are retained.
- Soak root cause: `perf.geometries` reads Three's live GPU allocation count, which
  registers geometry on first draw. Asynchronous spawn composition can render
  different sets of terrain chunks and prop LODs before the final pose; loaded
  scene readiness and texture readiness alone do not normalize that history.
  The final sample saw 234 allocations versus its baseline's 275 with the same
  scene-object count. After each ready briefing, the fixture now draws every
  resident scene object once without visibility/frustum exclusion, then restores
  both flags and the render target in `finally`. Ordinary game frames still drive
  the samples. The fixture does not explicitly dispose resources, reset counters,
  remove scene objects or relax equality checks; attached and GPU-only leaks
  remain detectable. The next follow-up below addresses initialization performed
  by the cockpit's own render callback during that first warm-up.

The production first-target distance and eight-second hint rule are unchanged by
this follow-up. No browser launch was retried locally: the orchestrator owns the
browser-capable runner. Post-fix E2E and fresh screenshot review remain pending.

Follow-up validation: `npm run typecheck` and
`GATES_CONFIG_MODE=writable tools/gates.sh --no-e2e` passed. Build, **1,427 unit
tests**, **144 Python tests**, content, attribution and formatting remain green.
Final diff and formatting checks passed. The eight-second frame advance is
applied to all eight original viewport/site/scale cases; all existing assertions
remain in both browser specs. The orchestrator should rerun these nine cases
(or the full gate) to confirm browser behavior.

## Second orchestrator follow-up — cockpit initialization

The next outside-sandbox full gate passed **407 browser cases** and project-base
E2E, with **48 skipped** and one remaining failure: save-soak cycle 3 registered
**413 geometries versus a 410 baseline**. All eight animal-toast cases passed.
Evidence: `.cache/gates/e2e.log` and
`test-results-gates-4370-795280/f-save-soak-four-dives-mod-7d411-thout-scene-leaks-or-errors-chromium/error-context.md`.

The three-allocation difference came from the warm-up itself: the hidden
Low-tier `CockpitView` initially owns three empty geometries (bezel, console,
screens) plus the bolt geometry. Three registers and captures those geometry
references while collecting its render list. The first cockpit `onBeforeRender`
then calls `fit`, disposing the three placeholders and replacing them after
collection. The first warm-up therefore leaves only the bolt registered; a
second warm-up registers the three final geometries as well. `ready` can run
once or twice on a given document in this soak, explaining the 410/413 split.

The fixture now calls `subMesh.cockpit.fit(camera.fov, camera.aspect)` before
collecting/drawing resident resources. Thus its first warm-up registers the
final cockpit geometries. Existing save, migration, error, scene-object, restart
and exact GPU allocation assertions remain intact. No production settings,
first-target distances, hint behavior or tolerances changed.

`tests/unit/soakWarmup.test.ts` uses the real cockpit callbacks and Three's
actual `WebGLGeometries` allocation/disposal registry without uploading GL
buffers. It reproduces the cold sequence **1 → 4 → 4**, and verifies the
prepared sequence **4 → 4 → 4**. Both regression tests and the existing vehicle
suite passed (**10 tests**). Browser confirmation of the final soak fix remains
pending on the orchestrator; no local visual verification is claimed.

Second follow-up validation: `GATES_CONFIG_MODE=writable tools/gates.sh --no-e2e`
passed every gate, including the production build/typecheck, **1,429 unit tests
across 138 files**, **144 Python tests**, strict content validation, attribution
and repository formatting. Final documentation formatting and diff checks passed.
