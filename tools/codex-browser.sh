#!/usr/bin/env bash
# Browser access for Codex (added 2026-10-11 at the owner's request). Codex's
# sandbox cannot bind ports or launch Chromium, but MCP servers that codex
# itself starts run outside the sandbox. This gives a task a live Vite dev
# server of its own checkout (edits reload without a rebuild) and the codex
# -c args for a headless Playwright MCP server (Playwright's own Chromium,
# WebGL works) that saves screenshots under the task's shots dir.
# Usage (from the checkout to serve):
#   tools/codex-browser.sh start <port>        starts Vite on 127.0.0.1:<port>, prints its pid
#   tools/codex-browser.sh args <out-dir>      prints codex args, one per line (mapfile them)
#   tools/codex-browser.sh stop <pid>
# Needs ~/.local/share/pw-mcp (npm i @playwright/mcp@0.0.83); without it,
# start and args print nothing and the task runs without a browser.
set -uo pipefail
export PATH="$HOME/.local/node/bin:$PATH"
mcp="$HOME/.local/share/pw-mcp/node_modules/@playwright/mcp/cli.js"
chrome=$(ls -d "$HOME"/.cache/ms-playwright/chromium-*/chrome-linux64/chrome 2>/dev/null | sort -V | tail -1)
# The kickoff smoke test writes browser-off if Codex cannot reach the MCP server.
[[ -f $mcp && -x $chrome && ! -f "$(dirname "$0")/../.cache/codex/browser-off" ]] || exit 0

case "${1:-}" in
start)
  port=${2:?port}
  # Own dep-optimizer cache per server: worktrees share node_modules by symlink.
  VITE_CACHE_DIR=".cache/vite-$port" setsid npx vite --host 127.0.0.1 --port "$port" --strictPort \
    > ".cache/vite-$port.log" 2>&1 < /dev/null &
  pid=$!
  for _ in $(seq 60); do
    curl -sf -o /dev/null "http://127.0.0.1:$port/" && { echo "$pid"; exit 0; }
    sleep 1
  done
  kill -- -"$pid" 2>/dev/null; exit 1 ;;
args)
  out=${2:?out dir}; mkdir -p "$out"
  printf '%s\n' -c 'mcp_servers.browser_pw.command="'"$(command -v node)"'"' \
    -c "mcp_servers.browser_pw.args=[\"$mcp\",\"--headless\",\"--isolated\",\"--executable-path\",\"$chrome\",\"--viewport-size\",\"1280x720\",\"--output-dir\",\"$out\",\"--caps\",\"vision\"]" \
    -c 'mcp_servers.browser_pw.startup_timeout_sec=60' \
    -c 'mcp_servers.browser_pw.tool_timeout_sec=180' ;;
stop)
  [[ -n "${2:-}" ]] && kill -- -"$2" 2>/dev/null; true ;;
*) sed -n 2,13p "$0"; exit 1 ;;
esac
