# S-verify: Beebe flow delta

Numeric/source verification, 2026-10-26. Backlog item **S-verify** (8).

- Before, first parent: `cc82a82eb5c79e13ea71e84b27c75621e5986302`.
- Visual merge/head under review: `b52caaf8877fe1560be1ceb2411e77b42e245e90`.
- Checkout tested: `3e478036da49d53f083aa931954227a7dc107731`.
  Its source, data, public assets and relevant tests are identical to the merge.

**Result: no confirmed defect in the shipped delta; report only.** Read
`plan/DIRECTOR.md`, `plan/progress/V-beebe-flow.md` and the completed
`../4540-S-verify-axial-glow/plan/progress/4540-S-verify-axial-glow.md` before
starting. The last report's Axial glow audit and Beebe mesh hashes do not cover
these particle envelopes. No newer launched/result brief covering this precise
delta was found. Other active worktrees were left alone.

No source, data, snapshots, permanent tests, tools or Director changes. No image
rendering, appearance acceptance, opening-framing or Axial body-glow audit.
The delta uses existing seeded variation, particle shaders and disposal paths;
verification needs no additional mechanism or settings.

## Method and attribute contracts

Compared the three requested files at the two full SHAs above. Built all shipped
props at Low, Medium and High against their actual heightmaps, then entered the
real `PresetSystem` with each shipped vent mission. Repeated preset entry with
the same placed sources produced identical hashes of all particle attributes.
Repeated `ventVariety` calls at cloned source coordinates were identical.
The mound builders also retain their existing seeded RNG and particle seed
buffers; the new haze uses `seed + 11`, independently of the smoke/glint RNG.

Every attribute on the inspected particle geometries has the position count and
only finite values. In particular:

| Consumer  | Tier   | Smoke positions = aSeed = aVar = aPace | Haze positions = aSeed = aScale |
| --------- | ------ | -------------------------------------: | ------------------------------: |
| Beebe     | Low    |                                      0 |                               0 |
| Beebe     | Medium |                                  6,000 |                               9 |
| Beebe     | High   |                                 12,000 |                               9 |
| Axial     | Low    |                                      0 |                               0 |
| Axial     | Medium |                                  6,000 |                              18 |
| Axial     | High   |                                 12,000 |                              18 |
| Lost City | All    |                                      0 |                               0 |

Here `aSeed`/`aVar` are vec4, position is vec3, and `aPace`/`aScale` are scalar
Float32 attributes. Low disables preset visuals. Lost City ships
`smokeIntensity: 0`, `shimmerStrength: 0`, `glowLights: 0` and carbonate fluid,
so the changed preset shader and variety have no drawn consumer there.

Authored Beebe has three preset sources and Axial six. Actual Medium/High
`aPace` values vary between sources, remain constant within each source and
fall inside the intended `[0.7,1.3]`. All actual height, width and lean scales
remain inside `[0.55,1.4]`, `[0.55,1.8]` and `[0.3,1.8]`. Different tiers can
have different variety because existing terrain/prop grounding changes the
world-space orifice coordinate used as the seed; identical inputs are stable.

## Full rise cycles and preset envelopes

Evaluated 129 phases, including both endpoint limits, for every smoke particle:
4,644,000 vertex-motion samples per revision, all finite. Time for each phase
was recovered using that particle's seed and its actual pace/lifetime. The
analytic domain also covers the continuous interval: `t = fract(...)` is in
`[0,1)`, all fractional powers have nonnegative bases, and every shipped
lifetime/speed is finite and positive. Trigonometric factors are bounded for
later cycles too. CPU evaluation does not establish GPU compilation/precision.

| Site/tier    | Actual pace range | Before cycle (s) | After cycle (s)      | After maximum centre rise (m) | Maximum sprite size parameter (m) |
| ------------ | ----------------- | ---------------: | -------------------- | ----------------------------: | --------------------------------: |
| Beebe Medium | 0.815087–1.264838 |              105 | 83.014616–128.820583 |                     89.980006 |                          6.862628 |
| Beebe High   | 0.815087–1.264838 |              105 | 83.014616–128.820583 |                     93.199221 |                          7.864412 |
| Axial Medium | 0.924539–1.146184 |              105 | 91.608387–113.570082 |                     94.670842 |                          7.951836 |
| Axial High   | 0.878916–1.146184 |              105 | 91.608387–119.465314 |                     94.670842 |                          7.960252 |

The wisp is included, with height multiplier `height * (0.22 + 0.2 * pace)`,
width `0.14 + 0.2 * width`, its authored lateral offset and 0.4 m downward
origin offset. Pace changes the rise period, not the `[0,1)` motion domain.
Drift is capped at `0.7 * riseHeight = 49 m` before the per-vent lean/wisp
factor and rotation. A continuous horizontal centre-radius upper bound about
the particle's buffer origin is

```text
spread * ws * seed.z * 1.24 * bias
  + sqrt(2) * (0.2 * spread + 2.2)
  + 49 * (wisp ? 0.21 : abs(lean))
```

This bounds lobe, width, meander, wobble and arbitrary capped current direction.
Adding maximum source-to-wisp offset and a conservative sprite half diagonal
gives source-centred horizontal envelopes of at most 108.162 / 117.027 m for
Beebe Medium/High and 124.880 / 130.804 m for Axial Medium/High. These deliberately
loose envelopes are finite; they are not prop-body bounds.

Preset haze centres are static. Beebe's Medium/High `aScale` ranges are
0.905633–1.887750 / 0.905633–2.197175, giving size parameters
6.339434–13.214246 / 6.339434–15.380219 m. Axial's ranges are
1.036120–2.229241 / 1.166560–2.229241, giving
7.252845–15.604685 / 8.165920–15.604685 m. Maximum centre heights above the
orifice are 8.593372 / 8.740536 m at Beebe and 8.807810 m at Axial. Haze lean
adds only `0.15 * rise` horizontally at the highest sprite. Including half
diagonals is finite as well. `placePoint` clamps point size to `[1,256]` pixels
and divides by `max(1, distance)`, so camera-plane crossing adds no division
singularity. Haze flicker is bounded `[0.7,1]`.

All preset Points use `makePoints`: `frustumCulled = false` and an intentional
infinite bounding sphere, before and after. Thus larger smoke or scaled haze
does not depend on a stale finite source sphere or the smoker prop's bounds.
The infinite sentinel is intentional and is not a nonfinite motion value.

## Mound smoke and new mouth haze bounds

Only Beebe's `beebe-chimney-1` and Axial's `ashes-smoker-mound` call
`smokePlume`, twice each. Each now has two smoke Points, two existing glint
children, **two new `plume-hot-haze` children**, and two existing mound shimmers.
The haze is additive and has its own geometry and material.

Compiled the PointsMaterial injections on the CPU and used their actual
uniforms/seeds. Smoke heights are 29.133953 / 27.125935 m at Beebe and
9.434939 / 9.261601 m at Axial. New haze heights are 6.409470 / 5.967706 m and
2.5 / 2.5 m respectively. Across all tiers, smoke cycle periods span
5.570893–11.209467 s at Beebe and 3.571763–4.891314 s at Axial; haze spans
2.308086–4.400435 s and 2.344733–3.237868 s. All sampled motion and sizes are
finite, including the glints and mound shimmers.

For continuous bounds used the actual seeds and uniform maxima:

```text
billow radius <= base*(0.4+seed.z)
               + spread*seed.z^0.8*(0.25+0.75*seed.w)*1.42*1.6
billow wobble: |x| <= 0.396*spread, |z| <= 0.22*spread
billow drift:  |x| <= 1.06*drift,  |z| <= 0.34*drift
flat radius   <= base*seed.z + spread*(0.35+0.65*seed.w)
flat drift:   |x| <= drift, |z| <= 0.3*drift
```

Also included maximum sprite size: billow
`size*1.78*(0.55+0.9*fract(vSeed*7.31))`, flat `size*1.85`, with half diagonal
`size/√2`. This overbounds the whole square under the default 62-degree camera
projection (PointsMaterial's projected world side is `size*tan(FOV/2)`).
Transformed the envelopes into each placed prop's local coordinates and
checked both its bounds box and each Points geometry sphere.

Minimum continuous clearances, in metres, after the sprite allowance:

| Site/tier    | Smoke geometry sphere | Smoke prop box | New haze geometry sphere | New haze prop box |
| ------------ | --------------------: | -------------: | -----------------------: | ----------------: |
| Beebe Low    |             13.382163 |       3.939873 |                 1.008373 |         27.338828 |
| Beebe Medium |             13.382163 |       4.003914 |                 0.992002 |         26.360752 |
| Beebe High   |             13.382163 |       4.014455 |                 0.960110 |         26.364933 |
| Axial Low    |              4.749946 |       4.342461 |                 0.073557 |          5.106475 |
| Axial Medium |              4.749946 |       4.397017 |                 0.073557 |          5.198768 |
| Axial High   |              4.643275 |       4.426223 |                 0.055138 |          5.249174 |

`smokePlumeReach(h)` is algebraically identical to the removed expression:
`max(1.6,h*0.2)*1.6*1.45 + h*0.34*1.6`; `smokePlumeTop(h) = h`.
All six shipped mound bounds boxes are exactly equal before/after. The new
helpers preserve nominal allowance; their expression alone is not a universal
proof for arbitrary seeds/base radii. The actual shipped seeded smoke and new
haze satisfy the envelopes above. There is no need to enlarge their prop
bounds or rebaseline a snapshot.

These sprite bounds use the default camera projection, not a promise about
full square raster extents under every portrait FOV/aspect or GPU point-size
limit. The shader centres remain enclosed independently of projection. No
phone, screen-edge appearance or rendered-performance acceptance is claimed.

## Actual cost and existing budgets

Each new child has position + vec4 seed: **28 attribute bytes per point**.
For each of Beebe and Axial separately:

| Tier   | New haze children/draws before → after | New haze points | Added attribute bytes | All prop Points before → after |
| ------ | -------------------------------------- | --------------: | --------------------: | ------------------------------ |
| Low    | 0 → 2                                  |    20 (10 each) |                   560 | 148 → 168                      |
| Medium | 0 → 2                                  |    38 (19 each) |                 1,064 | 296 → 334                      |
| High   | 0 → 2                                  |    54 (27 each) |                 1,512 | 422 → 476                      |

Smoke counts are 53 / 105 / 150 per emitter, with existing glints 7 / 15 / 21.
Rounding happens after tier scaling and again for each child. Total prop
particle attribute bytes are 4,144 → 4,704 / 8,288 → 9,352 /
11,816 → 13,328. No added triangles.

Preset particles/draws are unchanged. The only added buffers there are one
float per smoke point and per existing haze sprite:

| Site/tier    | Preset draws | Points | Attribute bytes before → after | Added bytes |
| ------------ | -----------: | -----: | ------------------------------ | ----------: |
| Beebe Low    |            0 |      0 | 0 → 0                          |           0 |
| Beebe Medium |            3 |  6,018 | 264,288 → 288,324              |      24,036 |
| Beebe High   |            3 | 12,018 | 528,288 → 576,324              |      48,036 |
| Axial Low    |            0 |      0 | 0 → 0                          |           0 |
| Axial Medium |            3 |  6,036 | 264,576 → 288,648              |      24,072 |
| Axial High   |            3 | 12,036 | 528,576 → 576,648              |      48,072 |

Including shimmer and haze overhead, the 20,000 preset-particle ceiling retains
13,982 / 7,982 points of headroom at Beebe Medium/High and 13,964 / 7,964 at
Axial. Haze widening increases possible fill despite constant preset draws
and counts; these are CPU resource counts, not measured fragment work or FPS.

Static full-prop costs count every full prop at once, instances and transparent
double-sided passes, without a visibility/LOD discount; impostors are excluded,
matching `perf-budget.test.ts`:

| Site      | Tier   | Calls before → after | Triangles (unchanged) |
| --------- | ------ | -------------------- | --------------------: |
| Beebe     | Low    | 19 → 21              |                20,338 |
| Beebe     | Medium | 19 → 21              |               104,306 |
| Beebe     | High   | 19 → 21              |               179,834 |
| Axial     | Low    | 16 → 18              |                 8,206 |
| Axial     | Medium | 16 → 18              |                16,650 |
| Axial     | High   | 16 → 18              |                30,488 |
| Lost City | Low    | 40 → 40              |                49,124 |
| Lost City | Medium | 40 → 40              |               146,994 |
| Lost City | High   | 40 → 40              |               206,428 |

All are below the 1,200-call / 1,200,000-triangle static limits (enforced on
Low; other tiers shown for comparison). Low Beebe retains 1,179 calls and
1,179,662 triangles; Axial retains 1,182 calls and 1,191,794 triangles. The
separate 300-call / 300k-triangle reservation for the rest of the scene remains.
The rendered 1,500-call / 1.5M-triangle e2e limit was inspected in source only.
The existing Lost City fill budget still passes; this delta changes none of
its shipped drawn plumes. No other shipped mission uses the changed smoke or
haze: forced debug presets are outside this shipped-consumer census.

## Disposal

Watched geometry/material `dispose` events on all seeded mound particles and
all preset Points. After `PresetSystem.dispose()` and `Props.dispose()`, each
watched resource fired exactly once; a second prop dispose did not fire again.
Each affected site exercised 16 resources on Low and 22 on Medium/High,
including all four new haze-owned resources. Preset Points were removed from
the scene, stats reset, and re-entry rebuilt identical attributes.

`Props.release` traverses descendants without a Mesh-only filter, so smoke's
new Points child follows the existing recursive release path on teardown and
prop rebuild. Preset haze remains in `VentPreset.objects`, released by
`disposeObjects` on exit. `softDot` is the existing shared texture cache; the
new haze adds no independently owned texture. Materials/geometries are owned
and released; cached textures retain their existing shared lifetime.

## Golden metadata and provenance

The paths cited by V-beebe-flow are unavailable in both this checkout and the
main checkout `/home/vijay/submarine-explorer`:

- `.cache/golden/2026-10-27-022132/`: absent; Beebe 1–3 PNGs and manifest unavailable.
- `.cache/golden/2026-10-27-022746/`: absent; Beebe 1–3 PNGs and manifest unavailable.
- The report's additional “newest set” has no exact path or recorded SHA;
  provenance unavailable. No `2026-10-27-*` golden directory is available in main.

The newest available main-checkout directory is instead
`.cache/golden/2026-10-26-213811/`. Inspected only `poses.json` and directory
metadata: complete=true, dirty=false, production, High, desktop 1600×900,
23 captures. Its root manifest and three Beebe capture entries record
`ecc0fb54fbe6a8abb19859734dd1d66e6998c881`. Bind those records only to that
SHA; they do not establish either requested before/after state. PNG appearance
and recorded frame timings were not evaluated or accepted.

## Commands and checks

Reference source/data/tests were extracted with `git archive` into
`/tmp/beebe-before`, with the unchanged public assets and installed dependencies
linked read-only. No reference worktree or running work was edited.

```sh
git diff b52caaf8^1 b52caaf8 -- src/world/presets/VentPreset.ts src/world/props/geo/plume.ts src/world/props/geo/smokers.ts
git diff --exit-code b52caaf8 HEAD -- src data public tests/unit/ventHazeBudget.test.ts tests/unit/props-geo.test.ts tests/unit/presets.test.ts tests/unit/perf-budget.test.ts
node node_modules/vitest/vitest.mjs run tests/unit/ventHazeBudget.test.ts tests/unit/props-geo.test.ts tests/unit/presets.test.ts tests/unit/perf-budget.test.ts --configLoader runner --cache=false --pool=threads
node node_modules/vitest/vitest.mjs run --config .cache/beebe-audit.config.mjs --configLoader runner --cache=false --pool=threads --no-isolate
GATES_CONFIG_MODE=writable tools/gates.sh --no-e2e
```

- Focused existing capabilities: **193 tests pass in four files** at checkout
  HEAD, 77.97 s; **192 pass** at the first parent, 99.77 s. No snapshots changed.
- Temporary CPU diagnostic passes at both revisions. Inputs/results are
  `.cache/beebe-audit.test.ts`, `.cache/beebe-audit.config.mjs`,
  `.cache/beebe-audit.json`, with corresponding files in `/tmp/beebe-before`.
  They are ignored/untracked diagnostics, not deliverables or permanent tests.
- Required gate: **not green; aggregate completion unverified**. Both attempts
  passed content validation and the production build. Python ran 167 tests and
  reported five failures: four CI-build-manifest cases fail on
  `spawnSync git EPERM`, and one golden-tooling case cannot parse empty child
  stdout (`Unexpected end of JSON input`). Independent minimal probes reproduce
  both environment symptoms: synchronous Git returns the correct SHA/status 0
  alongside `error.code: EPERM`; an asynchronous Node child writing
  `{"ok":true}` exits 0 but its captured stdout is empty. These are subprocess
  environment failures, not evidence of a vent defect; tools and assertions
  were left unchanged.
- The first default-worker unit phase produced no summary and was interrupted
  after approximately five minutes. Retried the same gate with a temporary
  exported shell function appending `--pool=threads` only to `npm test`:

  ```sh
  npm() {
    if [[ "$1" == test ]]; then command npm "$@" --pool=threads
    else command npm "$@"
    fi
  }
  export -f npm
  GATES_CONFIG_MODE=writable timeout 600 tools/gates.sh --no-e2e
  ```

  That unit phase also produced no summary after more than six minutes and
  was interrupted (exit 130, before the timeout). The full unit outcome and
  cause of its missing completion remain unverified; the focused four-file
  thread-worker run completed normally. Gate logs are
  `.cache/runs/20261026-230202-3-weE0Jh/` and
  `.cache/runs/20261026-230700-4-H1y3jU/`; aggregate console logs are
  `/tmp/beebe-gates.log` and `/tmp/beebe-gates-threads.log`. E2e was disabled
  throughout.

- Attribution and repository-wide Prettier checks pass separately:
  `python3 tools/check_attribution.py` and
  `node node_modules/prettier/bin/prettier.cjs --check .`.
  Final report formatting and `git diff --check` also pass. No product failure
  was observed in the requested capability suites or the CPU delta audit.

All acceptance here is CPU/source evidence. Visual judgement remains with
Claude. GLSL driver behavior, rendered fill/time, image appearance, and owner
phone acceptance are outside this verification.
