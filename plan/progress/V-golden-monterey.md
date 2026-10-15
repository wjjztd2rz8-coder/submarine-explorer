# V-golden-monterey

## Cause

Golden set 2026-10-15-172432 failed at `monterey-canyon: capture 1` (the free-dive spawn) with
`Chromium viewport capture timed out after 30000 ms`. The manifest (`poses.json` failures) has one
entry; every other capture in that run, including Endurance, completed.

- The spawn frame is the heaviest scene in the set (about 2.46 M triangles, 133 draw calls under
  SwiftShader). In the normal path `page.screenshot` (30 s) does not finish in time for this capture.
- Earlier successful runs show it: `monterey-canyon-1.png` used `captureMethod: cdp-viewport` in every
  run that passed (2026-10-11 x2, 10-13, 10-14, 10-15-011533, 10-15-093704). That means the normal
  screenshot timed out and the CDP fallback rescued it.
- In the failing run the fallback also hit its 30 s bound, so the capture failed. This is a timing
  stall on a loaded machine, not a bad pose: the pose and tier checks passed up to the screenshot.

## Fix

`tools/golden-shots.mjs`: raise the CDP viewport fallback bound from 30 s to 90 s. Pose, wait
conditions and site logic are unchanged. The normal 30 s `page.screenshot` attempt stays.

## Endurance at mission spawn

- The free-dive set captures Endurance at the free-dive default spawn (`Spawn.ts` endurance entry),
  which is not the mission spawn. Free-dive poses are authored for approach and detail only (shots 2-3).
- The mission spawn is the `GOLDEN_MODE=mission` path, which iterates the mission catalog and already
  includes `endurance`. Mission mode uses no hero poses, so no pose entry is needed there.
- Verified: `GOLDEN_MODE=mission GOLDEN_SITES=endurance GOLDEN_LAYOUTS=desktop tools/golden.sh`
  produced `endurance-1-mission.png` (missionId `endurance`, 0.58 s) and `endurance-2-mission.png`
  (+10 s). No failures.
- No change to `defaultHeroes`. Adding a free-dive pose could not place shot 1 at the mission spawn.

## Evidence

- `GOLDEN_SITES=monterey,endurance GOLDEN_PORT=4411 GOLDEN_LAYOUTS=desktop tools/golden.sh`
  exit 0, `.cache/golden/2026-10-15-181233/`, `failures: []`, `complete: true`.
  Output: `monterey-canyon-1.png` (1.30 MB), `-2.png`, `-3.png`, `endurance-1.png`, `-2.png`, `-3.png`.
  `monterey-canyon-1.png` and `endurance-1.png` were viewed: real terrain, the sub, the HUD and props.
- `monterey-canyon-1.png` again used the CDP fallback (the 30 s `page.screenshot` still times out at spawn).
- `PW_PORT=4412 tools/gates.sh` passed: python, content, build, unit, e2e, e2e-base, attribution, prettier.
