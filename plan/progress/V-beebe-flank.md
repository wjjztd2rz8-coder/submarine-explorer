# V-beebe-flank

Goal: the Beebe close flank (`beebe-vent-field-3.png`) was a dark brown mass; wanted crust highlights, layered ledges and a visible warm glow.

## Changed (data and params only, no geometry)

- `data/landmarks/beebe-vent-field/site.json`: smoker `bodyShade` 0.5 -> 0.85, `bodyGlow` 0.1 -> 0.16 (albedo and crust-following self-lit tint).
- Vent preset: new `glowDropM` and `glowStandoffM` params (defaults 4 and 0 keep every other site identical). Glow lights used to sit on the chimney axis, where a point light only lights the ground; Beebe now puts three lights 12 m below the tops and 6 m to the side so they graze the ledges. Beebe override in `mission.json`.
- Tests: updated the authored 0.5/0.1 expectation and 3 geometry snapshots (colour evidence only); the Beebe preset test now asserts glow lights exist.

Replaced/merged: no new elements; reuses the existing GlowLights and the smoker profile fields.

## Rating

Before ~3.5 (flat brown mass). After ~4.0: warm rim light on crust ridges and shelves, ledges read, still not dark. Frames 1 and 2 checked for regressions: fine.

## Remaining

- Flank colour is still one orange-brown family; crust bands could use more value contrast (paintCrust palette).
- Light offset direction follows the plume lean, so camera-side lighting depends on angle.
- Seabed warm pool next to the far-right smoker is dimmer than before (lights moved off the tops).
