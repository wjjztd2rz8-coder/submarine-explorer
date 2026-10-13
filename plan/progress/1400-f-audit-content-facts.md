# 1400 — Briefing and Journal fact audit

Date: 2026-10-11. Scope: Challenger Deep, Endurance, Lost City, Great Blue Hole,
Beebe/Piccard and Monterey Canyon. Reviewed mission briefings, guide paragraphs and
fact tables, catalogue references, and associated POI placement notes. No scene,
physics, species-export or tile-binary edits. Sources were checked online; terrain
values were independently sampled from the shipped float32 grids.

## Corrections and verified reference values

| Site                            | Verified facts and resulting changes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Challenger Deep                 | Retained 10,935 ± 6 m (95% confidence) from June 2020 dives and used it for the catalogue depth; replaced the briefing’s stale “most recent” 2019 claim. Trieste’s first crewed descent remains 23 January 1960. Corrected the statement that the **trench** was named for HMS Challenger: NOAA identifies Challenger II (1951) as the **Deep’s** namesake; HMS Challenger’s 1875 sounding was 4,475 fathoms / 8,184 m.                                                                                                                                                                                                                                                                                                              | [Greenaway et al. 2021](https://repository.library.noaa.gov/view/noaa/33477); [NOAA NCEI](https://www.ncei.noaa.gov/news/planet-postcard-mariana-trench)                                                                                                                                                                                                                                                                                                                                            |
| Challenger pools                | Kept the conventional GEBCO position 11.373333° N, 142.591667° E separate from the newer maximum-depth measurement and local scans. The Western Pool coordinate quoted in the guide is about **15 km**, rather than over 25 km, west of the shipped tile boundary. Removed the claim that a current scan sits on the deepest cell and the suggestion that only measurement precision, never location, distinguishes surveys. Removed the assertion that unresolved wall slopes must be steeper.                                                                                                                                                                                                                                      | [Stewart & Jamieson 2019](https://doi.org/10.1016/j.earscirev.2019.102896); [Five Deeps dive log, May 2019](https://fivedeeps.com/wp-content/uploads/2019/05/FDE-Challenger-Release-FINAL-5132019.pdf); shipped grid                                                                                                                                                                                                                                                                                |
| Challenger life                 | Confirmed Leggo’s 19 December 2014 deployment at 11.368536° N, 142.5875166° E and 10,929 m. Kept its reported depth separate from the local grid’s 10,925 m. Fish are unsupported at the floor; the xenophyophore record belongs to Sirena Deep.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | [SOI expedition page](https://schmidtocean.org/cruise/expanding-mariana-trench-perspectives/); [SOI final cruise report](https://schmidtocean.org/wp-content/uploads/Bartlett-final-FK141215-cruise-report.pdf); [Scripps xenophyophore report](https://scripps.ucsd.edu/news/research-highlight-scientists-id-giant-amoebas-extreme-deep)                                                                                                                                                          |
| Endurance                       | Replaced the catalogue pin with 68°44′21″S, 52°19′47″W (−68.739167, −52.329722). Confirmed 3,008 m depth, sinking on 21 November 1915, discovery on 5 March 2022, all 28 Weddell Sea crew surviving, approximately 44 × 7.6 m dimensions, and 350 gross register tons. Distinguished construction beginning in 1911 from launch on 17 December 1912. Corrected stern-first sinking to **bow-first**, following the conservation plan. Replaced the unverified keel dimensions and the conflation of planking thickness with total hull thickness: the plan reports a maximum hull thickness of 0.76 m. Removed the unsupported seabed-temperature comparison with the surface freezing point.                                        | [UKAHT / Historic England Conservation Management Plan, April 2024, §§2.1.1–2.1.4](https://ukaht.org/wp-content/uploads/2026/07/CMP_Endurance_April24_final.pdf); [UKAHT site history](https://ukaht.org/places/endurance-shipwreck/)                                                                                                                                                                                                                                                               |
| Endurance navigation            | Corrected “Squire & Bell, 2022” to **Bergman & Stuart, 2018 online / 2019 volume** for the existing linked paper. Added the later Bergman, Mearns & Stuart chronometer study, 2022 volume / first online 21 February 2023. Its §7 postscript gives 4.9 nautical miles south and 2.4 east: **5.4 nautical miles, about 10 km south-southeast**, consistent with the coordinates. Removed the claim that Worsley’s position is currently a scan target.                                                                                                                                                                                                                                                                                | [Original navigation paper](https://doi.org/10.1017/S0373463318000619); [Chronometer study](https://doi.org/10.1017/S0373463322000649), §7, publisher full-issue PDF inspected with `pdftotext`                                                                                                                                                                                                                                                                                                     |
| Endurance survey and protection | Retained Saab Sabertooth / Voyis survey and approximately 25,000 images, adding the instrument maker’s reference. Repaired the dead conservation-plan links. Confirmed HSM 93, designated in 2019, and the 1,500 m associated-artefact radius in Measure 18 (2024), effective 28 October 2024.                                                                                                                                                                                                                                                                                                                                                                                                                                       | [Voyis survey account](https://voyis.com/endurance-expedition-with-voyis-technology-on-bbc-news/); [Antarctic Treaty Measure 18 (2024)](https://www.ats.aq/devAS/Meetings/Measure/830?lang=e)                                                                                                                                                                                                                                                                                                       |
| Lost City                       | Replaced the old rounded pin that landed at 1,332 m on the south wall with the **published Beehive outlet reference**, 30°07′26.1″N, 42°07′11.9″W (30.123917, −42.119972). Labelled this as a field reference, not an exact Poseidon footprint. The table’s 743 m outlet sits high on the carbonate structure; the 750–900 m description concerns the main field setting. Retained discovery on 4 December 2000, first Alvin visit on 5 December, Poseidon’s approximately 60 m height, sample ages around 120,000 years, and the distinction between 40–91 °C historical fluid measurements and later Beehive 96–116 °C values.                                                                                                     | [Aquino et al. 2022, Table 1](https://repository.library.noaa.gov/view/noaa/56451/noaa_56451_DS1.pdf); [UW contemporaneous discovery report](https://www.washington.edu/news/2000/12/12/hydrothermal-vent-system-unlike-any-seen-before-found-in-atlantic/); [Kelley 2005](https://tos.org/oceanography/assets/docs/18-3_kelley.pdf); [Denny et al. 2016](https://repository.library.noaa.gov/view/noaa/59651); [Aquino 2024, §2](https://agupubs.onlinelibrary.wiley.com/doi/10.1029/2023GC011011) |
| Great Blue Hole                 | Corrected briefing depth **226 → 125 m**, and catalogue depth / depth range **124 → 125 m**. Used the paper’s central BH8 coring position, 17°18′57.2″N, 87°32′00.60″W (17.315889, −87.5335), as the catalogue reference. Confirmed approximately 320 m diameter, 125 m water depth and anoxic water below approximately 90 m. The existing Journal provenance badge labels the shaped sinkhole and galleries; their numeric grid and real-depth values remain distinct.                                                                                                                                                                                                                                                             | [Gischler et al. 2025, introduction and methods](https://onlinelibrary.wiley.com/doi/10.1002/dep2.70021)                                                                                                                                                                                                                                                                                                                                                                                            |
| Beebe / Piccard                 | Catalogue now uses the published field reference 18°32′47.7″N, 81°43′05.5″W (18.546583, −81.718194). Retained approximately 4,960 m field depth, 2010 seafloor discovery, 15 mm/year full spreading rate, 401–403 °C low-salinity supercritical fluids at approximately 500 bar, and at least six mounds / three with focused active flow. Connelly’s discovery-survey mound estimate, 80 m wide and 50 m high, is also confirmed in the primary full text. Catalogue depth range now uses Lough’s described sites, **4,956–4,964 m**, rather than conflating them with the game targets at 4,957–4,988 m. Relabelled 5,395.8 m as an axial-valley **transect sample**, not the tile minimum; the entire tile reaches **6,575.3 m**. | [Lough et al. 2019, §2.1](https://eprints.whiterose.ac.uk/id/eprint/151944/1/1-s2.0-S0009254119300014-main.pdf); [Connelly et al. 2012, discovery survey](https://pmc.ncbi.nlm.nih.gov/articles/PMC3274706/); [Webber et al. 2015, §§2–3 and Figure 9](https://agupubs.onlinelibrary.wiley.com/doi/full/10.1002/2015GC005879); shipped grid                                                                                                                                                         |
| Monterey Canyon / MARS          | Confirmed the main-channel continuation over 470 km offshore, walls up to 1,700 m, endpoint below 4,000 m, and local tile minimum 2,332.8 m. MARS remains at 891 m, with a 52 km cable, 10,000 V supply, 375/48 V instrument outputs and eight 100 Mbps ports; first live date 10 November 2008. Added the published MARS position 36°42.7481′N, 122°11.2139′W. Corrected the canyon-axis placement note’s depth **1,018 → 1,015 m** and north-wall spacing / relief to approximately 645 m / 267 m.                                                                                                                                                                                                                                 | [MBARI canyon overview](https://www.mbari.org/know-your-ocean/monterey-canyon/); [MBARI MARS](https://www.mbari.org/technology/monterey-accelerated-research-system-mars/); [MARS commissioning](https://www.mbari.org/news/deep-sea-observatory-goes-live-2/); [Paull et al. 2018, 7.2 m/s flow-front measurement](https://www.nature.com/articles/s41467-018-06254-6); shipped grid                                                                                                               |

## Grid checks and addition labels

Float32 minima: Challenger 10,930.89 m; Endurance 3,096.37 m; Lost City 5,002.18 m;
Blue Hole tile 3,642.63 m; Beebe 6,575.34 m; Monterey 2,332.81 m. These are tile
extents, not measurements of the named feature itself. Bilinear sampling followed
`latLonToWorld` and `Terrain.sampleDataHeight` grid geometry, before procedural relief
or local carving. The corrected catalogue reference positions sample 4.12 m at BH8,
826.98 m at the Lost City Beehive outlet reference, 4,993.46 m at the Beebe field
reference and 3,000.30 m at Endurance. Outlet heights and coarse-grid depths are
not interchangeable.

| Current scan point                                 |                              Grid depth (m) | Meaning                                                              |
| -------------------------------------------------- | ------------------------------------------: | -------------------------------------------------------------------- |
| Leggo / Eastern floor                              |                       10,925.14 / 10,919.78 | Historic deployment position / separate terrain scan                 |
| Challenger north wall / Central Pool / sill        |            9,977.71 / 10,926.50 / 10,704.39 | Grid references, not new survey records                              |
| Endurance hull                                     |                                    3,000.30 | Published wreck is 3,008 m; hull scan is at 2,995 m above local grid |
| Lost City Poseidon / Beehive / IMAX / biofilm      |           801.00 / 761.44 / 790.95 / 792.81 | Authored targets, distinct from published outlet positions           |
| Blue Hole west / east drop-off                     |                             157.16 / 196.47 | Atoll-margin survey terrain                                          |
| Beebe smokers / shrimp / western mound             |              4,987.91 / 4,979.22 / 4,957.13 | Local target terrain, not exact vent-footprint measurements          |
| Monterey head / upper channel / wall / axis / MARS | 44.30 / 265.01 / 748.24 / 1,015.38 / 888.14 | MARS published depth remains 891 m                                   |

The existing single provenance badges and reconstruction flags identify recreated
objects and plausible additions in the Journal. No “illustrative/reconstructed” or
“Game additions” prose caveats were added to entries or briefings. Terrain-only
points retain their original flags. Catalogue pins were corrected without moving
props or objectives. `copyJournal.test.ts` enforces this separation.

## Uncertain items and limits

- **Challenger absolute deepest pool:** survey methods and confidence intervals differ.
  Retained dated attribution for 2019 Western Pool and June 2020 maximum-depth results;
  no claim that the current game floor scan establishes the record. The catalogue’s
  conventional GEBCO coordinate is not an exact coordinate for the 2020 maximum.
- **Challenger historical namesake:** NOAA names Challenger II; some accounts credit
  the 1875 HMS Challenger expedition. The guide and catalogue explicitly attribute
  NOAA’s account. The Mariana Trench’s name must not be equated with the ship’s name.
- **ASHURA amphipod deployment:** Kobayashi et al. 2012 gives conflicting date/duration
  descriptions in Results and Methods. The guide retains the Methods figures
  (10 September 2009, 185 individuals, 2.5 hours), as documented in the earlier 1170
  audit. This inconsistency remains unresolved.
- **Endurance 6.4 km press/webpage distance:** coordinates, the conservation plan and
  the later navigation postscript support about 10 km from the raw logged fix.
  No inspected source explains the 6.4 km reference; the Journal flags the disagreement.
- **Endurance construction and sinking dynamics:** removed the unsupported 2.2 m keel
  measurement and preservation-by-construction explanation. The conservation plan
  supports bow-first sinking, but the exact impact/damage sequence remains uncertain.
  Its approximate north–south orientation / east–west debris description does not
  establish the game’s individual marker offsets or an exact measured heading.
- **Endurance biology:** the squat lobster’s precise identification and “first regional
  record” claim remain based on secondary reports of expert footage interpretation,
  not a specimen-level primary identification checked in this pass.
- **Lost City IMAX height:** 2005’s approximately 8 m and 2016’s approximately 30 m
  descriptions remain inconsistent; the Journal already flags this. No cause is asserted.
- **Lost City 60,000 m² estimate:** the older NOAA expedition log is indexed but direct
  access remains unreliable. Retained as an attributed approximate 2005 estimate.
  The OBIS export’s attribution to one 2003 survey also remains unverified.
- **Blue Hole positioning:** BH8 is a published central coring position, not a cadastral
  boundary or a mapped stalactite-gallery footprint. The scene remains centred at its
  existing authored location, approximately 225 m west of BH8; moving terrain/art was
  outside this content correction. Gallery geometry and exact cave offsets are additions.
  Historical Cousteau 1971 and 2018 expedition dates were retained; the old Aquatica
  report URL could not be reopened reliably in this pass.
- **Beebe model footprint and record wording:** exact Beebe-125 / western-mound model
  offsets are not established by the field reference. “Deepest known” is supported by
  the cited research publications, not an exhaustive 2026 census of all vent fields.
- **Monterey catalogue reference:** 36.8° N, 121.9° W is a representative point along
  the canyon, not its unique head or deepest point. The retained 3,600 m catalogue value
  is an offshore reference rather than the canyon endpoint; MBARI documents the
  continuation below 4,000 m. The shared Bolinopsis species-label mismatch remains
  flagged in the Journal; occurrence exports do not validate every staged encounter.
- **Grid provenance:** a smooth tile does not by itself prove absence of survey data.
  The Endurance fallback-fill inference is retained as a limitation of the shipped grid,
  not a claim that the wreck has never had a dedicated multibeam survey. Precise
  local species abundances, all legal-jurisdiction strings and physical current models
  were outside this numeric/historical audit.

## Validation

All final checks passed:

- Build / TypeScript: `npm run build -- --outDir dist-1400 --config .cache/1400-vite.config.mjs --configLoader native`.
- Full unit suite: **182 files / 1,820 tests**, `npm test -- --configLoader runner --cache=false`.
- Python suite: **156 tests**, `npm run test:py`.
- Strict content validation: **all 13 packs, zero errors or warnings**, `npm run check:content`.
- Attribution and Prettier checks passed; `git diff --check` passed.
- Browser checks: **26 passed** across `f-briefing-900`, `f-journal-debrief-1060` (two rounds), and `f-verify-lander-firstdisc-1240`, including desktop and portrait/touch coverage for all six audited sites.
- Gates smoke: **3 passed**; project-base checks: **8 passed**. E2E coverage was these focused specs plus smoke/base, rather than the complete browser suite.
- Visual QA: fresh portrait Blue Hole briefing displays **125 m** without clipping; desktop Lost City wildlife Journal shows one **Game addition** provenance badge. The targeted browser checks also assert a single tag for recreated contacts and staged wildlife/secrets.

Initial `copyJournal` failures caught the extra overview caveat paragraphs; those
paragraphs were removed without weakening the tests. Initial browser failures were
`EROFS` writes through the shared screenshot symlink. Screenshots were redirected
into a writable local directory and the complete focused run then passed.

Final logs: `.cache/1400-final-unit.log`, `.cache/1400-final-build.log`,
`.cache/1400-final-content.log`, and `.cache/1400-final-e2e.log`. Fresh screenshots
are retained under `.cache/codex/shots-1400/` and
`.cache/codex/900-f-briefing-compact/`; the original shared screenshot symlink has
been restored. The isolated build output was removed after testing.
