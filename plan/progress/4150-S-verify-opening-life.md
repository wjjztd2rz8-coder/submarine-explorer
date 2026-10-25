# 4150 — S-verify: authored opening life after population ordering

DIRECTOR Backlog **7, S-verify / S-bughunt [Codex, standing]**, specifically
**S-verify**. Audited HEAD: `b7f3ca59fdc4e404b5b8672a2eb4e5b1a420c4e8`.

**No supported opening-life regression reproduced.** The recorded admissions,
positions, velocities, fades, group state and counts match the fixed pre-4030
baseline exactly through the first completed update and next steering boundary.
Existing guards plus the bounded CPU evidence below suffice. No correction or
permanent test is proposed; only this note changes.

## Intake, ownership and fixed baseline

Read CONTRIBUTING-AGENTS.md; DIRECTOR's Backlog, simplicity rules and rubric;
REVIEWS' newest dated entry (2026-10-25 comprehensive review); OVERNIGHT-LOG
through run 145; relevant launched 3800/3840/4030/4070/4120–4150 briefs,
available result/final reports, and queued 4160/4170 briefs. Read collected
[3800](3800-S-bughunt-spawn-determinism.md),
[3840](3840-S-verify-life-rooted-depth.md),
[4030](4030-S-verify-life-clamp-shipped.md),
[4070](4070-S-verify-start-clearance.md),
[F-GOLDEN-950](F-GOLDEN-950.md) and
[F-VERIFY-1000](F-VERIFY-1000.md) evidence. No applicable AGENTS.md was found.
The source comment references `docs/life.md`, which is absent; shipped data,
implementation, capability assertions and collected notes provide the contracts.

Pinned the initially clean checkout and inspected every registered worktree's
HEAD, status, pending diff statistics and unique committed paths relative to the
pin; rechecked before writing. Main is clean. Finished/uncollected 4120, 4130
and 4140 each contain only their own report; their claimed validation is not
used here. 4160/4170 remain queued and own different slices. 4150's launched
brief is this invocation; no second owner or completed audit of this slice was
found. Held 2980/3050 retain collision changes; 3310 retains its divergent
committed journey work; 3320/3380 retain reports; 3340 retains its touch spec and
report. None was collected, applied or depended upon. Final pre-write ownership
records: `/tmp/4150-opening-life/final-ownership.json`.

The collected correction is commit
`eb2f9f10943fac04ca855f0e77c3df39caa48b5d`, merged by `66bf63ac`.
Its **fixed first parent** is
`164da7fe6e82e4abfcee270c123106f36bda2707`; this is the comparison baseline,
not a moving `HEAD^`. Read its exact three-file diff/report. Production changes
only relocate the existing integration loop after the 0.3 s replenishment,
0.5 s departure/active-row and 1 s rare passes. Clamps and integration arithmetic
are unchanged. The added existing-capability test guards birth-frame water limits.

Between that parent and audited HEAD, the only changed file in life code,
SiteManifest/Config, opening spawn functions, the life system, site/terrain data
and life rows is `LifeSim.ts`, containing precisely that integration reorder.
The disposable baseline loader substitutes only the parent's LifeSim source;
all callers and inputs stay identical. It asserts that the historical module
was loaded exactly once. No checkout reset, historical worktree or patch collection.

## Existing evidence and the actual gap

| Evidence                                                       | Reused coverage                                                                                                                                                                     | Missing evidence selected here                                                                                                             |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| [montereyOpening](../../tests/unit/montereyOpening.test.ts:30) | Real terrain/props, real populate hook, all-tier first-completed-frame snapshots, authored provenance, counts/caps, CPU sightlines, ten-second presence and clear/repopulate        | No explicit inspection of each authored member at the next steering boundary or callback admission at the current mission pose             |
| [deepOpening](../../tests/unit/deepOpening.test.ts:45)         | Challenger/Endurance real terrain/props, first-frame snapshots, Low terrain rays, staged counts, sixty-second survival, depth/seating, reset/remote rejection, Journal addition tag | Mission pose is computed for hull/target checks, but life is populated at the free-dive pose; boundary seating is not inspected explicitly |
| [lifeSim](../../tests/unit/lifeSim.test.ts:304)                | Replenished/rare birth limits, all-tier caps, fixed steering cadence, finite movement, rooted admission/seating and rare recovery                                                   | Synthetic fixtures do not invoke authored callbacks with loaded site geometry                                                              |
| [lifeDisposal](../../tests/unit/lifeDisposal.test.ts:197)      | Loaded-prop first-population gate; disabled/disposed/restart behavior and frozen-frame controls                                                                                     | Synthetic props do not prove authored seating on real geometry                                                                             |
| 3800 / 3840 / 4030 / 4070                                      | Determinism, corrected ordinary rooted depth, water constraints and supported start/clearance integration                                                                           | 3800 and 4030 explicitly exclude authored populations; 3840 audits ordinary patches; 4070 does not simulate life                           |

These are reused assertions and historical evidence, not newly rerun visibility,
static spawn, clearance or natural-population matrices. Historical counts and
visual claims in older notes are not promoted to current requirements. The
current data and capability files determine the counts below.

[SiteManifest](../../src/core/SiteManifest.ts:611) validates eagerly bundled
`site.json` files. Intersecting those with `data/landmarks/index.json` yields
**three authored-life consumers among 13 shipped sites**; the other ten have
no opening-life field:

| Site            | Strategy / anchor                                                | Current authored groups, Low / higher tier              |
| --------------- | ---------------------------------------------------------------- | ------------------------------------------------------- |
| Monterey Canyon | `groups`, `canyon-wall-ledge`, habitat radius 160 m              | hake 8/14 and 5/12, sablefish 3/4, sea-pen 5/9          |
| Challenger Deep | `approach`, `leggo-lander-marker`, radius 100 m, `onWreck:false` | hadal-amphipod 24/45                                    |
| Endurance       | `approach`, `main-hull`, radius 100 m, `onWreck:true`            | anemone 5/8, mesh `endurance-hull`, authored deck patch |

[createLifeSystem](../../src/app/systems/life.ts:62) passes parsed site rows,
tier, terrain sampling, loaded prop masks and currents to Life/Sim, and selects
the callback from that data. Its frame gate waits for loaded props.
[Life](../../src/world/life/Life.ts:94) advances Sim only for positive dt.
[fillAround](../../src/world/life/LifeSim.ts:207) selects active rows, invokes
populate **before** ordinary fill/cells, sets initial fades to one and settles
steering twelve times. Authored instant groups therefore already preceded
integration in both versions.

[GroupOpening](../../src/world/life/GroupOpening.ts:9) rejects missing/remote
anchors, inactive rows, invalid centre depth/reach, insufficient floor space and
prop collisions; it then uses normal pool/species capacities. Sea pens are
explicitly seated on each member's terrain; schools receive a northward goal.
[DeepOpening](../../src/world/life/DeepOpening.ts:9) additionally validates all
patch members, requires timber ray hits when on-wreck, rejects unsafe non-wreck
patches, and seats accepted members before returning. These rejection rules are
retained. Entry bands govern admission; they are not newly imposed permanent
movement limits. Crawlers seat on terrain during integration; sessile anemones
retain their accepted timber positions instead of being clamped down to mud.

## Disposable CPU diagnostic and loaded resources

Files are under `/tmp/4150-opening-life/`: `probe.mjs`, `LifeSim-before.ts`,
`head.json`, `before.json`, `compare.py`, `comparison.json` and logs. Vite SSR
uses `configFile:false`, a /tmp cache, middleware mode, `watch:null`, `hmr:false`,
`ws:false` and `optimizeDeps.noDiscovery:true`. There is no listener, browser,
renderer, WebGL context, GPU compilation or image output.

Use unchanged `makeConfig()`, full default runtime Terrain at Low and High,
actual local metadata/Float32 survey arrays, authored reconstruction/detail,
validated current grids, parsed life rows and real Props. Every height is finite,
every binary has exactly `cols * rows * 4` bytes, and all three metadata files
say **GMRT**, **nodata_count:0**. No synthetic terrain, reduced subdivision,
mock props, substitute prop geometry or changed authored input.

| Site            | Survey grid / binary bytes | Loaded real props                                    | Colliders |
| --------------- | -------------------------- | ---------------------------------------------------- | --------: |
| Challenger Deep | 911 × 911 / 3,319,684      | Leggo marker/lander and north-wall hadal scarp       |       210 |
| Endurance       | 1202 × 545 / 2,620,360     | main hull, rigging debris, helm marker               |         3 |
| Monterey Canyon | 820 × 638 / 2,092,640      | MARS node plus ledge/east/west/far canyon-wall props |       836 |

`Props.load` receives local JSON delivery, runs real validation/placement and
sets `loaded:true` before initialization. Both tiers load all **2/3/5** authored
props respectively, all procedural, **zero failed/skipped/unloaded**; no GLB is
needed. Resource hashes, placed IDs/features/collider counts and exact inputs
are retained in each result. Node's native no-DOM construction is used; no
canvas/image/texture loader mock or graphics context is installed.

For each of these three different callback behaviors, High supplies the larger
count/reach/active-species control to Low. For each resource set:

1. Load/place current mission POIs and select primaries in authored objective
   order. Fit the depth-appropriate hull using `requiredHull`, as Progress does
   (Monterey B, Challenger C, Endurance B).
2. Obtain the supported current Arcade free-dive or near-site mission pose
   through `DeepOpeningSpawn`'s composed functions with the fitted rated depth;
   call the real `Submarine.reset` and read its position/velocity/forward.
   Props are complete before the first life update. No arbitrary pose injection
   or hypothetical Endurance range is used.
3. Construct real LifeSim with shipped rows, `seed:42` and its unchanged default
   random stream `mulberry32(0x5eed)`. This matches the production separation
   between `lifeSeed` and the optional random-source argument. Supply actual
   terrain, `Props.coversGround` and shipped-current sampling callbacks.
4. Invoke the real authored populate callback only through Sim's populate hook.
   Observe real `placeGroup` calls without changing arguments/results. Capture
   authored IDs immediately after callback return, before natural fill. Verify
   active rows, centre admission bands/reach and approach-member bands/reach.
5. Perform four 1/60 s updates with the initialized stationary pilot. Inspect
   the first completed frame (zero based frame 0, t=1/60 s) and first subsequent
   decision boundary (frame 3, t=1/15 s), retaining intermediate states. Check
   finite authored state, existing pool/species/per-species caps, mover water
   constraints, crawler ground seating and immobile sessile attachment.

Natural fill remains enabled and is labelled separately by group ID. It is
needed to preserve real callback ordering and capacity competition; it is not
another natural-population sweep or an encounter-count requirement. No pool,
active-row, habitat, species, random stream or timer is forced to make an
optional group appear. This is initialization plus a short fixed-pilot life
history, not a shell/physics travel or asynchronous IO-order cross product.

## Results and attribution

Per version: **12 histories / 48 completed updates / 142 admitted authored
animals / 568 authored agent-observations**. Authored membership persists through
the sampled steering boundary. Zero nonfinite authored positions, capacity
violations, applicable water-limit failures or seating/attachment failures.

| Site / tier       |   Free-dive authored members | Other naturally filled members at first update | Mission authored members | Mission horizontal anchor distance / limit |
| ----------------- | ---------------------------: | ---------------------------------------------: | -----------------------: | ------------------------------------------ |
| Challenger / Low  |                 24 amphipods |                                             17 |                        0 | 138.260623 / 100 m                         |
| Challenger / High |                 45 amphipods |                                             54 |                        0 | 138.260623 / 100 m                         |
| Endurance / Low   |                   5 anemones |                                             17 |                        0 | 107.777549 / 100 m                         |
| Endurance / High  |                   8 anemones |                                            121 |                        0 | 107.777549 / 100 m                         |
| Monterey / Low    | 13 hake, 3 sablefish, 5 pens |                                              6 |                        0 | 238.989540 / 160 m                         |
| Monterey / High   | 26 hake, 4 sablefish, 9 pens |                                            132 |                        0 | 238.989540 / 160 m                         |

All six mission cases return before `placeGroup`: the loaded hero is beyond
its authored habitat radius. These are valid optional-group absences, **not**
failed population requirements. Natural life still fills under current rules
(24/64 Challenger, 24/120 Endurance, 18/108 Monterey in Low/High first frames).
No proposed correction expands the staging radius or changes mission framing.

Independent vertical CPU rays sample **284 authored-member observations per
version**, at first update and steering boundary. At Low, terrain mesh/sampler
differences stay below the existing deepOpening **0.001 m** check: maximum
**0.000048055 m** at Challenger and **0.000028070 m** at Monterey. Crawlers
exactly equal the runtime ground at their completed positions; pens exactly
retain their individually seated positions. The shared mover floor/ceiling
rules hold for admitted hake and sablefish without inventing a persistent
admission-band assertion.

Endurance rays start 100 m above each resulting world position and independently
intersect the actual named hull, rather than reproducing the callback's local
deck-patch cast. All **5/8** animals retain the same accepted XYZ at both frames;
vertical timber-hit error is **0** on both tiers. Minimum attachment height over
mud is **5.688705 m Low / 5.684151 m High**, satisfying the existing >5 m evidence.

The first probe attempt exited **1** because it incorrectly extended the
existing Low-only 1 mm terrain-triangle oracle to High Challenger. The final
probe preserves that assertion's Low scope and tolerance; on-wreck ray checks
still apply to both tiers. High Challenger's largest observed mesh/sampler
difference is **0.071643 m**, exactly the same on the fixed baseline.
[Terrain.sampleHeight](../../src/world/Terrain.ts:388) uses continuous surface
reconstruction for non-Low, non-fidelity, uncarved terrain; equality to its mesh
triangles is not its general High contract. High crawler seating is checked
against the real runtime sampler; the ray difference is retained as a limit,
not recast as an integration-order failure. No production or test assertion was
changed to accommodate the diagnostic's unsupported assumption.

**Exact paired equality:** `head.json == before.json`, including resource hashes,
poses, admission attempts, recorded authored/natural states, group goals, fades,
counts and ray observations. Both result files have SHA-256
`e26c2118c56dc0b2a0ca2c1f1aa5f36b16e0632b88b5385bdd24f4a60781c01e`.
The historical loader confirms one parent-module substitution, SHA-256
`46f5cc47132566abe8cb9193ebb60c7a236381842c06f5d563ab5d70b7505853`.
Final probe SHA-256:
`278a0746745e83f12948f1eedebef9fd98209ad219448a5ccb8053fa7f38212a`.

This equality also follows the control flow: initial authored fill precedes
integration in both versions, and the first 15 Hz boundary precedes the moved
0.3/0.5/1 s passes. There is no discrepancy attributable to the collected delta
in this slice. The intentional birth-frame movement/fading for later regular
and rare births remains protected by the unchanged existing capability test.
No attempt is made to restore the old scheduling or clamp sessile timber fauna
to terrain. Stop here; no new supported failure requires a reproduction or fix.

## Exact commands and actual outcomes

All commands run from the pinned worktree; diagnostic logs are under
`/tmp/4150-opening-life/`. Source inspection included:

```bash
git rev-parse HEAD
git worktree list --porcelain
git show --format=fuller --stat eb2f9f10
git diff eb2f9f10^1 eb2f9f10 -- src/world/life/LifeSim.ts tests/unit/lifeSim.test.ts
git rev-parse eb2f9f10^1
git show 'eb2f9f10943fac04ca855f0e77c3df39caa48b5d^1:src/world/life/LifeSim.ts' > /tmp/4150-opening-life/LifeSim-before.ts
node /tmp/4150-opening-life/probe.mjs > /tmp/4150-opening-life/head.log 2>&1
node /tmp/4150-opening-life/probe.mjs --baseline > /tmp/4150-opening-life/before.log 2>&1
python3 /tmp/4150-opening-life/compare.py > /tmp/4150-opening-life/comparison.log
node_modules/.bin/vitest run --configLoader runner --cache=false tests/unit/lifeSim.test.ts tests/unit/lifeTables.test.ts tests/unit/lifeDisposal.test.ts > /tmp/4150-opening-life/existing.log 2>&1
```

Final HEAD diagnostic, baseline diagnostic and independent JSON comparison:
**exit 0** each, **12 histories per version, exact recorded equality**. The
baseline command was run once more with the explicit module-load-count assertion;
that completed exit 0 and retained identical output. Initial unsupported-oracle
failure is preserved separately in `initial-oracle.log`; it is not a game
regression or failing-before fix demonstration.

Existing headless capabilities: **exit 0, 3 files / 90 tests passed, 3.66 s**.
No skips, counts, assertions, thresholds or snapshots changed. The older
4030/3840 wrappers print gate PASS while their embedded reports identify local
Python/gate failures or separate orchestrator results; those are historical
reports, not passing evidence for this run. This report-only audit runs no
repository-wide gate, build, Python suite, local e2e or hosted workflow.

Owned-note checks:

```bash
node_modules/.bin/prettier --write plan/progress/4150-S-verify-opening-life.md
node_modules/.bin/prettier --check plan/progress/4150-S-verify-opening-life.md
git diff --check
git diff --no-index --check /dev/null plan/progress/4150-S-verify-opening-life.md
git rev-parse HEAD
git status --short
```

Prettier write/check and `git diff --check`: **exit 0**. The auxiliary no-index
check exits **1** for the new-file comparison against `/dev/null`, with **no
whitespace diagnostics**; it inspects the untracked note's actual contents. Final HEAD remains the audited SHA, with only
`?? plan/progress/4150-S-verify-opening-life.md` in this worktree.

## Simplicity, rubric and limits

One report, zero runtime or permanent-test complexity. No production, tests,
fixtures, snapshots, authored data, dependencies, configuration, tools, DIRECTOR
or other notes changed. No new settings, guidance surface, layout patch, shared
site branch or config mutation. Assertions, tolerances, budgets, skips and
current product policies remain intact; Arcade stays default. Leaving all
implementation untouched protects real GMRT terrain, all 13 site identities,
the five hero set pieces, scanning, Journal, marine life, input and accessibility.

The evidence supports correct admission, predictable movement/seating and honest
reporting around exploration. Rewardingness, beauty, visual readability, touch
layout and real-phone performance remain Claude/owner judgments. High mesh
agreement is qualified above. Sampling points on terrain/timber does not prove
whole animal-body envelopes or arbitrary later trajectories; absence at these
mission poses does not imply absence at every supported start.

No ordinary rooted mask audit (4160), instance publication audit (4170), Scanner
publication audit (4060), natural water sweep (4030), population-budget comparison
(4100), mode audit (4120), hypothetical Endurance distance/framing (4130), hosted
CI work (4140), journey/full-e2e/touch work, S-collision fix or expected-failure
case was taken over. No GPU, browser, rendering, screenshots, pixel acceptance,
unaided journey or real-phone verdict. **Local e2e mode: none.** No merge, push,
tag or workflow dispatch/rerun.
