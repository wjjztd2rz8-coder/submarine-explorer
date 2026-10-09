#!/usr/bin/env bash
# Bound each attempt so a stalled download/apt process can retry within the
# workflow's five-minute install step. Preserve the second attempt's exit code.
set -uo pipefail
for attempt in 1 2; do
  if timeout --kill-after=5s 120s npx playwright install --with-deps chromium; then
    exit 0
  else
    status=$?
  fi
  if (( attempt == 2 )); then
    exit "$status"
  fi
  echo 'Chromium installation failed or stalled; retrying once in 10 seconds.' >&2
  sleep 10
done
