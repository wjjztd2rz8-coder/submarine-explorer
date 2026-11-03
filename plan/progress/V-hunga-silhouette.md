# V-hunga-silhouette

## What changed

- Generic escarpment capability in `src/world/props/geo/scarp.ts`: a wall whose `edgeStart` is >= 0.6 (pinches late) now gets a level crest in a few terrace steps instead of the ragged skyline (`wallEnvelope`). The `tuff` preset opts in (`edgeStart` 0.3 to 0.75), runs its crest back as a level shelf (`PLATEAU_REAR`) and curves less in plan (`arc` -0.42 to -0.2). No site branch; the preset is the data.
- Tests: scarp/terrain hash baselines and the free-dive Hunga snapshot updated (also dropped two obsolete snapshots); new capability test "escarpment crest" in `tests/unit/scarpTerrain.test.ts`.

## Images

- Before: /home/vijay/submarine-explorer/.cache/golden/2026-11-02-162332/hunga-tonga-caldera-1-mission.png
- After: .cache/golden/2026-11-02-234957/hunga-tonga-caldera-1-mission.png (copy: plan/progress/V-hunga-silhouette-after.png)

## Rating

About 4.0 (was 3.45). Near-vertical wall, flat top with a stepped crest, never dark.

## Gaps

- Reads slightly boxy, like a slab; the crest has only two steps and the bank behind is still a soft hill.
- Wall face is uniform tan; no breakup of the crest by gullies at the top. Only the desktop opening was viewed.
