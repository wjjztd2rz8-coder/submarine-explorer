# R-journey-guidance — shared destination and objective guidance

2026-10-28. Implemented against `93afeeddaf67d5e496f41aa2edf8cf88ee0470e0`.
Evidence: [journey findings 1, 4 and 10](62-T-journey-acceptance.md), captured
against `20f2198a874294fc49500e0d6cb85b965928af1d`.
Browser acceptance remains pending: this sandbox cannot start or connect to the
Playwright preview. No fresh screenshots or passing full gate are claimed.

## Changes

- Home's `setDiveSite` now writes both `Dive: <site>` and `<site> · Next dive`.
  Remove the title renderer's independent caption writer. Catalogue arrival,
  saved destinations, missing saved sites and mission changes share that path.
  The caption describes the next dive; it does not relabel the decorative
  Monterey backdrop as another site's bathymetry. Terrain failure leaves the
  destination unchanged.
- Idle guidance follows the current mission objective ahead of optional fish,
  samples or arrival contacts. Its name, range and phone steering use that
  objective's geometry. Holding Scan still scans the eligible contact and
  displays the actual active target; results retain their discovery identity.
- `nextScanObjective` supplies the common order: unfinished resolved primaries,
  then unfinished resolved optionals. Replace desktop navigation's separate
  nearest-target algorithm with that selector. Waypoints and sonar retain the
  same order; onboarding reads the frame's selected objective and prioritizes
  its distance over a nearby optional contact.
- Give the scanner a live objective resolver and refresh objective geometry
  after completion listeners advance the mission. Refresh desktop navigation
  synchronously with objective changes using the latest pilot pose. This also
  fixes completion snapshots taken between rendered frames: the mission list,
  navigation name and phone direction agree before another frame is allowed.

Net simpler: remove an independent caption writer, the competing nearest-objective
selection, the late waypoint scanner setter and the optional-name/primary-direction
copy branch. Production changes remove 3 lines overall. The existing guidance
slot is the only text-guidance surface used; no element, CSS/layout patch, site
branch, setting or dependency was added. Settings continue using resolved values.

## Capability coverage

- `d-shell.spec.ts`: three Home destination cases (first visit, saved Blue Hole,
  missing saved site), checking caption/button agreement and the launched URL.
- `d-scan.spec.ts`: opening primary guidance beside a deterministic ready fish,
  across desktop and both phone orientations; synchronous completion checks for
  Titanic and Blue Hole at the same three sizes. Phone completions hold the real
  touch Scan control. The paused clock prevents an extra frame from hiding the
  regression. These are nine additional scan-guidance cases, plus three Home cases.
- Extend existing unit guidance, navigation, onboarding and Home capabilities.
  The all-site/mode reward table now checks next-target geometry in the completion
  frame. Add a direct navigation-event assertion before any subsequent frame.
- Update assertions that explicitly required the old competing optional prompt
  or nearest-objective order to require the requested shared objective instead.
  Range, bearing, depth, scan locking, result grace, interruption, warnings,
  persistence, touch reachability and lifecycle assertions remain covered.
  The waypoint integration fixture now runs discovery's selection stage before
  its waypoint stage, matching production ownership.
- Home's launch check reads the exact `mission` URL parameter. The completion
  matrix requires the next target's phone cue immediately; the existing cleared-cue
  assertion still checks that a fresh result cannot retain old directions.

## Checks actually run

- `npm run typecheck`: passed after application and browser-test changes.
- Focused Vitest run: **708 passed in 12 files**. Log:
  `.cache/journey-guidance/review-unit.log`. After strengthening the immediate
  direction and cleared-cue assertions, all **148 guidance tests** passed again
  (`review-guidance-unit.log`). The additional `arcadeLoadout` coverage also
  passed in an earlier six-file, 298-test run.
- `tools/gates.sh --full-e2e`, with isolated ports/builds and
  `GATES_CONFIG_MODE=writable`: the latest attempt used port 4393 and a
  300-second timeout, exiting **124** while the full unit runner remained at its
  RUN header. Content and production build/typecheck passed. Python ran 167 tests:
  **162 passed, 5 failed** (four build-manifest tests report `spawnSync git EPERM`;
  golden tooling reports `Unexpected end of JSON input`). Latest logs:
  `.cache/journey-guidance/review-gates.log` and
  `.cache/runs/20261028-223138-4-BmNsfp/`. Earlier attempts are retained in the
  same cache tree; none provides a passing full gate.
  Root/base browser and later gates were not reached by the aggregate run.
- A single-worker verbose full-unit diagnostic also timed out (150 seconds),
  after reporting 1,765 successful tests and no failed assertions. This confirms
  expensive geometry work was progressing; it is not a full-unit pass. Log:
  `.cache/journey-guidance/review-full-unit-verbose.log`.
- Required targeted browser commands were executed with `npx playwright test
<spec> -g '<test name>'`: the new Home/opening/completion cases (each requested
  with `--repeat-each=2`), existing two-objective journeys (also twice), mission
  bow/stern flow, title canvas/fallback, title layout/fallback audit and onboarding
  scan-priority checks. Each stopped at preview startup before assertions.
  Separate full Playwright suite attempt: same startup failure. Logs:
  `.cache/journey-guidance/*-e2e.log`.
- A debug preview attempt established the restriction: localhost checks fail
  with `connect EPERM` for both `::1` and `127.0.0.1`. No gameplay assertion was
  skipped, loosened or retried away to obtain a browser pass.
- Fresh required targeted attempts used the isolated production build
  `dist-journey-guidance-review` and separate ports 4394–4396:

  ```bash
  npx playwright test tests/e2e/d-shell.spec.ts -g 'Home button and caption share the launch destination' --repeat-each=2
  npx playwright test tests/e2e/d-scan.spec.ts -g 'opening guidance and phone directions follow the primary beside optional wildlife' --repeat-each=2
  npx playwright test tests/e2e/d-scan.spec.ts -g 'completion advances navigation and direction in the same frame' --repeat-each=2
  ```

  All three exited 1 before assertions; debug logs show `connect EPERM` on both
  localhost addresses. The existing two-objective journey (two repeats), animal
  guidance and sample guidance selections, plus a separate full-suite attempt,
  also stopped at preview startup. Logs: `.cache/journey-guidance/review-*-e2e.log`.

- Fresh Playwright discovery for the affected and adjacent specs: **181 tests in
  8 files**, passed (`.cache/journey-guidance/review-e2e-discovery.log`).
- Attribution check, repository Prettier check and `git diff --check`: passed
  independently of the interrupted aggregate gate.

For browser-capable acceptance, run `tools/gates.sh --full-e2e`, then the targeted
`d-shell.spec.ts` Home destination cases and `d-scan.spec.ts` opening/completion
cases with `--repeat-each=2` against the same owned build. Rebuild first; this
run's isolated build directories are removed after verification. No commit,
merge, push or tag was performed.

## Files

- Application: `src/ui/Home.ts`, `src/ui/ScanOverlay.ts`, `src/game/Scanner.ts`,
  `src/game/MissionRouter.ts`, `src/app/systems/discovery.ts`,
  `src/app/systems/onboard.ts`, `src/app/systems/title.ts`,
  `src/app/systems/waypoints.ts`.
- Browser capabilities: `tests/e2e/d-shell.spec.ts`, `tests/e2e/d-scan.spec.ts`,
  `tests/e2e/f-title-layout.spec.ts`, `tests/e2e/f-title-scene.spec.ts`,
  `tests/e2e/helpers/titleAudit.ts`, `tests/e2e/f-first-minute-620.spec.ts`,
  `tests/e2e/f2-explore.spec.ts`.
- Unit capabilities: `tests/unit/guidance.test.ts`, `tests/unit/homeFocus.test.ts`,
  `tests/unit/missionRouter.test.ts`, `tests/unit/onboardCompletion.test.ts`,
  `tests/unit/missionApproachWaypoint.test.ts`, `tests/unit/titleLifecycle.test.ts`,
  `tests/unit/touchControlsAudit.test.ts`.
- Contracts and progress: `docs/architecture.md`, `docs/discovery.md`,
  `docs/missions.md`, `docs/title-scene.md`, this note.
