# 3510 — V-journeys-current: second-objective journeys

## Status

Blocked by the sandbox's browser restrictions on 2026-10-23. Stopped as
explicitly requested; no source or test changes, rebase, cherry-pick, merge,
push or new acceptance captures. Journey completion and rendered reward text
remain unverified.

## Plan and scope

1. Read `plan/DIRECTOR.md`, compare current main with the 3310 extension, and
   check whether the sandbox can launch a preview and browser.
2. If browsers work, re-apply the necessary extension to the existing
   `tests/e2e/journal-debrief.spec.ts` capability spec. Cover Titanic and
   Monterey through their second objective, Journal and debrief on desktop,
   portrait touch and landscape touch. Preserve current main's spec fixes and
   existing regression assertions; use ordinary input and visible guidance.
3. Check completion-frame and subsequent-frame reward directions against the
   next waypoint. Fix only demonstrated non-visual defects, minimally, with
   no site branches in shared production code.
4. Run two journey rounds and `tools/gates.sh --full-e2e`, retain actual
   results, and report any visual findings for the Claude lane.

Only step 1 completed. Steps 2–4 were not performed after the browser preflight
failed. This note records evidence for the existing DIRECTOR backlog item,
not a separate forward plan.

## Repository findings (static inspection)

- Starting HEAD and local main both resolve to
  `ccef32398e7eac7eee4719dc6f2740dadb103314`. The worktree was clean.
- The 3310 worktree is clean at `f5cb3dc` on
  `codex/3310-S-verify-journeys-current`. Its unique commit includes the
  journey extension along with scanner, reward guidance, touch target and
  stale-spec fixes. Importing that entire commit would needlessly replay
  fixes already present on main.
- `git diff main codex/3310-S-verify-journeys-current --
src/ui/ScanOverlay.ts src/game/Scanner.ts` produces no changes: both
  production files already match 3310. In particular,
  `ScanOverlay.objectiveCue()` suppresses directions when the objective ID
  still equals the completed scan ID. Current main also has broader
  table-driven guidance tests that exercise two objectives and waypoint
  agreement. These are source observations, not tests run in this session.
- Main's existing unaided journey matrix covers Titanic and Great Blue Hole
  at 1280×720, 390×844 and 844×390, ending after the first scan and debrief.
  The 3310 extension continues only Great Blue Hole desktop and portrait to
  the second objective (`site === 'great-blue-hole' && layout.height > 390`).
  It does not supply the requested Titanic/Monterey second-objective matrix.
- Main's journey helper already includes steering fixes. A future re-apply
  must preserve those changes and adapt the continuation to the requested
  sites rather than replace the spec with the older branch version. Existing
  assertions and guidance coverage must remain intact.
- There is no new evidence here that the reward card conflicts with the next
  waypoint, and no browser evidence proving it never conflicts. No speculative
  production fix was made.

## Browser preflight and stop condition

A Node preflight imported Playwright, attempted a loopback listener on an
automatically selected port, then attempted to launch installed headless
Chromium and create a simple page. Observed output:

```text
PREVIEW_BIND_FAIL EPERM listen EPERM: operation not permitted 127.0.0.1
BROWSER_LAUNCH_FAIL browserType.launch: Target page, context or browser has been closed
[1023/180026.642255:FATAL:content/browser/sandbox_host_linux.cc:41] Check failed: . shutdown: Operation not permitted (1)
```

Chromium was installed at
`/home/vijay/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`;
it exited with `SIGTRAP` before a page could be created. This is an environment
failure before gameplay, not a failing journey assertion or missing browser
installation. The preflight command exited 1. Approval policy is `never`, so
an execution outside the sandbox is unavailable in this session.

The user's instruction, “If the sandbox cannot run browsers, say so and stop
with a report,” applies. No browser workaround, journey run, full e2e suite or
aggregate gate was attempted after this failure. `ROUNDS=2` and `FULL_E2E=1`
are therefore unfulfilled, not passing or skipped test results. Historical
3310 results and old captures were not reused as current acceptance evidence.

## Final report

**Outcome: blocked; verification incomplete.** No gameplay, source or test
changes. Only this progress/report note was added. The required gate command
`bash tools/gates.sh --full-e2e` was not run because the explicit browser stop
condition was met first. No current reward times, screenshots, completed
journeys or green gate result are claimed. The requested re-application and
two-round Titanic/Monterey acceptance require a browser-capable environment.
