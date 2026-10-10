#!/usr/bin/env bash
# Bound each attempt so a stalled download/apt process can retry within the
# workflow's install step. apt-lock contention on hosted runners (exit 100)
# usually clears within a few tens of seconds, so back off between attempts.
# Preserve the final attempt's exit code.
set -uo pipefail
attempts=3
delays=(0 15 30)
for attempt in $(seq 1 "$attempts"); do
  sleep "${delays[$((attempt - 1))]}"
  if timeout --kill-after=5s 120s npx playwright install --with-deps chromium; then
    exit 0
  else
    status=$?
  fi
  if (( attempt == attempts )); then
    exit "$status"
  fi
  echo "Chromium installation failed or stalled (attempt $attempt of $attempts); retrying." >&2
done
