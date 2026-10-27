# S-verify — carbonate talus merge delta

2026-10-27. Item **S-verify**, DIRECTOR Backlog 9; report-only numerical
verification of V-lostcity-talus. Read DIRECTOR's simplicity rules and rubric,
V-lostcity-talus, 4490 and 4510 before diagnostics. No overlapping result for
this exact merge was found in the available progress notes, director, review
or overnight log. The earlier verifications predate this delta.

## Result

No reproduced production regression in the affected existing contracts.
**Two descriptions in V-lostcity-talus need qualification:**

- Low has no rubble and retains its geometry, but **is repainted** on all 12
  shipped carbonate props. It is not wholly untouched.
- The changed digests are **not all colour-only**. Medium and High change
  near-foot block positions and normals on Poseidon and far-spires 1–5 and 7.
  The remaining five variants retain geometry because the size expression
  still clamps to 1. One existing Poseidon coral instance also rises to the
  changed rubble surface on each detailed tier.

Counts, topology, materials, bounds, colliders, vent anchors and impostors
remain unchanged. All shipped consumers are at Lost City; no unexplained
outside-site effect was found. No pin, ceiling or snapshot was changed.
The smallest correction for the director is to qualify the evidence wording
as above; these observations do not request reopening the DONE visual item.

## Pinned comparison and scope

| Role                                              | Full SHA                                   |
| ------------------------------------------------- | ------------------------------------------ |
| Audited checkout HEAD                             | `21977437524393c93ee712c974c370e8993ded71` |
| Comparison base: merge first parent, `5cb25a70^1` | `66abbb4dd6c046c2e587ca9059d740f9d845a55e` |
| Comparison head: accepted visual merge            | `5cb25a70222d7c8b79fd18a9d6402ac418e29374` |
| Merge second parent / visual branch tip           | `71cef6d7ab31ac97978ef76d149a4dcebcdd4920` |
| Production size/paint change                      | `f0973c0866c060d951c05ba5301f7073ea685a71` |

The merge changes only towers.ts, its visual progress note and the two named
snapshot files. Relative to the merge, checkout source changes are confined
to `src/core/config/ui.ts`, `src/styles/globe.css` and `src/ui/Globe.ts`.
Tower/prop/terrain code, authored data and the four capability specs used
below, including their snapshots, are unchanged. Historical sources and
fixtures were extracted into `/tmp/4720/{parent,merge}` with `git archive`;
the tracked checkout was never replaced. Both use the same installed dependencies.

4490 establishes the older tower reduction and existing coarse trunk-box
approximation. 4510 establishes the later surround/resized-chimney state:
49,124 / 146,994 / 206,428 full solid triangles. Those are already the
**parent** costs here; their earlier growth is not attributed to this merge.
No earlier broad seed, eviction, tint, scan-journey or plume-fill audit was repeated.

## Guards mapped before diagnostics

| Existing capability                            | Relevant protection and boundary                                                                                                                                                                                                                        |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `props-geo` authored geometry golden           | All 12 authored Lost City props on Low/Medium/High, fixed `0.07x - 0.1z` ground; mesh attributes, indices, instance transforms/colours, material fields, bounds/colliders, ventTop and counts. Its buffer digest includes more than vertex colours.     |
| `props-geo` vent surface integrity             | Full/impostor finite attributes, transforms and instance matrices, valid indices, nondegenerate triangles, finite nonempty boxes and solid budgets. The generic tower contract checks collider **centres** inside bounds, not rendered trunk enclosure. |
| `props-geo` plume capability                   | Existing 25/49/49 carbonate points per emitter; unchanged by this delta.                                                                                                                                                                                |
| `lostCitySurface`                              | UV-free painted tower/lone-chimney buffers, material/shader tier behavior, deterministic buffers and merged budgets; Low skips rubble; detailed tiers retain two scatters, outer rubble seating, lone exclusion and build-plane edge rejection.         |
| `terrainMerge1140`                             | Mineral-blend continuity and finite tips; production `Props.placeAll` with flat terrain; Lost City Low exact 14 solid draws, 67,472 triangle ceiling and aggregate digest. Other included site cases retain their own guards.                           |
| `perf-budget`, filtered static Lost City cases | Production placements on flat terrain; conservative all-prop census, including point draws and both internal LOD branches. Low ceilings: 1,200 calls / 1,200,000 triangles.                                                                             |

The merge replaces **36 individual `buffers` strings** in props-geo (12 props
× 3 tiers), with no placement, anchor or budget changes, and **one** Low
aggregate string in terrainMerge1140. Thus “four digests” describes four
snapshot cases, not four literal hashes. The aggregate changes
`554ddbe25ac7ed6d82a8083605389fea5394ed1b94664e831eeb8721a6f4bef0`
→ `ddf966f89443cf9f3e15d0b142c73ccd5985aa2c85178f1377e4dbf932c766a5`.

## Attribute decomposition

The scratch observation harness calls the actual registry builders with
`hashString(def.id)`, authored dimensions and each tier. It wraps the existing
`scatterRubble` to record options, accepted block counts and surface crossing;
it does not reconstruct a builder. It records every full/impostor geometry
attribute, index, instance matrix/colour, material signature and local boxes.

Each revision has 36 builds on the snapshot's fixed slope and 36 on shipped
Lost City terrain. The latter uses production `Terrain` loaded from
`heightmap.bin` and the existing `Props.debrisHeightFn` local sampler, including
authored heading/scale. It is a direct builder observation using that production
sampler, not a new placement implementation or a rendered scene.

The following table gives **parent → merge** full solid totals. Resident
vertices count an instanced template once; triangles multiply by instance
count. Points and separate distant impostors are excluded.

| Tier   |         Triangles | Resident vertices | Solid mesh draws | Changed position entries | Changed normal entries | Changed colour entries, slope / terrain |
| ------ | ----------------: | ----------------: | ---------------: | -----------------------: | ---------------------: | --------------------------------------: |
| Low    |   49,124 → 49,124 | 140,768 → 140,768 |          14 → 14 |                        0 |                      0 |                       102,748 / 102,544 |
| Medium | 146,994 → 146,994 | 408,458 → 408,458 |          14 → 14 |                   26,880 |                 26,880 |                       331,837 / 331,706 |
| High   | 206,428 → 206,428 | 574,808 → 574,808 |          14 → 14 |                   32,640 |                 32,640 |                       458,085 / 457,583 |

An entry is one attribute tuple with at least one unequal Float32 component,
not a unique welded vertex. Position/normal counts are the same on both ground
fixtures. All attribute lengths and index buffers remain identical; no topology,
instance-count or draw-count growth occurred. All 36 variants/tier builds change
rock colours. Maximum absolute RGB component delta is 0.257830 / 0.412236 /
0.412236 on the slope, and 0.243701 / 0.407689 / 0.443176 on terrain (L/M/H).
These are linear vertex-buffer values, not displayed pixel brightness.

### Which sizes and geometry actually change

Sizes below are the near-foot scatter's `size` option, identical across Medium
and High and independent of the ground sampler. Low never calls either scatter.
The formula is `max(1, main.r0 × multiplier)`; the multiplier change does not
make every shipped block 50% larger because of that floor.

| Variant           | Size, parent → merge (m) | Changed position/normal tuples Medium / High | Accepted near-foot blocks Medium / High, unchanged |
| ----------------- | -----------------------: | -------------------------------------------: | -------------------------------------------------: |
| poseidon-tower    |      1.366009 → 2.049014 |                              18,720 / 22,560 |                                            78 / 94 |
| beehive-chimney   |                    1 → 1 |                                        0 / 0 |                                              6 / 7 |
| imax-tower        |                    1 → 1 |                                        0 / 0 |                                             9 / 12 |
| unnamed-chimney-1 |                    1 → 1 |                                        0 / 0 |                                             6 / 10 |
| unnamed-chimney-2 |                    1 → 1 |                                        0 / 0 |                                              5 / 5 |
| far-spire-1       |             1 → 1.428909 |                                1,680 / 2,160 |                                              7 / 9 |
| far-spire-2       |      1.125197 → 1.687795 |                                1,680 / 1,920 |                                              7 / 8 |
| far-spire-3       |             1 → 1.074742 |                                  720 / 1,200 |                                              3 / 5 |
| far-spire-4       |      1.254714 → 1.882070 |                                    480 / 720 |                                              2 / 3 |
| far-spire-5       |             1 → 1.287629 |                                1,920 / 2,160 |                                              8 / 9 |
| far-spire-6       |                    1 → 1 |                                        0 / 0 |                                              3 / 5 |
| far-spire-7       |      1.032355 → 1.548533 |                                1,680 / 1,920 |                                              7 / 8 |

Each accepted detailed-tier block contributes 240 position entries. The changed
entries account exactly for the blocks of the seven variants whose size option
changes. The apron-wide scatter, skirt and trunk geometry retain their buffers.
Normals also change because scatter size affects the slope sampling interval
`max(0.4, r × 0.7)` and hence block tilt. Maximum corresponding vertex displacement
is **3.097769 m** on the fixed slope, **3.055070 / 3.054235 m** on shipped
Medium/High terrain, at far-spire-2. Unchanged triangle counts alone could not
establish unchanged geometry.

Poseidon's `poseidon-base-corals` instance 0 changes only matrix entry 13
(Y translation): **+2.158539 / +2.222032 m** on the slope and
**+3.090703 / +3.185512 m** on terrain (Medium/High). Its instance count remains
15/24. Production already raycasts the merged rock to seat these roots; this
is an explained consequence of larger rubble. The coral template, rotation,
scale, X/Z, instance colour and all anemone matrices stay equal. Low's instance
matrices stay equal. No other full/impostor buffers or mesh transforms change
apart from rock position/normal/colour and these two coral matrices. Recorded
material fields and shader cache keys remain equal.

A concrete counterexample to “Low untouched” is beehive-chimney on the snapshot
slope: **4,056 colour tuples change**, maximum component difference **0.245245**,
while all positions, normals, counts, boxes and other fields remain equal.
Its props-geo buffer digest changes
`8b1c2ddb2cd691b611fc2b5a1cd0ba52868fadbf9b9b29b1f85aed3602e5ed5f`
→ `a3349a7e2946de4a91de70cc1110221330596d38f70bfc89ca555e3fbb4f81d0`.
The shared paint callback runs after the rubble conditional on every tier.

## Shipped consumer scope and affected contracts

Traced production imports and registry routing, then enumerated every available
`data/landmarks/*/props.json` through `parsePropsDoc`, applying the registry's
feature/material/dimension and manifest routing precedence. Exactly **12** shipped
entries reach this family, all at Lost City:

- Poseidon: `procedural:chimney`, `feature: carbonate-tower` → `buildGeo` →
  `buildCarbonateTower(input, false)`.
- The other 11 IDs in the size table: no feature, carbonate material and no
  positive authored base width → `buildCarbonateChimney` →
  `buildCarbonateTower(input, true)`. The wrapper supplies width/depth
  `max(6, 1.6 × max(1, authored height))`.

`procedural:geo` can also select the carbonate feature; none of the shipped
entries does. A positive-width carbonate chimney instead uses the ordinary
placed-chimney path, while an explicit chimney manifest takes precedence over
the carbonate fallback. No shipped entry outside Lost City selects either tower
path. The pale paint and qualifying lone-tower block changes are therefore
explained shared-family effects within Lost City. No new site branch, shared
helper, material factory or authored-data change is involved.

For both revisions and both ground fixtures:

- **Zero non-finite values** in full/impostor geometry attributes, instance
  matrices or instance colours. Existing surface-integrity checks additionally
  pass valid-index, invertible-transform and nondegenerate-triangle assertions.
- All 36 local bounds and collider arrays are **exactly equal** parent/current,
  finite and nonempty. Poseidon retains 16 boxes; each lone tower retains 4
  (60 boxes per tier). Every collider centre remains inside its solid bounds.
- Impostor attributes, indices, transforms and materials are equal: Poseidon
  192 triangles, each lone 48; **720 triangles / 12 meshes per tier**.
  `ventTop` and all point-buffer/point-transform data are equal. No new plume
  fill estimate or phone-performance conclusion is needed from this delta.
- The detailed-tier near-foot scatter retains **141 / 175 accepted blocks**
  in total; the apron-wide scatter retains **398 / 510**. Every sampled block
  has vertices below and above its supplied analytic placement surface, before
  and after, on both fixtures. This checks partial embedding, not complete
  support at every rendered terrain triangle. The existing outer-rubble,
  lone-exclusion and build-plane contracts pass unchanged.

The coarse boxes intentionally omit decorative rubble. Unchanged collision
cannot certify enclosure of the enlarged decorative blocks; no such enclosure
assertion exists here. **4490's pre-existing trunk-enclosure limitation remains
an existing approximation, not a new defect.** No trunk-enclosure audit or
collision redesign was repeated.

## Existing budget headroom

Parent/current counts are equal. The filtered static capability independently
reports **40 calls** on all tiers, including the 26 existing point draws.
Solid mesh capability reports 14 draws. Neither measure is a browser frame or
GPU timing, and neither includes terrain, vehicles, roaming life or postprocessing.

| Guard                                  | Current |    Existing ceiling/pin |                               Remaining |
| -------------------------------------- | ------: | ----------------------: | --------------------------------------: |
| Low static prop calls                  |      40 |                   1,200 |                          1,160 (96.67%) |
| Low static/solid triangles             |  49,124 |               1,200,000 |                      1,150,876 (95.91%) |
| Medium solid triangles, vent integrity | 146,994 |               1,200,000 |                      1,053,006 (87.75%) |
| High solid triangles, vent integrity   | 206,428 |               1,200,000 |                        993,572 (82.80%) |
| Low historical vent triangle allowance |  49,124 | 50,712 × 1.1 = 55,783.2 |                        6,659.2 (11.94%) |
| Low terrainMerge1140 triangles         |  49,124 |                  67,472 |                         18,348 (27.19%) |
| Low terrainMerge1140 solid draws       |      14 |                exact 14 | Exact pin retained; no growth allowance |
| Solid draws, vent integrity, each tier |      14 |                   1,200 |                          1,186 (98.83%) |

The static catalog test does not assert Medium/High Lost City ceilings; their
1,200,000 triangle guard above belongs to vent surface integrity. The existing
Low/Medium/High deterministic surface fixture ceilings (30k/85k/120k rock
triangles) also pass. No performance allowance was increased. Projected-fill
headroom in 4490/4510 is historical evidence, not a newly measured result here.

## Golden evidence provenance

Neither cited capture directory exists in this checkout or in the shared
`/home/vijay/submarine-explorer` checkout's golden cache. No matching metadata
or manifest was found there. No image was loaded, rendered or judged.

| V-lostcity-talus citation                                              | Capture manifest / served SHA / actual poses                        |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `.cache/golden/2026-10-27-124334/lost-city-1.png` (before)             | **Unavailable**; image and sibling `poses.json` absent              |
| `.cache/golden/2026-10-27-124600/lost-city-1.png` (after; also -2, -3) | **Unavailable** for all cited images; directory and manifest absent |

The timestamp and progress note do not bind either capture to a build SHA,
dirty flag, tier, layout or camera pose. In particular, the before capture
cannot be assumed to be the merge parent and the after capture cannot be
assumed to be the accepted merge. No visual rating is certified by this audit.

The available authored `tools/lostcity-poses.json` is unchanged at base, merge
and checkout: Git blob **`f357d84e1dc4ed5fed38d5073ebae266cb34b6da`**, SHA-256
**`0bdfaea6c01eade2a32da4aa47ef89acba06c308d648e9118b2669dd8d25290c`**.
It records Poseidon target `[0,56,0]`, direction
`[0.7071067811865476,0,0.7071067811865476]`, approach range 70 m / above 38 m,
and close range 32 m / above 66 m. This binds the **authored pose file** to the
comparison trees; without the capture manifests it does not establish the
recorded screenshot poses, spawn pose or served build. Provenance remains unavailable.

## Commands, results and retained scratch evidence

Read-only comparison and routing searches included:

```sh
git rev-parse HEAD 5cb25a70^1 5cb25a70 5cb25a70^2
git diff 5cb25a70^1 5cb25a70 -- src/world/props/geo/towers.ts tests/unit/__snapshots__/props-geo.test.ts.snap tests/unit/__snapshots__/terrainMerge1140.test.ts.snap
rg -n 'buildCarbonate|carbonate-tower|materialHint' src/world/props
```

Existing focused capability commands, against the audited checkout:

```sh
VENT_SURFACE_AUDIT=1 npx vitest run tests/unit/props-geo.test.ts tests/unit/lostCitySurface.test.ts tests/unit/terrainMerge1140.test.ts --configLoader runner --cache=false --pool=threads
PERF_BUDGET_STATIC=1 npx vitest run tests/unit/perf-budget.test.ts --testNamePattern 'lost-city.*bounds prop' --configLoader runner --cache=false --pool=threads
```

- Capability specs: **113/113 passed, 3 files**, 70.00 s;
  `/tmp/4720-capabilities.log`. Existing snapshot expectations were retained.
- Filtered static budget: **3 passed, 31 unselected**, 8.11 s;
  `/tmp/4720-perf.log`. Existing diagnostics in `.cache/perf-budget/static.json`
  and `.cache/vent-surfaces/props.json` agree with the counts above.

The archives contain src, data, unit fixtures, package/vitest configuration
and the perf spec's imported blue-hole pose JSON, extracted using:

```sh
git archive 66abbb4dd6c046c2e587ca9059d740f9d845a55e src data tests/unit vitest.config.ts package.json tools/blue-hole-poses.json | tar -x -C /tmp/4720/parent
git archive 5cb25a70222d7c8b79fd18a9d6402ac418e29374 src data tests/unit vitest.config.ts package.json tools/blue-hole-poses.json | tar -x -C /tmp/4720/merge
```

Both scratch roots link the already-installed node_modules. Copy
`/tmp/4720/probe.test.ts` and `probe.config.ts` into either root, then run
there (no probe file enters tracked source):

```sh
npx vitest run --config probe.config.ts --configLoader runner --cache=false --pool=threads
TALUS_TERRAIN=1 npx vitest run --config probe.config.ts --configLoader runner --cache=false --pool=threads
python3 /tmp/4720/compare.py
python3 /tmp/4720/compare-terrain.py
```

Slope probes completed **1/1 each**, parent 7.99 s / merge 8.19 s; terrain
probes **1/1 each**, parent 10.69 s / merge 10.67 s. Logs are
`/tmp/4720-{parent,merge}-{probe,terrain}.log`. These scratch cases collect
observations; the existing capability assertions supply the regression gates.
Raw typed buffers and field/hash summaries are in each archive's
`evidence/` and `evidence-terrain/`; comparisons are
`/tmp/4720/comparison{,-terrain}.json`. `/tmp/4720/manifest.json` pins the
revision IDs, probe/comparison scripts and result-file hashes. Scratch artifacts
are local and ephemeral; the numerical findings and full revision IDs are
retained in this report.

Report Prettier and `git diff --check` pass. Only this named progress report
is delivered. No production, tests, snapshots, helpers, tools, other notes or
DIRECTOR edits; no render, visual acceptance, new dependency, merge, push,
release or tag. This verifies this size/paint delta and existing numerical
contracts only; it does not certify device performance or missing golden evidence.
