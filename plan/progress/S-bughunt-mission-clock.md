# S-bughunt-mission-clock

DIRECTOR item 16m; two audit rounds on 2026-11-10.

## Round 1 — late model loading reset a live dive

`systems/mission.ts` reapplied the start pose on `props:loaded` whenever the
sub remained within two metres of its opening. `Submarine.reset()` also clears
velocity, hull state and emergency ascent. An optional model completing after
Begin could therefore rewind a nearby pilot, including during Pause, an ascent,
or the debrief.

Added six failing cases to the existing mission-approach system tests: diving,
paused diving, primaries complete, power ascent, aborted, and debrief. All six
failed against the old callback; `/tmp/mission-clock-reframe-before.log` records
the position rewind. The tests also preserve velocity and the complete hull state.

Reframing now uses the existing open briefing and mission state. Removed both
cached opening fields and the proximity test. Two passing boundary cases retain
near-site/surface preview refreshes while the briefing is open and reject them
after Begin closes it. Home and URL-probe protection remains in the existing
start-pose function.

## Round 2 — briefing preview contaminated dive statistics

Discovery updated its positional statistics even with a zero clock delta during
the briefing. Previewing a deep opening then choosing a surface start retained
the preview's maximum depth and movement in the eventual debrief. The new real
Discovery/system regression failed with **3,800 m maximum depth / 15 m travel**
instead of the actual dive's **9 m / 5 m**; elapsed time was correctly one second.
Evidence: `/tmp/mission-clock-preview-before.log`.

Reset the existing statistics on `mission:started`, after the chosen pose has
been applied. No new clock, lifecycle flag or persistence format. Existing
restart/reset behavior remains covered.

Extended `missionCore` with 39 table-driven cases (all 13 sites × voluntary,
crush and power endings). They resolve every shipped objective, check primary
and total counts after duplicate/reversed/optional-first scans, retain current
counts and time through voluntary end/resume, start fresh on reload, exclude
briefing/debrief time, and distinguish completion credit from aborts. The shipped
catalogue contains 49 objectives, with two primaries at each site.

Existing capability guards additionally exercise the real loop through hidden
frames and visibility/blur/focus transitions, Pause and its first resumed frame,
completion-banner timing, crush lockout, power depletion and ascent to the
surface, non-dismissible aborts, replay, and persisted Journal rescans. No other
confirmed defect was found in these two passes.

## Validation

Focused command:

```bash
npx vitest run --configLoader runner --cache=false \
  tests/unit/missionApproachSystem.test.ts tests/unit/missionRouter.test.ts \
  tests/unit/missionCore.test.ts tests/unit/missionAbort.test.ts \
  tests/unit/powerSystem.test.ts tests/unit/power.test.ts \
  tests/unit/appSystems.test.ts tests/unit/overlayFocus.test.ts \
  tests/unit/subFixS.test.ts tests/unit/Submarine.test.ts \
  tests/unit/gameObjectives.test.ts tests/unit/discoveryReward1240.test.ts
```

**12 files / 409 tests passed**; `/tmp/mission-clock-focused.log`.

Searched `tests/e2e` for the changed capabilities. Relevant cases are in
`mission.spec.ts` (briefing, voluntary surface, crush), `d-power.spec.ts`
(depletion), `d-input-hud.spec.ts` (focus/pause), `content-missions.spec.ts`
(all-site objective lifecycle), and `opening-framing.spec.ts` (mission previews).
Browser attempts and gate results are recorded below.

Required gates:

```bash
GATES_CONFIG_MODE=writable PW_OUTDIR=.cache/mission-clock-dist bash tools/gates.sh
```

Combined log: `/tmp/mission-clock-gates.log`.

## Simplicity and scope

Production code is net smaller: remove two cached fields and their assignments;
reuse the briefing/mission state plus one existing-event statistics reset.
No new UI, guidance, settings, site branches, dependencies or layout work.
Tests extend existing capabilities; new source/test comments carry no package ids.
No visual or physical-phone acceptance is claimed.

## Browser attempt

```bash
GATES_CONFIG_MODE=writable PW_PORT=4390 PW_OUTDIR=.cache/mission-clock-dist \
  npx playwright test tests/e2e/mission.spec.ts tests/e2e/d-power.spec.ts \
  tests/e2e/d-input-hud.spec.ts tests/e2e/content-missions.spec.ts \
  tests/e2e/opening-framing.spec.ts \
  -g 'briefing freezes the game; Enter starts near the site with objectives|scan bow and stern -> banner -> surface -> debrief|crush depth -> HULL FAILURE banner|depletion ascends and debriefs safely|held keys and queued toggles are discarded|briefing to primary scans to debrief|mission previews and opens on an approach outside scan range' \
  --output=.cache/mission-clock-e2e
```

Exit **1** before any browser test: the configured preview server could not
start. `/tmp/mission-clock-e2e.log`. A second run with `DEBUG=pw:webserver`
on port 4391 and the exact briefing test confirms `connect EPERM` for both
`::1` and `127.0.0.1`; `/tmp/mission-clock-e2e-debug.log`.
Browser acceptance remains unverified in this sandbox.

## Integration follow-up

The first full gate run exposed an implementation assumption in `firstMove`:
its all-site late-props scenarios expected `Submarine.reset()` after Begin.
Updated that reset-count expectation for live missions and strengthened those
cases to require the real piloted pose, velocity and hull state to survive IO.
The original assertions protecting movement learning, authored-placement
reanchoring, Pause/resume, learned progress, restart and hull-loss replay remain.
The no-reset coasting branch applies only before learning, just as its existing
false-to-true assertions require; learned cases still assert that learning stays
true across IO and the next frame.

All **111 first-move integration cases passed** on the final tests, including
real shipped geometry for all 13 sites in both modes.
`/tmp/mission-clock-first-move.log`.

## Sandbox gate result

`tools/gates.sh` completed with **FAIL**. Run directory:
`.cache/runs/20261110-005120-3-iWmjix/`.

- **Pass:** writable config preparation; strict content validation; root and
  project-base build/typecheck; attribution. All changed files pass a separate
  Prettier check, and `git diff --check` passes.
- **Units:** the initial full run used the old first-move reset expectations:
  **195 files passed / 1 failed; 4,797 tests passed / 58 failed (4,855 total)**,
  in **1,009.94 seconds**. Every failure was the superseded live-mission reset
  expectation in `firstMove`. After the integration correction described above,
  that entire file passed **111/111** in 82.48 seconds. The 409 focused tests also
  pass. Production source did not change between the full run and that corrected
  integration rerun; the full 17-minute suite was not repeated after this test-only
  correction. This is verification across those runs, not a green full-gate claim.
- **Python:** five failures in untouched tooling: four build-manifest tests hit
  `spawnSync git EPERM`; the golden-comparison subprocess test fails parsing
  empty JSON output. Log: `python.log` in the run directory.
- **Browser:** root smoke and project-base gates stop before test execution
  because the preview server cannot start. The project-base build itself passes.
  Targeted capability attempts and localhost `EPERM` diagnostics are above.
- **Repository formatting:** the gate flags only the untouched
  `plan/OVERNIGHT-LOG.md`. Its contents were not changed by this work.

Sandbox scoped result: **520 focused/integration tests pass**, all 13 sites and
49 objectives audited, two confirmed defects fixed with seven failing-first unit
cases, plus two preview-boundary cases and 39 all-site lifecycle cases in existing
capability files. Browser acceptance remains outstanding.

## Orchestrator gate follow-up

The orchestrator ran `tools/gates.sh` outside the sandbox. Run directory:
`.cache/runs/20261110-011018-2207734-TDo1SG/`. Python, content, build, the full
unit suite, root browser smoke, project-base browser coverage and attribution
all passed. These results supersede the corresponding sandbox limitations above.
The only failure was Prettier in `plan/OVERNIGHT-LOG.md`: a missing blank line
between a heading and its list.

Applied Prettier to that file and verified repository-wide formatting with
`npx prettier --check .`, plus `git diff --check`. This follow-up changes only
Markdown formatting and validation records; no gameplay or test assertions
changed. The orchestrator's behavioral gates passed; the remaining formatting
gate now passes locally. The complete gate script was not repeated for this
formatting-only correction.
