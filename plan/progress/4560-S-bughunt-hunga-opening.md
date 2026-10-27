# 4560 — S-bughunt: Hunga Tonga mission opening

Supports **V-eight-sites-lit**, following [DIRECTOR](../DIRECTOR.md) and
[4500](4500-S-bughunt-eight-sites.md). Audited checkout:
`3e478036da49d53f083aa931954227a7dc107731`, 2026-10-26. Only this progress
note is a tracked change. No production, content, permanent tests or screenshots
were changed.

**Finding:** Hunga's opening subject is visible, the camera clears the bed, and
the first scan is reachable. The portrait geometry reproduces 4500 exactly.
The scene receives substantial ambient illumination on every tier, but the
tuff's effective mean albedo is only about **0.013**, with **zero emissive
lift**. These inputs support a dark-material/contrast concern; they do not
establish a rendered mean pixel luminance or visual acceptance. Prioritize a
subject-only material lift in the later visual package. Landscape phone
coverage is smaller than portrait coverage and needs its own visual check.

**Method and opening pose.** Fresh-save, near-site mission opening after props
load; default Arcade equipment, no Daily modifier, pitch zero, stationary chase
camera. This is neither the free-dive nor surface-start pose. Used the shipped
GMRT float heightmap, runtime terrain detail/LOD, actual procedural geometry,
instance transforms, `DeepOpeningSpawn.composedMissionSpawn`, `spawnSettings`,
`requiredHull`, `resolveEffective` and `CameraRig`. The runtime fitted hull is
**A** for the 469 m briefing, although `mission.json.hull_class` says B.

World metres: x east, y elevation, z south. Sub x/z are
**−2240.667 / 2270.771**, heading **90°**; y is
**−449.115 / −449.136 / −449.158** on Low/Medium/High. Camera x/z are
**−2330.667 / 2270.771**; camera y is
**−411.115 / −411.136 / −411.158**. Default chase arm is `(0,38,90)`, vertical
FOV 62°. The first POI is at x/z **−2082.186 / 2270.771**, runtime bed y
**−471.115 / −471.136 / −471.158**. These are detailed runtime heights, not
the raw survey reading quoted in the content notes. The wall's bounds centre
is distinct from its POI: camera-to-centre distance is **266.525 m** on Low.

| Opening measurement                        |       Low |    Medium |      High |
| ------------------------------------------ | --------: | --------: | --------: |
| Camera → bed, vertical gap (m)             |    83.603 |    82.738 |    82.370 |
| Minimum visible hull vertex → bed gap (m)  |    35.437 |    34.869 |    34.558 |
| Centre ray: first solid hit                | Tuff wall | Tuff wall | Tuff wall |
| Centre-ray first-hit distance (m)          |   250.642 |   250.997 |   250.260 |
| Wall solid pixels, portrait 390×844        |     5,822 |     5,853 |     5,870 |
| Wall fraction of portrait frame (%)        |    1.7687 |    1.7782 |    1.7833 |
| Wall solid pixels, desktop 1600×900        |     6,626 |     6,649 |     6,669 |
| Wall fraction of desktop frame (%)         |    0.4601 |    0.4617 |    0.4631 |
| Wall solid pixels, phone landscape 844×390 |     1,244 |     1,250 |     1,249 |
| Wall fraction of landscape frame (%)       |    0.3779 |    0.3798 |    0.3795 |

All cameras exceed the configured **6 m** vertical bed clearance. Portrait
wall pixels are identical before and after including the actual visible hull:
the sub does not hide the opening wall. Low's full solid-vertex envelope is
**122.32×104.59 px**, angular extent **21.345×18.053°**; the envelope includes
buried geometry and is not the visible area. The 0.4% portrait criterion is
1,317 pixels; Hunga exceeds it by 4.42–4.46×. Landscape is 67–73 pixels short
of that percentage, if it is also imposed on landscape. This audit does not
extend the portrait acceptance rule automatically.

Visibility uses a pixel-centre triangle depth buffer with all six frustum
planes, material face sides/groups/draw ranges, actual terrain, solid props
and the player hull. Transparent seep shimmer, particles, lamps, shader
colour and HUD are excluded. Independent Three.js rays checked **713** wall
pixels across the nine opening frames: all frontmost labels agreed, maximum
NDC depth difference **1.34×10⁻¹⁵**. Thus these are solid geometric coverage
measurements, not screenshots or brightness estimates.

**Scan reachability.** The mission cap applies to primary objectives before
equipment scaling and the mode floor:
`cap = min(authored radius, (160 − 60)/2) = min(authored radius, 50)`;
`R = max(cap × sensor multiplier, mode floor)`.
Multipliers are **2.4 Arcade / 1.2 Realistic**, floors **100 / 0 m**.

| Objective              | Spawn distance, all tiers (m) | Authored radius (m) | Capped base (m) | Effective Arcade / Realistic radius (m) |
| ---------------------- | ----------------------------: | ------------------: | --------------: | --------------------------------------: |
| Primary rim wall       |                       160.000 |                 250 |              50 |                                120 / 60 |
| Primary flank transect |               826.489–826.590 |                 120 |              50 |                                120 / 60 |
| Optional caldera floor |           3,483.686–3,483.690 |                 250 |    Uncapped 250 |                               600 / 300 |

No objective starts in scan range. An explicitly aimed, held runtime Scanner
also rejects the first objective at spawn. Its approach margin is **40 m
Arcade / 100 m Realistic**; the nominal cap allowance of 60 m is not the final
Arcade margin. The beam scans the POI, not the nearest tuff surface, and has
no mesh-occlusion gate.

The controlled first-objective pilot uses actual `Submarine.step`,
`PropContact.resolve` and `Scanner.update` at **60 Hz**, sim speed 1, holding
SCAN and steering toward the POI. No teleport after opening placement, no
currents/events injected. Camera follows the moving boat with runtime
speed look-ahead. Times are this controlled pilot's elapsed seconds, not an
unaided player prediction or a surface-start Realistic journey.

| Mode / measurement                                   |    Low | Medium |   High |
| ---------------------------------------------------- | -----: | -----: | -----: |
| Arcade first enters 120 m radius (s)                 |  4.817 |  4.817 |  4.817 |
| Arcade scan completes, including 3 s beam (s)        |  7.817 |  7.817 |  7.817 |
| Arcade minimum sub-centre bed gap, every tick (m)    | 26.601 | 25.330 | 25.576 |
| Arcade minimum camera bed gap, every tick (m)        | 75.545 | 75.066 | 74.629 |
| Realistic first enters 60 m radius (s)               | 83.683 | 83.683 | 83.683 |
| Realistic scan completes, including 3 s beam (s)     | 86.683 | 86.683 | 86.683 |
| Realistic minimum sub-centre bed gap, every tick (m) | 25.848 | 24.363 | 24.319 |
| Realistic minimum camera bed gap, every tick (m)     | 74.657 | 74.302 | 74.193 |

All six approaches have **zero prop-contact frames and no hull breach**.
Visible hull vertices sampled once per second plus completion stay above the
bed: minimum **18.253 m Arcade / 16.890 m Realistic** across tiers. Those hull
vertex minima are sampled, unlike the every-tick camera/sub-centre minima.
The wall remains visible at scan entry and completion: portrait solid pixels
increase to **8,424–8,495 / 12,968–13,041** in Arcade, and
**16,929–17,160 / 17,943–18,197** in Realistic. Existing capability checks also
find safe scan contacts for both primaries; this is not a piloted second-leg
or optional-floor journey audit.

**Lighting and mean scene luminance inputs.** Values below are linear RGB
and relative luminance inputs, with `Y(c) = 0.2126r + 0.7152g + 0.0722b`.
Ambient is spatially uniform, so its scene-wide mean input is simply
`I × Y(colour)`. Approach means average the **469 Arcade frame samples**
through first-scan completion, one sample per physics tick. These are not a
mean of rendered framebuffer pixels, nits or lux. Light intensities of
different light types cannot be meaningfully averaged together.

All three `site.json atmosphere.tiers` rows are **depthM −200, colour
7311262 = 0x6f8f9e, intensity 9**. The colour reaches the live AmbientLight as
linear **[0.158961, 0.274677, 0.341914]**, multiplied to
**[1.430648, 2.472096, 3.077230]**. The arithmetic RGB mean of that input is
**2.326658**, and its luminance is **2.294375**, identical across tiers and
throughout both approaches. The floor remains effective below −200 m;
interpolation still changes fog, sunlight and grading between −200 and −1000 m.

| Live lighting input                      |                    Low |                 Medium |                   High |
| ---------------------------------------- | ---------------------: | ---------------------: | ---------------------: |
| Opening ambient intensity / mean Y input |           9 / 2.294375 |           9 / 2.294375 |           9 / 2.294375 |
| Opening sun intensity / Y input          |    0.049670 / 0.041225 |    0.049668 / 0.041224 |    0.049666 / 0.041222 |
| Opening fog density (m⁻¹) / fog-colour Y | 0.000751649 / 0.014066 | 0.000751659 / 0.014065 | 0.000751668 / 0.014065 |
| Approach mean ambient Y input            |               2.294375 |               2.294375 |               2.294375 |
| Approach mean sun Y input                |               0.041084 |               0.041082 |               0.041081 |
| Approach mean fog-colour Y               |               0.014029 |               0.014028 |               0.014028 |
| Approach mean fog density (m⁻¹)          |            0.000752503 |            0.000752512 |            0.000752522 |
| Opening grade gain                       |               0.944835 |               0.944834 |               0.944833 |
| Opening saturation / vignette parameters |    0.907948 / 0.420660 |    0.907946 / 0.420663 |    0.907944 / 0.420667 |
| Post processing by tier                  |                    Off |                     On |                     On |

Live `env.atmosphere` and `env.lighting` consumers were sampled, including the
actual lamp rig. Seamount adds **zero lights** on every tier: all Hunga POIs
are geology, not vents. It does not alter ambient. There is **no hemisphere**
and caustics strength is **zero** at the opening/approach depths. Arcade has
two spotlights, each **750**, reach **3,250 m**, half-angle **44°**, decay
**1.35**, penumbra **0.7**, colour **0xfff3dd**, plus point fill **50 / 220 m**.
Realistic uses **500 / 2,600 m / 40°** and fill **12 / 80 m**. These settings
are tier-independent; a long lamp cutoff does not imply constant illumination
at a distant subject.

Low uses ACES exposure equal to the band gain (about **0.945**). Medium/High
use base exposure **1** and then post gain, tint, saturation and vignette;
opening post tint is approximately linear **[0.3343, 0.6445, 0.7964]**. Thus
equal light inputs do not imply equal final brightness across tiers. Terrain's
`horizonFadeM: [250,900]` is not a tuff-material setting.

| Portrait visible tuff material input, pixel-weighted |      Low |   Medium |     High |
| ---------------------------------------------------- | -------: | -------: | -------: |
| Mean vertex-colour Y                                 | 0.187417 | 0.184128 | 0.183632 |
| Mean albedo Y after ×0.07                            | 0.013119 | 0.012889 | 0.012854 |
| Ambient-only Lambert diffuse Y proxy                 | 0.009308 | 0.009146 | 0.009122 |
| Authored emissive RGB, every solid tuff material     |  [0,0,0] |  [0,0,0] |  [0,0,0] |

The proxy is the visible-pixel mean of
`Y(9 × ambientRGB × vertexRGB × 0.07 / π)`, before headlights, sun, fog,
tone mapping or post. Wall/apron roughness is **0.95**, rubble **0.96**,
metalness zero. Node texture factories return null; browser geo detail maps
divide out their whole-texture linear mean, preserving this nominal ×0.07
scale but not guaranteeing an identical view-weighted mean. Normal/bump and
texture variation still require rendering. At the visible wall's mean camera
depth (~244 m), opening FogExp2 transmission is approximately **0.967**: the
wall is not numerically lost to a nearly opaque fog curtain. The material
inputs, rather than missing ambient propagation or burial behind the sub,
are the useful brightness lead for the visual package.

**Concrete recommendations, not applied.**

1. Retain `site.json opening.mission.rangeM: 160` and the wall's existing
   `props.json` position **lat −20.57 / lon −175.42**, dimensions
   **[90,30,45]**, heading **270°**, scale **1**, seabed snapping and
   `lod_distance_m: 900`. The subject already meets portrait coverage and has
   a safe approach. Keep its existing game-addition attribution.
2. First visual candidate: use the existing optional `glow` data in
   `src/world/props/geo/scarp.ts`'s `PRESETS.tuff`:
   `wall: [0.12, 0x8fc0c6, 0.35]`,
   `rubble: [0.12, 0x8fc0c6, 0.35]`.
   The shared scarp builder already applies those tuples through `vertexGlow`
   to wall, apron and rubble; this needs no additional light or geometry and
   no site-ID branch. An untextured, interpolated-normal evaluation of that lift gives
   approximately **0.021** extra linear Y before fog/post, versus the current
   **0.0091–0.0093** ambient-only diffuse proxy. This is a starting candidate,
   not a rendered brightness prediction or accepted artistic threshold.
   If the package instead authors `site.json props.caldera-tuff-wall.bodyGlow`,
   it must first extend the shared scarp consumer: that field currently reaches
   plain chimneys only, so adding a Hunga value alone would do nothing.
3. If visual review also finds the surrounding bed too dark, a separate
   data-only comparison is **9 → 12** for all three Hunga atmosphere tier
   intensities, retaining colour/depth. Mean ambient Y becomes **3.059166**
   (+33.3%); the tuff ambient-only proxy becomes approximately
   **0.01241 / 0.01219 / 0.01216**. This raises the hull and whole scene too;
   compare it independently from the subject lift to identify which is needed.
4. Review `hunga` golden captures at opening, scan entry and close detail,
   including 390×844 and 844×390 on Low as well as higher tiers. Landscape
   coverage is only ~0.38%, and Medium/High apply extra grading. Judge wall/bed
   separation and readable strata there before accepting either brightness
   candidate. The numbers do not justify enlarging the scenic wall or moving
   the camera to cure darkness.

**Validation and reproducibility.**

- `SPAWN_AUDIT=1 npx vitest run tests/unit/missionComposition.test.ts tests/unit/missionApproach.test.ts --configLoader runner -t hunga`:
  **8 passed, 106 unrelated cases skipped**. Existing approach, all-primary
  contact, opening-range, visible-hull and actual first-scan checks pass.
- `npx vitest run --config .cache/4560-vitest.config.mjs --configLoader runner`:
  **3 passed**, each covering one tier, three opening aspects, both mode
  approaches and live light inputs. Temporary audit scripts/results/logs are
  under ignored `.cache/4560-*`; `.cache/spawn-audit.json` retains the existing
  capability's independent output. No assertion or snapshot in the repository
  suite was changed. No browser/GPU or screenshot evidence was produced.
- SHA-256, Hunga `site.json`:
  `27b3e5d5e3e27acd9cc9bb9a6457c8c9e3a8ad8b4f9a8e45760d8ee399eb620f`;
  `props.json`:
  `2548454e11ed228056e63750853cbd7a2bddaa7aa5a55c406e0ef8d8ea4b876d`;
  `heightmap.bin`:
  `df2eb4673460cf8472633886913bc4c122e41ca6f2dbc879ef9b2c3eef5511cc`.
- Owned-note Prettier and `git diff --check` pass. No full build/e2e run was
  needed for this report-only audit; visual acceptance remains with the later
  Claude package.
