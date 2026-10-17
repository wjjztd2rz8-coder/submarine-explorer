# S-manifest — closing inventory audit

2026-10-17. Item: DIRECTOR Backlog 7, **S-manifest**. Baseline: `92ec9e0`.

The original **31 discriminator expressions in 17 files are closed**. A fresh
search of all `src/` found **zero additional unsanctioned site/landmark-ID or
authored prop/POI-ID tuning selectors**. One literal site comparison remains for
title-resource reuse, described below. Existing per-site tables still exist;
closure does not mean every site-related constant has moved into JSON.

No migration is warranted under this brief's existing-table exceptions. **Zero
tunings moved** (within the maximum of one). No source, manifest, visual, test,
snapshot or golden changes are needed. The existing capability tests already
cover the final wreck migration; a documentation-only audit adds no new test.
DIRECTOR Backlog 7 is marked done for inventory closure, with gate limitations
linked here rather than represented as a green gate result.

## Search and counting

Repeated the scope and counting convention from
[the original inventory](2110-S-verify-9.md): literal site/tile comparisons,
membership lists, indexed tables, aliases, and authored prop/POI IDs used as site
proxies. Reviewed all original consumer locations, including the removed
`MontereyOpening.ts` (now `GroupOpening.ts`). Searched all `src/`, not just those
17 files.

Representative repeatable searches from the repository root:

```sh
rg -n -i 'siteid|landmarkid|contentLandmark|propsLandmark|meta\.id|tileId' src
rg -n '===|!==|\.includes\(|\.has\(|switch\s*\(' src
rg -n 'new (Set|Map)|Record<string|Object\.fromEntries' src
rg -n -i 'titanic|bismarck|endurance|challenger-deep|lost-city|great-blue-hole|monterey-canyon|hudson-canyon|beebe-vent-field|axial-seamount-ashes|kamaehuakanaloa|hunga-tonga-caldera|blake-plateau-corals' src
```

Also collected the 215 distinct `id` values in `data/landmarks/*/*.json`,
including the test fixture, and inspected their exact quoted-string occurrences
in source. The site-name search additionally catches unquoted table keys and
named constants. Reviewed aliases such as `MONTEREY_TILE`, `SHOULDER_SHADOW`,
`hood`, `profile`, `policy` and `wreck` through their consumers. Capability names
that happen to equal a content ID (for example `shrimp`, `wall`, `debris`) are not
site guards. Local search captures are in `.cache/manifest-close/`.

## Remaining expressions and recommendations

Locations refer to the unchanged baseline source. These are the remaining
site-related hits requiring explanation, rather than a new tuning migration:

| Location                                                                                                                                                                    | Remaining expression or reference                                                                                                     | Recommendation                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/systems/title.ts:37,153`                                                                                                                                           | `ctx.meta?.id === MONTEREY_TILE`, where the constant is `monterey-canyon`; reuse the loaded title tile or load the same resource.     | **Keep.** Resource reuse, not per-site gameplay tuning. Already excluded by the original inventory and terrain/wreck slices.                                   |
| `src/core/Config.ts:58`; `src/app/systems/shell.ts:25`; `src/render/title/TitleTerrain.ts:30`                                                                               | Titanic default tile / first mission and Monterey title resource.                                                                     | **Keep** as explicit application resource choices, as previously sanctioned. Moving these into site manifests would reverse ownership.                         |
| `src/core/config/props.ts:184`                                                                                                                                              | `propManifest('karst-grotto')!.galleryApron!` supplies the legacy config default.                                                     | **Keep.** This is a derived view of manifest-owned values, not a separate tuning table. Preserve explicit config override and generic prop fallbacks.          |
| `src/game/Spawn.ts:30`                                                                                                                                                      | `MISSION_APPROACH_M`, derived from `allSiteManifests()`.                                                                              | **Keep.** No independently authored rows remain; preserve the unknown-site 220 m fallback.                                                                     |
| `src/world/ChallengerRelief.ts:16`                                                                                                                                          | `DEEP_OPENINGS['challenger-deep'].slopeShadow`.                                                                                       | **Keep** with the existing deep-opening table exception. A dedicated relief implementation reads the sanctioned row; it does not discriminate between sites.   |
| `src/world/presets/WreckPreset.ts:93,94`                                                                                                                                    | `ctx.site?.wreck` and `poi.id === policy.hullPoi`.                                                                                    | **Keep.** Configured anchor lookup. Neither old Endurance discriminator remains, and an unknown site with the same policy works.                               |
| `src/ui/Sonar.ts:528,532`; `src/world/terrainFeatures.ts:434`                                                                                                               | Manifest sonar anchor/reef/interval policy and terrain strategy selection.                                                            | **Keep.** The old Endurance/Blue Hole/Monterey identity guards are gone. `canyon-bend` / `sinkhole` select algorithms, not site IDs.                           |
| `src/game/Spawn.ts:57,158`; `src/game/DeepOpeningSpawn.ts:24,58`; `src/app/systems/props.ts:39,41`; `src/world/life/GroupOpening.ts:15`; `src/world/life/DeepOpening.ts:15` | Hero, aim-hero and habitat-anchor comparisons to configured IDs.                                                                      | **Keep.** Generic lookups into manifest-owned references; no literal site/hero guard.                                                                          |
| `src/world/Props.ts`; `src/world/props/builders/vents.ts`; `src/world/props/geo/beebe.ts`, `smokers.ts`, `stalactites.ts`, `towers.ts`                                      | `propManifest(def.id)` capabilities for grounding, seabed, habitat, crust, smoker/chimney profiles, grotto variant and apron habitat. | **Keep.** The former Beebe/Blue Hole/Lost City prop-ID proxies now select manifest capabilities. `beebe.ts:176` also gets its biome ID from the prop manifest. |
| `src/app/systems/audio.ts:72`; `src/game/Events.ts:20`; `src/app/systems/life.ts:75`; `src/app/systems/atmosphere.ts:29`; `src/core/config/atmosphere.ts:308`               | Manifest audio/event/life/atmosphere policy reads.                                                                                    | **Keep.** No hardcoded habitat membership or site comparisons remain in these consumers.                                                                       |

Other identity comparisons are generic and should stay generic: current-site
selection in `Journal`, `Globe` and `MissionSelect`; catalogue/routing matches in
`MissionRouter`, `Discovery`, `Presets.landmarkTypeFor` and shell/daily systems;
scan/award/photo ownership in `Scanner`, `Discovery`, `ProgressMigration`,
`JournalData` and explore/progress systems; manifest directory-ID validation in
`SiteManifest`; and requested site/tile consistency in `Currents.ts:34`.
**Recommendation for each: keep.** They compare runtime IDs uniformly, enforce
ownership or validate references; none supplies per-site tuning.

## Retained tables and model data

These are recorded explicitly so that closing the discriminator inventory does
not hide the remaining independent data. The original inventory's “Existing data
selections and related migration inputs” documents these tables; previous slices
retained them. This audit does not introduce another exception or extend one.

| Location                                                                                             | Remaining data                                                                                                                                         | Recommendation                                                                                                                                                               |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/world/TerrainBiome.ts:154`                                                                      | `BIOMES`: 13 keyed seabed palettes/scatter/relief profiles, plus `DEFAULT_BIOME`.                                                                      | **Retain the existing table.** Any future full biome consolidation needs its own explicit scope, including function-valued tint strategies and unknown-tile defaults.        |
| `src/core/config/terrain.ts:130,142,160`; `src/world/Terrain.ts:160`                                 | Monterey/Lost City fidelity constants and four keyed rows: Monterey, Lost City, Titanic, Blue Hole. Titanic's recent scour extends the existing table. | **Retain the existing table.** Preserve quality budgets, disabled/default paths and Low resolution. No new site branch accompanies the added Titanic row.                    |
| `src/core/config/deepOpenings.ts:4`                                                                  | `DEEP_OPENINGS`: Challenger and Endurance water, hemisphere and lamps; Challenger slope shadow.                                                        | **Retain the existing table.** Opening/life/wreck policy has already migrated; depth-band water composition and lamp precedence stay intact.                                 |
| `src/core/config/monterey.ts:2,17`; `src/world/props/geo/scarp.ts:125`                               | `MONTEREY_STRATA`, `MONTEREY_RUBBLE` and the scarp model's canyon preset.                                                                              | **Retain existing geological/model data.** No site-ID guard; changing its ownership now would expand this brief into visual geometry configuration.                          |
| `src/core/config/beebeChimney.ts:2`; `src/world/scatter/ScatterGeometry.ts:167`                      | `BEEBE_SCATTER_ROCK`, selected through the biome's fractured-basalt capability.                                                                        | **Retain the existing table.** Chimney profiles/eligibility have moved; this remaining geometry configuration is already inventoried.                                        |
| `src/core/config/props.ts:177`                                                                       | Shared `chimneyCrust` material parameters; per-prop eligibility now comes from manifests.                                                              | **Keep shared defaults.** Do not duplicate the same material constants into site data.                                                                                       |
| `src/game/ProgressMigration.ts:12`                                                                   | `PREVIOUS_OBJECTIVES`: five historical site rows.                                                                                                      | **Keep immutable migration history.** Current site data must not redefine old completion credit.                                                                             |
| `src/game/Cosmetics.ts:14`; `src/core/Save.ts:539`                                                   | Five-site `HERO_SITES` historical appearance-grant cohort.                                                                                             | **Keep the historical cohort.** A live manifest flag must not change old save grants.                                                                                        |
| `src/world/props/wrecks/index.ts:44`; `variants.ts:13,16`; `scatter.ts:373`; dedicated hull builders | Four hull variants, nine debris-kit rows and authored ship geometry.                                                                                   | **Keep reusable model registries.** `props.json` selects variants; variant dispatch and mesh names such as `endurance-hull` do not infer site policy.                        |
| `src/world/terrainFeatures.ts:18` onward; `src/world/presets/EnduranceRelief.ts`                     | Existing analytic reconstruction profiles, geographic reference, gallery/talus tables and scour algorithm constants.                                   | **Keep implementation data.** Manifest capabilities already choose the strategy/anchor; no remaining literal site selector. Preserve frozen terrain/sonar/scene equivalence. |
| `src/world/life/tables.ts:75`; `src/world/Currents.ts:160`; `src/game/Secrets.ts:73`                 | Generic loaders for site-keyed `data/life/life.json`, currents and secrets.                                                                            | **Keep existing content stores.** These contain no source-authored per-site rows; moving their formats is outside the requested inventory.                                   |

## Validation

Gate invocation:

```sh
GATES_CONFIG_MODE=writable PW_PORT=4245 bash tools/gates.sh
```

Run logs: `.cache/runs/20261017-161546-4-qZ1TLm/`; combined output:
`.cache/manifest-close/gates.log`. **Completed with exit 1.**

- **Pass:** config bundle, strict content validation, root production build
  (including typecheck), aggregate unit suite, attribution and repository-wide
  Prettier. Unit: **3,053 tests in 192 files passed**, 405.35 seconds. The
  project-base production build also succeeded before its browser startup.
- **Python: 161/166 passed.** Four unchanged build-manifest provenance cases fail
  with `spawnSync git EPERM`; the unchanged golden tooling wrapper fails because
  its Node suite receives empty subprocess output (`Unexpected end of JSON input`
  in `golden-manifest.test.mjs:151`). These are the same five failures recorded
  by the previous wreck slice, not failures introduced by documentation edits.
- **Smoke and project-base e2e:** both stop before tests with
  `Process from config.webServer was not able to start. Exit code: 1`.
  An independent direct bind diagnostic confirms
  `listen EPERM: operation not permitted 127.0.0.1:4245` in this sandbox. No
  browser or screenshot pass is claimed; browser acceptance requires a rerun
  where the preview server can start.
- `git diff --exit-code -- src data tests tools` passes: implementation, shipped
  data, tests (including frozen snapshots) and golden tooling are byte-for-byte
  unchanged from the baseline. Only this progress note and DIRECTOR's completion
  entry change. `git diff --check` and final note formatting pass.

Inventory closure is complete; **gates are not green in this environment**. No
assertion, budget, test runner, gate script or golden baseline was weakened to
work around the recorded failures.

The shipped capability coverage includes renamed hull/policy on an unknown site,
policy removal while retaining the old hull ID, missing/mismatched anchors,
policy-driven numeric changes and mission precedence in
`tests/unit/enduranceAtmosphere.test.ts`; frozen scene, terrain, sonar, opening
and atmosphere equivalence snapshots are unchanged. No snapshot update or golden
capture/rebaseline is performed. Browser acceptance is reported separately from
source/golden-file preservation.
