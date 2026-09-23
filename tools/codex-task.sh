#!/usr/bin/env bash
# Run a Codex (GPT-6 Sol, high) task from a brief file, unattended.
# Usage: tools/codex-task.sh <brief.md> <name>   -> .cache/codex/<name>-result.md, <name>.log
set -uo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.local/node/bin:/home/linuxbrew/.linuxbrew/bin:$PATH"
brief="$1"; name="$2"; mkdir -p .cache/codex
codex exec -m gpt-6-sol -c model_reasoning_effort=high -s workspace-write -C "$PWD" \
  -o ".cache/codex/$name-result.md" "$(cat "$brief")" < /dev/null > ".cache/codex/$name.log" 2>&1
echo "exit=$? at $(date)" >> ".cache/codex/$name-result.md"
