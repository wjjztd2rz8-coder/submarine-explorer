# C4 Kama'ehuakanaloa content (this session)

Only edited `data/landmarks/kamaehuakanaloa/` (plus this note); did not touch `src/`, `tests/`,
or `data/landmarks.json`.

## What was done

1. `species.json`: `tools/obis_export.py --landmark kamaehuakanaloa --tile-bbox --max 30` — 30
   taxa kept (of 55 matching species rank, 700 in bbox, 5,690 records): mostly deep-sea corals
   (Chrysogorgia, Iridogorgia, Paragorgia and other octocorals/bamboo corals) plus a few fish
   and a green sea turtle record.
2. `pois.json` (5 POIs, 2 primary): the real summit (`kh-summit`, -975.2 m, matches this tile's
   shallowest cell and the published ~1,000 m summit depth); Hiolo North and Hiolo South vent
   sites inside Pele's Pit (`kh-hiolo-north` -1,300.3 m, `kh-hiolo-south` -1,274.3 m — both
   real-terrain points chosen this session because they land within a few metres of the
   published depths for these two named vent sites); and two south-rift points tracing the
   seamount's most active flank (`kh-south-rift`, `kh-flank-relief`). Primary objectives
   (summit + Hiolo North) are ~0.66 km apart and close to spawn.
3. `guide.json` (5 entries): overview; a `renaming` entry on the July 2021 Lo'ihi ->
   Kama'ehuakanaloa renaming (Hawai'i Board on Geographic Names, cultural context, the 1955
   naming history it replaced); the 1996 Pele's Pit collapse (largest Hawaiian earthquake swarm
   on record, crater dimensions, post-collapse fluid temperatures); the Pele's/Hiolo vents entry
   explaining the low-sulfide, iron-rich chemistry that produces Zetaproteobacteria mats instead
   of black-smoker chimneys; and the south rift zone.
4. `props.json`: three small `procedural:chimney` props (two at Hiolo North, one at Hiolo
   South), all <=5 m tall per the task brief, `material_hint: "basalt"` (not `sulfide` — these
   vents are documented as low-sulfide/iron-rich, the opposite chemistry from a black smoker),
   all `reconstruction: true` since no published photogrammetry of the actual mound/chimney
   shapes was found.
5. `mission.json`: `hull_class: "B"`, `environment.preset: "seamount"`, surface spawn just north
   of the summit/Hiolo cluster (well under 2 minutes of descent to the deepest required POI).
   Every POI stays at or above -1,896.6 m, leaving >2,600 m of margin to hull B's -4,500 m crush
   depth — this tile's actual deepest cell (-5,027 m, well south, outside the mission's scope)
   was deliberately excluded from POIs since it would exceed hull B's rating.
6. `sources.md`: 7-source table (two USGS Hawaiian Volcano Observatory Volcano Watch articles,
   the official Hawai'i BGN renaming-proposal PDF, Wikipedia, a peer-reviewed iron-mat paper
   accessed via a WebSearch summary after a direct fetch 403'd, GMRT, OBIS), a terrain-survey
   section (via a small ad hoc `.probe_terrain.py` script built on `validate_landmark.py`'s
   `Tile` class), pacing/descent/hull-margin notes, and a fabricated-vs-sourced table.

## Validator

```
$ python3 tools/validate_landmark.py kamaehuakanaloa --strict
OK: kamaehuakanaloa, 0 error(s), 0 warning(s)
```

## Not verified / open

- Pele's Pit's ~600 m crater rim is finer than this tile's ~58x61 m GMRT grid resolves; the
  summit/Hiolo POIs sit on real terrain inside the collapsed summit area without tracing the pit
  outline itself.
- The Hiolo North/South depth and temperature figures come from a WebSearch summary of a
  peer-reviewed paper (journals.asm.org returned HTTP 403 to a direct fetch); the numbers are
  consistently attributed to that paper across search results but were not read from the full
  text directly.
- No photogrammetric or published shape data for the Hiolo vent chimneys/mounds exists; the
  three placed chimney props are generic reconstructions, flagged accordingly.
