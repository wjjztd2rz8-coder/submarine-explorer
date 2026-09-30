#!/usr/bin/env bash
# Restart the orchestration session after a usage-limit reset.
# Usage: tools/resume.sh            (interactive)
#        tools/resume.sh --headless (non-interactive, bypasses permission prompts)
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.local/node/bin:$HOME/.local/bin:$PATH"
mkdir -p .cache
# Never run two timed sessions at once (a long run may overlap the next hour).
exec 9>.cache/resume.lock
flock -n 9 || { echo "another resume run is active; exiting"; exit 0; }
log_skip() { echo "- $(date '+%Y-%m-%d %H:%M %Z') headless run: skipped: $1" >> plan/OVERNIGHT-LOG.md; }
# Skip cheaply (without starting Claude) when another orchestrator is active or
# the budget floors (owner: Claude 5h >=20%, Codex 5h >=5%, weekly >=5%) are hit.
if [[ -f .cache/orchestrator.active ]] && (( $(date +%s) - $(stat -c %Y .cache/orchestrator.active) < 5400 )); then
  echo "orchestrator active; exiting"; exit 0
fi
if [[ "${1:-}" == "--headless" ]] && ! ai-limits --gate 50 5 > .cache/resume-gate.txt 2>&1; then
  log_skip "budget gate ($(head -2 .cache/resume-gate.txt | tr '\n' ' '))"; exit 0
fi
echo "== state =="; git log --oneline -3; git status --short | head -20
PROMPT="$(cat plan/RESUME-PROMPT.md)"
if [[ "${1:-}" == "--headless" ]]; then
  claude -p "$PROMPT" --permission-mode bypassPermissions > ".cache/resume-$(date +%Y%m%d-%H%M).log" 2>&1 &
  cpid=$!
  # Watch usage for the whole run; the watchdog kills the run before a floor.
  tools/budget-watchdog.sh "$cpid" > /dev/null 2>&1 &
  wpid=$!
  wait "$cpid" || true
  kill "$wpid" 2>/dev/null || true
  # A crashed timed run must not block the next hour (never clear an interactive lock).
  grep -qs '^headless' .cache/orchestrator.active && rm -f .cache/orchestrator.active
else
  exec claude "$PROMPT"
fi
