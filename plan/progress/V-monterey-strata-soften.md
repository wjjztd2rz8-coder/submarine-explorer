# V-monterey-strata-soften

## Cause

Monterey wall stripes come from the canyon scarp prop (`src/world/props/geo/scarp.ts`, eroded beds), not from the survey-terrain tint (`MontereyBands.ts`; a trial retune of it changed nothing visible and was reverted). Contributors:

1. Per-bed albedo from a wide palette (0x5f6250 to 0xb0a585) with a large tone swing, so neighbouring beds differ strongly.
2. A dark shadow line under every ledge (34%).
3. Bedding relief in `canyonRockDetail` (`src/world/props/geo/materials.ts`): `cos(y * 4.2)`, a perfectly regular 1.5 m contour term.
4. Laminae tone kept most of its per-lamina contrast.

## Fix

- Config (`src/core/config/monterey.ts`): bed tone swing 0.26 to 0.14, new `bedBlend` 0.5 (beds pulled toward the base rock), ledge shadow 0.34 to `lipShadow` 0.2 (eroded beds only), `laminaBreak` 0.9, `lipFloor` 0.3.
- Bedding relief phase warped by two low-frequency sines in `canyonRockDetail`, so the corrugation is no longer evenly spaced.
- No site branches; tuff and hadal scarps untouched (their digests unchanged).

## Before / after

Before: .cache/golden/2026-10-31-042124/monterey-canyon-1.png. After: .cache/golden/2026-10-31-042822/monterey-canyon-1.png.

## Honest rating

Contrast clearly lower, bed colours gentler, relief corrugation irregular. The wall still reads as banded: the ledge geometry (bed displacement) is what carries the bands now and was left alone. Roughly 3.6 to 3.9 foreground, a partial fix; a follow-up would soften ledge displacement spacing or add a depth-dependent warp to `bedPhase`. Brightness not reduced.

Tests: scarpTerrain canyon digests (3 tiers) re-baselined.
