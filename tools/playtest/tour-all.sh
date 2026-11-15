#!/bin/bash
# Plays each site with the scripted player and writes one RESULT line per site.
export PATH="$HOME/.local/node/bin:$PATH"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT" || exit 1

DIST_DIR="${DIST_DIR:-.cache/s1/dist}"
PORT="${PORT:-4901}"
TOUR_MAX_S="${TOUR_MAX_S:-300}"
OUT_DIR="${OUT_DIR:-.cache/s1/tour}"
NO_FINISH="${NO_FINISH:-1}"
PARALLEL="${PARALLEL:-2}"

EXTRA=()
if [ "$NO_FINISH" = 1 ] || [ "$NO_FINISH" = true ]; then
  EXTRA+=(--no-finish)
fi

mkdir -p "$OUT_DIR"
python3 -I -m http.server "$PORT" --bind 127.0.0.1 --directory "$DIST_DIR" >/dev/null 2>&1 & SRV=$!
sleep 1
trap 'kill "$SRV" 2>/dev/null' EXIT

if [ "$#" -gt 0 ]; then
  SITES=("$@")
else
  # shellcheck disable=SC2207
  SITES=($(ls -1 data/landmarks | grep -vE '^(index\.json|_test)$'))
fi

EXTRA_STR="${EXTRA[*]}"
export ROOT TOUR_MAX_S PORT OUT_DIR EXTRA_STR
printf '%s\n' "${SITES[@]}" | xargs -P "$PARALLEL" -I{} sh -c '
  node "$ROOT/tools/playtest/tour.mjs" "$OUT_DIR/{}" "{}" "$TOUR_MAX_S" 1280 720 "http://127.0.0.1:$PORT/" $EXTRA_STR > "$OUT_DIR/{}.log" 2>&1
'

for s in "${SITES[@]}"; do
  result="$(grep -a "^RESULT" "$OUT_DIR/$s.log" | tail -1)"
  debrief="$(grep -a "^DEBRIEF" "$OUT_DIR/$s.log" | tail -1 | cut -c1-80)"
  echo "$s $result | $debrief"
done | tee "$OUT_DIR/table.txt"