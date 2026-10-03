# F-BUGHUNT-8 — touch and Daily regression audit

2026-10-03. Two audit/fix rounds in the current worktree; no commit.

## Scope

Reviewed history since `f7`, concentrating on the daily-touch (`8baf703`),
touch-audit (`e5f7543`) and bughunt-6 (`4990414`) merges and their follow-ups.
Read the changed routing, boot, touch, scan, Daily, progress, CSS and regression
coverage, plus the input, mode and system teardown contracts.

## Round 1 — touch lifecycle

- Window/document listeners, including hidden-tab visibility handling, are
  registered with matching teardown callbacks. Detached controls own their
  local listeners; no global listener leak was found in TouchControls.
- Regression tests check listener removal, disposal/recreation, visible versus
  hidden visibility events, and double taps spanning interruption boundaries.
- Confirmed and fixed: disposal left `Input.touchActive` true, and gesture
  release retained the first tap, allowing unrelated taps across focus/layout,
  desktop, pause or photo transitions to reset the camera. Disposal now clears
  the flag and release resets double-tap history. Seven failing regressions
  were captured before fixing in `.cache/bughunt-8-round1-red.log`; the focused
  touch suites then passed all 41 tests.

## Round 2 — Daily availability

- Confirmed and fixed: with only a deep-site tile downloaded, switching from
  Arcade/Custom to Realistic left an accessible-looking Daily card and stale
  launch action. Refresh now hides/clears the card when there are no eligible
  sites and resets its display cache so the same day's card returns correctly.
- The regression uses the real Home card, Save and Progress, both directions of
  mode changes, UTC midnight while unavailable, disposal and system reuse.
  Captured its failure in `.cache/bughunt-8-round2-red.log` before fixing. Daily,
  boot, mode exploration and routing suites pass all 27 focused tests.
- Rechecked boot-time cloned settings, midnight date capture, dated Daily reward
  keys, mode-independent discoveries/rewards and next-dive hull fitting. No
  further confirmed regression in these paths; no refactoring or commits.

## Validation

- `PW_PORT=4293 tools/gates.sh`: **PASS build, unit, Python, strict content,
  attribution and Prettier**. Full unit suite: **97 files / 1,008 tests passed**.
  Both e2e gates stop before browser tests because the preview server cannot
  start; a direct bind confirms `listen EPERM: operation not permitted
127.0.0.1:4293` in `.cache/bughunt-8-preview-bind.log`. The project-base build
  passes. Browser execution and screenshot review remain unverified.
- Strict TypeScript and `git diff --check` pass. All changed files were formatted
  with Prettier; no dependencies or gate configuration changed.
- The original external `node_modules` symlink makes Vite's temporary config
  writes fail with EROFS. Checks use ignored local package links to the same
  dependencies and writable local Vite caches, excluding the nested dependency
  symlink. The original symlink was restored after gates.
