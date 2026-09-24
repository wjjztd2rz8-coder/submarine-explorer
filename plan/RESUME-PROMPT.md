Resume Submarine Explorer orchestration (repo /home/vijay/submarine-explorer). This is a headless timed run; the owner is asleep. Several runs fire overnight (hourly); each does a bounded amount of work, leaves the repo clean and green, and exits.

## 0. Guard (do this first)

- Lock: if `.cache/orchestrator.active` exists and its mtime is under 90 minutes old, another orchestrator (the owner's interactive thread or an earlier timed run) is active. Append one line to `plan/OVERNIGHT-LOG.md` ("skipped: orchestrator active") and exit. Otherwise write `headless <PID> <time>` to `.cache/orchestrator.active`, `touch` it after each major step, and delete it when you finish.
- Read your memory notes (codex-subagents, playtest-direction, content-tone, usage-budget), plan/PHASE-D-PLAN.md §2–3, plan/PHASE-D-CONTRACTS.md and the tail of plan/OVERNIGHT-LOG.md.

## 1. Collect finished work

- `git worktree list`, `git status`, `git log --oneline -8`, and `tools/codex-status.sh`.
- For each worktree under /home/vijay/subexp-wt/ whose task is not running (no `codex-task.sh` process for it):
  - If `.cache/codex/<name>-result.md` says "gates PASS", review the diff briefly and look at the screenshots in `.cache/codex/shots/<name>/` (Read tool). Commit in the worktree with a descriptive message and `Co-Authored-By` lines (GPT-6 Sol and/or Claude), merge into main, run `tools/gates.sh` on main, and remove the worktree and branch.
  - If it says "CODEX LIMIT", or the gates failed, finish the package with a Claude subagent working in that same worktree (see §3).

## 2. Next package

Remaining Phase D order: D-POWER (if not merged), D-CURRENTS, D-ROV, D-PHOTO, then docs reconciliation (README, docs/architecture.md, plan/STATUS.md "Phase D" section, MASTER-PLAN §6). Briefs are in plan/PHASE-D-BRIEFS.md; the orchestrator notes in `.cache/codex/brief-d-*.md` show the house style (quote the owner, list screenshots).

- Check Codex with `tools/codex-available.sh`.
  - If available: write `.cache/codex/brief-<pkg>.md` and launch detached so it survives this run: `systemd-run --user --unit=subexp-<pkg> --working-directory=$PWD env WT=1 ON_LIMIT=exit PW_PORT=<unique 4312+> tools/codex-task.sh .cache/codex/brief-<pkg>.md <pkg> 3`. A later run collects it (§1).
  - If limited: implement with a Claude subagent (Agent tool, run synchronously, not in the background). Use `model: "opus"` for engine and UI work and `"sonnet"` for docs and content. Run one at a time. Create the worktree first (`git worktree add -b claude/<pkg> ../subexp-wt/<pkg> HEAD` and symlink node_modules). Tell the agent to work only there, run `PW_PORT=<port> tools/gates.sh` itself until everything passes, and write screenshots to .cache/codex/shots/<pkg>/ in the main repo.

## 3. Rules

- Commit only green work (all of tools/gates.sh). Never push, never create a GitHub repo or enable Pages (that waits for the owner).
- Owner direction: arcade defaults with realism toggles; no repeated "illustrative/reconstructed" caveats in player text; keep the HUD uncluttered.
- Stop starting new work if your Claude budget looks low (for example, after one package). Always leave main green and clean.
- Before exiting, append a short entry to `plan/OVERNIGHT-LOG.md` (time, what merged, what is running or where, problems, decisions made for the owner to review), commit it, and delete `.cache/orchestrator.active`.
