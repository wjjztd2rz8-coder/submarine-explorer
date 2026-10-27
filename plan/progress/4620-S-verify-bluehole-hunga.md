# 4620 — S-verify: Blue Hole shaft and Hunga/Kama/Axial numerics

Audited **2026-10-27**, HEAD **`e3700acd7cef61dc558f12eeb2f203866724d191`**.
Read `plan/DIRECTOR.md`, the earlier 4570/4540/4550/4560 numeric notes, and
`V-hunga-subject.md` / `V-kama-axial-approach.md`. The checkout was clean.
**Report only: no art, production code, data, tests or snapshots changed.**

**Result:** the Blue Hole shaft fits the **7-draw Low pin exactly**, leaving
**zero draws and 2,268 triangles** of local budget headroom. Hunga and Kama's
latest lifts change emission, not albedo. At 100 m, terrain-feasible High
portrait views give Hunga **17.2545%** solid coverage, Kama's pillows
**0.8661%**, and Axial's Mushroom **0.0371%**; all six Axial props together
give **0.4038%**. These are controlled geometry measurements, not rendered
brightness or visual acceptance.

## Blue Hole roof: draw and triangle headroom

Built the shipped props with the actual GMRT heightmap and runtime `Terrain`,
on every tier. The conservative census includes all full-prop meshes,
instances, internal detail branches, material groups and transparent side
passes. It excludes terrain, the player, life outside the props and post.

| Tier   | Actual prop draws | Submitted prop triangles | Shaft draws / triangles |
| ------ | ----------------: | -----------------------: | ----------------------: |
| Low    |                 7 |                   19,032 |                 1 / 384 |
| Medium |                 9 |                   90,800 |                 1 / 384 |
| High   |                 9 |                  142,248 |                 1 / 384 |

The existing `terrainMerge1140` Low pin remains **7 draws / 21,300 triangles**.
Therefore Low has **0 draw headroom**, **2,268 triangles (10.6479% of the
ceiling)**, and uses **89.3521%** of its triangle allowance. Without the shaft
the cost would be 6 draws / 18,648 triangles: the shaft uses the seventh draw
and 384 triangles. Any additional Low mesh/pass needs a compensating merge or
removal to retain this pin. Against the broader static-prop guard of
1,200 draws / 1,200,000 triangles, Low has 1,193 draws / 1,180,968 triangles
remaining; that broader allowance does not supersede the local pin.

The east hood contains the sole transparent mesh, `grotto-light-shaft`:
**260 vertices / 384 indexed triangles**, one material, no groups,
`MeshBasicMaterial`, additive blending, DoubleSide, **`forceSinglePass=true`**,
depth test on, depth write off. The west gallery has no shaft. Its vertex
colour fade survives the merge, with peak blue **0.03** and nonnegative
components. Thus the one-draw count includes both sides; it is not a mesh-only
undercount. There is no added light, shadow or post pass.

The existing shaft capability also rechecked Low's projected triangle area at
1280×720 before depth/fog rejection: **40,644.95 / 68,421.53 / 1,021,312.32 px**
at the authored east **55 / 42 / 10 m** samples, below the existing
**42,000 / 70,000 / 1,050,000 px** caps. These ranges are the capability's
authored offsets, separate from the exact optical ranges below. The west
opening remains **0 px** projected shaft area despite submitting its draw.
These are fill estimates, not measured GPU time or phone acceptance.

## Subject albedo and emission

Numbers are **linear RGB relative luminance**,
`Y = 0.2126 R + 0.7152 G + 0.0722 B`, not sRGB byte values. Means below weight
actual triangle surface area, including instance transforms/colours. They
include buried and rear surfaces; they are not the opening's pixel-weighted
means from 4560. Node texture factories return null. Browser detail maps divide
out their whole-texture linear mean, so these are nominal texture-normalized
albedos, not a claim about a particular view's sampled texture mean.

| Solid material             | Mean albedo Y, Low |   Medium |     High | Current self-lit setting           |
| -------------------------- | -----------------: | -------: | -------: | ---------------------------------- |
| Hunga tuff wall            |           0.012889 | 0.012917 | 0.012860 | `vertexGlow(0.19, 0xb4b09a, 0.25)` |
| Hunga talus apron          |           0.012625 | 0.012634 | 0.012638 | `vertexGlow(0.15, 0xb4b09a, 0.25)` |
| Hunga boulders, combined   |             absent | 0.009994 | 0.010072 | same rubble glow                   |
| Kama pillow body           |           0.003877 | 0.003821 | 0.003763 | `vertexGlow(0.5, 0xd0a080, 0.45)`  |
| Kama iron mats             |           0.041044 | 0.042850 | 0.039250 | `emissive=0xd08a45`, intensity 1.2 |
| Kama Hiolo North chimney 1 |           0.004442 | 0.004442 | 0.004442 | zero emission                      |
| Kama Hiolo North chimney 2 |           0.006359 | 0.006359 | 0.006359 | zero emission                      |
| Kama Hiolo South chimney   |           0.006385 | 0.006385 | 0.006385 | zero emission                      |
| Axial Mushroom body        |           0.002083 | 0.002083 | 0.002083 | `vertexGlow(0.6, 0xff9a68, 0.5)`   |
| Axial Inferno body         |           0.002018 | 0.002018 | 0.002018 | same plain-chimney glow            |
| Axial smoker mound body    |           0.005011 | 0.005062 | 0.005053 | `vertexGlow(0.13, 0xff9a68, 0.5)`  |

Axial's other three plain chimney body albedos are tier-independent:
Hell **0.001821**, Phoenix **0.002116**, Virgin **0.002234**. All geo bodies
retain the shared **0.07** albedo multiplier; the unprofiled smoker mound uses
an additional **1.25**, giving **0.0875**. Rock metalness is zero. Roughness is
**0.95 / 0.96** for Hunga wall/apron / boulders, **0.55** for pillows,
**0.85** for iron mats, **0.93** for plain chimneys and **0.90** for the mound.

The compiled `vertexGlow` insertion was invoked headlessly. Its emission is
`emissiveRGB × mix(vertexRGB, white, floor) × (0.7 + 0.3 normalY)`, with the
normal factor bounded by **[0.4, 1]**. The colour-floor parameter lifts dark
vertices; it does not change diffuse reflectance. Raw linear emissive RGB is:

| Material                            | Raw emissive RGB, before colour floor / normal factor |
| ----------------------------------- | ----------------------------------------------------- |
| Hunga wall                          | [0.086718, 0.082489, 0.061397]                        |
| Hunga apron/boulders                | [0.068462, 0.065123, 0.048471]                        |
| Kama pillows                        | [0.315379, 0.175766, 0.107930]                        |
| Kama iron mats, after intensity 1.2 | [0.756909, 0.304983, 0.071413]                        |
| Axial five plain chimneys           | [0.600000, 0.193886, 0.083059]                        |
| Axial mound                         | [0.130000, 0.042009, 0.017996]                        |

For scale, area-weighted triangle-centroid evaluations using outward normals
give emission Y **0.02527–0.02556** for the Hunga wall,
**0.07205–0.07455** for Kama's pillows, and **0.09874** for Mushroom.
The iron mats have constant emission Y **0.38420**. These are unfogged emission
input proxies, not total lit-pixel luminance; double-sided normal flips, bump
mapping, headlights, fog, exposure and grading still affect the image.

Inspection of the merged diffs confirms `d38a92f3` adds Hunga's glow tuple and
`64ff2fae` adds the pillow/mat emission. Neither changes their albedo or
geometry. Axial's latter merge changes mission smoke opacity **0.9→0.7** and
rise height to **45 m**, not chimney albedo or body emission. Low retains the
material emission even where preset visual effects are disabled. There is no
distance term in these glow expressions: the material lift itself is the same
at 40 m and 100 m, before view-dependent normals and scene effects.

## Apparent size at 40 m and 100 m

These are **eye-to-aimpoint distances**, not submarine-to-POI ranges, mission
openings or existing golden captures. Built actual Low/High terrain and props,
used `CameraRig` projection with **62°** vertical FOV on desktop 1600×900 and
landscape phone 844×390, and its portrait-preserving **104.876616°** vertical
FOV at 390×844. No phone-landscape horizontal view shift was applied.

Controlled bearings/aims:

- Hunga: local aim **[0,36,−8]**, world-east bearing, baseline eye height
  **root Y + 38 m**, from the authored low-tier pose.
- Kama: pillow local-bounds centre, world northeast bearing
  **[1/√2,0,−1/√2]**, baseline eye **root Y + 22 m**, from that pose.
- Axial: Mushroom bounds centre in x/z, local aim Y **1.8 m**, northeast
  bearing, baseline eye **13.2 m above the aim**. The whole-field rows use the
  same camera/range anchored to Mushroom, not a separately centred mound.

Every eye is at least **6 m vertically above the actual terrain**. Horizontal
stand-off was solved with that clearance and baseline height to retain exactly
40 m or 100 m optical range; the camera then looks directly at its aimpoint.
This matters at Kama: a naive fixed-height 100 m sample would put the eye
**53.6–54.0 m below the bed**. Those preliminary samples were rejected. The
feasible Kama horizontal stand-offs are **27.819–28.337 m** at 40 m optical
range and **73.954–74.296 m** at 100 m. This is a controlled feasibility
correction for this measurement, not a claim that golden or runtime cameras
sit below ground; their rig can raise the eye and change the optical range.

The census clips solid triangles to all six frustum planes and rasterizes
pixel-centre depth against runtime terrain and all solid props, with actual
material sides and instances. It excludes the player, HUD, smoke, shimmer,
lighting and shader colour. `bbox` is the on-screen extent of visible subject
pixels; `%` is occupied solid pixels / full frame, not bbox area.

**High tier:**

| Subject                                   | Range (m) | Desktop bbox / occupied % | Portrait bbox / occupied % | Landscape occupied % |
| ----------------------------------------- | --------: | ------------------------- | -------------------------- | -------------------: |
| Hunga tuff including apron/rubble         |        40 | 1600×900 / 86.5871%       | 390×649 / 67.7397%         |             83.6712% |
| Hunga tuff including apron/rubble         |       100 | 683×613 / 20.5071%        | 296×282 / 17.2545%         |             16.8441% |
| Kama pillows including iron mats          |        40 | 768×288 / 11.0654%        | 333×125 / 9.0856%          |              9.0856% |
| Kama pillows including iron mats          |       100 | 254×84 / 1.0531%          | 110×36 / 0.8661%           |              0.8661% |
| Axial Mushroom alone                      |        40 | 68×91 / 0.3101%           | 30×40 / 0.2558%            |              0.2558% |
| Axial Mushroom alone                      |       100 | 26×33 / 0.0451%           | 11×14 / 0.0371%            |              0.0371% |
| Axial all six props, including mound/life |        40 | 826×198 / 3.5939%         | 209×441 / 2.7288%          |              2.9551% |
| Axial all six props, including mound/life |       100 | 412×135 / 0.4885%         | 178×59 / 0.4038%           |              0.4038% |

Low's portrait occupied percentages at **40 / 100 m** are Hunga
**68.2969 / 17.4426**, Kama **7.9979 / 0.7811**, Mushroom
**0.2531 / 0.0368**, and the whole Axial field **2.7528 / 0.3943**.
All 36 tier/range/layout records, pixel counts, camera/target coordinates and
bed clearances are retained in the raw numeric evidence.

Hunga clips at 40 m, so those extents are viewport-limited. The Axial field is
a disjoint group: its bbox spans empty water between props, and the portrait
camera sees lower geometry excluded by the shorter landscape frame. The
individual Mushroom remains only **11×14 portrait pixels at 100 m**; whole-field
coverage must not be used as its apparent size. No minimum size threshold or
visual pass/fail is invented here.

For a separate, reusable scale check, a centred front-facing planar extent S
at range R spans `2 atan(S/(2R))` degrees, and
`heightPx × S / (2R tan(verticalFov/2))` pixels. With authored dimensions:

| Nominal width×height         | Angular width×height at 40 / 100 m | Portrait pixels at 40 / 100 m |
| ---------------------------- | ---------------------------------- | ----------------------------- |
| Hunga 90×45 m                | 96.73×58.72° / 48.46×25.36°        | 730.2×365.1 / 292.1×146.0     |
| Kama pillows 36×5 m          | 48.46×7.15° / 20.41×2.86°          | 292.1×40.6 / 116.8×16.2       |
| Kama North chimney 1.6×3.2 m | 2.29×4.58° / 0.92×1.83°            | 13.0×26.0 / 5.2×10.4          |
| Axial Mushroom 4×4 m         | 5.72×5.72° / 2.29×2.29°            | 32.5×32.5 / 13.0×13.0         |
| Axial Inferno 3×5 m          | 4.30×7.15° / 1.72×2.86°            | 24.3×40.6 / 9.7×16.2          |

These planar estimates have no terrain, tilt, occlusion or viewport clipping.
They do not replace the actual solid coverage above. In particular, terrain
following makes the full High pillow mesh **36×36.082×30.721 m** in local
x/y/z bounds, despite its nominal 5 m relief. Hunga's full bounds are
**90×80.715×82.148 m**. Both include buried/sloping surfaces. Axial's mound
uses tallest stack height **1.5×3.6 = 5.4 m** before terrain offsets; treating
the authored 3.6 m as the complete rendered subject height is incorrect.

## Evidence and validation

- `PERF_BUDGET_STATIC=1 npx vitest run tests/unit/perf-budget.test.ts tests/unit/terrainMerge1140.test.ts --configLoader runner --cache=false -t 'great-blue-hole|Blue Hole transparent shaft'`:
  **7 passed / 37 unrelated skipped**, no snapshot writes.
- `npx vitest run tests/unit/props-geo.test.ts tests/unit/scarpTerrain.test.ts --configLoader runner --cache=false -t 'authored prop geometry golden|tuff'`:
  **18 passed / 81 unrelated skipped**, no snapshot writes.
- Temporary audit: all 12 site/tier prop constructions succeeded with zero
  failed/skipped props. The 36 solid-coverage views have **720 independent
  Three.js ray checks**, all agreeing with their frontmost subject labels;
  maximum NDC depth disagreement **7.95×10⁻¹⁴**. Exact optical ranges and finite
  material means were asserted. These checks validate geometry coverage, not
  GPU shading or subpixel rasterization rules.
- Local, ignored evidence: `.cache/4620/{audit.ts,project.ts,safety.ts,run.mjs,
numerics.json,provenance.json,audit.log,safety.log,bluehole-tests.log,
material-tests.log}`; existing `.cache/perf-budget/` diagnostics were also
  regenerated. Reproduce with `AUDIT_PROJECTIONS=1 node .cache/4620/run.mjs`,
  then `AUDIT_MODULE=/.cache/4620/safety.ts node .cache/4620/run.mjs`.
  `numerics-rejected-fixed-height.json` is explicitly rejected preliminary
  evidence and is not the source of the accepted size table.
- Source SHA-256: `stalactites.ts`
  **`64cac6cb229e1e86ab555baba8529d49b19af214c804ac8044adce6ba4b04ded`**
  (identical to 4570), `scarp.ts`
  **`035baa807dd18889c1eff18abc09d34f1b1550a9a98a9575df90ef5aecf69030`**,
  `pillow.ts`
  **`a4a809e6b443a43f2f365ec710f12f2ce5f510c57d668d105a4b1be31e35045e`**.
  The numeric JSON includes hashes of all four sites' props/site/mission
  manifests, tile metadata and heightmaps, plus the relevant material sources;
  provenance binds that file and the audit scripts to the full HEAD above.
- No browser, new image capture or visual acceptance. Historical screenshot
  paths in the art notes are context only; no image/manifest/SHA bundle was
  supplied here and those images were not accepted as numeric evidence.
  Full build, full unit/Python suites and e2e were not rerun for this report-only
  audit. The focused capabilities above are the verification performed.

For the next visual package: retain the seven-draw Blue Hole pin; compare
emission separately from albedo; judge Hunga at an unclipped approach distance;
judge Kama with the camera terrain clamp in effect; and distinguish Axial's
small individual scan target from its wider scenic field. No art adjustment is
prescribed or applied by this numeric pass.
