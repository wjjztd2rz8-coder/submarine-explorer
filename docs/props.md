# Props: placed wrecks, rocks and chimneys (package B4)

Source: `src/world/Props.ts` (placement, LOD, culling, collision), `src/world/PropLoader.ts`
(schema validation, GLB cache), `src/world/props/Procedural.ts` (placeholder builders),
`src/world/props/Collision.ts` (push-out maths), `src/world/props/PlacementDebug.ts`
(`?debugProps=1`), `src/world/props/Wiring.ts` (`?at=` spawn, sub collision response).
Tunables: the `props` section of `src/core/Config.ts`. Tests: `tests/unit/props-*.test.ts`,
`tests/e2e/props.spec.ts`, `tools/tests/test_validate_props.py`.

## Loading

`main.ts` fetches `/data/landmarks/<landmark>/props.json`, where `<landmark>` is `?landmark=`
or else the tile id (`landmarkIdFor` in `src/game/ContentPath.ts`). A missing file means no
props and no error. Invalid entries are logged with `console.warn` and skipped. When loading
finishes, `props:loaded { landmarkId, count, models, procedural }` is emitted (also with
count 0), and `window.__game.props` exposes `loaded`, `stats`, `placed` and `debugString()`.

## Schema (plan/PHASE-B-CONTRACTS.md §2.3)

```json
{ "version": 1, "landmark": "titanic", "props": [ { ... } ] }
```

| key                      | type                           | notes                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`                     | string, unique                 | also seeds the procedural builders, so a prop looks the same on every load                                                                                                                                                                                                                                                                                   |
| `model`                  | string                         | `procedural:hull-block` / `procedural:debris` / `procedural:chimney`, or `/assets/models/<file>.glb`                                                                                                                                                                                                                                                         |
| `lat`, `lon`             | number                         | must be inside the tile's bbox (entries outside it are skipped)                                                                                                                                                                                                                                                                                              |
| `depth_m`                | number >= 0                    | **positive** depth magnitude; world Y = `-depth_m`. A negative value is an error                                                                                                                                                                                                                                                                             |
| `snap_to_seabed`         | bool                           | sit on the terrain instead. One of `depth_m` / `snap_to_seabed` is required; if both are given, snapping wins (with a warning)                                                                                                                                                                                                                               |
| `y_offset_m`             | number                         | added to the resolved Y, e.g. `-2` to half-bury a hull                                                                                                                                                                                                                                                                                                       |
| `align_to_slope`         | bool                           | when snapping, tilt the prop to the terrain normal (rocks)                                                                                                                                                                                                                                                                                                   |
| `heading_deg`            | number                         | compass heading of the prop's local −Z: 0 = north, 90 = east (same as `Submarine.getForward`)                                                                                                                                                                                                                                                                |
| `scale`                  | number or `[x, y, z]`          | > 0; default 1                                                                                                                                                                                                                                                                                                                                               |
| `dimensions_m`           | `[length, width, height]`      | procedural only; defaults from `Config.props.defaultDimensionsM` with a warning                                                                                                                                                                                                                                                                              |
| `ends`                   | `[forward, aft]`               | hull-block only: the shape of each end, each one of `prow` / `cut` / `rounded`. Forward is the end facing `heading_deg`. Default `Config.props.hullDefaultEnds` = `["prow", "cut"]` (a bow section). A bad value is an error; on other kinds it is ignored with a warning                                                                                    |
| `material_hint`          | `basalt`/`carbonate`/`sulfide` | chimney only: rock palette. `basalt` (default when absent) is grey rock with pale orange staining; `carbonate` is white/cream calcite-brucite (Lost City); `sulfide` is near-black metal sulphide with rusty staining (black smokers). Colours in `Config.props.chimneyMaterials`. An unknown value is an error; on other kinds it is ignored with a warning |
| `feature`                | string                         | `procedural:geo` (or a `procedural:chimney` given a vent set piece): which set piece, one of `smoker-cluster`, `carbonate-tower`, `coral-mound`, `stalactite-cluster`, `pillow-field`, `tuff-cliff`, `canyon-ledge`, `hadal-scarp`. Ignored with a warning elsewhere                                                                                         |
| `lod_distance_m`         | number > 0                     | full mesh inside this camera distance; default `Config.props.defaultLodDistanceM` (900)                                                                                                                                                                                                                                                                      |
| `collision`              | `none`/`sphere`/`box`          | default by kind: hull-block and chimney use `box`, debris `none`, GLB models `sphere`                                                                                                                                                                                                                                                                        |
| `reconstruction`, `note` | bool, string                   | carried through for content and the field guide                                                                                                                                                                                                                                                                                                              |

Unknown keys are ignored but kept, so the placement tool prints them back.

**Snapping.** A snapped prop sits on the _lowest_ terrain sample under its footprint corners,
so a 140 m hull on a slope digs into the uphill side rather than floating off the downhill one.
With `align_to_slope` it sits on the centre sample and tilts instead.
Terrain-following debris, feature set pieces and carbonate chimneys with zero base diameter
already conform their aprons to the seabed; these use the centre sample without a second
footprint snap, including when replaced in the placement tool.

## Procedural kinds

All four builders are deterministic from `hashString(id)` and use `MeshStandardMaterial`, so
fog and the headlights light them like the terrain. None of them glow (art-direction §4).

- **`procedural:hull-block`**: `dimensions_m` = [length along heading, beam, height]. Every hull has a
  bilge taper toward the keel (`hullKeelFraction`), a rubbing strake down each side, and 2–4 deck
  houses and some vents amidships. Each end is shaped by `ends` (forward = local −Z, aft = +Z):
  - `prow`: a pointed entry over `hullProwLengthFraction` of the length
    (`hullProwTaperExponent`). The stem is raked, set back at the keel by `hullProwRakeFraction` × height.
    The deck sheers up toward the stem (`hullProwSheerFraction`), and a raised forecastle deck
    (`hullForecastleLengthFraction` / `…HeightFraction`) makes a step in the deck line.
  - `cut`: a ragged break (depth `hullCutDepthFraction` × length, 2–12 m). The upper decks sag toward
    it (`hullCutCollapseFraction`), deck slabs stick out at each deck level (`hullDeckSpacingM`), side
    plating peels outward and plates hang from the deck edge. The break darkens toward
    `hullCutShade` (the torn interior). Nothing reaches the nominal end, so a cut end is always
    shorter than a prow.
  - `rounded`: an elliptical counter stern (length `hullRoundedLengthFraction` × beam), undercut
    toward the keel (`hullCounterTuckFraction`).

  The Titanic bow is `["prow", "cut"]`, and the stern is `["cut", "rounded"]` (heading 190°: its torn
  end faces away from the bow and the counter stern points back at it). Everything is merged into
  one mesh (one draw call). Vertex colours are absolute colours from the art-direction §0 wreck
  palette only: rust `#7A3B22` blended toward growth `#4E5A3E` in noise patches, times a scalar
  shade (sediment-darkened foot, tonal noise, the dark break). Up-facing decks get a silt dusting.
  The generated canvas texture is a _neutral_ luminance detail map (streaks, plate seams, pits). Its
  mean is divided back out through the material colour, so it modulates brightness but never hue.
  No binary textures. The impostor is a plain box.

- **`procedural:debris`**: 20–60 plates and pipe sections of 1–6 m, scattered within
  `dimensions_m[0]` m (denser near the centre), partly sunk, each following the terrain. They are
  drawn as two `InstancedMesh`es. The impostor keeps only the 8 largest pieces.
- **`procedural:chimney`**: a knobbly tapered rock column `dimensions_m[2]` m tall, with base
  diameter `dimensions_m[0]` (or `height × chimneyRadiusFraction × 2` when that is 0) and 1–2 side
  spires. By default it is basalt `#3B3A3D`, with pale mineral staining toward the top and a little
  growth at the foot. `material_hint` swaps the rock and stain colours
  (`Config.props.chimneyMaterials`): `carbonate` is cream-grey with white tips (Lost City),
  `sulfide` near-black with rusty staining (black smokers). The shape is the same for every hint.
  The impostor is a 6-sided cone in the rock colour.

- **`procedural:geo`** (F1-GEO, `src/world/props/geo/`): hand-built geology and biology set pieces
  chosen by `feature`, with `dimensions_m` as [length, width, height] of the piece. Vertex colours
  times one neutral canvas detail texture (rock, flow, pillow, strata, sediment; no binary assets),
  instanced life (tubeworms or shrimp, coral colonies, sponges, boulders, bacterial mats) and
  compound colliders. Detail follows the quality tier (`geo/detail.ts`: instance counts, mesh
  density, branching depth, texture size, bump map). Face is local −Z; heading picks the direction.
  A feature on a `procedural:chimney` keeps the vent preset's smoke, glow and shimmer (the preset
  looks for chimney props); use that for vent pieces. Preview: `/preview/geo.html` on the dev server.
  - `smoker-cluster`: sulfide mound + 3–7 black smokers, `variant: "shrimp"` swaps tubeworms for
    shrimp swarms. Stacks 2 and 3 have their own shader-animated smoke plumes.
  - `carbonate-tower`: Lost City edifice: a tall fluted spire, a ring of lesser ones, flanges, on a
    talus skirt that sinks into the seabed downhill. dims = [width, depth, tallest height].
  - `coral-mound`: rubble mound with hundreds of instanced branching colonies and vase sponges.
  - `stalactite-cluster`: limestone wall with an overhanging ledge, fluted stalactites and sponges.
  - `pillow-field`: heap of basalt pillows with iron-oxide staining and orange iron mats.
  - `tuff-cliff` / `canyon-ledge` / `hadal-scarp`: extruded scarps (banded tuff, terraced mudstone
    with a shelf, fractured silty trench wall) with a boulder apron.
    Canyon wall sponges and corals attach to the frontmost rendered face triangles, offset
    0.12 m toward local −Z. Smoothed vertex normals alone can cross terrace edges and leave
    anchors buried in rock or floating off the wall. Only lit faces (normal Z < −0.25) qualify.
    Final offset anchors must clear the local seabed plus talus and its raised mesh lip, since either a slope
    or the rubble apron can bury part of the wall face. Colonies sample the exposed seats
    directly to retain quality-tier counts even when much of the wall is buried.
    Terrain in these tiles has 50–60 m cells, so big pieces sink a skirt below their base; use
    `y_offset_m` to lift a piece that would otherwise be buried on a slope.

## Adding a GLB

1. The licence must be CC0 (or CC-BY with attribution). Check it on the asset page itself, not in
   a search snippet.
2. Each file must be at most 2 MB. Use 1K textures and one self-contained `.glb`. Draco and
   Meshopt compression are supported: decoders are served from `/assets/decoders/draco/` and
   `three/examples/jsm/libs/meshopt_decoder.module.js`.
3. Put it in `public/assets/models/`. Bake a root transform so that 1 unit = 1 m, the base sits
   at y = 0, and the "front" faces −Z. That way `scale` in props.json reads as metres and
   snapping puts the model on the seabed.
4. Add a row to `ATTRIBUTION.md` → "3D Models" with the exact source URL, the licence and what you
   changed.
5. Run `python3 tools/validate_props.py <props.json> --tile <tile>`. It checks that the file
   exists, its size and its attribution row.

Shipped models (both Poly Haven, CC0):

- `rock_09.glb` is a dark basalt-like boulder, 1 m long, so `scale: 16` gives a 16 m boulder.
- `barrel_stove.glb` is a rusted steel drum, 1 m in diameter and 1.44 m long, lying along its
  heading. With `scale: [4.8, 4.8, 4.2]` it approximates a Scotch boiler.

No CC0 wreck or hull-section GLB was found, so `procedural:hull-block` stands in for hulls.

## LOD, impostors, culling

`Props.update(camera)` runs every frame, before rendering. For each prop it takes the distance
from the camera to the prop's bounding sphere (0 if the camera is inside it):

- `<= lod_distance_m` draws the full mesh;
- up to `max(Config.props.cullDistanceM, lod × cullLodFactor)` (2.5 km by default) draws the
  impostor. GLB models use a low-opacity bounding-box silhouette (`impostorOpacity`), and
  procedural kinds use the stand-ins listed above;
- beyond that, or outside the view frustum (a bounding-sphere test), the prop is hidden entirely.

`props.stats` and `debugString()` report `full / impostor / culled (distance / frustum)` counts.
`?debugTerrain=1` logs them once a second.

## Collision

`Props.collide(position, radius, out): boolean` pushes a sphere out of every prop with
`collision: sphere` or `box`, and writes the unit push normal to `out` (contracts §3). Box
colliders are oriented boxes built from the prop's bounds, scale and orientation. Sphere radius
is the mean half-extent × `sphereColliderFit`. The maths lives in `props/Collision.ts` and is
unit-tested headlessly.

`main.ts` calls `PropContact.resolve(sub, dt)` right after the physics steps. That pushes the
hull (radius `submarine.hullRadius`) out and removes the into-surface part of `sub.velocity`
(`collisionVelocityDamping`). On first contact, or on a hard hit, it emits `sub:collided`
(rate-limited by `collisionEventCooldownS`), so audio and the HUD react as they do to seabed hits.
`Submarine.ts` is unchanged.

## Debug hooks

- **`?at=lat,lon[,heading]`** spawns the sub at that position, facing `heading` (degrees, default
  north). It goes to `?depth=` if given, but never less than `atSpawnClearanceM` (22 m) above the
  seabed. Example:
  `/?tile=titanic&landmark=_test&depth=3790&at=41.7290,-49.9500,0` puts the `_test` fixture
  props in the headlight pool.
- **`?debugProps=1`** opens the placement panel (top right). Select a prop by clicking its row or
  clicking it in the viewport. Then:

  | key                  | action                                   |
  | -------------------- | ---------------------------------------- |
  | Arrows / Alt+W A S D | move N / W / S / E by 1 m (Shift: 10 m)  |
  | PageUp / PageDown    | raise / lower (`y_offset_m`)             |
  | `[` / `]`            | heading −5° / +5°                        |
  | Esc                  | deselect (the sub's controls work again) |

  Each change re-places the prop and prints the updated entry to the console (`[props] {...}`)
  and to the panel, which has a **Copy JSON** button. Nothing is saved: paste the entry back into
  props.json. While a prop is selected, the tool captures these keys so the sub doesn't move.

## Validator

```bash
python3 tools/validate_props.py data/landmarks/titanic/props.json --tile titanic
python3 tools/validate_props.py some/props.json --tile data/tiles/titanic/meta.json --strict
```

The validator applies the same rules as `PropLoader`, plus: coordinates inside the tile bbox
(`--tile`), GLB exists under `public/` and is at most `--max-model-mb` (2), and the GLB has an
`ATTRIBUTION.md` row (a warning). Exit codes: 0 = valid (warnings allowed unless `--strict`),
1 = errors, 2 = unreadable file. Python 3.9, standard library only.
