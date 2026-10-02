# F-HERO-VENTS: Lost City and Beebe vents (progress)

Branch `claude/f-hero-vents`. Shots: `.cache/codex/shots/f-hero-vents/{before,after}/` (before = golden set 2026-10-02-0704, after = 2026-10-02-0822 plus low-tier captures).

## What was wrong

- Opening and golden-shot framing aimed at `localBounds.min.y + 0.55 * height`. A chimney foundation sunk below the seabed (Poseidon's min.y is about -73 m) put the aim point underground, so the pose looked down at bare seabed.
- The vent preset started its smoke and glow at the top of the prop's bounds, which also cover plume reach, so the orange glow floated above the Beebe chimneys.
- Beebe's seabed used high-contrast basalt/silt sets: salt-and-pepper sparkle at range.
- Lost City's towers were plain cylinders plus blocky flanges; the small carbonate chimneys were smooth grey pipes.

## What changed

- `src/world/props/geo/spire.ts` (new): `tieredSpire` (terraces, flutes, wobble, knobbly roughness, optional crater) and `flange` (drooping scalloped lathe sector pinching to nothing at both ends, so no cut faces).
- `geo/towers.ts`: Poseidon rebuilt. The main spire is stout (radius 0.26 H), terraced and fluted, with six drooping flanges; 4-5 satellite spires; pale warm-white carbonate; a self-lit lift that follows vertex colour and face-up normal (`vertexGlow` in `geo/materials.ts`); three clear-fluid haze plumes at the tallest tips. `buildCarbonateChimney` gives the lesser carbonate chimneys (IMAX, unnamed) the same family; `builders/vents.ts` routes `material_hint: carbonate` there.
- `geo/smokers.ts`: smoker cluster rebuilt. Chimneys are 1.5x nominal height, thick, terraced, rough, with a crater orifice and a warm vertex-glow tint; soft mound edge; sulfide talus (instanced); mussel beds (non-shrimp variant only); tubeworm clumps (tubeworm variant); Beebe's shrimp variant puts Rimicaris in dense patches on the lower walls instead of uniform specks. Real-site facts kept: Beebe has shrimp, not tubeworms or mussels.
- `world/presets/Presets.ts` (shared, small): `toPresetProps` reads `userData.ventTop` (set by both builders) so smoke and glow start at the real orifice.
- `world/TerrainBiome.ts` / `TerrainMaterial.ts` (shared, small): optional biome `contrast` and `detail` multipliers; Beebe gets a sand/silt sediment with `contrast 0.55`, `detail 0.5`, less rust staining, fewer ripples and burrows. Result: soft, readable texture.
- `game/Spawn.ts`: openings gained `fromCentre`, `altitude` (above the hero base) and `yawOffset`; aim fixed (`max(min.y, 0)`). Lost City: 44 m from the tower axis, 18 m above its base. Beebe: 46 m, 4 m above the chimney base. `yawOffset` is 10 degrees, within the existing facing > 0.98 e2e assertion.
- `data/landmarks/beebe-vent-field/mission.json`: `smokeOpacitySulfide: 0.85` override (denser smoke). No facts or journal text touched.
- `tools/golden-shots.mjs`: vent set pieces (a `feature`) are framed from their axis (shots 2 and 3 at 40 m and 30 m); same aim fix; `GOLDEN_SITES=a,b` filter.
- `tests/unit/freeDiveComposition.test.ts`: aim mirrors the opening (assertions unchanged).

## How to see it

`npm run build && npm run preview`, then `?tile=lost-city` or `?tile=beebe-vent-field` (Arcade free dive). Photo mode orbit shows the towers best.

## Tiers and performance (window.__game.perf, SwiftShader, default opening)

| Site      | Tier | Draw calls | Triangles |
| --------- | ---- | ---------- | --------- |
| Lost City | low  | 36         | 81k       |
| Lost City | high | 57         | 853k      |
| Beebe     | low  | 61         | 107k      |
| Beebe     | high | 76         | 909k      |

Low tier cuts mesh density (0.55x), plume particles (0.35x), life instances (0.25x) and the bump map. Instanced life, talus and mussels are one draw each; the haze plumes are one Points draw each (3 on Poseidon).

## Known gaps

- The Lost City cold-water-coral life agents (pale branching clumps) still read blocky; they belong to the life package.
- Beebe's opening: the chase camera sits 90 m behind and 38 m above the sub, so a 12-18 m chimney 46 m ahead sits partly behind the hull. The plumes and orange glow carry the shot; a camera nudge or a larger `yawOffset` would need the e2e facing assertion relaxed.
- The talus skirt under Poseidon is a broad flat apron; it could take rubble instances.
- "Ambient fill within 40 m" is not present in this branch's tree (no code found); low-tier Beebe's seabed is dark outside the headlight pool.
- Unlit carbonate relies on the fake self-lit lift rather than real scattering.
