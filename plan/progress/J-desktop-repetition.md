# J-desktop-repetition

Source: fresh-player journey review row J-desktop-repetition (P3, `plan/progress/J-journeys-repeat.md`).

## What was duplicated

After the first Titanic scan on desktop (1600x900) the next destination and turn showed up in:

1. the guidance card (`OBJECTIVE · Stern section · TURN 170° PORT`, ring `666 m`),
2. the mission panel nav line (`→ STERN SECTION · BRG 190° · DEPTH 3,795 m · 170° PORT`),
3. the world marker (`666 m · ↓16 m`; its name label was already hidden when another surface names the target),

and the mission list also kept the finished "Scan the bow" row.

## What changed

- The mission panel nav line is the one owner of "where next" on desktop. `ScanOverlay` no longer offers the standing objective card on desktop while the target is out of scan range; the card still stands on touch (no panel) and still appears on desktop once the objective is in scan range, where it carries the aim cue the nav line lacks.
- The steering-only "SCAN TARGET" card no longer fires for a side contact (or a logged one) while an objective is outstanding. Once the pilot aims at an optional contact, the existing "SCAN TARGET · OPTIONAL" card still offers it.
- The world marker stays as the in-world cue; with the card gone, its range and depth delta are no longer a repeat (the nav line has bearing, depth and turn but no range).
- The objective list drops finished rows while anything is outstanding; the progress line ("1 of 4 objectives · 1 of 2 primary") keeps the count. When all are done the full list returns.

Net: removed one on-screen surface in the common desktop case and one list row; no new elements, CSS or settings. Touch layout is untouched (the touch card path is unchanged).

## Test

`tests/e2e/mission.spec.ts` (existing first-scan flow) now asserts no standing objective card and no completed row while the stern is far. Guards: the repeated desktop where-next.

## Screenshots

`.cache/codex/shots/J-desktop-repetition/before-next-objective.png`, `after-next-objective.png` (1600x900, Titanic after the bow scan).

## Self-rating

Simple 4/5, first-10s clarity 4/5. The panel is now the single text statement; one residual repeat remains.

## Deferred

- When the objective is within scan range on desktop, the card (aim cue) and nav line (name, turn) overlap briefly. A fix would fold the aim cue into the nav line.
- J-contact-choice (optional contacts vs mission) is unchanged by design.
- The objective hint line returns under the nav line once the guidance card empties; it is the longest text left in the panel.
