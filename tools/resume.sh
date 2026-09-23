#!/usr/bin/env bash
# Restart the orchestration session after a usage-limit reset.
# Usage: tools/resume.sh            (interactive)
#        tools/resume.sh --headless (non-interactive, bypasses permission prompts)
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.local/node/bin:$PATH"
echo "== state =="; git log --oneline -3; git status --short | head -20
PROMPT="$(cat plan/RESUME-PROMPT.md)"
if [[ "${1:-}" == "--headless" ]]; then
  exec claude -p "$PROMPT" --permission-mode bypassPermissions
else
  exec claude "$PROMPT"
fi
