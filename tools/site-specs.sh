#!/usr/bin/env bash
# Run the e2e specs that mention one site, filtered to that site's tests.
# Usage: tools/site-specs.sh <site-id>     (e.g. monterey-canyon)
# PW_PORT and PW_OUTDIR pass through to Playwright as in tools/gates.sh.
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.local/node/bin:$PATH"
if (( $# != 1 )) || [[ -z "$1" ]]; then
  echo 'Usage: tools/site-specs.sh <site-id>' >&2
  exit 1
fi
site="$1"
mapfile -t specs < <(grep -rlF --include='*.spec.ts' -- "$site" tests/e2e | sort)
if (( ${#specs[@]} == 0 )); then
  echo "No e2e specs mention '$site'." >&2
  exit 1
fi
echo "Specs for $site: ${specs[*]}"
npx playwright test "${specs[@]}" -g "$site"
