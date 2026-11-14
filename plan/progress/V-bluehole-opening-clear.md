# V-bluehole-opening-clear

## Changes

Data only, `data/landmarks/great-blue-hole/site.json` opening.mission: `chaseOffsetY` -45 -> -66 (camera lower, sub reads against open water above the rim), `yawOffset` -12 -> -20 (gallery moves to the right third). No code, no props, no site branches, no test changes.

## Probes

Yaw -24 alone: gallery further right but sub still overlapped the ridge. Offset -70/-72 clear on desktop but portraitOpening hull-vs-HUD-lane test failed by a few px; -90 clears fully but looks up at the underside of the sub (odd). -66 passes the portrait lane test.

## Screenshots

`.cache/codex/shots/V-bluehole-opening-clear/{before,after}/` (desktop 1600x900, portrait 390x844 mission opening).

## Gates

`PW_PORT=5341 tools/gates.sh` green (e2e=smoke). Opening scan floor, hero clearance, perf budget unaffected (no prop change).

## Simplicity

Two data values. Nothing added.

## Remaining / rating

Rating about 4.3 (was 4.0): sub skids still graze the rim line in desktop and portrait; the sub is seen slightly from below. Gallery now sits right-third with stalactites visible but its overhang reads modest. Fully clear needs a pose that keeps the camera lower without the underside view (e.g. a small camera pitch control) or a higher sub opening depth.
