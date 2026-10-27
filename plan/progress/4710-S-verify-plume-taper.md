# S-verify: shared plume taper and alternate-source rotation

Numerical verification, 2026-10-27. Item **S-verify**, Director Backlog 9.
**Result: no confirmed numerical or budget defect; report only.**

## Revision and scope

| Role                                 | Full SHA                                   |
| ------------------------------------ | ------------------------------------------ |
| Checkout tested                      | `21977437524393c93ee712c974c370e8993ded71` |
| Comparison base, merge first parent  | `f96924f10708e3e959b7f0b5b5af480eb8e32c26` |
| Comparison head, V-beebe-trunk merge | `2361b4fc67f75c1049e670512319e1f5e42cb466` |

Read Director's simplicity rules and rubric, `V-beebe-trunk.md`, and the
4570-S-verify-beebe-flow launched brief, result and progress report. The queue
and progress-note search found only this package covering this exact delta.
4570 compares `cc82a82eb5c79e13ea71e84b27c75621e5986302` with
`b52caaf8877fe1560be1ceb2411e77b42e245e90`, tested at
`3e478036da49d53f083aa931954227a7dc107731`; it predates these expressions.

The isolated merge changes `VentPreset.ts`, its existing haze capability spec
and the visual progress note. Production changes are one scalar `aSwing`
attribute, its source-index assignment, radius/size taper, drift rotation and
alpha timing. Checkout preset source/data and the focused haze, preset and
isolation specs match the merge. Later unrelated prop work is outside this
comparison. No rendering, screenshot judgement, art changes, permanent tests,
snapshot updates, fixes or machinery were added. The report meets the
simplicity rules without adding a player-facing surface or setting. Visual
rubric acceptance and the DONE composition remain with Claude.

## Existing guards, mapped before diagnostics

`tests/unit/ventHazeBudget.test.ts` has eight existing cases:

- Omitted haze controls and forced Titanic vent retain two particle draws.
- Beebe shares one additive haze draw across sources, checks its uniforms and
  count, retains wisps in the smoke draw, checks pace/scale variation, and now
  checks that the set of swing values is `{0,1}`. Exit removes Points and resets
  stats.
- Explicit zero strength removes only the optional haze draw.
- Valid mission controls reach uniforms; negative strength and infinite size
  overrides are rejected and defaulted with warnings.
- Carbonate fluid cannot inherit sulfide haze.
- Low Beebe creates no visual objects or glow lights.

The swing set assertion alone does not establish count, finiteness, grouping
or repeatability. Those are checked temporarily below. Existing `presets`
tests cover selection, variety, glow budgets, re-entry and cross-site atmosphere
isolation. `beebeIsolation` checks cross-site biome/terrain/material evidence
and chimney/source isolation; it does not snapshot this preset smoke shader.
`perf-budget` checks static site costs and the separate Lost City fill budget.

## Shipped consumers and attribute contract

Enumerated all 13 shipped mission documents through production `selectPreset`.
Only Beebe, Axial ASHES and Lost City select vent. Built their actual props on
their actual heightmaps at Low/Medium/High and entered production
`PresetSystem`; no builder was reimplemented. Beebe and Axial draw this changed
smoke on Medium/High. Low disables preset visuals; Lost City ships carbonate
fluid with zero smoke intensity, shimmer and glow lights, so all its tiers
have zero preset Points. The other ten missions select other presets. Forced
debug vent presets also use the shared implementation but are outside the
shipped-consumer census. Mound `smokePlume` Points use a separate shader.

At both revisions every inspected preset attribute has the position count and
only finite values. New `aSwing` is a scalar Float32Array: array length equals
point count, item size 1, values exactly 0 or 1. Assignment is `sourceIndex % 2`
after descending source-height selection. Each contiguous source block,
including its initial wisps, has one value:

| Site/tier    | Smoke positions, before = after | Points/source | Wisps/source | Swing 0 / 1 points |
| ------------ | ------------------------------: | ------------: | -----------: | -----------------: |
| Beebe Medium |                           6,000 |         2,000 |          320 |      4,000 / 2,000 |
| Beebe High   |                          12,000 |         4,000 |          640 |      8,000 / 4,000 |
| Axial Medium |                           6,000 |         1,000 |          160 |      3,000 / 3,000 |
| Axial High   |                          12,000 |         2,000 |          320 |      6,000 / 6,000 |

Beebe source order is `beebe-chimney-1`, `-2`, `-3`, with swing `0,1,0`.
Axial order is `ashes-smoker-mound`, `inferno-chimney`, `mushroom-chimney`,
`hell-chimney`, `phoenix-chimney`, `virgin-chimney`, with `0,1,0,1,0,1`.
Measured selected heights descend strictly at both drawn tiers. Thus no tie
ambiguity occurs here. Assignment depends on selected order, not a random draw
or a permanent source ID; arbitrary source-list changes need not preserve it.

After exit and fresh entry with identical placed inputs, complete preset
attribute SHA-256 hashes match within each revision. Across parent/head, hashes
of all attributes excluding `aSwing` match for every site/tier. Existing origin,
seed, variety and pace arrays are byte-identical; allocating swing consumes no
RNG values. Different terrain tiers can retain their existing different variety.

## Lifecycle arithmetic

Used actual material uniforms and buffer values. Shipped resolved size endpoints
are **1.6 and 4.6 m**, rather than the builder's omitted-parameter fallback of
7 m. Beebe has rise height 70 m, lifetime 105 s and opacity 0.9; Axial already
has rise height 45 m, lifetime 67.5 s and opacity 0.7 at this comparison base.
Do not transplant 4570's older Axial 70 m envelope into this comparison.

Let `S = smoothstep(0.2,0.9,t)`, `T = 1 - 0.65*S`,
`F = smoothstep(0,0.04,t)*(1-S)`. The new radius is the same-phase parent
radius times `T`. Size is `B(t)*g`, where
`B(t)=(1.6+3*sqrt(t))*T` and
`g=(0.7+0.6*seed.w)*(wisp ? 0.3 : sqrt(aVar.y))`.
Alpha is `F*opacity*(wisp ? 0.4 : aVar.z)`.

| Phase         |  Taper T | Radius growth factor `(0.06+0.94*t^1.35)*T` |  B(t), m |    New F | Parent alpha factor |
| ------------- | -------: | ------------------------------------------: | -------: | -------: | ------------------: |
| 0, birth      |        1 |                                    0.060000 | 1.600000 |        0 |                   0 |
| 0.04          |        1 |                                    0.072187 | 2.200000 |        1 |                   1 |
| 0.2           |        1 |                                    0.167033 | 2.941641 |        1 |                   1 |
| 0.5           | 0.744169 |                                    0.319066 | 2.769292 | 0.606414 |                   1 |
| 0.55          | 0.675000 |                                    0.323588 | 2.581780 |      0.5 |               0.972 |
| 0.9           |     0.35 |                                    0.306380 | 1.556117 |        0 |               0.104 |
| 1, left limit |     0.35 |                                    0.350000 | 1.610000 |        0 |                   0 |

Continuously, `T` stays in `[0.35,1]`, `F` in `[0,1]`, with full alpha from
0.04 through 0.2 and zero from 0.9 onward. Size does not monotonically shrink:
its scalar maximum is approximately **3.129875 m at t=0.316385**, versus the
parent limit 4.6 m, or **68.0408%**. Its minimum is approximately 1.551657 m
at t=0.883699, then it rises slightly while invisible. Radius growth likewise
need not be monotonic, although the taper multiplier is. At wrap, alpha is
zero on both sides. Invisible late-cycle particles still occupy buffers/draws.

Scalar extrema were evaluated on a 0.000001 grid. Continuous bounds account
for intervals between samples: radius-factor derivative magnitude is at most
`0.94*1.35 + 0.65*1.5/0.7 < 2.662`, giving upper bound **0.35002**.
For size, the interval through 0.2 is increasing; above 0.2 the derivative
magnitude is at most `3/(2*sqrt(0.2)) + 4.6*0.65*1.5/0.7 < 9.763`.
The diagnostic's 0.00001 size grid plus this allowance gives a conservative
maximum below **3.13 m**. Thus continuous claims do not depend solely on
sampled extrema.

Evaluated **1,001 phases per particle, 36,036,000 motion samples per revision**,
including birth and the death left limit, recovering elapsed time using each
particle's actual seed/pace/lifetime. Included wisps, actual ambient drift and
the GLSL column-major rotation. All centres, radii, sizes, alpha and times
were finite. Approximate sampled ranges and maxima:

| Site/tier    | Parent main size max, m | New main size range, m | New wisp size range, m | Main alpha range | Wisp alpha range |
| ------------ | ----------------------: | ---------------------- | ---------------------- | ---------------- | ---------------- |
| Beebe Medium |                6.862627 | 0.851199–4.669381      | 0.325908–1.219885      | 0–0.839218       | 0–0.36           |
| Beebe High   |                7.864411 | 0.849273–5.351002      | 0.325908–1.220258      | 0–0.747072       | 0–0.36           |
| Axial Medium |                7.951836 | 1.015765–5.410486      | 0.325908–1.219885      | 0–0.692188       | 0–0.28           |
| Axial High   |                7.960252 | 1.156298–5.416212      | 0.325908–1.220258      | 0–0.714413       | 0–0.28           |

Parent wisp size maxima are 1.792875 / 1.793423 m at Medium/High at either
site. Alpha maxima are unchanged; only the fade interval changes. The fragment
mask and fog further multiply alpha by factors within `[0,1]`.

Unchanged cycle periods are 83.014616–128.820582 s at Beebe, 58.891107–73.009338 s
at Axial Medium, and 58.891107–76.799130 s at Axial High. Maximum main centre
rise remains 89.980005 / 93.199221 m at Beebe and 60.859827 m at Axial.
Wisps retain `hs=height*(0.22+0.2*pace)`, `ws=0.14+0.2*width`, their lateral
origin offset and 0.4 m downward offset. Their height multiplier is positive
and at most `1.4*0.48=0.672`; their size gain uses 0.3 and alpha gain 0.4.
All fractional-power bases are nonnegative on `[0,1)`. Positive finite
lifetimes/pace and bounded trigonometric terms cover later cycles too.

## Rotation and bounds

Odd sources add **2.4 rad = 137.509871 degrees**, rather than exactly 180
degrees. The matrix maps `(dx,dz)` to `(cos(a)*dx-sin(a)*dz,
sin(a)*dx+cos(a)*dz)` and preserves its norm. Wisps share their source's swing;
their effective drift gain remains `0.6*0.35=0.21`. Main gain remains
`abs(lean)`. Pre-rotation drift is still capped at `0.7*riseHeight`, namely
49 m at Beebe and 31.5 m at Axial.

Rotation does change directional extent: the same capped drift endpoint can
move by `2*cap*gain*sin(1.2)`. Maximum such differences among actual odd-source
particles are 98.152517 m at Beebe, 86.537118 m at Axial Medium and 75.938202 m
at Axial High. These are worst-current bounds, not the observed ambient
displacements. Shrinking radius alone would not justify retaining an old
directional box or claiming the new footprint is a subset of the old one.

For every source used this rotation-independent horizontal bound:

```text
source-to-buffer-origin horizontal offset
 + spread * ws * seed.z * 1.24 * bias * Rmax
 + sqrt(2) * (0.2*spread + 2.2)
 + 0.7*riseHeight * (wisp ? 0.21 : abs(lean))
 + maximum size parameter / sqrt(2)
```

Here `bias=(0.55+0.45*seed.w)*(seed.w>0.93 ? 1.35 : 1)`;
`Rmax=1` for parent and 0.35002 for head. The final term allows a sprite
half diagonal in the size parameter's world units. Conservative maxima over
all actual particles, about their respective source, are:

| Site/tier    | Parent horizontal allowance, m | Head horizontal allowance, m |
| ------------ | -----------------------------: | ---------------------------: |
| Beebe Medium |                     105.405832 |                    89.627822 |
| Beebe High   |                     114.979987 |                    89.777804 |
| Axial Medium |                      93.212190 |                    72.533200 |
| Axial High   |                     101.491395 |                    73.911179 |

These bounds cover any capped horizontal-current direction and every cycle;
they do not assert containment in the parent's actual directional footprint.
`makePoints` is identical before/after: **frustumCulled=false**, with an
intentional infinite geometry sphere. The preset Points are separate scene
children, outside the chimney prop bounds. There is consequently no finite
preset culling bound that this new rotation or taper can invalidate. Enabling
finite culling later would require accounting for this rotated drift.

`placePoint` still divides by `max(1,dist)` and clamps to `[1,256]` pixels.
Its 1-pixel minimum means the size-parameter allowance above is not a universal
raster-footprint bound for all camera distances/projections. This does not
affect the disabled-culling contract. CPU arithmetic does not establish GPU
compilation/precision, fill time, appearance or phone acceptance.

Reused 4570's established facts for unchanged flow/haze and mound code:
`VentPreset.ts`, `plume.ts` and `smokers.ts` are byte-identical between the flow
merge and this merge's first parent. This isolated delta does not change haze,
shimmer, mound geometry/shaders, reach/top helpers, or resource ownership and
release paths. Their earlier independent bounds/disposal audit was not repeated.

## Counts, memory and budgets

Each smoke point grows from **48 to 52 attribute bytes**: position vec3, seed
vec4, variety vec4, pace scalar, plus new swing scalar. No indices, points,
objects or lights are added. Allocations below are typed-array payload bytes,
not a measured driver/VRAM allocation.

| Site/tier             | All preset points, parent = head | Preset draws, parent = head | All preset attribute bytes, parent → head |  Delta |
| --------------------- | -------------------------------: | --------------------------: | ----------------------------------------: | -----: |
| Beebe Low             |                                0 |                           0 |                                     0 → 0 |      0 |
| Beebe Medium          |                            6,018 |                           3 |                         288,324 → 312,324 | 24,000 |
| Beebe High            |                           12,018 |                           3 |                         576,324 → 624,324 | 48,000 |
| Axial Low             |                                0 |                           0 |                                     0 → 0 |      0 |
| Axial Medium          |                            6,036 |                           3 |                         288,648 → 312,648 | 24,000 |
| Axial High            |                           12,036 |                           3 |                         576,648 → 624,648 | 48,000 |
| Lost City, every tier |                                0 |                           0 |                                     0 → 0 |      0 |

Every preset row contributes **zero triangles** before/after. Beebe's smoke,
shimmer and haze counts are 6,000/9/9 or 12,000/9/9; Axial's are
6,000/18/18 or 12,000/18/18. Smoke alone is 288,000→312,000 bytes on Medium
and 576,000→624,000 on High. The 20,000-particle ceiling retains unchanged
headroom: Beebe 13,982/7,982; Axial 13,964/7,964 at Medium/High.

For completeness, production-built full-prop static costs, using the existing
perf-budget counting function, also match parent/head (all full props at once,
instances/groups/double-sided passes included, impostors excluded):

| Site      | Low calls / triangles | Medium calls / triangles | High calls / triangles |
| --------- | --------------------: | -----------------------: | ---------------------: |
| Beebe     |           21 / 20,338 |             21 / 104,306 |           21 / 179,834 |
| Axial     |            18 / 8,206 |              18 / 16,650 |            18 / 30,488 |
| Lost City |           40 / 49,124 |             40 / 146,994 |           40 / 206,428 |

Preset draws are additional to those prop calls. All listed costs are below
the static 1,200-call / 1,200,000-triangle limits (enforced on Low for these
sites); the existing 300-call / 300k-triangle scene reservation is preserved.
Existing tier counts/draw/triangle budgets pass without changing tolerances.
Reduced same-phase sprite size/alpha does not prove lower rendered frame cost:
rotation changes overlap and visibility, and the minimum point-size clamp
remains. No rendered FPS or full-scene e2e budget claim is made.

## Capture provenance

The six exact PNGs cited by `V-beebe-trunk.md` are available only under the main
checkout's `.cache/codex/shots/V-beebe-trunk/{before,after}/`, named
`beebe-vent-field-{1,2,3}.png`. They are absent from this checkout. Both cited
directories contain only the three PNGs, with no manifest or pose record.
Read PNG chunk metadata without decoding image pixels: all six contain only
IHDR/IDAT/IEND, with no embedded text/EXIF provenance.

Therefore **recorded SHA and pose are unavailable for every cited before/after
image**. Directory names, file times and numeric suffixes cannot bind them to
the comparison revisions or to a particular camera pose. No available cited
manifest can be bound, no unrelated golden set is substituted, and no appearance
claim or visual acceptance is made.

## Commands, results and limitations

Read-only Git inspection included:

```sh
git rev-parse HEAD 2361b4fc^1 2361b4fc
git diff 2361b4fc^1 2361b4fc -- src/world/presets/VentPreset.ts
git diff --exit-code 2361b4fc HEAD -- src/world/presets data tests/unit/ventHazeBudget.test.ts tests/unit/presets.test.ts tests/unit/beebeIsolation.test.ts
git diff --exit-code b52caaf8 2361b4fc^1 -- src/world/presets/VentPreset.ts src/world/props/geo/plume.ts src/world/props/geo/smokers.ts
```

The exit-code comparisons pass. Extracted each comparison revision's source,
data and package metadata using `git archive` into `/tmp/4710-plume-parent`
and `/tmp/4710-plume-head`; linked installed dependencies. Parent capability
checks additionally use that revision's tests, public assets, Vitest config
and read-only extracted `tools/blue-hole-poses.json` fixture.

```sh
node node_modules/vitest/vitest.mjs run tests/unit/ventHazeBudget.test.ts tests/unit/presets.test.ts tests/unit/beebeIsolation.test.ts tests/unit/perf-budget.test.ts --configLoader runner --cache=false --pool=threads
# Run from each /tmp/4710-plume-{parent,head} directory:
node node_modules/vitest/vitest.mjs run --config diagnostic.config.mjs --configLoader runner --cache=false --pool=threads
```

- Existing focused checks: **4 files / 114 tests pass** at checkout, 34.95 s;
  **4 files / 114 pass** at comparison parent, 34.32 s. No snapshot rebaseline.
- Final temporary diagnostic: **pass at both comparison revisions**, 25.75 s
  parent / 25.77 s head. Outputs: `/tmp/4710-plume-{parent,head}/diagnostic.json`;
  scripts/configs remain there. Identical diagnostic script SHA-256:
  `da3dd4c20fd5adf47e5fd91571192b1aa19a63bd92ad53e44c0881fb14eaa864`.
- Cross-revision JSON comparison confirms identical existing attribute hashes,
  stats and static prop costs, with memory increase exactly `4*smokePointCount`
  in every row. Diagnostics use real production builders and temporary CPU
  shader arithmetic, rather than permanent mirrored implementation tests.
- Initial temporary harness attempts lacked the re-entry update call and a
  copied parent pose fixture; corrected those harness inputs before the passing
  results above. These were not production counterexamples.
- No broad gates or game/e2e rendering were run in this scoped package. 4570's
  result wrapper labels its external gates PASS, while its authored report
  records incomplete gates/environment failures; neither is used as current
  gate evidence. Current evidence is the focused checks and diagnostics above.

Only this progress report is delivered. No confirmed defect needs a proposed
correction. Other packages, tools, Director, production, authored data, tests
and snapshots remain unchanged; no merge, push or release action was taken.
