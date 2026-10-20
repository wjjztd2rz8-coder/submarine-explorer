# S-verify — shared steel plate shader

Standing **S-verify / S-bughunt**, `plan/DIRECTOR.md` Backlog 12. Audited
checkout **`cb279a7a2ca6b5dacf8033024fe61429ac8798f6`**. Reviewed the
`src/world/props/wrecks/materials.ts` delta in
**`f969579fc7a72d54f9d1136f6ae64f9edf2016f2..2de4ecfa389a096fdfc716ecf8332c3fec71da2f`**
(`2de4ecf^..2de4ecf`). Both that file and the wreck consumers are unchanged
between `2de4ecf` and this checkout. No production correctness defect found;
no production change, appearance adjustment or snapshot update.

Read `V-titanic-opening.md`, the actual diff, the latest Director/review rubric,
2470's `S-verify-titanic-seabed.md` and result, 2570's `S-verify-19.md`, and the
closeup-artifact evidence it reuses. Their seabed/scatter, life and pose checks
predate this shader delta. The 2470 wrapper says smoke gates passed, whereas
its embedded audit explicitly excludes browser gates and records Python
failures; those are distinct executions, not browser evidence for this audit.

Rechecked launched briefs 2630–2680, their available result/last-report files,
and the active worktrees before editing. Other verification last-report files
were empty; 2630/2640/2650 already had edits in their own worktrees. Scan/boost,
mission cap, anchored contacts, audio, performance and release tooling remain
with those briefs. Read `props-geo.test.ts` and the VentPreset capability in
`presets.test.ts` for the 2660/2680 boundaries; neither was edited. This audit
excludes the same visual commit's site/opening change, the fixed authored-radius
expectation, opening composition, and the owner's V-titanic-plating retuning.

## Actual shader path and numeric evidence

The existing hook receives Three's standard shader. The plate block follows
`map_fragment` inside `USE_MAP`, before vertex/instance color multiplication.
The rim addition follows the standard definition of `outgoingLight` and the
normal/normal-map and lighting chunks, before `opaque_fragment`, tone mapping,
color conversion and fog. `normal` and `vViewPosition = -mvPosition.xyz` are in
view space. Low/Medium use the interpolated normal; High uses the existing
normal map and scale `(0.8, 0.8)`. No light-direction or site dependency was added.

Source/analytic bounds, for supported finite UVs and finite nonzero vectors:

- `g = (2u, 4v)`; row/column floors accept negative as well as positive UVs.
  The finite sine/dot hash uses `fract(x) = x - floor(x)`, so each hash is in
  `[0, 1)`, including negative sine results. The new `0.6/0.4` convex combination
  stays in `[0, 1)`. The lane smoothstep edges `0.25 < 0.75` are ordered, its
  denominator is nonzero, and its weight is `[0, 1]`.
- Lane RGB is a convex mix of `(0.84, 0.94, 1.06)` and `(1.14, 0.98, 0.84)`:
  component bounds are `[0.84, 1.14]`, `[0.94, 0.98]`, `[0.84, 1.06]`.
  Existing desaturation weight is `[0.3, 0.65]`, tone is conservatively
  `[0.45, 1.2]`, noise interpolates bounded hashes, and stain stays `[0, 0.75]`.
  All smoothstep pairs are strictly ordered. No new division, negative power
  base or unbounded blend is introduced. Finite nonnegative diffuse input
  remains finite/nonnegative within the supported magnitude range; RGB above
  one is permitted by this existing HDR shading path.
- Floors deliberately introduce spatial lane boundaries. Smoothstep interpolates
  the hash-derived blend weight; it does not guarantee spatially continuous
  tint at those boundaries. Patchwork strength and blue deck appearance are
  visual findings already assigned to V-titanic-plating, not numeric defects.
- For normalized vectors, `d = abs(dot(n, v))` is clamped to `[0, 1]` before
  subtraction. Thus `rimFacing` and its cubic weight are `[0, 1]`; face-on
  parallel/antiparallel vectors give zero, perpendicular/grazing vectors give
  one. Positive vector scaling and normal reversal preserve the result.
  Added radiance is bounded componentwise by `(0.05, 0.11, 0.14)`. The material's
  emissive property remains zero, but the rim is an additive, scene-independent
  contribution: a claim that lighting is entirely unchanged would be inaccurate.

An ignored Node probe calls the actual hook on `ShaderLib.standard`, retains
its emitted fragment source, and evaluates the extracted hash/lane expressions
with CPU implementations of GLSL builtins. **28,080 samples** include signed
UVs through **±10,000**, lane boundaries and adjacent values. Observed lane mix
was **0.003962949–0.995374779**, smoothstep weight **0–1**, with all three channel
extrema matching the analytic bounds above. This uses JS double precision;
GLSL sine/hash values can differ with GPU precision and implementation.

The builder fixture measured **586,284 steel UV entries** including near/mid
copies, spanning U **−15.6875 to 13.757798** and V **−14.427032 to 13.757798**.
All UV/normal components were finite. Six zero normals belong exclusively to
an existing zero-area triangle at the bow tip, repeated in near/mid at each
tier. The other **195,050 nondegenerate triangle entries** have normal triples
whose convex hull excludes zero in the CPU fixture; the minimum computed
separation/lower bound is **0.0044518**. These are fixture measurements, not a
proof for arbitrary future geometry or interpolated GPU precision.

`normalize(vec3(0))` has no defined direction in GLSL; this audit does not treat
Three's CPU zero-vector normalization as a GLSL guarantee. Existing standard
normal shading already normalizes the same input. The zero-area tip triangles
supply no rasterized surface, and perspective clipping keeps supported visible
view vectors away from the camera origin. No demonstrated new zero-vector
wiring defect warrants changing the shader or geometry.

## Materials, affected builders and unchanged costs

Low is `steel:256:false`, Medium `steel:512:false`, High `steel:512:true`.
Existing fixture texture doubles exercise all three mapped paths. Repeated
factory requests share material identity; copied equivalent detail objects do
also. Repeated hooks on fresh standard-shader objects produce identical source
and uniforms and retain the same cache key. Three creates fresh parameters from
ShaderLib on compilation; reapplying a hook to already modified source is not
its compile contract. The literal `wreck-steel-plates` key is unchanged. Three's
program key additionally includes map/normal-map/UV flags, so High's normal map
is still distinguished; changing the shared custom key is unnecessary.

With maps unavailable, each tier retains null maps, the untouched standard hook
and its standard cache semantics: neither lane nor rim is installed. A separate High construction probe with only
the normal map unavailable retains the color-map hook and identical injected source. Source
continues to normalize mean texture brightness through `withMean`; a probe mean
of `0.5` yields material color `2`. Roughness **0.9**, metalness **0.12**, vertex
colors, opacity/depth defaults and fog are unchanged. Mapped wood, fitting,
sediment, growth, void and silhouette probes retain their original shader
sources and separate material/cache contracts.

The affected builders are **Titanic bow, Titanic stern, Bismarck**, plus steel
pieces in **titanic-boilers, titanic-field, titanic-trail,
titanic-stern-field, bismarck-turrets and bismarck-field**. Their near and retained
mid steel meshes receive the change; far silhouettes do not. Pipes in the Low
trail are absent under existing density rules; Medium/High trail pipes receive
the steel shader along with plates/frames. The trail's separate authored
instance tint is unchanged. **Endurance hull/rigging/stern and
bismarck-landslide do not use this steel shader.** These are shared Titanic and
Bismarck material changes, not Titanic-only tuning.

A parent/current probe isolates the parent material module against identical
current consumers, seed 99, existing `wrecks.test.ts` dimensions, and ground
`0.1*x + 0.05*z`. All **39 builder/tier pairs** match in geometry/index/color and
instance-buffer hashes, transforms, bounds/colliders, material properties/cache
keys, mesh submission counts, instance counts and texture/light counts. The
probe supplies the same canvas-texture doubles on both sides; it does not
execute canvas drawing or measure renderer allocations. The actual texture
factory and its per-kind/size caches are unchanged in the diff.

Near-LOD static draws / triangles below are **parent = current**, including
instances in triangle counts (not GPU frame counters):

| Affected builder    |        Low |      Medium |        High |
| ------------------- | ---------: | ----------: | ----------: |
| titanic-bow         | 3 / 50,172 | 6 / 139,988 | 6 / 230,174 |
| titanic-stern       | 3 / 38,292 | 5 / 104,556 | 5 / 188,478 |
| bismarck            | 4 / 28,524 |  6 / 62,146 | 6 / 108,596 |
| titanic-boilers     |  3 / 5,438 |   4 / 7,670 |   4 / 9,418 |
| titanic-field       |  4 / 3,412 |  8 / 21,450 |  8 / 35,710 |
| titanic-trail       |  2 / 1,000 |   4 / 2,768 |   4 / 4,572 |
| titanic-stern-field |  4 / 2,658 |  6 / 10,832 |  6 / 17,938 |
| bismarck-turrets    |  3 / 2,912 |   3 / 3,932 |   3 / 5,600 |
| bismarck-field      |  5 / 3,470 |   6 / 6,524 |  6 / 10,892 |

No additional light, texture, mesh, instance, uniform, sampler, texture fetch or
draw is introduced. The preserved standard chunks retain roughness, normal,
lighting and fog behavior around the intentional tint/rim additions. Extra
fragment ALU is real; unchanged resource counts do not establish unchanged GPU
time, phone performance or visual acceptance.

## Simplicity, coverage and validation

No new subsystem, dependency, setting, guidance/UI surface, site branch,
runtime config mutation or layout patch. Nothing on screen was added by this
audit, so no replacement surface is needed. Shared material selection stays
simple and deterministic. Numerical bounds and unchanged costs support the
correctness/readability rubric; discovery, interaction, rewards and accessible
controls have no behavioral change. Contrast, beauty, hue, composition and phone
appearance require Claude/owner visual review.

The only test edit is in `tests/unit/wrecks.test.ts`: extend its existing mapped-steel
capability to check fog, emitted rim placement and numerical endpoints/bounds,
sign/scale invariance, fresh compile-hook reuse and key stability. It evaluates
the emitted expressions rather than copying the rim formula. **378 CPU rim
samples** span 21 facing angles, both normal signs, three view magnitudes and
three tiers. The old test title's claim of unchanged lighting is corrected.
All prior assertions, budgets and snapshots remain intact; no new test file.

- PASS: `npm test -- --configLoader runner --cache=false tests/unit/wrecks.test.ts`,
  **40 tests / 1 file**, 15.01 s, including all seeded builder, budget, mapped and
  map-unavailable cases.
- PASS: independent `npm run typecheck` and `git diff --check`.
- PASS: ignored parent/current, lane, material-isolation and normal-domain probes.
- Required gates: `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`;
  **actual e2e mode: none**, deliberately excluded under the no-render constraint.
  **Exit 1**. PASS: writable config preparation, content, production build,
  full units (**192 files / 3,281 tests**, 582.37 s), attribution and repository-wide
  Prettier. No checks or assertions were relaxed.
- Python gate: **162/167 passed, five failures**. Four `test_ci_build_manifest`
  cases fail at `spawnSync git EPERM`; `test_golden_tooling` fails because its
  CLI subprocess yields `Unexpected end of JSON input` at
  `tools/tests/golden-manifest.test.mjs:151`. These match the previously recorded
  sandbox subprocess/provenance failure pattern. This is an environment-blocked
  gate result, not an all-green run. No tooling edits or external rerun claimed.
- PASS: final changed-file Prettier and `git diff --check`.

Evidence: `.cache/2670-S-verify-steel-shader/` contains `focused.log`, `audit.mjs`,
`audit.log`, `parent-materials.ts`, isolated runtime copies, `injected.frag.glsl`,
`measurements.json`, `zero-normals.{mjs,log}`, `normal-domains.{mjs,log}` and
`gates.log`. Gate step logs: `.cache/runs/20261018-183337-7-NKNlGf/`.
These checks do **not** compile/link GLSL, create a WebGL context, render the
game, run smoke/full/project-base e2e, capture screenshots, or establish GPU or
real-phone acceptance. No merge, push, tag, tooling or Director edit.
