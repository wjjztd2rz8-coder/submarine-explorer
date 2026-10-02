Resume Submarine Explorer Phase F orchestration (repo /home/vijay/submarine-explorer). This is a headless timed run. The owner is away for several days and has pre-approved the scope and pushing (see memory note phase-f-direction). Each timed run does a bounded amount of work, leaves main green and clean, and exits.

## 0. Guard (do this first)

- `tools/resume.sh` has already checked the budget gate and the lock. Write `headless <PID> <time>` to `.cache/orchestrator.active`, `touch` it after each major step, and delete it when you finish.
- Read your memory notes: phase-f-direction, usage-budget, codex-subagents, content-tone and playtest-direction. Then read plan/PHASE-F-PLAN.md (the waves, packages, ownership and operating rules) and the tail of plan/OVERNIGHT-LOG.md.

## 0b. Direction

- Read `plan/DIRECTOR.md` FIRST. It holds the current priorities and the review rubric, and it outranks PHASE-F-PLAN.md ordering. You are the creative director: judge every package against the rubric and send work back with concrete feedback rather than merging and fixing later. Items you need from the owner go under "Needs owner" there and at the top of your OVERNIGHT-LOG entry.

## 0c. Process health (once per day, or when something looks off)

- Run `tools/efficiency.sh`, which reads `.cache/metrics/usage.csv` (sampled every 30 min) and the logs: idle Claude/Codex capacity, run skips by reason, watchdog trips and Codex pass/fail.
- If you find waste (idle capacity, repeated failures, wasted skips, slow gates, duplicated work), fix the tooling or process and log the change and its reason in `plan/PROCESS-LOG.md`.
- The owner delegated process improvement; the one hard constraint is the usage floors (Claude 5h ≥ 20%, Codex 5h ≥ 5%, both weekly ≥ 5%).

## 1. Collect finished work

- Run `git worktree list`, `git status`, `git log --oneline -10` and `tools/codex-status.sh`. Check `plan/progress/` for package notes.
- For each worktree under /home/vijay/subexp-wt/ whose task is not running (no `codex-task.sh` process and no live Claude agent: a Claude package is finished when it has `plan/progress/<PKG>.md`):
  - Run `PW_PORT=<unique> tools/gates.sh` in the worktree. If it passes, review the diff and look at the screenshots against the DIRECTOR.md rubric (send it back if it falls short) in `.cache/codex/shots/<name>/` (Read tool). Then commit in the worktree with a descriptive message and Co-Authored-By lines, merge into main, rerun the gates on main, and remove the worktree and branch.
  - If it is unfinished or failing, finish it with a Claude subagent in that same worktree (§2).

## 1b. Paused packages

- If `.cache/claude/paused-packages.md` exists, resume those worktrees FIRST, one Sonnet agent at a time, following that file. Remove each entry once its package is merged.

## 2. Next package

- Pick the next package from PHASE-F-PLAN.md §3 whose owned files don't overlap work in flight. Write its brief in the style of the earlier ones (see `.cache/codex/brief-f-*.md` and the F0-CORE prompt style: why, tasks, constraints, gates, screenshots, progress note, final report).
- Implementation goes to Claude subagents (Agent tool). **Owner (2026-09-29): Sonnet is the main contributor**, so use `model: "sonnet"` by default. Use `"opus"` only for a package that Sonnet has already failed at twice. Keep packages small (1–2 hours of agent work) and tell each agent to make `wip(<pkg>)` commits in its worktree at each green-ish checkpoint, so a session limit loses little.
  - Create the worktree first: `git worktree add -b claude/<pkg> ../subexp-wt/<pkg> HEAD`, symlink node_modules, and symlink `.cache/codex/shots`.
  - In a headless run, run the agent synchronously (not in the background) so it finishes before you exit, and run at most 2 packages per run.
- **Owner (2026-10-01): Codex 6.1 Sol also builds** well-specified, self-contained packages (progression, modes, audio, fix lists from audits), because a Claude window only covers ~40 min of one agent. Claude keeps visual-heavy work (marine life, set pieces, brand/UI) and reviews Codex diffs and screenshots before merging. Codex also does the detail work (audits, verification of merged work, bug hunts, research, fact checks): `systemd-run --user --unit=subexp-<name> --working-directory=$PWD env WT=1 ON_LIMIT=exit [NET=1] PW_PORT=<unique> tools/codex-task.sh <brief> <name> 2`.
- **Codex queue:** don't launch Codex tasks directly. Write briefs to `.cache/codex/queue/NN-<name>.md` (an optional first line `<!-- env: NET=1 ROUNDS=3 -->`). `tools/codex-dispatch.sh` runs every 30 min from the timer, without needing Claude, and launches them whenever Codex has budget and fewer than 3 tasks are running. Before exiting, make sure at least 3 briefs are queued (verification of what you merged, bug hunts, the next self-contained packages from DIRECTOR.md), so Codex never idles while Claude is out of budget (it idled ~12 h on 2026-10-01/02).
- **Keep Codex busy (owner, 2026-10-01):** every run checks `tools/codex-status.sh`. If fewer than 3 Codex tasks are running and Codex has budget (5h ≥ 30%, weekly ≥ 15%), launch the next self-contained Codex package(s) or a verification/bug-hunt task over newly merged work. Idle Codex capacity is wasted.
- After each merged wave, or a large package, that is green and screenshot-reviewed:
  - `git push origin main`;
  - tag it (`git tag f<N> && git push origin f<N>`);
  - check that the Pages deploy succeeded (`gh run list -L 3`).

## 3. Rules

- Commit only green work (all of tools/gates.sh).
- `tools/resume.sh` runs `tools/budget-watchdog.sh` for this whole run. It polls usage every 2 minutes, stops Codex units below 7% (5h) or 7% (weekly), and kills this run if Claude falls below 23% (5h) or 7% (weekly). Uncommitted worktree files survive; commit `wip(<pkg>)` checkpoints often.
- Check `~/.local/bin/ai-limits` before EACH new Claude agent and after each one finishes. Start a new agent only if Claude's 5-hour window is at least 45% left. Once it falls below 30%, start nothing new; finish collecting and exit. Never let the window fall under the 20% floor: an agent that hits the session limit dies mid-work. If any weekly window is at or below 5%, stop; the timer will retry, and runs skip until the reset.
- Owner direction:
  - Cinematic realism that is readable and never frustratingly dark.
  - Arcade-simple controls; Arcade is the default.
  - Real sites stay factual; plausible additions are tagged once in the Journal.
  - No repeated "illustrative/reconstructed" caveats.
  - Keep the HUD uncluttered.
  - Log every cut in CHANGELOG.md.
- Before exiting:
  - append a short entry to `plan/OVERNIGHT-LOG.md`: the time, what merged, what is running or where, problems, and decisions for the owner to review;
  - commit it;
  - delete `.cache/orchestrator.active`.
