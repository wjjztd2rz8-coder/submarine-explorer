# V-titanic-opening

## What changed

- `data/landmarks/titanic/site.json` free-dive opening: range 28 to 20, altitude 26 to 18, own chase radius 97 and offset Y -24 (was the global radius). The hull is larger and sits mid-frame, still whole inside the 16:9 view and the portrait lane.
- `materials.ts` steel plate shader (shared by steel wrecks): plate tint now varies by lane (row bands a few strakes tall, column bands a few plates wide, cool grey-brown to warm rust) in place of one flat tint; plus a faint cool grazing-angle edge light so the hull edge separates from dark water. Shader maths only, no new geometry, lights or props (no budget change).
- Tests: `heroMissionSpawn.test.ts` asserted the global reset radius for Titanic; it now asserts the authored opening radius (mission still inherits global). Titanic snapshots in `freeDiveComposition.test.ts` rebaselined.

## Screenshots

`.cache/codex/shots/V-titanic-opening/`: before-1, r1..r10 (r10-1/2/3 final), r7-portrait-1. Tried and rejected: chase radius 30/62 (hull cropped, sub dominates), stronger rim (decks wash pale blue), range 14 (hull end-on).

## Gates

`PW_PORT=5410 tools/gates.sh`: unit, e2e, attribution pass after the test updates. Prettier flags plan/STATUS.md, which this item did not touch.

## Remaining issues / rating

- Hull is about 45% of frame width but only ~25% of height; "a third of the frame" is only roughly met because the whole-bow-in-view guard limits how close it can sit. Sky above stays dark and empty.
- Rim light is subtle at opening distance; visible mainly on the bow edge and rails. Lanes read at close range more than at opening.
- Portrait hull is still small. Rating 6.5/10.
