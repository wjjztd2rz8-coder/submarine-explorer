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
# Claude-only start check (Codex being low must not block Claude; the run just
# won't launch Codex tasks, and the watchdog guards Codex separately).
claude_ok() {
  ai-limits --json 2>/dev/null | python3 -c '
import json,sys,time
c=json.load(sys.stdin).get("claude",{}); now=time.time()
def left(k):
    w=c.get(k) or {}
    if "used" not in w: return -1
    return 100 if w.get("resets_at") and w["resets_at"]<now else 100-w["used"]
sys.exit(0 if left("five_hour")>=50 and left("seven_day")>=10 else 1)'
}
if [[ "${1:-}" == "--headless" ]] && ! { ai-limits > .cache/resume-gate.txt 2>&1; claude_ok; }; then
  log_skip "budget gate ($(head -2 .cache/resume-gate.txt | tr '\n' ' '))"; exit 0
fi
echo "== state =="; git log --oneline -3; git status --short | head -20
PROMPT="$(cat plan/RESUME-PROMPT.md)"
if [[ "${1:-}" == "--headless" ]]; then
  # stream-json logs every step as it happens, so tools/status.sh can show live progress.
  claude -p "$PROMPT" --permission-mode bypassPermissions --output-format stream-json --verbose > ".cache/resume-$(date +%Y%m%d-%H%M).log" 2>&1 &
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
