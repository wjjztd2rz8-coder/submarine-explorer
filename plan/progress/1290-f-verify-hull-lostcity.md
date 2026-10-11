# 1290 — merged hull, carbonate towers and terrain cache audit

## Plan

Two rounds: (1) check cache equivalence, instance isolation, eviction and disposal;
audit Endurance camera clearance and Lost City tip framing on desktop and both phone
orientations; (2) run the regression suites, measure Low geometry, and record results.
Fix reproduced defects with regression tests; retain existing assertions.

## Round 1 — cache and opening geometry

- Checkout includes the later `f-lostcity-tower` merge: Arcade arm is already 66 m
  with +8 m vertical offset. Its note reports desktop/landscape card clearance,
  but explicitly leaves portrait/Low unverified.
- **Fixed:** `Terrain.dispose()` retained memoised heights. Regression reproduced
  three retained entries after disposal; `dispose()` now clears the map. This
  releases up to 400,000 entries even when the disposed object remains referenced.
- `Terrain.latticeHeights` belongs to each Terrain instance, keys include the
  subdivision, and insertion clears at 400,000 entries. No in-place regeneration
  API or runtime survey mutation was found. New site/terrain instances cannot
  inherit the previous map. Eviction recomputes identical heights.
- 18 memo tests pass. They compare against the pre-cache calculation by replacing
  only `latticeHeight` with direct `surfaceHeight` evaluation. Shipped Blue Hole
  and Lost City surveys/profiles pass on Low/Medium/High/Ultra, cold and warm, at
  focus samples, patch boundaries and tile edges, within **1e-9 m**. Synthetic
  mixed-subdivision tests cover both triangle halves, reversed query order,
  out-of-tile sampling, rebuilt surveys, warm hits and the eviction bound.
- Six new opening geometry tests pass on real Endurance/Lost City tiles at
  Low/Medium/High and 1600×900, 390×844, 844×390. They check eye clearance, a 3×3
  near-plane grid, 101 samples along the arm, prop collisions and independent
  terrain/prop mesh raycasts. Phone landscape includes the actual view shift.
  Endurance's authored arm remains 70 m; its portrait override remains 52 m.
  No camera/prop clipping was reproduced in these headless checks.
- Baseline focused units: 67 tests pass (Lost City camera, static prop budgets,
  carve/mesh agreement, wrecks, 1240 discovery rewards and lander verification).
- Baseline production build passes. Read-only shared dependencies require Vitest
  `--configLoader runner --cache=false` and a locally bundled Vite config with
  `--configLoader native` (the same approach as `tools/gates.sh`).
- Browser verification blocked by this environment: Browser runtime returns no
  connected browsers; Playwright cannot start preview (`listen EPERM` on
  `127.0.0.1:4290`). No opening screenshot or rendered-frame result claimed.

## Round 2 — budgets and regression gates

Low static prop census (all full props before frustum culling, including internal
LOD branches and material passes; excludes terrain, sub, life and effects):

| Site       | Draw calls | Triangles |
| ---------- | ---------: | --------: |
| Endurance  |         17 |    41,044 |
| Lost City  |         40 |    41,096 |
| Challenger |          5 |    11,646 |
| Hunga      |          5 |     8,326 |
| Hudson     |          5 |    14,548 |

All retain the existing ≤1,200 calls / ≤1,200,000 triangles static limits. Added
Hunga/Hudson to both the static budget and the existing rendered-frame guard;
the latter retains ≤1,500 calls / ≤1,500,000 triangles. The new 1220 survey POIs
are markers on existing bathymetry, and required route/completion regressions
remain covered in `missionPacing.test.ts`.

Added `f-verify-hull-lostcity-1290.spec.ts`: 12 browser cases (two sites, Low/High,
desktop/portrait/landscape) capture screenshots and JSON probes, check opening
clearance and Low frame budgets, and require the actual highest solid carbonate
vertex to clear the visible scan card by at least 8 CSS pixels. Typechecking and
Playwright test discovery pass (21 cases across that spec and the expanded frame
budget spec). Execution remains blocked before the server starts.

**Additional finding:** `f-lostcity-readable.spec.ts` still pins the old 50 m arm
and <95 m camera-to-tower range, while the current merge and unit tests pin 66 m.
These obsolete browser expectations conflict with the later framing merge.
They were left intact; the range assertion was not relaxed. This browser suite
must be reconciled with the accepted composition before a clean full e2e gate
can be claimed, independently of the sandbox restriction.

Validation:

- Production build and separate TypeScript check: pass.
- Focused baseline: 67 unit tests pass; new cache/opening/static budget run:
  34 pass (diagnostic Low/High census); expanded shipped-cache suite: 18 pass.
- Full unit suite: **179 files / 1,797 tests pass** (256.88 s). The final expanded
  18-case shipped/synthetic cache suite also passes separately (27.93 s).
- Python: 156 tests pass.
- Strict landmark content validation: all sites pass, zero errors/warnings.
- Attribution, formatting of changed files and `git diff --check`: pass.
- Browser runtime: no browsers connected. Playwright: preview fails with
  `listen EPERM 127.0.0.1:4290`. Visual appearance, Lost City card clearance and
  full rendered-frame budgets remain **unverified** in this environment.

Logs: `.cache/verify1290/`; static census: `.cache/perf-budget/static.json`.
No assertions or snapshots were loosened/refreshed.

On a runner with browser/socket access, build the current checkout into
`dist-1290` first (use the writable config workflow in `tools/gates.sh` when
dependencies are read-only), then replay the targeted browser checks with:

```bash
GATES_CONFIG_MODE=writable PW_PORT=4290 PW_OUTDIR=dist-1290 npm run test:e2e -- \
  tests/e2e/f-verify-hull-lostcity-1290.spec.ts tests/e2e/f-perf-budget.spec.ts
```
