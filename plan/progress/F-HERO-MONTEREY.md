# F-HERO-MONTEREY: first 60 seconds at the Monterey Canyon wall (progress)

Branch `claude/f-hero-monterey`. Shots: `.cache/codex/shots/f-hero-monterey/{before,after}/` (before = golden set 2026-10-02-0704; after = golden shot 1-3 plus `monterey-opening-{high,low}.png`).

## What was wrong

- Opening 100 m off a 26 m ledge: near-black frame, a faint silhouette, only the headlight pool lit, no sense of scale.
- Wall albedo was dark olive; the 0.72 D talus apron pushed any safe spawn 50+ m from the face.
- Seabed had a high-contrast lattice; sediment puffs were opaque cream blobs; marine snow was busy.

## What changed

- `game/Spawn.ts`: Monterey opening 12 m off the wall footprint, face-on. New opening option `turnWeight` (default 0.12, Monterey 3) so the altitude score cannot swing the sub to an oblique side view on the steep slope; `yawOffset` 10.
- `world/presets/CanyonPreset.ts` + `core/config/presets.ts`: opt-in `ambientFill` (teal tint) and `snowScale`, both neutral by default (Hudson Canyon unchanged). Monterey `mission.json` sets `ambientFill 24`, `snowScale 0.5`, `plumeOpacity 0.1`, `plumeSizeM 2.2`.
- `world/props/geo/scarp.ts`: canyon preset only: lighter mudstone palette, apron reach 0.72 to 0.38, faint `vertexGlow` (teal) on wall, apron and boulders. Tuff and hadal scarps untouched.
- `props.json`: `canyon-wall-ledge` is 140 x 50 x 64 m (was 70 x 26 x 36). Same reconstruction tag and note.
- `world/TerrainBiome.ts`: Monterey sediment brighter with `contrast 0.55`, `detail 0.5`; scatter adds rubble, sponges, whip corals and more sea pens.
- `tools/golden-shots.mjs`: ledge, cliff and scarp set pieces are framed from the footprint edge (like wrecks), not the axis, which is now inside the wall.

## Perf (SwiftShader, default opening)

| Tier | Draw calls | Triangles |
| ---- | ---------- | --------- |
| low  | 61         | 116k      |
| high | 88         | 864k      |

## Known gaps

- The sonar map is still the blocky GMRT grid (data resolution, not touched).
- Seabed biome texture still shows a faint lattice up close; fauna (sablefish, rattails) come from the existing species/life tables, not new authored placement.
- Golden shots 2 and 3 use the tool's first-person camera and show the wall flank; the opening (shot 1) is the reviewed frame.
- Fill is flat tinted ambient with a self-lit lift, not true scattering.
