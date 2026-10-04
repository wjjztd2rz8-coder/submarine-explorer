# F-TOAST-550 — contextual toast placement

## Plan

- Move contextual hints into the scan-target column on desktop, keeping the dismiss button.
- Let the target and hint stack in normal flow; use the completed tutorial row on portrait touch screens.
- Cover 1600×900, 1280×720, 390×844, 360×640, and 844×390, including 150% touch UI, real hero animal hints, wrapped names, dismissal, and target visibility changes.
- Run full gates, review fresh screenshots in `.cache/codex/shots/550-f-toast-placement`, and log results in CHANGELOG.md.

## Progress

- Baseline static gates passed (build, unit, Python, content, attribution, formatting).
- Baseline full E2E and project-base gates could not start the Vite preview in this sandbox.
- Implementation: target and hint share a flex column; portrait hints reuse the tutorial row after onboarding, above touch controls and credits.
- Added 16 E2E cases covering Great Blue Hole and Monterey Canyon at every requested size, with touch at 100% and 150%. Checks include the initial tutorial, a real animal-triggered hint, an 8 px target/toast gap, desktop centring, wrapped target text, hidden targets, clipping, and a reachable 44 px dismiss button.
- Reviewed the existing `2026-10-04-031944/great-blue-hole-1.png` and `monterey-canyon-1.png` golden shots; both confirm the original left-column crowding.
- External full gates ran: 353 E2E cases passed, 21 skipped, and all 12 touch toast cases failed the target/toast centre alignment assertion; the four desktop toast cases and project-base E2E passed.
- Reviewed all six supplied 150% touch screenshots. The HUD elements are separated, but the target has a different width from the toast: 300 vs 406 px in landscape, 340 vs 300 px at 390 px portrait, and 332 vs 336 px at 360 px portrait.
- Root cause: `ExploreNotice.ts` separately imports `explore.css`, whose `html.is-touch .scan-panel` widths outrank the generic shared-column `.scan-panel` width. Scope column sizing to `.scan-overlay .scan-stack > .scan-panel` so it wins independent of stylesheet order. Retain centre/gap assertions and add equal-width and wrapped-target alignment assertions.

## Validation

Command: `GATES_CONFIG_MODE=writable PW_PORT=4550 tools/gates.sh --full-e2e`.
After the correction, rerun the available static gates with
`GATES_CONFIG_MODE=writable PW_PORT=4550 tools/gates.sh --no-e2e`.

- Build/typecheck: passed.
- Unit: 123 files / 1,307 tests passed.
- Python: 144 tests passed.
- Content and attribution: passed.
- Formatting: passed; `git diff --check` passed.
- External full E2E: 353 passed / 12 touch alignment failures / 21 skipped before the specificity correction. External project-base E2E passed. Correction awaits an external browser rerun; local preview/browser startup is still blocked.
- Browser startup probe: Vite cannot bind `127.0.0.1:4550` (`listen EPERM`); Chromium also fails with `sandbox_host_linux.cc:41`, `Operation not permitted`.
- The supplied fresh 150% touch screenshots were reviewed. All requested overlap checks passed up to the alignment failure; wrapped-name and dismissal checks were not reached on touch. Corrected screenshots and full overlap acceptance remain pending an external rerun. The spec writes normal and wrapped-target screenshots to `.cache/codex/shots/550-f-toast-placement`.
