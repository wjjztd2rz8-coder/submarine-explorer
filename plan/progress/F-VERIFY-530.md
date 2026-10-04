# F-VERIFY-530: merged HUD, touch and Titanic verification

Latest 580 status: the external full run passed every original license-link
hit-test, with 362 browser cases passing, 21 skipped and two later landscape
expanded-sonar failures. The expanded-sonar/footer overlap is now corrected
in product CSS; external browser verification of this second fix is pending.

## Plan

1. Check the merged 450 footer chip and expanded credits against sonar, telemetry,
   scanner, notification toast, tutorial and controls on desktop and touch at
   360×640 and 844×390, including 150% UI settings.
2. Exercise Escape dismissal before pause, tap/keyboard access, scrolling and
   expanded sonar. Re-run the Beebe 150% hero regression from 395/470.
3. Inspect Titanic spawn renders and confirm permanent marine snow remains.
4. Fix reproduced regressions, add tests, run static gates and the full E2E suite,
   and record changes and evidence here and in CHANGELOG.md.

## Findings and fixes

- `f-bughunt-15.spec.ts` already contains active Beebe 150% tests at 360×640,
  390×844 and 844×390. The merged 470 change removed the old fixme. There is no
  remaining fixme to remove, and that coverage remains enabled.
- Existing 450 attribution tests cover desktop 1600×900, touch 844×390 and
  667×375 at default scale, but compare the open panel only with controls/reset
  camera. They miss 360×640 and collisions with the rest of the HUD.
- **Portrait offscreen credits:** the footer moves to the left edge, while its
  336 px panel stays attached with `right: 0` to a roughly 110 px chip. At
  360 px width this puts the panel's left edge around −214 px. The new geometry
  regression demonstrates the old negative coordinate and checks a free slot
  inside the viewport with conservative phone HUD rectangles.
- **Landscape HUD overlap:** inspected the existing cached 450 screenshot,
  `.cache/codex/shots/450-hud-attribution/844x390-expanded.png`. Its panel spans
  approximately x=144–544, y=110–327, covering the sonar's right edge and the
  bottom of the scan panel. The original assertion passed because neither was
  included in its collision checks. This is cached source-artifact evidence,
  not a fresh screenshot of this worktree.
- Expanded credits now use viewport coordinates. `DataCreditsLayout.ts` finds
  a free rectangle around visible sonar, objectives, readouts, scan panel,
  toast/warning, tutorial/hint, keyboard hints, reset camera, touch controls
  and the chip itself. It prefers a full reading area near the chip and uses
  scrolling when space is limited, without suppressing these HUD elements.
  On the conservative short-phone fixture, a narrow slot above the telemetry
  clears sonar and Pause. This compact reading slot needs browser visual QA.
- The HUD refreshes placement on native details toggle and while open when
  obstacle geometry, visibility, fonts or viewport dimensions change. It caches
  unchanged geometry so steady frames do not resize or search again. Credits
  preserve their GMRT citation, DOI/license links and native summary activation.
- Portrait summary targets now retain a 44 px height; the earlier 32 px override
  won over the coarse-pointer touch-target floor. The chip stays above the stick.

## Regression coverage

- `tests/unit/dataCreditsLayout.test.ts`: eight tests for full desktop placement,
  left-anchored portrait HUD, a changing toast, multiple viewport sizes, no-space
  detection, live HUD geometry caching, rotation and closed-panel behavior.
  These test rectangle calculations and the real HUD placement method with a
  DOM surface fixture; they do not emulate CSS layout.
- Existing Escape and keyboard unit tests still cover credits dismissal before
  pause, focus return, modal/photo priority, disposal and native Space/Enter
  activation without piloting. All 15 focused layout/Escape/keyboard tests pass.
- `tests/e2e/f-verify-530.spec.ts`: 15 new browser cases, successfully collected.
  Six fresh-player cases exercise 1280×720 desktop, 360×640 portrait and 844×390
  landscape at 100% and 150%, keeping the tutorial/contact visible while credits
  are open. Checks include every tutorial step, a deterministic visible toast
  fixture, link scrolling/hit testing, Escape/focus/pause ordering, native keys,
  expanded sonar, rotation, chip target size and unchanged saved scale.
- Three additional 150% Beebe mission cases check open credits with objectives,
  the tutorial and a real in-range contact at those same viewports.
- Six Titanic cases cover free-dive and mission routes at Low/Medium/High. They
  assert runtime ambient fill and local seabed lighting proxies, active nonzero
  permanent snow, tier particle counts and the 6 px cap, then capture spawn and
  lamps-off renders for human inspection. These lighting proxies are not pixel
  luminance measurements. All browser execution remains pending below.

## Titanic and vent-haze evidence

- The real Titanic mission configuration retains `ambientFill: 30`.
  `heroReadability.test.ts` passes for both Low and Medium free/mission poses,
  checking ambient fill ≥24, 40 m fog transmission ≥0.95, and positive effective
  ambient light on actual nearby seabed samples with lamps disabled.
- Ran the existing all-site/all-tier snow audit with `SNOW_AUDIT=1`. Titanic
  density stays 0.8, budgets stay 600/3,000/9,000/9,000 for Low/Medium/High/Ultra,
  and projected visible permanent-snow counts at free/mission openings are
  50/44, 267/262 and 773/828 (High and Ultra). Snow is still present; the 6 px
  ceiling and foreground guards remain active. These are CPU shader/projection
  proxies and do not include depth-buffer occlusion or post-processing.
- Existing vent-haze regressions pass: generic vents keep the two-draw budget,
  Beebe's authored override retains warm haze, and carbonate flow excludes it.
- Inspected the cached `f-visual-fixes/titanic-spawn.png`: the hull and nearby
  seabed are readable, with white permanent snow and rust motes visible. This
  cached render is supporting evidence only; its exact source build is not
  established here, and no fresh render or post-change visual pass is claimed.
- Preserved copies of both inspected cached images in `.cache/verify-530-shots/`.
  Snow measurements are in `.cache/verify-530-snow-measurements.json`.

## Validation and environment limits

- First static gate run passed production build/typecheck, all unit tests,
  144 Python tests, strict content validation, asset attribution and Prettier.
- Focused render/preset run: 78 tests passed in three files; focused HUD run:
  15 tests passed in three files. Logs: `.cache/verify-530-render-unit.log` and
  `.cache/verify-530-hud-unit.log`.
- Ran `GATES_CONFIG_MODE=writable PW_PORT=4530 PW_OUTDIR=dist-verify-530
tools/gates.sh --full-e2e`. Static gates and the project-base production build
  passed. Both E2E phases failed before executing tests because the sandbox
  cannot start a localhost preview server. Direct preview reports
  `listen EPERM: operation not permitted 127.0.0.1:4530`; a direct Chromium probe
  also fails in `sandbox_host_linux.cc` with `Operation not permitted`.
- A focused attribution E2E attempt fails at the same preview-startup boundary.
  There is no available approval escalation in this session. No fresh browser
  screenshots were produced and no E2E pass is claimed.
- Full gate logs: `.cache/gates/{build,unit,python,content,attribution,prettier,
e2e,e2e-base}.log`. Gate exit status is 1 solely for the blocked E2E phases.
- Final full-gate attempt passed production build/typecheck, **1,293 unit tests
  in 120 files**, **144 Python tests**, strict content validation, asset
  attribution, repository Prettier and the project-base production build.
  Both E2E phases remained blocked before test execution. The complete attempt
  is preserved in `.cache/verify-530-final-gates.log`.
- `git diff --check` passed. The report's final edit was checked with Prettier.

## Remaining verification

Run the full suite in an environment that permits localhost and Chromium:

```sh
GATES_CONFIG_MODE=writable PW_PORT=4530 PW_OUTDIR=dist-verify-530 \
  tools/gates.sh --full-e2e
```

Inspect the new `f-verify-530` screenshots in the gate output, including the
small portrait reading slot and every Titanic tier/route; retain the existing
`f-bughunt-15`, `f-touch-audit`, `hud-attribution` and preset results. The browser
and fresh visual portions of this task are **unverified**, pending that run.

## 580 follow-up: license link hit box (2026-10-04)

### Integration

The supplied worktree is `codex/580-f-530-fix-license-link-hit`, based on main
`9234226`, rather than the original 530 branch. Integrated `728ac88` against
that main before editing product code. Only CHANGELOG.md conflicted; retained
both sides, including main's later Blue Hole, Monterey and 510/520 entries.
The actual merge cannot be recorded here: Git cannot create ORIG_HEAD.lock in
`/home/vijay/submarine-explorer/.git/worktrees/580-f-530-fix-license-link-hit/`
(read-only filesystem). A temporary Git index/object directory at
`/tmp/verify-530-git` performed the three-way merge into this worktree. The
combined files are present, but the real branch still needs its merge/commit
recorded by the external runner. Main itself was not modified.

### Cause and product fix

Inspected the previous failed full-suite render and error context at:

- `test-results-gates-4532-3792595/f-verify-530-530-credits-d-f5071-tact-toast-sonar-and-Escape-chromium/credits-toast.png`
  in the main checkout: desktop 100% shows `CC` at the right end of the link
  row and `BY 4.0` at the left of the next row, inside the unobstructed panel.
- The corresponding desktop 150% `d-69d5b` screenshot has a narrower free
  slot and shows the entire license on its own line; that case passed.
- Also inspected landscape and portrait credits/toast renders. Copies of the
  old credit renders/error contexts are in `.cache/verify-530-580-evidence/`.
  These are prior-run evidence, not new screenshots of this fix.

The split inline anchor's bounding rectangle spans both rows and most of the
paragraph width. Its centre lies between the two clickable text fragments;
scrollIntoView moves that rectangle into view but does not join the fragments.
This explains the failed centre hit-test and the scale-dependent pass. The
underlying paragraph/panel at that point is inferred from the old render and
CSS; a fresh elementFromPoint trace could not run in this sandbox.

`src/styles/hud.css` now gives every attribution anchor `display: inline-block`
and `max-width: 100%`. Each link has one rectangular hit box, moves intact to
the next line when needed, and can wrap its own longer text within a narrow
panel. Existing scrolling, viewport placement and stacking remain in place.

Kept the exact centre-point `el.contains(document.elementFromPoint(...))`
condition and `.toBe(true)` expectation in `f-verify-530.spec.ts`. The test now
captures the hit element's HTML, anchor fragments, anchor/panel rectangles and
scroll offset from the same evaluation as the assertion. It attaches those
measurements and saves `credits-license.png` after a passing hit-test. No
polling, retries, forced clicks or reduced geometry assertions were added.

Merging current main also exposed a stale `hudControlTips.test.ts` HUD stub:
530's new draw-stage call to layoutDataCredits was missing from it. Added the
missing mock method; all its existing behavior assertions remain intact.

### Validation

The initial full gate passed build, Python, content, attribution and formatting,
but reported that missing stub and could not start either browser phase.
Final gate results are recorded below after the rerun with the corrected stub.

Commands:

```sh
GATES_CONFIG_MODE=writable PW_PORT=4580 PW_OUTDIR=dist-verify-530-580 \
  tools/gates.sh --full-e2e
```

The full E2E and project-base phases were attempted, but the preview process
cannot listen on localhost: a direct probe reports
`listen EPERM: operation not permitted 127.0.0.1:4580`. A direct Chromium launch
fails in sandbox_host_linux.cc with `Operation not permitted`; the Browser
skill connection reports no available browsers. Approval escalation is disabled.
No fresh browser pass or post-fix screenshots are claimed. The external
`FULL_E2E=1` task runner must execute the unchanged hit-test against this build.

Logs: `.cache/verify-530-580-{gates,final-gates,preview}.log` and
`.cache/gates/{build,unit,python,content,attribution,prettier,e2e,e2e-base}.log`.

Final rerun: production build/typecheck, **1,315 unit tests in 124 files**,
**144 Python tests**, strict content validation, attribution and repository
Prettier all passed. The project-base production build also passed. Gate exit
status was 1 solely because both E2E preview servers could not start; no browser
test executed. `git diff --check` passed and the temporary merge index has no
unresolved conflicts. The final report edit was checked with Prettier separately.
The updated 530 spec successfully collects all 15 cases
(`.cache/verify-530-580-collection.log`).

## 580 round 2: expanded landscape sonar clears the chip

The orchestrator ran `tools/gates.sh --full-e2e` outside the sandbox. Build,
unit, Python, content, attribution, formatting and project-base E2E passed.
The full suite reported **362 passed, 21 skipped and 2 failed in 34.3 minutes**.
All six license-link centre hit-tests passed, including the four originally
failing combinations. Thirteen of the fifteen 530 cases passed; the remaining
two reached the later expanded-sonar check at 100%/150% landscape.

Inspected the new desktop, portrait and landscape `credits-license.png` renders
in `test-results-gates-4371-4032823/`: the license stays in one clickable box,
including after scrolling the short portrait panel. Also inspected the portrait
`credits-expanded-sonar.png` and both landscape error contexts. The external
logs are preserved in `.cache/verify-530-580-round2/e2e-external-round1.log` and
`e2e-base-external-round1.log` before local gates overwrite `.cache/gates/`.

The new failures report the landscape chip at x=438.516–544, y=336–380 and
expanded sonar at x=274–574, y=10.031–379.969. Both scales have the same
overlap: the expanded canvas cap `100vh - 104px` excludes the header's height,
and vertical centring then puts the whole map across the bottom credit control.

Changed `src/styles/hud-layout.css` to constrain the **whole** expanded sonar
panel on short landscape phones. It starts 12 px below the safe top and reserves
the 10 px bottom inset, 44 px credit chip and 8 px gap, including safe-area
insets. A flex column keeps the header/range buttons from shrinking and permits
the canvas to shrink (`min-height: 0`) with its image aspect preserved by
object-fit. At 844×390 with zero safe insets, the panel's bottom is at most
328 px, leaving the chip's y=336–380 strip free. Its existing horizontal
reservation still clears Pause and the right action controls.

All existing hit-test, overlap and bounds assertions remain. Added expanded-map
checks that the canvas has positive dimensions and fits inside the sonar panel,
and that the credit chip's centre is clickable after expansion. These prevent
an apparent overlap fix achieved by overflowing/clipping the map or covering
the chip. The tests retain rotation and normal 44 px zoom-button coverage.

Local round-2 validation uses:

```sh
GATES_CONFIG_MODE=writable PW_PORT=4580 tools/gates.sh --no-e2e
```

The second product fix needs the external full browser rerun; localhost and
Chromium remain unavailable inside this sandbox. No round-2 browser pass is
claimed.

Round-2 local results: production build/typecheck, **1,315 unit tests in 124
files**, **144 Python tests**, strict content validation, attribution and
repository Prettier passed. Successful gate log:
`.cache/verify-530-580-round2/static-gates-retry.log` (exit 0). The initial
static-gate process was terminated during unit execution (exit 143); the rerun
completed normally. The focused credits-layout/control-tips run also passed
all 9 tests, typecheck passed separately, and all 15 updated browser cases
collect successfully (`.cache/verify-530-580-round2/collection.log`).
`git diff --check` and final report formatting passed.
