#!/usr/bin/env bash
# Summarise process efficiency from .cache/metrics/usage.csv and the logs:
# idle capacity (budget available but nothing working), run starts vs skips,
# watchdog trips and gate failures. Used by the daily process review.
cd "$(dirname "$0")/.."
python3 - <<'PY'
import csv,re,collections
rows=list(csv.DictReader(open('.cache/metrics/usage.csv'))) if __import__('os').path.exists('.cache/metrics/usage.csv') else []
n=len(rows)
def num(v):
    try: return float(v)
    except: return None
import datetime as dt
def ts(r):
    try: return dt.datetime.strptime(r['time'],'%Y-%m-%d %H:%M')
    except: return None
now=dt.datetime.now()
# Windowed: lifetime totals (204 h idle by 2026-10-16) hid what changed this week.
for label,hours in (('24 h',24),('7 d',168)):
    win=[r for r in rows if ts(r) and (now-ts(r)).total_seconds()<hours*3600]
    ic=sum(1 for r in win if (num(r['claude5h']) or 0)>=50 and r['run']=='0')
    ix=sum(1 for r in win if (num(r['codex5h']) or 0)>=30 and int(r['codex_running'] or 0)<2)
    print(f"last {label}: {len(win)} samples | Claude idle (>=50% 5h, no run) ~{ic/4:.1f}-{ic/2:.1f} h | Codex under-used (>=30% 5h, <2 tasks) ~{ix/4:.1f}-{ix/2:.1f} h")
# Weekly burn over the last 24 h, ignoring resets (a rise in % left).
for side,col in (('Claude','claude7d'),('Codex','codex7d')):
    pts=[(ts(r),num(r[col])) for r in rows if ts(r) and num(r[col]) is not None and (now-ts(r)).total_seconds()<86400]
    used=sum(max(0,a[1]-b[1]) for a,b in zip(pts,pts[1:]))
    if pts: print(f"{side} weekly: {pts[-1][1]:.0f}% left, ~{used:.0f}%/day burn"+(f", runs out in ~{pts[-1][1]/used:.1f} days" if used else ""))
blind=sum(1 for r in rows if r['claude5h'] in ('-',''))
print(f"samples (15-30 min each, lifetime): {n} | usage unreadable: {blind}")
import os
log=open('plan/OVERNIGHT-LOG.md').read()+(open('.cache/skips.log').read() if os.path.exists('.cache/skips.log') else '')
skips=collections.Counter(re.findall(r'skipped: (\w[\w ]*?) \(',log))
print("run skips by reason:",dict(skips))
try:
    w=open('.cache/budget-watchdog.log').read().splitlines()
    print("watchdog trips:",sum('floor' in l for l in w),"| last:",w[-1] if w else '-')
except FileNotFoundError: pass
import glob
res=[open(f).readline().strip() for f in glob.glob('.cache/codex/*-result.md')]
import subprocess
f=subprocess.run("journalctl --user --since -24h -o cat -u subexp-resume.service -u subexp-tick.service | grep -c 'Failed with result'",shell=True,capture_output=True,text=True).stdout.strip()
print("failed timer runs (24 h):",f or 0)
print("codex results: PASS",sum('PASS' in r for r in res),"| other",sum('PASS' not in r for r in res))
PY
