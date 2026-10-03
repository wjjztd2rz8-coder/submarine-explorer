# F-BUGHUNT-4 — hero terrain and Daily/Free audit

Originally audited `d676ad1` on 2026-10-02, after reading `plan/DIRECTOR.md`,
in two passes without application source edits, asset edits or commits. Added
audit unit tests and Playwright repros. The subsequent gate follow-up below
authorizes and records production CSS fixes. Prior bug-hunt fixes are present; this report does not repeat
the already-fixed photo exit, Monterey mission-distance or live hull issues.

## Gate follow-up — portrait root causes fixed

The orchestrator's `tools/gates.sh` run confirmed all five phone repro failures
in Chromium: both Free-dive sonar/readout overlaps, the Daily sonar/objective
overlap, and both thrust/BOOST overlaps. It reported 211 other e2e tests passed,
14 skipped, and every other gate passed, including e2e-base. Evidence:
`.cache/gates/e2e.log`. The user then authorized source fixes for those failures.

Changes:

- `src/styles/hud-layout.css`: collapsed portrait sonar has its own responsive
  left column; readouts and objectives use a separate right column. The canvas
  resizes within the panel while range buttons retain 44 px targets. Objectives
  show the current goal with navigation and progress; the existing observer
  stacks telemetry below their actual height. PAUSE moves to the top right,
  with space reserved beneath it for the stack. Expanded sonar keeps its
  existing map layout.
- `src/styles/touch.css`: portrait controls use two button columns. PHOTO and
  SONAR occupy the first row, LIGHTS and BOOST the second, and SCAN spans the
  third. Touch scaling is limited by available width, accounting for safe-area
  insets. Existing control-size floors remain. The full grid clears the stick
  by 24 px at 320 px/100%, and 8 px at 390 px/150%; button edges are 48 px and
  59.12 px respectively. These are numerical footprint calculations, pending
  browser measurement. The calculation also passed all widths 320–700 and
  UI settings 80–150% with zero horizontal safe-area insets.
- `tests/e2e/f-bughunt-4.spec.ts`: all five original tests and every original
  assertion remain. Added checks for stick versus the entire grid, slider
  versus grid, viewport containment, and minimum 44 px button targets.

Post-fix local validation: **802 unit tests / 82 files passed**, typecheck passed,
production build passed (existing bundle-size warning), Prettier passed, and
five Playwright tests are still discovered. Chromium execution is delegated to
the orchestrator as instructed; no post-fix e2e pass is claimed. Rerun
`tools/gates.sh --full-e2e` outside the sandbox for acceptance.

Ranks 2 and 3 below record the pre-fix failures, now confirmed by the gate and
addressed in CSS. Ranks 1 and 4 remain open audit findings. No commits or asset
changes were made.

## Original ranked findings

| Rank | Priority | Finding                                                                                            | Evidence                                                 |
| ---- | -------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 1    | P1       | Low-tier Blue Hole collision and sonar describe a hole substantially deeper than the rendered wall | Executed mesh raycasts and submarine physics             |
| 2    | P2       | Portrait Free/Daily HUD assigns sonar and telemetry/objectives the same screen area                | Original overlap confirmed by orchestrator Chromium gate |
| 3    | P2       | Portrait thrust and BOOST overlap on narrow phones or enlarged UI                                  | Original overlap confirmed by orchestrator Chromium gate |
| 4    | P3       | Zero cell spacing passes metadata validation and produces NaN terrain                              | Executed malformed-input repro; existing loader weakness |

### 1. The low-tier carved wall permits the entire sub inside visible terrain

**Locations:** `src/world/Terrain.ts:220`, `src/world/TerrainChunk.ts:86`,
`src/core/config/terrain.ts:146`, `src/ui/Sonar.ts:433`.

The analytic carve reaches the sampler, physics and sonar correctly. However,
the low tier has one mesh subdivision per ~58.38 × 61.15 m source cell. The
steep carved profile changes across much shorter distances. Matching the mesh
at its vertices does not match the interiors of its planar triangles.

At world X/Z **(-37.4305, -39.80194)** on the actual Blue Hole tile:

| Surface                                      | Y (metres) |
| -------------------------------------------- | ---------: |
| Rendered triangle, downward Three.js raycast |   -63.9637 |
| Collision `sampleHeight`                     |  -100.5359 |
| Sonar `sampleDataHeight`                     |   -95.2532 |

The mesh/collision gap is **36.5722 m**. Resetting the submarine to Y=-80 and
stepping physics gives altitude **20.5359 m**, `touchedBottom=false`; even the
top of its 8 m collision sphere is below the rendered triangle. A second pass
disabled procedural detail: the mesh is -59.3262, sampler -95.2532, still a
**35.9270 m** gap. This is the carve's under-sampling, rather than depthShade.
The repro uses LOD 0 already; a closer camera cannot improve that tier's grid.

**Repro:** open
`/?tile=great-blue-hole&tier=low&at=17.31555508444125,-87.53447085591188&depth=80`.
The explicit probe uses the usual spawn-clearance check, which considers this
position safe. Inspect `window.__game.sub.getState()` and the terrain wall.
For a browser-independent repro, run the audit unit spec below. Ordinary
piloting to this wall can reach the same mismatch; the URL only shortens setup.

**Fix/acceptance:** refine geometry locally around the carve, retaining the
phone budget, and make physics agree with the resulting rendered faces. Test
triangle raycasts against collision throughout the lip, ledge and steep wall,
including reduced LODs. Vertex-only equality tests miss this issue.

### 2. Portrait sonar overlaps Free readouts and Daily objectives

**Locations:** `src/styles/flow.css:156` and `:226`, `src/styles/sonar.css:19`,
`src/styles/touch.css:178`, `src/styles/hud-layout.css:204`.

At 390×844, the Free-dive readouts are 360 px wide, right=12, top=12. Sonar
is left=12, top=12, with an approximately 220 px map plus padding. Their
rectangles necessarily intersect. Daily objectives occupy the same top-right
360 px region before pushing the readouts down. The portrait HUD override only
moves the tutorial and scan panel. PAUSE also occupies sonar's upper area
(left=34%, top=6.4 px at default scale).

**Repro:** a touch device at 390×844, default UI scale, visit
`/?tile=great-blue-hole&tier=low&touch=1` or the Monterey equivalent. Compare
sonar/readout bounds. From Home, tap Daily dive → Begin dive and compare
sonar/objective bounds. The new Playwright spec also checks PAUSE.

**Fix/acceptance:** give the portrait map, telemetry, objectives and PAUSE
separate regions. Test Free and Daily with sonar included in overlap checks;
the existing HUD layout spec checks other panels but omits sonar and portrait.
The orchestrator subsequently confirmed these original overlaps in Chromium;
see the gate follow-up. Post-fix browser verification remains pending.

### 3. Portrait controls cannot fit at supported scales

**Locations:** `src/styles/touch.css:127` and `:220`, `src/ui/HUD.ts:19`.

At 320 px and default UI scale, auto scale is 0.8. The stick spans X=11.2–115.2;
BOOST spans X=84.8–132.8: **30.4 px horizontal overlap**. Both are bottom-aligned,
so they also overlap vertically. At 390 px and 150% UI scale (combined scale
1.2), the spans are 16.8–158.4 and 73.2–135.6: **62.4 px overlap**. These are
calculations from the CSS dimensions, with zero safe-area insets, not browser
measurements. BOOST is later in the touch root's DOM and competes with the
stick's interaction area.

**Repro:** open either hero Free dive on a 320×568 touch viewport, or use
390×844 and set Settings → UI scale to 150%. Compare thrust/BOOST targets.
These controls also remain shared by Daily after Begin dive.

**Fix/acceptance:** reflow the button grid or clamp its footprint against the
actual remaining width. Validate target bounds and taps at both configurations;
retain usable target sizes. The orchestrator subsequently executed these repros and confirmed both
overlaps. Post-fix browser verification remains pending.

### 4. Malformed cell spacing poisons sampling instead of aborting loading

**Locations:** `src/world/TileLoader.ts:35`, `src/world/Terrain.ts:220`.

`validateMeta` requires spacing keys but does not validate finite positive
values. A 2×2 tile with `cellsize_m_x: 0` and four finite heights is accepted.
Constructing Terrain then returns NaN from `sampleDataHeight(0, 0)` and creates
NaN vertex positions/bounding spheres. This predates the hero work and requires
bad content; both checked hero heightmaps contain **zero nonfinite samples**.
Finite tile corners, hole centre and ±1e9 out-of-tile sampling passed.

**Repro:** the malformed-metadata test in the audit unit spec passes the above
fixture through `validateMeta`, then constructs the low-tier Terrain. No network
or browser is necessary.

**Fix/acceptance:** reject nonfinite/nonpositive cell sizes before meshing;
validate coordinates and decoded height values at the loading boundary. Test
the fatal-load path instead of allowing invalid geometry to reach rendering.

## Performance and isolation checks

- **Monterey:** isolated low-tier scarp enlargement from `[70,26,36]` to
  `[140,50,64]` increases full-mesh triangles **4,884 → 17,508** (+12,624,
  3.58×), keeping **two mesh draws**. Both builds use the current kit, the same
  seed and flat ground; this isolates the authored size change, rather than
  claiming total renderer counts or a complete historical scene comparison.
  The larger hero is intentional. Treat the cost as a phone-budget watch item,
  not a demonstrated FPS failure. Rerun at the default Free opening and Daily
  approach, and record `window.__game.perf` after content settles. The previous
  hero report's 61 draws/116k triangles is historical evidence, not remeasured.
- **Blue Hole:** carve/depthShade adds no terrain chunk, mesh draw or triangle
  allocation; depth shading adds uniform-driven fragment work. Local geometry
  refinement for finding 1 should be budgeted explicitly.
- **Uniforms:** Blue Hole → Monterey → a second Blue Hole material uses distinct
  uniform objects. Mutating the first material's shade/tint leaves Monterey at
  `[0,0]`/white and the second Blue Hole at `[14,95]`. No leak reproduced.
  Site links perform full document navigation. Live WebGL compilation and
  asynchronous texture disposal were not browser-verified.
- **Daily/Free:** reviewed routing, current/light modifier enforcement, Free
  transition and rating persistence. Existing Daily UTC-rollover/enforcement
  tests pass. Daily candidates intentionally use research entitlement even in
  Arcade, per the earlier F2-MODES decision; this is not a new access bug.
  Canyon's ambient/snow adjustments start from a refreshed Atmosphere sample
  each frame, so no cumulative ambientFill leak was found.

## Two passes and validation

Replay the numeric findings with
`npx vitest run tests/unit/f-bughunt-4.test.ts --reporter verbose --silent=false`.
The pending browser checks are in `tests/e2e/f-bughunt-4.spec.ts`.

1. Inspected merged terrain, shader, scarp, mode and touch paths; scanned actual
   hero heightmaps; compared Blue Hole mesh raycasts with the shared sampler.
2. Reduced the repro to exact coordinates, stepped submarine physics, disabled
   procedural detail, measured the isolated Monterey mesh cost, checked uniform
   ownership and created the five phone Playwright repros.

- `npm test`: **802 tests / 82 files passed** (including five audit unit tests).
  Audit characterization tests record current defects; passing them does not
  certify the findings fixed.
- `npm run typecheck`: passed. `npm run build -- --outDir dist-bughunt4`: passed,
  including the repository's PWA/public-copy hooks; existing bundle-size warning.
- `npx prettier --write` applied to both new test files and this report.
- `npx playwright test tests/e2e/f-bughunt-4.spec.ts --list`: five repros discovered.
- Execution attempt with `PW_PORT=4194 PW_OUTDIR=dist-bughunt4` could not start
  the preview server (`listen EPERM`). Direct Chromium launch also fails at
  `sandbox_host_linux.cc` with Operation not permitted. **No e2e pass, new
  screenshots, device FPS or renderer draw-call measurement is claimed.**
- To permit the production build, replaced the ignored local `node_modules`
  symlink with a directory of links to the same shared packages plus writable
  `.vite`/`.vite-temp` caches. No dependency, lockfile or shared-package edits.

Outside this sandbox, run the new phone spec plus `f-hud-layout.spec.ts`,
`f2-modes.spec.ts`, `f1-terrain.spec.ts`, and fresh low/high hero golden captures.
First-ten-second readability, dark hole fill and narrow landscape tutorial
overflow remain visual follow-ups, not new executed findings.
