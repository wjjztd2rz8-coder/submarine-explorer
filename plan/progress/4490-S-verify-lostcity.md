# S-verify — Lost City towers numerics and performance budget

2026-10-26. Backlog S-verify / S-bughunt, item 4490. Read
`plan/DIRECTOR.md` first. Report only: no production code, tests, snapshots or
budget assertions changed. No push.

## Result

The tower merge reduces triangles, preserves finite unit normals and valid
triangles, keeps Poseidon's 60 m vent anchor and scan coverage, and preserves
the High plume cap from 4350. The Low fill-pin change is reproduced and comes
entirely from mouth-fringe placement on the changed solid surface. Its new
10 m ceiling has only **0.0150% headroom**.

**Collider qualification:** the existing coarse boxes cover the trunk axes,
but do **not** fully enclose the rendered trunks, before or after this merge.
Full surface enclosure cannot be certified. Details below distinguish this
existing approximation from a new regression; no collision redesign was made.

## Revisions and method

- Current: `56588911d3236f92540590e359619da374237b1b`.
- Visual merge: `77a2e0bf6fc220842596805c02cefbb43b45fa01`.
- Branch tip: `9a652b25`; geometry change: its parent `f00c7739`.
- Branch point / merge first parent: `c56bb0b36c614b4bc36a00705e1539e982f4856b`.
- Requested before baseline, the branch point's first parent:
  `fde5c15daa64949580415516b0ee27fe55c08873`.
- Cap implementation: `af39b79acf82ad88c9f1a531fd1a19dc3a6a05fe` (4350).

The branch point adds only the scarp collision fix and its tests/note; its
Lost City builder, placement, terrain and content are identical to the before
baseline. Tower production files and the budget test are unchanged between
the visual merge and current checkout. Thus neither `9a652b25^` (already
changed) nor an unpinned moving `HEAD~N` was used as the baseline.

Archived the before revision into `.cache/4490/before/`, using the same
installed dependencies. Both revisions built all 12 authored props at
Low/Medium/High with production `Props.placeAll`, actual heightmap terrain,
authored headings/scales, production seeds and local ground samplers. A scratch
Vitest harness captured individual trunk geometries through `tieredSpire`
without modifying source. It examined full and impostor buffers, normals,
triangle areas, transformed trunk vertices, collider coverage and plume seeds.
Existing capability specs independently audit buffers, instance transforms,
surface integrity, snapshots and budgets.

Evidence retained locally:

- `.cache/4490/audit.test.ts`: reproducible scratch harness; copy into
  `tests/unit/temporaryTowerAudit.test.ts` in either checkout to run it.
- `.cache/4490/audit.json` and
  `.cache/4490/before/.cache/4490/audit.json`: all 36 builds per revision.
- `.cache/4490/current-perf/` and
  `.cache/4490/before/.cache/perf-budget/`: existing diagnostic JSON outputs.
- `.cache/4490/manifest.json`: revision IDs and SHA-256 hashes of these files.

No captured images are used as evidence; this is a numerical audit.

## Mesh counts and bounds

Counts below are full-prop mesh triangles, including instanced solid life and
both internal mesh LOD branches, using the existing `countGeo` capability.
Point sprites do not contribute triangles. Impostors are separate and unchanged:
Poseidon **192**, each lone chimney **48** triangles, **720** total per tier.

| Prop              |    Low before → now |   Medium before → now |     High before → now |
| ----------------- | ------------------: | --------------------: | --------------------: |
| poseidon-tower    |     17,832 → 15,344 |       62,946 → 56,330 |       88,612 → 79,968 |
| beehive-chimney   |       2,160 → 2,160 |         4,528 → 4,528 |         6,648 → 6,648 |
| imax-tower        |       2,408 → 2,408 |         5,408 → 5,408 |         8,068 → 8,068 |
| unnamed-chimney-1 |       2,356 → 2,356 |         5,024 → 5,024 |         7,492 → 7,492 |
| unnamed-chimney-2 |       2,408 → 2,408 |         5,584 → 5,584 |         8,264 → 8,264 |
| far-spire-1       |       3,340 → 3,340 |         9,544 → 9,544 |       12,932 → 12,932 |
| far-spire-2       |       3,628 → 3,628 |       10,224 → 10,224 |       13,772 → 13,772 |
| far-spire-3       |       3,060 → 3,060 |         8,728 → 8,728 |       11,724 → 11,724 |
| far-spire-4       |       3,804 → 3,804 |       10,160 → 10,160 |       13,896 → 13,896 |
| far-spire-5       |       3,256 → 3,256 |         9,512 → 9,512 |       12,716 → 12,716 |
| far-spire-6       |       2,936 → 2,936 |         7,928 → 7,928 |       11,404 → 11,404 |
| far-spire-7       |       3,524 → 3,524 |         9,984 → 9,984 |       13,420 → 13,420 |
| Total             | **50,712 → 48,224** | **149,570 → 142,954** | **208,948 → 200,304** |

Every before/current build has **zero non-finite attribute values, zero zero-length
normals and zero zero-area triangles**. Current maximum unit-normal length error
is **4.845e-8**; smallest template triangle double-area is **4.134e-5 m²**.
The existing surface-integrity tests also verify non-singular instance matrices,
so instancing cannot collapse those valid triangles.

All solid bounds are finite and nonempty; all collider centres remain inside
them. The largest before/current solid-bound endpoint change across all builds
is **0.091530 m**. Below are current local solid-bound envelopes across the
three tiers, in metres; the JSON retains exact per-tier before/current boxes.
These include the buried foundation and decorative rock, not just trunk height.

| Prop              | X/Z interval | Y interval across tiers |
| ----------------- | ------------ | ----------------------- |
| poseidon-tower    | ±62.500      | −83.571 to 60.596       |
| beehive-chimney   | ±3.750       | −3.340 to 2.731         |
| imax-tower        | ±8.000       | −12.099 to 8.484        |
| unnamed-chimney-1 | ±6.000       | −7.115 to 6.471         |
| unnamed-chimney-2 | ±9.000       | −10.750 to 9.480        |
| far-spire-1       | ±38.000      | −38.069 to 38.595       |
| far-spire-2       | ±46.000      | −39.691 to 46.676       |
| far-spire-3       | ±28.000      | −110.010 to 30.069      |
| far-spire-4       | ±52.000      | −31.775 to 52.657       |
| far-spire-5       | ±34.000      | −21.691 to 34.546       |
| far-spire-6       | ±24.000      | −22.434 to 24.410       |
| far-spire-7       | ±42.000      | −32.167 to 42.518       |

Poseidon's exact current local Y maxima on Low/Medium/High are
**60.582077 / 60.586990 / 60.596329 m**, versus
**60.566265 / 60.576088 / 60.594044 m** before. `ventTop` remains exactly
**60 m** on every tier in both revisions.

## Collision and scan coverage

Poseidon retains **16** local boxes; each lone chimney retains **4**. Every
trunk axis is covered at 101 samples from base through tip, on every tier and
revision. Boxes remain finite and nonempty. They are not byte-identical:
`spireRadius` consumes the reduced ledge strength, moving some X/Z endpoints
by up to **0.427674 m**; box counts and vertical spans are preserved.

Literal surface enclosure fails in both revisions. For example, the main
Poseidon column on Low has **623/1,186** vertices outside its three trunk
boxes now, versus **582/1,186** before. Maximum distance to that box union is
**11.588 m** now versus **19.448 m** before. High is **12.806 m** now versus
**19.026 m** before. These figures isolate trunk geometry, excluding fingers,
flanges, rubble and the foundation. The builder explicitly uses three coarse
boxes with `0.85 × spireRadius(midpoint)`, rather than bounds of the deformed
surface, and does not rotate the boxes with subsidiary column lean. This is
an existing collision approximation; this audit does not establish full
enclosure or introduce a new collision policy. If literal enclosure is an
acceptance requirement, this remains an unmet requirement, rather than a pass.

The Poseidon POI remains at the same latitude/longitude, **775 m depth**, with
**150 m authored scan radius**. Its central vent still rises 60 m above the
terrain origin. Current base world Y on Low/Medium/High is
**−800.978268 / −801.681009 / −801.594608 m**. The POI lies 25.98–26.68 m
above the base and 33.32–34.02 m below the nominal tip. Every central-column
vertex lies within **34.461 / 33.738 / 33.874 m** of the POI, respectively.
This also fits the existing **80 m** mission radius before sensor/mode
resolution (`(220 − 60) / 2`), as well as the authored free-dive radius.
The three existing Lost City mission-approach cases pass on Low/Medium/High.

## Existing performance-budget test and headroom

Reproduced the existing diagnostic on both revisions:

```sh
PERF_BUDGET_STATIC=1 npx vitest run tests/unit/perf-budget.test.ts \
  --configLoader runner --cache=false
```

It uses production terrain/props/presets, a 1280×720 DPR-1 camera aimed along
the existing close-approach direction, ranges 70/32/10 m and animation times
0/5/10 s. Each row is the maximum summed sprite-square pixel-equivalent area
over those times. Headroom percentages use the ceiling as denominator.

| Tier / range |     Before |        Now |    Ceiling |    Remaining | Remaining % |
| ------------ | ---------: | ---------: | ---------: | -----------: | ----------: |
| Low / 70 m   |  10,427.55 |  10,428.69 |  10,433.66 |         4.97 |     0.0477% |
| Low / 32 m   |  43,367.58 |  44,027.34 |  44,317.49 |       290.15 |     0.6547% |
| Low / 10 m   |  66,410.31 |  67,089.93 |  67,100.00 |    **10.07** | **0.0150%** |
| High / 70 m  |  18,777.46 |  18,778.59 | 120,000.00 |   101,221.41 |    84.3512% |
| High / 32 m  |  73,204.35 |  73,958.07 | 120,000.00 |    46,041.93 |    38.3683% |
| High / 10 m  | 117,280.19 | 117,952.27 | 120,000.00 | **2,047.73** | **1.7064%** |

The Low 10 m ceiling rises **0.9866%**, from 66,444.4806 to 67,100; actual
fill rises **1.0234%** from the prior mesh. The 32 m sample rises **1.5213%**
but still fits its unchanged ceiling. All exact Low pins pass, as does the
Low paired-equality guard against the historical preset configuration.

The complete plume layer is **exactly equal** before/current in all nine
samples at each tested tier: pixel-equivalents, square area, point count and
draw count. Every captured plume anchor and seed hash also matches across
all three tiers. Only the fringe layer changes projected fill. At Low 10 m,
the peak sample's fringe area rises **22,062.61 → 22,742.23**, accounting for
the entire **679.62** increase. This justifies rebasing the deterministic
geometry-dependent Low pin with a narrowly increased ceiling; it does not
demonstrate additional phone frame-time capacity.

The static census stays at **40 calls** on all three tiers. Low's 48,224
triangles leave **1,151,776 triangles (95.98%)** below its 1,200,000 prop
ceiling; 40 calls leave **1,160 calls (96.67%)** below 1,200. High has 200,304
triangles and 40 calls, but this test has no High static geometry ceiling;
its asserted High headroom is the fill budget above. Static counts exclude
terrain, submarine, marine life and postprocessing. The browser opening test's
1,500 calls / 1.5M triangles are whole-frame Low limits, not interchangeable
with these prop totals. No rendered-frame or GPU timing was measured here.

## High plume cap remains intact

High still uses **49 points/emitter**, the Medium-equivalent limit introduced
by 4350, rather than the old 70. Actual Lost City census on High remains:

- **14 plume draws / 686 plume points**.
- **12 fringe draws / 392 fringe points**; fringe square area **250.88 m²**.
- **26 site-effect draws / 1,078 points**, no preset shimmer layer.
- Maximum summed sprite-square area **871.415868 m²**, unchanged before/current.

Low remains 25 points/emitter, 350 plume points and 742 total site-effect
points. The tier table and plume shader are unchanged since the cap commit.
The existing High test reconstructs 70-point emitters to isolate the cap's
benefit from historical shimmer removal: every current paired sample improves
by at least **10.8758%** over uncapped plumes plus fringes. The 120,000 ceiling,
original >35% redundant-shimmer reduction and smaller-overlap assertions pass.
The tower merge therefore preserves the cap while slightly increasing total
projected fringe fill; it does not preserve total fill byte-for-byte.

## Validation and scope

- Current existing specs: **142/142 passed** across `perf-budget`, `props-geo`,
  `lostCitySurface` and `terrainMerge1140` (120.08 s), with
  `PERF_BUDGET_STATIC=1 VENT_SURFACE_AUDIT=1` and the runner/cache flags above.
- Before baseline: existing `perf-budget` plus scratch audit **31/31 passed**
  (50.79 s).
- Final scratch geometry/scan audit: **1/1 passed per revision**, 36 builds
  each; final runs 24.35 s current / 24.50 s before.
- Existing `missionApproach.test.ts --testNamePattern lost-city`:
  **3 passed**, 45 other cases excluded by the explicit filter (21.26 s).
- No assertion, budget, snapshot, timeout, skip declaration or production file
  was edited. Scratch test removed from the tracked test tree after capture.
  Only this progress note is delivered. No visual acceptance or device
  performance claim; no push.
