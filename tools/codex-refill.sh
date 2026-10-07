#!/usr/bin/env bash
# Refill an empty Codex queue without Claude. When Claude's budget is paced out,
# nothing else writes briefs, and Codex idled ~15 h (2026-10-04) and ~12 h
# (2026-10-06). Codex reads the director's plan and writes up to 3 briefs into
# .cache/codex/queue/. Called by codex-dispatch.sh at most every 2 h.
set -uo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.local/node/bin:$HOME/.local/bin:$PATH"
model=$(tools/codex-model.sh 2>/dev/null || echo gpt-6-sol)
last=$(ls .cache/codex/queue/launched/ | sed -n 's/^\([0-9]\{3\}\)-.*/\1/p' | sort -n | tail -1)
next=$(( (10#${last:-900} / 10 + 1) * 10 ))
codex exec -m "$model" -c model_reasoning_effort=high -c 'sandbox_mode="workspace-write"' "You are refilling the Codex work queue for the Bathyline game repo while the Claude director is out of budget.
Read plan/DIRECTOR.md (priorities and the 2026-10-06 director note), the newest entry of plan/REVIEWS.md, the tail of plan/OVERNIGHT-LOG.md, and the brief files in .cache/codex/queue/launched/ (to avoid duplicates; read the last 10 for the format and the -result.md files in .cache/codex/ for what finished).
Write exactly 3 new brief files to .cache/codex/queue/, numbered ${next}, $((next+10)), $((next+20)) as NNN-f-<short-name>.md, in the same format: an optional first line '<!-- env: FULL_E2E=1 ROUNDS=2 VISUAL_QA=1 -->', then WHY / TASKS / CONSTRAINTS. Pick the highest-impact unblocked items from DIRECTOR.md that are not already running or done; prefer self-contained, single-site visual fidelity work and verification/bug hunts over new features. Never brief a merge into main, a push, or a change to tools/ or plan/DIRECTOR.md. Do not modify any other file." > .cache/codex/refill.log 2>&1 < /dev/null
echo "$(date '+%F %T') refill wrote: $(ls .cache/codex/queue/*.md 2>/dev/null | xargs -n1 basename | tr '\n' ' ')" >> .cache/codex/queue/waiting.log
