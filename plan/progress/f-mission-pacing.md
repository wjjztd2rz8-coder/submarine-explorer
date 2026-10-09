# f-mission-pacing

Goal: the next required target is always within about 1 km (hard cap 1.5 km in test).
The mission opens at the first required target, so only target-to-target gaps matter.

## Changes

- Blue Hole: `stalactites-east` (existing POI, already tagged as a reconstruction) is now required; `outer-dropoff` is optional. Briefing text and hints updated.
- Monterey: new POI `monterey-canyon-axis` (GMRT cell at 1,018 m on the canyon axis, same longitude as the wall, 640 m south; real terrain, guide entry `canyon-axis`) is required; `upper-channel` is optional. No invented content, so no Journal tag needed.
- `tests/unit/missionPacing.test.ts`: per-site max consecutive required gap <= 1500 m, with a shrink-only allowlist for known debt. `heroMissionSpawn` expectations updated.

## Required-target gaps in metres (before -> after)

| Site                | Before | After                                                                              |
| ------------------- | ------ | ---------------------------------------------------------------------------------- |
| great-blue-hole     | 4506   | 270                                                                                |
| monterey-canyon     | 14578  | 645                                                                                |
| challenger-deep     | 4139   | unchanged (allowlisted)                                                            |
| hunga-tonga-caldera | 3315   | unchanged (allowlisted)                                                            |
| hudson-canyon       | 2807   | unchanged (allowlisted)                                                            |
| others              | <= 901 | unchanged (bismarck 901, endurance 20, titanic 689, lost-city 101, others smaller) |

Follow-up: Challenger, Hunga and Hudson need an intermediate POI or an optional far target.
Spawn-to-first distances are not a concern (missions open at the first target).
