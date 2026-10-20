# P2-hull-a-geometry — headless clearance acceptance

Item: **P2-hull-a** (numeric side, brief 2710 / item 12c). Audited `a814d10` on
`codex/2710-P2-hull-a-geometry`, 2026-10-18. **Acceptance remains red for Claude.**
Class A clips both pontoons and its fin; Class C's vertical thruster hardware
intersects its solid crown. Class B clears all checked parts on every tier.

## Scope and ownership recheck

Read `plan/DIRECTOR.md`, the phone-feedback ownership table, the launched
`2710-P2-hull-a-geometry.md`, neighbouring launched briefs through 2720, and
`git worktree list` before editing. Main and this worktree were clean at
`a814d10`; no other listed worktree owned hull placement or vehicle tests.
Earlier `1290-f-verify-hull-lostcity` covers terrain/camera clearance, not these
inter-part contacts. No completed equivalent test was found.

Extended the existing `tests/unit/vehicles.test.ts` capability spec, with a
headless test helper in `tests/unit/helpers/vehicleClearance.ts`. There is no
separate sub-geometry spec in this checkout. No production files or positions
changed. No settings, guidance surface, site branch, layout patch or runtime
machinery added. No rendering, screenshots, merge, push, tag, `tools/` change or
`plan/DIRECTOR.md` edit. Geometry and visual placement decisions stay with Claude.

## Geometry path and method

- `src/sub/SubMesh.ts`: calls `buildVehicle(hullClass, tier)` and supplies the
  additional `length / 26` scale (default SubMesh length 24).
- `src/vehicles/index.ts`: `lodForTier`, `LOW_DETAIL`, `VEHICLE_SCALE` and
  `buildVehicle`; Low uses detail factor 0.5, Medium/High use identical full
  geometry. `GRAPHICS_TIERS` is Low/Medium/High; Auto resolves to one of these.
- `src/vehicles/hulls.ts`: `classA`, `classB`, `classC` and `blueprintFor` build
  the actual hulls and place their five thrusters. Class A's fin is the fourth
  foam part, not a separate physics collider.
- `src/vehicles/parts.ts`: `thruster` builds nozzle, optional band, motor,
  stators, intake guards and saddle, then returns the displaced `PropSpec`.
  `propellerGeometry` supplies the actual shared blade/hub mesh.
- `src/vehicles/Vehicle.ts`: merges static parts, adds arms/camera/strobe and
  instances the rotating props using `PropSpec.pos`, axis and radius.

The helper observes real builder calls before merging. It copies geometry and
applies the same transforms; Low's actual tessellation and baked arms/camera
are included. Distances use triangle/triangle minima, including edge crossings,
coplanar contacts and closed-solid containment, rather than bounding-box overlap.
Open paint bands/hoops have no inferred solid interior. A box/triangle fixture
checks a positive gap despite overlapping bounds, plus crossings and enclosure.

For continuous rotation the prop probe is a **conservative cylinder** derived
from the actual prop mesh's maximum radial extent and axial minimum/maximum,
scaled/oriented exactly as the instances. Its 128-sided cross-section is
circumscribed; radial inflation is under 0.031% (under 0.00008 vehicle m here).
The cylinder also fills the radial/axial gaps between pitched blades and hub;
prop distances are conservative lower bounds, not exact swept-surface distances.
Every reported failing assembly also has actual static thruster triangles
intersecting the hull/fin, so the red acceptance does not rely on that envelope
alone. No render phase sampling is used.

Own saddle/hull and saddle/nozzle joins, and own internal motor/hub contacts,
are intentional assembly contacts and excluded. Other thrusters and their
saddles remain obstacles. This is an assembled-pose check; deployed arm motion,
particle wash, lens halos and browser-only decal planes are not clearance solids.

All distances below are **vehicle metres** in the hull-local frame: +X starboard,
+Y up, +Z aft. To obtain world metres multiply by A=3.7, B=3.3, C=3.45, then by
SubMesh's `length / 26` when applicable. Overlap/enclosure is recorded as zero;
zero is not a signed penetration depth. Contact tolerance is 1e-7 vehicle m.

## Actual placements

Centres below are the thruster builder's inputs. Prop hub centres differ by
`-0.075 * inputRadius * axis`; the prop scale is `0.98 * inputRadius`.
These values are identical across all three tiers.

| Hull | Index/channel   | Thruster centre (x, y, z) | Axis       | Input radius | Prop hub centre         |
| ---- | --------------- | ------------------------- | ---------- | -----------: | ----------------------- |
| A    | 0 port          | (-1.2, 0.12, 2.42)        | (0, 0, 1)  |          0.2 | (-1.2, 0.12, 2.405)     |
| A    | 1 starboard     | (1.2, 0.12, 2.42)         | (0, 0, 1)  |          0.2 | (1.2, 0.12, 2.405)      |
| A    | 2 vertical      | (-1.78, 0.2, -0.62)       | (0, -1, 0) |          0.2 | (-1.78, 0.215, -0.62)   |
| A    | 3 vertical      | (1.78, 0.2, -0.62)        | (0, -1, 0) |          0.2 | (1.78, 0.215, -0.62)    |
| A    | 4 lateral       | (0, 0.95, 1.2)            | (1, 0, 0)  |         0.15 | (-0.01125, 0.95, 1.2)   |
| B    | 0 port          | (-0.98, 0.18, 3.28)       | (0, 0, 1)  |         0.24 | (-0.98, 0.18, 3.262)    |
| B    | 1 starboard     | (0.98, 0.18, 3.28)        | (0, 0, 1)  |         0.24 | (0.98, 0.18, 3.262)     |
| B    | 2 vertical      | (-1.62, 0.32, 0.35)       | (0, -1, 0) |         0.26 | (-1.62, 0.3395, 0.35)   |
| B    | 3 vertical      | (1.62, 0.32, 0.35)        | (0, -1, 0) |         0.26 | (1.62, 0.3395, 0.35)    |
| B    | 4 lateral       | (0, -0.62, 3.05)          | (1, 0, 0)  |         0.19 | (-0.01425, -0.62, 3.05) |
| C    | 0 port          | (-0.95, 1, 2.75)          | (0, 0, 1)  |         0.22 | (-0.95, 1, 2.7335)      |
| C    | 1 starboard     | (0.95, 1, 2.75)           | (0, 0, 1)  |         0.22 | (0.95, 1, 2.7335)       |
| C    | 2 vertical-fore | (0, 2.32, -0.95)          | (0, -1, 0) |         0.24 | (0, 2.338, -0.95)       |
| C    | 3 vertical-aft  | (0, 2.32, 1.35)           | (0, -1, 0) |         0.24 | (0, 2.338, 1.35)        |
| C    | 4 lateral       | (0, -0.55, 2.55)          | (1, 0, 0)  |         0.18 | (-0.0135, -0.55, 2.55)  |

## Clearance census: every assembly and tier

Hull/fin includes foam and acrylic; Parts includes frame, hardware, neighbouring
thrusters/props and their saddles. Thruster is the minimum over all its actual
non-saddle component meshes. Medium and High were built and checked separately;
their results agree, so they share a table row. Values rounded to six decimals.

| Hull | Tier        | Index/channel   | Prop → hull/fin | Prop → parts | Thruster → hull/fin | Thruster → parts |
| ---- | ----------- | --------------- | --------------: | -----------: | ------------------: | ---------------: |
| A    | Low         | 0 port          |        0.229720 |     0.855603 |            0.165000 |         0.769845 |
| A    | Low         | 1 starboard     |        0.229720 |     0.855603 |            0.165000 |         0.769845 |
| A    | Low         | 2 vertical      |        0.000000 |     0.581809 |            0.000000 |         0.504638 |
| A    | Low         | 3 vertical      |        0.000000 |     0.581809 |            0.000000 |         0.504638 |
| A    | Low         | 4 lateral       |        0.000000 |     0.000000 |            0.000000 |         0.000000 |
| A    | Medium/High | 0 port          |        0.229720 |     0.855603 |            0.165000 |         0.769845 |
| A    | Medium/High | 1 starboard     |        0.229720 |     0.855603 |            0.165000 |         0.769845 |
| A    | Medium/High | 2 vertical      |        0.000000 |     0.578749 |            0.000000 |         0.496731 |
| A    | Medium/High | 3 vertical      |        0.000000 |     0.578749 |            0.000000 |         0.496731 |
| A    | Medium/High | 4 lateral       |        0.000000 |     0.000000 |            0.000000 |         0.000000 |
| B    | Low         | 0 port          |        0.177416 |     0.699802 |            0.092362 |         0.596673 |
| B    | Low         | 1 starboard     |        0.177416 |     0.660552 |            0.092227 |         0.587301 |
| B    | Low         | 2 vertical      |        0.110170 |     0.187747 |            0.039817 |         0.083798 |
| B    | Low         | 3 vertical      |        0.110170 |     0.187747 |            0.039817 |         0.083798 |
| B    | Low         | 4 lateral       |        0.365701 |     0.247466 |            0.312583 |         0.167170 |
| B    | Medium/High | 0 port          |        0.173694 |     0.699802 |            0.082311 |         0.596673 |
| B    | Medium/High | 1 starboard     |        0.173667 |     0.660552 |            0.082310 |         0.587301 |
| B    | Medium/High | 2 vertical      |        0.110083 |     0.191821 |            0.031008 |         0.083798 |
| B    | Medium/High | 3 vertical      |        0.110083 |     0.191821 |            0.031009 |         0.083798 |
| B    | Medium/High | 4 lateral       |        0.364901 |     0.247466 |            0.309430 |         0.165227 |
| C    | Low         | 0 port          |        0.098580 |     1.241497 |            0.037605 |         1.161730 |
| C    | Low         | 1 starboard     |        0.098580 |     1.241497 |            0.037605 |         1.161730 |
| C    | Low         | 2 vertical-fore |        0.068094 |     0.169913 |            0.000000 |         0.109329 |
| C    | Low         | 3 vertical-aft  |        0.068096 |     0.169913 |            0.000000 |         0.109329 |
| C    | Low         | 4 lateral       |        0.057020 |     0.894958 |            0.005858 |         0.836035 |
| C    | Medium/High | 0 port          |        0.098580 |     1.241497 |            0.030600 |         1.158771 |
| C    | Medium/High | 1 starboard     |        0.098580 |     1.241497 |            0.030600 |         1.158771 |
| C    | Medium/High | 2 vertical-fore |        0.068022 |     0.169913 |            0.000000 |         0.109329 |
| C    | Medium/High | 3 vertical-aft  |        0.068024 |     0.169913 |            0.000000 |         0.109329 |
| C    | Medium/High | 4 lateral       |        0.057020 |     0.891140 |            0.005858 |         0.830470 |

No cross-thruster contact was found. Class B's smallest overall clearance is
0.031008 m (full-detail port vertical nozzle to fairing). Class C's lateral
nozzle narrowly clears the lower housing bay by 0.005858 m on every tier.
Class C's aft thrusters also clear their fins: nozzle/band gap 0.037605 m Low,
0.030600 m Medium/High.

## Offenders and directional offsets

- **A / 2 and 3:** prop envelopes, nozzle, colour band and intake guard(s)
  contact their respective pontoon (`foam[0]` / `foam[1]`). At full detail the
  pontoon bounds are x ±[0.792307, 1.607693], y [-0.348787, 0.606732],
  z [-1.950000, 2.140000].
- **A / 4:** prop envelope/nozzle and stators contact the aft deck (`foam[2]`)
  and fin (`foam[3]`); the motor also contacts the fin. The assembly also
  intersects the lifting-bail hoop/base (`frame[160]`, `frame[161]`). Fin bounds:
  x [-0.045000, 0.045000], y [0.734399, 1.240536], z [0.874592, 1.973593].
  Thruster centre (0, 0.95, 1.2), prop hub (-0.01125, 0.95, 1.2), explains the
  owner's propeller-inside-stabiliser observation independently of the camera.
- **C / 2 and 3:** nozzle/motor and some stators intersect the solid upper hull
  (`foam[0]`). The prop envelopes themselves clear it by about 0.068 m.
  The decorative open well collars do not cut holes in the actual hull mesh.

For each row below, translate the entire non-saddle assembly along the stated
axis, holding every other part fixed. Search forward in 0.01 m increments for
the first clear bracket, then bisect 18 times (bracket width <4e-8 m). The
boundary minus 1e-6 m was checked colliding and plus 1e-6 m checked clear against
**all** obstacles, not only the original offending part. The final column rounds
up to a usable strictly clear offset. These are directional exit thresholds for
the present meshes, not a globally shortest 3D translation or a recommendation
for the visual solution. Very narrow intermediate free intervals below the
0.01 m bracketing step are not claimed to have been exhaustively searched.

| Hull/index | Tier        | Direction  | Exit boundary (m) | Strictly clear offset (m) |
| ---------- | ----------- | ---------- | ----------------: | ------------------------: |
| A/2        | Low         | (-1, 0, 0) |        0.06717625 |                   0.06718 |
| A/3        | Low         | (1, 0, 0)  |        0.06717915 |                   0.06718 |
| A/4        | Low         | (0, 1, 0)  |        0.45395981 |                   0.45396 |
| A/2        | Medium/High | (-1, 0, 0) |        0.07549194 |                   0.07550 |
| A/3        | Medium/High | (1, 0, 0)  |        0.07549194 |                   0.07550 |
| A/4        | Medium/High | (0, 1, 0)  |        0.45411530 |                   0.45412 |
| C/2        | Low         | (0, 1, 0)  |        0.09596031 |                   0.09597 |
| C/3        | Low         | (0, 1, 0)  |        0.09471535 |                   0.09472 |
| C/2        | Medium/High | (0, 1, 0)  |        0.09667606 |                   0.09668 |
| C/3        | Medium/High | (0, 1, 0)  |        0.09681564 |                   0.09682 |

A common offset sufficient for both LODs is ±0.07550 m outward for A/2 and A/3,
+0.45412 m up for A/4, +0.09668 m up for C/2 and +0.09682 m up for C/3.
These are evidence only. Moving the lateral unit off its fin/bail or the Class C
units off their wells changes how they are mounted; Claude should choose the
positions, supports or real openings and rerun the acceptance. No offset applied.

## Exact checks and disposition

Pending final check outcomes.
