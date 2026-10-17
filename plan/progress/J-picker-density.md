# J-picker-density

Finding: the Home "Dive sites" picker showed three to four tall cards at desktop height, and Blue Hole was tenth and started with "Lighthouse Reef".

## What changed

- Replaced the tall mission cards in the existing Home picker (`MissionSelect`, shell presentation) with one compact row per site: name and "depth · hull class" on the left, stars and "n/m logged" on the right. The long summary is no longer rendered in the shell picker; it remains in the tooltip and the briefing.
- Removed the card styling in `src/styles/menus.css` (min-height, padding, stacked summary/progress lines) in favour of a two-column grid. No new `@media` rules and no new UI surface.
- Order comes from data: `data/landmarks/index.json` is now ordered by depth (shallow to deep), so the Great Blue Hole is first and Challenger Deep last.
- Title comes from data: `great-blue-hole/mission.json` is now "Great Blue Hole: Lighthouse Reef".

## Result

At 1280x720 seven sites are visible (was three); at 390x844 about five to six (was two). Screenshots in `.cache/codex/shots/J-picker-density/` (`before-*` and `after-*`, desktop and portrait).

## Gates

`PW_PORT=4871 tools/gates.sh --full-e2e`: see the result in the report.
