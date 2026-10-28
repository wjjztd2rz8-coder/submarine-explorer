# S-bughunt-mission-flow — mission loop audit

Standing DIRECTOR item **S-bughunt**, brief 90; two review rounds on 2026-10-28.
Scope: scan → objective advance → debrief → replay, voluntary end/resume,
crush/supply aborts, hidden/visible tabs, phone rotation, and pause during scans.

## Round 1: confirmed delayed-start defect

If the player chooses Begin before Discovery finishes loading POIs and the
Journal guide, `Briefing.begin()` hides its card immediately. The router waits
for `discovery.ready` before applying the start pose and starting the mission.
Its freeze getter previously followed the card's visibility, so this waiting
interval admitted physics, Scan and session time while Mission was still in
`briefing`. On a slow content response the pilot could move before being
teleported to the eventual start pose.

Added two cases to the existing `overlayFocus.test.ts` capability suite. They
activate the real briefing through Enter and its Begin button, hold Discovery
readiness pending, and run the real shell and input gates with thrust/Scan
sampled. Both failed before the correction: eight physics steps, 0.25 seconds
of clock time and active thrust/Scan instead of a frozen frame. Evidence:
`/tmp/mission-flow-before.log` (**2 failed / 183 skipped**).

Minimal correction in `MissionRouter.frozen`: use the existing mission
`briefing` state until the start pose is applied, alongside the existing open
debrief condition. No additional lifecycle flag or listener. The tests also
verify one start-pose application, one `mission:started`, and restored simulation
and Scan admission after readiness. Both pass after correction; evidence:
`/tmp/mission-flow-after.log`.

## Round 2: interruption and replay boundaries

Reviewed existing production wiring and ran the established headless guards:

| Capability                    | Evidence and result                                                                                                                                                                                                                          |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Objective advance and debrief | `missionCore`, `missionRouter`, `missionApproachWaypoint`: optional-first/reversed scans, primary/all banners, unfinished optional progress, repeated voluntary end, and Keep exploring without duplicate completion.                        |
| Abort and replay              | `missionAbort`, `missionRouter`: crush and power ascents clear pending/open completion actions; aborted debrief cannot resume. Dive again resets objectives and reloads; previously logged discoveries can be scanned in the new run.        |
| Mid-mission persistence       | `missionCore`: reload retains Journal discoveries and starts fresh mission objectives with the opening target scannable. Resume from a voluntary debrief retains the current run; abort deliberately has no Keep exploring action.           |
| Pause during a partial scan   | `overlayFocus`, `gameScanner`, `appSystems`: paused progress neither advances nor decays; the hold clears, one interruption fires, active decay returns after resume, and a fresh hold records one completion.                               |
| Hidden/visible and blur/focus | `overlayFocus`, `appSystems`: hidden frames and the first returning interval admit no simulation or clock time, including a one-hour gap and both blur/visibility event orders.                                                              |
| Phone rotation                | `touchControls`, `touchControlsAudit`: resize/orientation release held Scan, stick, ballast and camera gestures, discard stale pointer motion and accept a fresh gesture. These are headless event tests, not physical-device layout checks. |

No second confirmed small defect was found. Existing assertions and gameplay
policies were preserved. No extra tests were added to duplicate these guards.

Remaining review limits and follow-ups:

- Begin still hides the card while content is pending. The fix freezes the dive
  during that interval; adding loading feedback or retry behavior would need a
  separate UI decision.
- The late `props:loaded` reframing callback in `systems/mission.ts` uses proximity
  to the initial pose as its eligibility check. Its behavior during a paused or
  debriefed dive remains an audit lead, not a reproduced defect in this package.
- Browser journey validation and real-phone rotation/layout/performance remain
  unverified because the browser test server is blocked in this sandbox.

## Validation

Focused headless command:

```bash
npm test -- --configLoader runner --cache=false tests/unit/overlayFocus.test.ts tests/unit/missionRouter.test.ts tests/unit/missionCore.test.ts tests/unit/missionAbort.test.ts tests/unit/missionApproachWaypoint.test.ts tests/unit/appSystems.test.ts tests/unit/touchControls.test.ts tests/unit/touchControlsAudit.test.ts tests/unit/gameScanner.test.ts
```

**9 files / 409 tests passed**; `/tmp/mission-flow-focused.log`.
After adding assertions for restored input admission, the two new regression
cases passed again in `/tmp/mission-flow-after.log`.

Searched `tests/e2e` for briefing, scan, debrief, abort/replay, pause, visibility
and rotation coverage. Relevant specs include `mission.spec.ts`,
`d-input-hud.spec.ts`, `f1-touch.spec.ts` and `f3-audio.spec.ts`.
Ran the affected mission cases against the gate build:

```bash
GATES_CONFIG_MODE=writable PW_PORT=4381 PW_OUTDIR=.cache/mission-flow-dist \
  npx playwright test tests/e2e/mission.spec.ts \
  -g 'briefing freezes the game; Enter starts near the site with objectives|scan bow and stern -> banner -> surface -> debrief|crush depth -> HULL FAILURE banner' \
  --output=.cache/mission-flow-e2e
```

Exit **1** before test execution: the configured preview process could not
start. A diagnostic run of the exact briefing case with `DEBUG=pw:webserver`
confirmed localhost checks fail with `connect EPERM` on both `::1:4381` and
`127.0.0.1:4381`. Logs: `/tmp/mission-flow-e2e.log` and
`/tmp/mission-flow-e2e-debug.log`. No browser, rendering or screenshot success
is claimed.

Required gate command:

```bash
GATES_CONFIG_MODE=writable PW_OUTDIR=.cache/mission-flow-dist bash tools/gates.sh
```

Gate run: `.cache/runs/20261028-144704-27-t0MA30/`;
combined log: `/tmp/mission-flow-gates.log`. Final results pending below.

## Simplicity and scope

The freeze decision now follows the existing mission state rather than a
transient presentation detail. No new production state, UI, settings, guidance
surface, site branches, dependencies or abstractions. The correction protects
comfortable piloting and the scan/Journal loop without changing content or
adding layout work. Visual quality and real-phone acceptance were not assessed.
