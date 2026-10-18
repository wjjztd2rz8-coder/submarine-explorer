# P2-lostcity-perf — bound Lost City effect fill

2026-10-18. Numeric/behavioral work only; visual acceptance and real-device performance remain with Claude/owner.

## Change and ownership

Changed one existing site-data override: Lost City's mission `shimmerStrength: 0.03 → 0`. This removes the extra field-wide preset shimmer draw over the prop-owned clear-fluid plumes and mouth fringes. The existing zero-strength path already skips allocation; no runtime code or new performance subsystem was needed. Medium also loses this redundant preset layer; Low already disables preset visuals and is unchanged.

Before editing, checked the clean checkout, `plan/DIRECTOR.md` In flight/backlog, `git worktree list`, and active worktree status. The anchored-events worktree was editing `SiteManifest.ts`, shared event code and the six event-site manifests. None are touched here. No changes to geometry, materials, lighting, camera/composition policy, event anchoring, `tools/`, or `plan/DIRECTOR.md`. No UI or setting added; the removed effect overlaps an existing effect rather than adding machinery. No push, merge or tag.

## Reproducible method

Extended the existing capability spec `tests/unit/perf-budget.test.ts`. Run:

```sh
PERF_BUDGET_STATIC=1 npx vitest run tests/unit/perf-budget.test.ts \
  --configLoader runner --cache=false
```

This retains the existing static census and writes before/after samples to `.cache/perf-budget/lost-city-fill-{low,high}.json`. The baseline explicitly restores the shipped pre-change `shimmerStrength: 0.03`; the result reads current mission data. Both use the production mission-selection/override/preset-entry path, actual heightmap/Terrain and all 12 placed props.

Fixture: 1280×720, DPR 1, configured 62° vertical FOV. Aim at the authored 60 m Poseidon orifice in world space. Camera offsets are `[range/√2, 6, range/√2]` for horizontal ranges 70, 32 and 10 m. The direction and first two ranges come from `tools/lostcity-poses.json`; these are explicit geometric workload views, not captures of a pilot journey or the exact golden camera poses. Sample absolute animation times 0, 5 and 10 s. All full prop branches remain in the census, without LOD/frustum/occlusion discounts.

Prop plume positions and swelling use actual seeded buffers and uniforms obtained through `onBeforeCompile`, with the clear-fluid vertex formula evaluated on the CPU. Fixture assertions check the shader still contains that motion and size policy. Fringe and preset positions come directly from their buffers. PointsMaterial attenuation uses H/2, while preset attenuation uses H/(2 tan(FOV/2)) and its existing 1–256 px clamp. Apply the minimum 1 px raster footprint, project, and clip each square to the viewport. Sum square areas without alpha, soft-texture, fog or depth rejection. A difference grid of outward-rounded squares estimates covered pixels and maximum local overlap.

These are deterministic projected-fill estimates, not rasterized game frames, GPU timer queries, requestAnimationFrame measurements, or iPhone predictions. Three times and three approaches bound this regression fixture, not every possible camera/time. Node's texture factories do not decode/render textures; no texture-opacity discount is taken.

## Source census and footprints

| Site effect                            | High before → after                      | Low before → after          | Footprint policy                                                                               |
| -------------------------------------- | ---------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------- |
| Prop clear-fluid plumes                | 14 draws, 980 points → same              | 14 draws, 350 points → same | 70/25 points per emitter; largest plume sprite grows to 3.108 m square side                    |
| Prop mouth fringes                     | 12 draws, 392 points → same              | 12 draws, 392 points → same | 0.8 m square side; aggregate 250.88 m²                                                         |
| Preset shimmer                         | 1 draw, 36 points → 0                    | 0 → 0                       | 9 m square side; aggregate 2,916 m² before projection                                          |
| Preset smoke / warm haze / glow lights | 0 → 0                                    | 0 → 0                       | Already disabled by carbonate/mission policy                                                   |
| **Site-effect total**                  | **27 draws / 1,408 points → 26 / 1,372** | **26 / 742 → identical**    | **Maximum sampled aggregate square area 4,113.37 → 1,197.37 m² High; Low 564.36 m² unchanged** |

No transparent mesh or `THREE.Sprite` objects occur in these props; the fixture rejects additions that would bypass its point census. Points are represented as square sprite footprints, not reported as mesh triangles.

Other shared sources were inspected but are outside the site-effect estimate: permanent marine snow retains its existing High 3,000 / Low 300 pool and 3 px size ceiling (all-points square-area ceiling 27,000 / 2,700 px²); life sparks retain High 260 / Low 48 slots and their shared shader, up to 72.9 px side before age fade. Headlight cones retain two transparent beam draws; High uses its existing 12 integration steps. Ocean/post and other shared effects remain unchanged. Lost City has no scheduled exploration event kind. None of these shared sources is claimed as measured by the site-effect table or included in its 140,000 limit; a whole-frame GPU cost is not established.

## Projected fill results

Each row reports the maximum summed square area across the three times. “Screen layers” is summed area / 921,600 viewport pixels, not the fraction of unique pixels covered. Peak local overlap is the independent maximum of outward-rounded square coverage.

| Tier / range | Before px-equivalents | After px-equivalents | Before → after screen layers | Peak local overlap before → after |
| ------------ | --------------------: | -------------------: | ---------------------------- | --------------------------------- |
| High / 70 m  |             65,438.79 |            27,867.67 | 0.0710 → 0.0302              | 33 → 32                           |
| High / 32 m  |            207,933.55 |           110,946.19 | 0.2256 → 0.1204              | 33 → 32                           |
| High / 10 m  |            209,886.15 |           132,796.92 | 0.2277 → 0.1441              | 27 → 26                           |
| Low / 70 m   |             10,430.16 |            10,430.16 | 0.0113 → 0.0113              | 20 → 20                           |
| Low / 32 m   |             42,124.96 |            42,124.96 | 0.0457 → 0.0457              | 15 → 15                           |
| Low / 10 m   |             64,347.67 |            64,347.67 | 0.0698 → 0.0698              | 14 → 14                           |

High's worst sampled total falls 36.7%; every paired sample falls by more than 35%. This supports removing the one redundant preset layer. It does not establish that this layer caused the owner's stutter or that remaining costs are acceptable on a phone.

## Enforced budget and Low invariance

The added High budget runs in ordinary unit tests, independently of diagnostic mode: at most **140,000 pixel-equivalents** (0.15191 viewport layers) per fixture sample. It also requires more than 35% improvement and strictly smaller peak overlap for every before/after pair. The original data exceeds 200,000, so reintroducing it fails the absolute limit. Explicit layer/count/footprint checks and a positive fill floor prevent an empty scene passing.

Low samples must equal the baseline in every returned field, including per-layer counts, projected fill, covered pixels and overlap. The three pre-change fill maxima are also fixed to four decimal places, preventing a shared change from silently moving both sides together. Fixed assertions retain its 350 plume points, 392 fringe points, 26 effect draws, 250.88 m² fringe footprint, no preset draw, 300 snow points and 3 px snow ceiling. Existing Low static prop budgets (1,200 calls / 1,200,000 triangles) and full-frame e2e budgets (1,500 calls / 1,500,000 triangles) are untouched. Static Lost City props remain 40 calls / 50,712 triangles Low and 40 / 205,828 High; these include both internal prop branches, not an actual frame.

## Checks

- Passed: typecheck; targeted five capability specs (`perf-budget`, `ventHazeBudget`, `presets`, `lostCityReadability`, `quality`), **150 tests**, including diagnostic High static census across the catalog. After adding the fixed Low maxima, both fill cases passed again (2 passed / 13 unrelated cases deselected); final typecheck, changed-file formatting and `git diff --check` passed.
- Gate run: `GATES_CONFIG_MODE=writable PW_PORT=4282 PW_OUTDIR=.cache/lostcity-dist bash tools/gates.sh` completed with **exit 1**. Actual e2e selection: **smoke + project-base**, not full-suite e2e. Logs: `.cache/runs/20261018-134929-3-PTtS0u/`.
- Passed gate checks: config, content validation, production build/typecheck, **3,226 unit tests across 192 files** (436.59 s), attribution and repository-wide Prettier. The project-base production build also succeeded.
- Tooling-test failure: Python finished **161/166 passed**. One failure is the golden comparison tooling case parsing empty CLI report output (`Unexpected end of JSON input`); root cause remains undiagnosed. A focused existing Node-test rerun also exited 1. This failure is separate from the confirmed environment blocks below.
- Environment blocks: the other four Python failures are CI-manifest cases reporting `spawnSync git EPERM`. Both gate browser selections (smoke and project-base) fail before assertions because the preview server cannot start. No tooling, assertion or timeout was changed to hide failures or obtain green gates.
- Targeted browser capability attempt: `GATES_CONFIG_MODE=writable PW_PORT=4283 PW_OUTDIR=.cache/lostcity-dist npm run test:e2e -- tests/e2e/f-perf-budget.spec.ts tests/e2e/presets.spec.ts tests/e2e/d2-camera.spec.ts --output=.cache/lostcity-capability-e2e`. Blocked before tests: preview cannot bind `127.0.0.1:4283` (`listen EPERM`), confirmed by running the same preview command directly.

## Review remaining

Readable/simple: retain the existing prop clear-fluid plumes and fringes, while removing overlapping preset work with one data value. Rewarding/honest: scanning, findings, factual content and event behavior are unchanged. Accessible/Low: deterministic Low workload equality is checked. Beauty, phone appearance, screenshots and journey acceptance remain Claude's responsibility. Owner must retest High at close approaches on the iPhone 17 Pro, collect real GPU/frame-time evidence, and judge whether this reduction is sufficient. No browser, visual or device-performance acceptance is claimed.
