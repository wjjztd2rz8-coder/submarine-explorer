# R-debrief-objectives — 2026-10-28

The existing metric now says `N of M primary objectives`, using `Mission.primaryCounts()` once for both heading and metric. It replaces the combined primary/optional tally; no new on-screen element. Optional progress remains reflected in stars and the next-step suggestion rather than adding another count to the compact row.

Removed the unused normal-dive subtitle, duplicate counts/duration copy and unconsumed formatter; abort cause still feeds the recovery highlight. Cuts are in CHANGELOG.md. Mission event totals still include optional objectives. Including this note, the patch removes 12 net lines.

Existing mission/Journal specs guard completed primaries with zero or one optional scan, partial primary completion, and the explicit label across the compact-summary viewport table (`ROUNDS=2`). Unit wording and router expectations explain the regressions they guard. No new specs.

Validation:

- Root and `/submarine-explorer/` production builds passed, as did typecheck, content validation, attribution and repository formatting.
- Targeted unit run: 5 files, 207 tests passed (`npx vitest run tests/unit/{debriefSummary,debriefReopen,missionRouter,missionAbort,journalData}.test.ts --configLoader runner --cache=false --maxWorkers=1 --pool=threads`).
- `GATES_CONFIG_MODE=writable PW_PORT=4276 PW_OUTDIR=dist-r-debrief-objectives bash tools/gates.sh` attempted smoke + project-base. Python failed: four manifest cases cannot spawn git (`EPERM`), and the golden comparison case gets empty JSON. Default unit execution and full-suite thread-pool retries produced no results for minutes and were interrupted; full unit gate did not pass.
- Smoke and project-base browser commands were then attempted directly on port 4276 with their separate builds. Both stopped before tests: preview cannot listen on localhost (`EPERM`).
- Matching existing e2e attempted on port 4277: `npx playwright test tests/e2e/mission.spec.ts tests/e2e/journal-debrief.spec.ts -g 'scan bow and stern|primaries complete -> keep exploring -> secondary|Home from the debrief|summary and Journal.*titanic:'` with `GATES_CONFIG_MODE=writable PW_OUTDIR=dist-r-debrief-objectives PW_RENDER_REVIEW=1 ROUNDS=2`. Same preview failure; no browser assertion passed.
- Existing layout selection attempted on port 4278: `npx playwright test tests/e2e/hud-touch.spec.ts -g 'catalog tutorial and reload.*844x390-touch.*titanic: tutorial, contact, reward, chip and reload'`. Same preview failure; current layout remains unverified.

Saved evidence reviewed: `.cache/codex/shots/journeys/titanic-844x390-04-dive-start.png` visibly has the waypoint label over the sonar/tutorial; `journeys/round-1/titanic-844x390-16-debrief.png` shows the old misleading `2 of 4 objectives`. These are historical captures, not this build. `Waypoints.ts` projects the label outside `.hud-regions`; the catalog layout helper omits that label. The overlap remains open for the HUD layout model to include projected-label clearance; no offsets, CSS, art, lighting or geometry changed here.
