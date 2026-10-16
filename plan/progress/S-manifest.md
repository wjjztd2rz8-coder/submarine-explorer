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
variant and apron defaults, and Lost City's inactive-apron habitat. The landed
[scatter keepout](2240-S-manifest-scatter-keepout.md) and
[atmosphere policy](2250-S-manifest-atmosphere-policy.md) slices remove rows 1/19
and 3/10 respectively. Recount on 2026-10-16 found **8 expressions** before the
sonar slice below; **4 discriminator expressions now remain**.

Next: remaining rows from `plan/progress/2110-S-verify-9.md` (14, 15, 20 and 21),
grouped by consuming module: terrain carve selection and wreck atmosphere/relief.
Shared numeric material defaults stay shared; the gallery-apron config default is a derived view
of site data, preserving generic fallback behavior and explicit config overrides.

## Sonar slice (2026-10-16)

Recounted the original inventory against current `src/` before editing: rows
14–18 and 20–22 remained (eight expressions, including prop/POI identity proxies).
This slice takes the four sonar selectors together (16–18 and 22), leaving:

| Row | Remaining expression                                                            |
| --: | ------------------------------------------------------------------------------- |
|  14 | `terrainFeatures.ts`: Monterey canyon carve selection                           |
|  15 | `terrainFeatures.ts`: Blue Hole sinkhole carve selection                        |
|  20 | `WreckPreset.ts`: Endurance hull eligibility for atmosphere, horizon and relief |
|  21 | `WreckPreset.ts`: Endurance hull anchor lookup                                  |

The optional, strictly validated `sonar` section now owns:

- Endurance's `scourHullPoi: "endurance-hull"`.
- Blue Hole's `maxContourIntervalM: 10` and `reef: true`.

All other sites omit sonar policy. The renderer reads one policy, selects the
authored POI by that reference, caps the nominal interval before local adaptation,
and preserves the reef's tile-contains guard. Missing policy/hull and relief-rich
views retain generic survey behavior. The existing scour and reef algorithms,
geographic centre, measured depths, palettes and shared defaults are unchanged.

Net simplification: four identity selectors and the separate hull lookup method
are replaced by one optional per-site policy; no new helper, independent table,
setting or UI is introduced. Schema/validation adds 16 production TypeScript
lines and the renderer is one line shorter. The small schema cost makes site
selection data-owned while retaining the existing algorithms.

Before runtime edits, extended the existing sonar capability suite and captured
36 baseline snapshots against real Endurance/Blue Hole survey data. They cover
DPR 1/2, 250 m/1000 m/tile zooms, all three palettes across the cases, absent hulls,
unknown-site fallback and a sinkhole centre outside the tile. Each records raster
dimensions and SHA-256 hashes of pixels, contour paths and labels, plus measured
depth/contour diagnostics. Baseline: **39 tests passed**. Snapshot SHA-256:
`a31d230761e9bcc00f35ebe93f3af61445f1f8ce2881325df6d0d3f262ef3eca`.
The snapshots are frozen; no existing golden or assertion was rebaselined.

Validator cases cover omitted/empty policy, disabled reef, unknown fields,
malformed objects, blank/wrong-type anchors, invalid flags, and nonpositive or
nonfinite contour caps. Shipped-content checks cover all 13 sites and require
the configured anchor to exist in POI content. Renderer checks move each policy
to an unknown site and omit policy from a known site to guard data-driven
selection independently of identity.

Validation:

- Focused `siteManifest`, sonar scour/equivalence, palette and flat-guide suites:
  **308 tests in four files passed**, including all 36 unchanged baseline snapshots.
- Typecheck, changed-file Prettier and `git diff --check`: **passed**.
- Structural comparison against `HEAD`: both site JSON files differ only by
  their added `sonar` section; all other authored fields are identical.
- Gate invocation: `GATES_CONFIG_MODE=writable PW_PORT=4233 bash tools/gates.sh`
  (default smoke + project-base). Logs: `.cache/runs/20261016-104815-2-KviTCS/`.
  **Completed, exit 1**. Config, content, production build, unit, attribution and
  repository-wide Prettier passed. Unit: **2,757 tests in 192 files passed**
  (347.06 s). The project-base production build also passed.
- Python: **161/166 passed**. Four build-manifest provenance cases fail with
  `spawnSync git EPERM`, as recorded by earlier slices. The unchanged golden CLI
  tooling case additionally fails parsing empty subprocess stdout
  (`Unexpected end of JSON input` at `golden-manifest.test.mjs:151`); a standalone
  invocation with the canonical isolation option reproduces it. No tooling or
  assertions were changed to bypass these failures.
- Smoke and project-base e2e both stop before tests because their owned preview
  cannot start. Direct local-bind diagnosis returns
  `listen EPERM: operation not permitted 127.0.0.1:4233`.
  Browser/golden screenshot acceptance remains unverified in this sandbox;
  the 36 headless sonar render comparisons are byte-identical to baseline.
  Full gates require a rerun where subprocess provenance and preview startup
  work, with the golden CLI failure also resolved or diagnosed there.

## How to brief a migration

One slice per brief. For each inventory row: add an optional typed section to
`SiteManifest` and its validator branch, fill each site's `site.json`, replace the inline
list or comparison with a manifest read, delete the old constant. Keep behaviour
identical, add a validator table case for the new section, and keep the shipped-manifest
test green. Do not add settings or visual changes. Gate with `tools/gates.sh`.
