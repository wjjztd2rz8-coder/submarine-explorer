# V-bluehole-opening

## What changed

- `data/landmarks/great-blue-hole/site.json` (`opening.mission`): `chaseRadius 46`, `chaseOffsetX -16`, `chaseOffsetY -30`. Root cause of the "hugging" camera: the sub opens at 11 m depth, so the default high chase arm (38 m up) is retracted by the surface clearance to roughly a quarter of its length. A level, slightly sideways arm keeps its length, so the sub and the stalactite gallery both read. Uses the existing shared mission-arm data; no code or site branch.
- `src/vehicles/hulls.ts`: the Class A hull number moved from behind the deck fin to ahead of it. The decal orientation and UVs were already correct (the unit test is right). In the golden the lettering looked reversed because the yellow centreline fin and a grazing view cut through it, leaving a clipped "D". Deck height now comes from the deck profile instead of a literal.
- `tests/unit/decals.test.ts`: new capability test, deck markings on every hull sit on or above the hull surface (nothing standing over the decal centre).

## Screenshot

`.cache/golden/2026-10-29-203556/great-blue-hole-1-mission.png` (before: `.cache/golden/2026-10-29-203030/`).

## Honest self-rating: 6/10

- Good: camera is pulled back; sub and the brown gallery arch are both in frame; no longer a wall of hull.
- Weak: the hull lettering is not legible in the opening at all now (viewed from behind and slightly above, the roof number is small and hidden by the fin at this angle). Not verified visually after the move; only by geometry test.
- Weak: the arch reads as a brown slab beside the sub, not a striking arch; the sub is right-of-centre, arch left-of-centre.
- Banding NOT fixed: the stepped, zig-zag seabed ledges (reconstructed sinkhole terraces, bottom-left and right) remain. They are terrain geometry, not a shader/data setting I could change simply (`reliefM` is already 0). Needs a terrain-ledge item (smoother terrace profile or fade at distance).

## Remaining

- Terrace banding in the sinkhole wall (terrain data).
- Close-up check of the hull number from a viewing angle in a golden pose.
