#!/usr/bin/env bash
# Print the newest usable Codex Sol model. Probes gpt-6.1-sol at most every
# 6 hours (cached in .cache/codex/model) and falls back to gpt-6-sol.
set -uo pipefail
cd "$(dirname "$0")/.."
cache=.cache/codex/model; mkdir -p .cache/codex
if [[ -f "$cache" ]] && (( $(date +%s) - $(stat -c %Y "$cache") < 21600 )); then cat "$cache"; exit 0; fi
if timeout 120 codex exec -m gpt-6.1-sol --skip-git-repo-check "Reply with just: ok" < /dev/null 2>&1 | grep -q 'not supported\|ERROR'; then
  echo gpt-6-sol > "$cache"
else
  echo gpt-6.1-sol > "$cache"
fi
cat "$cache"
