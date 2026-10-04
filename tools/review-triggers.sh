#!/usr/bin/env bash
# Decide whether the next Claude run should be a REVIEW (cheap; no Claude).
# Writes .cache/review-due ("comprehensive" or "targeted" + reasons) or leaves
# it absent. Called every timer tick from tools/resume.sh. The review run
# deletes the flag and touches .cache/last-review-<type> when done.
#   Comprehensive: >= 24 h since the last one, a new release tag (>= 12 h after
#   the last review; f22-f25 each got one), or >= 8 merges.
#   Targeted: the Claude backlog ran dry (3 runs in a row merged nothing),
#   CI red on main for 3+ runs, Claude idle at >= 50% for 2+ h, the Codex queue
#   empty with < 2 tasks for 2+ h, or the same gate failing repeatedly.
cd "$(dirname "$0")/.."
python3 - <<'PY'
import os,re,subprocess,time,csv
now=time.time(); why={'comprehensive':[],'targeted':[]}
def age(f): return now-os.path.getmtime(f) if os.path.exists(f) else 1e9
last=age('.cache/last-review-comprehensive')
if last>24*3600: why['comprehensive'].append('24 h since the last comprehensive review')
sh=lambda c: subprocess.run(c,shell=True,capture_output=True,text=True).stdout
since=f'--since=@{int(now-last)}' if last<1e8 else ''
if last<1e8:
    if sh(f'git log {since} --merges --oneline | wc -l').strip().isdigit() and int(sh(f'git log {since} --merges --oneline | wc -l'))>=8: why['comprehensive'].append('8+ merges since the last review')
    if sh(f'git log {since} --simplify-by-decoration --decorate --oneline | grep -c "tag: f"').strip() not in ('','0') and last>12*3600: why['comprehensive'].append('new release tag')
log=open('plan/OVERNIGHT-LOG.md').read()
runs=re.split(r'\n## ',log)[-3:]
if len(runs)==3 and all(re.search(r'Nothing merged|nothing to do|no unblocked',r,re.I) for r in runs):
    why['targeted'].append('last 3 runs merged nothing (backlog dry?)')
ci=sh('gh run list -w CI -b main -L 3 --json conclusion -q ".[].conclusion" 2>/dev/null').split()
if len(ci)==3 and all(c=='failure' for c in ci): why['targeted'].append('CI red on main for 3 runs')
try:
    rows=list(csv.DictReader(open('.cache/metrics/usage.csv')))[-4:]
    num=lambda v: float(v) if v not in ('','-') else -1
    if len(rows)==4 and all(num(r['claude5h'])>=50 and r['run']=='0' for r in rows) and not any(now-os.path.getmtime(os.path.join('.cache',f))<2*3600 for f in os.listdir('.cache') if f.startswith('resume-2')): why['targeted'].append('Claude idle at >=50% for 2 h')
    if len(rows)==4 and all(num(r['codex5h'])>=30 and int(r['codex_running'] or 0)<2 and int(r['codex_queued'] or 0)==0 for r in rows): why['targeted'].append('Codex starved for 2 h (empty queue)')
except Exception: pass
fails=sh('grep -h "^FAIL" .cache/codex/*-result.md 2>/dev/null | sort | uniq -c | sort -rn | head -1').split()
if fails and int(fails[0])>=4: why['targeted'].append(f'gate "{" ".join(fails[2:3])}" failing repeatedly')
# Targeted triggers repeat at most every 2 h; comprehensive covers everything.
if why['targeted'] and age('.cache/last-review-targeted')<2*3600: why['targeted']=[]
kind='comprehensive' if why['comprehensive'] else ('targeted' if why['targeted'] else None)
if kind:
    open('.cache/review-due','w').write(kind+'\n'+'\n'.join(why['comprehensive']+why['targeted'])+'\n')
    print(kind, why[kind])
elif os.path.exists('.cache/review-due'): pass
PY
