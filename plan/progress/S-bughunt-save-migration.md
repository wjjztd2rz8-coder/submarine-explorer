# S-bughunt-save-migration

DIRECTOR item 16g, 2026-11-09. Starting HEAD: `7534c9a5`.

## Round 1: save and settings loading

Read DIRECTOR and repository conventions. Audited settings fallback order,
per-field defaults, corrupt JSON, missing records, future-version protection,
failed reads, denied localStorage access and quota failures. Reviewed retired
ROV bindings/hints, boost purchase evidence and archived upgrades. Existing
capability tests already cover those paths; no additional defect confirmed.

## Round 2: objective identity and historical completion

Confirmed two effects of one migration defect: historical routes were intersected
with current objective IDs. Renaming every ID lost earned stars; renaming or
removing an undiscovered required objective silently shortened an old route and
awarded stars for an unfinished dive.

Historical route data now uses the actual POI keys saved in the Journal and
checks its complete original checklist directly. Current mission objective
credit still uses current IDs. No save schema or settings change.

Expanded the existing route-credit capability tables across unchanged, renamed
and removed objectives, including unfinished routes and reload idempotence.
The 22 added cases all failed before the production change. After the fix,
all 226 focused tests pass across `progressMigration`, `progress`, `settingsSave`,
`saveSoak` and `gameDiscoveryStore`.

Simplicity: removed the historical/current objective-ID intersection and its
dependency on the current mission's checklist. Longer explicit POI names replace
the shorter objective aliases; no new abstraction, setting, site branch, UI or
runtime config mutation. Removed a package-history comment from production code.

## Validation

- Final production build and TypeScript check pass. Build output used:
  `dist-save-migration-target` (removed after verification);
  log: `/tmp/save-migration-build.log`.
- Focused units: 5 files, 226 passed; `/tmp/save-migration-focused.log`.
  Before-fix evidence: `/tmp/save-migration-before.log` (22 failures, 30 passes).
- Searched `tests/e2e` for migration, legacy saves, storage and settings. Extended
  the existing deep-mission migration test with renamed IDs and historical-star
  assertions. Ran these requested targeted commands, each with its own preview
  port and the final build:

  ```sh
  npx playwright test tests/e2e/f2-progress.spec.ts -g 'old discoveries are credited before fitting a deep-mission vehicle'
  npx playwright test tests/e2e/d-modes.spec.ts -g 'v1 settings migrate to Arcade while keeping display choices'
  npx playwright test tests/e2e/journal-debrief.spec.ts -g 'survives migration, a cosmetic edit and reload'
  ```

  All exited 1 before tests: Playwright could not start its preview server.
  Direct preview diagnosis: `listen EPERM: operation not permitted 127.0.0.1:4188`.
  Logs: `/tmp/save-migration-{progress,settings,legacy}-e2e.log`.

- Final gate command:
  `GATES_CONFIG_MODE=writable PW_OUTDIR=dist-save-migration-final PW_PORT=4191 bash tools/gates.sh`.
  Full units pass: **195 files, 4,691 tests**, 898.54 seconds. Config preparation,
  content validation, final production build/typecheck, project-base build/typecheck,
  attribution and repository formatting pass. Python has 5 failures:
  four build-manifest cases fail with `spawnSync git EPERM`; golden comparison
  fails with `Unexpected end of JSON input`. Root and project-base browser gates
  fail at preview startup, before running tests. Overall gate result: FAIL.
  Logs: `.cache/runs/20261109-104055-7-Xx3TTg/` and
  `/tmp/save-migration-final-gates.log`. An earlier gate run, started before the
  fix, was interrupted during units and superseded by this final run.

Browser acceptance remains unverified. No gameplay, art, phone or screenshot
acceptance claimed.
