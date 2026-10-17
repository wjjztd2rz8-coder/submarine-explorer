# S-verify-17 — terrain policy and input regression verification

DIRECTOR.md Backlog 8. Reviewed checkout `c5e983e`, targeting the terrain-carve
slice `2da23e3` (2370), capability additions `d54563e` (2380), and input fixes
`bb64ea3` (2390). Later visual changes are outside this review's acceptance
scope; the full gate run tests the current checkout.

## Findings

- Terrain selection replaces two site-id comparisons with one manifest lookup.
  The reconstruction formulas, geographic anchors, constants and tint-centre
  assignment are unchanged. Comparing the two authored site documents against
  the slice's parent confirms that only `terrain` was added. The strict
  validator accepts only `canyon-bend` and `sinkhole`; existing cases cover
  malformed objects, unknown fields and invalid selectors.
- Extended the existing terrain capability spec: both policies resolve exactly
  once per constructed carve, with no lookups while sampling; interleaved
  construction at another tile centre and reversed sampling order preserve
  the original heights. Each policy checks 140 samples for finite results and
  no seabed raising, and construction leaves tile metadata unchanged. All 11
  unconfigured shipped sites and an unknown id remain uncarved even at a
  reconstruction coordinate. Existing four dense height/tint snapshots remain
  unchanged (105,444 height samples each).
- The prior verification adds capability tests for carbonate rim joins,
  finite buffers, seeded repeatability, triangle/draw budgets and rubble seating
  at all three tiers; sonar checks isolate policy and anchor identity from
  measured terrain. Reviewed its assertions and mock restoration. The terrain
  slice's sonar fixture adjustment preserves the actual survey carve while
  relocating only sonar policy; it does not relax the rendering comparisons.
- Extended touch interruption coverage to coincident pointers in both camera
  and sonar modes: zero-distance events produce no zoom, then camera deltas
  recover at exactly -4 wheel units per pixel and sonar accumulates a step.
  A diagonal gesture checks distance accumulation and reversal across the
  14-unit sonar threshold without sending motion to the camera.
- Extended the overlay capability spec to cover touch changes while Change
  keys has focus, background-guide device changes beneath another modal, and
  the Home Journal's top-owner guard independently of named shell modals.
  The existing Home/Pause routing matrix now covers every input device with
  initial touch both enabled and disabled, preserving repeated dismissal and
  opener-focus assertions.

## Simplicity review

No production defect or new simplicity-rule violation found in the requested
diffs. No new site-id branches, UI surfaces, guidance, layout patches, settings,
dependencies or runtime config writes. Terrain strategy belongs to site data;
the shared consumer reads it once when constructing a carve. The input fixes
change gesture/device/modal state only and leave effective-settings resolution
in the existing boot/settings paths. Existing startup capability coverage
checks saved settings and resolved gameplay across boots.

Only three existing capability specs are extended, adding 26 regression cases.
No new spec, package-number
code comment, weakened regression assertion, raised budget or snapshot update.
The existing `blueHoleTint` module-level centre remains as before the terrain
migration; the new interleaving check guarantees carve-height isolation, not
concurrent multi-tile tinting. No concurrent tinting redesign is claimed.

## Validation

- PASS: final focused run, **3 files / 159 tests**, including every changed
  capability spec. Log: `.cache/S-verify-17/input-terrain.log`.
- PASS: structural comparison of the terrain module and both site documents
  across the terrain migration; prior verification changes only tests/progress.
  Log: `.cache/S-verify-17/source-audit.log`.
- Ran `GATES_CONFIG_MODE=writable PW_PORT=4317 bash tools/gates.sh` to
  completion: **exit 1**. Config preparation, strict content validation,
  production build, full unit suite, attribution and repository-wide Prettier
  passed. The project-base production build also passed.
- Full unit gate: **192 files / 2,891 tests passed**, including all unchanged
  snapshots, in **568.93 s**. This includes the prior carbonate/sonar additions,
  manifest validation, startup/settings resolution and all-tier terrain
  collision/render/placement agreement. A redundant thread-pool diagnostic was
  stopped after the canonical unit gate completed; no result is claimed for it.
- Python: **161/166 passed**. The same five failures documented in
  `S-verify-16.md` remain: four build-manifest cases fail at `spawnSync git EPERM`,
  and the golden tooling CLI case fails parsing empty stdout with
  `Unexpected end of JSON input`. A supplemental build-phase diagnostic also
  bundled successfully before manifest provenance failed at the same Git
  subprocess restriction. No tooling or gate assertions were changed.
- Both smoke and project-base browser gates fail before test assertions because
  their owned preview cannot start. An independent listen diagnostic confirms
  **`listen EPERM: operation not permitted 127.0.0.1:4318`**; evidence is in
  `.cache/S-verify-17/listen.log`. Browser, rendered golden and real-phone
  acceptance remain unverified in this environment.
- PASS: separate TypeScript check and final changed-file formatting and
  `git diff --check` after completing this note.

Canonical gate logs: `.cache/runs/20261017-010326-32-opRrU3/` and
`.cache/S-verify-17/gates.log`. No production fix or send-back is required by
this audit; the outstanding tooling/browser gates require a suitable runtime.
