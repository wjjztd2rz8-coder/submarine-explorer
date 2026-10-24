# S-verify — Lost City foot numerical audit

Backlog **9, S-verify / S-bughunt [Codex, standing]**, specifically **S-verify**.
Non-visual audit; DONE V-lostcity-foot stays closed. Only this progress note is
changed. Existing tests, historical assertions, tint ceilings, tolerances,
budgets and every snapshot are preserved.

## Pinned range and ownership

- Checkout/current: `ccef32398e7eac7eee4719dc6f2740dadb103314`.
- Production change: `5411644f5b675ec876c2f1891afeda0acb243780`.
- Production parent: `0fb6691087c036d6fcda76ca7a94c589fe31bcf3`.
- Merge: `edf196afa0507ece325c76ece15a0b98c78d77c4`; first parent
  `5e0d131fc0bed0f09da6f47b324a9a6821d94da6`, second parent `5411644`.
  The two changed production modules are byte-identical between production
  parent and merge first parent, and between production change, merge and
  pinned checkout. No moving `HEAD~N` baseline.

Read DIRECTOR Backlog, simplicity rules and rubric; newest REVIEWS entry
(2026-10-23 evening); OVERNIGHT-LOG through runs 99–100; V-lostcity-foot and
V-lostcity-rim notes; 2890 height note/result; 2660 launched brief, result and
actual r1 evidence; S-verify-lostcity-beebe; launched 3540/3550/3560 briefs,
available results and finished 3540/3550 notes. 2660's requested progress note
is absent from this checkout; its retained r1 log records the actual rim audit
(4 scratch tests passed, unchanged Beebe, unchanged colliders, rim/fin errors
below 0.012 mm), while its result has only a wrapper gate summary. 2890's
wrapper says PASS but its note records local environment failures. Neither
predates-and-certifies this foot delta; no earlier verification of this exact
delta was found. The 3560 last-result file was empty at start.

Registered worktrees and status/diffs were checked before any tracked edit.
Finished/uncollected 3540 owns missionApproach; 3550 owns biomeFloorVariety and
lowSweepReadability; neither overlaps this slice's lostCityBiome/props-geo
ownership. 3510/3310, 3320, 3340, 3380, 3530 and 3570 retain their work;
2980/3050 and 3520 remain uncollected and untouched. Main has uncollected
PROCESS-LOG/resume tooling edits. V-challenger-ripples is also registered.
No ownership conflict; no patches from these trees were used.

## Consumer and guard map

`LostCityBands.lostCitySlopeTint` is used by Lost City's `TerrainBiome.vertexTint`.
Terrain bakes it into existing colour attributes after meshing; no other site
uses this function. Existing indices, LODs, collision sampling and normals are
not recomputed by the tint loop.

The **tower palette is shared**. `buildGeo` dispatches `carbonate-tower` to
`buildCarbonateTower`; the procedural chimney registry dispatches feature
chimneys through buildGeo, and unprofiled carbonate chimneys with no positive
width through `buildCarbonateChimney`, which calls the same builder with
`lone=true`. All shipped consumers are Lost City's **12** props: Poseidon,
Beehive, IMAX, unnamed-chimney-1/2 and far-spire-1 through -7. No other shipped
landmark uses that feature/material dispatch. Direct registry/fixture callers
also receive the shared change. Beebe's profiled crusted chimneys and Axial's
sulfide/geo props follow other builders. OLD, TROUGH, OCHRE and SEABED affect
all twelve merged rock colour buffers; this is not exclusive to Poseidon's
apron. The near-foot **count** branches on lone, but its **size** does not.

Existing durable coverage, all run unchanged:

- `lostCityBiome`: scatter/strata contracts; level-silt depth independence;
  sampled level channels **>0.7 and <1.3**, gentle-slope contrast >0.15,
  minimum >0.7 and mean >0.94; finite Float32 baked colours, colour/position
  alignment, material binding and Hudson control; all-tier root rays against
  the actual merged Poseidon rock on a slope, embed tolerance at four decimals,
  roots inside bounds, at most 54 colonies and exactly three mesh draws.
- `props-geo`: deterministic finite spires with frozen options and bounded
  geometry; registry routing, tower height and collider-centre containment;
  authored full/impostor buffer/material/placement snapshots; all-tier vent
  attributes, matrices, indices, nondegenerate triangles, bounds/colliders,
  mouth support and costs. Low Lost City stays below the historical
  **50,712 × 1.1 = 55,783.2** triangle allowance; general vent bounds remain
  **1,200 draws / 1,200,000 triangles**. Beebe material isolation is retained.
- `beebeIsolation`: all other biome terrain attributes/index/uniform/shader
  hashes (Low/High), plus all-tier Beebe geometry, placement, collision and
  anchor snapshot. The name is historical: an intentional Lost City tint
  change legitimately updates its Lost City colour entries.
- `terrainMerge1140`: mineral-threshold continuity <0.0001, finite tips and
  normals, unchanged scarp hashes; finite Low placed props, exact Lost City
  **14 mesh draws**, historical **67,472 triangle** ceiling and snapshot.
- `lostCitySurface`: full/lone buffers, repeatability, merged budget ceilings,
  outer-rubble slope seating/exclusion, rounded flange/rim structure and
  shared surface material lifecycle. `terrain-detail` and `terrainMemo1290`
  retain shipped finite/topology/budget, sampler and cache/isolation guards.
  `geo-colliders` and headless `lostCityReadability` also pass.

No materially missing structural/isolation contract or reproduced regression
requires a new durable assertion. **Added guards: none.** Repeating the
historical fixtures or freezing this palette in a second test would add churn.

## Deterministic terrain comparison

Scratch diagnostics use the actual production modules. A Vite pre-load hook
reads the two exact parent modules from `git show 5411644^:<path>`; all other
runtime code/data is the pinned checkout, not an uncollected worktree. The
paired detail probe loads that same parent module under an isolated module ID.
Tracked sources were never replaced; no second builder was added to tests.

Reused `makeSyntheticTile` (8 × 6 tilted survey), identical inputs on all three
tiers for Lost City and Monterey/Hudson/Beebe controls. All control attributes,
indices, stats and 15 height samples per tier are byte/equality unchanged.
Lost City changes **only colour**: position, normal, cavity and index hashes,
stats and samples are unchanged. Synthetic resident counts are **76 / 217 /
217 vertices**, **118 / 376 / 376 LOD-0 triangles**.

Also loaded the shipped **367 × 310 GMRT Float32 survey**, every resident
chunk and **all three LOD index buffers**, independently on each tier.
All attributes are finite and every LOD index is integral and in range.
Position, normal, cavity and all LOD index buffers are byte-identical
parent/current. Input height bytes, meta and resolved terrain config remain
unchanged after build/disposal; prop definitions/dimensions/config also remain
unchanged by every diagnostic build.

| Tier   | Chunks | Resident vertices | LOD-0 triangles | Height probes per version |
| ------ | -----: | ----------------: | --------------: | ------------------------: |
| Low    |     30 |           124,296 |         240,924 |                        37 |
| Medium |     90 |           513,522 |       1,004,112 |                        37 |
| High   |     90 |           627,570 |       1,229,904 |                        37 |

All counts are unchanged, within the existing **4,000,000** vertex ceiling.
High retains capped base subdivision 2 and nine local subdivision-8 chunks.
The 37 height points are 21 focus points: focus
(68.2472358820348, -966.0286616148973), X offsets
[-500,-250,-50,0,50,250,500]+0.123, Z offsets [-100,0,100]+0.789;
and 16 points at radii 650/775/900/1050 m and four cardinal angles, with the
same small offsets. Every parent/current sample is exactly equal (**222**
shipped queries total). These are height comparisons, not new ray-agreement
or seam acceptance claims.

Every baked colour component is accounted for by the authored channel factors
**[0.84, 0.97, 1.04]**. Maximum residual from multiplying parent Float32
colours by those factors is **1.1920928955078125e-7** across the entire shipped
survey; the direct 192-point tint field differs by at most
**2.220446049250313e-16** from the same equation. No unexplained topology or
collision change is accepted.

The existing **1.3** ceiling is a sampled level-silt assertion, not a global
colour clamp. It passes unchanged. Across all shipped vertices, parent/current
colour ranges are Low **[0.405081,1.734403] → [0.340268,1.782595]**, Medium
**[0.404884,1.737784] → [0.340103,1.779603]**, High
**[0.404427,1.727499] → [0.339718,1.796599]**. Values outside the sampled
0.7–1.3 interval already exist in the parent; their current changes follow
exactly from the factors. Extending that historical sampled ceiling into an
all-position clamp would invent an artistic contract, so none was added.
Prop colours remain finite (diagnostic overall range **0.004461–1.100000**).

2890's Low continuous-sampler/coarse-triangle discrepancy (up to 2.878808855 m)
and exact mixed-density boundary discrepancy (up to 0.161092108 m) are inherited
findings, not repaired or newly ray-audited here. The sampler modules are
unchanged, the mesh buffers are identical and all paired sample results agree.
No assertion that those historical discrepancies are absent is made.

## Tower costs and shared-consumer effects

Same shipped definitions, `hashString(def.id)`, resolved props config and local
ground **0.07x − 0.1z**, on both versions and every tier. Below, **T** counts
full mesh triangles including instance multiplication using existing countGeo;
**V** counts resident vertices in the merged solid rock mesh only. Arrows are
parent → current. Impostors and point effects are excluded from T/V.

| Variant           |    Low T |    Low V |        Medium T |          Medium V |          High T |            High V |
| ----------------- | -------: | -------: | --------------: | ----------------: | --------------: | ----------------: |
| poseidon-tower    | 17,832 = | 46,296 = | 59,986 → 62,946 | 145,902 → 154,782 | 85,492 → 88,612 | 210,468 → 219,828 |
| beehive-chimney   |  2,160 = |  6,480 = |         4,528 = |          13,584 = |         6,648 = |          19,944 = |
| imax-tower        |  2,408 = |  7,224 = |         5,408 = |          16,224 = |         8,068 = |          24,204 = |
| unnamed-chimney-1 |  2,356 = |  7,068 = |         5,024 = |          15,072 = |         7,492 = |          22,476 = |
| unnamed-chimney-2 |  2,408 = |  7,224 = |         5,584 = |          16,752 = |         8,264 = |          24,792 = |
| far-spire-1       |  3,340 = | 10,020 = |         9,544 = |          28,632 = |        12,932 = |          38,796 = |
| far-spire-2       |  3,628 = | 10,884 = |        10,224 = |          30,672 = |        13,772 = |          41,316 = |
| far-spire-3       |  3,060 = |  9,180 = |         8,728 = |          26,184 = |        11,724 = |          35,172 = |
| far-spire-4       |  3,804 = | 11,412 = |        10,160 = |          30,480 = |        13,896 = |          41,688 = |
| far-spire-5       |  3,256 = |  9,768 = |         9,512 = |          28,536 = |        12,716 = |          38,148 = |
| far-spire-6       |  2,936 = |  8,808 = |         7,928 = |          23,784 = |        11,404 = |          34,212 = |
| far-spire-7       |  3,524 = | 10,572 = |         9,984 = |          29,952 = |        13,420 = |          40,260 = |

`=` means parent and current are identical. All rock meshes are nonindexed;
position/normal/colour each use three Float32 components, **36 bytes per
resident rock vertex**. Poseidon therefore adds **8,880 vertices / 319,680
attribute bytes** on Medium and **9,360 / 336,960 bytes** on High. All other
variants keep the same buffer allocations. These are CPU allocations, not
GPU profiling or a rendered-frame performance claim.

| Tier   | All Lost City triangles | All rock vertices | Mesh draws | Geometry objects including Points |
| ------ | ----------------------: | ----------------: | ---------: | --------------------------------: |
| Low    |         50,712 → 50,712 | 144,936 → 144,936 |    14 → 14 |                           40 → 40 |
| Medium |       146,610 → 149,570 | 405,774 → 414,654 |    14 → 14 |                           40 → 40 |
| High   |       205,828 → 208,948 | 571,476 → 580,836 |    14 → 14 |                           40 → 40 |

Low cost growth is **0%**; Medium **2.018962%** and High **1.515829%** in this
full prop census. This preserves the existing Low allowances. The 40 objects
include point effects; 14 is countGeo's mesh convention, not a renderer draw
measurement. Unchanged draws do not mean unchanged triangle cost.

The scatter hook observes actual returned geometry without reimplementing it:
Medium requested near-foot blocks **54 → 101**, accepted **41 → 78**; High
requested **70 → 130**, accepted **55 → 94**. Each accepted detail-1 lump is
**80 triangles**, expanded on merge to **240 vertices**. Hence exactly
**37 × 80 = 2,960** and **39 × 80 = 3,120** added triangles. The request's
6× rejection-attempt cap explains counts below the authored requests. General
apron blocks remain **125 / 209**, and Low's `d.rubble=false` omits both calls.
Poseidon near-foot size changes **1.229408225 → 1.366009139 m**.

Unexpected relative to a Poseidon-only reading of the visual note: the shared
size expression also changes lone far-spire-2/4/7. Their requested/accepted
counts are unchanged; on Medium/High respectively:

| Lone variant |  Size parent → current, m | Changed merged vertices M / H | Maximum vertex displacement, m |
| ------------ | ------------------------: | ----------------------------: | -----------------------------: |
| far-spire-2  | 1.012677102 → 1.125196780 |                 1,680 / 1,920 |                    0.613001563 |
| far-spire-4  | 1.129242208 → 1.254713564 |                     480 / 720 |                    0.184806205 |
| far-spire-7  | 1.000000000 → 1.032355266 |                 1,680 / 1,920 |                    0.089345958 |

These are position **and normal** changes in existing rubble vertices, plus
all twelve variants' colour changes. The other lone sizes remain at the 1 m
floor, so their noncolour buffers are unchanged. Low is colour-only for all
variants. This is fully explained by the shared size expression, not a count,
collision or isolation failure. If the director intended strictly Poseidon-only
rubble sizing, the smallest proposed correction is to preserve the previous
0.09 factor for the existing `lone` branch and use 0.1 for the composite build;
that is an owner/visual scope decision, **not implemented or requested here**.
No new art work or Backlog item is started.

For **all 36 Lost City builds**, parent/current bounds, all collider boxes,
ventTop, impostor buffers/transforms and costs are exactly unchanged. Each
reported solid bounds box equals its actual merged geometry bounding box;
all collider centres remain contained. Poseidon has **16** colliders and
X/Z bounds **±62.5 m**; slope-fixture Y minimum **−40.575000763 m**, Y maxima
Low/Medium/High **60.566265106 / 60.576087952 / 60.594043732 m**, identical
before/after. These are existing coarse collision envelopes, not a claim that
every cosmetic rubble triangle gets a new collider.

Poseidon retains three mesh draws (rock plus two life batches). Sloping-fixture
coral/anemone instance counts are **6/4, 15/8, 24/9** on Low/Medium/High;
all instance matrices, instance colours, templates and effects are unchanged.
The separate existing, steeper root-support fixture passes on every tier
against the resulting actual rubble surface. Nine Beebe and eighteen Axial
site/tier control builds retain every captured attribute/index/instance,
bounds, collider, vent anchor, impostor and count unchanged. No other shared
consumer drift was found.

## Snapshot explanation and simplicity

Read-only diff of the original snapshot rebaseline is justified as follows:

- `props-geo`: **36** Lost City composite buffer hashes change (all twelve
  variants/all tiers), since they include colours. Only the two Poseidon
  Medium/High triangle totals change, **59,986 → 62,946** and
  **85,492 → 88,612**. Far-spire-2/4/7 also include the explained Medium/High
  position/normal changes. Placement hashes and vent anchors are unchanged;
  Beebe and other site entries are unchanged.
- `beebeIsolation`: exactly Lost City's Low/High **colour** hashes change;
  its position/normal/cavity/index, shader, uniforms and biome data hashes do
  not. All control-site evidence remains unchanged. Medium is covered by this
  diagnostic rather than extending that read-only snapshot.
- `terrainMerge1140`: only the Lost City Low composite buffer digest changes;
  **50,712 triangles / 14 mesh draws** stay identical. This is tower colour,
  not terrain or added Low rubble.

Two rounds: first mapped authority, ownership, guards and baseline; second
checked decomposed deltas, real survey, exact costs and minimal final scope.
No production/test/helper/snapshot/art/data/UI/settings/layout/shader change,
new site branch, dependency, policy or runtime abstraction. Clean evidence
needs only this note. Core GMRT data, all 13 identities, five heroes, scan,
Journal, marine life, keyboard/pad/touch, accessibility and Arcade default are
untouched. Rubric evidence is numerical correctness, honest provenance and
retained Low resource contracts. Beauty, readability, layout, rewarding visual
presentation and real-phone acceptance remain with Claude/owner.

## Validation and limits

Focused unchanged capabilities, **PASS**, exit **0**, **9 files / 214 tests**,
**173.62 s**, log `/tmp/3560-focused.log`:

```bash
npm test -- tests/unit/lostCityBiome.test.ts tests/unit/props-geo.test.ts tests/unit/beebeIsolation.test.ts tests/unit/terrainMerge1140.test.ts tests/unit/lostCitySurface.test.ts tests/unit/lostCityReadability.test.ts tests/unit/geo-colliders.test.ts tests/unit/terrain-detail.test.ts tests/unit/terrainMemo1290.test.ts --configLoader runner --cache=false --pool=threads --maxWorkers=1
```

Isolated diagnostics, retained in ignored `.cache/3560/` (not durable tests):

```bash
AUDIT_VERSION=parent npm test -- --config .cache/3560/audit.config.ts --configLoader runner --cache=false
AUDIT_VERSION=current npm test -- --config .cache/3560/audit.config.ts --configLoader runner --cache=false
python3 .cache/3560/compare.py
npm test -- --config .cache/3560/detail.config.ts --configLoader runner --cache=false
AUDIT_VERSION=parent npm test -- --config .cache/3560/shipped.config.ts --configLoader runner --cache=false
AUDIT_VERSION=current npm test -- --config .cache/3560/shipped.config.ts --configLoader runner --cache=false
python3 .cache/3560/shipped-compare.py
```

The first scratch parent invocation exited **1**: **6 passed / 1 failed**,
**13.27 s**, because the single synchronous all-sites High prop diagnostic
completed in **6,564 ms**, exceeding the scratch config's omitted/default
**5,000 ms** limit. It nevertheless completed every build and wrote the full
parent JSON before Vitest reported the elapsed-time failure. **That invocation
is not a pass and was not retried.** The current measurement split independent
sites into separate diagnostic cases (same data and measurements), **13 passed**,
exit **0**, **13.24 s**. Both complete data key sets agree; comparison assertions
pass, exit **0**. Logs `/tmp/3560-{parent,current,compare}.log`.

The later paired per-variant decomposition independently builds parent/current
for every shipped Lost City prop/tier: **37 passed**, exit **0**, **19.01 s**,
`/tmp/3560-detail.log`, `.cache/3560/detail.json`. All finite/immutability
checks from the first diagnostic are also exercised by the successful current
run; the paired probe independently checks parent/current solid bounds and
collider-centre containment. No existing test timeout, retry or skip changed.
The shipped-survey probe inherits the repository's existing Vitest config,
including its existing timeout: **4 passed per version**, exit **0**, **6.04 /
5.65 s**, logs `/tmp/3560-shipped-{parent,current}.log`. Shipped comparison
assertions **PASS**, exit **0**, `/tmp/3560-shipped-compare.log`.

Required aggregate invocation:

```bash
GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e
```

Log `/tmp/3560-gates.log`; detailed directory
`.cache/runs/20261023-191853-3-qaIcT4/`.
Read-only controls were compared byte-for-byte with `git show HEAD:<path>`:
LostCityBands, towers, both owned specs and all three affected snapshots are
unchanged. No tracked production, data, tools, snapshot or other package file
was edited. The four expected-failure collision cases remain untouched.
Actual local **e2e mode: none**. No renderer, browser, screenshots, visual
acceptance, GPU compilation/rendering/performance, hosted CI, journey or phone
validation was run or inferred. CPU mesh counts and string-based shader tests
cannot establish those outcomes. No merge, push, tag or workflow dispatch.
