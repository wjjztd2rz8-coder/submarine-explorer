#!/usr/bin/env bash
# List (default) or delete stale build/test output directories.
# Usage: tools/clean-artifacts.sh [--days N] [--root DIR] [--delete]
# Candidates: dist-*/, test-results-*/ at the root and .cache/runs/*/ older than
# N days (default 2). Skipped: any directory a live process uses as PW_OUTDIR
# (or names on its command line), any directory with a file changed in the last
# 2 hours, and dist/. Dry run unless --delete is given.
set -uo pipefail
days=2
delete=0
root="$(cd "$(dirname "$0")/.." && pwd)"
usage() { echo 'Usage: tools/clean-artifacts.sh [--days N] [--root DIR] [--delete]' >&2; exit 1; }
while (( $# )); do
  case "$1" in
    --days) [[ "${2:-}" =~ ^[0-9]+$ ]] || usage; days="$2"; shift 2 ;;
    --root) [[ -n "${2:-}" ]] || usage; root="$2"; shift 2 ;;
    --delete) delete=1; shift ;;
    *) usage ;;
  esac
done
root="$(cd "$root" && pwd)" || exit 1
cd "$root" || exit 1

# Directories that a live process is using, as absolute paths.
live=()
add_live() { live+=("$(realpath -m -- "$1")"); }
# PW_OUTDIR from this shell, and from every readable process environment.
[[ -n "${PW_OUTDIR:-}" ]] && add_live "$PW_OUTDIR"
for env in /proc/[0-9]*/environ; do
  pid="${env#/proc/}"; pid="${pid%/environ}"
  value=$({ tr '\0' '\n' < "$env"; } 2>/dev/null | sed -n 's/^PW_OUTDIR=//p' | head -1)
  [[ -n "$value" ]] || continue
  cwd=$(readlink "/proc/$pid/cwd" 2>/dev/null) || cwd="$root"
  [[ "$value" == /* ]] && add_live "$value" || add_live "$cwd/$value"
done
# Any running command line that names a candidate as a whole word.
cmdlines=$(pgrep -af . 2>/dev/null || true)

is_live() {
  local dir="$1" name abs
  name="$(basename "$dir")"
  abs="$(realpath -m -- "$dir")"
  for l in "${live[@]}"; do [[ "$l" == "$abs" ]] && return 0; done
  grep -Fwq -- "$name" <<< "$cmdlines" && return 0
  return 1
}

candidates=()
shopt -s nullglob
for d in dist-*/ test-results-*/ .cache/runs/*/; do
  candidates+=("${d%/}")
done
shopt -u nullglob

total=0 count=0 reclaim=0
printf '%-10s  %-44s  %s\n' SIZE DIRECTORY STATUS
for d in "${candidates[@]}"; do
  [[ -d "$d" && ! -L "$d" ]] || continue
  size=$(du -sb -- "$d" 2>/dev/null | cut -f1)
  if is_live "$d"; then status='skip: in use'
  elif [[ -n "$(find "$d" -mmin -120 -print -quit 2>/dev/null)" ]]; then status='skip: modified in last 2 h'
  elif [[ -n "$(find "$d" -mmin "-$((days * 1440))" -print -quit 2>/dev/null)" ]]; then status="skip: changed within $days d"
  else
    status='stale'
    count=$((count + 1)); reclaim=$((reclaim + size))
    if (( delete )); then
      case "$d" in dist-*|test-results-*|.cache/runs/*) rm -rf -- "$d" && status='deleted' ;; *) status='skip: unexpected path' ;; esac
    fi
  fi
  total=$((total + size))
  printf '%-10s  %-44s  %s\n' "$(numfmt --to=iec "$size")" "$d" "$status"
done

if (( delete )); then verb=Reclaimed; else verb='Would reclaim'; fi
echo
echo "$count stale director$([[ $count == 1 ]] && echo y || echo ies) older than $days days; $verb $(numfmt --to=iec "$reclaim") of $(numfmt --to=iec "$total") scanned."
(( delete )) || echo 'Dry run: nothing deleted. Re-run with --delete to remove the stale directories.'
