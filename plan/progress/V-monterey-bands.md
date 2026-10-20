# V-monterey-bands

## Changes

- `src/core/config/monterey.ts` (`MONTEREY_STRATA`): new tunables `toneDrift*`, `faintBedAmount`, `footBlendH`, `apronSiltAtWall`, `talusTopScale`.
- `src/world/props/geo/scarp.ts` (canyon/eroded beds only): per-bed colour drifts along and up the wall with low-frequency noise and some beds fade toward silt; fine laminae fade in and out; wall-foot silt blend is taller and ragged; the apron is 1.8x thicker at the wall foot and silty where it touches the wall, so the transition reads as a talus slope.
- `src/world/props/geo/materials.ts` (`canyonRockDetail`): the regular bedding normal relief is multiplied by a slow swell so the corrugation stops repeating evenly.
- No site branches (existing `erodedBeds` preset flag and the MONTEREY_STRATA table); opening pose and facing spec untouched.

## Simplicity rules

Net-new code is small and sits in existing functions and the existing per-site table; no new settings, UI, specs or package numbers.

## Shots

`.cache/codex/shots/V-monterey-bands/{before,after}-{1,2,3}.png` (golden poses, monterey).

## Rating and remaining issues

About 3.9 (from ~3.6). Bands now vary in tone and relief and the foot is a visible sloped apron. Remaining: the wall/apron junction is still a fairly crisp edge, the apron's streaky texture reads a little vertical, and thicker talus buries some of the foot rocks in pose 3.
