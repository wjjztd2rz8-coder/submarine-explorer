# S-verify — steel world-up vector

Standing **S-verify / S-bughunt**, Director **Backlog item 8**. Audited checkout
**`e3d646995ab4a699c87a85464f2c0a5d0f869aa1`**. Actual first-parent merge delta:
**`98b4ae5c336235fd71e7ce3ccdeec2327469895e..1fff81d422543040fa42da686b2b41566f165163`**
(`1fff81d^1..1fff81d`). **No production correctness defect found.** Production
source, authored coefficients, geometry, budgets and snapshots are untouched.
V-titanic-plating remains DONE; rust appearance is not re-evaluated here.

Read current Director rules/rubric, newest review (2026-10-20), overnight-log
through run 68, V-titanic-plating progress, and completed 2670's brief, result,
last report and progress. That audit pins `cb279a7a2ca6b5dacf8033024fe61429ac8798f6`
and predates this delta. Its result wrapper reports smoke PASS, while its embedded
agent report explicitly records e2e **none** and five Python failures. Neither
that wrapper nor 2820's similar wrapper establishes browser execution here.

Before editing, checked queued/launched briefs 2800–2850, available result/last
reports, progress and active worktree changes. 2800's Lost City/Beebe/sessile
checks, 2810's journey/lifecycle/builders, 2820's CI watch, queued 2840's Settings
shortcut and 2850's deferred power start remain separate. None owns
`wrecks/materials.ts` or `wrecks.test.ts`. V-monterey-bands has three committed
WIP changes already in this checkout; its files remain excluded even though the
Director's In flight paragraph has not caught up. No overlapping fix was taken.

## Parent/current scope and unchanged evidence

The merge changes only the shared steel shader plus its progress note:

| Expression                         | Parent                                      | Current                                              |
| ---------------------------------- | ------------------------------------------- | ---------------------------------------------------- |
| Lane endpoints                     | `(0.84, 0.94, 1.06)` / `(1.14, 0.98, 0.84)` | `(0.93, 0.98, 1.02)` / `(1.07, 0.99, 0.92)`          |
| Desaturation weight                | `0.3 + 0.35 * smoothstep(...)`              | `0.12 + 0.28 * smoothstep(...)`                      |
| Rim addition                       | `(0.05, 0.11, 0.14) * pow(rimFacing, 3)`    | `(0.06, 0.09, 0.1) * pow(rimFacing, 4)`              |
| World-up dot and output multiplier | absent                                      | normalized view-space dot, clamped; rust blend below |

`git diff cb279a7 1fff81d^1 -- src/world/props/wrecks` is empty, as is
`git diff 1fff81d HEAD -- src/world/props/wrecks`. Thus 2670's complete
39-builder/tier parent/current buffer/resource comparison, normal-domain
measurements and unchanged wood/fitting/growth/void/sediment/silhouette isolation
are reusable. No second full builder audit was performed. Its zero-area bow-tip
normals remain a pre-existing domain limit, not a newly demonstrated defect.

Affected consumers remain **Titanic bow, Titanic stern, Bismarck** and steel
pieces in **titanic-boilers, titanic-field, titanic-trail, titanic-stern-field,
bismarck-turrets, bismarck-field**. Near and retained mid steel meshes receive
the shader; far silhouettes do not. Medium/High trail pipes use steel; Low omits
those pipes under existing density rules. Endurance hull/rigging/stern and
bismarck-landslide do not use it. These are shared Titanic/Bismarck changes.

## Coordinate-space and actual shader evidence

Installed Three is **0.186.0**, inspected locally, not inferred from a version
range. The actual material hook was called on `ShaderLib.standard` for parent
and current, Low/Medium/High, using isolated texture doubles. Retained emitted
sources and recursively expanded ShaderChunks are evidence of source wiring,
**not** preprocessed, compiled or linked GLSL.

- `WebGLProgram.js` supplies `uniform mat4 viewMatrix` to the fragment prefix
  already. `WebGLRenderer.js` uploads `camera.matrixWorldInverse`, forms
  `modelViewMatrix = view * model`, and obtains its inverse-transpose normal
  matrix. `defaultnormal_vertex` applies instance/batch normal corrections and
  `normalMatrix`; `normal_vertex` normalizes into `vNormal`.
- `normal_fragment_begin` normalizes `vNormal` (view space). High keeps the
  default `TangentSpaceNormalMap` and scale `(0.8, 0.8)`. Its
  `normal_fragment_maps` decodes the texture, scales XY and sets
  `normal = normalize(tbn * mapN)`. The tangent frame comes from view-space
  tangent/bitangent varyings, or `getTangentFrame(-vViewPosition, normal, uv)`
  using view-space position derivatives. Both routes leave the final normal in
  **view space**. The unchanged derivative frame uses cross products, linear
  combinations, dot products and a scalar normalization; proper view rotation
  preserves those operations. UV orientation and perturbation are not reset by
  the added code.
- The inserted block follows normal maps, lighting and `vec3 outgoingLight =`.
  It adds the rim, then computes
  `up = clamp(dot(normalize(normal), normalize((viewMatrix * vec4(0,1,0,0)).xyz)), 0, 1)`
  and multiplies **all** outgoing light, including the rim, by
  `mix(vec3(1), vec3(1.3,0.88,0.62), smoothstep(0.35,0.9,up))`.
  Opaque output, tone mapping, color conversion and fog follow. This changes
  outgoing radiance, not material emissive, normal geometry or light setup.

For a supported rigid camera view `V = [R,t]`, world-up transforms to `R*u`:
**w = 0 removes translation**. A fixed world-facing normal becomes `R*n`, so
`dot(R*n, R*u) = dot(n,u)` since `R^T R = I`. Normalization also removes positive
normal scale. A horizontal deck has up **1**, a vertical side **0**, an underside
**0** after clamping; they receive full rust, neutral, neutral respectively,
regardless of yaw, pitch or roll. Object rotations/scales are handled by Three's
normal matrix before this comparison. An arbitrarily scaled/sheared camera is
outside the app's supported rigid-camera domain.

High deliberately classifies the **perturbed shading normal**, not an invariant
geometric normal: bump detail can alter a local deck's weight. Holding a texture
sample and its resulting world normal fixed still gives the same dot product
under camera rotation. This is a source/math result; raster derivatives,
filtering, interpolation precision and sampling on an actual GPU are untested.
The existing generated normal map starts with tangent Z = 1 before normalization;
finite Sobel gradients and byte encoding keep decoded Z positive. Even a
zero derivative tangent frame retains its nonzero normal column and positive
map Z; the delta introduces no new zero-vector case. Undefined GLSL
`normalize(0)`, malformed/NaN input and magnitude overflow remain excluded, as
in 2670; JS zero-vector handling is not used as a GLSL guarantee.

## Finite bounds and resource contracts

For finite supported UVs, finite nonzero normals/view vectors and rigid cameras:

- Hash/lane weights and their strictly ordered smoothsteps are unchanged.
  Lane component bounds are now **R [0.93,1.07], G [0.98,0.99], B [0.92,1.02]**.
  Desaturation is **[0.12,0.4]**, a convex mix; tone **[0.45,1.2]** and stain
  **[0,0.75]** keep 2670's proof. No changed coefficient adds a singularity.
- Rim facing is **[0,1]**; fourth power is finite and bounded there, with no
  negative power base. Added radiance before rust is bounded by
  **(0.06,0.09,0.1)**. The up dot is clamped to **[0,1]**; its smoothstep has
  distinct ordered edges **0.35 < 0.9**, and a **[0,1]** result.
- Rust multipliers are **R [1,1.3], G [0.88,1], B [0.62,1]**. Therefore for
  nonnegative incoming radiance L, final radiance is nonnegative and at most
  **(1.3 * L.r + 0.078, L.g + 0.09, L.b + 0.1)**, within representable supported
  magnitudes. HDR values above one are allowed; bounded multipliers do not imply
  arbitrary near-float-max radiance cannot overflow.

An ignored probe evaluates the emitted lane/desaturation expressions, not a
copied production formula: **720 CPU samples**, signed UVs through ±10,000,
near boundaries and smoothstep endpoints. Observed lane extrema match all bounds
above; desaturation spans **0.12–0.4**. Hash values use JS doubles and need not
match GPU sine precision bit for bit. The prior measured builder UV range fits
comfortably inside this sampled domain; sampling supplements the analytic proof.

Low `steel:256:false`, Medium `steel:512:false`, High `steel:512:true` selection,
material identity/cache, color-mean handling, roughness 0.9, metalness 0.12,
vertex colors and fog are unchanged. Existing mapped tests verify fresh-hook
reuse, stable custom key `wreck-steel-plates`, identical vertex source/uniforms,
retained standard chunks and texture-fetch declarations. The parent/current
probe also compares those source contracts directly. Three includes map/UV and
normal-map flags in its complete program key, distinguishing High. A hook is
called on fresh parameters at compilation, not recursively on edited source.

Existing all-tier map-unavailable tests confirm null maps, untouched standard
shader/hook and standard cache behavior: no plate/rim/up block is installed.
A missing High normal map with an available color map still takes the same
shared hook, by the unchanged `if (mat.map)` condition; 2670 probed that path.
Textures/factories and every resource-creating statement are unchanged. No new
texture, light, mesh, instance, draw, sampler, uniform or fetch is introduced;
`viewMatrix` already exists in Three's prefix. Extra fragment ALU is real, and
unchanged resource counts do not establish unchanged GPU cost.

## Regression coverage, simplicity and validation

Only `tests/unit/wrecks.test.ts` is extended, inside its existing mapped-steel
capability. It evaluates the **emitted** up/multiplier expressions using CPU
vector/builtin adapters. Expected classification comes independently from world
normal Y and deck/side/underside endpoints. **1,215 rotated/scaled evaluations**
cover 24 normals each on Low/Medium and 33 on High, five rotations (identity,
90° pitch, 180° yaw, 90° roll, mixed angles), nonzero translation and three
positive scales. High includes flat and tilted synthetic tangent-space samples
on deck/side/underside frames, with its actual normalScale. These synthetic
samples do not execute Three's derivative or texture sampling shader.

In-memory Vite mutations, without source edits, demonstrate the guard fails if
world-up stays in world space or if w becomes 1 (camera translation contaminates
up). Both fail camera-invariant up at the expected assertion. Mutation runs
select just the mapped capability; their other 39 tests are unselected, not new
skips in the spec. Original rim assertions, fallback checks and budgets remain.

No production code, subsystem, dependency, setting, guidance surface, site branch,
config mutation, layout patch or package-named spec is added. Nothing on screen
needs replacement. The non-visual rubric supports deterministic correctness,
clear material behavior and simple operation. Discovery, rewards, factual site
information and accessible controls are unchanged. Beauty, composition, contrast,
phone appearance and screenshot acceptance remain Claude/owner responsibilities.

Final validation:

- PASS `npm test -- --configLoader runner --cache=false tests/unit/wrecks.test.ts`:
  **40/40**, 21.51 s. A diagnostic supported `--pool=threads` invocation also
  passed **40/40**, 21.43 s; no timeout/retry/assertion changes.
- PASS `npm run typecheck`, isolated parent/current/source/lane probe, and
  `git diff --check`. Both deliberate coordinate mutations rejected as expected.
- Required `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`: **exit 1**,
  **actual e2e mode: none**. PASS: config, content, production build (including
  typecheck), full units (**192 files / 3,329 tests**, 591.54 s), attribution
  and repository-wide Prettier. No interrupted or unverified unit gate remains.
- Python: **162/167 passed, 5 failures**: four build-manifest cases at
  `spawnSync git EPERM`, golden-tooling child JSON at
  `tools/tests/golden-manifest.test.mjs:151` (`Unexpected end of JSON input`).
  These repeat the prior sandbox subprocess/provenance failures; tooling untouched.
- PASS final owned-file Prettier check and `git diff --check`.

Evidence: ignored `.cache/2830-S-verify-steel-up-vector/` holds merge diff,
empty prior/post consumer diffs, isolated module probe, emitted/expanded fragment
sources, `measurements.json`, focused/typecheck/mutation logs and `gates.log`.
Gate step logs: `.cache/runs/20261020-170438-3-KX2Yg2/`.
No WebGL context, game rendering, screenshots, GLSL compilation/linking,
smoke/full/project-base browser checks, GPU or real-phone acceptance is claimed.
No merge, push, tag, tooling or Director edit.
