# 3570 — S-bughunt: resume scheduling audit

Item: **S-bughunt**, DIRECTOR Backlog 9. Report only; no scheduling or game code changed, no push.

## Finding

**13 timer invocations exited `no new work since last run; exiting` with sampled Claude 5h capacity ≥50%, weekly capacity above the pacing gate, and an available Claude-lane Backlog item.** These were state-cache skips, not budget rejections. The 90-minute change has not yet had an observable timer retry in this evidence window; it cannot be declared successful or unsuccessful from these runs.

## Window and evidence

Frozen window: **2026-10-22 19:15:00 through 2026-10-23 19:15:00 America/Chicago (CDT, UTC−05:00)**, aligned to the latest metrics sample available when the audit began. Read `plan/DIRECTOR.md` first.

The worktree has no historical metrics. The service unit identifies `/home/vijay/submarine-explorer` as its working directory, so evidence came from that checkout:

- `.cache/metrics/usage.csv`: 97 boundary-inclusive samples at 15-minute intervals; seven early samples have missing Claude values (`-`). Percentages are **remaining**, not utilization.
- `.cache/skips.log`: four budget skips at Oct 22 19:15, 19:45, 20:15 and 20:45. Each records Claude `HTTP Error 429: Too Many Requests`; corresponding Claude metrics are missing. They cannot be classified as available-budget skips and are excluded from the table.
- `journalctl --user -u subexp-resume --since '2026-10-22T19:15:00-05:00' --until '2026-10-23T19:15:00-05:00' --no-pager -o json`: 36 service starts, comprising four budget skips, 13 state skips and 19 invocations reaching `== state ==`. The last Claude run was ongoing at the cutoff. No service failures appear in this window. State skips print to the journal; `log_skip()` only records budget skips, so `skips.log` alone misses all 13.
- Historical `plan/DIRECTOR.md` versions and `plan/OVERNIGHT-LOG.md` runs 86–100, checked against stream logs `.cache/resume-20261023-{0121,0503,0759,1208,1624,1845}.log`. Use journal times for chronology: run 98's overnight heading says `20:0x` despite its service actually running 14:47–14:56.

Joined each journal exit to the latest metrics row at or before its timestamp (the same minute for every table entry). All table samples report `run=0`. CSV timestamps have minute precision, so these are sampled eligibility estimates, not fresh `ai-limits` checks at each exit. The state branch returns before `claude_ok()` executes. No historical reset timestamps are stored in the CSV; adjacent stream logs corroborate the Claude weekly reset at approximately **Oct 29 07:00 CDT**, also present in the current read-only `~/.cache/ai-limits-claude.json` cache. A minute of reset-time rounding cannot affect these classifications.

Weekly floor replayed at each exit:

```text
days = clamp((weekly_reset - exit_time) / 86400, 0, 7)
weekly_floor = max(10, 7 + 93 * days / 7 - 20)
eligible = five_hour_left >= 50 and seven_day_left >= weekly_floor
```

## Every qualifying state skip

All times below are **2026-10-23 CDT**. “Age” is minutes since the preceding journal `== state ==`, a close proxy for the subsequently written `resume-state` mtime. Historical mtimes themselves were overwritten. “90m still skips” evaluates only the shorter age condition against that observed preceding start; earlier counterfactual runs could change subsequent state and behavior.

| Exit time | Claude 5h left | Week left | Week floor | Age (min) | Unblocked Claude item              | 90m still skips |
| --------- | -------------: | --------: | ---------: | --------: | ---------------------------------- | --------------- |
| 01:45:13  |            58% |       88% |     69.62% |      23.7 | Yes: V-eight-sites-lit (b), A      | Yes             |
| 02:15:13  |           100% |       88% |     69.34% |      53.7 | Yes: V-eight-sites-lit (b), A      | Yes             |
| 02:45:13  |           100% |       88% |     69.06% |      83.7 | Yes: V-eight-sites-lit (b), A      | Yes             |
| 03:15:13  |           100% |       88% |     68.79% |     113.7 | Yes: V-eight-sites-lit (b), A      | No              |
| 05:15:13  |            83% |       86% |     67.68% |      12.2 | Yes: V-eight-sites-lit (b), B      | Yes             |
| 08:15:13  |            71% |       85% |     66.02% |      15.4 | Yes: V-eight-sites-lit (b), C      | Yes             |
| 08:45:13  |           100% |       85% |     65.74% |      45.4 | Yes: V-eight-sites-lit (b), C      | Yes             |
| 12:15:14  |            66% |       82% |     63.81% |       6.9 | Yes: V-eight-sites-lit (c), D      | Yes             |
| 12:45:17  |            66% |       82% |     63.53% |      36.9 | Yes: V-eight-sites-lit (c), D      | Yes             |
| 16:45:13  |            79% |       78% |     61.31% |      20.4 | Yes: V-monterey-apron follow-up, E | Yes             |
| 17:15:13  |            79% |       78% |     61.04% |      50.4 | Yes: V-monterey-apron follow-up, E | Yes             |
| 17:45:14  |            79% |       78% |     60.76% |      80.5 | Yes: V-monterey-apron follow-up, E | Yes             |
| 18:15:14  |            78% |       78% |     60.48% |     110.5 | Yes: V-monterey-apron follow-up, E | No              |

Backlog evidence and preceding starts:

- **A:** `c4863cc:plan/DIRECTOR.md`, runs 86/87; preceding start 01:21:32. Part (a) was done and (b) explicitly next. No Claude package running. Run 87 declined art because a five-hour reset was imminent, although its reported 59% already passed the start gate. By 02:15 metrics show the reset to 100%.
- **B:** `70982d6:plan/DIRECTOR.md`, runs 88/89; preceding start 05:03:04. Part (b) remained open. Run 89 saved Claude's 85% for later CI triage. Pending CI did not block independent art under RESUME-PROMPT's push rule.
- **C:** `cbf65f9:plan/DIRECTOR.md`, runs 92/93; preceding start 07:59:49. Part (b) still open, with no Claude package running. Some Codex browser work awaited Claude, but that was additional work, not a blocker for this site package.
- **D:** `5be7bbe:plan/DIRECTOR.md`, runs 95/96; preceding start 12:08:20. Part (b) done and (c) explicitly next. Run 96 collected nothing and started no Claude package; part (c) subsequently landed in run 97.
- **E:** `fefb4b3:plan/DIRECTOR.md`, runs 99/100; preceding start 16:24:47. V-monterey-apron remained explicitly PARTLY DONE, with the pebble/floor/test follow-up specified; no Claude package running. V-challenger-ripples was another available Sonnet item, conditional on cutting geometry first to fit its Low budget. The live PROCESS-LOG evening entry independently identifies these two as unblocked.

These are eligibility judgments from recorded dependencies and work in flight, not claims that every open item was ready. V-bluehole-silhouette mentions permission to loosen a test; Endurance has an owner decision pending. Neither is needed to establish that another Claude item was available. Weekly margins across the table are 16.69–19.26 points, comfortably exceeding even the idle review trigger's extra three-point margin.

## Rule replay and limitations

`tools/resume.sh:47–53` hashes the latest commit touching anything except the two run/process logs, plus `ls -l` metadata for finished Codex result files and the paused-Claude file. It does not represent remaining Backlog work, a budget recovery/reset, or CI status. An unchanged hash therefore means no new collection inputs, not no available Claude package. Queued/running Codex work intentionally does not invalidate it. A newly started no-op writes a fresh state timestamp just like a productive run; repeated collection-only decisions can restart the wait with work still available. The 90-minute orchestrator-active lock at line 18 is a separate guard; none of the listed exits used it.

This worktree's tracked script uses **10800 seconds (three hours)**. Read-only comparison found an existing, uncommitted live change to **5400 seconds (90 minutes)**, with live file mtime **18:45:44 CDT**. The 18:45 invocation had already reached `== state ==` at 18:45:14. Its prompt records a targeted review triggered by Claude idleness. Consequently all 13 observed skips predate the shorter rule, and the current run was still active at the cutoff; there is no post-change idle retry to assess.

Holding earlier starts fixed, 90 minutes would let **03:15 and 18:15** reach the budget gate rather than state-skip; the other 11 ticks remain inside the window. This is a predicate replay, not a causal prediction of 13 future runs. With a 30-minute timer, the first retry after a 90-minute expiry can occur almost **120 minutes after the prior start**, not necessarily within 90 minutes. Examples: 01:21 → 03:15 and 16:24 → 18:15. The next actual starts were 03:45 and 18:45; both could already bypass the old cache via review triggers.

`tools/review-triggers.sh:23–46` provides that escape: a review-due flag bypasses state suppression, but still must pass the budget gate. Its idle test uses four trailing samples (only 45 minutes between first and last at the current cadence), plus no `resume-2*` log modified within two hours. That log-mtime condition supplies the effective two-hour delay, measured from the latest output, not the previous run's start. Run 100's log ended at 16:25:09: at 18:15 fewer than two hours had elapsed, explaining the continued skip; the 18:45 stream confirms the idle review fired. Targeted reviews also have a two-hour cooldown.

Two secondary observations: “last 3 runs merged nothing” matches only `Nothing merged|nothing to do|no unblocked`, missing actual no-op wording such as `Nothing new to collect` and `No Claude package started`; and the weekly helper returns true on telemetry errors, unlike the fail-closed start gate. Neither observation changes the 13 classifications. Do not loosen the weekly margin to cure this problem: these runs were far above it. Historical review marker mtimes and external CI responses are not retained, so a complete replay of every review reason is unavailable.

## Smallest proposed rule change

**First observe the existing 90-minute change; there is no evidence yet that it failed.** If eligible no-op runs recur, the smallest next change is one explicit exit rule in the orchestration prompt:

> After collection, if `claude_ok` still passes and a Claude-lane Backlog item is unblocked with no file overlap, start one such package before exiting. “Nothing to collect”, pending Codex/CI, and an approaching five-hour reset alone are not reasons to end the run. A no-op exit records the actual dependency or budget blocker.

This clarifies the existing “Next package” requirement without another scheduler, Backlog parser, state file, or unconditional timer launch. It addresses runs 87/89/93/96/100 choosing no work despite available capacity; simply shortening the cache cannot ensure a launched orchestrator takes a package. Keep the lock, weekly pacing, budget floors and 90-minute collection debounce. If the shorter window's bounded wait itself remains unacceptable after this exit rule is followed, a separate ready-Claude-item bypass would be justified, but that is a larger change and not established as necessary here. No proposed rule was implemented in this audit.

## Validation

Read-only replay used Python's CSV/JSON readers, journal timestamps and historical Git reads; neither scheduling script was executed because each can write live scheduler state.

Ran the required `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e` (logs: `.cache/runs/20261023-191727-2-67tsXd/`). Configuration loading, content and build passed. Python failed five tests: four build-manifest cases reported `spawnSync git EPERM`; the golden-tooling wrapper failed because its Node comparison test received incomplete JSON (`Unexpected end of JSON input`). The unit stage printed only its Vitest startup banner and produced no suite results for roughly three minutes; interrupted the run (exit 130). The aggregate gates therefore **did not pass or complete**. No e2e was requested or run. Separate `python3 tools/check_attribution.py` and repository-wide `prettier --check .` both passed after the interruption. No unrelated test/tool fixes attempted. Final Git status contains only this new report.
