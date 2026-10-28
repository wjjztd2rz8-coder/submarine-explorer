# T-e2e-timings — refresh hosted shard costs

2026-10-28. Scope: timing weights, their existing import helper, and this requested
progress note. No spec, product code, workflow, shard count, timeout, assertion,
skip, or render tag changed. No merge, push, tag, dispatch, rerun, or deployment.

## Storage, refresh, and rebalance

`tools/e2e-timings.json` stores seconds by source file and full test title path,
plus file/default fallbacks. `tools/e2e-shards.mjs` discovers the current Playwright
roster and assigns the longest estimated cases to the lightest shard, adding two
seconds per case. `.github/workflows/ci.yml` invokes it through `tools/gates.sh`
with 38 shards, one worker each, zero retries, and uploads JSON timing artifacts.
Membership is regenerated on every invocation; there is no separate shard roster
to edit. The last checked-in source was October 15, run 38723709392.

Live read-only `gh run list` calls failed with `error connecting to api.github.com`.
The newest complete hosted logs available locally were in gh's existing cache:
`/tmp/gh-cli-cache/run-log-40637905228-1793165122.zip`, October 28,
[CI 40637905228](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40637905228),
build manifest SHA `b281656231c49b0043f9e7c276fa78ca9d96d95f`.
All 38 shard logs contain **769 passes and 84 existing skips** in total.
This is cached hosted evidence, not a live query or a run of this patch.

Extended the existing JSON importer with `--list-logs` so those logs can refresh
weights directly. It preserves source/helper title paths, sums completed retry
costs, ignores skipped/zero-duration records, and rejects interrupted logs (use
JSON for those). List durations are rounded by Playwright: for example `2.5m`
means approximately 150 seconds, with roughly three seconds of rounding error.
The weights' method records that precision. JSON input remains supported.

Extracted only the 38 top-level `*_e2e (*_38).txt` files into
`/tmp/T-e2e-timings-hosted/shard-01.txt` through `shard-38.txt`, then ran the
one-command refresh:

```bash
node tools/e2e-update-timings.mjs --list-logs \
  https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40637905228 \
  /tmp/T-e2e-timings-hosted/shard-*.txt
```

Imported **769 costs**, including 80 new keys; **757 values differ** from the
previous database. The other **86 historical keys retain their prior values**.
The resulting database has 855 entries; historical renamed cases remain harmless
because selection still comes from current discovery. No local browser duration
was used. This extends one helper instead of adding another refresh script or
configuration surface.

## Shard wall time spread

Measured job spans below use the first and last timestamp in each complete hosted
shard log, rounded to seconds. They include runner setup and artifact upload,
exclude queueing, and approximate job wall time rather than API job boundaries.
These are the five newest **cached CI runs**, not a verified current run list.

| Cached run                                                                                     | Fastest shard | Median shard | Slowest shard  | Slowest above median |
| ---------------------------------------------------------------------------------------------- | ------------- | ------------ | -------------- | -------------------- |
| [40637905228](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40637905228) | 6m58s         | 12m46s       | 16m41s (3/38)  | **30.68%**           |
| [40631315014](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40631315014) | 6m37s         | 13m28.5s     | 17m56s (13/38) | 33.09%               |
| [40622811363](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40622811363) | 7m14s         | 12m20.5s     | 16m44s (3/38)  | 35.58%               |
| [40620000645](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40620000645) | 7m13s         | 12m18.5s     | 16m15s (31/38) | 32.02%               |
| [40610810918](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40610810918) | 6m37s         | 11m57.5s     | 17m44s (13/38) | 48.29%               |

The newest observed spread exceeds 30%, so the refreshed weights rebalance the
existing 38 shards automatically. Current `CI=1` discovery finds **853 cases in
65 specs**. Scoring the old assignments with refreshed costs gives
**8m12.4s–18m22.8s**, median **14m23.9s**. New assignments estimate
**13m42.0s–13m45.7s**, median **13m42.6s**, slowest **0.38%** above median.
Total estimated work including startup allowances falls from **9.31 to 8.69
serial hours**. These are estimates, not measured hosted savings; setup, dynamic
skips, rendering variance, and shared runner queues still affect wall time.

## Queue-to-Pages latency — incomplete live evidence

Definition: main push CI `createdAt` (queue entry) to the successful Pages
`deploy` job's `completedAt`, matched by exact SHA. Failed/cancelled CI or skipped
Pages must be reported as no deployment, not a zero-second latency.

Attempted both read-only queries:

```bash
gh run list --workflow ci.yml --branch main --event push --limit 5 \
  --json databaseId,createdAt,headSha,status,conclusion,url
gh run list --workflow deploy.yml --branch main --limit 20 \
  --json databaseId,createdAt,updatedAt,headSha,status,conclusion,url
```

Both failed to connect. **Queue-to-Pages latency is unavailable for each of the
five cached runs listed above**: the cached logs do not establish CI creation
timestamps or matching Pages completion. Their archive-name timestamps are not
substituted for API evidence. Consequently the requested latest-five live
latency measurement remains outstanding and needs a connected read-only `gh`
query followed by `gh run view <pages-run> --json headSha,jobs` for each matching
deployment. No current five-run average or release-latency improvement is claimed.

One older exact-SHA pair is measurable from cached gh JSON, as a reference only:
`/tmp/4050-ci-triage/runs.json` and `pages.json` match SHA
`164da7fe6e82e4abfcee270c123106f36bda2707`. CI
[40186087006](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40186087006)
was created **2026-10-25 10:45:33 UTC**; Pages
[40188251967](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40188251967)
completed its deploy job at **11:18:11 UTC**: **32m38s queue-to-Pages**. This is
not one of the latest five cached runs or a substitute for the missing sample.

## Executed validation and limits

- Existing sharding/import unit specs: **2 files, 8 tests passed**, before and
  after the helper change. Command: `npx vitest run tests/unit/e2eShards.test.ts
tests/unit/e2eTimings.test.ts --configLoader runner --cache=false --pool=threads`.
- Direct Node assertions passed for log retry summation, helper/nested keys,
  duration units, skipped/empty/interrupted input, all 769 imported values, and
  preservation of every unmeasured prior key. Repeated import succeeds.
- Actual `npx playwright test --list --reporter=json --grep <selector>` for **all
  38 refreshed selectors** passed: all **853 discovered cases occur exactly
  once**, with no missing or duplicated cases. This checks selection, not browser
  execution. Direct balancer/selector assertions also passed.
- Grepped `tests/e2e` for timing/sharding/weight capabilities; their implementation
  regression specs are the unit files above. Also attempted the existing root
  journey explicitly: `CI=1 GATES_CONFIG_MODE=writable PW_PORT=4278
PW_OUTDIR=dist-T-e2e-timings npx playwright test tests/e2e/smoke.spec.ts -g
'plain root opens the home shell' --retries=0 --reporter=list`. **Not passed**:
  preview could not start; direct preview diagnosis reports `listen EPERM` on
  `127.0.0.1:4278`. No browser assertion or screenshot was produced.
- `npm run typecheck`: **passed**. Vite production bundling passed through the
  writable-config build gate, but that gate **failed** afterward because the
  manifest helper's synchronous Git subprocess reports `spawnSync git EPERM`.
  The initial direct native-config build also failed resolving `pwaPlugin.js`;
  the repository's writable-config gate resolved that config-loading issue.
- The normal shard-plan CLI also encounters `spawnSync npx EPERM` here. The
  independent Playwright discovery and exported balance/selector functions above
  were executed successfully instead; the CLI itself is not claimed to pass.
- Changed-file Prettier and `git diff --check`: **passed**. No full browser suite
  or new hosted run of this patch is claimed.
