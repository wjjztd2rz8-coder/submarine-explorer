#!/usr/bin/env bash
# Run a Codex (GPT-6 Sol, high) task from a brief file, unattended, with a
# gate feedback loop. Codex's sandbox cannot start Vite or Chromium, so this
# script runs tools/gates.sh outside the sandbox after each Codex round and
# feeds failures (and any screenshots) back into the same Codex session.
#
# Usage: tools/codex-task.sh <brief.md> <name> [max_rounds=3]
# Output: .cache/codex/<name>-result.md  (Codex's last message + gate summary)
#         .cache/codex/<name>.log        (full Codex log)
# Screenshots: if the brief's work writes PNGs to .cache/codex/shots/<name>/,
# they are attached to the next round so Codex can see the UI.
# On a Codex usage limit, sleeps until the stated reset time and retries.
set -uo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.local/node/bin:/home/linuxbrew/.linuxbrew/bin:$PATH"
brief="$1"; name="$2"; max_rounds="${3:-3}"
dir=.cache/codex; mkdir -p "$dir/shots/$name"
log="$dir/$name.log"; result="$dir/$name-result.md"; last="$dir/$name-last.md"
: > "$log"
common=(-m gpt-6-sol -c model_reasoning_effort=high -c 'sandbox_mode="workspace-write"')

wait_for_limit() {  # returns 0 if we slept for a usage-limit reset
  local t
  t=$(grep -oiE 'try again at [0-9]{1,2}:[0-9]{2} ?[AP]M' "$1" | tail -1 | sed -E 's/try again at //I')
  [[ -z "$t" ]] && grep -qi 'usage limit' "$1" && t="$(date -d '+60 min' +%H:%M)"
  [[ -z "$t" ]] && return 1
  local target; target=$(date -d "$t" +%s); (( target < $(date +%s) )) && target=$((target + 86400))
  echo "[codex-task] usage limit; sleeping until $(date -d @$((target + 180)))" >> "$log"
  sleep $((target + 180 - $(date +%s)))
  return 0
}

run_codex() {  # run_codex <round-log> <prompt> [images...]
  local rlog="$1" prompt="$2"; shift 2
  local imgs=(); for i in "$@"; do imgs+=(-i "$i"); done
  while :; do
    : > "$last"
    if [[ -z "${session:-}" ]]; then
      codex exec "${common[@]}" -C "$PWD" -o "$last" "${imgs[@]}" "$prompt" < /dev/null > "$rlog" 2>&1
      session=$(grep -m1 -oE 'session id: [0-9a-f-]+' "$rlog" | awk '{print $3}')
    else
      codex exec resume "${common[@]}" -o "$last" "${imgs[@]}" "$session" "$prompt" < /dev/null > "$rlog" 2>&1
    fi
    cat "$rlog" >> "$log"
    grep -qiE "usage limit" "$rlog" && ! [[ -s "$last" ]] && wait_for_limit "$rlog" && continue
    break
  done
}

session=""
run_codex "$dir/$name-r1.log" "$(cat "$brief")"
round=1; status=FAIL
while :; do
  gates=$(tools/gates.sh 2>&1); gstat=$?
  if (( gstat == 0 )); then status=PASS; break; fi
  (( round >= max_rounds )) && break
  round=$((round + 1))
  shots=(); while IFS= read -r f; do shots+=("$f"); done < <(ls -t "$dir/shots/$name"/*.png 2>/dev/null | head -6)
  run_codex "$dir/$name-r$round.log" "The orchestrator ran tools/gates.sh outside your sandbox (it can run Vite and Chromium; you cannot). Fix the root causes without weakening assertions, then reply with the same report format as before. Gate output:

$gates" "${shots[@]}"
done
{
  echo "# codex-task $name — gates $status after $round round(s) — $(date)"
  echo "session: $session"
  echo; echo "## Gate summary"; echo '```'; echo "$gates" | grep -E '^(PASS|FAIL)'; echo '```'
  echo; echo "## Codex's final report"; cat "$last" 2>/dev/null
} > "$result"
echo "codex-task $name finished: gates $status after $round round(s). Result: $result"
[[ $status == PASS ]]
