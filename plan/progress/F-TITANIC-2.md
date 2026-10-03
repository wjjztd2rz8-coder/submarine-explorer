# F-TITANIC-2: second polish pass on Titanic and Blue Hole (progress)

Branch `claude/f-titanic-2`. Shots (before = `base-*`, after = `titanic-{high,low}.png`, `bluehole-{high,low}.png`): `.cache/codex/shots/f-titanic-2/`.

## Titanic

- `game/Spawn.ts`: the opening now approaches broadside (bearing 100, 28 m off the footprint, 26 m above the hull base) with a new optional `chaseRadius` (70 m instead of the 123 m default arm). `SpawnPose.chaseRadius` (Pois.ts) carries it; `app/systems/props.ts` applies it before the snap. The hull now spans the frame (portholes, rails, deck, bow); the sub sits over the upper deck edge only. Facing stays within the existing e2e 0.98 assertion.
- `TerrainBiome.ts`: Titanic bed uses one texture in both slots, `patch 0.12`, `stainAmount 0.05`: no pale blotches on the low tier.
- `mission.json`: `ambientFill` 19 -> 30 (brighter, never darker), `moteOpacity` 0.3 (less orange snow noise in front of the hull).

## Blue Hole

- `ReefPreset.ts`: optional halocline haze (`haloclineDepthM/Lat/Lon/RadiusM/Opacity/Color`, defaults off in `core/config/presets.ts`). Three discs 1.4 m apart in one draw call, wispy alpha, soft rim, fades when the eye is inside the layer. Depth-tested, so only the part inside the hole shows. Mission sets 90 m at the hole centre.
- Low tier gets one disc (1 draw, 40 triangles; 2.2x opacity). This deviates from "nothing draws on low" for presets, deliberately: it is what lifts the dark interior there.
- `TerrainBiome.ts`: depth tint 0x3a6a90 -> 0x5a90b6 (lighter walls at depth).

## Tests

`tests/unit/haloclineHaze.test.ts` (new): mesh at the right depth, low-tier single disc, off without params.

## Known gaps

- The sub still overlaps the upper deck edge at the Titanic opening (unavoidable while the opening must face the hull centre).
- The halocline is a stack of flat discs: seen exactly edge-on it reads as a thin line.
- Blue Hole wall texture repetition up close is unchanged.
