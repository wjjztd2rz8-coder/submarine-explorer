#!/usr/bin/env bash
# Run static gates and browser smoke checks. CI defaults to the full suite.
# Usage: tools/gates.sh [--full-e2e | --no-e2e]   Logs: .cache/gates/<gate>.log
# Builds use temporary outputs unless PW_OUTDIR names a retained output.
set -uo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.local/node/bin:$PATH"
e2e_mode=smoke
[[ -z "${CI:-}" ]] || e2e_mode=full
if (( $# > 1 )); then
  echo 'Usage: tools/gates.sh [--full-e2e | --no-e2e]' >&2
  exit 1
fi
case "${1:-}" in
  '') ;;
  --full-e2e) e2e_mode=full ;;
  --no-e2e) e2e_mode=none ;;
  *) echo 'Usage: tools/gates.sh [--full-e2e | --no-e2e]' >&2; exit 1 ;;
esac
mkdir -p .cache/gates
port="${PW_PORT:-4173}"
if ! [[ "$port" =~ ^[0-9]+$ ]] || (( 10#$port < 1 || 10#$port > 65435 )); then
  echo 'PW_PORT must be an integer between 1 and 65435 (reserves port + 100 for e2e-base).' >&2
  exit 1
fi
port=$((10#$port)); bport=$((port + 100))
# A gate run must build exactly what its preview will serve. Unique outputs
# also prevent another gate process rebuilding/removing a live suite's files.
outdir="${PW_OUTDIR:-dist-gates-$port-$$}"
base_outdir="dist-gates-base-$bport-$$"
cleanup() {
  [[ -n "${PW_OUTDIR:-}" ]] || rm -rf -- "$outdir"
  rm -rf -- "$base_outdir"
}
trap cleanup EXIT
fail=0
gate() {
  local name="$1"; shift
  if "$@" > ".cache/gates/$name.log" 2>&1; then
    echo "PASS $name"
  else
    echo "FAIL $name  (log: .cache/gates/$name.log)"
    tail -40 ".cache/gates/$name.log" | sed 's/^/    /'
    fail=1
  fi
}
gate build npm run build -- --outDir "$outdir"
gate unit npm test
gate python npm run test:py
gate content npm run check:content
gate attribution python3 tools/check_attribution.py
gate prettier npx prettier --check .
if [[ "$e2e_mode" != none ]]; then
  e2e_specs=()
  if [[ "$e2e_mode" == smoke ]]; then
    e2e_specs=(tests/e2e/smoke.spec.ts)
    echo 'E2E mode: smoke + project-base (use --full-e2e for the full suite; CI runs all tests)'
  else
    echo 'E2E mode: full suite + project-base'
  fi
  # Always let Playwright start/own its server; a port conflict fails early
  # instead of silently depending on another task's preview lifetime/build.
  gate e2e env PW_PORT="$port" PW_OUTDIR="$outdir" PW_REUSE_SERVER=0 \
    npm run test:e2e -- "${e2e_specs[@]}" --output="test-results-gates-$port-$$"
  project_base() {
    VITE_BASE=/submarine-explorer/ npm run build -- --outDir "$base_outdir" && \
      VITE_BASE=/submarine-explorer/ PW_BASE=/submarine-explorer/ PW_PORT="$bport" \
      PW_OUTDIR="$base_outdir" PW_REUSE_SERVER=0 \
      npx playwright test tests/e2e/base-url.spec.ts --output="test-results-project-base-$bport-$$"
  }
  gate e2e-base project_base
fi
exit $fail
