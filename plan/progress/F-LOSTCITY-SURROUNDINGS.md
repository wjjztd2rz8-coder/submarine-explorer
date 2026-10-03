# F-LOSTCITY-SURROUNDINGS

Branch claude/f-lostcity-surroundings. Goldens: .cache/golden/2026-10-03-234646 (after) vs
/home/vijay/submarine-explorer/.cache/golden/2026-10-03-230949 (before).

- towers.ts: lone chimneys get 2-3 flanges (was 1), 2-4 on secondary spires, denser larger rubble apron.
- TerrainBiome lost-city: cooler blue-grey slot colours (the warm lamps tint them back to neutral), rubble patch
  material, strata bands, stronger stain, bigger/denser boulder, rubble and dropstone scatter via new optional
  ScatterSpec.sizeMul (instanced; no new draws).
- mission.json vent overrides: ambientFill kept at 16 (lostCityReadability guards an ambient floor of 2.5; 12 gave 2.1), hazeScale 1.5 to 1.25, hazeLift 0.4 to 0.2.
- Life: sessile animals sink 10% into the substrate (LifeRender); patch scale larger at the core, smaller at the fringe
  (LifeSim.placePatch). Applies to every site's rooted animals.
- Test: tests/unit/lostCityBiome.test.ts.
- Not done: strata bands are faint on the gentle slope in shot 1; corals not specifically clustered at tower bases.
