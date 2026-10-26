# R-ci-green — 4440 hosted CI flake audit

Status: test-only fixes pass focused local acceptance. The full gate is not green
because its unit phase times out. Hosted green is not established for these
unpushed changes. Audit date: 2026-10-26.

## Plan and evidence

1. Read the newest main CI runs after 4380/4390; collect every failing test and
   distinguish driver errors from timing failures and product regressions.
2. Make minimal test-only corrections, preserving journey gating and assertions.
3. Cover the removed physical transit in the existing approach capability spec.
4. Repeat affected cases twice and run `tools/gates.sh`; report actual results.

Network works. All GitHub operations were read-only. `gh run list --branch main`
and `gh run view RUN --log-failed` were used. The installed gh 2.45 returned empty
output for all three completed runs' failed logs, including a direct job `--log`.
Read the same logs through `gh api repos/wjjztd2rz8-coder/submarine-explorer/actions/runs/RUN/logs`
and individual `/actions/jobs/JOB/logs` instead. Downloaded two failure artifacts
for their browser snapshots; no CI rerun, workflow change or remote write.

All three audited commits contain the merged 4380 and 4390 changes:

| Run                                                                                                             | Commit     | Result  | Failed tests / browser shards |
| --------------------------------------------------------------------------------------------------------------- | ---------- | ------- | ----------------------------- |
| [166: 40361391986](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40361391986)             | `084626c6` | failure | 18 / 16                       |
| [167: 40372062119](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40372062119)             | `b71cb0be` | failure | 15 / 15                       |
| [167, later push: 40373699456](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40373699456) | `2d37212f` | failure | 15 / 15                       |

All static checks, both builds and the project-base job succeeded in all three
runs. The later run finished during this audit: all its failed job logs were
read, confirming the same 12 settings and three Blue Hole failures, with no
additional failing specs. The newest push,
[40381379329](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40381379329),
was queued at the latest snapshot; 40381361987 was cancelled. Neither is evidence
of green.

Exact failure blocks and run/job metadata are retained locally in
`.cache/4440/hosted-failures.txt` and `.cache/4440/run*.json`.

## Failing specs and classification

`settings.spec.ts:223`, “scale survives TIER quality and mode combinations from
SURFACE”, fails in **every** combination below in all three completed runs. These are
12 tests, not twelve different causes:

| Viewport        | Tier   | Surface | Shard |
| --------------- | ------ | ------- | ----- |
| phone-portrait  | low    | home    | 29/38 |
| phone-portrait  | medium | home    | 28/38 |
| phone-portrait  | high   | home    | 22/38 |
| phone-portrait  | low    | dive    | 25/38 |
| phone-portrait  | medium | dive    | 27/38 |
| phone-portrait  | high   | dive    | 33/38 |
| phone-landscape | low    | home    | 17/38 |
| phone-landscape | medium | home    | 32/38 |
| phone-landscape | high   | home    | 4/38  |
| phone-landscape | low    | dive    | 38/38 |
| phone-landscape | medium | dive    | 31/38 |
| phone-landscape | high   | dive    | 37/38 |

Error: `locator.click: Test timeout of 60000ms exceeded`, waiting for
`locator('.settings').getByRole('button', { name: 'Advanced', exact: true })` at
**settings.spec.ts:250**. **Driver**, not a reason to raise the timeout: the error
snapshot contains `button "Advanced ▾"`. `src/styles/modes.css` supplies the
pseudo-element arrow, which contributes to the accessible name. Match the
bounded name with its disclosure arrow, then assert `aria-expanded="true"` and
that the Advanced panel is visible. The 60 s budget, all nine mode/scale
combinations per tier, persistence, booted tier, overflow and rotation checks
remain. All six Aa tests already pass in both hosted runs (3.4–11.6 s in run 167).

`journal-debrief.spec.ts:1542`, Great Blue Hole “Home -> first scan -> Journal ->
second scan -> Journal -> debrief”, fails at **all three viewports** in all three runs:
1280×720 (21/38), 390×844 (14/38), 844×390 (1/38).
Error at **:1818**, “Set scan pose: great-blue-hole-stalactites-east”:
`Expected: "great-blue-hole-stalactites-east"; Received: null`. **Driver**:
the artifact snapshot shows the submarine surfaced, depth 0 m, with the eastern
gallery 45 m below it. The generic south-of-contact debug spawn can land on the
shallow reef; it is unsuitable for this scan's minimum depth and aim. Observe
this contact from 40 m north, inside the bowl, with its depth clamped above the
real terrain and hull clearance. Keep the exact candidate assertion, real held
scan, exact completions, rewards on two frames, waypoint agreement, both Journal
visits, two-discovery debrief and all clipping/overlap/touch checks. All six
journeys remain ordinary gating tests; none is skipped or tagged diagnostic.

Three additional failures occur only in run 166, together on shard 13/38:

| Spec and test                                                                           | Exact error / location                                                                                                        | Classification and follow-up                                                                                                                                                                                                                         |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `f-briefing-900.spec.ts:17`, Titanic compact briefing 1600×900                          | `page.screenshot: Test timeout of 240000ms exceeded`, `waiting for fonts to load...`, **:67**                                 | Timing, provisional. Run 167 passes in 1.1 min. Measure font readiness and the earlier UI steps; consider paused rendering with explicit frames. Keep the screenshot and fit/axe assertions.                                                         |
| `f-verify-1000.spec.ts:140`, 1600×900 Monterey Canyon low approach/scan/Journal/debrief | `Test timeout of 240000ms exceeded`; cleanup reports `keyboard.up: Target page, context or browser has been closed`, **:200** | Timing, provisional; teardown obscures the original in-flight operation. Run 167 passes in 44.9 s. Attach approach/scan stage timings and preserve the original exception during cleanup; retain displacement, clearance and scan completion guards. |
| `f3-onboard.spec.ts:457`, touch PHOTO capture, Done, movement and Pause                 | `Test timeout of 240000ms exceeded` at **:510**, `expect.poll(() => stepIndex(page)).toBe(3)` after `completeScan`            | Timing, provisional; run 167 passes in 1.9 min. Capture tutorial index and scan identity before/after completion, then bound frame pumping around that handoff. Keep the exact tutorial-step and touch reachability assertions.                      |

These three do not justify assertion changes or product changes from the available
evidence. No confirmed product regression is reclassified as a harmless flake.
Their proposed follow-ups remain separate from the two reproducible driver fixes.

## Unaided-pilot coverage

**Yes, 4380 leaves a hole.** Two POI resets prove scan/UI integration but cannot
prove movement from the opening to the first objective and onward to the second.
Separate input, pose and scan tests do not compose those two transits.

Added two named cases to the existing `tests/unit/missionApproach.test.ts`
capability matrix: Titanic and Great Blue Hole, Low/Arcade, “pilots from the
opening through two primary scans without teleporting”. They use shipped
heightmaps/carves and POIs, composed opening, effective mission-capped scan
radii, real Submarine, PropContact, Scanner and Mission events. After the opening,
a bounded controller uses heading/range and relative-depth cues to move and hold
the beam; each leg must finish within 300 simulation seconds, move over 10 m,
scan the exact objective, preserve the hull and ultimately complete two primaries.
No position reset occurs between those legs and completion is never injected.
The Blue Hole case also checks the revised browser observation pose against real
terrain, candidate selection and two normal physics/contact frames before starting
the independent piloting route.

Scope limit: this capability shares the existing fixture's procedural-prop
filter (GLBs are excluded), and consumes numeric navigation cues rather than
parsing visible guidance. It restores a terrain/physics two-leg reachability
guard, not proof that a novice can interpret the touch copy unaided. Browser
journeys continue to gate the visible UI and its input modalities.

## Validation

Browser execution works in this session, unlike the environments documented in
4380/4390. Results:

- **48/48 browser executions passed**, retries disabled: six two-objective
  journeys, six Aa cases and twelve tier/mode/scale cases, each repeated twice.
  Total 6.4 min. Command:

  ```sh
  CI=1 GATES_CONFIG_MODE=writable PW_OUTDIR=dist-4440 PW_PORT=4441 \
    FLOW_AUDIT_SHOTS=.cache/4440/acceptance \
    npx playwright test tests/e2e/settings.spec.ts tests/e2e/journal-debrief.spec.ts \
    --grep 'two-objective scan journey|scale survives|Aa cycles' \
    --repeat-each=2 --retries=0 --global-timeout=540000 \
    --output=.cache/4440/acceptance-results --reporter=list
  ```

  The external safety limit was 600 s. An earlier attempt used an insufficient
  90 s harness cap: 11 passed and the twelfth was interrupted; that interruption
  is superseded by the complete clean run, not counted as a product failure.

- **60 focused unit tests passed** across `missionApproach`, `progressScan`,
  `e2eScan` and `settingsScreen` (73.71 s), with writable config, one thread
  worker and isolation disabled for this focused invocation. After the final
  PropContact/held-input refinement, both new pilot cases passed in two more
  independent runs (3.33 s and 2.68 s including setup).
- **Project-base gate passed, 8/8 browser tests** (1.4 min), against a separately
  built `/submarine-explorer/` artifact with its matching build manifest.
- Typecheck, production builds for both bases, attribution, repository-wide
  Prettier and `git diff --check` pass. Python gate: **167 tests pass**.
- Required aggregate invocation:
  `GATES_CONFIG_MODE=writable timeout --signal=INT 240s bash tools/gates.sh`.
  Config, Python, content and build pass; the external 240 s deadline interrupts
  the unit phase after its RUN header, exit 124. No successful full unit gate
  is inferred from the smaller focused runs.
- A diagnostic aggregate retry preserves the gate script and unit isolation,
  running only `npm test` through `timeout --signal=INT 300s` with
  `--pool=threads --maxWorkers=2`, via an exported shell function. Other npm
  commands run normally. This unit phase also expires without any file results.
  Root smoke passes **3/3** and project-base passes **8/8** (1.0 min).
  Config, Python, content, build, attribution and Prettier pass; aggregate exit
  is **1**, solely because the bounded full unit phase did not finish.
  No repository timeout, retry, quality or workflow setting was changed.

Full-suite `--full-e2e` was not run; the targeted two-repeat suite and default
smoke/project-base gate are the browser validation here.

Fresh journey wall seconds from their persisted manifests:

| Site | Viewport | Round 1 | Round 2 |
| ---- | -------- | ------: | ------: |

| titanic | 1280x720 | 19.77 | 16.09 |
| titanic | 390x844 | 13.61 | 11.81 |
| titanic | 844x390 | 12.91 | 11.47 |
| great-blue-hole | 1280x720 | 16.35 | 13.89 |
| great-blue-hole | 390x844 | 16.16 | 13.40 |
| great-blue-hole | 844x390 | 14.76 | 12.98 |

Screenshots and manifests are under `.cache/4440/acceptance/round-{1,2}/`.
Visually inspected the fresh landscape Blue Hole second reward and portrait
Blue Hole debrief: Eastern stalactite gallery is logged at 24 m depth, the touch
controls remain separate, and the debrief reads two scans / two objectives.
Logs are retained in `.cache/4440/`; aggregate diagnostic run artifacts are in
`.cache/runs/20261026-140205-8-RZwURj/`.

Final hosted check at approximately 19:09 UTC: 40373699456 is completed/failure,
40381379329 remains queued. This audit establishes local acceptance of the two
driver corrections; R-ci-green must remain pending until a new hosted run with
these changes finishes green and the full local unit gate can be verified.
