# S-verify — Titanic seabed slice 3

Audited merge **`28e63c94d905307790392862faab6a5c901f44eb`**, against first
parent `8d9f0ab`, from checkout `92ec9e0`. Read `V-titanic-seabed-3.md` and the
complete merge diff. Scope: scatter gain, bow paint and narrower terrain scour;
no manifest inventory, hood/terrace audit, authored-value edits or game renders.

## Findings

**No production numeric or behavioral bug reproduced.** No source fix or
snapshot update. The two existing capability specs needed regression guards:

- `wrecks.test.ts`: extend existing all-kit/all-tier seeded builds to compare
  geometry and instance buffers and require every component to be finite.
  Add a tint-isolation case: only trail plates/frames take the warm HDR palette;
  plates/frames/pipes elsewhere and trail pipes retain default grey brightness
  jitter. Require both warm kinds to exist at every tier.
- `terrain-detail.test.ts`: include Medium in the existing scour case; probe
  both shoulders, moat cutoff and crest at the side and rounded footprint corner
  for continuity, then compare samples to generated triangles across the rim.
  Existing budgets and assertions are retained.

`gain` is internal kit data, authored only on `titanic-trail` plates and frames
at 1.7. Both old and new paths consume one draw from the separate tint PRNG per
placement, leaving layout randomness unchanged. `InstanceList` copies colors;
`makeInstanced` writes them into the existing float instance-color buffer.
Three's color vertex/fragment chunks multiply instance and vertex colors into
standard diffuse shading, followed by the existing ACES filmic output path.
Values above one are intentional linear HDR multipliers, not invalid colors.
No clamp was added. Shared material identities remain unchanged.

Bow muting 0.6 and plate strength 1.4 affect only the existing color attribute.
For these authored inputs the plate brightness factor lies within [0.11, 1.37]
and rust lerp weights within [0, 0.84] and [0, 0.42]; the remaining paint operations
preserve finite nonnegative colors. Geometry, indices, transforms and material
selection do not depend on these paint values. Stern and other hull tuning is
unchanged in the merge.

The signed footprint distance and smoothsteps are continuous. With width 18 m,
the rim support is **15.3–34.2 m** outside the footprint, with crest at **19.8 m**;
previously 12.6–46.8 m, crest 23.4 m. Smoothstep slopes vanish at each endpoint
and crest. Moat noise remains continuous; analytical scour height bounds at
strength 1 are **−7.425 to +1.5 m**, rim weight [0, 1]. Terrain tint is the
existing `1 + 0.45 * rim`, bounded [1, 1.45]. No topology allocation changed.

## Parent comparisons and measurements

An ignored, temporary Vitest probe loaded first-parent versions of the four
reviewed files, redirecting imports to unchanged dependencies. It compared nine
scatter kits and the bow at Low/Medium/High, seed 99, published test dimensions,
and local scatter ground `0.1*x + 0.05*z`. Across all **30 pairs**, geometry
attributes other than bow color, indices, instance matrices/counts, material
identities and bounds match. The **24 non-trail scatter pairs** also retain
byte-identical instance colors. Only trail plate/frame colors and bow hull
vertex colors differ, including the mid LOD twins.

Near-LOD costs below are identical before/after; these are static builder costs,
not rendered-frame measurements. Instance counts include all near-LOD details.

| Kit   | Tier   | Draws | Triangles | Instances |
| ----- | ------ | ----: | --------: | --------: |
| Bow   | Low    |     3 |    50,172 |       374 |
| Bow   | Medium |     6 |   139,988 |     1,594 |
| Bow   | High   |     6 |   230,174 |     2,417 |
| Trail | Low    |     2 |     1,000 |        11 |
| Trail | Medium |     4 |     2,768 |        56 |
| Trail | High   |     4 |     4,572 |        93 |

Bow bounds across tiers remain within x [−16.218779, 18.526463],
y [−2.5, 18.336555], z [−72.328770, 71.397282] m. The trail's bounds remain
within x [−12.036660, 11.275730], y [−3.142047, 3.094689],
z [−50.792427, 51.462612] m in this sloped fixture.

Shipped Titanic survey comparison, all resident chunks at their initial near
indices, skirts included:

| Tier   | Chunks before = after | Vertices before = after | Triangles before = after | Changed Y entries | Max absolute Y delta (m) | Max sample/ray error (m) |
| ------ | --------------------: | ----------------------: | -----------------------: | ----------------: | -----------------------: | -----------------------: |
| Low    |                   144 |                 335,967 |                  648,726 |               261 |                 0.947754 |              0.000104146 |
| Medium |                   144 |               1,265,780 |                2,486,840 |               443 |                 0.947754 |              0.000118579 |
| High   |                   144 |               1,276,404 |                2,507,832 |               977 |                 0.947754 |              0.000109851 |

All generated attributes are finite; indices and vertex X/Z are identical to
the parent. The 264 ray probes per tier cross both sides, the end and corner
of the actual georeferenced scour. Sampled scour height spans
[−6.184197, 1.499931] m. Generated color components span [1, 1.445528] on Low,
[1, 1.449677] on Medium and [1, 1.449987] on High. These are bounded HDR tints.
Normals and cavity change with the new height derivatives, as expected.

The merge's existing `beebeIsolation` snapshot changes are confined to Titanic
position/normal/color/cavity hashes. Reproducing its synthetic fixture gives
unchanged **1,481 vertices / 2,808 triangles (Low)** and
**5,477 / 10,656 (High)**. Maximum Y deltas are 0.938721 / 0.947754 m and color
component deltas 0.432054 / 0.432947. Tint delta can exceed 0.2 because the old
outer shoulder disappears, as well as the tint coefficient falling from 0.65.
Index hashes, shader/cache and uniform snapshots remain unchanged; the existing
cross-site snapshot passes without rebaselining.

On actual survey terrain the free-dive opening moves **−0.002256937094 m**
vertically; its x/z/yaw are unchanged in the merge snapshots. Recomputed parent
comparison explains the six Titanic base/framed/mode snapshot changes. Existing
opening clearance/collision assertions and snapshots pass without updates.

The existing static prop budget capability measures Titanic **37 calls /
135,178 triangles on Low**, **55 / 587,250 on High**, before culling on its
flat-ground fixture. Low retains its 1,200-call / 1,200,000-triangle ceiling,
reserving 300 calls / 300,000 triangles for the rest of the frame.
`tests/e2e/f-perf-budget.spec.ts` is unchanged: it checks the actual Low frame,
seven loaded props with no failure/skip, matching renderer counters, nonblank
scene lower bounds and ceilings of 1,500 calls / 1,500,000 triangles. Static
counts establish unchanged submission structure, not a full-frame GPU result.

## Simplicity and scope limits

No production machinery, UI element, guidance surface, setting, runtime config
mutation, site branch, art/layout/CSS change, dependency or new test file.
Readable collision and opening behavior is retained; no new accessibility or
interaction burden. Beauty, phone appearance, approach readability and screenshot
acceptance remain Claude/owner work. Ray agreement is for the near mesh used by
physics; distant terrain LODs remain approximations with existing skirts. No
rendered draw-call, frame-time, screenshot or device-performance claim is made.

## Validation

- PASS: final focused run, **2 files / 95 tests**, 31.48 s:
  `npm test -- --configLoader runner --cache=false --pool=threads tests/unit/wrecks.test.ts tests/unit/terrain-detail.test.ts`.
  Includes the existing textured and canvas-free material capability cases.
- PASS: temporary parent comparison, **7 tests**, 28.95 s; 30 wreck pairs,
  three actual-survey tiers and two synthetic snapshot fixtures.
- PASS: existing cross-site isolation snapshot, **1 selected test**; Titanic
  opening and static prop budgets, **3 selected tests**. No update flags used.
- PASS: final independent `npm run typecheck` and `git diff --check`.
- Ran `GATES_CONFIG_MODE=writable PW_PORT=4370 bash tools/gates.sh --no-e2e`.
  PASS: content, production build, full unit suite (**192 files / 3,053 tests**,
  521.72 s), attribution and repository-wide Prettier. **Exit 1 solely for the
  Python failures below.**
  Browser gates are excluded under the task's no-game-render constraint;
  no result is claimed for smoke, project-base or `f-perf-budget` e2e.
- Python gate: **161/166 pass**, five tooling failures. Four build-manifest
  tests fail on `spawnSync git EPERM`; the golden-tooling CLI case reports
  `Unexpected end of JSON input` from `tools/tests/golden-manifest.test.mjs:151`.
  These match failures documented by earlier audits. No tooling or assertion
  was changed to suppress them. This is not an all-green gate run.

Evidence is retained under `.cache/S-verify-titanic-seabed/`: parent source
copies, `auditProbe.test.ts` (run temporarily from `tests/unit/`),
`measurements.json`, `parent-comparison.log`, `focused-final.log`,
`isolation.log`, `budget-opening.log`, `typecheck.log` and `gates.log`.
The gate step logs are in `.cache/runs/20261017-164656-8-6izEZm/`.
