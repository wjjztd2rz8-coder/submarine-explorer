# Phase C integration checkpoint — 2026-09-22

This is the C6/C3 integration review, not the full Phase C acceptance pass.
The owner flagged remaining usage; no further packages were started.

## Reviewed changes

- C6: public runtime URLs respect Vite's deployment base, while explicit
  caller roots retain their semantics. Guide URL protocol rejection is
  preserved. The opt-in browser test checks loaded GLBs and globe texture,
  response paths/status, console errors and startup failures.
- C3: all eight presets enter through the game loop. Current application
  receives zero simulation time while frozen; zero current leaves the sub's
  own drag unchanged. Trench audio now consumes its previously unused event.
  Lost City's mission overrides select carbonate plumes in free dives too.
- Review iterations added non-root rendering readiness checks, invalid
  numeric override coverage, all-preset browser coverage, low-tier current
  checks and a paused-current regression. The orchestrator fixed the
  optional `PW_BASE` type error caught by the final build.

## Evidence

- Final build, 348 unit tests, 104 Python tests, attribution and repository
  formatting pass. Exact final browser totals are in `plan/STATUS.md`.
- Dedicated C3 browser suite: 11 passed, with nine screenshots in
  `docs/img/presets/`. The orchestrator inspected Lost City, brine and reef
  screenshots; the Sol implementation agent inspected the full set.
- Project-base browser test passed at `/submarine-explorer/`. The
  orchestrator inspected the textured globe screenshot.
- Initial integrated baseline: all 24 pre-existing browser tests passed.
  A final full run follows the last integration edits.

## Remaining findings

- C5 is not wired: the existing HUD's `O settings` hint currently has no
  settings screen. Check displaced/empty bindings surviving reload and
  storage errors during reset when implementing C5.
- C1 needs dedicated interaction/accessibility coverage and a thinner globe
  rim. C6's browser check proves loading, not complete globe acceptance.
- Monterey content lacks species/source files and has an excessively long
  required transect. Lost City passes structural validation but needs the
  planned content/playtest review; the procedural chimney material is still
  generic despite carbonate plume coloring.
- Preset draw counts are object statistics, not measured GPU timing. The
  owner's 60 fps hardware target remains unverified. Sprite shimmer,
  procedural brine sheen and the 60 m caustic limit are documented in
  `docs/presets.md`.
- The build retains its existing large-main-chunk warning. GitHub workflows
  have not been run remotely, and the site has not been published.

Prior content files were preserved; formatting-only changes made them pass
Prettier. No content completion, full Phase C acceptance, or Phase D work is
claimed by this checkpoint.
