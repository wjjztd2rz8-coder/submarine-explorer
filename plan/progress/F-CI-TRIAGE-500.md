# F-CI-TRIAGE-500 — main CI failure triage

2026-10-03. Implementation complete; latest hosted evidence and browser
acceptance remain blocked by this environment. Baseline: `ced0c38`.

## Plan and progress

1. Inspect the latest main CI run and every failed job: attempted the requested
   CLI/API reads; recovered and inspected complete cached logs for the supplied
   run and five earlier runs. Current main's latest run is **not verified**.
2. Compare failed sources with this checkout and separate behavior changes from
   renderer timing: complete for the recovered inventory, with uncertain causes
   explicitly identified below. Several scan fixes were already merged.
3. Reproduce and fix: reproduced hint expiry through the actual HUD frame hook;
   replaced surviving timing assumptions and reduced audit round trips. Browser
   reproduction attempted, but preview cannot bind localhost.
4. Validate with full gates, document results and update CHANGELOG: see below.

## Evidence and access limits

`gh run list -L 5`, `gh run list --workflow CI`, the branch-filtered list,
`gh run view 37150929616 --json jobs`, and
`gh api repos/wjjztd2rz8-coder/submarine-explorer/actions/runs/37150929616/jobs`
all fail connecting to `api.github.com`. The requested per-job logs endpoint was
also attempted using known job `111244558975` from cached `/tmp/390-ci-jobs.json`;
it fails identically. That ID belongs to the older run `37137381380`, not the
supplied run. No current job ID or current run conclusion is invented.
Errors and recovered combined job logs are under `.cache/f-ci-triage-500/`.

The most recent **cached** run is
[37150929616](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/37150929616),
SHA `e364a031f47c8534b3e928a59e9d058f24c753b1`, starting around 20:16 UTC.
It has **12 failed e2e shards**, four passing shards, passing static checks,
and passing project-base checks. Canceled and unexecuted tests are not passes.
Two shards exhausted the 20-minute suite budget. Retry successes are separately
identified as flaky in the logs, not silently treated as clean executions.

| Cached run  | SHA     | Reported failed jobs / coverage                                  |
| ----------- | ------- | ---------------------------------------------------------------- |
| 37150929616 | e364a03 | 12 e2e shards; full inventory below                              |
| 37144192880 | 3aa77c1 | Life scan on shard 12; 14 shards canceled                        |
| 37142008397 | 48626d5 | Life scan on shard 12; 14 shards canceled                        |
| 37140948374 | f4a01b1 | Life scan on shard 12; 14 shards canceled                        |
| 37139936596 | 07778be | Life and progress scans on shards 12/13; other coverage canceled |

Static and project-base checks pass in all five cached runs. The extra recovered
run `37137381380` shows the same stale-pose failure for Hunga Tonga. Cached logs
are a fallback inventory, not a substitute for a fresh latest-five API response.

## Failing specs and root causes

Line numbers in this table refer to the failing SHA, not the edited checkout.

| Shard | Failing spec / case                                                                           | Evidence and classification                                                                                                                                                                                                                                                                                                         | Resolution / remaining verification                                                                                                                                                                                                                                                                    |
| ----- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1, 2  | `content-missions.spec.ts:125`: Titanic and Hudson Canyon, briefing → primary scans → debrief | Every rejected pose's diagnostic read reports the requested bow/wall ID. The 600 ms pose probe samples before Discovery's next frame; the later read sees the updated state. Retry hits the hardcoded 120 s test limit. **Renderer synchronization**, not evidence that the POI is missing.                                         | Current checkout already has frame-based pose checks, configured CI budget preservation, and the real held-input scan helper. This change refreshes Discovery at the actual pose with zero elapsed time before reading `candidateId`; all objective, scan-count, banner and debrief assertions remain. |
| 3     | `d-polish.spec.ts:7`: live tips / screenshot                                                  | Initial visibility succeeds, but the element becomes hidden before its screenshot; 26 retries say **not visible**, not moving. Retry fails initial visibility. `hud.draw` intentionally expires the bar after 20 s. **Test contract regression following the HUD redesign**, with software GL making the stale assumption reliable. | Hold the fresh hint deadline for this layout fixture; preserve visibility, screenshot, preference-off and rebound-key text checks. Add separate expiry coverage.                                                                                                                                       |
| 6     | `f-hud-layout.spec.ts:55`: desktop-1600 fresh HUD                                             | Tips expected visible during a long sequence of screenshots, tutorial steps and layout reads after their deadline. Touch tips are intentionally hidden by `html.is-touch` CSS. **Same stale lifetime contract**, not a reason to remove touch hiding or increase timeouts.                                                          | Hold deadline during layout checks, await entrance animation completion, retain all overlap/viewport/44 px assertions. Learned dismissal now requires the persisted learned flag; a separate case verifies expiry without learning. Camera tips audit uses the same fresh state.                       |
| 12    | `f2-life.spec.ts:116`: animal scan, Journal, persistence                                      | Both attempts time out waiting for scan completion at 20 wall seconds. Moving wildlife and capped Discovery time are tied to rendered frames. **Scan timing**, not enough evidence for a gameplay defect.                                                                                                                           | Already addressed by `9b87cd2` / `a12afb5` in this checkout: use real held input, fixed Discovery scan increments, and a stationary animal fixture. No new changes here; browser acceptance still needed.                                                                                              |
| 13    | `f2-progress.spec.ts:84`: RP, live upgrade, three-star dive                                   | Both attempts time out waiting for the persisted scan at 20 s. **Scan timing**.                                                                                                                                                                                                                                                     | Existing shared scan helper already completes the real recorder/event path without depending on GL speed; reward/persistence assertions retained.                                                                                                                                                      |
| 11    | `f2-explore.spec.ts:104`: three hidden discoveries                                            | Both attempts time out waiting for `lastCompleteId`. **Scan timing**.                                                                                                                                                                                                                                                               | Existing held-input scan helper is already merged; no extra timeout changes.                                                                                                                                                                                                                           |
| 14    | `mission.spec.ts:185`: bow/stern → banner → debrief                                           | Both attempts time out inside `holdScanUntil` after 20 s. **Scan timing**.                                                                                                                                                                                                                                                          | Existing real held-input helper already merged; mission outcome checks retained.                                                                                                                                                                                                                       |
| 14    | `mission.spec.ts:84`: briefing freeze / start (flaky)                                         | Flood for 1.5 wall seconds produces <1 m descent; retry passes. Physics caps at eight 60 Hz steps per rendered frame. **Software-GL timing flake**.                                                                                                                                                                                 | Keep flood held until original `y < y0 - 1` state, release in `finally`, retain final numeric check.                                                                                                                                                                                                   |
| 11    | `f1-touch.spec.ts:64`: stick, ballast, scan, pause (flaky)                                    | Ballast after 1.5 s changes depth 0.0276 m, below the existing 0.05 m check. **Same capped-physics timing**.                                                                                                                                                                                                                        | Wait for original horizontal and depth movement thresholds while real touch input is held. Retain touch-axis, scan and pause assertions.                                                                                                                                                               |
| 15    | `sub-playtest.spec.ts:75`: scripted handling                                                  | First attempt travels 7.99 m rather than >10 m; retry has not lost half its speed after 6 wall seconds. **Same capped-physics timing**. The current baseline also restores this script's north-facing open-water spawn.                                                                                                             | Wait for original acceleration/displacement, coasting, yaw/bank and ballast states. Camera/sim-speed checks wait for their actual state, including the intermediate 3× edge. Every original handling threshold remains.                                                                                |
| 5     | `f-copy-regress.spec.ts:20`: authored titles, desktop                                         | One attempt exhausts the test budget on repeated layout reads; retry sees an empty current title. **Audit fixture/read race plus round-trip cost**; cached logs alone cannot prove a production copy regression.                                                                                                                    | Apply each fixture and read title, hint, visibility and all layout bounds in the same browser task. Keep every authored objective at both scales and the optional-label boundary assertions. No corpus reduction or skip.                                                                              |
| 8     | `f-touch-audit.spec.ts:66`: 667×375, 80% UI                                                   | Earlier passing 390×844 audits take nearly four minutes each; suite reaches 20 minutes. Last case obtains a null box during an expanded-sonar target read. **Throughput failure; target disappearance cause remains unverified** without its trace/browser reproduction.                                                            | Batch each layout snapshot and each target's bounds/hit test, explicitly require target visibility, retain every scale/tutorial step/44 px/hit-center assertion. Do not classify the null box as a confirmed CSS defect or bypass it.                                                                  |
| 4     | `f-a11y.spec.ts:151`: standalone globe keyboard reachability                                  | After many Tab/outline round trips, the test budget expires on catalogue pin 30; suite reaches 20 minutes. **Throughput failure**, with no evidence that the observed focused pin lacks its outline.                                                                                                                                | Read focus and solid outline together for each control; retain real keyboard Tab, exhaustive control order and forward/reverse wrapping. Browser validation needed to establish sufficient throughput.                                                                                                 |

## Implementation scope

- No confirmed production touch/footer layout regression can be established from
  the recovered logs. Do not change intended touch hiding or permanent Help to
  satisfy tests that assumed a persistent desktop hint bar. The HUD test contract
  and observation races are corrected; uncertain touch/copy failures remain
  explicit acceptance items.
- Only application addition: `ctx.expose({ cameraTips })`, following the existing
  debug-handle convention. Architecture documents the live deadline. Test fixtures
  can hold it at Infinity without overriding CSS, text, saved preferences, input
  learning, camera dismissal, frame clocks or renderer behavior. Unit fixtures
  now supply `expose`, and the HUD frame-hook test covers exact expiry and all
  other hide rules.
- Mission geometry uses the real Discovery update with `dt=0` and `scan=false`.
  Scan completion still goes through the existing held-control helper, Scanner,
  Discoveries recorder and mission subscribers. No fake completion flags/events.
- No workflow/config/default timeout/retry changes, assertion thresholds lowered,
  skipped specs, content or physics changes. No commits, pushes or remote runs.

## Validation

Run full gates with the read-only-dependency workaround already provided by the
repository:

```bash
GATES_CONFIG_MODE=writable PW_PORT=4385 PW_OUTDIR=dist-f-ci-triage-500 \
  bash tools/gates.sh --full-e2e
```

Initial run: build, Python (144), content, attribution and Prettier pass; unit
reports one incomplete mock (`lostCityReadability` lacked `expose`), corrected
before final validation. E2e and project-base fail at preview startup before any
assertions. A direct Node listener independently reports
`listen EPERM: operation not permitted 127.0.0.1:4385`. Project-base build passes.

Final full-gate run: **PASS config, build/typecheck, 116 unit files / 1,222
tests, 144 Python tests, strict content, attribution and repository-wide
Prettier**. **FAIL e2e and project-base before assertions**, at preview startup;
the overall gate exits 1. Logs: `.cache/f-ci-triage-500/gates-final.log` and
`.cache/gates/`. Project-base production build also passes.

The independent direct Chromium launch also fails before opening a page:
`sandbox_host_linux.cc:41`, `shutdown: Operation not permitted (1)`, SIGTRAP.
Its log is `.cache/f-ci-triage-500/chromium-launch.log`. Serving pages through
request interception cannot resolve that separate browser-process restriction.

After the final copy-fixture selection adjustment, typecheck passes and CI-mode
Playwright discovery loads **335 tests in 58 files** (including the new expiry
case). Final changed-file formatting and `git diff --check` pass. The focused HUD,
camera controls and Lost City fixture run passes **8 tests in 3 files**. No gate
or test is reported as passing solely because it was discoverable.

No fresh screenshots, local browser reproduction, green hosted run or reduction
in hosted shard runtime is claimed. Full browser acceptance requires a host that
permits localhost listening and Chromium, followed by reading the latest main
CI run and its retry traces, especially the uncertain touch and copy failures.
