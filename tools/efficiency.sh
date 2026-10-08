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
idle_claude=sum(1 for r in rows if (num(r['claude5h']) or 0)>=50 and r['run']=='0')
idle_codex=sum(1 for r in rows if (num(r['codex5h']) or 0)>=30 and int(r['codex_running'] or 0)<2)
blind=sum(1 for r in rows if r['claude5h'] in ('-',''))
print(f"samples (30 min each): {n}")
print(f"Claude idle with >=50% 5h and no run: {idle_claude} samples (~{idle_claude/2:.1f} h)")
print(f"Codex under-used (>=30% 5h, <2 tasks): {idle_codex} samples (~{idle_codex/2:.1f} h)")
print(f"Usage unreadable: {blind} samples")
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
print("codex results: PASS",sum('PASS' in r for r in res),"| other",sum('PASS' not in r for r in res))
PY
