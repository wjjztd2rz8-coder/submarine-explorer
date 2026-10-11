# 1240 Verify Challenger lander and first discovery

## Plan

Two audit rounds, with regression tests for confirmed bugs and unchanged budget assertions.

1. Trace the merged lander, terrain tint, deep opening, reward card and tutorial changes. Reproduce bugs in focused unit tests; measure Low geometry and scan candidates with real content.
2. Review fixes, run regression suites and build/type checks, then exercise desktop and portrait touch discovery and Journal flows in Chromium. Record measurements and any environment limitations.

## Round 1 — investigation

- Confirmed: onboarding discards a completed scan while waiting for movement/depth/lights. Scanner prevents scanning that target again during the dive, so the later tutorial scan step can require finding a different target.
- Confirmed: movement timers accumulate short presses across released frames despite their documented sustained-hold thresholds. Thrust/turn and depth regressions failed before the fix; timers now reset below the axis threshold while retaining thrust OR turn completion.
- Lander uses three ordinary meshes (merged frame, opaque double-sided flag, strobe) and one alternate box impostor; no InstancedMesh allocation in this builder. Inspect rendered budgets and ownership separately from temporary CPU geometries.
- Reward title intentionally uses the POI name; Journal retains its authored guide title and resolves the entry by id. Verify that differing titles still open the correct unlocked entry across sites.
- Initial unit runner hit read-only shared node_modules config-bundle output; `--configLoader runner` starts successfully without changing repository config.

## Round 2 — verification

- Confirmed an additional phone-path bug: Pause → Journal leaves the app in `pause`, while onboarding only accepted Journal activity in `dive`. The final step remained incomplete and its saved completion flag stayed false. A failing touch regression reproduced it. Onboarding now accepts the Journal from a paused dive; a separate assertion excludes opening it from home.
- Retained completed scan success until the scan step becomes current. Earlier movement/depth/lights steps remain in order; an unfinished early scan does not count, and a new dive clears the deferred completion. Keyboard and touch system tests cover saved completion and exactly one completion toast.
- Existing opening audits pass with the merged geometry: Challenger and Endurance across Low/Medium/High/Ultra, mission/free-dive pose agreement, scan candidate and completion, collision/terrain clearance, desktop/portrait hull and reticle clearance, and staged wildlife survival through 60 simulated seconds. Portrait opening checks also cover Hunga Tonga and Axial Seamount at 390×844 and 360×640.
- All 31 POIs at Challenger, Endurance, Titanic, Lost City, Great Blue Hole, Beebe and Monterey retain their reward name, guide-entry id and authored Journal title. A new integration-style unit suite uses real content/loaders/scanner/store/objectives/discovery/Journal unlock logic with deterministic fetch/seabed adapters and mock DOM views. It covers first-time rewards and returning-player rewards. Different reward and Journal titles are authored copy, not a mapping bug.
- Added dedicated lander geometry/resource tests and Challenger/Endurance coverage to the existing static and rendered frame budget suites. No existing assertions or limits were weakened.

### Geometry and resource findings

Lander full geometry: **3 draw calls / 1,022 triangles on Low**, **3 / 1,622 on Medium/High/Ultra**. Alternate impostor: **1 / 12**. The flag is double-sided but opaque, so it does not add a second transparent rendering pass. All four geometries/materials are independent between builds; the builder allocates no instances or textures and retains no per-build cache. Normalised intermediate geometries are disposed after merging; original indexed inputs are temporary CPU allocations that are never uploaded. No lander-specific instancing/shared-resource leak was confirmed. Application-wide GPU teardown remains outside this headless resource check.

Static cost of all full-prop trees before culling (including their internal branches, excluding the separate far impostors):

| Site            | Low calls | Low triangles |
| --------------- | --------: | ------------: |
| Challenger      |         5 |        11,646 |
| Endurance       |        17 |        37,028 |
| Titanic         |        33 |       116,438 |
| Lost City       |        40 |        40,256 |
| Great Blue Hole |         8 |        21,228 |
| Beebe           |        19 |        19,926 |
| Monterey        |        30 |       284,010 |

All retain the existing **1,200 calls / 1,200,000 triangles** prop limits, reserving the remaining full-frame budget for terrain/vehicles/effects. The separate rendered assertions remain **1,500 / 1,500,000**. Vertex tint reuses the terrain vertices and draw calls. Rendered full-frame measurements and GPU disposal were not possible in this sandbox.

### Checks and artifacts

- Initial focused baseline: **8 files / 129 tests passed**.
- Failing reproductions: four tests for early scan/continuous holds, then one strengthened touch test for Pause → Journal; all now pass.
- Final affected suites (onboarding/tutorial/device copy/discovery rewards/scanner/lander): **6 files / 76 tests passed**.
- Static Low/High prop audit: **14 tests passed**; measurements in `.cache/perf-budget/static.json`. Lander measurements in `.cache/1240/lander-costs.json`.
- Production build and TypeScript pass with the existing local native-config bundle workaround from `tools/gates.sh`. Default config bundling cannot write shared `node_modules/.vite-temp`; runner loading works for unit tests but hits the known Vite/PWA late-import issue for builds. Native loading avoids both without repository config changes.
- Full unit suite: **175 files / 1,743 tests passed** (454.64 seconds). Final affected suites also ran after the phone-path fix and include the new discovery mapping suite.
- Playwright discovers **8 new desktop/390×844 touch scenarios** covering Challenger/Endurance authored openings and Titanic/Lost City POI approaches, reward → Journal title/id navigation, unchanged rendered budgets, and the complete scan-before-movement tutorial through real controls.
- Browser execution is **blocked, not passed**: preview cannot bind `127.0.0.1:4240` (`listen EPERM`); Playwright likewise stops before running tests because its web server cannot start. No screenshots or rendered-frame/GPU-memory claims are made.

Useful commands:

```sh
npm test -- --configLoader runner --cache=false
PERF_BUDGET_STATIC=1 npm test -- --configLoader runner tests/unit/perf-budget.test.ts
npm run build -- --config .cache/1240/vite.config.mjs --configLoader native
GATES_CONFIG_MODE=writable PW_PORT=4240 npm exec playwright -- test tests/e2e/f-verify-lander-firstdisc-1240.spec.ts tests/e2e/f-perf-budget.spec.ts
```

The native config is generated locally (same approach as `tools/gates.sh`):

```js
import { build } from 'rolldown';
await build({
  input: 'vite.config.ts',
  platform: 'node',
  external: ['vite'],
  output: { file: '.cache/1240/vite.config.mjs', format: 'esm' },
});
```

## Orchestrator gate follow-up — project-base port collision

The external orchestrator passed build, unit, Python, content, attribution, formatting and browser smoke (**3 smoke tests**). Its full unit run passed **176 files / 1,751 tests**. The project-base build passed, but Playwright stopped before any project-base test ran because `http://localhost:4472` was occupied. Evidence: `.cache/gates/e2e.log`, `.cache/gates/unit.log`, `.cache/gates/e2e-base.log`.

Root cause: `tools/gates.sh` derived a second preview port as `PW_PORT + 100` without reserving that port. A valid requested port (`4372`) therefore did not protect the sequential project-base suite from an unrelated preview on `4472`.

Fix: both sequential suites now use the requested `PW_PORT`. The first Playwright invocation finishes and tears down its owned preview before the project-base build and second invocation. The second preview still starts fresh against its separate `/submarine-explorer/` build. `PW_REUSE_SERVER=0`, Playwright's ownership checks and Vite `--strictPort` remain enforced. Build/result paths remain distinct, and cleanup still removes only this gate run's temporary outputs. Port validation now accepts the full TCP range because it no longer needs room for an offset port.

Regression evidence: before the fix, an offline gate test simulating an occupied `PW_PORT + 100` reproduced the exact **PASS e2e / FAIL e2e-base** failure. It now passes and asserts both selected ports, disabled reuse, distinct served builds and cleanup. A second regression proves an occupied requested port still fails both gates; errors are not converted to successful reuse or skipped checks. Existing test selections, failure propagation, output ownership and build cleanup assertions remain intact; the exact expected base port changes from the removed offset to the requested port.

Validation after the fix:

- `python3 -m unittest tools.tests.test_gates -v`: **12 tests passed**.
- `npm test -- --configLoader runner tests/unit/playwrightConfig.test.ts`: **4 tests passed**.
- `bash -n tools/gates.sh` and `git diff --check`: passed.
- Real Chromium/project-base retest remains for the external orchestrator; this sandbox still cannot listen on localhost. No post-fix browser pass is claimed.
