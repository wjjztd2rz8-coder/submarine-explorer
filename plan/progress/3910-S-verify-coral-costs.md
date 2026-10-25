# 3910 — S-verify: shared coral-mound resource costs (3930 completion)

**Clean numerical result:** pre-(e), post-(e) and current post-(f) have identical
potential mesh submissions, live instances, capacity, geometry/material/texture counts,
buffer bytes, triangle costs and placement evidence for both authored mounds at
Low/Medium/High. Only the intended body/colony material state differs. No
unexplained discrepancy, production correction, new guard or rebaseline is needed.
This supports the resource-count claims in
[V-eight-sites-lit-e](V-eight-sites-lit-e.md) and
[V-eight-sites-lit-f](V-eight-sites-lit-f.md); it does not establish equal shader
execution cost, rendered visibility or frame performance.

## Authority, ownership and fixed history

DIRECTOR Backlog **7, S-verify / S-bughunt [Codex, standing]**, specifically
S-verify, is the highest eligible Codex item. Read CONTRIBUTING-AGENTS,
DIRECTOR's Backlog/simplicity rules/rubric, REVIEWS' newest dated entry
(2026-10-24 night, below the older leading entry), and OVERNIGHT-LOG through
run 133. Read both visual notes, the shipped definitions, props-geo/countGeo,
[2960's resource accounting](2960-S-verify-monterey-resources.md) and
[3870's separate scatter audit](3870-S-verify-scatter-tint-cost.md).
No applicable AGENTS.md was found.

Read launched 3900/3910/3920 briefs and their available logs/results, plus the
3930 launch. The three `*-last.md` files are empty and there is no completed
coral-cost result/report commit. Run 129 records stopped tasks: 3900/3920 tests
were collected, 3910 was dropped without a note. Its disposable diagnostic did
finish 18 builds; its props-geo log stops at the runner banner. Reuse that
diagnostic here instead of creating a second harness. This completes the
authorized rerun, rather than claiming the partial run was a finished audit.

| Role                                                     | Fixed SHA                                  |
| -------------------------------------------------------- | ------------------------------------------ |
| P: pre-(e), implementation parent and merge first parent | `96319311224de4932f0449e0cc8df9e516a3370b` |
| E: post-(e) implementation                               | `050c96cfe821516867e9871d9cf13ac97fef2920` |
| (e) note-only successor / merged second parent           | `d718e4917ba1368912d65b188c6acdfe1c5b23b8` |
| (e) merge                                                | `bba49c0bf90e0fd76a0347b2242b6a80cf6f4a7b` |
| (f) implementation parent / merge first parent           | `512c4ba79d78c68bc1718168432af42b8135c7a5` |
| (f) implementation / merge second parent                 | `d20995d90f71ead6b6ef8d9da4e19833e46ef893` |
| (f) merge                                                | `f80a0ba28b5a88d89012783063d7bec1e9cd959e` |
| C: pinned current post-(f), audited HEAD                 | `ddcaaac5c141473ba4823e85a675384f2e27d887` |

Both merges are ancestors of C. Exact P→E production diff changes only
`coral.ts`; E→C changes only that same production file. E and its merge have
identical `src/` and `data/`; (f)'s implementation and C also have identical
`src/` and `data/`. Config, tier table, authored inputs and dependencies used by
the comparison are unchanged. No moving `HEAD~N` baseline is used.

Inventoried all ten registered worktree HEADs, statuses, working/staged and
unique committed diffs; rechecked before writing. Evidence:
`/tmp/3930-coral-costs/{ownership.json,registered-diffs.txt,ownership-before-note.json}`.
Main and this checkout were clean. Held 2980/3050 changes, uncollected 3310
commit, 3320/3340/3380 notes and touch diff do not own this slice. Concurrent
3940 owns EffectiveSettings; 3950 owns settings-apply. No pending coral-cost
patch exists. Collected material guard `8c63ce0db1192306a04ac58c89a3906043d280d5`
and loader guard `5da4790dd3ccbb6725c502fe3557dcbb7d52b369` are already in C;
their report files were not collected. No uncollected patch is a dependency.
Other lanes, completed slices and all four collision expected failures remain
untouched.

## Fixture and measured costs

Reused `/tmp/3910-coral-costs/audit.ts`, with only checkout/scratch paths
changed in `/tmp/3930-coral-costs/audit.ts`. Three source-only Git archives
(no worktree or branch) contain the diagnostic's existing 332-file input set
at P/E/C. Every extracted file was verified byte-for-byte against its fixed Git
blob. Vite SSR bundles the CPU entry with `configFile:false`; no server,
document/canvas stub, browser, renderer or WebGL context is created.
Node **v22.23.2**, installed Three.js **0.186.0** is shared by all builds.

Uses the existing
[authored builder fixture](../../tests/unit/props-geo.test.ts#L733):
`parsePropsDoc`, `DEFAULT_CONFIG.props`, `PROCEDURAL_BUILDERS.geo`,
`dims=def.dimensionsM`, `seed=hashString(def.id)`, and local sloping ground
`y=0.07*x-0.1*z`. The six site/tier inputs are each passed unchanged to P/E/C
(18 builds). Inputs and authored file text remain unchanged after construction.
The controlled plane is not a GMRT sampler. Latitude/longitude, heading and
LOD distance are retained in the definitions but are not applied by this local
builder fixture; no world placement or camera is simulated.

- Blake: [lophelia-mound](../../data/landmarks/blake-plateau-corals/props.json#L31),
  dimensions **[64,48,14] m**, seed **3747709583**.
- Hudson: [coral-ledge-mound](../../data/landmarks/hudson-canyon/props.json#L5),
  dimensions **[60,44,10] m**, seed **3958659022**.
- [Tier inputs](../../src/world/props/geo/detail.ts#L29), Low/Medium/High:
  growth **0.25/0.6/1**, mesh density **0.55/0.8/1**, branch depth **2/3/3**,
  texture edge **256/512/512**, bump **false/true/true**. These are observations,
  not new artistic assertions or budgets.

**Every table entry is P = E = C**, independently measured, with zero delta
for each adjacent pair. Counts are per mound. Colonies are populated instances,
listed by template 0/1/2; capacity is allocated matrix slots across colonies and
sponges. G/M/T counts unique resource object identities across full + impostor.

| Site   | Tier   | Full / impostor meshes | Live colonies (0/1/2) | Live sponges | Instance capacity | Unique G/M/T | Full triangles | Impostor triangles |
| ------ | ------ | ---------------------: | --------------------- | -----------: | ----------------: | ------------ | -------------: | -----------------: |
| Blake  | Low    |                  5 / 1 | 42/42/36 = 120        |           18 |               138 | 6/4/0        |         16,244 |                 24 |
| Blake  | Medium |                  5 / 1 | 98/103/93 = 294       |           42 |               336 | 6/4/0        |         87,732 |                 24 |
| Blake  | High   |                  5 / 1 | 168/149/163 = 480     |           70 |               550 | 6/4/0        |        143,476 |                 24 |
| Hudson | Low    |                  5 / 1 | 36/38/31 = 105        |           18 |               123 | 6/4/0        |         14,548 |                 24 |
| Hudson | Medium |                  5 / 1 | 74/82/74 = 230        |           42 |               272 | 6/4/0        |         76,740 |                 24 |
| Hudson | High   |                  5 / 1 | 133/132/126 = 391     |           70 |               461 | 6/4/0        |        130,108 |                 24 |

Full contains the body, three colony meshes and one sponge mesh: **5 geometries,
3 materials**. All three colony meshes share one material within each build.
The impostor adds one geometry and one material. Geometry is not shared across
independent builds in this measurement. Blake's two separate GLB rock stand-ins,
terrain, scatter and other scene systems are excluded; these are not site totals.

Texture count **0** is the measured DOM-free result, not a browser texture claim.
[detailTexture](../../src/world/props/geo/textures.ts#L148) returns cached null
without a document. Source inspection establishes the unchanged browser policy:
body sediment map at the tier's resolution, reused for bump on Medium/High;
colonies/sponges/impostor add no map. No texture callback, cache key or texture
factory changed in either art pass. Browser allocation/upload was not measured.

Triangle cost uses each actual buffer:
`(index.count ?? position.count) / 3`, multiplied by live `mesh.count` for an
InstancedMesh and by one for an ordinary mesh. The diagnostic reconciles this
with [countGeo](../../src/world/props/geo/shared.ts#L127). Body, colony templates
and impostor are nonindexed; sponge has **42 indices, 16 positions = 14
triangles**, not 16/3. Each impostor has 72 positions = 24 triangles.
Full draw ranges are unrestricted; mesh material bindings/groups do not add
another material submission here.

| Site   | Tier   | Body triangles | Colony template triangles (0/1/2) | Instanced triangles, colonies + sponges | Unique stored triangles, full + impostor | Geometry buffer bytes | Instance matrix + colour bytes |
| ------ | ------ | -------------: | --------------------------------- | --------------------------------------: | ---------------------------------------: | --------------------: | -----------------------------: |
| Blake  | Low    |          2,552 | 104/120/112                       |                                  13,692 |                                    2,926 |               375,476 |                  8,832 + 1,656 |
| Blake  | Medium |          5,768 | 256/272/304                       |                                  81,964 |                                    6,638 |               853,556 |                 21,504 + 4,032 |
| Blake  | High   |          9,408 | 256/272/304                       |                                 134,068 |                                   10,278 |             1,334,036 |                 35,200 + 6,600 |
| Hudson | Low    |          2,552 | 120/104/112                       |                                  11,996 |                                    2,926 |               375,476 |                  7,872 + 1,476 |
| Hudson | Medium |          5,768 | 296/288/336                       |                                  70,972 |                                    6,726 |               863,060 |                 17,408 + 3,264 |
| Hudson | High   |          9,408 | 296/288/336                       |                                 120,700 |                                   10,366 |             1,343,540 |                 29,504 + 5,532 |

Stored triangles count each unique geometry once, including the ordinary body
and impostor, without instance multiplication. Geometry bytes sum unique actual
attribute/index typed arrays; instance bytes are separate. All allocated slots
are populated here: **64 matrix bytes + 12 colour bytes per slot**. Capacity is
CPU storage, not a per-frame instance estimate. These bytes exclude JS objects,
temporary builder intermediates, textures and GPU memory; no heap peak is claimed.

The full/impostor columns are alternate potential mesh submissions, not six
simultaneous draws. [Props.update](../../src/world/Props.ts#L453) chooses
full/impostor/hidden by distance and frustum. `countGeo` traverses meshes without
visibility tests. Hidden can submit none; camera-dependent actual submissions,
passes, rasterized fragments and renderer counters were not measured. Low remains
cheaper than High for both authored inputs, with the same tier ordering at P/E/C.

## Exact delta and sufficient guards

For each P→E and E→C pair the diagnostic asserts raw byte equality of every
geometry attribute (positions, normals, UVs and vertex colours), index buffer,
entire instance transform array and entire instance colour array. It also
compares structured evidence for mesh order/names, local/world transforms,
live counts/capacity, resource sharing, groups/draw ranges, visibility flags,
frustum/layer flags, geometry/instance bounds, returned bounds and both colliders.
All twelve adjacent comparisons pass, with equal countGeo totals and buffer allocations.

Only the body and shared colony material records change: P→E adds emissive
state, callback and program-cache-key bindings; E→C retunes emissive state and
the captured floor/cache-key binding. The callback function text remains the
same across E→C because its floor is captured in a closure. Sponges and impostor
material records are identical. Other serialized material properties are equal.
The exact source diffs agree with this decomposition. No material arithmetic or
loader transition matrix is repeated here.

Numerical resource equality does **not** mean equal shader work. Pass (e) adds
fragment-shader emissive modulation through the existing helper; pass (f)
changes its parameters. CPU material counts and cache-key strings do not count
compiled GPU programs or measure instructions, compiler optimization, time,
overdraw or visibility. The smallest qualification to the visual notes is
“unchanged potential mesh submissions and geometry for paired authored builds”
for their draw-call wording. No unexplained numerical discrepancy remains and
no correction to production is proposed. The other notes remain read-only.

Existing guards are adequate; no durable test is added:

- [procedural:geo features](../../tests/unit/props-geo.test.ts#L357): finite
  nonempty builds/colliders/impostor, seed determinism, registry routing and
  Low cheaper than High, including coral-mound.
- [coral mound material bindings](../../tests/unit/props-geo.test.ts#L420),
  collected 3900: both authored definitions on all tiers, CPU callback binding,
  finite emissive state, retained colours, unlit sponge/impostor policy and
  independent-build/control isolation. That capability ran unchanged.
- [authored prop geometry golden](../../tests/unit/props-geo.test.ts#L733):
  buffer/material/anchor/cost snapshots for its four named control sites. It
  does **not** snapshot Blake/Hudson; the paired historical audit supplies that
  evidence without rebaselining or freezing art parameters.
- [collected loader guard](../../tests/unit/props-loader.test.ts#L528), 3920,
  covers bindings through LOD/rebuild/disposal separately; cited, not rerun.

## Exact validation and limits

Disposable evidence: `/tmp/3930-coral-costs/{refs.json,audit.ts,run.mjs,evidence.json,audit.log}`.
Evidence JSON SHA-256:
`9cee000053b9417439937cadeab6d874d98bd972fa7ef76fef763d34b60a3512`.
It retains all six rows, individual attribute/index/instance SHA-256 digests,
placement records and material differences. Its entire parsed content equals
the stopped run's evidence, now reproduced using verified P/E/C source.

```sh
node /tmp/3930-coral-costs/run.mjs
npm test -- --configLoader runner --cache=false tests/unit/props-geo.test.ts
timeout 60s npm test -- --configLoader runner --cache=false --pool=threads --maxWorkers=1 tests/unit/props-geo.test.ts
npx prettier --write plan/progress/3910-S-verify-coral-costs.md
npx prettier --check plan/progress/3910-S-verify-coral-costs.md
git diff --check
```

- Source extraction/blob verification and ancestry/source equality checks:
  **exit 0**. SSR build + diagnostic execution: **exit 0**, 18 builds; every
  paired assertion, input non-mutation and countGeo reconciliation passes.
- Existing headless props-geo capability: **exit 0, 1 file / 82 tests passed**,
  duration **68.24 s**; no snapshot update. Log: `props-geo.log` in scratch.
- While that first command was still silent after its runner banner, a bounded
  one-worker threads invocation was started to diagnose runner progress. It
  hit the external 60-second limit: **exit 124**, banner only, no completed
  test results or product assertion failure. Log: `props-geo-threads.log`.
  This is an incomplete extra invocation, not a PASS; the original command's
  completed 82-test result stands. No repository timeout, retry or skip changed.
- Owned-note formatting write/check and `git diff --check`: **exit 0**.
  Final HEAD remains C, index unchanged, and only this new note is changed.
  Production, tests, fixtures, snapshots, data, configuration, dependencies,
  tools and DIRECTOR are unchanged. No repository-wide gates or local e2e ran;
  **actual local e2e mode: none**. No orchestrator label substitutes for a result.

Simplicity: one report, zero production/test/runtime complexity; no new UI,
guidance, settings, layout patch, site branch, schema, dependency, abstraction,
budget or Backlog item. Real GMRT terrain, all 13 identities, five hero pieces,
scanning, Journal, marine life, keyboard/pad/touch input, accessibility and Arcade
default are untouched. The rubric is applied to correct accounting, simple scope
and honest exploration/reward claims. Appearance, readability, composition,
touch layout and phone performance remain with Claude/owner.

Historical CPU execution was safe and completed; the texture/GPU/visibility
limits above remain unverified. No browser, game render, WebGL, screenshots,
pixels, physical phone, hosted CI, unaided journey, merge, push, tag, workflow
dispatch, worktree collection or change to another worktree occurred.
