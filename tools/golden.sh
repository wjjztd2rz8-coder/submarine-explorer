#!/usr/bin/env bash
# One command for the nightly golden set: build, serve on 127.0.0.1 (a bare
# "localhost" can resolve to ::1 and refuse), capture, stop the server.
# Output: .cache/golden/<stamp>/ (contact sheet index.html). Usage: tools/golden.sh
set -uo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.local/node/bin:$PATH"
port=4298; while ss -ltn | grep -q ":$port "; do port=$((port+1)); done
npm run build > .cache/golden-build.log 2>&1 || { echo "build failed (.cache/golden-build.log)"; exit 1; }
npx vite preview --port $port --strictPort --host 127.0.0.1 > .cache/golden-preview.log 2>&1 &
srv=$!; trap 'kill $srv 2>/dev/null' EXIT
for i in $(seq 1 30); do curl -s -o /dev/null "http://127.0.0.1:$port/" && break; sleep 1; done
node tools/golden-shots.mjs --base-url "http://127.0.0.1:$port/"
