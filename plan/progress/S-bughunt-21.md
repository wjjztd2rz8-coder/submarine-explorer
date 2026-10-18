# S-bughunt-21 — picker, nav notices and refreshed scan results

Backlog 8 (`S-bughunt`), 2026-10-17; reviewed from `27380e7`. Scope:
the picker-density and desktop-repetition merges (`ca7b352`, `00770db`)
and the result-card refresh from the contact-choice hunt. Read the prior
picker verification, contact-choice and S-bughunt-20 notes to avoid repeating
their completed work. This review uses unit fixtures; no game rendering or
visual acceptance is claimed.

## Demonstrated behavior and correction

The nav panel treated a missing target position plus completed primaries as
proof that **all** objectives were complete. A fixture with a completed primary,
an incomplete resolved optional objective and no available POI positions makes
`pickNavTarget` return null. `setNav(null, true)` then displayed
`ALL OBJECTIVES COMPLETE`, contradicting the unfinished objective.

Before the source correction, the new nav table reported **1 failed / 107 passed**
in `overlayFocus.test.ts`; the failure received `ALL OBJECTIVES COMPLETE` instead
of `NO TARGET POSITION` (`/tmp/S-bughunt-21-before.log`). The panel now also checks
for outstanding resolved objectives before claiming all complete. This is a
unit-level missing-position reproduction, not an observed failure in a shipped
site's authored content. No coordinate loading or objective eligibility changed.

The table guards unfinished primaries, unfinished optional objectives, everything
finished and an empty objective list. Each case starts with populated nav text
and verifies that a missing target clears the old bearing, depth and turn.

## Additional regression guards

Extended existing capability specs only: **12 added test cases**.

- `missionCore.test.ts`: absent, null and nonnumeric briefing depths remain
  null in summaries. Such sites stay in their authored manifest position between
  deeper and shallower sites; the loader neither sorts nor drops them.
- `overlayFocus.test.ts`: fresh/deep sites and a finished site keep authored
  row and activation order through progress rerenders. Current progression has
  **no locked sites** (`canDive` always returns true); the formerly gated deep
  site stays enabled even on a fresh save. Tests retain accessible zero/two-star
  labels, completion denominators, depth-derived hulls and the authored hull
  fallback when depth is missing. No unlock policy was added or changed.
- `guidance.test.ts`: first and repeat results on desktop/touch discard cached
  directions through `clear()` and suppression. Completion offered while covered
  is rejected; a fresh result arriving before another update has no stale cue.
  A refreshed result expires while an interrupted scan owns the slot and does
  not return after cancellation or source withdrawal. Existing direction/input
  refresh, priority, handoff and expiry assertions remain unchanged.

No further picker or ScanOverlay defect was demonstrated; their source is
unchanged. The source correction reuses the existing nav notice and surface.
No element, setting, guidance surface, site branch, config mutation, art, layout,
CSS, composition or tooling change. Beauty, phone appearance and screenshot
acceptance remain Claude's review.

## Validation

- PASS: final focused capability run, **6 files / 270 tests**: `overlayFocus`,
  `missionCore`, `guidance`, `touchControlsAudit`, `missionRouter`, `gameScanner`.
  Command: `npm test -- --configLoader runner --cache=false` with those paths;
  log: `/tmp/S-bughunt-21-focused-final.log`.
- PASS: final TypeScript check; `git diff --check`.
- PASS: full unit gate, **192 files / 3,197 tests**, 512.52 seconds, with
  source/tests held fixed throughout. Root and project-base production builds,
  strict content validation, attribution and repository-wide Prettier also passed.
- Required gate command:
  `GATES_CONFIG_MODE=writable PW_PORT=4390 PW_OUTDIR=dist-S-bughunt-21 bash tools/gates.sh`.
  Existing writable-config mode supports the shared read-only dependency tree;
  no assertions, timeouts or tools were altered. Aggregate log:
  `/tmp/S-bughunt-21-gates.log`; gate logs:
  `.cache/runs/20261017-234725-7-vFJQq5/`. Overall **exit 1**, owing to the
  tooling/browser failures below; this is not an all-green gate run.

Environment/tooling failures, separate from the demonstrated nav defect:

- Python gate: **161/166 passed**, five unchanged tooling failures. Four
  build-manifest tests report `spawnSync git EPERM`; the golden CLI test reports
  `Unexpected end of JSON input` parsing subprocess stdout. These match previous
  hunts; the golden subprocess's underlying cause was not established here.
- Relevant existing Playwright capabilities (`d-shell`, `content-missions`,
  `mission`, `d-scan`, `d-input-hud`) exit 1 before assertions because their
  preview cannot start (`/tmp/S-bughunt-21-browser.log`). A direct preview
  reproduces `listen EPERM: operation not permitted 127.0.0.1:4391`
  (`/tmp/S-bughunt-21-preview.log`). No browser or screenshot pass claimed.
- Root smoke and project-base browser gates likewise failed at preview startup,
  before assertions. The project-base production build itself succeeded.

No merge, push or tag performed. `tools/` and `plan/DIRECTOR.md` untouched.
