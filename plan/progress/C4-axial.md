# C4 Axial Seamount / ASHES finish (this session)

Followed `plan/PHASE-C-CONTRACTS.md` SS1-3, SS5 (vent type, `vent` preset, black-smoker
`material_hint: "sulfide"` -- first pack to use it, per `docs/props.md`). Only edited
`data/landmarks/axial-seamount-ashes/` (all 6 files, new) plus this note; did not touch `src/`,
`tests/` or other landmark folders.

## What was done

1. Read `data/landmarks.json`'s entry and `data/tiles/axial-seamount-ashes/meta.json`, then sampled
   `heightmap.bin` directly with `validate_landmark.Tile` (same bilinear convention the validator
   uses) to map the caldera: tile shallowest point 1,392.4 m near 45.944 N/-130.025 W (close to the
   published 1,410 m summit depth), deepest 2,853.3 m at 46.133 N/-130.096 W (off-volcano flank
   terrain, north of the caldera, not used). Ran east-west and north-south transects through the
   ASHES field to find the real rising western-wall terrain and a shallow caldera-floor high used
   for two geology POIs.
2. Sourcing: fetched and read OOI's own RS03ASHS site page and University of Washington Interactive
   Oceans' Axial Caldera/ASHES pages (primary/authoritative -- the OOI Regional Cabled Array
   operator), NOAA PMEL's forecast-history page and Bill Chadwick's own eruption-forecast blog
   (primary, Chadwick/Nooner, updated 20 Sept 2026 -- gives a live, dated "not imminent" status for
   today, 2026-09-23), Wikipedia for Axial Seamount's general geology/eruption history, GMRT for
   terrain, and the Marine Regions Gazetteer's InterRidge Global Database entry (citing Tunnicliffe
   et al. 1985) as independent coordinate corroboration. Every `guide.json` entry cites >= 2
   sources, at least one primary, per the sourcing bar; full table with "used for" notes in
   `sources.md`.
3. **Coordinate discrepancy investigated and resolved, not fabricated over.** OOI's own RS03ASHS
   page gives 45.9337 N, -130.0139 W (1,552 m); Wikipedia's separate `ASHES_vent_field` article gives
   45.9266 N, -129.9795 W, about 2.9 km east. Both read plausible depths on this tile (1,540.1 m vs.
   1,516.2 m), so terrain alone didn't resolve it. The Marine Regions/InterRidge gazetteer
   independently gives 45.9333 N, -130.014 W -- within ~50 m of OOI's coordinate -- which, combined
   with OOI/UW's own description of ASHES sitting "near the base of the western caldera wall" (a
   description that matches the OOI point's position relative to this tile's western wall much
   better than the Wikipedia point), settled the choice. InterRidge's `vents-data.interridge.org`
   site itself could not be reached (expired TLS certificate, same failure the Lost City pack hit).
4. `pois.json` (6 POIs): Mushroom and Inferno chimneys (both primary/required, ~10 m apart -- easily
   inside the ~3 km pacing guideline), a Hell/Phoenix/Virgin minor-chimney cluster, and three
   real-terrain geology POIs (western caldera wall, a caldera-floor lava high, and the tile's
   shallowest caldera-rim point) flagged as an optional longer detour per the pacing note.
5. `props.json` (5 `procedural:chimney` props, all `material_hint: "sulfide"`): Mushroom, Inferno,
   Hell, Phoenix, Virgin. All flagged `reconstruction: true`; heights sourced where published
   (Mushroom ~4 m, documented since the late 1980s), estimated where not (Inferno, Hell, Phoenix,
   Virgin -- all "generally less than ~4 m" per source). Virgin Mound (a separate sub-metre anhydrite
   feature) is mentioned in `guide.json` but not modelled as its own prop -- below the engine's
   practical prop scale.
6. `guide.json` (8 entries): overview, Mushroom/Inferno, the minor-chimney cluster, vent-floor life
   (tube worms, palm worms, limpets, scale worms, spider crabs -- matches `data/landmarks.json`'s
   `notable_species`), the western caldera wall, the resurfaced caldera floor, an eruption-forecast
   entry (1998/2011/2015 history plus the *current*, dated 2026-09-20 Chadwick/Nooner forecast
   status -- "nothing seems imminent at the moment" -- since today's date in this session is
   2026-09-23, this is a live, sourced hook rather than a stale fact), and the caldera rim/OOI
   cabled-array entry.
7. `species.json`: `tools/obis_export.py --landmark axial-seamount-ashes --tile-bbox --depth-min
   1300 --depth-max 1700 --max 30` (checklist endpoint): 157 taxa in the bbox, 39 at species rank in
   the depth window, top 30 by record count kept (823 records). Strong match to the sourced biology
   -- includes *Ridgeia piscesae* (the tube worm named in the guide), *Lepetodrilus fucensis* (a vent
   limpet), several vent-associated copepod/polychaete genera, plus non-vent deep-sea fauna typical
   of this depth on the wider seamount (blob sculpin, bubblegum coral, a deep-sea octopus).
   `species.json.note` states placement of any animal in the mission is invented.
8. `mission.json`: `hull_class: "B"` (crush -4,500 m; deepest POI ~1,540 m, ~2,960 m of margin),
   `environment.preset: "vent"` with **no overrides** -- `Config.props.vent`'s existing defaults
   (`fluid: 'sulfide'`, full smoke intensity/glow) already model a black-smoker field, unlike Lost
   City which had to override toward a cooler carbonate look. Spawn ~570 m north-east of Mushroom.
   Two required objectives (Mushroom, Inferno) ~10 m apart; four secondary objectives (minor
   chimneys plus three real-terrain geology points) fan out to ~1.4 km as optional exploration.

## Validator and tests

```
$ python3 tools/validate_landmark.py axial-seamount-ashes --strict
OK: axial-seamount-ashes, 0 error(s), 0 warning(s)
```

0 errors, 0 warnings -- no unavoidable warning to explain. `python3 tools/validate_landmark.py --all
--quiet` shows no regressions in the other five packs (challenger-deep and lost-city still show
their own previously-documented, accepted warnings; titanic shows its own two; axial, endurance and
monterey-canyon are clean). `npm run test:py` -> 107 tests, all pass.

## Per-entry source list (all URLs fetched and read this session; full table in sources.md)

- **overview** -- Wikipedia, UW Interactive Oceans (Axial Caldera), GMRT (Ryan et al. 2009), Marine
  Regions/InterRidge gazetteer.
- **mushroom-inferno** -- OOI RS03ASHS, UW Interactive Oceans (ASHES page), Inferno Vent at Axial.
- **minor-chimneys** -- UW Interactive Oceans (ASHES page), NOAA Ocean Exploration (ASHES Venting).
- **vent-life** -- UW Interactive Oceans (ASHES page), data/landmarks.json (Wikipedia-sourced
  `notable_species`).
- **caldera-wall** -- OOI RS03ASHS, GMRT (Ryan et al. 2009).
- **caldera-floor** -- Wikipedia, NOAA PMEL (inflation threshold forecasts page).
- **eruption-forecast** -- NOAA PMEL (forecast-success highlight), Bill Chadwick's OSU/CEOAS blog,
  Wikipedia.
- **caldera-summit** -- Wikipedia, UW Interactive Oceans (Axial Caldera), GMRT (Ryan et al. 2009).

## Dropped facts (full list in sources.md)

- Wikipedia's `ASHES_vent_field` coordinate (45.9266 N, -129.9795 W) was not used for placement --
  see the coordinate-discrepancy note above; the page's non-coordinate facts (depth ~1,550 m, field
  area 2,826 sq m) match sources 1/2 and were kept but not separately cited, since sources 1/2 state
  the same figures directly.
- Live Science's 2025 eruption-forecast coverage and the Global Volcanism Program's Axial Seamount
  page were found but could not be fetched this session (truncated / 403 respectively); not cited.
  The forecast facts instead come from Bill Chadwick's own blog and NOAA PMEL, both primary.
- The InterRidge vents-data site itself (as opposed to its Marine Regions gazetteer mirror) could not
  be reached -- expired TLS certificate, the same failure noted in the Lost City pack.

## Not verified / open

- No source gives Inferno's, Hell's, Phoenix's or Virgin's individual coordinates -- all relative
  placements within the ASHES cluster beyond Mushroom (the one point with a directly sourced
  coordinate) are this session's estimates, documented per-POI/per-prop.
- The two real-terrain geology POIs away from the chimney cluster (`axial-caldera-wall`,
  `axial-caldera-floor`) are genuine GMRT terrain but are not tied to a specific eruption year by any
  source found; described generically as caldera resurfacing rather than attributed to 1998, 2011 or
  2015 specifically.
