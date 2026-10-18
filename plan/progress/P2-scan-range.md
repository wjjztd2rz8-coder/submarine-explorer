# P2-scan-range

The phone-test blocker was real: Titanic's 30 m data radius resolved to 72 m in
Arcade, while the tutorial still asked for SCAN at 217 m.

## Changes

- Effective Arcade settings now supply a 100 m scan-radius floor, inherited by
  Custom based on Arcade. Apply it after sensor/equipment scaling and the mission
  approach cap, so the cap cannot reduce the resolved reach below 100 m. Preserve
  larger radii and Realistic's existing data radii and sensor scaling (Titanic:
  36 m). Keep pristine base radii for live mode changes; no runtime config mutation.
- Apply the floor to fixed POIs, curiosity targets and wildlife. Wildlife target
  selection receives the same floor so it cannot discard an animal before the
  scanner considers it. Existing depth and facing requirements still apply.
- The scan tutorial and out-of-range guidance say `Get closer to scan · 217 m`
  (with the live target distance). An interrupted scan retains the distance to its
  held target even beyond remote hint range. At the boundary, normal scan/aim
  guidance returns.
- Net simpler on screen: range instructions replace the misleading hold/close-to
  copy in the existing guidance slot, including desktop mission approaches. No new
  surface, setting, CSS, art, layout or composition changes. Existing completion,
  warning and optional-target priorities remain covered by exact assertions.
- Existing capability specs now guard overlapping adjacent POIs in both list
  orders, nearest selection across their midpoint, stable active locks, the 100 m
  boundary, Realistic/Custom behavior, all target pools, tutorial device copy, and
  resolved Titanic mission/free-dive reach. Mission glue covers both 30 m data and
  the 80 m approach cap; browser regressions check the loaded game's radius rather
  than merely reading POI JSON.

## Verification

- Focused behavior/settings capabilities: **294 passed in 10 specs** (`f2-modes`,
  `missionApproachSystem`, `gameScanner`, `onboardCompletion`, `guidance`,
  `touchControlsAudit`, `lifeDisposal`, `dailySystem`, `powerSystem`, `overlayFocus`).
  A subsequent `f2-modes` run also passed all 8 tests after adding exact assertions
  for every Titanic POI.
- Existing approach/navigation capabilities: **105 passed in 6 specs**
  (`missionApproach`, `heroMissionSpawn`, `missionComposition`, `phonePitch`,
  `missionApproachWaypoint`, `progressScan`).
- Typecheck, root production build, attribution and repository formatting: **pass**.
  Used the existing writable configuration mode for the shared read-only
  dependency tree; no tooling changes.
- Final `GATES_CONFIG_MODE=writable PW_OUTDIR=.cache/p2-scan-range-final-dist
PW_PORT=4253 tools/gates.sh`: **exit 1**, default smoke + project-base
  browser mode. Content, build, unit, attribution and Prettier passed. The unit
  gate passed **3,239 tests across 192 specs** in 508.98 s. Both browser gates
  failed before executing tests because their preview server could not start. Logs: `.cache/runs/20261018-113011-27-UYWvcq/` and
  `.cache/p2-scan-range-final-gates.log`.
- Relevant browser capabilities (`d-scan`, `d-modes`, `d-start`, `d2-camera`,
  `mission`, `f-arcade-access`): **19 discovered, none executed**. The preview cannot
  start; Playwright's localhost probes fail with `connect EPERM` on both IPv4 and
  IPv6. Log: `.cache/p2-scan-range-final-e2e.log`.

Environment/tooling failures, kept separate from behavior results:

- Python gate: 166 tests, 5 failures. Four CI-manifest checks fail because Node's
  `spawnSync git` is denied with `EPERM` by the sandbox.
- The fifth Python failure is the golden-tooling wrapper: its Node comparison
  test receives empty report JSON (`Unexpected end of JSON input`). Cause not
  established; the comparator and its assertions are unchanged.
- Browser execution is blocked by sandbox localhost access, before any game test
  runs. No assertion was loosened and no timeout was raised.

Visual/phone/screenshot acceptance belongs to Claude and is not claimed here.
No changes to tools or DIRECTOR.md; no merge, push or tag.
