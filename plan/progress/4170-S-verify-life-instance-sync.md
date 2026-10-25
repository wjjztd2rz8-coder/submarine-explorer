# 4170 — S-verify: life CPU instance publication

2026-10-25. DIRECTOR Backlog **7, S-verify / S-bughunt [Codex, standing]**.
Audited SHA: **`b7f3ca59fdc4e404b5b8672a2eb4e5b1a420c4e8`**; initially clean.

**Clean handoff check.** Actual CPU LifeRender/Three objects publish completed
simulation positions and life attributes through ordinary births, completed
fades and same/cross-species pool-slot reuse. **5,650 sync checks and 460,913
active instance observations passed**, with no stale active entries, nonfinite
active buffers or capacity overflow. No supported failure or correction is
proposed. Only this note changes. **Local e2e mode: none. No visual verdict.**

## Intake and ownership

Read CONTRIBUTING-AGENTS.md; DIRECTOR's [Backlog 7](../DIRECTOR.md#backlog),
seven simplicity rules and rubric; the newest dated REVIEWS entry,
[2026-10-25 comprehensive](../REVIEWS.md#2026-10-25-comprehensive-review-claude-alone-golden-2026-10-25-125617)
(below the older leading preamble); OVERNIGHT-LOG through run 145; relevant
4030/4060/4100 and 4150–4170 launched briefs and available results. No applicable
AGENTS.md was found; `.agents`/`.codex` are empty. The explicit report-only,
headless brief supersedes the generic full-gate/browser instructions.

Inventoried registered worktree HEADs, staged/unstaged changes, untracked paths
and committed paths from each merge base. Initial inventory included finished
4120–4140 awaiting collection; the 12:25 CDT recheck found them collected on
main, which had advanced to `c4c6d2a9` with only their reports and OVERNIGHT-LOG.
The pinned checkout and source stayed unchanged. Main's new run 146 reports
4150–4170 running; launcher records identify this as the sole 4170 assignment.
4150 and 4160 each own their separate untracked report. Queued 4180 save,
4190 audio and 4200 Journal briefs do not own instance publication; no queued
hold files or duplicate completed 4170 result were present.

Held 2980/3050 retain collision changes; 3310 has committed journey/Scanner/UI
changes; 3320/3340/3380 retain their separate notes/e2e changes. None is collected,
used or changed here. The four collision expected failures remain untouched.
Inventory retained at `/tmp/4170-ownership.json`. Direct service enumeration
failed with `Failed to connect to bus: Operation not permitted`; running-state
evidence therefore comes from the launcher, task artifacts and director log,
not a successful service query. No access workaround was attempted.

## Boundary and existing coverage, mapped before diagnostics

- Collected **4030**, exact commit
  `eb2f9f10943fac04ca855f0e77c3df39caa48b5d` (merged by `66bf63ac`), moves the
  existing integration/release loop after population passes and adds one
  [birth-frame capability guard](../../tests/unit/lifeSim.test.ts#L304).
  [Its report](4030-S-verify-life-clamp-shipped.md#small-defect-found-and-fixed)
  explains births now move/fade immediately and completed fades release after
  admission. The report's water sweep does not inspect instance buffers.
- [4060](4060-S-bughunt-scan-after-floor.md) audits selected scan positions on
  its older `d7a02fd7` pin, before 4030 was collected. Its retained
  `/tmp/4060-publication.mjs` explicitly substitutes `render: { sync() {} }`.
  It supplies Scanner evidence, not actual LifeRender construction or packing.
- **4100 has no progress note or result wrapper.** OVERNIGHT-LOG run 143 records
  completion without a note, no budget violations and re-entry count differences
  up to 43, not treated as a defect. Its available `4100-S-verify-sonar-and-scan-low-tier-r1.log`
  in main's `.cache/codex/` (lines 5433–5457) and retained
  `/tmp/life-budget-summary.txt` contain simulation count/cost observations.
  Neither establishes this buffer handoff. No count comparison is repeated.
- [lifeTables](../../tests/unit/lifeTables.test.ts#L35) guards catalogue values,
  shipped rows, spawn selection and tier limits. `species.test.ts` covers
  species/Journal record parsing and loading, outside this handoff. Neither
  asserts active instance translations or `iLife` correspondence.
- [lifeSim](../../tests/unit/lifeSim.test.ts#L76) covers population, departures,
  stable cells, steering, rare admission and caps. Its
  [camera proximity guards](../../tests/unit/lifeSim.test.ts#L688) already build
  real Life/Three objects, check finite matrices in a Low all-species scale
  sweep and frozen blue-tang scaling across all sites/tiers. Their controlled agent poses and
  zero-dt calls do not trace positive-dt birth/release/reuse publication.
- [lifeDisposal](../../tests/unit/lifeDisposal.test.ts#L93) covers loaded/pending
  lifecycle, target storage and the loaded-prop gate. It does not compare active
  matrices/life attributes across pool generations. No disposal audit is added.

The current caller sends [zero dt when frozen](../../src/app/systems/life.ts#L119),
with normal frame dt capped at 0.25 s by [Time](../../src/core/Time.ts#L27).
[Life.update](../../src/world/life/Life.ts#L82) skips simulation only at zero dt,
then always syncs when enabled. [LifeSim.update](../../src/world/life/LifeSim.ts#L157)
runs all population passes before integration; false from integrate calls
release before update returns. [integrate](../../src/world/life/steer.ts#L673)
reduces leaving fade and returns false at fade ≤ 0. Released Agent objects are
pushed onto the free stack and [acquired again](../../src/world/life/LifeSim.ts#L230).

[Sync](../../src/world/life/LifeRender.ts#L140) selects `alive && fade > 0.002`,
packs each species in pool order, writes matrix translation from completed XYZ,
and publishes `iLife = (phase, 0, clamped glow)`. Sessile Y includes the documented
sediment seating offset. It sets count and visible even when a species becomes
empty, then marks active attributes for upload. [speciesMesh](../../src/world/life/speciesMesh.ts#L25)
allocates actual InstancedMesh matrices and a three-component Float32 `iLife`
attribute at `min(def.maxCount, tier.maxAgents)` capacity. [Life.clear](../../src/world/life/Life.ts#L203)
clears simulation and rendering; [render.clear](../../src/world/life/LifeRender.ts#L217)
immediately sets every retained mesh's count to zero and hides it.

## Disposable CPU observations

`/tmp/4170-instance-sync.mjs` loads pinned source through Vite SSR, with its cache
under `/tmp`, middleware mode, no watcher/HMR/socket server. It constructs actual
Life, LifeRender, Scene, PerspectiveCamera, InstancedMesh, geometry, material and
InstancedBufferAttribute objects. No render boundary is stubbed. No
WebGLRenderer or WebGL context is constructed, and no draw/compile method runs.

Three 60-second controls use the **unchanged parsed Great Blue Hole table**,
seed 7 and `mulberry32(7)`. The synthetic ground is flat Y=-35 m. Pilot Y=-20,
Z=0; X=`max(0, frame * dt - 2) * 3`, with zero reported wash speed, lights off,
forward -Z and hull radius 6. Camera is `(0,-20,20)`, FOV 60, height 800 and fog
density zero. Position increments stay below the teleport threshold. These are
controlled publication inputs, not shipped-terrain or natural-play witnesses.
There are no authored population hooks or prop masks.

| Tier / dt     | Updates | Births after initial fill | Completed leaving fades | Same / cross-species reused slots | Frames with changed packed indices | Peak active |
| ------------- | ------: | ------------------------: | ----------------------: | --------------------------------: | ---------------------------------: | ----------: |
| Low / 1/60 s  |   3,600 |                        95 |                      56 |                           49 / 32 |                                 24 |          44 |
| High / 1/30 s |   1,800 |                       120 |                     128 |                           61 / 59 |                                 53 |         180 |
| Low / 0.25 s  |     240 |                        73 |                      60 |                           48 / 11 |                                 28 |          44 |

Counts are sampled lifecycle events, not population equivalence assertions.
Natural runs observe reef shark, French grunt, brain coral, whale shark, blue
tang, stoplight parrotfish, Nassau grouper and comb jelly across the controls;
not every species occurs in every run. Normal mover and rooted births, partial
fades, actual release, reuse and changed packing are present in all three runs.

After each sync, independently enumerate eligible pool agents by species and
compare every active index with the corresponding live Agent. Require exact
counts/visibility, allocated capacities, finite active matrix/life components,
and exact Float32-rounded mover XYZ, phase and glow. For sessile Y, obtain scale
from Three's `Matrix4.decompose` on the published matrix and allow the existing
`0.1 * scale * max(0.5, size)` seating offset, with 0.00002 m arithmetic tolerance.
Maximum observed seating error is **0.000001913111 m**. No rotation/fade-scale
formula is duplicated as an oracle, no artistic scale is frozen, and unused
buffer entries need not be zero. Active counts always equal the eligible set;
released or below-threshold entries cannot remain active.

Representative zero-based frames from the retained JSON log:

- **Normal mover birth:** Low/1/60, frame 1223, French grunt slot 9, group 15,
  fade `0.011904761904761906`. Completed sim XYZ
  `(72.37545057264865, -12.257043447236224, -26.010290011741816)` publishes at
  instance 8 as `(72.37545013427734, -12.257043838500977, -26.010290145874023)`.
  Phase `0.15363241025328872` becomes `iLife.x=0.15363241732120514`; count 13,
  visible true. This is normal replenishment, not a preview/rare birth.
- **Release and compaction:** High/1/30, frame 440, blue tang slot 73/group 7
  goes from leaving/fade `0.023809523809523` to dead/fade approximately
  `-8.12e-16`. The mesh retains 28 eligible animals. Surviving slot 74 moves
  from packed index 13 to 12; its new translation and phase match its own
  completed sim state, not the released neighbor's.
- **Cross-species reuse:** frame 467 of that run reuses the same slot 73 as
  brain coral/group 80, fade `0.02380952380952381`, instance 0. Sim
  `(141.31581894612114, -35, 47.23105235450172)` publishes
  `(141.31582641601562, -35.00516891479492, 47.23105239868164)` with the seated Y.
  Its new phase `1.92882478875987` becomes `iLife.x=1.928824782371521`; count 62,
  visible true. The old tang pose/phase is absent from this active slot.

Small public-hook controls use `spawnNear` with no table: three comb jellies,
then their full supported capacity **28**, then **44** brain corals at the Low
pool limit. All 28 jelly slots change species; the jelly mesh becomes count 0,
visible false while coral is count 44, visible true. A public `render.flash(a,
0.7)` followed by a real 1/30 s update yields glow `0.6526756739341637`, published
as `iLife.z=0.6526756882667542`, exercising nonzero attribute refresh.

Clear immediately hides retained meshes. A frozen update neither advances sim
elapsed/state nor repopulates; positive-dt normal table population then admits
42 agents in the Low/1/60 control. In the separate public-hook control,
clear/repopulate reuses the existing jelly mesh with count 1 while coral stays
hidden/count 0. Moving the camera onto that jelly at dt=0 changes the matrix
basis while preserving translation, every captured Agent field and sim elapsed.
These are small caller/clear controls; no additional all-site camera matrix is introduced.

## Commands and actual outcomes

- `git rev-parse HEAD`, `git status --short`, `git worktree list --porcelain`,
  per-tree `git status --short`, `git diff --stat HEAD` and merge-base-relative
  committed-path inventories: exit 0. Ownership rechecked as above. The first
  inventory-saving helper rejected historical brief prefix `1392b` with a
  Python `ValueError`; correcting only that disposable sorting helper produced
  `/tmp/4170-ownership.json`. No repository Python failure was repaired.
- `npm test -- --configLoader runner --cache=false tests/unit/lifeTables.test.ts tests/unit/lifeSim.test.ts tests/unit/lifeDisposal.test.ts > /tmp/4170-capabilities.log 2>&1`:
  **exit 0; 3 files / 90 tests passed**, 3.21 s; no skips or expected failures.
  Existing CPU shader-hook string assertions do not compile GPU shaders.
- `node /tmp/4170-instance-sync.mjs > /tmp/4170-instance-sync.log 2>&1`:
  **final exit 0**, all assertions pass, 5,650 checks / 460,913 active instances.
  Initial harness construction exited 1 on an `instanceof` assertion because
  Vite's separately loaded Three module had a different constructor identity;
  importing the same installed native Three module as the source resolved the
  harness issue. No product path was stubbed or changed. An intermediate
  successful run preceded the final added event/glow observations.
- Retained harness SHA-256:
  `c3c6bf24e69a140b236ea40be1201e84bbe74897b36d0e6abd9cf4baf51acb2a`;
  final JSON log:
  `8eddcb53a2473910445d28aa82eaf1402b496fd6b6cffdde84dbb68f768c3d09`.
- `npx prettier --write plan/progress/4170-S-verify-life-instance-sync.md`,
  `npx prettier --check plan/progress/4170-S-verify-life-instance-sync.md` and
  `git diff --check`: exit 0. Added-file whitespace inspection with
  `git diff --no-index --check /dev/null plan/progress/4170-S-verify-life-instance-sync.md`
  reports no whitespace diagnostics (exit 1 is the added-file difference).

Historical 4030/4060 wrappers label smoke/project-base gates PASS, while their
underlying reports distinguish headless results and limitations, including
4030's separate Python failures. Those wrapper/orchestrator labels, and run
146's release/hosted claims, are not validation performed by this audit.

## Simplicity and limits

Net simpler: one clean evidence note; zero production/test/data/config/dependency
changes, no permanent test or abstraction. All seven simplicity rules are
preserved: no new screen/guidance surface, setting, layout patch, site branch,
runtime config mutation or code package marker. No assertions, tolerances,
budgets, skips, snapshots or product policies change. Correct current-state
publication supports simple, rewarding and honest exploration without adding
player-facing machinery. GMRT terrain, 13 site identities, five heroes,
scanning, Journal, marine life, all input modes, accessibility and Arcade default
remain unchanged.

This establishes CPU data correspondence at the pinned handoff for the sampled
lifecycle transitions. It does not prove every species, seed, timestep partition
or terrain combination. Medium and all-species frozen scaling retain existing
coverage; no water sweep, authored-opening staging, mask integration, Scanner/
Journal linkage, resource inventory, geometry audit or disposal expansion is
performed. No implementation or proposed speculative correction is needed.

No repository-wide gates, build, Python suite or local e2e are needed or run.
No browser, game rendering, shader compilation, pixels, hosted workflow operation,
GPU/phone-performance inference, unaided journey or real-phone validation.
**Actual local e2e mode: none.** Beauty, visual readability, touch layout and
physical-phone acceptance remain with Claude/owner. No merge, push, tag,
collection or changes to tools/ or DIRECTOR.md were made.
