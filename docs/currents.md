# Offline site currents

Each of the 13 dive tiles has a checked-in 3×3 velocity grid in
`data/currents/<tile>.json`. `tools/currents.py --fetch` samples the archived
[NRL HYCOM GOFS 3.1 GLBy0.08 experiment 93.0](https://www.hycom.org/dataserver/gofs-3pt1/analysis)
through its [NetCDF Subset Service](https://ncss.hycom.org/thredds/ncss/GLBy0.08/expt_93.0/dataset.html).
The snapshot is **2024-01-15 12:00 UTC**, fetched **2026-09-24 UTC**. The
source is a modeled ocean state, not a direct site measurement or a live
forecast. HYCOM lists the data as **DoD Distribution A: approved for public
release; distribution unlimited**. The client never contacts HYCOM.

The tool requests `water_u` (eastward) and `water_v` (northward) at the tile
bbox's northwest, centre and southeast coordinate lines. HYCOM stores both as
packed Int16 with `scale_factor=0.001`; the tool applies that factor and
preserves its `-30000` fill value as `null`. Each JSON records its site/tile
mapping, source URL, source time, fetch time, distribution statement and
representative model depth. Run `python3 tools/currents.py` to validate all
files offline; `npm run test:py` also checks them. The fetch command is only
needed when deliberately refreshing the archived snapshot.

| Representative depth | Sites                                               |
| -------------------- | --------------------------------------------------- |
| 50 m                 | Great Blue Hole                                     |
| 100 m                | Hudson Canyon, Hunga Tonga caldera, Monterey Canyon |
| 500 m                | Blake Plateau corals                                |
| 700 m                | Lost City                                           |
| 1,000 m              | Axial Seamount ashes, Kamaʻehuakanaloa              |
| 2,000 m              | Endurance                                           |
| 3,000 m              | Beebe vent field, Bismarck, Titanic                 |
| 5,000 m              | Challenger Deep                                     |

The 0.08° longitude / 0.04° latitude model cannot resolve wrecks, vents,
reefs, the Blue Hole's interior, narrow canyon branches or near-bottom
boundary layers. A grid uses one model depth across its tile; it is a
representative environmental layer, not a claim that the flow is measured at
the boat's exact depth. Monterey Canyon has 4 of 9 wet cells and Hudson
Canyon has 7 of 9 at their selected depths. Masked corners contribute zero
to interpolation. Grids and their limitations are deliberately visible in
the JSON rather than being replaced by invented velocities.

The renderer maps eastward velocity to world `+X` and northward to world
`-Z`, interpolates bilinearly between cells and clamps outside the grid.
`Realistic` applies the full sampled vector, subject to the existing 0.8 m/s
physics cap. `Gentle` uses 35% of it. `Off` applies zero at every site and
also disables the vent and canyon preset forces. Canyon terrain bends and
scales its site's HYCOM vector; it does not add a second fixed current. The
existing `env:current` event reports the final direction and speed to the
HUD. A missing or invalid JSON file applies zero and is labeled “offline
data unavailable” when currents are enabled. A predictive terrain and tile
edge guard prevents the added current impulse from steering the hull into
the seafloor or beyond the loaded tile.

Monterey Canyon's authored `currentDirDeg: 255` supplies its canyon-axis
bearing. Its `currentSpeedMps: 0.5` scales the sampled speed by `0.5 / 0.35`
(the C3 preset default), before the global cap. That override is a
site-specific modulation of the sourced field, not an additional 0.5 m/s
push.
