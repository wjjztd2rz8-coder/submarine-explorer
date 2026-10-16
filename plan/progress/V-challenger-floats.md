# V-challenger-floats

## Changed

All in `src/world/props/geo/lander.ts`.

- Root cause of the faceted floats: `foamSphere` ran `computeVertexNormals()` on a non-indexed icosahedron, which gives flat per-face normals. Normals are now radial (analytic), so the balls shade smooth at any face count; no extra triangles. Lump displacement 5% -> 3%.
- Leg-top floats are always 80 faces (were 20 on Low); the three smaller between-floats keep the tier split. Low 1785 -> 1965 triangles, High unchanged at 2754 (budgets 2000/3000 kept); still 3 draw calls.
- Colours darkened so the lit frame no longer blows out under the headlights: aluminium 0x5b5a52 -> 0x302f2a, pressure housing 0x9da5a7 -> 0x535b5d, foam 0x5c3818/0x2a1c12 -> 0x3d2d1c/0x1f1812 (dull syntactic foam, not peach).

## Simplicity rules

1. Net simpler: one `computeVertexNormals` call replaced by one radial-normal line; no new parts.
2. No player text touched.
3. No layout patches.
4. No site branches.
5. No settings mutation.
6. No new spec; `landerVerification` covers draws, triangles and tint.
7. No package numbers in code.

## Screenshots

`.cache/codex/shots/V-challenger-floats/{before,after}-{high,low}/` (pose 1-3, golden tool).

## Remains

- Silhouettes are still polygonal at close range (80 faces; High cannot go higher inside the 3000 budget).
- Low tier's scene lighting is brighter than High, so the frame there still reads lighter.

## Rating

7/10: floats shade as smooth, matt foam and the frame sits in the scene instead of glowing; geometry is still low-poly.
