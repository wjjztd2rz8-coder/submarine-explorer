# 2080 — R-ci-time / S-tests step 3 follow-up

## Hosted evidence

Selected on 2026-10-15 using `gh run list --branch main --workflow ci.yml --status completed --limit 1`: [CI 38723709392](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/38723709392), head **da63f09d6d15cfed8f4336f04191304b53b4ea2a**, failure. The newer completed Pages deployment is not the CI result. This checkout is **aa059aa** and already contains **22e1cf2**.

Downloaded the complete log ZIP, paginated jobs/artifacts metadata and **all 30** hosted JSON timing reports using `gh api`. Evidence is under `/tmp/2080-ci-logs`, `/tmp/2080-jobs.json`, `/tmp/2080-artifacts.json`, `/tmp/2080-timings` and `/tmp/2080-failure-artifacts.zip`.

- **778 cases: 709 passed, 68 pre-existing skips, one timed out; no interrupted/unexecuted cases.** Both builds, static checks and project-base browser checks passed. No skips or exclusions added here.
- The sole failure is [shard 15/30](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/38723709392/job/116397481430), `hud-touch.spec.ts:1332`, `animal guidance placement › 1280x720-100 › monterey-canyon: the animal hint waits for the scan card, then clears the HUD`. It reaches the **240 s test deadline**, reporting the final `toBeHidden()` at line 1454 with `Received: undefined`. The downloaded error-context page snapshot already has **no visible guidance card**. All seven companion layouts pass (54–134 s). The journal-debrief legacy fixture is no longer failing.
- This is not evidence that the animal-hint timer remains stuck. The unchanged failing case passes locally with `CI=1`, zero retries, in **37.9 s** (`/tmp/2080-baseline.log`). Slow software rendering/test-driver overhead is the supported working diagnosis; the precise hosted stall is **not locally reproduced**. The prior 22e1cf2 change bounded the earlier slot-appearance read; this failure is later, at expiry.

## Changes

The existing animal-guidance capability spec now advances **at most the same 60 × 250 ms (15 simulated seconds)**, stopping as soon as the hint disappears. It then asserts visibility **immediately**, so an unexpected surviving hint fails without entering a DOM-only retry wait with the game clock paused. This removes unnecessary software-GL frames after the 12 s hint expires. Real animal spawning, scan-card precedence, deferred seen-state, exact device-specific text, visibility, layout/overlap and expiry guards all remain. No timer injection, production change, assertion threshold relaxation, larger timeout or retry was introduced. The stricter immediate failure also makes an actual expiry regression easier to diagnose.

Refreshed `tools/e2e-timings.json` with the existing updater and every hosted report:

```bash
node tools/e2e-update-timings.mjs \
  https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/38723709392 \
  /tmp/2080-timings/*.json
CI=1 node tools/e2e-shards.mjs 1/38 --plan
```

This replaces **710 completed costs**; the timed-out case retains its conservative **240.2 s observed cost**, not a local/passing estimate. Skipped or otherwise unmeasured cases retain previous weights/fallbacks. Changed only the CI matrix from **30 to 38 shards**, following brief 2000's recommendation. One worker, zero hosted retries, 240 s test timeout, 25 min suite deadline and 30 min job deadline remain unchanged. No new module, configuration surface or UI was added.

## Timing and the 30-minute target

The run was created **10:55:41 UTC**, first jobs started **11:29:00**, last job completed **12:02:13** (run finalized 12:02:15). That is **66m34s including 33m19s initial queueing**, or **33m15s after first runner admission**. The e2e job span is **32m49s**. Individual e2e jobs take **6m27s–20m26s**, median **14m44s**; browser-report wall times are **5m58s–19m50s**, median **14m03s**. No shard/job global deadline was reached. The single failed case consumes only 4.0 of **415.94 test-minutes**: fixing it alone cannot deliver the latency target.

Job intervals again show **20 concurrent jobs maximum**. Median shard setup before the browser step is **30 s**. With refreshed weights, current discovery and the existing startup allowance:

| Shards | Estimated shard range | Modeled time after builds |
| ------ | --------------------- | ------------------------- |
| 30     | 16m13s–16m16s         | 33m31s                    |
| 38     | 12m48s–12m52s         | 26m44s                    |
| 40     | 12m09s–12m13s         | 34m32s                    |

Model: 20 available slots; static checks occupy one for the observed **9m05s**, project-base another for **5m22s**; greedily schedule shards with **30 s setup each**. The builds add about 21 s before consumers start. Forty shards spill into a third wave while the two ancillary jobs occupy slots. These are **planning estimates**, not a measured hosted improvement; competing main runs and the initial queue can still push total release latency above 30 minutes. Do not claim the wall-clock target or hosted green until the next completed run measures them. Selection verification confirms all **778 discovered tests occur exactly once** with 30, 38 and 40 shards; no coverage is dropped.

## Validation

- **PASS:** root Vite build into isolated `dist-2080`, plus TypeScript check (`/tmp/2080-build.log`, `/tmp/2080-typecheck.log`). Writable config mode avoids writing config bundles to the shared dependency tree.
- **PASS:** all **8 animal-guidance layouts**, `CI=1`, one worker, zero retries, with fresh review screenshots: **3.7 min** (`/tmp/2080-animal.log`). The hosted failing case passes in **38.8 s**. Local durations are validation only and are not written into the timing database.
- **PASS:** root smoke **3/3** (`/tmp/2080-smoke.log`), including both real tiles and the Home shell. Inspected fresh Monterey animal-guidance and Titanic smoke screenshots: rendered seafloor/vehicle, visible separated HUD, no black canvas.
- **PASS:** mutation check: temporarily replaced the guidance slot lifetime tick with a no-op immediately before the expiry phase. The existing Monterey case fails at the new expiry assertion with **Expected false / Received true**, without a test timeout (`/tmp/2080-expiry-mutation.log`). Restored the exact spec afterward. This proves a surviving hint still fails within the original simulated budget; no mutation ships.
- **PASS:** shard-balancer, timing-updater and guidance capability units: **3 files / 24 tests** with `--configLoader runner --cache=false --pool=threads` (`/tmp/2080-focused-units.log`). Coverage/selector check on actual discovery gives exactly one assignment per test for all compared shard counts.
- **PASS:** Python **166/166**, strict content validation, attribution, changed-file Prettier and `git diff --check` (`/tmp/2080-checks.log`, `/tmp/2080-attribution.log`).
- **LIMITATION:** the full default unit command stalled at startup and was terminated at **300 s**, exit **124**, before reporting any test results. The full thread-pool attempt likewise produced no test results and terminated at **300 s**, exit **124** (`/tmp/2080-all-units-threads.log`). This repeats the local startup limitation from brief 2000; no unit assertion failure was observed and no runner configuration was changed to hide it. Local affected-case coverage and smoke passed; a full local 778-case e2e run is not claimed.
- **HOSTED:** final run-list check still selects **38723709392** as newest completed CI; **38730966957** is in progress and **38733658635** (unmodified checkout aa059aa) is pending. Neither includes this patch. No push, tag, dispatch or rerun was performed. Hosted green and the measured sub-30-minute target remain unverified.
