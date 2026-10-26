# P2-lostcity-perf — High plume density cap

2026-10-26. Numeric follow-up to the owner's 2026-10-18 Lost City High stutter report (phone feedback row 11).

## Result and limitation

Implemented a carbonate plume budget in the existing `GeoDetail` tier table: **25/49/49 particles per emitter on Low/Medium/High**, replacing the carbonate builder's `round(70 × plume multiplier)` calculation. High now shares Medium's 49-point budget instead of using 70; Low and Medium retain their original counts. Other geology smoke/shimmer multipliers remain 0.35/0.7/1. No emitter, mouth fringe, material, solid geometry, camera, light or UI was changed. The shared carbonate builder consumes tier data directly, with no site branch, runtime cap mechanism or setting. No site-specific tuning was needed. High appearance still needs visual acceptance.

**Requested headless Chromium performance measurements remain outstanding.** The existing `tools/perf-budget.mjs` exits during Chromium launch with `sandbox_host_linux.cc:41 … Operation not permitted` / SIGTRAP. A local Vite probe also fails with `listen EPERM 127.0.0.1:4350`. The Browser skill's supported connection check returns `No browser is available`, with an empty browser list. The orchestrator subsequently ran the smoke and project-base browser gates successfully outside this sandbox; those passing checks do not supply the requested before/after performance benchmark. No rendered-frame draw counts, GPU timings, screenshots or phone performance are claimed below. The numbers are the existing deterministic static census and projected point-footprint estimate, run against this checkout before and after the cap.

## Measurement

Baseline is HEAD before this change, which **already disables the redundant preset shimmer**. It is not the historical shimmer-enabled baseline in `plan/progress/P2-lostcity-perf.md`.

Before editing, ran:

```sh
PERF_BUDGET_STATIC=1 npx vitest run tests/unit/perf-budget.test.ts \
  --configLoader runner --cache=false
```

Copied `.cache/perf-budget/{static,lost-city-fill-low,lost-city-fill-high}.json` into `.cache/lostcity-before/`. The `[1]` samples in the fill JSON describe current site data, while `[0]` reconstructs the historical shimmer-enabled regression. After editing, reran the same diagnostic plus `tests/unit/props-geo.test.ts`. After-change JSON remains in `.cache/perf-budget/`. The fixture now reconstructs the historical uncapped density for `[0]`, preserving the original shimmer regression assertions.

The existing fixture loads actual terrain heights, all 12 prop placements, seeded point buffers and production preset/mission overrides. At 1280×720, DPR 1, configured 62° FOV, it aims at Poseidon's 60 m orifice along the direction in `tools/lostcity-poses.json`, with horizontal ranges 70/32/10 m and a 6 m vertical offset. It samples animation times 0/5/10 s. Each row below reports the maximum across those times; overlap maxima are independent. These geometric views are not the free-dive opening or a pilot journey.

Footprints evaluate the clear-fluid vertex motion and sprite swelling on the CPU. Point squares are projected and clipped to the viewport, with a minimum 1 px footprint and no alpha, fog, soft-texture or depth/occlusion discount. All full prop branches remain present. Summed pixel-equivalents divided by 921,600 gives screen layers, not unique screen coverage. Peak overlap uses outward-rounded squares. These are approximate overdraw workloads, not measured fragment counts or GPU cost.

| Site effects / static props                  | High before |     High after |  Low before |    Low after |
| -------------------------------------------- | ----------: | -------------: | ----------: | -----------: |
| Clear-fluid plume emitters / draws           |          14 |             14 |          14 |           14 |
| Clear-fluid plume points                     |         980 |        **686** |         350 |      **350** |
| Mouth-fringe draws                           |          12 |             12 |          12 |           12 |
| Mouth-fringe points                          |         392 |            392 |         392 |          392 |
| Preset effect draws / points                 |       0 / 0 |          0 / 0 |       0 / 0 |        0 / 0 |
| Total site-effect draws / points             |  26 / 1,372 | **26 / 1,078** |    26 / 742 | **26 / 742** |
| Max summed sprite square area, m²            |    1,197.37 |     **871.42** |      564.36 |   **564.36** |
| All-prop static draws, both LOD branches     |          40 |             40 |          40 |           40 |
| All-prop static triangles, both LOD branches |     208,948 |        208,948 |      50,712 |       50,712 |
| Actual whole-frame rendered draws            | unavailable |    unavailable | unavailable |  unavailable |

Site-effect draws are included in the all-prop static census, not added to it. The latter includes both internal LOD branches, no frustum/occlusion discount, and excludes terrain, submarine, life, postprocessing and other shared effects. Marine snow stays High 3,000 / Low 300 points, outside the site-effect fill estimate. Life sparks and headlight beams are also outside that estimate. Lost City has no scheduled exploration-event kind.

| Tier / range | Before pixel-equivalents | After pixel-equivalents | Reduction | Before → after screen layers | Before → after peak overlap |
| ------------ | -----------------------: | ----------------------: | --------: | ---------------------------- | --------------------------- |
| High / 70 m  |                27,944.46 |           **18,777.46** |    32.80% | 0.030322 → 0.020375          | 34 → 24                     |
| High / 32 m  |               112,204.24 |           **73,204.35** |    34.76% | 0.121749 → 0.079432          | 31 → 23                     |
| High / 10 m  |               136,399.41 |          **117,280.19** |    14.02% | 0.148003 → 0.127257          | 23 → 18                     |
| Low / 70 m   |                10,427.55 |           **10,427.55** |        0% | 0.011315 → 0.011315          | 20 → 20                     |
| Low / 32 m   |                43,367.58 |           **43,367.58** |        0% | 0.047057 → 0.047057          | 18 → 18                     |
| Low / 10 m   |                66,410.31 |           **66,410.31** |        0% | 0.072060 → 0.072060          | 13 → 13                     |

The point-count reduction is exactly 30%; projected fill need not scale exactly because changing count redistributes seeded animation phases and the fixed 392 fringes remain. Every paired High sample improves by at least 10%; the worst sampled total improves by 14.02%. This supports the small density cap, but does not establish the cause of the owner's stutter or sufficient phone performance.

## Capability checks and simplicity

- `props-geo.test.ts`: production carbonate builders must retain three emitters containing 25/49/49 points on Low/Medium/High, including matching seed-buffer lengths. This fails if High's old density returns.
- `perf-budget.test.ts`: actual Lost City placement retains 14 plumes, 12 fringes and 392 fringe points. High is pinned to 686 plume points and a stricter **120,000** pixel-equivalent ceiling (previously 140,000); each paired sample must improve at least 10% against the uncapped plume-plus-fringe workload, excluding the historical preset shimmer.
- Original redundant-shimmer regression checks remain, including its >200,000 historical baseline, >35% paired reduction and strictly smaller peak overlap.
- Low's existing exact fill maxima and baseline equality assertions remain unchanged. A separate before/after JSON comparison also confirms every returned Low field is identical. The production change replaces carbonate count arithmetic with equivalent Low/Medium data and a smaller High budget, so Low's render construction is unchanged.
- No new runtime module, dependency, setting, UI element or site branch. One budget field in the existing tier table replaces carbonate count arithmetic; package history stays here. `docs/props.md` records the tier policy.

## Validation

- Baseline diagnostic: **30/30 tests passed**.
- Final diagnostic rerun of `perf-budget.test.ts`, `props-geo.test.ts` and `scarpTerrain.test.ts`: **128/128 passed** (87.57 s). This covers all three tier-cap cases, unchanged Low numeric assertions and all original scarp output-equivalence checks. Final before/after JSON comparison confirms Low is identical in every field and reproduces the tables above.
- Final local production build/typecheck passes, using the same temporary native Vite config bundle recipe as `tools/gates.sh` for read-only dependency trees. Changed-file formatting and `git diff --check` pass.
- **Orchestrator gate run outside the sandbox:** `tools/gates.sh`, logs `.cache/runs/20261026-070610-2230294-TPDF73/`, selecting **smoke + project-base** browser checks. Python, content, build, unit, e2e, e2e-base and attribution **all passed**. The full unit suite reports **4,247 passed, 4 expected failures across 192 files** (624.18 s). This supersedes the earlier sandbox gate's Python/browser environment failures and confirms the final carbonate-only implementation passes the original scarp assertions.
- The orchestrator run exited 1 solely because repository Prettier flagged `plan/OVERNIGHT-LOG.md`. Root cause: one trailing space at the end of the run 161 collection paragraph. Applied Prettier to that file; its diff removes only that trailing space. No source code, assertions, formatter configuration or gate selection changed in this follow-up.
- Final repository-wide `npx prettier --check .`: **passed**. No browser or unit rerun is needed for the whitespace-only correction and this evidence update; the orchestrator's passing checks above remain applicable. A fresh aggregate gate run after formatting has not been performed here.

## Remaining acceptance

Run the existing browser benchmark on the baseline and changed checkout in an environment that permits Chromium and a local server:

```sh
VITE_CACHE_DIR=.cache/vite-perf npx vite --host 127.0.0.1 \
  --port 4350 --strictPort --configLoader runner
PERF_SITES=lost-city PERF_TIERS=low,high node tools/perf-budget.mjs \
  http://127.0.0.1:4350/ .cache/lostcity-rendered
```

That benchmark reports full-frame draws, triangles and host-specific frame intervals for the opening. Close-approach GPU/phone capture and visual review are still required; the existing static fixture supplies the effect census and approximate overdraw evidence only. P2-lostcity-perf is therefore partially implemented and numerically verified, with browser/device acceptance outstanding.
