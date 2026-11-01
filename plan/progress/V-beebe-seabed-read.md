# V-beebe-seabed-read

## Changes

- Two scatter kinds, `ventstub` (dark stained sulphide stubs, rock material) and `tubeworm` (pale white clumps with the odd red plume), added to the existing scatter tables (ScatterTypes, ScatterPlacement salts, ScatterKind) and listed in the `beebe-vent-field` biome scatter. Same idiom as the Blake `chimney` kind; no site branch, no HUD element.
- Both reuse `tubeSpongeGeometry`, so no new geometry. Mussels, tube worms and dead chimneys are real at Cayman vents.

## Merges with

The existing biome scatter list (pillow, rubble, boulder). The warm light pool already exists from the sub lamps and the smoker glow, so no new light was added.

## Screenshots

.cache/codex/shots/V-beebe-seabed-read/: before.png, after2.png (final). Desktop opening, 0 s.

## Self-rating

About 5/10 on the target. Tube-worm tufts now dot the near and mid bed and break the flat plain, and the frame is not darker. The vent stubs are too dark to read outside the lamp pool, so the "2-3 chimney stubs at 20-40 m" part is not met. The horizon is still a hard line.

## Remaining gap

Stubs need either a lighter tint or placement inside the lit apron (that would need a per-prop scatter, not biome scatter). The horizon fade is a separate item.
