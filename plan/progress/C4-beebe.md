# C4 Beebe Vent Field content (this session)

Only edited `data/landmarks/beebe-vent-field/` (plus this note); did not touch `src/`, `tests/`,
or `data/landmarks.json`.

## What was done

1. `species.json`: `tools/obis_export.py --landmark beebe-vent-field --tile-bbox --max 30` — 8
   taxa (all matching, 20 records in bbox), including *Rimicaris hybisae* (aphiaID 762988) — an
   independent OBIS confirmation of the vent shrimp inside this exact tile bbox, corroborating
   the guide's Nye et al. (2012) sourcing from a different database.
2. `pois.json` (5 POIs, 2 primary): the real Beebe 1-5 black-smoker complex (`bvf-main-vents`,
   -4,987.9 m, within tens of metres of Wikipedia's published field coordinate and Connelly et
   al. 2012's depth range) and a Rimicaris hybisae swarm point 35 m away
   (`bvf-shrimp-swarm`, `reconstruction: true`) as the two required objectives. Three optional
   objectives: a second sulfide mound (`bvf-sulfide-mound-west`), the field's shallow eastern
   margin (`bvf-eastern-margin`, confidence "low" — real terrain but not a confirmed vent
   location), and the Mid-Cayman Spreading Centre's axial valley traced along this tile's
   deepest NW-SE trough (`bvf-spreading-axis`, -5,395.8 m, ~13 km from the main cluster).
3. `guide.json` (4 entries): overview (discovery history, naming after William Beebe, and an
   explicit note that Von Damm — the ridge's other major vent field — sits ~13 km southwest at
   ~2,300 m, outside this tile's bbox, and is therefore described for context only, per the task
   brief); the supercritical black-smoker chemistry/temperature entry; the Rimicaris hybisae
   biology entry; and the ultraslow Mid-Cayman spreading-axis entry.
4. `props.json`: three `procedural:chimney` props, all `material_hint: "sulfide"` (the
   near-black, rust-streaked black-smoker palette — the opposite chemistry/palette from this
   batch's Kama'ehuakanaloa pack, which uses `basalt` for its low-sulfide iron-oxide vents), all
   `reconstruction: true` since no photogrammetric shape data for Beebe's real chimneys was
   found.
5. `mission.json`: `hull_class: "C"` — the only class that clears this tile's terrain at all
   (hull B's -4,500 m crush depth is shallower than every POI here, so B would fail outright,
   not just warn). `environment.preset: "vent"`, surface spawn just north of the primary cluster
   (~5.1 min descent to the deepest required POI at 3x sim speed — under the ~12-min threshold,
   so no mid-water-spawn shortcut is needed here, unlike Challenger Deep).
6. `sources.md`: 9-source table (Connelly et al. 2012 via Wikipedia/search summaries after
   Nature.com redirected to a login wall, Wikipedia for Beebe and Von Damm, Webber et al. 2015,
   Nye et al. 2012's own author PDF, PNAS, InterRidge (link-only, connection refused), GMRT,
   OBIS), a terrain-survey section (`.probe_terrain.py`, an ad hoc script on
   `validate_landmark.py`'s `Tile` class), pacing/descent/hull-margin notes, and a
   fabricated-vs-sourced table.

## Validator

```
$ python3 tools/validate_landmark.py beebe-vent-field --strict
OK: beebe-vent-field, 0 error(s), 0 warning(s)
```

## Not verified / open

- The Nature Communications (Connelly et al. 2012) and AGU GGG (Webber et al. 2015) full texts
  were not fetched directly this session (login wall / not attempted); their facts come via
  Wikipedia and WebSearch summaries that consistently attribute the same specific numbers to
  each paper.
- This tile's ~58x61 m GMRT grid cannot resolve individual sulfide chimneys or mounds; all POI
  coordinates are real terrain within or very near the field's published depth range, not traced
  outlines of specific named structures.
- No photogrammetric or published shape data for Beebe's actual chimneys exists; the three
  placed chimney props are generic reconstructions, flagged accordingly.
- InterRidge's vent-field database page (vents-data.interridge.org) returned a connection error
  to WebFetch both times it was tried; kept as a reference link only, no fact rests on it alone.
