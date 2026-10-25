# 4060 — S-bughunt: scan positions after the life floor correction

2026-10-25. DIRECTOR Backlog **7, S-verify / S-bughunt [Codex, standing]**.
Audited HEAD: **`d7a02fd78fa4c3fa34057b2e53b1b149729ff8e3`**; initially clean.

**Clean publication audit.** Life publishes the selected animal's completed
integration coordinates before Scanner runs in the same frame. The feasible
slope and explicitly synthetic floor/ceiling conflict controls both pass,
including held Scan through completion. No new defect or correction is proposed.
The sonar map does not consume wildlife scan targets; no missing wildlife blip
or animal-depth readout is inferred from that existing product boundary.
Only this report changes.

## Intake and ownership

Read CONTRIBUTING-AGENTS.md; DIRECTOR Backlog, seven simplicity rules and rubric;
REVIEWS' newest dated entry, **2026-10-24 night**, below its older leading
2026-10-23 preamble; and OVERNIGHT-LOG through run 140. Read the relevant launched
3040/3180/3630/3810/3970/4000/4030/4060 briefs, available completion wrappers and
[3040](3040-S-bughunt-scan-target-lifetime.md),
[3180](3180-S-verify-wildlife-journal.md),
[3630](3630-S-bughunt-sonar-contact-state.md),
[3810](3810-S-bughunt-scan-targets.md),
[3970](3970-S-bughunt-mobile-life-depth.md) and
[4000](4000-S-fix-life-floor-ceiling.md) progress evidence. No applicable
AGENTS.md was found. The explicit report-only/headless brief takes precedence
over CONTRIBUTING-AGENTS' generic full-gate/browser instructions.

Inventoried every registered worktree's HEAD, status, staged/unstaged statistics
and unique committed paths relative to its merge base with the pin. Inspected
the neighboring production diffs and rechecked ownership before writing:

- Finished but uncollected **4030** owns `LifeSim.ts`, `lifeSim.test.ts` and its
  report. Its brief assigns the shipped-site/mover sweep. Its proposed diff moves
  integration after population passes to cover birth-frame water limits; it
  does not change target publication. Its report also claims natural shallow
  conflicts. Those are **4030's uncollected evidence**, not results reproduced
  or validated here. Neither its patch nor its simulation sweep is used.
- **4040** owns `Progress.ts`, `progress.test.ts` and its debrief/save report;
  its unresolved-objective rating change is separate and unused.
- Held 2980/3050 collision, 3310/3510 journeys, 3320 full e2e, 3340 touch and
  3380 CI work remain untouched. 3310's Scanner source matches the pin.
  Collected 4050's hosted inventory is not repeated. No other registered tree
  owns this note or this narrow publication audit. No patch was collected.

Historical wrappers label gates PASS, including browser/Python summaries, while
several underlying progress notes explicitly record local gate exit 1 and no
local e2e. Those wrapper/orchestrator outcomes are not this checkout's validation.

## Contract and existing coverage, mapped before the diagnostic

| Existing capability                                                                                                                                                                                                                    | What it already proves                                                                                                                                                | Boundary left for this audit                                                                |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [lifeDisposal](../../tests/unit/lifeDisposal.test.ts#L93), especially [mode reach](../../tests/unit/lifeDisposal.test.ts#L117) and [frozen selection](../../tests/unit/lifeDisposal.test.ts#L145)                                      | Live Scanner array ownership, disposal, Arcade/Realistic radius floor, cached target identity and individual stickiness/reselection                                   | Controlled zero-dt poses do not establish publication after moving integration              |
| [lifeSim steering stability](../../tests/unit/lifeSim.test.ts#L303)                                                                                                                                                                    | 4000's normally admitted shark crosses the retained synthetic shoal with floor priority; other existing cases cover finite movement, hard flying and steering cadence | The shoal regression stops at LifeSim; it has no Scanner distance consumer                  |
| [gameScanner](../../tests/unit/gameScanner.test.ts#L56) and [3040](3040-S-bughunt-scan-target-lifetime.md)                                                                                                                             | Real Life live-list removal/reappearance, partial scans, fixed/supplemental/extra priority, arrival exclusion, active locking, scan geometry and completion           | Lifetime fixture refreshes Life at dt=0; no moving floor-corrected coordinates are compared |
| [uiSonar metadata](../../tests/unit/uiSonar.test.ts#L378), [flat guides](../../tests/unit/sonarFlat1250.test.ts#L38), [palette numerics](../../tests/unit/sonarPalette1200.test.ts#L29), [3630](3630-S-bughunt-sonar-contact-state.md) | POI identity/current/scanned metadata, range/view admission, hidden-update recovery and anonymous faint contacts                                                      | These inputs are not wildlife targets; no new wildlife-map requirement is justified         |
| [appSystems schedule](../../tests/unit/appSystems.test.ts#L346)                                                                                                                                                                        | Actual stage scheduling and discovery-hook ordering                                                                                                                   | No moving Life-to-Scanner numeric assertion                                                 |
| [3180](3180-S-verify-wildlife-journal.md), [3810](3810-S-bughunt-scan-targets.md)                                                                                                                                                      | Shipped wildlife Journal identity/linkage and complete placed-POI registry coverage                                                                                   | Separate contracts; neither matrix is repeated                                              |

The material gap is positive-dt integration → selected live target → Scanner's
numeric view during a held scan. No permanent test is added for this report.

## Actual frame and consumer trace

1. [loop](../../src/app/loop.ts#L87) takes the clamped frame delta from Time;
   [life system](../../src/app/systems/life.ts#L119) supplies `f.frozen ? 0 : f.dt`
   and the resolved scan floor. Normal positive dt is at most 0.25 s.
2. [FRAME_STAGES](../../src/app/System.ts#L52) schedules `world.life` before
   `scan.discovery`, then `guide.waypoints` and `guide.sonar`. SystemRunner uses
   stage order, even though Discovery initializes earlier in the systems list.
3. [Life.update](../../src/world/life/Life.ts#L91) calls LifeSim, then its render
   sync boundary, then updateTargets. At the pin,
   [LifeSim.update](../../src/world/life/LifeSim.ts#L169) makes up to three 1/15 s
   steering decisions, integrates live agents, then runs population passes.
   Birth-frame integration remains 4030's scope.
4. [integrate](../../src/world/life/steer.ts#L669) advances XYZ, applies the
   ceiling and then the floor. [Publication](../../src/world/life/Life.ts#L162)
   copies the **selected** agent's final XYZ into the cached species target.
   Selection may legitimately switch individuals. It rebuilds the same array;
   [registration](../../src/app/systems/life.ts#L84) hands it over once, and
   [Scanner](../../src/game/Scanner.ts#L236) retains that array by reference.
5. The actual [discovery hook](../../src/app/systems/discovery.ts#L57) passes
   current pilot position/forward and held Scan to
   [Discovery.update](../../src/game/Discovery.ts#L263), which calls Scanner
   with `f.steps * f.fixedDt`. Life's variable dt and Scanner's fixed-step time
   need not match; this audit uses one 1/60 s step per frame.
6. [Scanner.geometry](../../src/game/Scanner.ts#L506) computes distance from
   current target XYZ, not a cached birth pose or previous-frame vector. Target Y
   contributes to 3D distance, elevation and facing. `minDepthM`, when present,
   gates **pilot depth** `-p.y`; wildlife targets do not set it. ScanView has
   distance/angle fields, not a standalone animal-depth field. The reported
   `depthM = -target.position.y` below is a diagnostic observation, not invented UI.

For sonar, [waypoints](../../src/app/systems/waypoints.ts#L30) supplies
`discovery.pois` and a live scanned-state callback. [Explore](../../src/app/systems/explore.ts#L269)
provides proximity-filtered secrets and available anchored-event contacts as
anonymous faint contacts. It does not supply Life.targets. Even a whale event
is a separate anchored event, not a moving LifeSim whale.
[sonarSystem](../../src/app/systems/sonar.ts#L50) sets the mission objective and
updates using the current submarine state. [Ordinary contact distance](../../src/ui/Sonar.ts#L918)
is XZ `hypot`; faint projection also reads XZ. Neither path consumes animal Y or
an animal-depth value. Bathymetry is terrain data. The separate
[audio sonar ray helper](../../src/audio/Sonar.ts#L26) intersects terrain, not
animals; no runtime wildlife contact caller was found there either.
No sonar drawing diagnostic or new contact policy is needed.

## Disposable numeric diagnostic

Harness `/tmp/4060-publication.mjs`, final SHA-256
`b216dbc09cd36f3c909249ce49150422261669f60a42b95c87e0b1a7f566967c`.
It uses Vite SSR with config disabled and cache under `/tmp`, not a listening
preview server. Both controls use the complete parsed shipped Blue Hole table,
High life tier, seed **7**, fresh **mulberry32(7)**, **7,800 × 1/60 s = 130 s**.
The naturally admitted original reef shark remains alive/nonleaving in its
original group throughout. No animal position, velocity, scheduler, probability
or species definition is overwritten. No spawn/seed/site sweep is repeated.

Sub is stationary at `(0,-8,0)`, zero velocity, lights off, hull radius 7.
Forward starts at `(0,0,-1)`. From zero-based frame **6600**, aim follows the
original shark's previous completed pose and Scan stays held. Aim is an input
fixture, not piloting/physics validation; it does not require knowledge of the
next integrated pose. Other naturally eligible animals retain normal priority
and can complete before the shark. Resolved default **Arcade** scan settings
come from `defaultSettings(makeConfig()) → resolveEffective`, including the
100 m floor. There are no fixed POIs or supplemental contacts in this isolated
wildlife-consumer fixture; their priority is covered by gameScanner.

The real `Life.update`, `LifeSim.update`, steering/integrate, target selection,
SystemRunner, discovery frame hook, `Discovery.update`, Scanner and EventBus
execute. Life/Discovery are prototype-backed CPU fixtures: constructors that
create scene/DOM objects are omitted; render.sync, overlay, guide/footer and
stats side effects are no-ops; camera projection is omitted. Life's production
world-hook argument setup is traced above; the harness calls Life.update from
its `world.life` adapter. It does not instantiate the whole app, native UI or
sonar. The `guide.sonar` observer is instrumentation, not Sonar.update.

The observed order is exactly `world.life: life-no-draw` →
`scan.discovery: discovery` → `guide.sonar: observe`. Every publication compares
XYZ against the selected agent in Life's species cache, including legitimate
individual switches. Held-scan observations additionally compare actual
`nearestDistance`, `activeDistance` and `nearestVertDeg` to current coordinates
and pilot forward (1e-12 numeric comparison tolerance). Coordinate error is
exactly zero; no existing assertion or tolerance is changed.

| Result                                                                | Ordinary feasible column | Explicitly synthetic conflict control    |
| --------------------------------------------------------------------- | ------------------------ | ---------------------------------------- |
| Ground function                                                       | `-max(6,15+0.3*x)`       | Retained 3970/4000 `-max(0.25,15+0.3*x)` |
| Selected reef-shark publications                                      | 7,800                    | 7,800                                    |
| Maximum XYZ publication error                                         | 0 m                      | 0 m                                      |
| Original shark floor-contact/conflict frames                          | 0 / 0                    | 1,258 / 1,258                            |
| Original shark X displacement                                         | -92.89592566533761 m     | -92.82285913691015 m                     |
| Shark scan start → completion, zero-based frame                       | 6842 → 7033              | 7108 → 7299                              |
| Pre-completion scanning observations                                  | 191                      | 191, all during original-shark conflict  |
| Maximum current-versus-prior-position distance difference during scan | 0.021219688284190852 m   | 0.01713233759327437 m                    |

Each run emits exactly one reef-shark scan start and one completion. The
nonzero prior-position differences make the numeric comparison nonvacuous:
current-frame Scanner values match the integrated pose, even when a previous
completed-frame distance would differ. No frame-order discrepancy is observed
through held Scan, and no earlier-than-consumer refresh requirement is imposed.

Exact sample coordinates (metres; actual selected agent = published = expected):

- Feasible frame **6842**: `(-44.72645781113474, -1.6254071927955374,
21.005690176386494)`. Observed target depth `1.6254071927955374`;
  floor `-4.718241009005578`, ceiling `-1.6254071927955374`.
  Scanner nearest = active = **49.82299149564605 m**;
  vertical angle **-0.003149380364217745°**; progress `0.005208333333333333`.
- Synthetic frame **7108**: `(-47.91891797533127, 0.6574343835938017,
25.736535167195992)`. Floor = Y = **0.6574343835938017**,
  nominal ceiling `-1.6254071927955374`; observed target depth
  **-0.6574343835938017**. Scanner nearest = active = **55.07760990134806 m**;
  vertical angle **0.0005270346713590721°**; same initial progress.
  Positive Y/negative depth here is the explicitly accepted floor-wins outcome
  in impossible synthetic water, not stale publication or a new habitat defect.

Both terrain functions are synthetic. The first represents an ordinary feasible
water column; neither is a GMRT/natural-play witness. Shipped code, table,
species and input action are exercised, but **no shipped-site defect is
established**. 4030's separately reported real-site conflicts remain its evidence.

## Commands and actual outcomes

- `git rev-parse HEAD`, `git status --short`, `git worktree list --porcelain`,
  per-tree `git diff --stat HEAD` and merge-base-relative committed-path
  inventories: exit 0; clean pin and disjoint ownership as recorded above.
- `npm test -- --configLoader runner --cache=false tests/unit/lifeDisposal.test.ts tests/unit/lifeSim.test.ts tests/unit/gameScanner.test.ts tests/unit/uiSonar.test.ts tests/unit/sonarFlat1250.test.ts tests/unit/sonarPalette1200.test.ts tests/unit/appSystems.test.ts > /tmp/4060-capabilities.log 2>&1`:
  **exit 0; 7 files / 187 tests passed**, 3.64 s. No skips, expected failures
  or assertion failures in this focused selection. The four collision expected
  failures are outside this selection and untouched.
- `node /tmp/4060-publication.mjs > /tmp/4060-publication.log 2>&1`:
  final **exit 0**, both controls and all assertions above pass. Log contains
  JSON counts, event frames and three coordinate/distance samples per control.
  Harness development had exit-1 fixture failures: omitted effective scan floor,
  legitimate competing-animal selection, comparison against the original rather
  than selected individual, an unjustified feasible-control floor-contact
  expectation, and a wrong `defaultSettings` argument. These are not product
  failures or failing-before/fixed-after evidence. The final fixture preserves
  selection policy and requires floor contact only in the conflict control.
- `npx prettier --write plan/progress/4060-S-bughunt-scan-after-floor.md`, then
  `npx prettier --check plan/progress/4060-S-bughunt-scan-after-floor.md` and
  `git diff --check`: **exit 0**, formatting and whitespace checks pass.
- `git diff --no-index --check /dev/null plan/progress/4060-S-bughunt-scan-after-floor.md`:
  **exit 1 with no diagnostics**, the normal added-file status; no whitespace
  errors. Final HEAD and all registered ownership inventories are unchanged;
  this checkout contains only the named untracked report.

## Simplicity and validation limits

Net simpler: a cited clean report, zero runtime/test/fixture/data changes and no
new permanent test or abstraction. No UI/guidance surface, setting, layout patch,
site branch, config mutation, dependency, schema, retry, skip, timeout, budget or
snapshot change. Correct current-position scans protect simple, rewarding and
honest exploration. Real GMRT terrain, all 13 site identities, five heroes,
scanning, Journal, marine life, keyboard/pad/touch input, accessibility and
Arcade default are preserved.

No whole-repository gates, build, Python suite or hosted-CI operation was run
for this report-only slice. No collection, commit, merge, push, tag or workflow
dispatch. **Actual local e2e mode: none.** No browser, WebGL/GPU context, game
rendering, screenshot, pixel acceptance, unaided journey, native screen-reader
behavior or real-phone validation. Existing sonar specs run CPU/fake-canvas
numeric assertions only. Visual readability, beauty, touch layout and physical
phone performance remain with Claude/owner. The single-seed/timestep synthetic
probe does not establish encounter frequency, natural piloting, every species,
every frame partition or behavior after uncollected patches.
