# Brief 2860 — S-verify: Challenger seabed

## Plan

1. Measure lander geometry at every quality tier and across dimensions, seeds and ground samplers. Keep the existing budgets and art; propose the smallest trim only if needed.
2. Compare the three rebaselined artifacts with `HEAD~1` and the actual seabed commit's parent. Account for each changed field and independently reproduce the artifacts.
3. Extend existing capability tests to cover actual merged dressing against submarine opening keep-outs and the scan boundary on survey terrain.
4. Audit the change for site branches and package numbers in code. Run `tools/gates.sh` and record results and limitations.

## Result

The numeric audit passes. Art, runtime source, fixtures and snapshots are unchanged. Extended existing capability tests; no assertion or budget was loosened. The complete gate result is recorded below separately.

## Triangle budgets

| Tier                          | Before seabed change | Current | Budget | Spare |
| ----------------------------- | -------------------: | ------: | -----: | ----: |
| Low                           |                 1965 |    1985 |   2000 |    15 |
| Medium                        |                 2754 |    2822 |   3000 |   178 |
| High                          |                 2754 |    2822 |   3000 |   178 |
| Ultra / unknown-tier fallback |                 2754 |    2822 |   3000 |   178 |

All tiers retain three opaque draws and an alternate 12-triangle, one-draw impostor. Low arithmetic: 1965 − 96 (three mud discs) − 60 (two leg rings per leg removed) + 56 (halo) + 120 (six icosahedron clasts) = 1985. Other tiers: 2754 − 132 + 80 + 120 = 2822. Flag remains two triangles.

Counts are fixed by tier; dimensions, seeds and terrain affect coordinates only. Tests exercise default dimensions, authored 3.4 × 3.4 × 4.6 dimensions and actual 26 × 26 × 34 content, seeds 0/42/0xffffffff, and missing/flat/sloped ground samplers. No count fragility was found, so no art trim was applied. The smallest simple candidate is changing the Low legs from two axial rings to one (`d.meshDensity < 0.7 ? 1 : 4`): **1955 triangles, 45 spare**, with unchanged bounds/colliders and Medium/High counts. Measured in an isolated copy, not applied to the source; silhouette and caps are preserved, but vertex tint interpolation would require the visual lane's judgement before adoption.

The raised/sloped-ground regression also proves that merged dressing cannot enlarge reported placement bounds or colliders. It checks the actual dressing vertices follow the supplied ground, rather than relying on bounds alone.

## Baseline provenance and complete delta accounting

Checkout reviewed: `f827eba`. The requested `git diff HEAD~1 -- tests/fixtures/challenger-keepout.json tests/unit/__snapshots__/deepOpening.test.ts.snap tests/unit/__snapshots__/freeDiveComposition.test.ts.snap` is empty: `HEAD~1` is a later Monterey progress commit. The substantive comparison is **34909eb^ → 34909eb**, the seabed implementation merged by `84dd7da`. All three current artifacts are identical to their versions in `34909eb`.

Parsed structural comparison found **450 changed leaves**, with no added/deleted keys:

| Artifact                     | Changed leaves | Scope                                                                      |
| ---------------------------- | -------------: | -------------------------------------------------------------------------- |
| challenger-keepout.json      |             78 | 26 per-view values, repeated identically at three viewports                |
| deepOpening snapshot         |            354 | 12 pose values; 342 coordinates for 24 Low + 45 Medium + 45 High amphipods |
| freeDiveComposition snapshot |             18 | Six values repeated identically in arcade, custom and realistic            |

Every exact old/new value is listed in the appendix, factoring identical viewport/mode repetitions. All Endurance snapshots, all other sites, wildlife species/counts, chase settings and unlisted fields remain identical.

Independent reproduction, without updating any expectation:

1. Run the existing three artifact-producing specs against an isolated copy of the pre-seabed lander and the historical fixture/snapshots: **3 files / 24 tests pass**.
2. Run those same historical expectations with the **current full geometry**, substituting only the historical reported bounds: **3 files / 24 tests pass**.
3. Run current geometry against the checked-in expectations and added safety checks: **4 files / 37 tests pass**.

The second experiment isolates the entire rebaseline to reported bounds. Correction to the earlier art note: **removing the larger per-foot mud discs changes the footprint; shrinking/lowering the flag does not change the bounds**, because the flag already lies inside the body's extrema. Dressing is explicitly excluded from reported bounds. The minimum Y is the cable coil, maximum Y the strobe and maximum X the bait cage; those extrema and the root placement Y stay unchanged.

### Keep-out fixture: bounds, scatter counts and every hash

Only min X, min Z and max Z change. At Low their deltas are +0.9176473617553711, +0.9176464080810547 and −0.9176464080810547 m. At High they are +0.9083070755004883, +0.8804759979248047 and −0.863835334777832 m. All other bound components stay fixed.

The narrower footprint moves the derived spawn/camera. Scatter streams 64 m cells by camera distance and gathers instances inside its draw radius; shifted sampling changes resident-cell order and edge membership. Low cells stay 12, instances 289 → 291. High cells 51 → 52, instances 3178 → 3187. Draw calls stay four. Comparing exact instance transform/color tuples independently gives:

| Tier / kind    | Before → after count | Added / removed | Retained entries reordered | Retained entries recolored |
| -------------- | -------------------: | --------------: | -------------------------: | -------------------------: |
| Low dropstone  |              86 → 87 |           2 / 1 |                          3 |                          0 |
| Low boulder    |              10 → 10 |           0 / 0 |                          0 |                          0 |
| Low rubble     |            146 → 146 |           0 / 0 |                          0 |                          0 |
| Low mound      |              47 → 48 |           1 / 0 |                          8 |                          0 |
| High dropstone |          2128 → 2132 |           5 / 1 |                        548 |                          0 |
| High boulder   |            249 → 249 |           1 / 1 |                         68 |                          0 |
| High rubble    |            587 → 589 |           3 / 1 |                        210 |                          0 |
| High mound     |            214 → 217 |           4 / 1 |                        140 |                          0 |

Thus Low dropstone/mound matrix and color digests change; Low boulder/rubble digests do not. At High all eight digests change, including boulders despite unchanged count: one instance enters, one leaves and 68 retained entries reorder. Colors travel with the same deterministic instance; no retained instance changes color. The full-capacity typed arrays are hashed, so ordering/membership changes affect both digests. All 12 changed digest pairs are included below. None is an unexplained material or seed change.

### Opening snapshots: every pose and wildlife coordinate

The smaller footprint changes its centre and the ray-to-boundary distance used by both spawn passes. Framed X/Z deltas are Low (−0.45882272720336914, −0.9176464080810547) m, Medium/High (−0.4180021286010742, −0.863835334777832) m. Terrain samples at the shifted approach produce Y deltas of +0.0015958921630954137 / +0.0013178236640669638 / +0.0025290294615842868 m for Low/Medium/High. Each yaw changes by one floating-point rounding step (+1.1102230246251565e-16 rad); the bearing is unchanged.

`freeDiveComposition` uses Medium props on Low terrain. All three modes have the same two base X/Z changes and four framed X/Y/yaw/Z changes; framed Y rises 0.0013504844773706282 m. Base Y and yaw stay fixed.

The amphipod patch is authored relative to the submarine's forward/side axes, rather than the hero origin. Every one of its 114 positions therefore moves with the opening. Ground is resampled at each shifted X/Z, producing individual Y changes; one simulation frame adds small steering differences. Low position deltas span X [−0.4588226171827614, −0.4588224933834226], Y [+0.015433176573424134, +0.016347229333405267], Z [−0.9176460098607322, −0.9176459520577964] m. Medium and High similarly track the −0.418002 / −0.863835 m horizontal shift; their Y changes span +0.011459149327492923 to +0.016909790068893926 m and +0.010208385754594929 to +0.015934410575937363 m respectively. Historical reproduction and the bounds-only experiment reproduce all these coordinates exactly, including the per-animal differences.

## Geometry clearance and scanning

The added opening check transforms **every actual lander triangle**, including halo/clasts beyond reported bounds, into world coordinates. It measures triangle-to-submarine sphere clearance at both free-dive and mission starts, requiring the existing hull radius plus a further 4 m safety margin. It also bounds every vertex's distance from the placed POI. A sphere is convex, so the maximum vertex distance bounds triangle interiors too.

| Tier   | Free-dive hull gap (m) | Mission hull gap (m) | Furthest geometry from POI (m) | Clearance inside 70 m scan boundary (m) |
| ------ | ---------------------: | -------------------: | -----------------------------: | --------------------------------------: |
| Low    |              17.632370 |           154.930686 |                      38.207883 |                               31.792117 |
| Medium |              16.117000 |           154.598682 |                      37.907778 |                               32.092222 |
| High   |              15.948775 |           154.581847 |                      37.905528 |                               32.094472 |

The literal scan **volume** contains the lander/halo by design; interpreting “does not intersect the scan radius” as no overlap with that volume would contradict the content. The verified property is no intersection with the scan **boundary** or the opening hull keep-outs. The minimum active boundary is the 70 m mission approach radius (140 m with Extended sensors); free-dive authored reach is 120 m. Scanner uses distance/depth/aim rather than geometry occlusion. Existing tests still verify candidacy, scan completion, positive visual hull clearance, all three viewport sightlines/reticle separation, boulder keep-outs, and 60 seconds of idle safety/wildlife survival.

## Simplicity audit

The verification changes extend `tests/unit/landerVerification.test.ts` and `tests/unit/deepOpening.test.ts` and add this report. The orchestrator gate follow-up also formats `plan/progress/V-monterey-cliff.md`, adding the missing blank lines after headings without changing its text. Existing capability specs are extended; no package-named spec, setting, UI surface, layout patch, runtime branch or configuration mutation is added. New geometry checks dispatch by `benthic-lander` capability. The seabed source diff and this verification diff contain no new site-ID conditionals or package-number comments. Legacy package-labelled tests elsewhere remain outside this change. No visual judgement or screenshot approval is claimed.

## Gates and evidence

### Orchestrator follow-up

The orchestrator ran `tools/gates.sh` outside the sandbox: **Python, content, build, unit, smoke e2e, project-base e2e and attribution all PASS**. Its only failure was Prettier on `plan/progress/V-monterey-cliff.md` (log: `.cache/runs/20261020-221536-3203009-0VSq97/prettier.log`). The root cause was missing blank lines between Markdown headings and their content. Applied Prettier to that file only; its prose is unchanged. Repository-wide `npx prettier --check .` and `git diff --check` pass after the fix. No assertions, tests, tooling or art were changed in this follow-up. Behavioral checks were not repeated for this documentation-only formatting correction; their passing result is the orchestrator's supplied evidence, not a sandbox browser run.

### Initial sandbox run

`GATES_CONFIG_MODE=writable PW_PORT=4286 bash tools/gates.sh` completed with **exit 1**, actual e2e selection **smoke + project-base**. Run directory: `.cache/runs/20261020-220152-2-H07duN/`; initial `.cache/gates/*.log` links point into that run.

| Gate                                   | Result                                                            |
| -------------------------------------- | ----------------------------------------------------------------- |
| Config preparation                     | PASS                                                              |
| Strict content validation              | PASS                                                              |
| Production build, including TypeScript | PASS; project-base build also passes                              |
| Full units                             | **PASS: 192 files / 3374 tests, 742.46 s**                        |
| Python                                 | **FAIL: 162/167 pass, five existing tooling failures**            |
| Smoke browser                          | **Blocked before assertions:** configured preview process exits 1 |
| Project-base browser                   | **Blocked before assertions:** configured preview process exits 1 |
| Attribution                            | PASS, 14 assets                                                   |
| Repository Prettier                    | **FAIL:** unchanged `plan/progress/V-monterey-cliff.md`           |

The full unit run was allowed to finish; it was not interrupted or replaced with focused coverage. A separate final TypeScript check passes. Changed-file Prettier and `git diff --check` passed. The repository formatting failure was subsequently fixed in the orchestrator follow-up above.

Python's four build-manifest failures report `spawnSync git EPERM`. The golden-tooling wrapper reports `Unexpected end of JSON input` at `tools/tests/golden-manifest.test.mjs:151`; its underlying cause was not established. A targeted rerun of those five tests reproduces all five failures. They match the failures already recorded by S-verify/S-bughunt audits 2830 and 2840; no tooling was changed or assertion weakened.

A separate smoke attempt using the gate's successful root build and `DEBUG=pw:webserver` confirms `connect EPERM ::1:4286` and `connect EPERM 127.0.0.1:4286`, followed by preview startup exit 1. Evidence: `.cache/seabed-audit/smoke.log`. Neither browser run reached test assertions. No browser rendering, screenshots, GPU results or full-e2e pass is claimed. The canonical gate still attempted both root and project-base selections.

Audit commands and retained local evidence:

```sh
GATES_CONFIG_MODE=writable PW_PORT=4286 bash tools/gates.sh
F_VERIFY_1000_AUDIT=1 npm test -- --configLoader runner --cache=false tests/unit/landerVerification.test.ts tests/unit/deepOpening.test.ts tests/unit/freeDiveComposition.test.ts tests/unit/verify1360.test.ts
npx vitest run --config .cache/seabed-audit/vitest.config.mjs --configLoader runner --cache=false
SEABED_METADATA_ONLY=1 npx vitest run --config .cache/seabed-audit/vitest.config.mjs --configLoader runner --cache=false .cache/seabed-audit/deepOpening.test.ts .cache/seabed-audit/freeDiveComposition.test.ts .cache/seabed-audit/verify1360.test.ts
```

`.cache/seabed-audit/` retains historical/current/metadata-only logs, the isolated historical builder and test copies, the unshipped trim measurement, exact `deltas.json`, `delta-summary.json`, `metrics.json` and `scatter.json`. `.cache/verify-1000-deep.json` contains world clearance measurements. Audit copies live outside source/test discovery and are not shipped.

## Exact changed values

<details>
<summary>All 450 changed leaves, with identical repetitions factored</summary>

Each fixture row below repeats at viewport indices 0/1/2 (1600×900, 844×390, 390×844). Each free-dive composition row repeats in arcade/custom/realistic. Deep-opening rows apply only to Challenger. Reasons are the footprint → opening → terrain/wildlife/scatter dependencies explained above.

| Scope / field                                 | Before                                                             | After                                                              |
| --------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `deepOpening/high/pose/x`                     | `-433.11893980931967`                                              | `-433.53694193792074`                                              |
| `deepOpening/high/pose/y`                     | `-10903.059676990057`                                              | `-10903.057147960595`                                              |
| `deepOpening/high/pose/yaw`                   | `-0.6457718232379012`                                              | `-0.645771823237901`                                               |
| `deepOpening/high/pose/z`                     | `540.1394944186062`                                                | `539.2756590838284`                                                |
| `deepOpening/low/pose/x`                      | `-433.0586399359676`                                               | `-433.517462663171`                                                |
| `deepOpening/low/pose/y`                      | `-10902.581991304172`                                              | `-10902.58039541201`                                               |
| `deepOpening/low/pose/yaw`                    | `-0.6457718232379012`                                              | `-0.645771823237901`                                               |
| `deepOpening/low/pose/z`                      | `540.1394944186062`                                                | `539.2218480105252`                                                |
| `deepOpening/medium/pose/x`                   | `-433.11893980931967`                                              | `-433.53694193792074`                                              |
| `deepOpening/medium/pose/y`                   | `-10902.892532612776`                                              | `-10902.891214789111`                                              |
| `deepOpening/medium/pose/yaw`                 | `-0.6457718232379012`                                              | `-0.645771823237901`                                               |
| `deepOpening/medium/pose/z`                   | `540.1394944186062`                                                | `539.2756590838284`                                                |
| `freeDiveComposition/*/base/x`                | `-408.37020246779036`                                              | `-408.78820459639144`                                              |
| `freeDiveComposition/*/base/z`                | `564.8882317601355`                                                | `564.0243964253576`                                                |
| `freeDiveComposition/*/framed/x`              | `-433.11893980931967`                                              | `-433.53694193792074`                                              |
| `freeDiveComposition/*/framed/y`              | `-10902.58285433173`                                               | `-10902.581503847252`                                              |
| `freeDiveComposition/*/framed/yaw`            | `-0.6457718232379012`                                              | `-0.645771823237901`                                               |
| `freeDiveComposition/*/framed/z`              | `540.1394944186062`                                                | `539.2756590838284`                                                |
| `challenger-keepout/low/*/bounds/min/0`       | `-484.3211063720522`                                               | `-483.40345901029684`                                              |
| `challenger-keepout/low/*/bounds/min/2`       | `493.76746796970417`                                               | `494.6851143777852`                                                |
| `challenger-keepout/low/*/bounds/max/2`       | `518.9262909830098`                                                | `518.0086445749288`                                                |
| `challenger-keepout/low/*/stats/instances`    | `289`                                                              | `291`                                                              |
| `challenger-keepout/low/*/meshes/0/count`     | `86`                                                               | `87`                                                               |
| `challenger-keepout/low/*/meshes/0/matrices`  | `e56964125eb1b7b1a90a44faaef8ce3c95ced1bf7c80c7ca134703e5187656d2` | `e3b2093af5777aa53f0535b4e21a9a7923c3c7d6d8bf5fa3e5781cad88e8c66d` |
| `challenger-keepout/low/*/meshes/0/colors`    | `4a4cb3aa826087d5b44447a35ece6bc12cf7a0b90393868f5ea4eeff431e6fd1` | `ca1dc2fcc9d7ed90e0f8248cdf39c48769b5ebac6f099dcf26b9e7a2a30bedca` |
| `challenger-keepout/low/*/meshes/3/count`     | `47`                                                               | `48`                                                               |
| `challenger-keepout/low/*/meshes/3/matrices`  | `9fbaf6cd80aa19b377323c1c701eb6e1a4309a7a3a18f6d034fd9a372c675ca4` | `b67970f6f2adb8f45cb9775edaba2d07116bea2e3ad03a5860e4eebf67b05114` |
| `challenger-keepout/low/*/meshes/3/colors`    | `66fa4de41d157cd49742fa3fbf14355c267f03b6a605ca732fe772727631228a` | `21d2ad6b1872163813489e1f04eb2456a3b26408ad6ea70b9f4d159c917d975b` |
| `challenger-keepout/high/*/bounds/min/0`      | `-484.2806314803896`                                               | `-483.3723244048891`                                               |
| `challenger-keepout/high/*/bounds/min/2`      | `493.92854260807087`                                               | `494.8090186059957`                                                |
| `challenger-keepout/high/*/bounds/max/2`      | `518.9262909830098`                                                | `518.062455648232`                                                 |
| `challenger-keepout/high/*/stats/cells`       | `51`                                                               | `52`                                                               |
| `challenger-keepout/high/*/stats/instances`   | `3178`                                                             | `3187`                                                             |
| `challenger-keepout/high/*/meshes/0/count`    | `2128`                                                             | `2132`                                                             |
| `challenger-keepout/high/*/meshes/0/matrices` | `b5577dcfa397803985b2686cbbb171765290cb359aa4d3f2ecb817df4aa615f2` | `d442bf9753cc8d6c9e1c7d1ecb261775e7b97f6913d87444fa55999020607221` |
| `challenger-keepout/high/*/meshes/0/colors`   | `cc1728e23541e1dd73faea3c7c0e08e10d7951cc780f8bff93bf9ee13601f706` | `f2bfeced811e5297d58323b2efab3ade8992b43f3b0f4f563003043da8842371` |
| `challenger-keepout/high/*/meshes/1/matrices` | `47bd38c18e177753b6df8d08da0ee5d79eb078a8cd062f48f05832eacda71cfd` | `499208e5630499f4e123daefa51ea0293d5178e0cf62be16ee2ea0efc21908a6` |
| `challenger-keepout/high/*/meshes/1/colors`   | `d5c9a1a550104e43c76bd4e0f339aace3807d08fa22bfa2d9ac200c08fe5bb2a` | `59b092218d50052679c916c2787b2c5974703b6f4c8a1b88d84d58046bd76093` |
| `challenger-keepout/high/*/meshes/2/count`    | `587`                                                              | `589`                                                              |
| `challenger-keepout/high/*/meshes/2/matrices` | `224d6e981a237d5f2baf5002dcc30e839c175adf0cf0fc192f80d85743f542a4` | `7c0b7c1e36d7a547a9636df8c630608d998faa32da5a35613e848bc42dab6568` |
| `challenger-keepout/high/*/meshes/2/colors`   | `f77dddd389c53d1c8725ed032ff2bed2ad5abad518fd55a47409152b03c6c505` | `279484cace1bb0267bc0b39231df4a8135e587e24113f0349239b14068812181` |
| `challenger-keepout/high/*/meshes/3/count`    | `214`                                                              | `217`                                                              |
| `challenger-keepout/high/*/meshes/3/matrices` | `95ef9650ddf9db79b8f45627c49b81f60aba2f5e8f2564a9413e54dd9ed09b86` | `f0c46b851b2dbd122ea21f8b6334ceeaa6b9e554d8cce4025b0da2031fa3b21a` |
| `challenger-keepout/high/*/meshes/3/colors`   | `8a074daadbd1977860acf1b264495eff8bec2906914e84981e450a07cae54d62` | `5d69538a51bb5630dac6b898427803d3c3a09fd6ebea53736ad30add02fc40be` |

All wildlife entries are in the unchanged `hadal-amphipod` group at index 0. Triples list X, Y, Z in metres.

| Tier / animal index | Before (X, Y, Z)                                                 | After (X, Y, Z)                                                  |
| ------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------- |
| high / 0            | `(-444.56859621598886, -10924.718430815992, 510.96511765033597)` | `(-444.98659825737684, -10924.704764862283, 510.10128260829595)` |
| high / 1            | `(-443.15462937024824, -10924.71892679162, 511.1731037362662)`   | `(-443.57263142839236, -10924.704093447548, 510.3092687694772)`  |
| high / 2            | `(-442.5430881274323, -10924.720198171588, 510.9283558867366)`   | `(-442.961090176205, -10924.70499015552, 510.064520913195)`      |
| high / 3            | `(-444.3188739151522, -10924.739051042572, 512.0017002118113)`   | `(-444.73687584836085, -10924.724990211602, 511.1378666341365)`  |
| high / 4            | `(-443.4012224370891, -10924.730100533596, 511.6822909155931)`   | `(-443.81922451177064, -10924.715317237285, 510.8184559730149)`  |
| high / 5            | `(-442.36510273323415, -10924.738150316778, 512.0001874603952)`  | `(-442.7831047814076, -10924.722419673526, 511.13635253393124)`  |
| high / 6            | `(-444.28681715134513, -10924.760659478497, 512.627631279349)`   | `(-444.70481922135326, -10924.746520292152, 511.7637962040636)`  |
| high / 7            | `(-443.49395834273054, -10924.777116730242, 513.113931377574)`   | `(-443.9119603961686, -10924.762210642964, 512.2500963768281)`   |
| high / 8            | `(-442.8714756043436, -10924.762270753454, 512.5300219152458)`   | `(-443.2894776835404, -10924.746851906, 511.6661869811969)`      |
| high / 9            | `(-444.77545364995024, -10924.77676772251, 514.1953712325687)`   | `(-445.19345592193656, -10924.763239820486, 513.3315362020023)`  |
| high / 10           | `(-443.5819219621479, -10924.752562336706, 513.8594831006421)`   | `(-443.9999239926364, -10924.73774824138, 512.9956481740497)`    |
| high / 11           | `(-442.64908707823474, -10924.767065006981, 513.5177738535325)`  | `(-443.0670891505025, -10924.751323745952, 512.6539388515477)`   |
| high / 12           | `(-444.93770822500375, -10924.793067528584, 515.085864207145)`   | `(-445.3557102884135, -10924.779936271882, 514.2220291483712)`   |
| high / 13           | `(-443.5708013995017, -10924.800226607356, 514.51711639093)`     | `(-443.98880343809344, -10924.785461806474, 513.6532813766006)`  |
| high / 14           | `(-442.6511595938246, -10924.821616080453, 515.3489210095587)`   | `(-443.0691618107175, -10924.805959476726, 514.4850860360048)`   |
| high / 15           | `(-444.36970528847667, -10924.828654363344, 515.7305153370279)`  | `(-444.7877073313885, -10924.81505954478, 514.8666802745018)`    |
| high / 16           | `(-443.15197776210596, -10924.7977465286, 516.2888803553615)`    | `(-443.56997977801205, -10924.782857947643, 515.4250454449359)`  |
| high / 17           | `(-442.37403453222566, -10924.828077655093, 515.5434395629264)`  | `(-442.7920365862929, -10924.812143244517, 514.6796046870762)`   |
| high / 18           | `(-444.2784710362864, -10924.831899209334, 517.4022640153586)`   | `(-444.6964731423817, -10924.818785036156, 516.53842891812)`     |
| high / 19           | `(-443.4236562733399, -10924.804393060662, 516.750731541408)`    | `(-443.8416582890018, -10924.789966192022, 515.8868966661659)`   |
| high / 20           | `(-442.22906677115566, -10924.863238389877, 517.1994771398439)`  | `(-442.64706888198555, -10924.847485591628, 516.3356431956298)`  |
| high / 21           | `(-444.31798035798244, -10924.877876047356, 518.3650944693052)`  | `(-444.7359824640977, -10924.865210336062, 517.5012594322918)`   |
| high / 22           | `(-443.2719710608446, -10924.83612231682, 517.654277048741)`     | `(-443.68997308471063, -10924.821803902152, 516.7904420528564)`  |
| high / 23           | `(-442.82974070821103, -10924.851536315178, 518.0864465808235)`  | `(-443.247742807821, -10924.836801532701, 517.2226115513959)`    |
| high / 24           | `(-444.95717718377637, -10924.866499052492, 518.8433484936908)`  | `(-445.3751792182222, -10924.854916072012, 517.9795134009458)`   |
| high / 25           | `(-443.8706297001804, -10924.847898049677, 519.3112703144159)`   | `(-444.28863203111223, -10924.835014889319, 518.4474353594295)`  |
| high / 26           | `(-442.7957133714246, -10924.889708061268, 518.7880598852005)`   | `(-443.2137154700614, -10924.875177467282, 517.9242250822997)`   |
| high / 27           | `(-445.0180078674366, -10924.869606526581, 520.1119456582842)`   | `(-445.4360100326984, -10924.858673309727, 519.2481106070552)`   |
| high / 28           | `(-443.9462905091549, -10924.895166237044, 519.7918433688479)`   | `(-444.36429250617647, -10924.882582199933, 518.9280083283661)`  |
| high / 29           | `(-442.83004169569597, -10924.911973809762, 520.3259661812676)`  | `(-443.24804368911595, -10924.898051489945, 519.4621311952311)`  |
| high / 30           | `(-444.1252011007852, -10924.900883036757, 520.5619390945797)`   | `(-444.54320310220055, -10924.888853336919, 519.6981040615658)`  |
| high / 31           | `(-443.2438040535504, -10924.916881628169, 520.9546796798691)`   | `(-443.66180606564075, -10924.90374983804, 520.0908446409994)`   |
| high / 32           | `(-442.44057455519174, -10924.90135008602, 521.2716688221368)`   | `(-442.8585765475851, -10924.88722382754, 520.407833840118)`     |
| high / 33           | `(-444.3803968523867, -10924.911162049255, 521.8233507360453)`   | `(-444.7983988804467, -10924.89993396906, 520.9595157307558)`    |
| high / 34           | `(-443.47832834842745, -10924.898782507558, 521.9856563249051)`  | `(-443.8963303663164, -10924.886304469217, 521.1218213576497)`   |
| high / 35           | `(-442.3103752788056, -10924.894331026642, 521.7142521685624)`   | `(-442.7283773565403, -10924.88016697773, 520.8504171438941)`    |
| high / 36           | `(-444.127371627776, -10924.918740166371, 523.4004481580837)`    | `(-444.54537361196486, -10924.907488961917, 522.5366130567764)`  |
| high / 37           | `(-443.1548239805775, -10924.908311320472, 522.8400448572525)`   | `(-443.5728259616383, -10924.895585209075, 521.9762098184868)`   |
| high / 38           | `(-442.8072114884415, -10924.900805441077, 523.2902656600616)`   | `(-443.22521347162274, -10924.88768162954, 522.4264306669251)`   |
| high / 39           | `(-444.67303401516835, -10924.904836962316, 523.9043093501402)`  | `(-445.0910359994982, -10924.894425762091, 523.0404742426134)`   |
| high / 40           | `(-443.7502245712564, -10924.90176577424, 524.1898584407996)`    | `(-444.1682265515372, -10924.89003495821, 523.3260233930545)`    |
| high / 41           | `(-442.599002639704, -10924.93632822584, 524.1016839248208)`     | `(-443.017004721452, -10924.923015334161, 523.237848805877)`     |
| high / 42           | `(-444.8148105746252, -10924.900567533889, 524.6162670575483)`   | `(-445.2328125592183, -10924.890359148134, 523.7524319685485)`   |
| high / 43           | `(-443.9218876365363, -10924.95163386019, 525.320152332514)`     | `(-444.33988960088266, -10924.940064424743, 524.4563172394476)`  |
| high / 44           | `(-442.7040507360552, -10924.969762383307, 524.6488505418655)`   | `(-443.1220524824682, -10924.95660106396, 523.7850161707831)`    |
| low / 0             | `(-444.50808504247937, -10924.431671505514, 514.4648602714993)`  | `(-444.9669076298262, -10924.41623832894, 513.5472142616386)`    |
| low / 1             | `(-443.0945533486651, -10924.443106554203, 514.6724262996464)`   | `(-443.5533759614964, -10924.427541112726, 513.7547803117326)`   |
| low / 2             | `(-442.4826755507861, -10924.450203912653, 514.4282079773238)`   | `(-442.94149816796886, -10924.434613698855, 513.5105619938939)`  |
| low / 3             | `(-444.2568534858101, -10924.450650707691, 515.4939132694205)`   | `(-444.7156760639735, -10924.435095201065, 514.5762672735003)`   |
| low / 4             | `(-443.34108869595474, -10924.45022788476, 515.1818424552229)`   | `(-443.7999112968998, -10924.434632375967, 514.2641964712122)`   |
| low / 5             | `(-442.3049500202634, -10924.464409696931, 515.4999764512834)`   | `(-442.76377262792005, -10924.448704237913, 514.5823304713034)`  |
| low / 6             | `(-444.22634264603903, -10924.470528465341, 516.1266139802793)`  | `(-444.68516521582455, -10924.454905824936, 515.2089679920833)`  |
| low / 7             | `(-443.4334503917574, -10924.491020588439, 516.6133108217898)`   | `(-443.8922729770909, -10924.475287882957, 515.6956648459244)`   |
| low / 8             | `(-442.8111294634287, -10924.482674168714, 516.0292387638525)`   | `(-443.26995206821914, -10924.466954701098, 515.1115927859751)`  |
| low / 9             | `(-444.7153614181261, -10924.479076574078, 517.694661348446)`    | `(-445.1741839546016, -10924.463321870468, 516.7770153543513)`   |
| low / 10            | `(-443.5217532179129, -10924.463391395375, 517.3581788898886)`   | `(-443.9805758012718, -10924.447586591365, 516.4405328936698)`   |
| low / 11            | `(-442.58853425510927, -10924.484769153367, 517.0170929879822)`  | `(-443.0473568637509, -10924.468933125994, 516.0994470242074)`   |
| low / 12            | `(-444.877414886403, -10924.493067720945, 518.5849739484124)`    | `(-445.33623741209357, -10924.47722319677, 517.6673279616399)`   |
| low / 13            | `(-443.51032533927867, -10924.509227659504, 518.0159852720685)`  | `(-443.96914789789474, -10924.493350537818, 517.0983392992889)`  |
| low / 14            | `(-442.59108246196473, -10924.532870978825, 518.8481043030073)`  | `(-443.04990503205426, -10924.516838445319, 517.9304583408518)`  |
| low / 15            | `(-444.30928244082116, -10924.531216075795, 519.2293973142907)`  | `(-444.7681049656252, -10924.515255974584, 518.3117513324022)`   |
| low / 16            | `(-443.0917181930331, -10924.50489920939, 519.7874503034321)`    | `(-443.55054074950334, -10924.488791818421, 518.8698043250479)`  |
| low / 17            | `(-442.3139403919725, -10924.539908159677, 519.0428568959404)`   | `(-442.77276297610155, -10924.523835470578, 518.1252109438826)`  |
| low / 18            | `(-444.21813572684584, -10924.534730202353, 520.9013289545653)`  | `(-444.6769582326328, -10924.518559021699, 519.9836829740698)`   |
| low / 19            | `(-443.3633780628227, -10924.510064822289, 520.2504928852179)`   | `(-443.822200600721, -10924.493919632308, 519.3328469062216)`    |
| low / 20            | `(-442.1665104742197, -10924.571517418919, 520.6929021502989)`   | `(-442.62533304017313, -10924.555244123707, 519.7752561919659)`  |
| low / 21            | `(-444.25773365822215, -10924.58190784569, 521.8645350561634)`   | `(-444.7165561516056, -10924.565614078838, 520.946889071839)`    |
| low / 22            | `(-443.2117620194393, -10924.541839563102, 521.1549211578654)`   | `(-443.6705845486128, -10924.52557330535, 520.2372751909709)`    |
| low / 23            | `(-442.76944283517435, -10924.55803288438, 521.5854549704312)`   | `(-443.22826536884975, -10924.541685655047, 520.6678090042035)`  |
| medium / 0          | `(-444.5685968501139, -10924.622400264981, 510.96511563401003)`  | `(-444.9865989002072, -10924.610941115654, 510.10128056394785)`  |
| medium / 1          | `(-443.1546298168146, -10924.622226197544, 511.17310168653233)`  | `(-443.5726318673958, -10924.610435874107, 510.3092666412417)`   |
| medium / 2          | `(-442.5430885643286, -10924.62377755682, 510.9283539014385)`    | `(-442.96109062660275, -10924.611950156135, 510.0645188665665)`  |
| medium / 3          | `(-444.31866362394567, -10924.640170560104, 512.001411676818)`   | `(-444.73666542003866, -10924.628321829774, 511.1375761580556)`  |
| medium / 4          | `(-443.4012229168104, -10924.631919918946, 511.6822889098942)`   | `(-443.8192249596066, -10924.619999911047, 510.81845386953216)`  |
| medium / 5          | `(-442.3651031602752, -10924.637790811437, 512.0001854860279)`   | `(-442.783105212806, -10924.62553158522, 511.13635044734565)`    |
| medium / 6          | `(-444.2868179623672, -10924.660212536344, 512.6276290586652)`   | `(-444.7048200328725, -10924.648143224003, 511.76379396989046)`  |
| medium / 7          | `(-443.49395904304276, -10924.675035145121, 513.1139293286813)`  | `(-443.9119610985694, -10924.662624117995, 512.2500942984515)`   |
| medium / 8          | `(-442.87147606061495, -10924.660986810268, 512.5300199772769)`  | `(-443.2894781095818, -10924.648647319114, 511.66618496483375)`  |
| medium / 9          | `(-444.7754546879709, -10924.673809819284, 514.1953693546717)`   | `(-445.19345676205137, -10924.66129957019, 513.3315343401059)`   |
| medium / 10         | `(-443.5819225280541, -10924.649018854505, 513.8594812137303)`   | `(-443.99992454837, -10924.636357686099, 512.9956461866633)`     |
| medium / 11         | `(-442.64908784495486, -10924.662699042094, 513.5177715590322)`  | `(-443.0670899269733, -10924.649939799549, 512.6539365089659)`   |
| medium / 12         | `(-444.9377090832277, -10924.689794924494, 515.0858622653637)`   | `(-445.3557111081782, -10924.677008804609, 514.2220272486647)`   |
| medium / 13         | `(-443.5708021040188, -10924.695647034509, 514.5171142900314)`   | `(-443.9888041558556, -10924.682742491228, 513.6532792424138)`   |
| medium / 14         | `(-442.65116091008315, -10924.713914697526, 515.3489190070671)`  | `(-443.06916300920074, -10924.700461161861, 514.4850840294574)`  |
| medium / 15         | `(-444.36970605975404, -10924.72485673247, 515.7305133495018)`   | `(-444.78770809970337, -10924.711705145663, 514.8666783010232)`  |
| medium / 16         | `(-443.151978391355, -10924.691175337166, 516.2888786646919)`    | `(-443.5699803941362, -10924.677500058739, 515.4250436867173)`   |
| medium / 17         | `(-442.3740351359863, -10924.719306651772, 515.5434379025199)`   | `(-442.7920371601551, -10924.705702605952, 514.6796029440321)`   |
| medium / 18         | `(-444.27847212609566, -10924.730123174733, 517.4022618172129)`  | `(-444.69647416451704, -10924.716335729461, 516.5384268107658)`  |
| medium / 19         | `(-443.4236569291597, -10924.69895378222, 516.7507296981883)`    | `(-443.84165891595865, -10924.685178262982, 515.8868946630121)`  |
| medium / 20         | `(-442.2305091384269, -10924.753373407046, 517.1925385091871)`   | `(-442.6485110502264, -10924.739089176375, 516.328704102651)`    |
| medium / 21         | `(-444.317981793687, -10924.779038072415, 518.3650923612154)`    | `(-444.73598378999606, -10924.764905395003, 517.501257410388)`   |
| medium / 22         | `(-443.27112788018366, -10924.731413765436, 517.6553016516336)`  | `(-443.68912987280834, -10924.717253761723, 516.7914667092904)`  |
| medium / 23         | `(-442.8297417977821, -10924.745738619353, 518.0864443101211)`   | `(-443.247743852836, -10924.731286606497, 517.2226093363129)`    |
| medium / 24         | `(-444.95717832199546, -10924.771772071108, 518.8433462765212)`  | `(-445.3751802867297, -10924.757638042594, 517.9795113062037)`   |
| medium / 25         | `(-443.8706318657041, -10924.750978049442, 519.3112684104746)`   | `(-444.2886338707804, -10924.736367078045, 518.4474334896628)`   |
| medium / 26         | `(-442.79571444659445, -10924.785488723152, 518.7880585200628)`  | `(-443.2137164108723, -10924.770758449406, 517.9242235758085)`   |
| medium / 27         | `(-445.01800989583336, -10924.782055020787, 520.1119435016345)`  | `(-445.43601184460715, -10924.76747473696, 519.2481085604937)`   |
| medium / 28         | `(-443.94629144406696, -10924.80089225454, 519.7918412752718)`   | `(-444.36429340451645, -10924.78612413459, 518.9280063176735)`   |
| medium / 29         | `(-442.8300425022131, -10924.813918150125, 520.3259641079429)`   | `(-443.2480444753523, -10924.798614888257, 519.4621291679805)`   |
| medium / 30         | `(-444.125918688153, -10924.811877736925, 520.5619408367806)`    | `(-444.54392062711815, -10924.796876696992, 519.6981058968204)`  |
| medium / 31         | `(-443.24081416962383, -10924.824914045252, 520.9544507111258)`  | `(-443.65881603542425, -10924.80950189549, 520.0906160947299)`   |
| medium / 32         | `(-442.4405753830316, -10924.805534313684, 521.2716666844718)`   | `(-442.85857735155435, -10924.789754690924, 520.407831757157)`   |
| medium / 33         | `(-444.3803984960595, -10924.832496113077, 521.8233486178494)`   | `(-444.79840038961066, -10924.817107704044, 520.9595136701015)`  |
| medium / 34         | `(-443.478329813601, -10924.815285788614, 521.9856543998612)`    | `(-443.89633172537395, -10924.799566097541, 521.1218194713878)`  |
| medium / 35         | `(-442.3103763863041, -10924.800097596804, 521.7142498056676)`   | `(-442.72837837673126, -10924.784112138712, 520.8504149002556)`  |
| medium / 36         | `(-444.1273732398617, -10924.851820729145, 523.4004455941692)`   | `(-444.5453751271591, -10924.835788769891, 522.5366106484919)`   |
| medium / 37         | `(-443.1548251933003, -10924.828828873198, 522.8400424950713)`   | `(-443.57282711554797, -10924.812698668487, 521.9762075648583)`  |
| medium / 38         | `(-442.8072127833705, -10924.821957730348, 523.290263567354)`    | `(-443.22521469725916, -10924.805556921596, 522.4264286412991)`  |
| medium / 39         | `(-444.67303604809035, -10924.846901434286, 523.9043067457432)`  | `(-445.0910379052686, -10924.830855061597, 523.0404717879899)`   |
| medium / 40         | `(-443.7502263990513, -10924.839168245164, 524.1898559989185)`   | `(-444.1682282701788, -10924.822743241552, 523.3260210484818)`   |
| medium / 41         | `(-442.5990039111838, -10924.862332876353, 524.1016813473859)`   | `(-443.01700587222615, -10924.845579814895, 523.2378464033859)`  |
| medium / 42         | `(-444.8148129827937, -10924.851070237517, 524.6162654548118)`   | `(-445.23281481920066, -10924.8348176104, 523.7524304519889)`    |
| medium / 43         | `(-443.9218897518087, -10924.901854969889, 525.3201496269602)`   | `(-444.3398916026499, -10924.885093674784, 524.4563146618526)`   |
| medium / 44         | `(-442.70615577463366, -10924.901724242018, 524.6527898116873)`  | `(-443.1241576640687, -10924.884814451949, 523.7889548586038)`   |

</details>
