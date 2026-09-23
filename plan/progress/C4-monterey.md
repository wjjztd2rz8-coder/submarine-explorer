# C4 Monterey Canyon finish (this session)

Picked up from `plan/progress/C4a.md`'s Monterey notes. Only edited
`data/landmarks/monterey-canyon/` (plus this note); did not touch `src/` or
`tests/`.

## What was done

1. `species.json`: ran `tools/obis_export.py --landmark monterey-canyon
--tile-bbox --depth-min 200 --depth-max 3600 --max 40` live against
   `api.obis.org` (worked fine, ~41 requests, a few minutes). 885 taxa in the
   bbox, 449 at species rank in the depth window, top 40 by record count kept
   (129,124 records total). `note` says species placement in the mission is
   invented, per contract §5.
2. `sources.md`: written from scratch — full source table, terrain-survey
   notes (how each POI's coordinates were located), the pacing-fix rationale,
   hull-class justification, and a fabricated-vs-sourced table, matching the
   titanic/lost-city pack format.
3. Second real source added to two guide entries that had only one:
   - `canyon-axis` (turbidity currents): added Paull et al. 2018, _Nature
     Communications_ 9:4114 (doi:10.1038/s41467-018-06254-6) — the
     peer-reviewed paper behind the ~7 m/s figure — and a USGS news page
     corroborating the 50 km monitored stretch. Used the USGS URL as the
     `sources` entry (govt., freely fetchable); the Nature paper is cited in
     `sources.md`.
   - `mars-node`: added the Wikipedia page for MARS, which corroborates the
     52 km cable and 2008 in-service date already sourced from MBARI.
4. Pacing fix: the two required (`primary: true`) objectives were
   `monterey-canyon-head` and `monterey-canyon-axis-1000m`, ~17.5 km apart —
   over 16 minutes of transit even at 3x sim speed. Added a new POI,
   `monterey-canyon-upper-channel` (real GMRT terrain, 265 m deep, ~2.8 km
   down-canyon from the head, where the shelf break steepens sharply — traced
   by sampling depth along the head-to-axis line), with a new guide entry
   `upper-canyon`. Made it the second required objective alongside the head.
   The old axis-1000m objective, plus the canyon wall, axis-2000m and MARS
   node objectives, are now all secondary/optional, so the long canyon
   transect is an invitation to explore further, not a mandatory second long
   transit. Updated `mission.json`'s briefing summary/facts to match.
5. Validator: `python3 tools/validate_landmark.py monterey-canyon --strict` →
   `OK: monterey-canyon, 0 error(s), 0 warning(s)`. `npm run test:py` → 104
   tests, all pass (python-only, no node build needed).

## Not verified / open

- No source publishes exact coordinates for the canyon head, a canyon-wall
  point, the canyon-axis points, or the new upper-channel point; all are
  located by tracing this tile's real GMRT terrain (documented per-POI in
  `pois.json` `note` fields and in `sources.md`). No facts were invented —
  only point locations, which the honesty rules treat as terrain-derived, not
  fabricated.
