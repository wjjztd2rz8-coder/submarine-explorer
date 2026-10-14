# S-hud-text-briefing: one instruction per dive start, briefing checks, phone Home

Backlog items 23 and 24 in `plan/DIRECTOR.md` (from V-journeys, `plan/progress/V-journeys.md`).
Branch `claude/S-hud-text-briefing`. Checkpoint commit: `wip(S-hud-text-briefing)`.

## Item 23: desktop dive start said one thing four times

Before (desktop 1280x720, Titanic, Arcade): the tutorial card "Follow the marker toward the bow",
the objectives hint line "Head to the bow, 220 m ahead.", the nav line "→ BOW SECTION / BRG 280° RNG 220 m
DEPTH 3,790 m AHEAD", and the waypoint label "Bow section / 220 m · ↓22 m".

After:

- **Guidance card** is the one instruction surface (unchanged).
- **Objectives hint line** shows only while the guidance card is empty. The approach override
  ("Head to X, N m ahead.") is deleted, so when the card is empty the line shows the mission's own
  authored hint, which carries the descriptive cue the card lacks. Wiring: `play.mission` frame calls
  `panel.setGuided(ctx.guidance.visible)`.
- **Nav line** keeps target name, bearing, depth and turn ("BRG 280° DEPTH 3,790 m AHEAD"). RNG is removed
  because the waypoint label already carries the same slant range.
- **Waypoint label** keeps range, vertical offset and the off-screen direction arrow. Its name is hidden
  when the nav line names the target (or the card does), as the card already did. On phones the panel is
  hidden, so the label keeps its name and nothing changes there.
- The "Head to" title on the mission list stays: it is the checklist and the approach cue that Realistic
  mode and the label read.

Removed UI (logged in CHANGELOG.md): the approach copy in the hint line; RNG in the nav line; the label's
name on desktop while the nav line shows it. Info kept: bearing, depth, turn, authored hints, range.

Code: `src/app/systems/mission.ts`, `src/ui/ObjectivesPanel.ts` (`setGuided`, `showsTarget`, no RNG, dead
`formatRange` and `rangeM` removed from `NavReadout`), `src/game/MissionRouter.ts`,
`src/app/systems/waypoints.ts`.

Tests (existing files only): `tests/unit/missionApproachSystem.test.ts` (hint expectation now the authored
hint; fixture gets `guidance` and `setGuided`), `tests/unit/missionRouter.test.ts` (dropped the formatRange
assertion), `tests/e2e/mission.spec.ts` (the RNG check reads the waypoint label's range),
`tests/e2e/f-copy-regress.spec.ts` (nav fixture without `rangeM`).

## Item 24: briefing Advanced checks and phone Home

- **Advanced check boxes** (`src/styles/modes.css`): 16 px native-accent checkboxes on the label's line
  (grid: label, box at the right, note underneath) instead of 44 px squares. The home-only 48 px override
  for these boxes is removed (`src/styles/home.css`).
- **Phone Home** (`src/styles/home.css`, existing rules only):
  - Hero band `clamp(112px, 15dvh, 150px)` (was 128 to 190 px); panel padding and gap 12 px (was 16).
  - Sideways (existing short-landscape block): the Advanced toggle sits beside the mode segments, the
    menu gap is 6 px and its buttons 44 px.
  - Journal and Settings are fully on screen at 390x844 (portrait) and 844x390 (landscape).
    Controls is also on screen in portrait and partly below the fold in landscape (the menu scrolls there).
  - No new `@media` rules were added.

Removed UI (logged in CHANGELOG.md): none. Layout tightened only.

## Screenshots

Folder `.cache/codex/shots/S-hud-text-briefing/` (git-ignored). `before-*` are the V-journeys baseline,
`after-*` the result.

- `after-desktop-dive-start.png`: the desktop dive start. The tutorial card shows the one instruction. The
  mission list has the checklist. The nav line shows BRG, DEPTH and AHEAD. The waypoint label shows only
  "220 m · ↓22 m" with its arrow. No hint line is shown while the card is up.
- `after-desktop-briefing-advanced.png`: the predive briefing with Advanced open. The four options have
  small checkboxes on their label lines. The "Visual waypoints" note sits under its label.
- `after-phone-home-390x844.png`: portrait Home. Dive, Dive sites / Free dive, Daily dive, mode, Advanced,
  Journal and Settings are on screen. Controls is at the bottom edge.
- `after-phone-home-844x390.png`: landscape Home. Journal and Settings are fully on screen in the menu
  column. The second row of the menu (Controls) is below the fold, which scrolls.

## Gates

- `PW_PORT=4871 tools/gates.sh`: PASS python, content, build, unit, e2e (smoke), e2e-base (project-base),
  attribution, prettier. EXIT=0.
- Affected specs run on a fresh build (`PW_OUTDIR=.cache/s-hud-dist`): `mission`, `d-scan`,
  `f-copy-regress`, `content-missions`, `d-polish`, `f-arcade-access`, `opening-framing`. 128 passed.
- `tsc --noEmit` clean.

## Not done / notes

- Full e2e (`--full-e2e`) was not run; only the affected specs. CI runs the rest.
- `plan/DIRECTOR.md` backlog entries 23 and 24 are not marked done here; the owner's review decides that.
