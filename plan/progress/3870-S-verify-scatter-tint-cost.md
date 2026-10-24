# 3870 — S-verify: Lost City scatter tint cost and isolation

DIRECTOR Backlog **9 at the audited pin, S-verify / S-bughunt [Codex, standing]**, specifically
**S-verify**, the highest eligible Codex item at the pinned checkout.
Audited SHA: `38afe4991d121c6b6c295b6a47d27fd6c45eeffb`.

**Clean resource audit:** removing only `scatterTint` from a local Lost City
biome copy preserves every measured tier's live counts, draws, instance capacity,
template buffers, indices and instance transforms. Exactly three instance-colour
buffers explain the scatter rebaseline; the other rebaseline is serialized biome
data. No unexplained delta or production correction was found. The initial audit
changed only this note; the user's gate follow-up additionally authorizes the
DIRECTOR formatting repair recorded below. No new durable guard is needed.

## Authority, exact history and ownership

Read CONTRIBUTING-AGENTS, DIRECTOR Backlog/simplicity rules/rubric, REVIEWS'
newest dated entry (2026-10-24 afternoon, after its leading older targeted entry),
OVERNIGHT-LOG through run 121, the visual progress note, and
[2910](2910-S-verify-lostcity-scatter.md),
[3470](3470-S-verify-blake-scatter.md),
[3560](3560-S-verify-lostcity-foot-numerics.md),
[3770](3770-S-verify-challenger-fade.md) and
[3800](3800-S-bughunt-spawn-determinism.md).
Read relevant launched briefs and available results, including adjacent
3820/3840/3850/3860/3880. No applicable AGENTS.md was found.

| Role                                      | Exact commit                               |
| ----------------------------------------- | ------------------------------------------ |
| Implementation parent                     | `60cb8a91de837931b48be2d0cb8ab19252ad4936` |
| scatterTint implementation                | `b06c9833edecbdd10915f61f1773b5cf45a211d6` |
| Snapshot/progress commit, parent b06c9833 | `0ee2691676297a464ef02134f80eec56ec8da766` |
| Subsequent note-only formatting           | `ee93f983ee2b311bb06f68c52bc3d2cf6957d9f1` |
| Visual merge                              | `d09ed68a105262e72335dc905dbd24f6ed1bf2b4` |
| Merge first parent                        | `e518b3cfa5aadf58cea5ae2d19dea3f23d7f8250` |

Read the exact implementation and snapshot diffs. The implementation adds the
optional biome field, Lost City's tuple and the rock-colour application; no
geometry builder, streaming configuration or shader changes. An ancestry check
confirms b06c9833 is in the audited SHA. Exact implementation-to-audited-SHA
diffs are empty for TerrainBiome, scatter modules, terrain config, shaders and
the two scatter/isolation specs. The two snapshot files at 0ee26916 are identical
to those at the audited SHA. No moving `HEAD~N` baseline is used.

Inventoried registered worktree HEADs, statuses, working/staged diffs and unique
committed change statistics. Rechecked ownership before writing. Main contains
the finished 3820 shell journey, 3840 life-depth checks and 3850 scan-reward note,
plus DIRECTOR formatting changes; their worktrees still retain those packages.
3860 separately owns biomeFloorVariety and the input-to-colour contract; 3880
owns later hosted-CI evidence. Neither supplies an audit dependency. This
checkout was clean and has neither adjacent patch. No other package claims this
cost/decomposition slice. Held 2980/3050, journeys 3310/3510, full e2e 3320,
touch 3340, historical CI 3380, parked Blue Hole and owner-dependent Endurance
remain untouched. The four collision expected failures are unchanged.
Read-only ownership evidence: `/tmp/3870-scatter-cost/ownership-diffs.txt`.

## What earlier evidence still establishes

- **2910:** its density-18 resource results, capacities, template triangle
  counts and placement/streaming contracts still apply to the same inputs.
  The tier rows below reproduce its initial controlled-plane counts/costs.
  Its old density-14 counts are historical comparisons, not current costs.
  Its current legacy aggregate `3eafbb77…` is now the **untinted** reference;
  colour-containing digests/live-colour signatures cannot be carried forward
  as current tint evidence. Do not repeat its two-ground/two-seed/revisit matrix.
- **3470:** Blake's colour-only attribution remains valid for Blake, but says
  nothing directly about this later Lost City field. Its aggregate payload
  decomposition and fixture are reused as methods, not as proof of this delta.
- **3560:** the earlier foot change already increased tower-prop cost on
  Medium/High. Its resulting full Lost City prop census remains Low **50,712**,
  Medium **149,570**, High **208,948 triangles**, with **14 mesh draws** each.
  Exact diffs from its audited `ccef32398e7eac7eee4719dc6f2740dadb103314` to
  this pin are empty for props, LostCityBands, Terrain and terrain config.
  The new tint does not undo those earlier increases. Those independently
  constructed props are not added to this scatter probe as a full-frame total.
  Its inherited terrain/sampler discrepancies remain outside this audit.
- **3770:** its decomposition already identifies the later Lost City biome
  leaf, separately from Challenger's earlier biome/uniform changes. It does
  not independently measure Lost City scatter cost.
- **3800:** existing cell-order and deterministic replay evidence is sufficient;
  its broad site/seed matrices are not rerun. Its rooted-life defect/fix belongs
  to 3830/3840, not scatter tint.

## Paired fixture and tier costs

Disposable `/tmp/3870-scatter-cost/audit.ts` copies the existing
[populated/settle fixture](../../tests/unit/beebeScatter.test.ts#L23), retaining
its production Scatter path. Only Vitest's document-presence stub is replaced
with a plain local global stub. No document APIs, renderer or WebGL context are
used. Vite builds this scratch entry as SSR; no listener or browser is started.

Both biome inputs use the same current palette, scatter specs and function
references. A local shallow copy has **only the scatterTint property deleted**;
the registry is never edited. Inputs retain identical serialized registry/config
values after all constructions. The ground is the original gently sloping plane
`y = -100 + 0.05*x - 0.1*z`, supplied normal
`[-0.05, sqrt(1 - 0.05² - 0.1²), 0.1]`, contains=true, seed **1130**, rock
thresholds **0.02/0.3**, camera **(32,-85,32)**, **128 stationary updates**.
The tier rows change only density/radius to resolved terrain-tier values.
No surveyed-ground, runtime site seed, prop keepouts or full scene is claimed.

All entries are **untinted = current tinted**. Counts are
**boulder/rubble/dropstone/sponge**. Draws are Scatter's active-mesh accounting,
not a sampled renderer counter.

| Settings                | Density / radius m | Cells | Live B/R/D/S  | Live total | Draws | Allocated instance slots | Instanced triangles |
| ----------------------- | ------------------ | ----: | ------------- | ---------: | ----: | ------------------------ | ------------------: |
| Low                     | 0.25 / 90          |     9 | 37/106/24/2   |        169 |     4 | 4 × 4,096                |               9,724 |
| Medium                  | 0.6 / 150          |    25 | 212/288/149/2 |        651 |     4 | 4 × 4,096                |              49,864 |
| High                    | 1 / 220            |    45 | 687/477/534/5 |      1,703 |     4 | 4 × 4,096                |             161,430 |
| Original legacy fixture | 1 / 128            |    21 | 267/477/184/5 |        933 |     4 | 4 × 4,096                |              64,830 |

Triangles are measured as
`live mesh.count × (geometry.index?.count ?? position.count) / 3`, summed over
the four meshes. All four actual templates here are nonindexed: **80/20/180/162**
triangles respectively. This counts instance multiplication, not just one copy
of each template, and does not substitute allocated capacity for live count.
All live counts are below the existing 4,096-per-kind cap; no clipping is observed.

Every pair has equal geometry attribute/index hashes and **entire** matrix-array
hashes, including unused slots. Templates have position/normal/uv/colour arrays
of **10,560/2,640/23,760/21,384 bytes** respectively, **58,344 bytes** total.
Each mesh allocates **262,144 matrix bytes + 49,152 instance-colour bytes**,
independent of its live count: **1,245,184 instance-buffer bytes** across all
four kinds, or **1,303,528 bytes** including template attribute arrays. These
measured typed-array allocations match before/after at every setting. They
exclude JS object/cell overhead, the new biome tuple, textures and GPU storage;
no total heap or execution-time measurement was made.

The smallest documentation qualification to
[V-lostcity-foot-2](V-lostcity-foot-2.md) is to attach **“in the legacy seed-1130,
density-1, radius-128 fixture”** to its “instance counts unchanged, 933” wording.
The unchanged-cost claim is supported for paired inputs; 933 is neither every
tier's count nor a full-game-frame census. No edit to that other note is made.

## Exact snapshot attribution

The scatter aggregate hashes ordered mesh entries containing name, live count,
every geometry-attribute digest, index digest/null, full matrix-array digest and
full instance-colour-array digest. Cells/instances/drawCalls are separate stats.
Materials, textures, uniforms and actual rendered visibility are outside this
aggregate.

| Changed snapshot leaf           | Exact parent digest                                                | Exact current digest                                               |
| ------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| beebeScatter: lost-city.meshes  | `3eafbb77a77b4a5a90636edb4d4003885bbfb6dd17ebfb3d01a81b3fc9234467` | `34c37d093b8887a2fb200faf2211df6df4074a24adbfa4c4adb287cdb09f75ed` |
| beebeIsolation: lost-city.biome | `f033e1c773a1b81d478da50805629645e805bc070066e99ae0659bdee5b1e7bb` | `11dfd61ab340722d609bab0fb3907bff57bd65f0d125db8ee956d9c04b4c906a` |

Parsed **all exports** of both exact parent/snapshot/current files without
updating them: exactly these two leaves change, one per file. The diagnostic
independently reproduces both legacy scatter aggregates and both biome hashes.
Deleting only the field reproduces the parent serialized biome digest, including
the original property order; function-valued fields retain the existing
JSON.stringify omission behavior.

Legacy scatter component decomposition:

| Kind      | Equal live count | Changed live RGB triplets | Parent full colour-buffer SHA-256                                  | Current full colour-buffer SHA-256                                 |
| --------- | ---------------: | ------------------------: | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| boulder   |              267 |                       267 | `8d00248295b70737a5fd7d9195cf141ab999ad3235d897ebe057644621284004` | `011f281fcadae33f2830f4c57737f5b7838a2e3c3a5e422839f1853bb9384c01` |
| rubble    |              477 |                       477 | `9a2e102da1948008b78e109df0236454f68f6e8e9a6a059347125c3aa7ffb7d5` | `19ee0f457da9c943a10b59d5ad51019567c32bc256faed8dcff3d96539442e0f` |
| dropstone |              184 |                       184 | `452a1f6d7a345163fc126e0a94107baae4484bcd0a58a12011efbb514bc01fed` | `858e0a2036587ddb6c9933605dd81c6baad4c496e9f7ace9f1685fa6ac16b150` |
| sponge    |                5 |                         0 | unchanged                                                          | unchanged                                                          |

Replacing just those three colour digests in the current observed mesh list
with the paired untinted values reconstructs the **entire parent list and exact
parent aggregate**. All unused colour slots also match. No geometry vertex
colour, position, normal, UV, index, transform, count or stats change is hidden
inside that aggregate. The same three-component attribution holds independently
at each tier; changed live colour-triplet counts are **37/106/24/0** on Low,
**212/288/149/0** on Medium and **687/477/534/0** on High. The multiplier formula,
identity fallback and placeCell arithmetic remain 3860's separate scope.

The other **11 named non-Beebe sites plus unknown/default** reproduce their exact
parent/current legacy mesh aggregates and stats, and unchanged biome digests.
Beebe is excluded from that cross-site export; its separate scatter three-tier
and prop-isolation exports are unchanged and their existing guards pass.
The isolation export retains identical Lost City and control-site Low/High
terrain attribute/index, uniform, injected shader-source and program-key hashes.
The current headless isolation test regenerates those signatures successfully.
The field is consumed only by ScatterPlacement, not terrain/material builders.
No shader, terrain-buffer or unrelated resource change is explained away by
this rebaseline. No unexplained component remains.

## Sufficient existing guards

- [beebeScatter:68](../../tests/unit/beebeScatter.test.ts#L68) pins cross-site
  geometry/placement/colour/stats; [92](../../tests/unit/beebeScatter.test.ts#L92)
  retains Beebe's three-draw geometry/placement isolation on all tiers;
  [167](../../tests/unit/beebeScatter.test.ts#L167) guards Challenger tier costs;
  [222](../../tests/unit/beebeScatter.test.ts#L222) guards late keepout invalidation;
  [244](../../tests/unit/beebeScatter.test.ts#L244) retains seeded wreck-floor
  costs and grounded transforms. These unchanged cases ran.
- [beebeIsolation:17](../../tests/unit/beebeIsolation.test.ts#L17) regenerates
  cross-site serialized biome, Low/High terrain buffers, uniforms, shader strings
  and program keys. Its [separate Beebe guard:65](../../tests/unit/beebeIsolation.test.ts#L65)
  preserves all-tier geometry, placement, collider/vent anchors and costs. Both ran.
- [biomeFloorVariety:76](../../tests/unit/biomeFloorVariety.test.ts#L76) already
  guards finite seeded placement, slope/exclusion and embed behavior; its
  [material tables:148](../../tests/unit/biomeFloorVariety.test.ts#L148) retain
  resolved material binding and ownership/non-mutation. The collected spec ran;
  3860's uncollected changes were not used.
- [beebeScatter:339](../../tests/unit/beebeScatter.test.ts#L339) already covers
  carbonate tier capacity/range, the two-cell update budget, ground translation,
  finite seated transforms and repeated eviction/revisit on plane/survey grounds
  and two seeds. Its three tier cases were deliberately **deselected by CLI**
  here to avoid rerunning 2910's broad matrix. No test skip/timeout/retry was added.
  3800's cell-order/seed matrices are cited rather than repeated.

## Exact validation outcomes

Commands ran locally at the audited SHA; **actual e2e mode: none**.

```sh
npm test -- --configLoader runner --cache=false tests/unit/beebeScatter.test.ts tests/unit/beebeIsolation.test.ts tests/unit/biomeFloorVariety.test.ts -t '^(?!.*carbonate scatter).*'
node /tmp/3870-scatter-cost/build.mjs
node /tmp/3870-scatter-cost/build/audit.mjs
npx prettier --write plan/progress/3870-S-verify-scatter-tint-cost.md
npx prettier --check plan/progress/3870-S-verify-scatter-tint-cost.md
git diff --check
```

- Focused capabilities: **exit 0**, **3 files / 32 passed**, **3 deselected**
  (Vitest displays these as skipped), **35 total**, **4.11 s**.
  Log: `/tmp/3870-scatter-cost/focused.log`. No snapshot update flag was used.
- SSR diagnostic build: **exit 0**, 49 modules, 55 ms initially. Its external
  `/tmp` outDir warning only says the directory will not be emptied; no tracked
  build output or configuration was changed.
- Initial diagnostic execution: **exit 1**, before mesh measurements, because
  the scratch parser treated Vitest export strings as already-parsed objects.
  The single changed export consequently failed the diagnostic's expected
  `/lost-city/` leaf-path assertion. This is a scratch parser error, not a
  product failure or a passing measurement. Retained log: `audit.log` in the
  scratch directory.
- Corrected only the disposable parser to evaluate the trusted snapshot export
  values as object literals (allowing trailing commas), then rebuilt:
  **exit 0**. Final diagnostic: **exit 0**, all four resource pairs, exact
  parent/current digest reproduction, colour-only component reconstruction,
  12 legacy controls and input non-mutation assertions pass.
  Evidence: `/tmp/3870-scatter-cost/evidence.json`; final logs:
  `/tmp/3870-scatter-cost/{build-final,audit-final}.log`.
- `git merge-base --is-ancestor b06c9833edecbdd10915f61f1773b5cf45a211d6 38afe4991d121c6b6c295b6a47d27fd6c45eeffb`:
  **exit 0**. The exact source/guard diff checks described above also exit **0**.
- Owned-note `prettier --write` and `prettier --check`: **exit 0**;
  `git diff --check`: **exit 0**. At initial handoff HEAD was unchanged and `git status --short`
  listed only this new report. Exact HEAD comparisons showed no production, tests,
  snapshots, data, tools, DIRECTOR, dependency or configuration diff; the index
  is unchanged. Repository-wide gates/build/unit/Python/e2e are not rerun for this report-only
  slice, as authorized. Historical wrapper smoke/PASS labels do not supersede
  embedded failures in 2910/3470/3770 and do not establish this run's outcomes.

## Orchestrator gate follow-up: DIRECTOR formatting

The user supplied an external orchestrator run of `tools/gates.sh` with
**e2e=smoke + project-base**. Its Python, content, build, unit, smoke e2e,
project-base e2e and attribution stages **passed**; Prettier **failed**, so the
aggregate result was **FAIL gates (e2e=smoke)**. Reported formatter log:
`.cache/runs/20261024-152419-1226613-dQwzo6/prettier.log`.
Those browser-stage passes belong to the orchestrator, not this sandbox.

Local reproduction:
`npx prettier --check plan/DIRECTOR.md plan/progress/3870-S-verify-scatter-tint-cost.md`
exited **1**, warning only about DIRECTOR. Its Backlog markers jumped from
1/2/3 to 6 through 13 after completed entries were removed. Prettier requires
contiguous numbering for this list. The user's explicit follow-up authorizes
fixing this reported root cause despite the initial read-only DIRECTOR scope.

Ran `npx prettier --write plan/DIRECTOR.md`: **exit 0**. The diff changes only
eight ordered-list prefixes, making the list 1 through 11; S-verify's marker
becomes 7. Stable item IDs, prose, priority order and policies remain identical.
A comparison of HEAD/current text with only numeric list prefixes normalized
passes, **exit 0**. No assertion, formatter rule, production file or test changed.

Follow-up verification: repository-wide `npx prettier --check .` **passes,
exit 0**; log `/tmp/3870-prettier-followup.log`. After updating this report,
`npx prettier --check plan/DIRECTOR.md plan/progress/3870-S-verify-scatter-tint-cost.md`
also passes, **exit 0**.
`git diff --check` and exact HEAD comparisons for production/tests/data/tools/
dependencies/configuration pass, **exit 0**. Final scope is DIRECTOR's formatting
and this report, with HEAD still `38afe4991d121c6b6c295b6a47d27fd6c45eeffb`.
The complete gates command was not rerun locally after this documentation-only
repair. Local e2e mode remains **none**; no new timing, GPU, phone or journey
acceptance is inferred from the orchestrator's smoke/base results.

## Simplicity and limits

One evidence note plus the authorized list-formatting repair; zero production/test/runtime complexity added. No new
abstraction, guard, setting, guidance, UI, layout, site branch, schema, dependency,
budget, tolerance or snapshot. Real GMRT terrain, all 13 site identities, the
five hero set pieces, scanning, Journal, marine life, keyboard/pad/touch input,
accessibility and Arcade default remain untouched. The rubric is applied to
supported resource accounting, simple scope and honest claims about exploration
and rewards; readability, beauty, composition, touch layout and rewarding visual
presentation remain with Claude/owner.

This is CPU mesh/resource evidence for specified inputs, not rendered visibility,
GPU compilation/output, frame time, total heap use, real-phone performance,
unaided journeys or hosted-CI acceptance. The additional colour arithmetic was
not timed. No browser, game render, WebGL context, screenshot, pixel judgment,
full survey/seed/eviction rerun, merge, push, tag or workflow dispatch occurred.
