#!/usr/bin/env bash
# One-screen status of unattended Phase F work: usage, the timed run (with its
# latest narration), Claude worktrees, Codex tasks and recent commits.
# Usage: tools/status.sh          (once)
#        watch -n 60 -c tools/status.sh   (live, refreshes every minute)
cd "$(dirname "$0")/.."
export PATH="$HOME/.local/node/bin:$HOME/.local/bin:$PATH"
b() { printf '\n\033[1m== %s\033[0m\n' "$*"; }
b "Usage ($(date '+%a %H:%M'))"; ai-limits 2>&1 | head -2
b "Timed orchestrator run"
if pid=$(pgrep -f 'claude -p Resume Submarine' | head -1); then
  log=$(ls -t .cache/resume-*.log | head -1)
  echo "RUNNING (pid $pid) since $(ps -o lstart= -p "$pid"), log $log"
  # Last few things the orchestrator said or did (stream-json lines).
  python3 - "$log" <<'PY'
import json,sys
out=[]
for line in open(sys.argv[1],errors='ignore'):
    try: e=json.loads(line)
    except Exception: continue
    m=e.get('message') or {}
    for c in (m.get('content') or []) if isinstance(m,dict) else []:
        if c.get('type')=='text' and c.get('text','').strip(): out.append('  says: '+c['text'].strip().replace('\n',' ')[:160])
        elif c.get('type')=='tool_use':
            i=c.get('input',{}); d=i.get('description') or i.get('command') or i.get('prompt') or ''
            out.append(f"  {c.get('name')}: {str(d).replace(chr(10),' ')[:140]}")
print('\n'.join(out[-8:]) or '  (no streamed steps yet; runs started before streaming was added log only at the end)')
PY
else
  echo "not running; next: $(systemctl --user list-timers subexp-resume.timer --no-legend | awk '{print $1, $2, $3}')"
fi
[[ -f .cache/budget-pause ]] && echo "last budget pause: $(cat .cache/budget-pause)"
b "Worktrees (in-progress packages)"
for w in ../subexp-wt/*/; do [[ -e "$w/.git" ]] || continue; n=$(basename "$w")
  echo "  $n: $(git -C "$w" log -1 --format='%cr — %s' | cut -c1-110)"; done
b "Codex tasks"; tools/codex-status.sh 2>/dev/null | grep '==' | grep -v 'finished' | sed 's/^== /  /' ; echo "  (finished tasks hidden)"
b "Recent commits on main (pushed: $(git rev-parse --short origin/main))"; git log --oneline -6 | sed 's/^/  /'
b "Last log entries"; grep -v '^$' plan/OVERNIGHT-LOG.md | tail -4 | cut -c1-220
