# R-ci-green: bounded two-objective scan journeys

Implemented the spec change. Browser acceptance and after timings remain
unverified because this sandbox denies localhost connections/listeners. Do not
mark hosted CI fixed until the repeat run and full browser gate pass elsewhere.

The supplied red runs are 40331865229, 40321169892 and 40317521431. GitHub was
not queried; the diagnosis uses the local journey manifests and source timeouts.

The old driver ran a feedback controller over visible turn/depth/distance copy.
Each leg permitted 300 simulation seconds, advanced one rendered frame at a time
in 250 ms increments. The whole case overrode the normal test budget with
360 wall-clock seconds. Every iteration crossed the browser boundary for clock,
state and keyboard/CDP steering; the first approach also queried displacement.
The recorded cases needed 655–1,125 controller iterations. Hosted software
WebGL makes that wall cost variable, while the controller's deadlines counted
simulation time. Two individually bounded legs did not bound the total wall cost.

Both scan holds also polled for up to 60 wall-clock seconds while continuing to
steer. Residual velocity, buoyancy and optional-contact guidance could change the
candidate during the hold. The earlier recorded Titanic landscape failure
crossed the stern's facing limit and completed Big Piece instead (documented in
`4340-V-journeys-second-leg-finish.md`). That is evidence of a driver stall/target
handoff, not grounds to change production guidance or relax text assertions.

A third hazard appears when shortening the route: the first completion card
suppresses the next ready card for six game seconds. With a paused browser clock,
a plain locator expectation cannot expire it. The completion banner similarly
needs three game seconds. Both waits now explicitly pump game frames.

The renamed `two-objective scan journey` table keeps both sites at all three
viewports and the fresh Home/Settings/briefing/onboarding path. It uses the
existing `spawnPose`, `scanAim`, submarine reset and camera snap capabilities.
`completeScan` advances only discovery scan time while the actual keyboard/touch
scan control is held; it checks real candidate geometry, freeze gates and exact
completion. No discoveries, mission completion or UI text are injected.

The six-minute override, controller, trace array and long hold polling are gone.
The obsolete five-minute route assertions are replaced by the configured test
wall-clock budget.
The spec is 175 lines shorter. Real movement/onboarding still uses held controls;
full route reachability is no longer claimed by this capability test. Existing
movement/input/scanner specs retain their separate coverage. Reward text and
waypoint agreement on the completion frame and following frame, both Journal
entries, exact scan identity/count, debrief discovery count, clipping, panel
bounds/overlaps and touch target checks remain. Manifests now include wall time
at each capture and at completion, and pose/scan operations have Playwright steps.

Before timings below are **simulation seconds**, not hosted/local wall durations.
They come from the six passing manifests started 2026-10-26T10:45:19Z through
10:46:15Z in `/home/vijay/submarine-explorer/.cache/codex/shots/journeys/round-1/`.
A compact extraction with source filenames is `.cache/journeys/before-summary.json`.
Each old scan hold adds 7.75 simulation seconds (31 rendered polling iterations).
The current sandbox cannot produce after durations; none are inferred from
these recordings or reported as a successful run.

| Site            | Viewport | Before first approach | Before second approach | Before dive at debrief | After wall duration, rounds 1 / 2 |
| --------------- | -------- | --------------------: | ---------------------: | ---------------------: | --------------------------------- |
| Titanic         | 1280×720 |                 73.51 |                 189.00 |                 280.88 | unavailable / unavailable         |
| Titanic         | 390×844  |                 81.02 |                 186.25 |                 285.63 | unavailable / unavailable         |
| Titanic         | 844×390  |                 81.01 |                 186.00 |                 285.38 | unavailable / unavailable         |
| Great Blue Hole | 1280×720 |                 79.51 |                  73.50 |                 171.39 | unavailable / unavailable         |
| Great Blue Hole | 390×844  |                 73.02 |                  76.75 |                 168.13 | unavailable / unavailable         |
| Great Blue Hole | 844×390  |                 72.51 |                 100.00 |                 190.89 | unavailable / unavailable         |

Validation performed here:

- Pass: typecheck, content validation, production build, attribution, repository-wide
  Prettier and diff
  whitespace check. Build/content logs: `.cache/runs/20261026-094857-8-l3OvpM/`.
- Pass: existing scanner, scan-helper and guidance capabilities, 198 tests in
  three files; `.cache/journeys/capabilities.log` (Vitest thread pool).
- Discovery: the entire spec with `--repeat-each=2` lists 106 cases, including
  each of the six changed cases twice; `.cache/journeys/list.log`.
- Attempted: original six-case baseline, then the entire revised spec twice.
  Both fail before execution at preview startup. `after-stderr.log` records
  `connect EPERM` for localhost; direct preview also reports `listen EPERM`.
  JSON reports are `.cache/journeys/before.json` and `after.json`.
- Attempted: `FULL_E2E=1 GATES_CONFIG_MODE=writable PW_PORT=4388
FLOW_AUDIT_SHOTS=.cache/journeys/gates timeout --signal=INT 240s bash
tools/gates.sh --full-e2e`. Python reports 5 sandbox-related subprocess
  failures out of 167 tests (including `spawnSync git EPERM`). Full unit stalls
  after its RUN header. A separate full unit run using threads also timed out
  after 90 seconds without results (`.cache/journeys/unit-threads.log`). `.cache/journeys/full-gates.log` records the aggregate
  attempt, which exits 124 at the 240-second limit before its browser phases;
  this is not a passing gate.
- Attempted separately: full browser suite, also blocked at preview startup;
  `.cache/journeys/full-e2e.log`. No fresh browser screenshots exist. The saved
  Titanic landscape second-reward screenshot was inspected as historical evidence.

Acceptance commands for a browser-capable runner (local artifact paths avoid the
shared screenshot symlink):

```sh
GATES_CONFIG_MODE=writable PW_PORT=4388 PW_OUTDIR=dist-journeys \
  bash tools/gates.sh --phase build
GATES_CONFIG_MODE=writable PW_PORT=4388 PW_OUTDIR=dist-journeys \
  FLOW_AUDIT_SHOTS=.cache/journeys/acceptance \
  npx playwright test tests/e2e/journal-debrief.spec.ts --repeat-each=2 \
  --output=.cache/journeys/acceptance-results --reporter=list,json \
  > .cache/journeys/acceptance.log
FULL_E2E=1 GATES_CONFIG_MODE=writable PW_PORT=4388 \
  FLOW_AUDIT_SHOTS=.cache/journeys/gates bash tools/gates.sh --full-e2e
```

Use the resulting Playwright durations for the six after rows and inspect the
fresh reward/Journal/debrief captures before accepting the change.
