# F-GEO-SCARP

Branch `claude/f-geo-scarp`. Addresses the P1/P2 wall items for Challenger Deep, Monterey Canyon,
Hunga Tonga and the Great Blue Hole in `F-VISUAL-QA.md`.

## What changed

- **`src/world/props/geo/talus.ts` (new, pure helpers).** A graded rubble apron built from the final
  ground height: concave profile with hummock and clast relief, a lobed rim that is sunk below the
  seabed (feathered, no straight toe), and strips that sink out of sight where the wall ends.
  `talusSurface` / `talusNormal` give the final surface; `placeRocks` seats every rock on it, rejecting
  spots whose rim would hover (`isSupported`); `rockMatrix` leans each rock onto the slope and buries
  most of its flattened body.
- **`scarp.ts`.** The wall now starts at the apron join and stands on the apron instead of owning a
  built-in slope. New plan shapes: concave arc (Hunga), S-bend with an undercut base and receding
  terraces (Monterey), crescentic slump scarp with back-tilted benches (Challenger). Ends taper
  (`pinchScale`, `endRatio`, asymmetric and wandering) and sink under the seabed; the extrusion is
  capped at both ends so nothing hollow shows through. Gullies are ridged rills; strata ledges dip
  along the wall; Hunga has staggered vertical cooling joints. Monterey leaves a sandy passage on
  the inner bend by ramping apron reach down along x. Colliders follow the new shape (finer
  segments, lift per slice edge, crest clamp, plus coarse apron steps).
- **UVs.** Replaced the stretched dominant-axis projection with a single unfolded chart: u is along
  the wall, v is arc length up the face, so texture scale is metric and layers run across the bank
  (anisotropic tiles, e.g. 11 m along by 6 m up for tuff). The apron is mapped in metres too.
- **Materials.** Walls use the `strata` detail texture, rewritten as horizontal beds of differing
  hardness with elongated grain and thin partings (`CONTRAST.strata` 0.3 to 0.45). Beds also carry
  their own vertex tone, with lit lips and shadowed undercuts. Boulders are angular, flat-shaded,
  darker underneath (baked contact occlusion) and tinted from the wall and drape colours so
  intersections no longer read as black blobs on pale plaster.
- **`stalactites.ts`.** Curved bay in plan, scalloped shelf projection along x (some stretches barely
  overhang), thick shelf with a rising underside, clusters of fluted pendants with a strong flare
  where they fuse into the ceiling (attached at the real displaced underside), fallen blocks and an
  apron blending the foot into the seabed. Sponges cut from 90 to 34 at full growth and only high on
  the face (none on the floor).
- **Data.** Only the `note` text of the four props changed (still labelled invented scenic
  features). Ids, positions, sizes, headings unchanged.
- **Tests.** `tests/unit/geo-talus.test.ts` (surface, rock seating and support, mesh feathering,
  ends, all four builders on sloping terrain). `geo-colliders.test.ts` adjusted for sunk ends (boxes
  may reach ground level where the wall runs out; gap check only where the mesh stands). e2e
  `tests/e2e/f-geo-scarp.spec.ts` captures 1280x720 images per site and checks rocks against the
  real terrain and a triangle budget.

## Budgets (medium tier, per prop, unit measurement)

Tuff 41k tris, canyon 29k, hadal 43k, alcove 32k; low tier 5.6k to 10.6k (no rubble instances, as
before); draw calls 5 per prop (was 4). Whole-scene medium counts in the e2e log are 255k to 422k.
Ultra builds are heavier (118k to 167k per prop).

## Screenshots

`.cache/codex/shots/f-geo-scarp/<site>-{wide,toe,oblique,high,cockpit}.png`. The first four use a
photo-style orbit camera around the parked sub with the HUD hidden and boosted headlight fill so the
shapes read (a review aid; it is not the shipped lighting). `-cockpit` uses the default headlights.

## Deviations

- `geo/shared.ts projectUVs` untouched: it is the shared builders' helper and other props use it.
  The scarps and the alcove use arc-length UVs from `extrudeProfile` instead of a triplanar shader.
- Added `talus.ts` and rewrote the `strata` texture kind (only these walls use it).
- Existing collider tests relaxed as noted above.

## Remaining issues

- Walls still read dark and chalky depending on the L1 lighting work (not in scope here); the
  review images use boosted fill.
- Rocks are flat-shaded low-poly; at ultra tier more subdivision may be wanted.
- Sponge placement on the alcove is analytic and was not verified up close.
- No temporal LOD/pop check on a moving approach.
