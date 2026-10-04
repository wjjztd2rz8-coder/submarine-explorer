# F-BLUEHOLE-PITCH

## What changed

- `src/sub/CameraRig.ts`, `src/game/Pois.ts`, `src/game/Spawn.ts`, `src/app/systems/props.ts`, `src/app/systems/mission.ts`: new optional `chaseOffsetY` (extra vertical chase-arm offset, default 0) carried by opening poses. Great Blue Hole sets 22 and an altitude of -22 (about 22 m below the ledge, 55 m depth). Other sites pass nothing, so their cameras are unchanged. The two shared-system edits are minimal (the lost-city branch also fires when `chaseOffsetY` is set).
- `tools/golden-shots.mjs`: fixed poses accept `close: { range, above, lateral }` for shot 3. West alcove uses 36 m, 9 m above the ledge, 10 m to the side. `GOLDEN_CLOSE` JSON overrides it for retuning.
- `src/world/props/geo/stalactites.ts`: alcove apron floor a little lighter and warmer (less cool grey).
- `src/world/props/geo/scarp.ts`: wall fan colonies pick from a pink/orange/red/peach/pale palette with brightness jitter (instance colours; no new draw calls, same instance counts).

## Screenshots

`.cache/codex/shots/f-bluehole-pitch/`: `great-blue-hole-1.png` (spawn), `-2`, `-3` (west alcove), `great-blue-hole-east-2/3.png`, `monterey-canyon-1..3.png`. Before: `.cache/golden/2026-10-04-062459/`.

## Tiers and performance

No tier-specific change; draw calls and triangle counts are unchanged (colour and camera only).

## Known gaps

- Frame 1 is still mostly wall: a sinkhole's far wall always fills the view; the tilt now shows the water, shoals, ledge and the full sub. Fish near the pose are sparse.
- Alcove floor remains a muted tone; stalactites still sit in the middle of the close shot, now framed by the interior rather than blocking it.
- Monterey sponges (not fans) are unchanged.
