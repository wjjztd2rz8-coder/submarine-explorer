# f-endurance-scene

## What changed

- `src/world/presets/EnduranceRelief.ts` (new): ten soft ridges 55-170 m from the hull, heights from live terrain, one merged unlit mesh (about 3k tris, 1 draw), baked key light, scene fog takes them to water colour.
- `TitanicHorizon` takes an optional `HorizonLook`; Endurance uses a paler water band (haze 0x335563, upper 0x1f3a48, peak 0.32) so the sky void grades into the seabed. Titanic defaults unchanged.
- `TerrainBiome` endurance: extra large dropstones (sizeMul 3.2) and sparse boulders as erratics.
- `endurance.ts`: hull and spars lightened (weathered grey-brown planking, bleached oak), shrouds on all three stubs, yard stubs on fore and main, low sediment skirt along both flanks (kept inside the published length and beam bounds).
- Re-baselined snapshots in beebeIsolation and beebeScatter (Endurance biome and scatter changed).

## Before / after (golden 2026-10-10-030121 vs .cache/golden/2026-10-10-032137)

- endurance-1: horizon now has relief swells and a lighter gradient band instead of a black void; hull is warmer and separates from the plain. Hull is still small in this frame (opening framing unchanged). Judgement: 3 to about 3.5.
- endurance-2: hull reads as pale timber with rigging and yard stubs; skirt softens the base. Slightly bright but never dark.
- endurance-3: close view unchanged in character; lamp brightens timber.

## Gates

`PW_PORT=4471 tools/gates.sh`: build, unit, python, content, attribution, e2e, e2e-base PASS. prettier FAIL only on plan/PROCESS-LOG.md, which is untouched here and fails on main too.
