# F-BUGHUNT-14 — share, CI and title bridge verification

2026-10-03. **Partial verification; full gates and merged task 330 acceptance
remain pending.** No art, copy, dependency, gameplay-clock or gate changes.

## Reviewed revisions

- Starting checkout: `dac0f06`. Read `git log -15` and `git log main -15`,
  the title specification and progress notes for tasks 330/340/350.
- Local main advanced during this audit to `b2e9c66`, including task 350
  (`5b9d251`, merge `c5d4b4c`) and task 340 (`e625c44`, merge `b2e9c66`).
  Reviewed both complete diffs and their merged progress notes.
- Task 330 remains uncommitted in its separate worktree, whose branch points
  at `6014c0c`. Reviewed its working diff and `F-BUGHUNT-13.md`, then checked
  the candidate together with merged 340/350 in an isolated snapshot. This
  establishes candidate compatibility, not verification of a merged commit.
- The shared Git metadata is read-only here. Tests of main use `git archive`
  of the exact revision in `/tmp/f-bughunt-14-main`; the task branch is not
  rebased or populated with other tasks' changes. The only implementation
  delivered here is the viewport fix below.

## Small defect fixed

At square viewports up to 500 px tall, `home.css` selects its sideways layout
because `min-aspect-ratio: 1/1` includes equality, while `titleLayout` used
strict `width > height`. The scene drew into the portrait top band while the
menu used the left scene plate. Changed the comparison to `>=`, with no camera,
terrain, colour, vehicle or CSS changes. Added eight unit cases covering three
square sizes, actual canvas region shape and neighboring height/width boundaries.
Before the fix: three failures, five passes. After: eight passes. Logged the
change in `CHANGELOG.md`; no features were cut.

## Share metadata and built asset

Both `og:image` and `twitter:image` in **built HTML** point to
`https://wjjztd2rz8-coder.github.io/submarine-explorer/share/bathyline-og-1200x630.png`.
Removing the configured Pages base `/submarine-explorer/` maps directly to
`share/bathyline-og-1200x630.png` in the production output.

Verified root and Pages builds independently: asset exists, has a PNG signature
and 1200 × 630 IHDR, is 128,831 bytes, and is byte-identical to the committed
source. SHA-256:
`7095dbddc5135fac8f7b22e32675ce790cdf9fa97238e356cd8e294d6f7a3813`.
Both stamped workers include the scope-relative asset; both HTML documents
retain the large-image Twitter card and matching image alt text. Visually
inspected the existing built PNG; no regeneration or artwork edits.

Evidence: `/tmp/f-bughunt-14-main/.cache/f14-share-verification.json`, retained
`dist-f14-root/` and `dist-f14-pages/` under that snapshot. This verifies shipped
files and URL/base mapping; it does not assert the live Pages URL is deployed
or returning HTTP 200. Remote access is unavailable here.

## CI classification, independently checked

`gh run list --workflow ci.yml` cannot connect to `api.github.com`. Read all 18
combined job logs in each cached ZIP under `/tmp/gh-cli-cache/`, including the
canceled jobs. Extracted evidence is in
`.cache/f-bughunt-14/ci-evidence/{37109366947,37124455252}.txt`.

| Run                                                                                            | Evidence                                                                                         | Classification and merged mitigation                                                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [37109366947](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/37109366947) | Shard 14 vent preset expects two draws, receives zero on both attempts.                          | CI seeds Low, which disables preset geometry. Task 350 explicitly selects Medium for shader cases and waits for rendered frames. Exact draw assertions remain.                                                                                                                                                   |
| [37124455252](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/37124455252) | Shard 14 clock advances 0.75 s during a two-second sleep; retry cannot find debrief within 20 s. | Slow-renderer synchronization: `Time.tick` clamps frame time to 250 ms; physics additionally caps catch-up steps. Task 350 samples accumulated frame time and polls router completion while preserving clock, UI, event, depth, freeze and restart outcomes. Actual completion after the fix remains unverified. |

Both final shard failures occur far before the suite/job deadlines, so these
logs do not support a shard-budget-exhaustion diagnosis. Static checks and the
separate project-base job passed in both runs. Matrix cancellation and unrun
cases do not establish passing coverage. CI discovery loads all 17 cases in
the two edited specifications. No new green hosted run is claimed.

**Additional evidence beyond task 350's final-failure inventory:** canceled
shard 2 contains an unsuccessful first attempt for Bismarck at
`2026-10-03T08:23:22.786Z` (57.8 s) in run 37109366947, and Hunga Tonga at
`2026-10-03T12:57:09.831Z` (1.0 m) in run 37124455252. These precede job
cancellation; the logs contain no final retry result or assertion stack.
Treat both as unresolved attempts requiring artifacts/reproduction, rather
than assuming cancellation caused the original unsuccessful attempt. Task
350 edits neither content-missions case.

## Title and navigation sweep

Reviewed initial load, fallback/crop completion, render ownership, site entry,
Back/Escape focus return, Free dive filtering, visibility/modal suspension,
resize/DPR, reduced motion and teardown. The 330 candidate covers renderer
target/exposure restoration, same-size/DPR invalidation, hidden-tab events,
optional-load teardown, invalid Continue focus, hidden selector rendering,
48 px globe targets and offline assets. Its code/test overlay with main and
this breakpoint fix passes **89 tests across six focused suites**. Native
browser behavior and mobile screenshots remain unverified.

Larger follow-ups:

1. **Free dive globe routing (P2, source-confirmed):** Home changes the list's
   `is-free-dive` class; it does not pass that choice to `Globe.select`. A
   mission-backed globe pin still runs `missionUrl`, and the shared mission
   access check can lock it, even though the same site's tile row is an open
   free dive. Reproduce with Home → Free dive → Titanic globe pin versus its
   tile row. Fix needs a shared selector-mode contract across Home, shell,
   Globe and progress, including mission/tile ID mapping, access checks and
   reset on Back. Keep mission selection in Dive sites and the overlay globe.
2. **Browser history (P2, source diagnosis; runtime reproduction pending):**
   Quit and debrief Home/Dive sites push a bare URL and change app state, but
   there is no `popstate` handler in `src`. Browser Back can restore the dive
   URL while leaving the home/title state active. Verify Quit → browser Back
   and Forward at both bases, then define reload or state reconciliation with
   explicit mission lifecycle behavior. Selector Back/Escape is a separate,
   existing focus-return path.
3. **Hosted CI coverage:** obtain latest runs and artifacts for the unresolved
   content-missions attempts, reproduce them, and record complete green shard
   execution after the merged synchronization fixes. Missing retry results
   cannot be classified as fixed.
4. **Task 330 merge and browser acceptance:** repeat against its actual merge
   revision, including root/project-base title audit and native mobile/tab
   behavior. Candidate unit results do not replace this prerequisite.

## Gates and handoff

- Focused current-branch title suites: **54 tests pass**. Full current-branch
  gate: configuration, build/typecheck, **1,123 unit tests / 103 files**, **138
  Python tests**, strict content, attribution and formatting all pass.
- Exact main `b2e9c66` snapshot plus this fix/test: configuration,
  build/typecheck, **1,123 unit tests / 103 files**, **140 Python tests**,
  strict content, attribution and formatting pass. Both production bases build.
- `GATES_CONFIG_MODE=writable PW_PORT=4370 tools/gates.sh --full-e2e` in this
  checkout and the same full gate with port 4380 in the main snapshot both
  **exit 1**. E2e and e2e-base fail before browser assertions at preview startup.
  Logs: `.cache/f-bughunt-14-gates.log`, `.cache/gates/`, and
  `/tmp/f-bughunt-14-main/.cache/f14-main-gates.log`.
- Independent Node listen probe: `EPERM` on `127.0.0.1:4370`. Playwright
  webserver debugging also shows `connect EPERM` for both localhost addresses;
  `/tmp/f-bughunt-14-main/.cache/f14-preview-environment.log`. No assertions,
  timeout limits or gate selections were weakened to make this appear green.
- `git diff --check` passes. The supplied dependency symlink is unchanged;
  snapshot validation uses local package links and writable cache directories.

The required complete gate remains **not passed**. On a browser-capable host,
apply this fix after task 330 merges and run `tools/gates.sh --full-e2e` on the
final main revision before release. Inspect generated screenshots and complete
CI coverage, including the unresolved content-missions attempts.
