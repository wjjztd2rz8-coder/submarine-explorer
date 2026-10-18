# S-verify: picker density

Reviewed 2026-10-17 against `J-picker-density.md` and the merged changes from
`8602a50^..51a490c` (including the catalog-coverage test adjustment in `ca7b352`).
Scope: numeric correctness, behavior and the DIRECTOR simplicity rules.

## Findings and fixes

No demonstrated product defect; no source, style, layout or tooling changes.
Added missing regression guards in existing capability specs only:
`missionCore.test.ts` and `overlayFocus.test.ts`.

- All **13** mission directories are listed exactly once; the summary loader and
  shell picker preserve those 13 identities without omissions or duplicates.
- The depth key is the unrounded positive `mission.json` **`briefing.depth_m`**,
  exposed as `MissionSummary.depthM`, shallowest first. The authored manifest
  supplies the order; there is no runtime depth sort. Current sequence (metres):
  great-blue-hole 125; hunga-tonga-caldera 469; blake-plateau-corals 750;
  lost-city 780; kamaehuakanaloa 1300; axial-seamount-ashes 1540;
  hudson-canyon 1682.6; monterey-canyon 2000; endurance 3008; titanic 3800;
  bismarck 4219; beebe-vent-field 4987.9; challenger-deep 10931.
- No current depths tie. **Authored manifest position is the stable tie-break**:
  `Promise.all` preserves input order. A synthetic equal-depth case completes
  requests in reverse and guards against network completion or alphabetical
  order replacing manifest order.
- Each displayed title comes unchanged from its mission data. The first title
  is exactly **Great Blue Hole: Lighthouse Reef**. Tests also retain summaries
  in tooltips, accessible zero-of-three star labels, depth/fitted-hull metadata
  and correct objective-count denominators for all sites.
- Rows are single native buttons appended in manifest order. The single-column
  CSS flow does not reorder sites. The existing focus trap uses DOM order;
  guards walk all 13 rows forward, wrap, and reverse-wrap. Focus previews and
  click activation retain the matching site id. Pointer/touch and native
  keyboard activation share the button handler. This is DOM/callback evidence,
  not a rendered or physical-device acceptance claim.
- There is **no Home site-row gamepad navigation** in the current code:
  `Input` maps pad input to dive actions and the Home menu polls the Journal
  shortcut, without mapping stick/D-pad input to row focus or activation. Thus
  a gamepad traversal order cannot be verified. This predates the reviewed
  change; adding a menu-input capability is deferred outside this brief.
- Net simpler: compact rows replace the tall cards on the same list surface;
  the shell summary span is removed, while its tooltip and briefing remain.
  Stars and Journal counts retain their existing reward/progress roles. The
  merge adds no guidance surface, setting, config mutation, site-id branch,
  HUD overlap patch, media special case or package-number code comment.

## Validation

- PASS: focused mission/catalog, overlay focus, navigation and globe capability
  checks, **4 files / 145 tests**, including the three added guards.
- PASS: final `npm run typecheck`, changed-test Prettier and `git diff --check`.
- Required command: `GATES_CONFIG_MODE=writable PW_PORT=4895 tools/gates.sh`.
  The existing writable-config mode accommodates the shared read-only
  dependency tree; no tooling changed. Overall **exit 1**.
  - PASS: config, strict content (13 sites, zero errors/warnings), production
    build, full unit suite (**192 files / 3,147 tests**, 505.26 s), attribution
    repository-wide Prettier and the project-base production build. The full
    unit run began before the new guards; the final focused run above checks
    those additions.
  - Python: **161/166 passed**, five existing tooling failures. Four manifest
    fixtures fail on `spawnSync git EPERM`. The golden-tooling CLI case fails
    parsing empty stdout (`Unexpected end of JSON input`,
    `golden-manifest.test.mjs:151`). These match the failures already recorded
    in `S-verify-18.md`; no assertions or timeouts were changed.
  - Root smoke and project-base browser gates fail at preview startup before
    assertions. This is not an all-green gate run.
  - Aggregate logs: `.cache/runs/20261017-211545-2-M3fnq5/`.
- Existing browser capability attempt selected `d-shell` Home/site flow,
  `content-missions` catalog coverage and `f-a11y` Home/dialog traversal.
  **Blocked before assertions**: Playwright preview startup exits 1; debug
  output records `connect EPERM` on IPv4 and IPv6 loopback. No browser pass or
  screenshot acceptance is claimed. Evidence: `.cache/picker-capability.log`.

## Deferred

Claude owns beauty, phone appearance, compact-row readability at actual screen
sizes and screenshot acceptance. No game rendering or visual review performed.
Gamepad Home navigation needs a separate brief if desired. Rerun blocked browser
checks and tooling gates in an environment that permits the required operations.
