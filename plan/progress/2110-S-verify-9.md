# 2110 — S-manifest preparation and simplicity audit

Item: **S-manifest**. Baseline: `79aed4c`. Two rounds: inventory/comment cleanup,
then independent completeness and behavior-preservation checks. This is read-only
migration evidence: no branches, tuning, solver logic, data or schemas were migrated.
The only implementation edits remove package history from comments, including one
GLSL comment inside a template. Source-text test delimiters follow their renamed
comments; one spawn-source snapshot hash follows the comment-only change.

## Counting and scope

**31 hardcoded site-specific discriminator expressions in 17 source files:** 18 use site/tile
IDs and 13 use authored prop/POI IDs as proxies for site identity. These contain
**26 literal equality/inequality comparisons plus seven membership checks**. The
Monterey/Hudson event predicate and Challenger/Endurance life predicate each group
two comparisons, so 26 + 7 − 2 = 31 expressions. Counts describe decision/selection
sites, including `find`/`some` callbacks; an `else`, a repeated use of an alias, or
a site-keyed data row is not another discriminator. The backlog's “26 branches”
therefore omits the membership checks under this explicit counting convention.
Two additional prop-ID selectors already read a per-site ID list; their locations
and destinations are recorded with that table below (33 discriminator/selector
expressions including those two). Indexed tuning tables are counted separately.

Searched all `src/` TypeScript, including `siteId`, `landmarkId`, `site`,
`propsLandmark`, `contentLandmark`, `meta.id`, authored prop/POI IDs, literal
comparisons, membership sets and indexed tables. Reviewed aliases such as
`monterey`, `endurance`, `east` and `beebeHero` through their consumers. Locations
below refer to the resulting checkout. Comment-cleanup locations later in this
note deliberately refer to the baseline, including deleted comments.

Destinations below are **proposed fields of each site's future**
`data/landmarks/<id>/site.json`, not an approved schema. “Existing table” identifies
where interim tuning belongs under DIRECTOR rule 4. Strategies remain shared code;
JSON should select a strategy and supply parameters, never contain functions.

## Site/tile discriminators (18)

|   # | Location / discriminator                                                            | What it tunes                                                                                                                                  | Per-site destination / existing table                                                                                              |
| --: | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
|   1 | `src/app/systems/props.ts:36` — Challenger                                          | Register a boulder keepout around the lander bounds.                                                                                           | Challenger `scatter.keepoutHero`; extend `DEEP_OPENINGS`.                                                                          |
|   2 | `src/app/systems/props.ts:64` — Lost City                                           | Apply persistent chase defaults even when the pose has no Y override; otherwise apply pose overrides or a one-time radius.                     | Lost City `opening.camera.applyDefaults`; `FREE_DIVE_OPENINGS` / `lostCityArcadeOpening`.                                          |
|   3 | `src/app/systems/atmosphere.ts:28` — Monterey                                       | Alias feeds hemisphere fill at :36 and fallback lamp multipliers at :45.                                                                       | Monterey `atmosphere.hemisphere` / `lamps`; `MONTEREY_OPENING`.                                                                    |
|   4 | `src/app/systems/life.ts:73` — Monterey                                             | Select staged opening wildlife population.                                                                                                     | Monterey `life.opening.strategy/groups`; `MONTEREY_OPENING`.                                                                       |
|   5 | `src/app/systems/life.ts:76` — Challenger OR Endurance                              | Select deep opening wildlife population for two sites.                                                                                         | Each site's `life.opening`; `DEEP_OPENINGS.*.habitat`.                                                                             |
|   6 | `src/app/systems/audio.ts:71` — membership: Monterey, Kamaʻehuakanaloa, Axial       | Allow habitat whale calls. This differs from event whale eligibility.                                                                          | Each site's `audio.whaleHabitat`; currently an inline list, consolidate with event habitat data without changing the two policies. |
|   7 | `src/game/Spawn.ts:139` — Lost City                                                 | Add local altitude to the mission candidate score to prefer the visible shelf over the valley.                                                 | Lost City `opening.mission.localAltitudeWeight`; `MISSION_APPROACH_M` needs a richer row.                                          |
|   8 | `src/game/Spawn.ts:264` — Lost City AND Arcade                                      | Override free-dive range and chase radius/X/Y by gameplay mode.                                                                                | Lost City `opening.freeDive.modes.arcade`; `FREE_DIVE_OPENINGS`, with values currently in `DEFAULT_CAMERA.lostCityArcadeOpening`.  |
|   9 | `src/game/DeepOpeningSpawn.ts:27` — Kamaʻehuakanaloa                                | Select pillow-field framing and vent aim target instead of `deepOpeningFor`.                                                                   | Kamaʻehuakanaloa `opening.freeDive`; merge `KAMAEHUAKANALOA_OPENING` into the existing opening table.                              |
|  10 | `src/core/config/atmosphere.ts:319` — Low AND membership in `LOW_READABILITY_SITES` | Raise ambient intensity to at least 3 below −200 m for Axial, Bismarck, Blake, Hudson, Hunga and Kamaʻehuakanaloa.                             | Each site's `atmosphere.tiers.low`; existing `LOW_READABILITY_SITES` / `LOW_SEABED_LIGHT`.                                         |
|  11 | `src/game/Events.ts:22` — `VENTS.has(h.site)`                                       | Plumes below 70 m altitude at Axial, Beebe and Kamaʻehuakanaloa.                                                                               | Each site's `events.plume.maxAltitudeM`; existing `VENTS`.                                                                         |
|  12 | `src/game/Events.ts:23` — `CANYONS.has(h.site)`                                     | Turbidity below 45 m altitude at Monterey, Hudson and Hunga.                                                                                   | Each site's `events.turbidity.maxAltitudeM`; existing `CANYONS`.                                                                   |
|  13 | `src/game/Events.ts:25` — Monterey OR Hudson                                        | Whale event eligibility above the configured shallow-depth threshold.                                                                          | Each site's `events.whale.maxDepthM`; consolidate the event sets in a per-site habitat table.                                      |
|  14 | `src/world/terrainFeatures.ts:412` — Monterey                                       | Select S-bend carve: wall anchor, 170 m offset, winding axis, floor slope, banks and end falloff.                                              | Monterey `terrain.carve` strategy/parameters; existing `MONTEREY_FIDELITY` holds related detail settings.                          |
|  15 | `src/world/terrainFeatures.ts:433` — reject non-Blue-Hole                           | Select reconstructed sinkhole carve, centre, radius, lip, alcoves, wall/floor relief.                                                          | Blue Hole `terrain.carve`; existing Blue Hole fidelity row and `blueHoleApron` hold related tuning.                                |
|  16 | `src/ui/Sonar.ts:529` — Endurance AND flat terrain                                  | Use hull-relative scour ridges rather than absolute bathymetry for contour heights; alias feeds :530 and :545–548, relief/shading at :585–595. | Endurance `sonar.relief` strategy, POI anchor and scour parameters; share with Endurance terrain relief.                           |
|  17 | `src/ui/Sonar.ts:532` — Blue Hole                                                   | Cap nominal contour interval at 10 m before local adaptation.                                                                                  | Blue Hole `sonar.maxContourIntervalM`; extend a per-site sonar profile (none exists yet).                                          |
|  18 | `src/ui/Sonar.ts:551` — Blue Hole                                                   | Project the sinkhole centre and enable reef shading only when that centre lies on the current tile.                                            | Blue Hole `sonar.reef` / `terrain.carve.centre`; retain the contains guard.                                                        |

## Prop/POI discriminators (13)

These are identity branches even though they do not spell `siteId`. Bind the
relevant prop/POI in site data; geometry extensions can remain in `props.json`.

|   # | Location / discriminator                                                             | What it tunes                                                                                                                                                                               | Per-site destination / existing table                                                                             |
| --: | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
|  19 | `src/app/systems/props.ts:37` — find `leggo-lander-marker`                           | Choose the actual keepout bounds after Challenger props load.                                                                                                                               | Challenger `scatter.keepoutHero`; reuse `DEEP_OPENINGS['challenger-deep'].hero`.                                  |
|  20 | `src/world/presets/WreckPreset.ts:93` — any `endurance-hull` POI                     | Detect Endurance; :94 chooses particle overrides, :100 enables horizon, :103 chooses five horizon settings, :113 names it, :118 enables relief.                                             | Endurance `atmosphere.wreck`, `horizon` and `terrain.relief`; existing `DEEP_OPENINGS.endurance.wreckAtmosphere`. |
|  21 | `src/world/presets/WreckPreset.ts:117` — find `endurance-hull`                       | Anchor the visual scour relief to the hull POI.                                                                                                                                             | Endurance `terrain.relief.anchorPoi`; share the same anchor with sonar.                                           |
|  22 | `src/ui/Sonar.ts:735` — find `endurance-hull`                                        | Anchor hull outline, contour ridges and wreck map details.                                                                                                                                  | Endurance `sonar.hullPoi`; same anchor as #21.                                                                    |
|  23 | `src/world/Props.ts:103` — membership in three Beebe chimney IDs                     | Avoid footprint snapping for optional terrain-following cool-flow habitat; growing decorative bounds must not sink chimneys.                                                                | Beebe `props.<id>.grounding`; existing `props.json` `beebe_habitat` rows.                                         |
|  24 | `src/world/Props.ts:276` — Beebe chimney 1 AND smoker-cluster                        | Inject the material that blends the foundation into the rendered seabed.                                                                                                                    | Beebe `props.<id>.seabedMaterial`; existing `beebe_seabed` extension, with biome reference.                       |
|  25 | `src/world/Props.ts:313` — membership in three Beebe chimney IDs                     | Use the Beebe rendered-ground sampler, when habitat is present and feature is null; preserve local transform/scaling.                                                                       | Beebe `props.<id>.grounding.strategy`; same extension as #23.                                                     |
|  26 | `src/world/props/geo/beebe.ts:39` — reject unless Beebe chimney 1 AND smoker-cluster | Admit the authored optional apron settings. Validation follows separately.                                                                                                                  | Beebe `props.<id>.seabed`; existing `props.json.beebe_seabed`.                                                    |
|  27 | `src/world/props/geo/beebe.ts:252` — membership in three Beebe chimney IDs           | Admit cool-flow worm/mussel/rubble habitat around those foundations.                                                                                                                        | Beebe `props.<id>.habitat`; existing `beebe_habitat`.                                                             |
|  28 | `src/world/props/geo/smokers.ts:53` — Beebe chimney 1                                | `beebeHero` controls tier mesh segments/rings, crust, shelves, wobble/roughness/ridges/lips/craters, plume top selection, glow and side orifices/collars (:97–112, :178, :186, :231, :235). | Beebe `props.<id>.smoker`; existing `BEEBE_CHIMNEY`, `BEEBE_SIDE_CHIMNEYS` and `chimneyCrust`.                    |
|  29 | `src/world/props/geo/stalactites.ts:181` — `karst-grotto-east`                       | `east` changes mouth profile, scallop scale, cavity material/shader, pendant clusters, placement, length and sinking (:188, :218, :225, :514–543).                                          | Blue Hole `props.<id>.grotto`; add a named variant/parameters to that prop's existing row.                        |
|  30 | `src/world/props/geo/towers.ts:464` — Poseidon AND non-lone tower                    | Add three inactive-apron coral/anemone patches, with ray-seated placement, independent RNG and tier counts.                                                                                 | Lost City `props.poseidon-tower.apronHabitat`; existing prop row, alongside carbonate detail settings.            |
|  31 | `src/world/life/MontereyOpening.ts:14` — find `canyon-wall-ledge`                    | Limit staged wildlife to the opening ledge's habitat radius.                                                                                                                                | Monterey `life.opening.anchorHero`; extend `MONTEREY_OPENING`.                                                    |

## Existing data selections and related migration inputs

These tables/defaults are additional inventory, **not extra literal branches**.
Defaults and missing-row fallbacks must survive consolidation. Do not copy every
shared rendering or physics constant into thirteen manifests.

| Location                                                                                                                       | Existing data and consumer                                                                                                                                                                                                      | Destination / preservation constraint                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/game/Spawn.ts:29`, :151, :175                                                                                             | `MISSION_APPROACH_M`: 13 rows; `FREE_DIVE_OPENINGS`: 13 rows. Mission reads both at :64–65; free dive at :260; scan reach at :47.                                                                                               | All sites `opening.mission` and `opening.freeDive`. Preserve unknown-site 220 m/default bearing and absent-hero fallbacks.                                       |
| `src/app/systems/mission.ts:23`, :218                                                                                          | `APPROACH_DESTINATIONS`: 13 human-readable first-contact labels, fallback target name.                                                                                                                                          | All sites `opening.mission.destinationLabel`.                                                                                                                    |
| `src/core/config/deepOpenings.ts:4`, :89, :94                                                                                  | `DEEP_OPENINGS`: Challenger and Endurance framing, atmosphere, lamps, staged habitat; Endurance wreck particles/deck patch. `deepSiteWater` overrides bands at/below −1000 m, with optional snow.                               | Each site's opening, atmosphere and life sections; preserve per-band cutoff and optional values.                                                                 |
| `src/core/config/lowTierFraming.ts:2`                                                                                          | One Kamaʻehuakanaloa framing row with separate pillow hero and vent aimHero.                                                                                                                                                    | Its free-dive opening; do not collapse the two anchors.                                                                                                          |
| `src/core/config/camera.ts:46`, :72                                                                                            | Lost City Arcade range 38, chase radius 66, X −8, Y 30.                                                                                                                                                                         | Lost City opening mode override; leave global camera defaults shared.                                                                                            |
| `src/core/config/monterey.ts:2`, :18, :33                                                                                      | `MONTEREY_OPENING`, `MONTEREY_STRATA`, `MONTEREY_RUBBLE`: hemisphere/lamps/wildlife, irregular bedding and rockfall.                                                                                                            | Monterey atmosphere, life and prop geology settings.                                                                                                             |
| `src/core/config/beebeChimney.ts:2`, :43, :60                                                                                  | `BEEBE_CHIMNEY`, `BEEBE_SCATTER_ROCK`, two side-chimney rows.                                                                                                                                                                   | Beebe prop geometry/scatter settings; preserve independent seeds and tier rules.                                                                                 |
| `src/core/config/props.ts:188`, :195                                                                                           | Beebe `chimneyCrust` ID list and material parameters; Blue Hole apron shading/geometry. Two consumers already test that configurable ID list: `src/world/props/builders/vents.ts:188` and `src/world/props/geo/smokers.ts:217`. | Corresponding site's prop/material sections; keep ordinary procedural family defaults shared.                                                                    |
| `src/world/TerrainBiome.ts:154`, :418                                                                                          | `BIOMES`: 13 rows; unknown-site `DEFAULT_BIOME`. Texture sets, color/stain, roughness, scatter, relief, optional tints/rock detail.                                                                                             | Each site's `biome`. Function-valued tint callbacks become shared strategy names, with parameters in data.                                                       |
| `src/core/config/terrain.ts:112`, :124, :140; `src/world/Terrain.ts:158`                                                       | Monterey/Lost City fidelity constants and three keyed profiles (also Blue Hole), tier subdivision/wall limits, focus, relief/normal detail; optional Low resolution.                                                            | Each site's `terrain.fidelity`; preserve disabled/default paths and exact tier budgets.                                                                          |
| `src/world/ChallengerRelief.ts:16`; `src/world/life/DeepOpening.ts:44`                                                         | Challenger shade takes `DEEP_OPENINGS` slope-shadow parameters. `onWreck` wildlife binds literal mesh `endurance-hull` at :46 and literal Endurance deckPatch at :49.                                                           | Challenger biome shading; Endurance `life.opening.mesh/deckPatch`. The latter is a data-gated selection, not another ID comparison in the 31-count.              |
| `src/world/props/geo/beebe.ts:175`                                                                                             | Dedicated Beebe builder asks `biomeFor('beebe-vent-field')`.                                                                                                                                                                    | Pass its site biome/material into the shared builder; no hardcoded identity lookup.                                                                              |
| `src/world/life/catalogue.ts:14`, :799; `src/world/life/catalogueInvert.ts:11`; `src/world/life/tables.ts:75`                  | Species definitions are TS literals; site spawning is already keyed JSON (`data/life/life.json`). Species references also appear in Monterey/deep habitat tables.                                                               | Species catalogue JSON remains shared; each site references species IDs and owns its spawn/habitat table. Preserve parsed validation, depth bands and tier caps. |
| `src/world/Currents.ts:31`, :160                                                                                               | Already loads `data/currents/<site>.json`; checks requested site and tile, missing/malformed data gives zero flow.                                                                                                              | Site `currents` reference/section; retain provenance, grid validation and masked-corner policy. No site-literal branch exists here.                              |
| `src/game/Secrets.ts:72`                                                                                                       | Already loads `data/secrets/<site>.json`, with ID safety checks and empty fallback.                                                                                                                                             | Site `secrets` reference/section; preserve optional loading and discovery IDs. No site-literal branch exists here.                                               |
| `src/game/ProgressMigration.ts:12`, :57                                                                                        | `PREVIOUS_OBJECTIVES`: five site rows of historical objective sets.                                                                                                                                                             | Keep as explicit versioned migration history; relocating to live site data must not make old saves depend on current content.                                    |
| `src/game/Cosmetics.ts:14`; `src/core/Save.ts:530`                                                                             | Five `HERO_SITES` used when migrating historical appearance awards.                                                                                                                                                             | A historical reward cohort, not current opening tuning. Preserve that exact cohort; a future site flag must not silently change old grants.                      |
| `src/core/Config.ts:59`; `src/app/systems/shell.ts:25`; `src/app/systems/title.ts:37`; `src/render/title/TitleTerrain.ts:30`   | Default tile/first mission is Titanic; title backdrop/crop is Monterey.                                                                                                                                                         | App defaults/title-scene selection, not conditional per-site gameplay tuning; keep explicit app-level references.                                                |
| `src/world/props/wrecks/index.ts:43`, :45–52; `src/world/props/wrecks/variants.ts:13`; `src/world/props/wrecks/scatter.ts:367` | Four hull-builder switch arms and eight debris-kit rows select authored model variants; some variant names equal landmark IDs.                                                                                                  | Preserve reusable model registry; props select their variant in existing `props.json`. Dedicated wreck model construction is not a shared site-tuning branch.    |

Generic identity matching is deliberately separate: Journal/Globe current-site
selection, Scanner/Discovery keys, catalogue lookup, content-folder safety checks,
`Currents` site/tile consistency, and dynamically selected opening hero/aimHero
lookups operate identically for every ID. They have no per-site parameters to
move. `feature`, material, archetype and quality-tier switches likewise describe
capabilities; they count only when combined with a literal site/hero guard above.

## Spawn.ts / DeepOpeningSpawn.ts duplication

| Repeated operation                                                            | Spawn.ts           | DeepOpeningSpawn.ts | Consolidation input / distinction to preserve                                                                                                                            |
| ----------------------------------------------------------------------------- | ------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Opening/hero lookup and valid nonempty bounds                                 | :260–274           | :27–29              | One resolved opening row, including independent aimHero; missing content retains the previous pose.                                                                      |
| Update world matrix, bounds centre/half extents, local-to-world target        | :275–284           | :30–39              | One geometry helper. Base adjusts chimney aim to solid height (:278–282); wrapper currently uses full bounds centre.                                                     |
| Footprint edge distance, direction and requested range                        | :295–312           | :33–40              | One framing strategy. Base supports fromCentre, local bearing and alternate turns; wrapper uses the accepted base bearing in world space and adds edge + authored range. |
| Sample approach floor eight times at t=i/10                                   | :314–323           | :41–48              | Same clearance sampling. Base skips samples for openWater; wrapper always samples.                                                                                       |
| Clamp Y to floor clearance, requested altitude and safe depth; reject surface | :287–288, :324–330 | :49–58              | Same safety helper. Base also enforces minSeabedAltitudeM, optional altitude/default target+12 and tile bounds (:313); wrapper does not recheck tile bounds.             |
| Hull collision rejection using radius + 4                                     | :331               | :54–58              | Preserve fallback: base continues candidate search; wrapper returns the accepted base pose.                                                                              |
| CameraRig, flat normal sampler, 16:9 setup, chase defaults and snap           | :291–294, :333–336 | :67–76              | One rig-clearance helper. Wrapper can aim at another prop and carries portrait offsets; base only returns radius/X/Y.                                                    |
| Six radius-6 collision samples along chase arm                                | :338–342           | :77–78              | Same camera-arm check and different fallback behavior as above.                                                                                                          |
| Return pose and chase offsets                                                 | :346–354           | :79–88              | One output type; retain optional portraitChaseOffset and absent-vs-explicit camera settings.                                                                             |

`DeepOpeningSpawn.composedFreeDiveSpawn` (:91–94) calls the complete base search
then reframes its chosen result. For the three tuned sites this repeats bounds,
floor, hull and camera work; it does not rescore alternate bearings after
reframing fails. Consolidation should eventually search with the resolved final
framing once, with explicit compatibility guards before changing those outcomes.
Its `composedMissionSpawn` (:96–100) is only a pass-through, not another solver.

Within `Spawn.ts`, mission (:51–148) and free-dive (:250–358) also duplicate world
bounds, clearance sums, candidate turns, collision checks, camera setup and scoring.
They intentionally target different subjects: mission uses first-primary 3D range,
24 floor samples, six altitude reconciliation passes, transit/other-primary guards
and eight chase samples; free dive uses hero footprint framing, optional open water,
ten bearings and six chase samples. `chooseSpawn`, `nearestDeepCell`, hull fitting
and `nearSiteSpawnPose` are separate fallback/navigation capabilities; do not delete
them merely because they share the module.

## Round 2 verification

Comment-only cleanup; smoke + project-base gates passed on merge.

## DIRECTOR rule 7 comment inventory and cleanup

Baseline locations below identify the 306 cleaned historical comments, including deleted fences.
Adjacent continuation sentences were polished where needed for grammar.
Each entry is `line: historical marker`; semicolon-separated entries are distinct
comments. Headers/API comments retain useful contracts and rationale with the
history removed; empty fences are deleted. Numbered regression names, filenames,
cache keys, snapshots and content IDs are outside this comment-only cleanup.
Musical pitches C5/E5/G5/C6, C1 mathematical continuity, physical quantities,
scientific dates, color hexes and reference standards are not package numbers.

**306 comments across 173 files** (31 CSS comments). The ledger also removes the unnumbered QA fence adjacent to the numbered hull safeguards.

| File (baseline)                            | Comment lines and removed history                                                                                    |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `src/app/Disposables.ts`                   | 1: F1-FIXES, F0-CORE                                                                                                 |
| `src/app/System.ts`                        | 1: F0-CORE; 28: F0                                                                                                   |
| `src/app/boot.ts`                          | 67: B3; 87: C5; 91: A2                                                                                               |
| `src/app/context.ts`                       | 1: F0-CORE, F0; 161: F3-ONBOARD                                                                                      |
| `src/app/loop.ts`                          | 1: F0-CORE                                                                                                           |
| `src/app/systems.ts`                       | 1: F0-CORE                                                                                                           |
| `src/app/systems/atmosphere.ts`            | 1: A2; 72: D2-HAZARD                                                                                                 |
| `src/app/systems/audio.ts`                 | 1: A4, C5                                                                                                            |
| `src/app/systems/camera.ts`                | 1: A3, D2-CAMERA; 21: A3                                                                                             |
| `src/app/systems/discovery.ts`             | 1: B1; 69: B3                                                                                                        |
| `src/app/systems/hud.ts`                   | 34: D2-HAZARD                                                                                                        |
| `src/app/systems/life.ts`                  | 1: F2-LIFE                                                                                                           |
| `src/app/systems/mission.ts`               | 1: B3, D2-PREDIVE; 49: D2-PREDIVE; 178: D2-PREDIVE                                                                   |
| `src/app/systems/photo.ts`                 | 25: F2-LIFE                                                                                                          |
| `src/app/systems/pointer.ts`               | 1: D3-FEEL, D2-CAMERA; 57: D3-FEEL; 224: D2-CAMERA; 226: D3-FEEL                                                     |
| `src/app/systems/power.ts`                 | 1: D2-HAZARD; 27: D2-HAZARD                                                                                          |
| `src/app/systems/presets.ts`               | 1: C3                                                                                                                |
| `src/app/systems/props.ts`                 | 1: B4                                                                                                                |
| `src/app/systems/quality.ts`               | 1: F0-CORE                                                                                                           |
| `src/app/systems/render.ts`                | 1: A2; 77: C5; 84: A2                                                                                                |
| `src/app/systems/settings.ts`              | 1: C5; 66: D3-FEEL                                                                                                   |
| `src/app/systems/shell.ts`                 | 1: C1; 87: D2-PREDIVE; 202: C1                                                                                       |
| `src/app/systems/submarine.ts`             | 28: QA-B #3; 32: QA-B #2 (deleted); 53: B3; 89: F1-VEHICLES; 93: QA-B #6; 118: A3, A4                                |
| `src/app/systems/touch.ts`                 | 1: F1-TOUCH                                                                                                          |
| `src/app/systems/world.ts`                 | 46: QA-B #1                                                                                                          |
| `src/audio/AudioSystem.ts`                 | 27: C3 (deleted); 29: C3 (deleted); 32: A4; 223: A3; 240: C3 (deleted); 253: C3 (deleted); 254: B1                   |
| `src/audio/events.ts`                      | 1: A1, A2, A3; 19: A4                                                                                                |
| `src/core/Config.ts`                       | 1: F0-CORE                                                                                                           |
| `src/core/EventBus.ts`                     | 24: A3; 31: A2; 41: B1; 55: B3; 74: B4; 76: C3; 83: C1; 90: C5                                                       |
| `src/core/Input.ts`                        | 37: A2; 39: B1; 47: B1; 301: F1-TOUCH; 684: F1-TOUCH                                                                 |
| `src/core/Pwa.ts`                          | 1: F1-TOUCH                                                                                                          |
| `src/core/Quality.ts`                      | 1: F0-CORE                                                                                                           |
| `src/core/Touch.ts`                        | 1: F1-TOUCH                                                                                                          |
| `src/core/assets/AssetService.ts`          | 1: F0-CORE                                                                                                           |
| `src/core/assets/index.ts`                 | 1: F0-CORE                                                                                                           |
| `src/core/assets/manifest.ts`              | 1: F0-CORE                                                                                                           |
| `src/core/config/atmosphere.ts`            | 1: F0-CORE; 74: F1-OCEAN; 76: F1-OCEAN; 78: F1-OCEAN; 80: F1-OCEAN; 85: A2; 103: A2; 176: A2; 186: QA-B #4; 305: 990 |
| `src/core/config/audio.ts`                 | 1: F0-CORE                                                                                                           |
| `src/core/config/camera.ts`                | 1: F0-CORE; 24: A3                                                                                                   |
| `src/core/config/discovery.ts`             | 1: B1, F0-CORE; 31: B1; 83: B1                                                                                       |
| `src/core/config/gameplay.ts`              | 1: F0-CORE                                                                                                           |
| `src/core/config/mission.ts`               | 1: F0-CORE; 6: B3; 27: QA-B #3; 37: B3                                                                               |
| `src/core/config/presets.ts`               | 1: F0-CORE; 8: C3; 224: C3                                                                                           |
| `src/core/config/props.ts`                 | 1: F0-CORE; 6: B4; 127: B4                                                                                           |
| `src/core/config/quality.ts`               | 1: F0-CORE                                                                                                           |
| `src/core/config/submarine.ts`             | 1: F0-CORE; 46: A3; 82: A3; 93: A3; 99: A3; 105: QA-B; 106: QA-B #15; 113: QA-B #2; 119: QA-B #14; 131: QA-B #6      |
| `src/core/config/terrain.ts`               | 1: F0-CORE; 16: F1-TERRAIN; 20: F1-TERRAIN; 161: QA-B #4                                                             |
| `src/core/config/types.ts`                 | 1: F0-CORE; 51: B1; 53: B4; 55: B3; 57: C5; 64: C5; 67: C1; 70: C3; 72: F0-CORE                                      |
| `src/core/config/ui.ts`                    | 1: F0-CORE; 11: C1; 61: C5; 122: C5; 219: C1                                                                         |
| `src/game/ContentPath.ts`                  | 1: B4, B3                                                                                                            |
| `src/game/Discovery.ts`                    | 1: B1; 228: QA-B #6; 239: QA-B #10; 285: B3                                                                          |
| `src/game/Guide.ts`                        | 1: B2; 42: B1                                                                                                        |
| `src/game/Hints.ts`                        | 1: F3-ONBOARD                                                                                                        |
| `src/game/JournalData.ts`                  | 116: F2-LIFE; 423: F2-LIFE                                                                                           |
| `src/game/Mission.ts`                      | 1: B3                                                                                                                |
| `src/game/MissionRouter.ts`                | 1: B3, B1, B4; 83: QA-B #13; 228: QA-B #11; 289: B1; 475: QA-B #10                                                   |
| `src/game/Objectives.ts`                   | 90: B3                                                                                                               |
| `src/game/Pois.ts`                         | 1: B2                                                                                                                |
| `src/game/Scanner.ts`                      | 151: F2-LIFE                                                                                                         |
| `src/game/Spawn.ts`                        | 1: QA-B #2                                                                                                           |
| `src/game/Tutorial.ts`                     | 1: F3-ONBOARD                                                                                                        |
| `src/game/TutorialSave.ts`                 | 1: F3-ONBOARD                                                                                                        |
| `src/render/caustics.ts`                   | 1: F1-OCEAN                                                                                                          |
| `src/shaders/underwater.ts`                | 260: QA-B #4; 421: QA-B #8                                                                                           |
| `src/styles/camera.css`                    | 1: D2-CAMERA, F0-CORE                                                                                                |
| `src/styles/currents.css`                  | 1: F0-CORE                                                                                                           |
| `src/styles/fatal.css`                     | 1: F0-CORE                                                                                                           |
| `src/styles/flow.css`                      | 1: F0-CORE                                                                                                           |
| `src/styles/globe.css`                     | 1: C1, F0-CORE                                                                                                       |
| `src/styles/hud.css`                       | 1: F0-CORE                                                                                                           |
| `src/styles/hull-warnings.css`             | 1: QA-B, QA-C, F0-CORE                                                                                               |
| `src/styles/input-hud.css`                 | 1: F0-CORE                                                                                                           |
| `src/styles/journal-debrief.css`           | 1: B1, F0-CORE                                                                                                       |
| `src/styles/journal.css`                   | 1: F0-CORE                                                                                                           |
| `src/styles/menus.css`                     | 1: F0-CORE                                                                                                           |
| `src/styles/mission-select.css`            | 1: F0-CORE                                                                                                           |
| `src/styles/mission.css`                   | 1: B3, F0-CORE; 228: QA-C #2; 344: B1                                                                                |
| `src/styles/modes.css`                     | 1: F0-CORE; 28: F2-MODES                                                                                             |
| `src/styles/photo.css`                     | 1: F0-CORE                                                                                                           |
| `src/styles/power.css`                     | 1: F0-CORE                                                                                                           |
| `src/styles/predive.css`                   | 1: D2-PREDIVE, F0-CORE; 273: F-BRIEFING-900                                                                          |
| `src/styles/props-debug.css`               | 1: B4, F0-CORE                                                                                                       |
| `src/styles/scan.css`                      | 1: B1, F0-CORE                                                                                                       |
| `src/styles/settings.css`                  | 1: C5, F0-CORE; 182: F3-AUDIO                                                                                        |
| `src/styles/sonar-photo.css`               | 1: D2-SONARPHOTO, F0-CORE                                                                                            |
| `src/styles/sonar.css`                     | 1: F0-CORE                                                                                                           |
| `src/styles/start.css`                     | 1: F0-CORE                                                                                                           |
| `src/styles/tokens.css`                    | 1: F0-CORE                                                                                                           |
| `src/styles/touch.css`                     | 1: F1-TOUCH                                                                                                          |
| `src/styles/waypoints.css`                 | 1: F0-CORE                                                                                                           |
| `src/sub/SubMesh.ts`                       | 1: F1-VEHICLES; 39: QA-B #6                                                                                          |
| `src/sub/Submarine.ts`                     | 286: QA-B #15; 364: QA-B #3                                                                                          |
| `src/ui/Briefing.ts`                       | 1: B3, QA-B #12, D2-PREDIVE; 46: D2-PREDIVE; 74: D2-PREDIVE; 140: D2-PREDIVE; 217: D2-PREDIVE                        |
| `src/ui/Captions.ts`                       | 1: C5                                                                                                                |
| `src/ui/ControlsCard.ts`                   | 1: F3-ONBOARD                                                                                                        |
| `src/ui/Debrief.ts`                        | 118: B3; 120: QA-B #12                                                                                               |
| `src/ui/Globe.ts`                          | 1: C1                                                                                                                |
| `src/ui/GlobeModel.ts`                     | 1: C1                                                                                                                |
| `src/ui/HUD.ts`                            | 54: QA-B #3c; 65: QA-B #14; 87: QA-B #2                                                                              |
| `src/ui/Home.ts`                           | 27: C1; 33: D2-PREDIVE                                                                                               |
| `src/ui/Journal.ts`                        | 1084: F2-LIFE                                                                                                        |
| `src/ui/MissionSelect.ts`                  | 1: B3, C1; 26: C1; 66: C1; 77: C1 (deleted); 107: C1; 193: C1; 206: C1                                               |
| `src/ui/ModeSelector.ts`                   | 1: D2-PREDIVE                                                                                                        |
| `src/ui/Settings.ts`                       | 1: C5; 228: D2-PREDIVE; 272: D2-PREDIVE; 563: D2-PREDIVE                                                             |
| `src/ui/Sonar.ts`                          | 34: C5; 71: QA-A #1; 321: C5; 460: C5                                                                                |
| `src/ui/TouchControls.ts`                  | 1: F1-TOUCH                                                                                                          |
| `src/vehicles/Vehicle.ts`                  | 1: F1-VEHICLES                                                                                                       |
| `src/vehicles/Wash.ts`                     | 1: F1-VEHICLES                                                                                                       |
| `src/vehicles/cockpit.ts`                  | 1: F1-VEHICLES                                                                                                       |
| `src/vehicles/decals.ts`                   | 1: F1-VEHICLES                                                                                                       |
| `src/vehicles/hulls.ts`                    | 1: F1-VEHICLES                                                                                                       |
| `src/vehicles/index.ts`                    | 1: F1-VEHICLES                                                                                                       |
| `src/vehicles/kit.ts`                      | 1: F1-VEHICLES                                                                                                       |
| `src/vehicles/materials.ts`                | 1: F1-VEHICLES, QA-B #6                                                                                              |
| `src/vehicles/parts.ts`                    | 1: F1-VEHICLES                                                                                                       |
| `src/vehicles/textures.ts`                 | 1: F1-VEHICLES                                                                                                       |
| `src/world/Landmarks.ts`                   | 1: QA-B #1                                                                                                           |
| `src/world/Props.ts`                       | 101: 850; 275: 930; 279: 930; 311: 850; 323: 850                                                                     |
| `src/world/TerrainBiome.ts`                | 284: 780                                                                                                             |
| `src/world/Water.ts`                       | 1: A2, F1-OCEAN                                                                                                      |
| `src/world/life/types.ts`                  | 1: F2-LIFE                                                                                                           |
| `src/world/presets/types.ts`               | 81: C3                                                                                                               |
| `src/world/props/Wiring.ts`                | 1: B4                                                                                                                |
| `src/world/props/builders/debris.ts`       | 1: F0-CORE                                                                                                           |
| `src/world/props/builders/generic.ts`      | 1: F0-CORE                                                                                                           |
| `src/world/props/builders/shared.ts`       | 1: F0-CORE                                                                                                           |
| `src/world/props/builders/vents.ts`        | 1: F0-CORE                                                                                                           |
| `src/world/props/builders/wrecks.ts`       | 1: F0-CORE                                                                                                           |
| `src/world/props/geo/beebe.ts`             | 163: 850                                                                                                             |
| `tests/e2e/atmosphere.spec.ts`             | 4: A2                                                                                                                |
| `tests/e2e/d-start.spec.ts`                | 105: D2-PREDIVE                                                                                                      |
| `tests/e2e/d2-predive.spec.ts`             | 7: D2-PREDIVE                                                                                                        |
| `tests/e2e/f1-fixes.spec.ts`               | 5: F1-FIXES                                                                                                          |
| `tests/e2e/f1-ocean.spec.ts`               | 5: F1-OCEAN                                                                                                          |
| `tests/e2e/f1-touch.spec.ts`               | 2: F1-TOUCH                                                                                                          |
| `tests/e2e/f2-life.spec.ts`                | 8: F2-LIFE                                                                                                           |
| `tests/e2e/globe.spec.ts`                  | 5: C1                                                                                                                |
| `tests/e2e/helpers/unlocked.ts`            | 22: F3-ONBOARD                                                                                                       |
| `tests/e2e/mission.spec.ts`                | 5: B3, B2, F2, F3; 182: F2; 224: B1; 340: QA-B #10; 422: QA-B #12                                                    |
| `tests/e2e/props.spec.ts`                  | 3: B4; 121: QA-B #5                                                                                                  |
| `tests/e2e/settings.spec.ts`               | 5: C5                                                                                                                |
| `tests/e2e/sub-playtest.spec.ts`           | 4: A3; 176: B3, F1                                                                                                   |
| `tests/unit/beebeIsolation.test.ts`        | 64: 1391; 87: 1495                                                                                                   |
| `tests/unit/beebeSeabed.test.ts`           | 25: 850                                                                                                              |
| `tests/unit/blueHoleProps.test.ts`         | 33: 910                                                                                                              |
| `tests/unit/blueHoleWall.test.ts`          | 103: 1030                                                                                                            |
| `tests/unit/captions.test.ts`              | 1: C5                                                                                                                |
| `tests/unit/challengerRelief.test.ts`      | 4: 1310                                                                                                              |
| `tests/unit/deepOpening.test.ts`           | 75: 1310                                                                                                             |
| `tests/unit/f-bughunt-4.test.ts`           | 31: 920; 124: 1030                                                                                                   |
| `tests/unit/f30Regression.test.ts`         | 165: 780                                                                                                             |
| `tests/unit/fidelityRollout.test.ts`       | 27: 810                                                                                                              |
| `tests/unit/gameSpawn.test.ts`             | 1: QA-B #2, QA-B #3b                                                                                                 |
| `tests/unit/lostCityReadability.test.ts`   | 21: 380                                                                                                              |
| `tests/unit/marineSnowReadability.test.ts` | 56: 570, 460                                                                                                         |
| `tests/unit/missionCore.test.ts`           | 1: B3                                                                                                                |
| `tests/unit/missionRouter.test.ts`         | 1: B3                                                                                                                |
| `tests/unit/missionTimeline.test.ts`       | 1: B3                                                                                                                |
| `tests/unit/portraitOpening.test.ts`       | 17: 610                                                                                                              |
| `tests/unit/predive.test.ts`               | 1: D2-PREDIVE                                                                                                        |
| `tests/unit/settingsPalette.test.ts`       | 1: C5                                                                                                                |
| `tests/unit/settingsSave.test.ts`          | 1: C5                                                                                                                |
| `tests/unit/settingsScreen.test.ts`        | 1: C5                                                                                                                |
| `tests/unit/subCameraRig.test.ts`          | 229: B3, F1                                                                                                          |
| `tests/unit/subFeel.test.ts`               | 1: A3                                                                                                                |
| `tests/unit/subFixS.test.ts`               | 1: QA-B                                                                                                              |
| `tests/unit/terrain-detail.test.ts`        | 1: A1                                                                                                                |
| `tests/unit/terrainMerge1140.test.ts`      | 182: f43 (release history)                                                                                           |
| `tests/unit/titanicHorizon.test.ts`        | 107: 1310                                                                                                            |
| `tests/unit/uiHud.test.ts`                 | 1: QA-B #3c                                                                                                          |
| `tests/unit/uiSonar.test.ts`               | 1: F2, QA-A #1                                                                                                       |
| `tests/unit/vehicles.test.ts`              | 7: F1-VEHICLES                                                                                                       |
| `tests/unit/wrecks.test.ts`                | 115: F1-WRECKS                                                                                                       |
