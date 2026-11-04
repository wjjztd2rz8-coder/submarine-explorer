# V-endurance-dropstone-tone

## What changed (data only)

- `data/landmarks/endurance/site.json` `opening.reframe`: range 6 to 35, altitude 10 to 30, yawOffset -11 to 11 (the largest turn the facing-hero test allows, sign flipped). The camera looks down from higher and further back, so the hull sits lower left of the sub, clear of its screen envelope at all three layouts. This is the free-dive opening (golden `endurance-1.png`).
- `data/landmarks/endurance/props.json`: `dropstones-a` and `-b` moved to the lower right of that opening. Their old positions, which suit the mission approach frame (110 m out), are kept as `dropstones-c` and `-d`, so the mission opening keeps its foreground stones. Two extra prop entries, no code.
- `opening.life.deckPatch.z` -13 to -4: the anemone patch moves toward the hull's middle so it stays within the Low tier's 55 m life radius from the new, further pose.
- No shared code, HUD, settings or test changes. No site branches.

## Images (.cache/codex/shots/)

- Before: `endurance-dropstone-before-free.png`, `endurance-dropstone-before-free-portrait.png`, `endurance-dropstone-before.png` (mission), `endurance-dropstone-before-portrait.png`.
- After: `endurance-dropstone-after-endurance-1.png` (desktop free-dive), `...-endurance-portrait-1.png`, `...-endurance-1-mission.png`, `...-endurance-portrait-1-mission.png`.

## Rating (honest)

Free-dive opening about 4.0 (was about 3.8); target `Endurance: main hull` kept: hull left of centre and fully clear of the sub, two grey boulder clusters lower right, brightness unchanged. Mission opening unchanged at about 3.8. Portrait free-dive: hull left, stones right of it, sub above; clear of the HUD lanes.

## Remaining gap

- Stones read mid grey, not pale, and share one lump template.
- Tests: snapshots for deepOpening and freeDiveComposition updated for the new pose (intended).
- Stone positions were placed by eye from the pose (about 8 m of error); a change to safe-search bearing would move them.
