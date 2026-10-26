# V-journeys-current: second-objective scan handoff

## Status

Carried the uncommitted extended `tests/e2e/journal-debrief.spec.ts` from
`codex/4330-V-journeys-second-leg` onto starting HEAD `42a5603c`. Corrected the
remaining driver defect. **Two passing browser rounds and a passing full gate
are still required.** This sandbox cannot start the preview server; no new
browser acceptance result is claimed. The Settings CSS and Settings capability
spec already on main are untouched.

## Remaining failure and cause

The supplied full gate in the preceding worktree,
`.cache/runs/20261026-024432-2107486-Buetfz/e2e.log`, reports 798 passed,
35 skipped and one failure: Titanic at 844×390 completed `titanic-big-piece`
instead of the second primary objective, `titanic-stern`.

The latest shared manifest starts at `2026-10-26T08:51:56.918Z`. A copy and its
two relevant screenshots are preserved in `.cache/journeys/evidence/`; older
orphan screenshots in the shared directory were not used as evidence.

The optional memorial scan card hides the touch waypoint label, but visibly
carries `Stern section · 149 m AHEAD`. The driver parsed distance only from the
hidden label. Parsing the resulting empty string produced NaN, so the existing
150 m slow-approach rule never applied while that optional card was showing.
It kept using the 8 m/s approach instead of 2 m/s until the stern became ready
at 99 m. Coasting down to the unchanged 0.8 m/s handoff threshold then consumed
most of the remaining distance.

At dive 259.093 s, the scan-ready capture shows the stern 28.863 m away,
31.703° off the level beam, with 0.79 m/s residual motion. At 265.343 s the
stern scan is 83% complete. The next recorded frame shows the Big Piece scan
at 3%: forward drift and slight upward buoyancy took the stern outside the
35° cone before reaching the 25 m all-direction close range. The test kept
holding scan through the visible change of target and completed Big Piece.
At the failure, the stern is 25.481 m away and 38.093° below the beam.

This establishes a spec-driver problem. The recorded scan-ready state really
was eligible; the driver subsequently left that pose. The reward names Big
Piece and points toward the still-outstanding Stern section, consistent with
the waypoint. No production guidance or target-selection change is justified
by this failure.

## Correction and retained coverage

The pilot now parses the visible objective AHEAD distance when the waypoint
label is absent. It uses the same slow-approach rule and native controls.
There are no new production branches, tuning values, UI elements or helper
modules. The imported journey extension still covers Home Aa, mission
selection, briefing, onboarding, real piloting, both primary scans, both
Journal entries, reward/waypoint agreement and two discoveries at debrief on
1280×720, 390×844 and 844×390. Exact scan identity, counts, both five-minute
limits and the existing layout assertions remain enforced. All rows remain
ordinary tests without skips or expected failures.

## Validation

- **Pass:** typecheck, repository-wide Prettier, `git diff --check`, content,
  production build and attribution. Logs are under `.cache/journeys/` and
  `.cache/runs/20261026-043309-4-9dW3TK/`.
- **Pass:** existing scanner and guidance capabilities, 193 tests in two files;
  `.cache/journeys/unit.log`.
- **Pass, recorded-input diagnostic:** execute the actual pilot helper from
  the spec against all 5,409 frames in the six latest captured traces. Desktop
  commands are unchanged. Changes on touch only release thrust when the
  missing waypoint's visible AHEAD distance calls for slowing down; turn and
  depth commands are unchanged. Script and results:
  `.cache/journeys/replay-controller.mjs` and `controller-replay.json`.
- **Pass, recorded-pose diagnostic:** run the production Scanner over the
  captured stern-hold poses. It reproduces stern start, stern abort for
  `facing`, Big Piece start and Big Piece completion. Marker positions are
  reconstructed from the recorded geometry solely for this diagnostic, never
  supplied to the journey pilot. Script and results:
  `.cache/journeys/replay-scanner.mjs` and `scanner-replay.json`.
  Neither diagnostic replaces browser/physics acceptance of the correction.
- **Discovery only:** the whole Journal/debrief spec with `--repeat-each=2`
  lists 106 cases, including all six unaided rows twice;
  `.cache/journeys/list.log`.
- **Blocked before execution:** whole Journal/debrief spec, two repeats;
  `.cache/journeys/acceptance.log`. Playwright reports `connect EPERM` for
  localhost and cannot start its preview server. No test body ran.
- **Full gate attempted:**
  `FULL_E2E=1 GATES_CONFIG_MODE=writable PW_OUTDIR=dist-journeys-gates timeout
--signal=INT 180s bash tools/gates.sh --full-e2e`;
  `.cache/journeys/full-gates.log`. Config, content and build pass. Python has
  five failures involving sandbox subprocess restrictions (including
  `spawnSync git EPERM`). Full unit prints only its RUN header before the
  timeout exits 124; browser phases are not reached. A separate full e2e
  launch also fails before execution with the same preview `EPERM`;
  `.cache/journeys/full-e2e.log`. This is not a passing aggregate gate.

## Acceptance on the browser-capable runner

```sh
npm run build
FLOW_AUDIT_SHOTS=.cache/journeys/acceptance \
  npx playwright test tests/e2e/journal-debrief.spec.ts \
  --repeat-each=2 --output=.cache/journeys/acceptance-results
FULL_E2E=1 bash tools/gates.sh --full-e2e
```

Both successful journey rounds must precede the full gate. Review new
manifests if any row fails; the captured-input replay does not predict the
changed route's full trajectory.
