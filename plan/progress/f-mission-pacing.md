# f-mission-pacing

Goal: the next required target is always within about 1 km (hard cap 1.5 km in test).
The mission opens at the first required target, so only target-to-target gaps matter.
The remaining exceptions were resolved by 1220; see `1220-f-pacing-gaps.md`.

## Changes

- Blue Hole: `stalactites-east` (existing POI, already tagged as a reconstruction) is now required; `outer-dropoff` is optional. Briefing text and hints updated.
- Monterey: new POI `monterey-canyon-axis` (GMRT cell at 1,018 m on the canyon axis, same longitude as the wall, 640 m south; real terrain, guide entry `canyon-axis`) is required; `upper-channel` is optional. No invented content, so no Journal tag needed.
- Challenger Deep: nearby Eastern Pool floor transect is required; north inner wall is optional.
- Hunga Tonga: volcanic rim slope and nearby flank survey are required; shallow basin floor is optional.
- Hudson Canyon: coral-habitat ledge and nearby flank transect are required; shallower north wall is optional.
- `tests/unit/missionPacing.test.ts`: every site's max consecutive required gap <= 1500 m, with no exceptions. New terrain surveys also stay within 1000 m; depth claims are checked against their exact GMRT cells. `heroMissionSpawn` expectations updated for the earlier Blue Hole/Monterey work.

## Required-target gaps in metres (before -> after)

| Site                | Before | After                                                                              |
| ------------------- | ------ | ---------------------------------------------------------------------------------- |
| great-blue-hole     | 4506   | 270                                                                                |
| monterey-canyon     | 14578  | 645                                                                                |
| challenger-deep     | 4139   | 817                                                                                |
| hunga-tonga-caldera | 3315   | 660                                                                                |
| hudson-canyon       | 2807   | 555                                                                                |
| others              | <= 901 | unchanged (bismarck 901, endurance 20, titanic 689, lost-city 101, others smaller) |

All shipped missions now meet the 1.5 km required-target cap.
Spawn-to-first distances are not a concern (missions open at the first target).
