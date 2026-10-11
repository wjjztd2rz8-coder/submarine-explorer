# f-lostcity-tower

Branch claude/f-lostcity-tower. Files: src/world/props/geo/towers.ts, spire.ts (new exported `trunkCrest`), terrainMerge1140 snapshot, CHANGELOG.

## Changed

- Main trunk: 22 meandering vertical flow ridges (was 9), ridgeAmp 0.13, terrace shelves cut to ~30% strength, ledge/undercut roughening cut by about 2/3.
- Saucer flanges removed from the main trunk and lone chimneys; lesser spires get at most one small one (30% chance).
- Colour: ridge-aligned crest/trough shading (pale crests, grey-brown troughs) plus blue-green film patches on lower troughs, on top of the existing cream/grey-blue mineral variation.
- Vent: crater depth 0.5 to 0.9 (main), dark mouth radius widened.
- Triangles fall (56384 to 40256 in the Beebe-merge snapshot scene), so Low tier is cheaper.

## Shots

- Before: .cache/golden/2026-10-10-000648/lost-city-{1,2,3}.png
- After: .cache/golden/2026-10-10-000957/lost-city-{1,2,3}.png

## Honest assessment

Gain is modest. The trunk now reads as vertical flow-stone with fewer plates and a clear crest/trough pattern, and the wide shot is less blobby. The close-up golden shots (lost-city-2/3) frame mid-trunk, so the top orifice is not in frame there; ridges remain somewhat angular at the segment resolution. Next step would be a camera framing that shows the vent, and higher radial segments on the main trunk at High tier.

## Gates

All gates PASS (build, unit, python, content, attribution, prettier after formatting fix, e2e, e2e-base) with PW_PORT=4411.

---

# f-lostcity-tower (second pass, 2026-10-11)

Files: src/world/LostCityCarbonate.ts, src/world/props/geo/towers.ts, src/core/config/camera.ts, src/game/Spawn.ts.

- Colour: vertex paint adds ochre iron-stained patches, more grey-blue area, a cool blue-grey shade in the deep flow troughs, darker troughs and stronger crest/trough and streak amplitude. Shader striations raised (0.55 to 1.05) and tinted: warm ivory/ochre on pale runs, cool blue-grey in flutes (walls only, fades with distance).
- Brucite fins: 40/16 fins (was 64/24), about 40% shorter, wider base and less splay, so the vent rim is a subtle fringe not spikes.
- Opening camera (Arcade Lost City only): chase arm 50 to 66 m, new `chaseOffsetYM: 8`. Tower tip now sits about 30 px under the scan card on desktop (was behind it) and clear on 844x390.

Shots: .cache/codex/shots/f-lostcity-tower/ base-_, a3-_ (final). Golden: GOLDEN_SITES=lost-city GOLDEN_LAYOUTS=desktop,landscape.

Assessment: clear but moderate gain. Warm/cool variation and darker flutes read at opening and close range; towers are still smooth-sectioned and the wide scene is moody grey-green. Whole tower field now fits the opening frame, sub slightly smaller. Portrait and Low tier not re-checked.

Test changes (deliberate): Lost City Arcade chase-arm pins 50 to 66 in lostCityCamera, lostCityReadability and arcadeLoadout unit tests; the "camera within 95 m of the tower" bound in lostCityReadability is now 112 m (radius 50 at offsetY 0, 8, 24 or -14 could not clear the card; a higher altitude changed the chosen side of the tower). Snapshots terrainMerge1140 and beebeIsolation regenerated (tower geometry changed). Tradeoff: opening is slightly farther back (whole tower group fits, sub smaller).
