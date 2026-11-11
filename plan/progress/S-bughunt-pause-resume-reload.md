# S-bughunt-pause-resume-reload

Brief 193, DIRECTOR item 16n; two audit rounds on 2026-11-11.

## Round 1 — skipped briefing started before content and pose readiness

Reloading a `skipBriefing=1` mission started its clock immediately, while the
starting pose was deferred until `discovery.ready`. With slow content, the loop
could count loading as dive time and permit piloting before the late pose reset.

Added a deferred-content regression in the existing `missionRouter` capability
tests before changing production code. It failed because `router.frozen` was
false before readiness (`/tmp/pause-reload-before.log`). The test also checks
zero loading time, no end-dive action, pose application before `mission:started`,
one start event, frozen Pause/resume intervals, and normal clock advancement
afterward.

Removed the independent early-start branch and reused `begin()`. Both entry
paths now use the existing briefing mission state to withhold simulation until
the pose is applied. Read an unspecified start choice after readiness so pending
settings edits retain their existing behavior; explicit Begin choices still win.
No new loading state, clock, event, persistence format or UI.

## Round 2 — interruption and reload boundaries

Audited the real loop's visibility/blur/focus reset, hidden throttled frames,
Pause and debrief, fractional physics steps and first resumed interval. Existing
`appSystems` coverage includes repeated phone interruption pairs without a
visibility event. Existing `overlayFocus` cases run real keyboard/touch scans
through Pause, Journal, debrief, hide/show and either ordering of blur/visibility,
retaining progress while frozen and requiring a fresh press afterward.

Reviewed keyboard clear/baseline handling and touch pointer release on overlay
open, visibility loss, resize and rotation. Existing reload tests preserve saved
Journal records while discarding partial scans, objective completion and the old
mission clock; all targets remain scannable in the new dive. No further defect
confirmed.

The power integration tests formerly installed their reset spy after the early
start. They now verify the deferred start's reset explicitly, wait for the actual
reserve queue boundary, then check that disposal removes the listener. Reserve,
Pause, Home, cancelled-start and listener-count assertions remain intact.

The delayed-content first-move cases now require zero clock, physics and learning
before readiness. After readiness they retain the same real-motion thresholds,
then load optional props and require the live pose, velocity and hull state to
survive. The Home-cancellation test now requires zero start events for both
entry paths, strengthening its old skipped-briefing exception.

## Validation

Focused command (final-source rerun recorded below):

```bash
npx vitest run --configLoader runner --cache=false \
  tests/unit/missionRouter.test.ts tests/unit/missionCore.test.ts \
  tests/unit/appSystems.test.ts tests/unit/overlayFocus.test.ts \
  tests/unit/subInput.test.ts tests/unit/touchControls.test.ts
```

Final-source focused run: **410 tests passed**.
Log: `/tmp/pause-reload-focused-final.log`.

The complete existing `firstMove` integration capability passed **111/111**,
including pending settings and opening placement through both mission entry
paths (`/tmp/pause-reload-first-move-final.log`). The complete `arcadeLoadout`
capability passed **69/69**, including cancelled pending starts
(`/tmp/pause-reload-loadout-final.log`). Total: **590 tests / eight files passed**.

Searched `tests/e2e` for pause, visibility, reload and mission-clock capabilities.
Extended `mission.spec.ts` with desktop and phone cases: preserve Pause after
hide/show, resume the clock, then delay POI loading on reload and require zero
clock/start events until content is ready. Existing keyboard cancellation and
scan/Journal persistence tests were also selected for browser validation.

```bash
GATES_CONFIG_MODE=writable PW_PORT=4394 PW_OUTDIR=.cache/pause-reload-browser-dist \
  npx playwright test tests/e2e/mission.spec.ts \
  -g 'pause and visibility stay frozen; slow reload excludes content loading time|briefing freezes the game; Enter starts near the site with objectives|scan bow and stern -> banner -> surface -> debrief' \
  --output=.cache/pause-reload-e2e

DEBUG=pw:webserver GATES_CONFIG_MODE=writable PW_PORT=4395 \
  PW_OUTDIR=.cache/pause-reload-browser-dist \
  npx playwright test tests/e2e/d-input-hud.spec.ts tests/e2e/journal-debrief.spec.ts \
  -g 'held keys and queued toggles are discarded across focus loss and pause/resume|scan the bow, persist across reload, open the Journal' \
  --output=.cache/pause-reload-input-journal-e2e

GATES_CONFIG_MODE=writable PW_PORT=4393 PW_OUTDIR=.cache/pause-reload-dist \
  bash tools/gates.sh
```

Final-source build/typecheck passed (`/tmp/pause-reload-build.log`). Both targeted
browser commands exited **1 before test execution**: the preview server could not
start. The second command's debug output confirms `connect EPERM` on both `::1`
and `127.0.0.1`. Logs: `/tmp/pause-reload-e2e.log` and
`/tmp/pause-reload-input-journal-e2e.log`. No browser or physical-phone acceptance
is claimed.

The Playwright filters select **six tests in three existing capability files**,
including both new input layouts; discovery listing passed
(`/tmp/pause-reload-e2e-list.log`). Listing is not browser acceptance.

## Full gate result

`tools/gates.sh` completed with **FAIL**, run directory:
`.cache/runs/20261111-003312-3-DvsWm6/`. Combined log:
`/tmp/pause-reload-gates.log`.

- **Pass:** writable config preparation, strict content validation, root build /
  typecheck, attribution and repository-wide Prettier. The project-base build
  also passed before its browser setup failed.
- **Units:** **193 files passed / three failed; 4,854 tests passed / nine failed
  (4,863 total)** in **1,226.81 seconds**. This gate began before the integration
  corrections were complete, so workers retained an intermediate implementation
  and earlier test expectations. Four failures were pending start defaults in
  `firstMove`, four were deferred power reset/queue assumptions in `overlayFocus`,
  and one was the skipped-briefing exception to Home cancellation in
  `arcadeLoadout`. The final-source reruns above pass these entire files, plus
  the other five focused capabilities: **590/590**. The full unit gate was not
  repeated after those corrections; this is not a green full-gate claim.
- **Python:** five failures in untouched tooling. Four build-manifest cases
  report `spawnSync git EPERM`; the golden-comparison subprocess case reports
  `Unexpected end of JSON input`. These match the previously documented sandbox
  failures in the mission-clock audit. Log: `python.log` in the run directory.
- **Browser:** root smoke and project-base gates both fail before test execution
  because the preview server cannot start. The independent targeted attempts
  above confirm localhost `EPERM` on both IP families.

All changed files pass their final formatting check, and `git diff --check`
passes. No gameplay changes followed the final-source build and passing unit
reruns; only validation records were completed afterward.

## Simplicity

Cut the separate skipped-briefing start sequence: production code is net smaller.
Reuse the existing mission state and Begin callback. No new guidance, settings,
site branches, dependencies, visual changes or package numbers in code/comments.
Tests extend existing capabilities. Cut logged in `CHANGELOG.md`.
