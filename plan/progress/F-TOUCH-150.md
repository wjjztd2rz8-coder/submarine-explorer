# F-TOUCH-150 — short portrait HUD at enlarged UI

## Plan

1. Remove the 360×640 Beebe 150% fixme and reproduce the opening overlap.
2. Keep the playing HUD compact on short portrait phones, preserve touch target
   floors and the saved scale preference, and collapse the visible map credit.
3. Check opening/contact screenshots and run `tools/gates.sh --full-e2e`.
4. Record implementation and verification, including any environment blockers.

## Progress

- Removed the fixme in `tests/e2e/f-bughunt-15.spec.ts`.
- Short portrait touch HUDs cap their effective scale at 0.8 (the existing 100%
  phone scale). The cap applies to the playing overlays and controls, including
  their Pause-row reservation. Menus and taller viewports retain their scale;
  the saved preference is unchanged. Smaller preferences still apply.
- The map attribution shows a single-line source pill when touch controls are
  visible. The complete credit remains in the DOM for assistive technology and
  in the title. Existing portrait/landscape credit slots keep it clear of the
  controls. The hero regression checks the pill, complete credit, height and
  unchanged saved scale.
- A production build passed before layout changes. The focused reproduction
  could not start its preview: `listen EPERM` on `127.0.0.1:4270`. No reproduction
  or screenshot pass is claimed. The Browser skill also reported no available
  browser (discovery returned an empty list).

## Initial sandbox validation

- Ran `GATES_CONFIG_MODE=writable PW_PORT=4270 tools/gates.sh --full-e2e`.
  The writable config mode avoids writing Vite/Vitest caches into the shared,
  read-only dependency tree.
- Passed: production build/typecheck, 1,221 unit tests in 115 files, 144 Python
  tests, strict content validation, asset attribution and repository Prettier.
- Blocked: full E2E and project-base E2E both failed before tests started because
  preview cannot listen on localhost in this sandbox. The project-base build
  passed. Gate exit status: 1. Logs: `.cache/gates/e2e.log` and
  `.cache/gates/e2e-base.log`.
- `git diff --check` passed.
- Rebuilt `dist-f-touch-150` after the changes and retried the focused Beebe
  150% cases with `PW_PORT=4270 PW_OUTDIR=dist-f-touch-150`. Preview startup
  remained blocked; Playwright's debug log also reports `connect EPERM` for
  both localhost addresses. Log: `.cache/f-touch-150/focused.log`.
- No browser screenshots were produced or inspected. Geometry, interaction and
  visual verification remain pending; no browser test pass is claimed.

## Orchestrator browser validation and gate follow-up

- The orchestrator ran the full gate outside the sandbox: static gates and
  project-base E2E passed; the main suite had 312 passes, 21 skips and one
  failure. Every hero touch HUD case passed, including Beebe 150% at all three
  viewports. These results come from the user-supplied gate report and the
  orchestrator's shared log inspected before the local rerun.
- Inspected the opening and contact/tutorial screenshots at Beebe 150% for
  360×640, 390×844 and 844×390 in `test-results-gates-4370-3516797`. The requested
  panels and touch controls are separate, the map credit is a compact strip,
  and the scene renders. The original 360×640 geometry/visual check is now
  verified by that run and screenshot inspection.
- The only failed test was the generic vent shader fixture: exact draw count
  expected 2, received 3. The recently introduced warm haze defaulted to 0.5
  for every sulfide preset; its knobs were absent from Config, so mission
  overrides would also be rejected by the known-key merge.
- Registered `hazeGlow` and `hazeGlowSizeM` in Config with defaults 0 and 7 m,
  disabled the implicit haze fallback, and explicitly enabled `hazeGlow: 0.5`
  in Beebe's mission. Generic vents recover their two-draw budget; Beebe
  retains its warm haze draw and carbonate flow stays free of warm haze.
  The exact E2E assertion remains unchanged.
- Added three unit regressions checking real scene drawable counts with
  Config defaults and omitted parameters, Beebe's actual mission override
  merge and haze geometry/strength, and carbonate flow with haze requested.
  All 15 preset unit tests pass.

## Post-fix sandbox validation

- Ran `GATES_CONFIG_MODE=writable PW_PORT=4270 tools/gates.sh --full-e2e`.
- Passed: production build/typecheck, 1,224 unit tests in 115 files, 144 Python
  tests, strict content validation, asset attribution and repository Prettier.
  The project-base production build also passed.
- Both E2E phases remain blocked here at preview startup by sandbox localhost
  restrictions. The fresh vent shader run must be performed outside the sandbox;
  no post-fix browser pass is claimed. Gate exit status: 1.
- `git diff --check` passed. The shared `.cache/gates/` logs now describe this
  local rerun; the original browser screenshot artifacts remain in
  `test-results-gates-4370-3516797`.
