# V-bluehole-gallery-read

## Changes
- data/landmarks/great-blue-hole/site.json: opening.mission.chaseOffsetX -16 -> -44. One data value; no code change.

## Screenshots
.cache/codex/shots/V-bluehole-gallery-read/ (before-*, after-great-blue-hole-1-mission.png). The sub now sits to the right of the gallery instead of covering it. Portrait: sub clear of the dome at -44 (-56 clipped the sub at the screen edge).

## Tried and rejected
- rangeM 110: no valid opening pose (fell back to the surface spawn).
- rangeM 130: approach swung to the NW wall; sub overlapped the dome again.
- localAltitudeWeight -3: pose unchanged (depth is pinned at 10 m).

## Tests
`PW_PORT=5351 tools/gates.sh` green (e2e=smoke). No snapshots re-baselined.

## Simplicity
One shared-data value changed; no site branches, no new fields.

## Remaining issues
The target composition is only half met. The opening is held at 10 m by the shallow-depth ceiling and the 150 m approach range, so the camera looks at the hood's outer roof from above. The dark arch and hanging stalactites are not visible until the player closes in (the free-dive/close shots show them). Showing them at opening would need a deeper or closer opening pose, for example an opening altitude or a shorter range with a different approach bearing. That is a code or pose-search change I did not make.

## Honest rating
Sub-overlap fixed (clear improvement). Arch and stalactites readable at opening: not achieved. About 4/10 against the brief.
