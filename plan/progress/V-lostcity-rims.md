# V-lostcity-rims

## What changed

- Tower rim (`tieredSpire`, `spire.ts`): trunk columns get a rolled bead below the torn edge, so the rim has thickness instead of a paper edge. The saw teeth in `rimDrop` are halved for trunks only (Beebe crust stacks unchanged).
- Trunk ledges (`roughenTrunk`, `towers.ts`): the existing broken ledge and undercut terms are stronger, so crust shelves read along the trunks. No new geometry.
- Slope (`buildCarbonateTower`): the existing rubble scatter now also drops a sparse ring of the same blocks just outside the apron outline, seated on the ground. Bounded to the outline's neighbourhood so prop bounds (and free-dive spawn composition) are unchanged.

## Screenshots (`.cache/codex/shots/V-lostcity-rims/`)

`before/`, `after1/` (bead 0.32, too bulbous), `after2/` (bead 0.2), `after2-low/`, `after3/` (final, High desktop + portrait).

## Simplicity rules

Net: no new settings, UI, materials or site branches; one added term in the spire and two constants raised. Re-baselined, intended: `props-geo` (lost-city buffers, 3 tiers) and `terrainMerge1140` (lost-city Low hash). No assertions changed. No tests added.

## Rating

Before about 3.6; after about 3.9. Rims now read as solid lips on High and Low; wall ledges are visible.

## Remaining issues

- Slope rubble is sparse and small at the hero pose; the slope itself is still mostly smooth terrain (needs a terrain-side relief fix).
- Broad planar facets on the main tower's torn rim remain (large rimDrop notches).
