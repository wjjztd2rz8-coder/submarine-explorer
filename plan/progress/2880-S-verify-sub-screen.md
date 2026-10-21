# 2880 — S-verify: Your sub audit

Item: S-verify in `plan/DIRECTOR.md`. Scope: P2-sub-screen lifecycle and capability audit; no visual review.

## Plan

1. Audit preview ownership, close/navigation cleanup, keyboard focus, saved cosmetics, locked choices, and Journal leftovers.
2. Extend existing capability specs to reproduce confirmed defects; make minimal fixes without adding spec files or weakening assertions.
3. Run the focused regressions and `tools/gates.sh`; record evidence and remaining limits here.

## Progress

- Initial audit found incomplete preview cleanup (vehicle-only disposal omits the cockpit; renderer disposal does not release its context), a renderer allocated before the asynchronous import can finish, missing close on shell navigation, and obsolete cosmetic focus branches in Journal. Journal cosmetic CSS is already absent.
- Round 1: reproduced the pending-import allocation and Journal dead-code failures in existing specs. Moved renderer creation after the import/token check, changed preview cleanup to `SubMesh.dispose()` plus `renderer.forceContextLoss()`, closed the screen on shell state transitions, and removed the empty Cosmetics import and obsolete focus branches from Journal. No CSS changes.
- Round 2: audited the final ownership paths and extended the existing capability specs. No additional production defects found. No new spec files or weakened historical assertions.

## Capability evidence

- `tests/unit/overlayFocus.test.ts`: both Home and Pause exercise close before the lazy import resolves, immediate reopen, duplicate open, three Escape/Back cycles, repeated close, shell navigation (including Pause to Home), and repeated shell teardown. Every rendered preview owns exactly one pending RAF; all owned geometries, materials and texture clones dispose exactly once, the renderer disposes and loses its context exactly once, and the canvas is removed. Shared environment/halo caches stay shared. Tab wraps in both directions, skips disabled choices, and Escape/Back restore the opener without changing the underlying shell state.
- `tests/e2e/f2-progress.spec.ts`: extended existing desktop/portrait/landscape Home checks with full Tab traversal, disabled Silver focus/keyboard rejection, actual WebGL context loss and canvas removal, and Escape/Back focus return. Pause checks now assert focus return for both dismissal paths. The existing red paint/white frame save, fresh-dive material and no-unpause assertions are retained.
- `tests/unit/cosmetics.test.ts`: existing save round-trip, locked-selection rejection, fresh/replacement hull paint/trim/decal and gameplay-isolation coverage passes unchanged.
- `tests/unit/journalGroups.test.ts`: retained desktop/phone front-page absence checks and added source/CSS checks for cosmetic leftovers. Source search also finds no cosmetics in `journal-debrief.css`.

## Verification

- Focused unit suite: **PASS — 3 files / 192 tests** (`overlayFocus`, `journalGroups`, `cosmetics`).
- Final TypeScript check, changed-file Prettier and `git diff --check`: **PASS**.
- Playwright discovery: **PASS — 4 existing Your sub tests**. Execution is blocked before assertions: preview startup fails with `listen EPERM: operation not permitted 127.0.0.1:4281`. No browser or visual verification is claimed.
- Required gate invocation: `GATES_CONFIG_MODE=writable PW_PORT=4280 PW_OUTDIR=.cache/2880-sub-screen-dist bash tools/gates.sh`. Uses the gate's existing support for shared read-only dependencies; no gate/config changes.
- Gate logs: `.cache/runs/20261020-224825-2-gXWKIB/`. Command completed with **exit 1**. Config, strict content, root and project-base production builds, attribution, and repository-wide Prettier **PASS**.
- Full unit gate: **PASS — 192 files / 3,367 tests**, 491.61 seconds. The final focused rerun also passed after the keyboard traversal assertions were added.
- Root smoke and project-base browser gates both failed at webServer startup; no browser assertions ran. The separately attempted four Your sub tests hit the same startup restriction. Existing non-failing Vite large-chunk warnings remain unchanged.
- Python gate: **167 tests run / 5 failures** in unmodified tooling. Four manifest fixtures fail at `execFileSync('git', ...)` with `spawnSync git EPERM` (also reproduced independently). The golden tooling subprocess returns incomplete JSON (`Unexpected end of JSON input`). These do not exercise SubScreen.

Browser rerun on a host permitting localhost binding remains required, including the fresh-dive persistence flow. No visual audit was performed or requested.
