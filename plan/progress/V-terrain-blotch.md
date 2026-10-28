# V-terrain-blotch

Item: V-terrain-blotch (DIRECTOR Backlog 1).

## What changed

- New biome field `mottle` (0..1, default 1) and shader uniform `uMottle` in `src/shaders/terrain.frag.glsl`. It scales the macro brightness swing, the warm/cool hue cast (the blue patches) and the scale of the stain noise (3.3 m at 1, 11 m at 0). Default 1 leaves every other site pixel-identical.
- Hunga Tonga, Kamaehuakanaloa and Axial set `mottle: 0.3`, a stain colour closer to their base rock, and patch material B closer to A (Hunga `patch` 0.08, Kama 0.2, Axial colorB near A). All via site data; no site-id branch.

## Images

- Before: /home/vijay/submarine-explorer/.cache/golden/2026-10-28-091604/{hunga-tonga-caldera,kamaehuakanaloa,axial-seamount-ashes}-1.png
- After (Kama, Axial pass 2): .cache/golden/2026-10-28-094250/ (mottle + stain only) and 2026-10-28-094846/ (palette)
- After (Hunga final, Monterey check): .cache/golden/2026-10-28-095308/

## Self-score (honest)

Axial and Kama: from camouflage splatter to broad soft tonal variation, now reads as sediment over rock. Hunga: orange/blue splat gone; ground is uniform olive silt with a few pale-blue pools (lamp-lit patches) remaining. 7/10 vs about 5 before. Monterey unchanged.

## Limitations

- Axial still has soft yellow-olive patches at distance; Kama's sand cap above is untouched. Only the lit near field was judged in one pose each.
- Kama and Axial final-palette frames were captured before the last small Hunga tweak; Kama patch 0.2 was not re-viewed after the palette pass.
