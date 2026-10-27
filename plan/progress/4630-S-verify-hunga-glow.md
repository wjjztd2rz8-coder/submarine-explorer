# S-verify — Hunga tuff glow numerics

Audited 2026-10-27 at **`17b9efa334f1457e111f5d13bee8e98a9f7f54a7`**,
following `plan/DIRECTOR.md`, standing S-verify item and the explicit 4630 brief.
Report only: no art, production code, data, snapshots or permanent tests changed.

**Result:** no cross-site regression from the tuff glow. **Hunga is the only
shipped site using `tuff`; there are no other shared users.** All 13 sites retain
their Low static draw/triangle counts. The mission-opening wall's effective
linear luminance **proxy** rises 2.57–2.65×, but remains **31.2–31.9% of Kama's
pillow body at a defined 40 m camera pose**. This is numerical verification,
not framebuffer luminance or visual acceptance.

## Change and isolation

The V-hunga-subject merge is `d38a92f377d95cc4b1a38463a42ace9ea14faeac`
(first parent `cbf7161071abbb2e0af7e30bdd282d82c521eef8`). Its production delta
is one line in `src/world/props/geo/scarp.ts`:

```ts
glow: { wall: [0.19, 0xb4b09a, 0.25], rubble: [0.15, 0xb4b09a, 0.25] },
```

The builder already calls `vertexGlow` on the wall, apron and boulders. This
adds emission, not reflectance, lights or geometry. The merge updates only
the three tuff material digests in `scarpTerrain.test.ts`; its geometry,
placement and collision digests are unchanged.

Paired measurements use the audited checkout with that exact line present
and absent. This controlled subtraction retains later Monterey and Kama work
on both sides, rather than attributing intervening art changes to Hunga.

Enumerated all 13 shipped prop manifests and traced both the geo and chimney
registries. `tuff-cliff` alone dispatches to `buildScarp('tuff', ...)`, and its
only authored instance is Hunga's `caldera-tuff-wall`. Monterey's four walls
dispatch to `canyon`; Challenger's `north-wall-scarp` dispatches to `hadal`.
The missing-feature fallback in `buildGeo` is **`canyon`**, despite its stale
comment calling it tuff. No shipped `procedural:geo` entry lacks a feature.
No other production call builds a tuff scarp.

## Mean lit-material albedo before/after

Albedo here means **linear `Y(material colour × vertex colour × instance
colour)`**, with `Y = 0.2126R + 0.7152G + 0.0722B`. Emission is reported
separately below; it cannot increase albedo. Node detail textures are null,
so the rock multiplier is exactly **0.07**. Browser maps are normalized by
their whole-texture mean; a view's textured mean still requires rendering.

For a reproducible cross-preset control, these means are weighted by triangle
surface area over wall, apron and boulders, using shipped dimensions and
`hashString(prop.id)` seeds on flat support. Monterey combines all four walls.
Life, impostors and seep points are excluded from this albedo mean. The
mission-view measurement below instead uses real terrain and visible pixels.

| Site / actual preset        |  Low before → after | Medium before → after | High before → after |
| --------------------------- | ------------------: | --------------------: | ------------------: |
| Hunga / **tuff**, sole user | 0.012863 → 0.012863 |   0.012392 → 0.012392 | 0.012176 → 0.012176 |
| Monterey / canyon, control  | 0.018798 → 0.018798 |   0.020404 → 0.020404 | 0.020195 → 0.020195 |
| Challenger / hadal, control | 0.009353 → 0.009353 |   0.009001 → 0.009001 | 0.008869 → 0.008869 |

All **18** paired builds (six authored scarps × three tiers) retain exact
geometry, colour/instance buffers, transforms, bounds, collision and mesh
counts. All non-tuff material/shader hashes also match exactly. Only tuff's
material/shader hashes change. Equality assertions use unrounded values.

## Low draw/triangle pins

The existing `perf-budget.test.ts` static census passes on both sides; all
**29** diagnostic site/tier rows match, including every Low row below.
This includes actual GLB geometry at Blake. No pin or budget was relaxed.

| Site       | Static calls before → after | Triangles before → after |
| ---------- | --------------------------: | -----------------------: |
| Axial      |                     18 → 18 |            8,206 → 8,206 |
| Beebe      |                     21 → 21 |          20,338 → 20,338 |
| Bismarck   |                     23 → 23 |          56,686 → 56,686 |
| Blake      |                       7 → 7 |          41,076 → 41,076 |
| Challenger |                       5 → 5 |          12,609 → 12,609 |
| Endurance  |                     17 → 17 |          41,044 → 41,044 |
| Blue Hole  |                   **7 → 7** |          19,032 → 19,032 |
| Hudson     |                       5 → 5 |          14,548 → 14,548 |
| Hunga      |                   **5 → 5** |        **8,326 → 8,326** |
| Kama       |                       8 → 8 |          16,598 → 16,598 |
| Lost City  |                     40 → 40 |          49,124 → 49,124 |
| Monterey   |                     30 → 30 |        284,010 → 284,010 |
| Titanic    |                     37 → 37 |        135,178 → 135,178 |

These are conservative full-prop costs before culling, including material
groups, instances, transparent double-sided passes and point draws; terrain,
submarine and wildlife are separate. Hunga's **mesh-only** `countGeo` is
**2 draws / 8,326 triangles**; its three seep point draws explain the static
census's five calls. Real-terrain full-mesh counts also remain
**5 / 41,470 Medium** and **5 / 67,338 High**. These are resource counts,
not new phone timing or whole-frame GPU measurements.

## Opening wall versus Kama pillows at 40 m

Used the shipped float heightmaps, runtime `Terrain` and `Props`, default
Arcade equipment and resolved light/camera settings, no Daily modifier.
Hunga uses `DeepOpeningSpawn.composedMissionSpawn`, the first primary POIs,
`spawnSettings`, `requiredHull(469)` (**A**) and the stationary, level chase
camera. The sub is 160 m from the POI; the camera is approximately 245.5 m
in view depth from the visible wall, not 160 m from its surface.

The Kama reference is explicitly **40 m Euclidean camera-to-target distance**,
aimed at the placed pillow bounds centre from bearing `[√½, 0, −√½]`, at
`root.y + 22 m`, following the shipped Low golden bearing/elevation. This is
a controlled close camera pose, not Kama's 130 m mission opening or a claim
that every visible pillow surface is 40 m away. Lamp origin is the camera
for this reference. Hunga lamps retain their actual sub origin.

At 390×844, rasterized solid terrain and all full props with a six-plane
clipped triangle depth buffer, material sides/groups/draw ranges, instances
and perspective-correct colour/normal/position interpolation. Means select
only the visible **wall mesh** or **pillow body mesh**; the apron, rubble,
iron-mat accent and transparent effects do not enter those means, although
solid foreground props can occlude them. No hull or HUD is included. The
opening's total visible tuff counts, **5,822 / 5,853 / 5,870**, reproduce 4560
exactly; that audit independently found no hull occlusion of the wall.

The effective luminance proxy is evaluated per visible pixel, then averaged:

```text
A = materialColour × interpolatedVertexColour × instanceColour
E = emissive × emissiveIntensity × mix(vertexColour, 1, floor) × (0.7 + 0.3 normalY)
L = A × (ambientRGB × intensity + directIrradiance) / π + E
T = exp(−fogDensity² × viewDepth²)
Yeff = Y(T × L + (1 − T) × fogColour)
```

`directIrradiance` includes sun cosine and the actual Arcade twin lamps and
fill, with distance cutoff, decay, cone and penumbra. Seamount's actual
warm POI lights at elapsed zero are included: Hunga has none; Kama has none
on Low and two on Medium/High. Hunga ambient is `9 × linear(0x6f8f9e)`;
Kama's is `18 × linear(0x9aa6ad)`. The shader hook is invoked in the census
and its `vertexGlow2-0.25` colour-floor expression is evaluated numerically.

| Quantity                                |                     Low |                  Medium |                    High |
| --------------------------------------- | ----------------------: | ----------------------: | ----------------------: |
| Visible wall / pillow-body pixels       |          4,384 / 32,860 |          4,322 / 21,714 |          4,297 / 22,868 |
| Hunga wall albedo Y, before = after     |                0.013217 |                0.013089 |                0.013074 |
| Kama pillow albedo Y, before = after    |                0.004677 |                0.004349 |                0.004351 |
| Hunga ambient-only diffuse Y, unchanged |                0.009374 |                0.009283 |                0.009273 |
| Hunga added glow Y, formerly zero       |            **0.023640** |            **0.023643** |            **0.023683** |
| Kama body glow Y, unchanged             |                0.090267 |                0.087185 |                0.087361 |
| Hunga effective Y **before → after**    | **0.014523 → 0.037371** | **0.014074 → 0.036924** | **0.013861 → 0.036750** |
| Kama effective Y at 40 m, unchanged     |            **0.119901** |            **0.115637** |            **0.117039** |
| Hunga after / Kama at 40 m              |              **31.17%** |              **31.93%** |              **31.40%** |
| Hunga before / Kama at 40 m             |                  12.11% |                  12.17% |                  11.84% |

Hunga's opening glow increase survives fog: mean wall transmission is
**0.9665**. Kama's close body has **0.9996** transmission. Even excluding
direct lamps, sun and fog, `(ambient diffuse + glow)` gives Hunga only
**32.97 / 34.17 / 34.14%** of Kama. Thus the opening remains below the close
pillow reference under either numerical comparison.

This is a nominal untextured Lambert-diffuse-plus-emission calculation. It
excludes texture/bump detail, PBR specular/energy compensation, shadows,
tone mapping, colour-space conversion, grading, bloom and vignette. It is
neither nits nor a rendered mean pixel value; Medium/High grading and the
bright iron mats can alter the perceived comparison. No images were captured
or accepted from the package note. No distance-aware shader change is proposed.

## Validation and provenance

- Existing `perf-budget`, `scarpTerrain`, `geo-talus` and `geo-colliders`:
  **81 passed** on the audited checkout. Isolated before-glow static census:
  **29 passed**, five unrelated cases skipped. Before/after JSONs are identical
  after sorting; their SHA-256 is identical even without sorting.
- Temporary paired luminance audits: **one test passes per variant**, six
  views each. Each variant cross-checks **180** pixel samples with independent
  Three.js rays, including hit positions; maximum NDC depth disagreement
  **2.84×10⁻¹⁴**. Kama's before/after measurements match exactly.
- Temporary paired scarp census: **one test passes**, all 18 before/after
  builds, including byte hashes and exact albedo/budget equality.
- Typecheck, strict content validation and attribution pass. Vite production
  bundling passes with the gate's writable config. The build provenance step
  fails on sandbox `spawnSync git EPERM`, despite returning the correct SHA.
  The ordinary build initially hit read-only `node_modules/.vite-temp`;
  writable config resolved bundling. No application failure was inferred.
- Python: **162 passed / five failed** out of 167. Four failures are that same
  CI-manifest `spawnSync git EPERM`; the golden-tooling test receives empty
  subprocess JSON. These match the previously recorded sandbox failures in 4540. The full unit attempt (`npm test -- --configLoader runner --cache=false
--pool=threads`) produced only its RUN header for five minutes and was
  interrupted; **full-suite completion is unverified**. Browser/e2e was not
  run: DIRECTOR assigns Codex numeric work and states that its browser is off.
- Local diagnostic scripts, configs, logs and JSONs are ignored artifacts under
  `.cache/4630/`; the only tracked deliverable is this report. Net simpler:
  no new runtime paths, settings or UI.

Reproduction commands (temporary audit files retained in this worktree):

```bash
npx vitest run --config .cache/4630/config.mjs --configLoader runner --cache=false --pool=threads
AUDIT_BEFORE=1 npx vitest run --config .cache/4630/config.mjs --configLoader runner --cache=false --pool=threads
npx vitest run --config .cache/4630/census.config.mjs --configLoader runner --cache=false --pool=threads
PERF_BUDGET_STATIC=1 npx vitest run tests/unit/perf-budget.test.ts tests/unit/scarpTerrain.test.ts tests/unit/geo-talus.test.ts tests/unit/geo-colliders.test.ts --configLoader runner --cache=false --pool=threads
AUDIT_BEFORE=1 PERF_BUDGET_STATIC=1 npx vitest run --config .cache/4630/budget-before.config.mjs --configLoader runner --cache=false --pool=threads -t 'catalog site static prop budgets'
```

SHA-256 bindings to the audited checkout (no screenshot claims):

| Input / result                     | SHA-256                                                            |
| ---------------------------------- | ------------------------------------------------------------------ |
| `src/world/props/geo/scarp.ts`     | `94cfbfbe18fbcefe0523a57b422ec7af38d0d5942e324a39f5ccc2bfff68de40` |
| `src/world/props/geo/materials.ts` | `a14ff87c1d2193e295fa8f1baf40f49d2d95dc88a11ac4a8c91599918d6f8089` |
| `src/world/props/geo/pillow.ts`    | `a4a809e6b443a43f2f365ec710f12f2ce5f510c57d668d105a4b1be31e35045e` |
| Hunga `site.json`                  | `27b3e5d5e3e27acd9cc9bb9a6457c8c9e3a8ad8b4f9a8e45760d8ee399eb620f` |
| Hunga `props.json`                 | `2548454e11ed228056e63750853cbd7a2bddaa7aa5a55c406e0ef8d8ea4b876d` |
| Hunga `heightmap.bin`              | `df2eb4673460cf8472633886913bc4c122e41ca6f2dbc879ef9b2c3eef5511cc` |
| Kama `site.json`                   | `6181289902cd480cc45d5e2a690df3200771124dffd8b53ff1de77483d46229b` |
| Kama `props.json`                  | `4672b84c661df3a51ed78c6008e84eded4a9f15bc4ce9f6ce4c58cc8846ff602` |
| Kama `heightmap.bin`               | `4cd71ddc8eaf9b2a3f411f5024dec4b3d5800501d97f01fd430cc5edf180d4dc` |
| `.cache/4630/before.json`          | `a07937e7e9200e2d8acd25967eef5600b3b8a6be37d24313cd580dcca311d457` |
| `.cache/4630/after.json`           | `aeee75f92af73395dd5a676df1282c5e89f426de23faa67bce32d84dc2b2c65e` |
| `.cache/4630/census.json`          | `541518e8724d703f25c389f184b27341a5b38728ca16f820145f2dd3f7f499a8` |
| Both static-census JSONs           | `5e9a83004e989da7b847e2881a401391ed7a471f09cdfb92b7c78f8d8b949725` |
