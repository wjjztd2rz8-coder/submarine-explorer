# V-bluehole-roof / S-verify — numeric verification

Merged source: `d4bbfcd1b348be051b9ae1eec1b4022ee0e06af7` (roof merge). Pre-roof reference: `3e478036`. No browser, screenshots or visual acceptance. The supplied art progress note is `V-bluehole-roof-4.md`; its captures were not used as numeric evidence.

## Confirmed defects and local repairs

All production changes are in `src/world/props/geo/stalactites.ts` and affect the hood only.

- The roof-rise collider helper expanded downward for negative rise but retained the old tops. At the wide cut, the rendered top was **5.813–5.871 m**, while collision still reached **9.960–10.083 m** (local coordinates). Broad triangle-normal contacts also found **one missed roof contact on Low and one on High**; the worst stable resolved roof clearance was **5.819682 m** for an **8 m** hull. High pendant clearance reached only **7.051026 m**.
- The hood now uses conservative boxes from clipped rendered roof and pendant triangles in 1 m horizontal cells. This includes all pendant surfaces rather than only the seven longest narrow proxies. Shared wall builders, the west gallery and the distant impostor retain their old output. This is a local collision repair, not a new collider type or physics system.
- `mergeAll` normalises rock parts by deleting their colour attributes. Consequently the shaft's merged buffer had **no `color` attribute**, losing its intended RGB fade. Merge its four compatible cylinders directly, retaining **260 vertices / 384 indexed triangles**, including the zero-intensity ends and **0.03** peak blue intensity.
- The transparent, double-sided shaft previously needed **2 renderer calls / 768 submitted triangles** despite the mesh census calling it one draw. `forceSinglePass` now gives **1 call / 384 submitted triangles**, with identical additive face contributions. Nested additive faces commute and do not write depth.

## Collision and gap numerics

Actual shipped heightmap, terrain carve, placement transforms and configured **8 m** hull; each reported clearance is measured independently against every rendered triangle of the tested mesh.

| Tier   | Roof contacts / misses | Pendant contacts / misses | Minimum roof / pendant clearance (m) | East collider count, including apron surface |
| ------ | ---------------------: | ------------------------: | -----------------------------------: | -------------------------------------------: |
| Low    |                242 / 0 |                   240 / 0 |                  8.000000 / 8.027182 |                                        2,878 |
| Medium |                242 / 0 |                   246 / 0 |                  8.000000 / 8.415656 |                                        2,910 |
| High   |                242 / 0 |                   244 / 0 |                  8.000000 / 8.217856 |                                        2,926 |

**1,456** roof/pendant contacts total; maximum movement on a repeated collision resolution **1.01e-14 m**. The capability asserts full hull clearance to **1e-4 m**, zero misses, and stability, beyond retaining the older shallow/deep roof guards (0.43 / 0.85 m maximum overlap).

At local `z=-14`, the two interior gap centres now have matching lowered collider tops:

| Tier   | Wide gap x=-6.72: mesh / collider top (m) | Narrow gap x=9.8: mesh / collider top (m) |
| ------ | ----------------------------------------: | ----------------------------------------: |
| Low    |                       5.870652 / 6.004375 |                       6.864963 / 6.928922 |
| Medium |                       5.834962 / 5.964171 |                       7.079199 / 7.153514 |
| High   |                       5.813150 / 6.027417 |                       6.372787 / 6.525273 |

Both are now within **0.215 m** of the rendered tops, versus up to **4.217 m** previously. Additional probes at `z=-8,-20` retain coverage. The third cut at `x=-22.4` meets the buried, pinched terrain/talus join; it is not a navigable hole. The authored gaps remain depressions of a closed roof, as the art note states.

The existing apron capability now samples twice as densely, raising its required contact count from >200 to >400 while retaining every clearance, stability and >10 clear-water-case assertion. Covering previously omitted rock reduced the number of clear poses in the old sparse sample; no clearance tolerance or open-water assertion was loosened. **6,027** shallow/deep/apron contacts and **131** unchanged clear-water poses pass across both galleries and all tiers. Worst apron clearance **7.999999992 m**; maximum residual volume penetration **2.76e-14 m**.

Tradeoff: the east hood now has roughly **2.9k** local collision volumes instead of its coarse proxy set. These cost CPU broad-phase checks, not draws or triangles. They remain conservative within each cell, particularly at the buried edge. This numeric pass does not establish phone frame time.

## Class B spawn and navigation

The survey minimum **-3,642.63 m**, with **300 m** margin, still selects **Class B**, rated to **-6,500 m**. Mission data also authors Class B. Free-dive Arcade, Realistic and Custom agree on each tier and clear prop keepouts with radius **12 m**. The first scan remains in range, aimed, and completable on desktop, portrait and landscape camera projections.

| Tier   | Free-dive position x / y / z (m)      | First target distance (m) | Hull bottom above ground (m) |
| ------ | ------------------------------------- | ------------------------: | ---------------------------: |
| Low    | -256.112372 / -61.605201 / -44.801940 |                 62.089134 |                    34.878890 |
| Medium | -256.121243 / -60.270004 / -44.801940 |                 62.081216 |                    35.145175 |
| High   | -256.080361 / -60.632955 / -44.801940 |                 62.117707 |                    34.540748 |

Yaw remains **-π/2**, chase Y offset **10 m**. These clearances match the earlier silhouette verification. All three existing Blue Hole mission-navigation cases pass: **150 m** opening range, first scan complete at **13.466667 s**, minimum simulated route clearance **12.000000 m**.

## Draw, triangle and transparent-pass budget

Conservative static census of all full props, including internal detail meshes, instances, material groups and transparent side passes; excludes terrain, submarine, life and post-processing. No frame-rate claim is inferred.

| Tier   | Actual prop calls | Submitted prop triangles | Shaft calls / triangles |
| ------ | ----------------: | -----------------------: | ----------------------: |
| Low    |                 7 |                   19,032 |                 1 / 384 |
| Medium |                 9 |                   90,800 |                 1 / 384 |
| High   |                 9 |                  142,248 |                 1 / 384 |

All three fit the **1,200 calls / 1,200,000 triangles** static prop guard (Low reserves another 300 / 300k for the rest of the frame). The existing `terrainMerge1140` **6→7 Low draw pin** is now also the actual renderer-pass count. Its **21,300 triangle ceiling is unchanged**; the pre-roof mesh total was **20,808**, versus **19,032** now. No Low-only shaft removal is numerically necessary under those geometry budgets. Director visual/phone acceptance remains separate.

The shaft is the site's sole transparent mesh. It uses `MeshBasicMaterial`, additive blending, depth testing on, depth writing off, default `renderOrder=0`, one material and no geometry groups. Three sorts it as **one transparent render-list item** by its transformed bounding-sphere centre, after opaque geometry. Local sphere centre is approximately **[-2.1, 2.49–2.55, -7.104108]**. It adds no light, shadow pass, render target or post pass. One-object sorting does not sort its nested triangles, which is sufficient for additive self-overlap; ordinary alpha effects still use normal object-level ordering.

CPU projection/clipping of all actual shaft triangles at **1280×720**, counting both visible face orientations and all four shells before opaque depth/fog rejection:

| Tier   | West free-dive opening | East 55 m view | East 42 m view | East 10 m stress view |
| ------ | ---------------------: | -------------: | -------------: | --------------------: |
| Low    |                   0 px |   40,644.95 px |   68,421.53 px |       1,021,312.32 px |
| Medium |                   0 px |   40,628.17 px |   68,385.60 px |       1,016,178.20 px |
| High   |                   0 px |   40,617.92 px |   68,363.68 px |       1,013,021.31 px |

The close stress view is **1.10–1.11 screen layers** of pre-depth triangle area. Existing performance specs now cap those east samples at **42k / 70k / 1.05M px**, preserve a nonblank lower bound and assert the one-pass material/depth settings. The uncullable shaft still submits its one draw in the west opening, where the triangles clip outside the view. Subpixel raster rules and real GPU time are outside this area estimate.

## Isolation and evidence

A headless catalog audit substituted only the archived pre-roof `stalactites.ts` while keeping all other dependencies current. All **147/147 non-Blue-Hole prop-tier records** across the other **12 sites** match exactly, including geometry/index buffers, instance transforms/colours, material values, bounds, colliders and counts. The west gallery's **3/3** records also match. Only the east hood's three records differ. Existing capability goldens likewise change only the east hood and the combined Blue Hole Low buffer hash; no non-Blue-Hole snapshot was re-baselined.

Raw evidence and runnable audit scripts are in `.cache/`: `bluehole-roof-collision-{before,}.json` (current file is `bluehole-roof-collision.json`), `bluehole-opening-measurements.json`, `verify-1000-missions.json`, `bluehole-geo-{before,after}.json`, `bluehole-geo-audit.ts`, `build-geo-audit.mjs`, and `perf-budget/{static,blue-hole-shaft-*}.json`. `bluehole-roof-provenance.json` binds source, manifest, tile and evidence SHA-256 hashes to the merge SHA. Repaired builder SHA-256: `64cac6cb229e1e86ab555baba8529d49b19af214c804ac8044adce6ba4b04ded`.

## Validation

- Production build and strict TypeScript: passed. The shared read-only `node_modules` prevents Vite's default temporary config write; bundling the unchanged build config into `.cache/` and loading it natively completes the full PWA-stamped build.
- Roof/apron collision capability: **10 passed**. Blue Hole shaft/static budget: **6 passed**. Existing Class B mission capability: **3 passed**, 12 unrelated site cases skipped by the filter. Geometry/Low-pin capability snapshot run: **96 passed**, four intended snapshots updated.
- Full unit suite: pending final result.
- Python tooling suite: **162 passed / 5 failed**. Four build-manifest provenance cases fail with `spawnSync git EPERM`; the golden CLI tooling case fails on subprocess JSON output in this restricted environment. These files are untouched.
- Browser/e2e intentionally not run, per the numeric-only request.

All new guards extend existing capability specs. No new spec, setting, system, site-ID branch, or package-number code comment was added.
