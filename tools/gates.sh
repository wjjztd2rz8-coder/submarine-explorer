#!/usr/bin/env bash
# Run every project gate and print a compact summary. Exit 0 only if all pass.
# Usage: tools/gates.sh [--no-e2e]      Logs: .cache/gates/<gate>.log
set -uo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.local/node/bin:$PATH"
mkdir -p .cache/gates
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
gate build npm run build
gate unit npm test
gate python npm run test:py
gate content npm run check:content
gate attribution python3 tools/check_attribution.py
gate prettier npx prettier --check .
if [[ "${1:-}" != "--no-e2e" ]]; then
  # PW_PORT (default 4173) lets parallel worktrees run e2e side by side.
  port="${PW_PORT:-4173}"; bport=$((port + 100))
  gate e2e env PW_PORT="$port" npm run test:e2e
  gate e2e-base bash -c "VITE_BASE=/submarine-explorer/ npm run build -- --outDir dist-project-base && \
    VITE_BASE=/submarine-explorer/ PW_BASE=/submarine-explorer/ PW_PORT=$bport PW_OUTDIR=dist-project-base \
    npx playwright test tests/e2e/base-url.spec.ts --output=test-results-project-base"
  rm -rf dist-project-base
fi
exit $fail
