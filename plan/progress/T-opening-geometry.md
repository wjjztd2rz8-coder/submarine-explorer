# T-opening-geometry — mission opening measurements

2026-11-04, Codex. Tests and report only; no visuals, site data, runtime code, dependencies, or DIRECTOR edits. No merge or push. Extended the existing `missionComposition` capability suite and reused its real prop loader and vertex projection helper. No site branches or new settings/UI.

## Findings

The brief describes an older opening. At checkout `cc3c46618bd9d7367e4206c46283b62cc875675c`, Blue Hole's mission approach is **125 m**, with a resolved **46 m** chase arm, looking **9.47° upward**. Its gallery's solid projected envelope is **26.55° wide × 11.88° high**, about **156 px high** at 1600×900. The measured opening does not reproduce a 150 m approach. Blake's first subject spans **12.16° × 14.87°**, about **199 px high**: a lone-mound impression is not explained by an undersized envelope alone.

**Axial and Endurance flag for small objective height; all 13 cached openings pass the independent luminance proxy.** These are geometry/readability diagnostics, not claims that an opening is beautiful or that its objective is recognizable.

## Geometry method and threshold

The table-driven unit test loads each declared site's `site.json` (through the manifest), `mission.json`, `pois.json`, `props.json`, real heightmap and real procedural/GLB geometry. Only image decoding is stubbed in Node, using the suite's existing loader. Settings resolve once for default Arcade. It uses the runtime mission spawn function, mission hull depth limit, High tier, 16:9 chase camera, level submarine and a camera snap before any physics drift. The first objective is the first primary **mission objective**, not necessarily the first POI whose own `primary` bit is true.

Camera distance is the resolved eye-to-sub-centre Euclidean distance after terrain/surface arm clamping; authored/default reset distance is also retained in the JSON audit. Camera pitch is the view direction's elevation from the horizontal: positive looks up, negative looks down. Sub-to-objective distance is the 3D distance to the placed first POI, not to the subject's nearest surface.

Every site's authored `opening.freeDive.hero` represents its first mission contact in this catalog; the test asserts that the prop exists, is visible after LOD/culling and is within the POI radius. This data reference selects the physical subject, not the free-dive camera pose. Visible solid meshes (material opacity ≥0.95) establish the envelope, excluding hidden LODs and translucent plumes. Every vertex and instance transform is projected with the actual opening camera. The 2D envelope is intersected with the frame, then converted to horizontal/vertical angular spans:

```text
v = tan(verticalFov / 2)
width  = atan(x_max * v * aspect) - atan(x_min * v * aspect)
height = atan(y_max * v)          - atan(y_min * v)
```

NDC coordinates range from -1 to +1; angles are converted to degrees. Pixel height is `(y_max - y_min) * 900 / 2`.

Flag **vertical angular height < 5°**, strictly. At the 62° vertical FOV this corresponds to about **65 px** for a subject centred vertically in a 900 px image (`900 * tan(2.5°) / tan(31°)`), roughly 7% of frame height. That is a deliberately coarse review floor for a mission's first subject: enough room for a broad silhouette and some internal structure. It is a local engineering heuristic, not a perceptual standard. Vertical extent prevents a very wide, thin subject from passing on width alone. Axial's ~17 px vent is clearly below it; Endurance is marginal at 4.83°. Perspective position changes the pixel equivalent (Endurance is ~65 px despite being slightly below 5°).

Known flags are recorded in the test's reviewed-small-openings table. Each site asserts its flag classification, so a newly small opening fails and an improved known opening prompts removal of its old flag. Existing deficits are explicit rather than leaving the suite red. The optional audit also records the flags and the test emits `FLAG` warnings.

This measures a **solid prop envelope**, including attached foundations, sediment aprons, fittings and colonies. It does not measure the stalactites alone, a whole terrain-defined mound field, occlusion by terrain/sub/HUD, fog, contrast, material appearance, or perceptual recognition. A large envelope may still look like an unreadable slab or a lone mound. High desktop results do not establish portrait/Low readability. No screenshot-derived angular measurements or fresh captures are claimed.

## Current site geometry

All distances are metres. The configured and resolved camera distances are equal in these openings (default arm 97.693 m unless the mission authors another value). Angular spans are width × height in degrees.

| Site                 | First objective → physical subject               | Camera distance | Camera pitch | Sub → first POI |    Angular size | Height px | Scale review |
| -------------------- | ------------------------------------------------ | --------------: | -----------: | --------------: | --------------: | --------: | ------------ |
| axial-seamount-ashes | `axial-ashes-mushroom` → `mushroom-chimney`      |           97.69 |       -7.70° |          110.00 |   1.14° × 1.30° |      17.5 | FLAG         |
| beebe-vent-field     | `bvf-main-vents` → `beebe-chimney-1`             |           46.00 |       +0.21° |          155.00 | 30.45° × 14.61° |     197.6 | pass         |
| bismarck             | `bismarck-hull` → `main-hull`                    |           97.69 |       -7.70° |          110.00 | 58.76° × 16.82° |     237.6 | pass         |
| blake-plateau-corals | `blake-mound-field-core` → `lophelia-mound`      |           97.69 |       -7.70° |          160.00 | 12.16° × 14.87° |     198.9 | pass         |
| challenger-deep      | `cd-leggo-amphipod-site` → `leggo-lander-marker` |           97.69 |       -7.70° |          140.00 | 15.50° × 11.81° |     156.2 | pass         |
| endurance            | `endurance-hull` → `main-hull`                   |           97.69 |       -7.70° |          110.00 |  13.33° × 4.83° |      65.3 | FLAG         |
| great-blue-hole      | `great-blue-hole-stalactites` → `karst-grotto`   |           46.00 |       +9.47° |          125.00 | 26.55° × 11.88° |     156.0 | pass         |
| hudson-canyon        | `hc-coral-ledge` → `coral-ledge-mound`           |           97.69 |       -7.70° |          112.00 |  19.89° × 9.87° |     133.1 | pass         |
| hunga-tonga-caldera  | `hunga-tonga-rim-wall` → `caldera-tuff-wall`     |           97.69 |       -7.70° |          120.00 | 39.83° × 33.20° |     446.5 | pass         |
| kamaehuakanaloa      | `kh-hiolo-north` → `hiolo-north-chimney-1`       |           45.00 |       +2.85° |          110.00 |   9.18° × 8.08° |     113.4 | pass         |
| lost-city            | `lost-city-poseidon` → `poseidon-tower`          |           97.69 |       -7.70° |          220.00 | 28.70° × 19.87° |     273.9 | pass         |
| monterey-canyon      | `monterey-canyon-wall` → `canyon-wall-ledge`     |           97.69 |       -7.70° |          240.00 | 24.36° × 21.89° |     289.7 | pass         |
| titanic              | `titanic-bow` → `bow-hull`                       |           97.69 |       -7.70° |          140.00 | 32.80° × 14.28° |     198.5 | pass         |

## Cached golden luminance output

Ran the unmodified `tools/golden-readable.mjs` on the newest available complete local set, `/home/vijay/submarine-explorer/.cache/golden/2026-11-04-033854`. `poses.json`: clean SHA `f2738f121fa947e7009b2638c74402733abad86f`, production, complete with no capture failures, all 13 mission openings, High desktop 1600×900. The shared cache was read only. Full output is retained in `.cache/opening-geometry-readable.txt`.

This is **cached image evidence**, separate from the current-checkout geometry table. Since capture, Bismarck's mission yaw offset changed from 25° to 8° and its particle overrides changed; its image statistics cannot be claimed for the current frame. Blue Hole's free-dive framing also changed, while its mission opening data stayed the same. No fresh screenshots could be captured in this sandbox.

Scene/sub means use linear-light luminance as percentages of white. Dark share counts scene pixels below linear sRGB 20/255. The existing tool flags scene/sub <0.125 or absolute scene mean below that dark threshold. Its fixed rectangles cannot isolate the physical objective; brightness passing does not imply adequate subject size.

| Opening                                              | Scene mean Y (%) | Dark (%) | Sub mean Y (%) | Scene/sub | Review |
| ---------------------------------------------------- | ---------------: | -------: | -------------: | --------: | ------ |
| hunga-tonga-caldera-1-mission.png                    |            5.017 |      0.0 |         21.771 |     0.230 | pass   |
| bismarck-1-mission.png                               |            2.840 |      0.0 |         12.219 |     0.232 | pass   |
| titanic-1-mission.png                                |            5.190 |      0.0 |         20.293 |     0.256 | pass   |
| monterey-canyon-1-mission.png                        |            4.579 |      0.0 |         16.789 |     0.273 | pass   |
| lost-city-1-mission.png                              |            5.964 |      0.0 |         21.420 |     0.278 | pass   |
| axial-seamount-ashes-1-mission.png                   |            3.310 |      0.0 |         11.876 |     0.279 | pass   |
| blake-plateau-corals-1-mission.png                   |            3.525 |      0.0 |         12.579 |     0.280 | pass   |
| beebe-vent-field-1-mission.png                       |            4.253 |      0.0 |         13.418 |     0.317 | pass   |
| hudson-canyon-1-mission.png                          |            4.538 |      0.0 |         13.930 |     0.326 | pass   |
| kamaehuakanaloa-1-mission.png                        |           10.322 |      0.0 |         27.463 |     0.376 | pass   |
| endurance-1-mission.png                              |            7.031 |      0.0 |         17.217 |     0.408 | pass   |
| challenger-deep-1-mission.png                        |            5.263 |      0.0 |         11.640 |     0.452 | pass   |
| great-blue-hole-1-mission.png                        |            6.064 |      0.0 |          2.542 |     2.386 | pass   |
| Golden readability (advisory): 0/13 openings flagged |

## Reproduction and validation

```sh
OPENING_GEOMETRY_AUDIT=1 npx vitest run tests/unit/missionComposition.test.ts \
  -t 'mission opening objective angular size review' --configLoader runner
node tools/golden-readable.mjs /home/vijay/submarine-explorer/.cache/golden/2026-11-04-033854
node --test tools/tests/golden-readable.test.mjs
npx tsc --noEmit
```

The geometry command writes the unrounded measurements to `.cache/opening-geometry.json`. The report and tests need no internet.

- Final table-driven geometry assertions: **13/13 pass in two rounds**, including the reviewed Axial/Endurance flags. Logs: `.cache/opening-geometry-unit-round2.log` and `.cache/opening-geometry-unit-final.log`. The other 66 tests in this capability file were filtered out, not claimed as run.
- All 13 rounded angular measurements in this report match the final unrounded audit; the exact flagged set is Axial and Endurance.
- Existing golden-readable test suite, TypeScript (`npx tsc --noEmit`), Prettier on both changed files, and `git diff --check` pass. Logs: `.cache/opening-geometry-readable-tests.log` and `.cache/opening-geometry-typecheck.log`. No production build was needed for this tests/report-only change.

Searched `tests/e2e` for `opening`, `framing`, and mission-spawn capabilities. Selected Blue Hole's High mission approach and Blake's catalog mission capture. `--list` confirms four selected executions with two repeats. Attempted:

```sh
GATES_CONFIG_MODE=writable PW_PORT=4320 npx playwright test tests/e2e/opening-framing.spec.ts \
  -g '(great-blue-hole high: mission previews and opens on an approach outside scan range|blake-plateau-corals: persists spawn PNG and golden manifest)' \
  --repeat-each=2 --output=.cache/opening-geometry-e2e
```

Playwright is blocked **before browser assertions** because the preview server cannot bind `127.0.0.1:4320` (`listen EPERM`). No E2E pass is claimed. Details: `.cache/opening-geometry-e2e.log`, `.cache/opening-geometry-e2e-list.log`, `.cache/opening-geometry-preview.log`. No application behaviour was changed.
