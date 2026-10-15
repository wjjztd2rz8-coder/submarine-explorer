# 1910 — S-ci / R-release hosted triage

Backlog: S-tests hosted CI / R-release. Base: `8beae85a109ab71ff0133a37982173051a7a70ca`.

## Hosted evidence

Ran `gh run list -L 10`. Newest completed main CI:
[38640833172](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/38640833172)
at `c239e5cd4a17b01ec43bf4cedb3a397a0730af7e`, failure. Static checks,
root/project builds and project-base browser check passed; 12 e2e shards passed,
18 failed. CI has no workflow_dispatch. Deploy and render-nightly do, but neither
substitutes for the full CI gate. Newer main CI 38648753124 at `8beae85` is in progress.
`gh run view --log-failed` returned empty output; downloaded the complete log ZIP
with the Actions API instead. Logs: `/tmp/1910-ci-logs/`. Named failures also saved
in `.cache/1910-evidence/failures.json`.

## Triage by capability

- Home/site selection: the S-picker portrait sheet deliberately starts collapsed.
  Reveal it with the public Show all sites control before selection; retain full
  viewport and center hit-testing guards. Journey navigation waits for the intended
  mission URL rather than any load event. Landscape globe is now deliberately
  visible; explicitly hide its container to retain the CSS-hidden renderer guard.
- Modes/equipment: S-rewards equips every save. Keep exact preset assertions and
  account for the fixed scan/thrust multipliers. Place the sonar target between
  Realistic and Arcade sensor ranges to preserve the live hide/show guard.
- Home actions: six original actions, Daily and Advanced are exactly eight buttons.
  Keep the explicit action names/order and individual Daily/Advanced assertions.
- Phone Daily objective: S-hud deliberately replaces the list with the guidance slot.
  Require objective guidance and hidden duplicate list; measure separation from sonar.
- Animal hint: a data-kind selector is absent while another message owns the slot.
  DOM auto-wait prevented the paused-clock test from reaching its next frame.
  The old overlay suppression now suppresses the entire shared slot, so withdraw
  only the scan source via the existing helper. Read the stable slot during polling;
  keep hint content, priority, unseen-state,
  lifetime and geometry assertions.
- Catalog tutorial: initial altitude publication needs initial physics frames.
  Reduce excess initial renderer work from 500 to 50 ms, retaining real physics
  frames before freezing position and all tutorial/reload/layout checks.

## Salvaged work

1740 and 1840 both have uncommitted f2-progress clock changes. Imported 1840's
reviewed patch into this worktree; sibling files remain intact. It includes the
newer lamp-trim/four-control assertions. All five reward/persistence cases, real
keyboard scanning, full 400 ms freeze interval, focus, color, stars, deep hull,
duplicate credit and page-error checks remain. No skips, threshold relaxation,
workflow edits or render-only transfers.

## Named hosted failures

- **e2e (11_30)**: `tests/e2e/f-bughunt-960.spec.ts:58:11 › 960 390x844 › titanic arcade high: briefing, assisted scan, Journal, debrief and saves `
- **e2e (11_30)**: `tests/e2e/f-bughunt-960.spec.ts:58:11 › 960 390x844 › titanic realistic low: briefing, assisted scan, Journal, debrief and saves `
- **e2e (12_30)**: `tests/e2e/d-sonar.spec.ts:144:1 › whole-tile step remains available and sensor range gates POIs `
- **e2e (12_30)**: `tests/e2e/f-bughunt-960.spec.ts:58:11 › 960 390x844 › titanic arcade low: briefing, assisted scan, Journal, debrief and saves `
- **e2e (12_30)**: `tests/e2e/hud-touch.spec.ts:1271:9 › animal guidance placement › 360x640-150 › monterey-canyon: the animal hint waits for the scan card, then clears the HUD `
- **e2e (13_30)**: `tests/e2e/f-bughunt-960.spec.ts:58:11 › 960 390x844 › great-blue-hole arcade high: briefing, assisted scan, Journal, debrief and saves `
- **e2e (15_30)**: `tests/e2e/hud-touch.spec.ts:1522:9 › catalog tutorial and reload › 1280x720-touch › monterey-canyon: tutorial, contact, reward, chip and reload `
- **e2e (16_30)**: `tests/e2e/f-bughunt-960.spec.ts:58:11 › 960 390x844 › great-blue-hole realistic high: briefing, assisted scan, Journal, debrief and saves `
- **e2e (16_30)**: `tests/e2e/hud-touch.spec.ts:1015:5 › portrait telemetry and small controls › Portrait portrait telemetry › Daily objectives have space beside sonar `
- **e2e (18_30)**: `tests/e2e/journal-debrief.spec.ts:1465:9 › Home to scan and return journey › journey 390x844 › great-blue-hole: Home -> opening -> Journal -> debrief -> Home `
- **e2e (19_30)**: `tests/e2e/hud-touch.spec.ts:1271:9 › animal guidance placement › 360x640-100 › monterey-canyon: the animal hint waits for the scan card, then clears the HUD `
- **e2e (1_30)**: `tests/e2e/journal-debrief.spec.ts:1465:9 › Home to scan and return journey › journey 390x844 › monterey-canyon: Home -> opening -> Journal -> debrief -> Home `
- **e2e (20_30)**: `tests/e2e/f-bughunt-960.spec.ts:58:11 › 960 390x844 › titanic realistic high: briefing, assisted scan, Journal, debrief and saves `
- **e2e (20_30)**: `tests/e2e/hud-touch.spec.ts:1271:9 › animal guidance placement › 1280x720-100 › monterey-canyon: the animal hint waits for the scan card, then clears the HUD `
- **e2e (21_30)**: `tests/e2e/journal-debrief.spec.ts:1465:9 › Home to scan and return journey › journey 390x844 › titanic: Home -> opening -> Journal -> debrief -> Home `
- **e2e (23_30)**: `tests/e2e/hud-touch.spec.ts:1271:9 › animal guidance placement › 1600x900-100 › great-blue-hole: the animal hint waits for the scan card, then clears the HUD `
- **e2e (24_30)**: `tests/e2e/hud-touch.spec.ts:1271:9 › animal guidance placement › 390x844-100 › great-blue-hole: the animal hint waits for the scan card, then clears the HUD `
- **e2e (25_30)**: `tests/e2e/f-title-audit.spec.ts:8:3 › title touch navigation › Daily and selector actions work by tap; a CSS-hidden globe stops drawing `
- **e2e (27_30)**: `tests/e2e/f-bughunt-960.spec.ts:58:11 › 960 390x844 › great-blue-hole realistic low: briefing, assisted scan, Journal, debrief and saves `
- **e2e (27_30)**: `tests/e2e/hud-touch.spec.ts:1271:9 › animal guidance placement › 390x844-150 › great-blue-hole: the animal hint waits for the scan card, then clears the HUD `
- **e2e (29_30)**: `tests/e2e/hud-touch.spec.ts:1271:9 › animal guidance placement › 844x390-100 › monterey-canyon: the animal hint waits for the scan card, then clears the HUD `
- **e2e (30_30)**: `tests/e2e/d-modes.spec.ts:7:1 › Arcade, Realistic and Custom apply live and survive reload `
- **e2e (30_30)**: `tests/e2e/hud-touch.spec.ts:1271:9 › animal guidance placement › 844x390-150 › great-blue-hole: the animal hint waits for the scan card, then clears the HUD `
- **e2e (5_30)**: `tests/e2e/d-shell.spec.ts:96:1 › home, site grid, pause, objectives, resume and quit `
- **e2e (8_30)**: `tests/e2e/f-bughunt-960.spec.ts:58:11 › 960 390x844 › great-blue-hole arcade low: briefing, assisted scan, Journal, debrief and saves `

## Validation and release candidate

Validation in progress. The ordinary Vite bundle loader writes into the shared
read-only node_modules; runner loading hits the PWA closeBundle lifecycle error.
The existing `GATES_CONFIG_MODE=writable` build path succeeds using its local
native bundle. Python: 166/166 pass. Root build and provenance manifest: pass.

First recorded hosted-green candidate after f52: **`5f5eb3926a24414539ac7c793c6e37c436f05aac`**
(Merge codex/1700-S-tests-hosted-ci-2).
[CI 38526935691](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/38526935691)
is completed/success with all 30 shards, static checks, two builds and project-base
browser check passing.
[Pages 38526935670](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/38526935670)
also completed/success on that exact SHA. `git merge-base --is-ancestor f52 5f5eb39`
succeeds. The success-run list contains no other green CI between f52 and this
commit. This historical commit is eligible as an f53 candidate, but excludes
subsequent merged work and this repair. No tag created. Current 8beae85 remains
unverified until its run completes; a new release containing these repairs needs
its own green hosted CI and Pages deploy.

Normal `git add` fails creating the shared worktree index.lock (read-only filesystem).
A local writable checkpoint repository/bundle will preserve the final repairs
without changing sibling worktrees or pretending the normal branch advanced.
