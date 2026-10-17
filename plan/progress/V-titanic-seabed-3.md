# V-titanic-seabed-3

## Changes

- Rim: `scourAt` rim weight now rises and falls over a narrower band (0.85-1.1 then 1.1-1.9 of the moat width, was 0.7-1.3 then 1.3-2.6), and the rim tint is 0.45 (was 0.65), so the berm reads as a crest rather than a pale band.
- Trail plates: scatter kinds gain an optional `gain` (brightens the per-instance tint); the trail plates and frames use warm rust tints with gain 1.7, so they read against the silt.
- Hull plating: bow `muted` 0.75 to 0.6 and plate variation strength 1.1 to 1.4, so rust-orange and sprung-dark plates keep more hue. (An attempt to apply muting before the plate step made the hull far too orange and was reverted.)

## Screenshots (`.cache/codex/shots/V-titanic-seabed-3/`)

`before/` and `after/`, High desktop, three poses. Approach pose: plates now vary visibly in warmth and darkness; trail plates at left are warmer and lighter. Effect is modest, not dramatic.

## Tests

`terrain-detail` rim probe moved to the new crest (1.1 x width). Rebaselined, Titanic only and intended: `beebeIsolation` (terrain buffers), `freeDiveComposition` (opening y moves 2 mm). No props added, so the prop-count budget is unchanged. Gates: unit, e2e, e2e-base, attribution pass; prettier fails only on `plan/OVERNIGHT-LOG.md` and `plan/PROCESS-LOG.md`, which this package does not touch.

## Simplicity

One optional kit field (`gain`) and one tint constant; the rest is retuned numbers. No site branches, no settings, no new geometry.

## Remaining issues

- Hull plating still has a regular strake grid at distance; variation is tonal, not structural.
- Hull is still desaturated grey in the lit areas; lighting on the hull/seabed is not changed in this slice.
- Rim crispness is only a little improved at 60 m; Low tier not re-captured.

Own rating: approach view ~4.0 before, ~4.2 after.
