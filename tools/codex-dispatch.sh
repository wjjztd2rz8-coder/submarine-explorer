#!/usr/bin/env bash
# Launch queued Codex briefs without needing a Claude run. Briefs wait in
# .cache/codex/queue/NN-<name>.md (oldest first). An optional first line
# `<!-- env: NET=1 ROUNDS=3 -->` sets task options. A brief launches when
# fewer than MAX (3) Codex tasks are running and Codex has >= 20% (5h) and
# >= 8% (weekly) left (the watchdog still enforces the hard floors).
# Called every 30 min from tools/resume.sh; safe to run by hand.
set -uo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.local/node/bin:$HOME/.local/bin:$PATH"
# Serialize dispatchers; socket probes alone miss running tasks which have not
# started their gate server yet (or are between e2e and e2e-base).
mkdir -p .cache/codex/queue/launched
exec {dispatch_lock_fd}>.cache/codex/dispatch.lock
flock -n "$dispatch_lock_fd" || exit 0
MAX="${MAX:-3}"
running() { systemctl --user list-units --type=service --state=running --no-legend 'subexp-*' | awk '{print $1}' | grep -vc '^subexp-resume'; }
codex_ok() { ai-limits --json 2>/dev/null | python3 -c '
import json,sys,time
c=json.load(sys.stdin).get("codex",{}); now=time.time()
def left(k):
    w=c.get(k) or {}
    if "used" not in w: return -1
    return 100 if w.get("resets_at") and w["resets_at"]<now else 100-w["used"]
sys.exit(0 if left("five_hour")>=20 and left("seven_day")>=8 else 1)'; }
port=4370
mapfile -t active_units < <(systemctl --user list-units --type=service --state=running --no-legend 'subexp-*' | awk '{print $1}')
reserved_ports=''
if (( ${#active_units[@]} )); then
  # systemd-run passes PW_PORT through env in ExecStart, not Environment.
  # Reserve the primary and project-base ports for the task's whole lifetime.
  reserved_ports=$(systemctl --user show "${active_units[@]}" --property=ExecStart --value |
    grep -oE 'PW_PORT=[0-9]+' | cut -d= -f2 | awk '{print $1; print $1 + 100}')
fi
for brief in $(ls .cache/codex/queue/*.md 2>/dev/null | sort); do
  (( $(running) < MAX )) || { echo "dispatch: $MAX tasks running"; break; }
  codex_ok || { echo "dispatch: Codex budget low; queue waits"; echo "$(date '+%F %T') codex low; $(ls .cache/codex/queue/*.md | wc -l) queued" >> .cache/codex/queue/waiting.log; break; }
  name=$(basename "$brief" .md); name=${name#[0-9][0-9]-}
  opts=$(head -1 "$brief" | sed -n 's/^<!-- env: \(.*\) -->$/\1/p'); rounds=$(sed -n 's/.*ROUNDS=\([0-9]*\).*/\1/p' <<<"$opts"); rounds=${rounds:-3}
  while grep -Eq "^($port|$((port + 100)))$" <<<"$reserved_ports" || \
    ss -ltn | grep -E ":($port|$((port + 100))) " >/dev/null; do port=$((port+1)); done
  mv "$brief" .cache/codex/queue/launched/
  systemd-run --user --unit="subexp-$name" --working-directory="$PWD" env WT=1 ON_LIMIT=exit PW_PORT=$port ${opts//ROUNDS=$rounds/} tools/codex-task.sh ".cache/codex/queue/launched/$(basename "$brief")" "$name" "$rounds" >/dev/null 2>&1 \
    && echo "$(date '+%F %T') launched $name (port $port)" | tee -a .cache/codex/queue/launched.log
  port=$((port+1))
done
