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
echo "== state =="; git log --oneline -3; git status --short | head -20
PROMPT="$(cat plan/RESUME-PROMPT.md)"
if [[ "${1:-}" == "--headless" ]]; then
  claude -p "$PROMPT" --permission-mode bypassPermissions > ".cache/resume-$(date +%Y%m%d-%H%M).log" 2>&1 || true
  # A crashed timed run must not block the next hour (never clear an interactive lock).
  grep -qs '^headless' .cache/orchestrator.active && rm -f .cache/orchestrator.active
else
  exec claude "$PROMPT"
fi
