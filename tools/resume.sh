#!/usr/bin/env bash
# Restart the orchestration session after a usage-limit reset.
# Usage: tools/resume.sh            (interactive)
#        tools/resume.sh --headless (non-interactive, bypasses permission prompts)
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.local/node/bin:$HOME/.local/bin:$PATH"
echo "== state =="; git log --oneline -3; git status --short | head -20
PROMPT="$(cat plan/RESUME-PROMPT.md)"
if [[ "${1:-}" == "--headless" ]]; then
  mkdir -p .cache; exec claude -p "$PROMPT" --permission-mode bypassPermissions > ".cache/resume-$(date +%Y%m%d-%H%M).log" 2>&1
else
  exec claude "$PROMPT"
fi
