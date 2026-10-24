# 3610 — S-bughunt: rare life capacity and recovery

DIRECTOR Backlog 9, **S-verify / S-bughunt [Codex, standing]**, specifically
**S-bughunt**, the highest eligible nonvisual Codex item. Audited SHA:
`04cf357798c30dd34b782d0154ca1751bf8f1d36`.

**Result: no demonstrated LifeSim bookkeeping defect.** Six missing supported
capacity/recovery cases extend `tests/unit/lifeSim.test.ts`; production code is
unchanged. No failing-before/passing-after repair is claimed.

## Intake and ownership

Read CONTRIBUTING-AGENTS, DIRECTOR Backlog/simplicity/rubric, REVIEWS' leading
late targeted entry and newest early-October-24 comprehensive entry, and
OVERNIGHT-LOG through run 105. Read F-BUGHUNT-1, 3180 and 3040 evidence,
3580–3630 launched briefs, 3580–3600 result reports and their uncollected notes.
The wrappers' PASS labels do not override failures recorded in those notes.

Inspected all registered worktree statuses, changed-path/stat summaries and
commits ahead of main before editing. None claimed LifeSim or lifeSim.test.ts.
2980/3050 collision changes, 3310 journeys, 3320/3340 browser work, 3380 CI
report, and finished 3580 ripple / 3590 blur-focus / 3600 settings patches stay
in their own worktrees. No patches were collected or used. The concurrent
3620 power and 3630 sonar slices have disjoint ownership. This audit edits only
the existing lifeSim capability spec and this note. Source, data, fixtures,
snapshots, tools and DIRECTOR remain unchanged.

## Existing guards and caller contract

- `lifeSim.test.ts` already checks initial/global/per-species budgets, all-tier
  species budgets through a dive, depths, teleport refill, stable rooted cells,
  seeded determinism and steering. Its natural rare test uses a synthetic
  High-tier sperm-whale rule at 60/min; its overhead crossing uses `spawnRare`.
  Neither exercises crowded shipped Low rare allocation/recovery.
- `lifeTables.test.ts` guards every indexed site's parsed table, rare/catalogue
  band overlap, all archetypes, parser rejection, species selection, stable
  cells and tier ceilings. `lifeDisposal.test.ts` guards late-load/disposal,
  mode scan reach and target selection storage/stickiness. Those assertions
  remain intact; these subjects are not repeated by the new cases.
- F-BUGHUNT-1's life findings concern disposal and allocation performance;
  3040 repairs scan-target membership loss; 3180 establishes 100 site/species
  Journal links, including the two common/rare overlaps. None covers this slice.
- Actual `createLifeSystem` uses the parsed site table, configured tier,
  terrain/prop/current callbacks and optional authored opening population.
  `Life.update` calls `sim.update` only for positive dt; mission restart clears
  Life. `LifeSim.update` initially fills, performs 0.3 s population passes,
  0.5 s despawn/selection passes and one-second rare checks. Horizontal moves
  over 0.6 radius clear and refill. Opening helpers also use the existing
  `placeGroup`/`addAgent` paths. Tests here isolate ordinary table population,
  outside those optional authored opening placements; no terrain/prop or
  opening accessibility acceptance is inferred.
- `addAgent` checks species capacity before acquiring a free pooled agent.
  `release` removes its live group membership, decrements its species count
  and returns the slot once. Ordinary species reserve one species slot for
  a site's rare. `makeRoom` releases farthest nonrare agents using that same
  release path. Rare selection requires cooldown zero, sub depth inside the
  rule band, no populated rare group, and `rand() < 1-exp(-chancePerMin/60)`.

## Shipped paths and reachability census — round 1

All 13 rules from the real parsed `data/life/life.json` resolve to three paths:

| Path                      | Shipped sites and rare species                                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cruiser / passer          | Lost City and Blake: sixgill shark; Axial: giant squid; Kama and Hudson: sperm whale; Hunga and Monterey: humpback whale; Blue Hole: whale shark; Endurance: Weddell seal |
| Swarm / bed surge         | Beebe: beebe-shrimp; Challenger: hadal-amphipod                                                                                                                           |
| Other mobile / cephalopod | Titanic and Bismarck: dumbo-octopus                                                                                                                                       |

Giant squid is a **cruiser** in this catalogue. Beebe shrimp and hadal amphipods
are ordinary table species as well as rare surges; admission must respect the
combined count. Species limits are 140 shrimp, 110 amphipods and 4 dumbo octopuses;
capacityOf also clamps them to the tier's global pool. Low/Medium/High budgets
are respectively 44/100/180 agents and 4/8/11 species.

A temporary CPU census used seed candidates 1, 7, 21, 42, three depths per rare
band (low+5, midpoint, high-5), a flat floor 8 m below the sub, 20 seconds of
supported population updates, seeded draws clipped below 0.01 to suppress rare
rolls, and actual unmodified parsed tables/tiers. These are fixture depths,
not assertions about survey floor or rendered encounters.
Highest observed ordinary Low counts in that bounded census:

| Site       | Agents / 44 | Depth m, seed |
| ---------- | ----------: | ------------- |
| Lost City  |          31 | 700, 1        |
| Axial      |          35 | 1395, 1       |
| Beebe      |          44 | 4605, 1       |
| Challenger |          33 | 9505, 1       |
| Kama       |          44 | 1195, 1       |
| Hunga      |          44 | 8, 1          |
| Monterey   |          17 | 115, 42       |
| Hudson     |          29 | 615, 1        |
| Blake      |          34 | 700, 1        |
| Blue Hole  |          31 | 7, 1          |
| Titanic    |          28 | 1005, 1       |
| Bismarck   |          34 | 5195, 21      |
| Endurance  |           7 | 595, 1        |

An independent unmodified `mulberry32(7)` control (no clipped draws) confirms
ordinary Beebe at 44/100/180 agents and Hunga at 44 after the same 20 s, with
no rare group yet present. Thus full ordinary pools are not an artifact of
controlled rare-roll suppression. `/tmp/3610-seed7.log` records this control.

This establishes reachable table saturation in several Low fixtures; smaller
observations do **not** prove a maximum or require artificially filling those
sites. No synthetic saturation is reported as a shipped bug. Census allocation
was then isolated with the public **forced `spawnRare` hook**, separately from
natural-play evidence: every sampled rule admitted a nonempty group, within its
pool. Low swarm admission produced 44 members; singleton rules admitted one.
No forced hook is used in the permanent new tests.

## Natural boundary and recovery matrix — round 2

Six cases use the parsed document, seed 1 for both cells and injected PRNG,
flat floor depth+8 m, and 2,000 updates of 0.01 s for ordinary buildup. Seeded
draws below 0.01 are held at 0.01 to suppress incidental rare rolls; this exceeds
every shipped rare threshold. For 101 updates each, draws are set first to the
exact shipped probability threshold (rejected), then half that threshold
(admitted by the normal update/rareTick path). These controlled phases also
supply ordinary/steering random draws; this isolates admission, not real-world
encounter frequency. No probability, cooldown, group, depth or steering data is
changed, and no private scheduler or allocation method is called.

| Site / rare path     | Tier   | Sub depth m | Ordinary before | Immediately admitted total / rare members | After normal departure, ordinary only | Teleport refill ordinary |
| -------------------- | ------ | ----------: | --------------: | ----------------------------------------: | ------------------------------------: | -----------------------: |
| Beebe / swarm        | Low    |        4800 |              44 |                                   44 / 44 |                                    44 |                       44 |
| Beebe / swarm        | Medium |        4800 |             100 |                                 100 / 100 |                                   100 |                      100 |
| Beebe / swarm        | High   |        4800 |             180 |                                 137 / 117 |                                   149 |                      180 |
| Challenger / swarm   | Low    |       10000 |              33 |                                   44 / 44 |                                    15 |                       33 |
| Hunga / cruiser      | Low    |          20 |              44 |                                     1 / 1 |                                     9 |                       44 |
| Titanic / cephalopod | Low    |        3800 |              28 |                                     1 / 1 |                                    32 |                       28 |

The High Beebe admission retains 14 anemones and 6 squat lobsters alongside 117
rare shrimp; later ordinary shrimp share the 140 species cap. Medium differs
from Low in pool size; High additionally leaves ordinary agents after reserving
160 slots and draws a density-scaled surge below that reservation. These are the
only added Medium/High controls. Exact incidental counts above are diagnostic
observations, not new authored population requirements.

At checkpoints and the onRare callback, tests reconcile liveCount/stats against
alive pool agents, every catalogue species count and species/global capacity;
verify all numeric live-agent fields are finite; and require a one-to-one match
between live pool entries and group member references, with correct owning group
and species and no empty live groups. Every admission has exactly one rare group.

Low Beebe additionally advances 422 s in 0.25 s updates (the existing steering
accumulator boundary), verifies cooldown zero while its surge still lives, and
supplies another eligible draw phase. The same single group remains; the rare
callback still fired only once. This checks the concurrent-group exclusion
independently of the already-covered cooldown suppression.

All cases then move 0.5 m per 0.01 s update for six seconds, well below the
per-update teleport threshold. Normal distance despawning and fade release empty
the original rare group (within 2.39/3.38/4.38/2.88/2.88/2.88 s respectively).
An additional 2,000 m teleport refills through the supported update path.
The rare group's members stay empty, counts reconcile and full fixtures refill
all slots without duplicate references. Partial fixtures recover ordinary life
under their existing table rules; no invented minimum density is enforced.

Existing behavior retained/report-only: omitted rare group ranges request room
for 100 agents, clearing the entire Low pool for singleton rares. Released cell
patches remain marked done until cell eviction or a clear/refill; immediate rooted
recolonization is not promised. `clear` leaves cooldown/accumulators intact;
restart/teleport cooldown policy is ambiguous and unchanged. No tuning proposed
as a bookkeeping fix.

## Validation and simplicity

- Baseline focused command: `npx vitest run --configLoader runner --cache=false tests/unit/lifeSim.test.ts tests/unit/lifeTables.test.ts tests/unit/lifeDisposal.test.ts`:
  **3 files / 42 tests passed**.
- Same focused command with the six new cases: **3 files / 48 tests passed**.
- Temporary CPU diagnostics: `node /tmp/3610-probe.mjs`,
  `node /tmp/3610-natural.mjs`, `node /tmp/3610-depart.mjs`, and
  `node /tmp/3610-final-matrix.mjs`, `node /tmp/3610-seeded-matrix.mjs`,
  and `node /tmp/3610-seed7.mjs`: completed. The unmodified seed-1 probe also
  allowed an incidental Beebe Low rare before 20 s, so it is not ordinary-only
  evidence; the seed-7 control above avoids that case. The first probe attempt failed
  on Vite's config bundle write into read-only node_modules (EROFS); using
  `configFile:false` for the read-only SSR module loader resolved it. No server
  listener, browser, WebGL context or game rendering was started.
- Required `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`:
  **exit 1, actual e2e mode none**. PASS: writable config preparation, strict
  content validation, TypeScript/production build, full unit suite, attribution
  and repository-wide Prettier. Full units: **192 files, 4,091 passed and four
  existing expected failures (4,095 total), 764.81 s**. Collision expected-failure
  cases remain untouched.
- FAIL: Python tooling, **162 of 167 outer tests passed, five failed**. Four
  `test_ci_build_manifest` cases report `spawnSync git EPERM`; the
  `test_golden_tooling` case reports `Unexpected end of JSON input` at
  `golden-manifest.test.mjs:151`. These match previously recorded failures in
  3040 and uncollected audit notes. The JSON error's underlying cause was not
  established here; no tooling fix or retry was attempted.
- Actual gate logs: `.cache/runs/20261023-235412-32-Vz5cX6/`;
  aggregate output: `/tmp/3610-gates.log`. The command's real exit/result above
  takes precedence over any external wrapper label.
- Final owned-file command:
  `npx prettier --check tests/unit/lifeSim.test.ts plan/progress/3610-S-bughunt-rare-life-capacity.md`
  and `git diff --check`: **PASS**. Final HEAD remains the pinned SHA, and
  the diff is limited to the owned capability spec and this note. Rechecked all
  registered worktrees for overlapping life source/spec edits: none outside
  this worktree. No uncollected patch is a dependency.

No runtime lines added, UI surface, settings, per-frame machinery, abstraction,
site branch, budget increase, data change or historical assertion relaxed. The
six guards extend the existing capability spec. Correct pooled life and rare
admission protect rewarding encounters without changing identity or provenance.
Rubric judgments about readability, beauty, composition, touch layout and phone
performance remain with Claude/owner. No hosted CI, GPU, unaided journey or real
phone validation is claimed. No merge, push, tag or workflow dispatch.
