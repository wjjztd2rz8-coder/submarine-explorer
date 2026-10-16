# V-lostcity-2

## What changed

- Trunk wall (`roughenTrunk`, `towers.ts`): one added term, scalloped flowstone sheets (broad plates with soft shoulders), so the planes between ribs are no longer flat. Vertex count unchanged.
- Vent paint (`towers.ts`): the dark throat and white lip are measured from the torn rim (`v.drop(angle)`), the same drop the fins and fringe use, so they sit on notched sides.
- Slope (`lostCitySlopeTint`): boulder-field patches on a domain-warped lattice add irregular light/dark variety on the slope. No new settings.

## Screenshots (`.cache/codex/shots/V-lostcity-2/`)

`before/`, `after1/` (fine patches), `after2/` (final): High desktop, High portrait, Low desktop.

## Simplicity rules

Net: one noise term, one angle lookup, one tint term; no site branches, settings or UI. Re-baselined, intended: `terrainMerge1140` (lost-city Low buffer hash; draws 14, triangles 44120 unchanged) and `beebeIsolation` (hash). No assertions changed.

## Rating

Before about 3.5; after about 3.8 (High clearly better on slope and wall; Low barely changed).

## Remaining issues

- Low tier slope is unchanged: the Low terrain mesh is too coarse for the patch scale, and the honeycomb on flat ground is texture-driven (needs a Low texture/normal fix, not vertex tint).
- Tower wall still relies on vertex density for relief; a detail normal would add more.
