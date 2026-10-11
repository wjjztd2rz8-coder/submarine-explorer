# 1360 — Verify Blue Hole terraces, Titanic sky and Challenger boulders

Status: two geometry review rounds completed; two small defects fixed and one collision defect remains open. **Browser visual acceptance and phone captures remain blocked in this workspace.** No pre-existing assertion, snapshot, timeout or skip was removed or weakened.

## Plan and scope

1. Review merged 1280/1310 against the current tree, including the later Titanic haze change. Preserve current camera composition and the existing sky ceiling of 0.035.
2. Audit both Blue Hole galleries on actual GMRT terrain at Low/Ultra; inspect rendered apron triangles, rock seating and sub collision clearance.
3. Audit Challenger's loaded lander, spawn sphere and opening camera arm at 1600×900, 844×390 and 390×844. Compare Low geometry budgets before/after.
4. Check Titanic's interpolated dome colours across level/pitched views; propose any art change without applying it. Capture and visually review the scene matrix when browser execution is available.

## Round 1 — Findings

### Blue Hole

- The analytic terraced height and the actual interpolated apron triangles differ. On Ultra, one west-gallery rock was completely detached by **0.070 m**, and two east-gallery rocks were detached, with a maximum gap of **0.354 m**. These are minimum vertex-to-triangle-height gaps across each rock, using the actual placed gallery on GMRT terrain, rather than its bounding box. Evidence: `.cache/1360/geometry-before.json`.
- Low intentionally builds no `fallen-blocks` mesh in either gallery. No geometry/draws were added to Low.
- The terrace contact masks retain the original wall contact and buried outer rim; existing talus and gallery tests pass. This does **not** establish that the rendered join has no seam or z-fighting. Those verdicts require moving browser views.
- The original conservative apron colliders do not incorporate the terrace height function. A stronger second-round check confirms an unresolved defect: after `Props.collide` pushes out the actual 8 m collision sphere, it still intersects apron triangles at **37/107 west and 2/75 east contacts on Low**, and **228/694 west and 6/491 east on Ultra**. Collision returning `true` is insufficient. The audit compares the resolved sphere against **every rendered apron triangle**, with a 0.0001 m tolerance. This does not establish that all these overlaps were introduced by 1280; the conservative collider profile predates terraces.
- **Clearance is not accepted.** Correcting this requires the collision envelope to follow the rendered surface, or a surface-collision implementation, while preserving gallery navigation and framing. That is larger than the detached-rock seating correction and needs the blocked browser navigation checks. No speculative collider expansion was applied. The test records these overlaps as findings; it does not assert that the existing collision implementation fully clears the surface.

### Challenger

- Low's ten resident boulders clear the lander and opening. Ultra initially streams **929 boulders**, two of which intersect the actual lander triangles. Triangle-edge intersections in both directions confirmed the intersections after a bounding-box broad phase. The lander-centre sightline alone had missed them.
- Both tiers clear the spawn and complete straight chase camera arm, including desktop, landscape and portrait. This is geometry evidence for the authored opening arm, not every subsequent user-controlled orbit.
- The slope shadow's existing neutral-colour, continuity, near-floor exposure and upper-wall exposure assertions pass. Rendered readability remains pending.

### Titanic

- The current merged palette is `upperColor=0x182630`, `hazeColor=0x223743`, haze peak elevation **0.3**, fog lift **0.4**. This includes the later director-approved haze change; 1310's earlier 0.025 ceiling is not the current baseline.
- Numerical sampling of interpolated dome triangles, using the camera's real aspect-adjusted FOV, finds a gradient at level, +15° and +45° on desktop, landscape and portrait. The existing **0.035** luminance ceiling remains intact.
- At −15°, desktop/landscape samples at NDC y=0, 0.4 and 0.8 remain flat inside the fog-matched ring. Thus “not flat in every relevant pose” is **not confirmed**. These are background samples, without foreground occlusion, tone/post processing or a visual-readability judgment. See `.cache/1360/sky.json`.
- **Proposal only:** compare a broader, softer upper-water transition using the existing dome, retaining the exact fog-matched low ring, present fog lift and 0.035 ceiling. For example, trial a haze peak around 0.35–0.4 instead of 0.3 and review level, downward approach and upward phone views together. This cannot add contrast where the whole visible sky lies inside the fog-matched region; lowering that region would need a separate seam review. No sky tuning was applied.

## Small fixes

- `src/world/props/geo/stalactites.ts`: retain the apron grid dimensions and use the existing O(1) triangle sampler. After constructing each rock matrix, lower only detached rocks until their actual geometry touches the rendered apron. The apron, rock count, geometry, colours, random sequence and horizontal placement are unchanged.
- `src/world/scatter/Scatter.ts` and `src/app/systems/props.ts`: after Challenger's lander loads, reserve its actual transformed bounds for boulders. Filter overlapping boulder instances while gathering existing cells; do not regenerate cells or alter another scatter kind. No new material or draw is introduced. The conservative bounds remove the two intersecting Ultra boulders and can also reject a future non-intersecting boulder within the lander's bounding volume.

## Round 2 — Regression evidence

Added `tests/unit/verify1360.test.ts` and one additional Titanic sky test. All pre-existing assertions remain intact.

| Check                                                | Low               | Ultra                                  |
| ---------------------------------------------------- | ----------------- | -------------------------------------- |
| Gallery fallen blocks, west/east                     | 0 / 0             | 192 / 192, no detached rocks after fix |
| Sampled apron contacts, west/east                    | 107 / 75          | 694 / 491                              |
| Contacts missed by collision                         | 0 / 0             | 0 / 0                                  |
| Resolved spheres still intersecting apron, west/east | **37 / 2 — OPEN** | **228 / 6 — OPEN**                     |
| Challenger boulders after clearance                  | 10                | 927 (929 before)                       |
| Challenger scatter draws                             | 4 → 4             | 4 → 4                                  |
| Challenger scatter instances                         | 277 → 277         | 6528 → 6526                            |
| Challenger scatter triangles                         | **23340 → 23340** | 871820 → 871660                        |
| Minimum spawn-sphere / boulder-box gap               | 31.92 m           | 18.20 m                                |

The budget measurements are CPU-side submitted scatter geometry at the authored opening, not browser `renderer.info` counters. Every Low mesh's count, triangle count and instance matrices match before/after. Other scatter kinds' matrices and counts match at both tested tiers. Existing 1310 tests additionally retain the 2.6/1.1 size comparison and all-tier scatter budgets.

The camera arm has an exact segment-against-expanded-box clearance assertion of **1 m**; the nearest sampled arm distances are 30.83 m (Low) and 26.20 m (Ultra). Camera-eye distances are at least 36.03 m and 35.70 m respectively. After filtering, no boulder bounding box overlaps the lander on any of the three layouts. The 384 Ultra gallery rocks have maximum residual detachment below **0.000001 m** after Float32 matrix storage.

Evidence and logs are workspace-local in `.cache/1360/`, avoiding the existing `.cache/codex/shots` symlink to a different checkout.

## Validation

- Baseline targeted suite: **58 tests PASS**, `.cache/1360/focused-before.log`.
- Final audit and sky tests: **17 tests PASS**, `.cache/1360/audit-final.log`. These are regressions for the two fixes and measurements of the open issues, not blanket acceptance of sub clearance or rendered sky readability. The additional strict clearance probe correctly failed before being retained as an audit measurement: `.cache/1360/clearance.log`.
- TypeScript and production build: **PASS**, `.cache/1360/build-final.log`. Vite's default config cache is in read-only shared `node_modules`; bundling the unchanged config into `.cache/1360/vite.config.mjs` and using `--configLoader native` avoids that restriction.
- Python: **156 tests PASS**, `.cache/1360/python.log`.
- Strict content and attribution: **PASS**, `.cache/1360/content.log`, `.cache/1360/attribution.log`.
- Full unit suite: **181 files / 1,819 tests PASS** in 304.63 s, `.cache/1360/unit-full.log`. The final extended clearance measurements were subsequently checked in the focused audit run above.
- Full E2E: **BLOCKED before tests**, `.cache/1360/e2e.log`. Preview cannot bind localhost (`listen EPERM`).
- Golden capture attempt: **BLOCKED at Chromium launch**, `.cache/1360/capture-low.log`, `.cache/1360/browser-blocked.log`. Chromium exits at `sandbox_host_linux.cc:41`, `shutdown: Operation not permitted`. The generated contact-sheet directory contains a failure manifest, **no screenshots**.
- Browser skill bootstrap and troubleshooting were completed; the runtime reports no available browser, including an empty browser list. Neither that surface nor standalone Playwright can supply fresh captures here.

## Remaining browser acceptance

Do not mark this audit visually accepted until the following run is inspected in an environment that permits Vite and Chromium:

```bash
npm run build -- --outDir dist-1360
npm run preview -- --port 4360 --strictPort --outDir dist-1360
# In another terminal; great-blue-hole includes BOTH gallery heroes.
GOLDEN_SITES=great-blue-hole,titanic,challenger-deep GOLDEN_TIER=low \
  GOLDEN_LAYOUTS=desktop,landscape,portrait \
  node tools/golden-shots.mjs http://localhost:4360/
GOLDEN_SITES=great-blue-hole,titanic,challenger-deep GOLDEN_TIER=ultra \
  GOLDEN_LAYOUTS=desktop,landscape,portrait \
  node tools/golden-shots.mjs http://localhost:4360/
PW_PORT=4361 PW_OUTDIR=dist-1360 npm run test:e2e -- --output=test-results-1360
```

Persist the two generated `.cache/golden/<timestamp>/` folders under `.cache/1360/shots/{low,ultra}/`, including `poses.json`. Each run should contain **33 captures**: 3 west-gallery, 2 east-gallery, 3 Titanic and 3 Challenger poses at each of three layouts. The manifest records actual pose, quality tier and browser draw/triangle counts.

Inspect both gallery approaches/close views at Low/Ultra, especially 390×844, then move slowly across risers and along the wall join to check flicker, seams and physical hull clearance. Inspect Challenger's opening and approach on all layouts for lander/boulder separation and shadow readability. Inspect Titanic's opening, close/downward wreck approach, level cockpit, upward look and photo orbit; compare the proposed gradient only after capturing the current version. Static screenshots alone cannot exclude temporal z-fighting, and the golden set alone does not cover all these interactive poses.
