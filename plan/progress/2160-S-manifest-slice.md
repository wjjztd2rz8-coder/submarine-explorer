# S-manifest: opening framing and staged wildlife

Migrated the next two slices from `S-manifest.md`: openings and life predicates.
All thirteen sites now own their mission range, approach label and free-dive
framing in `site.json`, using the existing eager loader and strict validator.

## Migration

- `opening.mission`: transit range and destination label, plus Lost City's shelf
  scoring weight. Unknown sites retain the 220 m range and 180-degree bearing;
  missing labels still use the contact name. `MISSION_APPROACH_M` is a derived
  view of the manifests, not another tuning table.
- `opening.freeDive`: hero, bearing, range, altitude, camera offsets and existing
  clearance/scoring options. Lost City's Arcade override is a mode row; its
  persistent camera-default policy is `opening.camera.applyDefaults`.
- `opening.reframe`: the existing second framing pass for Challenger, Endurance
  and Kamaʻehuakanaloa. The pillow field and vent aim remain separate anchors.
  The base search, accepted bearing, collision checks and fallback pose are
  unchanged; this migration does not merge the two solvers.
- `life.opening`: `groups` selects staged shoals/floor life; `approach` selects
  an approach patch. Both strategies receive typed manifest data. Anchors,
  counts, offsets, habitat radius, cell key, wreck mesh and deck patch moved
  with their consumers. Depth bands, tier caps, steering and placement remain
  shared code.

Inventory expressions removed: rows **2, 4, 5, 7, 8, 9 and 31** in
`2110-S-verify-9.md`. The remaining count is **20**, down from 27. The Challenger
scatter keepout and atmosphere/terrain/prop/sonar predicates remain for their
later slices. Atmosphere values remain in the existing tables; the moved
opening/habitat fields and the standalone pillow-framing table were deleted.

This removes two independent site tables, an opening/framing module, site camera
fields and seven identity predicates. The validator adds only data shape checks;
there are no new settings or UI elements. Tests stay in the existing capability
specs. No package identifiers were added to source/test comments. Shared TypeScript is 21 lines shorter, including the new
group-placement module and schema/validator additions.

## Verification rounds

1. Captured 39 exact spawn snapshots before migration: base and final framing
   for all thirteen sites in Arcade, Realistic and Custom. Captured nine staged
   wildlife snapshots before migration: three tiers for each of Monterey,
   Challenger and Endurance. The migrated results match all 48 snapshots.
2. Checked the migrated data against the former constants and reviewed the
   fallback paths, absent versus explicit camera offsets, independent hero/aim
   anchors, and Endurance deck attachment. Extended the validator table for
   invalid types, missing values, unknown fields/modes/strategies, nonfinite
   values, signed altitude, population counts and wreck requirements.
   Typecheck and focused capability tests pass. The existing Beebe isolation
   source fingerprint follows the reviewed Spawn.ts move; its geometry/material
   snapshots and all pre-migration behavior snapshots remain unchanged.
3. Full gates and browser capability results are recorded below after execution.
