# V-beebe-horizon

## Changes

- `data/landmarks/beebe-vent-field/site.json`: added a `horizon` block (upperColor, hazeColor, hazePeakElevation 0.25, fogLift 2, fadeStartM 400, fadeEndM 600). VentPreset already builds the graded water backdrop from `site.horizon` (same data path Lost City uses). Data only; no code, no HUD, no site branch, no new numbers in code.
- Far vent glow: not added. The existing third smoker plume and its glow already sit in the distance on the right of the opening, so a further light would add clutter.
- `fogHaze` is not accepted by the non-wreck horizon validator, so it was left out.

## Merges with

The existing site `horizon` field and VentPreset backdrop.

## Screenshots

.cache/golden/2026-11-02-004200/ (before) and .cache/golden/2026-11-02-005927/ (after): beebe-vent-field-1-mission.png and beebe-vent-field-portrait-1-mission.png.

## Self-rating

About 6/10. The sky above the horizon is now a teal-to-dark gradient instead of flat black, and the frame is brighter overall. The seabed edge still meets a darker band of water.

## Remaining gap

A narrow dark band sits right above the seabed edge, so the "seabed fades into the water column" part is only partly met; the mid-ground plain is still uniformly brown. A fix needs the fog colour near the horizon lifted (code in TitanicHorizon) or per-site fogHaze in the validator.
