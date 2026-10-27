# V-endurance-accent

## What changed

Nothing shipped in code or data. The per-site lamps lever (`atmosphere.lamps` in `data/landmarks/endurance/site.json`) was tried and reverted.

## Why

- Tried lamps 3 / 1.2 / 3 / 1.4 (Titanic/Hunga style), then 4 / 2 / 4 / 2. In the 110 m mission opening the hull is about 20 m or more from the sub, outside the lamp pool, so the frame was visually unchanged in both desktop and portrait. A change with no visible effect would only churn Endurance's Low-readability snapshots.
- A real focal accent (lit hull section or lamp pool on the hull) needs a light or emissive source placed at the hull. That means a new scene light or draw, or a shared-code branch, all forbidden by the brief. A per-site emissive tint on the hull material table (`src/world/props/wrecks/materials.ts`) is the likely next route and needs an owner call on scope.

## Evidence

`.cache/codex/shots/V-endurance-accent/` before-/after- `endurance-1.png` and `endurance-portrait-1.png` (after = the 4/2/4/2 trial, indistinguishable from before).

## Honest rating

About 3.4 of 5, unchanged. No accent achieved.

## Simplicity rules

Net zero: no code, data, or test changes kept.

## Gates

Not run; the tree has no changes besides this note. The site manifest unit test passed with the trial lamps before the revert.
