# V-horizon-upper-half

## What changed

- One generic preset param, `horizonRidge` (0..1, default 0, wreck and vent presets), passed to the existing `TitanicHorizon` water backdrop. When above 0 the dome gets a lighter haze bank whose top edge is a wavy "far ridge" skyline (azimuth sine lobes, constants in `ABYSS_HORIZON`). It fades to fog colour at level so far terrain still blends into the fog. Dome uses 64x64 segments only when the ridge is on (so Beebe and others are untouched).
- Data: `horizonRidge: 0.5` in the mission overrides of Titanic, Bismarck, Endurance and Lost City. Bismarck also gets `titanicHorizon: true` (it had no backdrop at all).
- Blue Hole, Beebe and Monterey: no data change, no code path change (Blue Hole opening differs from before only by particle noise, about 1000 of 1.44M pixels).

## Ratings (opening upper half, honest)

- Titanic: before 3.5, after about 4.5. Soft haze band reads as depth; a dark gap remains between the band and the seabed.
- Bismarck: before 3.5, after about 4.5. Gradient with cloud variation now fills the upper third; the hull and dome horizon are unchanged.
- Endurance: before 4.5, after about 5.0. Band is subtle against an already pale backdrop.
- Lost City: before 4.5, after about 4.8. Band is visible but a dark strip sits above the far ridge.
- Not a true silhouette ridge; it reads as a haze bank, not rock.
- Screenshots: before `.cache/golden/2026-11-06-221614/*-1-mission.png`; after `.cache/golden/2026-11-06-223419/` (Titanic, Bismarck) and `.cache/golden/2026-11-06-223731/` (Endurance, Lost City, Blue Hole).

## Simplicity check

One param, one weights array in an existing class, four data lines. No site branches, no settings, no UI, no package numbers in code. Not net smaller in lines (about +25), but no new system.

## What remains

- The dark strip at the horizon between band and seabed (fog-match zone). A real darker silhouette would need terrain far-field geometry.
- Strength 0.5 is untuned per site; a second pass could lift Titanic and Bismarck to 0.7.
