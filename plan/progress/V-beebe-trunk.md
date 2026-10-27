# V-beebe-trunk

Beebe trunk plume tapers and fades toward its top, and neighbouring vents bend opposite ways.

## Changes (VentPreset smoke shader only)
- `taper` factor (radius and sprite size shrink to 35% by t=0.9) and an earlier alpha fade (starts t=0.2, was 0.5): columns thin and dissolve instead of staying a dense pillar.
- New per-vertex `aSwing` (0/1 by source index, tallest first): odd vents rotate their drift by 2.4 rad, so the second plume leans away from the trunk. No site branches.
- No new draws, no budget change; Low unaffected structurally (same draw count).

## Screenshots
Before/after: `.cache/codex/shots/V-beebe-trunk/{before,after}/beebe-vent-field-{1,2,3}.png`. After: trunk thins and fades above the mouth and leans slightly left; the second plume leans right and is paler. Shot 2 shows softer billows at the top.

## Tests
Extended `tests/unit/ventHazeBudget.test.ts` (aSwing has both values). Snapshots untouched.

## Simplicity
One attribute plus two shader expressions; no new options.

## Remaining
Trunk is still tall enough to leave the top of frame in shot 1; Low tier not re-shot. Rating ~3.9 for the Beebe golden (was ~3.7).
