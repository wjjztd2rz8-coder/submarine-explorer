# 4670 — S-verify: Kama and Hunga opening numerics

Supports **V-kama-opening / V-hunga-opening** in [DIRECTOR](../DIRECTOR.md).
Audited checkout: `c9fca0faefdd8f88b2b8c5c61c3c69dab1039eef`, 2026-10-27.
Tracked changes are this report and the formatting-only gate fix documented
below. No site data, art, runtime code, permanent tests or screenshots changed.

**Proposed openings:** Kama **110 m to Hiolo North, heading 355°, with a raised
35 m chase arm**; Hunga **120 m to the rim-slope POI, heading 90°, standard chase
camera**. Both exceed 10% visible subject height at desktop, portrait phone and
landscape phone sizes on Low/Medium/High, and both start outside the actual
Arcade scan radius. Kama needs the camera change as well as the shorter range.

## Definitions and calculation

`R` below is the mission's **3D submarine-origin → first scan POI distance**,
matching `opening.mission.rangeM` and the Scanner. It is not camera distance,
distance to a prop's edge, or depth below sea level. World metres are x east,
y up (negative underwater), z south; headings are clockwise from north.

Loaded each site's shipped `meta.json` and float `heightmap.bin`, constructed
runtime `Terrain` and `Props` at each tier, and used `composedMissionSpawn`,
`spawnSettings`, `requiredHull`, `resolveEffective` and `CameraRig`. These are
stationary, pitch-zero, near-site Arcade mission starts after props load;
free-dive and surface starts are different. Hypothetical ranges were changed
only in the scratch process's derived `MISSION_APPROACH_M` map, then restored.

The camera uses **62° vertical FOV** in landscape, **104.877°** at 390×844:

```text
tan(verticalFov / 2) = tan(31°) / min(1, width / height)
default eye offset = (0, 38, 90) in the boat's right/up/back frame
default aim offset = (0, 15, -80)
```

For an eye-space point `(x,y,z)`, with forward depth `d = -z`, angular bounds
use extrema of `atan(x/d)` and `atan(y/d)`. Projected height fraction is
`(max(y/d) - min(y/d)) / (2*tan(verticalFov/2))`; dividing degrees by the FOV
is not the perspective projection. For a centred, flat extent `S` at eye
distance `D`, the familiar special case is `2*atan(S/(2*D))`.

Actual measurements below rasterize solid triangles, with terrain, other
props and the visible fitted hull in the depth buffer. Instance transforms,
material sides, draw ranges, near/far clipping, runtime LOD and the landscape
phone's horizontal view shift are included. Height is the vertical span of
frontmost subject pixels, **not percent frame area**. Angular spans use those
pixel boundaries, so viewport sampling causes small differences between sizes.
Transparent shimmer, particles, lighting, textures and HUD are excluded.

## Sizes at 80, 100 and 130 m

The authored pillow footprint is **36×30 m**, nominal heap relief **5 m**,
scale 1, heading 0°. It drapes over a steep slope and the builder thickens the
heap; its Low solid world bounds span **36×34.869×30 m** in x/y/z. Treating it
as an upright 5 m rectangle misses that terrain contribution. Hunga's subject
is the scenic **`caldera-tuff-wall`**, authored `[90,30,45]` m, scale 1,
heading 270°, with apron/rubble; Low solid bounds span **82.112×82.550×90 m**.
This is the rim-slope scarp prop, not the entire caldera basin.

These are **default chase camera** measurements. Each range reruns the current
safe spawn search; Kama's selected heading is 355° at 80/100 m and 332.5° at
130 m. Hunga faces east. Eye distance is to the solid world-bounds centre.
All rows here use Low; the proposed openings are checked across all tiers below.

| Subject                       | R (m) | Eye → subject centre (m) | Desktop visible angular width × height | Desktop height (%) | Portrait height (%) | Landscape phone height (%) |
| ----------------------------- | ----: | -----------------------: | -------------------------------------: | -----------------: | ------------------: | -------------------------: |
| Kama pillows                  |    80 |                  160.719 |                      12.672° × 11.027° |             16.556 |               7.583 |                     16.667 |
| Kama pillows                  |   100 |                  180.143 |                       11.196° × 9.662° |             14.333 |               6.635 |                     14.359 |
| Kama pillows, current opening |   130 |                  200.106 |                        9.841° × 7.857° |             11.556 |               5.213 |                     11.538 |
| Hunga rim, diagnostic only¹   |    80 |                  186.812 |                      27.313° × 23.494° |             35.000 |              16.114 |                     34.872 |
| Hunga rim                     |   100 |                  206.841 |                      24.334° × 20.902° |             30.889 |              14.218 |                     30.769 |
| Hunga rim                     |   130 |                  236.711 |                      21.027° × 17.941° |             26.333 |              12.085 |                     26.154 |
| Hunga rim, current opening    |   160 |                  266.525 |                      18.428° × 15.726° |             23.000 |              10.545 |                     22.821 |

¹ The composed spawn search returns **null at Hunga R=80**. This diagnostic
continues its west-side bearing at `POI.y + 22`, with horizontal distance
`sqrt(80²−22²)`; it is not an accepted spawn/approach. At either site, 80 m is
inside the scan floor, and 100 m is its inclusive boundary: neither qualifies
as an opening outside scan range.

For comparison, if “80/100/130 m” means **eye distance directly to a centred
flat nominal subject**, the authored width/relief alone gives:

| Nominal subject, no slope or apron |            D=80 m |           D=100 m |           D=130 m |
| ---------------------------------- | ----------------: | ----------------: | ----------------: |
| Kama, 36 m width × 5 m relief      |  25.361° × 3.580° |  20.408° × 2.864° |  15.766° × 2.203° |
| Hunga, 90 m length × 45 m relief   | 58.716° × 31.417° | 48.455° × 25.361° | 38.187° × 19.639° |

These nominal angles are not predictions of the loaded opening. A 5 m flat
relief alone would need `D ≤ 41.607 m` in landscape or `D ≤ 19.226 m` in
390×844 portrait to span 10% height. The actual pillow field's sloping footprint
is what makes a scan-safe geometric solution possible.

## Proposed poses

Kama: **R=110 m**, horizontal POI range **107.778 m**, yaw **−0.087266463 rad
(355°)**. Set the spawn elevation to the tier's first POI elevation **+22 m**.
Latitude/longitude are **18.9114855064, −155.2677208001**.

Use `chaseRadius=35`, `chaseOffsetX=0`, **`chaseOffsetY=100`**. The latter is
an addition to the configured y=38, before the arm is normalized: the effective
local eye offset is **(0, 29.316371, 19.119372) m**, not a 100 m vertical rise.
Keep the default aim offset `(0,15,-80)` and FOV. At Low the eye is
**(−129.052931, −1253.667948, 599.673670)** and the aim point is
**(−137.691754, −1267.984319, 500.931477)**. The eye is **120.847 m** from the
field's bounds centre; the submarine is **95.535 m** from that centre, while
the actual scan target remains **110 m** away.

Hunga: **R=120 m**, horizontal POI range **117.966 m**, yaw **1.570796327 rad
(90°)**. Spawn elevation is likewise **POI.y +22 m**. Latitude/longitude are
**−20.5700000000, −175.4211317152**. Keep the standard `(0,38,90)` chase arm,
aim and FOV. At Low the eye is **(−2290.152446, −411.114960, 2270.771487)**,
aim **(−2120.152446, −434.114960, 2270.771487)**, and eye-to-subject-centre
distance **226.766 m**.

| Subject / tier |    Sub x (m) |    Sub y (m) |   Sub z (m) | Desktop height (%) | Portrait height (%) | Landscape phone height (%) |
| -------------- | -----------: | -----------: | ----------: | -----------------: | ------------------: | -------------------------: |
| Kama Low       |  −130.719294 | −1282.984319 |  580.627053 |             23.000 |              10.664 |                     23.077 |
| Kama Medium    |  −130.719294 | −1281.598572 |  580.627053 |             23.444 |              10.782 |                     23.333 |
| Kama High      |  −130.719294 | −1281.692130 |  580.627053 |             24.111 |              11.137 |                     24.103 |
| Hunga Low      | −2200.152446 |  −449.114960 | 2270.771487 |             27.667 |              12.796 |                     27.692 |
| Hunga Medium   | −2200.152446 |  −449.136018 | 2270.771487 |             27.556 |              12.796 |                     27.692 |
| Hunga High     | −2200.152446 |  −449.157880 | 2270.771487 |             27.444 |              12.678 |                     27.436 |

Desktop visible angular spans at these poses are **17.100–17.594° wide ×
15.128–15.835° high** for Kama, **21.986° wide ×18.665–18.816° high** for
Hunga. Sizes tested: **1600×900, 390×844, 844×390**.

At Kama, retaining the default arm at the currently selected 80–130 m poses
does not reach 10% portrait height. Even shortening the arm to 35 m with its
default direction at R=110 gives only **9.360%** on Low; raising it supplies
the missing projection. The selected pose has **11/29/21 visible iron-mat
pixels** on Low/Medium/High portrait, versus **4** at the current Low opening.
The field-height criterion passes; perceived accent brightness is still a
visual-review question. Hunga already exceeds 10% height at 160 m; shortening
to 120 m increases its Low portrait solid coverage from **5,822 to 8,469 pixels**
and reduces viewing distance without a material change.

**Implementation boundary:** Hunga's proposal is supported by a mission range
edit alone. Kama's mission path currently returns only x/y/z/yaw; its schema
does not accept mission chase controls. The follow-up must carry the proposed
camera fields through the mission pose path using per-site data. Editing
`opening.freeDive` or `opening.reframe` camera fields alone will not apply this
camera to a mission. No such implementation is made here.

## Scan and clearance verification

The mission cap and default equipment give
`baseRadius=min(authoredRadius,(R−60)/2)` and
`ArcadeRadius=max(baseRadius×2.4,100)`. Therefore Kama's proposed radius is
**100 m** (base 25 m), Hunga's **100 m** (base 30 m), leaving **10 / 20 m** of
approach. Realistic's corresponding radii are **30 / 36 m**, with no floor.
Hunga's current 160 m opening instead has a **120 m Arcade radius**; retaining
that old radius when evaluating the new pose would be incorrect.

An aimed, held runtime Scanner cannot start either primary at the proposed
spawn. Second-primary spawn distances remain **182.135–182.152 m** at Kama and
**788.338–788.445 m** at Hunga, also outside their 100 m radii.

| Check, all tiers                                     | Kama proposal | Hunga proposal |
| ---------------------------------------------------- | ------------: | -------------: |
| Minimum visible hull vertex above runtime bed (m)    |        45.081 |         29.362 |
| Minimum camera vertical bed gap (m)                  |        91.465 |         81.574 |
| Prop keepout collision at spawn, hull radius +4 m    |          None |           None |
| Camera-arm prop collisions, 24 samples at radius 6 m |          None |           None |
| Controlled pilot enters scan radius (s)              |         2.200 |          3.217 |
| Controlled pilot completes scan (s)                  |         7.200 |          6.217 |
| Pilot minimum submarine-origin bed gap (m)           |        31.953 |         23.235 |
| Pilot prop-contact frames / hull breaches            |         0 / 0 |          0 / 0 |

The pilots use actual `Submarine.step`, `PropContact` and `Scanner` at 60 Hz,
sim speed 1, steering/pitching toward the first POI while holding SCAN. These
are controlled approach timings, not predictions of unaided player behavior.

## Evidence and limits

Scratch measurement command:

```sh
node_modules/.bin/vitest run --config .cache/4670.config.ts \
  --configLoader runner --cache=false
```

**6/6 tier/site audits passed**, 46.65 s. Scratch script/results/log:
`.cache/4670.audit.test.ts`, `.cache/4670-results.json`, `.cache/4670-audit.log`.
Independent Three.js rays agreed on **2,850** sampled subject pixels across
the distance/camera experiments; maximum NDC depth error **5.33×10⁻¹⁵**.
`.cache/4670-inputs.sha256` records each site's site/props/POIs/mission and
tile metadata/heightmap; the manifest's SHA-256 is
`95f87e87191ca0987de8d7095e2391b05f075d2d604c54a8c0ff55986c64b87f`.

This establishes geometric framing, scan exclusion and a controlled safe first
approach. It does not establish rendered brightness, beauty, HUD clearance or
acceptance at untested aspect ratios. No local browser/render run was performed.
Visual acceptance stays with the Sonnet lane.

## External gate follow-up

The orchestrator ran `tools/gates.sh` outside the sandbox (smoke + project-base
e2e). **Python, content, build, unit, e2e, e2e-base and attribution passed**.
The sole failure was repository Prettier: `plan/progress/P2-globe-bright.md`
lacked a blank line before its bullet list. Evidence:
`.cache/runs/20261027-091125-3310535-IzHCNI/prettier.log`.

Ran `prettier --write` on that file; the diff adds only the missing blank line.
No assertions, checks or application behavior changed. Post-fix repository-wide
`prettier --check .` and `git diff --check` passed. The complete gates were not
repeated after this formatting-only correction; the external results above
remain the functional validation evidence.
