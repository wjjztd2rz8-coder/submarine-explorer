#!/usr/bin/env bash
# Append one row of process metrics to .cache/metrics/usage.csv (called every
# 30 min from tools/resume.sh). Columns: time, claude 5h/7d left, codex 5h/7d
# left, headless run active (0/1), Codex tasks running, Codex briefs queued.
cd "$(dirname "$0")/.."
mkdir -p .cache/metrics; f=.cache/metrics/usage.csv
[[ -f $f ]] || echo "time,claude5h,claude7d,codex5h,codex7d,run,codex_running,codex_queued" > $f
read -r c5 c7 x5 x7 < <(~/.local/bin/ai-limits --json 2>/dev/null | python3 -c '
import json,sys,time
d=json.load(sys.stdin); now=time.time()
def left(s,k):
    w=(d.get(s) or {}).get(k) or {}
    if "used" not in w: return ""
    return 100 if w.get("resets_at") and w["resets_at"]<now else round(100-w["used"])
print(left("claude","five_hour") or "-",left("claude","seven_day") or "-",left("codex","five_hour") or "-",left("codex","seven_day") or "-")')
run=$(pgrep -f 'claude -p Resume Submarine' >/dev/null && echo 1 || echo 0)
cr=$(systemctl --user list-units --type=service --state=running --no-legend 'subexp-*' | awk '{print $1}' | grep -vc '^subexp-resume')
q=$(ls .cache/codex/queue/*.md 2>/dev/null | wc -l)
echo "$(date '+%F %H:%M'),$c5,$c7,$x5,$x7,$run,$cr,$q" >> $f
