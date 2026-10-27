# S-verify — Lost City surround and Monterey wall lift

2026-10-26. Non-visual, report-only verification for DIRECTOR's standing
S-verify item. **No reproduced production bug; no source, data, tests,
snapshots or budgets changed.** Read DIRECTOR first and followed its
simplicity rules. No push, browser capture or visual acceptance.

## Revisions and method

- Audited checkout: `b07636941296e7850c5769f6acd2ed5036ac4feb`.
- Lost City before: `4329b16ae59771809adcd1fa9b09522a993744d9`, the parent of
  production change `6b340d5c02cb431d7bcb55cd719c4fb17c0d5d6c`.
  Accepted endpoint: `db495bb016aa543716615d7bf389ce0de0c1e3dc`.
- Monterey before: `56588911d3236f92540590e359619da374237b1b`, the parent of
  production change `45328f7e7820623f50243d9a23423d0e891e4bf1`.
  Accepted endpoint: `37c5cbd91758c94c8e5dccb73abe8470975a68e9`.

Historical sources/data were extracted with `git archive` into ignored
`.cache/4510/before-surround/` and `before-wall/`; tracked files were never
replaced. The same scratch probe, `.cache/4510/probe.ts`, was bundled with
Vite against each source root. Results: `.cache/4510/{after,before-surround,
before-wall}.json`. It builds the actual shipped Lost City survey and props
on all three tiers, plus fixed flat/sloping builder fixtures, shipped scarp
definitions and all 13 synthetic biome fixtures. Before/after performance
JSON comes from each revision's existing `perf-budget.test.ts`, with
`PERF_BUDGET_STATIC=1`. Current copies are in `.cache/4510/after-perf/`.
These are deterministic CPU geometry/workload observations, not renderer
counters, GPU timings or phone measurements. Earlier visual-package shots
were not recaptured or certified by this audit.

## Lost City geometry and normals

Full solid prop triangles include instance multiplication; vertices count
resident mesh position entries, counting an instanced template once.
Points and separate distant impostors are excluded from this table. The
same totals occur on flat ground, the fixed `0.07x - 0.1z` slope, and actual
shipped terrain. There remain 12 props and 14 solid mesh draws on every tier.

| Tier   | Prop triangles before → after | Growth | Resident mesh vertices before → after |
| ------ | ----------------------------: | -----: | ------------------------------------: |
| Low    |               48,224 → 49,124 |  1.87% |                     138,068 → 140,768 |
| Medium |             142,954 → 146,994 |  2.83% |                     396,338 → 408,458 |
| High   |             200,304 → 206,428 |  3.06% |                     556,436 → 574,808 |

All triangle/vertex growth is in the two resized chimneys. The other ten
props retain their full mesh counts; their carbonate colours intentionally
change through the shared tower painter.

| Prop              | Low triangles / vertices before → after | Medium triangles / vertices before → after | High triangles / vertices before → after |
| ----------------- | --------------------------------------- | ------------------------------------------ | ---------------------------------------- |
| unnamed-chimney-1 | 2,356 / 7,068 → 2,708 / 8,124           | 5,024 / 15,072 → 6,560 / 19,680            | 7,492 / 22,476 → 10,420 / 31,260         |
| unnamed-chimney-2 | 2,408 / 7,224 → 2,956 / 8,868           | 5,584 / 16,752 → 8,088 / 24,264            | 8,264 / 24,792 → 11,460 / 34,380         |

| Tier   | Terrain chunks | Terrain vertices, unchanged | LOD-0 triangles, unchanged | Remaining against 4,000,000 terrain vertices |
| ------ | -------------: | --------------------------: | -------------------------: | -------------------------------------------: |
| Low    |             30 |                     124,296 |                    240,924 |                           3,875,704 (96.89%) |
| Medium |             90 |                     513,522 |                  1,004,112 |                           3,486,478 (87.16%) |
| High   |             90 |                     627,570 |                  1,229,904 |                           3,372,430 (84.31%) |

Low terrain positions/normals/cavity/index hashes are unchanged; all 30
colour buffers change. Medium/High change positions, normals and cavity in
the nine local-detail chunks as terraces flatten; all 90 colour buffers
change, with no active LOD-0 index changes. Topology/counts do not grow.

**No NaN or infinity** in any checked terrain or prop attributes. All current
solid/terrain normals have length within `1e-5` of one. Normal components
checked on Low/Medium/High: terrain **372,888 / 1,540,566 / 1,882,710**;
full props **422,304 / 1,225,374 / 1,724,424**. Existing vent-surface tests
also pass their full/impostor finite-attribute, index, transform and
nondegenerate-triangle assertions on all tiers.

## Chimney bounds, colliders and scans

The resized chimneys use the existing carbonate lone-chimney path; neither
has a scan POI. Height changes are **6 → 18 m** and **9 → 24 m**. Latitude/
longitude move to **30.1256, -42.1192** and **30.1242, -42.1205** respectively.
Both remain seabed-snapped, with four compound box colliders each.

| Prop              | Flat-ground X/Z bounds before → after | Flat-ground Y bounds before → after, across tiers  | Collider Y span before → after |
| ----------------- | ------------------------------------- | -------------------------------------------------- | ------------------------------ |
| unnamed-chimney-1 | ±6 → ±18 m                            | [-2.950, 6.306–6.471] → [-8.950, 18.301–18.467] m  | [-0.049, 6] → [0, 18] m        |
| unnamed-chimney-2 | ±9 → ±24 m                            | [-4.450, 9.461–9.480] → [-11.950, 24.500–24.508] m | [0, 9] → [0, 24] m             |

The bounds include the buried terrain-following skirt, whereas collision
uses a base box and three tapered trunk boxes. Every compound box fits
inside its solid bounds on both fixed ground fixtures, all tiers, before
and after. Collider tops follow the new authored heights, rather than
retaining the old 6/9 m dimensions. Rendered tip relief above collider tops
is 0.301–0.467 m and 0.500–0.508 m after, versus 0.306–0.471 m and
0.461–0.480 m before; this is the existing approximate collision convention.

On actual terrain, chimney-1 origin Y is **-738.214 / -737.393 / -737.212 m**
and chimney-2 **-847.817 / -848.796 / -848.779 m** (Low/Medium/High).
Their collider tops are origin +18/+24 m; rendered bounds reach
**-719.913 / -718.985 / -718.745 m** and
**-823.316 / -824.295 / -824.272 m**, respectively.

All four authored scan positions and radii are byte/equality unchanged
between probes: Poseidon **775 m / 150 m**, Beehive **758 m / 60 m**,
IMAX **787 m / 40 m**, biofilm **790 m / 80 m** (depth / authored radius;
effective mission/sensor ranges are resolved separately). Poseidon,
Beehive and IMAX retain their matching prop X/Z centres. The minimum exact
point-to-oriented-box distances across tiers from each moved chimney to
the target centres are:

| Moved prop        |  Poseidon |   Beehive |      IMAX |   Biofilm |
| ----------------- | --------: | --------: | --------: | --------: |
| unnamed-chimney-1 | 173.466 m | 116.981 m | 116.328 m | 175.918 m |
| unnamed-chimney-2 | 108.228 m | 159.633 m |  87.583 m | 120.186 m |

Neither moved chimney contains a target or contacts an 8 m hull placed at
one. Some scan spheres encompass rock, as before; these centres are markers,
not required hull destinations. The existing `missionApproach` Lost City
capability passes on all three tiers: the first primary retains a clear,
hull-safe approach, starts outside effective scan range, and remains visible
in desktop and phone camera models. This is not a completed pilot/scan journey.

## Performance-budget headroom

The conservative static census includes point draws and both internal LOD
branches, with no culling discount. It remains **40 calls** on all tiers;
Low's 1,200-call prop allowance has **1,160 calls (96.67%)** remaining.
Low's 1,200,000-triangle allowance has **1,150,876 (95.91%)** remaining;
the tighter historical vent allowance `50,712 × 1.1 = 55,783.2` has
**6,659.2 triangles (11.94%)** remaining. High solid geometry passes the
vent-surface 1,200,000-triangle guard with **993,572 (82.80%)** remaining;
the static catalog fixture itself only enforces triangle/call ceilings on Low.

The existing projected sprite-square workload uses actual terrain/placements,
1280×720, DPR 1, FOV 62°, Poseidon's outlet, horizontal ranges 70/32/10 m,
and times 0/5/10 s. Each entry is the maximum across times; overlap maxima
are independent. It includes no alpha/fog/depth discount and excludes other
scene effects, terrain, vehicles and life.

| Tier / range | Pixel-equivalents before → after | Current ceiling |           Remaining | Peak overlap before → after |
| ------------ | -------------------------------: | --------------: | ------------------: | --------------------------: |
| Low / 70 m   |            10,428.69 → 10,661.43 |          10,670 |       8.57 (0.080%) |                     21 → 21 |
| Low / 32 m   |            44,027.34 → 44,211.16 |          44,320 |     108.84 (0.246%) |                     18 → 18 |
| Low / 10 m   |            67,089.93 → 67,265.49 |          67,300 |      34.51 (0.051%) |                     16 → 16 |
| High / 70 m  |            18,778.59 → 19,077.52 |         120,000 | 100,922.48 (84.10%) |                     26 → 29 |
| High / 32 m  |            73,958.07 → 74,327.44 |         120,000 |  45,672.56 (38.06%) |                     23 → 27 |
| High / 10 m  |          117,952.27 → 117,989.91 |         120,000 |   2,010.09 (1.675%) |                     20 → 19 |

Plume budget stays **14 emitters / 350 Low or 686 High points**; fringes
stay **12 draws / 392 points**. Total site-effect draws stay 26, with
742/1,078 points. High's ceiling remains 120,000; its original density-cap
and redundant-shimmer regression comparisons pass. High's near-view headroom
is small; unchanged counts do not imply unchanged overlap or phone frame time.

**Evidence correction:** `V-lostcity-surround.md` says Low ceilings moved up
under 0.5%. The 70 m ceiling actually changes **10,433.658403 → 10,670
(+2.265%)**, whereas 32 m changes **44,317.485993 → 44,320 (+0.0057%)**
and 10 m **67,100 → 67,300 (+0.298%)**. The measured new 70 m workload
exceeds the previous ceiling by 227.77 pixel-equivalents. Current tests pass
the intentionally revised Low ceilings; this audit did not raise them.
This discrepancy is in the progress-note description, not a reproduced code
bug. High's plume budget was not raised.

## Monterey shared-material scope and snapshot status

The complete production diff is one value in `scarp.ts`'s
`PRESETS.canyon.glow.wall`: **[0.27, 0x8fc0c6, 0.4] →
[0.18, 0x8fc0c6, 0.4]**. The shared `glow(material, surface)` helper still
reads `P.glow[surface]` and calls the unchanged `vertexGlow` function.
There is no new site-ID branch. This is builder preset material data, not
a change to the generic material factory or vertex colours. Each
`geoMaterial()` invocation constructs its own material; texture reuse does
not share the emissive value between materials.

Catalog enumeration, including featureless `procedural:geo`'s fallback,
finds exactly four canyon-preset consumers: Monterey's **canyon-wall-ledge,
canyon-wall-east, canyon-wall-west, canyon-wall-far**. **No other shipped
site uses that preset.** On all tiers their only changed probe field is the
first (wall) material's emissive RGB, scaling exactly by 2/3, from
**[0.0741628743, 0.1423210839, 0.1524721065]** to
**[0.0494419162, 0.0948807226, 0.1016480710]**. Geometry/buffer hashes,
placements in the fixed fixture, bounds, collider boxes, counts, other
materials and shader cache keys are unchanged. Wall materials remain
opaque (`transparent=false`, `opacity=1`). Rubble lift stays 0.16.

| Related site        | Shared path                                        | Vertex-tint snapshot / paired status                                                                                                                      |
| ------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Monterey Canyon     | Canyon preset, all four walls                      | `montereySlopeTint` and terrain colour hashes unchanged Low/High; scarp tests change only canyon material hashes on Low/Medium/High                       |
| Hunga Tonga caldera | Same scarp builder and strata texture; tuff preset | No terrain vertex-tint colour attribute in fixture; terrain snapshot unchanged Low/High; full prop buffers/materials/bounds/colliders unchanged all tiers |
| Challenger Deep     | Same scarp builder; hadal preset, rock texture     | `challengerSlopeTint` and colour snapshot unchanged Low/High; full prop buffers/materials/bounds/colliders unchanged all tiers                            |

`beebeIsolation`'s unchanged Low/High cross-site snapshots pass for Titanic,
Bismarck, Endurance, Challenger, Axial, Hunga, Kamaehuakanaloa, Blake,
Blue Hole, Monterey and Hudson. Beebe's separate geometry-isolation snapshot
also passes; the scratch biome fixture additionally confirms Beebe unchanged.
Across all 13 biome comparisons, only Lost City's colour buffers differ
from the pre-wall revision, explained by the later surround change.
`db495bb0` rebaselines exactly Lost City's two Low/High colour hashes;
`37c5cbd9` rebaselines exactly the three canyon material digests in
`scarpTerrain`. No other site's vertex-tint snapshot was updated by either
package.

## Validation and limits

- Current targeted run: **249/249 tests, 10 files passed**, 98.72 s:
  `perf-budget`, `props-geo`, `scarpTerrain`, `beebeIsolation`,
  `terrainMerge1140`, `lostCityBiome`, `lostCitySurface`, `geo-colliders`,
  `terrain-detail`, `lostCityReadability`. Used `--configLoader runner
--cache=false --pool=threads`; diagnostics enabled for perf and vent surfaces.
  Log: `/tmp/4510-capability-threads.log`.
- Historical surround performance fixture: **30/30 passed**, 34.40 s.
  Log: `/tmp/4510-perf-before.log`. Its real pre-change expectations were
  retained; current expectations were not applied to old geometry.
- Lost City `missionApproach`: **3 passed / 45 unselected**, 11.39 s,
  using `--testNamePattern lost-city`. Log: `/tmp/4510-scan-approach.log`.
- `npm run typecheck`: **passed**, `/tmp/4510-typecheck.log`.
- `GATES_CONFIG_MODE=writable PW_OUTDIR=dist-4510 bash tools/gates.sh
--phase build`: Vite production bundling **completed** (301 modules),
  then the aggregate build gate **failed** when `ci-build-manifest.mjs`
  called `execFileSync('git', ['rev-parse', 'HEAD'])`: sandbox `EPERM`.
  Log: `/tmp/4510-build.log`; detailed run
  `.cache/runs/20261026-193623-3-NCsgIh/`. No manifest/gate success claimed.
  The first default-worker unit attempt stalled and was interrupted;
  the thread-worker run above completed successfully.
- Report formatting and `git diff --check` passed. Only this report is a
  deliverable; probes and extracted copies remain ignored scratch evidence.

No new regression assertion was needed: the existing capability specs cover
the changed bounds, finite geometry, scan approach, material isolation and
budgets. No renderer/device performance, screenshot quality, completed scan
journey, hosted CI, merge, tag or deployment is inferred from these checks.
