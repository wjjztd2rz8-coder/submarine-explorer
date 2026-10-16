# V-challenger-lander

## Changed

All in `src/world/props/geo/lander.ts` (geometry and vertex colour only; still three draw calls).

- Floats: the glowing orange glass spheres are now syntactic foam. `foamSphere` displaces a sphere slightly with value noise and mottles two muted, dark ambers per vertex, so it reads matte and moulded and not as a lamp. Each leg-top float has a dark strap.
- Frame: thicker legs (0.07 -> 0.09) and braces (0.045 -> 0.06); a diagonal cross-brace per leg pair, steel flange collars at the ring, clamped steel ballast weights on the legs, an electronics box on the central housing, and a bait plate on two stand-offs on the ballast plate.
- Amphipod swarm and the cage/fish are untouched; the swarm stays readable against the darker floats.
- Triangles: low 1393 -> 1785, medium/high 2182 -> 2754 (existing budgets 2000/3000 kept).

## Simplicity rules

1. Net simpler: one helper replaces two inline float constructions; the float colour constant is replaced by two foam colours. More parts, no new elements or settings.
2. No player text touched.
3. No layout patches.
4. No site branches: the builder only reads `dims` and tier.
5. No settings or config mutation.
6. No new spec; `landerVerification` already covers draws, triangles and vertex tint.
7. No package numbers in code.

## Screenshots

`.cache/codex/shots/V-challenger-lander/{before,after,before-low,after-low}/` (desktop and portrait, poses 1-3).

## Remains

- Low tier uses 20-face foam spheres (as the old floats did), so they read as faceted; High uses 80 faces, still visibly faceted at close range.
- Headlight exposure keeps the aluminium frame pale; paint and form are fine, the lighting is a separate matter.
- Mottle on the foam is subtle in the lit frame.

## Rating

6.5/10: floats no longer glow and the frame has clear structure (bracing, weights, bait plate, box); still a modest low-poly prop at 1 m range.
