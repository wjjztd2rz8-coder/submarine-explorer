#!/usr/bin/env bash
# Is Codex usable right now? Sends a tiny challenge prompt.
# Prints "available", or "limited until <time>", or "error: <reason>".
# Exit: 0 available, 2 limited, 1 other error.
set -uo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.local/node/bin:/home/linuxbrew/.linuxbrew/bin:$PATH"
out=$(mktemp); msg=$(mktemp)
timeout 180 codex exec -m gpt-6-sol -c model_reasoning_effort=low -s read-only -C "$PWD" \
  -o "$msg" 'Respond with only the word: available' < /dev/null > "$out" 2>&1
if grep -qi 'available' "$msg" 2>/dev/null; then echo available; rm -f "$out" "$msg"; exit 0; fi
if grep -qi 'usage limit' "$out"; then
  t=$(grep -oiE 'try again at [0-9]{1,2}:[0-9]{2} ?[AP]M' "$out" | tail -1 | sed -E 's/try again at //I')
  echo "limited until ${t:-unknown}"; rm -f "$out" "$msg"; exit 2
fi
echo "error: $(tail -n 3 "$out" | tr '\n' ' ')"; rm -f "$out" "$msg"; exit 1
