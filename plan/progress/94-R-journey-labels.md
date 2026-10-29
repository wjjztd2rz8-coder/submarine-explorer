# R-journey-labels — waypoint, Journal and Settings readability

2026-10-28. Implements Director item 94, findings 2, 3, 5, 6 and 7 from
the journey captures at base `20f2198`. The cited evidence is present in
`plan/progress/62-T-journey-acceptance.md` in this checkout (there is no
unprefixed `T-journey-acceptance.md`). The original changed capabilities passed
the orchestrator's outside-sandbox browser run. The six remaining full-suite
failures are repaired below; those repairs await an outside browser rerun.

## Changes and simplicity

- `src/ui/Waypoints.ts` measures the current name and readout before placement.
  One clamp chooses the nearest position where the entire wrapped label fits
  inside the viewport and clears the rendered HUD regions, reticle and touch
  dock. It uses the existing HUD gap and actual rectangles, including changes
  to UI scale, guidance and sonar size. A full-screen map with no available
  space owns navigation until it closes.
- `src/styles/waypoints.css` wraps names and distance/depth/status text. Removes
  ellipsis and the separate CSS translations that invalidated the old clamp.
- `src/styles/journal.css` lets the full site breadcrumb wrap within its existing
  heading, leaving Back and Close available.
- `src/styles/settings.css` keeps the existing Settings header sticky inside its
  scroller, so visiting Aa or the bottom settings does not scroll Close away.

Net simpler: one placement rule replaces a fixed control band, an independent
top clamp and two CSS displacement rules. The existing labels and header are
reused; no guidance surface, setting, chrome, site branch or HUD media-query
patch was added. Settings still apply through Save and the existing resolver.

## Capability coverage

- `tests/e2e/helpers/phoneHud.ts`: extracts the existing composed-HUD guard and
  includes the world waypoint label and its text overflow. The catalog tutorial
  tests continue to guard all their previous HUD/control pairs.
- `tests/e2e/hud-touch.spec.ts`: applies that guard to real mission openings and
  same-frame name changes at 1280×720, 390×844 and 844×390, UI scales 100%, 105%
  and 150%, on-screen, off-screen and behind-camera targets. Covers Bow section,
  Boiler field, Eastern stalactite gallery and Eastern atoll drop-off. Extends
  the existing Journal navigation test to check the complete Blue Hole heading
  on both the site page and an entry, preserving its Titanic navigation checks.
- `tests/e2e/journal-debrief.spec.ts`: adds waypoint labels to the journey HUD
  overlap/viewport guard and waypoint text and Journal breadcrumbs to its
  clipping guard, including the first frame after both scans.
- `tests/e2e/settings.spec.ts`: checks that Close is already inside the viewport
  and hit-testable after every Aa step from 105% through 150%, before an action
  could automatically scroll it back into view.
- `tests/unit/uiWaypoints.test.ts`: checks landscape and portrait geometry,
  same-frame text measurement, fractional label sizes, unobstructed placement
  and the full-screen-map case. `tests/unit/guidance.test.ts` extends its small
  DOM fixture with the new measurement API; all handoff assertions are retained.

## Executed validation

Requested environment: `ROUNDS=2 FULL_E2E=1`.

- `npm run typecheck`: passed.
- `tools/gates.sh --full-e2e` with `GATES_CONFIG_MODE=writable`, owned port 4394
  and output `dist-journey-labels`: config, content and build passed. Python
  ran 167 tests with five failures: four CI-manifest tests report
  `spawnSync git EPERM`; the golden CLI report test receives empty JSON. The
  initial unit run exposed 52 failures in the guidance DOM fixture, fixed above.
  That broad run was interrupted after it stopped producing output; it is not
  counted as a full-gate pass. Logs: `.cache/runs/20261028-172008-2-SZOcZQ/`.
- Changed capability units (`uiWaypoints`, `guidance`, `settingsScreen`,
  `overlayFocus`) with writable config, no cache and thread workers:
  **352 passed in four files**. Log: `.cache/r-journey-labels/capability-unit.log`.
- A separate full-unit retry with thread workers and a 180-second bound exited
  **124 (timeout)** without a suite result. This is not a full-unit pass and its
  cause is unconfirmed. Log: `.cache/r-journey-labels/unit-threads.log`.
- Attribution, repository-wide Prettier and `git diff --check`: passed.
- Grepped `tests/e2e` for the affected capabilities and executed these commands
  with separate owned preview ports, matching `PW_OUTDIR`, writable config and
  outputs under `.cache/r-journey-labels/`:

  ```bash
  npx playwright test tests/e2e/hud-touch.spec.ts \
    -g 'waypoint names and readouts wrap clear of the HUD|journal spoilers, navigation, entries and Close remain reachable' --repeat-each=2
  npx playwright test tests/e2e/settings.spec.ts \
    -g 'Aa cycles and persists UI scale' --repeat-each=2
  npx playwright test tests/e2e/journal-debrief.spec.ts \
    -g 'two-objective scan journey' --repeat-each=2
  npx playwright test tests/e2e/d-scan.spec.ts \
    -g 'visual hints show an objective waypoint and obey the saved toggle'
  npx playwright test
  ```

  Every browser invocation exited before assertions at preview startup. Direct
  preview diagnosis reports `listen EPERM: operation not permitted
127.0.0.1:4394`; standalone Chromium also fails with sandbox-host
  `shutdown: Operation not permitted`. **Zero browser assertions executed and
  no fresh screenshots produced.** Discovery succeeds: 42 selected invocations
  across four specs with two repeats. Existing shared capture files were only
  read, including the reported Titanic landscape opening.

## Orchestrator full gate and follow-up

The orchestrator subsequently ran `tools/gates.sh --full-e2e` outside the
sandbox. Evidence: `.cache/runs/20261028-172907-132972-YuUnMB/`. Python,
content, build, all **4,424 unit tests in 192 files**, project-base e2e,
attribution and Prettier passed. Root e2e: **826 passed, 50 skipped, six failed**.
The waypoint layout, Journal reachability, Settings Aa and two-objective journey
cases changed here all passed. This supersedes the local infrastructure failures
as evidence for those capabilities; it is still a failed full gate.

The six failures had two root causes:

- Journal samples deliberately share the `secret` entry kind and Finds section.
  `src/ui/Journal.ts` counted all of them as hidden secrets, producing `3/5`
  after the three Monterey secrets were scanned. The counter now checks the
  canonical `secretDiscoveryId` linkage, keeping samples accessible while
  excluding them from both the secret numerator and denominator. No site branch
  or additional counter was added. The existing **`3/3 secrets` e2e assertion is
  unchanged**; the sample capability also now asserts `0/3 secrets` after a sample.
- The underwater opening probe in `tests/e2e/opening-framing.spec.ts` searched
  only direct children for a body mesh. Titanic, Endurance, Axial, Kamaʻehuakanaloa
  and Bismarck can place that mesh at the prop root. The probe now searches the
  whole hierarchy, including the root, and throws explicitly if no mesh exists.
  It still projects the actual geometry; all facing, camera clearance, hull
  collision, illumination, viewport and detail assertions remain unchanged.

Follow-up files: `src/ui/Journal.ts`, `tests/e2e/f2-explore.spec.ts`,
`tests/e2e/opening-framing.spec.ts`, `tests/unit/journalGroups.test.ts`, and this
note. The new Journal unit cases use the real three-secret/two-sample declaration
on desktop and phone, checking counts before scans, after all samples and after
all secrets. They failed before the counter repair and passed afterward.

Follow-up validation:

- Typecheck and the isolated production build passed. Build log:
  `.cache/r-journey-labels/followup-build.log`.
- **271 unit tests passed in five files** (`journalGroups`, `journalData`,
  `copyJournal`, `props-procedural`, `wrecks`), including root-mesh prop contracts.
  Log: `.cache/r-journey-labels/followup-unit.log`.
- Changed-file Prettier and `git diff --check` passed.
- After grepping the affected e2e capabilities, executed with `ROUNDS=2`,
  matching owned build `dist-journey-labels-followup`, ports 4396/4397 and
  `GATES_CONFIG_MODE=writable`:

  ```bash
  npx playwright test tests/e2e/f2-explore.spec.ts \
    -g 'three hidden discoveries|samples collect per dive' --repeat-each=2
  npx playwright test tests/e2e/opening-framing.spec.ts \
    -g 'underwater free-dive opening' --repeat-each=2
  ```

  Both stopped at preview startup, before browser assertions, as expected under
  this sandbox. Discovery finds all 15 distinct selected cases in two files;
  two repeats request 30 invocations, covering all 13 opening subjects. Logs:
  `.cache/r-journey-labels/followup-{explore,opening}-e2e.log`. The post-fix
  full gate is **unverified**, not green. Outside rerun should use the commands
  above on a fresh matching build, followed by `tools/gates.sh --full-e2e`.

No dependencies, generated terrain, shared capture files or Director backlog
were changed. The owned build output was removed after verification; rebuild
before rerunning the browser commands. No merge, push or tag.

## Final workspace review

Reviewed the implementation and retained all regression assertions. Fresh checks:

- Typecheck and **520 unit tests in six files passed** (`uiWaypoints`, `guidance`,
  `settingsScreen`, `overlayFocus`, `journalGroups`, `journalData`). Log:
  `.cache/r-journey-labels/review-unit.log`.
- Grepped the six affected browser specs and reran every selection listed above
  with `--repeat-each=2`, matching build `dist-journey-labels-review` and owned
  ports 4398–4403. Discovery lists **72 invocations in six files**. All execution
  attempts stopped before assertions; direct preview diagnosis again reports
  `listen EPERM`. Logs: `.cache/r-journey-labels/review-{hud,settings,journey,scan,explore,opening}.log`
  and `review-preview.log`. No fresh browser pass or capture is claimed.
- Inspected the saved Blue Hole portrait and landscape waypoint captures from
  the outside gate: complete wrapped name and readout, clear of HUD controls.
- Fresh `tools/gates.sh --full-e2e` passed config, content and production build.
  Python again had five failures (four `spawnSync git EPERM`, one golden tooling
  failure); the run reached its 90-second bound while the full unit suite had
  produced no result. Exit **124**, not a gate pass. Evidence:
  `.cache/runs/20261028-223138-8-8WNtd6/` and
  `.cache/r-journey-labels/review-gates.log`.
- Attribution, changed-file Prettier and `git diff --check` passed. The owned
  review build was removed. The outside full-gate rerun remains outstanding.
