# C4 Great Blue Hole finish (this session)

Followed `plan/PHASE-C-CONTRACTS.md` §1-3, §5 (strict honesty rule: the GMRT tile
does not resolve the ~300 m sinkhole; no fabricated terrain, no depression props,
one real-centre geology POI with `reconstruction: false`, guide explains the
resolution limit and describes the real hole from sources). Only edited
`data/landmarks/great-blue-hole/` (all 6 files, new) plus this note; did not touch
`src/`, `tests/` or any other landmark folder.

## What was done

1. Read `data/landmarks.json`'s entry and `data/tiles/great-blue-hole/meta.json`,
   then **directly verified the premise this session**: sampled `heightmap.bin`
   (bilinear, same convention as `validate_landmark.py`) at the hole's published
   coordinates (17.3153N, 87.5346W) and got **-4.2 m** — nowhere near the real
   124 m sinkhole. A radial scan east and west of that point out to 15 km confirmed
   a flat, shallow reef top (a few metres deep) for several kilometres, then a real,
   steep drop-off to open ocean (down to -3,600+ m). Full numeric scan in
   `sources.md`.
2. Sourcing: Wikipedia (diameter/depth, UNESCO status, ice-age formation dates,
   Cousteau's 1971 ledges, stalactites, species), Live Science and GPS World for the
   2018 Blue Hole Belize Expedition (Aquatica Submarines, Kongsberg sonar, first
   complete 3D sonar map, conch graveyard, new stalactite fields, hydrogen-sulfide
   anoxic layer), and Lighthouse Reef's own Wikipedia article for atoll context.
3. `pois.json` (4 POIs, exactly matching the task brief's four features, all
   `reconstruction: false` except the biology framing): `great-blue-hole-centre`
   (primary, `kind: geology`, sits honestly on this tile's real ~4 m terrain at the
   published coordinates, no depression, no prop — the note explains the limitation
   plainly), `great-blue-hole-reef-rim` (secondary, real shallow reef-flat terrain),
   `great-blue-hole-outer-dropoff` (secondary, the real steep atoll margin found by
   the radial scan), and `great-blue-hole-reef-life` (secondary, biology, co-located
   with the reef rim, `reconstruction: true` only for the species-placement framing,
   not the terrain — no source surveys animals at this exact point).
4. `props.json`: empty array. No depression markers, no fabricated hole geometry,
   per the task brief.
5. `guide.json` (5 entries): an overview stating the resolution limit in its first
   paragraph (with the exact terrain reading vs. the real depth), a detailed
   `the-hole` entry describing the real sinkhole entirely from sources (formation,
   Cousteau 1971, the 2018 sonar survey, the anoxic layer), then reef-rim,
   outer-dropoff (real terrain) and reef-biology (documented species, illustrative
   placement) entries.
6. `mission.json`: `hull_class: "A"` (1,000 m rating comfortably covers everything
   in this mission; the deepest scanned POI is ~200 m), `environment.preset: "reef"`,
   spawn over the outer slope at (17.3153, -87.4979) -- checked to be in 67.4 m of
   water, satisfying the "≥ 60 m" spawn rule -- heading 270° back toward the reef and
   the hole marker. Briefing and hazards state the resolution limit plainly, per the
   task brief's honesty requirement.
7. `species.json`: `tools/obis_export.py --landmark great-blue-hole --tile-bbox
   --depth-max 200` returned 25 taxa / 1,674 records — reef-building corals
   (Orbicella, Diploria, Montastraea, Porites, Siderastrea, Colpophyllia),
   parrotfish, surgeonfish, grunts, snapper, groupers: a strong match to Caribbean
   reef habitat. No shark species were returned; the sharks named in `guide.json`
   come from Wikipedia, not this OBIS export, and that is stated in both the guide
   entry's medium confidence and the species file's own `note`.

## Validator

```
$ python3 tools/validate_landmark.py great-blue-hole --strict
OK: great-blue-hole, 0 error(s), 0 warning(s)
```

(One warning on first pass -- the `outer-dropoff` guide entry had only 1 source --
fixed by adding a second source.)

## Not verified / open

- No shark species were returned by the OBIS export; the Caribbean reef shark and
  nurse shark in `guide.json`'s `reef-biology` entry come from Wikipedia, flagged
  `confidence: "medium"` on the matching POI.
- The 2018 expedition's discovery of human remains (some press coverage) is not
  used in `guide.json` -- outside the task brief's requested content and not in
  keeping with the site's tone.
- Ice-age stalactite-formation dates (153,000/66,000/60,000/15,000 years ago, per
  Wikipedia) are quoted as reported rather than independently verified against a
  primary geological paper this session.
