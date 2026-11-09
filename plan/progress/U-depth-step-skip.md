# U-depth-step-skip — 2026-11-08

Investigated current main `9be23de8090951df13cfafdc8491e88a70075245` (the worktree started clean at that commit). No runtime change: the existing 15 m skip has not been reimplemented. The reported multi-minute walkthrough failure with a target within 15 m was not reproduced by the headless checks; browser reproduction remains blocked by the sandbox.

## Findings

- `Tutorial.update()` already rechecks `targetGapM` on every playing depth-step frame. Missing data on entry does not latch the step: a later qualifying sample advances it.
- `onboard.ts` supplies the next resolved mission scan objective's live target depth. `guide.waypoints` selects that objective before `hud.draw` runs. Free dives have no mission objective, so their absent gap does not establish a mission regression.
- A diagnostic using the real Low-tier heightmaps, procedural props, POI placement and `composedMissionSpawn()` measured **22 m**, rather than at most 15 m, between both authored mission openings and their first markers:

  | Mission          | Spawn world Y | First target world Y |  Gap |
  | ---------------- | ------------: | -------------------: | ---: |
  | Titanic          |         -3768 |                -3790 | 22 m |
  | Beebe vent field |  -4966.835609 |         -4988.835609 | 22 m |

  The initial clearance is hull radius 8 + seabed clearance 4 + spawn clearance 10 m. The existing skip therefore does not apply at these openings. This is a concrete condition under which depth coaching still appears, consistent with walkthrough-4's roughly 3770 m Titanic start. It does not establish the walkthrough-3 player's live gap throughout the approach. Diagnostic output is retained in `.cache/depth-opening-gaps.jsonl`.

- Journal's current-site opening was left intact. Its separate cold-load/breadcrumb investigation remains `U-journal-open-current` in `plan/DIRECTOR.md`.

## Change

Extended the existing onboarding system capability spec, `tests/unit/onboardCompletion.test.ts`, for keyboard, touch and gamepad. It exercises the real onboarding system and tutorial with an initially unresolved objective, a resolved objective whose scanner target arrives late, an unrelated level side find, a known target 22 m away vertically, and live gaps of 15.5 m then 15 m. Depth coaching advances without ballast input at 15 m; the earlier cases retain the step. This covers the integration missing from the existing pure tutorial boundary test.

No UI, guidance surface, layout, settings, site branches or runtime policy changed. No cut or redesign was made, so no changelog entry is warranted. Raising the threshold to cover a 22 m opening would change the requested 15 m policy rather than repair the existing skip's data path.

## Validation

- PASS: focused onboarding capability units, **2 files / 66 tests**, including the three added device cases:
  `npm test -- --configLoader runner --cache=false tests/unit/onboardCompletion.test.ts tests/unit/f3Onboard.test.ts`.
- Searched `tests/e2e` for tutorial/depth coverage. Attempted the existing capability cases with:
  `GATES_CONFIG_MODE=writable PW_OUTDIR=.cache/depth-step-dist PW_PORT=4319 npx playwright test tests/e2e/f3-onboard.spec.ts -g 'desktop: tutorial starts, advances, skips and stays skipped after reload|scan coaching waits through held progress and interruption until completion'`.
  Playwright discovers both cases, but execution stops before assertions because preview cannot start. Direct preview confirms `listen EPERM 127.0.0.1:4319`. Log: `.cache/depth-step-playwright.log`. No browser pass or visual reproduction is claimed.
- Full requested gate run: `GATES_CONFIG_MODE=writable PW_PORT=4319 bash tools/gates.sh` — **failed/incomplete**, not green. Content and production build (including TypeScript) passed. Python reported **164/169 passed**: four build-manifest tests fail on sandbox `spawnSync git EPERM`; the golden tooling wrapper also fails because its CLI report stdout cannot be parsed as JSON. These failures precede the changed capability tests. The full unit stage produced no test results for roughly two minutes and was interrupted (exit 130), so later gates were not reached. A separate full thread-pool attempt likewise produced no test results for roughly 90 seconds and was interrupted. Logs: `.cache/depth-step-gates.log`, `.cache/runs/20261108-161833-3-FjjPdK/`, `.cache/depth-step-unit-threads.log`. Neither full unit attempt is counted as a pass.
- PASS separately: `npx tsc --noEmit`, repository-wide `npx prettier --check .`, `python3 tools/check_attribution.py`, and `git diff --check`. No source or test assertion was relaxed to work around the environment.

Disposition: no qualifying skip defect found in headless checks; the exact walkthrough remains unverified until a runner permitting localhost preview can replay it and record the live objective gap. No speculative runtime patch shipped.
