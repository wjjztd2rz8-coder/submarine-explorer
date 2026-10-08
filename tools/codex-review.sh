#!/usr/bin/env bash
# Independent Codex (Sol) review for comprehensive reviews, then one reconcile
# round against Claude's draft. Added 2026-10-08 after the first joint review
# found a real blocker Claude missed (default missions skip the hero scenery)
# and corrected two Claude errors.
# Usage: tools/codex-review.sh start <golden-dir> [previous-golden-dir]   (~15-20 min; nohup ... &)
#        tools/codex-review.sh reconcile <claude-review.md>               (~10 min; waits for start; prints the reply)
# Output: .cache/review/current -> .cache/review/<stamp>/ with sol-review.md, sol-round2.md
set -uo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.local/node/bin:$HOME/.local/bin:/home/linuxbrew/.linuxbrew/bin:$PATH"
model=$(tools/codex-model.sh 2>/dev/null || echo gpt-6.1-sol)
codex_args=(-c model_reasoning_effort=high -c 'sandbox_mode="read-only"')

case "${1:-}" in
start)
  golden=${2:?golden dir}; prev=${3:-}
  # Codex floor (owner): 5h >= 5%; leave room for the running tasks.
  if ! ai-limits --json 2>/dev/null | python3 -c '
import json,sys; c=json.load(sys.stdin).get("codex",{})
left=lambda k: 100-(c.get(k) or {}).get("used",100)
sys.exit(0 if left("five_hour")>=20 and left("seven_day")>=10 else 1)'; then
    echo "codex-review: Codex budget too low; skipping (say so in the review)"; exit 75
  fi
  dir=.cache/review/$(date +%Y%m%d-%H%M); mkdir -p "$dir"; ln -sfn "$(basename "$dir")" .cache/review/current
  ci=$(gh run list -w CI -b main -L 1 --json conclusion,status,databaseId -q '.[0]|"\(.databaseId) \(.status) \(.conclusion)"' 2>/dev/null)
  cat > "$dir/sol-prompt.md" <<EOF
You are an independent senior reviewer for "Bathyline", a Vite/TypeScript/Three.js submarine exploration game in this repo (live on GitHub Pages). The owner's goal: publicly playable, realistic and detailed assets "similar but not the same as real life", arcade-simple to play. Claude (creative director) is reviewing separately; do yours WITHOUT assuming Claude's earlier scores are right. Be calibrated: 5 = documentary-still quality a stranger would share, 3 = coherent prototype. Read-only: do not edit any file.

Read plan/DIRECTOR.md (priorities, rubric, 1.0 definition), plan/PHASE-F-PLAN.md, the newest two entries in plan/REVIEWS.md, the tail of plan/OVERNIGHT-LOG.md, \`git log --oneline -60\`, \`git tag\`, the queue (.cache/codex/queue/*.md), the newest Codex results (\`ls -t .cache/codex/*-result.md | head -15\`) and recent plan/progress/ notes.
LOOK AT THE IMAGES (use your image tool) in $golden/ (current main; *-portrait-* are 390x844).${prev:+ Compare with $prev/ for the trend.} Check poses.json for failed captures. Also look at the newest play-flow captures under .cache/codex/shots/ (check their dates). Check source when a claim depends on it (mission data, spawn, golden tool options).
Hosted CI on main, latest run: ${ci:-unknown}. Pages deploys on every push.

Final message (markdown, under 700 words):
1. Stage: % toward 1.0 and remaining calendar time (about 3 parallel Codex tasks plus limited Claude time).
2. Per-hero-site scores (readable / beautiful / simple / rewarding / honest / phone, 1-5) with the biggest gap each, from images you actually viewed.
3. Problems, blockers and risks ranked by impact on a stranger's first 5 minutes: "blocker for 1.0", "should fix", "nice to have", including process/tooling and verification gaps.
4. Where Claude is likely too generous or too harsh.
EOF
  codex exec -m "$model" "${codex_args[@]}" --output-last-message "$dir/sol-review.md" - < "$dir/sol-prompt.md" > "$dir/sol.log" 2>&1
  grep -m1 -oE 'session id: [0-9a-f-]+' "$dir/sol.log" | cut -d' ' -f3 > "$dir/session"
  cat "$dir/sol-review.md" ;;
reconcile)
  draft=${2:?claude review file}; dir=.cache/review/current
  # start may still be running (Claude reviews in parallel): wait up to 40 min.
  for _ in $(seq 240); do [[ -s $dir/session ]] && break; sleep 10; done
  [[ -s $dir/session ]] || { echo "codex-review: no Sol session after 40 min; review alone" >&2; exit 1; }
  { cat <<'EOF'
Claude's independent review is below. Reconcile with yours so we can report one agreed view. Still read-only.
For each point where the two reviews differ (scores, blockers, stage, timeline, facts), say AGREE or DISAGREE with one line of evidence (file:line or image name). Correct factual errors in either review. Then add anything both missed.
End with an "Agreed summary" (under 250 words): stage %, timeline, the agreed top 5 blockers in order, and per-site scores you can both stand behind.

---
EOF
    cat "$draft"; } > "$dir/sol-round2-prompt.md"
  codex exec resume "$(cat "$dir/session")" "${codex_args[@]}" --output-last-message "$dir/sol-round2.md" - < "$dir/sol-round2-prompt.md" > "$dir/sol2.log" 2>&1
  cat "$dir/sol-round2.md" ;;
*) sed -n 2,8p "$0"; exit 1 ;;
esac
