#!/usr/bin/env bash
# Run static gates and browser smoke checks. CI defaults to the full suite.
# Usage: tools/gates.sh [--full-e2e | --no-e2e]
# Internal CI: --phase <checks|build|e2e|e2e-base> [--prebuilt] [-- <browser args>]
# Each run writes under .cache/runs/<id>/ (builds, test-results, <gate>.log);
# .cache/gates/<gate>.log links to the latest run's log. tools/clean-artifacts.sh
# prunes old runs. PW_OUTDIR, when set, names a retained build output instead.
# Read-only dependency trees: GATES_CONFIG_MODE=writable keeps temporary config
# bundles in .cache, and uses Vitest's runner without a dependency-tree cache.
set -uo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.local/node/bin:$PATH"
e2e_mode=smoke
[[ -z "${CI:-}" ]] || e2e_mode=full
phase=all
prebuilt=0
mode_set=0
browser_args=()
usage() {
  echo 'Usage: tools/gates.sh [--full-e2e | --no-e2e] or --phase <checks|build|e2e|e2e-base> [--prebuilt] [-- <browser args>]' >&2
  exit 1
}
while (( $# )); do
  case "$1" in
    --full-e2e|--no-e2e)
      (( mode_set == 0 )) || usage
      mode_set=1
      [[ "$1" == --full-e2e ]] && e2e_mode=full || e2e_mode=none
      shift ;;
    --phase)
      [[ "$phase" == all && $# -ge 2 ]] || usage
      phase="$2"
      case "$phase" in checks|build|e2e|e2e-base) ;; *) usage ;; esac
      shift 2 ;;
    --prebuilt) (( prebuilt == 0 )) || usage; prebuilt=1; shift ;;
    --) shift; browser_args=("$@"); break ;;
    *) usage ;;
  esac
done
if [[ "$phase" != all ]]; then
  (( mode_set == 0 )) || usage
fi
case "$phase" in
  e2e|e2e-base)
    (( prebuilt == 1 )) && [[ -n "${PW_OUTDIR:-}" ]] || usage
    e2e_mode=full ;;
  *) (( prebuilt == 0 && ${#browser_args[@]} == 0 )) || usage ;;
esac
if [[ "$phase" == build && -z "${PW_OUTDIR:-}" ]]; then usage; fi
mkdir -p .cache/gates
build_config_args=()
unit_config_args=()
case "${GATES_CONFIG_MODE:-default}" in
  default) ;;
  writable)
    unit_config_args=(-- --configLoader runner --cache=false)
    ;;
  *) echo 'GATES_CONFIG_MODE must be default or writable.' >&2; exit 1 ;;
esac
port="${PW_PORT:-4173}"
if ! [[ "$port" =~ ^[0-9]+$ ]] || (( 10#$port < 1 || 10#$port > 65535 )); then
  echo 'PW_PORT must be an integer between 1 and 65535.' >&2
  exit 1
fi
port=$((10#$port))
# A gate run must build exactly what its preview will serve. Unique outputs
# also prevent another gate process rebuilding/removing a live suite's files.
mkdir -p .cache/runs
run_dir="$(mktemp -d ".cache/runs/$(date +%Y%m%d-%H%M%S)-$$-XXXXXX")" || exit 1
run_id="${run_dir##*/}"
outdir="${PW_OUTDIR:-$run_dir/dist}"
base_outdir="$run_dir/dist-base"
gate_config=".cache/gates/vite-$port-$run_id.config.mjs"
cleanup() {
  if (( prebuilt == 0 )); then
    [[ -n "${PW_OUTDIR:-}" ]] || rm -rf -- "$outdir"
    rm -rf -- "$base_outdir"
  fi
  rm -f -- "$gate_config"
}
trap cleanup EXIT
fail=0
gate() {
  local name="$1"; shift
  ln -sfn "../runs/$run_id/$name.log" ".cache/gates/$name.log"
  if {
    if [[ "$phase" == all ]]; then
      "$@" > "$run_dir/$name.log" 2>&1
    else
      # Keep hosted build provenance and live test output visible in job logs.
      "$@" 2>&1 | tee "$run_dir/$name.log"
    fi
  }; then
    echo "PASS $name"
    return 0
  else
    echo "FAIL $name  (log: $run_dir/$name.log)"
    tail -40 "$run_dir/$name.log" | sed 's/^/    /'
    fail=1
    return 1
  fi
}
if [[ "${GATES_CONFIG_MODE:-default}" == writable && ( "$phase" == all || "$phase" == build ) ]]; then
  # Native loading of a local bundle also avoids Vite 8's runner closing before
  # the existing PWA plugin's late dynamic imports execute in closeBundle.
  gate config node --input-type=module - "$gate_config" <<'JS'
import { build } from 'rolldown';
await build({
  input: 'vite.config.ts', platform: 'node', external: ['vite'],
  output: { file: process.argv[2], format: 'esm' },
});
JS
  build_config_args=(--config "$gate_config" --configLoader native)
fi
root_build_ok=0
root_e2e() {
  if [[ "$phase" == all ]] && (( root_build_ok == 0 )); then
    echo 'Root browser gate requires a successful build.' >&2
    return 1
  fi
  if (( prebuilt )); then
    node tools/ci-build-manifest.mjs verify / "$outdir" || return 1
  fi
  e2e_specs=()
  if [[ "$e2e_mode" == smoke ]]; then
    e2e_specs=(tests/e2e/smoke.spec.ts)
  fi
  # Always let Playwright start/own its server; a port conflict fails early
  # instead of silently depending on another task's preview lifetime/build.
  if [[ "$phase" == e2e ]]; then
    # CI keeps discovery-driven balancing and timing/report paths supplied by
    # the workflow; the consumer validates the artifact before discovery.
    env PW_PORT="$port" PW_OUTDIR="$outdir" PW_REUSE_SERVER=0 VITE_BASE=/ \
      node tools/e2e-shards.mjs "${browser_args[@]}"
  else
    env PW_PORT="$port" PW_OUTDIR="$outdir" PW_REUSE_SERVER=0 \
      npm run test:e2e -- "${e2e_specs[@]}" --output="$run_dir/test-results"
  fi
}
project_base() {
  # The suites run sequentially and Playwright has stopped the first preview.
  # Use the requested port again: port + 100 may belong to an unrelated task.
  # This is a fresh owned preview of a separate build, with reuse still off.
  if (( prebuilt )); then
    node tools/ci-build-manifest.mjs verify /submarine-explorer/ "$outdir" || return 1
    base_outdir="$outdir"
  else
    VITE_BASE=/submarine-explorer/ npm run build -- --outDir "$base_outdir" "${build_config_args[@]}" || return 1
  fi
  VITE_BASE=/submarine-explorer/ PW_BASE=/submarine-explorer/ PW_PORT="$port" \
    PW_OUTDIR="$base_outdir" PW_REUSE_SERVER=0 \
    npx playwright test tests/e2e/base-url.spec.ts \
    --output="${PW_BASE_RESULTS:-$run_dir/test-results-project-base}" "${browser_args[@]}"
}
build_root() {
  case "$phase" in
    checks) npm run typecheck ;;
    build)
      # CI typechecks once in checks; each deployment base only bundles here.
      VITE_BASE="${VITE_BASE:-/}" npx vite build --outDir "$outdir" "${build_config_args[@]}" && \
        node tools/ci-build-manifest.mjs write "${VITE_BASE:-/}" "$outdir" ;;
    *) npm run build -- --outDir "$outdir" "${build_config_args[@]}" ;;
  esac
}
# The single ordered gate definition. CI phases select from this same list;
# all-mode keeps aggregated failures, smoke/full selection and isolated outputs.
if [[ "$phase" == all && "$e2e_mode" != none ]]; then
  if [[ "$e2e_mode" == smoke ]]; then
    echo 'E2E mode: smoke + project-base (use --full-e2e for the full suite; CI runs all tests)'
  else
    echo 'E2E mode: full suite + project-base'
  fi
fi
for name in python content build unit e2e e2e-base attribution prettier; do
  case "$phase:$name" in
    all:e2e|all:e2e-base) [[ "$e2e_mode" != none ]] || continue ;;
    all:*|checks:python|checks:content|checks:build|checks:unit|checks:attribution|checks:prettier|build:build|e2e:e2e|e2e-base:e2e-base) ;;
    *) continue ;;
  esac
  case "$name" in
    python) gate "$name" npm run test:py ;;
    content) gate "$name" npm run check:content ;;
    build) gate "$name" build_root && root_build_ok=1 ;;
    unit) gate "$name" npm test "${unit_config_args[@]}" ;;
    e2e) gate "$name" root_e2e ;;
    e2e-base) gate "$name" project_base ;;
    attribution) gate "$name" python3 tools/check_attribution.py ;;
    prettier) gate "$name" npx prettier --check . ;;
  esac
done
exit $fail
