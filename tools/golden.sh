#!/usr/bin/env bash
# One command for the nightly golden set: build, serve on 127.0.0.1 (a bare
# "localhost" can resolve to ::1 and refuse), capture, stop the server.
# Output: .cache/golden/<stamp>/ (contact sheet index.html). Usage: tools/golden.sh
# GOLDEN_SITES=monterey GOLDEN_LAYOUTS=desktop,portrait tools/golden.sh
# GATES_CONFIG_MODE=writable bundles config locally for read-only node_modules.
set -uo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.local/node/bin:$PATH"
mkdir -p .cache/golden
port=${GOLDEN_PORT:-4298}
config_args=()
if [[ "${GATES_CONFIG_MODE:-default}" == writable ]]; then
  # Native local bundle avoids both node_modules/.vite-temp writes and the
  # runner closing before the PWA plugin's late dynamic imports.
  node --input-type=module <<'JS'
import { build } from 'rolldown';
await build({ input: 'vite.config.ts', platform: 'node', external: ['vite'],
  output: { file: '.cache/golden/vite.config.mjs', format: 'esm' } });
JS
  config_args=(--config .cache/golden/vite.config.mjs --configLoader native)
fi
npm run build -- "${config_args[@]}" > .cache/golden-build.log 2>&1 || { echo "build failed (.cache/golden-build.log)"; exit 1; }
npx vite preview "${config_args[@]}" --port $port --strictPort --host 127.0.0.1 > .cache/golden-preview.log 2>&1 &
srv=$!; trap 'kill $srv 2>/dev/null' EXIT
for i in $(seq 1 30); do
  curl -s -o /dev/null "http://127.0.0.1:$port/" && break
  kill -0 "$srv" 2>/dev/null || { cat .cache/golden-preview.log; exit 1; }
  sleep 1
done
node tools/golden-shots.mjs --base-url "http://127.0.0.1:$port/"
