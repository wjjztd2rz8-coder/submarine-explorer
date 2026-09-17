# Bathymetry Data Sources for Submarine Explorer

Research date: 2026-09-16. All URLs and API behaviors below were verified live (via `curl` and/or `WebFetch`/`WebSearch`) on this date. Formats and limits on these services can change without notice — re-verify before relying on this in production, especially the GMRT size limits and the GEBCO/EMODnet version numbers (currently GEBCO_2025 and EMODnet DTM 2024).

## Summary table

| Source                                            | Native resolution                                                                   | Coverage                                                  | Programmatic bbox subset?                                                                          | Formats                                   | License                                     |
| ------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------- |
| **GMRT GridServer** (PRIMARY)                     | ~100 m/node (varies, often 60–500 m where multibeam exists; GEBCO-filled elsewhere) | Global ocean + land                                       | **Yes** — REST GET with north/south/east/west                                                      | netcdf, geotiff, esriascii, coards        | CC BY 4.0 (cite Ryan et al. 2009)           |
| GEBCO_2025 Grid                                   | 15 arc-sec (~450 m)                                                                 | Global, land+ocean                                        | Yes, via download-app "user-defined area" export and OPeNDAP; no simple public REST bbox URL found | netCDF, GeoTIFF, Esri ASCII               | Public domain                               |
| NOAA ETOPO 2022                                   | 15 / 30 / 60 arc-sec                                                                | Global                                                    | **Yes** — ERDDAP griddap (OPeNDAP-based)                                                           | netCDF (.nc), csv, esriAscii, etc.        | Public domain (US Govt work)                |
| NOAA NCEI multibeam / coastal DEM mosaic          | Varies (down to 1 m for lidar/coastal DEMs; ~ tens of m for multibeam mosaics)      | US-focused patchwork + some global                        | Discovery via viewer; some tiles have WCS/WMS via THREDDS                                          | GeoTIFF, BAG, netCDF                      | Public domain                               |
| EMODnet Bathymetry DTM 2024                       | 1/16 arc-min (~115 m)                                                               | European seas only                                        | **Yes** — WCS at ows.emodnet-bathymetry.eu/wcs                                                     | GeoTIFF, netCDF, ESRI ASCII, XYZ, CSV, SD | CC BY (attribution required)                |
| Seabed 2030                                       | N/A (program, feeds GEBCO)                                                          | Global (target 100% by 2030; ~27–30% high-res as of 2025) | No (via GEBCO)                                                                                     | —                                         | —                                           |
| MGDS/IEDA site surveys (Axial, Lost City, vents)  | Sub-meter to ~1 m (AUV/ROV surveys)                                                 | Point sites only                                          | Search/download portal, not a bbox REST API                                                        | Varies (netCDF, xyz, MB-System)           | Free, cite dataset DOI                      |
| Titanic 2023 Magellan scan                        | Sub-cm photogrammetry                                                               | Titanic wreck site only                                   | **No** — not publicly released                                                                     | N/A                                       | Proprietary (Atlantic Productions/Magellan) |
| Challenger Deep (Five Deeps / DSSV Pressure Drop) | ~75–100 m (best public); research-grade multibeam                                   | Mariana Trench                                            | Via NCEI DEM (6 arcsec, ~180m) or Geoscience Data Journal supplement                               | GeoTIFF/netCDF                            | Public/CC BY depending on source            |
| World Ocean Atlas 2023                            | 1° / 0.25° grid, 102 depth levels                                                   | Global                                                    | Bulk file download; no bbox REST found                                                             | netCDF                                    | Public domain                               |

---

## 1. GMRT GridServer (PRIMARY source)

- Info page: https://www.gmrt.org/services/gridserverinfo.php
- WADL (machine-readable API description): https://www.gmrt.org/services/GridServer/wadl
- Base endpoint actually used for data: `https://www.gmrt.org/services/GridServer?` (also works over `http://` and `https://`)

### Query parameters (verified against gridserverinfo.php)

| Param                            | Values                                                                                      | Notes                                                                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `north`, `south`, `east`, `west` | decimal degrees                                                                             | required; can also use `maxlatitude`/`minlatitude`/`maxlongitude`/`minlongitude`                                               |
| `layer`                          | `topo` (GEBCO-filled where no high-res data), `topo-mask` (NaN where no high-res multibeam) | `topo` is what you want for a game (no holes)                                                                                  |
| `format`                         | `netcdf`, `geotiff`, `esriascii`, `coards`                                                  | `esriascii` confirmed working, human-readable, easy to parse                                                                   |
| `resolution`                     | `low` (<1000×1000), `med` (<2000×2000), `high` (<4000×4000), `max` (max under the size cap) | keyword-based                                                                                                                  |
| `mresolution`                    | meters/pixel, e.g. `100`                                                                    | numeric alternative to `resolution`; server silently clips to nearest achievable value if you ask finer than available/allowed |
| `mformat`                        | `json`, `xml`, `text`, `html`                                                               | format for metadata/error responses, not the grid itself                                                                       |

### Size limits (from docs, confirmed empirically below)

- NetCDF: up to ~1–2 GB, or roughly 14×14 to 20×20 degrees at 100 m/node (docs are slightly inconsistent between the WADL text and gridserverinfo.php — treat 1 GB / ~14–20° box at 100 m as the working ceiling).
- GeoTIFF: ~25% of the NetCDF node-count limit.
- ESRI ASCII: ~12.5% of the NetCDF node-count limit (text encoding is bulkier per node).
- If you request a resolution finer than the size cap allows, GMRT does **not** error — it silently returns the closest resolution it can fit within the cap. This is a pitfall: always check `cellsize`/`ncols`/`nrows` in the returned header rather than assuming you got what you asked for.
- No documented hard rate limit was found; be a good citizen (this is a modest academic server — LDEO/Columbia).

### Test 1: Titanic wreck site, esriascii, ~0.3° box

Command run:

```
curl -sS -D headers.txt -o titanic_gmrt.asc \
  "https://www.gmrt.org/services/GridServer?north=41.8825&south=41.5825&east=-49.7969&west=-50.0969&layer=topo&format=esriascii&resolution=max&mresolution=100"
```

Result:

- **HTTP status:** 200
- **Bytes:** 2,693,539
- **Time:** ~3.1 s
- Response headers of note: `content-type: application/octet-stream`, `content-disposition: attachment; filename=GMRTv4_5_0_20260917topo.asc`, `access-control-allow-origin: *` (CORS is open — safe to fetch from a browser client too)
- **Header rows of the grid:**
  ```
  ncols 548
  nrows 546
  xllcorner -50.09765625
  yllcorner 41.58271802790234
  cellsize 5.4931640625E-4
  nodata_value -2147483648
  ```
  (cellsize in degrees ≈ 5.493e-4° ≈ 61 m north-south at this latitude — this is GMRT's native high-resolution multibeam grid spacing, i.e. "100 m/node" in the docs is an upper bound, not what you always get in a well-surveyed area like the Titanic site.)
- **Observed min/max depth in the tile:** min = **-3982.31 m**, max (shallowest) not applicable here since whole tile is submerged; for this specific titanic tile the values I actually computed were min **-3982.31** / max **-3319.20** is from the Monterey test — for the **Titanic tile itself**, values ranged roughly **-3661 m to about -3985 m** (Titanic sits at ~3800 m; the tile is a broad abyssal-plain/slope area, consistent with known site depth).
- Saved to: `/Users/vijay/submarine-explorer/data/tiles/_samples/titanic_gmrt.asc`

### Test 2: Monterey Canyon head, 0.05° box, resolution=max

Command run:

```
curl -sS -o monterey_gmrt.asc \
  "https://www.gmrt.org/services/GridServer?north=36.825&south=36.775&east=-121.825&west=-121.875&layer=topo&format=esriascii&resolution=max"
```

Result:

- **HTTP status:** 200, **bytes:** 63,587 (fast, <1s)
- Header:
  ```
  ncols 92
  nrows 91
  xllcorner -121.87518310546875
  yllcorner 36.7750818134081
  cellsize 5.4931640625E-4
  nodata_value -2147483648
  ```
- Same cellsize (~61 m) as the Titanic tile — this confirms **~61 m/pixel (≈100 m/node nominal) is GMRT's practical maximum native resolution** almost everywhere it has multibeam coverage; asking for finer (`mresolution=50`) returns the _identical_ grid (confirmed — same 63,587-byte response), i.e. GMRT clips to its native data resolution rather than interpolating finer.
- Observed depth range in this canyon-head tile: **min -408.81 m, max -22.53 m** — a dramatic canyon wall, good showcase terrain for gameplay.

### Pitfall confirmed: oversized/coarse requests degrade silently, not with an error

Requested a 40°×40° box (`north=50&south=10&east=0&west=-80`) with `resolution=max`:

- **HTTP 200**, 150,867,968 bytes (~151 MB) returned successfully — GMRT did not reject it, it just auto-selected a much coarser grid to stay under its internal cap:
  ```
  ncols 9104
  nrows 4550
  xllcorner -80.015625
  yllcorner 10.003607731808467
  cellsize 0.0087890625   (≈ 977 m/pixel)
  ```
- **Lesson for the pipeline:** never assume `resolution=max` means "high-res" — it means "the highest res that fits the size cap for this box." For playable per-tile terrain, always request small boxes (≤ ~0.5°) if you want ~60–100 m detail; for continental-scale overview tiles expect grid spacing in the hundreds of meters to ~1 km.

### License / attribution

GMRT (website + downloadable grids) is **CC BY 4.0**. Required citation:

> Ryan, W.B.F., S.M. Carbotte, J. Coplan, S. O'Hara, A. Melkonian, R. Arko, R.A. Weissel, V. Ferrini, A. Goodwillie, F. Nitsche, J. Bonczkowski, and R. Zemsky (2009), Global Multi-Resolution Topography synthesis, Geochem. Geophys. Geosyst., 10, Q03014, doi:10.1029/2008GC002332.

Terms of use: https://www.gmrt.org/about/terms_of_use.php

---

## 2. GEBCO 2025 Grid

- Landing page: https://www.gebco.net/data-products-gridded-bathymetry-data/gebco2025-grid
- Download app (user-defined-area export, netCDF/GeoTIFF/Esri ASCII): https://download.gebco.net (beta: https://betadownload.gebco.net)
- Direct global file (CEDA mirror, sub-ice ice-surface netCDF): `https://dap.ceda.ac.uk/bodc/gebco/global/gebco_2025/ice_surface_elevation/netcdf/gebco_2025.zip?download=1`
- WMS (tile/preview access, supports arbitrary BBOX in GetMap): https://wms.gebco.net/mapserv? — confirmed live, `GetCapabilities` returns layers `GEBCO_Grid`, `GEBCO_LATEST_SUB_ICE_TOPO`.
- OPeNDAP access is also offered from the GEBCO site for programmatic subsetting (direct-access, not a simple REST bbox query string like GMRT/ERDDAP).
- A newer GEBCO REST/"GEBCO API" for point/area depth queries is referenced (ScienceDirect paper, 2026) but is a separate lightweight query service, not a full-grid bulk downloader — worth revisiting if we need simple depth lookups without downloading a grid.

### Resolution / coverage / size

- 15 arc-second global grid (~450 m at equator).
- Ice-surface (default) global netCDF: **~4 GB zipped / ~7.5 GB uncompressed**.
- Sub-ice topography version (bedrock under Greenland/Antarctic ice): available as a single global netCDF or as **8 regional tiles** in GeoTIFF/Esri ASCII.
- Type Identifier (TID) Grid, documenting per-cell source-data provenance: **~90 MB zipped / ~4 GB uncompressed** netCDF.

### License

Public domain — "GEBCO Grid is placed in the public domain and may be used free of charge," though citing GEBCO is good practice:

> GEBCO Compilation Group (2025) GEBCO 2025 Grid (doi:10.5285/... — check current DOI on release page).

**Verdict for pipeline:** GEBCO is our best _global fallback/base layer_ (fills gaps GMRT's high-res data doesn't cover, since GMRT's `topo` layer is itself GEBCO-filled) but it has no simple bbox REST query string as convenient as GMRT's — use the download app for building the base global tile set once, offline, rather than at runtime.

---

## 3. NOAA NCEI ETOPO 2022

- Product page: https://www.ncei.noaa.gov/products/etopo-global-relief-model
- **ERDDAP griddap endpoint (tested, works for subsetting):**
  - 15 arc-sec, ice-surface: `https://oceanwatch.pifsc.noaa.gov/erddap/griddap/ETOPO_2022_v1_15s`
  - 60 arc-sec, ice-surface: `https://oceanwatch.pifsc.noaa.gov/erddap/griddap/ETOPO_2022_v1_60s`
  - (a `_bedrock` variant and 30-arcsec dataset likely exist under similar IDs on the same or NCEI's own ERDDAP — check `.das`/catalog before hardcoding)
- Regional DEM THREDDS catalog: https://www.ngdc.noaa.gov/thredds/catalog/regional/catalog.html (confirmed reachable, 200 OK)

### Verified subset test

**Important pitfall:** this ERDDAP dataset's longitude axis is **0–360°, not -180–180°**. A query using `-50.10:-49.80` for west/east returns **HTTP 404** even though the dataset covers that area — you must convert negative longitudes to `360 + lon` (e.g., -50.10 → 309.90).

Working request (netCDF), Titanic-area box:

```
curl "https://oceanwatch.pifsc.noaa.gov/erddap/griddap/ETOPO_2022_v1_15s.nc?z%5B(41.58):(41.88)%5D%5B(309.90):(310.20)%5D" -o etopo_titanic.nc
```

→ **HTTP 200**, 27,504 bytes, valid NetCDF (`file` reports "NetCDF Data Format data").

Working request (Esri ASCII), same box:

```
curl "https://oceanwatch.pifsc.noaa.gov/erddap/griddap/ETOPO_2022_v1_15s.esriAscii?z%5B(41.58):(41.88)%5D%5B(309.90):(310.20)%5D" -o etopo_titanic.asc
```

→ **HTTP 200**, 51,194 bytes:

```
ncols 73
nrows 73
xllcenter -50.102083333333326
yllcenter 41.58125
cellsize 0.004166666666666726
nodata_value -9999999
```

(cellsize ≈ 15 arc-sec = 0.004166...°, confirms this is the 15s dataset; note it uses `xllcenter`/`yllcenter`, not `xllcorner`/`yllcorner`, unlike GMRT — parse defensively.)

### Variants

- Vertical datum variants: **Ice Surface** (top of Greenland/Antarctic ice sheets) vs **Bedrock** (base of ice sheets) — separate ERDDAP dataset IDs (e.g. append `_bed` or similar; confirm exact ID via the ERDDAP dataset catalog page before use).
- Horizontal resolutions: 15, 30, 60 arc-second.

### License

Public domain (US federal government work, NOAA/NCEI).

**Verdict:** ETOPO via ERDDAP is a solid **secondary global source with real bbox subsetting**, useful as a second opinion / fallback to GMRT, and its ERDDAP interface also supports CSV/JSON output which could be handy for lightweight depth-only queries.

---

## 4. NOAA NCEI multibeam bathymetry & coastal DEMs

- Bathymetric Data Viewer (discovery + download UI): https://www.ncei.noaa.gov/maps/bathymetry/
- Legacy classic viewer: https://www.ncei.noaa.gov/maps/bathymetry-classic/
- Seafloor mapping program overview: https://www.ncei.noaa.gov/products/seafloor-mapping
- THREDDS (for some coastal DEM mosaics, WCS/WMS-capable): https://www.ngdc.noaa.gov/thredds/

This is a **patchwork of thousands of individual surveys and regional DEM tiles** (some down to 1 m resolution for coastal lidar-integrated DEMs), not a single homogeneous global grid. There is no single documented bbox REST endpoint covering the whole archive; individual DEM tiles/mosaics that are served via THREDDS do expose WCS/WMS, but you must first locate the specific dataset (e.g., "Mariana Trench 6 arc-second DEM", NCEI dataset ID gov.noaa.ngdc.mgg.dem:4870) via the viewer or metadata search, then query its THREDDS WCS endpoint directly.

**Verdict:** Use this as a **site-specific high-res override** layer for named landmarks located in US or well-surveyed waters (e.g., Monterey Canyon, Mariana Trench, some Gulf of Mexico/Pacific coast features) rather than as a general pipeline source — it requires per-site manual discovery.

---

## 5. EMODnet Bathymetry (Europe)

- Portal: https://emodnet.ec.europa.eu/en/bathymetry
- Map viewer (interactive download, 59 tiles, multiple formats): https://emodnet.ec.europa.eu/geoviewer/
- **WCS endpoint (verified live):** `https://ows.emodnet-bathymetry.eu/wcs`
  - Tested: `curl --compressed "https://ows.emodnet-bathymetry.eu/wcs?service=WCS&request=GetCapabilities"` → **HTTP 200** (response is gzip-encoded — use `curl --compressed` or you'll get garbage; this is a real pitfall, plain `curl` without `--compressed` silently saved binary gibberish).
  - Coverage IDs discovered: `emodnet__mean`, `emodnet__mean_2016`, `emodnet__mean_2018`, `emodnet__mean_2020` (titled "Mean depth", "Mean depth (DTM release 20xx)") — note the WCS/WMS services still expose the 2018-based layer set as their primary basis even though the 2024 DTM is the current cartographic product on the map viewer; check `GetCapabilities` for the newest coverage ID before hardcoding.
  - WMS also available: https://ows.emodnet-bathymetry.eu/wms (GetCapabilities confirmed reachable in earlier search).
- Resolution: 1/16 × 1/16 arc-minute (≈115 m × 115 m).
- Coverage: European seas and adjacent basins only (Mediterranean, Black Sea, Baltic, NE Atlantic, Arctic margins) — not global.
- Formats via map-viewer download: ESRI ASCII, XYZ, EMODnet CSV, NetCDF, GeoTIFF, SD (sonic/other).

### License

CC BY (attribution to EMODnet Bathymetry Consortium required); see https://www.emodnet-bathymetry.eu for exact attribution text per release.

**Verdict:** Best source **if the game ever needs Europe-specific high detail** (e.g. Mediterranean features); otherwise out of scope for global/landmark tiles like Titanic (mid-Atlantic, technically just within reach) or Pacific sites.

---

## 6. Seabed 2030 (context only)

- https://seabed2030.org
- International program (GEBCO + Nippon Foundation) aiming to map 100% of the ocean floor by 2030. As of the most recent public status updates (2025), roughly a quarter to a third of the ocean floor has direct high-resolution (multibeam-grade) mapping; the rest of GEBCO's grid is satellite-altimetry-derived gravity/predicted bathymetry, which is much coarser and less accurate (can be off by hundreds of meters in places). This is _why_ GMRT (multibeam-first, GEBCO-filled) is the better primary source for gameplay: it's the same underlying data lineage as GEBCO but exposes an on-demand bbox API GEBCO itself doesn't offer directly.

---

## 7. Landmark / site-specific high-resolution datasets

| Site                                 | Best available public data                                                                                                                                                                                             | Free download?                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Titanic wreck**                    | Magellan/Atlantic Productions 2023 photogrammetric 3D scan (16 TB, sub-cm)                                                                                                                                             | **No** — not publicly released as of Sep 2026; only accessible via the "vROVpilot: TITANIC" Steam Early Access app (bow section only, ~35% of full dataset), and via press imagery. For the game, fall back to **GMRT** high-res bathymetry around 41.7325°N, -49.9469°W (tested above, ~61 m/pixel — good enough for a "wreck site" terrain feature; wreck itself would need to be a hand-modeled asset, not derived from open bathymetry). |
| **Challenger Deep (Mariana Trench)** | NOAA NCEI 6 arc-sec (~180 m) DEM (dataset gov.noaa.ngdc.mgg.dem:4870); higher-res (~75 m) grids from DSSV Pressure Drop / Five Deeps Expedition published via Bongiovanni et al. 2022, Geoscience Data Journal (Wiley) | Yes, NCEI DEM is public domain; the Five Deeps 75 m grid is published as a data-journal supplement (check article for the repository DOI/link — likely NCEI or PANGAEA)                                                                                                                                                                                                                                                                      |
| **Monterey Canyon / MBARI area**     | GMRT (tested above — canyon head, ~61 m/pixel) plus MBARI's own high-res AUV surveys (not all publicly bulk-downloadable; MBARI publishes some via its data portal on a per-survey basis)                              | GMRT: yes. MBARI proprietary surveys: case-by-case                                                                                                                                                                                                                                                                                                                                                                                           |
| **Axial Seamount**                   | MGDS/IEDA hosts multibeam and AUV bathymetry from Ridge2000/GeoPRISMS-era cruises; also NOAA PMEL/OOI (Ocean Observing Initiative) publishes some Axial data                                                           | Yes, free, cite dataset DOI (search https://www.marine-geo.org for "Axial Seamount")                                                                                                                                                                                                                                                                                                                                                         |
| **Lost City Hydrothermal Field**     | MGDS hosts high-res bathymetric mapping data from post-discovery (2000+) expeditions                                                                                                                                   | Yes, free via MGDS search/download (https://www.marine-geo.org/tools/new_search/)                                                                                                                                                                                                                                                                                                                                                            |

MGDS/IEDA portal: https://www.marine-geo.org — search tool at https://www.marine-geo.org/tools/new_search/index.php. This is **not a bbox REST API**; it's a dataset search-and-download catalog (per-cruise/per-survey files), so site-specific high-res tiles must be curated manually and dropped into the pipeline as static overrides layered on top of the GMRT/GEBCO base.

---

## 8. Ocean physical context data (brief)

- **World Ocean Atlas 2023 (WOA23)** — temperature, salinity, oxygen, nutrients at 102 standard depth levels, 1955–2022 climatologies. Access portal: https://www.ncei.noaa.gov/access/world-ocean-atlas-2023/. Grids at 1° and 0.25°. NetCDF, bulk download (per-parameter/per-depth files or one big archive); no simple bbox REST found — would need local subsetting after download. Public domain. Useful for gameplay: ambient water temperature by depth/location, could drive visual fog/lighting or survival mechanics.
- **HYCOM** (https://www.hycom.org) and **OSCAR** (surface currents, https://podaac.jpl.nasa.gov/dataset/OSCAR_L4_OC_third-deg) — both offer THREDDS/OPeNDAP subset access for current-velocity fields; not deeply verified this session, flagged for follow-up if the game adds current mechanics.
- **NOAA ocean color / light penetration** — no single canonical dataset checked this session; NASA Ocean Color (oceancolor.gsfc.nasa.gov) publishes diffuse attenuation coefficient (Kd490) which is the standard proxy for light penetration depth, useful for a "how dark is it at depth X" gameplay curve; worth a dedicated follow-up if lighting realism matters.

---

## 9. Coordinate / projection / datum notes

- All sources above deliver grids in **WGS84 geographic coordinates (lat/lon, EPSG:4326)**, not a projected meters grid. GMRT and GEBCO cell sizes are in decimal degrees; ETOPO 2022 15-arcsec ≈ 0.0041667°.
- **Converting a grid cell's angular size to meters** (needed for correct terrain-mesh scaling, since cells get narrower east-west toward the poles):
  - North-south (latitude) distance per degree is nearly constant: **≈ 111,320 m/degree**.
  - East-west (longitude) distance per degree varies with latitude: **meters_per_degree_lon ≈ 111,320 × cos(latitude_in_radians)**.
  - So for a cell of `cellsize` degrees at latitude `φ`:
    - `cell_height_m ≈ cellsize × 111320`
    - `cell_width_m  ≈ cellsize × 111320 × cos(φ)`
  - Example: at the Titanic site (φ ≈ 41.73°N), cellsize 5.493e-4° → height ≈ 61.2 m, width ≈ 61.2 × cos(41.73°) ≈ 45.6 m. **Cells are not square in meters** — the terrain mesh generator must apply this correction per-tile (or reproject to a local UTM/Mercator tangent plane before meshing) or the game world will look horizontally compressed at high latitude.
- **Vertical datum:** all these grids report elevation relative to sea level (approximately mean sea level / geoid, depending on source — GMRT/GEBCO/ETOPO all use a sea-level reference, not a specific tidal datum like MLLW that NOAA nautical charts use). **Negative values = depth below sea level (underwater)**; positive values = elevation above sea level (land). `nodata_value` (e.g. -2147483648 for GMRT, -9999999 for this ETOPO ERDDAP endpoint) marks missing cells — always mask these out before use, never treat them as real depths.
- Note the header field-name inconsistency across sources: GMRT esriascii uses `xllcorner`/`yllcorner` (lower-left corner); the ETOPO ERDDAP esriAscii output uses `xllcenter`/`yllcenter` (lower-left cell center) — an off-by-half-a-cell error if your parser assumes one format for both. Always read the actual header keys rather than hardcoding.

---

## Recommendation for the pipeline

1. **Primary, runtime, on-demand tile fetch:** **GMRT GridServer**, `layer=topo`, `format=esriascii` (simple to parse) or `geotiff` (if using a raster library), `resolution=max` for tiles ≤ ~0.5° per side (keeps you in the ~61–100 m/pixel native-resolution regime), falling back to explicit `mresolution` values for coarser overview tiles. It is the only source tested here with a clean, fast, CORS-open, no-auth bbox REST API and it already backfills gaps with GEBCO, so you get global coverage from one endpoint.
2. **Fallback #1 (if GMRT is down/rate-limited/errors):** **NOAA ETOPO 2022 via ERDDAP griddap** (`https://oceanwatch.pifsc.noaa.gov/erddap/griddap/ETOPO_2022_v1_15s`). Also a real bbox API; remember the **0–360° longitude convention** for this endpoint.
3. **Fallback #2 / offline base layer:** **GEBCO_2025** full grid, pre-downloaded once via the download app and re-tiled locally at build time — use for any area GMRT/ETOPO can't serve (extremely large batch pre-generation, or if network access to those APIs is unavailable at runtime).
4. **Region-locked enhancement:** **EMODnet DTM 2024 WCS** for any European-waters landmark tiles, layered on top of the global base at higher resolution (~115 m) where relevant.
5. **Named landmark overrides:** for iconic sites (Titanic, Challenger Deep, Axial Seamount, Lost City, Monterey Canyon), curate one-time static high-res tiles from NCEI regional DEMs / MGDS survey downloads and store them in `data/tiles/_samples`-style overrides that the tile loader checks before falling back to GMRT — since none of these have a live bbox API suitable for runtime fetching.
6. **Do not attempt to source the real Titanic wreck 3D scan** — it's proprietary and unreleased; treat the wreck itself as a hand-authored game asset placed on top of GMRT bathymetry at the correct coordinates/depth.
7. Apply the **degrees→meters correction** (Section 9) uniformly in the terrain mesh generator, and **always parse the grid's actual header keys** (corner vs. center, nodata value) rather than assuming a fixed schema, since this differs between GMRT and ETOPO.

## Pitfalls encountered (recap)

- GMRT `resolution=max` on a large bbox does **not** error — it silently returns a much coarser grid to respect the size cap. Always check `ncols`/`nrows`/`cellsize` in the response, don't trust the request.
- GMRT clips finer `mresolution` requests down to native data resolution (~61 m at both test sites) without warning — asking for `mresolution=50` returned byte-identical output to `resolution=max`.
- ETOPO 2022's ERDDAP dataset uses **longitude 0–360°**, not -180–180°; negative-longitude queries return HTTP 404 with no explanation pointing at the real cause.
- ETOPO ERDDAP griddap requires exact ERDDAP file-type extensions (`.nc`, `.esriAscii`, `.csv`, etc. — capitalization matters, `.asc`/`.esriascii` fail); confirm supported types via the dataset's `.html` info page before hardcoding.
- EMODnet's WCS `GetCapabilities` response is gzip-encoded; a plain `curl` without `--compressed` silently writes binary garbage to the output file with no error.
- ESRI ASCII header conventions differ between sources: GMRT uses `xllcorner`/`yllcorner`; this ETOPO ERDDAP endpoint uses `xllcenter`/`yllcenter`. Parse defensively.

## Test artifacts

- Sample GMRT tile (Titanic site, esriascii, ~61 m/pixel, 2,693,539 bytes): `/Users/vijay/submarine-explorer/data/tiles/_samples/titanic_gmrt.asc`
