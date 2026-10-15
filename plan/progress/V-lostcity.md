# V-lostcity

## What changed

- Torn tower rim (`spire.ts`, `rimDrop`, used by `tieredSpire` for irregular trunks): the top of each Lost City chimney drops in angular notches and teeth by up to about a rim radius, and the rim radius wavers, so the mouth is a broken edge rather than a flat ring. Wall and cap rings share the formula, so the seam stays closed. Brucite fins and the fringe points follow the same drop (`towers.ts`) so they sit on the rim instead of hovering at the old height.
- Wall relief (`roughenTrunk`): ribs, ledges, undercuts and mid-frequency relief amplified, plus a fine pitting term. Vertex count unchanged.
- Slope (`BIOMES['lost-city']`): `burrow` 0.2 to 0 and `ripple` 0.1 to 0. These produced the regular dimple pattern; the existing boulder/rubble/dropstone scatter supplies irregular relief.

## Screenshots (`.cache/codex/shots/V-lostcity/`)

`before/` (golden set, High desktop plus portrait), `after1/` (first pass, floating fringe), `after2/` (final).

## Simplicity rules

- Net: one small exported helper, no new settings or site branches (the trunk mode is already Lost City only); slope fix is two table values to zero.
- Snapshots re-baselined, intended: `terrainMerge1140` (lost-city Low buffer hash; draws 14 and triangles 44120 unchanged), `beebeIsolation` (biome and uniform hashes of the Lost City biome entry). No assertions changed.

## Rating

Before about 2.5; after about 3.5.

## Remaining issues

- The main tower's big wall planes are still smooth between ribs; a normal-map or triplanar flowstone detail would add more.
- Vent paint (dark mouth, white lip) is still keyed to the old rim height, so the dark throat sits slightly high on notched sides.
- Slope itself is still a soft, low-contrast mush from far; more rubble variety would help.
