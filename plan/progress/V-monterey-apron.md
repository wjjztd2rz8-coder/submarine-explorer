# V-monterey-apron

## What changed

- `MONTEREY_RUBBLE` (`src/core/config/monterey.ts`) gains `pebbleShare` (0.5) and `pebbleRadius`; `placeRocks` (`talus.ts`) gives that share of the non-block rocks a small pebble/cobble radius. Same instance count: pebbles replace ordinary fragments, so the apron has fewer mid-size rocks and many small ones. Only presets with the `scatter` policy (Monterey) are affected; the right-bank crest is untouched.
- Sub framing: not patched. In the opening the "half-transparent shape" beside the sub is the wall's pale translucent skirt (wall shading/fade near the camera), not a camera or spawn offset; the sub itself renders opaque. Fixing it means touching wall material, which is not a data-level change.

## Screenshots (`.cache/codex/shots/V-monterey-apron/`)

`before/` and `after/` (`GOLDEN_SITES=monterey`), poses `monterey-canyon-1..3`.

## Tests

No instance-count test encodes the split; counts are unchanged. Gates: see the final report.

## Simplicity rules

- 1 net simpler: two table fields and one branch in the existing placement loop; no new module or setting.
- 4 no site branches: the data lives in the existing Monterey rubble table.
- 6 tests: existing capability specs, none loosened.
- 7 no package numbers in code.

## Remaining issues

- The seabed between rock patches is still smooth sand; pebbles only appear where the rockfall patches are. A separate seabed-texture pass would be needed for more.
- Pebbles are small at the approach distance; texture reads mainly in the close pose.
- Translucent wall skirt beside the sub in the opening is unresolved.
- Own rating: about 3.6 (small improvement, apron less ramp-of-boulders).
