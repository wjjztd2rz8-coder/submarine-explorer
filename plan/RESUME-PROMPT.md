Resume Submarine Explorer Phase F orchestration (repo /home/vijay/submarine-explorer). This is a headless timed run. The owner is away for several days and has pre-approved the scope and pushing (see memory note phase-f-direction). Each timed run does a bounded amount of work, leaves main green and clean, and exits.

## 0. Guard (do this first)

- `tools/resume.sh` has already checked the budget gate and the lock. Write `headless <PID> <time>` to `.cache/orchestrator.active`, `touch` it after each major step, and delete it when you finish.
- Read your memory notes: phase-f-direction, usage-budget, codex-subagents, content-tone and playtest-direction. Then read plan/PHASE-F-PLAN.md (the waves, packages, ownership and operating rules) and the tail of plan/OVERNIGHT-LOG.md.

## 1. Collect finished work

- Run `git worktree list`, `git status`, `git log --oneline -10` and `tools/codex-status.sh`. Check `plan/progress/` for package notes.
- For each worktree under /home/vijay/subexp-wt/ whose task is not running (no `codex-task.sh` process and no live Claude agent: a Claude package is finished when it has `plan/progress/<PKG>.md`):
  - Run `PW_PORT=<unique> tools/gates.sh` in the worktree. If it passes, review the diff briefly and look at the screenshots in `.cache/codex/shots/<name>/` (Read tool). Then commit in the worktree with a descriptive message and Co-Authored-By lines, merge into main, rerun the gates on main, and remove the worktree and branch.
  - If it is unfinished or failing, finish it with a Claude subagent in that same worktree (§2).

## 2. Next package

- Pick the next package from PHASE-F-PLAN.md §3 whose owned files don't overlap work in flight. Write its brief in the style of the earlier ones (see `.cache/codex/brief-f-*.md` and the F0-CORE prompt style: why, tasks, constraints, gates, screenshots, progress note, final report).
- Implementation goes to Claude subagents (Agent tool). Use `model: "opus"` for engine, rendering, vehicle, UI and gameplay work, and `"sonnet"` for docs, content and small fixes.
  - Create the worktree first: `git worktree add -b claude/<pkg> ../subexp-wt/<pkg> HEAD`, symlink node_modules, and symlink `.cache/codex/shots`.
  - In a headless run, run the agent synchronously (not in the background) so it finishes before you exit, and run at most 2 packages per run.
- Exploratory work (audits, bug hunts, research) goes to Codex: `systemd-run --user --unit=subexp-<name> --working-directory=$PWD env WT=1 ON_LIMIT=exit [NET=1] PW_PORT=<unique> tools/codex-task.sh <brief> <name> 2`.
- After each merged wave, or a large package, that is green and screenshot-reviewed:
  - `git push origin main`;
  - tag it (`git tag f<N> && git push origin f<N>`);
  - check that the Pages deploy succeeded (`gh run list -L 3`).

## 3. Rules

- Commit only green work (all of tools/gates.sh).
- Check `~/.local/bin/ai-limits --gate 20 5` before each new Claude package. If Claude's 5-hour window is below 30%, start no new package. If any weekly window is at or below 5%, stop; the timer will retry, and runs skip until the reset.
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
