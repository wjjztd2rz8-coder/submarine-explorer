# S-verify-save-touch-merges

DIRECTOR item 16m, 2026-11-09. Starting HEAD: `228601bd`; clean checkout.
Read `plan/DIRECTOR.md` first and the repository conventions.

## Round 1: historical completion and save safety

Confirmed a remaining dependency on valid current mission content: the early
`!def` return skipped every `PREVIOUS_ROUTES` checklist. Removing all objectives,
retiring a mission (HTTP 410), or returning HTTP 503 discarded/delayed provable
historical stars; a retired mission also cleared its pending evidence permanently.
Expanded the existing capability table across all eight historical route cases.
Before the production change: **24 failures / 52 passes** in
`.cache/verify-save-touch/reproduction.log`.

Historical checklists now run even without current mission content. Current
objective tokens still require a valid mission. HTTP 404/410 still retire
optional content; invalid/transient content still retains the original pending
evidence for retries. Incomplete routes remain incomplete. Historical completion,
existing ratings, discovery tokens and reload idempotence retain their assertions.
Added nine incomplete-route cases for missing, empty and unavailable missions.

Reviewed `ProgressSave`, `migrateProgress`, `Progress.finish`, migration callers
and frozen pending evidence. No storage keys, schema versions, saved fields,
settings or Journal data changed. Existing future-version/read-failure/quota
protections remain in place. Unknown missions still cannot infer completion;
retry evidence remains frozen and modern discoveries cannot improve old stars.
Previously retired migration evidence cannot be recovered after it was discarded;
this fix protects migrations that still have their original Journal/pending data.

## Round 2: touch lifecycle and merged-branch verification

Reviewed Globe capture cancellation and listener disposal, camera tap travel,
PhotoMode label updates and their frame-system ordering. Existing interruption
tables cover resize/orientation, stale pointer events, multiple fingers, focus,
visibility and fresh gestures. No additional touch production defect confirmed.

Added five tap-boundary cases: final horizontal/vertical displacement, cumulative
travel returning to the start, valid small release movement, and no release-only
camera delta. Extended the existing photo-system test to check live rebinding to
Space without duplicate key labels or reactivating the focus trap. No existing
assertion weakened; no new spec files.

Simplicity: removed the valid-current-mission prerequisite from historical
rating. Reused the existing checklist/rating path and pending retry format;
no new state, helper, package, setting, UI, config mutation or site branch.
No gameplay/UI cuts. The existing migration e2e is table-driven to preserve its
renamed-objective case and add retired-content coverage.

## Validation

- Focused capability suite: **11 files / 634 tests pass**; log:
  `.cache/verify-save-touch/focused.log`.
- `rg` search of matching browser capabilities:
  `.cache/verify-save-touch/e2e-discovery.txt`.
- Initial gate run was interrupted during units after the defect was reproduced;
  superseded by the final-source run below. Initial log:
  `.cache/verify-save-touch/gates.log`.
- Final production build/typecheck passes; separate typecheck also passes:
  `.cache/verify-save-touch/typecheck.log`.
- Preserved both migration browser cases in Playwright discovery (renamed IDs
  and a retired mission). Ran the requested capability commands against the
  final isolated build, each with `GATES_CONFIG_MODE=writable`,
  `PW_OUTDIR=dist-verify-save-touch` and a separate `PW_PORT` (4203–4206):

  ```sh
  npx playwright test tests/e2e/f2-progress.spec.ts -g 'old discoveries are credited before fitting a deep-mission vehicle|old route stars survive a retired mission before fitting a deep-mission vehicle'
  npx playwright test tests/e2e/f1-touch.spec.ts -g 'simultaneous flight and scan release on cancellation, blur, hiding and rotation|stick moves the sub, scan holds, pause opens by touch'
  npx playwright test tests/e2e/globe-pins.spec.ts -g 'rotation discards a held site-list swipe and a fresh swipe works|pins sit on their location'
  npx playwright test tests/e2e/phone-accept.spec.ts -g 'touch help and photo gestures name no keyboard keys or boost'
  ```

  Each exited **1 before executing tests**, because Playwright's preview could
  not start. Direct diagnosis confirms `listen EPERM 127.0.0.1:4203`.
  Logs: `.cache/verify-save-touch/{migration,touch,globe,photo}-e2e.log`
  and `.cache/verify-save-touch/preview.log`.

- Final gate command:
  `GATES_CONFIG_MODE=writable PW_OUTDIR=dist-verify-save-touch PW_PORT=4202 bash tools/gates.sh`.
  Final log: `.cache/verify-save-touch/final-gates.log`;
  stage logs: `.cache/runs/20261109-141824-32-Piot4q/`.
  Finished exit **1**. Full units: **196 files / 4,794 tests pass**, **917.07 s**.
  Config preparation, content validation, root build/typecheck, project-base
  build/typecheck, attribution and repository-wide Prettier pass. Python:
  **169 tests / 5 failures**, matching the recorded baseline: four build-manifest
  tests report `spawnSync git EPERM`; golden tooling reports
  `Unexpected end of JSON input`. Root smoke and project-base browser gates
  both fail at preview startup before executing tests. No gate configuration,
  assertion or timeout was weakened. Aggregate gate pass and browser acceptance
  remain unverified in this restricted environment.
- Changed-file formatting and `git diff --check` pass. No visual/phone,
  native-device, screenshot or browser acceptance claimed.

Removed the isolated `dist-verify-save-touch` build after validation; retained logs.
