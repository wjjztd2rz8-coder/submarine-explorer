# V-lostcity-towers

Branch claude/V-lostcity-towers. Files: src/world/props/geo/towers.ts, spire.ts; snapshots and perf-budget pins updated.

## Changed (net -17 lines in source)

- roughenTrunk: deleted the ridge, ledge, undercut, pit and sheet terms (the folded-sheet source); only broad low-frequency radius noise and the orifice pocket remain.
- tieredSpire (trunk only): terrace strength cut about 2.5x, one slow swell instead of two, cross-section ellipse 0.3 to 0.1, lumps 0.5 to 0.2, flutes are a smooth swell (sin^2 of the crest) instead of sharp creased crests; torn-rim scoop and teeth in rimDrop halved or cut.
- Main tower: 7 flutes (was 9), ledge 0.06, 2 flanges (was 3), 3 side fingers (was 6); lesser spires 5 flutes, no flanges, 1 finger.
- Paint: top 30% of each column lerps to fresh white (lit crown).
- Tests: props-geo and terrainMerge1140 snapshots re-baselined (triangles 17832 to 15344 and 50712 to 48224: fewer, not more; draws unchanged). perf-budget Low pins follow the trunk surface that sprites ground on (70 m 10427.55 to 10428.69, 32 m 43367.58 to 44027.34, 10 m 66410.31 to 67089.93); the 10 m ceiling rose 66444 to 67100 (+1%). Draws and point counts are unchanged, so the plume budget is not raised; this is placement on a smoother surface.

## Shots (.cache/codex/shots/V-lostcity-towers/)

before-3.png, after1-3.png (first pass), after2-3.png, after-3.png (final, flare restored to the original). Iterations: 2 of 3.

## Rating: 3.5 of 5 (was ~2.5)

One reads as one tall fluted tower, no fold seams, lit pale crown.

## Gaps

- Flowstone skirt is not visible in the detail frame (cropped by the HUD). I tried a wider flare; it did not change the frame and was reverted.
- Crown is a bucket-like torn mouth with thin wedge-like walls at the rim; a thicker rolled lip would help.
- Crown is pale but not bright white; the water tint and cream/ochre paint mute it.
- The side orifice pocket reads as a dimple.
