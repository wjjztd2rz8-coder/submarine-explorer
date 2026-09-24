#!/usr/bin/env bash
# Show what each Codex task is doing. Usage: tools/codex-status.sh [name...]
# With no names, lists every task that is running or finished today.
cd "$(dirname "$0")/.."
dir=.cache/codex
names=("$@")
if (( ${#names[@]} == 0 )); then
  mapfile -t names < <(ls -t "$dir"/*-r1.log 2>/dev/null | xargs -r -n1 basename | sed 's/-r1\.log$//')
fi
for n in "${names[@]}"; do
  running=$(pgrep -f "codex-task.sh .* $n( |$)" >/dev/null && echo RUNNING || echo finished)
  rounds=$(ls "$dir/$n"-r*.log 2>/dev/null | wc -l)
  latest=$(ls -t "$dir/$n"-r*.log 2>/dev/null | head -1)
  echo "== $n: $running, round $rounds (updated $(date -r "$latest" +%H:%M))"
  if [[ $running == RUNNING ]] && pgrep -f "gates.sh" >/dev/null && [[ -d ../subexp-wt/$n/.cache/gates ]]; then
    g=$(ls -t ../subexp-wt/$n/.cache/gates/*.log 2>/dev/null | head -1)
    [[ -n "$g" && $(( $(date +%s) - $(date -r "$g" +%s) )) -lt 120 ]] && echo "   running tests: $(basename "$g" .log)"
  fi
  if [[ -f "$dir/$n-result.md" && $running == finished ]]; then
    head -1 "$dir/$n-result.md" | sed 's/^# /   /'
  else
    # Last thing Codex said (its progress notes), trimmed.
    awk '/^codex$/{m=""; c=1; next} /^(exec|thinking|tokens used|user)$/{c=0} c && NF{m=m" "$0} END{print m}' "$latest" \
      | cut -c1-300 | fold -s -w 100 | sed 's/^/   /'
  fi
done
