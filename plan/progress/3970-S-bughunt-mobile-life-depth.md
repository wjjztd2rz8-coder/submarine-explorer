# 3970 — S-bughunt: moving marine life at depth and terrain limits

Audited HEAD: `ddcaaac5c141473ba4823e85a675384f2e27d887` (2026-10-25).
DIRECTOR Backlog **7, S-verify / S-bughunt [Codex, standing]**.
Report only; this note is the only repository change.

**One synthetic runtime defect reproduced:** a normally swimming reef shark
crosses onto a shoal where its hard floor exceeds its hard ceiling. Integration
applies the floor, then overwrites it with the ceiling; the shark remains alive
and eventually ends below the seabed. This is a shipped-code failure on a finite
synthetic heightfield, **not a demonstrated shipped-site or natural-play defect**.
Feasible-water probes and one survey-backed ordinary-update control pass. No
production correction, test change or passing-after claim.

## Intake and ownership

Read CONTRIBUTING-AGENTS.md; DIRECTOR Backlog, seven simplicity rules and rubric;
REVIEWS' newest dated entry (2026-10-24 night, ahead of the older leading entry);
OVERNIGHT-LOG through run 133; launched 3610, 3800, 3840 and 3930–3980 briefs;
3610/3840/3930–3950 result wrappers; and the relevant progress evidence:
[3800](3800-S-bughunt-spawn-determinism.md),
[3830](3830-life-rooted-final-depth.md),
[3840](3840-S-verify-life-rooted-depth.md),
[3610](3610-S-bughunt-rare-life-capacity.md), plus the uncollected 3930 coral,
3940 resolver and 3950 settings notes in their own worktrees. No separate 3830
brief/result artifact was found in the launched/result inventory; its collected
note records the repair and outcomes. The 3800 last-report file is empty; its
collected progress note supplies the result. No applicable AGENTS.md found.

Pinned an initially clean checkout; inspected every registered worktree's HEAD,
status, uncommitted paths/statistics and unique committed paths from its merge
base with the pin. Rechecked before writing and at completion. None owns this
motion slice or this note. Finished 3930 owns its `3910` report; 3940 owns
EffectiveSettings, its capability spec and S-resolve note; 3950 owns its report.
3960 owns props/dailyBoot, and 3980 owns its CI report. Held 2980/3050 collision
changes, 3310's committed journey/Scanner/UI work, 3320/3380 reports and 3340's
touch spec/report remain untouched. No patch was collected or used. The exact
slice is distinct from the collected rooted-placement and rare-capacity work.

Earlier wrappers report smoke gates PASS, while 3610/3840 notes also record local
failed headless gates and separately attributed orchestrator outcomes. None is
validation of this checkout. This package runs only the commands below.

## Caller and constraint map, established before new probes

Life uses the real parsed site table and terrain callback at
[systems/life.ts:62](../../src/app/systems/life.ts#L62), waits for optional props,
and passes `f.frozen ? 0 : f.dt` at
[life.ts:119](../../src/app/systems/life.ts#L119).
[loop.ts:91](../../src/app/loop.ts#L91) sets `f.dt = time.frameDelta`;
[Time.ts:28](../../src/core/Time.ts#L28) defaults to a **0.25 s** maximum and
[Time.tick:45](../../src/core/Time.ts#L45) clamps negative deltas to zero.
[Life.update:91](../../src/world/life/Life.ts#L91) calls the sim only for positive
dt. Thus supported sim input is **0 < dt <= 0.25**, not the submarine's fixed
1/60 physics step. Life's gate reads `f.frozen`, not `clockDt`/`resumeFrame`;
this report makes no additional pause/resume-clock claim.

[LifeSim.update:157](../../src/world/life/LifeSim.ts#L157) accumulates at most
0.25 s for steering, runs at most three **1/15 s** decisions per frame, then
integrates each live agent once with the supplied frame dt. Population/despawn/
rare passes run afterward. At the cap, decisions can drop accumulated backlog;
no identical trajectories across frame partitions are promised. The probe seed
is explicitly `seed:7, rand:mulberry32(7)`; the runtime normally defaults the
random stream to `mulberry32(0x5eed)`. `lifeSeed` supplies the separate cell seed.

| Constraint                             | Source contract / behavior                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Existing guard and remaining gap                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Species and site depth bands           | [types.ts:55](../../src/world/life/types.ts#L55) calls species depth a **plausible placement band**; [SpawnEntry:89](../../src/world/life/types.ts#L89) calls the site band a **placement band**. [entryBand:137](../../src/world/life/tables.ts#L137) intersects them; [spawnMobile:409](../../src/world/life/LifeSim.ts#L409) uses the intersection for admission.                                                                                                                              | [lifeTables:75](../../tests/unit/lifeTables.test.ts#L75), [87](../../tests/unit/lifeTables.test.ts#L87), [113](../../tests/unit/lifeTables.test.ts#L113), [152](../../tests/unit/lifeTables.test.ts#L152): table/parser/intersection/selection guards. [lifeSim:109](../../tests/unit/lifeSim.test.ts#L109) allows 15 m slack for school/drifter survivors after 30 s in one fixture. No strict permanent swimming fence is established. |
| Depth guidance during motion           | [applyBounds:101](../../src/world/life/steer.ts#L101) eases toward row/species intersection, bounded to 1.5 m/s desired correction, before acceleration. Hover/swarm skip that correction. [pickGoal:284](../../src/world/life/steer.ts#L284) selects school/hover goals over ground; it can prefer ground when the goal interval is empty.                                                                                                                                                       | Hard-flight and depth guards do not prove exact per-frame band containment; the implementation does not promise it. Excursions alone are not classified as defects.                                                                                                                                                                                                                                                                      |
| Bottom-following altitude              | [isBedBound:157](../../src/world/life/tables.ts#L157): hover, swarm and cephalopods **with altitude** admit near the seabed's band, with existing 4 m admission slack. [Agent.alt:44](../../src/world/life/agent.ts#L44) is a **preferred altitude**. [stepBed:458](../../src/world/life/steer.ts#L458) tracks it; [stepSwarm:575](../../src/world/life/steer.ts#L575) chooses ground-relative targets. Crawlers seat on the final ground at [integrate:691](../../src/world/life/steer.ts#L691). | [lifeSim:404](../../tests/unit/lifeSim.test.ts#L404) covers shrimp attraction; [428](../../tests/unit/lifeSim.test.ts#L428) covers wash; hard flying exercises mixed archetypes. No hard altitude interval during slope crossing is promised. Crawlers bypass applyBounds and follow terrain rather than a permanent placement-band fence.                                                                                               |
| Hard water clearance and finite motion | [integrate:690](../../src/world/life/steer.ts#L690): noncrawler mobile floor = ground + max(0.12, L/4), ceiling = -0.6 - L/5, where L = size × visScale × individual scale.                                                                                                                                                                                                                                                                                                                       | [lifeSim:304](../../tests/unit/lifeSim.test.ts#L304) runs 120 s at 1/60 with hard flying, then checks **final survivors**, ground without body clearance, submerged state, finite state and speed. It does not inspect every frame or conflicting hard limits. This is the material probe gap.                                                                                                                                           |
| Rare passes                            | [rareTick:693](../../src/world/life/LifeSim.ts#L693) tests **sub depth** against the rare rule, cooldown, concurrent group and probability. [placePasser:449](../../src/world/life/LifeSim.ts#L449) uses band/species depth, overhead/level positioning, then ground/surface adjustment. Rare groups have `row:null`, so ongoing depth correction uses **species depth**, not a permanent rare-rule fence. Swarm and other-cephalopod rares use their existing separate placement paths.          | [lifeSim:479](../../tests/unit/lifeSim.test.ts#L479) and 3610 cover actual shipped admission/release/capacity; [584](../../tests/unit/lifeSim.test.ts#L584) covers an overhead whale crossing at 1/30. No rare capacity or frequency investigation repeated.                                                                                                                                                                             |
| Rejection and release                  | [spawnMobile:429](../../src/world/life/LifeSim.ts#L429) rejects unsuitable candidate ground/empty free-swimmer intervals. [integrate:678](../../src/world/life/steer.ts#L678) returns false for completed fades; [update:183](../../src/world/life/LifeSim.ts#L183) releases through [release:233](../../src/world/life/LifeSim.ts#L233). [despawnPass:659](../../src/world/life/LifeSim.ts#L659) checks distance/age, not local column feasibility.                                              | Existing capacity/departure tests prove the supported release machinery. There is **no existing impossible-column release check** in motion. Its absence is not separately treated as a promised habitat-release policy.                                                                                                                                                                                                                 |
| Fixed-rate decisions                   | [LifeSim.ts:37](../../src/world/life/LifeSim.ts#L37) defines TICK; update limits work as above.                                                                                                                                                                                                                                                                                                                                                                                                   | [lifeSim:604](../../tests/unit/lifeSim.test.ts#L604), despite its broad title, only asserts `TICK == 1/15`. It does not compare trajectories or count decision calls. No new equivalence requirement added.                                                                                                                                                                                                                              |

3800/3830/3840's rooted six-metre final-placement assertions remain sufficient
for their owned slice and were not probed again. lifeTables' sanity guards do
not imply every depth of every species is inhabited at every site.

## Disposable feasible-water probes

All scripts/logs are under `/tmp/3970-*`. Vite SSR loads unchanged modules using
`configFile:false`, `cacheDir:'/tmp/3970-vite-cache'`, middleware mode,
`watch:null`, `hmr:false`, `ws:false`, `optimizeDeps.noDiscovery:true`. There is no
listener, browser, WebGL context or game rendering. Node is **v22.23.2**.

`/tmp/3970-motion.mjs` selects **one unchanged parsed row** per run as
`table:{spawns:[row.entry]}`, without rares or optional opening population.
Definitions, weights, group ranges and star flags are unchanged. The isolated
table rebuilds the row index as zero; original authored indices in the table
below are 0, 2, 1, 4, 6, 3, 0, 4 respectively. This is intentionally isolated
terrain evidence, including for the cell-placed crawler. This isolates
motion, not natural population composition or spawn determinism. All use High,
cell seed **7**, fresh **mulberry32(7)**, **120 s**, and each of **dt=1/60,
1/30, 0.25** (7,200 / 3,600 / 480 frames). Sub is stationary at `(0,-depth,0)`,
velocity zero, forward `(0,0,-1)`, lights off, `hullR=7`; no current/blocked callback.
Ground is `-max(6,min(D+35,max(D-35,D+s*x+0.4*s*z)))`, with **s=0 and 0.25**.
These are flat/bounded sloping fixtures, not GMRT site acceptance. Exactly
**48 runs** use one seed and one selected edge per row, not a spawn/seed matrix.

| Site / unchanged row       | Archetype                   | Species depth; site depth (m) | weight; group; star | Preferred altitude (m) | Sub depth; D (m) |
| -------------------------- | --------------------------- | ----------------------------- | ------------------- | ---------------------- | ---------------- |
| Monterey / pacific-hake    | school                      | [150,900]; [150,900]          | 2.5; [10,18]; true  | —                      | 150; 170         |
| Monterey / nanomia         | drifter                     | [100,800]; [100,800]          | 4; [3,8]; absent    | —                      | 798; 820         |
| Monterey / sablefish       | hover                       | [200,2800]; [200,2800]        | 1.5; [2,4]; true    | [2,6]                  | 194; 202         |
| Monterey / sun-star        | crawler                     | [150,1050]; [150,1050]        | 14; [1,5]; absent   | —                      | 1040; 1048       |
| Monterey / vampire-squid   | cephalopod without altitude | [500,1500]; [500,1500]        | 1; [1,1]; absent    | —                      | 1496; 1508       |
| Hudson / deepwater-octopus | cephalopod with altitude    | [300,3200]; [300,1700]        | 1.2; [1,1]; true    | [0.2,2.5]              | 294; 302         |
| Beebe / beebe-shrimp       | swarm                       | [4600,5100]; [4600,5100]      | 3; [30,70]; true    | [0.1,2.2]              | 4594; 4602       |
| Blue Hole / reef-shark     | cruiser                     | [2,60]; [2,60]                | 1; [1,1]; true      | —                      | 5; 20            |

At **5,549,760 live-agent post-update observations**, every numeric agent field
is finite and every applicable floor/ceiling check passes, including newly
spawned agents. **5,548,284** observations also have a prior live observation in
the same group with advancing age; this separates integration from creation.
Crawlers have exact ground seating. Each row actually moves: maximum tracked
horizontal travel ranges from **8.69 m** (nanomia) to **155.39 m** (reef shark).
No identical-trajectory assertion is made across dt values.

Observed maximum excursions beyond the row/species intersection are respectively
**0, 6.2118, 5.2111, 4.1364, 1.5, 1.0634, 0.4799, 0.1565 m**, in table order.
They include placement spread and bottom following; they do not violate a newly
invented permanent depth fence. Shrimp altitude reaches **2.2846 m** versus its
2.2 m preferred upper target, with intact hard clearance. This is a target-tracking
observation, not a hard-altitude defect. No habitat-policy correction is proposed.

## Survey-backed ordinary-update control

`/tmp/3970-survey.mjs` constructs the unchanged **Low** Terrain sampler from
`data/tiles/great-blue-hole/{meta.json,heightmap.bin}`, `makeConfig().terrain`,
and `Terrain(...,'low')`; the CPU objects are disposed afterward. No renderer
is constructed. This includes the shipped survey and site reconstruction/detail,
not a raw-bilinear substitute or a synthetic plane.

Focus `latLonToWorld(meta,17.3156,-87.5356)` is
`(-157.43050033975456,-44.80193984705082)` in x/z. Sub is fixed at
`(-77.43050033975456,-10,-44.80193984705082)`, ground
**-127.44123943871665 m**; zero velocity, forward `(0,0,-1)`, lights off,
`hullR=7.2`. Uses full unmodified Blue Hole table, Low life tier, seed **7** and
fresh **mulberry32(7)**, **7,200 × 1/60 s**. No forced encounter, agent teleport
or controlled rare draw. Reef sharks, French grunts and one naturally rolled
whale-shark rare are observed. **138,327 mobile observations**, zero nonfinite
fields and zero hard-water failures, including new agents.

This is survey-backed evidence through ordinary simulation, not a complete
natural-play session: props, currents, authored opening population and actual
pilot input are omitted. No natural-play failure is established. The synthetic
failure below must not be described as proven at Blue Hole or another real site.

## Synthetic shoal defect and retained reproduction

Full parsed Blue Hole table, High, seed/rand **7**, **dt=1/60**, stationary sub
`(0,-8,0)`, zero velocity, forward `(0,0,-1)`, lights off, `hullR=7`, no optional
populate/current/blocked callback. Terrain is **`-Math.max(0.25,15+0.3*x)`**,
independent of z. It is a continuous finite seabed for finite local coordinates;
the water depth bottoms out at 0.25 m. The agent is admitted normally, starts
clear of the bottom, and crosses by its own steering/integration. No species,
agent pose, velocity, dt, probability or scheduler is overwritten.

`/tmp/3970-shoal.mjs` tracks same pool id **0**, group **1**, reef shark with
**L=5.127035963977687 m**. At **109.033333 s**, x=-40.3005787933317,
floor=-1.6280673710060671, ceiling=y=-1.6254071927955374: both hard constraints
still fit. At **109.05 s**, x=-40.31356802429303, floor=-1.6241706017176678
exceeds the same ceiling; integration leaves y at the ceiling, violating floor
clearance by **0.0012365910778696 m**. The same fish remains alive, nonleaving,
fully faded in. At **115.05 s**, ground=-1.380654244021219 and
**y=-1.6254071927955374**, so even its centre is **0.2447529487743184 m below
actual ground**. At **119.05 s**, x=-48.3956494985114,
z=26.44299439374781, ground=-0.4813051504465804, the centre is
**1.144102042348957 m below ground**, still alive/nonleaving/fade=1.

Production path: `createLifeSystem → Life.update → LifeSim.update → tickGroup /
stepCruiser → integrate`. The hard-floor assignment at
[steer.ts:695](../../src/world/life/steer.ts#L695) is overwritten by the surface
assignment at [701](../../src/world/life/steer.ts#L701). There is no feasible y in
this interval. Existing candidate rejection protects **new** free-swimmer centres;
it does not revalidate a passer's moving local column. Existing fade/distance/age
release does not reject this fish. Merely swapping clamp order would trade a
floor failure for a ceiling failure.

Smallest correction candidate for a production-owning follow-up: before either
hard clamp, detect `floor > ceiling` for noncrawler mobile agents and reject that
integration through the existing `false → LifeSim.release` path. This reuses
supported release bookkeeping and avoids inventing a relocated position or a
permanent species/site depth restriction. **The current code does not promise
this particular release trigger**; the follow-up must explicitly accept extending
rejection to impossible moving columns. No relocation, new fallback altitude,
terrain change or ecology tuning is justified by this report. Nothing is implemented.

Run from the pinned repository root; this self-contained command retains the
minimal runnable reproduction without depending on the disposable harness:

```bash
node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const root=process.cwd();
const {createServer}=await import(pathToFileURL(root+'/node_modules/vite/dist/node/index.js'));
const server=await createServer({root,configFile:false,cacheDir:'/tmp/3970-repro-cache',server:{middlewareMode:true,watch:null,hmr:false,ws:false},optimizeDeps:{noDiscovery:true}});
try {
 const {LifeSim}=await server.ssrLoadModule('/src/world/life/LifeSim.ts');
 const {LIFE_TIERS}=await server.ssrLoadModule('/src/world/life/types.ts');
 const {parseLifeDoc}=await server.ssrLoadModule('/src/world/life/tables.ts');
 const {mulberry32}=await server.ssrLoadModule('/src/world/life/rng.ts');
 const doc=parseLifeDoc(JSON.parse(readFileSync('data/life/life.json','utf8')));
 const groundAt=x=>-Math.max(.25,15+.3*x);
 const sim=new LifeSim({tier:LIFE_TIERS.high,table:doc.sites['great-blue-hole'],seed:7,rand:mulberry32(7),env:{groundAt}});
 const sub={x:0,y:-8,z:0,vx:0,vy:0,vz:0,fx:0,fy:0,fz:-1,speed:0,lightsOn:false,hullR:7};
 const dt=1/60;
 sim.update(dt,sub);
 const a=sim.pool.find(a=>a.alive&&a.def.id==='reef-shark');
 assert.ok(a);
 const group=a.group;
 assert.ok(a.y>=groundAt(a.x));
 for(let frame=1;frame<7143;frame++)sim.update(dt,sub);
 assert.ok(a.alive&&a.group===group&&!a.leaving);
 assert.ok([a.x,a.y,a.z,a.vx,a.vy,a.vz].every(Number.isFinite));
 console.log({time:7143*dt,species:a.def.id,x:a.x,y:a.y,z:a.z,ground:groundAt(a.x),alive:a.alive,leaving:a.leaving});
 assert.ok(a.y>=groundAt(a.x),'A normally moving live shark ends below the seabed');
}finally{await server.close();}
JS
```

Actual independent command `node /tmp/3970-repro.mjs > /tmp/3970-repro.log 2>&1`
exits **1**: `AssertionError: A normally moving live shark ends below the seabed`.
The preceding finite-state, original-group, alive and nonleaving assertions pass.
No repaired-source or passing-after run exists.

## Command outcomes, simplicity and limits

- `npx vitest run --configLoader runner --cache=false tests/unit/lifeSim.test.ts tests/unit/lifeTables.test.ts tests/unit/lifeDisposal.test.ts > /tmp/3970-life-tests.log 2>&1`:
  **exit 0, 3 files / 88 tests passed**, 2.67 s. These are existing capabilities;
  the reproduced synthetic defect is not covered by their assertions.
- `node /tmp/3970-rows.mjs`: **exit 0**, inspected parsed row identities.
- Final `node /tmp/3970-motion.mjs > /tmp/3970-motion.log 2>&1`:
  **exit 0**; counters above, complete data `/tmp/3970-motion.json`.
- Final `node /tmp/3970-shoal.mjs > /tmp/3970-shoal.json 2>&1`:
  **exit 0**, diagnostic measurements above; the independent assertion reproduction
  exits **1**, so this collection command's zero exit is not a correctness PASS.
- `node /tmp/3970-survey.mjs > /tmp/3970-survey.json 2>&1`:
  **exit 0**, survey control above.
- Scratch construction outcomes: the first motion invocation exited **1** on
  `missing hunga-tonga-caldera deepwater-octopus`; selecting its actual Hudson
  row corrected only the scratch harness. The first shoal used slope **0.15**,
  ran 120 s, exited **0** with no crossing witness. The final **0.3** slope
  reaches one. Extending its observation window initially exited **1** on a
  null `tracked.start` dereference; fixing that scratch null guard produced the
  final 119.05 s trace. Two Python summary reads produced no usable summary: the first caught an
  absent motion-output error and exited **0**; the second exited **1** because
  the failed shoal output was not JSON. These are diagnostic
  setup/summary failures, not product failures or passing evidence. No source,
  table, test or tooling repair was made, and no failing suite was retried.
- `npx prettier --write plan/progress/3970-S-bughunt-mobile-life-depth.md`,
  `npx prettier --check plan/progress/3970-S-bughunt-mobile-life-depth.md` and
  `git diff --check`: **exit 0** each. The added note also passes
  `git diff --no-index --check /dev/null plan/progress/3970-S-bughunt-mobile-life-depth.md`
  (**exit 0**), so whitespace in its untracked contents is checked too. Final HEAD remains the audited SHA;
  status contains only this new note. No repository-wide gates, build, Python tooling suite or
  local e2e were requested or run here; wrapper/orchestrator PASS labels are not
  substituted for local results.

**Simplicity:** runtime complexity is unchanged. One evidence note; no new test,
abstraction, per-frame work, guidance surface, setting, site branch, dependency,
schema, UI, tolerance, budget or package marker in code. Accurate, finite wildlife
protects the rewarding exploration/scan/Journal loop. Reporting the synthetic
terrain limitation and soft placement contracts meets the honesty rubric.

Actual local e2e mode **none**. No browser, game rendering, WebGL, screenshot,
pixel/visual judgment, hosted workflow, GPU, unaided journey or real-phone
validation. Beauty, visual readability, touch layout and physical-phone
performance remain with Claude/owner. No production/tests/data/fixtures,
configuration, dependencies, tools, DIRECTOR or other worktree changed. No merge,
push, tag, workflow dispatch or collection; Arcade remains default.
