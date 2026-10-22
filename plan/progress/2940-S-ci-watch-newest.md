# 2940 — S-ci-watch newest

Backlog item 9, S-verify / S-bughunt; release evidence for R-release.
Audit date: 2026-10-21. Audited main and local HEAD:
`f8a4d49162d8172aa9a7c10237125e402ab30515` (also confirmed with
`git ls-remote origin refs/heads/main`).

## Hosted CI and release candidate

Started with the requested `gh run list -L 10`, then queried main's CI workflow
with `gh run list --branch main --workflow CI -L 40 --json databaseId,headSha,conclusion,createdAt,displayTitle,status`.
Deploy workflow runs marked skipped are not green CI evidence.

**Newest fully green main SHA: `55220c89f02b61aefbe08877035b97ff0baec918`.**
[CI run 39513009283](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39513009283)
started 2026-10-20 23:08:29 UTC and completed at 23:39:55 UTC. Its conclusion is
success, with all 42 jobs successful: static checks, two builds, project-base,
and all 38 e2e shards. This is the hosted-green candidate for the next f<N> tag;
no tag or push was performed. Every newer main CI run in the query is failed or
cancelled; the newest main SHA is not release-green.

The three newest distinct main SHAs have the same five failing specs:

| SHA                                        | Run                                                                                            | Overall result                                                                       |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `f8a4d49162d8172aa9a7c10237125e402ab30515` | [39563595521](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39563595521) | Failure; 33/38 e2e shards passed; static checks, both builds and project-base passed |
| `849370703f232e393cd8b1ed25683358d0ffce68` | [39559381443](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39559381443) | Cancelled overall; five e2e jobs had already failed                                  |
| `a35a9c2b1a56ac631147c9622a9e70a176ed7f81` | [39553945720](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39553945720) | Failure; same five red shards                                                        |

`gh run view --log-failed` and `gh run view --job ... --log` returned empty
output here. Retrieved and read each failing job's text logs instead with
`gh api repos/wjjztd2rz8-coder/submarine-explorer/actions/jobs/<job-id>/logs`:
all five jobs on each of the three SHAs, 15 job logs total. Local evidence is in
`.cache/ci-watch/`; no screenshot artifacts were downloaded or viewed.

## Failure decisions and smallest changes

| Newest-run shard and job log                                                                              | Failing spec                                                       | Decision and action                                                                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [11/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39563595521/job/119101082594) | `hud-touch.spec.ts:571`, menu touch journey, 667x375               | Stale test: expected exact menu list omits Your sub. Added that action after Journal in the existing shared expectation.                                                                                                                   |
| [23/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39563595521/job/119101082557) | `hud-touch.spec.ts:571`, same journey, 390x844                     | Same stale expectation and same one-line fix.                                                                                                                                                                                              |
| [38/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39563595521/job/119101082705) | `d-shell.spec.ts:96`, home/site/pause journey                      | Stale test: six expected direct actions versus seven actual. Added Your sub to both exact ordered lists, changed direct count 6 to 7 and total button count 8 to 9.                                                                        |
| [14/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39563595521/job/119101082427) | `journal-debrief.spec.ts:1540`, Blue Hole unaided journey, 390x844 | Unresolved strict touch-target failure: pick-mission globe pin width `43.99998474121094`, expected >=44. Test measurement defect (stale/overprecise test), reproduced independently on a blank page; not a flake. Guard retained verbatim. |
| [15/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39563595521/job/119101082488) | `journal-debrief.spec.ts:1540`, Titanic unaided journey, 390x844   | Same test measurement defect and unchanged guard; unresolved hosted failure.                                                                                                                                                               |

The menu change is intentional in `src/ui/Home.ts`: its documented DOM/Tab
order includes Your sub. Commit `fcc078dcfbbb284e0bded6cc615692a238564cbf`
already updated the separate title-layout test for that action, leaving these
two capability specs stale. Exact counts, order and existing navigation guards
remain enforced; no assertion is skipped or made permissive.

Both globe failures repeat with the identical value on all three audited SHAs.
The shortfall is 0.0000152587890625 CSS px. `globe.css` sizes the hit box using
`--globe-hit`; `touch.css` requires at least 44 px, and `Globe.ts` positions pins
with fractional translations. A numerical Chromium probe on a blank page
(no game import, server or screenshot) reproduced the **exact hosted value**:
a button with width/min-width 44 px and
`transform: translate(234.3px, 100px) translate(-50%, -50%)` reports
`getBoundingClientRect().width === 43.99998474121094`, while `offsetWidth === 44`
and computed width/min-width both equal `44px`. Viewport: 390x844. Logs:
`.cache/ci-watch/rect-fixture.log` and `.cache/ci-watch/rect-exact-fixture.log`.
This establishes a deterministic precision failure in the measurement without
replaying the game journey. It does not prove the game's complete effective hit
area. Classify these as test measurement defects rather than flakes; no small
game defect was established by this audit.

No tolerance, rounding, alternate measurement or CSS/position patch was applied.
A measurement workaround would weaken the strict existing 44 px guard, and
changing the pin's placement or dimensions is outside this non-visual task.
These two hosted failures therefore remain release blockers for follow-up under
the visual lane or revised task constraints. This audit fixes three failing
cases, not all five.

## Local validation and limits

Actual local e2e mode: **none**. Isolated failing-spec executions: **0/3** for
each case. The explicit instruction not to render the game or capture
screenshots prevents executing these existing specs: all boot the game, and the
journey harness unconditionally captures screenshots before its assertions.
Likewise `smoke.spec.ts` and `base-url.spec.ts` explicitly capture screenshots.
The task constraint, rather than an environment failure, blocks those requested
browser reruns and smoke/project-base validation. No flake classification is
claimed from nonexistent local reruns. The blank-page numerical probe above
is not an isolated rerun of the game spec. Hosted CI supplies the full-suite evidence.

- Focused non-rendering check: **PASS**, 3 files / 80 tests, exit 0:
  `npm test -- --configLoader runner --cache=false tests/unit/homeFocus.test.ts tests/unit/globe.test.ts tests/unit/touchControlsAudit.test.ts`.
  Log: `.cache/ci-watch/focused.log`.
- Playwright discovery only: **PASS**, 210 tests / 3 files, exit 0:
  `npx playwright test tests/e2e/d-shell.spec.ts tests/e2e/hud-touch.spec.ts tests/e2e/journal-debrief.spec.ts --list`.
  This parses the capability specs; it does not execute browser assertions.
  Log: `.cache/ci-watch/discovery.log`.
- Required aggregate invocation, after the focused check:
  `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`.
  Log: `.cache/ci-watch/gates.log`;
  run directory: `.cache/runs/20261021-031800-16-mq0iTd/`.
  **PASS**, exit 0, `PASS gates (e2e=none)`:
  config preparation, Python (167 tests), strict content validation,
  TypeScript/production build, unit (192 files / 3,389 tests; 521.91 seconds),
  attribution and repository-wide Prettier all passed.
- Environment blocks: **none observed** in the executed checks. The existing
  writable-config mode handled the shared dependency tree. Browser checks were
  omitted because of the task constraints described above, not an environment
  failure; local smoke/project-base and isolated game-spec passes are not claimed.
- Final owned-file formatting and `git diff --check`: **PASS**. The recorded
  green candidate is an ancestor of the audited main SHA.

## Scope and simplicity

Only two existing capability specs and this progress note changed. No new
runtime code, UI elements, settings, branches or package-named tests. No change
to `tools/`, `plan/DIRECTOR.md`, other worktrees, art, CSS or camera. No game
rendering or screenshots. No merge, tag or push.
