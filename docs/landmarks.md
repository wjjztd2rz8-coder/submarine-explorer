# Bathyline — Landmark Catalog Notes

This document accompanies `data/landmarks.json` (68 entries, schema version 1, generated 2026-09-16). It records sourcing methodology, per-category notes, gameplay ideas, and how to pull in bulk feature databases for future expansion.

## Methodology

- Each entry's coordinates and depth were drafted from well-known references (mainly Wikipedia) and then cross-checked via live web search against secondary sources (NOAA, InterRidge Vents Database, agency expedition pages, peer-reviewed papers) where available.
- `confidence: "high"` — coordinates/depth corroborated by an authoritative primary source (NOAA, InterRidge, agency expedition report) or extremely well-documented (e.g., Titanic).
- `confidence: "medium"` — good agreement across sources (typically Wikipedia + one secondary check) but no direct dataset lookup (e.g., InterRidge record ID) was performed for this pass.
- `confidence: "low"` — genuinely uncertain: either the true position is intentionally undisclosed (San José galleon), the feature's position is a moving target (Thwaites grounding zone), or wreck position estimates disagree across expeditions/years (USS Johnston, USS Samuel B. Roberts — 2019 vs 2021 vs 2022 survey coordinates vary by hundreds of meters at 6,000+ m depth).
- `bbox` values are hand-sized suggested tile extents, not surveyed feature boundaries — small (tens of km) for wrecks and vent fields, large for trenches and ridges.

## Category counts (see landmarks.json `count`: 68)

| Type     | Count | Examples                                                 |
| -------- | ----- | -------------------------------------------------------- |
| wreck    | 14    | Titanic, Bismarck, Endurance, USS Samuel B. Roberts      |
| vent     | 11    | Lost City, TAG, Beebe, Loki's Castle                     |
| seamount | 9     | Kama'ehuakanaloa, Tamu Massif, Kick 'em Jenny            |
| trench   | 9     | Challenger Deep, Horizon Deep, Molloy Deep               |
| ridge    | 8     | Mid-Atlantic Ridge/Lucky Strike, Lomonosov Ridge, Silfra |
| canyon   | 7     | Monterey, Zhemchug, Nazaré                               |
| reef     | 4     | Røst Reef, Darwin Mounds, Great Barrier Reef, Molokini   |
| hole     | 2     | Great Blue Hole, Dean's Blue Hole                        |
| seep     | 2     | Orca Basin brine pool, Cape Hatteras seeps               |
| other    | 2     | Chicxulub crater rim, Thwaites grounding zone            |

## Notes on landmarks handled with caution

- **San José galleon** — Colombia has never released the wreck's precise coordinates due to an unresolved international ownership dispute (Spain, Colombia, Bolivia's Qhara Qhara nation, and salvage claimants). The entry uses an approximate public-record location off Cartagena and is explicitly flagged `confidence: "low"` with a note that the true coordinates are withheld.
- **USS Johnston / USS Samuel B. Roberts** — both were surveyed by crewed submersible at extreme hadal depths (6,400–6,900 m); published coordinates vary between the 2019, 2021, and 2022 survey reports. Marked `low` confidence pending a single canonical position.
- **Thwaites Glacier grounding zone** — this is not a fixed geographic point; the grounding line has retreated kilometers in recent years and continues to move. The catalog entry represents an approximate recent position for gameplay purposes only, flagged `low` confidence.
- **Chatham Rise / Zealandia** — included as a "shallow continental shelf" representative of the submerged Zealandia continent rather than a single sharply-defined landmark; bbox is intentionally broad.
- No landmarks from the original candidate list were fully dropped; all requested types and most named examples are represented. Two liberties were taken: (1) "Von Damm" vent field was folded into the Beebe entry's summary rather than given its own record, since it sits on the same ultraslow ridge segment and the brief already listed Beebe/Piccard as the deepest-known target; (2) the Kermadec arc's Havre eruption was included as a seamount rather than adding a separate generic "Kermadec Trench" entry, to keep the total near the 50-70 target without redundant trench entries in the same region as Tonga/Horizon Deep.

## Gameplay integration ideas (cross-cutting)

- **Depth-record ladder**: chain Challenger Deep → Horizon Deep → Sirena Deep → Milwaukee Deep as a "deepest point per ocean basin" achievement track.
- **Time-capsule wrecks**: pair wrecks with their sinking-year historical context (Lusitania/WWI, Bismarck/Yorktown/Midway-WWII, Endurance/Antarctic Age of Exploration) for narrated dive briefings.
- **Vent chemistry contrast**: Lost City (alkaline/serpentinization) vs TAG/Rainbow/Snake Pit (acidic black smokers) vs Beebe (supercritical) as a teachable gradient.
- **Living observatories**: Axial Seamount, Endeavour, and the Juan de Fuca Ridge can pull "live" flavor data from NOAA/Ocean Networks Canada monitoring pages for a real-time seismic/thermal HUD overlay.
- **Conservation zones**: Bowie Seamount MPA, Endeavour MPA, Blake Plateau coral province, and Røst Reef can carry no-trawl/no-touch gameplay restrictions consistent with real regulations.

## Bulk feature databases (for future catalog expansion)

### 1. GEBCO Gazetteer of Undersea Feature Names (IHO-IOC)

- What it is: the internationally standardized register of official undersea feature names, maintained by the IHO-IOC GEBCO Sub-Committee on Undersea Feature Names (SCUFN).
- Access: hosted as a web map application by the IHO Data Centre for Digital Bathymetry (DCDB), co-located with NOAA NCEI (https://www.ngdc.noaa.gov/gazetteer/ and https://www.gebco.net/data-products/undersea-feature-names).
- Formats: exportable as spreadsheet (CSV/XLS), Shapefile, KML, and via WMS/ArcGIS REST feature-layer endpoints — an ArcGIS Hub mirror is at https://noaa.hub.arcgis.com/maps/f09d579c68b84c5184fef1ac69ea7b24.
- Use for this project: bulk-import candidate seamounts, ridges, trenches, and canyons with official names, feature-type codes, and approximate coordinates, then hand-verify depth/coordinates for any entry promoted into `landmarks.json`.

### 2. InterRidge Global Database of Active Submarine Hydrothermal Vent Fields

- Version tested/cited here: v3.4 (25 March 2020), 721 vent fields total (666 confirmed/inferred active, 55 inactive).
- Canonical DOI/download: PANGAEA https://doi.org/10.1594/PANGAEA.917894 (flat-file data table + map).
- Also browsable live at https://vents-data.interridge.org/ (per-field pages give position, depth, tectonic setting, spreading rate, max temperature, biology notes, discovery year, references — this is exactly the InterRidge page format used to verify TAG and Beebe in this catalog).
- Use for this project: source additional vent-field candidates beyond the ~11 currently cataloged, with position/depth/tectonic-setting fields mapping directly onto our `lat/lon/depth_m/region` schema.

### 3. Seamount catalogs (Kim & Wessel 2011 / Yesson et al. 2021)

- Kim & Wessel (2011), "New global seamount census from altimetry-derived gravity data," Geophysical Journal International — a gravity-derived global seamount census (~24,600 seamounts), commonly redistributed via NOAA/academic mirrors; search "Kim Wessel 2011 seamount census data" for current hosting.
- Yesson et al. (2021), an updated global seamount and knoll dataset built on satellite altimetry plus multibeam compilations, published via the British Antarctic Survey/Zenodo-style repositories; provides point locations, estimated summit depth, and height above seafloor.
- Use for this project: both catalogs are estimate-only (derived from satellite gravity, not direct sounding in most cases) — treat any imported feature as `confidence: "low"` until corroborated by a multibeam survey or named GEBCO gazetteer entry.

### 4. NOAA AWOIS / ENC Direct wrecks & obstructions; UKHO / Wrecksite licensing

- NOAA AWOIS (Automated Wreck and Obstruction Information System) has been retired as a standalone product but its legacy records are folded into NOAA's ENC Direct to GIS service and the nautical charting wrecks/obstructions layers (https://nauticalcharts.noaa.gov/). These are public domain (US Government work) and freely redistributable.
- UKHO (UK Hydrographic Office) wreck data underlying commercial Admiralty charts is proprietary and licensed — it cannot be redistributed in a game asset without a commercial license from UKHO.
- Wrecksite.eu is a large crowd-sourced wreck database; its terms of use restrict bulk scraping/redistribution — usable for manual fact-checking of a single wreck (as done here for Lusitania/Andrea Doria/Britannic details) but not as a bulk import source without permission.
- Recommendation for this project: use NOAA public-domain wreck/obstruction data for US-water wrecks freely; for non-US wrecks (Bismarck, Titanic, Musashi, San José, etc.) continue the current approach of hand-verifying each entry against multiple public secondary sources rather than bulk-scraping licensed databases.

### 5. OBIS (Ocean Biodiversity Information System) — species-by-location API

- Base API: `https://api.obis.org/v3/`
- Tested example (species occurrence records within a bounding polygon around the Titanic wreck site):
  ```
  curl -s "https://api.obis.org/v3/occurrence?geometry=POLYGON((-49.55%2041.68,-49.55%2041.78,-49.44%2041.78,-49.44%2041.68,-49.55%2041.68))&size=3"
  ```
- Result shape (abridged, real response captured 2026-09-16):
  ```json
  {
    "total": 2,
    "results": [
      {
        "scientificName": "Xiphias gladius",
        "family": "Xiphiidae",
        "decimalLatitude": 41.75,
        "decimalLongitude": -49.53,
        "eventDate": "1999-06-17",
        "depth": 13,
        "bathymetry": 3294,
        "institutionCode": "NOAA SEFSC",
        "datasetID": "SEFSC_LogBook"
        /* ...additional taxonomic and record metadata fields... */
      }
    ]
  }
  ```
- Notes: the top-level object has `total` and a `results` array; each record carries taxonomy (kingdom → species, with WoRMS `aphiaID`), `decimalLatitude`/`decimalLongitude`, `depth` (observation depth) and `bathymetry` (seafloor depth at that point — useful for cross-checking our `depth_m` fields), plus provenance (`institutionCode`, `datasetID`, `basisOfRecord`). A `geometry` query parameter (WKT POLYGON) and `taxonid`/`scientificname` filters allow scoping to any landmark's bbox.
- Use for this project: for any landmark, build a bounding polygon from its `bbox` and call `occurrence` (or `checklist` for a species-list summary) to auto-populate/verify the `notable_species` field, rather than relying solely on prose descriptions.

## Sources consulted (representative, not exhaustive — full list embedded per-entry as `coordinate_source`/`external_links` in landmarks.json)

- NOAA Office of Ocean Exploration and Research, NOAA NCEI/DCDB Gazetteer, NOAA Monitor National Marine Sanctuary
- InterRidge Vents Database v3.4 (vents-data.interridge.org)
- Wikipedia (cross-checked, used as index rather than sole source)
- Endurance22 / Falklands Maritime Heritage Trust, UKAHT
- Five Deeps Expedition / Caladan Oceanic reports
- Ocean Networks Canada (NEPTUNE), University of Washington Interactive Oceans (Axial Seamount)
- MBARI (Monterey Canyon / Davidson Seamount)
