# V-titanic-plating

## What changed

`src/world/props/wrecks/materials.ts`, steel plate shader only (shared by Titanic bow/stern, Bismarck and scatter plates); no geometry, lights or site data touched.

- Lane tint about half as strong (cool 0.84,0.94,1.06 to 0.93,0.98,1.02; warm 1.14,0.98,0.84 to 1.07,0.99,0.92).
- Per-plate desaturation toward grey reduced (0.3-0.65 to 0.12-0.4), so plates keep rust hue instead of bleaching.
- Up-facing surfaces (decks, hatch tops) get a warm rust multiplier, using the view-space up vector.
- Grazing rim light kept (still separates the hull edge) but dimmer, less blue, tighter falloff (pow 4).

## Screenshots

`.cache/codex/shots/V-titanic-plating/`: before-1..3, after-1..3 (lane/desat/rim only), after2-1..3 (final), bismarck-1..3 (shared-shader check).

## Simplicity rules

Net zero new code beyond three shader lines; no new settings, elements, site branches, tests or package numbers. No snapshots needed rebaselining.

## Remaining issues / rating

- Opening: lanes now subtle; the hull reads as continuous rust plating and decks are warm brown. Per-plate tone and stain bands still give visible blockiness at close range (page 2 shot); that is plate variation, not lanes.
- Bismarck: decks warm as intended; its grey hull sides stay grey-green (paint colour, not the shader).
- Hull edge separation in the opening shot is weaker than before.
- Rating 7/10.
