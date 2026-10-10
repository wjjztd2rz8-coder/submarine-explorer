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
