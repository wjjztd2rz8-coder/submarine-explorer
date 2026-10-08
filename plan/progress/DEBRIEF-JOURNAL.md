# DEBRIEF-JOURNAL

Branch claude/debrief-journal. Not merged or pushed.

## Changed
- `debriefText` (src/game/MissionRouter.ts): partial dive is now "Back at the surface" with
  "You found N of M — the rest are still down there." (or "Nothing logged this time — the site is
  still waiting." at 0). Full-success wording unchanged.
- Debrief actions (src/ui/Debrief.ts, src/styles/flow.css): one filled primary (Dive sites), at most
  two quiet text links (Keep exploring or Dive again, then Journal), the rest under a "More" toggle
  (a button, so FocusTrap and keyboard cycling reach it). Home and the second of Keep exploring / Dive
  again live under More. DOM order changed accordingly.
- Journal (src/ui/Journal.ts, src/styles/journal.css): unscanned POIs collapse to one quiet
  "N more to find" row (`.jr-more-to-find`); spoilers on still lists everything. Scanned entries unchanged.
- Tests updated: d-flow, mission, discovery, f2-explore, f-save-soak, f-flow-audit-510 specs;
  unit journalData and debriefReopen. New assertions: partial wording (unit + d-flow), one primary and two
  visible links, collapsed row (d-flow, discovery).
- CHANGELOG.md entry added.

## Gates
- `PW_PORT=5411 tools/gates.sh` green (build, unit, python, content, attribution, prettier, smoke e2e, e2e-base).
- `--full-e2e` run once: 7 failures, all from the old wording/order/hidden-note selectors; fixed, then reran
  the touched specs (d-flow, discovery, f-a11y, f2-explore, globe, mission, f-flow-audit-510, f-debrief-720,
  f-save-soak): all pass.

## Screenshots (.cache/codex/shots/debrief-journal/)
- 390x844/debrief-partial.png, 390x844/debrief.png (full success)
- 844x390/debrief.png, 844x390/journal-site.png
No overlap; landscape debrief scrolls inside its panel as before. The d-flow Journal test cannot run at
390 wide (nav drawer layout, pre-existing), so no phone journal-site shot.
