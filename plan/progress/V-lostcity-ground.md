# V-lostcity-ground

2026-10-30. High tier, mission opening (`GOLDEN_SITES=lost-city GOLDEN_MODE=mission`), desktop 1600x900.
Shots: `.cache/codex/shots/V-lostcity-ground/{before,after}/lost-city-1-mission.png`.

## Cause and change

- Cause: beyond the near crest there is no terrain above eye level, and the background is a flat fog colour, so the upper frame was uniform dark water.
- Tried first: a hemisphere fill plus a key light (Titanic's data path). It washed the olive slope blue-grey and left the upper frame empty, so it is not kept.
- Change: the vent preset now builds the existing graded water backdrop when the site data has a `horizon` block (the reef preset and wreck preset already do). Lost City's `site.json` gains a `horizon` (darker crown, paler haze band at the horizon, mild fog lift, full effect by 600 m). No site branch; the colour/slope split is data only. Also fixed the vent preset draw count so the backdrop is counted.

## Result (honest)

The towers now stand against a pale horizon haze with a darker crown above, so the upper frame has a gradient and depth instead of flat black, on High and Low alike (the backdrop is not gated on tier). It is a haze band, not a ridge: there is no real distant crest to show because the terrain data has none above the eye line. Readability: advisory 0/3 openings flagged. Rating: ~3.8 -> ~4.0.

## Tests

Gates run in the worktree (see final report); no snapshot rebaselines needed.

## Simplicity

Reuses TitanicHorizon and the existing manifest `horizon` schema; +10 lines in VentPreset, +8 lines of data.
