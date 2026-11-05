# S-fact-check-journal-2 — 2026-11-05

Second pass over Hudson Canyon, Blake Plateau, Challenger Deep,
Kamaʻehuakanaloa, Axial / ASHES and Hunga. Follows
[S-fact-check-journal](S-fact-check-journal.md): reviewed remaining Journal guide,
species-export notes, catalogue facts, mission text, POI notes and `site.json`
opening labels. Axial and Kama geology corrections from the first pass remain.

## Corrections

| Site                  | Finding and action                                                                                                                                                                                                                                                                                                                                          | Evidence                                               |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Hudson                | Replace the old 38,000 sq mi protection-area figure with the Council's corrected **41,440 sq mi**. Describe restrictions on **most** bottom-tending commercial gear, including the lobster/red-crab trap exceptions. Remove the unverified assertion that this particular coral marker lies inside the protected boundary.                                  | H1                                                     |
| Hudson                | Attribute catastrophic-flood evidence to the **Hudson Shelf Valley**, rather than the canyon as a whole. Preserve earlier river/meltwater development; remove the suggestion of exclusively abrupt formation.                                                                                                                                               | H2                                                     |
| Hudson                | Keep proposed sanctuary status, June 2022 initiation and 17,000+ comments. Name the September 2025 expedition without claiming it is the latest or that its announcement proves a particular sanctuary-review purpose. Replace unsupported catalogue sand-tiger-shark highlight with NOAA's sperm whales.                                                   | H3–H4                                                  |
| Hudson                | Correct the advertised maximum grid depth from **1,682.6 to 1,683.1 m**. Keep local marker depths separate from canyon-wide published depths.                                                                                                                                                                                                               | Shipped Float32 grid maximum depth 1,683.0848 m.       |
| Blake                 | Replace the unsupported **~4°C** local temperature and misleading **200–1,000 m species range** with the export's **585–866 m recorded depths**, explicitly scoped to those records. Keep naturally white, non-photosynthetic coral biology and the current name Desmophyllum pertusum.                                                                     | B1–B2; OBIS export                                     |
| Blake                 | Drop the asserted **90 m maximum** and small-mound width generalization. Table 3 reports much larger classified relief in some subregions; retain the supported general description of relief in tens of metres without inventing a universal maximum. Distinguish **83,908 peaks in the whole study region** from the **6.4 million-acre coral province**. | B1, §§3.1, 3.3 and Table 3                             |
| Blake                 | Correct scan-marker separation from **~400 to ~294 m**. Remove claims that local depth samples alone establish two mapped coral mounds, a channel between them or a mechanism preventing food from pooling. Describe the sampled terrain and mapping limits.                                                                                                | Shipped marker coordinates and grid; B1                |
| Blake                 | Align the catalogue's regional depth description to **roughly 500–1,000 m** and replace secondary-only guide references with the mapping paper and NOAA account.                                                                                                                                                                                            | B1–B2; broad regional range, not a species-wide limit. |
| Challenger            | Use **Philippine Sea Plate**. Remove “international” from the catalogue's EEZ field and retain FSM. Remove unsupported site-specific xenophyophore/holothurian highlights; the guide already identifies xenophyophore footage as **Sirena Deep**.                                                                                                           | C1–C3                                                  |
| Challenger            | The ASHURA paper contradicts itself: Results says **10 July 2009 / 3 h**, Methods says **10 September / 2.5 h**. Use **2009**, retain **185 amphipods / 10,897 m**, and leave date/duration unresolved. The enhanced cellulase activity at **100 MPa / 2°C** is supported and retained. Remove a categorical pressure-only explanation for fish absence.    | C4, Results and Materials and Methods                  |
| Axial                 | Replace “built entirely on chemosynthesis” and unsupported lavender-blue ciliate detail with documented microbes and fauna. Retain chimney-versus-diffuse-flow clam distinction and explain mixing with cold seawater.                                                                                                                                      | A1–A2                                                  |
| Hunga                 | Correct the pre-eruption survey fact to **November 2015 / May 2016**, the surveys used in the repeat-mapping paper. Clarify that the **1,029 m** outer-flank point is partway down an edifice rising **~2 km**, rather than its base; drop the unsupported size ranking. Add accessible author-deposited full text.                                         | T1, Methods and setting                                |
| All six species notes | Describe bounding-box/depth-filter scope and dated occurrence counts. Remove Hunga's unsupported guess that most records precede 2022 or show recolonisation. Challenger's reported **0–1.6 m** values do not by themselves prove near-surface sampling. Kama and Axial regional lists do not establish Hiolo/ASHES chimney communities.                    | O1–O2; direct checklist queries and shipped metadata   |

## Species verification and limits

Queried all six exact `species.json.source_url` endpoints on 2026-11-05.
Compared every exported taxon ID, name and record count against returned results:

| Site       | Exported rows checked | Snapshot / live taxa total | Comparison                                                 |
| ---------- | --------------------: | -------------------------: | ---------------------------------------------------------- |
| Hudson     |                    30 |              1,524 / 1,527 | Eight seabird counts increased; other exported rows match. |
| Blake      |                    25 |                    95 / 95 | All exported names and counts match.                       |
| Challenger |                    30 |                  180 / 180 | All exported names and counts match.                       |
| Kama       |                    30 |                  700 / 706 | All exported names and counts match.                       |
| Axial      |                    30 |                  157 / 157 | All exported names and counts match.                       |
| Hunga      |                    25 |                  175 / 175 | All exported names and counts match.                       |

Preserved the dated snapshots and their `fetched_at` timestamps; this was an audit,
not a new species import. A present-day checklist cannot independently reconstruct
the September snapshot. Checklist responses do not contain event dates or the
per-record depth evidence needed to revalidate every stored depth range. Those
ranges remain reported metadata, **not** species-wide tolerances or exact-POI
presence. Unusual Kama entries (including Porphyra at 1,302 m) and other questionable
records need original occurrence/dataset review before ecological interpretation;
no unsourced taxonomic or depth repair was invented. OBIS documents quality flags
for dates, coordinates, depths and taxonomy. Counts are not abundance estimates.

## Confirmed and unresolved

- Hudson's published dimensions and proposed designation agree with NOAA.
  Exact protection-boundary inclusion of the coral marker remains unverified.
- Blake's 31 mapping surveys, 23 submersible dives, 500 × 110 km province,
  254 × 42 km core and 6.4 million acres agree with Sowers / NOAA. Coarse GMRT
  samples do not substitute for the paper's classified mound polygons.
- Challenger's **10,935 ± 6 m** June 2020 depth remains supported by Greenaway et
  al. Rankings of pools stay survey-specific; no new deepest point is asserted.
  ASHURA's conflicting date and duration remain unresolved.
- Kama's **~975 m summit**, **1996 swarm**, Hiolo chemistry and emergence
  uncertainty remain as corrected in the first pass. New work here is species
  provenance, not a renewed eruption or island-emergence forecast.
- ASHES's named chimneys, fauna and rare diffuse-flow clams agree with UW.
  No new eruption-status claim was added.
- Hunga's historical pre-2022 experience is retained. Ribó's full text confirms
  **~150→850 m**, **4.5→4.8 km**, and erosion outside the caldera. The **~58 km**
  plume is supported by Taha et al.; other studies give ~57 km, so the rounded
  value is not treated as a unique measurement. Tile metadata do not establish
  the survey year of every cell or the pre-/post-eruption dates of species records.

Direct checks used `tools/validate_landmark.py`'s `Tile` sampler and raw Float32
extrema. Relevant unchanged marker depths (m): Hudson **941.90 / 976.72 / 541.92**;
Blake **744.19 / 768.11 / 775.52 / 779.72**; Challenger **10,925.14 / 10,919.78 /
9,977.71 / 10,926.50 / 10,704.39**; Hiolo **1,300.33 / 1,274.27**; ASHES **1,540.11**;
Hunga **468.59 / 292.89 / 131.61**. Blake marker distance uses their coordinates
with local spherical distance (~294 m), not prop spacing.

No runtime logic, geometry, positions, objective links or provenance flags changed.
The existing **one Recreation / Game addition tag** remains; no repeated addition
caveats were added. Each site's `sources.md` links to this audit. `site.json`
contains configuration and destination labels rather than additional scientific
claims; no edits were needed there.

## Sources inspected

- **H1:** [MAFMC final-rule announcement](https://www.mafmc.org/newsfeed/2016/noaa-fisheries-announces-final-rule-on-mid-atlantic-councils-frank-r-lautenberg-deep-sea-coral-protection-area), including its corrected-area footnote and gear exceptions.
- **H2:** [Thieler et al. 2007 / USGS](https://www.usgs.gov/publications/a-catastrophic-meltwater-flood-event-and-formation-hudson-shelf-valley), abstract and formation sequence.
- **H3:** [NOAA Hudson designation page](https://sanctuaries.noaa.gov/hudson-canyon/), dimensions, wildlife, proposal status and process.
- **H4:** [NOAA September 2025 expedition announcement](https://sanctuaries.noaa.gov/news/2025/explore-the-depths-hudson-canyon-live.html), Global Explorer, Nancy Foster, sampling and livestreams.
- **B1:** [Sowers et al. 2024](https://doi.org/10.3390/geomatics4010002), full [NOAA repository PDF](https://repository.library.noaa.gov/view/noaa/64470/noaa_64470_DS1.pdf) downloaded and text inspected, especially §§2–3 and Table 3.
- **B2:** [NOAA mapping announcement, 17 January 2024](https://oceanexplorer.noaa.gov/news/million-mounds-news/), area, depths, coral identity and healthy white colour.
- **C1:** [Stewart & Jamieson 2019](https://doi.org/10.1016/j.earscirev.2019.102896), survey differences and FSM EEZ.
- **C2:** [USGS Philippine Sea Plate setting](https://pubs.usgs.gov/of/2010/1083/m/) (existing source; direct access returned 403); [NOAA Mariana setting](https://www.ncei.noaa.gov/news/planet-postcard-mariana-trench) and the cited bathymetric literature support the plate context.
- **C3:** [Scripps xenophyophore observations](https://scripps.ucsd.edu/news/research-highlight-scientists-id-giant-amoebas-extreme-deep), Sirena Deep; existing guide correctly scopes this evidence.
- **C4:** [Kobayashi et al. 2012](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0042727), Results, Methods and enzyme experiments; date/duration inconsistency directly inspected.
- **C5:** [Greenaway et al. 2021 / NOAA repository](https://repository.library.noaa.gov/view/noaa/33477), depth methods and 95% confidence interval.
- **A1–A2:** UW Regional Cabled Array [ASHES](https://interactiveoceans.washington.edu/research-sites/axial-caldera/ashes/) and [Inferno](https://interactiveoceans.washington.edu/inferno-vent-at-axial/), animal communities, mixing and clams.
- **K1:** [USGS Kamaʻehuakanaloa](https://www.usgs.gov/volcanoes/kama%E2%80%98ehuakanaloa), summit and 1996 swarm; detailed Hiolo references remain in the first-pass audit.
- **T1:** [Ribó et al. 2026 author repository](https://openrepository.aut.ac.nz/items/739ece41-4021-4129-b3ee-d2928eea8089), full PDF downloaded and inspected; Nature landing page redirected to an inaccessible identity endpoint.
- **T2:** [Walker & de Ronde 2024](https://doi.org/10.1029/2024GC011685), post-eruption bathymetry and hydrothermal investigation; [Taha et al. 2022](https://agupubs.onlinelibrary.wiley.com/doi/10.1029/2022GL100091), ~58 km plume.
- **O1–O2:** Each shipped `species.json.source_url` was queried directly; [OBIS API](https://api.obis.org/) and [OBIS quality documentation](https://manual.obis.org/dataquality.html) describe occurrence data and metadata limits.

## Validation

- Strict validators: **all 13 sites pass**, zero errors and warnings.
- `npx vitest run tests/unit/copyJournal.test.ts --configLoader runner --cache=false`: **29 passed**, covering source retention, scan links, single tags and content tone.
- Searched `tests/e2e` for Journal copy, species sources and addition tags, then ran:
  - `npx playwright test tests/e2e/f-content-fix.spec.ts -g '(blake-plateau-corals|hunga-tonga-caldera): sourced content is readable in the Journal'`: **2 passed**.
  - `npx playwright test tests/e2e/globe.spec.ts -g 'Journal lists the survey species with their OBIS sources'`: **1 passed**.
  - `npx playwright test tests/e2e/journal-debrief.spec.ts -g 'all declared sites give secrets and staged wildlife exactly one addition tag'`: **2 passed**, desktop and phone, all declared sites.
- These browser checks used the isolated `dist-s-fact-check-journal-2-focused` build and ports **4195–4197**, with `GATES_CONFIG_MODE=writable`. Inspected the Hunga overview and Blake coral-entry screenshots, plus Hudson’s phone opening: readable content, source links, provenance, visible terrain and HUD; no blank rendering.
- Initial screenshot capture hit a pre-existing `.cache/codex/shots` symlink into a read-only checkout. Used a local writable output directory and reran successfully; the symlink target was untouched. After validation, restored the original symlink and retained new captures under `.cache/s-fact-check-journal-2/browser-shots/`.
- Verified programmatically that all six species payloads except `note`, all POI fields except research notes/sources, and all mission objectives/spawns are unchanged.
- `GATES_CONFIG_MODE=writable PW_PORT=4198 PW_OUTDIR=dist-s-fact-check-journal-2-final bash tools/gates.sh`: **PASS**, including build/typecheck, content, **167 Python tests**, **4,597 unit tests across 195 files**, **203 browser smoke/input/camera checks**, **8 project-base browser checks**, attribution and whole-repository formatting.
- The full run used a temporary Vitest thread pool with verbose reporting; the checked-in runner configuration was restored after the unit gate. Earlier quiet runs were interrupted before completion; no default-pool pass is claimed. Initial source-count warnings were fixed with relevant primary references before the passing run.
- Final `git diff --check` and formatting check of the completed progress note: **pass**. Removed the isolated build outputs after validation; logs remain under `.cache/s-fact-check-journal-2/` and the gate run directory.
