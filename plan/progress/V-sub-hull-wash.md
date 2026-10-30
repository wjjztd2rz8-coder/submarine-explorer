# V-sub-hull-wash

## Cause

Pale livery (albedo about 0.9) lit by scene ambient/hemisphere fill (indirect diffuse about 2.4 at Titanic) plus the boat's own lamps a metre from the hull summed far past the highlight shoulder in the shared vehicle shader. Everything above the shoulder maps to the same ceiling, so the top was a flat slab and even the orange stripe went pale. The camera key and normal map were drowned out. Measured by outputting each term in isolation (indirectDiffuse x0.25, totalEmissive, hi/20).

## Change

`src/vehicles/materials.ts`, `addKeyAndRim` (shared by every lit vehicle slot): before the shoulder, subtract 85% of `reflectedLight.indirectDiffuse` and 50% of direct diffuse+specular. Two lines of shader, no new uniforms, settings, site branches or per-site values. Paint, textures and config untouched.

## Screenshots (.cache/codex/shots/V-sub-hull-wash/)

before-* vs after-* for monterey-canyon-1, titanic-1/2, lost-city-1/2 (mission openings, desktop, high). After: top reads light grey-white with visible panel/normal shading, darker flanks and underside, orange stripe keeps its colour; still clearly readable. v1-* is the rejected paint-only try.

## Tried / rejected

- Lowering PAINT white/offWhite plus key wrap: pixel-identical, the shoulder already saturated.
- Lowering the key colour: no change (key is not the culprit).
- Scaling the whole result by 0.3-0.4: form appears but orange goes muddy and Titanic still pale.
- Moving the shoulder knee from 0.5 to 0.3: still flat.
- Subtracting only direct light, or only ambient at 0.65: Titanic still too flat.

## Tests

`PW_PORT=5391 tools/gates.sh`: python, content, build, unit, e2e smoke, e2e-base, attribution, prettier all PASS. No snapshots changed. Low tier shares the shader (not separately captured).

## Simplicity

Net +2 shader lines, no new settings; no site branches. Atmosphere `hullLight` per-site scale left as is.

## Rating

Beautiful for the sub about 3.8 up from about 3.0; readable in all three openings. Honest caveat: the 0.85/0.5 constants were tuned by eye on Titanic and Lost City; a darker deep site (Challenger) was not re-checked.
