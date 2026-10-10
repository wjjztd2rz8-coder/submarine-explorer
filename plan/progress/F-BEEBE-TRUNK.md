# F-BEEBE-TRUNK

Branch claude/f-beebe-trunk. Gates: see final run (PW_PORT=4481). Re-baselined: beebeIsolation (High/Medium triangles up, geometry hashes) and terrainMerge1140 beebe Low snapshot (buffer hash only; draws and triangles unchanged). Files: src/world/props/geo/spire.ts, smokers.ts, src/core/config/props.ts, data/landmarks/beebe-vent-field/mission.json, CHANGELOG.

## Built

- Relief: `tieredSpire` gains `crust`; `crustBand()` gives irregular band crests whose strength drifts around the circumference, so crust flanges overhang on one side and vanish on the other, plus high-frequency nodules. Hero stacks only.
- Colour (vertex, no new draw): coal-black recesses, ochre/orange oxide on crests (per-band tint), rust patches, sulfur bloom on flanges, pale anhydrite near the rim. Colour uses the same `crustBand()` so relief and colour line up. Shared tan crust tint halved.
- Mesh density: hero stacks use 40 segments and ~0.3 m rings on Medium and above; Low is unchanged (the 1140 Low triangle ceiling holds).
- Smoke: mission override `smokeColorSulfide` 0x1c1a18, opacity 0.9; plumes read as charcoal columns against the water and pale seabed instead of grey haze.

## Shots

.cache/codex/shots/f-beebe-trunk/: base-{1,2,3}, a1-* (first pass, smoke too dark to read), after-{1,2,3} (final, High). Score estimate 3.5 to about 4.

## Known gaps

- Low tier has crust relief and colour but not the denser mesh, so it is smoother.
- Smoke at golden pose 1 is dark but low contrast against the deep water at range; no pose frames the hero orifice with smoke close up.
- Side-orifice collars and chimneys 2/3 keep the old (non-crust) profile.
- High-tier hero triangles rose from 78k to 95k.
