#!/usr/bin/env bash
# Merge gate: static checks, build, played dives (keyboard + touch), unit suite.
# Usage: tools/playtest/gate.sh <gateDir> <port> [keyboard sites...]
#   GATE_TOUCH="site:WxH ..."  touch dives (default: six standard ones; "none" to skip)
#   GATE_UNITS=0               skip the unit suite
#   GATE_PAR=3                 plays at once
# Writes <gateDir>/SUMMARY.txt; prints it at the end.
set -u
export PATH=$HOME/.local/node/bin:$PATH
G=$(realpath -m "$1"); PORT=$2; shift 2
SITES=("$@")
if [ ${#SITES[@]} -eq 0 ]; then
  SITES=(axial-seamount-ashes beebe-vent-field bismarck blake-plateau-corals challenger-deep endurance great-blue-hole hudson-canyon hunga-tonga-caldera kamaehuakanaloa lost-city monterey-canyon titanic)
fi
TOUCH=${GATE_TOUCH:-"great-blue-hole:390x664 titanic:390x664 challenger-deep:390x664 lost-city:390x844 monterey-canyon:390x844 hunga-tonga-caldera:844x390"}
PAR=${GATE_PAR:-3}
mkdir -p "$G"; S="$G/SUMMARY.txt"; : > "$S"
step() { local name=$1; shift; if "$@" > "$G/$name.log" 2>&1; then echo "PASS $name" >> "$S"; else echo "FAIL $name (see $G/$name.log)" >> "$S"; fi; }
step content npm run check:content
step prettier npx prettier --check .
step py npm run test:py
step typecheck npx tsc --noEmit
step build npx vite build --outDir "$G/dist" --emptyOutDir
python3 -I -m http.server "$PORT" --bind 127.0.0.1 --directory "$G/dist" > /dev/null 2>&1 &
SRV=$!; trap 'kill $SRV 2>/dev/null' EXIT; sleep 1
URL="http://127.0.0.1:$PORT/"
printf '%s\n' "${SITES[@]}" | xargs -P "$PAR" -I{} sh -c \
  "TOUR_NO_ANTISTUCK=1 TOUR_NO_FINISH=1 node tools/playtest/tour.mjs '$G/shots-{}' '{}' 300 1280 720 '$URL' > '$G/play-{}.log' 2>&1"
if [ "$TOUCH" != none ]; then
  printf '%s\n' $TOUCH | xargs -P "$PAR" -I{} sh -c \
    's={}; site=${s%%:*}; wh=${s#*:}; w=${wh%x*}; h=${wh#*x}; TOUCH_FULL=1 node tools/playtest/touch-drive.mjs "'"$G"'/touch-$site-$wh" $w $h $site "'"$URL"'" 300 > "'"$G"'/touch-$site-$wh.log" 2>&1'
fi
echo "--- keyboard (site finds/total debriefAt reveals errs)" >> "$S"
for s in "${SITES[@]}"; do
  grep -h '^RESULT' "$G/play-$s.log" | tail -1 | sed 's/^RESULT //' | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{const r=JSON.parse(d);console.log(r.site,`${r.finds}/${r.total}`,r.debrief?r.debriefAt:"NO-DEBRIEF",`reveals=${r.reveals}`,`errs=${r.errs.length}`)}catch{console.log(process.argv[1],"NO RESULT")}})' "$s" >> "$S"
done
if [ "$TOUCH" != none ]; then
  echo "--- touch (site viewport finds/total debriefAt errs)" >> "$S"
  for s in $TOUCH; do site=${s%%:*}; wh=${s#*:}
    tail -1 "$G/touch-$site-$wh.log" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{const r=JSON.parse(d);console.log(r.site,r.viewport,`${r.finds}/${r.total}`,r.debrief?r.debriefAt:"NO-DEBRIEF",`errs=${r.errors.length}`)}catch{console.log(process.argv[1],"NO RESULT")}})' "$site $wh" >> "$S"
  done
fi
kill $SRV 2>/dev/null
if [ "${GATE_UNITS:-1}" = 1 ]; then
  if npx vitest run > "$G/unit.log" 2>&1; then echo "PASS units: $(grep -E 'Tests +[0-9]' "$G/unit.log" | tail -1)" >> "$S"
  else echo "FAIL units: $(grep -E 'Tests +[0-9]' "$G/unit.log" | tail -1) (see $G/unit.log)" >> "$S"; fi
fi
echo DONE >> "$S"; cat "$S"
