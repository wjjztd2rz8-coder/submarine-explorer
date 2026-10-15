# V-headlight

## What changed

`src/shaders/terrain.frag.glsl`: the terrain roughness now keeps a 25% share of the texture's roughness channel (blended toward 0.9) instead of using it directly.

## Why

The star/honeycomb pattern in the headlight pool on Blue Hole rock walls came from the roughness channel of the rock normal/roughness map. The lamps' specular response amplified its tiled, high-contrast cells. Found by bisection in the live scene: with the seabed mesh hidden the pool vanished; zeroing albedo contrast, normal strength and rock-grain detail left the pattern unchanged; a constant roughness removed it. The caustic projector is already faded out by 60 m and has no bearing here.

## Checks

- Monterey and Challenger: no star pattern before or after (Monterey sand has only faint soft blotches in both); unchanged otherwise.
- Pool brightness (mean luminance in the lit region): 70.5 before, 68.4 after, so no meaningful darkening.
- Before: `.cache/golden/2026-10-15-094654/` (great-blue-hole-1, monterey-canyon-1, challenger-deep-1). After: `.cache/golden/2026-10-15-103058/`.
- Gates: PW_PORT=4731 tools/gates.sh all PASS (the shader-hash snapshot in tests/unit/**snapshots**/beebeIsolation.test.ts.snap was regenerated because the shared terrain shader changed).
