# S-hygiene (DIRECTOR item 16)

Branch `claude/S-hygiene`, worktree `/home/vijay/subexp-wt/S-hygiene`. Not merged. Date: 2026-10-12.

## Cleaner: `tools/clean-artifacts.sh`

- Usage: `tools/clean-artifacts.sh [--days N] [--root DIR] [--delete]`. Dry run unless `--delete`.
- Candidates: `dist-*/` and `test-results-*/` at the root, and `.cache/runs/*/`, older than N days (default 2). A candidate is stale when nothing inside it changed in the last N days.
- Skipped, in order:
  - directories a live process uses as `PW_OUTDIR` (this shell's env, readable `/proc/*/environ`, and whole-word matches in `pgrep -af` command lines);
  - directories with any file modified in the last 2 hours;
  - `dist/` (not matched by the patterns).
- Prints one line per candidate (size, status), then the count and total size reclaimed (or that would be reclaimed).
- Tested with `--delete` only in a throwaway directory (stale dirs removed; `dist/`, live and recent dirs kept). Never run with `--delete` on the main checkout.

Dry run on `/home/vijay/submarine-explorer` (2026-10-12):

- 315 stale directories older than 2 days, 3.0 GB reclaimable (of 3.9 GB scanned).
- 2 skipped as in use: `dist-gates-4173-2949603` and `test-results-gates-4173-2949603`.
- 59 skipped because they changed within 2 days.

## Run-scoped gate outputs: `tools/gates.sh`

- Each run gets `.cache/runs/<timestamp>-<pid>/`. Gate logs (`<gate>.log`) and Playwright `test-results` (`test-results`, `test-results-project-base`) live there.
- The run's build outputs (`dist`, `dist-base`) are removed on exit, as before.
- `.cache/gates/<gate>.log` is a relative symlink to the current run's log, created when the gate starts, so `tools/codex-status.sh` (which lists the newest `.cache/gates/*.log`) keeps working.
- `PW_OUTDIR`, when set, still names the retained build output. Nothing in the repo passes it to `gates.sh`; `codex-task.sh` runs `gates.sh` with no `PW_OUTDIR`.
- No gate-side pruning. Old runs are removed by `tools/clean-artifacts.sh` (manual; there is no timer for it).

## What moved where

- `tools/archive/`: `beebe-chimney-shots.mjs`, `firstdiscovery-shots.mjs`, `firstminute-shots.mjs`, `globe-pins-shots.mjs`, `journal-mobile-shots.mjs`, `blue-hole-geometry.mjs`, `terrain-fidelity.mjs`, `codex-available.sh`, `playwright.bughunt-880.config.ts`.
  - Checked: no references in the repo outside `plan/progress/`, `plan/archive/`, the CHANGELOG and the review; no systemd unit or `tools/*.sh` calls them (`systemctl --user list-unit-files 'subexp*'` shows only resume, the interactive lock and Codex transient units).
  - They are not runnable from the new location without path fixes. `blue-hole-geometry.mjs` and `terrain-fidelity.mjs` expect their pose JSON in `tools/`.
- `plan/archive/`: `PHASE-D-PLAN.md`, `PHASE-D2-PLAN.md`, `PHASE-D-BRIEFS.md`, `QA-A.md`, `QA-B.md`, `QA-C.md`, `QA-C-INTEGRATION.md`.
  - Links updated in `docs/terrain.md`, `plan/MASTER-PLAN.md`, `plan/PHASE-D-CONTRACTS.md`, the archived plan files, and `plan/progress/props-material.md`.
  - `plan/DIRECTOR.md` was not edited. It names no moved file by path.
- `plan/archive/progress-images/`: 66 image files (56 PNG, 10 SVG) from the subdirectories of `plan/progress/`, moved with `git mv` and keeping their subdirectory names. The 11 JSON files stay in place. Image links in `plan/progress/*.md` and the moved image path in `reference-provenance.json` were rewritten. This lightens `plan/progress/`; it does not shrink the repository, since git history keeps the same bytes.

## Left in place, and why

- `plan/PHASE-B-CONTRACTS.md`, `plan/PHASE-C-CONTRACTS.md`, `plan/PHASE-D-CONTRACTS.md`: about 50 path citations in `docs/`, `README.md`, `CONTRIBUTING-AGENTS.md`, `src/` comments and `data/landmarks/*/sources.md` (content files). Docs call them authoritative. Moving them means editing content and source comments, so they stay. This is why `plan/` has 17 top-level files, not the 14 the review targeted.
- `tools/*-poses.json`: read by `golden-shots.mjs` and by tests.
- `tools/f-title-bc/`: a documented opt-in harness with its own README. It may be one-off; left for the owner.
- `tools/fixtures/titanic_gmrt.asc` (2.7 MB) and `tests/bughunt1090.config.ts`: the review suggested removing both. They were outside this item's list, so untouched.
- `tools/efficiency.sh`: still named by `plan/RESUME-PROMPT.md` and `plan/REVIEW-PROMPT.md`.
- Other tools with a reference from an active file or a test: `build_landmarks.py`, `esri_ascii.py`, `currents.py`, `golden-options.mjs`, `terrain-mip-verify.mjs`, `make_*`, `inspect_tile.py`, `validate_*`, `obis_export.py`, `perf-budget.mjs`.

## Shard-count drift

- `.github/workflows/ci.yml` has 30 e2e shards. `docs/deploy.md` said 16 in two places; both now say 30.
- No README, `plan/RESUME-PROMPT.md` or other tool comment stated a count.
- Not changed, but stale: `docs/deploy.md` still says "24 min per shard" and "20-minute suite budget". CI uses a 30-minute job timeout and a 1500 s global timeout (`ci.yml` lines 62 and 138).

## Unsure or to decide

- The dry run has a conservative liveness check. A process whose command line mentions a candidate name as a whole word (for example an agent prompt) makes that directory count as in use.
- `codex-task.sh` does not pass `PW_OUTDIR`, so the task's premise about it was wrong. The gates set their own output paths.
- No tool reads `.cache/gates/e2e.log` by name. The only reader of `.cache/gates/` is `tools/codex-status.sh`, which takes the newest log.
- Retention is manual. Nothing schedules `tools/clean-artifacts.sh`.
