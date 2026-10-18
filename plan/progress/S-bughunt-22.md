# S-bughunt-22 — settings/accessibility persistence and photo quota audit

Backlog 8, 2026-10-17. Reviewed `src/core/Save.ts`, `PhotoStore.ts`, settings
controls and their live application, Home/dive initialization, photo capture and
Journal gallery consumption. No additional production bug was demonstrated;
production code is unchanged. Existing malformed-photo and failed-read fixes
were exercised, not reimplemented.

## Added regression guards

Twenty cases extend three existing capability specs:

- `settingsSave.test.ts`: v2/v3 accessibility choices survive migration beside a
  corrupt captions field, preset/Custom edits, reload and reset. Nine mixed-field
  fixtures check strict boolean validation, invalid text-size types, clamping and
  rounding while retaining valid neighbors. A quota-failed settings write keeps
  accessibility edits usable for the session, preserves stored bytes and allows
  an unchanged retry to persist after recovery. Legacy source bytes and unknown
  extension fields remain intact.
- `overlayFocus.test.ts`: all four saved/OS reduced-motion combinations initialize
  the real Settings controls, camera flag, waypoint setter and document flag.
  Native control change events persist reduced-motion and UI-scale edits, apply
  them live, then restore their controls and motion behavior in a second session.
  The OS preference is combined without being written into the saved choice.
- `photoStore.test.ts`: both supported browser quota error names evict exactly the
  oldest photos from a full collection at serialized-size boundaries retaining
  1, 5, 23 or 24 photos, with correct dropped counts and reload contents. An
  oversized capture leaves a full collection byte-for-byte intact; deletion and a
  smaller capture recover. A corrupt, over-limit v1 fixture filters bad records
  before counting valid photos, retains the newest 24, leaves storage untouched
  on read and persists the correct collection on the next capture. Discovery
  storage remains untouched during quota eviction.

## Simplicity and review scope

No UI surface, setting, schema, dependency, gameplay behavior, config mutation,
site branch, art, layout or CSS change. Numeric/behavioral coverage supports
honest save outcomes, accessible persisted preferences and retention of Journal
rewards. Beauty, phone appearance and screenshot acceptance remain for Claude;
no game rendering or visual acceptance is claimed. Director and tools are
unchanged; no merge, push or tag.

## Validation

- Focused existing capability checks: **312 tests / 10 files PASS** (settings
  save/screen/palette, photo store/mode, reduced motion, overlay focus, save soak,
  startup lifecycle and predive).
- `GATES_CONFIG_MODE=writable bash tools/gates.sh`: **exit 1**. Used the
  repository-supported writable config mode for the read-only dependency tree.
- PASS: full unit gate, **3,205 tests / 192 files**, 511.43 seconds; strict
  content; production build/typecheck; project-base build; attribution;
  repository-wide Prettier. No skips, assertion changes or timeout increases.
- Final changed-file formatting and `git diff --check`: **PASS**.

### Environment and unrelated tooling failures

- Python gate: **161/166 PASS, five failures**. Four unchanged build-manifest
  tests report sandbox `spawnSync git EPERM`. The unchanged golden-comparison
  wrapper fails parsing empty CLI JSON (`Unexpected end of JSON input`), matching
  the previously recorded audit failure; its underlying cause was not changed or
  resolved in this scope.
- Root smoke and project-base browser gates: **blocked before test execution**;
  preview cannot start. A direct preview command confirms
  `listen EPERM: operation not permitted 127.0.0.1:4199`.
- Separately requested existing browser capability checks:
  `settings.spec.ts`, `f-a11y.spec.ts`, `d-photo.spec.ts` also stop before tests
  because preview cannot start. Playwright discovery succeeds: **20 tests / three
  files**. No browser or screenshot pass is claimed.

Gate logs: `.cache/runs/20261017-234759-7-zYV3Jz/` and
`/tmp/S-bughunt-22-gates.log`. Browser attempt/discovery:
`/tmp/S-bughunt-22-browser.log`, `/tmp/S-bughunt-22-browser-list.log`.
Remaining external validation: rerun the failed tooling checks and browser
capabilities in an environment that permits the required subprocesses and local
preview listener.
