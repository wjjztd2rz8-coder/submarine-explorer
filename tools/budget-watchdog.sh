#!/usr/bin/env bash
# Continuous usage watchdog for orchestration runs (owner floors, 2026-09-24):
# 5-hour window Claude >= 20%, Codex >= 5%; weekly windows >= 5% for both.
# Polls the private ~/.local/bin/ai-limits every POLL seconds and acts BEFORE a
# floor is crossed (a small margin absorbs usage between polls):
#   Claude 5h left < CLAUDE_STOP (23) or Claude weekly left < WEEKLY_STOP (7):
#     writes .cache/budget-pause, kills the processes in KILL_PIDS (e.g. the
#     headless `claude -p` run, whose subagents die with it; their worktree
#     files stay on disk for the next run) and exits 10.
#   Codex 5h left < CODEX_STOP (7) or Codex weekly left < WEEKLY_STOP:
#     stops every running subexp-* Codex unit (not subexp-resume) and keeps
#     watching Claude.
# Usage: tools/budget-watchdog.sh [pid...]   (runs until killed or a Claude stop)
# Interactive orchestrators run it in the background with no pids: its exit is
# the signal to stop launching work and stop running agents.
set -uo pipefail
cd "$(dirname "$0")/.."
POLL="${POLL:-120}"; CLAUDE_STOP="${CLAUDE_STOP:-23}"; CODEX_STOP="${CODEX_STOP:-7}"; WEEKLY_STOP="${WEEKLY_STOP:-7}"
KILL_PIDS=("$@")
log() { echo "$(date '+%F %T') $*" | tee -a .cache/budget-watchdog.log; }
codex_stopped=0
while :; do
  json=$(~/.local/bin/ai-limits --json 2>/dev/null) || { sleep "$POLL"; continue; }
  # Missing or errored data (e.g. HTTP 429) prints "-" and that side is skipped
  # this poll; the watchdog never acts on data it does not have.
  read -r c5 c7 x5 x7 < <(python3 -c '
import json,sys,time
d=json.loads(sys.argv[1]); now=time.time()
def left(side,key):
    w=d.get(side,{}).get(key)
    if not isinstance(w,dict) or "used" not in w: return "-"
    # A window whose reset time has passed is fresh (0% used).
    return 100.0 if w.get("resets_at",0) and w["resets_at"]<now else 100.0-w["used"]
print(left("claude","five_hour"),left("claude","seven_day"),left("codex","five_hour"),left("codex","seven_day"))' "$json")
  below() { [[ "$1" != - ]] && python3 -c "import sys; sys.exit(0 if $1 < $2 else 1)"; }
  # Re-arm once Codex is back above its floors (e.g. after a 5-hour reset).
  if [[ $codex_stopped == 1 ]] && [[ "$x5" != - ]] && ! below "$x5" "$CODEX_STOP" && ! below "$x7" "$WEEKLY_STOP"; then
    log "CODEX recovered: 5h ${x5}% weekly ${x7}% left; re-armed"; codex_stopped=0
  fi
  if [[ $codex_stopped == 0 ]] && { below "$x5" "$CODEX_STOP" || below "$x7" "$WEEKLY_STOP"; }; then
    units=$(systemctl --user list-units --type=service --state=running --no-legend 'subexp-*' | awk '{print $1}' | grep -v '^subexp-resume')
    log "CODEX floor: 5h ${x5}% weekly ${x7}% left; stopping: ${units:-none}"
    [[ -n "$units" ]] && systemctl --user stop $units
    codex_stopped=1
  fi
  if below "$c5" "$CLAUDE_STOP" || below "$c7" "$WEEKLY_STOP"; then
    log "CLAUDE floor: 5h ${c5}% weekly ${c7}% left; pausing (kill: ${KILL_PIDS[*]:-none})"
    echo "claude 5h ${c5}% weekly ${c7}% at $(date '+%F %T')" > .cache/budget-pause
    for p in "${KILL_PIDS[@]}"; do pkill -TERM -P "$p" 2>/dev/null; kill -TERM "$p" 2>/dev/null; done
    exit 10
  fi
  sleep "$POLL"
done
