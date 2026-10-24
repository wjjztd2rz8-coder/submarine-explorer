# 3800 — S-bughunt: marine-life and scatter spawn determinism

DIRECTOR Backlog **9, S-verify / S-bughunt [Codex, standing]**, specifically
**S-bughunt**. Audited checkout: `37a88eade4cd77640dcb78b843d4efe34286d101`.

**One reproduced depth-band defect:** rooted animals validate a cell centre's
depth, but not each animal's final ground position. A finite sloped heightfield
and the unchanged shipped Lost City table produce coral beyond even the existing
six-metre band tolerance. Production is read-only; reproduction and the smallest
proposed correction are below. Seeded replay and pure scatter cell-order checks
pass. No source correction or failing-before/passing-after repair is claimed.

## Intake and ownership

Read CONTRIBUTING-AGENTS.md; DIRECTOR Backlog, simplicity rules and rubric;
REVIEWS' leading targeted entry and newest dated comprehensive entry (2026-10-24
midday); OVERNIGHT-LOG through run 116; launched 3760–3810 briefs; finished
3760–3780 result reports and progress notes; and related
[3610](3610-S-bughunt-rare-life-capacity.md),
[3690](3690-S-bughunt-depth-gauge-bounds.md) and
[3470](3470-S-verify-blake-scatter.md) evidence. No applicable AGENTS.md was found.

Pinned the initially clean checkout; inspected every registered worktree's HEAD,
status, uncommitted changed paths/statistics and committed differences from the
pin. Finished 3760/3770 own presets/biomeFloorVariety plus their notes; their
commits are already incorporated at this checkout. 3780 owns a CI note. Adjacent
3790 save and 3810 scan-target briefs are disjoint; the latter subsequently edits
gamePois. Held 2980/3050 collision changes, 3310 journeys, 3320 full e2e, 3340
touch, 3380 CI and main's presets e2e edit remain untouched. No patches were
copied, collected or depended on. Rechecked HEAD/status and adjacent diffs before
writing. Result-wrapper smoke PASS labels conflict with their embedded failed
headless-gate reports; neither proves this checkout passed.

Existing scatter replay and rooted revisit coverage is adequate for the normal
determinism contract. The band-edge reproduction is distinct from 3610's rare
capacity audit, 3690's submarine/HUD boundaries and 3470's colour propagation.
Only this note changes. The permitted depth/hull capability spec is
[uiHud.test.ts:36](../../tests/unit/uiHud.test.ts#L36); its supported depth-input
contracts already have coverage. No unrelated placement tests are inserted there,
and no new spec, expected-failure case or weakened assertion is introduced.
The uncovered sloped-cell case is retained as a runnable reproduction for a
production-owning follow-up, rather than leaving an intentionally failing suite.

## Existing guards and capability map

| Contract                                                                              | Production guard                                                                                                                                                                                                                                                                                                                                                                                                                      | Existing coverage                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scatter cell placement is independent of calls to other cells                         | [ScatterPlacement.ts:62](../../src/world/scatter/ScatterPlacement.ts#L62) hashes cell coordinates, tile seed and kind; [placeCell:86](../../src/world/scatter/ScatterPlacement.ts#L86) creates a fresh per-kind PRNG for each call. [Terrain.ts:232](../../src/world/Terrain.ts#L232) supplies terrain callbacks, authored biome, tier density and detailSeed XOR site-id hash.                                                       | [biomeFloorVariety.test.ts:77](../../tests/unit/biomeFloorVariety.test.ts#L77) checks repeat equality, different-seed output, all finite instance fields, embedding, scale, slope and exclusions across tiers. [beebeScatter.test.ts:248](../../tests/unit/beebeScatter.test.ts#L248) checks complete replay buffers for wreck-floor streaming.                                                                                                                                                                                                                                       |
| Eviction/revisit retains placement while resource budgets remain bounded              | [Scatter.ts:153](../../src/world/scatter/Scatter.ts#L153) streams nearest missing cells with a two-cell budget; [rebuild:190](../../src/world/scatter/Scatter.ts#L190) applies range, keepouts and per-kind capacity.                                                                                                                                                                                                                 | [beebeScatter.test.ts:319](../../tests/unit/beebeScatter.test.ts#L319) canonicalizes live instances independently of buffer slots; [streaming:339](../../tests/unit/beebeScatter.test.ts#L339) checks two revisit cycles on plane and actual Lost City survey samplers, two seeds and all tiers, finite matrices/colours, embed, range, eviction and capacities.                                                                                                                                                                                                                      |
| Marine life replays for identical table, seed, random stream, environment and updates | [LifeSim.ts:95](../../src/world/life/LifeSim.ts#L95) accepts independent cell seed and PRNG; [fillAround:205](../../src/world/life/LifeSim.ts#L205) populates then settles.                                                                                                                                                                                                                                                           | [lifeSim.test.ts:145](../../tests/unit/lifeSim.test.ts#L145) compares seed replay and different seeds; [population:77](../../tests/unit/lifeSim.test.ts#L77) bounds pools/species. This existing replay rounds coordinates to centimetres; the diagnostic below also compares exact values.                                                                                                                                                                                                                                                                                           |
| Rooted spatial patches are stable on revisit                                          | [cellPass:537](../../src/world/life/LifeSim.ts#L537) hashes cell/site seed/table-row index; [placePatch:610](../../src/world/life/LifeSim.ts#L610) derives patch/member positions from that hash.                                                                                                                                                                                                                                     | [lifeSim.test.ts:161](../../tests/unit/lifeSim.test.ts#L161) checks surviving core locations after travelling away/back, allowing existing radius hysteresis; [186](../../tests/unit/lifeSim.test.ts#L186) checks immobility and ground contact.                                                                                                                                                                                                                                                                                                                                      |
| Valid life tables have finite positive-metre bands, intersected with catalogue bands  | [tables.ts:30](../../src/world/life/tables.ts#L30) rejects nonfinite numbers; [band:33](../../src/world/life/tables.ts#L33) orders and clamps bounds; [entryBand:137](../../src/world/life/tables.ts#L137) intersects row/catalogue. Mobile group centres use that intersection at [LifeSim.ts:410](../../src/world/life/LifeSim.ts#L410); rooted cell centres use a six-metre margin at [582](../../src/world/life/LifeSim.ts#L582). | [lifeTables.test.ts:75](../../tests/unit/lifeTables.test.ts#L75) checks all 13 site tables; [87](../../tests/unit/lifeTables.test.ts#L87) checks row/catalogue overlap; [113](../../tests/unit/lifeTables.test.ts#L113) drops malformed rows; [152](../../tests/unit/lifeTables.test.ts#L152) checks reachable selection. [lifeSim.test.ts:109](../../tests/unit/lifeSim.test.ts#L109) allows existing 15 m mobile slack; [201](../../tests/unit/lifeSim.test.ts#L201) allows existing 6 m rooted slack on one gently varying fixture. That fixture misses the reproduced slope edge. |
| Finite, submerged life under supported motion                                         | [steer.ts:99](../../src/world/life/steer.ts#L99) steers toward habitat; [integrate:673](../../src/world/life/steer.ts#L673) applies ground/surface constraints to moving animals.                                                                                                                                                                                                                                                     | [lifeSim.test.ts:214](../../tests/unit/lifeSim.test.ts#L214) exercises 120 s of hard flying and checks finite pose/velocity/animation state, speed, surface and seabed; [357](../../tests/unit/lifeSim.test.ts#L357) additionally checks pool invariants and finite agent numbers in crowded shipped rare paths.                                                                                                                                                                                                                                                                      |
| Terrain input cannot supply NaN heights                                               | [TileLoader.ts:62](../../src/world/TileLoader.ts#L62) validates metadata; [validateHeights:98](../../src/world/TileLoader.ts#L98) rejects nonfinite samples before sampling.                                                                                                                                                                                                                                                          | [TileLoader.test.ts](../../tests/unit/TileLoader.test.ts) guards malformed metadata, size and decode/load failures. Nonfinite sample rejection is source evidence; this audit does not claim every invalid callback is covered by an explicit test.                                                                                                                                                                                                                                                                                                                                   |
| External submarine depth requests do not corrupt hull/HUD state                       | [Spawn.ts:439](../../src/game/Spawn.ts#L439) validates/clamps requests.                                                                                                                                                                                                                                                                                                                                                               | [uiHud.test.ts:36](../../tests/unit/uiHud.test.ts#L36), added by 3690, covers NaN/infinities/nonpositive requests, exact hull-rating edges and a large finite trench request. These assertions remain intact.                                                                                                                                                                                                                                                                                                                                                                         |

The supported determinism unit is cell contents or an identical simulation
history. Resident buffer slots may change with cell insertion order; the existing
scatter test explicitly normalizes that order. Mobile life uses a stateful PRNG;
[clear:147](../../src/world/life/LifeSim.ts#L147) does not reset it. Rooted budgets,
species selection and radius hysteresis also constrain which cells are resident.
Consequently this audit does not elevate arbitrary route-independent mobile
populations, repeated clear() calls, crawler motion or saturated resident subsets
to new product guarantees. Cell seed and random source are separate options:
[Life.ts:56](../../src/world/life/Life.ts#L56) forwards them separately, and
[life system:62](../../src/app/systems/life.ts#L62) supplies optional lifeSeed.

## Headless diagnostics

Temporary `/tmp/3800-spawn-audit.mjs` loads production modules via Vite SSR with
configFile false, cacheDir `/tmp/3800-vite-cache`, middlewareMode true, watch null,
hmr false, ws false and optimizeDeps.noDiscovery true. No server listener,
renderer, browser, WebGL or image output is used. Command:

```bash
node /tmp/3800-spawn-audit.mjs > /tmp/3800-spawn-audit.json
```

Exit **0**. Diagnostic assertions confirm:

- All **13 site biomes × 3 tiers × 5 cells = 195** cells match exactly between
  forward and reverse generation order, including negative indices, with the
  runtime site-hash seed convention. All **8,293** returned instances have
  finite numeric fields, remain inside supplied ground bounds and meet exact
  `y + embed * sy == sampleHeight(x,z)` within 1e-9. Inputs remain unchanged.
  The fixture is a finite, bounded gentle plane, not surveyed-site acceptance.
- **39** site/tier life pairs replay exactly after 120 updates of 1/60 s, using
  the actual parsed site tables, cell seed 7 and fresh mulberry32(7). All
  **2,818** first-run live animals have finite positions/velocities; exact
  species/positions/yaw/scale arrays match their independent replay. A flat
  floor eight metres below the midpoint of a star row's band keeps the probe
  headless and repeatable. These controls exclude authored opening population,
  props and currents, and are not real-site encounter or strict-band acceptance.

### Reproduced rooted depth defect

This standalone body can run after loading LifeSim, LIFE_TIERS, parseLifeDoc and
mulberry32 in the SSR harness described above:

```js
const doc = parseLifeDoc(JSON.parse(readFileSync('data/life/life.json', 'utf8')));
const sim = new LifeSim({
  tier: LIFE_TIERS.high,
  table: doc.sites['lost-city'],
  seed: 1,
  rand: mulberry32(1),
  env: { groundAt: (x, z) => -984.4 - 1.2 * x },
});
sim.update(1 / 60, {
  x: 13,
  y: -980,
  z: 0,
  vx: 0,
  vy: 0,
  vz: 0,
  fx: 0,
  fy: 0,
  fz: -1,
  speed: 0,
  lightsOn: true,
  hullR: 7,
});
const coral = sim.pool.filter((a) => a.alive && a.def.id === 'cold-water-coral');
// Includes cell "0,0":
// x=20.14844619904585, y=-1008.578135438855, z=8.191285856561356
```

The cell centre is `(13,13)` at depth **1,000 m**, inside the row/catalogue
intersection `[500,1000]`. The final member is at **1,008.578135438855 m**,
beyond the existing upper bound plus 6 m. Seed 1 produces **four** members beyond
that margin; seeds 7, 21 and 42 produce 1, 1 and 6 respectively (**12 total**).
All values are finite. No NaN injection, altered species, forced preview hook,
private method, timing override or modified authored table is involved.

An independent minimal reproduction command, `node /tmp/3800-root-depth-repro.mjs`,
exits **1** with `AssertionError: Every rooted coral must remain within its
existing six-metre habitat tolerance`, actual **4**, expected **0**. It first
confirms finite coordinates and the exactly 1,000 m cell centre, then checks all
**51** live coral members. This is failing reproduction evidence on unchanged
production; no passing-after result exists because source changes are prohibited.

Cause: cellPass checks the centre at lines 582–585, then placePatch shifts the
patch and members and calls addAgent with `groundAt(px,pz)` at line 639 without
checking that final depth. Sessile integrate deliberately does not move these
animals. The existing gently sloping rooted fixture does not expose this edge.
This is a reproduced public-simulation contract failure on a synthetic valid
heightfield, **not** evidence that a particular shipped GMRT location currently
spawns that coral outside its habitat. Actual-site occurrence remains unproven.

Smallest proposed fix: in placePatch, obtain entryBand(row), sample each final
member's ground once, and skip the member unless its depth passes the same
`inBand(-height, band, 6)` policy already used for its cell centre. Pass the same
sampled height to addAgent. Keep the existing six-metre tolerance, hashing,
budgets and ground seating. Do not clamp the animal's Y away from the bed or
retune authored data. A follow-up owning production and lifeSim.test.ts can
extend its existing rooted-depth case with this slope; no implementation change
is made here.

## Validation

Focused existing capabilities:

```bash
npm test -- --configLoader runner --cache=false tests/unit/uiHud.test.ts tests/unit/lifeTables.test.ts tests/unit/lifeSim.test.ts tests/unit/biomeFloorVariety.test.ts tests/unit/beebeScatter.test.ts tests/unit/TileLoader.test.ts
```

Exit **0**: **6 files / 113 tests passed**, 6.98 s. No tests were edited, so there
is no failing-before/passing-after test delta.

Required gates and final formatting/scope checks: results to be recorded after
completion.

## Simplicity and limits

One evidence note, zero runtime/test complexity added. No new abstraction,
settings, guidance, UI, site branch, config mutation, dependency, schema, budget,
tolerance or snapshot. Predictable spawns protect exploration and its rewards;
reporting the habitat edge without overclaiming real-site impact meets the
honesty rubric. Readability, beauty and phone acceptance are not assessed.

Actual local e2e mode is **none**. No hosted CI, GPU, visual acceptance, unaided
journeys, touch layout or real-phone performance validation. No production,
authored-data, shared-fixture, geometry, shader, tooling, DIRECTOR or other
worktree edits. No merge, push, tag or hosted workflow dispatch.
