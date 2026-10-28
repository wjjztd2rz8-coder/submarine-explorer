# 4790 — S-verify: terrain mottle numerical contract and default isolation

2026-10-28. Standing **S-verify**, DIRECTOR Backlog 12. Numerical result: clean for the shipped values and documented 0..1 domain. The default preserves the original expressions algebraically. Focused unit checks pass; browser execution and the attempted production build remain unverified as detailed below. No numerical correction is proposed.

## Scope, provenance and duplication

- Checkout: `/home/vijay/subexp-wt/4790-S-verify-terrain-mottle`, branch `codex/4790-S-verify-terrain-mottle`.
- Checkout HEAD before and after verification: `146a7da50680520c4f8a5dfded8d74952146b05c` (tree `f485c46baf11636effc5f862ef8ca1e6b9d72bab`). Initially clean.
- Comparison base, `1aa1059d^`: `cf3956ba39cd2dde63ed915d5c3f2acdc20d4da9`.
- Comparison head: `dd6f63cd0c02eaa2413f8823e2ba43cddf50e6c3`.
- `git diff dd6f63cd HEAD --` the three scoped production files and the biomeFloorVariety, beebeIsolation, snapshot and terrainMaterialReady files is empty. Checks on this checkout therefore exercise the compared implementation.

Read DIRECTOR's simplicity rules and review rubric, the newest REVIEWS entry (2026-10-28 04:45 joint round 1), OVERNIGHT-LOG through run 208, and `V-terrain-blotch.md`. Reviewed current launched briefs/results in `/home/vijay/submarine-explorer/.cache/codex/`: debrief objectives, timings, journey acceptance, 70/71 verification/hunt, and 4730–4780. The launch log records this brief at 08:47:01 CDT. A search of **all** launched brief Markdown and completed `*-result.md` files for `mottle|1aa1059d|dd6f63cd|terrain.blotch` matched only this brief; the same search in tracked progress notes matched only the DONE visual item's note. Rechecked before writing this report: no duplicate coverage of this delta. Earlier terrain/opening reports precede this change. Journey acceptance remains with its launched owner; phone acceptance, debrief, timing, start/save and the six implemented deletion findings were left alone.

The complete comparison sequence matters:

| Full commit                                | Relevant change                                                                                                                                                                         |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `1aa1059dc765de236a7ed1c7a7c0f6903f941e6f` | Adds optional biome field, per-material uniform and three shader expression changes; tunes Axial, Hunga and Kama palettes/patches. Hunga initially uses colorB `0x575553`, patch `0.2`. |
| `b23426a973970854a8d64b81f0fbf9a899607313` | Hunga colorB `0x575553` → `0x5a5856`, patch `0.2` → `0.08`.                                                                                                                             |
| `1063140e685d7de189a5750381cad960ef67c989` | Visual progress note only.                                                                                                                                                              |
| `c80d0ecb2a4b2f984f1bbd1f52c1e103fca50e45` | Updates the two Kama expectations, 55 snapshot digest leaves, and the visual note.                                                                                                      |
| `dd6f63cd0c02eaa2413f8823e2ba43cddf50e6c3` | **Only** `plan/STATUS.md`; no implementation change.                                                                                                                                    |

Only this report is added. Production, tests, snapshots and other notes remain untouched. This follows the simplicity rules by using the existing biome table and existing capability checks, with no new shared site branch, setting, API or test. The visual/player-facing rubric is outside this numerical package; no visual acceptance score is assigned.

## Effective values, defaults and material ownership

`TerrainBiome.ts` is the existing table keyed by tile ID. `biomeFor(id)` returns `BIOMES[id] ?? DEFAULT_BIOME`. Terrain construction passes that biome into `createTerrainMaterial`; inside each factory call a fresh uniforms object contains `uMottle: { value: biome.mottle ?? 1 }`. The compiler callback binds those same owner-local wrappers using `Object.assign(shader.uniforms, uniforms)`. Uniform values can share a compiled program; the cache key does not need to encode this scalar.

The base ABYSSAL and VOLCANIC objects do not set mottle. `DEFAULT_BIOME` spreads ABYSSAL and also omits it. There is no tier override. Runtime inspection of actual material construction gave:

| Biome / fallback                  | Authored `mottle` | Effective `uMottle`, Low / Medium / High |
| --------------------------------- | ----------------- | ---------------------------------------- |
| `titanic`                         | omitted           | 1 / 1 / 1                                |
| `bismarck`                        | omitted           | 1 / 1 / 1                                |
| `endurance`                       | omitted           | 1 / 1 / 1                                |
| `challenger-deep`                 | omitted           | 1 / 1 / 1                                |
| `lost-city`                       | omitted           | 1 / 1 / 1                                |
| `axial-seamount-ashes`            | 0.3               | 0.3 / 0.3 / 0.3                          |
| `beebe-vent-field`                | omitted           | 1 / 1 / 1                                |
| `hunga-tonga-caldera`             | 0.3               | 0.3 / 0.3 / 0.3                          |
| `kamaehuakanaloa`                 | 0.3               | 0.3 / 0.3 / 0.3                          |
| `blake-plateau-corals`            | omitted           | 1 / 1 / 1                                |
| `great-blue-hole`                 | omitted           | 1 / 1 / 1                                |
| `monterey-canyon`                 | omitted           | 1 / 1 / 1                                |
| `hudson-canyon`                   | omitted           | 1 / 1 / 1                                |
| unknown tile / synthetic fallback | omitted           | 1 / 1 / 1                                |

All 39 shipped material values and three fallback values are finite and within 0..1. Only Hunga, Kama and Axial opt into 0.3. Separate temporary diagnostics confirmed 42 distinct wrappers, identity between each material's wrapper and its injected shader wrapper, and no change to other live materials when one wrapper's value was mutated. Biome registry serialization remained unchanged. The value is an immutable number copied at construction, not a reference to the biome field. Changing a temporary input biome after construction did not change the material. Explicit 0 is preserved; undefined resolves to 1 (null also resolves to 1 at runtime, although it is outside the declared optional-number type).

The existing biomeFloorVariety tests also compare all uniform-wrapper owners, retain earlier material states across later/reversed site construction, and cover loaded/unavailable maps. The new uniform participates in those generic loops. terrainMaterialReady covers map completion/error/teardown and replacement isolation; it has no dedicated mottle-value assertion, so the explicit value/binding evidence above comes from the temporary diagnostic.

## Shader arithmetic

Let `m = uMottle`, `x = m1.x`, and `y = m2`. terrainHash yields a value below 1 and terrainNoise interpolates its corner values with smoothstep weights, so closed bounds `x,y ∈ [0,1]` are conservative in real arithmetic. `macro = 0.6x + 0.4y` is also in [0,1].

The changed brightness multiplier is

`B(m,x,y) = 1 - m + m (0.74 + 0.52x)(0.9 + 0.2y)`.

The old product lies in `[0.666, 1.386]`; hence the new bounds are `[1 - 0.334m, 1 + 0.386m]`. Hue multipliers are `R = 1 + m(0.04 - 0.08y)`, `G = 1`, `B_channel = 1 + m(-0.05 + 0.10y)`. These are finite and positive throughout the documented domain. Their multiplication with brightness is also finite and positive; the separate interval bounds do not assert that all channel extrema occur together.

| m   | Brightness multiplier bounds | Red bounds     | Green | Blue bounds    | Stain coordinate divisor (m) | Coordinate frequency (1/m) |
| --- | ---------------------------- | -------------- | ----- | -------------- | ---------------------------- | -------------------------- |
| 0   | [1, 1]                       | [1, 1]         | 1     | [1, 1]         | 11                           | 0.0909091                  |
| 0.3 | [0.8998, 1.1158]             | [0.988, 1.012] | 1     | [0.985, 1.015] | 8.69                         | 0.1150748                  |
| 1   | [0.666, 1.386]               | [0.96, 1.04]   | 1     | [0.95, 1.05]   | 3.3                          | 0.3030303                  |

The stain divisor is `D(m) = mix(11, 3.3, m) = 11 - 7.7m`. For every permitted m it is in `[3.3,11]`, strictly positive: no newly introduced zero division or sign flip. At 0.3 its noise coordinate varies about 2.6333 times more slowly than the original 3.3 m lattice. This changes the scale of the stain-noise component, not the unchanged macro component or the complete stain field's wavelength.

The stain smoothstep still has ordered edges 0.5 and 0.78. Its input is a convex combination `0.55 * noise + 0.45 * macro`, bounded by [0,1]. The following multiplier and clamp are unchanged: `st *= uStainAmount * (0.55 + 0.9 * rockT + 0.5 * max(cav,0))`; `mix` receives `clamp(st,0,0.85)`. With `rockT ∈ [0,1]` and `cav ∈ [-1,1]`, that parenthesis is in `[0.55,1.95]`. For Axial/Hunga/Kama the respective upper stain weights are 0.819 / 0.2925 / 0.234 before the unchanged 0.85 cap, using amounts 0.42 / 0.15 / 0.12.

At **m = 1**, both outer mixes reduce algebraically to the original brightness and hue expressions, and the divisor reduces to the original 3.3. At **m = 0**, those two multipliers become identity, while the stain lattice divisor becomes 11; stains, material patches, cavity shading, ripples and other existing paths remain active. Zero does not mean an entirely flat or unstained output.

This establishes the documented default **expression identity**, not pixel equality. The visual note's “pixel-identical” wording is stronger than source/numerical evidence establishes: no GPU compilation, floating-point pixel comparison, screenshot or rendered appearance was evaluated. The factory does not clamp or validate arbitrary external mottle inputs; the verified contract is shipped data and the documented 0..1 domain, with finite existing shader inputs.

## Palette and expectation accounting

Separate from the new default uniform, the comparison changes exactly these authored palette/patch values:

| Site  | Base → comparison head                                                                                                                                            |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Axial | colorB `0x6a655c` → `0x4a4743`; stain inherited `0x8a4a22` → `0x5a4a3c`; mottle omitted → 0.3. Patch stays 0.35.                                                  |
| Hunga | colorB `0x4a4948` → `0x5a5856` via intermediate `0x575553`; stain inherited `0x8a4a22` → `0x5a5048`; patch 0.3 → 0.08 via intermediate 0.2; mottle omitted → 0.3. |
| Kama  | stain `0x6e3a1c` → `0x7a5a44`; patch 0.3 → 0.2; mottle omitted → 0.3. colorA/B/C stay `0x8a6b54` / `0x7a6a5c` / `0x2f2e30`.                                       |

`biomeFloorVariety.test.ts` changes only two expectations in its existing `$tier / $maps: retains silt over basalt and isolates repeated site construction` cases: Kama `uStain` now expects the linear THREE.Color conversion of `0x7a5a44`, and `uPatch` expects 0.2. These exactly follow the table; slot selection, shared B/C requests, stain amount, normal/contrast/ripple bindings, ownership assertions and tolerances are retained. No explicit mottle expectation was added in that commit.

## Every affected beebeIsolation row

The beebeIsolation test source is unchanged. Its first snapshot serializes the biome, nontexture uniform wrappers, assembled shader source, cache key and synthetic terrain buffers for every biome **except Beebe**, plus `unknown`, at Low/High. Shader hashes describe source bytes, not rendered output. The shared declaration and three shared expression edits change every shader hash even when mottle defaults to 1. Every uniform hash changes because `uMottle` is newly serialized.

Below, uniform changes apply to **both Low and High**. Every row also changes both shader hashes. H = horizon-fade shader, N = no-fade shader, A = abyss-fade shader, R = high rock-detail shader with no fade (its Low uses N). Existing tier defines and cache keys are unchanged.

| Snapshot site row      | Biome digest changes?             | Uniform fields accounting for its new digest | Shader variants, Low / High |
| ---------------------- | --------------------------------- | -------------------------------------------- | --------------------------- |
| `axial-seamount-ashes` | yes: colorB, stain, mottle        | uMottle=0.3, uColB, uStain                   | H / H                       |
| `bismarck`             | no                                | uMottle=1 only                               | N / N                       |
| `blake-plateau-corals` | no                                | uMottle=1 only                               | H / H                       |
| `challenger-deep`      | no                                | uMottle=1 only                               | N / N                       |
| `endurance`            | no                                | uMottle=1 only                               | A / A                       |
| `great-blue-hole`      | no                                | uMottle=1 only                               | H / H                       |
| `hudson-canyon`        | no                                | uMottle=1 only                               | H / H                       |
| `hunga-tonga-caldera`  | yes: colorB, stain, patch, mottle | uMottle=0.3, uColB, uStain, uPatch           | H / H                       |
| `kamaehuakanaloa`      | yes: stain, patch, mottle         | uMottle=0.3, uStain, uPatch                  | N / N                       |
| `lost-city`            | no                                | uMottle=1 only                               | N / R                       |
| `monterey-canyon`      | no                                | uMottle=1 only                               | N / R                       |
| `titanic`              | no                                | uMottle=1 only                               | A / A                       |
| `unknown`              | no                                | uMottle=1 only                               | N / N                       |

Temporary base/head snapshot parsing confirms exactly **55 changed digest leaves: 3 biome + 26 uniform + 26 shader**. Every geometry buffer digest and every program cache key is identical across the comparison. The entire second snapshot, `F-1080: confines chimney detail to Beebe while retaining collision and vent sources`, is unchanged, including its placements, geometry, vent anchors and budgets. No snapshot was regenerated. Beebe's own terrain row is intentionally absent from the first snapshot; its default-1 binding is covered by the separate material diagnostic.

## Executed checks and limits

1. `git rev-parse HEAD HEAD^{tree} 1aa1059d^ 1aa1059d dd6f63cd`, `git log --format=fuller --reverse 1aa1059d^..dd6f63cd`, per-commit `git show`, and `git diff 1aa1059d^ dd6f63cd --` the scoped files: inspected the full sequence above. `git diff --numstat` confirms 55 additions/55 removals in the snapshot and no beebeIsolation test-source change.
2. `npx vitest run tests/unit/biomeFloorVariety.test.ts tests/unit/beebeIsolation.test.ts tests/unit/terrainMaterialReady.test.ts`: initial startup blocked by EROFS writing bundled config into the shared read-only `node_modules/.vite-temp`.
3. Same command with `--configLoader runner`: **exit 0; 3 files, 75 tests passed**, 3.64 s (08:48:14 CDT). Existing scatter/geometry/budget and material/readiness coverage was reused without edits or extra audits.
4. `node /tmp/4790-mottle/check.mjs`: final run **exit 0**; log `/tmp/4790-mottle/check.log`. Temporary Vite SSR loading (no renderer/listening server, HMR/WebSocket disabled) compared actual base/head biome and material modules. Base source copies came from `git show` at the full base SHA; only their import paths were adapted to local modules. It enumerated all 42 current material bindings, compared nontexture uniforms against base, checked owner identities/mutation isolation and fallback/zero behavior, and parsed saved base/head snapshots to assert the 55-leaf accounting and unchanged second snapshot. Setup attempts first encountered temporary-module resolution and Node child-process `git EPERM`; using a temporary dependency symlink and shell-extracted snapshot files resolved those. An initial diagnostic assertion compared key arrays in the wrong order; sorting those arrays fixed the diagnostic, with no repository changes.
5. Python `fractions.Fraction` calculations at 0, 3/10 and 1 produced the exact bounds/divisors tabulated above; positive divisor bounds pass. These support the algebra, not GPU float equivalence.
6. `rg -n -i 'biome|terrain|beebe|mottle' tests/e2e` and the narrower material/uniform matches identified `f-bluehole-squiggle.spec.ts`'s noncapture default-material check. Its separate `@render` bisect and terrain/opening/performance capture suites were excluded by scope.
7. `VITE_CACHE_DIR=/tmp/4790-vite-cache npm run build -- --configLoader runner --outDir /tmp/4790-dist`: **exit 1**. TypeScript completed and Vite transformed 301 modules, but the build failed during chunk/plugin completion: `Vite module runner has been closed`, `submarine:pwa` / `closeBundle`. No production-build pass is claimed; source/config/plugins were not changed to work around it.
8. `PW_PORT=4379 PW_OUTDIR=/tmp/4790-dist GATES_CONFIG_MODE=writable npx playwright test tests/e2e/f-bluehole-squiggle.spec.ts -g '^Blue Hole: mapless sediment and neutral terrain material$' --output=/tmp/4790-playwright-results`: **exit 1 before test bodies**, webServer could not start. Repeated once with `DEBUG=pw:webserver` to identify the block; it reported `connect EPERM` for both `::1:4379` and `127.0.0.1:4379`, then webServer exit 1. This capability check is **unverified**, with no browser captures or rendering performed and no e2e pass claimed. The incomplete build is an additional limit on browser validation.

Final document checks: `npx prettier --write plan/progress/4790-S-verify-terrain-mottle.md`, then `npx prettier --check plan/progress/4790-S-verify-terrain-mottle.md` and `git diff --check`. Final status contains only the named new report; checkout HEAD is unchanged.

No all-site opening, placement, collision, performance or broader gate audit was launched. No new tests, baseline updates, dependencies, tools changes, merge, push or release actions. The numerical/default-isolation package ends here; appearance remains with Claude's DONE V-terrain-blotch item. There is no numerical counterexample within the documented domain and no follow-up work proposed.
