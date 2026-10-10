# F-CI-TIMEOUTS progress

Source: hosted CI run 38013649214 (CI on main, head ad1d2a7, conclusion failure, 39 min).
Latest main head 712e538 has no completed CI run yet; its CI is queued.

## Findings from the f45-era run (job logs via `gh api repos/.../actions/jobs/<id>/logs`)

- e2e shards 2, 3, 6: one test each timed out at 300 s, twice (retry), with
  "Target page, context or browser has been closed". Tests:
  `f-verify-1000.spec.ts` "1000 390x844 endurance high: first minute" (shard 2),
  "1000 1600x900 endurance high" and "1000 1600x900 challenger-deep high" (not in
  the failing shard list for each; see logs). Each runs 600 real frames with
  software rendering. Locally the same test passes in about 5 s on a GPU machine,
  so the hosted cost is environment-bound, not a hang.
- Chromium install (apt lock, exit 100): e2e shard 10 and project-base failed after
  two quick attempts. Covered by the install retry change below.
- Shards 4, 13, 21, 22, 26, 29: `f-bughunt-1090.spec.ts` real-time frame floors
  (`frames > 30` in 60 s, got 24; `sub moved > 10 m` in 10 s, got 3.1; `frames > 5`).
  These are assertion failures on a slow runner, not timeouts. NOT changed: the brief
  forbids loosening assertions and shortening the window would weaken them.
- build-and-static-checks: `ENOENT .cache/1090-geometry.json`. Already fixed on main
  by ad63d44 (mkdir in `tests/unit/bughunt1090.test.ts`); that run predates it.

## Changes

| File | Change | Why |
| --- | --- | --- |
| tools/install-playwright-chromium.sh | Three attempts (120 s bound each) with 15 s and 30 s back-off; previously two attempts with a 10 s sleep | apt-lock flake (exit 100) on hosted runners |
| tools/tests/test_install_playwright.py | Expectations follow the three-attempt policy; added failure-failure-success and last-failure cases | Keeps the installer policy test honest |
| .github/workflows/ci.yml | Install steps (e2e and project-base) `timeout-minutes` 5 -> 8 | Worst case of three bounded attempts plus back-off is about 7 min |
| tests/e2e/f-verify-1000.spec.ts | First-minute test timeout 300 s -> 480 s; same 600 samples and assertions | Hosted high-tier runs exceeded 300 s; no assertion weakened |

Not changed (needs a decision): the 1090 real-time frame-floor specs and the shard
balance in tools/e2e-timings.json, which still records the timed-out costs (about 600 s
for the first-minute tests). Re-measure from the next hosted run with
`tools/e2e-update-timings.mjs` before rebalancing.

## Verification

- `python3 -m unittest discover -s tools/tests`: 153 tests OK.
- `PW_PORT=4472 tools/gates.sh`: build, unit, python, content, attribution, prettier,
  e2e smoke and e2e-base all PASS.
- `tests/e2e/f-verify-1000.spec.ts` with CI=1: 25 passed.

## Not user-visible

No CHANGELOG entry (CI and test infrastructure only). No src/ or visual changes.
