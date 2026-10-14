# V-lostcity

## What changed

- Seabed stretch: the stripes were geometry, not texture. The shared relief term in `Terrain.detailHeight` used a parallel sine "bed" corrugation and z-stretched rills. Two optional fidelity fields (`reliefBed`, `rillStretch`, defaults unchanged) now let Lost City use a weak bed term and round rills (`src/core/config/terrain.ts`). Other sites are untouched.
- Slope colour bands (`LostCityBands.ts`): strata amount 0.85 to 0.4, much stronger low-frequency warp so beds break into patches, calmer silt contrast. Tower bed tint 0.9 to 0.5.
- Tower silhouette (`spire.ts`, trunk mode only): stronger one-sided shelves with a sharper on/off mask, bigger swells, more elliptical section. Main tower gets three thin irregular carbonate flanges (`towers.ts`).
- Tower colour: weaker flow striations, seams and ridge contrast (vertex paint and shader stripe), plus a broad slow grey-brown / white staining patch. No new per-frame cost; Low tier uses the same vertex paint.

## Screenshots

`.cache/codex/shots/V-lostcity/before/`, `after/` (desktop + portrait, high), `after-low/` (desktop, low).

## Verdict

Seabed: clearly better (stripes gone, soft lumpy relief). Towers: calmer and more asymmetric, less wood-grain, but still read as fairly smooth columns; modest gain, not a 4/5 by itself. A flat-top collar and the regular ripple dimples on flat bed are unchanged.

## Gates

`PW_PORT=4580 tools/gates.sh`: all PASS (python, content, build, unit, e2e, e2e-base, attribution, prettier).
Deliberate test changes: Lost City snapshots in `beebeIsolation` and `terrainMerge1140` re-baselined (new relief and tint); `lostCityBiome` bed-contrast floor lowered 0.2 to 0.15 because the beds were softened on purpose. The shared spire ellipse change was kept trunk-only so Beebe is byte-identical.
