# Axial Seamount / ASHES content: sources and notes (package C4d)

Researched 2026-09-23. Files: `pois.json`, `guide.json`, `props.json`, `mission.json`, `species.json`
in this folder. Tile: `data/tiles/axial-seamount-ashes` (GMRT, bbox N 46.1498 / S 45.7504 /
E -129.7205 / W -130.2973, cellsize ~42.5 x 61.1 m, min/max -2853.27 / -1392.43 m).

## Sources consulted (all fetched and read this session)

| # | Source | URL | Used for |
| - | ------ | --- | -------- |
| 1 | ASHES Vent Field (RS03ASHS) -- Ocean Observatories Initiative | https://oceanobservatories.org/site/rs03ashs/ | ASHES coordinate (45.9337 N, -130.0139 W), depth 1,552 m, instruments (thermistor array, HD camera, osmotic sampler, seismometers), cable/node infrastructure |
| 2 | ASHES -- Axial Caldera, OOI Regional Cabled Array, University of Washington Interactive Oceans | https://interactiveoceans.washington.edu/research-sites/axial-caldera/ashes | Mushroom (4 m, >275 degC, unchanged since late 1980s, CAMHDS301 camera site), Inferno (~10 m from Mushroom), Hell/Phoenix/Virgin (<4 m each), Virgin Mound (sub-metre anhydrite spire, CO2-rich), fauna (Ridgeia tube worms, palm worms, sulfide worms, limpets, scale worms, spider crabs, filamentous bacteria/ciliates), "near base of the western caldera wall / ~130 m east of the boundary fault", instrument list |
| 3 | Inferno Vent at Axial -- OOI Regional Cabled Array | https://interactiveoceans.washington.edu/inferno-vent-at-axial/ | Inferno description, black-smoker/metal-sulfide composition, tube worms and palm worms, ~10 m from Mushroom |
| 4 | Axial Caldera -- OOI Regional Cabled Array, University of Washington Interactive Oceans | https://interactiveoceans.washington.edu/research-sites/axial-caldera | 20+ streamed instruments, five Medium-Power J-Boxes serving ASHES and International District, 1998/2011/2015 eruption dates, ">8,000 earthquakes" marking the 2015 eruption start |
| 5 | Axial Seamount -- Wikipedia | https://en.wikipedia.org/wiki/Axial_Seamount | Distance from Oregon coast (~480 km), Cobb hotspot / Juan de Fuca Ridge setting, summit depth (1,410 m), caldera dimensions (~3 x 8 km rectangular, boundary faults up to ~150 m relief, floor ~50 m deeper on north side), eruption history (1998, 2011, 2015) and flow sizes (1998 up to 13 m thick; 2011 ~3x larger), ASHES discovery (late 1980s, SW caldera) |
| 6 | Researchers Think Axial Seamount is Erupting -- Right on Schedule -- NOAA Pacific Marine Environmental Laboratory | https://www.pmel.noaa.gov/news-and-media/highlights/researchers-think-axial-seamount-erupting- | Chadwick/Nooner's successful September 2014 forecast of the 2015 eruption (~7 months lead time), team affiliations (OSU/CIMRS, PMEL, UNC Wilmington) |
| 7 | Blog to chronicle eruption forecasts at Axial Seamount -- Bill Chadwick, Oregon State University / CEOAS | https://axial.ceoas.oregonstate.edu/axial_blog.html | Current (20 Sept 2026) forecast status: full re-inflation past the 2015 threshold, uplift slowed to ~6.5 cm/yr, seismicity <100 events/day on most days, "nothing seems imminent at the moment" |
| 8 | Axial Seamount inflation threshold forecasts -- NOAA Pacific Marine Environmental Laboratory | https://www.pmel.noaa.gov/eoi/rsn/Forecasts3.html | Corroborates caldera resurfacing by repeated eruptions, used alongside Wikipedia for the caldera-floor entry |
| 9 | ASHES Venting -- NOAA Ocean Exploration | https://oceanexplorer.noaa.gov/multimedia/ashes-venting/ | Secondary corroboration of diffuse venting/mineral-deposit description at ASHES (not directly cited in guide.json; used to cross-check field description) |
| 10 | Global Multi-Resolution Topography (GMRT) Synthesis -- Ryan et al. 2009, doi:10.1029/2008GC002332 | https://www.gmrt.org/ | Seabed depths on this tile, grid resolution |
| 11 | Ocean Biodiversity Information System (OBIS) | https://obis.org/ | `species.json` occurrence data (via `tools/obis_export.py`) |
| 12 | data/landmarks.json (this repo) | -- | Catalog entry: nominal position 45.95, -130.0089; facts/hooks/notable_species used as a starting checklist |
| 13 | Axial Seamount, ASHES -- Marine Regions Gazetteer (InterRidge Global Database of Active Submarine Hydrothermal Vent Fields v3.4, citing Tunnicliffe et al. 1985) | https://marineregions.org/gazetteer.php?p=details&id=64780 | Independent coordinate corroboration: 45.9333 N, -130.014 W -- within ~50 m of the OOI RS03ASHS coordinate used for placement (see "Coordinate choice" below) |
| 14 | ASHES Vent Field 2018 -- NOAA Ocean Exploration | https://oceanexplorer.noaa.gov/multimedia/ashes-vent-field-2018/ | Secondary corroboration that Inferno is part of ASHES; did not name Hell/Phoenix/Virgin, so not relied on for those specifics |

The InterRidge vents-data page for `axial-seamount-ashes` was attempted
(`https://vents-data.interridge.org/ventfield/axial-seamount-ashes`) but its TLS certificate is
currently expired (fetch failed with "certificate has expired" on 2026-09-23), matching the same
failure noted in the Lost City pack's `sources.md` for the same site; it was not used. Wikipedia's
own `ASHES_vent_field` article gives a materially different coordinate (45.9266 N, -129.9795 W,
about 2.9 km east of the OOI coordinate) and was not used for placement (see "Coordinate choice"
below); it corroborates depth (~1,550 m) and field area (2,826 sq m) only and those figures are
cross-checked against source 1/2 above, so Wikipedia's `ASHES_vent_field` page is not separately
cited in `guide.json`.

## Coordinate choice

Two different published coordinates exist for ASHES:

- **OOI's own RS03ASHS site page** (source 1): 45.9337 N, -130.0139 W, 1,552 m. This is the
  operator's own instrumented-site coordinate -- authoritative for where the observatory's own
  hardware (and, per source 2, the Mushroom-adjacent camera) actually sits.
- **Wikipedia's `ASHES_vent_field` infobox**: 45.9266 N, -129.9795 W, ~1,550 m -- about 2.9 km east
  of the OOI coordinate.

This tile's real terrain reads 1,540.1 m at the OOI coordinate and 1,516.2 m at the Wikipedia
coordinate -- both plausible vent-field depths, so terrain alone does not resolve the discrepancy.
A third, independent source -- the Marine Regions Gazetteer's InterRidge Global Database entry
(source 13, citing Tunnicliffe et al. 1985, the field's original description) -- gives 45.9333 N,
-130.014 W, within about 50 m of the OOI coordinate and nothing like the Wikipedia one, which is the
deciding evidence for the coordinate choice below.
The OOI coordinate was used for every ASHES POI/prop because (a) it is the field's own operator and
primary source, (b) source 2 states the field lies "near the base of the western caldera wall,"
which matches the OOI point's position relative to this tile's western wall (see `caldera-wall` POI)
far better than the Wikipedia point, which sits close to the caldera's eastern side. Unlike Lost
City's ~600 m miss (where the published coordinate landed outside the field's depth range entirely),
neither Axial coordinate reads outside the field's real depth range, so no separate "coordinate
discrepancy" POI was added here; the gap is documented in this file instead.

## Terrain survey (this session, via `tools/validate_landmark.Tile`, same bilinear convention used

by `validate_landmark.py`)

- Tile overall: shallowest 1,392.4 m sampled at a grid cell near 45.944 N, -130.025 W (close to the
  `axial-caldera-summit` POI, 1,395.3 m at the exact POI coordinate); deepest 2,853.3 m at 46.133 N,
  -130.096 W, well north of the caldera and not used by this mission (off-volcano flank terrain, not
  attributed to any sourced feature).
- East-west transect at ASHES's latitude (45.9337) shows the caldera floor stepping from ~1,540 m at
  Mushroom down to a shallow high around 1,405-1,420 m roughly 250-700 m west (used for the
  `axial-caldera-wall` POI, placed at the +300 m point, 1,416.4 m), then back down to ~1,530-1,560 m
  further east and at the outer rim (~1,558-1,560 m at the tile edges).
- North-south transect at ASHES's longitude (-130.0139) shows a similar shallow high (1,449-1,461 m)
  about 400-950 m south of Mushroom, used for the `axial-caldera-floor` POI (placed at 1,460.2 m,
  ~940 m south).
- No source maps either shallow high to a specific dated lava flow, so both are described generically
  in `guide.json` as caldera-floor/lava terrain consistent with repeated resurfacing (source 5), not
  attributed to 1998, 2011 or 2015 specifically.

## Chimney material

Axial's ASHES chimneys are classic black smokers: metal-sulfide-rich, near-black with rusty staining,
unlike Lost City's pale carbonate towers (source 3 explicitly calls Inferno "a black smoker"). Every
chimney in `props.json` sets `"material_hint": "sulfide"` (see `docs/props.md`). This also happens to
match `Config.props.vent` (`src/core/Config.ts`)'s existing default vent-preset fluid (`'sulfide'`),
so `mission.json`'s `environment.overrides` was left empty -- the vent preset's defaults (smoke
colour, glow) already model a black-smoker field like this one; no override was needed, unlike Lost
City which had to override the preset toward its cooler, carbonate look.

## Hull class

Every POI on this mission sits between 1,395 m and 1,540 m of real terrain (deepest: the ASHES
chimneys at ~1,540 m). Class A's crush depth (-1,000 m) does not clear that, so `mission.json` uses
`hull_class: "B"` (crush depth -4,500 m), giving nearly 3,000 m of margin -- comfortable, matching
Lost City's own Class B choice for a similar depth range.

## OBIS species data

`python3 tools/obis_export.py --landmark axial-seamount-ashes --tile-bbox --depth-min 1300
--depth-max 1700 --max 30 --out data/landmarks/axial-seamount-ashes/species.json` (checklist
endpoint): 157 taxa in the bbox, 39 at species rank within the 1,300-1,700 m depth window, top 30 by
record count kept (823 records). The results are a strong match for the sourced biology: the list
includes `Ridgeia piscesae` (the Juan de Fuca Ridge tube worm named in guide.json's `vent-life`
entry), `Lepetodrilus fucensis` (a vent limpet), `Provanna variabilis` and `Depressigyra globulus`
(vent snails), several `Stygiopontius`/`Aphotopontius`/`Humesipontius` copepods and
`Cladopolynoe`/`Levensteiniella`/`Harmothoe` polychaete worms typical of NE Pacific vent fields, and
non-vent deep-sea fauna typical of this depth on the wider seamount (e.g. `Psychrolutes phrictus`,
the blob sculpin; `Paragorgia arborea var. pacifica`, a bubblegum coral; `Graneledone
boreopacifica`, a deep-sea octopus). `species.json.note` states placement of any animal shown in the
mission is invented; the occurrence data only says these taxa have been recorded somewhere in this
tile's bounding box within the depth window, not at any specific chimney.

## Fabricated vs. sourced

| Item | Sourced | Reconstructed / estimated |
| ---- | ------- | -------------------------- |
| Seabed terrain | GMRT bathymetry (real survey) | Render-time detail noise (engine) |
| ASHES field position, depth, field area | Sources 1, 2 (OOI coordinate + depth); Wikipedia (area) | -- |
| Mushroom (height, temperature, camera site) | Sources 1, 2 | Exact footprint/shape; base diameter estimate |
| Inferno (temperature, fauna, ~10 m from Mushroom) | Sources 2, 3 | Exact position (10 m offset, bearing invented); height (no source) |
| Hell / Phoenix / Virgin (named, <4 m) | Source 2 | Exact positions and heights (all estimates) |
| Virgin Mound | Source 2 (name, sub-metre size, CO2-rich fluid) | Not modelled as a separate prop (below practical prop scale); mentioned in guide.json only |
| Vent fauna list | Source 2; corroborated by data/landmarks.json's Wikipedia-sourced `notable_species` | Visual placement on any specific chimney |
| Caldera dimensions, eruption dates, forecast status | Sources 5, 6, 7 | -- |
| Caldera-wall / caldera-floor / caldera-summit POIs | Real GMRT terrain (this session's transects) | Attribution to a specific eruption year (not claimed) |
| Spawn point | -- | Chosen for gameplay: ~570 m north-east of Mushroom, heading 205 deg |

## Not verified / open

- No source gives Inferno's, Hell's, Phoenix's or Virgin's individual coordinates or heights beyond
  "less than about 4 m" / "~10 m from Mushroom" -- all relative placements within the ASHES cluster
  are this session's estimates, documented per-POI and per-prop.
- The shallow highs used for `axial-caldera-wall` and `axial-caldera-floor` are real terrain but are
  not tied to a specific eruption year by any source found; described generically in `guide.json`.
- Live Science's 2025 coverage of the eruption forecast (`livescience.com/.../underwater-volcano-off
  -oregon-coast-likely-wont-erupt-before-mid-to-late-2026`) and the Global Volcanism Program's Axial
  Seamount page (`volcano.si.edu`) were found but could not be fetched (truncated / 403 respectively)
  this session; not cited. The forecast-status facts instead come directly from Bill Chadwick's own
  blog (source 7, primary) and NOAA PMEL (source 6, primary), which is at least as authoritative.
- The InterRidge Vents Database entry for this field (an independent source used for other vent
  fields in `data/landmarks.json`) could not be reached (expired TLS certificate, same failure noted
  in Lost City's `sources.md`); a retry later might add a second citation for named-chimney facts.
