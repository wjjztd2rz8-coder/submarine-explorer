# V-bismarck-ground-scour

## Changes

- `src/core/config/terrain.ts`: a `bismarck` entry in the per-tile fidelity table, using the existing generic `scour` option (as Titanic does). Footprint is the 251 x 36 m hull envelope at the hull fix, heading 20, 4 m deep, 26 m wide moat, 1 m silty rim; focus radius 150 m. The sourced seamount flank outside the focus is untouched.
- `src/world/props/wrecks/scatter.ts`: the Bismarck landslide blocks are smaller (about two thirds) and darker (`SLIDE_TINTS`).
- `tools/bismarck-poses.json`: `above` 24 to 28, because the hull now sits about 4 m lower and the golden camera is placed relative to it (the 15 m clearance check in `lowSweepReadability` guards this).
- Rebaselined `freeDiveComposition` snapshot, Bismarck only (the opening search lands on a different pose over the changed terrain).

## Screenshots

`.cache/codex/shots/V-bismarck-ground-scour/before` and `after` (mission openings, High, three layouts). The hull now sits in a visible bowl with a lighter rim, and the foreground debris is smaller and darker.

## Simplicity

No new code paths: one config entry reusing the generic scour option, retuned kit numbers, one pose number. No site branches, no settings.

## Remaining issues

- The far horizon is still a smooth dome; that comes from the coarse 41 x 61 m survey grid beyond the 210 m focus, which this package deliberately leaves alone.
- The hull plating is unchanged (stripy texture at distance).

Own rating: opening about 3.4 before, about 3.7 after. The scour reads but is subtle in the dark water.
