# Process log

Changes to how the work is done (tooling, scheduling, agent use), with the reason and the evidence. The owner delegated this on 2026-10-01; the only hard constraint is the usage floors.

- **2026-10-03 — F-CI-MAIN-RED**
  - Cached hosted logs identify a preset-tier test mismatch and a mission
    frame/ascent timing failure. Tests now choose the tier they exercise and
    synchronize with observed frames and mission state. Existing CI scheduling,
    retries, full discovery and gameplay stay unchanged.
  - Full local gates were attempted; static checks pass, while both browser
    gates cannot start a localhost preview in this sandbox. GitHub access and
    Git metadata writes are denied. The eight-run audit and two consecutive
    hosted green runs remain pending; see [the evidence report](progress/F-CI-MAIN-RED.md).
- **2026-10-01 night**
  - **Usage endpoint:** the Claude usage endpoint returned 429 for hours, and two runs were skipped. ai-limits now caches readings, backs off after errors and falls back to rate-limit headers.
  - **Start gate:** the Claude start gate no longer depends on Codex budget (Codex at 4% had blocked runs while Claude was at 98%).
  - **Timer:** it moved from 90 to 30 minutes so finished runs don't leave idle gaps.
  - **Codex watchdog:** it now re-arms after Codex's 5-hour reset.
  - **Codex queue:** added the queue and `tools/codex-dispatch.sh`, so Codex gets work while Claude is out of budget (it had sat idle for hours).
  - **Metrics:** added `tools/usage-sample.sh` (30-min metrics) and `tools/efficiency.sh` (summary).
  - **Director's brief:** added `plan/DIRECTOR.md`, so runs review packages against a rubric and send weak work back.
- **2026-10-02 16:50**
  - **Deadlock:** runs stopped from 10:30 to 16:45 (about 6 h lost) because Claude usage was unreadable. The likely cause: Claude Code refreshes its login token only while it runs, so with no runs starting, the token expired, the header fallback failed and the gate (which fails closed) kept blocking. `ai-limits` now refreshes the token with a tiny Haiku `claude -p` call when it is within 20 min of expiry.
  - **Idle Codex:** Codex was under-used for about 12.5 h overnight because the queue went empty and only Claude runs refill it. Fix: runs must leave at least 3 briefs queued when they exit (see RESUME-PROMPT).
- **2026-10-03 12:40**
  - **No-op runs:** since the 30-min timer, ~15 runs in a row found nothing to do and still read the whole context (~1% of Claude's 5h each), while Claude idled ~15 h at ≥ 50%. Two causes:
    - (a) DIRECTOR.md priorities had run dry, so runs saw "no unblocked visual package". The list is now refilled, with a rule to refill rather than idle.
    - (b) Golden shots looked blocked ("needs a browser host") but only lacked a preview server. Added `tools/golden.sh` (build + serve on 127.0.0.1 + capture).
  - **resume.sh** now skips a Claude run when the work state (HEAD, worktrees, Codex results, queue) is unchanged since the last run started, while still running at least every 3 h.
- **2026-10-03 13:00 — review triggers.** Owner observation: their prompted review found far more than routine runs did. `tools/review-triggers.sh` runs every tick (cheap) and flags the next run as a review:
  - **Comprehensive:** daily, after a release tag or after 8+ merges.
  - **Targeted:** a dry backlog (3 empty runs), CI red ×3, Claude idle ≥ 2 h, an empty Codex queue ≥ 2 h, or a repeatedly failing gate.
    The review steps are in `plan/REVIEW-PROMPT.md`; results go to `plan/REVIEWS.md` (pushed).
- **2026-10-03 15:30 — false "Claude idle" trigger.** The targeted review fired for "Claude idle ≥ 50% for 2 h" although runs happened at 13:26, 14:08, 14:28, 14:57 and 15:15. Cause: `usage-sample.sh` detected a run with `pgrep 'claude -p Resume Submarine'`, which never matches review runs ("THIS RUN IS A…"), and runs are short, so samples at :15/:45 missed them. It now checks `--permission-mode bypassPermissions` or a fresh `orchestrator.active`, and `review-triggers.sh` also requires that no `resume-*.log` was written in the last 2 h. `efficiency.sh` idle hours before this fix are overstated.
