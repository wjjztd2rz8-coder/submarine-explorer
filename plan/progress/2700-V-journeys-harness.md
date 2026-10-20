# V-journeys-harness

Serves **V-journeys / agreed blocker 1**, brief 2700 (brief label: Director item
12b; the checked-out Director lists V-journeys at item 2). Base `a814d10`.

Extended the existing `Home to scan and return journey` capability in
`tests/e2e/journal-debrief.spec.ts` with six fresh-save, Arcade/Low journeys:
Titanic followed by Blue Hole at 1280x720, 390x844 and 844x390. Existing navigation,
focus, Journal scrolling and explicitly assisted reward regressions remain intact.
Earlier V-journeys/V-first-five/firstdiscovery notes describe manual captures and
older harnesses; they do not provide this automated Low matrix.

The new route selects a mission from Home, reads the briefing, begins the dive,
pilots forward along the authored opening heading, stops on the **visible**
ready-to-scan instruction, holds the real scan control, opens Journal through
Pause, and surfaces to debrief. Keyboard uses W/G; phones use native CDP touch on
the stick/SCAN and taps on menus. Scan completion advances through ordinary game
frames, **not** `completeScan`, direct simulation calls, teleport, resets, hidden
coordinate steering, injected saves or skipped onboarding. Low is selected with
the public `?tier=low` option, which mission selection preserves. Read-only probes
verify the first mission target, real movement, first discovery within five
simulation minutes, Journal article selection, and the debrief discovery count.
This is a scripted opening route, not human usability or visual acceptance.

Every successful step calls `page.screenshot` directly, independently of review
flags, using `.cache/codex/shots/journeys/<site>-<width>x<height>-NN-<step>.png`.
Each case writes `<site>-<width>x<height>-manifest.json` with planned steps, status,
input/clock method, captured steps, failures, page errors, URL, tier, viewport,
pose/velocity, scan state, mission objectives, session stats and visible panel
text/rectangles. A failing step attempts a numbered `blocked-<step>` screenshot
and preserves its state and error. The manifest is rewritten after each capture
and in `finally`; no exception is converted into a pass.

Before edits, checked main and all registered worktrees and the launched scopes.
Main and this worktree were clean; no other worktree owned journal-debrief changes.
The active scan/boost, events, audio/perf/gates, carbonate, steel, vent-offset,
hull-clearance and Low-event audits remain separate. Rechecked launched briefs
2630–2680 and 2700–2720 and earlier progress evidence during the audit.

Only tests and this note change. No production UI, setting, guidance surface,
site branch, layout, CSS, art, material, lighting or geometry change; no edits to
`tools/` or `plan/DIRECTOR.md`; no merge, push or tag. Existing capability helpers
and one table drive the added matrix, with no new capture tool or spec.

## Checks

Passed:

- `npm run typecheck` (also repeated after evidence-state handling changes).
- `npx prettier --check tests/e2e/journal-debrief.spec.ts`.
- `git diff --check`.
- Playwright targeted discovery: **6 tests in 1 file**.
- Playwright full discovery: **827 tests in 66 files**. Discovery is not execution.
- Aggregate gate configuration, strict content and production build/typecheck.

Execution mode requested and attempted: **full suite + project-base**, explicitly
`FULL_E2E=1 GATES_CONFIG_MODE=writable PW_PORT=4270
PW_OUTDIR=.cache/journeys-dist bash tools/gates.sh --full-e2e`.
Aggregate run: pending final results below. Log `/tmp/journeys-full-gates.log`;
retained gate logs `.cache/runs/20261018-191712-7-WG16Ue/`.

The Python gate ran **167 tests, 162 passed, 5 failed**. Four existing
CI-build-manifest cases report `spawnSync git EPERM`; the golden comparison
case reports `Unexpected end of JSON input`. The latter remains an unclassified
existing tooling failure, also reported by the neighboring S-verify-21 audit;
it is not classified here as an environment failure or a journey regression.

Separately attempted the exact new matrix with
`GATES_CONFIG_MODE=writable PW_PORT=4271 PW_OUTDIR=.cache/journeys-dist npx
playwright test tests/e2e/journal-debrief.spec.ts --grep 'unaided journey'
--output=.cache/journeys-results`: **exit 1 before tests**, preview startup failure.
Separately attempted **all e2e**, without a grep/smoke restriction, on port 4272:
**exit 1 before tests**, same preview startup failure.

A separate diagnostic `timeout 120s npx vitest run --configLoader runner
--cache=false --maxWorkers=1 --no-file-parallelism` exited **124**, with only
the Vitest startup line and no assertion results. It does not establish a pass
or a failing unit assertion. Log: `/tmp/journeys-unit.log`; the uncapped aggregate
unit gate remains the acceptance run.

## Environment block and director handoff

All six journeys remain **unexecuted**, blocked before Home: a direct preview
startup probe reports `listen EPERM: operation not permitted 127.0.0.1:4271`.
No game page loaded, so no screenshots or gameplay state were available. The
honest record is `.cache/codex/shots/journeys/environment-manifest.json`, with
all six not-run cases, the blocking stage and explicit null screenshot/state.
Discovery and attempted-run logs, plus the direct preview error log, are retained
beside it. The worktree's original `.cache/codex/shots` symlink pointed outside
its writable root; it is preserved as `.cache/codex/shots-shared`, and `shots` is
now a local artifact directory. No shared screenshot files were changed. This is an environment
block, **not a demonstrated gameplay defect**, and does not clear agreed blocker 1.
The scripted opening remains unverified until run in a browser-capable environment.

On a subsequent run, any in-game failure must remain red and its generated
`blocked-<step>` screenshot/state must be reported as a director defect rather
than replaced by a teleport or an injected completion. Claude still owns beauty,
phone appearance, usability judgement and screenshot acceptance.
