# S-manifest, step 1: manifest schema and habitat slice

## Schema

`data/landmarks/<id>/site.json`, typed and validated in `src/core/SiteManifest.ts`.
All sections are optional and omitted when empty; `id` must equal the directory name.

```json
{
  "id": "monterey-canyon",
  "audio": { "whaleHabitat": true },
  "events": {
    "plume": { "maxAltitudeM": 70 },
    "turbidity": { "maxAltitudeM": 45 },
    "whale": { "maxDepthM": 180 }
  }
}
```

`validateSiteManifest(raw, id)` throws `site manifest "<id>": <field.path>: <why>` for
wrong types, missing fields and unknown fields (typos fail loudly). The loader bundles
every `site.json` eagerly with `import.meta.glob` and validates at module load, so a bad
file fails the build/tests, not a dive. `siteManifest(id)` returns undefined for ids
without a manifest (non-landmark tiles); `allSiteManifests()` lists them.

## What moved

Four inventory discriminators removed, all 13 sites have a `site.json`:

- Row 6 `audio.ts` whale habitat list -> `audio.whaleHabitat` (Monterey, Kamaehuakanaloa, Axial).
- Rows 11, 12, 13 `Events.ts` `VENTS`, `CANYONS` and the Monterey/Hudson whale test ->
  `events.plume` (Axial, Beebe, Kamaehuakanaloa; 70 m), `events.turbidity` (Monterey,
  Hudson, Hunga; 45 m), `events.whale` (Monterey, Hudson; 180 m).
- The whale depth threshold `EXPLORE_CONFIG.shallowDepthM` was only used there; it is now
  per-site `maxDepthM` and the config constant is deleted.

The two whale policies stay distinct (audio habitat includes Kamaehuakanaloa and Axial;
event whales do not). Behaviour is identical.

## Next slices (remaining inventory rows, by suggested order)

Completed opening framing and staged life in
[`2160-S-manifest-slice.md`](2160-S-manifest-slice.md): inventory rows 2, 4, 5, 7,
8, 9 and 31 migrated. Completed props/material selection in
[`2200-S-manifest-3.md`](2200-S-manifest-3.md): rows 23–30 migrated, including
Beebe chimney profiles, crust/habitat/grounding selection, Blue Hole's hood grotto
variant and apron defaults, and Lost City's inactive-apron habitat. **12 discriminator expressions
remain.**

Next: remaining rows from `plan/progress/2110-S-verify-9.md` (rows 1, 3, 10 and
14–22), grouped by consuming module; take them in that file's order. Challenger
scatter keepout, atmosphere/terrain/wreck tuning and sonar remain. Shared numeric
material defaults stay shared; the gallery-apron config default is a derived view
of site data, preserving generic fallback behavior and explicit config overrides.

## How to brief a migration

One slice per brief. For each inventory row: add an optional typed section to
`SiteManifest` and its validator branch, fill each site's `site.json`, replace the inline
list or comparison with a manifest read, delete the old constant. Keep behaviour
identical, add a validator table case for the new section, and keep the shipped-manifest
test green. Do not add settings or visual changes. Gate with `tools/gates.sh`.
