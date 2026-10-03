# F-TITLE-RESEARCH progress

## Round 1 — source and implementation audit (2026-10-03)

- Read `docs/research/brand.md`, the Phase F plan and current home/shell, render,
  camera, boot, mode/progress and title-related e2e contracts.
- Chose the research recommendation Bathyline as a provisional spec title;
  retained the existing conflict qualification without performing new clearance.
- Found the current hero is an embedded globe over an opaque home background.
  Home-only CSS is spread across menus/modes/predive; it must be consolidated.
- Documented existing Daily, Advanced and progress-inserted Upgrades as retained
  actions, and preserved URL, storage, PWA identity and simulation contracts.
- Specified desktop, narrow portrait and short landscape layouts, a fixed real
  Monterey terrain preview with a decorative Class B sub, exact copy, original
  SVG construction, async/renderer integration and seven bounded owned packages.
- Authored an unreferenced three-path draft in `public/bathyline-mark-draft.svg`.
  No application implementation, name replacement or commits.

## Round 2 — handoff review and validation

- Reviewed the handoff against the shell regression tests, `buildVehicle` API,
  `latLonToWorld` axis convention, checked-in Monterey POI/terrain metadata,
  frame stages, renderer/quality ownership and the icon generator's 32-unit grid.
- Kept global HUD work outside these packages, retained every current action,
  and specified updates to legacy globe/menu assertions instead of deleting
  route, pause, focus or mission coverage. Seven packages have explicit file
  ownership and dependency order; no implementation subagents were launched.
- Ran Prettier on all four changed files (explicit HTML parser for the SVG).
  `git diff --check` passed. SVG parses as XML, has a 24-unit viewBox and exactly
  three paths. Optical review at 16/32/180 px remains an implementation acceptance
  check, not a claimed completed visual approval of this draft.

### Gate results

`tools/gates.sh` was run in full and exited 1. Logs: `.cache/gates/`.

| Gate        | Result                                                                                                               |
| ----------- | -------------------------------------------------------------------------------------------------------------------- |
| build       | Blocked: Vite writes `.vite-temp` under symlinked `node_modules`, whose target is read-only in this sandbox (EROFS). |
| unit        | Same config-bundling EROFS before tests start.                                                                       |
| python      | Passed.                                                                                                              |
| content     | Passed.                                                                                                              |
| attribution | Passed.                                                                                                              |
| prettier    | Passed; final changed-file checks also passed after notes/SVG corrections.                                           |
| e2e         | Preview server could not start; no browser assertions ran.                                                           |
| e2e-base    | Build blocked by the same `.vite-temp` EROFS.                                                                        |

Supplemental checks without changing application/config files:

- `npm run typecheck`: passed.
- `npm test -- --configLoader runner --cache=false --fsModuleCachePath
.cache/title-spec-vitest`: **97 files, 1,000 tests passed**. Log:
  `.cache/gates/title-spec-unit.log`. This bypasses the read-only config cache;
  it does not turn the original full gate result green.
- `npm run build -- --configLoader runner --outDir .cache/title-spec-build`:
  typecheck passed and 264 modules transformed, but the existing PWA plugin's
  `closeBundle` dynamic import failed with **Vite module runner has been closed**.
  Log: `.cache/gates/title-spec-build.log`. The alternative loader is therefore
  not a successful build workaround; no build/plugin repair belongs in this
  research-only task.

Deliverables: `plan/F-TITLE-SPEC.md`, draft SVG, this note and CHANGELOG entry.
Runtime source, tests, metadata and existing names remain unchanged. No commit.
