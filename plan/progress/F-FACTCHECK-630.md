# F-FACTCHECK-630 — Lost City and Monterey Canyon

Reviewed 2026-10-04 in two passes with live primary-source research. Content/text only.

## Scope and method

There is no `src/content/` directory in this checkout. The Journal consumes
`data/landmarks.json`, `data/landmarks/{lost-city,monterey-canyon}/{guide,pois,mission,species}.json`,
`data/life/life.json`, and `data/secrets/{lost-city,monterey-canyon}.json`.
All of those site texts, their fact tables, and the two packs' source notes were read.
`props.json` and wildlife catalogue labels were inspected for context; placements,
geometry, artwork, UI, spawning, and numeric catalogue metadata were not changed.

Pass 1 checked depths, discovery attribution, chimney dimensions, chemistry, ages,
and MARS specifications against the sources below. Pass 2 checked consistency
across catalogue/Journal/briefings, sampled the checked-in bathymetry, and queried
OBIS for every retained taxon, including occurrence-depth samples.

**Verified** means the cited source supports the stated scope. **Corrected** means
an error or overstatement was fixed in shipped text. **Unresolved** means the
claim remains explicitly qualified in the Journal or this report; no uncertain
species record or historical measurement was removed.

## Lost City findings

| Content / claim                                                                               | Finding and action                                                                                                                                                                                                                                                                                                            | Primary evidence                                                                       |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Overview and catalogue: discovery in December 2000 using Alvin                                | **Corrected catalogue:** Argo II first spotted the field on 4 December; Kelley and Karson visited in Alvin with pilot Patrick Hickey on 5 December. Donna Blackman was chief scientist; Kelley and Karson were co-principal investigators. Added camera-watch leaders Gretchen Früh-Green and Barbara John to the guide.      | [UW discovery report][UW00]; [Kelley 2005][K05], p. 34                                 |
| Overview, mission and catalogue: depth 750–900 m, nominal 800 m                               | **Verified as the published field range**, rather than a depth for every structure. Later mapping puts the main field around 740 m; source extents differ. Neither range establishes exact authored chimney footprints.                                                                                                       | [Kelley et al. 2005][S05], opening section; [Denny 2016][D16], §4.4                    |
| Overview / summit: exposed mantle rock near 30°N; detachment fault; about 15 km off-axis      | **Verified.** Revised overview to include lower-crust rocks and describe an oceanic core complex.                                                                                                                                                                                                                             | [Denny 2016][D16], Introduction; [Ludwig 2011][L11], abstract                          |
| Overview, mission, catalogue: heat comes only from serpentinization                           | **Corrected:** rock-water reactions supply chemical energy and heat; lithospheric cooling also contributes. A shallow magma chamber is unnecessary. Avoid equating all methane production with one reaction.                                                                                                                  | [Kelley 2005][K05], Table 1; [Kelley et al. 2005][S05], fluid chemistry                |
| Overview: clear alkaline fluid, carbonate and brucite; pH 9–11 in cooled samples              | **Verified.** pH is a laboratory/sample value, not necessarily the same at outlet temperature. Carbonate includes calcite and aragonite; brucite is magnesium hydroxide, not carbonate.                                                                                                                                       | [Kelley et al. 2005][S05], chemistry and methods; [Kelley 2005][K05], pp. 40–42        |
| Overview temperature table: 40–91 °C; later Beehive 96–116 °C                                 | **Verified with attribution retained.** These are observations from different surveys/outlets, not a universal temperature at every vent.                                                                                                                                                                                     | [Kelley 2005][K05], p. 41; [Aquino 2024][A24], §2                                      |
| Original discovery paper: 40–75 °C, pH 9.0–9.8                                                | **Access limitation:** publisher indexing and reproduced discovery-paper text give these initial values, but the publisher full text and WWU PDF could not be reopened. Added the original DOI as a foundational reference; did not substitute these early ranges for the later measurements. Full-text recheck remains open. | [Kelley et al. 2001][K01]; later direct evidence above                                 |
| Overview: field area about 60,000 m²                                                          | **Verified from the indexed NOAA expedition log.** Direct old-page access failed; the primary log remains indexed with the numerical estimate. Treat as an approximate expedition description, not a precise modern mapped boundary.                                                                                          | [NOAA, 29 July 2005][N29]                                                              |
| Poseidon fact table: about 60 m tall, 100 m long, tens of metres wide                         | **Verified; retained.** It is a composite complex, not a single cylindrical chimney.                                                                                                                                                                                                                                          | [Kelley 2005][K05], p. 38; [Denny 2016][D16], §4.5                                     |
| Poseidon / mission: field carbonate up to about 120,000 years old                             | **Verified; retained with sample/field scope.** Ludwig reports a corrected age of 120 ± 13 ka. It does not date the whole active Poseidon tower.                                                                                                                                                                              | [Ludwig 2011][L11], authors' institutional abstract                                    |
| Poseidon: relevance to Europa / Enceladus and origin of life                                  | **Qualified:** suitable water-rock environments are potential analogues. Their existence or habitability does not establish extraterrestrial life.                                                                                                                                                                            | [NASA Astrobiology][NASA]; [Kelley 2005][K05], concluding discussion                   |
| Beehive: historical height about 1 m, on Poseidon's flank; hottest outlet; absent in 2018     | **Verified; retained.** An outlet persisted after the structure disappeared. The northeast scan-marker location is authored, not a mapped footprint.                                                                                                                                                                          | [Denny 2016][D16], §4.5; [Aquino 2024][A24], §2                                        |
| IMAX: north-face flange/chimney; published 8 m and 30 m heights                               | **Unresolved and marked in Journal:** both values appear in primary publications. Removed the asserted explanation that these are different survey views. No source checked establishes the reason for the difference.                                                                                                        | [Kelley 2005][K05], Fig. 5 caption; [Denny 2016][D16], §4.5                            |
| Microbial entry: Methanosarcinales dominate warm active surfaces                              | **Corrected:** hot oxygen-poor interiors, distinct from exterior mixing-zone biofilms. Chemical energy replaces direct sunlight, but exterior communities also use seawater oxygen/sulfate; "almost no help from photosynthesis" overstated independence.                                                                     | [Kelley 2005][K05], pp. 43–44; [Kelley et al. 2005][S05], microbial communities        |
| Microbial / catalogue: small invertebrates; low biomass; no dense black-smoker fauna          | **Verified with nuance:** low biomass does not imply low species diversity or complete absence of mussels/shrimp. Wreckfish are common, not merely occasional. Added a rare-mussel source and corrected the wreckfish fact.                                                                                                   | [Kelley et al. 2005][S05], macrofauna; [Kelley 2005][K05], p. 44; [Lartaud 2011][LA11] |
| Microbial entry: all local OBIS data from one 2003 ICoMM survey                               | **Unresolved and marked in Journal.** Taxonomy/counts and absence of reported depths match the live sample; a single-dataset/year attribution was not established by these limited fields. Retained as an unverified attribution.                                                                                             | Live [Lost City checklist][OBIS-LC] and per-taxon occurrence queries below             |
| Summit entry: shallowest tile cell 724 m                                                      | **Verified locally:** maximum elevation is −724.09998 m. This is a grid statistic, not a published exact massif summit measurement. The summit entry has no retained POI linkage.                                                                                                                                             | Checked-in GMRT Float32 grid; [GMRT methodology][GMRT]                                 |
| South-wall entry: 1,332 m at rounded catalogue pin; nearest vent-depth band about 665 m north | **Verified depth locally:** 1,332.3 m. **Qualified distance:** original grid-search estimate is to a matching depth band, not proof of the real field footprint. Changed the fact label accordingly. Entry is retained but has no POI linkage.                                                                                | Checked-in GMRT grid; [Kelley et al. 2005][S05] for field range                        |
| Briefing: fragile and slow-growing spires; moderate summit currents                           | **Corrected fragile-growth text:** young mineral growth is fragile, but the blanket slow-growth assertion lacks a measured rate. Strong currents are reported near the summit; the game's moderate-current setting is a simulation choice.                                                                                    | [Kelley 2005][K05], Figs. 4–5 and fauna discussion                                     |

## Monterey Canyon findings

| Content / claim                                                                                     | Finding and action                                                                                                                                                                                                                                                                     | Primary evidence                                                                                                      |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Catalogue: largest on US West Coast, over 3,600 m within roughly 100 km                             | **Corrected text:** one of the deepest; comparable to Grand Canyon scale. The full main-channel/fan continuation exceeds 470 km and ends below 4,000 m. The old distance/depth pairing was not substantiated.                                                                          | [MBARI canyon overview][MC]                                                                                           |
| Catalogue numeric `depth_m: 3600`, `depth_range_m: [0,3600]`                                        | **Retained as offshore reference metadata, not a maximum.** Catalogue fact now explicitly distinguishes offshore depth, full endpoint and tile extent. These numbers are not a complete scientific depth envelope; changing the marker geometry is outside this text-only pass.        | [MBARI canyon overview][MC]; [MBARI 2017 CCE report][CCE17] places Shepard Meander at 3,400 m / about 100 km offshore |
| Overview fact table: 470+ km, walls 1.6–1.7 km, endpoint below 4,000 m                              | **Verified; standardized wall height to about 1,700 m** and relabelled "Maximum depth (mouth)" as "Offshore channel endpoint." The long channel includes the fan continuation.                                                                                                         | [MBARI canyon overview][MC], Quick Facts                                                                              |
| Overview / briefing: tile deepest cell 2,332.8 m                                                    | **Verified locally:** minimum elevation −2,332.81006 m. This does not measure the full canyon maximum.                                                                                                                                                                                 | Checked-in GMRT grid; [GMRT methodology][GMRT]                                                                        |
| Overview: beaches supply sediment; storms, shaking and failures drive turbidity currents            | **Qualified:** earthquakes are possible triggers, but CCE flows did not coincide with earthquakes above magnitude 2 and some large flows had no major external trigger.                                                                                                                | [Paull et al. 2018][P18], Discussion                                                                                  |
| Canyon head: right off Moss Landing; deep access in a few hours                                     | **Verified.** Removed unsupported "most canyons" and "almost nowhere else" comparisons. Guide states MBARI's roughly 2.5-hour access to areas more than a mile deep.                                                                                                                   | [MBARI canyon overview][MC]                                                                                           |
| Head marker: about 44 m deep, 2.5 km offshore                                                       | **Verified marker depth:** 44.3 m. **Offshore distance unresolved and marked:** no shoreline reference point was specified. It is a scan point in the upper canyon, not a surveyed exact shoreline head position.                                                                      | Checked-in grid and POI; [MBARI canyon overview][MC] for nearshore setting                                            |
| North-wall marker: 748 m; 270 m relief over 700 m to axis                                           | **Verified marker depth:** 748.2 m. **Cross-section unresolved and marked:** the historical comparison-axis point is absent from current POIs; retained estimated relief/distance, with uncertainty. General gullies and wall failures are consistent with canyon research.            | Checked-in grid; [MBARI canyon overview][MC]                                                                          |
| Canyon axis: thalweg; up to 7.2 m/s / 16 mph; flows travel 50+ km; several per year in upper canyon | **Verified.** Velocity refers to flow fronts, not a continuous background water current. Added the actual paper to the Journal sources. Entry is site-level because its earlier axis POIs were removed.                                                                                | [Paull et al. 2018][P18], Abstract/Methods; [MBARI CCE data report][CCE]                                              |
| Canyon axis: steadily deepening traced path, side channels / sediment terraces                      | **Partly unresolved:** descriptive historical terrain interpretation, not a georeferenced retained transect. Kept text; exact trace and gradient require a reproducible transect. Carbon transport to deep habitats is supported.                                                      | Local grid/source notes; [MBARI canyon overview][MC]                                                                  |
| Upper-channel marker: 265 m, 2.8 km from head; claimed shelf break                                  | **Verified depth and separation:** 265.0 m and 2,850.8 m in a straight line. **Shelf-break identification unresolved and marked in Journal.** Changed entry/mission wording to upper-channel descent; neither a depth cutoff nor a straight-line sample proves a shelf-break boundary. | Checked-in POIs/grid; [GMRT methodology][GMRT]                                                                        |
| MARS: 891 m, 52 km / 32 mi cable; 10,000 V → 375/48 V DC; 100 Mbps per instrument, eight ports      | **Verified, retained.** MBARI's page caption says 51 km while its main specifications repeatedly say 52 km; keep the main-text nominal specification.                                                                                                                                  | [MBARI MARS specifications][MARS]                                                                                     |
| MARS frame: 3.7 × 4.6 m base, 1.2 m high; trawl-resistant sloping sides and ROV doors               | **Verified, retained.** Rendering is a simplified marker, not a measured replica.                                                                                                                                                                                                      | [MBARI MARS specifications][MARS]                                                                                     |
| MARS dates: NSF support from 2002; went live 10 November 2008                                       | **Verified guide; corrected stale source-note table** which described 2002 as operational. The MBARI announcement's web date is 2010, but its text explicitly dates first operation to 2008.                                                                                           | [MBARI MARS announcement][MARS08]                                                                                     |
| MARS location / travel: published lat/lon; terrain 888 m; 34 km from head marker                    | **Verified:** 36°42.7481′N, 122°11.2139′W converts to the retained coordinates. Local sampled depth 888.1 m is within 3 m of published 891 m. Marker-to-node straight-line distance is 34,313 m.                                                                                       | [MBARI MARS specifications][MARS]; local calculation                                                                  |
| Catalogue notable fauna: Humboldt squid, giant larvacean houses, deep-sea corals                    | **Verified regionally; replaced generic links with specific MBARI evidence.** These are habitat examples, not an inventory at every depth/coordinate.                                                                                                                                  | [MBARI squid research][SQUID]; [MBARI larvacean filters][LARVA]; [MBARI canyon overview][MC]                          |
| Briefing hazards: strong upwelling flows / fishing gear                                             | **Revised current wording to internal tidal flows.** Fishing activity/cable snagging is supported; actual encounters and current strength in a particular dive are not field measurements.                                                                                             | [MBARI MARS specifications][MARS]; [Xu 2009][X09]                                                                     |

## Wildlife text and fact tables

Shared `data/life/life.json` text is used at several sites. Only entries appearing
in these two sites' spawn lists were considered. Spawn depths, weights, model sizes
and encounter rates are retained simulation parameters, not occurrence evidence.
The Journal overviews give one site-level explanation for plausible encounters;
individual secret finds already carry the existing **Game addition** tag. No
additional caveat was appended to every secret, hint or objective.

| Wildlife entry                                   | Evidence, correction or remaining uncertainty                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wreckfish, `Polyprion americanus`                | Field presence supported by [Kelley 2005][K05]; rock/overhang habitat, fish/squid diet, approximately 40–1,000 m adult depth supported by [NOAA wreckfish][WR]. Replaced FishBase with NOAA and corrected depth. About 2 m maximum / 1 m game size remains an approximate size statement, not a Lost City measurement.                                                                                                                          |
| Cold-water coral, `Desmophyllum pertusum`        | Coral groups occur at Lost City, but exact species, 40–3,000+ m global range, 0.3–2 m colony size and the 500–1,000 m "here" range were not independently established in this pass. **Unresolved:** do not infer the species from a generic coral sighting or its spawn table. Retained with the overview's uncertain-local-records statement. [Kelley 2005][K05] supports corals generally.                                                    |
| Anemone, Actiniaria                              | Tentacled hard-substrate animals are regionally plausible; a broad order does not support a uniform 5–15 cm size or 800–5,000 m species range. **Unresolved dimensions/depth and local identity**, retained. [MBARI canyon overview][MC] supports anemones on exposed bedrock.                                                                                                                                                                  |
| Rattail, `Coryphaenoides`                        | Deep-bottom grenadiers are observed by [MBARI at 4,000–5,000 m][RAT]. Exact local species, 200 m lower limit, 30 cm–1 m sizes and diet across the whole genus remain **unresolved**; no voucher establishes an encounter at Lost City. Retained as a broad genus depiction.                                                                                                                                                                     |
| Comb jelly, `Bolinopsis`                         | Eight comb rows and lobate form are consistent with ctenophores. **Taxonomic issue retained and marked:** the shared model label is `B. infundibulum`, whereas northeastern Pacific specimens are `B. microptera`. Shared Journal text now distinguishes these species and cites [Johnson et al. 2022][BOL]. A uniform 15 cm maximum and bioluminescence for every depicted individual were not established. No model/catalogue or art changes. |
| Atolla, shared label `A. wyvillei`               | [MBARI crown jelly][AT] supports red bell, blue alarm display, up to 15 cm and a genus-level 500–5,000 m range. Replaced the taxonomic-registry link and qualified depth as genus-level. **Exact species occurrence remains unresolved**, especially at Lost City.                                                                                                                                                                              |
| Blue shark, `Prionace glauca`                    | **Unresolved:** 2–3 m size, 350 m usual range, diet and an encounter at this Lost City tile were not verified against a site voucher/primary measurement here. Retained existing text; overview identifies uncertain local wildlife. FishBase is not treated as primary corroboration.                                                                                                                                                          |
| Sixgill shark, `Hexanchus griseus`               | **Corrected "green-glowing eye" to light-reflecting green eyes.** [Florida Museum species profile][SIX] and [UF shark-eye explanation][EYE] support reflective eyes and deep habitat. About 5 m, 2,000 m range and nocturnal ascent are approximate/general descriptions; exact local occurrence and 3.6 m rendered length remain unverified/model choices.                                                                                     |
| Pacific hake, `Merluccius productus`             | [NOAA Pacific whiting][HAKE] supports shelf/slope schooling, spawning off California, krill/fish diet and common 50–500 m depth with adults below 900 m. Corrected depth and primary citation. The 30–60 cm "common" length and nightly ascent remain **unresolved in this pass**. Local OBIS records support occurrence, not every behavior.                                                                                                   |
| Nanomia, `N. bijuga`                             | [MBARI common siphonophore][NAN] supports colonial organization, swimming zooids, bioluminescence, up to 30 cm and surface–700 m habitat. Retained. Game encounters reaching 800 m exceed that source summary; they remain plausible placement rather than an expanded scientific range.                                                                                                                                                        |
| Sea pen, `Umbellula lindahli`                    | Live OBIS confirms retained local 375–1,192 m sample. Corrected depth wording to describe that sample rather than full habitat limits. [MBARI guide][UMB] corroborates the taxon. Soft-sediment, top-clustered polyps are consistent; 0.5–1.5 m height remains **unresolved**. Spawn depths to 3,700 m are not established by this sample.                                                                                                      |
| California sun star, `Rathbunaster californicus` | [MBARI sun star][SUN] supports muddy habitat, tube-foot movement, up to 45 cm and 60–1,000 m. Corrected size/depth and citation. "Thirteen or more" arms was not independently confirmed as a diagnostic range and remains **unresolved**.                                                                                                                                                                                                      |
| California sea lion, `Zalophus californianus`    | [NOAA sea lion][SL] supports coastal habitat, external ears and fish/squid diet; sex-specific sizes are approximately consistent with 6 ft females / 7.5 ft males. Updated citation. Precise usual dive depth, >250 m dives and routine investigation of divers remain **unresolved here**.                                                                                                                                                     |
| Vampire squid, `Vampyroteuthis infernalis`       | [MBARI vampire squid][VAMP] supports 30 cm maximum, marine-snow feeding with filaments, oxygen-minimum habitat, glowing mucus and typical 600–900 m depth. Replaced unsupported 500–1,500 m fact with that typical range plus the verified local 402–1,000 m OBIS sample. Revised the light fact to supported displays/mucus; precise "fin photophores" wording was not established.                                                            |
| Humpback whale, `Megaptera novaeangliae`         | [NOAA humpback][HW] supports migrations, male songs, baleen, krill/fish diet and up to about 60 ft (18 m). Corrected the 16 m maximum and replaced the shared Tonga-season sentence with general migration text applicable to Monterey. Exact placement/depth and encounter timing remain authored.                                                                                                                                             |

## OBIS audit: all 60 retained taxa

Direct requests used each file's recorded `source_url` and a per-taxon
`/v3/occurrence` query with the same polygon/depth filter, `size=2000`, and
`fields=depth,minimumDepthInMeters,maximumDepthInMeters,vernacularName`.
Compared scientific name, taxon ID, rank, coarse group, count and sampled depth.
All 60 names/IDs/ranks/groups and all 40 Monterey depth ranges match. All 20
Lost City taxa still lack sampled depths. 58/60 retained counts match; the two
changes are listed below. This audits the OBIS aggregation, not the correctness
of every underlying identification or the complete geographic/depth range.

[Lost City live checklist][OBIS-LC] returned 192 taxa versus 200 in the dated
export. [Monterey live checklist][OBIS-MC] returned 884 versus 885. These dynamic
totals and the original September snapshot are different observations; counts
were not silently overwritten. `species.json.note` now describes the snapshot,
sample limit and uncertainty. Monterey's `rank_filter: species` includes
infraspecific ranks by design in `tools/obis_export.py`, explaining the retained
`Paragorgia arborea var. pacifica` row. Zero/below-200 m interval endpoints can
belong to records intersecting the depth filter and are not automatically errors.

### lost-city

| Taxon (primary OBIS record)                          | Snapshot / live count | Sampled depths (m), both queries |
| ---------------------------------------------------- | --------------------- | -------------------------------- |
| [Rhodobacteraceae](https://obis.org/taxon/393084)    | 88 / 88               | not reported                     |
| [Alphaproteobacteria](https://obis.org/taxon/392750) | 77 / 77               | not reported                     |
| [Bacteria](https://obis.org/taxon/6)                 | 77 / 77               | not reported                     |
| [Gammaproteobacteria](https://obis.org/taxon/393018) | 76 / 76               | not reported                     |
| [Methanosarcinaceae](https://obis.org/taxon/416261)  | 46 / 46               | not reported                     |
| [Euryarchaeota](https://obis.org/taxon/416226)       | 43 / 43               | not reported                     |
| [Proteobacteria](https://obis.org/taxon/178054)      | 41 / 41               | not reported                     |
| [Thiomicrospira](https://obis.org/taxon/394042)      | 35 / 35               | not reported                     |
| [Flavobacteriaceae](https://obis.org/taxon/559995)   | 28 / 28               | not reported                     |
| [Bacteroidetes](https://obis.org/taxon/559844)       | 20 / 20               | not reported                     |
| [Deltaproteobacteria](https://obis.org/taxon/392754) | 20 / 20               | not reported                     |
| [Clostridiales](https://obis.org/taxon/393070)       | 19 / 19               | not reported                     |
| [Acidobacteriaceae](https://obis.org/taxon/571179)   | 17 / 17               | not reported                     |
| [Crenarchaeota](https://obis.org/taxon/559440)       | 16 / 16               | not reported                     |
| [Flavobacteriales](https://obis.org/taxon/559998)    | 15 / 15               | not reported                     |
| [Sulfurovum](https://obis.org/taxon/393925)          | 15 / 15               | not reported                     |
| [Thermoprotei](https://obis.org/taxon/559441)        | 14 / 14               | not reported                     |
| [Rhizobiales](https://obis.org/taxon/393148)         | 13 / 13               | not reported                     |
| [Actinobacteria](https://obis.org/taxon/559510)      | 12 / 12               | not reported                     |
| [Cryomorphaceae](https://obis.org/taxon/559981)      | 11 / 11               | not reported                     |

### monterey-canyon

| Taxon (primary OBIS record)                                            | Snapshot / live count | Sampled depths (m), both queries |
| ---------------------------------------------------------------------- | --------------------- | -------------------------------- |
| [Heteropolypus ritteri](https://obis.org/taxon/724715)                 | 7012 / 7012           | 196–1879                         |
| [Umbellula lindahli](https://obis.org/taxon/128531)                    | 5460 / 5460           | 375–1192                         |
| [Mitrocoma cellularia](https://obis.org/taxon/292350)                  | 3340 / 3340           | 200.1–1001.8                     |
| [Nanomia bijuga](https://obis.org/taxon/135495)                        | 3211 / 3211           | 200.2–700.3                      |
| [Eusergestes similis](https://obis.org/taxon/514127)                   | 3191 / 3191           | 0–1434.0                         |
| [Rathbunaster californicus](https://obis.org/taxon/254844)             | 1503 / 1503           | 200–1010                         |
| [Balticina californica](https://obis.org/taxon/1392940)                | 1401 / 1401           | 361–1147                         |
| [Poeobius meseres](https://obis.org/taxon/330855)                      | 1297 / 1297           | 200–1881.9                       |
| [Callistephanus kofoidi](https://obis.org/taxon/1608731)               | 1030 / 1030           | 351–1873                         |
| [Callistephanus simplex](https://obis.org/taxon/1608733)               | 898 / 898             | 319–2123                         |
| [Merluccius productus](https://obis.org/taxon/272458)                  | 714 / 714             | 0–1300.4                         |
| [Psolus squamatus](https://obis.org/taxon/124713)                      | 713 / 713             | 318.1–1192.3                     |
| [Leuroglossus stilbius](https://obis.org/taxon/313514)                 | 654 / 654             | 0–1616.3                         |
| [Pennatula phosphorea](https://obis.org/taxon/128517)                  | 545 / 545             | 460–969                          |
| [Strongylocentrotus fragilis](https://obis.org/taxon/569742)           | 503 / 503             | 100.6–2025.5                     |
| [Poralia rufescens](https://obis.org/taxon/135310)                     | 499 / 499             | 289.8–2261.2                     |
| [Chionoecetes tanneri](https://obis.org/taxon/442165)                  | 461 / 462             | 306.7–1409                       |
| [Pannychia moseleyi](https://obis.org/taxon/241954)                    | 416 / 416             | 202.1–2261.9                     |
| [Anthoptilum grandiflorum](https://obis.org/taxon/128504)              | 403 / 403             | 377–1360                         |
| [Paragorgia arborea var. pacifica](https://obis.org/taxon/1647393)     | 311 / 311             | 436–1189                         |
| [Hastigerinella digitata](https://obis.org/taxon/558967)               | 275 / 275             | 200–500.7                        |
| [Caecosagitta macrocephala](https://obis.org/taxon/105431)             | 156 / 156             | 500.7–1658.9                     |
| [Colobonema sericeum](https://obis.org/taxon/117854)                   | 154 / 154             | 253–964.1                        |
| [Gersemia juliepackardae](https://obis.org/taxon/944595)               | 151 / 151             | 882–1374                         |
| [Sebastes jordani](https://obis.org/taxon/274806)                      | 147 / 147             | 200.1–204.4                      |
| [Beroe abyssicola](https://obis.org/taxon/265150)                      | 132 / 132             | 331.8–1056.8                     |
| [Euphausia pacifica](https://obis.org/taxon/237851)                    | 130 / 130             | 201.9–407                        |
| [Melanostigma pammelas](https://obis.org/taxon/274134)                 | 128 / 125             | 0–1200                           |
| [Microstomus pacificus](https://obis.org/taxon/274294)                 | 117 / 117             | 0–1085                           |
| [Acanthascus (Rhabdocalyptus) dawsoni](https://obis.org/taxon/171980)  | 104 / 104             | 218–1210                         |
| [Vampyroteuthis infernalis](https://obis.org/taxon/141887)             | 103 / 103             | 402.3–1000                       |
| [Galiteuthis phyllura](https://obis.org/taxon/341807)                  | 98 / 98               | 0–1461                           |
| [Doryteuthis opalescens](https://obis.org/taxon/574540)                | 95 / 95               | 200.0–899.6                      |
| [Asbestopluma (Asbestopluma) monticola](https://obis.org/taxon/759744) | 93 / 93               | 851–1854                         |
| [Microstomus bathybius](https://obis.org/taxon/305684)                 | 93 / 93               | 399.1–1409                       |
| [Chiroteuthis calyx](https://obis.org/taxon/341796)                    | 89 / 89               | 0–1000                           |
| [Mediaster aequalis](https://obis.org/taxon/242160)                    | 80 / 80               | 101–404.7                        |
| [Lumpenus sagitta](https://obis.org/taxon/254579)                      | 72 / 72               | 200.1–205.4                      |
| [Mesochordaeus erythrocephalus](https://obis.org/taxon/342465)         | 69 / 69               | 257.8–901.1                      |
| [Solmissus incisa](https://obis.org/taxon/117504)                      | 69 / 69               | 201.6–620.7                      |

## Plausible additions and terrain provenance

Lost City's carbonate arch, old stump and quiet seep are geologically plausible,
and Monterey's instrument frame, whale bones and ledge shelter are regionally
plausible. Their particular objects/history/coordinates have no primary sighting
or survey voucher. Existing Journal **Game addition** tags and the single
site-overview statement distinguish them from factual site descriptions. Briefings
and objective hints have no repeated reconstruction disclaimers.

Re-sampled POI seafloors: Lost City Poseidon 801.0 m (scan marker at 775 m),
Beehive 761.4 m, IMAX 790.9 m, microbial marker 792.8 m; Monterey head 44.3 m,
upper channel 265.0 m, wall 748.2 m, MARS 888.1 m. Secret `survey_depth_m` values
are historical estimates, differing from bilinear current-grid sampling by up to
2.8 m at Lost City and 1.2 m at Monterey; none establishes a real object's depth.
Sample-marker names are authored, not claims of real collected specimens.

## Validation

- `npm run check:content`: **PASS**, all 13 packs, zero errors and zero warnings.
- `npx vitest run tests/unit/copyJournal.test.ts tests/unit/journalData.test.ts --configLoader runner --fsModuleCachePath .cache/factcheck630-vitest`: **PASS**, 2 files / 18 tests. The first attempt failed before tests because Vite tried writing through the read-only `node_modules` symlink; the retry used the runner and a writable local cache.
- Prettier check on all 11 changed/new files and `git diff --check`: **PASS**.
- Text-only scope check: **PASS**. All existing numeric/boolean JSON values, spawn tables, environment settings and placement data match `HEAD`. Each site has one overview statement for plausible additions; objective copy contains no reconstruction disclaimers.

### Orchestrator gate follow-up

The orchestrator's full gate run passed build, Python, content, attribution,
Prettier, smoke E2E and project-base E2E. Its unit run passed 1,325 of 1,326
tests; the sole failure was the Lost City player-copy assertion in
`tests/unit/heroIntegrity.test.ts`. The new overview sentence used
"recreations", a word explicitly prohibited by that assertion.

Reworded that sentence to say chimney shapes and scan-marker positions are
"authored interpretations of the field". The single Journal explanation of
plausible additions, uncertainty notes and existing provenance metadata remain.
No tests, assertions, art, UI or placement data changed.

- `npx vitest run tests/unit/heroIntegrity.test.ts tests/unit/copyJournal.test.ts tests/unit/journalData.test.ts --configLoader runner --fsModuleCachePath .cache/factcheck630-vitest`: **PASS**, 3 files / 35 tests, including the previously failing assertion.
- `npm run check:content`: **PASS**, all 13 packs, zero errors and zero warnings.
- Prettier check on the corrected guide and this report, plus `git diff --check`: **PASS**.
- The full external gate suite was not rerun locally; build and E2E results above are from the orchestrator's supplied run.

## Primary references and access notes

[K01]: https://doi.org/10.1038/35084000
[K05]: https://tos.org/oceanography/assets/docs/18-3_kelley.pdf
[S05]: https://doi.org/10.1126/science.1102556
[UW00]: https://www.washington.edu/news/2000/12/12/hydrothermal-vent-system-unlike-any-seen-before-found-in-atlantic/
[D16]: https://agupubs.onlinelibrary.wiley.com/doi/full/10.1002/2015GC005869
[A24]: https://agupubs.onlinelibrary.wiley.com/doi/10.1029/2023GC011011
[L11]: https://experts.umn.edu/en/publications/u-th-systematics-and-sup230sup-th-ages-of-carbonate-chimneys-at-t/
[N29]: https://oceanexplorer.noaa.gov/explorations/05lostcity/logs/july29/july29.html
[NASA]: https://astrobiology.nasa.gov/news/endly-is-enceladus-ocean-to-life/
[LA11]: https://pmc.ncbi.nlm.nih.gov/articles/PMC3093485/
[GMRT]: https://www.gmrt.org/about/index.php
[MC]: https://www.mbari.org/know-your-ocean/monterey-canyon/
[P18]: https://www.nature.com/articles/s41467-018-06254-6
[CCE]: https://www.mbari.org/data/coordinated-canyon-experiment-cce-data-report/
[CCE17]: https://annualreport.mbari.org/2017/story/coordinated-canyon-experiment
[MARS]: https://www.mbari.org/technology/monterey-accelerated-research-system-mars/
[MARS08]: https://www.mbari.org/news/deep-sea-observatory-goes-live-2/
[X09]: https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2008JC004992
[SQUID]: https://www.mbari.org/news/deciphering-the-visual-language-of-humboldt-squid/
[LARVA]: https://www.mbari.org/news/sinkers-provide-missing-piece-in-deep-sea-puzzle-2/
[WR]: https://www.fisheries.noaa.gov/species/wreckfish
[RAT]: https://www.mbari.org/news/deep-sea-ecosystems-affected-by-climate-change/
[BOL]: https://www.frontiersin.org/journals/genetics/articles/10.3389/fgene.2022.970314/full
[AT]: https://www.mbari.org/animal/deep-sea-crown-jelly/
[SIX]: https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/bluntnose-sixgill-shark/
[EYE]: https://ask.ifas.ufl.edu/publication/FA179
[HAKE]: https://www.fisheries.noaa.gov/species/pacific-whiting
[NAN]: https://www.mbari.org/animal/common-siphonophore/
[UMB]: https://dsg.mbari.org/dsg/browsetree/concept/Umbellula
[SUN]: https://www.mbari.org/animal/california-sun-star/
[SL]: https://www.fisheries.noaa.gov/species/california-sea-lion
[VAMP]: https://www.mbari.org/animal/vampire-squid/
[HW]: https://www.fisheries.noaa.gov/species/humpback-whale
[OBIS-LC]: https://api.obis.org/v3/checklist?geometry=POLYGON((-42.221008+30.030178,-42.019409+30.030178,-42.019409+30.200466,-42.221008+30.200466,-42.221008+30.030178))&size=1000&skip=0
[OBIS-MC]: https://api.obis.org/v3/checklist?geometry=POLYGON((-122.200378+36.599761,-121.749939+36.599761,-121.749939+36.950225,-122.200378+36.950225,-122.200378+36.599761))&startdepth=200.0&enddepth=3600.0&size=1000&skip=0

The original Kelley 2001 full text, NOAA July 29 old-page fetch, and the NOAA-hosted
Denny PDF failed direct retrieval. The latter was read through its publisher's
full text; Kelley 2005 was read directly through The Oceanography Society, and
the Science paper through an institutional PDF mirror. Ludwig's age result was
read in the authors' University of Minnesota repository abstract. NOAA's 60,000 m²
estimate was checked through the indexed primary log, with that access limit
recorded above. Wikipedia was not used as verification evidence; primary links
replace it in the two Journal guides. Historical source-note tables are explicitly
superseded by this report, rather than treated as independent corroboration.
