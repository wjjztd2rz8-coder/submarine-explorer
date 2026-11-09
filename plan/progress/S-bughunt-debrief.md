# S-bughunt-debrief

DIRECTOR item 16j; 2026-11-09. Two audit rounds over results, Journal unlocks,
surface/pause endings, hull aborts, quit, zero/all discoveries, ratings, best
score persistence, replay/site navigation and repeated end events.

## Confirmed defect

Dive again remained callable before the requested reload completed. Two button
activations emitted two `mission:restart` events, resetting dive-local stats
twice and requesting two reloads. A retained replay action also emitted a restart
after its router had been disposed.

Added five cases to the existing mission-router capability: duplicate replay
after voluntary surface or hull abort, each with zero/all objectives scanned,
and replay after disposal. All five failed against the original implementation
(four received two restart events instead of one; disposal still emitted a
restart). Evidence: `/tmp/debrief-before.log`.

The fix is one guard in `MissionRouter.diveAgain`: accept only an undisposed
router whose mission is still in debrief. The first restart already changes the
mission to briefing, so repeated activations become inert. Extended the two
existing mission e2e journeys to activate replay twice before navigation and
retain their exactly-one-restart assertions.

## Second audit round

Reviewed Mission/MissionRouter, Progress, SessionStats, Discovery, JournalData,
Journal, Debrief, FocusTrap and the mission/progress/journal/shell/photo/power
systems. Existing capability tests cover surface/end idempotence, pause clocks,
crush/power ascent, scans on the last ascent frame, aborts that cannot resume,
zero/full discovery summaries, Journal freeze/unlock/reload, return-dive scans,
star upgrades and preservation of best ratings after lower scores/aborts.
Quit goes directly home and disposes the mission; discoveries were saved at
scan completion. Home/Dive sites callbacks hide results and return to the shell;
site selection boots a fresh page. No further defect was confirmed.

Simplicity: one production guard reuses existing lifecycle state instead of
introducing a replay flag, timer or event. No added UI, guidance, settings,
dependencies, configuration mutation or shared site branches; no cuts or
redesign. Tests extend existing capabilities; no assertions were weakened and
no package numbers were added to code.

## Validation

- Focused unit run: eight files, **294 passed**, including all five regressions.
  `/tmp/debrief-focused.log`.
- Searched `tests/e2e` for debrief, surface, Journal, ratings, replay and quit
  coverage; search evidence: `/tmp/debrief-e2e-capabilities.log`.
- Attempted the changed journeys against the successful gate build:
  `GATES_CONFIG_MODE=writable PW_PORT=4183
PW_OUTDIR=.cache/runs/20261109-110211-3-O9BaiM/dist npx playwright test
tests/e2e/mission.spec.ts -g 'scan bow and stern -> banner -> surface -> debrief|crush depth -> HULL FAILURE'`.
  Playwright exits 1 before executing tests: preview cannot start and localhost
  availability checks return `connect EPERM` for IPv4 and IPv6. Debug log:
  `/tmp/debrief-playwright.log`. Browser acceptance remains unverified.
- Full gate run: `GATES_CONFIG_MODE=writable bash tools/gates.sh`; exit **1**,
  `FAIL gates (e2e=smoke)`. Full units: **195 files / 4,674 tests passed**, 853.94 s.
  Config preparation, content, root build/typecheck, attribution and repository
  Prettier passed. Root smoke and project-base Playwright gates both failed
  before tests at preview startup; the project-base build/typecheck passed.
  Aggregate log: `/tmp/debrief-gates.log`; per-gate logs:
  `.cache/runs/20261109-110211-3-O9BaiM/`.
- Gate build (TypeScript and Vite) and content validation passed. Python:
  **164 passed / 5 failed** out of 169. Four manifest cases fail at
  `spawnSync git EPERM`; the golden tooling case fails with
  `Unexpected end of JSON input` in the comparison child-output parsing.
  These match previously documented audit signatures; no tooling changes made.
- The Playwright `--list` check confirms the filter selects exactly the two
  changed journeys. Changed-file Prettier and `git diff --check` pass.
