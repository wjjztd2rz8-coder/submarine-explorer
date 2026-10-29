# S-bughunt: Home → first objective → debrief

2026-10-29. Two review rounds for brief 112, standing item **S-bughunt**.
Browser execution is **blocked before Home** by localhost `EPERM`. The new
journey is implemented and typechecked; successful piloting, screenshots and
rendered overlap acceptance remain unverified. No production defect was
reproduced, so no gameplay or art changes were made.

## Round 1: trace the ordinary journey and close the coverage gap

Read the simplicity rules in `plan/DIRECTOR.md` and searched `tests/e2e` for
Home/site selection, briefing, first-objective scans, touch controls and
Surface/debrief coverage. Relevant capability specs: `phone-accept.spec.ts`,
`journal-debrief.spec.ts`, `hud-touch.spec.ts`, `mission.spec.ts` and
`d-shell.spec.ts`. Existing phone acceptance moves the sub directly into scan
range with `faceContact`; the mission progression tests also place it at POIs.
Those checks cannot prove the piloted opening approach.

Extended **`tests/e2e/phone-accept.spec.ts`** with
**“Home to first objective to debrief without teleporting”** at **390×844** and
**1280×800**. Both use native touch on the visible dock; the desktop-sized case
has `isMobile: false`. This is desktop-sized on-screen-control coverage, not a
desktop keyboard/mouse acceptance claim: those inputs hide the touch dock.

The test starts with empty browser storage and navigates only to Home
(`/?tier=low&touch=1`). It then:

1. Taps Dive sites, expands the portrait sheet, selects Titanic, reads the
   first briefing objective and taps Begin dive.
2. Checks that the opening waypoint is visible and more than 100 m away;
   debug placement and skip/debrief URL probes must be absent.
3. Performs the movement and depth lessons through the stick and slider.
   Then uses the visible scan lesson's Skip button to expose the objective's
   steering instructions. It follows visible TURN/RISE/SINK/Get closer text
   using native touch gestures, without reading internal target geometry.
4. Holds the visible SCAN button while the normal loop advances, verifies
   “New Journal entry”, “Bow section” and the scanned waypoint, and checks HUD
   geometry at opening, in range and after the scan.
5. Taps Pause → Surface and debrief; checks **1 of 2 primary objectives**, one
   discovery and “Scanned Bow section.” It then uses More → Home and verifies
   the next-dive action is reachable, guarding the exit from debrief too.

Every action checks full viewport bounds and centre hit-testing before input;
no forced click, pose reset, injected input state, synthetic mission event,
scanner update call, saved progress or unlocked-player fixture is used.
`__game` is read only for boot/content readiness. The Playwright clock advances
the ordinary rendered loop in 100 ms frames, below its physics backlog cap.
The test allows at most five minutes of driven dive time; loading, menu
reading and headless-rendering wall time are not a timed usability measurement.

## Round 2: adversarial checks and evidence

Reviewed the test for assisted shortcuts, hidden-state steering, coverage of
both layouts, held-input release, bounded progress, clipped actions and a
reachable debrief exit. Touch gestures release in `finally`. The piloting loop
fails if visible guidance never leads to a scannable bow; it cannot silently
settle for an empty debrief. Existing assertions were retained.

Each run attaches numbered screenshots and **`journey.json`**, including the
last stage, URL, visible page text, guidance/action history, simulated dive
time, page errors, and visible controls' rectangles, offscreen flags and centre
occluder HTML. Checkpoints cover Home, picker, briefing, opening, scan range,
first objective, Pause, debrief and return Home. A final snapshot is attempted
on failure; snapshot errors are recorded without discarding the JSON evidence.

| Observation                                  | Status                                                                                                                                                                                                                                                             |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| First browser stall                          | Before navigation: Playwright cannot start/check its preview server. Debug output reports `connect EPERM` for both `::1:4192` and `127.0.0.1:4192`.                                                                                                                |
| Overlay covering controls / in-game dead end | Not observed: no browser test body executed. The new bounds, hit-test and HUD guards will report these when execution is available.                                                                                                                                |
| Scan lesson versus steering                  | Code-traced limitation: tutorial guidance outranks the objective's turn cue until a scan completes. This test explicitly taps Skip for that lesson. Completing all tutorial steps without Skip remains unproven; no browser-confirmed usability defect is claimed. |
| Production fixes                             | None: this environment supplied no reproduced gameplay defect to justify one.                                                                                                                                                                                      |

No screenshots were generated by this task. No claim of visual quality,
real-phone performance, successful unaided play or hosted CI is made.

## Validation and reproduction

- TypeScript and the production build passed. The default Vite loader cannot
  write its temporary config under the shared read-only `node_modules`; runner
  loading also fails in the existing PWA close hook. Bundling the existing
  config locally and using the native loader succeeds, including PWA stamping.
- Focused tutorial, mission-router and touch-control unit tests: **3 files,
  98 tests passed**, using one worker:
  `npm test -- --configLoader runner --cache=false --maxWorkers=1 tests/unit/f3Onboard.test.ts tests/unit/missionRouter.test.ts tests/unit/touchControls.test.ts`.
  Full-suite attempts with forks and threads produced only the runner startup
  line and were interrupted. A single-worker attempt timed out after 120
  seconds (exit **124**) with no results. Full-unit acceptance remains
  unverified; no test-failure count can be inferred.
- Python: **167 tests, 162 passed, 5 failed**. Four build-manifest cases fail
  with `spawnSync git EPERM`; golden tooling fails parsing empty subprocess
  output (`Unexpected end of JSON input`). These files were not changed.
- Playwright collection with `--repeat-each=2 --list`: **4 selections**, two
  sizes across two scheduled passes. Collection is not execution. Targeted
  execution of the final journey exited **1** at web-server startup.
- Searched existing e2e capability cases and also attempted Home destination,
  large-scale briefing/HUD, and Arcade scan/Journal/debrief tests with
  `npx playwright test tests/e2e/phone-accept.spec.ts -g '<test names>'`.
  These and the full `npm run test:e2e` attempt exited **1** at server startup.
- Logs: `/tmp/journey-build.log`, `/tmp/journey-unit-focused.log`,
  `/tmp/journey-unit.log`, `/tmp/journey-unit-threads.log`,
  `/tmp/journey-unit-single.log`, `/tmp/journey-python.log`,
  `/tmp/journey-e2e.log` (localhost debug evidence),
  `/tmp/journey-e2e-final.log`, `/tmp/journey-capabilities.log` and
  `/tmp/journey-full-e2e.log`.
- Changed-file Prettier and `git diff --check` passed. The owned
  `dist-journey` build output was removed after validation.

Rebuild and run both layouts twice where localhost access is available:

```bash
node --input-type=module <<'JS'
import { build } from 'rolldown';
await build({
  input: 'vite.config.ts', platform: 'node', external: ['vite'],
  output: { file: '.cache/journey.vite.config.mjs', format: 'esm' },
});
JS
npm run build -- --outDir dist-journey \
  --config .cache/journey.vite.config.mjs --configLoader native
GATES_CONFIG_MODE=writable PW_PORT=4192 PW_OUTDIR=dist-journey \
  npx playwright test tests/e2e/phone-accept.spec.ts \
  -g 'Home to first objective to debrief without teleporting' \
  --repeat-each=2 --output=.cache/journey-e2e
```

This extends the existing acceptance capability only: no new runtime state,
guidance surface, settings, site branches, layout patches or dependencies.
`DIRECTOR.md` was left unchanged. No commit, merge or push was performed.
