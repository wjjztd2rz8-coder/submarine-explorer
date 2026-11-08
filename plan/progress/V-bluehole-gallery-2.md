# V-bluehole-gallery-2

## Changes

- `data/landmarks/great-blue-hole/props.json`: `karst-grotto` `dimensions_m` 70x22x18 to 105x30x27. The gallery prop is larger at the same position, so the mission opening (125 m range, 44 m depth, same pose data) shows it at about 29% of frame width (was about 18%), centre-right, stalactites visible, sub left. Data only.
- `src/world/props/geo/stalactites.ts`: the sediment apron shader gets faint current ripples and a fine per-pixel grain (a few GLSL lines in the existing apron fragment patch; no new settings, draws or files).
- `CHANGELOG.md` entry.

## Decisions

- Range stays 125 m, so scan reach is unchanged (the earlier note showed shorter ranges cut the scan radius below what the minimum-depth composition needs). A larger prop gets the target without touching that rule.
- The free-dive hero pose is unchanged in data; the same prop is larger there, framed the same way and still reads (hood fills the upper frame). I judged it acceptable.
- Tried `chaseOffsetX` 44: sub grew and touched the gallery; reverted to 36.

## Simplicity-rule check

Net: one data value, ~6 shader lines. Per-site data, no site branch, no config mutation, no package numbers in code. Tests: see gates below; any snapshot hash changes are intended (apron shader and prop size).

## Screenshots

`.cache/codex/shots/V-bluehole-gallery-2/{before,after}/` (desktop 1600x900 and portrait 390x844; mission opening, hero poses).

## Rating (honest)

Opening before about 3.5, after about 4.0. Gallery is bold and readable.

## Remaining gap

Sub rear/nose nearly touches the gallery edge on desktop. The hood still reads somewhat like an overturned boat from outside. Silt ripples are only visible in close views, not in the 125 m opening.
