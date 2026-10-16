# S-bughunt-17

Scope: `plan/DIRECTOR.md` Backlog 10. Audited the recently merged sonar pinch
threshold, wildlife-first Journal unlock, and shared Home/Pause controls guide
at HEAD `40935d9`. Read `CONTRIBUTING-AGENTS.md` and the Director simplicity rules.

## Confirmed defects fixed

- A sonar pinch below the step threshold retained its distance when the map
  closed. The next one-pixel move sent four pixels of accumulated motion to the
  camera. Reset the threshold baseline to the previous pointer positions when
  switching between map and camera zoom. Existing gradual-pinch and reversal
  behavior remains covered.
- Coincident pointer positions left an initial zero-distance sonar pinch unable
  to zoom. Crossing zero during an existing gesture instead retained stale
  distance and could issue a zoom-out step while the fingers moved apart.
  Re-establish the baseline at the next positive distance.
- Changing an open keyboard/gamepad guide to touch hid its device tabs while
  retaining the old layout (including Change keys for keyboard). Select How to
  play when touch hides the tabs, and move focus from newly hidden controls to
  Close only when this guide owns the modal stack.
- Home's gamepad Journal shortcut bypassed the controls guide's modal ownership,
  opening the Journal over it. Respect the controls modal and the Journal's top
  status, retaining release/repress behavior after the guide closes.
- With touch controls already active, the first sampled gamepad frame selected
  gamepad and then overwrote it with the initial touch flag. Pause consequently
  offered How to play for an active pad. Initialize the device observer's touch
  history from the input's current state. The existing routing matrix now checks
  a gamepad on an already-touch device; before this fix, its Pause case fails
  (`/tmp/S-bughunt-17-touch-pad-before.log`).

Regressions extend `touchControlsAudit.test.ts` and `overlayFocus.test.ts`.
Regressions for the first four fixes against original source produce
**6 failed / 114 passed**;
log: `/tmp/S-bughunt-17-before-final.log`. Sources were restored immediately after
that verification. Extended routing coverage checks keyboard, gamepad and touch
from both Home and Pause, three open/close cycles and opener focus restoration.

## Journal and compatibility audit

The wildlife-first unlock needs no source change. Extended `journalGroups.test.ts`
to check phone and desktop rows from a reloaded legacy array save: site card and
overview unlock, scanned animal appears, unscanned target stays hidden, another
site remains locked, and neither storage write nor deletion occurs. Existing
`journalData.test.ts` covers current-version persistence, per-site isolation,
secrets/samples and wildlife overview access.

No new save shape/key, setting, dependency, UI element, tuning value, per-site
branch or package-named spec. No capability cuts or visual redesign.

## Validation

- Final focused capability run: **8 files / 246 tests pass**, including startup
  teardown, touch interruptions, device routing, Journal data/UI, and onboarding.
  Log: `/tmp/S-bughunt-17-focused.log`.
- Latest-source production build (including TypeScript) passes, including the
  final one-line device-history fix. Log: `/tmp/S-bughunt-17-build-final.log`.
- Ran `GATES_CONFIG_MODE=writable PW_PORT=4337
PW_OUTDIR=.cache/S-bughunt-17-dist bash tools/gates.sh`.
  Gate logs: `.cache/runs/20261016-151844-7-GGTSb0/` and
  `/tmp/S-bughunt-17-gates.log`.
- Full unit gate: **192 files / 2,816 tests pass** (382.88 seconds).
- Strict content validation, both root and project-base production builds,
  attribution, repository-wide Prettier, and `git diff --check` pass.
  Both browser gates fail before assertions because their preview process cannot
  start. **Aggregate gates exit 1**: Python and both browser gates remain red.
- Python: **161/166 pass**. Four unchanged build-manifest tests fail with
  `spawnSync git EPERM`. The unchanged golden comparison CLI test fails parsing
  empty stdout (`Unexpected end of JSON input`). These match the outstanding
  failures recorded in `S-bughunt-16.md`; no tooling assertions were changed.
- Five existing keyboard/gamepad/touch Home/Pause guide browser cases discover
  successfully, but execution stops before assertions at preview startup.
  A direct preview using the gate's native config confirms
  `listen EPERM: operation not permitted 127.0.0.1:4339`.
  Logs: `/tmp/S-bughunt-17-browser-discovery.log`,
  `/tmp/S-bughunt-17-browser.log`, `/tmp/S-bughunt-17-preview.log`.

Implementation and regression coverage are complete; changes are uncommitted.
Browser behavior still needs execution where preview servers can listen, and the
existing five tooling failures remain outstanding. Removed the isolated build
output after verification; retained gate logs under `.cache/runs/`.
