# 4160 — S-verify: ordinary rooted life and real prop masks

DIRECTOR Backlog **7, S-verify / S-bughunt [Codex, standing]**, specifically
**S-verify**. Audited SHA: `b7f3ca59fdc4e404b5b8672a2eb4e5b1a420c4e8`;
initial worktree clean. **No supported integration defect reproduced.**
Both shipped clear-ground props reject actual ordinary-placement candidates,
while brain coral occupies unblocked habitat before and after ordinary streaming
eviction/re-entry. Only this note changes; no correction is proposed or implemented.

## Intake and ownership

Read CONTRIBUTING-AGENTS.md; DIRECTOR Backlog, all simplicity rules and rubric;
REVIEWS' newest dated entry (2026-10-25 comprehensive, despite the older targeted
entry preceding the document title); OVERNIGHT-LOG through run 145;
3800/3830/3840/4030 reports; relevant launched 4150–4170 briefs;
4120–4140 result reports; and the earlier
[2180 footprint audit](2180-S-verify-12.md),
[2260 loaded-gate correction](2260-S-verify-13.md) and
[V-bluehole-2](V-bluehole-2.md) evidence. No applicable AGENTS.md found.

Inspected registered worktrees' HEADs, status, pending paths and committed paths
unique to the pin, including finished work awaiting collection. At intake,
4120–4140 were registered at the pin; during inspection they were collected as
notes on main and their worktrees removed. This checkout stayed pinned. The
launched log lists 4150 at 12:03 CDT and 4160/4170 at 12:15; their result files
were absent and last-report files empty. Adjacent 4150 owns opening callbacks;
4170 owns instance publication. Queued 4180–4200 concern save/audio/Journal and
explicitly leave this slice alone. No other brief or prior report completes this
exact real-terrain, real-footprint, ordinary-life handoff.

Held 2980/3050 retain scarp/Terrain/tests changes; finished 3310 retains journey,
Scanner/UI/tests changes; 3320/3380 retain CI notes; 3340 retains touch test/note
changes. None was collected, imported or used. The wrapper results for 4120–4140
say smoke gates PASS while their embedded reports describe narrower execution
and/or failures. Those labels supply no validation of this checkout.

## Existing evidence and the remaining gap

| Contract                                              | Existing evidence reused                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Load must complete before ordinary population         | [life system](../../src/app/systems/life.ts#L102) waits for `ctx.props.loaded`; [lifeDisposal](../../tests/unit/lifeDisposal.test.ts#L197) exercises delayed readiness through real Life/Sim, using a synthetic half-plane and empty-mask control. 2260 records failing-before/passing-after evidence.                                                                  |
| Query honors flag, heading, scale and slope alignment | [Props.coversGround](../../src/world/Props.ts#L371) projects a vertical ray into the transformed, expanded local bounding box. [props-loader](../../tests/unit/props-loader.test.ts#L275) checks aligned/unaligned transforms, nonuniform scale, projected base/crown and unrelated props. 2180 compares both real gallery builders' queries on controlled flat ground. |
| Each final cell member uses the runtime mask          | [system environment](../../src/app/systems/life.ts#L68) forwards the live Props query; [placePatch](../../src/world/life/LifeSim.ts#L641) skips blocked final X/Z positions before sampling depth and acquiring an agent.                                                                                                                                               |
| Rooted depth, seating and stable cells                | [lifeSim](../../tests/unit/lifeSim.test.ts#L161) has revisit, immobility, seating and band guards, including the 3830 regression and 3840 shipped-table matrix on synthetic grounds. Reuse those policies; no new band matrix.                                                                                                                                          |
| Completed updates include births                      | [4030](4030-S-verify-life-clamp-shipped.md) verifies real surveyed terrain for movers but explicitly excludes Props masks and rooted life.                                                                                                                                                                                                                              |

The missing evidence was their composition with **loaded, shipped prop bounds
and real terrain**, including fresh ordinary placement after eviction. None of
these reports establishes that exact combination. Generic mask math and delayed
load behavior therefore receive no new tests.

## Data-derived cases

Parsed all 13 indexed props documents with `parsePropsDoc(makeConfig().props)`
and life rows with `parseLifeDoc`/`buildEntries`. Every props document has zero
parse errors. Literal `clear_ground: true` occurs only at Great Blue Hole.
Rooted here means catalogue archetype `sessile`; crawlers are distinct.

| Site                              | Shipped rooted species              |
| --------------------------------- | ----------------------------------- |
| Great Blue Hole                   | brain-coral                         |
| Blake Plateau                     | cold-water-coral, anemone, sea-lily |
| Lost City                         | cold-water-coral, anemone           |
| Kamaʻehuakanaloa                  | golden-coral                        |
| Axial                             | tubeworm, anemone                   |
| Hudson                            | deep-coral                          |
| Monterey                          | sea-pen                             |
| Endurance                         | anemone, sea-lily, glass-sponge     |
| Titanic                           | golden-coral, anemone               |
| Beebe                             | anemone                             |
| Hunga Tonga, Bismarck, Challenger | none                                |

Thus only **brain-coral** intersects a currently shipped clear-ground consumer.
Its unchanged row has weight **35**, group **[1,5]**, `star: true`, and intersected
habitat **[1,40] m**, with the existing six-metre rooted tolerance.

Both flagged props are selected: `karst-grotto` uses the ordinary gallery profile;
`karst-grotto-east` uses the manifest's hood profile, different dimensions and an
oblique heading. Both have unit scale, seabed snapping and no slope alignment.
Their Low loaded transforms are below (world metres, rounded to six decimals):

| Prop              | Authored dimensions / heading | Root position                       | Built local bounds, min → max                          |
| ----------------- | ----------------------------- | ----------------------------------- | ------------------------------------------------------ |
| karst-grotto      | [70,22,18] / 90°              | (-311.529523,-33.605201,-44.801940) | (-35,-18.083195,-34.646427) → (35,13.626318,39.812126) |
| karst-grotto-east | [56,20,16] / 327°             | (-74.535854,-40.062217,85.442460)   | (-28,-10.943871,-26.731100) → (28,10.924157,36.193356) |

Full matrices, quaternions and bounds are retained in the diagnostic JSON.
`Props.load()` finishes with `loaded: true`, **2 procedural props, zero skipped
or failed**, using the original local props JSON through its supported fetch
argument. Calling `placeAll()` alone would not establish the loaded state.

## New headless evidence

Disposable `/tmp/4160-rooted-prop-masks.mjs` runs production modules through Vite
SSR: `configFile:false`, middleware mode, `watch:null`, `hmr:false`, `ws:false`,
no dependency discovery, cache `/tmp/4160-vite-cache`. Node **v22.23.2**.
No listening server, browser, renderer, WebGL context or shader compilation.

Terrain is a full Low `Terrain` built from the unchanged Great Blue Hole GMRT
`meta.json` and Float32 `heightmap.bin` (**574 × 547**) with default `makeConfig()`.
Detail, reconstructed sinkhole and triangle sampling remain enabled as shipped;
no synthetic ground, reduced grid or replacement sampler. Props use that same
terrain. Currents use the validated shipped offline grid.

Each case constructs the real `createLifeSystem`, awaits the normal life-doc
promise, and calls its `world.life` frame callback after Props has loaded. A
local fetch adapter supplies only the unchanged life JSON; unrelated context
services have inert interfaces. Real Life/Sim and Props remain in use. Great
Blue Hole has **no authored life opening callback**, checked in the manifest.
There is no `populate`, forced spawn, row override, private cell call, `clear()`
or altered random source. `lifeSeed=7` and `21` change cell hashing; the ordinary
Life default random stream, including CPU Life construction, is preserved.

For each prop/seed, start above the root's X/Z with Y = terrain + 14 m, hold
2 s, travel 200 m at 4 m/s, hold 3 s, return at 4 m/s, hold 3 s. Frame step is
**1/30 s**, **108 s / 3,240 updates per case**. Among four cardinal routes,
choose the one with deepest shallowest ground on one-metre samples, independent
of population results: west grotto travels +X; east grotto travels −Z. Their
sampled shallowest grounds are −33.605201 and −40.062217 m. Y follows terrain
+14 throughout. These are controlled simulation poses, not player opening or
submarine collision/navigation acceptance.

Maximum horizontal frame displacement is **0.133334 m**, below the **33 m**
teleport refill threshold. Ordinary cell eviction/fades operate during travel;
none of the initial rooted group IDs remains at the away endpoint or on return.
This distinguishes actual re-admission from retaining the initial groups;
pool slot IDs alone cannot establish animal identity.

The instrumented Props method delegates every admission query to its original
runtime implementation with default **4 m** padding and records the result.
Checks independently call that bound original method for every live rooted
member after every completed update, including leaving/fading members. Require
finite coordinates, `mask === false`, own-ground seating within **1e-9 m**, and
the existing intersected depth band ±6 m. No mobile mask constraint is added.

| Prop / cell seed       | Placement queries | Mask-true skips | Rooted observations | Rooted at initial / away / return |
| ---------------------- | ----------------: | --------------: | ------------------: | --------------------------------- |
| karst-grotto / 7       |                38 |              26 |               5,162 | 6 / 0 / 6                         |
| karst-grotto / 21      |                42 |              30 |               5,704 | 6 / 0 / 6                         |
| karst-grotto-east / 7  |                63 |              28 |              14,263 | 6 / 13 / 6                        |
| karst-grotto-east / 21 |                36 |              14 |               9,310 | 7 / 5 / 7                         |

**12,960 completed updates; 34,439 rooted member observations; zero mask,
finite-position, seating or habitat violations.** Observations repeat animals
across frames. All **98 mask-true candidate skips** also pass the existing final
ground band, so the mask exercised a real exclusion rather than merely hiding
out-of-band candidates. All observed rooted species are brain coral. Positive
unblocked admission occurs initially and on return in all four runs; these are
observations, without minimum counts/probabilities or count-equality assertions.
The west away endpoint is deep habitat and its zero rooted count is valid.

Representative seed-7 records (metres):

- West skipped candidate: X/Z **(-301.372165,-64.200108)**, ground
  **−41.745448**, mask **true**. An admitted member at
  **(-294.768875,-40.664225,-92.276707)** has mask **false** and Y = ground.
- East skipped candidate: X/Z **(-97.808889,87.056957)**, ground
  **−43.938041**, mask **true**. An admitted member at
  **(-50.415346,-38.394516,59.325633)** has mask **false** and Y = ground.

No higher-tier control is needed to resolve an absent or ambiguous Low result:
both shipped profiles exercise exclusion and unblocked admission at Low. Generic
transformed query coverage already exists. This makes no Medium/High runtime
claim. The mask intentionally uses a whole expanded local bounding box, not
triangle-accurate occupied ground; empty space within that projection is not
itself a defect. Dynamic prop replacement/movement after population is outside
the loaded-static-content path, and was not used as a failure trigger.

## Commands and actual results

```bash
node /tmp/4160-rooted-prop-masks.mjs > /tmp/4160-rooted-prop-masks.log 2>&1
npm test -- --configLoader runner --cache=false tests/unit/props-loader.test.ts tests/unit/lifeDisposal.test.ts tests/unit/lifeSim.test.ts tests/unit/lifeTables.test.ts > /tmp/4160-capabilities.log 2>&1
npx prettier --write plan/progress/4160-S-verify-rooted-prop-masks.md
npx prettier --check plan/progress/4160-S-verify-rooted-prop-masks.md
git diff --check
git diff --no-index --check /dev/null plan/progress/4160-S-verify-rooted-prop-masks.md
```

Diagnostic **exit 0**, with the final counts above; records at
`/tmp/4160-rooted-prop-masks.json` retain inventory, loaded stats, transforms,
candidate examples, route inputs and endpoint member coordinates/masks/groups.
An initial exploratory version also exited 0 (98 mask skips, no violations),
but took the east route into very shallow water and compared reusable pool
slots. Its `.json`/`.log` are retained under
`/tmp/4160-rooted-prop-masks-initial.*`. The final diagnostic uses a water route
and group identities; only final counts support the table. Neither run exposed
a production failure.

Existing capabilities: **exit 0; 4 files / 142 tests passed**, **3.29 s**, no
skips or expected-failure cases in this focused selection. No assertions,
tolerances, budgets, counts, policies, fixtures or snapshots were changed.
Owned-note Prettier write/check and `git diff --check`: **exit 0**.
The no-index check includes this still-untracked note: **exit 1**, empty stdout
and stderr (the new-file difference, with no whitespace diagnostics). An
independent byte/line scan finds zero trailing-whitespace lines and a final
newline. Final HEAD remains the
audited SHA; only this note differs. Final registered-tree/queue recheck finds
the same disjoint adjacent lanes and held changes; main has only the collected
4120–4140 notes and an OVERNIGHT-LOG update beyond the pin. None is used here.

## Simplicity and limitations

One report, zero runtime/test complexity. Reuse the existing gate, transformed
mask and habitat capabilities; no new spec, abstraction, UI, guidance, setting,
site branch, dependency or configuration mutation. Correct exclusion with
unblocked habitat supports the marine-life exploration/reward loop; the bounded
claims meet the honesty rubric. No cuts or product policy changes.

Actual local e2e mode is **none**. No repository-wide gates, Python suite, build,
hosted CI, GPU, screenshots, unaided journey or real-phone validation. CPU
placement does not establish visible clipping, artwork, beauty, visual
readability, touch layout or phone performance; those remain with Claude/owner.
No 4030 water sweep, 4060 Scanner audit, 4100 all-site budget comparison,
4150 opening staging, 4170 buffer audit, held scarp investigation or IO/disposal
redesign. No production, tests, authored data, tools, DIRECTOR or other notes
edited; no merge, push, tag or hosted workflow dispatch.
