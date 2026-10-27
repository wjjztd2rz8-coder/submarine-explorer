# S-verify: Endurance skirt merge numerics

Standing item **S-verify**, `plan/DIRECTOR.md` Backlog 9. **No numerical contract
violation found; report only.** The visual note's timber and Low-draw claims do
not match the implementation: timbers are removed, and Low draws decrease.
No visual acceptance is claimed.

## Scope and pins

| Role                                    | Full SHA                                   |
| --------------------------------------- | ------------------------------------------ |
| Checkout, unchanged throughout          | `21977437524393c93ee712c974c370e8993ded71` |
| Parent/base, `32ef9313^1`               | `9a313874c95dbdbe603c7db0199de8b0a71ef2e8` |
| Current comparison head, `32ef9313`     | `32ef9313030ae83b7ba98532521a2311b4d95b43` |
| Merged visual branch tip, second parent | `42c1f859a71af5911feb05d49d6ee8c806b50bdd` |

Read DIRECTOR's simplicity rules and rubric, the newest REVIEWS entry
(2026-10-27 midday), OVERNIGHT-LOG tail through run 185, V-endurance-hull, and
4130-S-verify-endurance-clearance. The earlier report audited
`b7f3ca59fdc4e404b5b8672a2eb4e5b1a420c4e8` for opening/scan/clearance questions;
this report does not repeat those calculations. Searches of progress notes and
available launched briefs for `32ef9313`, `V-endurance-hull` and `endurance-stern`
found only the visual evidence and this task's brief covering this exact delta.
4690 CI, other launched packages and owner phone acceptance remain outside scope.

The comparison uses exact Git exports of parent and merge production modules,
not checkout substitutes. Checkout-to-merge diff is empty for the wreck family,
builders, Props, PropLoader, Terrain and Endurance props/tile inputs. Later
unrelated merges are excluded from the measured delta.

## Actual kit and cost changes

`src/world/props/wrecks/scatter.ts` replaces the stern disc with half-extents
`rx=dims[0]`, `rz=dims[1]`. With the changed authored dimensions, this is a
**30 m X × 12 m Z half-extent ellipse**, formerly a radius-4 m disc. Dimensions
are placement half-extents here, not total rendered mesh dimensions; the third
component remains unused by this kit. Placement area grows 22.5 times.

Counts below are actual **near-LOD instances**, parent → current, using production
`scatterCount`: `Math.round(count * density)` with density 0.35/0.6/1 for
Low/Medium/High. `small` kinds are entirely absent on Low.

| Kind     | Authored count and filter            |    Low |  Medium |    High |
| -------- | ------------------------------------ | -----: | ------: | ------: |
| Planks   | 18 → 44; retained `big`, not `small` | 6 → 15 | 11 → 26 | 18 → 44 |
| Timbers  | 3 → removed; formerly `big`          |  1 → 0 |   2 → 0 |   3 → 0 |
| Coils    | 2 → removed; formerly `small`        |  0 → 0 |   1 → 0 |   2 → 0 |
| Mounds   | added 40; `small`, near only         |  0 → 0 |  0 → 24 |  0 → 40 |
| Stones   | added 16; `small`, near only         |  0 → 0 |  0 → 10 |  0 → 16 |
| Anemones | retained 40; `small`, near only      |  0 → 0 | 24 → 24 | 40 → 40 |
| Squirts  | retained 25; `small`, near only      |  0 → 0 | 15 → 15 | 25 → 25 |

The visual note says “timbers 3 to 8” and “Low draw count unchanged.” Neither
holds in the merged source. Mid LOD retains only `big` pieces: formerly planks
and timbers, now just planks. No new prop was added; all three prop IDs remain.

Each cost cell is **instances / draws / triangles**, parent → current. Instances
count InstancedMesh members, excluding ordinary meshes. Draws are headless mesh
costs before culling, not renderer measurements. Near and mid are alternative
internal LODs, not simultaneous frame costs.

| Scope / tier                 | Near LOD                                | Mid LOD                           |
| ---------------------------- | --------------------------------------- | --------------------------------- |
| Helm kit / Low               | 7 / 2 / 306 → 15 / 1 / 540              | 7 / 2 / 306 → 15 / 1 / 540        |
| Helm kit / Medium            | 53 / 5 / 6,228 → 99 / 5 / 9,168         | 13 / 2 / 576 → 26 / 1 / 936       |
| Helm kit / High              | 88 / 5 / 10,498 → 165 / 5 / 15,244      | 21 / 2 / 918 → 44 / 1 / 1,584     |
| All Endurance props / Low    | 128 / 10 / 27,746 → 136 / 9 / 27,980    | 12 / 7 / 13,298 → 20 / 6 / 13,532 |
| All Endurance props / Medium | 389 / 16 / 65,338 → 435 / 16 / 68,278   | 21 / 7 / 14,698 → 34 / 6 / 15,058 |
| All Endurance props / High   | 734 / 16 / 113,328 → 811 / 16 / 118,074 | 35 / 7 / 16,768 → 58 / 6 / 17,434 |

Template triangles per instance are planks 36, timbers 90, coils 480,
mounds/stones 90, anemones 168 and squirts 76. The kit's resident instance totals
including mid twins increase 14 → 30, 66 → 125 and 109 → 209; those twins share
geometry/materials and copy instance buffers (`assembleWreck`). The scatter far
impostor is still empty: zero instances/draws/triangles.

The existing `perf-budget.test.ts` census deliberately includes **both** internal
LOD branches, material groups and any material passes:

| All Endurance props | Static draws, parent → current | Static triangles, parent → current |
| ------------------- | -----------------------------: | ---------------------------------: |
| Low                 |                        17 → 15 |                    41,044 → 41,512 |
| Medium              |                        23 → 22 |                    80,036 → 83,336 |
| High                |                        23 → 22 |                  130,096 → 135,508 |

Against the existing Low static caps (1,200 calls / 1,200,000 triangles), headroom
is **1,183 → 1,185 calls** and **1,158,956 → 1,158,488 triangles**. The existing
Endurance prop-count pin remains **3**. No separate exact Endurance draw-count
pin was found. The unchanged hull alone uses 26,594 Low near triangles, below
its existing strict 180,000 hull budget (Medium 400,000; High 700,000). Scatter
costs are covered by the site static guard rather than that hull-only guard.
`f-perf-budget.spec.ts` separately guards the rendered Low frame at 1,500 calls /
1,500,000 triangles; frame headroom and real-phone performance are **unmeasured**.

## Placement, sinking and bounds

The helm origin moves from lat/lon `(-68.739319, -52.329569)` to
`(-68.739167, -52.329722)`, the main hull's authored X/Z. Heading 0°, scale 1,
seabed snapping, collision `none` and 400 m outer LOD distance are retained.
World X/Z moves `(-423.108157, 1091.331890)` →
`(-429.286862, 1074.411250)`: ΔX −6.178705 m, ΔZ −16.920640 m,
18.013452 m horizontally. This does not relocate the hull, POIs or rigging prop.

Planks now use ring [0.25, 1], mounds [0.3, 1], stones [0.35, 0.7]. In
`scatterLayout.ts`, the area-uniform ring radius is subsequently bent inward by
`cluster`. Stones use `cluster=0.6`, so their actual permitted normalized
radius is **[0.183483, 0.525978]**, not [0.35, 0.7]. Measured stone radii are
[0.212553, 0.439243] Medium and [0.210705, 0.464038] High. Planks measure
[0.285229, 0.981192] at every tier; mounds [0.368936, 0.917606] Medium and
[0.394249, 0.998604] High. All centres satisfy the resulting ellipse/radius
rules. The ring constrains centres; it promises neither whole-mesh containment
within the ellipse nor clearance from the hull. Anemones/squirts retain full
ellipse placement and counts but get new positions/scales/tints as the earlier
kinds consume a changed seeded random sequence.

The disposable probe uses real GMRT Float32 heights and production Terrain,
Props.placeAll, layoutScatter and builders. Both revisions use the real
`helm-marker` seed **2219704326**. Six site/tier builds and six repeated builds
all place **3 props, 0 failures, 0 skips**. Repeated helm buffers and bounds match
exactly; all geometry attributes, instance colours and matrices are finite, and
instance determinants are positive. Matrix entries agree with production layout
placements within **9.43e-7**; world origins agree with terrain minus authored
sink within **2.12e-8 m**, consistent with Float32 instance buffers.

Debris uses the centre terrain sample for its root and each piece's local
terrain callback (`Props.debrisHeightFn`, `followsTerrain`); it is not seated
using the enlarged footprint's lowest corner. Origin Y, parent → current:
Low −3000.528282 → −3000.540071; Medium −3000.689821 → −3000.672764;
High −3000.646093 → −3000.621441 m. No root-level sinking error appears.

Conservative builder bounding-box sizes, **X × Y × Z metres**, parent → current:

| Tier   | Parent                          | Current                          |
| ------ | ------------------------------- | -------------------------------- |
| Low    | 7.927526 × 0.774466 × 8.363356  | 47.670621 × 0.568896 × 25.456595 |
| Medium | 9.421706 × 0.939716 × 10.679764 | 56.047844 × 1.479677 × 25.456595 |
| High   | 9.264942 × 0.955221 × 10.646009 | 54.695360 × 1.511183 × 25.989666 |

Current world conservative bounds (min → max, XYZ metres):

- Low: `(-455.463520, -3000.986244, 1061.883933)` → `(-407.792899, -3000.417348, 1087.340528)`.
- Medium: `(-456.777723, -3001.280776, 1061.883933)` → `(-400.729879, -2999.801099, 1087.340528)`.
- High: `(-458.975919, -3001.271119, 1061.350862)` → `(-404.280558, -2999.759936, 1087.340528)`.

Every transformed helm near vertex is inside the builder box, Props bounding sphere
and tile footprint in both revisions. Current sphere radii are
27.022444 / 30.787938 / 30.287493 m, versus 5.774755 / 7.136333 / 7.072643 m.
These enlarged bounds affect distance/frustum culling and BoxLod switching;
internal thresholds remain 45/70/110 m measured from the box. Bounds include
rotated template boxes and are conservative; raw results also retain exact
vertex bounds and all parent extrema.

Negative vertex clearance is authored burial, not automatically a placement
contract failure. Every new mound and stone has vertices above and below the
sampled terrain. Mound vertex clearance spans [−0.365611, +0.453126] m Medium,
[−0.375458, +0.452390] High; stones [−0.234034, +0.704931] and
[−0.234861, +0.701836]. Mound origins sink 0.150145–0.348538 m Medium and
0.140199–0.345834 m High (`0.35 * sy`); stones use `0.2 * sy`.
Thin planks use the retained `0.2 * sy` sink: all sampled vertices lie below
terrain for 3/6 → 9/15 Low, 6/11 → 16/26 Medium and 11/18 → 29/44 High
instances. This behavior existed before the merge and satisfies the origin
contract; it is not a claim of visual adequacy. No generic “all vertices above
terrain” assertion applies to authored sunk debris.

## Consumers and existing guards

`Props.build` → `PROCEDURAL_BUILDERS.debris` → `buildWreck` →
`buildWreckScatter` is the runtime path. Catalog searches find exactly one
`endurance-stern` consumer: Endurance's helm-marker. `wreckScatterSpec` is also
used by capability tests; the only merged test change updates its DIMS entry
[4,4,2] → [30,12,2]. No shared layout, geometry-piece, material or assembly
implementation changed. Mounds/stones reuse `mudBlock`, cached sediment material
and per-instance tints/gains (1.9/2.2); no new texture or shader path is introduced.

Parent/current checks of **12 other wreck IDs × 3 tiers = 36 paired controls**,
including Endurance hull/rigging and every other scatter kit, retain identical
geometry/index/instance/colour digests, bounds and collider boxes. Production
Endurance placement also preserves the other two props' origins, bounds and
colliders exactly. Other sites do not acquire this ellipse or these counts;
shared piece/material caches are reused without mutation by this kit.

Existing guards suffice: `wrecks.test.ts` covers seeded finite buffers/bounds,
terrain-following scatter, tier filtering, hull budgets/colliders and catalog
wiring; `props-loader.test.ts` covers placement/snapping/footprint policy;
`props-procedural.test.ts` covers deterministic debris and height callbacks;
`props-collision.test.ts` covers placement/collider behavior. No regression test,
snapshot update, tolerance change or production correction is warranted.

## Capture metadata only

| Cited capture                                                                            | Available metadata and provenance                                                                                                                                                                                                                         |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Before: `/home/vijay/submarine-explorer/.cache/golden/2026-10-27-094529/endurance-2.png` | File exists (1,383,624 bytes); sibling `poses.json` and `index.html` available. Manifest and shot both report SHA `6a0443db10de6ebe3f5f20aa29d053f7e97a077c`, clean, production build. High, free-dive, desktop 1600×900; complete manifest, no failures. |
| After: `.cache/golden/2026-10-27-112931/endurance-2.png`                                 | Directory, manifest, pose and SHA provenance unavailable in this checkout and main checkout's golden cache.                                                                                                                                               |
| Rating after: `.cache/golden/2026-10-27-115042/endurance-2.png`                          | Directory, manifest, pose and SHA provenance unavailable in the same locations.                                                                                                                                                                           |

Before `poses.json` binds `endurance-2.png` to hull B, first-person view,
position `(-396.14656760248846, -2985.5851698436772, 1039.9131228883152)`,
yaw −2.356194490192345, pitch −0.26926508683135486,
camera `(-405.0785228386842, -2984.921580123149, 1048.845078124511)`,
lookElevation −0.24507800450560838 and authored range metadata 40 m.
URL options specify `tier=high`, `lifeSeed=42`, `dynres=0`, `tutorial=0`.
The before SHA is an ancestor of the parent; the wreck source family and
Endurance props data match the parent exactly, but the capture is not from the
comparison parent's whole checkout. No after provenance can be inferred from a
directory timestamp or branch tip. A matched capture/pose/SHA pair is unavailable.
No PNG was decoded, displayed or compared, and no golden capture was run.

## Commands, results and limitations

Commands ran from the pinned checkout; local artifacts are under
`/tmp/4700-endurance-skirt/` and are not shipped:

```bash
git rev-parse HEAD '32ef9313^1' 32ef9313 '32ef9313^2'
git diff 32ef9313^1 32ef9313 -- src/world/props/wrecks/scatter.ts data/landmarks/endurance/props.json tests/unit/wrecks.test.ts
node node_modules/vitest/vitest.mjs run --configLoader runner --cache=false --maxWorkers=1 tests/unit/wrecks.test.ts tests/unit/props-procedural.test.ts tests/unit/props-loader.test.ts tests/unit/props-collision.test.ts
node node_modules/vitest/vitest.mjs run --configLoader runner --cache=false --maxWorkers=1 tests/unit/perf-budget.test.ts -t 'endurance low'
node node_modules/vitest/vitest.mjs run --config /tmp/4700-endurance-skirt/vitest.config.mjs --configLoader runner --cache=false --reporter verbose
```

- Focused checks: **exit 0, 4 files / 147 tests passed**, 16.67 s (`focused.log`).
- Existing static budget: **exit 0, 1 passed / 23 name-filtered**, 690 ms (`budget.log`). No assertions changed.
- Disposable diagnostic: **exit 0, 1 diagnostic passed**, 5.76 s (`probe.log`); an earlier diagnostic without vertex-containment checks also passed (4.64 s).

The Python setup uses `git archive <revision> src data/landmarks` for each exact
revision, extracts to `parent/` and `merge/` under the temporary directory, and
links the existing node_modules. It does not duplicate any production builder.
`staticCost.ts` is extracted unchanged from the existing perf capability;
near/mid costs use the production `countTriangles` on each level separately
(to avoid its traversal counting descendants of the hidden sibling level).
Terrain configuration/implementation and the actual tile bytes are unchanged
across the comparison. Repeated builds use production Props' terrain callback;
vertex checks sample production Terrain, without a renderer or WebGL context.

SHA-256 local artifact identifiers:

- `probe.test.ts`: `f8c914df4506e3fa22058c16dda28cd6b9532e609540e1d1852cf5dbe51205b9`.
- `results.json`: `0e66031dec366d9fe3cd119254618081034add42d382df9a2e01a165c004c603`.
- Extracted `staticCost.ts`: `649e3a4d11ba013415e77fa2b2f6f639e71cf2e510c34949129d44b1b9b3e361`.
- Before `poses.json`: `e27b51d945cab5a9af9d1eff197e84f78d81e3f11e20e8ce68b2e9dc41d91c62`.

Only this report is written in the repository. No game render, visual judgment,
full application/e2e run, full suite, build or phone performance measurement is
claimed. Beauty, readability, rewardingness and phone-OK rubric decisions remain
with the visual/owner lanes. No art, data, code, settings, dependencies, helpers,
tests, snapshots, tools or other plans are changed; no merge, push or release.
The stale descriptive claims are recorded here without expanding this package
into cleanup. Numerical verification is complete and stops at this report.

Owned-note `prettier --write` / `prettier --check` and `git diff --check`
passed. The new-file `git diff --no-index --check /dev/null <report>` emitted
no whitespace diagnostics (exit 1 for a new-file difference). Final HEAD is
the pinned checkout SHA; final status contains only this untracked report.
