# 4420 S-verify — V-bluehole-silhouette

Numerical verification of **item V-bluehole-silhouette** at
`3601912083a6b25c3237f29aa1469b6420d26b6f`. No new violation of the existing
spawn, collision, overlap, grounding or mesh-budget contracts reproduced.
The rewritten envelope checks reject deliberately broken geometry. No production,
capability-spec or snapshot changes were needed; this delivery changes only this
report.

## Scope and method

Compared the pre-rewrite builder at `a7702911^`
(`692c2474f81d732050c45548d50ea2feab334531`) with the current builder. The
geometry rewrite is `a7702911`, merged by `ac061176`; the final bookkeeping and
formatting commit is `36019120`. Reviewed the source and snapshot delta, the
existing Blue Hole capability specs, and the previous V-bluehole-overlap audit.

A temporary Vitest audit loads the real GMRT tile, authored props and POIs,
constructs both galleries on Low/Medium/High, and measures sphere-to-triangle
distance against **every transformed pendant and roof triangle**. Distances below
subtract the configured **8 m hull radius**. Source substitution uses a Vite alias
to an archived builder with absolute imports; no tracked source is swapped or
mutated. The before run keeps all other dependencies at the current revision,
isolating this merge's sole production-file change. Executed budgets agree with
the old and new git snapshots.

Evidence and runnable harness: `.cache/4420/` (`audit.test.ts`,
`vitest.config.mjs`, `before-stalactites.ts`, `before.json`, `after.json`,
`collision-{before,after}.json`, `provenance.json` with source/tile/evidence SHA-256 hashes, and logs). Class B is the mission's authored hull;
the survey minimum of -3,642.63 m also selects B for free dive with the configured
300 m margin. Rating is -6,500 m.

## Spawn, approach and inside-hole clearance

The complete composed mission pose and free-dive poses in Arcade, Realistic and
Custom are **identical before/after on all three tiers**. Every spawn clears the
prop keepout at radius **12 m** (hull plus 4 m), the surface, seabed and rating.
Minimum free-dive hull-bottom-to-ground clearance is **34.878890 / 35.145175 /
34.540748 m** (Low/Medium/High); mission is **106.630518 / 107.940198 /
107.590419 m**.

There are **476 clear-route samples per tier, 1,428 per source version**:
181 along the mission approach from its 150 m opening to 60 m from the target;
121 from free-dive spawn to the hole centre at spawn depth; 121 descending at the
centre to 12.01 m above the floor; and 53 between the authored east 55 m approach
and 42 m close pose, interpolating height and lateral offset. All return **zero
prop collisions**, with positive independently measured rendered clearance.

| Route                  | Minimum pendant clearance, Low / Medium / High (m) | Minimum roof/lip clearance, Low / Medium / High (m) |
| ---------------------- | -------------------------------------------------- | --------------------------------------------------- |
| Mission to 60 m        | 25.611834 / 34.284656 / 28.775601                  | 22.986360 / 22.394739 / 21.513329                   |
| Free dive to centre    | 32.677344 / 40.553512 / 35.206081                  | 35.204687 / 34.761412 / 35.103980                   |
| Centre descent         | 120.835965 / 126.080177 / 122.101350               | 117.316178 / 117.179122 / 117.305991                |
| East approach to close | 26.046430 / 19.400213 / 18.807235                  | 15.587516 / 15.124735 / 14.262745                   |

The smallest sampled hull-to-ground margin along these routes is **4.01 m**.
These are sampled route checks, not a proof that arbitrary straight lines through
the gallery are navigable.

An exploratory 201-point straight chord from free spawn to the **archived west
close pose** intersects the existing lip: Low/Medium/High have **22/22/20** colliding
samples and worst rendered roof overlap **3.297405/4.002811/4.263687 m** in **both**
versions. Its pendant clearance stays positive. The initial exploratory harness
incorrectly asserted this chord was clear and failed on both revisions; its final
version records this diagnostic separately from the four verified clear routes.
No production assertion was loosened. This is a pre-existing blocked shortcut,
not a newly regressed approach or a claim of unrestricted gallery access.

The existing Class B mission-navigation capability passes on all three tiers:
150 m opening range; first primary scan completed at **13.466667 s**; minimum
centre-to-ground clearance **12.000000 m**; no hull breach. The existing opening,
framing, terrain visibility, gallery grounding and east close-camera checks also
pass. Actual minimum pendant-to-ground distance remains positive: west
**15.014769/12.202913/4.652570 m**, east **3.438471/0.985319/0.966560 m**.

## Roof collision and overlap

Re-executed `blueHoleCollision.test.ts` against each source version. All **30/30**
shallow/deep east roof contacts register collision before and after. Independent
post-resolution rendered distances:

| Tier   | Minimum shallow distance before → after (m) | Minimum deep distance before → after (m) |
| ------ | ------------------------------------------- | ---------------------------------------- |
| Low    | 8.242745 → 8.095484                         | 7.972802 → 7.999151                      |
| Medium | 8.103956 → 7.971165                         | 7.853333 → 7.878169                      |
| High   | 7.780119 → 7.690940                         | 7.401412 → 7.530142                      |

The shallow budget remains **distance ≥ 7.57 m** (at most 0.43 m overlap); deep
remains **distance ≥ 7.15 m** (at most 0.85 m overlap). Worst current overlaps are
**0.309060 m shallow** and **0.469858 m deep**. Repeat-call movement is at most
**3.55e-15 m**. Independently clear water above the roof remains unmoved. The
coarse proxy still allows bounded overlap; this is not exact mesh collision.

Both versions resolve **2,997 apron contacts**. Current minimum rendered apron
distance is **7.999999994 m**, within the existing 1e-4 m tolerance; maximum
remaining penetration into any prop volume is **2.49e-14 m**. Each gallery/tier
retains more than ten independently clear, unmoved open-water probes. Their
aggregate count changes **99 → 80**, because changed pendant boxes alter which
candidate floor points qualify as independently clear water (west unchanged,
east 22/23/19 → 16/17/12). All existing thresholds pass. Re-placement, rebuild and
collision-disabled checks pass too.

## Envelope mutation checks

Ran the **existing four** `blueHoleProps.test.ts` envelope cases with isolated
mutant builders. Production code and assertions remain untouched. The normal
builder passes all four within the 39-test capability spec. The mutants fail at
the intended envelope assertion, without depending on snapshots:

| Deliberate mutation                                                                                                  | Observed failure                                                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hood length floor `0.04 → 1.04`; ground stop `-0.7 → +8 m`                                                           | East Low/High lower-bound checks fail: min Y **-8.031361 / -8.040707 m**, required **> -0.136600 / +0.166590 m**. This deliberately extends hanging geometry down through the protected lower envelope. |
| Shift pendant placement X by one prop width (`x → x + 1 * W`)                                                        | All four width checks fail; east Low/High outer X **72.168358 / 74.542183 m**, required **< 28 m**.                                                                                                     |
| Hood length terms `0.04 + 0.4… → 0.004 + 0.004…`; skip threshold `0.5 → 0.005 m` so tiny geometry remains measurable | East Low/High real-hang checks fail: vertical span **0.684702 / 1.363547 m**, required **> 2.893464 / 2.865644 m**.                                                                                     |

Each mutant invocation exits **1**. These show that the rewritten bounding-box
assertions are non-vacuous for downward intrusion, width overflow and loss of
hang. They are level-seat envelope guards, not a swept-hull or Z-direction
containment test; the independent world-space route/contact checks above cover
the current authored geometry's hull clearance.

Reproduction (from repository root; local Node must be on PATH):

```bash
AUDIT_MODE=before npx vitest run --config .cache/4420/vitest.config.mjs --configLoader runner
AUDIT_MODE=after npx vitest run --config .cache/4420/vitest.config.mjs --configLoader runner
# Repeat with long, wide, short; each should fail at the indicated assertion.
AUDIT_MODE=long AUDIT_SPEC=tests/unit/blueHoleProps.test.ts npx vitest run \
  --config .cache/4420/vitest.config.mjs --configLoader runner \
  -t 'keeps its pendants inside the original envelope'
```

## Triangle and instance counts from history, verified by construction

Counts are authored full-detail prop geometry, with instanced triangle counts
multiplied by instance count, matching `countGeo` and the golden snapshots.
Pendants are merged into one mesh, not GPU instances. The instance column counts
`fallen-blocks` GPU instances; draws and instance counts are unchanged.

| Tier / gallery | Triangles before → after | Delta               | Draws before → after | GPU instances before → after | Pendant pieces before → after |
| -------------- | ------------------------ | ------------------- | -------------------- | ---------------------------- | ----------------------------- |
| Low west       | 11,392 → 10,912          | -480                | 3 → 3                | 0 → 0                        | 14 → 12                       |
| Low east       | 9,656 → 9,896            | +240                | 3 → 3                | 0 → 0                        | 17 → 18                       |
| **Low total**  | **21,048 → 20,808**      | **-240 (-1.14%)**   | **6 → 6**            | **0 → 0**                    | **31 → 30**                   |
| High west      | 81,108 → 81,108          | 0                   | 4 → 4                | 120 → 120                    | 27 → 27                       |
| High east      | 71,676 → 70,416          | -1,260              | 4 → 4                | 120 → 120                    | 35 → 32                       |
| **High total** | **152,784 → 151,524**    | **-1,260 (-0.82%)** | **8 → 8**            | **240 → 240**                | **62 → 59**                   |

Low has zero instanced meshes; High has one per gallery. Impostors remain
**1,788 west + 1,440 east = 3,228 triangles / 2 draws**, with zero GPU instances.
Roof, apron and rubble topology counts stay fixed; full-detail count changes are
in the merged pendant meshes. Existing budgets and golden snapshots pass.

Qualification to the visual package's progress note: counts **can increase** for
an individual gallery/tier. Medium also grows **93,440 → 96,464** triangles
(+3,024, +3.24%), retaining 8 draws and 144 GPU instances. The new length expression
consumes additional draws from the placement RNG, including for the non-hood
west builder, so later cluster/member choices can change; skipping short
pendants does not imply monotonic counts. This is a documentation qualification,
not a reproduced budget failure.

## Validation and limits

- Focused existing capabilities: **6 files / 155 tests passed**, 76.72 s:
  `blueHoleProps`, `blueHoleWall`, `blueHoleCollision`, `blueHoleOpening`,
  `props-geo`, `terrainMerge1140`, using `--configLoader runner --pool=threads --cache=false`.
- Existing Class B mission capability: **3 passed**, 12 unrelated site cases
  filtered out; `heroMissionSpawn.test.ts -t great-blue-hole`, 13.68 s.
- Before/after collision capabilities: **7 passed each**, 26.43 / 30.19 s;
  evidence captured through the existing `VERIFY_1495=1` hook.
- Final isolated before/after route and count audits: **3 passed each**, 14.52 /
  14.67 s.
- Mutation checks: expected **2 / 4 / 2 failures** (long / wide / short); unrelated
  cases are filtered out. No snapshot update or test-threshold change.

Required gate invocation:

```bash
GATES_CONFIG_MODE=writable PW_PORT=4420 bash tools/gates.sh
```

The gate is **not green**. Config bundling, strict content validation and the
production build/typecheck passed. Python: **162/167 passed**; four provenance
cases fail with `spawnSync git EPERM`, and the golden CLI tooling case fails with
`Unexpected end of JSON input` from subprocess JSON. The same failure signatures
are recorded in earlier numerical audits; no tooling or assertions were changed.

The gate's default fork-pool unit runner produced only its startup header for
about eight minutes and was interrupted (**exit 130**). It supplied no unit result
and did not reach its browser, attribution or formatting stages. The complete
unit suite was then attempted separately with `--pool=threads --configLoader runner
--cache=false`. This also supplied only its startup header for over ten minutes
and was interrupted (**exit 130**). **There is no full-unit result from either
runner.** The completed focused capability runs above provide the numerical
evidence; the full-suite gate remains unresolved in this environment.

The remaining checks were executed separately against isolated owned builds:

- Root smoke and project-base browser attempts both fail **before running tests**
  because the preview server cannot start. Direct preview confirms
  `listen EPERM: operation not permitted 127.0.0.1:4421`. No browser screenshot
  acceptance is claimed.
- The separate `/submarine-explorer/` production build passes.
- Attribution passes (**14 assets**); repository-wide Prettier passes.
- Final `git diff --check` passes.

Canonical interrupted-gate logs:
`.cache/runs/20261026-135332-7-oQ0lJG/`; separate checks and full-unit fallback:
`.cache/4420/{gates,unit-threads,e2e,e2e-base,preview,build-base,attribution,prettier}.log`.
The owned temporary build outputs were removed after the browser attempts.

Numerical verification does not claim visual quality, GPU performance or phone
acceptance. No production net addition, new module, site branch, runtime setting,
UI or package-named capability spec is introduced.
