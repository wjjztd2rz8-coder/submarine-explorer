# S-manifest, step 1: manifest schema and habitat slice

**Closeable (2026-10-17): zero of the original 31 site-id discriminator
expressions remain.** The final wreck slice is recorded below; outstanding gate
environment limitations are tracked separately from the completed inventory.

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
sonar slice below, then four after sonar and two after terrain carve. The final
wreck slice removes rows 20 and 21: **0 discriminator expressions now remain**
from `plan/progress/2110-S-verify-9.md`. No further slice is needed for that inventory.
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

## Terrain-carve slice (2026-10-16)

Recounted the original 31-expression inventory against current `src/` before
editing: **four remained**, rows 14, 15, 20 and 21. This slice migrates the two
terrain selectors (14 and 15), outside the preceding sonar slice's renderer
and policy. **Two expressions remain**, both in `src/world/presets/WreckPreset.ts`:

| Row | Remaining expression                                                       |
| --: | -------------------------------------------------------------------------- |
|  20 | `pois.some`: Endurance hull eligibility for atmosphere, horizon and relief |
|  21 | `pois.find`: Endurance hull anchor lookup                                  |

The count follows the original inventory's tuning/selection scope. The title
backdrop's Monterey tile comparison selects whether to reuse an already-loaded
resource; it applies no per-site tuning and was outside that inventory.

The optional, strictly validated `terrain.carve` selects `"canyon-bend"` for
Monterey and `"sinkhole"` for Blue Hole. All other sites omit it. Unknown sites,
absent manifests and empty terrain policy return no carve. The existing shared
reconstruction algorithms, geographic anchors, numeric constants, tint centre
side effect and public API are unchanged. Both JSON files differ only by the
new terrain section; their existing sonar and other authored fields are intact.

Net simplification: the shared terrain path reads one policy instead of knowing
two site identities. A small typed selector replaces both inline site comparisons;
there is no new lookup table, helper, setting or UI. Schema/strict validation adds
17 production TypeScript lines and the consumer adds two. Geometry details stay
with the existing algorithms rather than expanding two strategy selectors into
a configurable terrain framework.

Before runtime edits, extended the existing terrain-feature capability suite and
froze four baseline snapshots: both reconstructions with real tile centres and
shifted centres. Each hashes a 5 m grid spanning the floor, banks, alcoves and
falloff boundaries at four incoming measured heights. Together they cover
**421,776 heights and 632,664 Blue Hole RGB tint triples**. Baseline: **8 tests
passed**. Snapshot SHA-256:
`ed3da0a984b01055ad5a3d0c87089664cebd88363906fc8e31b206092625d06b`.
The baseline file is unchanged after migration; no existing golden or assertion
was rebaselined or weakened.

Capability checks also move each policy to an unknown site and remove policy
from known sites. Validator table cases cover empty terrain, both strategies,
unknown fields, malformed sections and invalid strategies. The shipped-manifest
check requires exactly the two authored policies across all 13 sites.

The existing sonar relocation test initially mocked away every other manifest
section, inadvertently removing the newly data-selected terrain carve. Its mock
now relocates only the sonar policy and preserves real manifest reads for the
survey tile. Pixel, contour, label and relief assertions are unchanged; no sonar
runtime code or frozen render snapshots changed.

Validation:

- Focused terrain features, manifest validation, fidelity carve, Blue Hole props,
  carve agreement and sonar suites: **372 tests across six files passed** across
  the initial run and corrected sonar rerun (42/42). All four terrain baseline
  snapshots and all 36 pre-existing sonar baseline snapshots remain identical.
- Typecheck, changed-file Prettier and `git diff --check`: **passed**.
- Structural comparison against `HEAD`: terrain code is identical after
  normalizing only the manifest import/read and two strategy selectors; both
  JSON files retain every previous authored field.
- Gate invocation:
  `GATES_CONFIG_MODE=writable PW_PORT=4233 bash tools/gates.sh` (smoke + project-base).
  Logs: `.cache/runs/20261016-151650-2-5v9nZt/`. **Completed, exit 1**.
  Config, content, production build, unit, attribution and repository-wide
  Prettier passed. Unit: **2,831 tests in 192 files passed** (370.71 s).
  The project-base production build also passed.
- Python: **161/166 passed**. The same five failures documented by the sonar
  slice recur: four build-manifest cases report `spawnSync git EPERM`; the
  unchanged golden CLI case fails parsing empty subprocess stdout with
  `Unexpected end of JSON input` at `golden-manifest.test.mjs:151`.
- Smoke and project-base e2e stop before tests because their preview server
  cannot start. A direct bind check confirms
  `listen EPERM: operation not permitted 127.0.0.1:4233`.
  Browser screenshot acceptance remains unverified in this sandbox. Existing
  golden files are untouched, the four pre-edit terrain baselines and all 36
  sonar render baselines match exactly, and the reconstruction code is unchanged.
  Full gates and screenshot acceptance need a rerun where preview startup and
  the recorded tooling subprocess failures can be resolved.

## Wreck atmosphere/relief slice (2026-10-17)

Migrated the final two expressions, inventory rows 20 and 21 in
`WreckPreset.ts`. The optional, strictly validated `wreck` policy owns the hull
POI reference, eight particle values, five horizon values and the existing dome
name. Only Endurance authors it. `PresetSystem` supplies the current landmark's
manifest; the preset finds that configured POI once and uses it for atmosphere,
horizon and relief eligibility and for the relief position. The sonar policy is
unchanged and references the same authored hull.

Missing manifest, missing wreck policy and missing configured hull retain generic
wreck behavior. An explicit `titanicHorizon` still enables its original fallback
without a hull. Authored particle values retain precedence over mission overrides,
without mutating either input. Low retains the horizon and skips particles and
relief. All seeds, shaders, geometry builders, numeric values and draw accounting
are unchanged. Endurance's old `DEEP_OPENINGS.endurance.wreckAtmosphere` row is deleted;
its remaining water/light configuration is outside this slice.

Net simplification: two identity predicates and two POI traversals become one
data-owned anchor lookup. The consumer is ten lines shorter, and eleven lines
of the old tuning row are removed. Strict schema/validation adds 51 production
TypeScript lines and context wiring adds five; this small schema cost removes
identity knowledge and selected numeric tuning from the consumer. No new lookup
table, strategy framework, setting or UI is added.

Before runtime edits, extended the existing atmosphere capability spec and froze
nine scene snapshots across Low/Medium/High, authored/generic wrecks and the
explicit-horizon fallback without a hull. These record hashes of every geometry
attribute/index and shader, plus particle uniforms, atmosphere/fog, transforms,
visibility, material flags and draw/particle/light stats. Baseline: **13 tests
passed**. Snapshot SHA-256:
`bb7ca66d0ede5eb9b7eb1e746cfd8ffee25982f6871f464dcf27680ca48e9805`.
No snapshot update was run after the runtime migration.

Capability checks move policy to an unknown site and rename the anchor across all
three tiers, remove policy while retaining the old hull id, remove/mismatch the
configured hull, change authored tuning, select a moved anchor among competing
POIs and preserve mission-override precedence. The existing preset-system table
also exercises manifest forwarding across all 13 sites plus an unknown site on
all three tiers with the same hull id present everywhere. Validator table cases
cover omitted policy, missing/unknown fields, malformed sections, invalid strings,
nonfinite/wrong-type values, invalid counts/colors/sizes/fractions and disabled
particle/fog values. Shipped-content checks require the configured POI to exist
and agree with the unchanged sonar reference.

Recount: reviewed all 17 files from the original 31-expression inventory (including
the removed `MontereyOpening.ts`, now the generic `GroupOpening.ts`) and searched
all `src/` TypeScript for shipped site, prop and POI identity literals. **Zero
inventory discriminators remain; S-manifest is closeable.** Data-selected strategy
checks, configured-ID lookups, indexed tuning tables, model-family dispatch,
content definitions and startup/title resource selection are outside the original
count, as documented by the inventory and previous terrain slice. They do not
justify another migration in this brief. `plan/DIRECTOR.md` is left for the owner
to close the backlog item.

Validation:

- Focused atmosphere, manifest validation, preset system, terrain features, sonar
  equivalence, horizon and shared scour suites: **578 tests in seven files passed**
  (48.19 s). The nine pre-edit wreck scenes, four frozen terrain snapshots and
  all 36 frozen sonar snapshots match unchanged baselines.
- The production build includes typecheck and passed. `git diff --check` passed.
- Structural comparisons against `HEAD`: Endurance's JSON differs only by its
  new `wreck` section; `deepOpenings.ts` differs only by removal of the migrated
  row; all particle generation/update/disposal code and shaders are byte-identical.
  Terrain, sonar, relief and horizon algorithms, all existing snapshots and all
  golden files are untouched.
- Full gate invocation: `GATES_CONFIG_MODE=writable PW_PORT=4233 bash tools/gates.sh`
  (default smoke + project-base). Logs: `.cache/runs/20261017-010325-3-NkHwdJ/`.
  **Completed, exit 1.** Config, content, production build (including typecheck),
  unit, attribution and repository-wide Prettier passed. Unit: **3,014 tests in
  192 files passed** (570.04 s). The project-base production build also passed.
- Python: **161/166 passed**. The same five failures recorded by earlier slices
  recur: four build-manifest provenance cases report `spawnSync git EPERM`; the
  unchanged golden CLI tooling case fails parsing empty subprocess stdout with
  `Unexpected end of JSON input` at `golden-manifest.test.mjs:151`.
- Smoke and project-base e2e both stop before tests because their owned preview
  cannot start. A direct bind check confirms
  `listen EPERM: operation not permitted 127.0.0.1:4233`. Browser screenshot
  acceptance remains unverified in this sandbox. All existing golden files and
  frozen terrain/sonar outputs remain unchanged; full gates and screenshot
  acceptance require a rerun where preview startup and the recorded tooling
  subprocess failures can be resolved.
- Final progress-note formatting and `git diff --check`: **passed**.

## How to brief a migration

One slice per brief. For each inventory row: add an optional typed section to
`SiteManifest` and its validator branch, fill each site's `site.json`, replace the inline
list or comparison with a manifest read, delete the old constant. Keep behaviour
identical, add a validator table case for the new section, and keep the shipped-manifest
test green. Do not add settings or visual changes. Gate with `tools/gates.sh`.
