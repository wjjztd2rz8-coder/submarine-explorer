# 4310 — V-journeys-current rerun

## Status and plan

**Browser acceptance blocked; extension implemented but not browser-verified.**
Local main and starting HEAD both resolve to
`c99a71549f53945bd4565f40c5904b404b58773f` on 2026-10-25. This includes the
merged Aa Settings control (`28e175e9`). The worktree started clean. No remote
main refresh, merge, push or tag was performed.

1. Inspect the existing journey tables and attempt their current-main captures
   for two rounds. Attempted; preview startup fails before any test executes.
2. Extend the existing unaided table through the second objective, retaining
   first-scan assertions, Journal checks and ordinary player input. Implemented;
   typecheck, formatting and discovery pass. Browser execution remains blocked.
3. Check reward/waypoint copy, dead ends and overlaps; record evidence by spec
   and shot name. Existing guidance unit checks pass. Rendered acceptance remains
   outstanding; the source-only copy discrepancy below is reported without a fix.

## Changes and scope

Only `tests/e2e/journal-debrief.spec.ts`, this note and formatting in
`plan/OVERNIGHT-LOG.md` change. No new specs,
production code, settings, guidance surfaces, layout patches, CSS, site branches
or game-state injection were added. Existing assisted opening journeys retain
their assertions and explicitly assisted scan behavior.

The existing `Home to scan and return journey / unaided journey <viewport>`
table still covers Titanic and Great Blue Hole at 1280×720, 390×844 and
844×390, fresh-save Arcade/Low. All six rows now continue through a second
objective, inspect its Journal entry and expect two discoveries at debrief.
The first scan retains its five-simulation-minute limit; the second leg has
its own five-minute limit. An unready, wrong or unreachable target remains a
failure with a `blocked-<step>` capture attempt. The added pilot controls follow
visible turn/depth guidance using keyboard or native touch; they do not teleport,
read target coordinates for steering, complete scans directly or skip onboarding.

Home Settings is opened through its menu; Aa changes 100% to 105%, is captured,
then Decrease restores 100% before the original default-scale route continues.
The existing Settings capability spec remains responsible for the full scale
cycle, persistence and maximum-scale geometry. Each reward is captured on its
completion frame and the next game frame. Directional reward text must name the
same target as the waypoint. Existing clipping, HUD-region intersection, screen
containment and 44-pixel touch-target assertions remain.

Both existing journey tables retain each repeat's artifacts under `round-1/`
and `round-2/`, avoiding overwrite. Unaided captures now also honor the existing
`FLOW_AUDIT_SHOTS` override, so this worktree can use a writable local directory
without changing its shared `.cache/codex/shots` symlink.

## Findings and shot references

No current gameplay dead end or overlap was observed: no browser reached Home.
This is **not** a clean visual or usability acceptance result. Shot names below
are planned outputs of the extended spec, **not files captured in this run**.

| Finding                                                                               | Spec / planned shots                                                                                                                                                                  | Evidence and disposition                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Environment prevents the entire route                                                 | Both journey tables in `journal-debrief.spec.ts`; before `01-home`                                                                                                                    | Preview listener fails with `listen EPERM: operation not permitted 127.0.0.1:4310`. A separate Chromium preflight exits with `SIGTRAP`, reporting `sandbox_host_linux.cc:41` / `shutdown: Operation not permitted (1)`. No gameplay assertion ran.                                                                                                                                                |
| Possible copy confusion: Titanic uses two distance estimates for the bow-to-stern leg | `unaided journey <viewport> / titanic: Home -> pilot -> first scan -> Journal -> second scan -> Journal -> debrief`; `<prefix>-04-briefing.png` and `<prefix>-12-second-approach.png` | Source-only: `data/landmarks/titanic/mission.json` summary says the sections lie “about 600 m apart”; the `find-stern` hint says “roughly 700 m south from the bow”. These are approximate descriptions, not proof of an unreachable objective or a wrong physical distance. Reported for content review; no speculative correction. Visibility of the hint on the second leg remains unverified. |
| Reward directions versus next waypoint                                                | All six unaided rows; `<prefix>-08-first-scan.png`, `-09-first-scan-next-frame.png`, `-14-second-scan.png`, `-15-second-scan-next-frame.png`                                          | No conflict demonstrated. Main already suppresses completed-objective directions in `ScanOverlay.objectiveCue()`. Existing unit tables exercise two objectives across every site, both modes, touch/desktop and first/repeat rewards. They pass; rendered completion-frame agreement remains unverified.                                                                                          |
| Aa reachability, text clipping and HUD overlap                                        | All six unaided rows; `<prefix>-02-settings-aa.png`, `-05-dive-start.png`, `-12-second-approach.png`, `-16-second-journal.png`, `-17-debrief.png`                                     | Assertions are present, but no screenshots or DOM rectangles were obtained. Requires browser-capable rerun and visual review.                                                                                                                                                                                                                                                                     |

For the command below, `<prefix>` is
`.cache/journeys-captures/round-<1|2>/<site>-<width>x<height>`.
Each unaided row writes its state, text, rectangles and failures to
`<prefix>-manifest.json`. The unchanged assisted opening rows would capture under
`.cache/journeys-captures/round-<1|2>/<width>x<height>/<site>/`.
Neither round produced capture manifests or screenshots here; the server fails
before the test bodies can create them. Historical screenshots were not reused.

## Validation and retained evidence

- **Pass:** `npm run typecheck` after the extension.
- **Pass:** `npx prettier --check tests/e2e/journal-debrief.spec.ts` and
  `git diff --check`.
- **Pass:** `npx vitest run tests/unit/guidance.test.ts
tests/unit/settingsSave.test.ts --configLoader runner --cache=false`:
  **199 tests in 2 files**. Log: `.cache/journeys-unit.log`.
- **Discovery only:** `npx playwright test tests/e2e/journal-debrief.spec.ts
--grep journey --repeat-each=2 --list`: **30 cases** (6 unaided + 9 assisted,
  each twice). Log: `.cache/journeys-list.log`. This does not establish execution.
- **Blocked before tests:** baseline current-main journey command, with
  `--grep journey --repeat-each=2`. Log: `.cache/journeys-baseline.log`.
- **Blocked before tests:** extended two-round command below, exit 1:
  `Process from config.webServer was not able to start`. Log:
  `.cache/journeys-run.log`. Direct preview error retained in
  `.cache/journeys-preview.log`.
- **Build gate failed:** `GATES_CONFIG_MODE=writable PW_PORT=4310
PW_OUTDIR=.cache/journeys-dist bash tools/gates.sh --phase build`.
  Vite bundled the production assets successfully, then provenance stamping
  failed with `spawnSync git EPERM` in `tools/ci-build-manifest.mjs`.
  Log: `.cache/runs/20261025-221601-2-JpvpRv/build.log`. This is not a passing
  build gate. No full-suite e2e or aggregate gate pass is claimed.

Browser-capable rerun command (two requested rounds):

```sh
GATES_CONFIG_MODE=writable PW_PORT=4310 PW_OUTDIR=.cache/journeys-dist \
  FLOW_AUDIT_SHOTS=.cache/journeys-captures \
  npx playwright test tests/e2e/journal-debrief.spec.ts --grep journey \
  --repeat-each=2 --output=.cache/journeys-results
```

Build the current checkout into `.cache/journeys-dist` first. The two requested
rounds, second-objective reachability, rendered text and overlap acceptance are
still outstanding. Approval policy is `never`; an unsandboxed launch is not
available in this session. No production defect was established or fixed.

## Orchestrator gate follow-up

The orchestrator ran `tools/gates.sh` outside this sandbox. Its supplied result
passes Python, content, build, unit, smoke e2e, project-base e2e and attribution.
The only failure is Prettier in `plan/OVERNIGHT-LOG.md`; retained log:
`.cache/runs/20261025-222334-1984587-U2CcNx/prettier.log`.

The root cause is two missing blank lines around the existing
`2026-10-25 21:11 CDT comprehensive review` heading. Prettier adds exactly those
two blank lines. No prose, application behavior, test assertion, formatter
configuration or ignore rule changes. The repository-wide `npm run format:check`
passes after the correction; log: `.cache/journeys-format-check.log`.

The supplied browser gate ran smoke plus project-base, not the targeted journey
matrix. It therefore does not establish either requested journey round or supply
the missing captures. The previous sandbox failures remain the evidence for the
targeted attempts; the orchestrator's successful checks supersede the local
environment failures for build and smoke/project-base validation. The aggregate
gate has not yet been rerun after this formatting-only correction.

## Orchestrator browser run (2026-10-25 23:30 CDT, main-equivalent build)

Extended `journal-debrief.spec.ts` unaided table: 3 passed, 3 failed (great-blue-hole 1280x720, titanic 390x844, titanic 844x390) with "No second-objective scan prompt within five simulation minutes". Not merged. Either the scripted steering is too weak for the second leg or the second objective is hard to reach unaided; the uncommitted extension was lost when the worktree was removed; it must be redone (queued as 4330).
